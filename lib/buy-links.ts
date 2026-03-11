import { CardData } from "@/types";

export interface BuyLinks {
  tcgplayer?: string;
  cardmarket?: string;
}

const TCGPLAYER_GAMES: Record<string, string> = {
  pokemon: "pokemon",
  onepiece: "one-piece-card-game",
  riftbound: "riftbound",
  hololive: "hololive-official-card-game",
};

const CARDMARKET_GAMES: Record<string, string> = {
  pokemon: "Pokemon",
  onepiece: "OnePiece",
};

export function getBuyLinks(card: CardData): BuyLinks {
  const name = encodeURIComponent(card.name.replace(/\s*\([^)]*\)$/, "").trim());
  const links: BuyLinks = {};

  const tcgGame = TCGPLAYER_GAMES[card.game];
  if (tcgGame) {
    links.tcgplayer = `https://www.tcgplayer.com/search/${tcgGame}/product?q=${name}&view=grid`;
  }

  const cmGame = CARDMARKET_GAMES[card.game];
  if (cmGame) {
    links.cardmarket = `https://www.cardmarket.com/en/${cmGame}/Products/Search?searchString=${name}`;
  }

  return links;
}
