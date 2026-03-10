/**
 * TCGCSV pricing integration for Hololive and Riftbound.
 * Fetches prices from TCGCSV (TCGPlayer proxy) and attaches them to CardData.
 *
 * Strategy: fetch only the specific group (set) needed, not the entire category.
 * Groups list is cached, then individual group prices are fetched on demand.
 */

import { CardData, CardPricing } from "@/types";
import { fetchGroups, fetchPrices, buildNumberToProductMap, toCardPricing } from "./tcgcsv";

// TCGCSV category IDs
const HOLOLIVE_CATEGORY = 87;
const RIFTBOUND_CATEGORY = 89;

// ---------- Group list cache ----------

interface GroupEntry {
  groupId: number;
  name: string;
}

const groupsCache = new Map<number, { groups: GroupEntry[]; ts: number }>();
const GROUPS_TTL = 3600_000; // 1 hour

async function getGroups(categoryId: number): Promise<GroupEntry[]> {
  const cached = groupsCache.get(categoryId);
  if (cached && Date.now() - cached.ts < GROUPS_TTL) return cached.groups;
  const groups = await fetchGroups(categoryId);
  groupsCache.set(categoryId, { groups, ts: Date.now() });
  return groups;
}

// ---------- Per-group pricing cache ----------

interface GroupPricing {
  byNumber: Map<string, CardPricing>;
  byProductId: Map<number, CardPricing>;
  ts: number;
}

const groupPricingCache = new Map<string, GroupPricing>();
const PRICING_TTL = 3600_000; // 1 hour

async function getGroupPricing(categoryId: number, groupId: number, source: string): Promise<GroupPricing> {
  const key = `${categoryId}-${groupId}`;
  const cached = groupPricingCache.get(key);
  if (cached && Date.now() - cached.ts < PRICING_TTL) return cached;

  const [{ numberMap }, prices] = await Promise.all([
    buildNumberToProductMap(categoryId, groupId),
    fetchPrices(categoryId, groupId),
  ]);

  const byNumber = new Map<string, CardPricing>();
  const byProductId = new Map<number, CardPricing>();

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

  const result: GroupPricing = { byNumber, byProductId, ts: Date.now() };
  groupPricingCache.set(key, result);
  return result;
}

// ---------- Group matching ----------

/** Map our Hololive set code prefix to TCGCSV group name keywords */
const HOLOLIVE_SET_TO_GROUP: Record<string, string> = {
  hYS01: "Start Cheer",
  hSD01: "SD01",
  hBP01: "Blooming Radiance",
  hSD02: "SD02",
  hSD03: "SD03",
  hSD04: "SD04",
  hBP02: "Quintet Spectrum",
  hSD05: "SD05",
  hSD06: "SD06",
  hSD07: "SD07",
  hBP03: "Elite Spark",
  hBP04: "Curious Universe",
  hBP05: "Enchant",
  hPR: "Promos",
};

function findHololiveGroup(cardNo: string, groups: GroupEntry[]): GroupEntry | undefined {
  // Extract set code: "hBP01-001" → "hBP01"
  const setCode = cardNo.replace(/-\d+$/, "");

  // Try direct mapping
  const keyword = HOLOLIVE_SET_TO_GROUP[setCode];
  if (keyword) {
    const match = groups.find((g) => g.name.toLowerCase().includes(keyword.toLowerCase()));
    if (match) return match;
  }

  // Fallback: try matching set code in group name
  return groups.find((g) => g.name.toLowerCase().includes(setCode.toLowerCase()));
}

function findRiftboundGroup(setName: string, groups: GroupEntry[]): GroupEntry | undefined {
  // Match by set name (e.g. "Origins", "Spiritforged")
  return groups.find((g) => g.name.toLowerCase().includes(setName.toLowerCase()));
}

// ---------- Public API ----------

/**
 * Attach TCGPlayer pricing to a Hololive card.
 * Fetches only the matching group (2 requests max, cached for 1h).
 */
export async function attachHololivePricing(card: CardData): Promise<CardData> {
  try {
    const groups = await getGroups(HOLOLIVE_CATEGORY);
    const cardNo = card.details?.cardNo ?? card.id;
    const group = findHololiveGroup(cardNo, groups);
    if (!group) return card;

    const pricing = await getGroupPricing(HOLOLIVE_CATEGORY, group.groupId, "TCGPlayer");
    const cardPricing = pricing.byNumber.get(cardNo);
    if (cardPricing) return { ...card, pricing: cardPricing };
  } catch (err) {
    console.warn("[TCGCSV] Failed to fetch Hololive pricing:", err);
  }
  return card;
}

