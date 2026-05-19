/* eslint-disable @typescript-eslint/no-explicit-any */
// One-shot script: rename a list of artists in the gigs table.
// Usage: bun run scripts/rename-artists.ts

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const email = process.env.SUPABASE_EMAIL;
const password = process.env.SUPABASE_PASSWORD;

if (!url || !anonKey || !email || !password) {
  console.error("Missing Supabase env vars");
  process.exit(1);
}

const RENAMES: Array<{ from: string; to: string }> = [
  { from: "Blood Wizzard", to: "Blood Wizard" },
  { from: "RHE DSM IV", to: "The DSM IV" },
  { from: "The Bernadettes Maries", to: "The Bernadette Maries" },
];

const supabase = createClient(url, anonKey);
const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
if (authErr || !auth.user) {
  console.error("Sign-in failed:", authErr?.message);
  process.exit(1);
}
const userId = auth.user.id;
console.log(`Signed in as ${email}`);

for (const { from, to } of RENAMES) {
  const { data, error } = await supabase
    .from("gigs")
    .update({ artist: to })
    .eq("user_id", userId)
    .eq("artist", from)
    .select("id, date");
  if (error) {
    console.error(`  ✗ ${from} → ${to}: ${error.message}`);
    continue;
  }
  console.log(`  ✓ ${from} → ${to}  (${data?.length ?? 0} row${data?.length === 1 ? "" : "s"})`);
}

await supabase.auth.signOut();
console.log("Done.");
