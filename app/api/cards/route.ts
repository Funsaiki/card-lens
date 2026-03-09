import { NextRequest, NextResponse } from "next/server";
import {
  parsePokemonCard,
  parsePokemonSummary,
  parseOnePieceCard,
  parseRiftboundCard,
} from "@/lib/cards-api";
import { CardGame } from "@/types";
import { parseHololiveCard, HololiveRawCard } from "@/lib/hololive";
import hololiveCardsData from "@/data/hololive-cards.json";

export const dynamic = "force-dynamic";

const hololiveCards = hololiveCardsData as HololiveRawCard[];

const SCRYDEX_API_KEY = process.env.SCRYDEX_API_KEY ?? "";
const SCRYDEX_TEAM_ID = process.env.SCRYDEX_TEAM_ID ?? "";

function scrydexHeaders(): HeadersInit {
  const h: HeadersInit = {};
  if (SCRYDEX_API_KEY) h["X-Api-Key"] = SCRYDEX_API_KEY;
  if (SCRYDEX_TEAM_ID) h["X-Team-ID"] = SCRYDEX_TEAM_ID;
  return h;
}

export async function GET(request: NextRequest) {
  try {
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
          const res = await fetch(
            `https://www.optcgapi.com/api/sets/card/${encodeURIComponent(cardId)}/`,
            { next: { revalidate: 3600 } }
          );
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data[0]) card = parseOnePieceCard(data[0]);
          }
          break;
        }
        case "riftbound": {
          const res = await fetch(
            `https://api.scrydex.com/riftbound/v1/cards/${encodeURIComponent(cardId)}?include=prices`,
            { headers: scrydexHeaders(), next: { revalidate: 3600 } }
          );
          if (res.ok) {
            const data = await res.json();
            if (data.data) card = parseRiftboundCard(data.data);
          }
          break;
        }
        case "hololive": {
          const raw = hololiveCards.find((c) => c.cardno === cardId);
          if (raw) card = parseHololiveCard(raw);
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

    let cards;

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
        const res = await fetch(
          `https://api.scrydex.com/riftbound/v1/cards?q=name:${encodeURIComponent(query)}&page_size=10&include=prices`,
          { headers: scrydexHeaders(), next: { revalidate: 3600 } }
        );
        if (!res.ok) {
          cards = [];
          break;
        }
        const data = await res.json();
        cards = (data.data ?? []).map(parseRiftboundCard);
        break;
      }
      case "hololive": {
        const q = query.toLowerCase();
        const matches = hololiveCards
          .filter((c) => c.name.toLowerCase().includes(q) || c.cardno.toLowerCase().includes(q))
          .slice(0, 10);
        cards = matches.map(parseHololiveCard);
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
