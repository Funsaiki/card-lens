"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Peer, { MediaConnection } from "peerjs";

export type ConnectionRole = "receiver" | "sender";
export type ConnectionState =
  | "idle"
  | "waiting"
  | "connecting"
  | "connected"
  | "failed";

interface UseWebRTCOptions {
  role: ConnectionRole;
  remotePeerId?: string;
  onStream?: (stream: MediaStream) => void;
}

function log(role: string, ...args: unknown[]) {
  console.log(`[WebRTC:${role}]`, ...args);
}

export function useWebRTC({ role, remotePeerId, onStream }: UseWebRTCOptions) {
  const [peerId, setPeerId] = useState<string>("");
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("idle");
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const peerRef = useRef<Peer | null>(null);
  const callRef = useRef<MediaConnection | null>(null);

  const cleanup = useCallback(() => {
    log(role, "cleanup");
    if (callRef.current) {
      callRef.current.close();
      callRef.current = null;
    }
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    setRemoteStream(null);
  }, [role]);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // PC side: create peer and wait for incoming call
  const startAsReceiver = useCallback(async () => {
    cleanup();
    setConnectionState("waiting");
    log(role, "startAsReceiver");

    const peer = new Peer();
    peerRef.current = peer;

    peer.on("open", (id) => {
      log(role, "peer opened with id:", id);
      setPeerId(id);
    });

    peer.on("call", (call) => {
      log(role, "incoming call from:", call.peer);
      setConnectionState("connecting");

      // Answer with no stream (receive-only)
      call.answer();
      callRef.current = call;

      call.on("stream", (stream) => {
        log(role, "got remote stream!", stream.getTracks().length, "tracks");
        setRemoteStream(stream);
        onStream?.(stream);
        setConnectionState("connected");
      });

      call.on("close", () => {
        log(role, "call closed");
        setConnectionState("failed");
      });

      call.on("error", (err) => {
        log(role, "call error:", err);
        setConnectionState("failed");
      });
    });

    peer.on("error", (err) => {
      log(role, "peer error:", err);
      setConnectionState("failed");
    });
  }, [cleanup, onStream, role]);

  // Phone side: call the receiver's peer
  const startAsSender = useCallback(
    async (stream: MediaStream) => {
      if (!remotePeerId) {
        log(role, "no remote peer ID");
        setConnectionState("failed");
        return;
      }

      cleanup();
      setConnectionState("connecting");
      log(role, "startAsSender, connecting to:", remotePeerId);

      const peer = new Peer();
      peerRef.current = peer;

      peer.on("open", (id) => {
        log(role, "peer opened with id:", id);
        setPeerId(id);

        const call = peer.call(remotePeerId, stream);
        callRef.current = call;

        // Monitor underlying RTCPeerConnection for state changes
        const watchConnection = () => {
          const pc = call.peerConnection;
          if (!pc) {
            setTimeout(watchConnection, 100);
            return;
          }

          pc.onconnectionstatechange = () => {
            log(role, "connection state:", pc.connectionState);
            if (pc.connectionState === "connected") {
              setConnectionState("connected");
            } else if (
              pc.connectionState === "failed" ||
              pc.connectionState === "closed"
            ) {
              setConnectionState("failed");
            }
          };

          if (pc.connectionState === "connected") {
            setConnectionState("connected");
          }
        };
        watchConnection();

        // Boost video bitrate for better quality
        const boostBitrate = () => {
          const pc = call.peerConnection;
          if (!pc) {
            setTimeout(boostBitrate, 500);
            return;
          }
          try {
            for (const sender of pc.getSenders()) {
              if (sender.track?.kind === "video") {
                const params = sender.getParameters();
                if (!params.encodings || params.encodings.length === 0) {
                  params.encodings = [{}];
                }
                params.encodings[0].maxBitrate = 2_500_000; // 2.5 Mbps
                sender.setParameters(params);
                log(role, "video bitrate set to 2.5 Mbps");
              }
            }
          } catch (e) {
            log(role, "failed to set bitrate:", e);
          }
        };
        boostBitrate();

        call.on("close", () => {
          log(role, "call closed");
          setConnectionState("failed");
        });

        call.on("error", (err) => {
          log(role, "call error:", err);
          setConnectionState("failed");
        });
      });

      peer.on("error", (err) => {
        log(role, "peer error:", err);
        setConnectionState("failed");
      });
    },
    [remotePeerId, cleanup, role]
  );

  const start = useCallback(
    async (stream?: MediaStream) => {
      if (role === "receiver") {
        await startAsReceiver();
      } else if (stream) {
        await startAsSender(stream);
      }
    },
    [role, startAsReceiver, startAsSender]
  );

  return {
    peerId,
    connectionState,
    remoteStream,
    start,
    cleanup,
  };
}
