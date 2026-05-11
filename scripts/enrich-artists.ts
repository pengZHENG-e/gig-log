/* eslint-disable @typescript-eslint/no-explicit-any */
// Enriches every unique artist from data/*.csv with a photo + genre tags + short summary.
// Sources: MusicBrainz (genres + wiki link) → Wikipedia REST (photo + extract).
// Output: public/artists.json keyed by artist name (exact as written in CSV).
//
// Run: bun run scripts/enrich-artists.ts
// Resumable: existing entries with a photo are skipped on re-run.
// Pass --force to re-fetch everything; --only "Name1,Name2" to enrich specific artists.

import { readdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, join } from "path";

const DATA_DIR = resolve("data");
const OUT_FILE = resolve("public/artists.json");
const UA = "GigTrackerEnrich/1.0 (peng@rakam.ai)";

const FORCE = process.argv.includes("--force");
const ONLY_IDX = process.argv.indexOf("--only");
const ONLY = ONLY_IDX >= 0 ? new Set(process.argv[ONLY_IDX + 1].split(",").map(s => s.trim())) : null;

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

// Global MB rate limiter: serialized via a promise chain so concurrent workers don't race.
// Each caller appends sleep(1100) to the chain and awaits the prior tail.
let mbReady: Promise<void> = Promise.resolve();
async function mbThrottle() {
  const myTurn = mbReady;
  mbReady = mbReady.then(() => sleep(1100));
  await myTurn;
}

// ─── CSV parsing (multi-line aware) ───────────────────────────────────────

function parseCSV(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQ && text[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (c === "," && !inQ) {
      row.push(cur); cur = "";
    } else if ((c === "\n" || c === "\r") && !inQ) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cur); cur = "";
      if (row.some(v => v !== "")) rows.push(row);
      row = [];
    } else cur += c;
  }
  if (cur || row.length) { row.push(cur); if (row.some(v => v !== "")) rows.push(row); }
  if (rows.length === 0) return [];
  const headers = rows[0].map(h => h.trim());
  return rows.slice(1).map(r =>
    Object.fromEntries(headers.map((h, i) => [h, (r[i] ?? "").trim()])) as Record<string, string>
  );
}

function getUniqueArtists(): string[] {
  const set = new Set<string>();
  for (const f of readdirSync(DATA_DIR)) {
    if (!f.endsWith(".csv")) continue;
    const text = readFileSync(join(DATA_DIR, f), "utf-8");
    for (const r of parseCSV(text)) {
      const a = r.artist?.trim();
      if (a && a.toLowerCase() !== "artist") set.add(a);
    }
  }
  return [...set].sort();
}

// ─── Fetch helpers ────────────────────────────────────────────────────────

interface MBResult { id?: string; tags: string[]; wikipediaTitle?: string; wikipediaLang?: string; wikidataId?: string; type?: string }

// Each entry is matched against the whole tag string (case-insensitive equality / substring as noted).
const NON_MUSICAL_TAG_EXACT = new Set([
  "audiobook", "voice actor", "narrator", "podcaster", "comedian", "actor",
  "football", "footballer", "cricketer", "writer", "novelist", "athlete",
  "_consistency", "fictional character", "book author",
]);
const NON_MUSICAL_TAG_SUBSTRING = [
  "audiobook", "voice actor", "audio book", "audiobook reader",
];
const MUSICAL = new Set(["Person", "Group", "Orchestra", "Choir"]);

function normalize(s: string) {
  return s.normalize("NFKC").toLowerCase().trim();
}

function tagsLookMusical(tags: any[]): boolean {
  const names = (tags ?? []).map((t: any) => String(t.name ?? "").toLowerCase());
  if (!names.length) return true; // no signal either way
  if (names.some(n => NON_MUSICAL_TAG_EXACT.has(n))) return false;
  if (names.some(n => NON_MUSICAL_TAG_SUBSTRING.some(s => n.includes(s)))) return false;
  return true;
}

