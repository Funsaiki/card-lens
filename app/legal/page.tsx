import Link from "next/link";
import NavBar from "@/components/NavBar";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Legal Notice - Card Lens",
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
          &larr; Back to home
        </Link>

        <h1 className="text-3xl font-bold mt-6 mb-8">Legal Notice</h1>

        <div className="space-y-8 text-sm text-zinc-400 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">
              Publisher
            </h2>
            <p>
              <strong className="text-zinc-300">Card Lens</strong> is developed
              and maintained by Johnny Hu (Funsaiki).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">
              Hosting
            </h2>
            <p>
              This application is hosted by Vercel Inc., 440 N Barranca Ave
              #4133, Covina, CA 91723, United States.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">
              Intellectual Property
            </h2>
            <p>
              The source code of Card Lens is released under the{" "}
              <a
                href="https://github.com/Funsaiki/card-lens/blob/master/LICENSE"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-zinc-300 transition-colors"
              >
                MIT License
              </a>
              . You are free to use, modify, and distribute the code under the
              terms of this license.
            </p>
            <p className="mt-2">
              The names, logos, images, and trademarks of the trading card games
              referenced on this site are the exclusive property of their
              respective owners:
            </p>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>
                <strong className="text-zinc-300">Pok&eacute;mon</strong>{" "}
                &mdash; Nintendo / Creatures Inc. / GAME FREAK Inc.
              </li>
              <li>
                <strong className="text-zinc-300">One Piece</strong> &mdash;
                Shueisha / Toei Animation / Bandai
              </li>
              <li>
                <strong className="text-zinc-300">
                  Riftbound / League of Legends
                </strong>{" "}
                &mdash; Riot Games, Inc.
              </li>
              <li>
                <strong className="text-zinc-300">Hololive OCG</strong> &mdash;
                Cover Corp.
              </li>
            </ul>
            <p className="mt-2">
              Card Lens is not affiliated with, sponsored by, or endorsed by any
              of these publishers.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">
              Pricing Data
            </h2>
            <p>
              Pricing information displayed is sourced from third-party APIs
              (TCGdex, OPTCG API, Scrydex) and is provided for informational
              purposes only. Card Lens does not guarantee the accuracy or
              completeness of this data and shall not be held responsible for any
              decisions made based on this information.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">
              Limitation of Liability
            </h2>
            <p>
              Card Lens is provided &ldquo;as is&rdquo; without warranty of any
              kind. The publisher shall not be held liable for any direct or
              indirect damages resulting from the use or inability to use the
              service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">
              Contact
            </h2>
            <p>
              For any inquiries regarding this site, please open an issue on the{" "}
              <a
                href="https://github.com/Funsaiki/card-lens/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-zinc-300 transition-colors"
              >
                GitHub repository
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
