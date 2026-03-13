/**
 * WASM Card Detection wrapper.
 * Detects card rectangles in camera frames and extracts them with perspective correction.
 */

let wasmModule: typeof import("./wasm-card-detect/card_detect") | null = null;
let wasmInit: typeof import("./wasm-card-detect/card_detect").default | null = null;
let initPromise: Promise<void> | null = null;

export interface CardDetection {
  found: boolean;
  /** Corners [x0,y0, x1,y1, x2,y2, x3,y3] — TL, TR, BR, BL in image coords */
  corners: Float64Array;
}

/**
 * Load and initialize the WASM module. Safe to call multiple times.
 */
export async function initCardDetect(): Promise<void> {
  if (wasmModule) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const mod = await import("./wasm-card-detect/card_detect");
      await mod.default();
      wasmModule = mod;
      wasmInit = mod.default;
      console.log("[CardDetect] WASM module loaded");
    } catch (err) {
      console.error("[CardDetect] Failed to load WASM module:", err);
      initPromise = null;
      throw err;
    }
  })();

  return initPromise;
}

/**
 * Detect a card rectangle in an RGBA frame.
 * Returns corners if a card-shaped quadrilateral is found.
 */
export function detectCard(imageData: ImageData): CardDetection {
  if (!wasmModule) {
    return { found: false, corners: new Float64Array(8) };
  }

  const result = wasmModule.detect_card(
    new Uint8Array(imageData.data.buffer),
    imageData.width,
    imageData.height
  );

  const detection: CardDetection = {
    found: result.found,
    corners: result.found ? result.get_corners() : new Float64Array(8),
  };

  result.free();
  return detection;
}

/**
 * Extract detected card region with perspective correction.
 * Returns RGBA ImageData of the straightened card.
 */
export function extractCardRegion(
  imageData: ImageData,
  corners: Float64Array,
  outWidth: number,
  outHeight: number
): ImageData {
  if (!wasmModule) {
    return new ImageData(outWidth, outHeight);
  }

  const rgba = wasmModule.extract_card_region(
    new Uint8Array(imageData.data.buffer),
    imageData.width,
    imageData.height,
    corners,
    outWidth,
    outHeight
  );

  return new ImageData(
    new Uint8ClampedArray(rgba.slice().buffer),
    outWidth,
    outHeight
  );
}

/**
 * Detect + extract in one call. Falls back to center crop if detection fails.
 */
export function detectAndExtract(
  imageData: ImageData,
  outWidth: number = 224,
  outHeight: number = 312
): { imageData: ImageData; detected: boolean; corners?: Float64Array } {
  const detection = detectCard(imageData);

  if (detection.found) {
    const extracted = extractCardRegion(imageData, detection.corners, outWidth, outHeight);
    return { imageData: extracted, detected: true, corners: detection.corners };
  }

  return { imageData, detected: false };
}

/**
 * Debug: get edge detection visualization as ImageData.
 */
export function debugEdges(imageData: ImageData): ImageData {
  if (!wasmModule) {
    return imageData;
  }

  const rgba = wasmModule.debug_edges(
    new Uint8Array(imageData.data.buffer),
    imageData.width,
    imageData.height
  );

  return new ImageData(
    new Uint8ClampedArray(rgba.slice().buffer),
    imageData.width,
    imageData.height
  );
}

export function isCardDetectReady(): boolean {
  return wasmModule !== null;
}
