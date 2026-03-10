"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { CardGame, CollectionItem } from "@/types";
import { fetchSets, fetchSetCards, getCardImageUrl, GameSet, SetCard } from "@/lib/indexer";
import Dropdown from "@/components/Dropdown";

interface Props {
  game: CardGame;
  ownedCards: CollectionItem[];
  onCardAdded?: () => void;
  initialSetId?: string | null;
}

const PLACEHOLDER_BG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'%3E%3Crect fill='%2327272a' width='1' height='1'/%3E%3C/svg%3E";

type AddState = "idle" | "adding" | "added";

// ---------- Fullscreen lightbox ----------

function CardLightbox({ card, game, owned, onAdd, onClose }: {
  card: SetCard;
  game: CardGame;
  owned: boolean;
  onAdd?: () => Promise<void>;
  onClose: () => void;
}) {
  const [addState, setAddState] = useState<AddState>("idle");
  const isOwned = owned || addState === "added";

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleAdd = async () => {
    if (!onAdd || addState !== "idle") return;
    setAddState("adding");
    try {
      await onAdd();
      setAddState("added");
    } catch {
      setAddState("idle");
    }
  };

  const imageUrl = getHighResImageUrl(card, game);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col items-center gap-4 max-w-sm w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 p-1.5 text-zinc-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Card image */}
        <div className="w-full aspect-[2.5/3.5] rounded-xl overflow-hidden shadow-2xl shadow-black/60 border border-white/[0.1]">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={card.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
              <p className="text-zinc-500 text-sm">No image</p>
            </div>
          )}
        </div>

        {/* Card info + actions */}
        <div className="w-full bg-[var(--surface-light)] border border-white/[0.08] rounded-xl p-3 space-y-2">
          <div>
            <p className="text-sm font-medium text-zinc-200">{card.name}</p>
            <p className="text-[11px] text-[var(--muted)]">{card.id}</p>
          </div>

          {isOwned ? (
            <div className="flex items-center gap-1.5 text-xs text-green-400">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              In collection
            </div>
          ) : onAdd ? (
            <button
              onClick={handleAdd}
              disabled={addState === "adding"}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 text-white transition-all"
            >
              {addState === "adding" ? (
                <>
                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add to Collection
                </>
              )}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function LazyCard({ card, game, owned, onAdd, onClick }: {
  card: SetCard;
  game: CardGame;
  owned: boolean;
  onAdd?: () => Promise<void>;
  onClick?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [addState, setAddState] = useState<AddState>("idle");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleAdd = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onAdd || addState !== "idle") return;
    setAddState("adding");
    try {
      await onAdd();
      setAddState("added");
    } catch {
      setAddState("idle");
    }
  };

  const imageUrl = getCardImageUrl(card, game);
  const isOwned = owned || addState === "added";

  return (
    <div
      ref={ref}
      onClick={onClick}
      className={`group/card relative aspect-[2.5/3.5] bg-zinc-800/50 rounded-lg overflow-hidden border transition-all cursor-pointer ${
        isOwned
          ? "border-indigo-500/30 shadow-sm shadow-indigo-500/10"
          : "border-white/[0.04] opacity-35 grayscale hover:opacity-80 hover:grayscale-0"
      }`}
    >
      {visible && imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={card.name}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ backgroundImage: `url("${PLACEHOLDER_BG}")`, backgroundSize: "cover" }}
        />
      ) : (
        <div className="absolute inset-0 bg-zinc-800/50" />
      )}

      {/* Add button for unowned cards */}
      {!isOwned && onAdd && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity">
          <button
            onClick={handleAdd}
            disabled={addState === "adding"}
            className="p-2 bg-indigo-600/90 hover:bg-indigo-500 rounded-full shadow-lg shadow-black/40 transition-all scale-75 group-hover/card:scale-100"
            title={`Add ${card.name}`}
          >
            {addState === "adding" ? (
              <span className="block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
            )}
          </button>
        </div>
      )}

      {/* Card name label */}
      {isOwned && (
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
          <p className="text-[9px] text-white font-medium truncate">{card.name}</p>
        </div>
      )}
    </div>
  );
}

function getHighResImageUrl(card: SetCard, game: CardGame): string {
  return getCardImageUrl(card, game, "high");
}

export default function SetCollectionView({ game, ownedCards, onCardAdded, initialSetId }: Props) {
  const [sets, setSets] = useState<GameSet[]>([]);
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [setCards, setSetCards] = useState<SetCard[]>([]);
  const [loadingSets, setLoadingSets] = useState(true);
  const [loadingCards, setLoadingCards] = useState(false);
  const [lightboxCard, setLightboxCard] = useState<SetCard | null>(null);

  // Set of owned card IDs for quick lookup (includes locally added)
  const [locallyAdded, setLocallyAdded] = useState<Set<string>>(new Set());
  const ownedCardIds = useMemo(
    () => {
      const ids = new Set(ownedCards.map((c) => c.cardId));
      for (const id of locallyAdded) ids.add(id);
      return ids;
    },
    [ownedCards, locallyAdded]
  );

  // Reset locally added when set changes
  useEffect(() => {
    setLocallyAdded(new Set());
  }, [selectedSetId]);

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
      // Use initialSetId if it matches a set by ID or name, otherwise default to last (most recent)
      const match = initialSetId && result.find(
        (s) => s.id === initialSetId || s.name === initialSetId
      );
      setSelectedSetId(match ? match.id : result.length > 0 ? result[result.length - 1].id : null);
      setLoadingSets(false);
    });

    return () => { cancelled = true; };
  }, [game, initialSetId]);

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

  const addCard = useCallback(async (card: SetCard) => {
    const setName = selectedSet?.name ?? selectedSetId ?? "";
    const res = await fetch("/api/collection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        card: {
          id: card.id,
          name: card.name,
          game,
          set: setName,
          rarity: "",
          imageUrl: getHighResImageUrl(card, game),
          details: {},
        },
      }),
    });
    if (!res.ok) throw new Error("Failed to add");
    setLocallyAdded((prev) => new Set(prev).add(card.id));
    onCardAdded?.();
  }, [game, selectedSet?.name, selectedSetId, onCardAdded]);

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
          options={sets.map((s) => ({
            value: s.id,
            label: s.cardCount.total > 0 ? `${s.name} (${s.cardCount.total})` : s.name,
          }))}
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
              const isOwned = ownedCardIds.has(card.id);
              return (
                <LazyCard
                  key={card.id}
                  card={card}
                  game={game}
                  owned={isOwned}
                  onAdd={!isOwned ? () => addCard(card) : undefined}
                  onClick={() => setLightboxCard(card)}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Fullscreen lightbox */}
      {lightboxCard && (
        <CardLightbox
          card={lightboxCard}
          game={game}
          owned={ownedCardIds.has(lightboxCard.id)}
          onAdd={!ownedCardIds.has(lightboxCard.id) ? () => addCard(lightboxCard) : undefined}
          onClose={() => setLightboxCard(null)}
        />
      )}
    </div>
  );
}
