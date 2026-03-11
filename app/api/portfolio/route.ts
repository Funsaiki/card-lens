import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMarketPriceUsd } from "@/lib/price-utils";
import { CardData, CardGame, PortfolioSummary, GameValue, TopCard } from "@/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch all collection items (no pagination — we need totals)
  const { data: items, error } = await supabase
    .from("collection_items")
    .select("card_id, game, card_name, card_image_url, card_data, quantity")
    .eq("user_id", user.id);

  if (error) {
    console.error("[Portfolio] error:", error);
    return NextResponse.json({ error: "Failed to fetch portfolio" }, { status: 500 });
  }

  let totalValueUsd = 0;
  const gameMap = new Map<CardGame, { value: number; cardCount: number; uniqueCards: number }>();
  const cardValues: { cardId: string; name: string; imageUrl: string; game: CardGame; unitPrice: number; quantity: number; totalValue: number }[] = [];

  for (const item of items ?? []) {
    const card = item.card_data as CardData;
    const game = item.game as CardGame;
    const price = getMarketPriceUsd(card);
    const itemValue = price != null ? price * item.quantity : 0;

    totalValueUsd += itemValue;

    // Per-game aggregation
    const gv = gameMap.get(game) ?? { value: 0, cardCount: 0, uniqueCards: 0 };
    gv.value += itemValue;
    gv.cardCount += item.quantity;
    gv.uniqueCards += 1;
    gameMap.set(game, gv);

    if (price != null && price > 0) {
      cardValues.push({
        cardId: item.card_id,
        name: item.card_name,
        imageUrl: item.card_image_url ?? "",
        game,
        unitPrice: price,
        quantity: item.quantity,
        totalValue: itemValue,
      });
    }
  }

  // Top cards by total value
  cardValues.sort((a, b) => b.totalValue - a.totalValue);
  const topCards: TopCard[] = cardValues.slice(0, 10);

  const byGame: GameValue[] = Array.from(gameMap.entries()).map(([game, gv]) => ({
    game,
    ...gv,
  }));

  const summary: PortfolioSummary = {
    totalValueUsd: Math.round(totalValueUsd * 100) / 100,
    totalCards: (items ?? []).reduce((s, i) => s + i.quantity, 0),
    totalUnique: items?.length ?? 0,
    byGame,
    topCards,
  };

  return NextResponse.json(summary);
}
