import * as XLSX from "xlsx";
import { CardGame, CardCondition, CardVariant, CollectionStatus, GAME_LABELS, CONDITION_LABELS, VARIANT_LABELS, ImportItem } from "@/types";

// Reverse lookup maps
const GAME_BY_LABEL = Object.fromEntries(
  Object.entries(GAME_LABELS).map(([k, v]) => [v.toLowerCase(), k])
) as Record<string, CardGame>;

const CONDITION_BY_LABEL = Object.fromEntries(
  Object.entries(CONDITION_LABELS).map(([k, v]) => [v.toLowerCase(), k])
) as Record<string, CardCondition>;

const VARIANT_BY_LABEL = Object.fromEntries(
  Object.entries(VARIANT_LABELS).map(([k, v]) => [v.toLowerCase(), k])
) as Record<string, CardVariant>;

// TCGPlayer condition mapping
const TCGPLAYER_CONDITIONS: Record<string, CardCondition> = {
  "near mint": "near_mint",
  "lightly played": "lightly_played",
  "moderately played": "moderately_played",
  "heavily played": "heavily_played",
  "damaged": "damaged",
  "mint": "mint",
};

export type ImportFormat = "cardlens" | "tcgplayer" | "unknown";

export function detectFormat(wb: XLSX.WorkBook): ImportFormat {
  const firstSheet = wb.Sheets[wb.SheetNames[0]];
  if (!firstSheet) return "unknown";
  const rows = XLSX.utils.sheet_to_json<string[]>(firstSheet, { header: 1 });
  if (rows.length === 0) return "unknown";
  const header = rows[0].map((h) => String(h).toLowerCase().trim());

  // Card Lens format: "Card ID", "Card Name", "Set", "Rarity", "Condition", ...
  if (header.includes("card name") && header.includes("variant") && header.includes("status")) {
    return "cardlens";
  }
  // TCGPlayer: "Quantity", "Name", "Simple Name", "Set", "Card Number", "Condition", ...
  if (header.includes("quantity") && header.includes("simple name") && header.includes("card number")) {
    return "tcgplayer";
  }
  // Also Card Lens if sheet names match game labels
  if (wb.SheetNames.some((name) => Object.values(GAME_LABELS).includes(name))) {
    return "cardlens";
  }
  return "unknown";
}

export function parseCardLensWorkbook(wb: XLSX.WorkBook): ImportItem[] {
  const items: ImportItem[] = [];

  for (const sheetName of wb.SheetNames) {
    // Determine game from sheet name
    const game = (GAME_BY_LABEL[sheetName.toLowerCase()] ??
      Object.keys(GAME_LABELS).find((k) => k === sheetName.toLowerCase())) as CardGame | undefined;
    if (!game) continue;

    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, string | number>>(sheet);

    for (const row of rows) {
      const cardName = String(row["Card Name"] ?? "").trim();
      if (!cardName) continue;

      const conditionStr = String(row["Condition"] ?? "").toLowerCase().trim();
      const variantStr = String(row["Variant"] ?? "").toLowerCase().trim();
      const statusStr = String(row["Status"] ?? "owned").toLowerCase().trim();

      items.push({
        cardId: String(row["Card ID"] ?? `import-${cardName}-${game}`).replace(/\s+/g, "-").toLowerCase(),
        game,
        cardName,
        cardSet: String(row["Set"] ?? ""),
        cardRarity: String(row["Rarity"] ?? ""),
        cardImageUrl: "",
        quantity: Math.max(1, parseInt(String(row["Quantity"] ?? "1"), 10) || 1),
        condition: CONDITION_BY_LABEL[conditionStr] ?? (conditionStr as CardCondition) ?? "near_mint",
        variant: VARIANT_BY_LABEL[variantStr] ?? (variantStr as CardVariant) ?? "normal",
        status: (statusStr === "wanted" ? "wanted" : "owned") as CollectionStatus,
      });
    }
  }
  return items;
}

export function parseTCGPlayerWorkbook(wb: XLSX.WorkBook, game: CardGame): ImportItem[] {
  const items: ImportItem[] = [];
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return items;

  const rows = XLSX.utils.sheet_to_json<Record<string, string | number>>(sheet);

  for (const row of rows) {
    const cardName = String(row["Name"] ?? row["Simple Name"] ?? "").trim();
    if (!cardName) continue;

    const conditionStr = String(row["Condition"] ?? "").toLowerCase().trim();
    const setName = String(row["Set"] ?? "");
    const cardNo = String(row["Card Number"] ?? "");

    items.push({
      cardId: cardNo ? `${cardNo}-${game}` : `import-${cardName}-${game}`.replace(/\s+/g, "-").toLowerCase(),
      game,
      cardName,
      cardSet: setName,
      cardRarity: String(row["Rarity"] ?? ""),
      cardImageUrl: "",
      quantity: Math.max(1, parseInt(String(row["Quantity"] ?? "1"), 10) || 1),
      condition: TCGPLAYER_CONDITIONS[conditionStr] ?? "near_mint",
      variant: "normal",
      status: "owned",
    });
  }
  return items;
}
