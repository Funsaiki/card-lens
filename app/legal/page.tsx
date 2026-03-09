import Link from "next/link";
import NavBar from "@/components/NavBar";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mentions légales - Card Lens",
};

export default function LegalPage() {
  return (
    <main className="min-h-screen flex flex-col">
      <NavBar />
      <div className="flex-1 max-w-3xl mx-auto px-4 py-16">
        <Link
          href="/"
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          &larr; Retour à l&apos;accueil
        </Link>

        <h1 className="text-3xl font-bold mt-6 mb-8">Mentions légales</h1>

        <div className="space-y-8 text-sm text-zinc-400 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">
              Éditeur du site
            </h2>
            <p>
              <strong className="text-zinc-300">Card Lens</strong> est un projet
              open source développé par Johnny Hu (Funsaiki).
            </p>
            <ul className="mt-2 space-y-1">
              <li>
                Dépôt GitHub :{" "}
                <a
                  href="https://github.com/Funsaiki/card-lens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-zinc-300 transition-colors"
                >
                  github.com/Funsaiki/card-lens
                </a>
              </li>
              <li>Licence : MIT</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">
              Hébergement
            </h2>
            <p>
              L&apos;application est hébergée par Vercel Inc., 440 N Barranca
              Ave #4133, Covina, CA 91723, États-Unis.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">
              Propriété intellectuelle
            </h2>
            <p>
              Le code source de Card Lens est distribué sous licence MIT.
              L&apos;utilisation, la copie, la modification et la distribution
              du code source sont autorisées conformément aux termes de cette
              licence.
            </p>
            <p className="mt-2">
              Les noms, logos, images et marques commerciales des jeux de cartes
              à collectionner mentionnés sur ce site sont la propriété exclusive
              de leurs détenteurs respectifs :
            </p>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>
                <strong className="text-zinc-300">Pokémon</strong> — Nintendo /
                Creatures Inc. / GAME FREAK Inc.
              </li>
              <li>
                <strong className="text-zinc-300">
                  Magic: The Gathering
                </strong>{" "}
                — Wizards of the Coast LLC
              </li>
              <li>
                <strong className="text-zinc-300">Yu-Gi-Oh!</strong> — Konami
                Digital Entertainment
              </li>
              <li>
                <strong className="text-zinc-300">Hololive OCG</strong> — Cover
                Corp.
              </li>
            </ul>
            <p className="mt-2">
              Card Lens n&apos;est ni affilié, ni sponsorisé, ni approuvé par
              aucun de ces éditeurs.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">
              Données de prix
            </h2>
            <p>
              Les informations de prix affichées proviennent d&apos;API tierces
              (TCGdex, Scryfall, YGOProdeck) et sont fournies à titre indicatif
              uniquement. Card Lens ne garantit ni l&apos;exactitude ni
              l&apos;exhaustivité de ces données et ne saurait être tenu
              responsable de toute décision prise sur la base de ces
              informations.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">
              Limitation de responsabilité
            </h2>
            <p>
              Card Lens est fourni « tel quel », sans garantie d&apos;aucune
              sorte. L&apos;éditeur ne saurait être tenu responsable des
              dommages directs ou indirects résultant de l&apos;utilisation ou de
              l&apos;impossibilité d&apos;utiliser le service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">
              Contact
            </h2>
            <p>
              Pour toute question relative au site, veuillez ouvrir une issue
              sur le{" "}
              <a
                href="https://github.com/Funsaiki/card-lens/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-zinc-300 transition-colors"
              >
                dépôt GitHub
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
