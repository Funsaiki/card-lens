"use client";

import { CardData } from "@/types";
import { getDisplayPrice } from "@/lib/price-utils";
import Image from "next/image";

interface SearchResultsProps {
  query: string;
  results: CardData[];
  onSelect: (card: CardData) => void;
  onClose: () => void;
}

export default function SearchResults({
  query,
  results,
  onSelect,
  onClose,
}: SearchResultsProps) {
  if (results.length === 0) {
    return (
      <div className="p-4 text-center text-[var(--muted)] text-sm">
        <p>No results for &quot;{query}&quot;</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06]">
        <p className="text-xs text-[var(--muted)]">
          {results.length} results for &quot;{query}&quot;
        </p>
        <button
          onClick={onClose}
          className="text-xs text-[var(--muted)] hover:text-zinc-300 transition-colors"
        >
          Close
        </button>
      </div>

      <div className="overflow-y-auto flex-1">
        {results.map((card, idx) => (
          <button
            key={`${card.id}-${idx}`}
            onClick={() => onSelect(card)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.04] transition-colors text-left border-b border-white/[0.04] last:border-b-0"
          >
            {/* Thumbnail */}
            <div className="relative w-12 h-[66px] rounded overflow-hidden flex-shrink-0 bg-zinc-800/50">
              {card.imageUrl && (
                <Image
                  src={card.imageUrl}
                  alt={card.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-200 truncate">
                {card.name}
              </p>
              {card.set && (
                <p className="text-xs text-[var(--muted)] truncate">{card.set}</p>
              )}
              <div className="flex items-center gap-2 mt-0.5">
                {card.rarity && (
                  <span className="text-xs text-zinc-400">{card.rarity}</span>
                )}
                {(() => {
                  const dp = getDisplayPrice(card);
                  if (!dp) return null;
                  return (
                    <span className={`text-xs ${dp.isEur ? "text-blue-400" : "text-green-400"}`}>
                      {dp.text}
                    </span>
                  );
                })()}
              </div>
            </div>

            {/* Arrow */}
            <svg
              className="w-4 h-4 text-zinc-600 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}
