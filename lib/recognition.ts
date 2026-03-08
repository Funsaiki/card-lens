/**
 * Card recognition via perceptual hashing.
 *
 * Uses a combination of aHash (average hash) and dHash (difference hash)
 * with contrast normalization for robustness against camera conditions.
 */

// ---------- Image processing ----------

export function captureFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement
): ImageData | null {
  if (video.readyState < 2) return null;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

export function resizeImage(
  imageData: ImageData,
  targetWidth: number,
  targetHeight: number
): ImageData {
  const srcCanvas = document.createElement("canvas");
  srcCanvas.width = imageData.width;
  srcCanvas.height = imageData.height;
  srcCanvas.getContext("2d")!.putImageData(imageData, 0, 0);

  const dstCanvas = document.createElement("canvas");
  dstCanvas.width = targetWidth;
  dstCanvas.height = targetHeight;
  const dstCtx = dstCanvas.getContext("2d")!;
  // Use better quality interpolation
  dstCtx.imageSmoothingEnabled = true;
  dstCtx.imageSmoothingQuality = "high";
  dstCtx.drawImage(srcCanvas, 0, 0, targetWidth, targetHeight);
  return dstCtx.getImageData(0, 0, targetWidth, targetHeight);
}

export function toGrayscale(imageData: ImageData): number[] {
  const gray: number[] = [];
  for (let i = 0; i < imageData.data.length; i += 4) {
    const r = imageData.data[i];
    const g = imageData.data[i + 1];
    const b = imageData.data[i + 2];
    gray.push(Math.round(0.299 * r + 0.587 * g + 0.114 * b));
  }
  return gray;
}

/**
 * Normalize contrast: stretch pixel values to use the full 0-255 range.
 * This reduces the impact of lighting conditions.
 */
function normalizeContrast(pixels: number[]): number[] {
  let min = 255;
  let max = 0;
  for (const p of pixels) {
    if (p < min) min = p;
    if (p > max) max = p;
  }
  const range = max - min;
  if (range === 0) return pixels;
  return pixels.map((p) => Math.round(((p - min) / range) * 255));
}

// ---------- Hash computation ----------

/**
 * Average Hash (aHash) — robust to brightness/contrast changes.
 * 1. Resize to NxN grayscale
 * 2. Compute the mean value
 * 3. Each pixel > mean => 1, else 0
 */
function computeAHash(gray: number[]): string {
  const mean = gray.reduce((a, b) => a + b, 0) / gray.length;
  let bits = "";
  for (const p of gray) {
    bits += p > mean ? "1" : "0";
  }
  return bitsToHex(bits);
}

/**
 * Difference Hash (dHash) — robust to slight geometric changes.
 * 1. Resize to (N+1)xN grayscale
 * 2. Compare each pixel with its right neighbor
 */
function computeDHashFromGray(gray: number[], width: number, height: number): string {
  let bits = "";
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width - 1; col++) {
      const left = gray[row * width + col];
      const right = gray[row * width + col + 1];
      bits += left > right ? "1" : "0";
    }
  }
  return bitsToHex(bits);
}

function bitsToHex(bits: string): string {
  let hex = "";
  for (let i = 0; i < bits.length; i += 4) {
    hex += parseInt(bits.substring(i, Math.min(i + 4, bits.length)).padEnd(4, "0"), 2).toString(16);
  }
  return hex;
}

// Hash size: 16x16 = 256 bits for aHash, 17x16 = 256 bits for dHash
const HASH_SIZE = 16;

export interface ComputedHash {
  aHash: string;
  dHash: string;
}

/**
 * Compute both aHash and dHash for an image.
 */
export function computeHash(imageData: ImageData): ComputedHash {
  // aHash: NxN
  const resizedA = resizeImage(imageData, HASH_SIZE, HASH_SIZE);
  const grayA = normalizeContrast(toGrayscale(resizedA));
  const aHash = computeAHash(grayA);

  // dHash: (N+1)xN
  const resizedD = resizeImage(imageData, HASH_SIZE + 1, HASH_SIZE);
  const grayD = normalizeContrast(toGrayscale(resizedD));
  const dHash = computeDHashFromGray(grayD, HASH_SIZE + 1, HASH_SIZE);

  return { aHash, dHash };
}

/** Legacy wrapper for indexer compatibility */
export function computeDHash(imageData: ImageData): string {
  return computeHash(imageData).dHash;
}

// ---------- Hash comparison ----------

export function hammingDistance(hash1: string, hash2: string): number {
  if (hash1.length !== hash2.length) return Infinity;
  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    const xor = parseInt(hash1[i], 16) ^ parseInt(hash2[i], 16);
    distance += popcount4(xor);
  }
  return distance;
}

function popcount4(n: number): number {
  let count = 0;
  while (n) {
    count += n & 1;
    n >>= 1;
  }
  return count;
}

// ---------- Card matching ----------

export interface CardHashEntry {
  id: string;
  name: string;
  hash: string; // dHash (legacy, used by indexer)
  aHash?: string;
  imageUrl: string;
  set: string;
}

/**
 * Combined distance: weighted average of aHash and dHash distances.
 * Both are 256-bit hashes, max distance 256.
 * aHash is weighted more (better for color/brightness matching).
 */
function combinedDistance(
  queryAHash: string,
  queryDHash: string,
  ref: CardHashEntry
): number {
  const dDist = hammingDistance(queryDHash, ref.hash);

  if (ref.aHash) {
    const aDist = hammingDistance(queryAHash, ref.aHash);
    // Weighted: 60% aHash + 40% dHash
    return aDist * 0.6 + dDist * 0.4;
  }

  return dDist;
}

export function findBestMatch(
  queryHash: string,
  references: CardHashEntry[],
  threshold: number = 10,
  queryAHash?: string
): { entry: CardHashEntry; distance: number } | null {
  let bestMatch: CardHashEntry | null = null;
  let bestDistance = Infinity;

  for (const ref of references) {
    const dist =
      queryAHash
        ? combinedDistance(queryAHash, queryHash, ref)
        : hammingDistance(queryHash, ref.hash);

    if (dist < bestDistance) {
      bestDistance = dist;
      bestMatch = ref;
    }
  }

  if (bestMatch && bestDistance <= threshold) {
    return { entry: bestMatch, distance: Math.round(bestDistance) };
  }
  return null;
}

// ---------- Card region extraction ----------

export function extractCardRegion(imageData: ImageData, frameHeightPercent: number = 0.75): ImageData {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  const CARD_RATIO = 63 / 88;
  const FRAME_H_PCT = frameHeightPercent;

  const cropH = Math.floor(imageData.height * FRAME_H_PCT);
  const cropW = Math.floor(cropH * CARD_RATIO);

  const maxW = Math.floor(imageData.width * 0.9);
  const finalW = Math.min(cropW, maxW);
  const finalH = Math.floor(finalW / CARD_RATIO);

  const cropX = Math.floor((imageData.width - finalW) / 2);
  const cropY = Math.floor((imageData.height - finalH) / 2);

  const srcCanvas = document.createElement("canvas");
  srcCanvas.width = imageData.width;
  srcCanvas.height = imageData.height;
  srcCanvas.getContext("2d")!.putImageData(imageData, 0, 0);

  canvas.width = finalW;
  canvas.height = finalH;
  ctx.drawImage(srcCanvas, cropX, cropY, finalW, finalH, 0, 0, finalW, finalH);

  return ctx.getImageData(0, 0, finalW, finalH);
}