/**
 * Attach TCGPlayer pricing to multiple Hololive cards.
 * Groups cards by set, fetches only the needed groups.
 */
export async function attachHololivePricingBatch(cards: CardData[]): Promise<CardData[]> {
  try {
    const groups = await getGroups(HOLOLIVE_CATEGORY);

    // Collect unique sets needed
    const setsNeeded = new Map<number, GroupEntry>();
    for (const card of cards) {
      const cardNo = card.details?.cardNo ?? card.id;
      const group = findHololiveGroup(cardNo, groups);
      if (group) setsNeeded.set(group.groupId, group);
    }

    // Fetch pricing for needed groups in parallel
    const pricingByGroup = new Map<number, GroupPricing>();
    await Promise.all(
      Array.from(setsNeeded.values()).map(async (g) => {
        const p = await getGroupPricing(HOLOLIVE_CATEGORY, g.groupId, "TCGPlayer");
        pricingByGroup.set(g.groupId, p);
      })
    );

    return cards.map((card) => {
      const cardNo = card.details?.cardNo ?? card.id;
      const group = findHololiveGroup(cardNo, groups);
      if (!group) return card;
      const pricing = pricingByGroup.get(group.groupId);
      const cardPricing = pricing?.byNumber.get(cardNo);
      return cardPricing ? { ...card, pricing: cardPricing } : card;
    });
  } catch (err) {
    console.warn("[TCGCSV] Failed to fetch Hololive pricing:", err);
    return cards;
  }
}

/**
 * Attach TCGPlayer pricing to a Riftbound card.
 */
export async function attachRiftboundPricing(
  card: CardData,
  tcgplayerId?: number
): Promise<CardData> {
  try {
    const groups = await getGroups(RIFTBOUND_CATEGORY);
    const group = findRiftboundGroup(card.set, groups);
    if (!group) return card;

    const pricing = await getGroupPricing(RIFTBOUND_CATEGORY, group.groupId, "TCGPlayer");

    // Try by productId first
    if (tcgplayerId) {
      const p = pricing.byProductId.get(tcgplayerId);
      if (p) return { ...card, pricing: p };
    }

    // Fallback to card number
    const number = card.id.replace(/^[^-]+-/, "").replace("-", "/");
    const p = pricing.byNumber.get(number);
    if (p) return { ...card, pricing: p };
  } catch (err) {
    console.warn("[TCGCSV] Failed to fetch Riftbound pricing:", err);
  }
  return card;
}

/**
 * Attach TCGPlayer pricing to multiple Riftbound cards.
 */
export async function attachRiftboundPricingBatch(
  cards: CardData[],
  tcgplayerIds?: Map<string, number>
): Promise<CardData[]> {
  try {
    const groups = await getGroups(RIFTBOUND_CATEGORY);

    // Collect unique sets needed
    const setsNeeded = new Map<number, GroupEntry>();
    for (const card of cards) {
      const group = findRiftboundGroup(card.set, groups);
      if (group) setsNeeded.set(group.groupId, group);
    }

    // Fetch pricing for needed groups in parallel
    const pricingByGroup = new Map<number, GroupPricing>();
    await Promise.all(
      Array.from(setsNeeded.values()).map(async (g) => {
        const p = await getGroupPricing(RIFTBOUND_CATEGORY, g.groupId, "TCGPlayer");
        pricingByGroup.set(g.groupId, p);
      })
    );

    return cards.map((card) => {
      const group = findRiftboundGroup(card.set, groups);
      if (!group) return card;
      const pricing = pricingByGroup.get(group.groupId);
      if (!pricing) return card;

      const tcgId = tcgplayerIds?.get(card.id);
      if (tcgId) {
        const p = pricing.byProductId.get(tcgId);
        if (p) return { ...card, pricing: p };
      }

      const number = card.id.replace(/^[^-]+-/, "").replace("-", "/");
      const p = pricing.byNumber.get(number);
      return p ? { ...card, pricing: p } : card;
    });
  } catch (err) {
    console.warn("[TCGCSV] Failed to fetch Riftbound pricing:", err);
    return cards;
  }
}
