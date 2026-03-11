"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useUser } from "@/hooks/useUser";
import { CardGame, CollectionItem, CardCondition, CardVariant, GAME_LABELS, PortfolioSummary, PortfolioHistory, CollectionStats } from "@/types";
import NavBar from "@/components/NavBar";
import AuthModal from "@/components/AuthModal";
import ErrorBoundary from "@/components/ErrorBoundary";
import SetCollectionView from "@/components/SetCollectionView";
import PortfolioValueCard from "@/components/PortfolioValueCard";
import PortfolioChart from "@/components/PortfolioChart";
import StatsPanel from "@/components/StatsPanel";
import { SkeletonDashboard, SkeletonStats } from "@/components/Skeleton";
import Spinner from "@/components/ui/Spinner";
import { exportCollectionXlsx } from "@/lib/csv-export";

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
  variant: CardVariant | null;
  status: string | null;
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
    variant: raw.variant ?? "normal",
    status: (raw.status === "wanted" ? "wanted" : "owned") as CollectionItem["status"],
    notes: raw.notes,
    addedAt: raw.added_at,
  };
}

export default function CollectionPage() {
  const { user, loading: authLoading } = useUser();
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [gameView, setGameView] = useState<{ game: CardGame; setId: string | null } | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [history, setHistory] = useState<PortfolioHistory | null>(null);
  const [stats, setStats] = useState<CollectionStats | null>(null);
  const [dashTab, setDashTab] = useState<"overview" | "stats">("overview");
  const [refreshing, setRefreshing] = useState(false);

  const openGame = useCallback((game: CardGame, setId?: string | null) => {
    setGameView({ game, setId: setId ?? null });
  }, []);

  const fetchCollection = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/collection?all=1");
    if (res.ok) {
      const data = await res.json();
      setItems((data.items as RawCollectionItem[]).map(mapItem));
    }
    setLoading(false);
    // Fetch portfolio data in background (errors logged, not shown to user)
    fetch("/api/portfolio").then((r) => r.ok ? r.json() : null).then((d) => d && setPortfolio(d)).catch(() => {});
    fetch("/api/portfolio/history?days=30").then((r) => r.ok ? r.json() : null).then((d) => d && setHistory(d)).catch(() => {});
    fetch("/api/portfolio/snapshot", { method: "POST" }).catch(() => {});
  }, []);

  useEffect(() => {
    if (user) fetchCollection();
  }, [user, fetchCollection]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" color="indigo" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <NavBar />
        <div className="flex-1 flex flex-col items-center justify-center p-6">
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
      </div>
    );
  }

  // Per-game stats
  const gameStats = GAMES.map((g) => {
    const gameOwned = items.filter((i) => i.game === g.id && i.status === "owned");
    const gameWanted = items.filter((i) => i.game === g.id && i.status === "wanted");
    const unique = gameOwned.length;
    const total = gameOwned.reduce((sum, i) => sum + i.quantity, 0);
    const sets = new Set(gameOwned.map((i) => i.cardSet).filter(Boolean)).size;
    const wantedCount = gameWanted.length;
    return { ...g, unique, total, sets, wantedCount };
  });

  const ownedItems = items.filter((i) => i.status === "owned");
  const totalCards = ownedItems.length;

  // Game detail view
  if (gameView) {
    const game = gameStats.find((g) => g.id === gameView.game)!;
    const gameItems = items.filter((i) => i.game === gameView.game);
    const gameOwned = gameItems.filter((i) => i.status === "owned");
    const gameWanted = gameItems.filter((i) => i.status === "wanted");
    return (
      <div className="min-h-screen">
        <NavBar />
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]">
          <button
            onClick={() => setGameView(null)}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className={`w-5 h-5 text-transparent bg-gradient-to-r ${game.color} bg-clip-text`}>
            {game.icon}
          </div>
          <h1 className="text-sm font-semibold text-white">{GAME_LABELS[gameView.game]}</h1>
          {game.unique > 0 && (
            <span className="text-[10px] text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded-full">
              {game.unique} cards
            </span>
          )}
        </div>
        <ErrorBoundary>
          <SetCollectionView game={gameView.game} ownedCards={gameOwned} wantedCards={gameWanted} onCardAdded={fetchCollection} initialSetId={gameView.setId} />
        </ErrorBoundary>
      </div>
    );
  }

  // Dashboard view
  return (
    <div className="min-h-screen">
      <NavBar />

      <div className="p-4 max-w-3xl mx-auto">
        {loading ? (
          <div className="pt-4">
            <SkeletonDashboard />
          </div>
        ) : (
          <>
            {/* Portfolio value card */}
            {totalCards > 0 && portfolio && (
              <div className="pt-4 mb-4">
                <PortfolioValueCard portfolio={portfolio} />
                {/* Refresh prices button */}
                <div className="flex justify-center gap-2 mt-2">
                  <button
                    onClick={async () => {
                      setRefreshing(true);
                      try {
                        const res = await fetch("/api/collection/refresh-prices", { method: "POST" });
                        if (res.ok) {
                          const data = await res.json();
                          toast.success(`${data.updated} price${data.updated !== 1 ? "s" : ""} updated`);
                          await fetchCollection();
                        } else {
                          toast.error("Failed to refresh prices");
                        }
                      } catch {
                        toast.error("Failed to refresh prices");
                      }
                      setRefreshing(false);
                    }}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 hover:border-indigo-500/30 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <svg
                      className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {refreshing ? "Updating prices..." : "Refresh prices"}
                  </button>
                  <button
                    onClick={() => exportCollectionXlsx(items)}
                    disabled={items.length === 0}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-zinc-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.12] rounded-lg transition-colors disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export Excel
                  </button>
                </div>
              </div>
            )}

            {/* Fallback if no portfolio data yet */}
            {totalCards > 0 && !portfolio && (
              <div className="text-center mb-6 pt-4">
                <p className="text-3xl font-bold text-white">{totalCards}</p>
                <p className="text-xs text-[var(--muted)]">unique cards collected</p>
              </div>
            )}

            {/* Portfolio chart */}
            {totalCards > 0 && history && (
              <div className="mb-4">
                <PortfolioChart
                  history={history}
                  onRangeChange={(days) => {
                    fetch(`/api/portfolio/history?days=${days}`)
                      .then((r) => r.ok ? r.json() : null)
                      .then((d) => d && setHistory(d));
                  }}
                />
              </div>
            )}

            {/* Tab bar: Overview / Statistics */}
            {totalCards > 0 && (
              <div className="flex gap-1 mb-4 border-b border-white/[0.06]">
                <button
                  onClick={() => setDashTab("overview")}
                  className={`px-4 py-2 text-xs font-medium transition-colors border-b-2 ${
                    dashTab === "overview"
                      ? "border-indigo-500 text-white"
                      : "border-transparent text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => {
                    setDashTab("stats");
                    if (!stats) {
                      fetch("/api/portfolio/stats")
                        .then((r) => r.ok ? r.json() : null)
                        .then((d) => d && !d.empty && setStats(d));
                    }
                  }}
                  className={`px-4 py-2 text-xs font-medium transition-colors border-b-2 ${
                    dashTab === "stats"
                      ? "border-indigo-500 text-white"
                      : "border-transparent text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  Statistics
                </button>
              </div>
            )}

            {/* Statistics tab */}
            {dashTab === "stats" && stats && (
              <div className="mb-6">
                <StatsPanel stats={stats} />
              </div>
            )}
            {dashTab === "stats" && !stats && totalCards > 0 && (
              <div className="mb-6">
                <SkeletonStats />
              </div>
            )}

            {/* Overview tab content */}
            {dashTab === "overview" && (
              <>
                {/* Game cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {gameStats.map((game) => (
                    <button
                      key={game.id}
                      onClick={() => openGame(game.id)}
                      className="group relative flex items-center gap-4 p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.1] transition-all text-left"
                    >
                      <div
                        className={`absolute inset-0 bg-gradient-to-br ${game.gradient} opacity-0 group-hover:opacity-[0.06] rounded-xl transition-opacity`}
                      />
                      <div className="relative flex-shrink-0 text-white/80 group-hover:text-white transition-colors">
                        {game.icon}
                      </div>
                      <div className="relative flex-1 min-w-0">
                        <p className="text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors">
                          {GAME_LABELS[game.id]}
                        </p>
                        {game.unique > 0 ? (
                          <p className="text-xs text-[var(--muted)] mt-0.5">
                            {game.unique} card{game.unique !== 1 ? "s" : ""}
                            {game.sets > 0 && <span> &middot; {game.sets} set{game.sets !== 1 ? "s" : ""}</span>}
                            {game.total !== game.unique && <span> &middot; {game.total} total</span>}
                            {game.wantedCount > 0 && <span> &middot; {game.wantedCount} wanted</span>}
                          </p>
                        ) : (
                          <p className="text-xs text-[var(--muted)] mt-0.5">No cards yet</p>
                        )}
                      </div>
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

                {/* Most valuable cards */}
                {portfolio && portfolio.topCards.length > 0 && (
                  <div className="mt-6">
                    <p className="text-xs text-[var(--muted)] uppercase tracking-wider mb-3">Most Valuable</p>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {portfolio.topCards.slice(0, 8).map((card) => (
                        <button
                          key={card.cardId}
                          onClick={() => openGame(card.game)}
                          className="flex-shrink-0 w-20 group"
                        >
                          <div className="relative aspect-[2.5/3.5] rounded-lg overflow-hidden bg-zinc-800/50 border border-white/[0.06] group-hover:border-white/[0.15] transition-all">
                            {card.imageUrl && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={card.imageUrl}
                                alt={card.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            )}
                            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-1 pb-0.5 pt-3">
                              <p className="text-[9px] text-green-400 font-medium text-center">
                                ${card.unitPrice.toFixed(2)}
                              </p>
                            </div>
                          </div>
                          <p className="text-[9px] text-zinc-400 truncate mt-1 text-center">{card.name}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

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
              </>
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

        {/* Donation footer */}
        {!loading && totalCards > 0 && (
          <div className="mt-8 mb-4 text-center">
            <a
              href="https://ko-fi.com/funsaiki"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs text-pink-300 hover:text-pink-200 bg-pink-500/10 hover:bg-pink-500/15 border border-pink-500/15 rounded-full transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
              Enjoying Card Lens? Support the project
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
