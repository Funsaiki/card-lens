import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { VALID_GAMES, VALID_CONDITIONS, VALID_VARIANTS, VALID_STATUSES, MAX_QUANTITY } from "@/types";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const MAX_IMPORT_ITEMS = 2000;

// POST /api/collection/import — Bulk import cards
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = rateLimit(`import:${user.id}`, 5, 3600_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many imports. Try again later." }, { status: 429 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { items } = body;
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "No items to import" }, { status: 400 });
  }
  if (items.length > MAX_IMPORT_ITEMS) {
    return NextResponse.json({ error: `Maximum ${MAX_IMPORT_ITEMS} items per import` }, { status: 400 });
  }

  // Validate all items
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item.cardName || !item.game) {
      return NextResponse.json({ error: `Item ${i + 1}: missing card name or game` }, { status: 400 });
    }
    if (!(VALID_GAMES as readonly string[]).includes(item.game)) {
      return NextResponse.json({ error: `Item ${i + 1}: invalid game "${item.game}"` }, { status: 400 });
    }
    if (item.condition && !(VALID_CONDITIONS as readonly string[]).includes(item.condition)) {
      items[i].condition = "near_mint";
    }
    if (item.variant && !(VALID_VARIANTS as readonly string[]).includes(item.variant)) {
      items[i].variant = "normal";
    }
    if (item.status && !(VALID_STATUSES as readonly string[]).includes(item.status)) {
      items[i].status = "owned";
    }
    const qty = parseInt(item.quantity, 10);
    if (isNaN(qty) || qty < 1 || qty > MAX_QUANTITY) {
      items[i].quantity = 1;
    } else {
      items[i].quantity = qty;
    }
  }

  // Build insert rows
  const rows = items.map((item: Record<string, string | number>) => ({
    user_id: user.id,
    card_id: item.cardId || `import-${item.cardName}-${item.game}`.replace(/\s+/g, "-").toLowerCase(),
    game: item.game,
    card_name: item.cardName,
    card_set: item.cardSet || null,
    card_rarity: item.cardRarity || null,
    card_image_url: item.cardImageUrl || null,
    card_data: {
      id: item.cardId || "",
      name: item.cardName,
      game: item.game,
      set: item.cardSet || "",
      rarity: item.cardRarity || "",
      imageUrl: item.cardImageUrl || "",
      details: {},
    },
    quantity: item.quantity,
    condition: item.condition || "near_mint",
    variant: item.variant || "normal",
    status: item.status || "owned",
  }));

  // Use upsert: on conflict (user_id, card_id, game, variant, status) increment quantity
  let imported = 0;
  let errors = 0;

  // Process in batches of 100
  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100);
    const { error } = await supabase.from("collection_items").upsert(batch, {
      onConflict: "user_id,card_id,game,variant,status",
      ignoreDuplicates: false,
    });
    if (error) {
      console.error("[Import] batch error:", error);
      errors += batch.length;
    } else {
      imported += batch.length;
    }
  }

  return NextResponse.json({ ok: true, imported, errors });
}
