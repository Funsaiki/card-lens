"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useUser } from "@/hooks/useUser";
import { CardGame, CollectionItem, CONDITION_LABELS, CardCondition } from "@/types";
import AuthModal from "@/components/AuthModal";

const GAMES: { id: CardGame | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pokemon", label: "Pokemon" },
  { id: "magic", label: "MTG" },
  { id: "yugioh", label: "Yu-Gi-Oh!" },
  { id: "hololive", label: "Hololive" },
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
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <span className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 p-6">
        <h1 className="text-xl font-bold text-white mb-2">My Collection</h1>
        <p className="text-sm text-zinc-400 mb-4">Sign in to view your card collection</p>
        <button
          onClick={() => setShowAuth(true)}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Sign in
        </button>
        <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
      </div>
    );
  }

  // Stats
  const stats = GAMES.filter((g) => g.id !== "all").map((g) => {
    const gameItems = items.filter((i) => activeGame === "all" ? i.game === g.id : i.game === g.id);
    return {
      ...g,
      unique: gameItems.length,
      total: gameItems.reduce((sum, i) => sum + i.quantity, 0),
    };
  }).filter((s) => activeGame === "all" || s.id === activeGame);

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-zinc-400 hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-sm font-semibold text-white">My Collection</h1>
          {total > 0 && (
            <span className="text-[10px] text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded-full">
              {total} cards
            </span>
          )}
        </div>
      </header>

      {/* Game tabs */}
      <div className="flex gap-1 px-4 py-2 border-b border-zinc-800 overflow-x-auto">
        {GAMES.map((g) => (
          <button
            key={g.id}
            onClick={() => setActiveGame(g.id)}
            className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-colors ${
              activeGame === g.id
                ? "bg-zinc-700 text-white"
                : "text-zinc-500 hover:text-zinc-300"
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
            <div key={s.id} className="flex-shrink-0 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 min-w-[100px]">
              <p className="text-[10px] text-zinc-500">{s.label}</p>
              <p className="text-sm font-bold text-zinc-200">{s.unique} <span className="text-zinc-500 font-normal text-[10px]">unique</span></p>
              {s.total !== s.unique && (
                <p className="text-[10px] text-zinc-500">{s.total} total</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <span className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <svg className="w-16 h-16 mx-auto mb-3 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="text-sm text-zinc-400 mb-1">No cards yet</p>
            <p className="text-xs text-zinc-600 mb-4">Scan or search cards to add them to your collection</p>
            <Link
              href="/"
              className="inline-block px-4 py-2 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
            >
              Start scanning
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="group bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition-colors"
              >
                {/* Card image */}
                <div className="relative aspect-[2.5/3.5] bg-zinc-800">
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
                    <div className="absolute top-1.5 right-1.5 bg-black/70 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] font-bold text-white">
                      x{item.quantity}
                    </div>
                  )}

                  {/* Hover actions */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={() => setEditingId(editingId === item.id ? null : item.id)}
                      className="p-1.5 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors"
                      title="Edit"
                    >
                      <svg className="w-4 h-4 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 bg-zinc-800 rounded-lg hover:bg-red-600/30 transition-colors"
                      title="Remove"
                    >
                      <svg className="w-4 h-4 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Card info */}
                <div className="p-2">
                  <p className="text-[11px] font-medium text-zinc-200 truncate">{item.cardName}</p>
                  <p className="text-[10px] text-zinc-500 truncate">{item.cardSet ?? item.game}</p>
                </div>

                {/* Edit panel */}
                {editingId === item.id && (
                  <div className="border-t border-zinc-800 p-2 space-y-2 animate-fade-in">
                    {/* Quantity */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-zinc-500">Qty</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                          className="w-5 h-5 flex items-center justify-center bg-zinc-800 rounded text-zinc-400 hover:text-white text-xs"
                        >
                          -
                        </button>
                        <span className="text-xs text-zinc-200 w-6 text-center">{item.quantity}</span>
                        <button
                          onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                          className="w-5 h-5 flex items-center justify-center bg-zinc-800 rounded text-zinc-400 hover:text-white text-xs"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Condition */}
                    <div>
                      <span className="text-[10px] text-zinc-500 block mb-1">Condition</span>
                      <select
                        value={item.condition}
                        onChange={(e) => handleUpdateCondition(item.id, e.target.value)}
                        className="w-full px-1.5 py-1 text-[10px] bg-zinc-800 border border-zinc-700 rounded text-zinc-200 focus:outline-none"
                      >
                        {Object.entries(CONDITION_LABELS).map(([val, label]) => (
                          <option key={val} value={val}>{label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