async function fetchMB(name: string): Promise<MBResult> {
  const searchUrl = `https://musicbrainz.org/ws/2/artist/?query=${encodeURIComponent(`artist:"${name}"`)}&fmt=json&limit=10`;
  await mbThrottle();
  const r = await fetch(searchUrl, { headers: { "User-Agent": UA } });
  if (!r.ok) return { tags: [] };
  const data: any = await r.json();
  const candidates: any[] = data.artists ?? [];
  const exact = (a: any) => {
    if (normalize(a.name ?? "") === normalize(name)) return true;
    for (const al of (a.aliases ?? [])) {
      if (al?.name && normalize(al.name) === normalize(name)) return true;
    }
    return false;
  };

  // Pick order: exact-name + musical type + musical tags → exact-name + musical type → exact-name → musical type with score>=95 → first.
  const artist =
    candidates.find((a: any) => exact(a) && MUSICAL.has(a.type) && tagsLookMusical(a.tags)) ??
    candidates.find((a: any) => exact(a) && MUSICAL.has(a.type)) ??
    candidates.find((a: any) => exact(a)) ??
    candidates.find((a: any) => MUSICAL.has(a.type) && a.score >= 95 && tagsLookMusical(a.tags)) ??
    candidates[0];
  if (!artist) return { tags: [] };
  if (process.env.DEBUG) console.log(`    MB picked: ${artist.name} (score ${artist.score}, type ${artist.type}, id ${artist.id})`);

  await mbThrottle();
  const r2 = await fetch(
    `https://musicbrainz.org/ws/2/artist/${artist.id}?inc=url-rels+tags&fmt=json`,
    { headers: { "User-Agent": UA } }
  );
  if (!r2.ok) return { id: artist.id, tags: (artist.tags ?? []).map((t: any) => t.name) };
  const full: any = await r2.json();

  const tags: string[] = (full.tags ?? [])
    .filter((t: any) => t.count > 0)
    .sort((a: any, b: any) => b.count - a.count)
    .map((t: any) => t.name);

  let wikipediaTitle: string | undefined;
  let wikipediaLang: string | undefined;
  let wikidataId: string | undefined;
  for (const rel of (full.relations ?? [])) {
    if (rel.type === "wikipedia" && rel.url?.resource) {
      const m = rel.url.resource.match(/^https?:\/\/([a-z]+)\.wikipedia\.org\/wiki\/(.+)$/);
      if (m) { wikipediaLang = m[1]; wikipediaTitle = decodeURIComponent(m[2]).replace(/_/g, " "); }
    } else if (rel.type === "wikidata" && rel.url?.resource) {
      const m = rel.url.resource.match(/\/(Q\d+)$/);
      if (m) wikidataId = m[1];
    }
  }
  return { id: artist.id, tags, wikipediaTitle, wikipediaLang, wikidataId, type: full.type };
}

async function resolveWikidataToWiki(qid: string, preferLang = "en"): Promise<{ title: string; lang: string } | undefined> {
  const r = await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`, { headers: { "User-Agent": UA } });
  if (!r.ok) return;
  const data: any = await r.json();
  const sitelinks = data.entities?.[qid]?.sitelinks ?? {};
  const langOrder = [preferLang, "en", "zh", "ja", "fr", "de", "es"];
  for (const lang of langOrder) {
    const key = `${lang}wiki`;
    const sl = sitelinks[key];
    if (sl?.title) return { title: sl.title, lang };
  }
  return;
}

interface WikiResult { photo?: string; summary?: string; url?: string }

async function fetchWiki(title: string, lang = "en"): Promise<WikiResult> {
  const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const r = await fetch(url, { headers: { "User-Agent": UA } });
  if (!r.ok) return {};
  const data: any = await r.json();
  if (data.type === "disambiguation") return {};
  return {
    photo: data.thumbnail?.source ?? data.originalimage?.source,
    summary: data.extract,
    url: data.content_urls?.desktop?.page,
  };
}

// Confirm a wikipedia page title is actually about the artist by checking its summary for music-related signals.
function summaryLooksMusical(extract: string | undefined, lang: string): boolean {
  if (!extract) return false;
  if (lang === "zh") return /乐队|樂團|歌手|音樂|音乐|樂團|乐团|乐手|樂手|專輯|专辑|唱片|主唱/.test(extract);
  return /\b(band|musician|singer|songwriter|rapper|composer|guitarist|drummer|bassist|vocalist|musical group|recording artist|music duo|hip hop|rock|pop|electronic|jazz|punk|metal|folk|indie)\b/i.test(extract);
}

// Try direct article fetch with disambiguation suffixes (parallel) before falling back to fuzzy search.
async function findWikiByName(name: string, lang = "en"): Promise<{ title: string; result: WikiResult } | undefined> {
  const suffixes = lang === "en"
    ? ["", " (band)", " (musician)"]
    : ["", " (乐队)"];
  // Fire all suffix fetches in parallel; pick first musical match in priority order.
  const results = await Promise.all(
    suffixes.map(async sfx => {
      const title = name + sfx;
      const res = await fetchWiki(title, lang);
      return { title, res };
    })
  );
  for (const { title, res } of results) {
    if (res.summary && summaryLooksMusical(res.summary, lang)) {
      return { title, result: res };
    }
  }
  // Fuzzy search fallback. Verify hits in parallel; pick best.
  const query = lang === "en" ? `"${name}" band musician` : name;
  const url = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=5&format=json&origin=*`;
  const r = await fetch(url, { headers: { "User-Agent": UA } });
  if (!r.ok) return;
  const data: any = await r.json();
  const hits: any[] = (data.query?.search ?? []).filter((h: any) =>
    !/^(List of |Discography of )|(Festival|tour|nominations|awards|discography)$/i.test(h.title)
  ).slice(0, 5);
  const verified = await Promise.all(hits.map(async (h: any) => ({ h, res: await fetchWiki(h.title, lang) })));
  const nLow = name.toLowerCase();
  for (const { h, res } of verified) {
    if (res.summary && summaryLooksMusical(res.summary, lang)) {
      const tLow = h.title.toLowerCase();
      const shared = lang === "zh"
        ? [...name].filter(c => h.title.includes(c)).length / [...name].length
        : 0;
      if (tLow.includes(nLow) || res.summary.toLowerCase().includes(nLow) || shared >= 0.5) {
        return { title: h.title, result: res };
      }
    }
  }
  return;
}

