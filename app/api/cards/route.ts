import { NextRequest, NextResponse } from "next/server";
import {
  parsePokemonCard,
  parsePokemonSummary,
  parseOnePieceCard,
  parseOnePieceCardWithHistory,
} from "@/lib/cards-api";
import { CardGame } from "@/types";
import { parseHololiveCard, HololiveRawCard } from "@/lib/hololive";
import { loadAllRiftboundCardsWithRiot, loadAllRiftboundCards } from "@/lib/riftbound";
import { attachHololivePricing, attachHololivePricingBatch, attachRiftboundPricing, attachRiftboundPricingBatch } from "@/lib/tcgcsv-pricing";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import hololiveCardsData from "@/data/hololive-cards.json";

export const dynamic = "force-dynamic";

const hololiveCards = hololiveCardsData as HololiveRawCard[];

export async function GET(request: NextRequest) {
  try {
    // Rate limit: 30 requests per 10 seconds per IP
    const ip = getClientIp(request.headers);
    const rl = rateLimit(`cards:${ip}`, 30, 10_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
      );
    }
    const { searchParams } = new URL(request.url);
    const game = searchParams.get("game") as CardGame | null;
    const query = searchParams.get("query");
    const cardId = searchParams.get("id");

    if (!game) {
      return NextResponse.json(
        { error: "Missing game parameter" },
        { status: 400 }
      );
    }

    if (!["pokemon", "onepiece", "riftbound", "hololive"].includes(game)) {
      return NextResponse.json(
        { error: "Invalid game. Use: pokemon, onepiece, riftbound, hololive" },
        { status: 400 }
      );
    }

    // Validate input lengths to prevent abuse
    if (query && query.length > 200) {
      return NextResponse.json(
        { error: "Query too long (max 200 characters)" },
        { status: 400 }
      );
    }
    if (cardId && cardId.length > 100) {
      return NextResponse.json(
        { error: "Card ID too long (max 100 characters)" },
        { status: 400 }
      );
    }

    // Fetch single card by ID
    if (cardId) {
      let card = null;
      switch (game) {
        case "pokemon": {
          const res = await fetch(
            `https://api.tcgdex.net/v2/en/cards/${encodeURIComponent(cardId)}`,
            { next: { revalidate: 3600 } }
          );
          if (res.ok) {
            const full = await res.json();
            card = parsePokemonCard(full);
          }
          break;
        }
        case "onepiece": {
          // Use twoweeks endpoint for 14-day price history
          const res = await fetch(
            `https://www.optcgapi.com/api/sets/card/twoweeks/${encodeURIComponent(cardId)}/`,
            { next: { revalidate: 3600 } }
          );
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data[0]) card = parseOnePieceCardWithHistory(data[0]);
          }
          break;
        }
        case "riftbound": {
          const { cards: rbAll } = await loadAllRiftboundCardsWithRiot();
          const rbCard = rbAll.find((c) => c.id === cardId) ?? null;
          if (rbCard) {
            // Get tcgplayer ID from local data for price matching
            const rbRaw = await loadAllRiftboundCards();
            const rawMatch = rbRaw.find((r) => r.id === cardId);
            card = await attachRiftboundPricing(rbCard, rawMatch?.tcgplayer?.id);
          }
          break;
        }
        case "hololive": {
          const raw = hololiveCards.find((c) => c.cardno === cardId);
          if (raw) card = await attachHololivePricing(parseHololiveCard(raw));
          break;
        }
      }
      return NextResponse.json({ card });
    }

    if (!query) {
      return NextResponse.json(
        { error: "Missing query or id parameter" },
        { status: 400 }
      );
    }

    let cards: import("@/types").CardData[];

    switch (game) {
      case "pokemon": {
        // TCGdex: search returns summaries, then fetch full details for top results
        const searchRes = await fetch(
          `https://api.tcgdex.net/v2/en/cards?name=${encodeURIComponent(query)}`,
          { next: { revalidate: 3600 } }
        );
        if (!searchRes.ok) {
          cards = [];
          break;
        }
        const summaries = await searchRes.json();
        const top = (summaries as Array<{ id: string; localId: string; name: string; image?: string }>).slice(0, 10);

        // Fetch full details for each card in parallel
        const fullCards = await Promise.all(
          top.map(async (s) => {
            try {
              const detailRes = await fetch(
                `https://api.tcgdex.net/v2/en/cards/${s.id}`,
                { next: { revalidate: 3600 } }
              );
              if (!detailRes.ok) return parsePokemonSummary(s);
              const full = await detailRes.json();
              return parsePokemonCard(full);
            } catch {
              return parsePokemonSummary(s);
            }
          })
        );
        cards = fullCards;
        break;
      }
      case "onepiece": {
        const res = await fetch(
          `https://www.optcgapi.com/api/sets/filtered/?card_name=${encodeURIComponent(query)}`,
          { next: { revalidate: 3600 } }
        );
        if (!res.ok) {
          cards = [];
          break;
        }
        const data = await res.json();
        cards = (Array.isArray(data) ? data : []).slice(0, 10).map(parseOnePieceCard);
        break;
      }
      case "riftbound": {
        const { cards: rbAll } = await loadAllRiftboundCardsWithRiot();
        const q = query.toLowerCase();
        const rbFiltered = rbAll
          .filter((c) => c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q))
          .slice(0, 10);
        // Build tcgplayer ID map from local data
        const rbRawAll = await loadAllRiftboundCards();
        const tcgIds = new Map<string, number>();
        for (const r of rbRawAll) {
          if (r.tcgplayer?.id) tcgIds.set(r.id, r.tcgplayer.id);
        }
        cards = await attachRiftboundPricingBatch(rbFiltered, tcgIds);
        break;
      }
      case "hololive": {
        const q = query.toLowerCase();
        const matches = hololiveCards
          .filter((c) => c.name.toLowerCase().includes(q) || c.cardno.toLowerCase().includes(q))
          .slice(0, 10);
        cards = await attachHololivePricingBatch(matches.map(parseHololiveCard));
        break;
      }
    }

    return NextResponse.json({ cards });
  } catch (err) {
    console.error("Cards API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
