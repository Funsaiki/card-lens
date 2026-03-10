import { NextRequest, NextResponse } from "next/server";
import {
  loadRiftboundSets,
  loadRiftboundCards,
  RiftboundRawCard,
} from "@/lib/riftbound";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const setId = searchParams.get("set");

  try {
    // Return sets list
    if (!setId) {
      const sets = await loadRiftboundSets();
      return NextResponse.json(sets);
    }

    // Return cards for a specific set
    const cards = await loadRiftboundCards(setId);
    return NextResponse.json(
      cards.map((c: RiftboundRawCard) => ({
        id: c.id,
        name: c.name,
        image: c.images?.large ?? c.images?.small ?? "",
        set: c.set?.name ?? "",
      }))
    );
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
