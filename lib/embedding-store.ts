/**
 * IndexedDB persistence for card embeddings.
 * Stores and retrieves CardEmbeddingEntry objects across sessions.
 */

import {
  CardEmbeddingEntry,
  serializeEmbedding,
  deserializeEmbedding,
} from "./embeddings";

const DB_NAME = "card-lens";
const DB_VERSION = 1;
const STORE_NAME = "embeddings";

interface StoredEntry {
  id: string;
  name: string;
  embedding: number[];
  imageUrl: string;
  set: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("set", "set", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save embedding entries to IndexedDB.
 */
export async function saveEmbeddings(entries: CardEmbeddingEntry[]): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);

  for (const entry of entries) {
    const stored: StoredEntry = {
      id: entry.id,
      name: entry.name,
      embedding: serializeEmbedding(entry.embedding),
      imageUrl: entry.imageUrl,
      set: entry.set,
    };
    store.put(stored);
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

/**
 * Load all embedding entries from IndexedDB.
 */
export async function loadAllEmbeddings(): Promise<CardEmbeddingEntry[]> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => {
      db.close();
      const stored: StoredEntry[] = request.result;
      const entries: CardEmbeddingEntry[] = stored.map((s) => ({
        id: s.id,
        name: s.name,
        embedding: deserializeEmbedding(s.embedding),
        imageUrl: s.imageUrl,
        set: s.set,
      }));
      resolve(entries);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

/**
 * Get the list of indexed sets with card counts.
 */
export async function getIndexedSets(): Promise<{ setId: string; count: number }[]> {
  const entries = await loadAllEmbeddings();
  const counts = new Map<string, number>();
  for (const entry of entries) {
    counts.set(entry.set, (counts.get(entry.set) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([setId, count]) => ({ setId, count }));
}

/**
 * Delete all embeddings for a given set.
 */
export async function deleteSetEmbeddings(setId: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  const index = store.index("set");

  return new Promise((resolve, reject) => {
    const request = index.getAllKeys(setId);
    request.onsuccess = () => {
      for (const key of request.result) {
        store.delete(key);
      }
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

/**
 * Clear all embeddings.
 */
export async function clearAllEmbeddings(): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  tx.objectStore(STORE_NAME).clear();

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}
