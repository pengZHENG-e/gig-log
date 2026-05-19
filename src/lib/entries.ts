import { supabase } from "./supabase";
import type { Category } from "./categories";

export interface Entry {
  id: string;
  category: Category;
  date: string;
  end_date?: string;
  title: string;
  subtitle: string;
  city: string;
  country: string;
  rating: number;
  notes: string;
  tags: string[];
  companions: string[];
  extras: Record<string, unknown>;
}

export type EntryInput = Omit<Entry, "id">;

function rowToEntry(row: Record<string, unknown>): Entry {
  return {
    id: row.id as string,
    category: row.category as Category,
    date: row.date as string,
    end_date: (row.end_date as string) ?? undefined,
    title: (row.title as string) ?? "",
    subtitle: (row.subtitle as string) ?? "",
    city: (row.city as string) ?? "",
    country: (row.country as string) ?? "",
    rating: (row.rating as number) ?? 0,
    notes: (row.notes as string) ?? "",
    tags: (row.tags as string[]) ?? [],
    companions: (row.companions as string[]) ?? [],
    extras: (row.extras as Record<string, unknown>) ?? {},
  };
}

export async function fetchEntries(category: Category): Promise<Entry[]> {
  const { data, error } = await supabase
    .from("entries")
    .select("*")
    .eq("category", category)
    .order("date", { ascending: false });
  if (error) {
    console.error("fetchEntries:", error.message);
    return [];
  }
  return (data ?? []).map(rowToEntry);
}

export async function insertEntry(entry: EntryInput, userId: string): Promise<Entry | null> {
  const payload = { ...entry, user_id: userId };
  if (!payload.end_date) delete (payload as { end_date?: string }).end_date;
  const { data, error } = await supabase.from("entries").insert(payload).select().single();
  if (error) {
    console.error("insertEntry:", error.message);
    return null;
  }
  return rowToEntry(data);
}

export async function updateEntry(id: string, entry: EntryInput): Promise<boolean> {
  const payload: Record<string, unknown> = { ...entry };
  if (!payload.end_date) payload.end_date = null;
  const { error } = await supabase.from("entries").update(payload).eq("id", id);
  if (error) {
    console.error("updateEntry:", error.message);
    return false;
  }
  return true;
}

export async function deleteEntry(id: string): Promise<boolean> {
  const { error } = await supabase.from("entries").delete().eq("id", id);
  if (error) {
    console.error("deleteEntry:", error.message);
    return false;
  }
  return true;
}

export function blankEntry(category: Category): EntryInput {
  return {
    category,
    date: "",
    end_date: undefined,
    title: "",
    subtitle: "",
    city: "",
    country: "",
    rating: 0,
    notes: "",
    tags: [],
    companions: [],
    extras: {},
  };
}
