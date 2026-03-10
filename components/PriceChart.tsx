"use client";

import { useState } from "react";
import { CardPricing, CardmarketPrice, TCGPlayerPrice, PriceHistoryPoint } from "@/types";

interface PriceChartProps {
  pricing: CardPricing;
}

type ExpandedSection = "tcgplayer" | "cardmarket" | "history" | null;

function formatPrice(value: number | undefined, currency: string): string {
  if (value == null) return "N/A";
  return currency === "EUR" ? `${value.toFixed(2)}\u20AC` : `$${value.toFixed(2)}`;
}

function pctChange(current: number | undefined, previous: number | undefined): string | null {
  if (current == null || previous == null || previous === 0) return null;
  const pct = ((current - previous) / previous) * 100;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

// ---------- Cardmarket trend chart ----------

function CardmarketChart({ data, label }: { data: CardmarketPrice; label: string }) {
  const points = [
    { label: "30d", value: data.avg30 },
    { label: "7d", value: data.avg7 },
    { label: "1d", value: data.avg1 },
    { label: "Now", value: data.trend },
  ].filter((p) => p.value != null) as { label: string; value: number }[];

  if (points.length < 2) return null;

  const values = points.map((p) => p.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 0.01;

  const w = 200;
  const h = 60;
  const padX = 10;
  const padY = 8;
  const chartW = w - padX * 2;
  const chartH = h - padY * 2;

  const coords = points.map((p, i) => ({
    x: padX + (i / (points.length - 1)) * chartW,
    y: padY + chartH - ((p.value - minVal) / range) * chartH,
  }));

  const pathD = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x},${c.y}`).join(" ");
  const fillD = `${pathD} L${coords[coords.length - 1].x},${h - padY} L${coords[0].x},${h - padY} Z`;

  const trendChange = pctChange(data.trend, data.avg30);
  const isUp = data.trend != null && data.avg30 != null && data.trend > data.avg30;
  const color = isUp ? "#22c55e" : data.trend === data.avg30 ? "#a1a1aa" : "#ef4444";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-zinc-500">{label}</span>
        {trendChange && (
          <span className={`text-[10px] font-medium ${isUp ? "text-green-400" : "text-red-400"}`}>
            {trendChange}
          </span>
        )}
      </div>

      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: 60 }}>
        <defs>
          <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={fillD} fill={`url(#grad-${label})`} />
        <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r="3" fill={color} />
        ))}
      </svg>

      <div className="flex justify-between text-[9px] text-zinc-500">
        {points.map((p, i) => (
          <span key={i}>
            {p.label}: {formatPrice(p.value, "EUR")}
          </span>
        ))}
      </div>
    </div>
  );
}

// ---------- 14-day price history chart ----------

