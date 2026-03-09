"use client";

/* eslint-disable @next/next/no-img-element */
import { useState, useRef, useCallback } from "react";
import { extractCardRegion } from "@/lib/recognition";
import {
  computeEmbedding,
  findTopMatches,
  CardEmbeddingEntry,
  EmbeddingMatch,
} from "@/lib/embeddings";

type TestMode = "card" | "photo";

interface ImageTesterProps {
  embeddingDatabase: CardEmbeddingEntry[];
}

export default function ImageTester({ embeddingDatabase }: ImageTesterProps) {
  const [results, setResults] = useState<EmbeddingMatch[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testMode, setTestMode] = useState<TestMode>("card");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processImage = useCallback(
    async (imageData: ImageData) => {
      // "card" = image is already a card, embed directly
      // "photo" = image is a camera photo, extract card region first
      const toEmbed = testMode === "photo" ? extractCardRegion(imageData) : imageData;
      const embedding = await computeEmbedding(toEmbed);

      const matches = findTopMatches(embedding, embeddingDatabase, 10);
      setResults(matches);
    },
    [embeddingDatabase, testMode]
  );

  const loadImageFile = useCallback(
    (file: File) => {
      if (embeddingDatabase.length === 0) return;
      setTesting(true);

      const url = URL.createObjectURL(file);
      setPreviewUrl(url);

      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        await processImage(imageData);
        setTesting(false);
      };
      img.onerror = () => {
        setTesting(false);
      };
      img.src = url;
    },
    [embeddingDatabase, processImage]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadImageFile(file);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) {
        loadImageFile(file);
      }
    },
    [loadImageFile]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  if (embeddingDatabase.length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-zinc-400 text-sm">
          Indexe un set d&apos;abord dans l&apos;onglet Index pour pouvoir tester.
        </p>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-3">
      {/* Mode toggle */}
      <div className="flex items-center gap-1 text-[11px]">
        <button
          onClick={() => setTestMode("card")}
          className={`px-2 py-1 rounded transition-colors ${
            testMode === "card"
              ? "bg-zinc-700 text-white"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          Image de carte
        </button>
        <button
          onClick={() => setTestMode("photo")}
          className={`px-2 py-1 rounded transition-colors ${
            testMode === "photo"
              ? "bg-zinc-700 text-white"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          Photo (caméra)
        </button>
      </div>

      {/* Upload zone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="border-2 border-dashed border-zinc-700 hover:border-zinc-500 rounded-lg p-4 text-center cursor-pointer transition-colors"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <p className="text-sm text-zinc-400">
          {testing ? "Analyse en cours..." : "Glisse une image ou clique pour upload"}
        </p>
        <p className="text-[10px] text-zinc-600 mt-1">
          Photo de carte, screenshot, etc.
        </p>
      </div>

      {/* Preview */}
      {previewUrl && (
        <div className="flex gap-2">
          <img
            src={previewUrl}
            alt="Test"
            className="w-20 h-auto rounded border border-zinc-700"
          />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-zinc-500 mt-1">
              {embeddingDatabase.length} cartes dans la base
            </p>
          </div>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-1">
          <p className="text-[11px] text-zinc-400 font-medium">
            Top 10 matches :
          </p>
          {results.map((r, i) => {
            const conf = Math.round(r.similarity * 100);
            const isGood = r.similarity >= 0.5;
            return (
              <div
                key={r.entry.id}
                className={`flex items-center gap-2 p-1.5 rounded text-xs ${
                  i === 0
                    ? isGood
                      ? "bg-green-500/10 border border-green-500/30"
                      : "bg-yellow-500/10 border border-yellow-500/30"
                    : "bg-zinc-800/50"
                }`}
              >
                <span className="text-zinc-500 w-4 text-right flex-shrink-0">
                  {i + 1}
                </span>
                <img
                  src={r.entry.imageUrl}
                  alt={r.entry.name}
                  className="w-8 h-11 object-cover rounded flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p
                    className={`truncate font-medium ${
                      i === 0 && isGood ? "text-green-300" : "text-zinc-300"
                    }`}
                  >
                    {r.entry.name}
                  </p>
                  <p className="text-[10px] text-zinc-500">
                    sim={r.similarity.toFixed(3)} ({conf}%)
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
