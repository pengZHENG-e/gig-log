import { createClient } from "@supabase/supabase-js";

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

const supabase = createClient(url, anonKey);

const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
if (authErr || !auth.user) {
  console.error("Sign-in failed:", authErr?.message);
  process.exit(1);
}
const userId = auth.user.id;
console.log(`Signed in as ${email} (id: ${userId.slice(0, 8)}…)`);

const { count: before } = await supabase
  .from("gigs")
  .select("*", { count: "exact", head: true })
  .eq("user_id", userId);
console.log(`Found ${before ?? 0} gigs for this user. Clearing ratings → 0…`);

const { error } = await supabase
  .from("gigs")
  .update({ rating: 0 })
  .eq("user_id", userId);

if (error) {
  console.error("Update failed:", error.message);
  process.exit(1);
}

await supabase.auth.signOut();
console.log(`✓ Done. All ratings reset to 0 (unrated).`);
