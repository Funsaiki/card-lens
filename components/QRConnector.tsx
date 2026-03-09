"use client";

import { useMemo } from "react";
import QRCode from "react-qr-code";
import { ConnectionState } from "@/hooks/useWebRTC";

interface QRConnectorProps {
  peerId: string;
  connectionState: ConnectionState;
  onConnect: () => void;
}

export default function QRConnector({
  peerId,
  connectionState,
  onConnect,
}: QRConnectorProps) {
  const phoneUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const base = window.location.origin;
    return `${base}/phone?peer=${peerId}`;
  }, [peerId]);

  const stateMessages: Record<ConnectionState, string> = {
    idle: "Click to generate connection",
    waiting: "Scan this QR code with your phone",
    connecting: "Connecting...",
    connected: "Phone connected!",
    failed: "Connection failed. Try again.",
  };

  const stateColors: Record<ConnectionState, string> = {
    idle: "text-[var(--muted)]",
    waiting: "text-yellow-400",
    connecting: "text-indigo-400",
    connected: "text-green-400",
    failed: "text-red-400",
  };

  return (
    <div className="flex flex-col items-center gap-4 p-6 bg-white/[0.03] border border-white/[0.06] rounded-xl backdrop-blur-sm">
      <h3 className="text-sm font-medium text-zinc-200">
        Connect Phone Camera
      </h3>

      {connectionState === "idle" ? (
        <button
          onClick={onConnect}
          className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-lg font-medium transition-all shadow-lg shadow-indigo-600/20"
        >
          Generate QR Code
        </button>
      ) : connectionState === "waiting" || connectionState === "connecting" ? (
        <div className="bg-white p-3 rounded-xl shadow-lg shadow-black/20">
          <QRCode value={phoneUrl} size={180} />
        </div>
      ) : connectionState === "connected" ? (
        <div className="flex items-center gap-2 text-green-400">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="font-medium">Connected</span>
        </div>
      ) : (
        <button
          onClick={onConnect}
          className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition-colors"
        >
          Retry Connection
        </button>
      )}

      <p className={`text-xs ${stateColors[connectionState]}`}>
        {stateMessages[connectionState]}
      </p>

      {(connectionState === "waiting" || connectionState === "connecting") && (
        <p className="text-xs text-[var(--muted)] text-center max-w-[200px]">
          Open this URL on your phone or scan the QR code
        </p>
      )}
    </div>
  );
}
