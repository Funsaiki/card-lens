import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
  const body = await request.json();
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  const VALID_CONDITIONS = ["mint", "near_mint", "excellent", "good", "light_played", "played", "poor"];

  if (body.quantity !== undefined) {
    if (typeof body.quantity !== "number" || !Number.isInteger(body.quantity) || body.quantity < 1 || body.quantity > 9999) {
      return NextResponse.json({ error: "Invalid quantity" }, { status: 400 });
    }
    updates.quantity = body.quantity;
  }
  if (body.condition !== undefined) {
    if (!VALID_CONDITIONS.includes(body.condition)) {
      return NextResponse.json({ error: "Invalid condition" }, { status: 400 });
    }
    updates.condition = body.condition;
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
    return NextResponse.json({ error: error.message }, { status: 500 });
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
