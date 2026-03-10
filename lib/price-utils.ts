import { CardData } from "@/types";

/**
 * Extract the primary market price in USD from a CardData object.
 * Checks multi-marketplace pricing first, then legacy simple prices.
 * Cardmarket EUR values are converted at a rough 1.08 rate.
 */
export function getMarketPriceUsd(card: CardData): number | null {
  if (card.pricing) {
    if (card.pricing.tcgplayer?.market != null) return card.pricing.tcgplayer.market;
    if (card.pricing.tcgplayerHolo?.market != null) return card.pricing.tcgplayerHolo.market;
    if (card.pricing.cardmarket?.trend != null) return card.pricing.cardmarket.trend * 1.08;
    if (card.pricing.cardmarketHolo?.trend != null) return card.pricing.cardmarketHolo.trend * 1.08;
  }
  if (card.prices?.market != null) {
    return card.prices.currency === "EUR" ? card.prices.market * 1.08 : card.prices.market;
  }
  return null;
}

/**
 * Format a USD price for display.
 */
export function formatUsd(value: number): string {
  return `$${value.toFixed(2)}`;
}

/**
 * Price distribution bucket ranges.
 */
export const PRICE_BUCKETS = [
  { label: "$0 – $1", min: 0, max: 1 },
  { label: "$1 – $5", min: 1, max: 5 },
  { label: "$5 – $25", min: 5, max: 25 },
  { label: "$25 – $100", min: 25, max: 100 },
  { label: "$100+", min: 100, max: Infinity },
] as const;
