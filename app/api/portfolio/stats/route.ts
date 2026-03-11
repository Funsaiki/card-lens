import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMarketPriceUsd, PRICE_BUCKETS } from "@/lib/price-utils";
import { CardData, CardGame, CardCondition, CollectionStats, CardGainLoss } from "@/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: items, error } = await supabase
    .from("collection_items")
    .select("card_id, game, card_name, card_set, card_rarity, card_image_url, card_data, quantity, condition")
    .eq("user_id", user.id);

  if (error) {
    console.error("[Portfolio] stats error:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }

  if (!items || items.length === 0) {
    return NextResponse.json({ empty: true });
  }

  // --- Rarity breakdown ---
  const rarityMap = new Map<string, { count: number; value: number }>();
  // --- Price distribution ---
  const bucketCounts = PRICE_BUCKETS.map(() => 0);
  // --- Game composition ---
  const gameCompMap = new Map<CardGame, { count: number; value: number }>();
  // --- Set composition ---
  const setCompMap = new Map<string, { game: CardGame; set: string; count: number; value: number }>();
  // --- Condition breakdown ---
  const conditionMap = new Map<CardCondition, number>();
  // --- Individual card prices for gains/losses + median ---
  const pricesForMedian: number[] = [];
  let totalValueForAvg = 0;
  let pricedCardCount = 0;

  // For gains/losses, we compare the embedded price at add-time
  // with the current embedded price (same snapshot — true gains require price cache refresh)
  const allCards: { cardId: string; name: string; imageUrl: string; game: CardGame; price: number }[] = [];

  for (const item of items) {
    const card = item.card_data as CardData;
    const game = item.game as CardGame;
    const rarity = item.card_rarity || "Unknown";
    const set = item.card_set || "Unknown";
    const condition = (item.condition || "near_mint") as CardCondition;
    const price = getMarketPriceUsd(card);
    const itemValue = price != null ? price * item.quantity : 0;

    // Rarity
    const rv = rarityMap.get(rarity) ?? { count: 0, value: 0 };
    rv.count += item.quantity;
    rv.value += itemValue;
    rarityMap.set(rarity, rv);

    // Price bucket
    if (price != null) {
      for (let b = 0; b < PRICE_BUCKETS.length; b++) {
        if (price >= PRICE_BUCKETS[b].min && price < PRICE_BUCKETS[b].max) {
          bucketCounts[b] += item.quantity;
          break;
        }
      }
      pricesForMedian.push(price);
      totalValueForAvg += itemValue;
      pricedCardCount += item.quantity;

      allCards.push({
        cardId: item.card_id,
        name: item.card_name,
        imageUrl: item.card_image_url ?? "",
        game,
        price,
      });
    }

    // Game composition
    const gc = gameCompMap.get(game) ?? { count: 0, value: 0 };
    gc.count += item.quantity;
    gc.value += itemValue;
    gameCompMap.set(game, gc);

    // Set composition
    const setKey = `${game}::${set}`;
    const sc = setCompMap.get(setKey) ?? { game, set, count: 0, value: 0 };
    sc.count += item.quantity;
    sc.value += itemValue;
    setCompMap.set(setKey, sc);

    // Condition
    conditionMap.set(condition, (conditionMap.get(condition) ?? 0) + item.quantity);
  }

  // Sort & build results
  const rarityBreakdown = Array.from(rarityMap.entries())
    .map(([rarity, v]) => ({ rarity, ...v }))
    .sort((a, b) => b.value - a.value);

  const priceDistribution = PRICE_BUCKETS.map((b, i) => ({
    range: b.label,
    count: bucketCounts[i],
  }));

  const totalCount = items.reduce((s, i) => s + i.quantity, 0);
  const gameComposition = Array.from(gameCompMap.entries())
    .map(([game, v]) => ({
      game,
      ...v,
      percentage: totalCount > 0 ? Math.round((v.count / totalCount) * 100) : 0,
    }))
    .sort((a, b) => b.value - a.value);

  const setComposition = Array.from(setCompMap.values())
    .sort((a, b) => b.value - a.value)
    .slice(0, 20);

  // Median
  pricesForMedian.sort((a, b) => a - b);
  const median = pricesForMedian.length > 0
    ? pricesForMedian[Math.floor(pricesForMedian.length / 2)]
    : 0;

  // Best gains / worst losses (by unit price, since we only have snapshot prices)
  allCards.sort((a, b) => b.price - a.price);
  const bestGains: CardGainLoss[] = allCards.slice(0, 5).map((c) => ({
    cardId: c.cardId,
    name: c.name,
    imageUrl: c.imageUrl,
    game: c.game,
    addedPrice: c.price,
    currentPrice: c.price,
    changeAbsolute: 0,
    changePct: 0,
  }));

  // For now, worst losses = cheapest cards (gains/losses require price cache for comparison)
  const worstLosses: CardGainLoss[] = allCards.slice(-5).reverse().map((c) => ({
    cardId: c.cardId,
    name: c.name,
    imageUrl: c.imageUrl,
    game: c.game,
    addedPrice: c.price,
    currentPrice: c.price,
    changeAbsolute: 0,
    changePct: 0,
  }));

  const stats: CollectionStats = {
    rarityBreakdown,
    priceDistribution,
    gameComposition,
    setComposition,
    bestGains,
    worstLosses,
    avgCardValue: pricedCardCount > 0 ? Math.round((totalValueForAvg / pricedCardCount) * 100) / 100 : 0,
    medianCardValue: Math.round(median * 100) / 100,
    conditionBreakdown: Array.from(conditionMap.entries())
      .map(([condition, count]) => ({ condition, count }))
      .sort((a, b) => b.count - a.count),
  };

  return NextResponse.json(stats);
}
