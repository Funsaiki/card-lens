import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CardData, CardGame } from "@/types";
import { attachHololivePricingBatch, attachRiftboundPricingBatch } from "@/lib/tcgcsv-pricing";
import {
  parsePokemonCard,
  parseOnePieceCardWithHistory,
} from "@/lib/cards-api";
import { loadAllRiftboundCards } from "@/lib/riftbound";

export const dynamic = "force-dynamic";

/**
 * POST /api/collection/refresh-prices
 * Re-fetches current prices for all cards in the user's collection
 * and updates the card_data JSONB in Supabase.
 */
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch all collection items
  const { data: items, error } = await supabase
    .from("collection_items")
    .select("id, card_id, game, card_data")
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!items || items.length === 0) {
    return NextResponse.json({ ok: true, updated: 0 });
  }

  // Group by game
  const byGame = new Map<CardGame, typeof items>();
  for (const item of items) {
    const game = item.game as CardGame;
    const list = byGame.get(game) ?? [];
    list.push(item);
    byGame.set(game, list);
  }

  let updated = 0;
  const errors: string[] = [];

  // --- Pokemon: re-fetch from TCGdex ---
  const pokemonItems = byGame.get("pokemon") ?? [];
  for (const item of pokemonItems) {
    try {
      const res = await fetch(
        `https://api.tcgdex.net/v2/en/cards/${encodeURIComponent(item.card_id)}`,
        { next: { revalidate: 0 } }
      );
      if (res.ok) {
        const full = await res.json();
        const card = parsePokemonCard(full);
        if (card.pricing) {
          await supabase
            .from("collection_items")
            .update({ card_data: card, updated_at: new Date().toISOString() })
            .eq("id", item.id);
          updated++;
        }
      }
    } catch (err) {
      errors.push(`pokemon:${item.card_id}`);
    }
  }

  // --- One Piece: re-fetch from OPTCG API ---
  const onepieceItems = byGame.get("onepiece") ?? [];
  for (const item of onepieceItems) {
    try {
      const res = await fetch(
        `https://www.optcgapi.com/api/sets/card/twoweeks/${encodeURIComponent(item.card_id)}/`,
        { next: { revalidate: 0 } }
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data[0]) {
          const card = parseOnePieceCardWithHistory(data[0]);
          if (card.pricing) {
            await supabase
              .from("collection_items")
              .update({ card_data: card, updated_at: new Date().toISOString() })
              .eq("id", item.id);
            updated++;
          }
        }
      }
    } catch (err) {
      errors.push(`onepiece:${item.card_id}`);
    }
  }

  // --- Hololive: attach TCGCSV pricing ---
  const hololiveItems = byGame.get("hololive") ?? [];
  if (hololiveItems.length > 0) {
    try {
      const cards = hololiveItems.map((i) => i.card_data as CardData);
      const enriched = await attachHololivePricingBatch(cards);
      for (let i = 0; i < enriched.length; i++) {
        if (enriched[i].pricing) {
          await supabase
            .from("collection_items")
            .update({ card_data: enriched[i], updated_at: new Date().toISOString() })
            .eq("id", hololiveItems[i].id);
          updated++;
        }
      }
    } catch (err) {
      errors.push("hololive:batch");
    }
  }

  // --- Riftbound: attach TCGCSV pricing ---
  const riftboundItems = byGame.get("riftbound") ?? [];
  if (riftboundItems.length > 0) {
    try {
      const cards = riftboundItems.map((i) => i.card_data as CardData);
      const rbRawAll = await loadAllRiftboundCards();
      const tcgIds = new Map<string, number>();
      for (const r of rbRawAll) {
        if (r.tcgplayer?.id) tcgIds.set(r.id, r.tcgplayer.id);
      }
      const enriched = await attachRiftboundPricingBatch(cards, tcgIds);
      for (let i = 0; i < enriched.length; i++) {
        if (enriched[i].pricing) {
          await supabase
            .from("collection_items")
            .update({ card_data: enriched[i], updated_at: new Date().toISOString() })
            .eq("id", riftboundItems[i].id);
          updated++;
        }
      }
    } catch (err) {
      errors.push("riftbound:batch");
    }
  }

  return NextResponse.json({
    ok: true,
    updated,
    total: items.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}
