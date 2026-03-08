"use client";

import { useEffect, useRef, useState } from "react";

interface VideoFeedProps {
  stream: MediaStream | null;
  mirrored?: boolean;
  className?: string;
  onVideoRef?: (video: HTMLVideoElement) => void;
  children?: React.ReactNode;
}

export default function VideoFeed({
  stream,
  mirrored = false,
  className = "",
  onVideoRef,
  children,
}: VideoFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (stream) {
      video.srcObject = stream;

      const handleMeta = () => {
        setIsPortrait(video.videoHeight > video.videoWidth);
      };
      video.addEventListener("loadedmetadata", handleMeta);
      return () => video.removeEventListener("loadedmetadata", handleMeta);
    } else {
      video.srcObject = null;
      setIsPortrait(false);
    }
  }, [stream]);

  useEffect(() => {
    if (videoRef.current && onVideoRef) {
      onVideoRef(videoRef.current);
    }
  }, [onVideoRef]);

  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-black flex items-center justify-center ${className}`}
    >
      {/* Wrapper that matches the actual video dimensions */}
      <div className={`relative ${isPortrait ? "h-full" : "w-full"}`}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`${
            isPortrait ? "h-full w-auto" : "w-full h-auto"
          } max-w-full max-h-full block ${mirrored ? "scale-x-[-1]" : ""}`}
        />
        {/* Overlay children positioned exactly over the video */}
        {stream && children && (
          <div className="absolute inset-0">{children}</div>
        )}
      </div>

      {!stream && (
        <div className="absolute inset-0 flex items-center justify-center text-zinc-500">
          <div className="text-center">
            <svg
              className="mx-auto mb-2 w-12 h-12 opacity-50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            <p className="text-sm">No video source</p>
          </div>
        </div>
      )}
    </div>
  );
}
