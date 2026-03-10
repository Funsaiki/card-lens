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

// ---------- OPTCG API (One Piece TCG) ----------

interface OPTCGCard {
  card_name: string;
  card_set_id: string;
  set_name: string;
  set_id: string;
  rarity: string;
  card_type: string;
  card_color: string;
  card_cost?: string;
  card_power?: string;
  card_text?: string;
  sub_types?: string;
  attribute?: string;
  life?: string;
  card_image: string;
  market_price?: number;
  inventory_price?: number;
}

export function parseOnePieceCard(raw: OPTCGCard): CardData {
  return {
    id: raw.card_set_id,
    name: raw.card_name,
    game: "onepiece",
    set: raw.set_name ?? "Unknown",
    rarity: raw.rarity ?? "Unknown",
    imageUrl: raw.card_image ?? "",
    prices: raw.market_price
      ? { market: raw.market_price, currency: "USD" }
      : undefined,
    details: {
      type: raw.card_type,
      color: raw.card_color,
      ...(raw.card_cost ? { cost: raw.card_cost } : {}),
      ...(raw.card_power ? { power: raw.card_power } : {}),
      ...(raw.attribute ? { attribute: raw.attribute } : {}),
      ...(raw.sub_types ? { traits: raw.sub_types } : {}),
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
