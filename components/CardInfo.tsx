"use client";

import { CardData } from "@/types";
import Image from "next/image";

interface CardInfoProps {
  card: CardData | null;
  confidence?: number;
}

export default function CardInfo({ card, confidence }: CardInfoProps) {
  if (!card) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-500 p-6">
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

  const gameLabel = {
    pokemon: "Pokemon TCG",
    magic: "Magic: The Gathering",
    yugioh: "Yu-Gi-Oh!",
  }[card.game];

  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto">
      {/* Card image */}
      {card.imageUrl && (
        <div className="relative aspect-[2.5/3.5] w-full max-w-[240px] mx-auto rounded-lg overflow-hidden shadow-lg">
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
        <p className="text-sm text-zinc-400">{gameLabel}</p>
      </div>

      {/* Confidence */}
      {confidence !== undefined && (
        <div>
          <div className="flex justify-between text-xs text-zinc-400 mb-1">
            <span>Match confidence</span>
            <span>{confidence.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-zinc-700 rounded-full h-1.5">
            <div
              className="bg-green-500 h-1.5 rounded-full transition-all"
              style={{ width: `${confidence}%` }}
            />
          </div>
        </div>
      )}

      {/* Set and rarity */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="bg-zinc-800 rounded-lg p-2">
          <p className="text-zinc-500 text-xs">Set</p>
          <p className="text-zinc-200 truncate">{card.set}</p>
        </div>
        <div className="bg-zinc-800 rounded-lg p-2">
          <p className="text-zinc-500 text-xs">Rarity</p>
          <p className="text-zinc-200 truncate">{card.rarity}</p>
        </div>
      </div>

      {/* Prices — multi-marketplace */}
      {card.pricing && (
        <div className="space-y-2">
          {card.pricing.tcgplayer && (
            <div className="bg-zinc-800 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-zinc-500 text-xs font-medium">TCGPlayer</p>
                <span className="text-[10px] text-zinc-600">USD</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold text-green-400">
                  ${card.pricing.tcgplayer.market?.toFixed(2) ?? "N/A"}
                </span>
              </div>
              <div className="flex gap-3 mt-1.5 text-[11px] text-zinc-400">
                {card.pricing.tcgplayer.low != null && <span>Low: ${card.pricing.tcgplayer.low.toFixed(2)}</span>}
                {card.pricing.tcgplayer.mid != null && <span>Mid: ${card.pricing.tcgplayer.mid.toFixed(2)}</span>}
                {card.pricing.tcgplayer.high != null && <span>High: ${card.pricing.tcgplayer.high.toFixed(2)}</span>}
              </div>
            </div>
          )}
          {card.pricing.cardmarket && (
            <div className="bg-zinc-800 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-zinc-500 text-xs font-medium">Cardmarket</p>
                <span className="text-[10px] text-zinc-600">EUR</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold text-blue-400">
                  {card.pricing.cardmarket.market?.toFixed(2) ?? "N/A"}&euro;
                </span>
              </div>
              <div className="flex gap-3 mt-1.5 text-[11px] text-zinc-400">
                {card.pricing.cardmarket.low != null && <span>Low: {card.pricing.cardmarket.low.toFixed(2)}&euro;</span>}
                {card.pricing.cardmarket.mid != null && <span>Avg: {card.pricing.cardmarket.mid.toFixed(2)}&euro;</span>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Prices — legacy single marketplace (Magic, Yu-Gi-Oh) */}
      {!card.pricing && card.prices && (
        <div className="bg-zinc-800 rounded-lg p-3">
          <p className="text-zinc-500 text-xs mb-2">Market Price</p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-green-400">
              ${card.prices.market?.toFixed(2) ?? "N/A"}
            </span>
            <span className="text-xs text-zinc-500">{card.prices.currency}</span>
          </div>
          {(card.prices.low || card.prices.high) && (
            <div className="flex gap-4 mt-2 text-xs text-zinc-400">
              {card.prices.low && <span>Low: ${card.prices.low.toFixed(2)}</span>}
              {card.prices.mid && <span>Mid: ${card.prices.mid.toFixed(2)}</span>}
              {card.prices.high && (
                <span>High: ${card.prices.high.toFixed(2)}</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Details */}
      {Object.keys(card.details).length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">
            Details
          </p>
          {Object.entries(card.details).map(([key, value]) => (
            <div
              key={key}
              className="flex justify-between text-sm bg-zinc-800 rounded px-2 py-1.5"
            >
              <span className="text-zinc-400 capitalize">{key}</span>
              <span className="text-zinc-200">{value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
