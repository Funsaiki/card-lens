"use client";

import { CardData, GAME_LABELS } from "@/types";
import Image from "next/image";
import PriceChart from "./PriceChart";
import AddToCollectionButton from "./AddToCollectionButton";

interface CardInfoProps {
  card: CardData | null;
  confidence?: number;
}

export default function CardInfo({ card, confidence }: CardInfoProps) {
  if (!card) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[var(--muted)] p-6">
        <svg
          className="w-16 h-16 mb-3 opacity-30"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <p className="text-sm text-center">
          Scan a card or search by name to see details
        </p>
      </div>
    );
  }

  const gameLabel = GAME_LABELS[card.game];

  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto animate-fade-in-up">
      {/* Card image */}
      {card.imageUrl && (
        <div className="relative aspect-[2.5/3.5] w-full max-w-[240px] mx-auto rounded-lg overflow-hidden shadow-lg shadow-black/40 animate-scale-in">
          <Image
            src={card.imageUrl}
            alt={card.name}
            fill
            className="object-contain"
            unoptimized
          />
        </div>
      )}

      {/* Card name and game */}
      <div>
        <h2 className="text-lg font-bold text-white">{card.name}</h2>
        <p className="text-sm text-[var(--muted)]">{gameLabel}</p>
      </div>

      {/* Confidence */}
      {confidence !== undefined && (
        <div>
          <div className="flex justify-between text-xs text-[var(--muted)] mb-1">
            <span>Match confidence</span>
            <span>{confidence.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-white/[0.06] rounded-full h-1.5">
            <div
              className="bg-gradient-to-r from-indigo-500 to-green-500 h-1.5 rounded-full transition-all animate-grow-width"
              style={{ width: `${confidence}%` }}
            />
          </div>
        </div>
      )}

      {/* Add to collection */}
      <AddToCollectionButton card={card} />

      {/* Set and rarity */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="bg-white/[0.04] border border-white/[0.06] rounded-lg p-2 transition-colors hover:bg-white/[0.06]">
          <p className="text-[var(--muted)] text-xs">Set</p>
          <p className="text-zinc-200 truncate">{card.set}</p>
        </div>
        <div className="bg-white/[0.04] border border-white/[0.06] rounded-lg p-2 transition-colors hover:bg-white/[0.06]">
          <p className="text-[var(--muted)] text-xs">Rarity</p>
          <p className="text-zinc-200 truncate">{card.rarity}</p>
        </div>
      </div>

      {/* Prices */}
      {card.pricing && <PriceChart pricing={card.pricing} />}

      {/* Details */}
      {Object.keys(card.details).length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-[var(--muted)] uppercase tracking-wider">
            Details
          </p>
          {Object.entries(card.details).map(([key, value]) => (
            <div
              key={key}
              className="flex justify-between text-sm bg-white/[0.04] border border-white/[0.06] rounded px-2 py-1.5 transition-colors hover:bg-white/[0.06]"
            >
              <span className="text-[var(--muted)] capitalize">{key}</span>
              <span className="text-zinc-200">{value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
