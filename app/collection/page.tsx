"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useUser } from "@/hooks/useUser";
import { CardGame, CollectionItem, CONDITION_LABELS, CardCondition } from "@/types";
import AuthModal from "@/components/AuthModal";
import SetCollectionView from "@/components/SetCollectionView";
import Dropdown from "@/components/Dropdown";

const GAMES_WITH_SETS: CardGame[] = ["pokemon", "hololive"];

const GAMES: { id: CardGame | "all"; label: string; color: string }[] = [
  { id: "all", label: "All", color: "from-zinc-400 to-zinc-500" },
  { id: "pokemon", label: "Pokemon", color: "from-amber-400 to-red-500" },
  { id: "magic", label: "MTG", color: "from-violet-400 to-indigo-500" },
  { id: "yugioh", label: "Yu-Gi-Oh!", color: "from-yellow-400 to-orange-500" },
  { id: "hololive", label: "Hololive", color: "from-cyan-400 to-blue-500" },
];

interface RawCollectionItem {
  id: string;
  card_id: string;
  game: CardGame;
  card_name: string;
  card_set: string | null;
  card_rarity: string | null;
  card_image_url: string | null;
  card_data: CollectionItem["cardData"];
  quantity: number;
  condition: CardCondition;
  notes: string | null;
  added_at: string;
}

function mapItem(raw: RawCollectionItem): CollectionItem {
  return {
    id: raw.id,
    cardId: raw.card_id,
    game: raw.game,
    cardName: raw.card_name,
    cardSet: raw.card_set,
    cardRarity: raw.card_rarity,
    cardImageUrl: raw.card_image_url,
    cardData: raw.card_data,
    quantity: raw.quantity,
    condition: raw.condition,
    notes: raw.notes,
    addedAt: raw.added_at,
  };
}

