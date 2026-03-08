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
      <div className="p-4 text-center text-zinc-500 text-sm">
        <p>No cards scanned yet</p>
        <p className="text-xs mt-1">Scanned cards will appear here</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-700">
        <h3 className="text-sm font-medium text-zinc-300">
          Session ({history.length})
        </h3>
        <button
          onClick={onClear}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Clear
        </button>
      </div>

      <div className="overflow-y-auto max-h-[300px]">
        {history.map((entry, index) => (
          <button
            key={`${entry.card.id}-${entry.timestamp}`}
            onClick={() => onSelect(entry)}
            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-zinc-800/50 transition-colors text-left border-b border-zinc-800 last:border-b-0"
          >
            {/* Thumbnail */}
            <div className="relative w-10 h-14 rounded overflow-hidden flex-shrink-0 bg-zinc-800">
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
              <p className="text-xs text-zinc-500 truncate">
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
