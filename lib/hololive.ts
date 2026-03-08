import { CardData } from "@/types";

const HOLOLIVE_IMAGE_BASE = "https://en.hololive-official-cardgame.com";

export interface HololiveRawCard {
  id: number;
  name: string;
  img: string;
  rarity: string;
  color: string;
  card_type: string[];
  products: string[];
  bloom: string;
  cardno: string;
}

export const HOLOLIVE_SET_NAMES: Record<string, string> = {
  // 2024
  hYS01: "Start Cheer Set",
  hSD01: "Starter Deck – Tokino Sora & AZKi",
  hBP01: "Blooming Radiance",
  hSD02: "Starter Deck – Nakiri Ayame",
  hSD03: "Starter Deck – Nekomata Okayu",
  hSD04: "Starter Deck – Yuzuki Choco",
  hBP02: "Quintet Spectrum",
  // 2025
  hSD05: "Starter Deck – Todoroki Hajime",
  hSD06: "Starter Deck – Kazama Iroha",
  hSD07: "Starter Deck – Shiranui Flare",
  hBP03: "Elite Spark",
  hPC01: "Official Holoca Collection",
  hBP04: "Curious Universe",
  hSD2025summer: "Start Deck Set – 2025 Summer",
  hSD08: "Starter Deck – Amane Kanata",
  hSD09: "Starter Deck – Houshou Marine",
  hBP05: "Enchant Legalia",
  hSD10: "Starter Deck – Rindou Chihaya",
  hSD11: "Starter Deck – Toragane Hishoku",
  hBP06: "Ayakashi Vermillion",
  hCS01: "1st Anniversary Celebration Set",
  // 2026
  hSD12: "Starter Deck – Oshi Advent",
  hSD13: "Starter Deck – Oshi Justice",
  hBP07: "Diva Fever",
  // Other
  hPR: "Promo Cards",
};

const COLOR_MAP: Record<string, string> = {
  "白": "White",
  "緑": "Green",
  "赤": "Red",
  "青": "Blue",
  "紫": "Purple",
  "黄": "Yellow",
  "白緑": "White/Green",
  "◇": "Colorless",
};

export function getHololiveImageUrl(imgPath: string): string {
  return `${HOLOLIVE_IMAGE_BASE}${imgPath}`;
}

export function parseHololiveCard(raw: HololiveRawCard): CardData {
  const color = COLOR_MAP[raw.color] ?? raw.color;

  return {
    id: raw.cardno,
    name: raw.name,
    game: "hololive",
    set: HOLOLIVE_SET_NAMES[raw.products[0]] ?? raw.products[0],
    rarity: raw.rarity,
    imageUrl: getHololiveImageUrl(raw.img),
    details: {
      type: raw.card_type.join(" / "),
      ...(color ? { color } : {}),
      ...(raw.bloom ? { bloom: raw.bloom } : {}),
      cardNo: raw.cardno,
    },
  };
}
