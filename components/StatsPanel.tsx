"use client";

import { CollectionStats, GAME_LABELS, CONDITION_LABELS, CardGame, CardCondition } from "@/types";

const GAME_COLORS: Record<CardGame, string> = {
  pokemon: "#fbbf24",
  onepiece: "#fb7185",
  riftbound: "#34d399",
  hololive: "#22d3ee",
};

interface Props {
  stats: CollectionStats;
}

// ---------- SVG Horizontal Bar ----------

function HorizontalBars({
  data,
  colorFn,
}: {
  data: { label: string; value: number; extra?: string }[];
  colorFn?: (label: string) => string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="space-y-1.5">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-2 text-[10px]">
          <span className="text-zinc-400 w-24 truncate text-right">{d.label}</span>
          <div className="flex-1 h-3 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max((d.value / max) * 100, 2)}%`,
                backgroundColor: colorFn?.(d.label) ?? "#6366f1",
              }}
            />
          </div>
          <span className="text-zinc-500 w-8 text-right">{d.value}</span>
          {d.extra && <span className="text-zinc-600 w-14 text-right">{d.extra}</span>}
        </div>
      ))}
    </div>
  );
}

// ---------- Ring/Donut chart ----------

function DonutChart({ data }: { data: { game: CardGame; percentage: number }[] }) {
  const radius = 36;
  const stroke = 8;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <svg viewBox="0 0 100 100" className="w-20 h-20">
      {data.map((d) => {
        const dash = (d.percentage / 100) * circumference;
        const gap = circumference - dash;
        const currentOffset = offset;
        offset += dash;
        return (
          <circle
            key={d.game}
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={GAME_COLORS[d.game]}
            strokeWidth={stroke}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-currentOffset}
            strokeLinecap="round"
            opacity={0.8}
            transform="rotate(-90 50 50)"
          />
        );
      })}
    </svg>
  );
}

// ---------- Section wrapper ----------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2.5">
      <h3 className="text-[10px] text-zinc-500 uppercase tracking-wider">{title}</h3>
      {children}
    </div>
  );
}

// ---------- Main ----------

export default function StatsPanel({ stats }: Props) {
  return (
    <div className="space-y-6">
      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 text-center">
          <p className="text-lg font-bold text-white">${stats.avgCardValue.toFixed(2)}</p>
          <p className="text-[10px] text-zinc-500">Avg. Card Value</p>
        </div>
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 text-center">
          <p className="text-lg font-bold text-white">${stats.medianCardValue.toFixed(2)}</p>
          <p className="text-[10px] text-zinc-500">Median Value</p>
        </div>
      </div>

      {/* Game composition */}
      {stats.gameComposition.length > 0 && (
        <Section title="Game Composition">
          <div className="flex items-center gap-4">
            {stats.gameComposition.length > 1 && (
              <DonutChart
                data={stats.gameComposition.map((g) => ({
                  game: g.game,
                  percentage: g.percentage,
                }))}
              />
            )}
            <div className="flex-1 space-y-1.5">
              {stats.gameComposition.map((g) => (
                <div key={g.game} className="flex items-center gap-2 text-xs">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: GAME_COLORS[g.game] }}
                  />
                  <span className="text-zinc-400 flex-1">{GAME_LABELS[g.game]}</span>
                  <span className="text-zinc-500">{g.count}</span>
                  <span className="text-zinc-300 font-medium">{g.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </Section>
      )}

      {/* Rarity breakdown */}
      {stats.rarityBreakdown.length > 0 && (
        <Section title="By Rarity">
          <HorizontalBars
            data={stats.rarityBreakdown.slice(0, 10).map((r) => ({
              label: r.rarity,
              value: r.count,
              extra: r.value > 0 ? `$${r.value.toFixed(0)}` : undefined,
            }))}
            colorFn={() => "#8b5cf6"}
          />
        </Section>
      )}

      {/* Price distribution */}
      {stats.priceDistribution.some((b) => b.count > 0) && (
        <Section title="Price Distribution">
          <HorizontalBars
            data={stats.priceDistribution.map((b) => ({
              label: b.range,
              value: b.count,
            }))}
            colorFn={() => "#22c55e"}
          />
        </Section>
      )}

      {/* Top sets by value */}
      {stats.setComposition.length > 0 && (
        <Section title="Top Sets by Value">
          <div className="space-y-1.5">
            {stats.setComposition.slice(0, 10).map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px]">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: GAME_COLORS[s.game] }}
                />
                <span className="text-zinc-400 flex-1 truncate">{s.set}</span>
                <span className="text-zinc-500">{s.count} cards</span>
                <span className="text-zinc-300 font-medium">
                  {s.value > 0 ? `$${s.value.toFixed(2)}` : "—"}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Most valuable cards */}
      {stats.bestGains.length > 0 && (
        <Section title="Most Valuable Cards">
          <div className="space-y-2">
            {stats.bestGains.map((c, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-10 h-14 rounded overflow-hidden bg-zinc-800 flex-shrink-0">
                  {c.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.imageUrl} alt={c.name} className="w-full h-full object-cover" loading="lazy" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-zinc-200 truncate">{c.name}</p>
                  <p className="text-[10px] text-zinc-500">{GAME_LABELS[c.game]}</p>
                </div>
                <span className="text-sm font-bold text-green-400">${c.currentPrice.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Condition breakdown */}
      {stats.conditionBreakdown.length > 0 && (
        <Section title="Card Condition">
          <div className="flex flex-wrap gap-2">
            {stats.conditionBreakdown.map((c) => (
              <div
                key={c.condition}
                className="px-2.5 py-1 rounded-full border border-white/[0.06] bg-white/[0.02] text-[10px]"
              >
                <span className="text-zinc-400">
                  {CONDITION_LABELS[c.condition as CardCondition] ?? c.condition}
                </span>{" "}
                <span className="text-zinc-300 font-medium">{c.count}</span>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
