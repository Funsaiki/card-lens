"use client";

import { useState, useCallback, useRef, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import VideoFeed from "@/components/VideoFeed";
import CardOverlay from "@/components/CardOverlay";
import CardInfo from "@/components/CardInfo";
import QRConnector from "@/components/QRConnector";
import SessionHistory from "@/components/SessionHistory";
import SearchResults from "@/components/SearchResults";
import SetIndexer from "@/components/SetIndexer";

import { useWebRTC } from "@/hooks/useWebRTC";
import { useCardRecognition } from "@/hooks/useCardRecognition";
import { CardData, CardGame, SessionCard } from "@/types";
import { CardEmbeddingEntry } from "@/lib/embeddings";

type VideoSource = "webcam" | "phone";
type SidebarTab = "info" | "history" | "results" | "index";

function ScanContent() {
  const searchParams = useSearchParams();
  const game = (searchParams.get("game") as CardGame) ?? "pokemon";

  const [videoSource, setVideoSource] = useState<VideoSource>("webcam");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("index");
  const [searchResults, setSearchResults] = useState<CardData[]>([]);
  const [lastSearchQuery, setLastSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [frameHeightPercent, setFrameHeightPercent] = useState(0.75);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  const {
    sessionId,
    connectionState,
    remoteStream,
    start: startWebRTC,
  } = useWebRTC({ role: "receiver" });

  const {
    currentCard,
    setCurrentCard,
    confidence,
    isProcessing,
    history,
    debugInfo,
    embeddingDatabase,
    dbLoading,
    searchAndIndex,
    addToHistory,
    addToEmbeddingDatabase,
    removeSet,
    clearHistory,
  } = useCardRecognition({
    game,
    videoRef,
    enabled: !!(localStream || remoteStream),
    frameHeightPercent,
  });

  // Filter embeddings for the current game
  const gameEmbeddings = useMemo(
    () => embeddingDatabase.filter((e) => !e.game || e.game === game),
    [embeddingDatabase, game]
  );

  const indexedCount = gameEmbeddings.length;

  // Compute indexed sets with card counts (filtered by current game)
  const indexedSets = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of gameEmbeddings) {
      counts.set(entry.set, (counts.get(entry.set) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([setId, count]) => ({ setId, count }));
  }, [gameEmbeddings]);

  const handleIndexComplete = useCallback(
    (entries: CardEmbeddingEntry[]) => {
      addToEmbeddingDatabase(entries);
    },
    [addToEmbeddingDatabase]
  );

  const startWebcam = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      setLocalStream(stream);
    } catch (err) {
      console.error("Failed to access webcam:", err);
    }
  }, []);

  const stopWebcam = useCallback(() => {
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
      setLocalStream(null);
    }
  }, [localStream]);

  const handleSourceChange = useCallback(
    async (source: VideoSource) => {
      setVideoSource(source);
      if (source === "webcam") {
        await startWebcam();
      } else {
        stopWebcam();
      }
    },
    [startWebcam, stopWebcam]
  );

  useEffect(() => {
    if (videoSource === "webcam") {
      startWebcam();
    }
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      localStream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-switch to Info tab when a card is detected
  useEffect(() => {
    if (currentCard) {
      setSidebarTab("info");
    }
  }, [currentCard]);

  const activeStream =
    videoSource === "phone" ? remoteStream : localStream;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    setIsSearching(true);
    setLastSearchQuery(q);
    const results = await searchAndIndex(q);
    setSearchResults(results);
    setIsSearching(false);
    setSidebarOpen(true);

    if (results.length > 1) {
      setSidebarTab("results");
    } else {
      setSidebarTab("info");
    }
    setSearchQuery("");
  };

  const handleResultSelect = (card: CardData) => {
    setCurrentCard(card);
    addToHistory(card, 100);
    setSidebarTab("info");
  };

  const handleHistorySelect = (entry: SessionCard) => {
    setCurrentCard(entry.card);
    setSidebarTab("info");
  };

  const handleCloseResults = () => {
    setSidebarTab("info");
  };

  const gameLabel = {
    pokemon: "Pokemon",
    magic: "MTG",
    yugioh: "Yu-Gi-Oh!",
    hololive: "Hololive",
  }[game];

  const tabs: { id: SidebarTab; label: string; badge?: string }[] = [
    { id: "index", label: "Index", badge: indexedCount > 0 ? String(indexedCount) : undefined },
    { id: "info", label: "Info" },
    { id: "results", label: "Results", badge: searchResults.length > 0 ? String(searchResults.length) : undefined },
    { id: "history", label: "History", badge: history.length > 0 ? String(history.length) : undefined },
  ];

  return (
    <div className="h-screen flex flex-col bg-zinc-950">
      {/* Top bar */}
      <header className="flex items-center justify-between gap-2 px-3 py-2 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm">
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            href="/"
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <span className="text-sm font-medium text-zinc-300">{gameLabel}</span>
          {indexedCount > 0 && (
            <span className="text-[10px] text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded-full hidden sm:inline">
              {indexedCount} indexed
            </span>
          )}
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex items-center gap-1.5 flex-1 max-w-xs ml-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search card..."
            className="flex-1 min-w-0 px-2.5 py-1.5 text-sm bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
          />
          <button
            type="submit"
            disabled={isSearching}
            className="px-2.5 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 rounded-lg transition-colors flex-shrink-0"
          >
            {isSearching ? "..." : "Go"}
          </button>
        </form>

        {/* Sidebar toggle */}
        <button
          onClick={() => setSidebarOpen((v) => !v)}
          className="p-1.5 text-zinc-400 hover:text-white transition-colors flex-shrink-0"
          title={sidebarOpen ? "Hide panel" : "Show panel"}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {sidebarOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7M19 19l-7-7 7-7" />
            )}
          </svg>
        </button>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Video source selector */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/50">
            <span className="text-[11px] text-zinc-500">Source:</span>
            <button
              onClick={() => handleSourceChange("webcam")}
              className={`px-2.5 py-0.5 text-[11px] rounded-full transition-colors ${
                videoSource === "webcam"
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Webcam
            </button>
            <button
              onClick={() => handleSourceChange("phone")}
              className={`px-2.5 py-0.5 text-[11px] rounded-full transition-colors ${
                videoSource === "phone"
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Phone
            </button>
          </div>

          {/* Video feed + overlay */}
          <div className="flex-1 relative m-2">
            {videoSource === "phone" &&
            connectionState !== "connected" ? (
              <div className="h-full flex items-center justify-center">
                <QRConnector
                  sessionId={sessionId}
                  connectionState={connectionState}
                  onConnect={startWebRTC}
                />
              </div>
            ) : (
              <VideoFeed
                stream={activeStream}
                className="w-full h-full"
                onVideoRef={(v) => {
                  videoRef.current = v;
                }}
              >
                <CardOverlay
                  card={currentCard}
                  confidence={confidence}
                  isProcessing={isProcessing}
                  debugInfo={debugInfo}
                  frameHeightPercent={frameHeightPercent}
                  onFrameResize={setFrameHeightPercent}
                />
              </VideoFeed>
            )}
          </div>
        </div>

        {/* Sidebar */}
        {sidebarOpen && (
          <aside className="w-72 xl:w-80 border-l border-zinc-800 bg-zinc-900/50 flex flex-col flex-shrink-0 animate-slide-in-right">
            {/* Tabs — compact */}
            <div className="flex border-b border-zinc-800">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSidebarTab(tab.id)}
                  className={`flex-1 py-2 text-[11px] font-medium transition-colors relative ${
                    sidebarTab === tab.id
                      ? "text-white border-b-2 border-blue-500"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {tab.label}
                  {tab.badge && (
                    <span className="ml-0.5 text-[9px] text-zinc-400">
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto">
              {sidebarTab === "index" ? (
                <SetIndexer
                  game={game}
                  onIndexComplete={handleIndexComplete}
                  indexedCount={indexedCount}
                  indexedSets={indexedSets}
                  onRemoveSet={removeSet}
                  dbLoading={dbLoading}
                />
              ) : sidebarTab === "info" ? (
                <CardInfo card={currentCard} confidence={confidence} />
              ) : sidebarTab === "results" ? (
                <SearchResults
                  query={lastSearchQuery}
                  results={searchResults}
                  onSelect={handleResultSelect}
                  onClose={handleCloseResults}
                />
              ) : (
                <SessionHistory
                  history={history}
                  onSelect={handleHistorySelect}
                  onClear={clearHistory}
                />
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

export default function ScanPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center bg-zinc-950">
          <p className="text-zinc-400">Loading...</p>
        </div>
      }
    >
      <ScanContent />
    </Suspense>
  );
}
