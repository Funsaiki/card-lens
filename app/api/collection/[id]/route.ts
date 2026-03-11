import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { VALID_CONDITIONS, VALID_VARIANTS, MAX_QUANTITY } from "@/types";

export const dynamic = "force-dynamic";

// PATCH /api/collection/[id] — Update quantity, condition, or notes
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.quantity !== undefined) {
    if (typeof body.quantity !== "number" || !Number.isInteger(body.quantity) || body.quantity < 1 || body.quantity > MAX_QUANTITY) {
      return NextResponse.json({ error: "Invalid quantity" }, { status: 400 });
    }
    updates.quantity = body.quantity;
  }
  if (body.condition !== undefined) {
    if (!(VALID_CONDITIONS as readonly string[]).includes(body.condition)) {
      return NextResponse.json({ error: "Invalid condition" }, { status: 400 });
    }
    updates.condition = body.condition;
  }
  if (body.variant !== undefined) {
    if (!(VALID_VARIANTS as readonly string[]).includes(body.variant)) {
      return NextResponse.json({ error: "Invalid variant" }, { status: 400 });
    }
    updates.variant = body.variant;
  }
  if (body.notes !== undefined) {
    if (typeof body.notes !== "string" || body.notes.length > 1000) {
      return NextResponse.json({ error: "Notes must be a string under 1000 characters" }, { status: 400 });
    }
    updates.notes = body.notes;
  }

  const { error } = await supabase
    .from("collection_items")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("[Collection] PATCH error:", error);
    return NextResponse.json({ error: "Failed to update card" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// DELETE /api/collection/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const { error } = await supabase
    .from("collection_items")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("[Collection] DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete card" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
