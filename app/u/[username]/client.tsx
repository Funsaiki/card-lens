"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import Spinner from "@/components/ui/Spinner";
import { CardGame, GAME_LABELS } from "@/types";
import { displayStoredImageUrl } from "@/lib/indexer";

interface PublicItem {
  id: string;
  cardId: string;
  game: CardGame;
  cardName: string;
  cardSet: string | null;
  cardRarity: string | null;
  cardImageUrl: string | null;
  quantity: number;
  status: string;
}

interface GameBreakdown {
  game: CardGame;
  label: string;
  count: number;
  value: number;
}

interface PublicData {
  username: string;
  totalCards: number;
  totalValue: number;
  games: GameBreakdown[];
  items: PublicItem[];
}

const GAME_GRADIENTS: Record<string, string> = {
  pokemon: "from-amber-400 via-orange-500 to-red-500",
  onepiece: "from-red-500 via-rose-500 to-pink-500",
  riftbound: "from-emerald-400 via-teal-500 to-cyan-500",
  hololive: "from-cyan-400 via-sky-500 to-blue-500",
};

export default function PublicCollectionClient({ username }: { username: string }) {
  const [data, setData] = useState<PublicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedGame, setSelectedGame] = useState<CardGame | null>(null);

  useEffect(() => {
    fetch(`/api/u/${encodeURIComponent(username)}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [username]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" color="indigo" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col">
        <NavBar />
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <svg className="w-12 h-12 text-zinc-700 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
          <p className="text-sm text-zinc-400">This collection is private or doesn&apos;t exist.</p>
          <Link href="/" className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
            Go home
          </Link>
        </div>
      </div>
    );
  }

  const ownedItems = data.items.filter((i) => i.status === "owned");
  const wantedItems = data.items.filter((i) => i.status === "wanted");
  const gameItems = selectedGame ? ownedItems.filter((i) => i.game === selectedGame) : null;

  return (
    <div className="min-h-screen">
      <NavBar />

      <div className="p-4 max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center pt-4 mb-6">
          <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-indigo-600 flex items-center justify-center text-lg font-bold text-white">
            {data.username[0].toUpperCase()}
          </div>
          <h1 className="text-lg font-bold text-white">{data.username}</h1>
          <div className="flex items-center justify-center gap-3 mt-1">
            <span className="text-xs text-[var(--muted)]">{data.totalCards} cards</span>
            {data.totalValue > 0 && (
              <span className="text-xs text-green-400">${data.totalValue.toFixed(2)}</span>
            )}
            {wantedItems.length > 0 && (
              <span className="text-xs text-amber-400">{wantedItems.length} wanted</span>
            )}
          </div>
        </div>

        {selectedGame ? (
          <>
            {/* Game detail view */}
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => setSelectedGame(null)}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="text-sm font-semibold text-white">{GAME_LABELS[selectedGame]}</h2>
              <span className="text-[10px] text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded-full">
                {gameItems?.length ?? 0} cards
              </span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2">
              {gameItems?.map((item) => (
                <div
                  key={item.id}
                  className="relative aspect-[2.5/3.5] bg-zinc-800/50 rounded-lg overflow-hidden border border-indigo-500/30 shadow-sm shadow-indigo-500/10"
                >
                  {item.cardImageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={displayStoredImageUrl(item.cardImageUrl)}
                      alt={item.cardName}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                    <p className="text-[9px] text-white font-medium truncate">{item.cardName}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Game cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.games.map((game) => (
                <button
                  key={game.game}
                  onClick={() => setSelectedGame(game.game)}
                  className="group relative flex items-center gap-4 p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.1] transition-all text-left"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${GAME_GRADIENTS[game.game] ?? ""} opacity-0 group-hover:opacity-[0.06] rounded-xl transition-opacity`} />
                  <div className="relative flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors">
                      {game.label}
                    </p>
                    <p className="text-xs text-[var(--muted)] mt-0.5">
                      {game.count} card{game.count !== 1 ? "s" : ""}
                      {game.value > 0 && <span> &middot; ${game.value.toFixed(2)}</span>}
                    </p>
                  </div>
                  <div className="relative flex items-center gap-2">
                    <span className={`text-lg font-bold bg-gradient-to-r ${GAME_GRADIENTS[game.game] ?? "from-zinc-400 to-zinc-500"} bg-clip-text text-transparent`}>
                      {game.count}
                    </span>
                    <svg className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>

            {/* Wanted cards section */}
            {wantedItems.length > 0 && (
              <div className="mt-6">
                <p className="text-xs text-[var(--muted)] uppercase tracking-wider mb-3">Wishlist</p>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {wantedItems.slice(0, 12).map((item) => (
                    <div key={item.id} className="flex-shrink-0 w-20">
                      <div className="aspect-[2.5/3.5] rounded-lg overflow-hidden bg-zinc-800/50 border border-amber-500/30 opacity-70">
                        {item.cardImageUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={displayStoredImageUrl(item.cardImageUrl)}
                            alt={item.cardName}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        )}
                      </div>
                      <p className="text-[9px] text-zinc-400 truncate mt-1 text-center">{item.cardName}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {data.totalCards === 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-zinc-400">This collection is empty.</p>
          </div>
        )}
      </div>
    </div>
  );
}
