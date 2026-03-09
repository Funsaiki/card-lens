"use client";

import { SessionCard } from "@/types";
import Image from "next/image";

interface SessionHistoryProps {
  history: SessionCard[];
  onSelect: (card: SessionCard) => void;
  onClear: () => void;
}

export default function SessionHistory({
  history,
  onSelect,
  onClear,
}: SessionHistoryProps) {
  if (history.length === 0) {
    return (
      <div className="p-4 text-center text-[var(--muted)] text-sm">
        <p>No cards scanned yet</p>
        <p className="text-xs mt-1">Scanned cards will appear here</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06]">
        <h3 className="text-sm font-medium text-zinc-300">
          Session ({history.length})
        </h3>
        <button
          onClick={onClear}
          className="text-xs text-[var(--muted)] hover:text-zinc-300 transition-colors"
        >
          Clear
        </button>
      </div>

      <div className="overflow-y-auto max-h-[300px]">
        {history.map((entry, index) => (
          <button
            key={`${entry.card.id}-${entry.timestamp}`}
            onClick={() => onSelect(entry)}
            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-white/[0.04] transition-all text-left border-b border-white/[0.04] last:border-b-0 animate-slide-in-right hover:translate-x-1"
            style={{ animationDelay: `${index * 50}ms`, animationFillMode: "both" }}
          >
            {/* Thumbnail */}
            <div className="relative w-10 h-14 rounded overflow-hidden flex-shrink-0 bg-zinc-800/50">
              {entry.card.imageUrl && (
                <Image
                  src={entry.card.imageUrl}
                  alt={entry.card.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-zinc-200 truncate">
                {entry.card.name}
              </p>
              <p className="text-xs text-[var(--muted)] truncate">
                {entry.card.set}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                {entry.card.prices?.market && (
                  <span className="text-xs text-green-400">
                    ${entry.card.prices.market.toFixed(2)}
                  </span>
                )}
                <span className="text-xs text-zinc-600">
                  #{history.length - index}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
