"use client";

import { useState, useEffect, useRef } from "react";
import type { GameSet } from "@/lib/indexer";

export interface SetDropdownProps {
  sets: GameSet[];
  indexedSetIds: Set<string>;
  selectedSet: string;
  onSelect: (id: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  disabled: boolean;
  loading: boolean;
}

export default function SetDropdown({
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
        className="w-full flex items-center justify-between px-2 py-1.5 text-xs bg-white/[0.04] border border-white/[0.08] rounded-lg text-zinc-200 hover:border-white/[0.15] focus:outline-none focus:border-indigo-500/50 disabled:opacity-50 transition-colors"
      >
        <span className={selectedSet ? "text-zinc-200" : "text-[var(--muted)]"}>
          {loading
            ? "Loading sets..."
            : selectedName
              ? `${selectedName}`
              : `Choose a set... (${sets.length})`}
        </span>
        <svg
          className={`w-3 h-3 text-[var(--muted)] transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-[var(--surface-light)] border border-white/[0.08] rounded-lg shadow-xl shadow-black/50 overflow-hidden animate-fade-in backdrop-blur-xl">
          {/* Search input */}
          <div className="p-1.5 border-b border-white/[0.06]">
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search sets..."
              className="w-full px-2 py-1 text-xs bg-white/[0.04] border border-white/[0.06] rounded text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50"
            />
          </div>

          {/* Options list */}
          <div className="max-h-48 overflow-y-auto">
            {sets.length === 0 ? (
              <p className="px-3 py-2 text-[11px] text-[var(--muted)]">No sets found</p>
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
                          ? "bg-indigo-500/15 text-indigo-300"
                          : "text-zinc-300 hover:bg-white/[0.06]"
                    }`}
                  >
                    <span className="truncate">
                      {set.name}
                      <span className="text-[var(--muted)] ml-1">({set.cardCount.total})</span>
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
