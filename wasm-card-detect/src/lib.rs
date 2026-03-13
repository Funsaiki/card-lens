use wasm_bindgen::prelude::*;
use std::collections::VecDeque;

// ======================== Constants ========================

const CARD_RATIO: f64 = 63.0 / 88.0; // width / height ≈ 0.716
const RATIO_TOLERANCE: f64 = 0.25;    // 25% tolerance on aspect ratio
const MIN_AREA_FRACTION: f64 = 0.04;  // Card must be ≥4% of frame
const MAX_AREA_FRACTION: f64 = 0.95;  // Card must be ≤95% of frame
const DETECT_MAX_DIM: usize = 480;    // Max dimension for detection phase

// ======================== WASM Types ========================

#[wasm_bindgen]
pub struct DetectionResult {
    found: bool,
    // Corners: TL, TR, BR, BL in original image coordinates
    corners: [f64; 8],
}

#[wasm_bindgen]
impl DetectionResult {
    #[wasm_bindgen(getter)]
    pub fn found(&self) -> bool {
        self.found
    }

    /// Returns corners as [x0,y0, x1,y1, x2,y2, x3,y3] (TL, TR, BR, BL)
    pub fn get_corners(&self) -> Vec<f64> {
        self.corners.to_vec()
    }
}

fn not_found() -> DetectionResult {
    DetectionResult {
        found: false,
        corners: [0.0; 8],
    }
}

// ======================== Image Operations ========================

fn to_grayscale(rgba: &[u8], w: usize, h: usize) -> Vec<u8> {
    let n = w * h;
    let mut gray = Vec::with_capacity(n);
    for i in 0..n {
        let base = i * 4;
        let r = rgba[base] as u32;
        let g = rgba[base + 1] as u32;
        let b = rgba[base + 2] as u32;
        // ITU-R BT.601 luma (integer approximation)
        gray.push(((r * 77 + g * 150 + b * 29) >> 8) as u8);
    }
    gray
}

fn downscale(gray: &[u8], w: usize, h: usize, nw: usize, nh: usize) -> Vec<u8> {
    let mut out = vec![0u8; nw * nh];
    let sx = w as f64 / nw as f64;
    let sy = h as f64 / nh as f64;

    for ny in 0..nh {
        for nx in 0..nw {
            // Area average
            let x0 = (nx as f64 * sx) as usize;
            let y0 = (ny as f64 * sy) as usize;
            let x1 = (((nx + 1) as f64 * sx) as usize).min(w);
            let y1 = (((ny + 1) as f64 * sy) as usize).min(h);

            let mut sum = 0u32;
            let mut count = 0u32;
            for y in y0..y1 {
                for x in x0..x1 {
                    sum += gray[y * w + x] as u32;
                    count += 1;
                }
            }
            out[ny * nw + nx] = if count > 0 { (sum / count) as u8 } else { 0 };
        }
    }
    out
}

/// Separable box blur × 3 passes ≈ Gaussian blur
fn gaussian_blur(gray: &[u8], w: usize, h: usize, radius: usize) -> Vec<u8> {
    let mut src = gray.to_vec();
    let mut dst = vec![0u8; w * h];

    for _ in 0..3 {
        // Horizontal pass
        for y in 0..h {
            let row = y * w;
            for x in 0..w {
                let x0 = x.saturating_sub(radius);
                let x1 = (x + radius + 1).min(w);
                let mut sum = 0u32;
                for xx in x0..x1 {
                    sum += src[row + xx] as u32;
                }
                dst[row + x] = (sum / (x1 - x0) as u32) as u8;
            }
        }
        std::mem::swap(&mut src, &mut dst);

        // Vertical pass
        for y in 0..h {
            let y0 = y.saturating_sub(radius);
            let y1 = (y + radius + 1).min(h);
            for x in 0..w {
                let mut sum = 0u32;
                for yy in y0..y1 {
                    sum += src[yy * w + x] as u32;
                }
                dst[y * w + x] = (sum / (y1 - y0) as u32) as u8;
            }
        }
        std::mem::swap(&mut src, &mut dst);
    }
    src
}

// ======================== Canny Edge Detection ========================

