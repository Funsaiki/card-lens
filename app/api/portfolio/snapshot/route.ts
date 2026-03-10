import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMarketPriceUsd } from "@/lib/price-utils";
import { CardData, CardGame } from "@/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/portfolio/snapshot
 * Takes a daily snapshot of the current user's portfolio value.
 * Can also be called by Vercel Cron with CRON_SECRET.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // If called by cron, use service role to snapshot all users.
  // For now, just snapshot the authenticated user.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date().toISOString().slice(0, 10);

  // Fetch all collection items
  const { data: items, error: fetchErr } = await supabase
    .from("collection_items")
    .select("card_id, game, card_data, quantity")
    .eq("user_id", user.id);

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }

  // Compute per-game and total values
  const gameMap = new Map<CardGame, { value: number; cardCount: number; uniqueCards: number }>();
  let totalValue = 0;
  let totalCards = 0;
  let totalUnique = 0;

  for (const item of items ?? []) {
    const card = item.card_data as CardData;
    const game = item.game as CardGame;
    const price = getMarketPriceUsd(card);
    const value = price != null ? price * item.quantity : 0;

    totalValue += value;
    totalCards += item.quantity;
    totalUnique += 1;

    const gv = gameMap.get(game) ?? { value: 0, cardCount: 0, uniqueCards: 0 };
    gv.value += value;
    gv.cardCount += item.quantity;
    gv.uniqueCards += 1;
    gameMap.set(game, gv);
  }

  // Upsert snapshot rows (total + per-game)
  // Use '_total' instead of NULL for the aggregate row — PostgreSQL treats
  // NULLs as distinct in UNIQUE constraints, so game=NULL never upserts
  // and creates duplicate rows on every page load.
  const rows = [
    {
      user_id: user.id,
      snapshot_date: today,
      game: "_total",
      total_value_usd: Math.round(totalValue * 100) / 100,
      card_count: totalCards,
      unique_cards: totalUnique,
    },
    ...Array.from(gameMap.entries()).map(([game, gv]) => ({
      user_id: user.id,
      snapshot_date: today,
      game: game as string,
      total_value_usd: Math.round(gv.value * 100) / 100,
      card_count: gv.cardCount,
      unique_cards: gv.uniqueCards,
    })),
  ];

  const { error: upsertErr } = await supabase
    .from("portfolio_snapshots")
    .upsert(rows, { onConflict: "user_id,snapshot_date,game" });

  if (upsertErr) {
    return NextResponse.json({ error: upsertErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    date: today,
    totalValue: Math.round(totalValue * 100) / 100,
    games: gameMap.size,
  });
}
