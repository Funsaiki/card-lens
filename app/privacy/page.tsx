import Link from "next/link";
import NavBar from "@/components/NavBar";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politique de confidentialité - Card Lens",
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
          &larr; Retour à l&apos;accueil
        </Link>

        <h1 className="text-3xl font-bold mt-6 mb-2">
          Politique de confidentialité
        </h1>
        <p className="text-xs text-zinc-500 mb-8">
          Dernière mise à jour : 9 mars 2026
        </p>

        <div className="space-y-8 text-sm text-zinc-400 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">
              Introduction
            </h2>
            <p>
              Card Lens respecte votre vie privée. Cette politique décrit
              quelles données sont collectées, comment elles sont utilisées et
              quels sont vos droits.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">
              Données collectées
            </h2>

            <h3 className="text-sm font-medium text-zinc-300 mt-4 mb-2">
              1. Données de compte (si vous créez un compte)
            </h3>
            <ul className="list-disc list-inside space-y-1">
              <li>
                Adresse e-mail et nom d&apos;affichage (via Google ou Discord
                OAuth)
              </li>
              <li>Avatar de profil</li>
            </ul>

            <h3 className="text-sm font-medium text-zinc-300 mt-4 mb-2">
              2. Données de collection
            </h3>
            <ul className="list-disc list-inside space-y-1">
              <li>
                Cartes ajoutées à votre collection (nom, jeu, set, rareté,
                état, notes)
              </li>
            </ul>

            <h3 className="text-sm font-medium text-zinc-300 mt-4 mb-2">
              3. Données traitées localement (non envoyées à nos serveurs)
            </h3>
            <ul className="list-disc list-inside space-y-1">
              <li>
                Images capturées par la caméra — le traitement IA
                (reconnaissance de cartes) s&apos;exécute entièrement dans votre
                navigateur via TensorFlow.js
              </li>
              <li>
                Modèles et embeddings stockés dans IndexedDB sur votre appareil
              </li>
              <li>
                Flux vidéo WebRTC (peer-to-peer direct entre vos appareils)
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">
              Utilisation des données
            </h2>
            <p>Vos données sont utilisées exclusivement pour :</p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>Gérer votre compte et authentification</li>
              <li>Stocker et afficher votre collection de cartes</li>
              <li>Rechercher des informations de cartes via les API tierces</li>
            </ul>
            <p className="mt-2">
              Card Lens ne vend, ne loue et ne partage pas vos données
              personnelles avec des tiers à des fins commerciales.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">
              Services tiers
            </h2>
            <p>Card Lens interagit avec les services suivants :</p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>
                <strong className="text-zinc-300">Supabase</strong> —
                authentification et base de données (hébergé dans le cloud)
              </li>
              <li>
                <strong className="text-zinc-300">Google / Discord</strong> —
                fournisseurs OAuth pour la connexion
              </li>
              <li>
                <strong className="text-zinc-300">
                  TCGdex, Scryfall, YGOProdeck
                </strong>{" "}
                — API publiques pour les données de cartes et prix
              </li>
              <li>
                <strong className="text-zinc-300">PeerJS</strong> — serveur de
                signalisation pour la connexion WebRTC
              </li>
            </ul>
            <p className="mt-2">
              Chaque service tiers est soumis à sa propre politique de
              confidentialité.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">
              Cookies et stockage local
            </h2>
            <p>Card Lens utilise :</p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>
                <strong className="text-zinc-300">
                  Cookies d&apos;authentification
                </strong>{" "}
                — gérés par Supabase pour maintenir votre session
              </li>
              <li>
                <strong className="text-zinc-300">IndexedDB</strong> — pour le
                stockage local des modèles ML et embeddings
              </li>
              <li>
                <strong className="text-zinc-300">localStorage</strong> — pour
                les préférences utilisateur
              </li>
            </ul>
            <p className="mt-2">
              Aucun cookie de suivi publicitaire ou analytique n&apos;est
              utilisé.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">
              Sécurité des données
            </h2>
            <p>
              Les données en base sont protégées par les mécanismes de
              Row-Level Security (RLS) de Supabase. Chaque utilisateur ne peut
              accéder qu&apos;à ses propres données. Les communications sont
              chiffrées via HTTPS.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">
              Vos droits
            </h2>
            <p>
              Conformément au RGPD et aux réglementations applicables, vous
              disposez des droits suivants :
            </p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>
                <strong className="text-zinc-300">Accès</strong> — consulter les
                données que nous détenons sur vous
              </li>
              <li>
                <strong className="text-zinc-300">Rectification</strong> —
                corriger vos informations personnelles
              </li>
              <li>
                <strong className="text-zinc-300">Suppression</strong> —
                demander la suppression de votre compte et de vos données
              </li>
              <li>
                <strong className="text-zinc-300">Portabilité</strong> —
                exporter vos données de collection
              </li>
            </ul>
            <p className="mt-2">
              Pour exercer ces droits, ouvrez une issue sur le{" "}
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

          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">
              Modifications
            </h2>
            <p>
              Cette politique peut être mise à jour. Toute modification sera
              publiée sur cette page avec une date de mise à jour actualisée.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
