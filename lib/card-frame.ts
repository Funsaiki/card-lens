/**
 * Card frame constants.
 * A standard trading card is 63mm x 88mm (ratio ~0.716).
 * These values define the guide overlay and the crop region for recognition.
 * Both must stay in sync.
 */

// Card aspect ratio: width / height
export const CARD_ASPECT_RATIO = 63 / 88; // ~0.716

// How much of the video height the card frame should occupy
export const FRAME_HEIGHT_PERCENT = 0.75;

/**
 * Calculate the card frame rectangle within a given container.
 * Returns { x, y, width, height } as fractions (0-1) of the container.
 */
export function getCardFrameRect(containerWidth: number, containerHeight: number) {
  const frameH = containerHeight * FRAME_HEIGHT_PERCENT;
  const frameW = frameH * CARD_ASPECT_RATIO;

  // Clamp if wider than container
  const finalW = Math.min(frameW, containerWidth * 0.9);
  const finalH = finalW / CARD_ASPECT_RATIO;

  const x = (containerWidth - finalW) / 2;
  const y = (containerHeight - finalH) / 2;

  return { x, y, width: finalW, height: finalH };
}

/**
 * Get CSS style for the card frame guide overlay.
 * @param heightPercent - fraction of container height (0.3 to 0.95)
 */
export function getCardFrameStyle(heightPercent: number = FRAME_HEIGHT_PERCENT) {
  return {
    height: `${heightPercent * 100}%`,
    aspectRatio: `${CARD_ASPECT_RATIO}`,
    maxWidth: "90%",
  };
}
