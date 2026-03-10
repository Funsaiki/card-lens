"use client";

import { PortfolioSummary, GAME_LABELS, CardGame } from "@/types";

const GAME_COLORS: Record<CardGame, string> = {
  pokemon: "bg-amber-400",
  onepiece: "bg-rose-400",
  riftbound: "bg-emerald-400",
  hololive: "bg-cyan-400",
};

interface Props {
  portfolio: PortfolioSummary;
}

export default function PortfolioValueCard({ portfolio }: Props) {
  const totalValue = portfolio.totalValueUsd;
  const hasPricedCards = totalValue > 0;

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
      {/* Main value */}
      <div className="text-center mb-4">
        <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Portfolio Value</p>
        <p className="text-3xl font-bold text-green-400">
          {hasPricedCards ? `$${totalValue.toFixed(2)}` : "—"}
        </p>
        <div className="flex items-center justify-center gap-3 mt-1.5 text-xs text-zinc-400">
          <span>{portfolio.totalUnique} unique</span>
          <span className="text-zinc-600">&middot;</span>
          <span>{portfolio.totalCards} total</span>
        </div>
      </div>

      {/* Per-game breakdown */}
      {portfolio.byGame.length > 0 && (
        <div className="space-y-1.5">
          {portfolio.byGame
            .sort((a, b) => b.value - a.value)
            .map((gv) => {
              const pct = totalValue > 0 ? (gv.value / totalValue) * 100 : 0;
              return (
                <div key={gv.game} className="flex items-center gap-2 text-xs">
                  <div className={`w-2 h-2 rounded-full ${GAME_COLORS[gv.game]}`} />
                  <span className="text-zinc-400 flex-1">{GAME_LABELS[gv.game]}</span>
                  <span className="text-zinc-500">{gv.uniqueCards} cards</span>
                  <span className="text-zinc-300 font-medium w-16 text-right">
                    {gv.value > 0 ? `$${gv.value.toFixed(2)}` : "—"}
                  </span>
                  {totalValue > 0 && (
                    <span className="text-zinc-600 w-10 text-right text-[10px]">
                      {pct.toFixed(0)}%
                    </span>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {/* Composition bar */}
      {totalValue > 0 && portfolio.byGame.length > 1 && (
        <div className="flex rounded-full h-1.5 overflow-hidden mt-3 bg-zinc-800">
          {portfolio.byGame
            .sort((a, b) => b.value - a.value)
            .map((gv) => {
              const pct = (gv.value / totalValue) * 100;
              if (pct < 0.5) return null;
              return (
                <div
                  key={gv.game}
                  className={`${GAME_COLORS[gv.game]} opacity-70`}
                  style={{ width: `${pct}%` }}
                />
              );
            })}
        </div>
      )}
    </div>
  );
}
