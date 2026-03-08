import { NextResponse } from "next/server";
import hololiveCardsData from "@/data/hololive-cards.json";

export async function GET() {
  return NextResponse.json(hololiveCardsData, {
    headers: {
      "Cache-Control": "public, max-age=86400",
    },
  });
}
