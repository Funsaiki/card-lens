"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useWebRTC } from "@/hooks/useWebRTC";
import { getCardFrameStyle } from "@/lib/card-frame";

function PhoneContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const startedRef = useRef(false);

  const { connectionState, start } = useWebRTC({
    role: "sender",
    sessionId: sessionId ?? undefined,
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
            width: { ideal: 1920 },
            height: { ideal: 1080 },
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

  if (!sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-6">
        <div className="text-center">
          <h1 className="text-xl font-bold text-white mb-2">Card Lens</h1>
          <p className="text-zinc-400 text-sm">
            Scan the QR code on your PC to connect this phone as a camera.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950">
      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-900">
        <h1 className="text-sm font-medium text-white">Card Lens</h1>
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
          <span className="text-xs text-zinc-400 capitalize">
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
              className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium text-lg transition-colors shadow-lg shadow-blue-600/20"
            >
              Start Camera
            </button>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="text-center bg-zinc-900 rounded-xl p-6 max-w-sm">
              <p className="text-red-400 text-sm mb-4">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  startedRef.current = false;
                  startCamera();
                }}
                className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom info */}
      <div className="px-4 py-3 bg-zinc-900 text-center">
        <p className="text-xs text-zinc-500">
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
        <div className="min-h-screen flex items-center justify-center bg-zinc-950">
          <p className="text-zinc-400">Loading...</p>
        </div>
      }
    >
      <PhoneContent />
    </Suspense>
  );
}
