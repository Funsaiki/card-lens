/**
 * Card recognition via MobileNet embeddings.
 *
 * Uses MobileNet v2 to extract feature vectors (embeddings) from card images,
 * then compares them using cosine similarity for robust matching.
 */

import * as tf from "@tensorflow/tfjs";
import * as mobilenet from "@tensorflow-models/mobilenet";

// ---------- Model management ----------

let model: mobilenet.MobileNet | null = null;
let modelLoading: Promise<mobilenet.MobileNet> | null = null;
const modelListeners: Set<(loaded: boolean) => void> = new Set();

function notifyListeners(loaded: boolean) {
  modelListeners.forEach((listener) => listener(loaded));
}

/**
 * Subscribe to model loading state changes.
 * Returns an unsubscribe function.
 */
export function onModelStateChange(listener: (loaded: boolean) => void): () => void {
  modelListeners.add(listener);
  // Immediately notify with current state
  listener(model !== null);
  return () => modelListeners.delete(listener);
}

/**
 * Load the MobileNet model (singleton, loaded once).
 */
export async function loadModel(): Promise<mobilenet.MobileNet> {
  if (model) return model;
  if (modelLoading) return modelLoading;

  modelLoading = mobilenet.load({ version: 2, alpha: 1.0 }).then((m) => {
    model = m;
    console.log("[Embeddings] MobileNet v2 loaded");
    notifyListeners(true);
    return m;
  });

  return modelLoading;
}

export function isModelLoaded(): boolean {
  return model !== null;
}

// ---------- Embedding computation ----------

/**
 * Compute embedding from ImageData.
 * Returns a normalized float32 array of 1280 dimensions.
 */
export async function computeEmbedding(imageData: ImageData): Promise<Float32Array> {
  const m = await loadModel();

  // Convert ImageData to a canvas so MobileNet can process it
  const canvas = document.createElement("canvas");
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  canvas.getContext("2d")!.putImageData(imageData, 0, 0);

  // infer(canvas, true) returns the embedding (before classification layer)
  const embeddingTensor = m.infer(canvas, true);
  const data = await embeddingTensor.data();
  embeddingTensor.dispose();

  // Normalize the embedding vector (unit length for cosine similarity)
  const embedding = new Float32Array(data);
  normalize(embedding);

  return embedding;
}

/**
 * Compute embedding directly from an HTMLCanvasElement.
 */
export async function computeEmbeddingFromCanvas(canvas: HTMLCanvasElement): Promise<Float32Array> {
  const m = await loadModel();

  const embeddingTensor = m.infer(canvas, true);
  const data = await embeddingTensor.data();
  embeddingTensor.dispose();

  const embedding = new Float32Array(data);
  normalize(embedding);

  return embedding;
}

// ---------- Similarity ----------

/**
 * Cosine similarity between two normalized vectors.
 * Returns a value between -1 and 1 (1 = identical).
 */
export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) return -1;
  let dot = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
  }
  return dot;
}

// ---------- Matching ----------

export interface CardEmbeddingEntry {
  id: string;
  name: string;
  embedding: Float32Array;
  imageUrl: string;
  set: string;
}

export interface EmbeddingMatch {
  entry: CardEmbeddingEntry;
  similarity: number;
}

/**
 * Find the best matching card by cosine similarity.
 * threshold: minimum similarity to consider a match (0-1, e.g. 0.6)
 */
export function findBestEmbeddingMatch(
  queryEmbedding: Float32Array,
  references: CardEmbeddingEntry[],
  threshold: number = 0.5
): EmbeddingMatch | null {
  let bestMatch: CardEmbeddingEntry | null = null;
  let bestSimilarity = -Infinity;

  for (const ref of references) {
    const sim = cosineSimilarity(queryEmbedding, ref.embedding);
    if (sim > bestSimilarity) {
      bestSimilarity = sim;
      bestMatch = ref;
    }
  }

  if (bestMatch && bestSimilarity >= threshold) {
    return { entry: bestMatch, similarity: bestSimilarity };
  }
  return null;
}

/**
 * Find the top N matches sorted by similarity.
 */
export function findTopMatches(
  queryEmbedding: Float32Array,
  references: CardEmbeddingEntry[],
  topN: number = 10
): EmbeddingMatch[] {
  const scored: EmbeddingMatch[] = references.map((entry) => ({
    entry,
    similarity: cosineSimilarity(queryEmbedding, entry.embedding),
  }));

  scored.sort((a, b) => b.similarity - a.similarity);
  return scored.slice(0, topN);
}

// ---------- Helpers ----------

function normalize(vec: Float32Array): void {
  let norm = 0;
  for (let i = 0; i < vec.length; i++) {
    norm += vec[i] * vec[i];
  }
  norm = Math.sqrt(norm);
  if (norm === 0) return;
  for (let i = 0; i < vec.length; i++) {
    vec[i] /= norm;
  }
}

/**
 * Serialize embedding for storage (e.g. IndexedDB, JSON).
 */
export function serializeEmbedding(embedding: Float32Array): number[] {
  return Array.from(embedding);
}

/**
 * Deserialize embedding from storage.
 */
export function deserializeEmbedding(data: number[]): Float32Array {
  const vec = new Float32Array(data);
  normalize(vec);
  return vec;
}

/**
 * Clean up TensorFlow memory.
 */
export function cleanup(): void {
  tf.disposeVariables();
}