function PriceHistoryChart({ history }: { history: PriceHistoryPoint[] }) {
  const marketPoints = history
    .map((p, i) => ({ day: i, value: p.market }))
    .filter((p) => p.value != null) as { day: number; value: number }[];

  if (marketPoints.length < 2) return null;

  const values = marketPoints.map((p) => p.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 0.01;
  const current = values[values.length - 1];
  const oldest = values[0];

  const trendPct = pctChange(current, oldest);
  const isUp = current > oldest;
  const color = isUp ? "#22c55e" : current === oldest ? "#a1a1aa" : "#ef4444";

  const w = 240;
  const h = 80;
  const padX = 10;
  const padY = 10;
  const chartW = w - padX * 2;
  const chartH = h - padY * 2;

  const coords = marketPoints.map((p, i) => ({
    x: padX + (i / (marketPoints.length - 1)) * chartW,
    y: padY + chartH - ((p.value - minVal) / range) * chartH,
  }));

  const pathD = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x},${c.y}`).join(" ");
  const fillD = `${pathD} L${coords[coords.length - 1].x},${h - padY} L${coords[0].x},${h - padY} Z`;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-zinc-500">Market Price · 14 days</span>
        {trendPct && (
          <span className={`text-[10px] font-medium ${isUp ? "text-green-400" : "text-red-400"}`}>
            {trendPct}
          </span>
        )}
      </div>

      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: 80 }}>
        <defs>
          <linearGradient id="grad-history" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={fillD} fill="url(#grad-history)" />
        <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* First and last point dots */}
        <circle cx={coords[0].x} cy={coords[0].y} r="3" fill={color} />
        <circle cx={coords[coords.length - 1].x} cy={coords[coords.length - 1].y} r="3.5" fill={color} stroke="white" strokeWidth="1" />
      </svg>

      <div className="flex justify-between text-[9px] text-zinc-500">
        <span>14d ago: ${oldest.toFixed(2)}</span>
        <span className="text-zinc-300 font-medium">Now: ${current.toFixed(2)}</span>
      </div>

      {/* Inventory price if available */}
      {history[history.length - 1]?.inventory != null && (
        <div className="flex justify-between text-[10px]">
          <span className="text-zinc-500">Lowest listing</span>
          <span className="text-zinc-300">${history[history.length - 1].inventory!.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}

// ---------- TCGPlayer price range chart ----------

function TCGPlayerChart({ data, label }: { data: TCGPlayerPrice; label: string }) {
  const low = data.low ?? 0;
  const high = data.high ?? 0;
  const mid = data.mid;
  const market = data.market;
  const directLow = data.directLow;

  if (high === 0) return null;

  const rangeVal = high - low || 0.01;

  function pct(val: number): number {
    return ((val - low) / rangeVal) * 100;
  }

  return (
    <div className="space-y-2">
      <span className="text-[10px] text-zinc-500">{label}</span>

      <div className="relative h-6 bg-zinc-700/50 rounded-full overflow-hidden">
        <div
          className="absolute top-0 bottom-0 bg-green-500/20 rounded-full"
          style={{ left: "0%", right: "0%" }}
        />
        {market != null && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-green-400"
            style={{ left: `${pct(market)}%` }}
            title={`Market: $${market.toFixed(2)}`}
          />
        )}
        {mid != null && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-blue-400/60"
            style={{ left: `${pct(mid)}%` }}
            title={`Mid: $${mid.toFixed(2)}`}
          />
        )}
        {directLow != null && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-yellow-400/60"
            style={{ left: `${pct(directLow)}%` }}
            title={`Direct Low: $${directLow.toFixed(2)}`}
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px]">
        <div className="flex justify-between">
          <span className="text-zinc-500">Low</span>
          <span className="text-zinc-300">${low.toFixed(2)}</span>
        </div>
        {mid != null && (
          <div className="flex justify-between">
            <span className="text-zinc-500">Mid</span>
            <span className="text-zinc-300">${mid.toFixed(2)}</span>
          </div>
        )}
        {market != null && (
          <div className="flex justify-between">
            <span className="text-green-400">Market</span>
            <span className="text-green-300">${market.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-zinc-500">High</span>
          <span className="text-zinc-300">${high.toFixed(2)}</span>
        </div>
        {directLow != null && (
          <div className="flex justify-between">
            <span className="text-zinc-500">Direct</span>
            <span className="text-zinc-300">${directLow.toFixed(2)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Main component ----------

export default function PriceChart({ pricing }: PriceChartProps) {
  const [expanded, setExpanded] = useState<ExpandedSection>(null);

  const hasTCGPlayer = !!(pricing.tcgplayer || pricing.tcgplayerHolo);
  const hasCardmarket = !!(pricing.cardmarket || pricing.cardmarketHolo);
  const hasHistory = !!(pricing.priceHistory && pricing.priceHistory.length > 1);

  // For One Piece: show history as the main expandable instead of TCGPlayer range chart
  const showTCGPlayerRange = hasTCGPlayer && (pricing.tcgplayer?.high != null || pricing.tcgplayerHolo?.high != null);

  return (
    <div className="space-y-2">
      {/* Source attribution */}
      {pricing.source && (
        <p className="text-[9px] text-zinc-600 uppercase tracking-wider">
          Data: {pricing.source}
        </p>
      )}

      {/* TCGPlayer — with range chart (Pokemon) or simple price (One Piece without history) */}
      {hasTCGPlayer && (
        <div
          className={`bg-zinc-800 rounded-lg overflow-hidden transition-all ${
            expanded === "tcgplayer" ? "ring-1 ring-green-500/30" : ""
          }`}
        >
          <button
            onClick={() => setExpanded(expanded === "tcgplayer" ? null : "tcgplayer")}
            className="w-full flex items-center justify-between p-3 hover:bg-zinc-750 transition-colors"
          >
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium text-zinc-300">TCGPlayer</p>
              <span className="text-[10px] text-zinc-600">USD</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-green-400">
                ${(pricing.tcgplayer?.market ?? pricing.tcgplayerHolo?.market)?.toFixed(2) ?? "N/A"}
              </span>
              {(showTCGPlayerRange || hasHistory) && (
                <svg
                  className={`w-3 h-3 text-zinc-500 transition-transform ${expanded === "tcgplayer" ? "rotate-180" : ""}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </div>
          </button>

          {expanded === "tcgplayer" && (
            <div className="px-3 pb-3 space-y-3 animate-fade-in-down">
              {/* 14-day history chart (One Piece) */}
              {hasHistory && (
                <PriceHistoryChart history={pricing.priceHistory!} />
              )}
              {/* Range charts (Pokemon) */}
              {showTCGPlayerRange && (
                <>
                  {pricing.tcgplayer && <TCGPlayerChart data={pricing.tcgplayer} label="Normal" />}
                  {pricing.tcgplayerHolo && <TCGPlayerChart data={pricing.tcgplayerHolo} label="Reverse Holo" />}
                </>
              )}
              {/* Simple low/market for One Piece without history */}
              {!hasHistory && !showTCGPlayerRange && pricing.tcgplayer?.low != null && (
                <div className="flex justify-between text-[10px]">
                  <span className="text-zinc-500">Lowest listing</span>
                  <span className="text-zinc-300">${pricing.tcgplayer.low.toFixed(2)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Cardmarket */}
      {hasCardmarket && (
        <div
          className={`bg-zinc-800 rounded-lg overflow-hidden transition-all ${
            expanded === "cardmarket" ? "ring-1 ring-blue-500/30" : ""
          }`}
        >
          <button
            onClick={() => setExpanded(expanded === "cardmarket" ? null : "cardmarket")}
            className="w-full flex items-center justify-between p-3 hover:bg-zinc-750 transition-colors"
          >
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium text-zinc-300">Cardmarket</p>
              <span className="text-[10px] text-zinc-600">EUR</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-blue-400">
                {(pricing.cardmarket?.trend ?? pricing.cardmarketHolo?.trend)?.toFixed(2) ?? "N/A"}&euro;
              </span>
              <svg
                className={`w-3 h-3 text-zinc-500 transition-transform ${expanded === "cardmarket" ? "rotate-180" : ""}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          {expanded === "cardmarket" && (
            <div className="px-3 pb-3 space-y-3 animate-fade-in-down">
              {pricing.cardmarket && (
                <CardmarketChart data={pricing.cardmarket} label="Normal" />
              )}
              {pricing.cardmarketHolo && (
                <CardmarketChart data={pricing.cardmarketHolo} label="Holo" />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
