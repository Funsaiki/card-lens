"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useUser } from "@/hooks/useUser";
import { CardGame, CollectionItem, CardCondition, GAME_LABELS } from "@/types";
import AuthModal from "@/components/AuthModal";
import SetCollectionView from "@/components/SetCollectionView";

const GAMES: { id: CardGame; color: string; gradient: string; icon: React.ReactNode }[] = [
  {
    id: "pokemon",
    color: "from-amber-400 to-red-500",
    gradient: "from-amber-400 via-orange-500 to-red-500",
    icon: (
      <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h7.5m5 0H22" />
        <circle cx="12" cy="12" r="3" />
        <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    id: "onepiece",
    color: "from-red-400 to-pink-500",
    gradient: "from-red-500 via-rose-500 to-pink-500",
    icon: (
      <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5">
        <ellipse cx="12" cy="14" rx="7" ry="3.5" />
        <path d="M5 14c0-3 3.1-7 7-7s7 4 7 7" />
        <path d="M3 14.5c0 0 1.5 1 9 1s9-1 9-1" strokeWidth="1.2" />
        <ellipse cx="12" cy="14" rx="9.5" ry="1.2" strokeWidth="2" />
      </svg>
    ),
  },
  {
    id: "riftbound",
    color: "from-emerald-400 to-cyan-500",
    gradient: "from-emerald-400 via-teal-500 to-cyan-500",
    icon: (
      <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2L20 8v8l-8 6-8-6V8z" />
        <path d="M12 6l4.5 3v6L12 18l-4.5-3V9z" strokeWidth="1" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    id: "hololive",
    color: "from-cyan-400 to-blue-500",
    gradient: "from-cyan-400 via-sky-500 to-blue-500",
    icon: (
      <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 4.5a1.5 1.5 0 0 1 2.2-.3L19.8 11a1.5 1.5 0 0 1 0 2.4L8.2 19.8a1.5 1.5 0 0 1-2.2-1.2V4.5z" />
      </svg>
    ),
  },
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
  const [loading, setLoading] = useState(true);
  const [activeGame, setActiveGame] = useState<CardGame | null>(null);
  const [initialSetId, setInitialSetId] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);

  const openGame = useCallback((game: CardGame, setId?: string | null) => {
    setInitialSetId(setId ?? null);
    setActiveGame(game);
  }, []);

  const fetchCollection = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/collection");
    if (res.ok) {
      const data = await res.json();
      setItems((data.items as RawCollectionItem[]).map(mapItem));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) fetchCollection();
  }, [user, fetchCollection]);

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

  // Per-game stats
  const gameStats = GAMES.map((g) => {
    const gameItems = items.filter((i) => i.game === g.id);
    const unique = gameItems.length;
    const total = gameItems.reduce((sum, i) => sum + i.quantity, 0);
    const sets = new Set(gameItems.map((i) => i.cardSet).filter(Boolean)).size;
    return { ...g, unique, total, sets };
  });

  const totalCards = items.length;

  // Game detail view
  if (activeGame) {
    const game = gameStats.find((g) => g.id === activeGame)!;
    const gameItems = items.filter((i) => i.game === activeGame);
    return (
      <div className="min-h-screen">
        <header className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-white/[0.02] backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setActiveGame(null); setInitialSetId(null); }}
              className="text-zinc-400 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className={`w-5 h-5 text-transparent bg-gradient-to-r ${game.color} bg-clip-text`}>
              {game.icon}
            </div>
            <h1 className="text-sm font-semibold text-white">{GAME_LABELS[activeGame]}</h1>
            {game.unique > 0 && (
              <span className="text-[10px] text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded-full">
                {game.unique} cards
              </span>
            )}
          </div>
        </header>
        <SetCollectionView game={activeGame} ownedCards={gameItems} onCardAdded={fetchCollection} initialSetId={initialSetId} />
      </div>
    );
  }

  // Dashboard view
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
          {totalCards > 0 && (
            <span className="text-[10px] text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded-full">
              {totalCards} cards
            </span>
          )}
        </div>
      </header>

      <div className="p-4 max-w-3xl mx-auto">
        {loading ? (
          <div className="flex justify-center py-20">
            <span className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Total stats */}
            {totalCards > 0 && (
              <div className="text-center mb-6 pt-4">
                <p className="text-3xl font-bold text-white">{totalCards}</p>
                <p className="text-xs text-[var(--muted)]">unique cards collected</p>
              </div>
            )}

            {/* Game cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {gameStats.map((game) => (
                <button
                  key={game.id}
                  onClick={() => openGame(game.id)}
                  className="group relative flex items-center gap-4 p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.1] transition-all text-left"
                >
                  {/* Gradient glow */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${game.gradient} opacity-0 group-hover:opacity-[0.06] rounded-xl transition-opacity`}
                  />

                  {/* Icon */}
                  <div className="relative flex-shrink-0 text-white/80 group-hover:text-white transition-colors">
                    {game.icon}
                  </div>

                  {/* Info */}
                  <div className="relative flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors">
                      {GAME_LABELS[game.id]}
                    </p>
                    {game.unique > 0 ? (
                      <p className="text-xs text-[var(--muted)] mt-0.5">
                        {game.unique} card{game.unique !== 1 ? "s" : ""}
                        {game.sets > 0 && <span> &middot; {game.sets} set{game.sets !== 1 ? "s" : ""}</span>}
                        {game.total !== game.unique && <span> &middot; {game.total} total</span>}
                      </p>
                    ) : (
                      <p className="text-xs text-[var(--muted)] mt-0.5">No cards yet</p>
                    )}
                  </div>

                  {/* Count badge + arrow */}
                  <div className="relative flex items-center gap-2">
                    {game.unique > 0 && (
                      <span className={`text-lg font-bold bg-gradient-to-r ${game.color} bg-clip-text text-transparent`}>
                        {game.unique}
                      </span>
                    )}
                    <svg
                      className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 group-hover:translate-x-0.5 transition-all flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>

            {/* Recent additions */}
            {items.length > 0 && (
              <div className="mt-6">
                <p className="text-xs text-[var(--muted)] uppercase tracking-wider mb-3">Recently added</p>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {items.slice(0, 8).map((item) => (
                    <button
                      key={item.id}
                      onClick={() => openGame(item.game, item.cardSet)}
                      className="flex-shrink-0 w-20 group"
                    >
                      <div className="aspect-[2.5/3.5] rounded-lg overflow-hidden bg-zinc-800/50 border border-white/[0.06] group-hover:border-white/[0.15] transition-all">
                        {item.cardImageUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.cardImageUrl}
                            alt={item.cardName}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        )}
                      </div>
                      <p className="text-[9px] text-zinc-400 truncate mt-1 text-center">{item.cardName}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {totalCards === 0 && (
              <div className="text-center py-12">
                <svg className="w-16 h-16 mx-auto mb-3 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <p className="text-sm text-zinc-400 mb-1">No cards yet</p>
                <p className="text-xs text-[var(--muted)] mb-4">Scan or search cards to start your collection</p>
                <Link
                  href="/"
                  className="inline-block px-4 py-2 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
                >
                  Start scanning
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
