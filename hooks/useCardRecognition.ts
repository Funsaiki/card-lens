"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { captureFrame, extractCardRegion as extractCardRegionFallback } from "@/lib/recognition";
import {
  computeEmbedding,
  cosineSimilarity,
  CardEmbeddingEntry,
} from "@/lib/embeddings";
import { searchCards, fetchCardById } from "@/lib/cards-api";
import { loadAllEmbeddings, saveEmbeddings, deleteSetEmbeddings } from "@/lib/embedding-store";
import { CardData, CardGame, SessionCard } from "@/types";
import {
  initCardDetect,
  detectCard,
  extractCardRegion as extractCardRegionWasm,
  isCardDetectReady,
} from "@/lib/card-detect";

interface UseCardRecognitionOptions {
  game: CardGame;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  enabled?: boolean;
  intervalMs?: number;
  frameHeightPercent?: number;
}

// Require VOTES_NEEDED out of VOTE_WINDOW recent frames to confirm a match
const VOTES_NEEDED = 3;
const VOTE_WINDOW = 5;

// Minimum cosine similarity to consider a match (0-1)
const MATCH_THRESHOLD = 0.5;

// Card output dimensions for perspective-corrected extraction
const CARD_OUT_W = 224;
const CARD_OUT_H = 312; // ~63:88 aspect ratio

