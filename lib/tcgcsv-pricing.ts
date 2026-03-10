/**
 * TCGCSV pricing integration for Hololive and Riftbound.
 * Fetches prices from TCGCSV (TCGPlayer proxy) and attaches them to CardData.
 */

import { CardData, CardPricing } from "@/types";
import { fetchGroups, fetchPrices, buildNumberToProductMap, toCardPricing } from "./tcgcsv";

// TCGCSV category IDs
const HOLOLIVE_CATEGORY = 87;
const RIFTBOUND_CATEGORY = 89;

// ---------- Cache ----------

interface PricingIndex {
  /** card number → pricing (for Hololive) */
  byNumber: Map<string, CardPricing>;
  /** productId → pricing (for Riftbound) */
  byProductId: Map<number, CardPricing>;
  fetchedAt: number;
}

let hololiveIndex: PricingIndex | null = null;
let riftboundIndex: PricingIndex | null = null;
const INDEX_TTL = 3600_000; // 1 hour

// ---------- Index builders ----------

async function buildPricingIndex(categoryId: number, source: string): Promise<PricingIndex> {
  const groups = await fetchGroups(categoryId);
  const byNumber = new Map<string, CardPricing>();
  const byProductId = new Map<number, CardPricing>();

  // Fetch all groups in parallel (batched to avoid overwhelming)
  const batchSize = 5;
  for (let i = 0; i < groups.length; i += batchSize) {
    const batch = groups.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (g) => {
        const [{ numberMap }, prices] = await Promise.all([
          buildNumberToProductMap(categoryId, g.groupId),
          fetchPrices(categoryId, g.groupId),
        ]);
        return { numberMap, prices };
      })
    );

    for (const { numberMap, prices } of results) {
      for (const [number, productId] of numberMap) {
        const price = prices.get(productId);
        if (price && price.marketPrice != null) {
          byNumber.set(number, toCardPricing(price, source));
        }
      }
      for (const [productId, price] of prices) {
        if (price.marketPrice != null) {
          byProductId.set(productId, toCardPricing(price, source));
        }
      }
    }
  }

  return { byNumber, byProductId, fetchedAt: Date.now() };
}

async function getHololiveIndex(): Promise<PricingIndex> {
  if (hololiveIndex && Date.now() - hololiveIndex.fetchedAt < INDEX_TTL) {
    return hololiveIndex;
  }
  hololiveIndex = await buildPricingIndex(HOLOLIVE_CATEGORY, "TCGPlayer");
  return hololiveIndex;
}

async function getRiftboundIndex(): Promise<PricingIndex> {
  if (riftboundIndex && Date.now() - riftboundIndex.fetchedAt < INDEX_TTL) {
    return riftboundIndex;
  }
  riftboundIndex = await buildPricingIndex(RIFTBOUND_CATEGORY, "TCGPlayer");
  return riftboundIndex;
}

// ---------- Public API ----------

/**
 * Attach TCGPlayer pricing to a Hololive card.
 * Matches by card number (e.g., "hBP01-001").
 */
export async function attachHololivePricing(card: CardData): Promise<CardData> {
  try {
    const index = await getHololiveIndex();
    const cardNo = card.details?.cardNo ?? card.id;
    const pricing = index.byNumber.get(cardNo);
    if (pricing) {
      return { ...card, pricing };
    }
  } catch (err) {
    console.warn("[TCGCSV] Failed to fetch Hololive pricing:", err);
  }
  return card;
}

/**
 * Attach TCGPlayer pricing to multiple Hololive cards.
 */
export async function attachHololivePricingBatch(cards: CardData[]): Promise<CardData[]> {
  try {
    const index = await getHololiveIndex();
    return cards.map((card) => {
      const cardNo = card.details?.cardNo ?? card.id;
      const pricing = index.byNumber.get(cardNo);
      return pricing ? { ...card, pricing } : card;
    });
  } catch (err) {
    console.warn("[TCGCSV] Failed to fetch Hololive pricing:", err);
    return cards;
  }
}

/**
 * Attach TCGPlayer pricing to a Riftbound card.
 * Matches by tcgplayer productId stored in local data, or by card number.
 */
export async function attachRiftboundPricing(
  card: CardData,
  tcgplayerId?: number
): Promise<CardData> {
  try {
    const index = await getRiftboundIndex();
    let pricing: CardPricing | undefined;

    // Try by productId first
    if (tcgplayerId) {
      pricing = index.byProductId.get(tcgplayerId);
    }

    // Fallback to card number matching
    if (!pricing) {
      // Riftbound numbers are like "001/298", TCGCSV might store as "001/298" or just "001"
      const number = card.id.replace(/^[^-]+-/, "").replace("-", "/"); // "origins-001-298" → "001/298"
      pricing = index.byNumber.get(number);
    }

    if (pricing) {
      return { ...card, pricing };
    }
  } catch (err) {
    console.warn("[TCGCSV] Failed to fetch Riftbound pricing:", err);
  }
  return card;
}

/**
 * Attach TCGPlayer pricing to multiple Riftbound cards.
 * Accepts an optional map of cardId → tcgplayerProductId.
 */
export async function attachRiftboundPricingBatch(
  cards: CardData[],
  tcgplayerIds?: Map<string, number>
): Promise<CardData[]> {
  try {
    const index = await getRiftboundIndex();
    return cards.map((card) => {
      let pricing: CardPricing | undefined;

      const tcgId = tcgplayerIds?.get(card.id);
      if (tcgId) {
        pricing = index.byProductId.get(tcgId);
      }

      if (!pricing) {
        const number = card.id.replace(/^[^-]+-/, "").replace("-", "/");
        pricing = index.byNumber.get(number);
      }

      return pricing ? { ...card, pricing } : card;
    });
  } catch (err) {
    console.warn("[TCGCSV] Failed to fetch Riftbound pricing:", err);
    return cards;
  }
}
