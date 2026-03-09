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

// ---------- Custom dropdown ----------

interface SetDropdownProps {
  sets: GameSet[];
  indexedSetIds: Set<string>;
  selectedSet: string;
  onSelect: (id: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  disabled: boolean;
  loading: boolean;
}

function SetDropdown({
  sets,
  indexedSetIds,
  selectedSet,
  onSelect,
  searchQuery,
  onSearchChange,
  disabled,
  loading,
}: SetDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const selectedName = sets.find((s) => s.id === selectedSet)?.name;

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => {
          if (disabled) return;
          setOpen((v) => !v);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        disabled={disabled}
        className="w-full flex items-center justify-between px-2 py-1.5 text-xs bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 hover:border-zinc-600 focus:outline-none focus:border-zinc-500 disabled:opacity-50 transition-colors"
      >
        <span className={selectedSet ? "text-zinc-200" : "text-zinc-500"}>
          {loading
            ? "Loading sets..."
            : selectedName
              ? `${selectedName}`
              : `Choose a set... (${sets.length})`}
        </span>
        <svg
          className={`w-3 h-3 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl shadow-black/40 overflow-hidden animate-fade-in">
          {/* Search input */}
          <div className="p-1.5 border-b border-zinc-700">
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search sets..."
              className="w-full px-2 py-1 text-xs bg-zinc-900 border border-zinc-700 rounded text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
            />
          </div>

          {/* Options list */}
          <div className="max-h-48 overflow-y-auto">
            {sets.length === 0 ? (
              <p className="px-3 py-2 text-[11px] text-zinc-500">No sets found</p>
            ) : (
              sets.map((set) => {
                const isIndexed = indexedSetIds.has(set.id);
                const isSelected = set.id === selectedSet;
                return (
                  <button
                    key={set.id}
                    type="button"
                    disabled={isIndexed}
                    onClick={() => {
                      onSelect(set.id);
                      setOpen(false);
                      onSearchChange("");
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-left transition-colors ${
                      isIndexed
                        ? "text-zinc-600 cursor-default"
                        : isSelected
                          ? "bg-blue-600/20 text-blue-300"
                          : "text-zinc-300 hover:bg-zinc-700"
                    }`}
                  >
                    <span className="truncate">
                      {set.name}
                      <span className="text-zinc-500 ml-1">({set.cardCount.total})</span>
                    </span>
                    {isIndexed && (
                      <svg className="w-3 h-3 text-green-500 flex-shrink-0 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- SetIndexer ----------

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

  // Filter sets by search query
  const indexedSetIds = useMemo(() => new Set(indexedSets.map((s) => s.setId)), [indexedSets]);

  const filteredSets = useMemo(() => {
    if (!searchQuery.trim()) return sets;
    const q = searchQuery.toLowerCase();
    return sets.filter(
      (s) => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q)
    );
  }, [sets, searchQuery]);

  // Sets that haven't been indexed yet (for "Index All")
  const unindexedSets = useMemo(
    () => filteredSets.filter((s) => !indexedSetIds.has(s.id)),
    [filteredSets, indexedSetIds]
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
    } catch (err) {
      console.error("Indexing error:", err);
      setError("Indexing failed. Try again.");
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

    for (let i = 0; i < toIndex.length; i++) {
      if (cancelRef.current) {
        setError("Indexing cancelled.");
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
      } catch (err) {
        console.error(`Indexing error for ${set.id}:`, err);
      }
    }

    setIndexing(false);
    setProgress(null);
    setIndexAllProgress(null);
  }, [unindexedSets, onIndexComplete, ensureModel, game]);

  const handleCancel = useCallback(() => {
    cancelRef.current = true;
  }, []);

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

      {/* Set selector dropdown */}
      <SetDropdown
        sets={filteredSets}
        indexedSetIds={indexedSetIds}
        selectedSet={selectedSet}
        onSelect={setSelectedSet}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        disabled={indexing || loading || dbLoading}
        loading={loading}
      />

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleIndex}
          disabled={!selectedSet || indexing || dbLoading || indexedSetIds.has(selectedSet)}
          className="flex-1 px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white rounded-lg transition-colors"
        >
          {indexing && !indexAllProgress ? "Indexing..." : "Index Set"}
        </button>
        {!indexing ? (
          <button
            onClick={handleIndexAll}
            disabled={unindexedSets.length === 0 || indexing || dbLoading}
            title={`Index ${unindexedSets.length} remaining set${unindexedSets.length !== 1 ? "s" : ""}`}
            className="px-3 py-1.5 text-xs bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:hover:bg-purple-600 text-white rounded-lg transition-colors whitespace-nowrap"
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
