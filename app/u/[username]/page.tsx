import type { Metadata } from "next";
import PublicCollectionClient from "./client";

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  return {
    title: `${username}'s Collection`,
    description: `View ${username}'s trading card collection on Card Lens.`,
    alternates: { canonical: `/u/${username}` },
  };
}

export default async function PublicCollectionPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return <PublicCollectionClient username={username} />;
}
