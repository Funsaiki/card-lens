/**
 * Scrape Hololive Official Card Game data from the official site.
 *
 * Usage:
 *   node scripts/scrape-hololive.mjs
 *
 * This fetches all cards from the JP official site and saves them
 * to data/hololive-cards.json.
 */

const BASE = "https://hololive-official-cardgame.com";

// All known sets — update this list when new sets release
const SETS = [
  // 2024
  { id: "hYS01", name: "Start Cheer Set" },
  { id: "hSD01", name: "Starter Deck – Tokino Sora & AZKi" },
  { id: "hBP01", name: "Blooming Radiance" },
  { id: "hSD02", name: "Starter Deck – Nakiri Ayame" },
  { id: "hSD03", name: "Starter Deck – Nekomata Okayu" },
  { id: "hSD04", name: "Starter Deck – Yuzuki Choco" },
  { id: "hBP02", name: "Quintet Spectrum" },
  // 2025
  { id: "hSD05", name: "Starter Deck – Todoroki Hajime" },
  { id: "hSD06", name: "Starter Deck – Kazama Iroha" },
  { id: "hSD07", name: "Starter Deck – Shiranui Flare" },
  { id: "hBP03", name: "Elite Spark" },
  { id: "hPC01", name: "Official Holoca Collection – PC Set" },
  { id: "hBP04", name: "Curious Universe" },
  { id: "hSD2025summer", name: "Start Deck Set – 2025 Summer Paradise" },
  { id: "hSD08", name: "Starter Deck – Amane Kanata" },
  { id: "hSD09", name: "Starter Deck – Houshou Marine" },
  { id: "hBP05", name: "Enchant Legalia" },
  { id: "hSD10", name: "Starter Deck – Rindou Chihaya" },
  { id: "hSD11", name: "Starter Deck – Toragane Hishoku" },
  { id: "hBP06", name: "Ayakashi Vermillion" },
  { id: "hCS01", name: "1st Anniversary Celebration Set" },
  // 2026
  { id: "hSD12", name: "Starter Deck – Oshi Advent" },
  { id: "hSD13", name: "Starter Deck – Oshi Justice" },
  { id: "hBP07", name: "Diva Fever" },
  // Promo & entry
  { id: "hPR", name: "Promo Cards" },
];

// Delay between requests to be respectful
const DELAY_MS = 500;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Fetch HTML from a URL with retry.
 */
async function fetchHTML(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "CardLens-Scraper/1.0" },
      });
      if (!res.ok) {
        console.warn(`  [${res.status}] ${url}`);
        return null;
      }
      return await res.text();
    } catch (err) {
      console.warn(`  Retry ${attempt + 1} for ${url}: ${err.message}`);
      await sleep(1000);
    }
  }
  return null;
}

/**
 * Extract card entries from a card list page HTML.
 * Returns [{id, name, img, set}]
 */
function parseCardList(html, setId) {
  const cards = [];

  // Match: <a href="/cardlist/?id=XXXX&..."><img src="..." alt="NAME" title="NAME"></a>
  const linkRegex =
    /<a\s+href="\/cardlist\/\?id=(\d+)[^"]*"[^>]*>\s*<img\s+[^>]*src="([^"]+)"[^>]*(?:alt="([^"]*)")?[^>]*>/gi;

  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    const id = parseInt(match[1], 10);
    const img = match[2];
    // Try alt, then title
    let name = match[3] || "";
    if (!name) {
      const titleMatch = match[0].match(/title="([^"]*)"/);
      if (titleMatch) name = titleMatch[1];
    }

    cards.push({ id, name, img, set: setId });
  }

  return cards;
}

/**
 * Fetch all cards from a set (handling pagination via cardsearch_ex).
 */
async function fetchSetCards(setId) {
  const allCards = [];

  // First page
  const url = `${BASE}/cardlist/cardsearch/?expansion=${setId}&view=image`;
  console.log(`  Fetching ${setId} page 1...`);
  const html = await fetchHTML(url);
  if (!html) return allCards;

  const firstPageCards = parseCardList(html, setId);
  allCards.push(...firstPageCards);
  console.log(`  Page 1: ${firstPageCards.length} cards`);

  // Check for additional pages (lazy loaded via cardsearch_ex)
  let page = 2;
  while (true) {
    await sleep(DELAY_MS);
    const exUrl = `${BASE}/cardlist/cardsearch_ex?expansion=${setId}&view=image&page=${page}`;
    const exHtml = await fetchHTML(exUrl);
    if (!exHtml || exHtml.trim().length < 50) break;

    const exCards = parseCardList(exHtml, setId);
    if (exCards.length === 0) break;

    allCards.push(...exCards);
    console.log(`  Page ${page}: ${exCards.length} cards`);
    page++;
  }

  return allCards;
}

/**
 * Extract value from a <dt>LABEL</dt><dd>VALUE</dd> pattern.
 */
function extractDtDd(html, label) {
  // Match dt containing the label, then find the next dd
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(
    `<dt[^>]*>[^<]*${escaped}[^<]*</dt>\\s*<dd[^>]*>([\\s\\S]*?)</dd>`,
    "i"
  );
  const match = html.match(regex);
  if (!match) return "";
  // Strip HTML tags
  return match[1].replace(/<[^>]+>/g, "").trim();
}

