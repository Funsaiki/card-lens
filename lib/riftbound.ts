import { CardData } from "@/types";

export interface RiftboundRawCard {
  id: string;
  number: string;
  code: string;
  name: string;
  cleanName: string;
  images: { small: string; large: string };
  set: { id: string; name: string; releaseDate: string };
  tcgplayer?: { id: number; url: string };
  rarity: string | null;
  cardType: string | null;
  domain: string | null;
  energyCost: string | null;
  powerCost: string | null;
  might: string | null;
  description: string | null;
  flavorText: string | null;
}

export interface RiftboundSet {
  id: string;
  name: string;
  total: number;
  releaseDate: string;
}

// Lazy-loaded data cache
let setsCache: RiftboundSet[] | null = null;
let cardsCache: Map<string, RiftboundRawCard[]> | null = null;

const SET_FILES: Record<string, string> = {
  origins: "origins",
  "origins-proving-grounds": "origins-proving-grounds",
  spiritforged: "spiritforged",
};

export async function loadRiftboundSets(): Promise<RiftboundSet[]> {
  if (setsCache) return setsCache;
  const data = (await import("@/data/riftbound/sets.json")).default;
  setsCache = data as RiftboundSet[];
  return setsCache;
}

export async function loadRiftboundCards(setId: string): Promise<RiftboundRawCard[]> {
  if (!cardsCache) cardsCache = new Map();
  if (cardsCache.has(setId)) return cardsCache.get(setId)!;

  const file = SET_FILES[setId];
  if (!file) return [];

  let data: RiftboundRawCard[];
  switch (setId) {
    case "origins":
      data = (await import("@/data/riftbound/origins.json")).default as RiftboundRawCard[];
      break;
    case "origins-proving-grounds":
      data = (await import("@/data/riftbound/origins-proving-grounds.json")).default as RiftboundRawCard[];
      break;
    case "spiritforged":
      data = (await import("@/data/riftbound/spiritforged.json")).default as RiftboundRawCard[];
      break;
    default:
      return [];
  }

  // Filter out non-card products (boosters, displays, etc.)
  const cards = data.filter((c) => c.rarity !== null && c.cardType !== null);
  cardsCache.set(setId, cards);
  return cards;
}

export async function loadAllRiftboundCards(): Promise<RiftboundRawCard[]> {
  const sets = await loadRiftboundSets();
  const allCards: RiftboundRawCard[] = [];
  for (const set of sets) {
    const cards = await loadRiftboundCards(set.id);
    allCards.push(...cards);
  }
  return allCards;
}

function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, "");
}

export function parseRiftboundCard(raw: RiftboundRawCard): CardData {
  return {
    id: raw.id,
    name: raw.name,
    game: "riftbound",
    set: raw.set?.name ?? "Unknown",
    rarity: raw.rarity ?? "Unknown",
    imageUrl: raw.images?.large ?? raw.images?.small ?? "",
    details: {
      ...(raw.cardType ? { type: raw.cardType } : {}),
      ...(raw.domain ? { domain: raw.domain } : {}),
      ...(raw.energyCost && raw.energyCost !== "0" ? { energy: raw.energyCost } : {}),
      ...(raw.might && raw.might !== "0" ? { might: raw.might } : {}),
      ...(raw.description ? { text: stripHtml(raw.description) } : {}),
    },
  };
}
