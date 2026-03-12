import * as XLSX from "xlsx";
import { CollectionItem, GAME_LABELS, CONDITION_LABELS, VARIANT_LABELS, CardGame } from "@/types";
import { getMarketPriceUsd } from "./price-utils";

const HEADERS = ["Card ID", "Card Name", "Set", "Rarity", "Condition", "Variant", "Status", "Quantity", "Market Price (USD)", "Total Value (USD)"];

function itemToRow(item: CollectionItem): (string | number | null)[] {
  const price = getMarketPriceUsd(item.cardData);
  const total = price != null ? price * item.quantity : null;
  return [
    item.cardId,
    item.cardName,
    item.cardSet ?? "",
    item.cardRarity ?? "",
    CONDITION_LABELS[item.condition] ?? item.condition,
    VARIANT_LABELS[item.variant] ?? item.variant,
    item.status,
    item.quantity,
    price != null ? +price.toFixed(2) : null,
    total != null ? +total.toFixed(2) : null,
  ];
}

export function exportCollectionXlsx(items: CollectionItem[]): void {
  const wb = XLSX.utils.book_new();

  // Group items by game
  const byGame = new Map<CardGame, CollectionItem[]>();
  for (const item of items) {
    const list = byGame.get(item.game) ?? [];
    list.push(item);
    byGame.set(item.game, list);
  }

  // Create one sheet per game
  for (const [game, gameItems] of byGame) {
    const data = [HEADERS, ...gameItems.map(itemToRow)];
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Auto-size columns
    ws["!cols"] = HEADERS.map((h, i) => {
      const maxLen = Math.max(h.length, ...gameItems.map((item) => String(itemToRow(item)[i] ?? "").length));
      return { wch: Math.min(maxLen + 2, 40) };
    });

    XLSX.utils.book_append_sheet(wb, ws, (GAME_LABELS[game] ?? game).slice(0, 31));
  }

  // If no items, create an empty sheet
  if (byGame.size === 0) {
    const ws = XLSX.utils.aoa_to_sheet([HEADERS]);
    XLSX.utils.book_append_sheet(wb, ws, "Collection");
  }

  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `card-lens-collection-${date}.xlsx`);
}
