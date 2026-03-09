import Link from "next/link";
import NavBar from "@/components/NavBar";

const GAMES = [
  {
    id: "pokemon",
    name: "Pokemon TCG",
    description: "Scan Pokemon trading cards",
    color: "from-yellow-500 to-red-500",
    bgHover: "hover:border-yellow-500/50",
    icon: (
      <svg viewBox="0 0 24 24" className="w-10 h-10" fill="currentColor">
        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="12" cy="12" r="3" />
        <line x1="2" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="1.5" />
        <line x1="15" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    id: "magic",
    name: "Magic: The Gathering",
    description: "Scan MTG cards",
    color: "from-purple-500 to-blue-500",
    bgHover: "hover:border-purple-500/50",
    icon: (
      <svg viewBox="0 0 24 24" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    ),
  },
  {
    id: "yugioh",
    name: "Yu-Gi-Oh!",
    description: "Scan Yu-Gi-Oh cards",
    color: "from-orange-500 to-yellow-500",
    bgHover: "hover:border-orange-500/50",
    icon: (
      <svg viewBox="0 0 24 24" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="1.5">
        <polygon points="12,2 15,9 22,9 16.5,14 18.5,21 12,17 5.5,21 7.5,14 2,9 9,9" />
      </svg>
    ),
  },
  {
    id: "hololive",
    name: "Hololive OCG",
    description: "Scan Hololive cards",
    color: "from-cyan-400 to-blue-500",
    bgHover: "hover:border-cyan-400/50",
    icon: (
      <svg viewBox="0 0 24 24" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2L2 12l10 10 10-10L12 2z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
];

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      <NavBar />
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-20">
        <div className="text-center max-w-2xl mx-auto mb-12 animate-fade-in-up">
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-4">
            <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
              Card Lens
            </span>
          </h1>
          <p className="text-lg text-zinc-400 max-w-md mx-auto">
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
              className={`group relative flex flex-col items-center gap-4 p-8 rounded-2xl border border-zinc-800 bg-zinc-900/50 transition-all duration-300 ${game.bgHover} hover:bg-zinc-900 hover:scale-[1.03] hover:-translate-y-1`}
            >
              {/* Gradient glow on hover */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${game.color} opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity`}
              />

              <div className="text-zinc-400 group-hover:text-zinc-200 transition-colors">
                {game.icon}
              </div>
              <div className="text-center">
                <h2 className="font-semibold text-zinc-200 group-hover:text-white transition-colors">
                  {game.name}
                </h2>
                <p className="text-sm text-zinc-500 mt-1">
                  {game.description}
                </p>
              </div>

              {/* Arrow */}
              <svg
                className="w-5 h-5 text-zinc-600 group-hover:text-zinc-400 group-hover:translate-x-1 transition-all"
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
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl text-center">
          <div>
            <p className="text-sm font-medium text-zinc-300">Phone as Camera</p>
            <p className="text-xs text-zinc-500 mt-1">
              Connect via QR code + WebRTC
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-300">Real-time Recognition</p>
            <p className="text-xs text-zinc-500 mt-1">
              Client-side processing, no server needed
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-300">Stream-ready</p>
            <p className="text-xs text-zinc-500 mt-1">
              Works with OBS and screen sharing
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-zinc-600">
        Card Lens &middot; Open source card recognition
      </footer>
    </main>
  );
}
