import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Collection",
  description: "Track your trading card collection across Pokemon, One Piece, Riftbound, and Hololive. View portfolio value, prices, and manage your wishlist.",
  alternates: { canonical: "/collection" },
};

export default function CollectionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
