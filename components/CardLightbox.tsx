"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { CardGame, CollectionItem, CardCondition, CardVariant, CONDITION_LABELS, VARIANT_LABELS, MAX_QUANTITY } from "@/types";
import Spinner from "@/components/ui/Spinner";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { getCardImageUrl, SetCard } from "@/lib/indexer";
import { getBuyLinks } from "@/lib/buy-links";

const CONDITIONS: CardCondition[] = ["mint", "near_mint", "lightly_played", "moderately_played", "heavily_played", "damaged"];
const VARIANTS: CardVariant[] = ["normal", "reverse_holo"];

function getHighResImageUrl(card: SetCard, game: CardGame): string {
  return getCardImageUrl(card, game, "high");
}

type AddState = "idle" | "adding" | "added";

export default function CardLightbox({ card, game, owned, collectionItem, onAdd, onRemove, onUpdate, onClose, directImage }: {
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
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 p-1.5 text-zinc-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="w-full aspect-[2.5/3.5] rounded-xl overflow-hidden shadow-2xl shadow-black/60 border border-white/[0.1] flex-shrink-0">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt={card.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
              <p className="text-zinc-500 text-sm">No image</p>
            </div>
          )}
        </div>

        <div className="w-full bg-[var(--surface-light)] border border-white/[0.08] rounded-xl p-3 space-y-3">
          <div>
            <p className="text-sm font-medium text-zinc-200">{card.name}</p>
            <p className="text-[11px] text-[var(--muted)]">{card.id}</p>
          </div>

          {/* Buy links */}
          {(() => {
            const links = getBuyLinks(collectionItem?.cardData ?? { id: card.id, name: card.name, game, set: "", rarity: "", imageUrl: "", details: {} });
            return (links.tcgplayer || links.cardmarket) ? (
              <div className="flex gap-2">
                {links.tcgplayer && (
                  <a href={links.tcgplayer} target="_blank" rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-medium text-green-400 bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 rounded-lg transition-colors">
                    TCGPlayer
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  </a>
                )}
                {links.cardmarket && (
                  <a href={links.cardmarket} target="_blank" rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-medium text-blue-400 bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 rounded-lg transition-colors">
                    Cardmarket
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  </a>
                )}
              </div>
            ) : null;
          })()}

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
                      <Spinner color="red" />
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                    Remove
                  </button>
                )}
              </div>

              {showVariant && (
                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Variant</label>
                  <SegmentedControl
                    options={VARIANTS.map((v) => ({ value: v, label: VARIANT_LABELS[v] }))}
                    value={variant}
                    onChange={setVariant}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Condition</label>
                <SegmentedControl
                  options={CONDITIONS.map((c) => ({ value: c, label: CONDITION_LABELS[c] }))}
                  value={condition}
                  onChange={setCondition}
                  columns={3}
                />
              </div>

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
                    onClick={() => setQuantity(Math.min(MAX_QUANTITY, quantity + 1))}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-white/[0.08] text-zinc-400 hover:text-white hover:border-white/[0.15] transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              </div>

              {hasChanges && (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 text-white transition-all"
                >
                  {saving ? (
                    <>
                      <Spinner />
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
              {showVariant && (
                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Variant</label>
                  <SegmentedControl
                    options={VARIANTS.map((v) => ({ value: v, label: VARIANT_LABELS[v] }))}
                    value={variant}
                    onChange={setVariant}
                  />
                </div>
              )}
              <button
                onClick={handleAdd}
                disabled={addState === "adding"}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 text-white transition-all"
              >
              {addState === "adding" ? (
                <>
                  <Spinner />
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
