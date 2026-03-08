import { CardData, CardGame, CardPricing, TCGPlayerPrice, CardmarketPrice } from "@/types";

// ---------- Pokemon (TCGdex — free, no key required) ----------

interface TCGdexCardSummary {
  id: string;
  localId: string;
  name: string;
  image?: string;
}

interface TCGdexTCGPlayerVariant {
  productId?: number;
  lowPrice?: number;
  midPrice?: number;
  highPrice?: number;
  marketPrice?: number;
  directLowPrice?: number;
}

interface TCGdexPricing {
  cardmarket?: {
    avg?: number;
    low?: number;
    trend?: number;
    avg1?: number;
    avg7?: number;
    avg30?: number;
    "avg-holo"?: number;
    "low-holo"?: number;
    "trend-holo"?: number;
    "avg1-holo"?: number;
    "avg7-holo"?: number;
    "avg30-holo"?: number;
  };
  tcgplayer?: {
    normal?: TCGdexTCGPlayerVariant;
    "reverse-holofoil"?: TCGdexTCGPlayerVariant;
  } | null;
}

interface TCGdexCardFull {
  id: string;
  name: string;
  image?: string;
  rarity?: string;
  category?: string;
  hp?: number;
  types?: string[];
  stage?: string;
  set?: { name: string; id: string };
  pricing?: TCGdexPricing;
}

function parseTCGPlayerVariant(v: TCGdexTCGPlayerVariant): TCGPlayerPrice {
  return {
    low: v.lowPrice,
    mid: v.midPrice,
    high: v.highPrice,
    market: v.marketPrice,
    directLow: v.directLowPrice,
    currency: "USD",
  };
}

function parseTCGdexPricing(raw?: TCGdexPricing): CardPricing | undefined {
  if (!raw) return undefined;
  const pricing: CardPricing = {};

  if (raw.tcgplayer) {
    if (raw.tcgplayer.normal) {
      pricing.tcgplayer = parseTCGPlayerVariant(raw.tcgplayer.normal);
    }
    if (raw.tcgplayer["reverse-holofoil"]) {
      pricing.tcgplayerHolo = parseTCGPlayerVariant(raw.tcgplayer["reverse-holofoil"]);
    }
  }

  if (raw.cardmarket) {
    const cm = raw.cardmarket;
    const cardmarket: CardmarketPrice = {
      low: cm.low,
      mid: cm.avg,
      market: cm.trend,
      trend: cm.trend,
      avg1: cm.avg1,
      avg7: cm.avg7,
      avg30: cm.avg30,
      currency: "EUR",
    };
    pricing.cardmarket = cardmarket;

    if (cm["trend-holo"] != null) {
      pricing.cardmarketHolo = {
        low: cm["low-holo"],
        mid: cm["avg-holo"],
        market: cm["trend-holo"],
        trend: cm["trend-holo"],
        avg1: cm["avg1-holo"],
        avg7: cm["avg7-holo"],
        avg30: cm["avg30-holo"],
        currency: "EUR",
      };
    }
  }

  if (!pricing.tcgplayer && !pricing.tcgplayerHolo && !pricing.cardmarket && !pricing.cardmarketHolo) return undefined;
  return pricing;
}

export function parsePokemonCard(raw: TCGdexCardFull): CardData {
  const pricing = parseTCGdexPricing(raw.pricing);

  return {
    id: raw.id,
    name: raw.name,
    game: "pokemon",
    set: raw.set?.name ?? "Unknown",
    rarity: raw.rarity ?? "Unknown",
    imageUrl: raw.image ? `${raw.image}/high.webp` : "",
    pricing,
    details: {
      ...(raw.types ? { type: raw.types.join(", ") } : {}),
      ...(raw.hp ? { hp: String(raw.hp) } : {}),
      ...(raw.category ? { category: raw.category } : {}),
      ...(raw.stage ? { stage: raw.stage } : {}),
    },
  };
}

export function parsePokemonSummary(raw: TCGdexCardSummary): CardData {
  return {
    id: raw.id,
    name: raw.name,
    game: "pokemon",
    set: "",
    rarity: "",
    imageUrl: raw.image ? `${raw.image}/high.webp` : "",
    details: {},
  };
}

// ---------- Scryfall API (Magic: The Gathering) ----------

interface ScryfallCard {
  id: string;
  name: string;
  set_name: string;
  rarity: string;
  image_uris?: { normal: string; large: string };
  prices: { usd?: string; usd_foil?: string };
  type_line?: string;
  mana_cost?: string;
  oracle_text?: string;
}

export function parseMagicCard(raw: ScryfallCard): CardData {
  return {
    id: raw.id,
    name: raw.name,
    game: "magic",
    set: raw.set_name,
    rarity: raw.rarity,
    imageUrl: raw.image_uris?.large ?? raw.image_uris?.normal ?? "",
    prices: raw.prices.usd
      ? {
          market: parseFloat(raw.prices.usd),
          currency: "USD",
        }
      : undefined,
    details: {
      ...(raw.type_line ? { type: raw.type_line } : {}),
      ...(raw.mana_cost ? { manaCost: raw.mana_cost } : {}),
      ...(raw.oracle_text ? { text: raw.oracle_text } : {}),
    },
  };
}

// ---------- YGOProdeck API (Yu-Gi-Oh) ----------

interface YGOCard {
  id: number;
  name: string;
  type: string;
  race: string;
  card_images: { image_url: string; image_url_small: string }[];
  card_sets?: { set_name: string; set_rarity: string }[];
  card_prices?: { tcgplayer_price: string; cardmarket_price: string }[];
  atk?: number;
  def?: number;
  level?: number;
  desc?: string;
}

export function parseYugiohCard(raw: YGOCard): CardData {
  const price = raw.card_prices?.[0];
  const set = raw.card_sets?.[0];

  return {
    id: String(raw.id),
    name: raw.name,
    game: "yugioh",
    set: set?.set_name ?? "Unknown",
    rarity: set?.set_rarity ?? "Unknown",
    imageUrl: raw.card_images[0]?.image_url ?? "",
    prices: price
      ? {
          market: parseFloat(price.tcgplayer_price) || undefined,
          currency: "USD",
        }
      : undefined,
    details: {
      type: raw.type,
      race: raw.race,
      ...(raw.atk !== undefined ? { atk: String(raw.atk) } : {}),
      ...(raw.def !== undefined ? { def: String(raw.def) } : {}),
      ...(raw.level !== undefined ? { level: String(raw.level) } : {}),
    },
  };
}

// ---------- Generic search ----------

export async function searchCards(
  game: CardGame,
  query: string
): Promise<CardData[]> {
  const res = await fetch(
    `/api/cards?game=${game}&query=${encodeURIComponent(query)}`
  );
  if (!res.ok) return [];
  const json = await res.json();
  return json.cards ?? [];
}

/**
 * Fetch a single card by its exact ID.
 * Falls back to null if not found.
 */
export async function fetchCardById(
  game: CardGame,
  cardId: string
): Promise<CardData | null> {
  const res = await fetch(
    `/api/cards?game=${game}&id=${encodeURIComponent(cardId)}`
  );
  if (!res.ok) return null;
  const json = await res.json();
  return json.card ?? null;
}
