import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-white/[0.04]">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[var(--muted)]">
            &copy; {new Date().getFullYear()} Card Lens. Licensed under MIT.
          </p>
          <nav className="flex items-center gap-4 text-xs text-[var(--muted)]">
            <Link href="/legal" className="hover:text-zinc-300 transition-colors">
              Legal Notice
            </Link>
            <span className="text-white/10">|</span>
            <Link href="/terms" className="hover:text-zinc-300 transition-colors">
              Terms of Use
            </Link>
            <span className="text-white/10">|</span>
            <Link href="/privacy" className="hover:text-zinc-300 transition-colors">
              Privacy
            </Link>
          </nav>
        </div>
        <p className="text-[10px] text-zinc-600 mt-4 text-center sm:text-left">
          Card Lens is not affiliated with any trading card game publisher.
          Pok&eacute;mon is a trademark of Nintendo / Creatures Inc. / GAME
          FREAK Inc. One Piece is a trademark of Shueisha / Toei Animation /
          Bandai. Riftbound and League of Legends are trademarks of Riot Games.
          Hololive is a trademark of Cover Corp. All names, logos, and card
          images are property of their respective owners.
        </p>
      </div>
    </footer>
  );
}
