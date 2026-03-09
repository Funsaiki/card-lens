import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 100);
  const offset = (page - 1) * limit;

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
    return NextResponse.json({ error: error.message }, { status: 500 });
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

  const body = await request.json();
  const { card, quantity = 1, condition = "near_mint" } = body;

  if (!card?.id || !card?.game || !card?.name) {
    return NextResponse.json({ error: "Missing card data" }, { status: 400 });
  }

  // Check if card already exists
  const { data: existing } = await supabase
    .from("collection_items")
    .select("id, quantity")
    .eq("user_id", user.id)
    .eq("card_id", card.id)
    .eq("game", card.game)
    .single();

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
      return NextResponse.json({ error: error.message }, { status: 500 });
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
  });

  if (error) {
    console.error("[Collection] POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, action: "added", quantity });
}