/// Sobel gradient → (magnitude, quantized direction)
/// Direction: 0=horizontal, 1=diagonal 45°, 2=vertical, 3=diagonal 135°
fn sobel(gray: &[u8], w: usize, h: usize) -> (Vec<u16>, Vec<u8>) {
    let n = w * h;
    let mut mag = vec![0u16; n];
    let mut dir = vec![0u8; n];

    for y in 1..h - 1 {
        for x in 1..w - 1 {
            let p = |dx: isize, dy: isize| -> i32 {
                gray[((y as isize + dy) as usize) * w + (x as isize + dx) as usize] as i32
            };

            let gx = -p(-1, -1) + p(1, -1)
                - 2 * p(-1, 0) + 2 * p(1, 0)
                - p(-1, 1) + p(1, 1);

            let gy = -p(-1, -1) - 2 * p(0, -1) - p(1, -1)
                + p(-1, 1) + 2 * p(0, 1) + p(1, 1);

            let m = ((gx.unsigned_abs() + gy.unsigned_abs()) as u16).min(u16::MAX);
            mag[y * w + x] = m;

            // Quantize gradient direction to 4 angles
            let angle = (gy as f64).atan2(gx as f64);
            let deg = if angle < 0.0 {
                angle.to_degrees() + 180.0
            } else {
                angle.to_degrees()
            };
            dir[y * w + x] = if deg < 22.5 || deg >= 157.5 {
                0
            } else if deg < 67.5 {
                1
            } else if deg < 112.5 {
                2
            } else {
                3
            };
        }
    }
    (mag, dir)
}

/// Non-maximum suppression: thin edges to 1 pixel wide
fn non_max_suppression(mag: &[u16], dir: &[u8], w: usize, h: usize) -> Vec<u16> {
    let mut out = vec![0u16; w * h];

    for y in 1..h - 1 {
        for x in 1..w - 1 {
            let i = y * w + x;
            let m = mag[i];
            if m == 0 {
                continue;
            }

            let (n1, n2) = match dir[i] {
                0 => (mag[i - 1], mag[i + 1]),
                1 => (mag[(y - 1) * w + x + 1], mag[(y + 1) * w + x - 1]),
                2 => (mag[(y - 1) * w + x], mag[(y + 1) * w + x]),
                _ => (mag[(y - 1) * w + x - 1], mag[(y + 1) * w + x + 1]),
            };

            if m >= n1 && m >= n2 {
                out[i] = m;
            }
        }
    }
    out
}

/// Hysteresis thresholding: strong edges seed, grow through weak edges
fn hysteresis(nms: &[u16], w: usize, h: usize, low: u16, high: u16) -> Vec<bool> {
    let n = w * h;
    let mut edges = vec![false; n];
    let mut queue = VecDeque::new();

    // Seed with strong edges
    for i in 0..n {
        if nms[i] >= high {
            edges[i] = true;
            queue.push_back(i);
        }
    }

    // BFS: grow through weak edges connected to strong edges
    while let Some(i) = queue.pop_front() {
        let y = i / w;
        let x = i % w;

        for dy in -1i32..=1 {
            for dx in -1i32..=1 {
                if dx == 0 && dy == 0 {
                    continue;
                }
                let nx = x as i32 + dx;
                let ny = y as i32 + dy;
                if nx < 0 || ny < 0 || nx >= w as i32 || ny >= h as i32 {
                    continue;
                }
                let ni = ny as usize * w + nx as usize;
                if !edges[ni] && nms[ni] >= low {
                    edges[ni] = true;
                    queue.push_back(ni);
                }
            }
        }
    }
    edges
}

/// Full Canny pipeline
fn canny(gray: &[u8], w: usize, h: usize, low: u16, high: u16) -> Vec<bool> {
    let (mag, dir) = sobel(gray, w, h);
    let nms = non_max_suppression(&mag, &dir, w, h);
    hysteresis(&nms, w, h, low, high)
}

// ======================== Morphology ========================

fn dilate(edges: &[bool], w: usize, h: usize, radius: usize) -> Vec<bool> {
    let mut out = edges.to_vec();
    let r = radius as isize;

    for y in 0..h {
        for x in 0..w {
            if !edges[y * w + x] {
                continue;
            }
            for dy in -r..=r {
                for dx in -r..=r {
                    let nx = x as isize + dx;
                    let ny = y as isize + dy;
                    if nx >= 0 && ny >= 0 && nx < w as isize && ny < h as isize {
                        out[ny as usize * w + nx as usize] = true;
                    }
                }
            }
        }
    }
    out
}

