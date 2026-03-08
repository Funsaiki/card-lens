import { NextRequest } from "next/server";

const ALLOWED_HOSTS = [
  "en.hololive-official-cardgame.com",
  "hololive-official-cardgame.com",
];

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return new Response("Missing url parameter", { status: 400 });
  }

  try {
    const parsed = new URL(url);
    if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
      return new Response("Domain not allowed", { status: 403 });
    }

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": `https://${parsed.hostname}/`,
        "Accept": "image/webp,image/png,image/*,*/*;q=0.8",
      },
    });

    if (!res.ok) {
      return new Response("Upstream error", { status: res.status });
    }

    const buffer = await res.arrayBuffer();

    return new Response(buffer, {
      headers: {
        "Content-Type": res.headers.get("Content-Type") || "image/png",
        "Cache-Control": "public, max-age=86400, immutable",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return new Response("Failed to fetch image", { status: 500 });
  }
}
