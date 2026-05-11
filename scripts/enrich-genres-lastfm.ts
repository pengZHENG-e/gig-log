/* eslint-disable @typescript-eslint/no-explicit-any */
// Augments public/artists.json with Last.fm tags as genres.
// Fetches artist.getInfo for every entry, filters out non-genre tags (countries,
// platforms, decades), merges with existing genres (dedup, case-insensitive),
// and caps at 8 genres per artist.
//
// Run: bun run scripts/enrich-genres-lastfm.ts
// --only "Name1,Name2" to refresh specific artists.

import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const OUT_FILE = resolve("public/artists.json");
const KEY = process.env.LASTFM_API_KEY;
if (!KEY) { console.error("Missing LASTFM_API_KEY in .env.local"); process.exit(1); }

const ONLY_IDX = process.argv.indexOf("--only");
const ONLY = ONLY_IDX >= 0 ? new Set(process.argv[ONLY_IDX + 1].split(",").map(s => s.trim())) : null;

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

// Non-genre tag denylist (lowercased). Filters out countries, platforms, decades, generic praise.
const NON_GENRE = new Set([
  // Country/region/language
  "uk", "u.k.", "usa", "u.s.a.", "us", "united kingdom", "united states", "america", "american",
  "england", "english", "scotland", "scottish", "ireland", "irish", "wales", "welsh",
  "japan", "japanese", "germany", "german", "france", "french", "italy", "italian",
  "spain", "spanish", "russia", "russian", "brazil", "brazilian", "argentina", "argentinian",
  "canada", "canadian", "korea", "korean", "china", "chinese", "taiwan", "taiwanese",
  "hong kong", "netherlands", "dutch", "belgium", "belgian", "sweden", "swedish",
  "norway", "norwegian", "denmark", "danish", "finland", "finnish", "iceland", "icelandic",
  "poland", "polish", "mexico", "mexican", "australia", "australian", "new zealand",
  "portugal", "portuguese", "greece", "greek", "switzerland", "swiss", "austria", "austrian",
  "british", "europe", "european", "asia", "asian", "africa", "african", "latin america",
  // Platforms/meta
  "spotify", "seen live", "seenlive", "lastfm", "last.fm", "soundcloud", "youtube",
  "tiktok", "bandcamp",
  // Personal lists
  "favorite", "favourites", "favorites", "favourite", "love", "loved", "loved tracks",
  "to listen", "to check out", "all", "my favourites", "my favorites", "best", "great",
  "amazing", "good", "awesome", "cool", "nice", "epic", "perfect",
  // Decades and years
  "00s", "10s", "20s", "30s", "40s", "50s", "60s", "70s", "80s", "90s",
  "2000s", "2010s", "2020s", "1960s", "1970s", "1980s", "1990s",
  // Voice/gender
  "male vocalists", "female vocalists", "vocalists", "male vocalist", "female vocalist",
  "female", "male", "solo", "duo", "trio", "quartet",
  // Era / generic
  "old", "new", "modern", "classic", "contemporary",
]);

// Cities, venues, "X scene", "seen live xN", trailing version markers — common noise.
const NON_GENRE_PATTERNS: RegExp[] = [
  /^seen live( x\d+)?$/,
  / scene$/,
  /^windmill/,
  /^my /,
];
const NON_GENRE_CITIES = new Set([
  "dublin", "london", "paris", "berlin", "manchester", "glasgow", "edinburgh",
  "brighton", "leeds", "sheffield", "liverpool", "bristol", "nottingham",
  "newcastle", "birmingham", "cardiff", "belfast", "new york", "nyc",
  "los angeles", "la", "san francisco", "chicago", "boston", "seattle",
  "portland", "austin", "nashville", "atlanta", "tokyo", "osaka", "seoul",
  "beijing", "shanghai", "taipei", "hong kong", "singapore",
  "amsterdam", "rotterdam", "brussels", "antwerp", "barcelona", "madrid",
  "lisbon", "milan", "rome", "munich", "hamburg", "cologne", "zurich",
  "stockholm", "copenhagen", "oslo", "helsinki", "reykjavik",
  "melbourne", "sydney", "auckland",
]);