// ======================== Background / Foreground Detection ========================

/// Flood fill from image borders through non-edge pixels.
/// Returns a mask where `true` = foreground (inside card).
fn find_foreground(edges: &[bool], w: usize, h: usize) -> Vec<bool> {
    let n = w * h;
    let mut is_bg = vec![false; n];
    let mut queue = VecDeque::new();

    // Seed from border pixels that are NOT edges
    for x in 0..w {
        let top = x;
        if !edges[top] && !is_bg[top] {
            is_bg[top] = true;
            queue.push_back(top);
        }
        let bottom = (h - 1) * w + x;
        if !edges[bottom] && !is_bg[bottom] {
            is_bg[bottom] = true;
            queue.push_back(bottom);
        }
    }
    for y in 1..h - 1 {
        let left = y * w;
        if !edges[left] && !is_bg[left] {
            is_bg[left] = true;
            queue.push_back(left);
        }
        let right = y * w + w - 1;
        if !edges[right] && !is_bg[right] {
            is_bg[right] = true;
            queue.push_back(right);
        }
    }

    // BFS flood fill
    while let Some(i) = queue.pop_front() {
        let y = i / w;
        let x = i % w;

        for (dx, dy) in [(-1i32, 0), (1, 0), (0, -1), (0, 1)] {
            let nx = x as i32 + dx;
            let ny = y as i32 + dy;
            if nx < 0 || ny < 0 || nx >= w as i32 || ny >= h as i32 {
                continue;
            }
            let ni = ny as usize * w + nx as usize;
            if !is_bg[ni] && !edges[ni] {
                is_bg[ni] = true;
                queue.push_back(ni);
            }
        }
    }

    // Foreground = not background
    (0..n).map(|i| !is_bg[i]).collect()
}

/// Extract boundary pixels of the foreground region
fn extract_boundary(foreground: &[bool], w: usize, h: usize) -> Vec<(f64, f64)> {
    let mut points = Vec::new();

    for y in 0..h {
        for x in 0..w {
            if !foreground[y * w + x] {
                continue;
            }
            // Boundary pixel = foreground with at least one non-foreground neighbor
            let is_boundary = x == 0
                || y == 0
                || x == w - 1
                || y == h - 1
                || !foreground[(y - 1) * w + x]
                || !foreground[(y + 1) * w + x]
                || !foreground[y * w + x - 1]
                || !foreground[y * w + x + 1];

            if is_boundary {
                points.push((x as f64, y as f64));
            }
        }
    }
    points
}

// ======================== Convex Hull (Andrew's Monotone Chain) ========================

fn cross(o: (f64, f64), a: (f64, f64), b: (f64, f64)) -> f64 {
    (a.0 - o.0) * (b.1 - o.1) - (a.1 - o.1) * (b.0 - o.0)
}

fn convex_hull(points: &[(f64, f64)]) -> Vec<(f64, f64)> {
    let mut pts = points.to_vec();
    pts.sort_by(|a, b| {
        a.0.partial_cmp(&b.0)
            .unwrap()
            .then(a.1.partial_cmp(&b.1).unwrap())
    });
    pts.dedup_by(|a, b| (a.0 - b.0).abs() < 0.5 && (a.1 - b.1).abs() < 0.5);

    if pts.len() < 3 {
        return pts;
    }

    let n = pts.len();
    let mut hull = Vec::with_capacity(2 * n);

    // Lower hull
    for &p in &pts {
        while hull.len() >= 2 && cross(hull[hull.len() - 2], hull[hull.len() - 1], p) <= 0.0 {
            hull.pop();
        }
        hull.push(p);
    }

    // Upper hull
    let lower_len = hull.len() + 1;
    for &p in pts.iter().rev() {
        while hull.len() >= lower_len
            && cross(hull[hull.len() - 2], hull[hull.len() - 1], p) <= 0.0
        {
            hull.pop();
        }
        hull.push(p);
    }

    hull.pop(); // Remove duplicate of first point
    hull
}

// ======================== Quadrilateral Detection ========================

