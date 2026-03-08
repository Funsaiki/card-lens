/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "assets.tcgdex.net",
      },
      {
        protocol: "https",
        hostname: "cards.scryfall.io",
      },
      {
        protocol: "https",
        hostname: "c1.scryfall.com",
      },
      {
        protocol: "https",
        hostname: "images.ygoprodeck.com",
      },
      {
        protocol: "https",
        hostname: "hololive-official-cardgame.com",
      },
    ],
  },
};

export default nextConfig;
