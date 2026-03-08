import { NextRequest, NextResponse } from "next/server";
import {
  parsePokemonCard,
  parsePokemonSummary,
  parseMagicCard,
  parseYugiohCard,
} from "@/lib/cards-api";
import { CardGame } from "@/types";

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

    if (!["pokemon", "magic", "yugioh"].includes(game)) {
      return NextResponse.json(
        { error: "Invalid game. Use: pokemon, magic, yugioh" },
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
        case "magic": {
          const res = await fetch(
            `https://api.scryfall.com/cards/${encodeURIComponent(cardId)}`,
            { next: { revalidate: 3600 } }
          );
          if (res.ok) {
            const full = await res.json();
            card = parseMagicCard(full);
          }
          break;
        }
        case "yugioh": {
          const res = await fetch(
            `https://db.ygoprodeck.com/api/v7/cardinfo.php?id=${encodeURIComponent(cardId)}`,
            { next: { revalidate: 3600 } }
          );
          if (res.ok) {
            const data = await res.json();
            if (data.data?.[0]) card = parseYugiohCard(data.data[0]);
          }
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
      case "magic": {
        const res = await fetch(
          `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&unique=prints`,
          { next: { revalidate: 3600 } }
        );
        if (!res.ok) {
          cards = [];
          break;
        }
        const data = await res.json();
        cards = (data.data ?? []).slice(0, 10).map(parseMagicCard);
        break;
      }
      case "yugioh": {
        const res = await fetch(
          `https://db.ygoprodeck.com/api/v7/cardinfo.php?fname=${encodeURIComponent(query)}`,
          { next: { revalidate: 3600 } }
        );
        if (!res.ok) {
          cards = [];
          break;
        }
        const data = await res.json();
        cards = (data.data ?? []).slice(0, 10).map(parseYugiohCard);
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
