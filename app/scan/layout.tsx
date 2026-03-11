import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Scan Cards",
  description: "Point your camera at any Pokemon, One Piece, Riftbound, or Hololive card and get instant recognition with prices and rarity details.",
  alternates: { canonical: "/scan" },
};

export default function ScanLayout({ children }: { children: React.ReactNode }) {
  return children;
}
