# Card Lens

Application web de reconnaissance de cartes a collectionner en temps reel. Scannez vos cartes Pokemon, Magic: The Gathering, Yu-Gi-Oh! et Hololive OCG via votre webcam ou votre telephone, et identifiez-les instantanement grace au machine learning embarque dans le navigateur.

## Fonctionnalites

- **Scan en temps reel** — Reconnaissance de cartes via webcam ou camera de telephone (WebRTC P2P)
- **100% cote client** — Inference MobileNet v2 directement dans le navigateur, aucun serveur ML requis
- **4 jeux supportes** — Pokemon TCG, Magic: The Gathering, Yu-Gi-Oh!, Hololive OCG
- **Prix du marche** — Affichage des prix TCGPlayer et Cardmarket
- **Collection personnelle** — Gerez votre collection avec quantites, etats et notes (authentification OAuth)
- **Connexion telephone** — Scannez le QR code pour streamer la camera de votre telephone vers le PC

## Comment ca marche

```
Camera (webcam / telephone via WebRTC)
    |
    v
Capture de frame toutes les 1.5s
    |
    v
Extraction de la region carte (ratio 63:88)
    |
    v
MobileNet v2 → Embedding 1280 dimensions
    |
    v
Similarite cosinus vs index local (IndexedDB)
    |
    v
Systeme de vote (3/5 frames, seuil 0.5)
    |
    v
Affichage : details carte + prix + confiance
```

## Demarrage rapide

### Prerequis

- Node.js 18+
- Un projet [Supabase](https://supabase.com) (gratuit) pour l'authentification et les collections

### Installation

```bash
git clone https://github.com/Funsaiki/card-lens.git
cd card-lens
npm install
```

### Configuration

Creez un fichier `.env.local` a la racine :

```env
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-anon-key
```

Puis executez le schema SQL dans le [SQL Editor de Supabase](https://supabase.com/dashboard) :

```bash
# Le fichier est a la racine du projet
cat supabase-schema.sql
```

### Lancement

```bash
# Developpement
npm run dev

# Developpement en LAN (pour tester avec un telephone sur le meme reseau)
npm run dev:lan

# Production
npm run build && npm start
```

Ouvrez [http://localhost:3000](http://localhost:3000).

## Utilisation

1. **Choisissez un jeu** sur la page d'accueil
2. **Indexez un set** — Le scanner a besoin d'un index local pour comparer les cartes. Cliquez sur "Indexer un set" et selectionnez un set de cartes.
3. **Scannez** — Placez une carte devant la camera. Le systeme la reconnait en ~3 secondes (3 frames concordantes).
4. **Connexion telephone** (optionnel) — Cliquez sur l'icone telephone dans le scanner pour afficher un QR code. Scannez-le avec votre telephone pour streamer sa camera.
5. **Collection** — Connectez-vous (Google ou Discord) pour sauvegarder les cartes reconnues dans votre collection.

## Architecture

```
app/
  page.tsx              # Accueil — selection du jeu
  scan/page.tsx         # Scanner principal
  phone/page.tsx        # Source camera telephone (WebRTC sender)
  collection/page.tsx   # Gestion de la collection
  auth/callback/        # Callback OAuth
  api/
    cards/              # Recherche et details cartes (multi-jeux)
    collection/         # CRUD collection utilisateur
    hololive/cards/     # Donnees cartes Hololive
    image-proxy/        # Proxy images Hololive

components/             # 14 composants React
hooks/                  # useCardRecognition, useWebRTC, useUser
lib/
  embeddings.ts         # MobileNet, similarite cosinus
  recognition.ts        # Capture frame, extraction region carte
  cards-api.ts          # Parsers multi-jeux (TCGdex, Scryfall, YGOProdeck)
  indexer.ts            # Pipeline d'indexation de sets
  embedding-store.ts    # Persistance IndexedDB
  supabase/             # Clients Supabase (browser + server)
types/                  # Types TypeScript partages
```

## Stack technique

| Couche | Technologie |
|---|---|
| Framework | Next.js 14 (App Router) |
| UI | React 18, TailwindCSS |
| ML | TensorFlow.js + MobileNet v2 |
| Streaming | PeerJS (WebRTC P2P) |
| Auth & DB | Supabase (OAuth + PostgreSQL + RLS) |
| APIs cartes | TCGdex, Scryfall, YGOProdeck |

## Sources de donnees

| Jeu | API | Prix |
|---|---|---|
| Pokemon | [TCGdex](https://tcgdex.dev) | TCGPlayer, Cardmarket |
| Magic | [Scryfall](https://scryfall.com/docs/api) | USD |
| Yu-Gi-Oh! | [YGOProdeck](https://ygoprodeck.com/api-guide/) | TCGPlayer |
| Hololive | Donnees JSON embarquees | — |

## Licence

MIT
