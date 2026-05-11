/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const email = process.env.SUPABASE_EMAIL;
const password = process.env.SUPABASE_PASSWORD;

if (!url || !anonKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
  process.exit(1);
}
if (!email || !password) {
  console.error("Missing SUPABASE_EMAIL or SUPABASE_PASSWORD env vars");
  process.exit(1);
}

const csvArg = process.argv[2];
if (!csvArg) {
  console.error("Usage: bun run scripts/import-csv.ts <path-to-csv>");
  process.exit(1);
}
const csvPath = resolve(csvArg);

function parseCSVLine(line: string): string[] {
  const out: string[] = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (c === "," && !inQ) {
      out.push(cur); cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out;
}

const text = readFileSync(csvPath, "utf-8");
const lines = text.trim().split(/\r?\n/);
if (lines.length < 2) { console.error("CSV is empty"); process.exit(1); }
const headers = parseCSVLine(lines[0]).map(h => h.trim());

const rows = lines.slice(1).filter(l => l.trim()).map(line => {
  const vals = parseCSVLine(line);
  return Object.fromEntries(headers.map((h, i) => [h, (vals[i] ?? "").trim()])) as Record<string, string>;
});

const supabase = createClient(url, anonKey);

const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
if (authErr || !auth.user) {
  console.error("Sign-in failed:", authErr?.message);
  process.exit(1);
}
const userId = auth.user.id;
console.log(`Signed in as ${email} (id: ${userId.slice(0, 8)}…)`);

const records = rows.map(r => ({
  user_id: userId,
  date: r.date,
  artist: r.artist,
  venue: r.venue || "",
  city: r.city || "",
  country: r.country || "",
  rating: r.rating ? Math.min(5, Math.max(1, Number(r.rating))) : 5,
  price: r.price ? Number(r.price) : null,
  currency: r.currency || "EUR",
  tags: r.tags ? r.tags.split(";").map(s => s.trim()).filter(Boolean) : [],
  companions: r.companions ? r.companions.split(";").map(s => s.trim()).filter(Boolean) : [],
  setlist: r.setlist ? r.setlist.split(";").map(s => s.trim()).filter(Boolean) : [],
  notes: r.notes || "",
})).filter(r => r.artist && r.date);

console.log(`Parsed ${records.length} valid records from ${csvPath}`);

const CHUNK = 200;
let inserted = 0;
for (let i = 0; i < records.length; i += CHUNK) {
  const chunk = records.slice(i, i + CHUNK);
  const { error } = await supabase.from("gigs").insert(chunk);
  if (error) {
    console.error(`Insert failed at chunk ${i}-${i + chunk.length}:`, error.message);
    process.exit(1);
  }
  inserted += chunk.length;
  console.log(`  inserted ${inserted}/${records.length}`);
}

await supabase.auth.signOut();
console.log(`✓ Done. ${inserted} records inserted.`);