function isLikelyGenre(tag: string): boolean {
  const t = tag.toLowerCase().trim();
  if (!t || NON_GENRE.has(t)) return false;
  if (NON_GENRE_CITIES.has(t)) return false;
  if (t.length < 2 || t.length > 40) return false;
  if (/^\d+s?$/.test(t)) return false; // pure year/decade
  if (NON_GENRE_PATTERNS.some(re => re.test(t))) return false;
  return true;
}

async function lastfmTags(name: string): Promise<string[]> {
  const url = `https://ws.audioscrobbler.com/2.0/?method=artist.getInfo&artist=${encodeURIComponent(name)}&api_key=${KEY}&format=json&autocorrect=1`;
  const r = await fetch(url);
  if (!r.ok) return [];
  const data: any = await r.json();
  const tags = data?.artist?.tags?.tag ?? [];
  return tags.map((t: any) => String(t.name)).filter(isLikelyGenre);
}

interface ArtistMeta {
  name: string;
  photo?: string;
  genres?: string[];
  [k: string]: unknown;
}

async function main() {
  const data: Record<string, ArtistMeta> = JSON.parse(readFileSync(OUT_FILE, "utf-8"));
  const names = Object.keys(data);
  const queue = ONLY ? names.filter(n => ONLY.has(n)) : names;
  console.log(`Processing ${queue.length}/${names.length} artists for Last.fm genres...`);

  let updated = 0, unchanged = 0, errored = 0;
  for (let i = 0; i < queue.length; i++) {
    const name = queue[i];
    const entry = data[name];
    const existing = new Set((entry.genres ?? []).map(g => g.toLowerCase()));

    let lfTags: string[] = [];
    try {
      // Try the artist's CSV name first; if no tags, fall back to alternate names if we have them.
      lfTags = await lastfmTags(name);
      // If wiki URL exists and pointed to a specific (band) page, also try the article title.
      if (lfTags.length === 0 && entry.wiki && typeof entry.wiki === "string") {
        const m = (entry.wiki as string).match(/\/wiki\/([^?#]+)/);
        if (m) {
          const altName = decodeURIComponent(m[1])
            .replace(/_/g, " ")
            .replace(/\s*\([^)]+\)\s*$/, "");
          if (altName.toLowerCase() !== name.toLowerCase()) {
            await sleep(220);
            lfTags = await lastfmTags(altName);
          }
        }
      }
    } catch (e: any) {
      console.error(`  ! ${name}: ${e.message}`);
      errored++;
      continue;
    }

    // Re-filter existing genres too (some legacy MB tags include countries/decades).
    const cleanedExisting = (entry.genres ?? []).filter(isLikelyGenre).map(g => g.toLowerCase());
    const lfLower = lfTags.map(t => t.toLowerCase());
    const merged: string[] = [];
    const seen = new Set<string>();
    for (const g of [...cleanedExisting, ...lfLower]) {
      if (!seen.has(g)) { seen.add(g); merged.push(g); }
    }
    const before = (entry.genres ?? []).join(",");
    entry.genres = merged.slice(0, 8);
    const after = entry.genres.join(",");
    if (before !== after) {
      updated++;
      if ((i + 1) % 5 === 0 || (entry.genres.length > 2 && (entry.genres.length > (cleanedExisting.length || 0)))) {
        console.log(`[${i + 1}/${queue.length}] ${name}: ${entry.genres.join(", ")}`);
      }
    } else {
      unchanged++;
    }

    if ((i + 1) % 25 === 0) writeFileSync(OUT_FILE, JSON.stringify(data, null, 2));
    await sleep(220); // ~4.5 RPS, stays under Last.fm's 5 RPS limit
  }

  writeFileSync(OUT_FILE, JSON.stringify(data, null, 2));
  const withGenres = Object.values(data).filter(v => (v.genres ?? []).length > 0).length;
  console.log(`\nDone. Updated ${updated}, unchanged ${unchanged}, errored ${errored}.`);
  console.log(`Coverage: ${withGenres}/${names.length} (${Math.round(100 * withGenres / names.length)}%) artists have genres.`);
}

main();
