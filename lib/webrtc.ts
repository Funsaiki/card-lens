const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export function createPeerConnection(
  onIceCandidate: (candidate: RTCIceCandidate) => void,
  onTrack?: (stream: MediaStream) => void,
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void
): RTCPeerConnection {
  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      onIceCandidate(event.candidate);
    }
  };

  if (onTrack) {
    pc.ontrack = (event) => {
      onTrack(event.streams[0]);
    };
  }

  if (onConnectionStateChange) {
    pc.onconnectionstatechange = () => {
      onConnectionStateChange(pc.connectionState);
    };
  }

  return pc;
}

export async function createOffer(
  pc: RTCPeerConnection
): Promise<RTCSessionDescriptionInit> {
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  return offer;
}

export async function createAnswer(
  pc: RTCPeerConnection
): Promise<RTCSessionDescriptionInit> {
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  return answer;
}

export async function setRemoteDescription(
  pc: RTCPeerConnection,
  description: RTCSessionDescriptionInit
): Promise<void> {
  await pc.setRemoteDescription(new RTCSessionDescription(description));
}

export async function addIceCandidate(
  pc: RTCPeerConnection,
  candidate: RTCIceCandidateInit
): Promise<void> {
  await pc.addIceCandidate(new RTCIceCandidate(candidate));
}

// Signaling helpers — communicate via API route polling
const SIGNAL_BASE = "/api/signal";

export async function sendSignal(
  sessionId: string,
  type: string,
  data: unknown
): Promise<void> {
  await fetch(SIGNAL_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, type, data }),
  });
}

export async function pollSignal(
  sessionId: string,
  type: string,
  cursor?: number
): Promise<{ data: unknown | null; cursor?: number }> {
  const cursorParam = cursor != null ? `&cursor=${cursor}` : "";
  const res = await fetch(
    `${SIGNAL_BASE}?sessionId=${sessionId}&type=${type}${cursorParam}`
  );
  if (!res.ok) return { data: null };
  const json = await res.json();
  return { data: json.data ?? null, cursor: json.cursor };
}
