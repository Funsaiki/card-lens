import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMarketPriceUsd } from "@/lib/price-utils";
import { CardGame, GAME_LABELS, CollectionItem } from "@/types";

export const dynamic = "force-dynamic";

// GET /api/u/[username] — Public collection data (no auth required)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const supabase = await createClient();

  // Find public profile by username
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, username, collection_public")
    .eq("username", username.toLowerCase())
    .eq("collection_public", true)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Fetch all collection items for this user
  const { data: items, error: itemsError } = await supabase
    .from("collection_items")
    .select("*")
    .eq("user_id", profile.id)
    .order("added_at", { ascending: false })
    .limit(2000);

  if (itemsError) {
    console.error("[PublicCollection] GET error:", itemsError);
    return NextResponse.json({ error: "Failed to fetch collection" }, { status: 500 });
  }

  // Compute portfolio summary
  const owned = (items ?? []).filter((i: { status: string }) => i.status === "owned" || !i.status);
  let totalValue = 0;
  const byGame: Record<string, { count: number; value: number }> = {};
  for (const item of owned) {
    const price = item.card_data ? getMarketPriceUsd(item.card_data) : null;
    const val = price != null ? price * item.quantity : 0;
    totalValue += val;
    const g = item.game as CardGame;
    if (!byGame[g]) byGame[g] = { count: 0, value: 0 };
    byGame[g].count += 1;
    byGame[g].value += val;
  }

  const gameBreakdown = Object.entries(byGame).map(([game, data]) => ({
    game: game as CardGame,
    label: GAME_LABELS[game as CardGame] ?? game,
    ...data,
  }));

  return NextResponse.json({
    username: profile.username,
    totalCards: owned.length,
    totalValue: +totalValue.toFixed(2),
    games: gameBreakdown,
    items: (items ?? []).map((i: Record<string, unknown>) => ({
      id: i.id,
      cardId: i.card_id,
      game: i.game,
      cardName: i.card_name,
      cardSet: i.card_set,
      cardRarity: i.card_rarity,
      cardImageUrl: i.card_image_url,
      quantity: i.quantity,
      condition: i.condition,
      variant: i.variant ?? "normal",
      status: i.status ?? "owned",
    })),
  });
}
