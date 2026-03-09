"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { CardGame, CollectionItem } from "@/types";
import { fetchSets, fetchSetCards, GameSet, SetCard } from "@/lib/indexer";
import { getHololiveImageUrl } from "@/lib/hololive";
import Dropdown from "@/components/Dropdown";

interface Props {
  game: CardGame;
  ownedCards: CollectionItem[];
}

function getCardImageUrl(card: SetCard, game: CardGame): string {
  if (!card.image) return "";
  if (game === "hololive") {
    return `/api/image-proxy?url=${encodeURIComponent(getHololiveImageUrl(card.image))}`;
  }
  return `${card.image}/high.webp`;
}

export default function SetCollectionView({ game, ownedCards }: Props) {
  const [sets, setSets] = useState<GameSet[]>([]);
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [setCards, setSetCards] = useState<SetCard[]>([]);
  const [loadingSets, setLoadingSets] = useState(true);
  const [loadingCards, setLoadingCards] = useState(false);

  // Set of owned card IDs for quick lookup
  const ownedCardIds = useMemo(
    () => new Set(ownedCards.map((c) => c.cardId)),
    [ownedCards]
  );

  // Fetch sets list
  useEffect(() => {
    let cancelled = false;
    setLoadingSets(true);
    setSets([]);
    setSelectedSetId(null);
    setSetCards([]);

    fetchSets(game).then((result) => {
      if (cancelled) return;
      setSets(result);
      // Default to last set (most recent)
      if (result.length > 0) {
        setSelectedSetId(result[result.length - 1].id);
      }
      setLoadingSets(false);
    });

    return () => { cancelled = true; };
  }, [game]);

  // Fetch cards when set changes
  useEffect(() => {
    if (!selectedSetId) return;
    let cancelled = false;
    setLoadingCards(true);

    fetchSetCards(selectedSetId, game).then((cards) => {
      if (cancelled) return;
      setSetCards(cards);
      setLoadingCards(false);
    });

    return () => { cancelled = true; };
  }, [selectedSetId, game]);

  const selectedSet = sets.find((s) => s.id === selectedSetId);
  const ownedCount = setCards.filter((c) => ownedCardIds.has(c.id)).length;
  const pct = setCards.length > 0 ? Math.round((ownedCount / setCards.length) * 100) : 0;

  if (loadingSets) {
    return (
      <div className="flex justify-center py-12">
        <span className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (sets.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-[var(--muted)]">No sets available for this game</p>
      </div>
    );
  }

  return (
    <div>
      {/* Set selector */}
      <div className="px-4 py-3 border-b border-white/[0.06]">
        <Dropdown
          value={selectedSetId ?? ""}
          onChange={(val) => setSelectedSetId(val)}
          options={sets.map((s) => ({ value: s.id, label: `${s.name} (${s.cardCount.total} cards)` }))}
          searchable
        />
      </div>

      {/* Completion stats */}
      {selectedSet && !loadingCards && (
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-zinc-400">
              {ownedCount} / {setCards.length} cards
            </span>
            <span className={`text-xs font-medium ${pct === 100 ? "text-green-400" : pct > 50 ? "text-indigo-400" : "text-[var(--muted)]"}`}>
              {pct}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? "bg-gradient-to-r from-green-500 to-emerald-400" : "bg-gradient-to-r from-indigo-500 to-violet-500"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Cards grid */}
      <div className="p-4">
        {loadingCards ? (
          <div className="flex justify-center py-12">
            <span className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2">
            {setCards.map((card) => {
              const owned = ownedCardIds.has(card.id);
              const imageUrl = getCardImageUrl(card, game);

              return (
                <div
                  key={card.id}
                  className={`relative aspect-[2.5/3.5] bg-zinc-800/50 rounded-lg overflow-hidden border transition-all ${
                    owned
                      ? "border-indigo-500/30 shadow-sm shadow-indigo-500/10"
                      : "border-white/[0.04] opacity-35 grayscale"
                  }`}
                >
                  {imageUrl && (
                    <Image
                      src={imageUrl}
                      alt={card.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, (max-width: 1024px) 20vw, 12.5vw"
                      unoptimized
                    />
                  )}
                  {owned && (
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                      <p className="text-[9px] text-white font-medium truncate">{card.name}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
