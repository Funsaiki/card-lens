export type CardGame = "pokemon" | "magic" | "yugioh" | "hololive";

export interface CardPrice {
  low?: number;
  mid?: number;
  high?: number;
  market?: number;
  currency: string;
}

export interface TCGPlayerPrice extends CardPrice {
  directLow?: number;
}

export interface CardmarketPrice extends CardPrice {
  trend?: number;
  avg1?: number;
  avg7?: number;
  avg30?: number;
}

export interface CardPricing {
  tcgplayer?: TCGPlayerPrice;
  tcgplayerHolo?: TCGPlayerPrice;
  cardmarket?: CardmarketPrice;
  cardmarketHolo?: CardmarketPrice;
}

export interface CardData {
  id: string;
  name: string;
  game: CardGame;
  set: string;
  rarity: string;
  imageUrl: string;
  prices?: CardPrice;       // legacy / simple (Magic, Yu-Gi-Oh)
  pricing?: CardPricing;    // multi-marketplace (Pokemon)
  details: Record<string, string>;
}

export interface SessionCard {
  card: CardData;
  timestamp: number;
  confidence: number;
}
