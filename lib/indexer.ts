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
const emptyCount = Object.freeze({ total: 0, official: 0 });

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

  const data: { card_name: string; card_set_id: string; card_image: string; card_image_id?: string }[] = await res.json();
  // Use card_image_id as unique key (parallels/box toppers get _p1 suffix)
  const seen = new Set<string>();
  return data.reduce<SetCard[]>((acc, c) => {
    const uniqueId = c.card_image_id ?? c.card_set_id;
    if (!seen.has(uniqueId)) {
      seen.add(uniqueId);
      acc.push({ id: uniqueId, localId: c.card_set_id, name: c.card_name, image: c.card_image });
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

let hololiveDataCache: { data: HololiveRawCard[]; ts: number } | null = null;
const HOLOLIVE_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

async function loadHololiveData(): Promise<HololiveRawCard[]> {
  if (hololiveDataCache && Date.now() - hololiveDataCache.ts < HOLOLIVE_CACHE_TTL) {
    return hololiveDataCache.data;
  }
  const res = await fetch("/api/hololive/cards");
  if (!res.ok) return [];
  const data: HololiveRawCard[] = await res.json();
  hololiveDataCache = { data, ts: Date.now() };
  return data;
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
  const result: SetCard[] = [];
  // Count duplicates per cardno to detect alternate-art variants
  const countByCardno = new Map<string, number>();
  const setCards = cards.filter((c) => c.products.includes(setId));
  for (const c of setCards) {
    countByCardno.set(c.cardno, (countByCardno.get(c.cardno) ?? 0) + 1);
  }
  const seenCardno = new Map<string, number>();
  for (const c of setCards) {
    const count = countByCardno.get(c.cardno) ?? 1;
    const seenCount = seenCardno.get(c.cardno) ?? 0;
    seenCardno.set(c.cardno, seenCount + 1);
    // Use numeric id to make each entry unique
    const uniqueId = String(c.id);
    const label = count > 1 ? `${c.name} (${c.rarity})` : c.name;
    result.push({ id: uniqueId, localId: c.cardno, name: label, image: c.img });
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

type ImagePurpose = "display" | "index" | "storage";

/**
 * Resolve the correct image URL for a card based on purpose:
 * - display: for rendering in the UI (may proxy for CORS)
 * - index: for computing embeddings (always proxied for canvas CORS)
 * - storage: original URL for persisting in the embedding DB
 */
function resolveImageUrl(card: SetCard, game: CardGame, purpose: ImagePurpose, resolution: "low" | "high" = "low"): string {
  if (!card.image) return "";
  switch (game) {
    case "onepiece":
    case "riftbound":
      return purpose === "index" ? proxyUrl(card.image) : card.image;
    case "hololive":
      return purpose === "storage" ? getHololiveImageUrl(card.image) : getHololiveProxiedImageUrl(card);
    case "pokemon":
    default:
      return pokemonImageUrl(card, purpose === "display" ? resolution : "low");
  }
}

/** Image URL for display (may go through proxy for CORS). */
export function getCardImageUrl(card: SetCard, game: CardGame, resolution: "low" | "high" = "low"): string {
  return resolveImageUrl(card, game, "display", resolution);
}

/** Raw image URL for DB storage (never proxied). */
export function getCardStorageUrl(card: SetCard, game: CardGame): string {
  return resolveImageUrl(card, game, "storage");
}

/** Display a URL that was previously stored in DB (already resolved).
 *  Proxies hololive URLs for CORS; leaves everything else as-is. */
export function displayStoredImageUrl(storedUrl: string | undefined): string {
  if (!storedUrl) return "";
  // Already proxied (legacy data)
  if (storedUrl.startsWith("/api/image-proxy")) return storedUrl;
  // Hololive URLs need CORS proxy
  if (storedUrl.includes("hololive-official-cardgame.com")) {
    return proxyUrl(storedUrl);
  }
  // Pokemon, One Piece, Riftbound — direct URLs work fine
  return storedUrl;
}

/**
 * Index all cards in a set by computing their MobileNet embeddings.
 * Uses a prefetch pipeline: fetches images ahead while computing embeddings.
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

  const PREFETCH_AHEAD = 4;
  const prefetchCache = new Map<number, Promise<ImageData | null>>();

  // Start prefetching an image (returns cached promise if already started)
  function prefetch(idx: number): Promise<ImageData | null> {
    if (prefetchCache.has(idx)) return prefetchCache.get(idx)!;
    const card = cards[idx];
    if (!card?.image) {
      const p = Promise.resolve(null);
      prefetchCache.set(idx, p);
      return p;
    }
    const imageUrl = resolveImageUrl(card, g, "index");
    const p = loadImageData(imageUrl).catch(() => null);
    prefetchCache.set(idx, p);
    return p;
  }

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    onProgress?.({ current: i + 1, total: cards.length, cardName: card.name });

    // Kick off prefetches for upcoming cards
    for (let j = i; j < Math.min(i + PREFETCH_AHEAD, cards.length); j++) {
      prefetch(j);
    }

    if (!card.image) continue;

    try {
      const imageData = await prefetch(i);
      if (!imageData) continue;

      // Free the cache entry to avoid holding all images in memory
      prefetchCache.delete(i);

      const embedding = await computeEmbedding(imageData);

      entries.push({
        id: card.id,
        name: card.name,
        embedding,
        imageUrl: resolveImageUrl(card, g, "storage"),
        set: setId,
        game: g,
      });
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.warn(`Failed to index ${card.name}:`, err);
      }
    }
  }

  return entries;
}
