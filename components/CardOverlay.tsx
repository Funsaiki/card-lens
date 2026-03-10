"use client";

import { useRef, useCallback } from "react";
import { CardData } from "@/types";
import { getCardFrameStyle } from "@/lib/card-frame";

interface CardOverlayProps {
  card: CardData | null;
  confidence: number;
  isProcessing: boolean;
  debugInfo?: string;
  frameHeightPercent: number;
  onFrameResize: (heightPercent: number) => void;
}

const MIN_FRAME = 0.3;
const MAX_FRAME = 0.95;

export default function CardOverlay({
  card,
  confidence,
  isProcessing,
  debugInfo,
  frameHeightPercent,
  onFrameResize,
}: CardOverlayProps) {
  const frameStyle = getCardFrameStyle(frameHeightPercent);
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);
  const dragSignRef = useRef(1); // 1 for bottom corners, -1 for top corners

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, isTop: boolean) => {
      e.preventDefault();
      e.stopPropagation();
      draggingRef.current = true;
      startYRef.current = e.clientY;
      startHeightRef.current = frameHeightPercent;
      dragSignRef.current = isTop ? -1 : 1;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [frameHeightPercent]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingRef.current || !containerRef.current) return;

      const containerHeight = containerRef.current.offsetHeight;
      const deltaY = e.clientY - startYRef.current;
      const deltaPercent = (deltaY * 2 * dragSignRef.current) / containerHeight;
      const newPercent = Math.min(MAX_FRAME, Math.max(MIN_FRAME, startHeightRef.current + deltaPercent));
      onFrameResize(newPercent);
    },
    [onFrameResize]
  );

  const handlePointerUp = useCallback(() => {
    draggingRef.current = false;
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none" ref={containerRef}>
      {/* Scanning + debug info */}
      <div className="absolute top-2 left-2 right-2 flex items-start justify-between">
        {/* Debug info */}
        {debugInfo && (
          <div className="bg-black/70 backdrop-blur-sm rounded px-2 py-1">
            <p className="text-[10px] text-yellow-300 font-mono">{debugInfo}</p>
          </div>
        )}

        {/* Scanning indicator */}
        {isProcessing && (
          <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-2.5 py-1 ml-auto">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] text-white">Scanning</span>
          </div>
        )}
      </div>

      {/* Card detection frame guide */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className={`relative border-2 border-dashed rounded-lg transition-all duration-300 ${
            card ? "border-green-400 animate-frame-pulse" : "border-white/30"
          }`}
          style={frameStyle}
        >
          {/* Corner resize handles */}
          {[
            { pos: "bottom-0 right-0 cursor-nwse-resize", isTop: false },
            { pos: "bottom-0 left-0 cursor-nesw-resize", isTop: false },
            { pos: "top-0 right-0 cursor-nesw-resize", isTop: true },
            { pos: "top-0 left-0 cursor-nwse-resize", isTop: true },
          ].map(({ pos, isTop }, i) => (
            <div
              key={i}
              className={`absolute ${pos} w-6 h-6 pointer-events-auto`}
              onPointerDown={(e) => handlePointerDown(e, isTop)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            >
              <div
                className={`absolute ${
                  i < 2 ? "bottom-[-1px]" : "top-[-1px]"
                } ${
                  i % 2 === 1 ? "left-[-1px]" : "right-[-1px]"
                } w-3 h-3 ${
                  card ? "border-green-400" : "border-white/60"
                } ${
                  i === 0
                    ? "border-b-2 border-r-2 rounded-br"
                    : i === 1
                      ? "border-b-2 border-l-2 rounded-bl"
                      : i === 2
                        ? "border-t-2 border-r-2 rounded-tr"
                        : "border-t-2 border-l-2 rounded-tl"
                }`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Matched card info overlay */}
      {card && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-10 animate-slide-up">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-white font-bold">{card.name}</p>
              <p className="text-zinc-300 text-xs">
                {card.set} &middot; {card.rarity}
              </p>
            </div>
            <div className="text-right">
              {(() => {
                const tcp = card.pricing?.tcgplayer?.market;
                const cm = card.pricing?.cardmarket?.market;
                const legacy = card.prices?.market;
                if (tcp != null) return <p className="text-green-400 font-bold text-sm">${tcp.toFixed(2)}</p>;
                if (cm != null) return <p className="text-blue-400 font-bold text-sm">{cm.toFixed(2)}&euro;</p>;
                if (legacy != null) return <p className="text-green-400 font-bold text-sm">${legacy.toFixed(2)}</p>;
                return null;
              })()}
              <p className="text-[10px] text-zinc-400">
                {confidence.toFixed(0)}% match
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
