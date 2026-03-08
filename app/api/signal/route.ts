import { NextRequest, NextResponse } from "next/server";

/**
 * In-memory signaling store.
 * Uses globalThis so the Map survives Next.js dev mode module re-evaluation.
 */
interface SignalSession {
  offer?: unknown;
  answer?: unknown;
  "ice-candidate-offer": unknown[];
  "ice-candidate-answer": unknown[];
  "ice-candidate-offer-cursor": number;
  "ice-candidate-answer-cursor": number;
  createdAt: number;
}

const globalStore = globalThis as unknown as {
  __signalSessions?: Map<string, SignalSession>;
};
if (!globalStore.__signalSessions) {
  globalStore.__signalSessions = new Map();
}
const sessions = globalStore.__signalSessions;

function cleanupSessions() {
  const now = Date.now();
  const keys = Array.from(sessions.keys());
  for (const id of keys) {
    const session = sessions.get(id)!;
    if (now - session.createdAt > 5 * 60 * 1000) {
      sessions.delete(id);
    }
  }
}

function getOrCreateSession(sessionId: string) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      "ice-candidate-offer": [],
      "ice-candidate-answer": [],
      "ice-candidate-offer-cursor": 0,
      "ice-candidate-answer-cursor": 0,
      createdAt: Date.now(),
    });
  }
  return sessions.get(sessionId)!;
}

export async function POST(request: NextRequest) {
  try {
    cleanupSessions();

    const body = await request.json();
    const { sessionId, type, data } = body;

    if (!sessionId || !type || data === undefined) {
      return NextResponse.json(
        { error: "Missing sessionId, type, or data" },
        { status: 400 }
      );
    }

    const session = getOrCreateSession(sessionId);

    if (type === "offer") {
      session.offer = data;
      console.log(`[Signal] stored offer for session ${sessionId}`);
    } else if (type === "answer") {
      session.answer = data;
      console.log(`[Signal] stored answer for session ${sessionId}`);
    } else if (type === "ice-candidate-offer") {
      session["ice-candidate-offer"].push(data);
    } else if (type === "ice-candidate-answer") {
      session["ice-candidate-answer"].push(data);
    } else {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[Signal] POST error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");
    const type = searchParams.get("type");

    if (!sessionId || !type) {
      return NextResponse.json(
        { error: "Missing sessionId or type" },
        { status: 400 }
      );
    }

    const session = sessions.get(sessionId);
    if (!session) {
      return NextResponse.json({ data: null });
    }

    // offer and answer: return without consuming (idempotent reads)
    if (type === "offer") {
      return NextResponse.json({ data: session.offer ?? null });
    } else if (type === "answer") {
      return NextResponse.json({ data: session.answer ?? null });
    } else if (type === "ice-candidate-offer") {
      // Return only new candidates since last cursor
      const cursor = session["ice-candidate-offer-cursor"];
      const all = session["ice-candidate-offer"];
      const newCandidates = all.slice(cursor);
      session["ice-candidate-offer-cursor"] = all.length;
      return NextResponse.json({ data: newCandidates });
    } else if (type === "ice-candidate-answer") {
      const cursor = session["ice-candidate-answer-cursor"];
      const all = session["ice-candidate-answer"];
      const newCandidates = all.slice(cursor);
      session["ice-candidate-answer-cursor"] = all.length;
      return NextResponse.json({ data: newCandidates });
    }

    return NextResponse.json({ data: null });
  } catch (e) {
    console.error("[Signal] GET error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
