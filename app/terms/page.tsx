import Link from "next/link";
import NavBar from "@/components/NavBar";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Conditions Générales d'Utilisation - Card Lens",
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
          &larr; Retour à l&apos;accueil
        </Link>

        <h1 className="text-3xl font-bold mt-6 mb-2">
          Conditions Générales d&apos;Utilisation
        </h1>
        <p className="text-xs text-zinc-500 mb-8">
          Dernière mise à jour : 9 mars 2026
        </p>

        <div className="space-y-8 text-sm text-zinc-400 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">
              1. Objet
            </h2>
            <p>
              Les présentes Conditions Générales d&apos;Utilisation (ci-après
              « CGU ») régissent l&apos;accès et l&apos;utilisation du service
              Card Lens, une application web de reconnaissance de cartes à
              collectionner en temps réel.
            </p>
            <p className="mt-2">
              En utilisant Card Lens, vous acceptez les présentes CGU dans leur
              intégralité. Si vous n&apos;acceptez pas ces conditions, veuillez
              ne pas utiliser le service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">
              2. Description du service
            </h2>
            <p>Card Lens propose les fonctionnalités suivantes :</p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>
                Reconnaissance de cartes à collectionner (Pokémon, Magic: The
                Gathering, Yu-Gi-Oh!, Hololive OCG) via la caméra de votre
                appareil
              </li>
              <li>
                Affichage d&apos;informations (nom, set, rareté) et de prix
                indicatifs
              </li>
              <li>
                Gestion d&apos;une collection personnelle de cartes (avec
                compte)
              </li>
              <li>
                Connexion via caméra de téléphone par WebRTC
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">
              3. Accès au service
            </h2>
            <p>
              L&apos;accès à Card Lens est gratuit. Certaines fonctionnalités
              (gestion de collection) nécessitent la création d&apos;un compte
              via Google ou Discord.
            </p>
            <p className="mt-2">
              L&apos;éditeur se réserve le droit de modifier, suspendre ou
              interrompre tout ou partie du service à tout moment, sans préavis
              ni indemnité.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">
              4. Compte utilisateur
            </h2>
            <p>
              En créant un compte, vous vous engagez à fournir des informations
              exactes. Vous êtes responsable de la confidentialité de vos
              identifiants de connexion et de toute activité effectuée sous
              votre compte.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">
              5. Utilisation acceptable
            </h2>
            <p>Vous vous engagez à ne pas :</p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>
                Utiliser le service à des fins illégales ou non autorisées
              </li>
              <li>
                Tenter de contourner les mesures de sécurité du service
              </li>
              <li>
                Surcharger volontairement les serveurs ou les API tierces
              </li>
              <li>
                Reproduire, redistribuer ou exploiter commercialement les
                données de prix obtenues via le service sans autorisation des
                fournisseurs d&apos;origine
              </li>
              <li>
                Utiliser des scripts automatisés pour accéder massivement au
                service
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">
              6. Propriété intellectuelle
            </h2>
            <p>
              Le code source de Card Lens est distribué sous licence MIT. Vous
              pouvez librement utiliser, copier, modifier et distribuer le code
              conformément aux termes de cette licence.
            </p>
            <p className="mt-2">
              Les images, noms et marques des jeux de cartes affichés via le
              service appartiennent à leurs détenteurs respectifs (Nintendo /
              Creatures Inc. / GAME FREAK Inc., Wizards of the Coast, Konami,
              Cover Corp.). Ces éléments sont affichés à des fins
              d&apos;identification uniquement.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">
              7. Informations de prix
            </h2>
            <p>
              Les prix affichés sont fournis à titre purement indicatif par des
              API tierces (TCGdex, Scryfall, YGOProdeck). Card Lens ne garantit
              pas l&apos;exactitude, la complétude ou l&apos;actualité de ces
              données. Les prix peuvent varier en fonction du marché, de
              l&apos;état des cartes et d&apos;autres facteurs.
            </p>
            <p className="mt-2">
              Card Lens ne saurait être tenu responsable de toute perte
              financière résultant de décisions basées sur les prix affichés.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">
              8. Limitation de responsabilité
            </h2>
            <p>
              Card Lens est fourni « tel quel » et « selon disponibilité », sans
              aucune garantie, expresse ou implicite. L&apos;éditeur ne garantit
              pas :
            </p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>
                L&apos;exactitude de la reconnaissance des cartes par
                l&apos;intelligence artificielle
              </li>
              <li>La disponibilité continue et ininterrompue du service</li>
              <li>L&apos;exactitude des informations de prix ou de rareté</li>
            </ul>
            <p className="mt-2">
              En aucun cas l&apos;éditeur ne pourra être tenu responsable de
              dommages directs, indirects, accessoires ou consécutifs résultant
              de l&apos;utilisation du service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">
              9. Protection des données
            </h2>
            <p>
              L&apos;utilisation de vos données personnelles est régie par notre{" "}
              <Link
                href="/privacy"
                className="underline hover:text-zinc-300 transition-colors"
              >
                Politique de confidentialité
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">
              10. Modifications des CGU
            </h2>
            <p>
              L&apos;éditeur se réserve le droit de modifier les présentes CGU à
              tout moment. Les modifications prennent effet dès leur publication
              sur cette page. Il est conseillé de consulter régulièrement cette
              page.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">
              11. Droit applicable
            </h2>
            <p>
              Les présentes CGU sont régies par le droit français. En cas de
              litige, les parties s&apos;engagent à rechercher une solution
              amiable avant toute action judiciaire.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">
              12. Contact
            </h2>
            <p>
              Pour toute question relative aux présentes CGU, veuillez ouvrir
              une issue sur le{" "}
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
