/**
 * Card set indexer.
 * Fetches card images from a set, computes MobileNet embeddings for each,
 * and returns an embedding database for recognition.
 */

import { computeEmbedding, CardEmbeddingEntry } from "./embeddings";

export interface PokemonSet {
  id: string;
  name: string;
  logo?: string;
  cardCount: { total: number; official: number };
}

export interface SetCard {
  id: string;
  localId: string;
  name: string;
  image?: string;
}

export async function fetchSets(): Promise<PokemonSet[]> {
  const res = await fetch("https://api.tcgdex.net/v2/en/sets");
  if (!res.ok) return [];
  return res.json();
}

export async function fetchSetCards(setId: string): Promise<SetCard[]> {
  const res = await fetch(`https://api.tcgdex.net/v2/en/sets/${setId}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.cards ?? [];
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
  onProgress?: (progress: IndexProgress) => void
): Promise<CardEmbeddingEntry[]> {
  const cards = await fetchSetCards(setId);
  const entries: CardEmbeddingEntry[] = [];

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    onProgress?.({ current: i + 1, total: cards.length, cardName: card.name });

    if (!card.image) continue;

    try {
      // TCGdex image URL format: base/high.webp
      const imageUrl = `${card.image}/high.webp`;
      const imageData = await loadImageData(imageUrl);
      const embedding = await computeEmbedding(imageData);

      entries.push({
        id: card.id,
        name: card.name,
        embedding,
        imageUrl,
        set: setId,
      });
    } catch (err) {
      console.warn(`Failed to index ${card.name}:`, err);
      // Continue with next card
    }
  }

  return entries;
}
