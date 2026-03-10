"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  GameSet,
  fetchSets,
  indexSet,
  IndexProgress,
} from "@/lib/indexer";
import { CardEmbeddingEntry, loadModel, onModelStateChange } from "@/lib/embeddings";
import { CardGame } from "@/types";
import { toast } from "sonner";
import Dropdown from "./Dropdown";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [indexAllProgress, setIndexAllProgress] = useState<{ current: number; total: number } | null>(null);
  const cancelRef = useRef(false);

  // Subscribe to model state
  useEffect(() => {
    return onModelStateChange((loaded) => setModelReady(loaded));
  }, []);

  useEffect(() => {
    setLoading(true);
    setSelectedSet("");
    fetchSets(game).then((s) => {
      // For games with known card counts, filter out huge sets
      const filtered = s.filter((set) =>
        set.cardCount.total === 0 || set.cardCount.total <= 300
      );
      setSets(filtered);
      setLoading(false);
    });
  }, [game]);

  const indexedSetIds = useMemo(() => new Set(indexedSets.map((s) => s.setId)), [indexedSets]);

  // Sets that haven't been indexed yet (for "Index All")
  const unindexedSets = useMemo(
    () => sets.filter((s) => !indexedSetIds.has(s.id)),
    [sets, indexedSetIds]
  );

  // Dropdown options
  const setOptions = useMemo(
    () => sets.map((s) => ({
      value: s.id,
      label: s.cardCount.total > 0 ? `${s.name} (${s.cardCount.total})` : s.name,
    })),
    [sets]
  );

  const ensureModel = useCallback(async () => {
    if (modelReady) return true;
    setModelLoading(true);
    try {
      await loadModel();
      setModelLoading(false);
      return true;
    } catch {
      setError("Failed to load AI model.");
      setModelLoading(false);
      return false;
    }
  }, [modelReady]);

  const handleIndex = useCallback(async () => {
    if (!selectedSet) return;

    setIndexing(true);
    setError(null);
    setProgress(null);

    if (!(await ensureModel())) {
      setIndexing(false);
      return;
    }

    try {
      const entries = await indexSet(selectedSet, (p) => setProgress(p), game);
      onIndexComplete(entries);
      toast.success(`${entries.length} cards indexed`);
    } catch (err) {
      console.error("Indexing error:", err);
      setError("Indexing failed. Try again.");
      toast.error("Indexing failed");
    } finally {
      setIndexing(false);
      setProgress(null);
    }
  }, [selectedSet, onIndexComplete, ensureModel, game]);

  const handleIndexAll = useCallback(async () => {
    if (unindexedSets.length === 0) return;

    setIndexing(true);
    setError(null);
    setProgress(null);
    cancelRef.current = false;

    if (!(await ensureModel())) {
      setIndexing(false);
      return;
    }

    const toIndex = [...unindexedSets];
    setIndexAllProgress({ current: 0, total: toIndex.length });

    let indexed = 0;
    for (let i = 0; i < toIndex.length; i++) {
      if (cancelRef.current) {
        toast("Indexing cancelled", { description: `${indexed} set${indexed !== 1 ? "s" : ""} completed` });
        break;
      }

      const set = toIndex[i];
      setIndexAllProgress({ current: i + 1, total: toIndex.length });

      try {
        const entries = await indexSet(
          set.id,
          (p) => setProgress({ ...p, cardName: `[${set.name}] ${p.cardName}` }),
          game
        );
        onIndexComplete(entries);
        indexed++;
      } catch (err) {
        console.error(`Indexing error for ${set.id}:`, err);
        toast.error(`Failed to index ${set.name}`);
      }
    }

    if (!cancelRef.current) {
      toast.success(`All ${indexed} sets indexed`);
    }

    setIndexing(false);
    setProgress(null);
    setIndexAllProgress(null);
  }, [unindexedSets, onIndexComplete, ensureModel, game]);

  const handleCancel = useCallback(() => {
    cancelRef.current = true;
  }, []);

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
          <span className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-[11px] text-[var(--muted)]">Loading saved database...</p>
        </div>
      ) : indexedCount > 0 && !indexing ? (
        <p className="text-[11px] text-green-400/80">
          {indexedCount} cards loaded. You can add more sets below.
        </p>
      ) : (
        <p className="text-[11px] text-[var(--muted)] leading-relaxed">
          Index a set to enable camera recognition.
        </p>
      )}

      {/* Set selector dropdown */}
      <Dropdown
        options={setOptions}
        value={selectedSet}
        onChange={setSelectedSet}
        searchable
        search={searchQuery}
        onSearchChange={setSearchQuery}
        disabled={indexing || loading || dbLoading}
        disabledValues={indexedSetIds}
        placeholder={loading ? "Loading sets..." : `Choose a set... (${sets.length})`}
        renderOption={(opt, { disabled: isDisabled }) => (
          <span className="flex items-center justify-between w-full">
            <span className="truncate">{opt.label}</span>
            {isDisabled && (
              <svg className="w-3 h-3 text-green-500 flex-shrink-0 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </span>
        )}
      />

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleIndex}
          disabled={!selectedSet || indexing || dbLoading || indexedSetIds.has(selectedSet)}
          className="flex-1 px-3 py-1.5 text-xs bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 text-white rounded-lg transition-all"
        >
          {indexing && !indexAllProgress ? "Indexing..." : "Index Set"}
        </button>
        {!indexing ? (
          <button
            onClick={handleIndexAll}
            disabled={unindexedSets.length === 0 || indexing || dbLoading}
            title={`Index ${unindexedSets.length} remaining set${unindexedSets.length !== 1 ? "s" : ""}`}
            className="px-3 py-1.5 text-xs bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-lg transition-colors whitespace-nowrap"
          >
            All ({unindexedSets.length})
          </button>
        ) : (
          <button
            onClick={handleCancel}
            className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors whitespace-nowrap"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Index all progress */}
      {indexAllProgress && (
        <p className="text-[10px] text-purple-400">
          Set {indexAllProgress.current}/{indexAllProgress.total}
        </p>
      )}

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
          <div className="flex justify-between text-[10px] text-[var(--muted)]">
            <span className="truncate max-w-[140px]">{progress.cardName}</span>
            <span>{progress.current}/{progress.total}</span>
          </div>
          <div className="w-full bg-white/[0.06] rounded-full h-1">
            <div
              className="bg-gradient-to-r from-indigo-500 to-violet-500 h-1 rounded-full transition-all duration-200"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {error && <p className="text-[11px] text-red-400">{error}</p>}

      {/* Indexed sets list */}
      {indexedSets.length > 0 && !dbLoading && (
        <div className="space-y-1 pt-1 border-t border-white/[0.06]">
          <p className="text-[11px] text-[var(--muted)] font-medium">Indexed sets:</p>
          {indexedSets.map(({ setId, count }) => {
            const setInfo = sets.find((s) => s.id === setId);
            return (
              <div
                key={setId}
                className="flex items-center justify-between bg-white/[0.03] border border-white/[0.04] rounded px-2 py-1.5 animate-fade-in hover:bg-white/[0.06] transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-[11px] text-zinc-300 truncate">
                    {setInfo?.name ?? setId}
                  </p>
                  <p className="text-[10px] text-[var(--muted)]">{count} cards</p>
                </div>
                <button
                  onClick={() => onRemoveSet(setId)}
                  disabled={indexing}
                  className="text-[var(--muted)] hover:text-red-400 transition-colors p-1 flex-shrink-0 disabled:opacity-50"
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
        <p className="text-[11px] text-[var(--muted)]">
          Point camera at a card from the indexed set.
        </p>
      )}
    </div>
  );
}
