import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const USERNAME_RE = /^[a-z0-9][a-z0-9_-]{1,28}[a-z0-9]$/;

// GET /api/profile
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("username, collection_public")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("[Profile] GET error:", error);
    return NextResponse.json({ username: null, collectionPublic: false });
  }

  return NextResponse.json({
    username: data.username,
    collectionPublic: data.collection_public,
  });
}

// PATCH /api/profile — Update username and/or collection_public
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = rateLimit(`profile:${user.id}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (body.username !== undefined) {
    if (body.username !== null) {
      const username = String(body.username).toLowerCase().trim();
      if (!USERNAME_RE.test(username)) {
        return NextResponse.json({ error: "Username must be 3-30 characters, lowercase alphanumeric, hyphens and underscores only" }, { status: 400 });
      }
      // Check uniqueness
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username)
        .neq("id", user.id)
        .single();
      if (existing) {
        return NextResponse.json({ error: "Username already taken" }, { status: 409 });
      }
      updates.username = username;
    } else {
      updates.username = null;
    }
  }

  if (body.collectionPublic !== undefined) {
    if (typeof body.collectionPublic !== "boolean") {
      return NextResponse.json({ error: "collectionPublic must be a boolean" }, { status: 400 });
    }
    updates.collection_public = body.collectionPublic;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updates provided" }, { status: 400 });
  }

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id);

  if (error) {
    console.error("[Profile] PATCH error:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
