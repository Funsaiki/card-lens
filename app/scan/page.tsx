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
import Onboarding, { useOnboarding } from "@/components/Onboarding";

import UserMenu from "@/components/UserMenu";
import AuthModal from "@/components/AuthModal";

import { useWebRTC } from "@/hooks/useWebRTC";
import { useCardRecognition } from "@/hooks/useCardRecognition";
import { useUser } from "@/hooks/useUser";
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
  const { show: showOnboarding, dismiss: dismissOnboarding, reopen: reopenOnboarding } = useOnboarding();
  const { user } = useUser();
  const [showAuth, setShowAuth] = useState(false);
  const [frameHeightPercent, setFrameHeightPercent] = useState(0.75);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const {
    peerId,
    connectionState,
    remoteStream,
    start: startWebRTC,
    cleanup: cleanupWebRTC,
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
    () => embeddingDatabase.filter((e) => e.game === game),
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
      localStreamRef.current = stream;
      setLocalStream(stream);
    } catch (err) {
      console.error("Failed to access webcam:", err);
    }
  }, []);

  const stopWebcam = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    setLocalStream(null);
  }, []);

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

  const handleStopCamera = useCallback(() => {
    if (videoSource === "phone") {
      cleanupWebRTC();
    } else {
      stopWebcam();
    }
  }, [videoSource, cleanupWebRTC, stopWebcam]);

  useEffect(() => {
    if (videoSource === "webcam") {
      startWebcam();
    }
    return () => {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
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

  const gameLabel = useMemo(() => ({
    pokemon: "Pokemon",
    onepiece: "One Piece",
    riftbound: "Riftbound",
    hololive: "Hololive",
  } as const)[game], [game]);

  const tabs = useMemo<{ id: SidebarTab; label: string; badge?: string }[]>(() => [
    { id: "index", label: "Index", badge: indexedCount > 0 ? String(indexedCount) : undefined },
    { id: "info", label: "Info" },
    { id: "results", label: "Results", badge: searchResults.length > 0 ? String(searchResults.length) : undefined },
    { id: "history", label: "History", badge: history.length > 0 ? String(history.length) : undefined },
  ], [indexedCount, searchResults.length, history.length]);

  return (
    <div className="h-screen flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between gap-2 px-3 py-2 border-b border-white/[0.06] bg-white/[0.02] backdrop-blur-md">
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            href="/"
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <span className="text-sm font-medium text-zinc-200">{gameLabel}</span>
          {indexedCount > 0 && (
            <span className="text-[10px] text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded-full hidden sm:inline">
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
            className="flex-1 min-w-0 px-2.5 py-1.5 text-sm bg-white/[0.04] border border-white/[0.08] rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50"
          />
          <button
            type="submit"
            disabled={isSearching}
            className="px-2.5 py-1.5 text-sm bg-white/[0.06] hover:bg-white/[0.1] disabled:opacity-50 text-zinc-300 rounded-lg border border-white/[0.08] transition-colors flex-shrink-0"
          >
            {isSearching ? "..." : "Go"}
          </button>
        </form>

        {/* Help + User + Sidebar toggle */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {user ? (
            <UserMenu user={user} />
          ) : (
            <button
              onClick={() => setShowAuth(true)}
              className="px-2 py-1 text-[11px] text-zinc-400 hover:text-white transition-colors"
            >
              Sign in
            </button>
          )}
          <button
            onClick={reopenOnboarding}
            className="p-1.5 text-zinc-500 hover:text-white transition-colors"
            title="How to use"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="p-1.5 text-zinc-400 hover:text-white transition-colors"
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
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Video source selector */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.02]">
            <span className="text-[11px] text-[var(--muted)]">Source:</span>
            <div className="relative flex bg-white/[0.04] rounded-full border border-white/[0.06] p-0.5">
              {/* Animated pill */}
              <div
                className="absolute top-0.5 bottom-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/25 transition-all duration-300 ease-out"
                style={{
                  width: "calc(50% - 2px)",
                  left: videoSource === "webcam" ? "2px" : "calc(50%)",
                }}
              />
              <button
                onClick={() => handleSourceChange("webcam")}
                className={`relative z-10 px-2.5 py-0.5 text-[11px] rounded-full transition-colors ${
                  videoSource === "webcam" ? "text-indigo-300" : "text-zinc-400 hover:text-white"
                }`}
              >
                Webcam
              </button>
              <button
                onClick={() => handleSourceChange("phone")}
                className={`relative z-10 px-2.5 py-0.5 text-[11px] rounded-full transition-colors ${
                  videoSource === "phone" ? "text-indigo-300" : "text-zinc-400 hover:text-white"
                }`}
              >
                Phone
              </button>
            </div>
            {activeStream && (
              <button
                onClick={handleStopCamera}
                className="ml-auto px-2 py-0.5 text-[11px] text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-full transition-colors flex items-center gap-1"
                title="Stop camera"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                </svg>
                Stop
              </button>
            )}
          </div>

          {/* Video feed + overlay */}
          <div className="flex-1 relative m-2">
            {videoSource === "phone" &&
            connectionState !== "connected" ? (
              <div className="h-full flex items-center justify-center">
                <QRConnector
                  peerId={peerId}
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
          <aside className="w-72 xl:w-80 border-l border-white/[0.06] bg-white/[0.02] backdrop-blur-sm flex flex-col flex-shrink-0 animate-slide-in-right">
            {/* Tabs */}
            <div className="relative flex border-b border-white/[0.06]">
              {/* Animated indicator */}
              <div
                className="absolute bottom-0 h-[2px] bg-indigo-500 rounded-full transition-all duration-300 ease-out"
                style={{
                  width: `${100 / tabs.length}%`,
                  left: `${(tabs.findIndex((t) => t.id === sidebarTab) / tabs.length) * 100}%`,
                }}
              />
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSidebarTab(tab.id)}
                  className={`flex-1 py-2 text-[11px] font-medium transition-colors relative ${
                    sidebarTab === tab.id
                      ? "text-white"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {tab.label}
                  {tab.badge && (
                    <span className="ml-0.5 text-[9px] text-[var(--muted)]">
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

      <Onboarding show={showOnboarding} onDone={dismissOnboarding} />
      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  );
}

export default function ScanPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center">
          <p className="text-[var(--muted)]">Loading...</p>
        </div>
      }
    >
      <ScanContent />
    </Suspense>
  );
}
