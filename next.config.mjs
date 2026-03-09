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
        hostname: "www.optcgapi.com",
      },
      {
        protocol: "https",
        hostname: "api.scrydex.com",
      },
      {
        protocol: "https",
        hostname: "hololive-official-cardgame.com",
      },
    ],
  },
};

export default nextConfig;
