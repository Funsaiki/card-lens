"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useWebRTC } from "@/hooks/useWebRTC";
import { getCardFrameStyle } from "@/lib/card-frame";

function PhoneContent() {
  const searchParams = useSearchParams();
  const remotePeerId = searchParams.get("peer");

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const startedRef = useRef(false);

  const { connectionState, start } = useWebRTC({
    role: "sender",
    remotePeerId: remotePeerId ?? undefined,
  });

  // Keep a stable ref to start so startCamera doesn't re-create
  const startRef = useRef(start);
  startRef.current = start;

  const startCamera = useCallback(async () => {
    if (startedRef.current) return;
    startedRef.current = true;

    try {
      console.log("[Phone] requesting camera...");
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
            frameRate: { ideal: 30 },
          },
          audio: false,
        });
      } catch {
        // Fallback to basic constraints
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
      }
      console.log("[Phone] camera obtained, tracks:", stream.getTracks().length);
      setLocalStream(stream);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Start WebRTC connection
      await startRef.current(stream);
    } catch (err) {
      console.error("[Phone] Camera error:", err);
      startedRef.current = false;
      setError(
        "Unable to access camera. Please grant camera permissions and try again."
      );
    }
  }, []);

  useEffect(() => {
    return () => {
      localStream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!remotePeerId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/20">
            <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v4m0 12v4M2 12h4m12 0h4" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Card Lens</h1>
          <p className="text-[var(--muted)] text-sm">
            Scan the QR code on your PC to connect this phone as a camera.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white/[0.02] border-b border-white/[0.06] backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v4m0 12v4M2 12h4m12 0h4" />
            </svg>
          </div>
          <h1 className="text-sm font-medium text-white">Card Lens</h1>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              connectionState === "connected"
                ? "bg-green-500"
                : connectionState === "connecting"
                  ? "bg-yellow-500 animate-pulse"
                  : connectionState === "failed"
                    ? "bg-red-500"
                    : "bg-zinc-500"
            }`}
          />
          <span className="text-xs text-[var(--muted)] capitalize">
            {connectionState}
          </span>
        </div>
      </div>

      {/* Camera view */}
      <div className="flex-1 relative bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />

        {/* Card frame guide */}
        {connectionState === "connected" && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className="border-2 border-dashed border-white/30 rounded-lg"
              style={getCardFrameStyle()}
            />
            <p className="absolute bottom-8 text-white/60 text-xs">
              Center the card in the frame
            </p>
          </div>
        )}

        {/* Start button / error */}
        {!localStream && !error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              onClick={startCamera}
              className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl font-medium text-lg transition-all shadow-lg shadow-indigo-600/30"
            >
              Start Camera
            </button>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="text-center bg-[var(--surface)] border border-white/[0.08] rounded-xl p-6 max-w-sm">
              <p className="text-red-400 text-sm mb-4">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  startedRef.current = false;
                  startCamera();
                }}
                className="px-6 py-2 bg-white/[0.06] hover:bg-white/[0.1] text-white rounded-lg text-sm border border-white/[0.08] transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom info */}
      <div className="px-4 py-3 bg-white/[0.02] border-t border-white/[0.06] text-center">
        <p className="text-xs text-[var(--muted)]">
          {connectionState === "connected"
            ? "Camera feed is being sent to your PC"
            : "Point your camera at a trading card"}
        </p>
      </div>
    </div>
  );
}

export default function PhonePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-[var(--muted)]">Loading...</p>
        </div>
      }
    >
      <PhoneContent />
    </Suspense>
  );
}
