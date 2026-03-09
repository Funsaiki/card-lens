import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-zinc-800/50 bg-zinc-950">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-zinc-500">
            &copy; {new Date().getFullYear()} Card Lens &mdash; Open source card
            recognition. Licensed under{" "}
            <a
              href="https://opensource.org/licenses/MIT"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-zinc-300 transition-colors"
            >
              MIT
            </a>
            .
          </p>
          <nav className="flex items-center gap-4 text-xs text-zinc-500">
            <Link
              href="/legal"
              className="hover:text-zinc-300 transition-colors"
            >
              Mentions légales
            </Link>
            <span className="text-zinc-700">|</span>
            <Link
              href="/terms"
              className="hover:text-zinc-300 transition-colors"
            >
              CGU
            </Link>
            <span className="text-zinc-700">|</span>
            <Link
              href="/privacy"
              className="hover:text-zinc-300 transition-colors"
            >
              Confidentialité
            </Link>
          </nav>
        </div>
        <p className="text-[10px] text-zinc-600 mt-4 text-center sm:text-left">
          Card Lens n&apos;est affilié à aucun éditeur de jeux de cartes.
          Pokémon est une marque de Nintendo / Creatures Inc. / GAME FREAK Inc.
          Magic: The Gathering est une marque de Wizards of the Coast.
          Yu-Gi-Oh! est une marque de Konami. Hololive est une marque de Cover
          Corp. Tous les noms, logos et images de cartes sont la propriété de
          leurs détenteurs respectifs.
        </p>
      </div>
    </footer>
  );
}
