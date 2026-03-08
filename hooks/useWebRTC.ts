"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  createPeerConnection,
  createOffer,
  createAnswer,
  setRemoteDescription,
  addIceCandidate,
  sendSignal,
  pollSignal,
} from "@/lib/webrtc";
import { v4 as uuidv4 } from "uuid";

export type ConnectionRole = "receiver" | "sender";
export type ConnectionState =
  | "idle"
  | "waiting"
  | "connecting"
  | "connected"
  | "failed";

interface UseWebRTCOptions {
  role: ConnectionRole;
  sessionId?: string;
  onStream?: (stream: MediaStream) => void;
}

function log(role: string, ...args: unknown[]) {
  console.log(`[WebRTC:${role}]`, ...args);
}

export function useWebRTC({ role, sessionId: externalSessionId, onStream }: UseWebRTCOptions) {
  const [sessionId] = useState(() => externalSessionId ?? uuidv4());
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("idle");
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const iceCandidateBuffer = useRef<RTCIceCandidateInit[]>([]);
  const hasAnswerRef = useRef(false);
  const iceCursorRef = useRef(0);

  const cleanup = useCallback(() => {
    log(role, "cleanup");
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    hasAnswerRef.current = false;
    iceCursorRef.current = 0;
  }, [role]);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // PC side: create offer and wait for phone to connect
  const startAsReceiver = useCallback(async () => {
    cleanup();
    setConnectionState("waiting");
    log(role, "startAsReceiver, sessionId:", sessionId);

    const pc = createPeerConnection(
      async (candidate) => {
        log(role, "sending ICE candidate");
        await sendSignal(sessionId, "ice-candidate-offer", candidate.toJSON());
      },
      (stream) => {
        log(role, "got remote stream!", stream.getTracks().length, "tracks");
        setRemoteStream(stream);
        onStream?.(stream);
        setConnectionState("connected");
      },
      (state) => {
        log(role, "connection state:", state);
        if (state === "failed") {
          setConnectionState("failed");
        }
        if (state === "connected") {
          setConnectionState("connected");
        }
        // Don't treat "disconnected" as failed — it can recover
      }
    );

    // Add transceivers to receive video+audio
    pc.addTransceiver("video", { direction: "recvonly" });

    pcRef.current = pc;

    // Log ICE state changes
    pc.oniceconnectionstatechange = () => {
      log(role, "ICE state:", pc.iceConnectionState);
    };
    pc.onicegatheringstatechange = () => {
      log(role, "ICE gathering:", pc.iceGatheringState);
    };
    pc.onsignalingstatechange = () => {
      log(role, "signaling state:", pc.signalingState);
    };

    const offer = await createOffer(pc);
    log(role, "offer created, sending to signal server");
    await sendSignal(sessionId, "offer", offer);
    log(role, "offer sent, starting polling");

    // Poll for answer and ICE candidates
    pollingRef.current = setInterval(async () => {
      const currentPc = pcRef.current;
      if (!currentPc) return;

      try {
        // Check for answer (only once)
        if (!hasAnswerRef.current) {
          const answerResult = await pollSignal(sessionId, "answer");
          const answer = answerResult.data as RTCSessionDescriptionInit | null;

          if (answer && answer.type) {
            log(role, "got answer! signalingState:", currentPc.signalingState);
            hasAnswerRef.current = true;

            if (currentPc.signalingState === "have-local-offer") {
              await setRemoteDescription(currentPc, answer);
              log(role, "remote description set");
              setConnectionState("connecting");

              // Flush buffered ICE candidates
              log(role, "flushing", iceCandidateBuffer.current.length, "buffered ICE candidates");
              for (const candidate of iceCandidateBuffer.current) {
                try {
                  await addIceCandidate(currentPc, candidate);
                } catch (e) {
                  log(role, "buffered ICE candidate error:", e);
                }
              }
              iceCandidateBuffer.current = [];
            }
          }
        }

        // Check for ICE candidates from phone
        const iceResult = await pollSignal(
          sessionId,
          "ice-candidate-answer",
          iceCursorRef.current
        );
        if (iceResult.cursor != null) iceCursorRef.current = iceResult.cursor;
        const candidates = iceResult.data as RTCIceCandidateInit[] | null;

        if (candidates && Array.isArray(candidates) && candidates.length > 0) {
          log(role, "got", candidates.length, "ICE candidates from phone");
          for (const candidate of candidates) {
            if (currentPc.remoteDescription) {
              try {
                await addIceCandidate(currentPc, candidate);
              } catch (e) {
                log(role, "ICE candidate error:", e);
              }
            } else {
              iceCandidateBuffer.current.push(candidate);
              log(role, "buffered ICE candidate (no remote desc yet)");
            }
          }
        }
      } catch (e) {
        log(role, "polling error:", e);
      }
    }, 1000);
  }, [sessionId, cleanup, onStream, role]);

  // Phone side: get offer, send answer
  const startAsSender = useCallback(
    async (stream: MediaStream) => {
      cleanup();
      setConnectionState("connecting");
      log(role, "startAsSender, sessionId:", sessionId);

      // Poll for the offer
      let offer: RTCSessionDescriptionInit | null = null;
      for (let i = 0; i < 30; i++) {
        const offerResult = await pollSignal(sessionId, "offer");
        offer = offerResult.data as RTCSessionDescriptionInit | null;
        if (offer && offer.type) {
          log(role, "got offer on attempt", i + 1);
          break;
        }
        await new Promise((r) => setTimeout(r, 1000));
      }

      if (!offer || !offer.type) {
        log(role, "no offer found after 30 attempts");
        setConnectionState("failed");
        return;
      }

      const pc = createPeerConnection(
        async (candidate) => {
          log(role, "sending ICE candidate");
          await sendSignal(
            sessionId,
            "ice-candidate-answer",
            candidate.toJSON()
          );
        },
        undefined,
        (state) => {
          log(role, "connection state:", state);
          if (state === "connected") {
            setConnectionState("connected");
          } else if (state === "failed") {
            setConnectionState("failed");
          }
        }
      );

      pcRef.current = pc;

      // Log ICE state changes
      pc.oniceconnectionstatechange = () => {
        log(role, "ICE state:", pc.iceConnectionState);
      };
      pc.onicegatheringstatechange = () => {
        log(role, "ICE gathering:", pc.iceGatheringState);
      };
      pc.onsignalingstatechange = () => {
        log(role, "signaling state:", pc.signalingState);
      };

      // Add local stream tracks
      log(role, "adding", stream.getTracks().length, "tracks");
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      await setRemoteDescription(pc, offer);
      log(role, "remote description set");

      const answer = await createAnswer(pc);
      log(role, "answer created, sending");
      await sendSignal(sessionId, "answer", answer);
      log(role, "answer sent");

      // Boost video bitrate to reduce compression artifacts
      try {
        for (const sender of pc.getSenders()) {
          if (sender.track?.kind === "video") {
            const params = sender.getParameters();
            if (!params.encodings || params.encodings.length === 0) {
              params.encodings = [{}];
            }
            params.encodings[0].maxBitrate = 2_500_000; // 2.5 Mbps
            await sender.setParameters(params);
            log(role, "video bitrate set to 2.5 Mbps");
          }
        }
      } catch (e) {
        log(role, "failed to set bitrate:", e);
      }

      // Poll for ICE candidates from PC
      let senderIceCursor = 0;
      pollingRef.current = setInterval(async () => {
        const currentPc = pcRef.current;
        if (!currentPc) return;

        try {
          const iceResult = await pollSignal(
            sessionId,
            "ice-candidate-offer",
            senderIceCursor
          );
          if (iceResult.cursor != null) senderIceCursor = iceResult.cursor;
          const candidates = iceResult.data as RTCIceCandidateInit[] | null;

          if (candidates && Array.isArray(candidates) && candidates.length > 0) {
            log(role, "got", candidates.length, "ICE candidates from PC");
            for (const candidate of candidates) {
              try {
                await addIceCandidate(currentPc, candidate);
              } catch (e) {
                log(role, "ICE candidate error:", e);
              }
            }
          }
        } catch (e) {
          log(role, "polling error:", e);
        }
      }, 1000);
    },
    [sessionId, cleanup, role]
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
    sessionId,
    connectionState,
    remoteStream,
    start,
    cleanup,
  };
}
