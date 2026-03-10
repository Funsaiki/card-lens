"use client";

import { useState, useCallback, useRef, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import VideoFeed from "@/components/VideoFeed";
import CardOverlay from "@/components/CardOverlay";
import CardInfo from "@/components/CardInfo";
import QRConnector from "@/components/QRConnector";
import SessionHistory from "@/components/SessionHistory";
import SearchResults from "@/components/SearchResults";
import SetIndexer from "@/components/SetIndexer";
import Onboarding, { useOnboarding } from "@/components/Onboarding";
import NavBar from "@/components/NavBar";
import ErrorBoundary from "@/components/ErrorBoundary";
import { SkeletonSearchResults } from "@/components/Skeleton";

import { useWebRTC } from "@/hooks/useWebRTC";
import { useCardRecognition } from "@/hooks/useCardRecognition";
import { CardData, CardGame, SessionCard, GAME_LABELS } from "@/types";
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
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const { show: showOnboarding, dismiss: dismissOnboarding, reopen: reopenOnboarding } = useOnboarding();
  const [frameHeightPercent, setFrameHeightPercent] = useState(0.75);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const sheetScrollRef = useRef<HTMLDivElement>(null);

  // Swipe gestures on mobile bottom sheet (up to open, down to close)
  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;

    let dragging = false;
    let startY = 0;
    let delta = 0;

    const onTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
      delta = 0;
      dragging = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      delta = e.touches[0].clientY - startY;

      if (mobilePanelOpen) {
        // Swipe down to close — only when scroll is at top
        const scrollEl = sheetScrollRef.current;
        const isAtTop = !scrollEl || scrollEl.scrollTop <= 0;
        if (delta > 0 && isAtTop) {
          e.preventDefault();
          dragging = true;
          sheet.style.transform = `translateY(${delta}px)`;
          sheet.style.transition = "none";
        }
      } else {
        // Swipe up to open
        if (delta < -10) {
          e.preventDefault();
          dragging = true;
          // Clamp visual feedback between 0 and the full sheet offset
          const clamped = Math.min(0, delta);
          sheet.style.transform = `translateY(calc(100% - 2.75rem + ${clamped}px))`;
          sheet.style.transition = "none";
        }
      }
    };

    const onTouchEnd = () => {
      if (!dragging) return;
      sheet.style.transition = "";
      sheet.style.transform = "";

      if (mobilePanelOpen) {
        if (delta > 80) setMobilePanelOpen(false);
      } else {
        if (delta < -60) setMobilePanelOpen(true);
      }
    };

    sheet.addEventListener("touchstart", onTouchStart, { passive: true });
    sheet.addEventListener("touchmove", onTouchMove, { passive: false });
    sheet.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      sheet.removeEventListener("touchstart", onTouchStart);
      sheet.removeEventListener("touchmove", onTouchMove);
      sheet.removeEventListener("touchend", onTouchEnd);
    };
  }, [mobilePanelOpen]);
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

  const [camError, setCamError] = useState<"none" | "denied" | "unavailable">("none");

  const startWebcam = useCallback(async () => {
    setCamError("none");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
    } catch (err: unknown) {
      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setCamError("denied");
      } else {
        setCamError("unavailable");
      }
    }
  }, []);

  const stopWebcam = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    setCamError("none");
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
    return () => {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    };
  }, []);

  // Auto-switch to Info tab when a card is detected
  useEffect(() => {
    if (currentCard) {
      setSidebarTab("info");
      setMobilePanelOpen(true);
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
    setMobilePanelOpen(true);

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

  const gameLabel = GAME_LABELS[game];

  const tabs = useMemo<{ id: SidebarTab; label: string; badge?: string }[]>(() => [
    { id: "index", label: "Index", badge: indexedCount > 0 ? String(indexedCount) : undefined },
    { id: "info", label: "Info" },
    { id: "results", label: "Results", badge: searchResults.length > 0 ? String(searchResults.length) : undefined },
    { id: "history", label: "History", badge: history.length > 0 ? String(history.length) : undefined },
  ], [indexedCount, searchResults.length, history.length]);

  const handleMobileTab = useCallback((tab: SidebarTab) => {
    if (mobilePanelOpen && sidebarTab === tab) {
      setMobilePanelOpen(false);
    } else {
      setSidebarTab(tab);
      setMobilePanelOpen(true);
    }
  }, [mobilePanelOpen, sidebarTab]);

  const panelContent = (
    sidebarTab === "index" ? (
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
      isSearching ? (
        <SkeletonSearchResults count={4} />
      ) : (
        <SearchResults
          query={lastSearchQuery}
          results={searchResults}
          onSelect={handleResultSelect}
          onClose={handleCloseResults}
        />
      )
    ) : (
      <SessionHistory
        history={history}
        onSelect={handleHistorySelect}
        onClear={clearHistory}
      />
    )
  );

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden">
      {/* Top bar */}
      <NavBar
        subtitle={`${gameLabel}${indexedCount > 0 ? ` \u00b7 ${indexedCount} indexed` : ""}`}
        compact
        extraActions={
          <>
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
              className="p-1.5 text-zinc-400 hover:text-white transition-colors lg:inline hidden"
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
          </>
        }
      >
        {/* Search bar */}
        <form onSubmit={handleSearch} className="flex items-center gap-1.5 px-3 pb-2">
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
      </NavBar>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Video area — full height on mobile, flex-1 on desktop */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Video source selector */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.06]">
            <span className="text-[11px] text-[var(--muted)]">Source:</span>
            <div className="relative flex bg-white/[0.04] rounded-full border border-white/[0.06] p-0.5">
              <div
                className="absolute top-0.5 bottom-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/25 transition-all duration-300 ease-out"
                style={{
                  width: "calc(50% - 2px)",
                  left: videoSource === "webcam" ? "2px" : "calc(50%)",
                }}
              />
              <button
                onClick={() => handleSourceChange("webcam")}
                className={`relative z-10 w-16 py-0.5 text-[11px] text-center rounded-full transition-colors ${
                  videoSource === "webcam" ? "text-indigo-300" : "text-zinc-400 hover:text-white"
                }`}
              >
                Webcam
              </button>
              <button
                onClick={() => handleSourceChange("phone")}
                className={`relative z-10 w-16 py-0.5 text-[11px] text-center rounded-full transition-colors ${
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
          <div className="flex-1 relative m-2 pb-8 lg:pb-0">
            {videoSource === "phone" && connectionState !== "connected" ? (
              <div className="h-full flex items-center justify-center">
                <QRConnector
                  peerId={peerId}
                  connectionState={connectionState}
                  onConnect={startWebRTC}
                />
              </div>
            ) : videoSource === "webcam" && !localStream ? (
              <div className="h-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-4 p-6 bg-white/[0.03] border border-white/[0.06] rounded-xl backdrop-blur-sm">
                  <div className="w-14 h-14 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                    <svg className="w-7 h-7 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-medium text-zinc-200">
                    {camError === "denied"
                      ? "Camera access denied"
                      : camError === "unavailable"
                        ? "Camera unavailable"
                        : "Start Webcam"}
                  </h3>
                  <p className="text-xs text-[var(--muted)] text-center max-w-[220px]">
                    {camError === "denied"
                      ? "Please allow camera access in your browser settings and try again"
                      : camError === "unavailable"
                        ? "No camera detected on this device. Try connecting your phone instead."
                        : "Enable your camera to scan cards in real time"}
                  </p>
                  <button
                    onClick={startWebcam}
                    className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-lg font-medium transition-all shadow-lg shadow-indigo-600/20"
                  >
                    {camError !== "none" ? "Retry" : "Start Camera"}
                  </button>
                  {camError === "denied" && (
                    <p className="text-[10px] text-zinc-600 text-center max-w-[200px]">
                      Look for the camera icon in your browser&apos;s address bar
                    </p>
                  )}
                </div>
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

            {/* Mobile backdrop — tap to close panel */}
            {mobilePanelOpen && (
              <div
                className="lg:hidden absolute inset-0 z-20 bg-black/40"
                onClick={() => setMobilePanelOpen(false)}
              />
            )}
          </div>
        </div>

        {/* Desktop sidebar — hidden on mobile */}
        <aside
          className={`hidden lg:flex border-l border-white/[0.06] bg-white/[0.02] backdrop-blur-sm flex-col flex-shrink-0 transition-all duration-300 ease-out overflow-hidden ${
            sidebarOpen ? "w-72 xl:w-80 opacity-100" : "w-0 opacity-0 border-l-transparent"
          }`}
        >
            <div className="relative flex border-b border-white/[0.06]">
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
                    sidebarTab === tab.id ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {tab.label}
                  {tab.badge && (
                    <span className="ml-0.5 text-[9px] text-[var(--muted)]">{tab.badge}</span>
                  )}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto">{panelContent}</div>
          </aside>

        {/* Mobile bottom sheet — hidden on desktop */}
        <div
          ref={sheetRef}
          className="lg:hidden fixed inset-x-0 bottom-0 z-30 flex flex-col transition-transform duration-300 ease-out"
          style={{ transform: mobilePanelOpen ? "translateY(0)" : "translateY(calc(100% - 2.75rem))" }}
        >
          {/* Tab bar (always peeking at bottom) */}
          <div className="relative flex flex-wrap bg-zinc-900 border-t border-white/[0.06] rounded-t-2xl flex-shrink-0">
            {/* Drag handle — tappable close area */}
            <button
              onClick={() => setMobilePanelOpen((v) => !v)}
              className="w-full flex justify-center py-2 -mb-1"
            >
              <div className="w-10 h-1.5 rounded-full bg-zinc-600" />
            </button>
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
                onClick={() => handleMobileTab(tab.id)}
                className={`flex-1 py-3 text-[11px] font-medium transition-colors relative ${
                  sidebarTab === tab.id ? "text-white" : "text-zinc-500"
                }`}
              >
                {tab.label}
                {tab.badge && (
                  <span className={`ml-0.5 text-[9px] ${sidebarTab === tab.id ? "text-indigo-400" : "text-zinc-600"}`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Panel content */}
          <div ref={sheetScrollRef} className="h-[60vh] bg-zinc-900 overflow-y-auto" style={{ overscrollBehavior: "contain" }}>{panelContent}</div>
        </div>
      </div>

      <Onboarding show={showOnboarding} onDone={dismissOnboarding} />
    </div>
  );
}

export default function ScanPage() {
  return (
    <ErrorBoundary>
      <Suspense
        fallback={
          <div className="h-screen flex items-center justify-center">
            <p className="text-[var(--muted)]">Loading...</p>
          </div>
        }
      >
        <ScanContent />
      </Suspense>
    </ErrorBoundary>
  );
}
