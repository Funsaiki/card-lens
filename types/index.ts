export type CardGame = "pokemon" | "magic" | "yugioh";

export interface CardPrice {
  low?: number;
  mid?: number;
  high?: number;
  market?: number;
  currency: string;
}

export interface CardPricing {
  tcgplayer?: CardPrice;
  cardmarket?: CardPrice;
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

export interface SignalMessage {
  sessionId: string;
  type: "offer" | "answer" | "ice-candidate";
  data: unknown;
}

export interface SignalStore {
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  iceCandidatesOffer: RTCIceCandidateInit[];
  iceCandidatesAnswer: RTCIceCandidateInit[];
  createdAt: number;
}

export interface SessionCard {
  card: CardData;
  timestamp: number;
  confidence: number;
}
