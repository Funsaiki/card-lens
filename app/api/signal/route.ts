import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

/**
 * WebRTC signaling via Vercel KV (Redis).
 *
 * Keys:
 *   signal:{sessionId}:offer        — SDP offer
 *   signal:{sessionId}:answer       — SDP answer
 *   signal:{sessionId}:ice-offer    — list of ICE candidates from offerer
 *   signal:{sessionId}:ice-answer   — list of ICE candidates from answerer
 *
 * All keys expire after 5 minutes.
 */

const TTL = 300; // 5 minutes

function key(sessionId: string, type: string): string {
  return `signal:${sessionId}:${type}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, type, data } = body;

    if (!sessionId || !type || data === undefined) {
      return NextResponse.json(
        { error: "Missing sessionId, type, or data" },
        { status: 400 }
      );
    }

    if (type === "offer") {
      await kv.set(key(sessionId, "offer"), data, { ex: TTL });
    } else if (type === "answer") {
      await kv.set(key(sessionId, "answer"), data, { ex: TTL });
    } else if (type === "ice-candidate-offer") {
      const k = key(sessionId, "ice-offer");
      await kv.rpush(k, data);
      await kv.expire(k, TTL);
    } else if (type === "ice-candidate-answer") {
      const k = key(sessionId, "ice-answer");
      await kv.rpush(k, data);
      await kv.expire(k, TTL);
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
    const cursor = parseInt(searchParams.get("cursor") ?? "0", 10);

    if (!sessionId || !type) {
      return NextResponse.json(
        { error: "Missing sessionId or type" },
        { status: 400 }
      );
    }

    if (type === "offer") {
      const data = await kv.get(key(sessionId, "offer"));
      return NextResponse.json({ data: data ?? null });
    } else if (type === "answer") {
      const data = await kv.get(key(sessionId, "answer"));
      return NextResponse.json({ data: data ?? null });
    } else if (type === "ice-candidate-offer") {
      const k = key(sessionId, "ice-offer");
      const len = await kv.llen(k);
      if (cursor >= len) {
        return NextResponse.json({ data: [], cursor: len });
      }
      const items = await kv.lrange(k, cursor, -1);
      return NextResponse.json({ data: items, cursor: len });
    } else if (type === "ice-candidate-answer") {
      const k = key(sessionId, "ice-answer");
      const len = await kv.llen(k);
      if (cursor >= len) {
        return NextResponse.json({ data: [], cursor: len });
      }
      const items = await kv.lrange(k, cursor, -1);
      return NextResponse.json({ data: items, cursor: len });
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
