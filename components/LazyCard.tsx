"use client";

import { useState, useEffect, useRef } from "react";
import { CardGame } from "@/types";
import Spinner from "@/components/ui/Spinner";
import { getCardImageUrl, SetCard } from "@/lib/indexer";

const PLACEHOLDER_BG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'%3E%3Crect fill='%2327272a' width='1' height='1'/%3E%3C/svg%3E";

type AddState = "idle" | "adding" | "added";
type WantState = "idle" | "wanting" | "wanted";

export default function LazyCard({ card, game, owned, wanted, onAdd, onWant, onClick, directImage, selecting, selected, onToggleSelect }: {
  card: SetCard;
  game: CardGame;
  owned: boolean;
  wanted?: boolean;
  onAdd?: () => Promise<void>;
  onWant?: () => Promise<void>;
  onClick?: () => void;
  directImage?: boolean;
  selecting?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [addState, setAddState] = useState<AddState>("idle");
  const [wantState, setWantState] = useState<WantState>("idle");

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

  const handleWant = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onWant || wantState !== "idle") return;
    setWantState("wanting");
    try {
      await onWant();
      setWantState("wanted");
    } catch {
      setWantState("idle");
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
  const isWanted = wanted || wantState === "wanted";

  return (
    <div
      ref={ref}
      onClick={handleClick}
      className={`group/card relative aspect-[2.5/3.5] bg-zinc-800/50 rounded-lg overflow-hidden border transition-all cursor-pointer ${
        selecting && selected
          ? "border-red-500/60 shadow-sm shadow-red-500/20 ring-2 ring-red-500/30"
          : isOwned
            ? "border-indigo-500/30 shadow-sm shadow-indigo-500/10"
            : isWanted
              ? "border-amber-500/30 shadow-sm shadow-amber-500/10"
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

      {!selecting && !isOwned && (onAdd || onWant) && (
        <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover/card:opacity-100 transition-opacity">
          {onAdd && (
            <button
              onClick={handleAdd}
              disabled={addState === "adding"}
              className="p-2 bg-indigo-600/90 hover:bg-indigo-500 rounded-full shadow-lg shadow-black/40 transition-all scale-75 group-hover/card:scale-100"
              title={`Add ${card.name}`}
            >
              {addState === "adding" ? (
                <Spinner size="md" />
              ) : (
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
              )}
            </button>
          )}
          {onWant && !isWanted && (
            <button
              onClick={handleWant}
              disabled={wantState === "wanting"}
              className="p-2 bg-amber-600/90 hover:bg-amber-500 rounded-full shadow-lg shadow-black/40 transition-all scale-75 group-hover/card:scale-100"
              title={`Want ${card.name}`}
            >
              {wantState === "wanting" ? (
                <Spinner size="md" color="yellow" />
              ) : (
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              )}
            </button>
          )}
        </div>
      )}

      {(isOwned || isWanted) && !selecting && (
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-1.5 flex items-center gap-1">
          {isWanted && !isOwned && (
            <svg className="w-3 h-3 text-amber-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          )}
          <p className="text-[9px] text-white font-medium truncate">{card.name}</p>
        </div>
      )}
    </div>
  );
}
