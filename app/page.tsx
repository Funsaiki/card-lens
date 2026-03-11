import type { Metadata } from "next";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Card Lens - Recognize Trading Cards Instantly",
  description: "Scan Pokemon, One Piece, Riftbound, and Hololive cards with your camera. Get instant prices, rarity info, and build your collection for free.",
  alternates: { canonical: "/" },
};

const GAMES = [
  {
    id: "pokemon",
    name: "Pokemon TCG",
    description: "Identify and price your Pokemon cards",
    gradient: "from-amber-400 via-orange-500 to-red-500",
    glow: "group-hover:shadow-orange-500/20",
    icon: (
      /* Pokeball */
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h7.5m5 0H22" />
        <circle cx="12" cy="12" r="3" />
        <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    id: "onepiece",
    name: "One Piece TCG",
    description: "Identify and price your One Piece cards",
    gradient: "from-red-500 via-rose-500 to-pink-500",
    glow: "group-hover:shadow-red-500/20",
    icon: (
      /* One Piece — Straw Hat */
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.5">
        <ellipse cx="12" cy="14" rx="7" ry="3.5" />
        <path d="M5 14c0-3 3.1-7 7-7s7 4 7 7" />
        <path d="M3 14.5c0 0 1.5 1 9 1s9-1 9-1" strokeWidth="1.2" />
        <line x1="12" y1="7" x2="12" y2="10.5" strokeWidth="1" />
        <ellipse cx="12" cy="14" rx="9.5" ry="1.2" strokeWidth="2" />
      </svg>
    ),
  },
  {
    id: "riftbound",
    name: "Riftbound",
    description: "Browse your League of Legends cards",
    gradient: "from-emerald-400 via-teal-500 to-cyan-500",
    glow: "group-hover:shadow-emerald-500/20",
    icon: (
      /* Riftbound — Hextech crystal */
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2L20 8v8l-8 6-8-6V8z" />
        <path d="M12 6l4.5 3v6L12 18l-4.5-3V9z" strokeWidth="1" />
        <line x1="12" y1="2" x2="12" y2="6" strokeWidth="0.8" />
        <line x1="20" y1="8" x2="16.5" y2="9" strokeWidth="0.8" />
        <line x1="20" y1="16" x2="16.5" y2="15" strokeWidth="0.8" />
        <line x1="12" y1="22" x2="12" y2="18" strokeWidth="0.8" />
        <line x1="4" y1="16" x2="7.5" y2="15" strokeWidth="0.8" />
        <line x1="4" y1="8" x2="7.5" y2="9" strokeWidth="0.8" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    id: "hololive",
    name: "Hololive OCG",
    description: "Browse and identify your Hololive cards",
    gradient: "from-cyan-400 via-sky-500 to-blue-500",
    glow: "group-hover:shadow-cyan-500/20",
    icon: (
      /* Cover Corp — play triangle with fold */
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 4.5a1.5 1.5 0 0 1 2.2-.3L19.8 11a1.5 1.5 0 0 1 0 2.4L8.2 19.8a1.5 1.5 0 0 1-2.2-1.2V4.5z" />
      </svg>
    ),
  },
];

const FEATURES = [
  {
    title: "Use Your Phone",
    description: "Scan a QR code to stream your phone camera",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
      </svg>
    ),
  },
  {
    title: "Instant Recognition",
    description: "AI runs in your browser, no data sent anywhere",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
  },
  {
    title: "Prices & Details",
    description: "See market value and rarity for every card",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Card Lens",
  description: "Recognize trading cards in real-time using your camera. Get instant prices, rarity, and details.",
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  featureList: [
    "Real-time card recognition",
    "Pokemon TCG support",
    "One Piece TCG support",
    "Riftbound support",
    "Hololive OCG support",
    "Price lookup",
    "Collection tracking",
    "Wishlist management",
    "CSV export",
  ],
};

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <NavBar />

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-20">
        <div className="text-center max-w-2xl mx-auto mb-14 animate-fade-in-up">
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-5">
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
              Card Lens
            </span>
          </h1>
          <p className="text-lg text-[var(--muted)] max-w-md mx-auto leading-relaxed">
            Recognize trading cards in real-time using your camera.
            Get instant prices, rarity, and details.
          </p>
        </div>

        {/* Game selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-4xl">
          {GAMES.map((game) => (
            <Link
              key={game.id}
              href={`/scan?game=${game.id}`}
              className={`group relative flex flex-col items-center gap-4 p-7 rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm transition-all duration-300 hover:bg-white/[0.05] hover:border-white/[0.1] hover:scale-[1.03] hover:-translate-y-1 hover:shadow-xl ${game.glow}`}
            >
              {/* Gradient glow on hover */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${game.gradient} opacity-0 group-hover:opacity-[0.07] rounded-2xl transition-opacity duration-300`}
              />

              <div className="relative text-white">
                {game.icon}
              </div>
              <div className="relative text-center">
                <h2 className="font-semibold text-zinc-200 group-hover:text-white transition-colors">
                  {game.name}
                </h2>
                <p className="text-sm text-[var(--muted)] mt-1">
                  {game.description}
                </p>
              </div>

              {/* Arrow */}
              <svg
                className="relative w-5 h-5 text-zinc-600 group-hover:text-zinc-400 group-hover:translate-x-1 transition-all"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </Link>
          ))}
        </div>

        {/* Features */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-3xl w-full">
          {FEATURES.map((feat) => (
            <div key={feat.title} className="flex flex-col items-center text-center gap-2 p-4 rounded-xl border border-white/[0.04] bg-white/[0.02]">
              <div className="text-indigo-400">{feat.icon}</div>
              <p className="text-sm font-medium text-zinc-300">{feat.title}</p>
              <p className="text-xs text-[var(--muted)]">{feat.description}</p>
            </div>
          ))}
        </div>
      </div>

      <Footer />
    </main>
  );
}
