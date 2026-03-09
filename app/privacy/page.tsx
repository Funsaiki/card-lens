import Link from "next/link";
import NavBar from "@/components/NavBar";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - Card Lens",
};

export default function PrivacyPage() {
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

        <h1 className="text-3xl font-bold mt-6 mb-2">Privacy Policy</h1>
        <p className="text-xs text-zinc-500 mb-8">
          Last updated: March 9, 2026
        </p>

        <div className="space-y-8 text-sm text-zinc-400 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">
              Introduction
            </h2>
            <p>
              Card Lens respects your privacy. This policy describes what data
              is collected, how it is used, and what your rights are.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">
              Data Collected
            </h2>

            <h3 className="text-sm font-medium text-zinc-300 mt-4 mb-2">
              1. Account data (if you create an account)
            </h3>
            <ul className="list-disc list-inside space-y-1">
              <li>
                Email address and display name (via Google or Discord OAuth)
              </li>
              <li>Profile avatar</li>
            </ul>

            <h3 className="text-sm font-medium text-zinc-300 mt-4 mb-2">
              2. Collection data
            </h3>
            <ul className="list-disc list-inside space-y-1">
              <li>
                Cards added to your collection (name, game, set, rarity,
                condition, notes)
              </li>
            </ul>

            <h3 className="text-sm font-medium text-zinc-300 mt-4 mb-2">
              3. Data processed locally (never sent to our servers)
            </h3>
            <ul className="list-disc list-inside space-y-1">
              <li>
                Camera images &mdash; AI recognition (card identification) runs
                entirely in your browser via TensorFlow.js
              </li>
              <li>
                ML models and embeddings stored in IndexedDB on your device
              </li>
              <li>
                WebRTC video streams (direct peer-to-peer between your devices)
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">
              How We Use Your Data
            </h2>
            <p>Your data is used exclusively to:</p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>Manage your account and authentication</li>
              <li>Store and display your card collection</li>
              <li>Look up card information via third-party APIs</li>
            </ul>
            <p className="mt-2">
              Card Lens does not sell, rent, or share your personal data with
              third parties for commercial purposes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">
              Third-Party Services
            </h2>
            <p>Card Lens interacts with the following services:</p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>
                <strong className="text-zinc-300">Supabase</strong> &mdash;
                authentication and database (cloud-hosted)
              </li>
              <li>
                <strong className="text-zinc-300">Google / Discord</strong>{" "}
                &mdash; OAuth providers for sign-in
              </li>
              <li>
                <strong className="text-zinc-300">
                  TCGdex, Scryfall, YGOProdeck
                </strong>{" "}
                &mdash; public APIs for card data and pricing
              </li>
              <li>
                <strong className="text-zinc-300">PeerJS</strong> &mdash;
                signaling server for WebRTC connections
              </li>
            </ul>
            <p className="mt-2">
              Each third-party service is subject to its own privacy policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">
              Cookies &amp; Local Storage
            </h2>
            <p>Card Lens uses:</p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>
                <strong className="text-zinc-300">
                  Authentication cookies
                </strong>{" "}
                &mdash; managed by Supabase to maintain your session
              </li>
              <li>
                <strong className="text-zinc-300">IndexedDB</strong> &mdash; for
                local storage of ML models and embeddings
              </li>
              <li>
                <strong className="text-zinc-300">localStorage</strong> &mdash;
                for user preferences
              </li>
            </ul>
            <p className="mt-2">
              No advertising or analytics tracking cookies are used.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">
              Data Security
            </h2>
            <p>
              Database records are protected by Supabase Row-Level Security
              (RLS). Each user can only access their own data. All
              communications are encrypted via HTTPS.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">
              Your Rights
            </h2>
            <p>
              In accordance with GDPR and applicable regulations, you have the
              following rights:
            </p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>
                <strong className="text-zinc-300">Access</strong> &mdash; view
                the data we hold about you
              </li>
              <li>
                <strong className="text-zinc-300">Rectification</strong> &mdash;
                correct your personal information
              </li>
              <li>
                <strong className="text-zinc-300">Deletion</strong> &mdash;
                request deletion of your account and data
              </li>
              <li>
                <strong className="text-zinc-300">Portability</strong> &mdash;
                export your collection data
              </li>
            </ul>
            <p className="mt-2">
              To exercise these rights, please open an issue on the{" "}
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

          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">
              Changes
            </h2>
            <p>
              This policy may be updated. Any changes will be published on this
              page with an updated date.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