// ─── Spotify (fallback after Wikipedia for missing photos) ────────────────

let spotifyToken: { token: string; expires: number } | null = null;
async function getSpotifyToken(): Promise<string | null> {
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id || !secret) return null;
  if (spotifyToken && Date.now() < spotifyToken.expires - 60000) return spotifyToken.token;
  const r = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + Buffer.from(`${id}:${secret}`).toString("base64"),
    },
    body: "grant_type=client_credentials",
  });
  if (!r.ok) return null;
  const d: any = await r.json();
  spotifyToken = { token: d.access_token, expires: Date.now() + (d.expires_in ?? 3600) * 1000 };
  return spotifyToken.token;
}

interface SpotifyResult {
  photo?: string;
  photoSmall?: string;
  spotifyId?: string;
  spotifyUrl?: string;
  nameMatched: string;
}

async function fetchSpotify(name: string): Promise<SpotifyResult | undefined> {
  const token = await getSpotifyToken();
  if (!token) return;
  const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(name)}&type=artist&limit=5`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) return;
  const data: any = await r.json();
  const items: any[] = data?.artists?.items ?? [];
  if (!items.length) return;
  // Require exact case-insensitive name match — Spotify has too many same-name artists to trust ranking alone.
  const exact = items.find((a: any) => String(a.name).toLowerCase().trim() === name.toLowerCase().trim());
  if (!exact) return;
  const imgs: any[] = exact.images ?? [];
  if (!imgs.length) return;
  return {
    photo: imgs[0]?.url,
    photoSmall: imgs[2]?.url ?? imgs[1]?.url ?? imgs[0]?.url,
    spotifyId: exact.id,
    spotifyUrl: exact.external_urls?.spotify,
    nameMatched: exact.name,
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────

interface ArtistMeta {
  name: string;
  photo?: string;
  photoSmall?: string;
  genres: string[];
  summary?: string;
  wiki?: string;
  mbid?: string;
  spotifyId?: string;
  spotifyUrl?: string;
  type?: string;
  source: string;
}

async function enrichOneImpl(name: string): Promise<ArtistMeta> {
  const meta: ArtistMeta = { name, genres: [], source: "" };
  try {
    const mb = await fetchMB(name);
    meta.mbid = mb.id;
    meta.genres = mb.tags.slice(0, 6);
    meta.type = mb.type;

    let wiki: WikiResult = {};
    let source = "";
    const isCJK = /[一-鿿]/.test(name);

    // 1. Direct MB → wikipedia link (most authoritative)
    if (mb.wikipediaTitle) {
      wiki = await fetchWiki(mb.wikipediaTitle, mb.wikipediaLang ?? "en");
      if (wiki.summary) source = `mb-wiki-${mb.wikipediaLang ?? "en"}`;
    }
    // 2. MB → wikidata → wikipedia sitelink (also authoritative)
    if (!wiki.summary && mb.wikidataId) {
      const resolved = await resolveWikidataToWiki(mb.wikidataId, isCJK ? "zh" : "en");
      if (resolved) {
        wiki = await fetchWiki(resolved.title, resolved.lang);
        if (wiki.summary) source = `mb-wikidata-${resolved.lang}`;
      }
    }
    // 3. Direct wikipedia name + disambiguation suffixes (en, then zh for CJK names)
    if (!wiki.summary) {
      const found = await findWikiByName(name, "en");
      if (found) { wiki = found.result; source = "wiki-direct-en"; }
    }
    if (!wiki.summary && isCJK) {
      const found = await findWikiByName(name, "zh");
      if (found) { wiki = found.result; source = "wiki-direct-zh"; }
    }
    meta.photo = wiki.photo;
    meta.summary = wiki.summary;
    meta.wiki = wiki.url;
    meta.source = source || (mb.id ? "mb-only" : "none");

    // 4. Spotify fallback — only if we still don't have a photo. Exact-name match required.
    if (!meta.photo) {
      const sp = await fetchSpotify(name);
      if (sp) {
        meta.photo = sp.photo;
        meta.photoSmall = sp.photoSmall;
        meta.spotifyId = sp.spotifyId;
        meta.spotifyUrl = sp.spotifyUrl;
        meta.source = meta.source === "mb-only" || meta.source === "none" ? "spotify" : `${meta.source}+spotify`;
      }
    }
  } catch (e: any) {
    console.error(`  ! error for "${name}": ${e.message}`);
    meta.source = "error";
  }
  return meta;
}

// Retry once on transient socket errors / source=error.
async function enrichOne(name: string): Promise<ArtistMeta> {
  let meta = await enrichOneImpl(name);
  if (meta.source === "error") {
    await sleep(1500);
    const retry = await enrichOneImpl(name);
    if (retry.source !== "error") meta = retry;
  }
  return meta;
}

// Concurrent worker pool. The global mbThrottle() ensures MB rate limit is respected
// across all workers; wiki fetches overlap freely.
async function pool<T>(items: T[], concurrency: number, fn: (item: T, idx: number) => Promise<void>) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (next < items.length) {
        const idx = next++;
        await fn(items[idx], idx);
      }
    })
  );
}

async function main() {
  const allArtists = getUniqueArtists();
  console.log(`Found ${allArtists.length} unique artists`);

  const existing: Record<string, ArtistMeta> = existsSync(OUT_FILE)
    ? JSON.parse(readFileSync(OUT_FILE, "utf-8"))
    : {};

  const result: Record<string, ArtistMeta> = { ...existing };

  // Determine which artists to process this run.
  const queue = allArtists.filter(a => {
    if (ONLY && !ONLY.has(a)) return false;
    if (!FORCE && existing[a]?.photo) return false;
    return true;
  });
  const initialHits = Object.values(result).filter(v => v.photo).length;
  console.log(`Processing ${queue.length}, skipping ${allArtists.length - queue.length} (already have photo or not in --only).`);

  let processed = 0;
  let saving = false;
  const trySave = () => {
    if (saving) return;
    saving = true;
    try { writeFileSync(OUT_FILE, JSON.stringify(result, null, 2)); }
    finally { saving = false; }
  };

  await pool(queue, 4, async (a) => {
    const meta = await enrichOne(a);
    result[a] = meta;
    processed++;
    const flag = meta.photo ? "✓" : "✗";
    const tail = meta.genres.length ? ` [${meta.genres.slice(0, 3).join(", ")}]` : "";
    console.log(`[${processed}/${queue.length}] ${flag} ${a}${tail}  (${meta.source})`);
    if (processed % 10 === 0) trySave();
  });

  writeFileSync(OUT_FILE, JSON.stringify(result, null, 2));
  const finalHits = Object.values(result).filter(v => v.photo).length;
  console.log(`\nDone. ${finalHits}/${allArtists.length} artists have photos (${finalHits - initialHits} new this run). Wrote ${OUT_FILE}`);
}

main();
