"use client";

import { useState, useEffect, useCallback } from "react";
import {
  GameSet,
  fetchSets,
  indexSet,
  IndexProgress,
} from "@/lib/indexer";
import { CardEmbeddingEntry, loadModel, onModelStateChange } from "@/lib/embeddings";
import { CardGame } from "@/types";

interface IndexedSetInfo {
  setId: string;
  count: number;
}

interface SetIndexerProps {
  game: CardGame;
  onIndexComplete: (entries: CardEmbeddingEntry[]) => void;
  indexedCount: number;
  indexedSets: IndexedSetInfo[];
  onRemoveSet: (setId: string) => void;
  dbLoading: boolean;
}

export default function SetIndexer({ game, onIndexComplete, indexedCount, indexedSets, onRemoveSet, dbLoading }: SetIndexerProps) {
  const [sets, setSets] = useState<GameSet[]>([]);
  const [loading, setLoading] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const [progress, setProgress] = useState<IndexProgress | null>(null);
  const [selectedSet, setSelectedSet] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Subscribe to model state
  useEffect(() => {
    return onModelStateChange((loaded) => setModelReady(loaded));
  }, []);

  useEffect(() => {
    if (game !== "pokemon" && game !== "hololive") {
      setSets([]);
      return;
    }
    setLoading(true);
    fetchSets(game).then((s) => {
      setSets(s.filter((set) => set.cardCount.total <= 300));
      setLoading(false);
    });
  }, [game]);

  const handleIndex = useCallback(async () => {
    if (!selectedSet) return;

    setIndexing(true);
    setError(null);
    setProgress(null);

    // Ensure model is loaded first
    if (!modelReady) {
      setModelLoading(true);
      try {
        await loadModel();
      } catch {
        setError("Failed to load AI model.");
        setIndexing(false);
        setModelLoading(false);
        return;
      }
      setModelLoading(false);
    }

    try {
      const entries = await indexSet(selectedSet, (p) => setProgress(p), game);
      onIndexComplete(entries);
    } catch (err) {
      console.error("Indexing error:", err);
      setError("Indexing failed. Try again.");
    } finally {
      setIndexing(false);
      setProgress(null);
    }
  }, [selectedSet, onIndexComplete, modelReady, game]);

  if (game !== "pokemon" && game !== "hololive") {
    return (
      <div className="p-4 text-center">
        <p className="text-zinc-400 text-sm">
          Indexing is only available for Pokemon TCG and Hololive OCG for now.
        </p>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-zinc-300">Card Database</h3>
        {indexedCount > 0 && (
          <span className="text-[10px] text-green-400">{indexedCount} cards</span>
        )}
      </div>

      {/* DB loading indicator */}
      {dbLoading ? (
        <div className="flex items-center gap-2 py-2">
          <span className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-[11px] text-zinc-400">Loading saved database...</p>
        </div>
      ) : indexedCount > 0 && !indexing ? (
        <p className="text-[11px] text-green-400/80">
          {indexedCount} cards loaded. You can add more sets below.
        </p>
      ) : (
        <p className="text-[11px] text-zinc-500 leading-relaxed">
          Index a set to enable camera recognition.
        </p>
      )}

      {/* Set selector */}
      <select
        value={selectedSet}
        onChange={(e) => setSelectedSet(e.target.value)}
        disabled={indexing || loading || dbLoading}
        className="w-full px-2 py-1.5 text-xs bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none focus:border-zinc-500 disabled:opacity-50"
      >
        <option value="">
          {loading ? "Loading sets..." : "Choose a set..."}
        </option>
        {sets.map((set) => (
          <option key={set.id} value={set.id}>
            {set.name} ({set.cardCount.total})
          </option>
        ))}
      </select>

      <button
        onClick={handleIndex}
        disabled={!selectedSet || indexing || dbLoading}
        className="w-full px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white rounded-lg transition-colors"
      >
        {indexing ? "Indexing..." : "Index Set"}
      </button>

      {/* Model loading indicator */}
      {modelLoading && (
        <div className="flex items-center gap-2 py-1">
          <span className="w-3 h-3 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-[11px] text-yellow-400">Loading AI model (~14 MB)...</p>
        </div>
      )}

      {/* Progress bar */}
      {indexing && progress && (
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-zinc-400">
            <span className="truncate max-w-[140px]">{progress.cardName}</span>
            <span>{progress.current}/{progress.total}</span>
          </div>
          <div className="w-full bg-zinc-700 rounded-full h-1">
            <div
              className="bg-blue-500 h-1 rounded-full transition-all duration-200"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {error && <p className="text-[11px] text-red-400">{error}</p>}

      {/* Indexed sets list */}
      {indexedSets.length > 0 && !dbLoading && (
        <div className="space-y-1 pt-1 border-t border-zinc-800">
          <p className="text-[11px] text-zinc-500 font-medium">Indexed sets:</p>
          {indexedSets.map(({ setId, count }) => {
            const setInfo = sets.find((s) => s.id === setId);
            return (
              <div
                key={setId}
                className="flex items-center justify-between bg-zinc-800/50 rounded px-2 py-1.5 animate-fade-in hover:bg-zinc-800 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-[11px] text-zinc-300 truncate">
                    {setInfo?.name ?? setId}
                  </p>
                  <p className="text-[10px] text-zinc-500">{count} cards</p>
                </div>
                <button
                  onClick={() => onRemoveSet(setId)}
                  disabled={indexing}
                  className="text-zinc-500 hover:text-red-400 transition-colors p-1 flex-shrink-0 disabled:opacity-50"
                  title="Remove set"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {indexedCount > 0 && !indexing && !dbLoading && (
        <p className="text-[11px] text-zinc-500">
          Point camera at a card from the indexed set.
        </p>
      )}
    </div>
  );
}
