/**
 * TCGCSV client — free public proxy for TCGPlayer pricing data.
 * https://tcgcsv.com
 *
 * Category IDs:
 *   68 = One Piece Card Game
 *   87 = hololive OFFICIAL CARD GAME
 *   89 = Riftbound League of Legends TCG
 */

const BASE = "https://tcgcsv.com/tcgplayer";

// Cache prices in memory for the lifetime of the serverless function
const priceCache = new Map<string, { data: TCGCSVPriceMap; ts: number }>();
const CACHE_TTL = 3600_000; // 1 hour

export interface TCGCSVProduct {
  productId: number;
  name: string;
  cleanName: string;
  imageUrl: string;
  url: string;
  extendedData: { name: string; displayName: string; value: string }[];
}

export interface TCGCSVPrice {
  productId: number;
  lowPrice: number | null;
  midPrice: number | null;
  highPrice: number | null;
  marketPrice: number | null;
  directLowPrice: number | null;
  subTypeName: string; // "Normal" | "Foil" etc.
}

/** Map of productId → price data */
export type TCGCSVPriceMap = Map<number, TCGCSVPrice>;

/** Map of card number (from extendedData) → productId */
export type TCGCSVNumberMap = Map<string, number>;

/** TCGCSV wraps all responses in { success, errors, results: T } */
interface TCGCSVResponse<T> {
  success: boolean;
  errors: string[];
  results: T;
}

async function fetchResults<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const json: TCGCSVResponse<T> = await res.json();
    if (!json.success) return null;
    return json.results;
  } catch {
    return null;
  }
}

/**
 * Fetch all groups (sets) for a category.
 */
export async function fetchGroups(categoryId: number): Promise<{ groupId: number; name: string }[]> {
  const data = await fetchResults<{ groupId: number; name: string }[]>(
    `${BASE}/${categoryId}/groups`
  );
  return data ?? [];
}

/**
 * Fetch all products for a specific group.
 */
export async function fetchProducts(categoryId: number, groupId: number): Promise<TCGCSVProduct[]> {
  const data = await fetchResults<TCGCSVProduct[]>(
    `${BASE}/${categoryId}/${groupId}/products`
  );
  return data ?? [];
}

/**
 * Fetch all prices for a specific group, returns a Map keyed by productId.
 */
export async function fetchPrices(categoryId: number, groupId: number): Promise<TCGCSVPriceMap> {
  const cacheKey = `${categoryId}-${groupId}`;
  const cached = priceCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  const data = await fetchResults<TCGCSVPrice[]>(
    `${BASE}/${categoryId}/${groupId}/prices`
  );
  const map: TCGCSVPriceMap = new Map();
  if (data) {
    for (const p of data) {
      // Prefer "Normal" subtype; only add Foil if no Normal exists
      if (!map.has(p.productId) || p.subTypeName === "Normal") {
        map.set(p.productId, p);
      }
    }
  }
  priceCache.set(cacheKey, { data: map, ts: Date.now() });
  return map;
}

/**
 * Build a mapping from card number → productId for a group.
 * Uses the "Number" field from extendedData.
 */
export async function buildNumberToProductMap(
  categoryId: number,
  groupId: number
): Promise<{ numberMap: TCGCSVNumberMap; products: Map<number, TCGCSVProduct> }> {
  const items = await fetchProducts(categoryId, groupId);
  const numberMap: TCGCSVNumberMap = new Map();
  const products = new Map<number, TCGCSVProduct>();

  for (const item of items) {
    products.set(item.productId, item);
    const numField = item.extendedData.find((e) => e.name === "Number");
    if (numField) {
      numberMap.set(numField.value, item.productId);
    }
  }
  return { numberMap, products };
}

/**
 * Convert a TCGCSV price entry to our CardPricing format.
 */
export function toCardPricing(price: TCGCSVPrice, source: string): import("@/types").CardPricing {
  return {
    tcgplayer: {
      low: price.lowPrice ?? undefined,
      mid: price.midPrice ?? undefined,
      high: price.highPrice ?? undefined,
      market: price.marketPrice ?? undefined,
      directLow: price.directLowPrice ?? undefined,
      currency: "USD",
    },
    source,
  };
}
