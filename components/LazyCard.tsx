"use client";

import { useState, useEffect, useRef } from "react";
import { CardGame } from "@/types";
import { getCardImageUrl, SetCard } from "@/lib/indexer";

const PLACEHOLDER_BG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'%3E%3Crect fill='%2327272a' width='1' height='1'/%3E%3C/svg%3E";

type AddState = "idle" | "adding" | "added";

export default function LazyCard({ card, game, owned, onAdd, onClick, directImage, selecting, selected, onToggleSelect }: {
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

      {isOwned && !selecting && (
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
          <p className="text-[9px] text-white font-medium truncate">{card.name}</p>
        </div>
      )}
    </div>
  );
}
