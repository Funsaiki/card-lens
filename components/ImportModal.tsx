"use client";

import { useState, useCallback } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { CardGame, GAME_LABELS, ImportItem } from "@/types";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";
import { detectFormat, parseCardLensWorkbook, parseTCGPlayerWorkbook, ImportFormat } from "@/lib/csv-import";

type Step = "upload" | "preview" | "importing" | "done";

export default function ImportModal({ open, onClose, onImported }: {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}) {
  const [step, setStep] = useState<Step>("upload");
  const [items, setItems] = useState<ImportItem[]>([]);
  const [format, setFormat] = useState<ImportFormat>("unknown");
  const [tcgGame, setTcgGame] = useState<CardGame>("pokemon");
  const [result, setResult] = useState<{ imported: number; errors: number } | null>(null);

  const reset = useCallback(() => {
    setStep("upload");
    setItems([]);
    setFormat("unknown");
    setResult(null);
  }, []);

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFile = async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer);
      const detected = detectFormat(wb);
      setFormat(detected);

      if (detected === "cardlens") {
        const parsed = parseCardLensWorkbook(wb);
        if (parsed.length === 0) {
          toast.error("No cards found in file");
          return;
        }
        setItems(parsed);
        setStep("preview");
      } else if (detected === "tcgplayer") {
        // For TCGPlayer, parse with selected game
        const parsed = parseTCGPlayerWorkbook(wb, tcgGame);
        if (parsed.length === 0) {
          toast.error("No cards found in file");
          return;
        }
        setItems(parsed);
        setStep("preview");
      } else {
        // Try as Card Lens anyway
        const parsed = parseCardLensWorkbook(wb);
        if (parsed.length > 0) {
          setItems(parsed);
          setFormat("cardlens");
          setStep("preview");
        } else {
          toast.error("Unrecognized file format");
        }
      }
    } catch {
      toast.error("Failed to read file");
    }
  };

  const handleImport = async () => {
    setStep("importing");
    try {
      const res = await fetch("/api/collection/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Import failed");
      }
      const data = await res.json();
      setResult(data);
      setStep("done");
      onImported();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
      setStep("preview");
    }
  };

  if (!open) return null;

  // Group items by game for preview
  const byGame = new Map<CardGame, ImportItem[]>();
  for (const item of items) {
    const list = byGame.get(item.game) ?? [];
    list.push(item);
    byGame.set(item.game, list);
  }

  return (
    <Modal onClose={handleClose} maxWidth="lg">
      <div className="p-4 space-y-4">
        <h2 className="text-sm font-semibold text-white">Import Collection</h2>

        {step === "upload" && (
          <div className="space-y-3">
            <p className="text-xs text-[var(--muted)]">
              Import from a Card Lens export (.xlsx) or TCGPlayer export (.csv/.xlsx).
            </p>

            {/* TCGPlayer game selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-500 uppercase tracking-wider">If TCGPlayer export, select game:</label>
              <select
                value={tcgGame}
                onChange={(e) => setTcgGame(e.target.value as CardGame)}
                className="w-full px-3 py-1.5 text-xs bg-white/[0.04] border border-white/[0.08] rounded-lg text-zinc-200"
              >
                {Object.entries(GAME_LABELS).map(([id, label]) => (
                  <option key={id} value={id}>{label}</option>
                ))}
              </select>
            </div>

            {/* File picker */}
            <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-white/[0.1] rounded-xl cursor-pointer hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-colors">
              <svg className="w-8 h-8 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span className="text-xs text-zinc-400">Click to select file</span>
              <span className="text-[10px] text-zinc-600">.xlsx, .xls, .csv</span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
            </label>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
                {format === "cardlens" ? "Card Lens" : "TCGPlayer"} format
              </span>
              <span className="text-xs text-zinc-400">{items.length} cards found</span>
            </div>

            {/* Summary by game */}
            <div className="space-y-1">
              {Array.from(byGame).map(([game, gameItems]) => (
                <div key={game} className="flex items-center justify-between px-3 py-2 bg-white/[0.03] rounded-lg border border-white/[0.06]">
                  <span className="text-xs text-zinc-300">{GAME_LABELS[game]}</span>
                  <span className="text-xs text-zinc-500">{gameItems.length} cards</span>
                </div>
              ))}
            </div>

            {/* Preview table */}
            <div className="max-h-48 overflow-y-auto border border-white/[0.06] rounded-lg">
              <table className="w-full text-[11px]">
                <thead className="sticky top-0 bg-zinc-900">
                  <tr className="text-zinc-500 text-left">
                    <th className="px-2 py-1.5">Name</th>
                    <th className="px-2 py-1.5">Set</th>
                    <th className="px-2 py-1.5">Qty</th>
                    <th className="px-2 py-1.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {items.slice(0, 50).map((item, i) => (
                    <tr key={i} className="border-t border-white/[0.04] text-zinc-400">
                      <td className="px-2 py-1 truncate max-w-[150px]">{item.cardName}</td>
                      <td className="px-2 py-1 truncate max-w-[100px]">{item.cardSet}</td>
                      <td className="px-2 py-1">{item.quantity}</td>
                      <td className="px-2 py-1">{item.status}</td>
                    </tr>
                  ))}
                  {items.length > 50 && (
                    <tr className="border-t border-white/[0.04]">
                      <td colSpan={4} className="px-2 py-1 text-zinc-600 text-center">
                        ...and {items.length - 50} more
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex gap-2">
              <button
                onClick={reset}
                className="flex-1 px-3 py-2 text-xs text-zinc-400 border border-white/[0.08] rounded-lg hover:bg-white/[0.04] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                className="flex-1 px-3 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
              >
                Import {items.length} cards
              </button>
            </div>
          </div>
        )}

        {step === "importing" && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Spinner size="lg" color="indigo" />
            <p className="text-xs text-zinc-400">Importing {items.length} cards...</p>
          </div>
        )}

        {step === "done" && result && (
          <div className="space-y-3">
            <div className="flex flex-col items-center gap-2 py-4">
              <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-sm font-medium text-white">{result.imported} cards imported</p>
              {result.errors > 0 && (
                <p className="text-xs text-red-400">{result.errors} cards failed</p>
              )}
            </div>
            <button
              onClick={handleClose}
              className="w-full px-3 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
