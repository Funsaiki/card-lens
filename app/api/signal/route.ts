import { NextRequest, NextResponse } from "next/server";
import Redis from "ioredis";

export const dynamic = "force-dynamic";

/**
 * WebRTC signaling via Redis.
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

let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    const url = process.env.REDIS_URL;
    if (!url) throw new Error("REDIS_URL is not set");
    redis = new Redis(url, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
  }
  return redis;
}

function key(sessionId: string, type: string): string {
  return `signal:${sessionId}:${type}`;
}

export async function POST(request: NextRequest) {
  try {
    const r = getRedis();
    const body = await request.json();
    const { sessionId, type, data } = body;

    if (!sessionId || !type || data === undefined) {
      return NextResponse.json(
        { error: "Missing sessionId, type, or data" },
        { status: 400 }
      );
    }

    const serialized = JSON.stringify(data);

    if (type === "offer") {
      const k = key(sessionId, "offer");
      await r.set(k, serialized, "EX", TTL);
    } else if (type === "answer") {
      const k = key(sessionId, "answer");
      await r.set(k, serialized, "EX", TTL);
    } else if (type === "ice-candidate-offer") {
      const k = key(sessionId, "ice-offer");
      await r.rpush(k, serialized);
      await r.expire(k, TTL);
    } else if (type === "ice-candidate-answer") {
      const k = key(sessionId, "ice-answer");
      await r.rpush(k, serialized);
      await r.expire(k, TTL);
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
    const r = getRedis();
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
      const raw = await r.get(key(sessionId, "offer"));
      return NextResponse.json({ data: raw ? JSON.parse(raw) : null });
    } else if (type === "answer") {
      const raw = await r.get(key(sessionId, "answer"));
      return NextResponse.json({ data: raw ? JSON.parse(raw) : null });
    } else if (type === "ice-candidate-offer") {
      const k = key(sessionId, "ice-offer");
      const len = await r.llen(k);
      if (cursor >= len) {
        return NextResponse.json({ data: [], cursor: len });
      }
      const items = await r.lrange(k, cursor, -1);
      return NextResponse.json({
        data: items.map((s) => JSON.parse(s)),
        cursor: len,
      });
    } else if (type === "ice-candidate-answer") {
      const k = key(sessionId, "ice-answer");
      const len = await r.llen(k);
      if (cursor >= len) {
        return NextResponse.json({ data: [], cursor: len });
      }
      const items = await r.lrange(k, cursor, -1);
      return NextResponse.json({
        data: items.map((s) => JSON.parse(s)),
        cursor: len,
      });
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
