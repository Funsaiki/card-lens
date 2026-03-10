import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PortfolioHistory, PortfolioSnapshot } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const days = Math.min(Math.max(7, parseInt(searchParams.get("days") ?? "30", 10) || 30), 365);
  const game = searchParams.get("game");

  let query = supabase
    .from("portfolio_snapshots")
    .select("snapshot_date, total_value_usd, card_count")
    .eq("user_id", user.id)
    .gte("snapshot_date", new Date(Date.now() - days * 86400000).toISOString().slice(0, 10))
    .order("snapshot_date", { ascending: true });

  if (game) {
    query = query.eq("game", game);
  } else {
    // '_total' is the sentinel for the aggregate row (not NULL — see snapshot route)
    query = query.eq("game", "_total");
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const snapshots: PortfolioSnapshot[] = (data ?? []).map((row) => ({
    date: row.snapshot_date,
    value: row.total_value_usd,
    cardCount: row.card_count,
  }));

  let change = { absolute: 0, percentage: 0, period: `${days}d` };
  if (snapshots.length >= 2) {
    const first = snapshots[0].value;
    const last = snapshots[snapshots.length - 1].value;
    change = {
      absolute: Math.round((last - first) * 100) / 100,
      percentage: first > 0 ? Math.round(((last - first) / first) * 10000) / 100 : 0,
      period: `${days}d`,
    };
  }

  const history: PortfolioHistory = { snapshots, change };
  return NextResponse.json(history);
}
