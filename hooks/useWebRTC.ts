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

const PEER_CONFIG = {
  config: {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ],
  },
};

const TARGET_BITRATE = 4_000_000; // 4 Mbps

function boostBitrate(pc: RTCPeerConnection, role: string) {
  try {
    for (const sender of pc.getSenders()) {
      if (sender.track?.kind === "video") {
        const params = sender.getParameters();
        if (!params.encodings || params.encodings.length === 0) {
          params.encodings = [{}];
        }
        params.encodings[0].maxBitrate = TARGET_BITRATE;
        params.encodings[0].maxFramerate = 30;
        sender.setParameters(params);
        log(role, `video bitrate set to ${TARGET_BITRATE / 1_000_000} Mbps`);
      }
    }
  } catch (e) {
    log(role, "failed to set bitrate:", e);
  }
}

// Force H.264 as preferred codec (better hardware acceleration on phones)
function preferH264(pc: RTCPeerConnection) {
  if (!pc.getTransceivers) return;
  for (const transceiver of pc.getTransceivers()) {
    if (transceiver.receiver.track?.kind !== "video" && transceiver.sender.track?.kind !== "video") continue;

    const codecs = RTCRtpReceiver.getCapabilities?.("video")?.codecs;
    if (!codecs) return;

    const h264 = codecs.filter((c) => c.mimeType === "video/H264");
    const rest = codecs.filter((c) => c.mimeType !== "video/H264");
    if (h264.length > 0 && transceiver.setCodecPreferences) {
      transceiver.setCodecPreferences([...h264, ...rest]);
    }
  }
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
    setConnectionState("idle");
  }, [role]);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // PC side: create peer and wait for incoming call
  const startAsReceiver = useCallback(async () => {
    cleanup();
    setConnectionState("waiting");
    log(role, "startAsReceiver");

    const peer = new Peer(PEER_CONFIG);
    peerRef.current = peer;

    peer.on("open", (id) => {
      log(role, "peer opened with id:", id);
      setPeerId(id);
    });

    peer.on("call", (call) => {
      log(role, "incoming call from:", call.peer);
      setConnectionState("connecting");

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

      const peer = new Peer(PEER_CONFIG);
      peerRef.current = peer;

      peer.on("open", (id) => {
        log(role, "peer opened with id:", id);
        setPeerId(id);

        const call = peer.call(remotePeerId, stream);
        callRef.current = call;

        // Wait for the RTCPeerConnection to be ready, then apply optimizations
        const watchConnection = () => {
          const pc = call.peerConnection;
          if (!pc) {
            setTimeout(watchConnection, 100);
            return;
          }

          // Prefer H.264 for hardware acceleration
          preferH264(pc);

          pc.onconnectionstatechange = () => {
            log(role, "connection state:", pc.connectionState);
            if (pc.connectionState === "connected") {
              setConnectionState("connected");
              // Boost bitrate once connection is established
              boostBitrate(pc, role);
            } else if (
              pc.connectionState === "failed" ||
              pc.connectionState === "closed"
            ) {
              setConnectionState("failed");
            }
          };

          if (pc.connectionState === "connected") {
            setConnectionState("connected");
            boostBitrate(pc, role);
          }
        };
        watchConnection();

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
