/**
 * Card set indexer.
 * Fetches card images from a set, computes MobileNet embeddings for each,
 * and returns an embedding database for recognition.
 */

import { computeEmbedding, CardEmbeddingEntry } from "./embeddings";
import { CardGame } from "@/types";
import { HOLOLIVE_SET_NAMES, getHololiveImageUrl, HololiveRawCard } from "./hololive";

export interface GameSet {
  id: string;
  name: string;
  cardCount: { total: number; official: number };
}

export interface SetCard {
  id: string;
  localId: string;
  name: string;
  image?: string;
}

// ---------- Pokemon (TCGdex) ----------

async function fetchPokemonSets(): Promise<GameSet[]> {
  const res = await fetch("https://api.tcgdex.net/v2/en/sets");
  if (!res.ok) return [];
  return res.json();
}

async function fetchPokemonSetCards(setId: string): Promise<SetCard[]> {
  const res = await fetch(`https://api.tcgdex.net/v2/en/sets/${setId}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.cards ?? [];
}

function pokemonImageUrl(card: SetCard, res: "low" | "high" = "high"): string {
  return card.image ? `${card.image}/${res}.webp` : "";
}

function proxyUrl(url: string): string {
  return `/api/image-proxy?url=${encodeURIComponent(url)}`;
}

// ---------- One Piece (OPTCG API) ----------

const OPTCG_BASE = "https://www.optcgapi.com/api";
const emptyCount = { total: 0, official: 0 };

async function fetchOnePieceSets(): Promise<GameSet[]> {
  const [setsRes, decksRes] = await Promise.all([
    fetch(`${OPTCG_BASE}/allSets/`),
    fetch(`${OPTCG_BASE}/allDecks/`),
  ]);

  const sets: GameSet[] = [];
  if (setsRes.ok) {
    const data: { set_name: string; set_id: string }[] = await setsRes.json();
    sets.push(...data.map((s) => ({ id: s.set_id, name: s.set_name, cardCount: emptyCount })));
  }
  if (decksRes.ok) {
    const data: { structure_deck_name: string; structure_deck_id: string }[] = await decksRes.json();
    sets.push(...data.map((d) => ({ id: d.structure_deck_id, name: d.structure_deck_name, cardCount: emptyCount })));
  }
  return sets;
}

async function fetchOnePieceSetCards(setId: string): Promise<SetCard[]> {
  const type = setId.startsWith("ST-") ? "decks" : "sets";
  const res = await fetch(`${OPTCG_BASE}/${type}/${setId}/`);
  if (!res.ok) return [];

  const data: { card_name: string; card_set_id: string; card_image: string }[] = await res.json();
  // Deduplicate (parallels have _p1 suffix)
  const seen = new Set<string>();
  return data.reduce<SetCard[]>((acc, c) => {
    if (!seen.has(c.card_set_id)) {
      seen.add(c.card_set_id);
      acc.push({ id: c.card_set_id, localId: c.card_set_id, name: c.card_name, image: c.card_image });
    }
    return acc;
  }, []);
}

// ---------- Riftbound (local data via API) ----------

async function fetchRiftboundSets(): Promise<GameSet[]> {
  const res = await fetch("/api/riftbound");
  if (!res.ok) return [];
  const data: { id: string; name: string; total: number }[] = await res.json();
  return data.map((s) => ({
    id: s.id,
    name: s.name,
    cardCount: { total: s.total, official: s.total },
  }));
}

async function fetchRiftboundSetCards(setId: string): Promise<SetCard[]> {
  const res = await fetch(`/api/riftbound?set=${encodeURIComponent(setId)}`);
  if (!res.ok) return [];
  const data: { id: string; name: string; image: string }[] = await res.json();
  return data.map((c) => ({ id: c.id, localId: c.id, name: c.name, image: c.image }));
}

// ---------- Hololive ----------

let hololiveDataCache: HololiveRawCard[] | null = null;

async function loadHololiveData(): Promise<HololiveRawCard[]> {
  if (hololiveDataCache) return hololiveDataCache;
  const res = await fetch("/api/hololive/cards");
  if (!res.ok) return [];
  hololiveDataCache = await res.json();
  return hololiveDataCache!;
}

async function fetchHololiveSets(): Promise<GameSet[]> {
  const cards = await loadHololiveData();
  const counts = new Map<string, number>();
  for (const card of cards) {
    for (const p of card.products) {
      counts.set(p, (counts.get(p) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .filter(([id]) => id !== "hPR") // Skip promos (no consistent images)
    .map(([id, count]) => ({
      id,
      name: HOLOLIVE_SET_NAMES[id] ?? id,
      cardCount: { total: count, official: count },
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

async function fetchHololiveSetCards(setId: string): Promise<SetCard[]> {
  const cards = await loadHololiveData();
  const seen = new Set<string>();
  const result: SetCard[] = [];
  for (const c of cards) {
    if (c.products.includes(setId) && !seen.has(c.cardno)) {
      seen.add(c.cardno);
      result.push({ id: c.cardno, localId: c.cardno, name: c.name, image: c.img });
    }
  }
  return result;
}

function getHololiveProxiedImageUrl(card: SetCard): string {
  return card.image ? proxyUrl(getHololiveImageUrl(card.image)) : "";
}

// ---------- Generic API ----------

export async function fetchSets(game?: CardGame): Promise<GameSet[]> {
  switch (game) {
    case "onepiece":
      return fetchOnePieceSets();
    case "riftbound":
      return fetchRiftboundSets();
    case "hololive":
      return fetchHololiveSets();
    case "pokemon":
    default:
      return fetchPokemonSets();
  }
}

export async function fetchSetCards(setId: string, game?: CardGame): Promise<SetCard[]> {
  switch (game) {
    case "onepiece":
      return fetchOnePieceSetCards(setId);
    case "riftbound":
      return fetchRiftboundSetCards(setId);
    case "hololive":
      return fetchHololiveSetCards(setId);
    case "pokemon":
    default:
      return fetchPokemonSetCards(setId);
  }
}

/**
 * Load an image URL into an ImageData via canvas.
 */
function loadImageData(url: string): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      resolve(ctx.getImageData(0, 0, img.width, img.height));
    };
    img.onerror = () => reject(new Error(`Failed to load: ${url}`));
    img.src = url;
  });
}

export interface IndexProgress {
  current: number;
  total: number;
  cardName: string;
}

/** Image URL for display (may go through proxy for CORS). */
export function getCardImageUrl(card: SetCard, game: CardGame, resolution: "low" | "high" = "low"): string {
  if (!card.image) return "";
  switch (game) {
    case "onepiece":
    case "riftbound":
      return card.image;
    case "hololive":
      return getHololiveProxiedImageUrl(card);
    case "pokemon":
    default:
      return pokemonImageUrl(card, resolution);
  }
}

/** Image URL for indexing (always proxied for CORS). */
function getIndexImageUrl(card: SetCard, game: CardGame): string {
  if (!card.image) return "";
  switch (game) {
    case "onepiece":
    case "riftbound":
      return proxyUrl(card.image);
    case "hololive":
      return getHololiveProxiedImageUrl(card);
    case "pokemon":
    default:
      return pokemonImageUrl(card);
  }
}

/** Original image URL for storage in embedding DB. */
function getStorageImageUrl(card: SetCard, game: CardGame): string {
  if (!card.image) return "";
  switch (game) {
    case "onepiece":
    case "riftbound":
      return card.image;
    case "hololive":
      return getHololiveImageUrl(card.image);
    case "pokemon":
    default:
      return pokemonImageUrl(card);
  }
}

/**
 * Index all cards in a set by computing their MobileNet embeddings.
 * Calls onProgress for each card processed.
 * Returns the embedding database entries.
 */
export async function indexSet(
  setId: string,
  onProgress?: (progress: IndexProgress) => void,
  game?: CardGame
): Promise<CardEmbeddingEntry[]> {
  const g = game ?? "pokemon";
  const cards = await fetchSetCards(setId, g);
  const entries: CardEmbeddingEntry[] = [];

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    onProgress?.({ current: i + 1, total: cards.length, cardName: card.name });

    if (!card.image) continue;

    try {
      const imageUrl = getIndexImageUrl(card, g);
      const imageData = await loadImageData(imageUrl);
      const embedding = await computeEmbedding(imageData);

      entries.push({
        id: card.id,
        name: card.name,
        embedding,
        imageUrl: getStorageImageUrl(card, g),
        set: setId,
        game: g,
      });
    } catch (err) {
      console.warn(`Failed to index ${card.name}:`, err);
    }
  }

  return entries;
}