export function useCardRecognition({
  game,
  videoRef,
  enabled = true,
  intervalMs = 1500,
  frameHeightPercent = 0.75,
}: UseCardRecognitionOptions) {
  const [currentCard, setCurrentCard] = useState<CardData | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [history, setHistory] = useState<SessionCard[]>([]);
  const [embeddingDatabase, setEmbeddingDatabase] = useState<CardEmbeddingEntry[]>([]);
  const [debugInfo, setDebugInfo] = useState("");
  const [dbLoading, setDbLoading] = useState(true);
  const [wasmReady, setWasmReady] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const confirmedCardRef = useRef<string>("");
  const processingRef = useRef(false);
  const voteBufferRef = useRef<(string | null)[]>([]);

  // Refs for stable processFrame
  const embeddingDatabaseRef = useRef<CardEmbeddingEntry[]>([]);
  embeddingDatabaseRef.current = embeddingDatabase;
  const gameRef = useRef(game);
  gameRef.current = game;
  const frameHeightRef = useRef(frameHeightPercent);
  frameHeightRef.current = frameHeightPercent;

  useEffect(() => {
    if (!canvasRef.current) {
      canvasRef.current = document.createElement("canvas");
    }
  }, []);

  // Initialize WASM card detection module
  useEffect(() => {
    initCardDetect()
      .then(() => {
        setWasmReady(true);
        console.log("[Recognition] WASM card detection ready");
      })
      .catch((err) => {
        console.warn("[Recognition] WASM card detection unavailable, using fallback:", err);
      });
  }, []);

  // Load persisted embeddings from IndexedDB on mount
  useEffect(() => {
    loadAllEmbeddings()
      .then((entries) => {
        if (entries.length > 0) {
          setEmbeddingDatabase(entries);
          console.log(`[Recognition] Loaded ${entries.length} embeddings from IndexedDB`);
        }
      })
      .catch((err) => console.warn("[Recognition] Failed to load from IndexedDB:", err))
      .finally(() => setDbLoading(false));
  }, []);

  const addToEmbeddingDatabase = useCallback((entries: CardEmbeddingEntry[]) => {
    setEmbeddingDatabase((prev) => {
      const existingIds = new Set(prev.map((e) => e.id));
      const newEntries = entries.filter((e) => !existingIds.has(e.id));
      if (newEntries.length > 0) {
        saveEmbeddings(newEntries).catch((err) =>
          console.warn("[Recognition] Failed to save to IndexedDB:", err)
        );
      }
      const updated = [...prev, ...newEntries];
      console.log(`[Recognition] Embedding DB: ${updated.length} entries (${newEntries.length} new)`);
      return updated;
    });
  }, []);

  const addToHistory = useCallback((card: CardData, conf: number) => {
    setHistory((prev) => [
      { card, timestamp: Date.now(), confidence: conf },
      ...prev,
    ]);
  }, []);

  function getVoteWinner(buffer: (string | null)[]): string | null {
    const counts = new Map<string, number>();
    for (const id of buffer) {
      if (id) {
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }
    for (const [id, count] of Array.from(counts.entries())) {
      if (count >= VOTES_NEEDED) return id;
    }
    return null;
  }

  const processFrame = useCallback(async () => {
    if (processingRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;

    const allDb = embeddingDatabaseRef.current;
    const db = allDb.filter((e) => e.game === gameRef.current);
    if (db.length === 0) return;

    processingRef.current = true;
    setIsProcessing(true);

    try {
      const frame = captureFrame(video, canvas);
      if (!frame) return;

      // Try WASM card detection first, fall back to center crop
      let cardRegion: ImageData;
      let wasDetected = false;

      if (isCardDetectReady()) {
        const detection = detectCard(frame);
        if (detection.found) {
          cardRegion = extractCardRegionWasm(frame, detection.corners, CARD_OUT_W, CARD_OUT_H);
          wasDetected = true;
        } else {
          // Fallback: center crop
          cardRegion = extractCardRegionFallback(frame, frameHeightRef.current);
        }
      } else {
        cardRegion = extractCardRegionFallback(frame, frameHeightRef.current);
      }

      const embedding = await computeEmbedding(cardRegion);

      // Single pass: find best match (no threshold) for both debug and detection
      let bestMatch: CardEmbeddingEntry | null = null;
      let bestSimilarity = -Infinity;

      for (const ref of db) {
        const sim = cosineSimilarity(embedding, ref.embedding);
        if (sim > bestSimilarity) {
          bestSimilarity = sim;
          bestMatch = ref;
        }
      }

      const isAboveThreshold = bestMatch && bestSimilarity >= MATCH_THRESHOLD;

      // Update vote buffer
      const voteId = isAboveThreshold ? bestMatch!.id : null;
      voteBufferRef.current.push(voteId);
      if (voteBufferRef.current.length > VOTE_WINDOW) {
        voteBufferRef.current.shift();
      }

      if (isAboveThreshold) {
        const conf = Math.round(bestSimilarity * 100);
        const votes = voteBufferRef.current.filter((v) => v === bestMatch!.id).length;
        const detectLabel = wasDetected ? " [WASM]" : "";
        setDebugInfo(
          `${bestMatch!.name} sim=${bestSimilarity.toFixed(3)} (${conf}%) [${votes}/${VOTES_NEEDED} votes]${detectLabel}`
        );

        const winner = getVoteWinner(voteBufferRef.current);
        if (winner && winner !== confirmedCardRef.current) {
          confirmedCardRef.current = winner;
          const winnerEntry = db.find((e) => e.id === winner);
          if (!winnerEntry) return;

          console.log(`[Recognition] CONFIRMED: ${winnerEntry.name} (sim=${bestSimilarity.toFixed(3)})${detectLabel}`);
          setConfidence(conf);

          // Fetch full card data, fallback to embedding entry info
          let card: CardData;
          try {
            const fullCard = await fetchCardById(gameRef.current, winnerEntry.id);
            card = fullCard ?? {
              id: winnerEntry.id,
              name: winnerEntry.name,
              game: gameRef.current,
              set: winnerEntry.set,
              rarity: "",
              imageUrl: winnerEntry.imageUrl,
              details: {},
            };
          } catch {
            card = {
              id: winnerEntry.id,
              name: winnerEntry.name,
              game: gameRef.current,
              set: winnerEntry.set,
              rarity: "",
              imageUrl: winnerEntry.imageUrl,
              details: {},
            };
          }

          setCurrentCard(card);
          setHistory((prev) => [
            { card, timestamp: Date.now(), confidence: conf },
            ...prev,
          ]);
        }
      } else if (bestMatch) {
        setDebugInfo(`best: ${bestMatch.name} sim=${bestSimilarity.toFixed(3)} (too low)`);
      }
    } catch (err) {
      console.error("Recognition error:", err);
    } finally {
      processingRef.current = false;
      setIsProcessing(false);
    }
  }, [videoRef]);

  useEffect(() => {
    if (enabled) {
      intervalRef.current = setInterval(processFrame, intervalMs);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, intervalMs, processFrame]);

  const searchAndIndex = useCallback(
    async (query: string): Promise<CardData[]> => {
      const cards = await searchCards(game, query);
      if (cards.length === 1) {
        setCurrentCard(cards[0]);
        setHistory((prev) => [
          { card: cards[0], timestamp: Date.now(), confidence: 100 },
          ...prev,
        ]);
      }
      return cards;
    },
    [game]
  );

  const removeSet = useCallback(async (setId: string) => {
    try {
      await deleteSetEmbeddings(setId);
      setEmbeddingDatabase((prev) => prev.filter((e) => e.set !== setId));
      console.log(`[Recognition] Removed set: ${setId}`);
    } catch (err) {
      console.warn("[Recognition] Failed to remove set:", err);
    }
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    setCurrentCard(null);
    confirmedCardRef.current = "";
    voteBufferRef.current = [];
  }, []);

  return {
    currentCard,
    setCurrentCard,
    confidence,
    isProcessing,
    history,
    debugInfo,
    embeddingDatabase,
    dbLoading,
    wasmReady,
    searchAndIndex,
    addToHistory,
    addToEmbeddingDatabase,
    removeSet,
    clearHistory,
  };
}
