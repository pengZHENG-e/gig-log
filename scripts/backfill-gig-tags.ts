/* eslint-disable @typescript-eslint/no-explicit-any */
// Merges artist genres (from public/artists.json) into each gig's `tags` array in Supabase.
// Existing user tags are preserved; merge is case-insensitive (preserves first-seen casing).
// Caps at 8 tags per gig. Reports a summary before writing.
//
// Run: bun run scripts/backfill-gig-tags.ts            # dry-run, print summary
//      bun run scripts/backfill-gig-tags.ts --apply    # actually write to DB
//      bun run scripts/backfill-gig-tags.ts --apply --max-per-gig 6
//
// Required env: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
//               SUPABASE_EMAIL, SUPABASE_PASSWORD

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const email = process.env.SUPABASE_EMAIL;
const password = process.env.SUPABASE_PASSWORD;

if (!url || !anonKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}
if (!email || !password) {
  console.error("Missing SUPABASE_EMAIL or SUPABASE_PASSWORD");
  process.exit(1);
}

const APPLY = process.argv.includes("--apply");
const MAX_IDX = process.argv.indexOf("--max-per-gig");
const MAX_PER_GIG = MAX_IDX >= 0 ? parseInt(process.argv[MAX_IDX + 1], 10) : 8;

interface ArtistMeta { genres?: string[] }
const artists: Record<string, ArtistMeta> = JSON.parse(
  readFileSync(resolve("public/artists.json"), "utf-8")
);

const supabase = createClient(url, anonKey);
const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
if (authErr || !auth.user) {
  console.error("Sign-in failed:", authErr?.message);
  process.exit(1);
}
const userId = auth.user.id;
console.log(`Signed in as ${email} (id: ${userId.slice(0, 8)}…)`);

interface Gig { id: string; artist: string; tags: string[] }
const { data: gigs, error: fetchErr } = await supabase
  .from("gigs")
  .select("id, artist, tags")
  .eq("user_id", userId);
if (fetchErr || !gigs) {
  console.error("Fetch failed:", fetchErr?.message);
  process.exit(1);
}
console.log(`Fetched ${gigs.length} gigs.`);

let toUpdate: { id: string; artist: string; before: string[]; after: string[] }[] = [];
let noArtistMeta = 0;
let noGenres = 0;
let alreadyComplete = 0;

for (const g of gigs as Gig[]) {
  const meta = artists[g.artist];
  if (!meta) { noArtistMeta++; continue; }
  const genres = meta.genres ?? [];
  if (genres.length === 0) { noGenres++; continue; }

  const existing = g.tags ?? [];
  const seen = new Set(existing.map(t => t.toLowerCase()));
  const merged = [...existing];
  let added = 0;
  for (const genre of genres) {
    const key = genre.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(genre);
      added++;
    }
    if (merged.length >= MAX_PER_GIG) break;
  }
  if (added === 0) { alreadyComplete++; continue; }
  toUpdate.push({ id: g.id, artist: g.artist, before: existing, after: merged });
}

console.log("\n=== Plan ===");
console.log(`To update: ${toUpdate.length}`);
console.log(`No artist metadata: ${noArtistMeta}`);
console.log(`Artist has no genres: ${noGenres}`);
console.log(`Already complete (no new tags): ${alreadyComplete}`);

// Sample preview
const withExisting = toUpdate.filter(u => u.before.length > 0);
const empty = toUpdate.filter(u => u.before.length === 0);
console.log(`\n=== Sample of gigs with existing tags (first 10 of ${withExisting.length}) ===`);
for (const u of withExisting.slice(0, 10)) {
  console.log(`  ${u.artist}: [${u.before.join(", ")}] → [${u.after.join(", ")}]`);
}
console.log(`\n=== Sample of gigs with empty tags (first 5 of ${empty.length}) ===`);
for (const u of empty.slice(0, 5)) {
  console.log(`  ${u.artist}: [] → [${u.after.join(", ")}]`);
}

if (!APPLY) {
  console.log("\nDry-run. Re-run with --apply to write to DB.");
  await supabase.auth.signOut();
  process.exit(0);
}

console.log(`\nApplying ${toUpdate.length} updates...`);
let done = 0;
const CHUNK = 50;
for (let i = 0; i < toUpdate.length; i += CHUNK) {
  const chunk = toUpdate.slice(i, i + CHUNK);
  await Promise.all(chunk.map(async u => {
    const { error } = await supabase.from("gigs").update({ tags: u.after }).eq("id", u.id);
    if (error) console.error(`  ! ${u.artist} (${u.id}): ${error.message}`);
    else done++;
  }));
  console.log(`  ${done}/${toUpdate.length}`);
}

await supabase.auth.signOut();
console.log(`✓ Done. ${done} gigs updated.`);
