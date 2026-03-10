export type CardGame = "pokemon" | "onepiece" | "riftbound" | "hololive";

export const GAME_LABELS: Record<CardGame, string> = {
  pokemon: "Pokemon TCG",
  onepiece: "One Piece TCG",
  riftbound: "Riftbound",
  hololive: "Hololive OCG",
};

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
  prices?: CardPrice;       // legacy / simple (One Piece, Riftbound)
  pricing?: CardPricing;    // multi-marketplace (Pokemon)
  details: Record<string, string>;
}

export interface SessionCard {
  card: CardData;
  timestamp: number;
  confidence: number;
}

// ---------- Collection ----------

export type CardCondition =
  | "mint"
  | "near_mint"
  | "lightly_played"
  | "moderately_played"
  | "heavily_played"
  | "damaged";

export const CONDITION_LABELS: Record<CardCondition, string> = {
  mint: "Mint",
  near_mint: "Near Mint",
  lightly_played: "Lightly Played",
  moderately_played: "Moderately Played",
  heavily_played: "Heavily Played",
  damaged: "Damaged",
};

export interface CollectionItem {
  id: string;
  cardId: string;
  game: CardGame;
  cardName: string;
  cardSet: string | null;
  cardRarity: string | null;
  cardImageUrl: string | null;
  cardData: CardData;
  quantity: number;
  condition: CardCondition;
  notes: string | null;
  addedAt: string;
}
