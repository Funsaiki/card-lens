"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { CardGame, CollectionItem, CardCondition, CardVariant } from "@/types";
import { fetchSets, fetchSetCards, getCardStorageUrl, GameSet, SetCard } from "@/lib/indexer";
import Dropdown from "@/components/Dropdown";
import CardLightbox from "@/components/CardLightbox";
import LazyCard from "@/components/LazyCard";
import { SkeletonCardGrid, SkeletonSetStats } from "@/components/Skeleton";
import Spinner from "@/components/ui/Spinner";

interface Props {
  game: CardGame;
  ownedCards: CollectionItem[];
  wantedCards?: CollectionItem[];
  onCardAdded?: () => void;
  initialSetId?: string | null;
}


type SortMode = "default" | "owned" | "missing";

const ALL_OWNED = "__all__";
const ALL_WANTED = "__wanted__";

export default function SetCollectionView({ game, ownedCards, wantedCards = [], onCardAdded, initialSetId }: Props) {
  const [sets, setSets] = useState<GameSet[]>([]);
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [setCards, setSetCards] = useState<SetCard[]>([]);
  const [loadingSets, setLoadingSets] = useState(true);
  const [loadingCards, setLoadingCards] = useState(false);
  const [lightboxCard, setLightboxCard] = useState<SetCard | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("default");
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const isAllView = selectedSetId === ALL_OWNED;
  const isWantedView = selectedSetId === ALL_WANTED;
  const isSpecialView = isAllView || isWantedView;

  // Convert owned cards to SetCard[] for the "all" view
  // Use Supabase row id as SetCard.id to guarantee uniqueness (same cardId may appear with different variants)
  const allOwnedSetCards = useMemo<SetCard[]>(
    () => ownedCards.map((c) => ({
      id: c.id,
      localId: c.cardId,
      name: c.cardName,
      image: c.cardImageUrl ?? undefined,
    })),
    [ownedCards]
  );

  // Convert wanted cards to SetCard[] for the "wanted" view
  const allWantedSetCards = useMemo<SetCard[]>(
    () => wantedCards.map((c) => ({
      id: c.id,
      localId: c.cardId,
      name: c.cardName,
      image: c.cardImageUrl ?? undefined,
    })),
    [wantedCards]
  );

  // Set of owned card IDs for quick lookup (includes locally added)
  const [locallyAdded, setLocallyAdded] = useState<Set<string>>(new Set());
  const [locallyRemoved, setLocallyRemoved] = useState<Set<string>>(new Set());
  const ownedCardIds = useMemo(
    () => {
      const ids = new Set<string>();
      for (const c of ownedCards) {
        ids.add(c.cardId);   // for set view (match by card ID)
        ids.add(c.id);       // for "all owned" view (match by row UUID)
      }
      for (const id of locallyAdded) ids.add(id);
      for (const id of locallyRemoved) ids.delete(id);
      return ids;
    },
    [ownedCards, locallyAdded, locallyRemoved]
  );

  // Set of wanted card IDs
  const wantedCardIds = useMemo(() => {
    const ids = new Set<string>();
    for (const c of wantedCards) {
      ids.add(c.cardId);
      ids.add(c.id);
    }
    return ids;
  }, [wantedCards]);

  // Map card identifier → Supabase row ID for delete
  // Keyed by both cardId (set view) and row id (all-owned/wanted view)
  const cardIdToRowId = useMemo(
    () => {
      const m = new Map<string, string>();
      for (const c of ownedCards) {
        m.set(c.cardId, c.id);
        m.set(c.id, c.id);
      }
      for (const c of wantedCards) {
        m.set(c.id, c.id);
      }
      return m;
    },
    [ownedCards, wantedCards]
  );

  // Map card identifier → full CollectionItem for lightbox editing
  const cardIdToItem = useMemo(
    () => {
      const m = new Map<string, CollectionItem>();
      for (const c of ownedCards) {
        m.set(c.cardId, c);
        m.set(c.id, c);
      }
      for (const c of wantedCards) {
        m.set(c.id, c);
      }
      return m;
    },
    [ownedCards, wantedCards]
  );

  // Reset local state when set changes
  useEffect(() => {
    setLocallyAdded(new Set());
    setLocallyRemoved(new Set());
    setSelecting(false);
    setSelected(new Set());
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
      // Use initialSetId if provided and matches, otherwise default to "all owned"
      const match = initialSetId && result.find(
        (s) => s.id === initialSetId || s.name === initialSetId
      );
      setSelectedSetId(match ? match.id : ALL_OWNED);
      setLoadingSets(false);
    });

    return () => { cancelled = true; };
  }, [game, initialSetId]);

  // Fetch cards when a specific set is selected
  useEffect(() => {
    if (!selectedSetId || selectedSetId === ALL_OWNED || selectedSetId === ALL_WANTED) return;
    let cancelled = false;
    setLoadingCards(true);

    fetchSetCards(selectedSetId, game).then((cards) => {
      if (cancelled) return;
      setSetCards(cards);
      setLoadingCards(false);
    });

    return () => { cancelled = true; };
  }, [selectedSetId, game]);

  // Check ownership by id OR localId (backwards compat: old cards stored cardno as cardId)
  const isOwned = useCallback(
    (card: SetCard) => ownedCardIds.has(card.id) || ownedCardIds.has(card.localId),
    [ownedCardIds]
  );
  const getRowId = useCallback(
    (card: SetCard) => cardIdToRowId.get(card.id) ?? cardIdToRowId.get(card.localId),
    [cardIdToRowId]
  );
  const getItem = useCallback(
    (card: SetCard) => cardIdToItem.get(card.id) ?? cardIdToItem.get(card.localId),
    [cardIdToItem]
  );

  const selectedSet = sets.find((s) => s.id === selectedSetId);
  const displayCards = isWantedView ? allWantedSetCards : isAllView ? allOwnedSetCards : setCards;
  const ownedCount = displayCards.filter((c) => isOwned(c)).length;
  const pct = displayCards.length > 0 ? Math.round((ownedCount / displayCards.length) * 100) : 0;

  const sortedCards = useMemo(() => {
    if (sortMode === "default") return displayCards;
    return [...displayCards].sort((a, b) => {
      const aOwned = isOwned(a) ? 1 : 0;
      const bOwned = isOwned(b) ? 1 : 0;
      return sortMode === "owned" ? bOwned - aOwned : aOwned - bOwned;
    });
  }, [displayCards, sortMode, isOwned]);

  const addCard = useCallback(async (card: SetCard, cardVariant?: CardVariant) => {
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
          rarity: card.name.match(/\(([^)]+)\)$/)?.[1] ?? "",
          imageUrl: getCardStorageUrl(card, game),
          details: { cardNo: card.localId },
        },
        ...(cardVariant ? { variant: cardVariant } : {}),
      }),
    });
    if (!res.ok) throw new Error("Failed to add");
    setLocallyAdded((prev) => new Set(prev).add(card.id));
    onCardAdded?.();
  }, [game, selectedSet?.name, selectedSetId, onCardAdded]);

  const wantCard = useCallback(async (card: SetCard) => {
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
          rarity: card.name.match(/\(([^)]+)\)$/)?.[1] ?? "",
          imageUrl: getCardStorageUrl(card, game),
          details: { cardNo: card.localId },
        },
        status: "wanted",
      }),
    });
    if (!res.ok) throw new Error("Failed to add to wishlist");
    onCardAdded?.();
  }, [game, selectedSet?.name, selectedSetId, onCardAdded]);

  const removeCard = useCallback(async (card: SetCard) => {
    const rowId = getRowId(card);
    if (!rowId) return;
    const res = await fetch(`/api/collection/${rowId}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to remove");
    setLocallyRemoved((prev) => new Set(prev).add(card.id));
    onCardAdded?.(); // refresh parent data
  }, [getRowId, onCardAdded]);

  const updateCard = useCallback(async (rowId: string, updates: { condition?: CardCondition; quantity?: number; variant?: CardVariant }) => {
    const res = await fetch(`/api/collection/${rowId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error("Failed to update");
    onCardAdded?.(); // refresh parent data
  }, [onCardAdded]);

  const toggleSelect = useCallback((cardId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelected(new Set(sortedCards.map((c) => c.id)));
  }, [sortedCards]);

  const bulkDelete = useCallback(async () => {
    if (selected.size === 0 || bulkDeleting) return;
    setBulkDeleting(true);
    try {
      // In all-owned view, card.id IS the row UUID
      const rowIds = Array.from(selected).map((id) => cardIdToRowId.get(id) ?? id);
      const res = await fetch("/api/collection/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: rowIds }),
      });
      if (!res.ok) throw new Error("Failed to delete");
      const data = await res.json();
      toast.success(`${data.deleted} card${data.deleted > 1 ? "s" : ""} removed`);
      setSelecting(false);
      setSelected(new Set());
      onCardAdded?.();
    } catch {
      toast.error("Failed to delete cards");
    }
    setBulkDeleting(false);
  }, [selected, bulkDeleting, cardIdToRowId, onCardAdded]);

  if (loadingSets) {
    return (
      <div className="p-4 space-y-3">
        <div className="h-8 bg-white/[0.04] rounded-lg animate-pulse" />
        <SkeletonSetStats />
        <SkeletonCardGrid count={12} />
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
          options={[
            { value: ALL_OWNED, label: `My Collection (${ownedCards.length})` },
            { value: ALL_WANTED, label: `My Wishlist (${wantedCards.length})` },
            ...sets.map((s) => ({
              value: s.id,
              label: s.cardCount.total > 0 ? `${s.name} (${s.cardCount.total})` : s.name,
            })),
          ]}
          searchable
        />
      </div>

      {/* Stats */}
      {(isSpecialView || (selectedSet && !loadingCards)) && (
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-zinc-400">
              {isSpecialView ? `${displayCards.length} cards` : `${ownedCount} / ${displayCards.length} cards`}
            </span>
            {(isAllView || isWantedView) && displayCards.length > 0 && (
              <button
                onClick={() => { setSelecting((s) => !s); setSelected(new Set()); }}
                className={`flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-md border transition-colors ${
                  selecting
                    ? "border-red-500/40 bg-red-500/10 text-red-300"
                    : "border-white/[0.08] text-zinc-500 hover:text-zinc-300 hover:border-white/[0.15]"
                }`}
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                {selecting ? "Cancel" : "Select"}
              </button>
            )}
            {!isSpecialView && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSortMode((m) => m === "default" ? "owned" : m === "owned" ? "missing" : "default")}
                  className={`flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-md border transition-colors ${
                    sortMode !== "default"
                      ? "border-indigo-500/40 bg-indigo-500/10 text-indigo-300"
                      : "border-white/[0.08] text-zinc-500 hover:text-zinc-300 hover:border-white/[0.15]"
                  }`}
                  title={sortMode === "default" ? "Sort by ownership" : sortMode === "owned" ? "Owned first" : "Missing first"}
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9M3 12h5m4 0l4-4m0 0l4 4m-4-4v12" />
                  </svg>
                  {sortMode === "default" ? "Sort" : sortMode === "owned" ? "Owned" : "Missing"}
                </button>
                <span className={`text-xs font-medium ${pct === 100 ? "text-green-400" : pct > 50 ? "text-indigo-400" : "text-[var(--muted)]"}`}>
                  {pct}%
                </span>
              </div>
            )}
          </div>
          {!isSpecialView && (
            <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? "bg-gradient-to-r from-green-500 to-emerald-400" : "bg-gradient-to-r from-indigo-500 to-violet-500"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Cards grid */}
      <div className="p-4">
        {!isSpecialView && loadingCards ? (
          <SkeletonCardGrid count={12} />
        ) : sortedCards.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-[var(--muted)]">
              {isWantedView ? "No cards in your wishlist yet" : isAllView ? "No cards in your collection yet" : "No cards in this set"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2">
            {sortedCards.map((card) => {
              const cardOwned = isOwned(card);
              const cardWanted = isWantedView || wantedCardIds.has(card.id) || wantedCardIds.has(card.localId);
              return (
                <LazyCard
                  key={card.id}
                  card={card}
                  game={game}
                  owned={isWantedView ? false : cardOwned}
                  wanted={cardWanted}
                  onAdd={!cardOwned && !isWantedView ? () => addCard(card) : undefined}
                  onWant={!cardOwned && !cardWanted ? () => wantCard(card) : undefined}
                  onClick={() => setLightboxCard(card)}
                  selecting={selecting}
                  selected={selected.has(card.id)}
                  onToggleSelect={() => toggleSelect(card.id)}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Multi-select action bar */}
      {selecting && (
        <div className="sticky bottom-0 inset-x-0 z-40 px-4 py-3 bg-zinc-900/95 backdrop-blur-sm border-t border-white/[0.08]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-300">
                {selected.size} selected
              </span>
              <button
                onClick={selected.size === sortedCards.length ? () => setSelected(new Set()) : selectAll}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                {selected.size === sortedCards.length ? "Deselect all" : "Select all"}
              </button>
            </div>
            <button
              onClick={bulkDelete}
              disabled={selected.size === 0 || bulkDeleting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white transition-all"
            >
              {bulkDeleting ? (
                <Spinner />
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              )}
              Delete{selected.size > 0 ? ` (${selected.size})` : ""}
            </button>
          </div>
        </div>
      )}

      {/* Fullscreen lightbox */}
      {lightboxCard && (
        <CardLightbox
          card={lightboxCard}
          game={game}
          owned={isOwned(lightboxCard)}
          collectionItem={getItem(lightboxCard)}
          onAdd={!isOwned(lightboxCard) ? (v) => addCard(lightboxCard, v) : undefined}
          onRemove={isOwned(lightboxCard) && getRowId(lightboxCard) ? () => removeCard(lightboxCard) : undefined}
          onUpdate={updateCard}
          onClose={() => setLightboxCard(null)}
        />
      )}
    </div>
  );
}
