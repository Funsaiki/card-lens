import { CardData } from "@/types";

// ---------- Types (local JSON from apitcg) ----------

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

// ---------- Types (Riot API) ----------

interface RiotCardMedia {
  type: string;
  url: string;
  name: string;
}

interface RiotCardArt {
  thumbnailURL?: string;
  fullURL?: string;
  artist?: string;
}

interface RiotCardStats {
  cost?: number;
  energy?: number;
  might?: number;
  power?: number;
}

interface RiotCard {
  id: string;
  name: string;
  set: string;
  type: string;
  rarity: string;
  faction?: string;
  description?: string;
  flavorText?: string;
  collectorNumber?: number;
  keywords?: string[];
  tags?: string[];
  stats?: RiotCardStats;
  // Documented format
  art?: RiotCardArt;
  // Actual format (per GitHub issue #1093)
  media?: RiotCardMedia[];
}

interface RiotSet {
  id: string;
  name: string;
  cards: RiotCard[];
}

interface RiotContentResponse {
  game: string;
  lastUpdated: string;
  version: string;
  sets: RiotSet[];
}

// ---------- Riot API fetcher ----------

const RIOT_API_BASE = "https://americas.api.riotgames.com";
const RIOT_CARD_IMAGE_BASE = "https://riftbound.leagueoflegends.com";

let riotCache: { data: RiotContentResponse; fetchedAt: number } | null = null;
const RIOT_CACHE_TTL = 60 * 60 * 1000; // 1 hour

async function fetchRiotContent(): Promise<RiotContentResponse | null> {
  const apiKey = process.env.RIOT_API_KEY;
  if (!apiKey) return null;

  if (riotCache && Date.now() - riotCache.fetchedAt < RIOT_CACHE_TTL) {
    return riotCache.data;
  }

  try {
    const res = await fetch(
      `${RIOT_API_BASE}/riftbound/content/v1/contents?locale=en`,
      { headers: { "X-Riot-Token": apiKey }, next: { revalidate: 3600 } }
    );
    if (!res.ok) {
      console.warn(`[Riftbound] Riot API returned ${res.status}`);
      return null;
    }
    const data: RiotContentResponse = await res.json();
    riotCache = { data, fetchedAt: Date.now() };
    return data;
  } catch (err) {
    console.warn("[Riftbound] Riot API fetch failed:", err);
    return null;
  }
}

function getRiotCardImage(card: RiotCard): string {
  // Try documented format first
  if (card.art?.fullURL) return card.art.fullURL;
  if (card.art?.thumbnailURL) return card.art.thumbnailURL;

  // Try actual format (media array)
  if (card.media?.length) {
    const full = card.media.find((m) => m.type === "full" || m.type === "card_art");
    const any = full ?? card.media[0];
    if (any?.url) {
      // URL might be relative or absolute
      if (any.url.startsWith("http")) return any.url;
      return `${RIOT_CARD_IMAGE_BASE}${any.url}`;
    }
  }

  return "";
}

function parseRiotCard(card: RiotCard, setName: string): CardData {
  return {
    id: card.id,
    name: card.name,
    game: "riftbound",
    set: setName,
    rarity: card.rarity ?? "Unknown",
    imageUrl: getRiotCardImage(card),
    details: {
      ...(card.type ? { type: card.type } : {}),
      ...(card.faction ? { domain: card.faction } : {}),
      ...(card.stats?.energy ? { energy: String(card.stats.energy) } : {}),
      ...(card.stats?.might ? { might: String(card.stats.might) } : {}),
      ...(card.stats?.power ? { power: String(card.stats.power) } : {}),
      ...(card.description ? { text: stripHtml(card.description) } : {}),
    },
  };
}

// ---------- Public API (Riot-first, local fallback) ----------

export async function loadAllRiftboundCardsWithRiot(): Promise<{ cards: CardData[]; source: "riot" | "local" }> {
  const riot = await fetchRiotContent();
  if (riot?.sets?.length) {
    const cards: CardData[] = [];
    for (const set of riot.sets) {
      for (const card of set.cards) {
        cards.push(parseRiotCard(card, set.name));
      }
    }
    if (cards.length > 0) return { cards, source: "riot" };
  }

  // Fallback to local data
  const local = await loadAllRiftboundCards();
  return { cards: local.map(parseRiftboundCard), source: "local" };
}

// ---------- Local JSON fallback ----------

let localCardsCache: Map<string, RiftboundRawCard[]> | null = null;

const SET_FILES: Record<string, string> = {
  origins: "origins",
  "origins-proving-grounds": "origins-proving-grounds",
  spiritforged: "spiritforged",
};

export async function loadRiftboundSets(): Promise<RiftboundSet[]> {
  const data = (await import("@/data/riftbound/sets.json")).default;
  return data as RiftboundSet[];
}

export async function loadRiftboundCards(setId: string): Promise<RiftboundRawCard[]> {
  if (!localCardsCache) localCardsCache = new Map();
  if (localCardsCache.has(setId)) return localCardsCache.get(setId)!;

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

  const cards = data.filter((c) => c.rarity !== null && c.cardType !== null);
  localCardsCache.set(setId, cards);
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
