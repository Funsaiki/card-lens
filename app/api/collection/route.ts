import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { VALID_GAMES, VALID_CONDITIONS, VALID_VARIANTS, MAX_QUANTITY } from "@/types";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// GET /api/collection?game=pokemon&page=1&limit=50
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const game = searchParams.get("game");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const all = searchParams.get("all") === "1";
  const limit = all ? 2000 : Math.min(Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10) || 50), 100);
  const offset = all ? 0 : (page - 1) * limit;

  let query = supabase
    .from("collection_items")
    .select("*", { count: "exact" })
    .eq("user_id", user.id)
    .order("added_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (game) {
    query = query.eq("game", game);
  }

  const { data, count, error } = await query;

  if (error) {
    console.error("[Collection] GET error:", error);
    return NextResponse.json({ error: "Failed to fetch collection" }, { status: 500 });
  }

  return NextResponse.json({
    items: data ?? [],
    total: count ?? 0,
    page,
    limit,
  });
}

// POST /api/collection — Add card (upsert: increment quantity if exists)
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 60 adds per minute per user
  const rl = rateLimit(`collection:${user.id}`, 60, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { card, quantity = 1, condition = "near_mint", variant = "normal" } = body;

  if (!card?.id || !card?.game || !card?.name) {
    return NextResponse.json({ error: "Missing card data" }, { status: 400 });
  }

  if (!(VALID_GAMES as readonly string[]).includes(card.game)) {
    return NextResponse.json({ error: "Invalid game" }, { status: 400 });
  }
  if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
    return NextResponse.json({ error: "Invalid quantity" }, { status: 400 });
  }
  if (!(VALID_CONDITIONS as readonly string[]).includes(condition)) {
    return NextResponse.json({ error: "Invalid condition" }, { status: 400 });
  }
  if (!(VALID_VARIANTS as readonly string[]).includes(variant)) {
    return NextResponse.json({ error: "Invalid variant" }, { status: 400 });
  }

  // Check if card already exists (same card + game + variant)
  let existingQuery = supabase
    .from("collection_items")
    .select("id, quantity")
    .eq("user_id", user.id)
    .eq("card_id", card.id)
    .eq("game", card.game);

  if (variant === "normal") {
    // Match both null and "normal" for backwards compatibility
    existingQuery = existingQuery.or("variant.is.null,variant.eq.normal");
  } else {
    existingQuery = existingQuery.eq("variant", variant);
  }

  const { data: existing } = await existingQuery.single();

  if (existing) {
    // Increment quantity
    const { error } = await supabase
      .from("collection_items")
      .update({
        quantity: existing.quantity + quantity,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (error) {
      console.error("[Collection] update error:", error);
      return NextResponse.json({ error: "Failed to update card" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      action: "incremented",
      quantity: existing.quantity + quantity,
    });
  }

  // Insert new
  const { error } = await supabase.from("collection_items").insert({
    user_id: user.id,
    card_id: card.id,
    game: card.game,
    card_name: card.name,
    card_set: card.set || null,
    card_rarity: card.rarity || null,
    card_image_url: card.imageUrl || null,
    card_data: card,
    quantity,
    condition,
    variant,
  });

  if (error) {
    console.error("[Collection] POST error:", error);
    return NextResponse.json({ error: "Failed to add card" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, action: "added", quantity });
}
