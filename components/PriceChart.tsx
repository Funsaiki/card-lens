"use client";

import { useState } from "react";
import { CardPricing, CardmarketPrice, TCGPlayerPrice, PriceHistoryPoint } from "@/types";

interface PriceChartProps {
  pricing: CardPricing;
}

type ExpandedSection = "tcgplayer" | "cardmarket" | null;

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
        <circle cx={coords[0].x} cy={coords[0].y} r="3" fill={color} />
        <circle cx={coords[coords.length - 1].x} cy={coords[coords.length - 1].y} r="3.5" fill={color} stroke="white" strokeWidth="1" />
      </svg>

      <div className="flex justify-between text-[9px] text-zinc-500">
        <span>14d ago: ${oldest.toFixed(2)}</span>
        <span className="text-zinc-300 font-medium">Now: ${current.toFixed(2)}</span>
      </div>

      {history[history.length - 1]?.inventory != null && (
        <div className="flex justify-between text-[10px]">
          <span className="text-zinc-500">Lowest listing</span>
          <span className="text-zinc-300">${history[history.length - 1].inventory!.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}

// ---------- TCGPlayer price gauge ----------

function TCGPlayerGauge({ data, label }: { data: TCGPlayerPrice; label: string }) {
  const low = data.low ?? 0;
  const high = data.high ?? 0;
  const market = data.market;

  if (high === 0 && market == null) return null;

  const rangeVal = high - low || 0.01;
  const marketPct = market != null ? Math.min(Math.max(((market - low) / rangeVal) * 100, 0), 100) : 50;

  return (
    <div className="space-y-3">
      {label && <span className="text-[10px] text-zinc-500">{label}</span>}

      {/* Market price — big and centered */}
      {market != null && (
        <div className="text-center">
          <p className="text-xl font-bold text-green-400">${market.toFixed(2)}</p>
          <p className="text-[9px] text-zinc-500">Market Price</p>
        </div>
      )}

      {/* Gauge bar */}
      {high > 0 && (
        <div className="space-y-1">
          <div className="relative h-2 bg-zinc-700/60 rounded-full">
            {/* Filled portion up to market */}
            <div
              className="absolute top-0 left-0 bottom-0 rounded-full bg-gradient-to-r from-green-500/40 to-green-400/60"
              style={{ width: `${marketPct}%` }}
            />
            {/* Market dot */}
            {market != null && (
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-green-400 border-2 border-zinc-800 shadow-sm shadow-green-400/30"
                style={{ left: `${marketPct}%`, marginLeft: "-6px" }}
              />
            )}
          </div>
          {/* Low / High labels */}
          <div className="flex justify-between text-[9px]">
            <span className="text-zinc-500">${low.toFixed(2)}</span>
            <span className="text-zinc-500">${high.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Extra prices row */}
      <div className="flex justify-center gap-4 text-[10px]">
        {data.mid != null && (
          <span className="text-zinc-400">
            Mid <span className="text-zinc-300">${data.mid.toFixed(2)}</span>
          </span>
        )}
        {data.directLow != null && (
          <span className="text-zinc-400">
            Direct <span className="text-zinc-300">${data.directLow.toFixed(2)}</span>
          </span>
        )}
      </div>
    </div>
  );
}

// ---------- Simple price display (when no range data) ----------

function PriceSimple({ data }: { data: TCGPlayerPrice }) {
  return (
    <div className="space-y-2">
      {data.market != null && (
        <div className="text-center">
          <p className="text-xl font-bold text-green-400">${data.market.toFixed(2)}</p>
          <p className="text-[9px] text-zinc-500">Market Price</p>
        </div>
      )}
      <div className="flex justify-center gap-4 text-[10px]">
        {data.low != null && (
          <span className="text-zinc-400">
            Low <span className="text-zinc-300">${data.low.toFixed(2)}</span>
          </span>
        )}
        {data.mid != null && (
          <span className="text-zinc-400">
            Mid <span className="text-zinc-300">${data.mid.toFixed(2)}</span>
          </span>
        )}
        {data.high != null && (
          <span className="text-zinc-400">
            High <span className="text-zinc-300">${data.high.toFixed(2)}</span>
          </span>
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

  const hasRange = hasTCGPlayer && (pricing.tcgplayer?.high != null || pricing.tcgplayerHolo?.high != null);
  const hasDetails = hasRange || hasHistory || (pricing.tcgplayer?.low != null);
  const tcgMarket = pricing.tcgplayer?.market ?? pricing.tcgplayerHolo?.market;

  return (
    <div className="space-y-2">
      {/* Source attribution */}
      {pricing.source && (
        <p className="text-[9px] text-zinc-600 uppercase tracking-wider">
          Data: {pricing.source}
        </p>
      )}

      {/* TCGPlayer */}
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
                {tcgMarket != null ? `$${tcgMarket.toFixed(2)}` : "N/A"}
              </span>
              {hasDetails && (
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
              {/* Gauge charts (when high is available) */}
              {hasRange && (
                <>
                  {pricing.tcgplayer && pricing.tcgplayer.high != null && (
                    <TCGPlayerGauge data={pricing.tcgplayer} label={pricing.tcgplayerHolo ? "Normal" : ""} />
                  )}
                  {pricing.tcgplayerHolo && pricing.tcgplayerHolo.high != null && (
                    <TCGPlayerGauge data={pricing.tcgplayerHolo} label="Reverse Holo" />
                  )}
                </>
              )}
              {/* Simple price display (when no range data) */}
              {!hasRange && !hasHistory && pricing.tcgplayer && (
                <PriceSimple data={pricing.tcgplayer} />
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