/// Find 4 corners from convex hull using maximum curvature
fn find_quad_from_hull(hull: &[(f64, f64)]) -> Option<[(f64, f64); 4]> {
    let n = hull.len();
    if n < 4 {
        return None;
    }
    if n == 4 {
        return Some([hull[0], hull[1], hull[2], hull[3]]);
    }

    // For each hull vertex, compute curvature (angle change)
    let mut curvatures: Vec<(usize, f64)> = Vec::with_capacity(n);

    for i in 0..n {
        let prev = hull[(i + n - 1) % n];
        let curr = hull[i];
        let next = hull[(i + 1) % n];

        let v1 = (curr.0 - prev.0, curr.1 - prev.1);
        let v2 = (next.0 - curr.0, next.1 - curr.1);

        let dot = v1.0 * v2.0 + v1.1 * v2.1;
        let cross_val = v1.0 * v2.1 - v1.1 * v2.0;
        let angle = cross_val.atan2(dot).abs();

        curvatures.push((i, angle));
    }

    // Sort by curvature descending, take top 4
    curvatures.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());

    if curvatures.len() < 4 {
        return None;
    }

    // Sort selected indices by position on hull (preserves winding order)
    let mut indices: Vec<usize> = curvatures[..4].iter().map(|c| c.0).collect();
    indices.sort();

    Some([
        hull[indices[0]],
        hull[indices[1]],
        hull[indices[2]],
        hull[indices[3]],
    ])
}

// ======================== Geometry Helpers ========================

fn dist(a: (f64, f64), b: (f64, f64)) -> f64 {
    ((a.0 - b.0).powi(2) + (a.1 - b.1).powi(2)).sqrt()
}

fn quad_area(corners: &[(f64, f64); 4]) -> f64 {
    let mut area = 0.0;
    for i in 0..4 {
        let j = (i + 1) % 4;
        area += corners[i].0 * corners[j].1;
        area -= corners[j].0 * corners[i].1;
    }
    area.abs() / 2.0
}

/// Order 4 corners as: top-left, top-right, bottom-right, bottom-left
fn order_corners(corners: &[(f64, f64); 4]) -> [(f64, f64); 4] {
    let mut sorted = *corners;

    // TL = smallest x+y, BR = largest x+y
    sorted.sort_by(|a, b| (a.0 + a.1).partial_cmp(&(b.0 + b.1)).unwrap());
    let tl = sorted[0];
    let br = sorted[3];

    // Of the remaining two: TR = largest x-y, BL = smallest x-y
    let (tr, bl) = if (sorted[1].0 - sorted[1].1) > (sorted[2].0 - sorted[2].1) {
        (sorted[1], sorted[2])
    } else {
        (sorted[2], sorted[1])
    };

    [tl, tr, br, bl]
}

fn is_card_shaped(corners: &[(f64, f64); 4], img_w: usize, img_h: usize) -> bool {
    let area = quad_area(corners);
    let img_area = (img_w * img_h) as f64;

    // Check area bounds
    if area < img_area * MIN_AREA_FRACTION || area > img_area * MAX_AREA_FRACTION {
        return false;
    }

    // Check aspect ratio
    let ordered = order_corners(corners);
    let top_w = dist(ordered[0], ordered[1]);
    let bottom_w = dist(ordered[3], ordered[2]);
    let left_h = dist(ordered[0], ordered[3]);
    let right_h = dist(ordered[1], ordered[2]);

    let avg_w = (top_w + bottom_w) / 2.0;
    let avg_h = (left_h + right_h) / 2.0;

    if avg_h < 1.0 || avg_w < 1.0 {
        return false;
    }

    let ratio = avg_w / avg_h;

    // Card can be portrait (0.716) or landscape (1.397)
    let portrait_ok = (ratio - CARD_RATIO).abs() < RATIO_TOLERANCE;
    let landscape_ok = (ratio - 1.0 / CARD_RATIO).abs() < RATIO_TOLERANCE;

    portrait_ok || landscape_ok
}

// ======================== Perspective Warp ========================

