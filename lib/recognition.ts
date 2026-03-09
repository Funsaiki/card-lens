/**
 * Card recognition helpers.
 * Frame capture and card region extraction for the recognition pipeline.
 */

// Reusable canvases to avoid GC pressure in hot paths
let _srcCanvas: HTMLCanvasElement | null = null;
let _dstCanvas: HTMLCanvasElement | null = null;

function getSrcCanvas(): HTMLCanvasElement {
  if (!_srcCanvas) _srcCanvas = document.createElement("canvas");
  return _srcCanvas;
}

function getDstCanvas(): HTMLCanvasElement {
  if (!_dstCanvas) _dstCanvas = document.createElement("canvas");
  return _dstCanvas;
}

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

const CARD_RATIO = 63 / 88;

export function extractCardRegion(imageData: ImageData, frameHeightPercent: number = 0.75): ImageData {
  const cropH = Math.floor(imageData.height * frameHeightPercent);
  const cropW = Math.floor(cropH * CARD_RATIO);

  const maxW = Math.floor(imageData.width * 0.9);
  const finalW = Math.min(cropW, maxW);
  const finalH = Math.floor(finalW / CARD_RATIO);

  const cropX = Math.floor((imageData.width - finalW) / 2);
  const cropY = Math.floor((imageData.height - finalH) / 2);

  const srcCanvas = getSrcCanvas();
  srcCanvas.width = imageData.width;
  srcCanvas.height = imageData.height;
  srcCanvas.getContext("2d")!.putImageData(imageData, 0, 0);

  const dstCanvas = getDstCanvas();
  dstCanvas.width = finalW;
  dstCanvas.height = finalH;
  const ctx = dstCanvas.getContext("2d")!;
  ctx.drawImage(srcCanvas, cropX, cropY, finalW, finalH, 0, 0, finalW, finalH);

  return ctx.getImageData(0, 0, finalW, finalH);
}
