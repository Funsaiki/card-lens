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

function getPokemonImageUrl(card: SetCard): string {
  return card.image ? `${card.image}/high.webp` : "";
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
  if (!card.image) return "";
  const fullUrl = getHololiveImageUrl(card.image);
  return `/api/image-proxy?url=${encodeURIComponent(fullUrl)}`;
}

// ---------- Generic API ----------

export async function fetchSets(game?: CardGame): Promise<GameSet[]> {
  switch (game) {
    case "hololive":
      return fetchHololiveSets();
    case "pokemon":
    default:
      return fetchPokemonSets();
  }
}

export async function fetchSetCards(setId: string, game?: CardGame): Promise<SetCard[]> {
  switch (game) {
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
  const cards = await fetchSetCards(setId, game);
  const entries: CardEmbeddingEntry[] = [];

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    onProgress?.({ current: i + 1, total: cards.length, cardName: card.name });

    if (!card.image) continue;

    try {
      const imageUrl =
        game === "hololive"
          ? getHololiveProxiedImageUrl(card)
          : getPokemonImageUrl(card);

      const imageData = await loadImageData(imageUrl);
      const embedding = await computeEmbedding(imageData);

      entries.push({
        id: card.id,
        name: card.name,
        embedding,
        imageUrl:
          game === "hololive"
            ? getHololiveImageUrl(card.image)
            : imageUrl,
        set: setId,
        game: game ?? "pokemon",
      });
    } catch (err) {
      console.warn(`Failed to index ${card.name}:`, err);
    }
  }

  return entries;
}