export default function CollectionPage() {
  const { user, loading: authLoading } = useUser();
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeGame, setActiveGame] = useState<CardGame | "all">("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);

  const fetchCollection = useCallback(async () => {
    setLoading(true);
    const params = activeGame !== "all" ? `?game=${activeGame}` : "";
    const res = await fetch(`/api/collection${params}`);
    if (res.ok) {
      const data = await res.json();
      setItems((data.items as RawCollectionItem[]).map(mapItem));
      setTotal(data.total);
    }
    setLoading(false);
  }, [activeGame]);

  useEffect(() => {
    if (user) fetchCollection();
  }, [user, fetchCollection]);

  const handleDelete = useCallback(async (id: string) => {
    const res = await fetch(`/api/collection/${id}`, { method: "DELETE" });
    if (res.ok) {
      setItems((prev) => prev.filter((i) => i.id !== id));
      setTotal((t) => t - 1);
    }
  }, []);

  const handleUpdateQuantity = useCallback(async (id: string, quantity: number) => {
    if (quantity < 1) return handleDelete(id);
    const res = await fetch(`/api/collection/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity }),
    });
    if (res.ok) {
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, quantity } : i))
      );
    }
  }, [handleDelete]);

  const handleUpdateCondition = useCallback(async (id: string, condition: string) => {
    const res = await fetch(`/api/collection/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ condition }),
    });
    if (res.ok) {
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, condition: condition as CardCondition } : i))
      );
    }
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <h1 className="text-xl font-bold text-white mb-2">My Collection</h1>
        <p className="text-sm text-[var(--muted)] mb-4">Sign in to view your card collection</p>
        <button
          onClick={() => setShowAuth(true)}
          className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Sign in
        </button>
        <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
      </div>
    );
  }

  // Stats
  const stats = GAMES.filter((g) => g.id !== "all").map((g) => {
    const gameItems = items.filter((i) => i.game === g.id);
    return {
      ...g,
      unique: gameItems.length,
      total: gameItems.reduce((sum, i) => sum + i.quantity, 0),
    };
  }).filter((s) => activeGame === "all" || s.id === activeGame);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-white/[0.02] backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-zinc-400 hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-sm font-semibold text-white">My Collection</h1>
          {total > 0 && (
            <span className="text-[10px] text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded-full">
              {total} cards
            </span>
          )}
        </div>
      </header>

      {/* Game tabs */}
      <div className="flex gap-1.5 px-4 py-2.5 border-b border-white/[0.06] overflow-x-auto">
        {GAMES.map((g) => (
          <button
            key={g.id}
            onClick={() => setActiveGame(g.id)}
            className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-all ${
              activeGame === g.id
                ? `bg-gradient-to-r ${g.color} text-white shadow-sm`
                : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]"
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      {/* Stats */}
      {!loading && items.length > 0 && (
        <div className="flex gap-3 px-4 py-3 overflow-x-auto">
          {stats.filter((s) => s.total > 0).map((s) => (
            <div key={s.id} className="flex-shrink-0 bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2 min-w-[100px]">
              <p className="text-[10px] text-[var(--muted)]">{s.label}</p>
              <p className="text-sm font-bold text-zinc-200">{s.unique} <span className="text-[var(--muted)] font-normal text-[10px]">unique</span></p>
              {s.total !== s.unique && (
                <p className="text-[10px] text-[var(--muted)]">{s.total} total</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Content */}
      {activeGame !== "all" && GAMES_WITH_SETS.includes(activeGame) ? (
        <SetCollectionView game={activeGame} ownedCards={items} />
      ) : (
      <div className="p-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <span className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <svg className="w-16 h-16 mx-auto mb-3 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="text-sm text-zinc-400 mb-1">No cards yet</p>
            <p className="text-xs text-[var(--muted)] mb-4">Scan or search cards to add them to your collection</p>
            <Link
              href="/"
              className="inline-block px-4 py-2 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
            >
              Start scanning
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="group bg-white/[0.03] border border-white/[0.06] rounded-xl hover:border-white/[0.12] hover:bg-white/[0.05] transition-all"
              >
                {/* Card image */}
                <div className="relative aspect-[2.5/3.5] bg-zinc-800/50 rounded-t-xl overflow-hidden">
                  {item.cardImageUrl && (
                    <Image
                      src={item.cardImageUrl}
                      alt={item.cardName}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  )}

                  {/* Quantity badge */}
                  {item.quantity > 1 && (
                    <div className="absolute top-1.5 right-1.5 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded-md text-[10px] font-bold text-white border border-white/10">
                      x{item.quantity}
                    </div>
                  )}

                  {/* Hover actions */}
                  <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={() => setEditingId(editingId === item.id ? null : item.id)}
                      className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                      title="Edit"
                    >
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 bg-white/10 rounded-lg hover:bg-red-500/30 transition-colors"
                      title="Remove"
                    >
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Card info */}
                <div className="p-2">
                  <p className="text-[11px] font-medium text-zinc-200 truncate">{item.cardName}</p>
                  <p className="text-[10px] text-[var(--muted)] truncate">{item.cardSet ?? item.game}</p>
                </div>

                {/* Edit panel */}
                {editingId === item.id && (
                  <div className="border-t border-white/[0.06] p-2 space-y-2 animate-fade-in">
                    {/* Quantity */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[var(--muted)]">Qty</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                          className="w-5 h-5 flex items-center justify-center bg-white/[0.06] rounded text-zinc-400 hover:text-white hover:bg-white/[0.1] text-xs transition-colors"
                        >
                          -
                        </button>
                        <span className="text-xs text-zinc-200 w-6 text-center">{item.quantity}</span>
                        <button
                          onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                          className="w-5 h-5 flex items-center justify-center bg-white/[0.06] rounded text-zinc-400 hover:text-white hover:bg-white/[0.1] text-xs transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Condition */}
                    <div>
                      <span className="text-[10px] text-[var(--muted)] block mb-1">Condition</span>
                      <Dropdown
                        value={item.condition}
                        onChange={(val) => handleUpdateCondition(item.id, val)}
                        options={Object.entries(CONDITION_LABELS).map(([val, label]) => ({ value: val, label }))}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      )}
    </div>
  );
}
