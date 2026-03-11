import { CollectionItem, GAME_LABELS, CONDITION_LABELS, VARIANT_LABELS } from "@/types";
import { getMarketPriceUsd } from "./price-utils";

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportCollectionCsv(items: CollectionItem[]): void {
  const headers = ["Card Name", "Game", "Set", "Rarity", "Condition", "Variant", "Status", "Quantity", "Market Price (USD)", "Total Value (USD)"];

  const rows = items.map((item) => {
    const price = getMarketPriceUsd(item.cardData);
    const total = price != null ? price * item.quantity : null;
    return [
      escapeCsv(item.cardName),
      escapeCsv(GAME_LABELS[item.game] ?? item.game),
      escapeCsv(item.cardSet ?? ""),
      escapeCsv(item.cardRarity ?? ""),
      escapeCsv(CONDITION_LABELS[item.condition] ?? item.condition),
      escapeCsv(VARIANT_LABELS[item.variant] ?? item.variant),
      escapeCsv(item.status),
      String(item.quantity),
      price != null ? price.toFixed(2) : "",
      total != null ? total.toFixed(2) : "",
    ].join(",");
  });

  const csv = "\uFEFF" + [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const date = new Date().toISOString().slice(0, 10);
  const a = document.createElement("a");
  a.href = url;
  a.download = `card-lens-collection-${date}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
