import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// POST /api/collection/bulk-delete — Delete multiple collection items
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { ids } = body;

  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 500) {
    return NextResponse.json({ error: "ids must be an array of 1-500 items" }, { status: 400 });
  }

  if (!ids.every((id: unknown) => typeof id === "string")) {
    return NextResponse.json({ error: "All ids must be strings" }, { status: 400 });
  }

  const { error, count } = await supabase
    .from("collection_items")
    .delete({ count: "exact" })
    .eq("user_id", user.id)
    .in("id", ids);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, deleted: count ?? ids.length });
}
