"use client";

import { useState } from "react";
import { PortfolioHistory } from "@/types";

interface Props {
  history: PortfolioHistory;
  onRangeChange?: (days: number) => void;
}

const RANGES = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "All", days: 365 },
];

export default function PortfolioChart({ history, onRangeChange }: Props) {
  const [activeRange, setActiveRange] = useState(30);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const snapshots = history.snapshots;
  if (snapshots.length < 2) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 text-center">
        <p className="text-xs text-zinc-500 mb-1">Portfolio History</p>
        <p className="text-[10px] text-zinc-600">
          {snapshots.length === 0
            ? "No data yet. Portfolio tracking starts today."
            : "Not enough data points yet. Check back tomorrow."}
        </p>
      </div>
    );
  }

  const values = snapshots.map((s) => s.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 0.01;

  const w = 300;
  const h = 100;
  const padX = 8;
  const padY = 12;
  const chartW = w - padX * 2;
  const chartH = h - padY * 2;

  const coords = snapshots.map((s, i) => ({
    x: padX + (i / (snapshots.length - 1)) * chartW,
    y: padY + chartH - ((s.value - minVal) / range) * chartH,
  }));

  const pathD = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x},${c.y}`).join(" ");
  const fillD = `${pathD} L${coords[coords.length - 1].x},${h - padY} L${coords[0].x},${h - padY} Z`;

  const current = values[values.length - 1];
  const first = values[0];
  const isUp = current >= first;
  const color = isUp ? "#22c55e" : "#ef4444";

  const change = history.change;

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Portfolio History</p>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r.days}
              onClick={() => {
                setActiveRange(r.days);
                onRangeChange?.(r.days);
              }}
              className={`px-2 py-0.5 text-[10px] rounded-full transition-colors ${
                activeRange === r.days
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Change indicator */}
      {change.absolute !== 0 && (
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium ${isUp ? "text-green-400" : "text-red-400"}`}>
            {isUp ? "+" : ""}{change.absolute.toFixed(2)}$
          </span>
          <span className={`text-[10px] ${isUp ? "text-green-500/70" : "text-red-500/70"}`}>
            ({isUp ? "+" : ""}{change.percentage.toFixed(1)}%)
          </span>
          <span className="text-[10px] text-zinc-600">{change.period}</span>
        </div>
      )}

      {/* Chart */}
      <div className="relative">
        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="w-full"
          style={{ height: 100 }}
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="grad-portfolio" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={color} stopOpacity="0.02" />
            </linearGradient>
          </defs>

          <path d={fillD} fill="url(#grad-portfolio)" />
          <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

          {/* First and last dots */}
          <circle cx={coords[0].x} cy={coords[0].y} r="3" fill={color} />
          <circle
            cx={coords[coords.length - 1].x}
            cy={coords[coords.length - 1].y}
            r="3.5"
            fill={color}
            stroke="white"
            strokeWidth="1"
          />

          {/* Hover zones */}
          {coords.map((c, i) => (
            <rect
              key={i}
              x={c.x - chartW / snapshots.length / 2}
              y={0}
              width={chartW / snapshots.length}
              height={h}
              fill="transparent"
              onMouseEnter={() => setHoverIndex(i)}
            />
          ))}

          {/* Hover indicator */}
          {hoverIndex != null && (
            <>
              <line
                x1={coords[hoverIndex].x}
                y1={padY}
                x2={coords[hoverIndex].x}
                y2={h - padY}
                stroke="white"
                strokeWidth="0.5"
                strokeDasharray="3 2"
                opacity="0.3"
              />
              <circle cx={coords[hoverIndex].x} cy={coords[hoverIndex].y} r="4" fill={color} stroke="white" strokeWidth="1.5" />
            </>
          )}
        </svg>

        {/* Hover tooltip */}
        {hoverIndex != null && (
          <div
            className="absolute top-0 bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1 text-[10px] pointer-events-none"
            style={{
              left: `${(coords[hoverIndex].x / w) * 100}%`,
              transform: "translateX(-50%)",
            }}
          >
            <p className="text-zinc-300 font-medium">${snapshots[hoverIndex].value.toFixed(2)}</p>
            <p className="text-zinc-500">{snapshots[hoverIndex].date}</p>
          </div>
        )}
      </div>

      {/* Min/max labels */}
      <div className="flex justify-between text-[9px] text-zinc-600">
        <span>{snapshots[0].date}</span>
        <span>{snapshots[snapshots.length - 1].date}</span>
      </div>
    </div>
  );
}
