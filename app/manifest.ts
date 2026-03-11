import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Card Lens - Trading Card Recognition",
    short_name: "Card Lens",
    description: "Recognize trading cards in real-time. Get instant prices, rarity, and details for Pokemon, One Piece, Riftbound, and Hololive cards.",
    start_url: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#6366f1",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
