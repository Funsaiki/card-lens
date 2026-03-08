"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { captureFrame, extractCardRegion } from "@/lib/recognition";
import {
  computeEmbedding,
  findBestEmbeddingMatch,
  CardEmbeddingEntry,
} from "@/lib/embeddings";
import { searchCards, fetchCardById } from "@/lib/cards-api";
import { loadAllEmbeddings, saveEmbeddings } from "@/lib/embedding-store";
import { CardData, CardGame, SessionCard } from "@/types";

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

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const confirmedCardRef = useRef<string>("");
  const processingRef = useRef(false);

  // Vote buffer: last N match IDs
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
        // Persist new entries to IndexedDB
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

  /**
   * Check if a card ID has enough votes in the recent buffer.
   */
  function getVoteWinner(buffer: (string | null)[]): string | null {
    const counts = new Map<string, number>();
    for (const id of buffer) {
      if (id) {
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }
    for (const [id, count] of Array.from(counts.entries())) {
      if (count >= VOTES_NEEDED) {
        return id;
      }
    }
    return null;
  }

  const processFrame = useCallback(async () => {
    if (processingRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    if (video.readyState < 2) return;

    const db = embeddingDatabaseRef.current;
    if (db.length === 0) return;

    processingRef.current = true;
    setIsProcessing(true);

    try {
      const frame = captureFrame(video, canvas);
      if (!frame) return;

      const cardRegion = extractCardRegion(frame, frameHeightRef.current);
      const embedding = await computeEmbedding(cardRegion);

      // Find best match
      const match = findBestEmbeddingMatch(embedding, db, MATCH_THRESHOLD);
      // Also get absolute best for debug (threshold 0)
      const closest = findBestEmbeddingMatch(embedding, db, 0);

      if (match) {
        // Add vote
        voteBufferRef.current.push(match.entry.id);
        if (voteBufferRef.current.length > VOTE_WINDOW) {
          voteBufferRef.current.shift();
        }

        const conf = Math.round(match.similarity * 100);
        setDebugInfo(
          `${match.entry.name} sim=${match.similarity.toFixed(3)} (${conf}%) [${voteBufferRef.current.filter((v) => v === match.entry.id).length}/${VOTES_NEEDED} votes]`
        );

        // Check if we have a consensus
        const winner = getVoteWinner(voteBufferRef.current);
        if (winner && winner !== confirmedCardRef.current) {
          confirmedCardRef.current = winner;
          const winnerEntry = db.find((e) => e.id === winner);
          if (!winnerEntry) return;

          console.log(`[Recognition] CONFIRMED: ${winnerEntry.name} (sim=${match.similarity.toFixed(3)})`);
          setConfidence(conf);

          try {
            // Fetch by exact ID to get the correct set/rarity/price
            const fullCard = await fetchCardById(gameRef.current, winnerEntry.id);
            if (fullCard) {
              setCurrentCard(fullCard);
              setHistory((prev) => [
                { card: fullCard, timestamp: Date.now(), confidence: conf },
                ...prev,
              ]);
            } else {
              // Fallback to basic info from embedding entry
              const fallback: CardData = {
                id: winnerEntry.id,
                name: winnerEntry.name,
                game: gameRef.current,
                set: winnerEntry.set,
                rarity: "",
                imageUrl: winnerEntry.imageUrl,
                details: {},
              };
              setCurrentCard(fallback);
              setHistory((prev) => [
                { card: fallback, timestamp: Date.now(), confidence: conf },
                ...prev,
              ]);
            }
          } catch {
            setCurrentCard({
              id: winnerEntry.id,
              name: winnerEntry.name,
              game: gameRef.current,
              set: winnerEntry.set,
              rarity: "",
              imageUrl: winnerEntry.imageUrl,
              details: {},
            });
          }
        }
      } else {
        // No match above threshold
        voteBufferRef.current.push(null);
        if (voteBufferRef.current.length > VOTE_WINDOW) {
          voteBufferRef.current.shift();
        }

        if (closest) {
          setDebugInfo(`best: ${closest.entry.name} sim=${closest.similarity.toFixed(3)} (too low)`);
        }
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
    searchAndIndex,
    addToHistory,
    addToEmbeddingDatabase,
    clearHistory,
  };
}