/// Solve 8×8 linear system via Gaussian elimination
fn solve_8x8(a: &mut [[f64; 9]; 8]) -> Option<[f64; 8]> {
    for col in 0..8 {
        // Partial pivot
        let mut max_val = a[col][col].abs();
        let mut max_row = col;
        for row in col + 1..8 {
            if a[row][col].abs() > max_val {
                max_val = a[row][col].abs();
                max_row = row;
            }
        }
        if max_val < 1e-10 {
            return None;
        }
        if max_row != col {
            a.swap(col, max_row);
        }

        let pivot = a[col][col];
        for row in col + 1..8 {
            let factor = a[row][col] / pivot;
            for j in col..9 {
                a[row][j] -= factor * a[col][j];
            }
        }
    }

    // Back substitution
    let mut x = [0.0f64; 8];
    for i in (0..8).rev() {
        x[i] = a[i][8];
        for j in i + 1..8 {
            x[i] -= a[i][j] * x[j];
        }
        x[i] /= a[i][i];
    }

    Some(x)
}

/// Compute 3×3 homography matrix: maps destination coords → source coords
fn compute_homography(src: &[(f64, f64); 4], dst: &[(f64, f64); 4]) -> Option<[f64; 9]> {
    let mut mat = [[0.0f64; 9]; 8];

    for i in 0..4 {
        let (xd, yd) = dst[i];
        let (xs, ys) = src[i];
        let r = i * 2;

        mat[r] = [xd, yd, 1.0, 0.0, 0.0, 0.0, -xd * xs, -yd * xs, xs];
        mat[r + 1] = [0.0, 0.0, 0.0, xd, yd, 1.0, -xd * ys, -yd * ys, ys];
    }

    let h = solve_8x8(&mut mat)?;
    Some([h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1.0])
}

/// Warp perspective with bilinear interpolation
fn perspective_warp(
    rgba: &[u8],
    w: usize,
    h: usize,
    corners_flat: &[f64],
    out_w: usize,
    out_h: usize,
) -> Vec<u8> {
    let src_corners = [
        (corners_flat[0], corners_flat[1]),
        (corners_flat[2], corners_flat[3]),
        (corners_flat[4], corners_flat[5]),
        (corners_flat[6], corners_flat[7]),
    ];

    let dst_corners = [
        (0.0, 0.0),
        (out_w as f64 - 1.0, 0.0),
        (out_w as f64 - 1.0, out_h as f64 - 1.0),
        (0.0, out_h as f64 - 1.0),
    ];

    let homo = match compute_homography(&src_corners, &dst_corners) {
        Some(h) => h,
        None => return vec![0u8; out_w * out_h * 4],
    };

    let mut out = vec![0u8; out_w * out_h * 4];

    for dy in 0..out_h {
        for dx in 0..out_w {
            let xd = dx as f64;
            let yd = dy as f64;

            let denom = homo[6] * xd + homo[7] * yd + homo[8];
            if denom.abs() < 1e-10 {
                continue;
            }

            let sx = (homo[0] * xd + homo[1] * yd + homo[2]) / denom;
            let sy = (homo[3] * xd + homo[4] * yd + homo[5]) / denom;

            // Bilinear interpolation
            if sx < 0.0 || sy < 0.0 || sx >= (w - 1) as f64 || sy >= (h - 1) as f64 {
                continue;
            }

            let x0 = sx.floor() as usize;
            let y0 = sy.floor() as usize;
            let x1 = x0 + 1;
            let y1 = y0 + 1;
            let fx = sx - x0 as f64;
            let fy = sy - y0 as f64;

            let out_idx = (dy * out_w + dx) * 4;
            for c in 0..4 {
                let v00 = rgba[(y0 * w + x0) * 4 + c] as f64;
                let v10 = rgba[(y0 * w + x1) * 4 + c] as f64;
                let v01 = rgba[(y1 * w + x0) * 4 + c] as f64;
                let v11 = rgba[(y1 * w + x1) * 4 + c] as f64;

                let v = v00 * (1.0 - fx) * (1.0 - fy)
                    + v10 * fx * (1.0 - fy)
                    + v01 * (1.0 - fx) * fy
                    + v11 * fx * fy;

                out[out_idx + c] = v.round().clamp(0.0, 255.0) as u8;
            }
        }
    }

    out
}

// ======================== WASM Entry Points ========================

