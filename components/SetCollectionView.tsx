"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { toast } from "sonner";
import { CardGame, CollectionItem, CardCondition, CardVariant, CONDITION_LABELS, VARIANT_LABELS } from "@/types";
import { fetchSets, fetchSetCards, getCardImageUrl, GameSet, SetCard } from "@/lib/indexer";
import Dropdown from "@/components/Dropdown";
import { SkeletonCardGrid, SkeletonSetStats } from "@/components/Skeleton";

const CONDITIONS: CardCondition[] = ["mint", "near_mint", "lightly_played", "moderately_played", "heavily_played", "damaged"];

interface Props {
  game: CardGame;
  ownedCards: CollectionItem[];
  onCardAdded?: () => void;
  initialSetId?: string | null;
}

const PLACEHOLDER_BG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'%3E%3Crect fill='%2327272a' width='1' height='1'/%3E%3C/svg%3E";

type AddState = "idle" | "adding" | "added";

// ---------- Fullscreen lightbox ----------

const VARIANTS: CardVariant[] = ["normal", "reverse_holo"];

function CardLightbox({ card, game, owned, collectionItem, onAdd, onRemove, onUpdate, onClose, directImage }: {
  card: SetCard;
  game: CardGame;
  owned: boolean;
  collectionItem?: CollectionItem;
  onAdd?: (variant?: CardVariant) => Promise<void>;
  onRemove?: () => Promise<void>;
  onUpdate?: (rowId: string, updates: { condition?: CardCondition; quantity?: number; variant?: CardVariant }) => Promise<void>;
  onClose: () => void;
  directImage?: boolean;
}) {
  const [addState, setAddState] = useState<AddState>("idle");
  const [removeState, setRemoveState] = useState<"idle" | "removing" | "removed">("idle");
  const [condition, setCondition] = useState<CardCondition>(collectionItem?.condition ?? "near_mint");
  const [quantity, setQuantity] = useState(collectionItem?.quantity ?? 1);
  const [variant, setVariant] = useState<CardVariant>(collectionItem?.variant ?? "normal");
  const [saving, setSaving] = useState(false);
  const isOwned = (owned || addState === "added") && removeState !== "removed";
  const showVariant = game === "pokemon";

  // Track if user changed anything
  const hasChanges = isOwned && collectionItem && (
    condition !== collectionItem.condition ||
    quantity !== collectionItem.quantity ||
    (showVariant && variant !== collectionItem.variant)
  );

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
      await onAdd(showVariant ? variant : undefined);
      setAddState("added");
      toast.success(`${card.name}${showVariant && variant === "reverse_holo" ? " (Reverse Holo)" : ""} added`);
    } catch {
      setAddState("idle");
      toast.error("Failed to add card");
    }
  };

  const handleRemove = async () => {
    if (!onRemove || removeState !== "idle") return;
    setRemoveState("removing");
    try {
      await onRemove();
      setRemoveState("removed");
      toast.success(`${card.name} removed`);
    } catch {
      setRemoveState("idle");
      toast.error("Failed to remove card");
    }
  };

  const handleSave = async () => {
    if (!onUpdate || !collectionItem || saving) return;
    setSaving(true);
    try {
      await onUpdate(collectionItem.id, { condition, quantity, ...(showVariant ? { variant } : {}) });
      toast.success("Changes saved");
    } catch {
      toast.error("Failed to save changes");
    }
    setSaving(false);
  };

  const imageUrl = directImage ? (card.image ?? "") : getHighResImageUrl(card, game);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col items-center gap-4 max-w-sm w-full mx-4 max-h-[90vh] overflow-y-auto"
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
        <div className="w-full aspect-[2.5/3.5] rounded-xl overflow-hidden shadow-2xl shadow-black/60 border border-white/[0.1] flex-shrink-0">
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
        <div className="w-full bg-[var(--surface-light)] border border-white/[0.08] rounded-xl p-3 space-y-3">
          <div>
            <p className="text-sm font-medium text-zinc-200">{card.name}</p>
            <p className="text-[11px] text-[var(--muted)]">{card.id}</p>
          </div>

          {isOwned ? (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-green-400">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  In collection
                </div>
                {onRemove && (
                  <button
                    onClick={handleRemove}
                    disabled={removeState === "removing"}
                    className="flex items-center gap-1 px-2 py-1 text-[11px] text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-md transition-colors disabled:opacity-50"
                  >
                    {removeState === "removing" ? (
                      <span className="w-3 h-3 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                    Remove
                  </button>
                )}
              </div>

              {/* Variant selector (Pokemon only) */}
              {showVariant && (
                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Variant</label>
                  <div className="grid grid-cols-2 gap-1">
                    {VARIANTS.map((v) => (
                      <button
                        key={v}
                        onClick={() => setVariant(v)}
                        className={`px-2 py-1.5 text-[10px] rounded-md border transition-all ${
                          variant === v
                            ? "border-indigo-500/50 bg-indigo-500/15 text-indigo-300 font-medium"
                            : "border-white/[0.06] text-zinc-500 hover:text-zinc-300 hover:border-white/[0.12]"
                        }`}
                      >
                        {VARIANT_LABELS[v]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Condition selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Condition</label>
                <div className="grid grid-cols-3 gap-1">
                  {CONDITIONS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setCondition(c)}
                      className={`px-2 py-1.5 text-[10px] rounded-md border transition-all ${
                        condition === c
                          ? "border-indigo-500/50 bg-indigo-500/15 text-indigo-300 font-medium"
                          : "border-white/[0.06] text-zinc-500 hover:text-zinc-300 hover:border-white/[0.12]"
                      }`}
                    >
                      {CONDITION_LABELS[c]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Quantity</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-white/[0.08] text-zinc-400 hover:text-white hover:border-white/[0.15] transition-colors disabled:opacity-30 disabled:hover:text-zinc-400"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                  </button>
                  <span className="text-sm font-medium text-zinc-200 w-8 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(9999, quantity + 1))}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-white/[0.08] text-zinc-400 hover:text-white hover:border-white/[0.15] transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Save button */}
              {hasChanges && (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 text-white transition-all"
                >
                  {saving ? (
                    <>
                      <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save changes"
                  )}
                </button>
              )}
            </>
          ) : onAdd ? (
            <div className="space-y-3">
              {/* Variant selector before adding (Pokemon only) */}
              {showVariant && (
                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Variant</label>
                  <div className="grid grid-cols-2 gap-1">
                    {VARIANTS.map((v) => (
                      <button
                        key={v}
                        onClick={() => setVariant(v)}
                        className={`px-2 py-1.5 text-[10px] rounded-md border transition-all ${
                          variant === v
                            ? "border-indigo-500/50 bg-indigo-500/15 text-indigo-300 font-medium"
                            : "border-white/[0.06] text-zinc-500 hover:text-zinc-300 hover:border-white/[0.12]"
                        }`}
                      >
                        {VARIANT_LABELS[v]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
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
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function LazyCard({ card, game, owned, onAdd, onClick, directImage, selecting, selected, onToggleSelect }: {
  card: SetCard;
  game: CardGame;
  owned: boolean;
  onAdd?: () => Promise<void>;
  onClick?: () => void;
  directImage?: boolean;
  selecting?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
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

  const handleClick = () => {
    if (selecting && onToggleSelect) {
      onToggleSelect();
    } else {
      onClick?.();
    }
  };

  const imageUrl = directImage ? (card.image ?? "") : getCardImageUrl(card, game);
  const isOwned = owned || addState === "added";

  return (
    <div
      ref={ref}
      onClick={handleClick}
      className={`group/card relative aspect-[2.5/3.5] bg-zinc-800/50 rounded-lg overflow-hidden border transition-all cursor-pointer ${
        selecting && selected
          ? "border-red-500/60 shadow-sm shadow-red-500/20 ring-2 ring-red-500/30"
          : isOwned
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

      {/* Selection checkbox */}
      {selecting && (
        <div className="absolute top-1.5 left-1.5 z-10">
          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
            selected
              ? "border-red-500 bg-red-500"
              : "border-white/40 bg-black/40"
          }`}>
            {selected && (
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </div>
      )}

      {/* Add button for unowned cards */}
      {!selecting && !isOwned && onAdd && (
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
      {isOwned && !selecting && (
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

type SortMode = "default" | "owned" | "missing";

const ALL_OWNED = "__all__";

export default function SetCollectionView({ game, ownedCards, onCardAdded, initialSetId }: Props) {
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

  // Map card identifier → Supabase row ID for delete
  // Keyed by both cardId (set view) and row id (all-owned view)
  const cardIdToRowId = useMemo(
    () => {
      const m = new Map<string, string>();
      for (const c of ownedCards) {
        m.set(c.cardId, c.id);
        m.set(c.id, c.id);
      }
      return m;
    },
    [ownedCards]
  );

  // Map card identifier → full CollectionItem for lightbox editing
  const cardIdToItem = useMemo(
    () => {
      const m = new Map<string, CollectionItem>();
      for (const c of ownedCards) {
        m.set(c.cardId, c);
        m.set(c.id, c);
      }
      return m;
    },
    [ownedCards]
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
    if (!selectedSetId || selectedSetId === ALL_OWNED) return;
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
  const displayCards = isAllView ? allOwnedSetCards : setCards;
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
          rarity: "",
          imageUrl: getHighResImageUrl(card, game),
          details: { cardNo: card.localId },
        },
        ...(cardVariant ? { variant: cardVariant } : {}),
      }),
    });
    if (!res.ok) throw new Error("Failed to add");
    setLocallyAdded((prev) => new Set(prev).add(card.id));
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
            ...sets.map((s) => ({
              value: s.id,
              label: s.cardCount.total > 0 ? `${s.name} (${s.cardCount.total})` : s.name,
            })),
          ]}
          searchable
        />
      </div>

      {/* Stats */}
      {(isAllView || (selectedSet && !loadingCards)) && (
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-zinc-400">
              {isAllView ? `${displayCards.length} cards` : `${ownedCount} / ${displayCards.length} cards`}
            </span>
            {isAllView && displayCards.length > 0 && (
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
            {!isAllView && (
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
          {!isAllView && (
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
        {!isAllView && loadingCards ? (
          <SkeletonCardGrid count={12} />
        ) : sortedCards.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-[var(--muted)]">
              {isAllView ? "No cards in your collection yet" : "No cards in this set"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2">
            {sortedCards.map((card) => {
              const cardOwned = isOwned(card);
              return (
                <LazyCard
                  key={card.id}
                  card={card}
                  game={game}
                  owned={cardOwned}
                  onAdd={!cardOwned ? () => addCard(card) : undefined}
                  onClick={() => setLightboxCard(card)}
                  directImage={isAllView}
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
                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
          directImage={isAllView}
        />
      )}
    </div>
  );
}