/**
 * Extract color from the detail page (from image alt or filename).
 */
function extractColor(html) {
  // Color images: type_white.png, type_red.png, etc.
  const colorMatch = html.match(/type_(white|red|blue|green|purple|yellow|colorless)\.png/i);
  if (colorMatch) return colorMatch[1].charAt(0).toUpperCase() + colorMatch[1].slice(1);
  return "";
}

/**
 * Fetch detail page for a single card and extract rarity, color, type, etc.
 */
async function fetchCardDetails(cardId, setId) {
  const url = `${BASE}/cardlist/?id=${cardId}&expansion=${setId}&view=image`;
  const html = await fetchHTML(url);
  if (!html) return null;

  const rarity = extractDtDd(html, "レアリティ") || extractDtDd(html, "Rarity");
  const cardType = extractDtDd(html, "カードタイプ") || extractDtDd(html, "Card Type");
  const bloom = extractDtDd(html, "Bloomレベル") || extractDtDd(html, "Bloom Level");
  const color = extractColor(html);

  // Card number
  let cardno = "";
  const cardnoMatch = html.match(/カードナンバー[：:]?\s*([A-Za-z0-9-]+)/);
  if (cardnoMatch) cardno = cardnoMatch[1];
  if (!cardno) {
    const enCardnoMatch = html.match(/Card\s*Number[：:]?\s*([A-Za-z0-9-]+)/i);
    if (enCardnoMatch) cardno = enCardnoMatch[1];
  }

  // Products
  const products = [];
  const prodRegex = /expansion=([A-Za-z0-9]+)/g;
  let prodMatch;
  while ((prodMatch = prodRegex.exec(html)) !== null) {
    if (!products.includes(prodMatch[1])) {
      products.push(prodMatch[1]);
    }
  }

  return { rarity, cardType, bloom, color, cardno, products };
}

/**
 * Try to extract rarity from the image filename.
 * e.g. hBP07-001_OSR.png -> OSR, hBP01-024_02_C.png -> C
 */
function rarityFromFilename(img) {
  // Match the last segment before .png: _RARITY.png or _NN_RARITY.png
  const match = img.match(/_(\d{2}_)?([A-Z]{1,4})\.png$/i);
  if (match) {
    const rarity = match[2].toUpperCase();
    const validRarities = [
      "C", "U", "R", "RR", "SR", "UR", "SEC", "OSR", "OUR", "OC", "SY", "S", "P", "SP",
    ];
    if (validRarities.includes(rarity)) return rarity;
  }
  return "";
}

// ---------- Main ----------

async function main() {
  const fetchDetails = process.argv.includes("--details");
  console.log(`Hololive OCG Scraper`);
  console.log(`Mode: ${fetchDetails ? "FULL (with detail pages)" : "FAST (list pages only)"}`);
  console.log(`Sets to scrape: ${SETS.length}\n`);

  const allCards = [];
  const seen = new Set(); // deduplicate by id

  for (const set of SETS) {
    console.log(`\n[${set.id}] ${set.name}`);
    const cards = await fetchSetCards(set.id);

    for (const card of cards) {
      if (seen.has(card.id)) {
        // Card already seen from another set — add this set to its products
        const existing = allCards.find((c) => c.id === card.id);
        if (existing && !existing.products.includes(set.id)) {
          existing.products.push(set.id);
        }
        continue;
      }
      seen.add(card.id);

      let rarity = rarityFromFilename(card.img);
      let cardType = "";
      let bloom = "";
      let color = "";
      let cardno = "";
      let products = [set.id];

      if (fetchDetails) {
        await sleep(DELAY_MS);
        const details = await fetchCardDetails(card.id, set.id);
        if (details) {
          rarity = details.rarity || rarity;
          cardType = details.cardType;
          bloom = details.bloom;
          color = details.color;
          cardno = details.cardno;
          products = details.products.length > 0 ? details.products : [set.id];
        }
      }

      // Derive cardno from image filename if not fetched from detail page
      if (!cardno) {
        const cnoMatch = card.img.match(/(h[A-Za-z0-9]+-\d{3})/);
        if (cnoMatch) cardno = cnoMatch[1];
      }

      allCards.push({
        id: card.id,
        name: card.name,
        img: card.img,
        rarity,
        color,
        card_type: cardType ? cardType.split("・") : [],
        products,
        bloom,
        cardno: cardno || `unknown-${card.id}`,
      });
    }

    console.log(`  Total unique so far: ${allCards.length}`);
    await sleep(DELAY_MS);
  }

  // Sort by id
  allCards.sort((a, b) => a.id - b.id);

  // Write output
  const { writeFileSync } = await import("fs");
  const { resolve } = await import("path");
  const outPath = resolve("data", "hololive-cards.json");
  writeFileSync(outPath, JSON.stringify(allCards, null, 2), "utf-8");

  console.log(`\n✅ Done! ${allCards.length} cards saved to ${outPath}`);
  console.log(`\nSets scraped:`);
  for (const set of SETS) {
    const count = allCards.filter((c) => c.products.includes(set.id)).length;
    if (count > 0) console.log(`  ${set.id}: ${count} cards`);
  }
}

main().catch(console.error);