/// Detect a card in the RGBA frame. Returns corners if found.
#[wasm_bindgen]
pub fn detect_card(rgba: &[u8], width: u32, height: u32) -> DetectionResult {
    let w = width as usize;
    let h = height as usize;

    if rgba.len() != w * h * 4 {
        return not_found();
    }

    // 1. Grayscale
    let gray = to_grayscale(rgba, w, h);

    // 2. Downscale for speed
    let scale = if w.max(h) > DETECT_MAX_DIM {
        DETECT_MAX_DIM as f64 / w.max(h) as f64
    } else {
        1.0
    };
    let sw = (w as f64 * scale).round().max(1.0) as usize;
    let sh = (h as f64 * scale).round().max(1.0) as usize;
    let small = if scale < 1.0 {
        downscale(&gray, w, h, sw, sh)
    } else {
        gray
    };

    // 3. Gaussian blur
    let blurred = gaussian_blur(&small, sw, sh, 2);

    // 4. Canny edge detection
    let edges = canny(&blurred, sw, sh, 30, 90);

    // 5. Dilate to close edge gaps
    let dilated = dilate(&edges, sw, sh, 3);

    // 6. Flood fill from borders → foreground mask
    let foreground = find_foreground(&dilated, sw, sh);

    // 7. Extract boundary pixels
    let boundary = extract_boundary(&foreground, sw, sh);
    if boundary.len() < 4 {
        return not_found();
    }

    // 8. Convex hull
    let hull = convex_hull(&boundary);
    if hull.len() < 4 {
        return not_found();
    }

    // 9. Find quadrilateral from hull corners
    let quad = match find_quad_from_hull(&hull) {
        Some(q) => q,
        None => return not_found(),
    };

    // 10. Validate card shape
    if !is_card_shaped(&quad, sw, sh) {
        return not_found();
    }

    // 11. Order corners (TL, TR, BR, BL) and scale to original resolution
    let ordered = order_corners(&quad);
    let inv = 1.0 / scale;

    DetectionResult {
        found: true,
        corners: [
            ordered[0].0 * inv,
            ordered[0].1 * inv,
            ordered[1].0 * inv,
            ordered[1].1 * inv,
            ordered[2].0 * inv,
            ordered[2].1 * inv,
            ordered[3].0 * inv,
            ordered[3].1 * inv,
        ],
    }
}

/// Extract the card region with perspective correction.
/// Takes detected corners + desired output size, returns RGBA data.
#[wasm_bindgen]
pub fn extract_card_region(
    rgba: &[u8],
    width: u32,
    height: u32,
    corners: &[f64],
    out_width: u32,
    out_height: u32,
) -> Vec<u8> {
    if corners.len() != 8 {
        return vec![0u8; (out_width * out_height * 4) as usize];
    }
    perspective_warp(
        rgba,
        width as usize,
        height as usize,
        corners,
        out_width as usize,
        out_height as usize,
    )
}

/// Debug: returns the edge detection result as RGBA image
#[wasm_bindgen]
pub fn debug_edges(rgba: &[u8], width: u32, height: u32) -> Vec<u8> {
    let w = width as usize;
    let h = height as usize;

    if rgba.len() != w * h * 4 {
        return vec![0u8; w * h * 4];
    }

    let gray = to_grayscale(rgba, w, h);

    let scale = if w.max(h) > DETECT_MAX_DIM {
        DETECT_MAX_DIM as f64 / w.max(h) as f64
    } else {
        1.0
    };
    let sw = (w as f64 * scale).round().max(1.0) as usize;
    let sh = (h as f64 * scale).round().max(1.0) as usize;
    let small = if scale < 1.0 {
        downscale(&gray, w, h, sw, sh)
    } else {
        gray
    };

    let blurred = gaussian_blur(&small, sw, sh, 2);
    let edges = canny(&blurred, sw, sh, 30, 90);

    // Upscale edges back to original resolution
    let mut out = vec![0u8; w * h * 4];
    for y in 0..h {
        for x in 0..w {
            let sx = ((x as f64) * scale).min((sw - 1) as f64) as usize;
            let sy = ((y as f64) * scale).min((sh - 1) as f64) as usize;
            let val = if edges[sy * sw + sx] { 255u8 } else { 0u8 };
            let idx = (y * w + x) * 4;
            out[idx] = val;
            out[idx + 1] = val;
            out[idx + 2] = val;
            out[idx + 3] = 255;
        }
    }
    out
}
