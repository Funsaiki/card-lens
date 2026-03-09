import Link from "next/link";
import NavBar from "@/components/NavBar";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Use - Card Lens",
};

export default function TermsPage() {
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

        <h1 className="text-3xl font-bold mt-6 mb-2">Terms of Use</h1>
        <p className="text-xs text-zinc-500 mb-8">
          Last updated: March 9, 2026
        </p>

        <div className="space-y-8 text-sm text-zinc-400 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">
              1. Purpose
            </h2>
            <p>
              These Terms of Use govern access to and use of Card Lens, a
              real-time trading card recognition web application.
            </p>
            <p className="mt-2">
              By using Card Lens, you agree to these Terms in their entirety. If
              you do not accept these terms, please do not use the service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">
              2. Service Description
            </h2>
            <p>Card Lens provides the following features:</p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>
                Trading card recognition (Pok&eacute;mon, Magic: The Gathering,
                Yu-Gi-Oh!, Hololive OCG) via your device&apos;s camera
              </li>
              <li>
                Display of card information (name, set, rarity) and indicative
                pricing
              </li>
              <li>Personal card collection management (with an account)</li>
              <li>Phone camera connection via WebRTC</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">
              3. Access
            </h2>
            <p>
              Access to Card Lens is free. Some features (collection management)
              require creating an account via Google or Discord.
            </p>
            <p className="mt-2">
              The publisher reserves the right to modify, suspend, or
              discontinue all or part of the service at any time, without notice
              or compensation.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">
              4. User Account
            </h2>
            <p>
              By creating an account, you agree to provide accurate information.
              You are responsible for maintaining the confidentiality of your
              login credentials and for all activity under your account.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">
              5. Acceptable Use
            </h2>
            <p>You agree not to:</p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>Use the service for illegal or unauthorized purposes</li>
              <li>
                Attempt to bypass or circumvent the service&apos;s security
                measures
              </li>
              <li>
                Deliberately overload the servers or third-party APIs
              </li>
              <li>
                Reproduce, redistribute, or commercially exploit pricing data
                obtained through the service without authorization from the
                original providers
              </li>
              <li>
                Use automated scripts to access the service at scale
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">
              6. Intellectual Property
            </h2>
            <p>
              All content, code, design, and features of Card Lens are the
              exclusive property of the publisher. All rights reserved. No part
              of this application may be reproduced, distributed, or modified
              without prior written consent.
            </p>
            <p className="mt-2">
              The images, names, and trademarks of trading card games displayed
              through the service belong to their respective owners (Nintendo /
              Creatures Inc. / GAME FREAK Inc., Wizards of the Coast, Konami,
              Cover Corp.). These elements are displayed for identification
              purposes only.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">
              7. Pricing Information
            </h2>
            <p>
              Prices displayed are provided for informational purposes only by
              third-party APIs (TCGdex, Scryfall, YGOProdeck). Card Lens does
              not guarantee the accuracy, completeness, or timeliness of this
              data. Prices may vary based on market conditions, card condition,
              and other factors.
            </p>
            <p className="mt-2">
              Card Lens shall not be held liable for any financial loss
              resulting from decisions based on displayed prices.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">
              8. Limitation of Liability
            </h2>
            <p>
              Card Lens is provided &ldquo;as is&rdquo; and &ldquo;as
              available&rdquo; without any warranty, express or implied. The
              publisher does not guarantee:
            </p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>
                The accuracy of card recognition by the artificial intelligence
              </li>
              <li>Continuous and uninterrupted availability of the service</li>
              <li>The accuracy of pricing or rarity information</li>
            </ul>
            <p className="mt-2">
              In no event shall the publisher be liable for any direct,
              indirect, incidental, or consequential damages resulting from the
              use of the service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">
              9. Data Protection
            </h2>
            <p>
              The use of your personal data is governed by our{" "}
              <Link
                href="/privacy"
                className="underline hover:text-zinc-300 transition-colors"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">
              10. Changes to These Terms
            </h2>
            <p>
              The publisher reserves the right to modify these Terms at any
              time. Changes take effect upon publication on this page. You are
              advised to review this page regularly.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">
              11. Governing Law
            </h2>
            <p>
              These Terms are governed by French law. In the event of a dispute,
              the parties agree to seek an amicable resolution before taking
              legal action.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">
              12. Contact
            </h2>
            <p>
              For any questions regarding these Terms, please open an issue on
              the{" "}
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
