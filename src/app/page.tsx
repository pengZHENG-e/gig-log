"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

// ─── Types ───────────────────────────────────────────────────────────────────

type Lang = "zh" | "en";
type Tab = "home" | "stats" | "recap";
type SortBy = "date-desc" | "date-asc" | "rating-desc";

interface Profile {
  display_name: string;
  city: string;
  country: string;
  currency: string;
}

interface Gig {
  id: string;
  artist: string;
  venue: string;
  date: string;
  city: string;
  country: string;
  tags: string[];
  rating: number;
  notes: string;
  price?: number;
  currency: string;
  companions: string[];
  setlist: string[];
}

// ─── i18n ────────────────────────────────────────────────────────────────────

const i18n = {
  zh: {
    appName: "Gig Tracker",
    add: "+ 记录",
    langToggle: "EN",
    signOut: "退出登录",
    exportCsv: "导出 CSV",
    darkMode: "深色模式",
    settings: "设置",
    nav: { home: "记录", stats: "统计", recap: "年度" },
    filter: {
      search: "搜索艺人、场馆、城市...",
      title: "筛选",
      year: "年份",
      genre: "风格",
      venue: "场馆",
      sort: "排序",
      all: "全部",
      newest: "最新",
      oldest: "最早",
      topRated: "评分最高",
      reset: "重置",
    },
    form: {
      createTitle: "记录新 Gig",
      editTitle: "编辑 Gig",
      artist: "艺人 / 乐队 *",
      date: "日期 *",
      venue: "场馆",
      city: "城市",
      country: "国家",
      tags: "标签（回车添加）",
      tagsPlaceholder: "rock, jazz, pop...",
      presetTags: "快选",
      rating: "评分",
      price: "票价",
      currency: "货币",
      companions: "同行的人（回车添加）",
      companionsPlaceholder: "名字",
      setlist: "歌单（回车添加）",
      setlistPlaceholder: "歌曲名",
      notes: "笔记 / 感受",
      notesPlaceholder: "写下你的感受...",
      save: "保存",
      saveChanges: "保存修改",
      cancel: "取消",
    },
    detail: {
      edit: "编辑",
      delete: "删除",
      confirmDelete: "确定要删除这条记录吗？",
      setlist: "歌单",
      companions: "同行",
      paid: "票价",
      notes: "笔记",
    },
    stats: {
      total: "总场次", artists: "艺人数", cities: "城市数",
      avgRating: "平均评分", totalSpent: "总花费",
      citiesTitle: "去过的城市", shows: "场",
    },
    recap: {
      total: "场演出", topArtist: "最常看", topCity: "常去城市",
      bestShow: "最佳演出", totalSpent: "总花费", topTag: "最爱类型",
      times: "次", noData: "这年没有记录",
    },
    empty: "还没有记录，点右上角开始吧 🎸",
    noResults: "没有找到相关演出",
    loading: "加载中...",
    shows: "场",
    profile: {
      title: "个人资料",
      menu: "个人资料",
      displayName: "昵称",
      city: "默认城市",
      country: "默认国家",
      currency: "默认货币",
      email: "邮箱",
      save: "保存",
      saved: "已保存 ✓",
    },
    import: {
      menu: "导入数据",
      title: "批量导入",
      desc: "上传 CSV 或 JSON 文件，支持从 Excel / Google Sheets 导出的 CSV。",
      downloadTemplate: "下载 CSV 模板",
      dropzone: "点击选择文件，或拖拽到此处",
      accepts: "支持 .csv 和 .json",
      preview: "预览（前5条）",
      total: "共",
      valid: "条有效记录",
      invalid: "条跳过（缺少艺人或日期）",
      confirm: "确认导入",
      importing: "导入中...",
      done: "✓ 导入完成",
      error: "文件解析失败，请检查格式",
      cancel: "取消",
    },
    dark: "🌙", light: "☀️",
  },
  en: {
    appName: "Gig Tracker",
    add: "+ Add",
    langToggle: "中文",
    signOut: "Sign out",
    exportCsv: "Export CSV",
    darkMode: "Dark mode",
    settings: "Settings",
    nav: { home: "Log", stats: "Stats", recap: "Recap" },
    filter: {
      search: "Search artist, venue, city...",
      title: "Filter",
      year: "Year",
      genre: "Genre",
      venue: "Venue",
      sort: "Sort",
      all: "All",
      newest: "Newest",
      oldest: "Oldest",
      topRated: "Top rated",
      reset: "Reset",
    },
    form: {
      createTitle: "Log a Gig",
      editTitle: "Edit Gig",
      artist: "Artist / Band *",
      date: "Date *",
      venue: "Venue",
      city: "City",
      country: "Country",
      tags: "Tags (press enter)",
      tagsPlaceholder: "rock, jazz, pop...",
      presetTags: "Quick add",
      rating: "Rating",
      price: "Ticket Price",
      currency: "Currency",
      companions: "Went with (press enter)",
      companionsPlaceholder: "Name",
      setlist: "Setlist (press enter)",
      setlistPlaceholder: "Song title",
      notes: "Notes",
      notesPlaceholder: "How was it?",
      save: "Save",
      saveChanges: "Save changes",
      cancel: "Cancel",
    },
    detail: {
      edit: "Edit",
      delete: "Delete",
      confirmDelete: "Delete this gig?",
      setlist: "Setlist",
      companions: "Went with",
      paid: "Paid",
      notes: "Notes",
    },
    stats: {
      total: "Total Shows", artists: "Artists", cities: "Cities",
      avgRating: "Avg Rating", totalSpent: "Total Spent",
      citiesTitle: "Cities Visited", shows: "shows",
    },
    recap: {
      total: "shows", topArtist: "Most Seen", topCity: "Top City",
      bestShow: "Best Show", totalSpent: "Total Spent", topTag: "Top Genre",
      times: "times", noData: "No gigs this year",
    },
    profile: {
      title: "Profile",
      menu: "Profile",
      displayName: "Display name",
      city: "Default city",
      country: "Default country",
      currency: "Default currency",
      email: "Email",
      save: "Save",
      saved: "Saved ✓",
    },
    import: {
      menu: "Import data",
      title: "Bulk import",
      desc: "Upload a CSV or JSON file. CSV can be exported from Excel or Google Sheets.",
      downloadTemplate: "Download CSV template",
      dropzone: "Click to choose a file, or drag & drop",
      accepts: "Supports .csv and .json",
      preview: "Preview (first 5)",
      total: "",
      valid: "valid records found",
      invalid: "skipped (missing artist or date)",
      confirm: "Import all",
      importing: "Importing...",
      done: "✓ Done",
      error: "Failed to parse file — please check the format",
      cancel: "Cancel",
    },
    empty: "No gigs yet. Tap + Add to start 🎸",
    noResults: "No gigs match your search",
    loading: "Loading...",
    shows: "shows",
    dark: "🌙", light: "☀️",
  },
} as const;

// ─── Constants ───────────────────────────────────────────────────────────────

const CURRENCIES = ["CNY", "USD", "GBP", "EUR", "HKD", "JPY", "AUD", "SGD"];
const PRESET_TAGS = ["rock", "pop", "jazz", "classical", "electronic", "hip-hop", "folk", "metal", "indie", "r&b", "punk", "soul"];

// ─── Supabase ─────────────────────────────────────────────────────────────────

function rowToGig(row: Record<string, unknown>): Gig {
  return {
    id: row.id as string,
    artist: row.artist as string,
    venue: (row.venue as string) ?? "",
    date: row.date as string,
    city: (row.city as string) ?? "",
    country: (row.country as string) ?? "",
    tags: (row.tags as string[]) ?? [],
    rating: (row.rating as number) ?? 5,
    notes: (row.notes as string) ?? "",
    price: row.price != null ? (row.price as number) : undefined,
    currency: (row.currency as string) ?? "CNY",
    companions: (row.companions as string[]) ?? [],
    setlist: (row.setlist as string[]) ?? [],
  };
}

async function fetchGigs(): Promise<Gig[]> {
  const { data, error } = await supabase.from("gigs").select("*").order("date", { ascending: false });
  if (error) { console.error("fetchGigs:", error.message); return []; }
  return (data ?? []).map(rowToGig);
}

async function insertGig(gig: Omit<Gig, "id">, userId: string): Promise<Gig | null> {
  const { data, error } = await supabase.from("gigs").insert({ ...gig, user_id: userId }).select().single();
  if (error) { console.error("insertGig:", error.message); return null; }
  return rowToGig(data);
}

async function updateGigById(id: string, gig: Omit<Gig, "id">): Promise<boolean> {
  const { error } = await supabase.from("gigs").update(gig).eq("id", id);
  if (error) { console.error("updateGig:", error.message); return false; }
  return true;
}

async function deleteGigById(id: string) {
  await supabase.from("gigs").delete().eq("id", id);
}

const DEFAULT_PROFILE: Profile = { display_name: "", city: "", country: "", currency: "CNY" };

async function fetchProfile(userId: string): Promise<Profile> {
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (!data) return DEFAULT_PROFILE;
  return { display_name: data.display_name ?? "", city: data.city ?? "", country: data.country ?? "", currency: data.currency ?? "CNY" };
}

async function upsertProfile(userId: string, profile: Profile): Promise<boolean> {
  const { error } = await supabase.from("profiles").upsert({ id: userId, ...profile, updated_at: new Date().toISOString() });
  if (error) { console.error("upsertProfile:", error.message); return false; }
  return true;
}

async function bulkInsertGigs(gigs: Omit<Gig, "id">[], userId: string): Promise<number> {
  const rows = gigs.map(g => ({ ...g, user_id: userId }));
  // Supabase insert limit ~1000 per call; chunk just in case
  let count = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await supabase.from("gigs").insert(rows.slice(i, i + 500));
    if (!error) count += Math.min(500, rows.length - i);
  }
  return count;
}

// ─── CSV / JSON parse ─────────────────────────────────────────────────────────

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (line[i] === ',' && !inQ) {
      result.push(cur); cur = "";
    } else cur += line[i];
  }
  result.push(cur);
  return result;
}

// Map flexible header names → canonical field names
const HEADER_MAP: Record<string, keyof Omit<Gig, "id">> = {
  date: "date", "日期": "date",
  artist: "artist", "艺人": "artist", band: "artist", "乐队": "artist",
  venue: "venue", "场馆": "venue",
  city: "city", "城市": "city",
  country: "country", "国家": "country",
  rating: "rating", "评分": "rating",
  price: "price", "票价": "price",
  currency: "currency", "货币": "currency",
  tags: "tags", "标签": "tags",
  companions: "companions", "同行": "companions",
  setlist: "setlist", "歌单": "setlist",
  notes: "notes", "笔记": "notes",
};

function rowToImportGig(row: Record<string, string>): Omit<Gig, "id"> | null {
  const g: Partial<Omit<Gig, "id">> & { artist?: string; date?: string } = {};
  for (const [key, val] of Object.entries(row)) {
    const field = HEADER_MAP[key.trim().toLowerCase()] ?? HEADER_MAP[key.trim()];
    if (!field) continue;
    const v = val.trim();
    if (field === "rating") g.rating = Math.min(5, Math.max(1, Number(v) || 5));
    else if (field === "price") g.price = v ? Number(v) : undefined;
    else if (field === "tags" || field === "companions" || field === "setlist")
      (g as Record<string, string[]>)[field] = v ? v.split(";").map(s => s.trim()).filter(Boolean) : [];
    else (g as Record<string, string>)[field] = v;
  }
  if (!g.artist?.trim() || !g.date?.trim()) return null;
  return {
    artist: g.artist, date: g.date,
    venue: g.venue ?? "", city: g.city ?? "", country: g.country ?? "",
    rating: g.rating ?? 5, notes: g.notes ?? "",
    price: g.price, currency: g.currency ?? "CNY",
    tags: g.tags ?? [], companions: g.companions ?? [], setlist: g.setlist ?? [],
  };
}

function parseImportFile(text: string, filename: string): { valid: Omit<Gig, "id">[]; skipped: number } {
  let rows: Record<string, string>[] = [];
  if (filename.endsWith(".json")) {
    const parsed = JSON.parse(text);
    rows = Array.isArray(parsed) ? parsed : [];
  } else {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return { valid: [], skipped: 0 };
    const headers = parseCSVLine(lines[0]);
    rows = lines.slice(1).filter(l => l.trim()).map(l => {
      const vals = parseCSVLine(l);
      return Object.fromEntries(headers.map((h, i) => [h.trim(), vals[i]?.trim() ?? ""]));
    });
  }
  const valid: Omit<Gig, "id">[] = [];
  let skipped = 0;
  for (const row of rows) {
    const g = rowToImportGig(row);
    if (g) valid.push(g); else skipped++;
  }
  return { valid, skipped };
}

function downloadCSVTemplate() {
  const headers = ["date", "artist", "venue", "city", "country", "rating", "price", "currency", "tags", "companions", "setlist", "notes"];
  const example = ["2024-06-15", "Arctic Monkeys", "O2 Arena", "London", "UK", "5", "80", "GBP", "rock;indie", "Alice;Bob", "R U Mine?;Do I Wanna Know?", "Amazing show!"];
  const csv = [headers, example].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "gig-tracker-template.csv"; a.click();
  URL.revokeObjectURL(url);
}

function exportCSV(gigs: Gig[], lang: Lang) {
  const headers = lang === "zh"
    ? ["日期", "艺人", "场馆", "城市", "国家", "评分", "票价", "货币", "标签", "同行", "歌单", "笔记"]
    : ["Date", "Artist", "Venue", "City", "Country", "Rating", "Price", "Currency", "Tags", "Companions", "Setlist", "Notes"];
  const rows = gigs.map(g => [
    g.date, g.artist, g.venue, g.city, g.country, g.rating,
    g.price ?? "", g.currency, g.tags.join(";"), g.companions.join(";"),
    g.setlist.join(";"), g.notes,
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "gig-tracker.csv"; a.click();
  URL.revokeObjectURL(url);
}

// ─── StarRating ───────────────────────────────────────────────────────────────

function StarRating({ value, onChange, size = "md" }: {
  value: number; onChange?: (v: number) => void; size?: "sm" | "md" | "lg";
}) {
  const sz = size === "sm" ? "text-base" : size === "lg" ? "text-3xl" : "text-xl";
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <button key={s} type="button" onClick={() => onChange?.(s)}
          className={`${sz} ${s <= value ? "text-yellow-400" : "text-gray-200 dark:text-slate-700"} ${onChange ? "cursor-pointer hover:scale-110" : "cursor-default"} transition-transform`}>
          ★
        </button>
      ))}
    </div>
  );
}

// ─── ChipInput ────────────────────────────────────────────────────────────────

function ChipInput({ values, onChange, placeholder }: {
  values: string[]; onChange: (v: string[]) => void; placeholder?: string;
}) {
  const [input, setInput] = useState("");
  const add = () => {
    const v = input.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setInput("");
  };
  return (
    <div className="space-y-1.5">
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {values.map(v => (
            <span key={v} className="flex items-center gap-1 bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs px-2.5 py-1 rounded-full">
              {v}
              <button type="button" onClick={() => onChange(values.filter(x => x !== v))} className="hover:text-red-500 ml-0.5">×</button>
            </span>
          ))}
        </div>
      )}
      <input
        className="w-full border dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        value={input} placeholder={placeholder}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
        onBlur={add}
      />
    </div>
  );
}

// ─── GigForm ─────────────────────────────────────────────────────────────────

function GigForm({ initial, onSave, onCancel, lang, editMode = false }: {
  initial?: Omit<Gig, "id">;
  onSave: (g: Omit<Gig, "id">) => void;
  onCancel: () => void;
  lang: Lang;
  editMode?: boolean;
}) {
  const t = i18n[lang].form;
  const blank: Omit<Gig, "id"> = {
    artist: "", venue: "", date: "", city: "", country: "",
    tags: [], rating: 5, notes: "", price: undefined, currency: "CNY",
    companions: [], setlist: [],
  };
  const [form, setForm] = useState<Omit<Gig, "id">>(initial ?? blank);
  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.artist.trim() || !form.date) return;
    onSave(form);
  };

  const inputCls = "w-full border dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Basic */}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 sm:col-span-1">
          <label className="text-xs font-medium text-gray-500 dark:text-slate-400">{t.artist}</label>
          <input required className={`${inputCls} mt-1.5`} value={form.artist} onChange={e => set("artist", e.target.value)} />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="text-xs font-medium text-gray-500 dark:text-slate-400">{t.date}</label>
          <input required type="date" className={`${inputCls} mt-1.5`} value={form.date} onChange={e => set("date", e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-slate-400">{t.venue}</label>
          <input className={`${inputCls} mt-1.5`} value={form.venue} onChange={e => set("venue", e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-slate-400">{t.city}</label>
          <input className={`${inputCls} mt-1.5`} value={form.city} onChange={e => set("city", e.target.value)} />
        </div>
        <div className="col-span-2">
          <label className="text-xs font-medium text-gray-500 dark:text-slate-400">{t.country}</label>
          <input className={`${inputCls} mt-1.5`} value={form.country} onChange={e => set("country", e.target.value)} />
        </div>
      </div>

      {/* Rating + Price */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-slate-400">{t.rating}</label>
          <div className="mt-2"><StarRating value={form.rating} onChange={v => set("rating", v)} /></div>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-slate-400">{t.price}</label>
          <div className="flex gap-1.5 mt-1.5">
            <select className="border dark:border-slate-600 rounded-xl px-2 py-2.5 text-sm bg-white dark:bg-slate-700 focus:outline-none"
              value={form.currency} onChange={e => set("currency", e.target.value)}>
              {CURRENCIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <input type="number" min="0" placeholder="0"
              className="flex-1 border dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={form.price ?? ""} onChange={e => set("price", e.target.value ? Number(e.target.value) : undefined)} />
          </div>
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="text-xs font-medium text-gray-500 dark:text-slate-400">{t.tags}</label>
        <div className="mt-1.5"><ChipInput values={form.tags} onChange={v => set("tags", v)} placeholder={t.tagsPlaceholder} /></div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          <span className="text-xs text-gray-400 dark:text-slate-500">{t.presetTags}:</span>
          {PRESET_TAGS.map(tag => (
            <button key={tag} type="button" onClick={() => !form.tags.includes(tag) && set("tags", [...form.tags, tag])}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${form.tags.includes(tag) ? "bg-indigo-600 text-white border-indigo-600" : "border-gray-200 dark:border-slate-600 hover:border-indigo-400 text-gray-500 dark:text-slate-400"}`}>
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Companions */}
      <div>
        <label className="text-xs font-medium text-gray-500 dark:text-slate-400">{t.companions}</label>
        <div className="mt-1.5"><ChipInput values={form.companions} onChange={v => set("companions", v)} placeholder={t.companionsPlaceholder} /></div>
      </div>

      {/* Setlist */}
      <div>
        <label className="text-xs font-medium text-gray-500 dark:text-slate-400">{t.setlist}</label>
        <div className="mt-1.5"><ChipInput values={form.setlist} onChange={v => set("setlist", v)} placeholder={t.setlistPlaceholder} /></div>
      </div>

      {/* Notes */}
      <div>
        <label className="text-xs font-medium text-gray-500 dark:text-slate-400">{t.notes}</label>
        <textarea className="w-full mt-1.5 border dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm h-24 resize-none bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          value={form.notes} onChange={e => set("notes", e.target.value)} placeholder={t.notesPlaceholder} />
      </div>

      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="px-4 py-2.5 text-sm text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 rounded-xl border border-gray-200 dark:border-slate-600">
          {t.cancel}
        </button>
        <button type="submit" className="px-6 py-2.5 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium">
          {editMode ? t.saveChanges : t.save}
        </button>
      </div>
    </form>
  );
}

// ─── GigDetailModal ───────────────────────────────────────────────────────────

function GigDetailModal({ gig, lang, onClose, onUpdate, onDelete }: {
  gig: Gig; lang: Lang;
  onClose: () => void;
  onUpdate: (updated: Gig) => void;
  onDelete: (id: string) => void;
}) {
  const t = i18n[lang];
  const dt = t.detail;
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  const dateStr = new Date(gig.date + "T00:00:00").toLocaleDateString(lang === "zh" ? "zh-CN" : "en-GB", {
    year: "numeric", month: "long", day: "numeric",
  });

  const handleUpdate = async (data: Omit<Gig, "id">) => {
    setSaving(true);
    const ok = await updateGigById(gig.id, data);
    if (ok) onUpdate({ ...data, id: gig.id });
    setSaving(false);
    setEditing(false);
  };

  const handleDelete = async () => {
    await deleteGigById(gig.id);
    onDelete(gig.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle bar (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-gray-200 dark:bg-slate-600 rounded-full" />
        </div>

        <div className="px-6 pb-8 pt-4">
          {editing ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold">{t.form.editTitle}</h2>
                <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 text-xl">×</button>
              </div>
              <GigForm
                lang={lang}
                initial={{ artist: gig.artist, venue: gig.venue, date: gig.date, city: gig.city, country: gig.country, tags: gig.tags, rating: gig.rating, notes: gig.notes, price: gig.price, currency: gig.currency, companions: gig.companions, setlist: gig.setlist }}
                onSave={handleUpdate}
                onCancel={() => setEditing(false)}
                editMode
              />
              {saving && <p className="text-center text-sm text-gray-400 mt-2">{t.loading}</p>}
            </>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-start justify-between mb-1">
                <h2 className="text-2xl font-bold pr-4">{gig.artist}</h2>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 text-2xl shrink-0">×</button>
              </div>

              <p className="text-gray-500 dark:text-slate-400 text-sm mb-3">
                {[dateStr, gig.venue, gig.city, gig.country].filter(Boolean).join("  ·  ")}
              </p>

              <StarRating value={gig.rating} size="lg" />

              {/* Tags + price */}
              {(gig.tags.length > 0 || gig.price != null) && (
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {gig.tags.map(tag => (
                    <span key={tag} className="text-sm bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-full">{tag}</span>
                  ))}
                  {gig.price != null && (
                    <span className="text-sm bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-3 py-1 rounded-full">{dt.paid}: {gig.currency} {gig.price}</span>
                  )}
                </div>
              )}

              {/* Companions */}
              {gig.companions.length > 0 && (
                <div className="mt-5">
                  <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-1.5">{dt.companions}</p>
                  <p className="text-sm text-gray-700 dark:text-slate-300">{gig.companions.join(", ")}</p>
                </div>
              )}

              {/* Notes */}
              {gig.notes && (
                <div className="mt-5">
                  <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-1.5">{dt.notes}</p>
                  <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed">{gig.notes}</p>
                </div>
              )}

              {/* Setlist */}
              {gig.setlist.length > 0 && (
                <div className="mt-5">
                  <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-2">{dt.setlist}</p>
                  <ol className="space-y-1">
                    {gig.setlist.map((song, i) => (
                      <li key={i} className="flex gap-3 text-sm">
                        <span className="text-gray-300 dark:text-slate-600 w-5 text-right shrink-0">{i + 1}</span>
                        <span className="text-gray-700 dark:text-slate-300">{song}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 mt-8">
                {confirming ? (
                  <>
                    <p className="flex-1 text-sm text-gray-600 dark:text-slate-400 flex items-center">{dt.confirmDelete}</p>
                    <button onClick={() => setConfirming(false)} className="px-4 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-xl text-gray-500 hover:text-gray-700">{t.form.cancel}</button>
                    <button onClick={handleDelete} className="px-4 py-2 text-sm bg-red-500 text-white rounded-xl hover:bg-red-600">{dt.delete}</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setConfirming(true)} className="px-4 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-xl text-red-400 hover:text-red-600 hover:border-red-300 transition-colors">
                      {dt.delete}
                    </button>
                    <button onClick={() => setEditing(true)} className="flex-1 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium">
                      {dt.edit}
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── GigCard ─────────────────────────────────────────────────────────────────

function GigCard({ gig, onClick, lang }: { gig: Gig; onClick: () => void; lang: Lang }) {
  const dateStr = new Date(gig.date + "T00:00:00").toLocaleDateString(lang === "zh" ? "zh-CN" : "en-GB", {
    year: "numeric", month: "short", day: "numeric",
  });

  return (
    <div onClick={onClick} className="w-full text-left bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-4 border border-gray-100 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-md transition-all active:scale-[0.99] cursor-pointer">
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-base leading-snug truncate">{gig.artist}</p>
          <p className="text-sm text-gray-400 dark:text-slate-500 truncate mt-0.5">
            {[gig.venue, gig.city].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-gray-400 dark:text-slate-500">{dateStr}</p>
          <StarRating value={gig.rating} size="sm" />
        </div>
      </div>
      {(gig.tags.length > 0 || gig.price != null) && (
        <div className="flex flex-wrap gap-1 mt-2.5">
          {gig.tags.map(tag => (
            <span key={tag} className="text-xs bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full">{tag}</span>
          ))}
          {gig.price != null && (
            <span className="text-xs bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full">{gig.currency} {gig.price}</span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── ImportModal ─────────────────────────────────────────────────────────────

function ImportModal({ user, lang, onImported, onClose }: {
  user: User; lang: Lang; onImported: (gigs: Gig[]) => void; onClose: () => void;
}) {
  const t = i18n[lang].import;
  const [parsed, setParsed] = useState<{ valid: Omit<Gig, "id">[]; skipped: number } | null>(null);
  const [parseError, setParseError] = useState("");
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setParseError(""); setParsed(null); setDone(false);
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const result = parseImportFile(e.target?.result as string, file.name);
        setParsed(result);
      } catch {
        setParseError(t.error);
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleImport = async () => {
    if (!parsed?.valid.length) return;
    setImporting(true);
    const count = await bulkInsertGigs(parsed.valid, user.id);
    // Refetch to get proper IDs
    const { data } = await supabase.from("gigs").select("*").order("date", { ascending: false }).limit(count + 10);
    const newGigs = (data ?? []).slice(0, count).map(rowToGig);
    onImported(newGigs);
    setImporting(false);
    setDone(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-gray-200 dark:bg-slate-600 rounded-full" />
        </div>
        <div className="px-6 pb-8 pt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">{t.title}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 text-2xl">×</button>
          </div>

          <p className="text-sm text-gray-500 dark:text-slate-400">{t.desc}</p>

          <button onClick={downloadCSVTemplate}
            className="text-sm text-indigo-600 dark:text-indigo-400 underline underline-offset-2 hover:text-indigo-700">
            ↓ {t.downloadTemplate}
          </button>

          {/* Drop zone */}
          <div
            onDrop={handleDrop} onDragOver={e => e.preventDefault()}
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-gray-200 dark:border-slate-600 rounded-2xl p-8 text-center cursor-pointer hover:border-indigo-400 transition-colors">
            <p className="text-sm text-gray-500 dark:text-slate-400">{t.dropzone}</p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{t.accepts}</p>
            <input ref={inputRef} type="file" accept=".csv,.json" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          </div>

          {parseError && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2">{parseError}</p>}

          {parsed && (
            <div className="space-y-3">
              {/* Summary */}
              <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-3 text-sm space-y-1">
                <p className="text-green-600 dark:text-green-400 font-medium">✓ {lang === "zh" ? `共 ${parsed.valid.length} ${t.valid}` : `${parsed.valid.length} ${t.valid}`}</p>
                {parsed.skipped > 0 && <p className="text-gray-400 dark:text-slate-500">{parsed.skipped} {t.invalid}</p>}
              </div>

              {/* Preview */}
              {parsed.valid.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-2">{t.preview}</p>
                  <div className="space-y-1.5">
                    {parsed.valid.slice(0, 5).map((g, i) => (
                      <div key={i} className="flex gap-3 text-sm bg-white dark:bg-slate-800 rounded-xl px-3 py-2 border border-gray-100 dark:border-slate-700">
                        <span className="font-medium truncate flex-1">{g.artist}</span>
                        <span className="text-gray-400 dark:text-slate-500 shrink-0">{g.date}</span>
                        <span className="text-gray-400 dark:text-slate-500 shrink-0">{"★".repeat(g.rating)}</span>
                      </div>
                    ))}
                    {parsed.valid.length > 5 && (
                      <p className="text-xs text-center text-gray-400 dark:text-slate-500">... {parsed.valid.length - 5} {lang === "zh" ? "条更多" : "more"}</p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={onClose} className="flex-1 py-2.5 text-sm border border-gray-200 dark:border-slate-600 rounded-xl text-gray-500 hover:text-gray-700">{t.cancel}</button>
                {!done ? (
                  <button onClick={handleImport} disabled={importing || parsed.valid.length === 0}
                    className="flex-1 py-2.5 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 font-medium">
                    {importing ? t.importing : t.confirm}
                  </button>
                ) : (
                  <button onClick={onClose} className="flex-1 py-2.5 text-sm bg-green-500 text-white rounded-xl font-medium">{t.done}</button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ProfileModal ─────────────────────────────────────────────────────────────

function ProfileModal({ user, profile, lang, onSave, onClose }: {
  user: User; profile: Profile; lang: Lang;
  onSave: (p: Profile) => void; onClose: () => void;
}) {
  const t = i18n[lang].profile;
  const [form, setForm] = useState<Profile>(profile);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => { setForm(f => ({ ...f, [k]: v })); setSaved(false); };

  const inputCls = "w-full border dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400";

  const handleSave = async () => {
    setSaving(true);
    const ok = await upsertProfile(user.id, form);
    if (ok) { onSave(form); setSaved(true); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-2xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-gray-200 dark:bg-slate-600 rounded-full" />
        </div>
        <div className="px-6 pb-8 pt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">{t.title}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 text-2xl">×</button>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-400 dark:text-slate-500">{t.email}</label>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-700 rounded-xl px-3 py-2.5">{user.email}</p>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-slate-400">{t.displayName}</label>
            <input className={`${inputCls} mt-1.5`} value={form.display_name} onChange={e => set("display_name", e.target.value)} placeholder="Your name" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-slate-400">{t.city}</label>
              <input className={`${inputCls} mt-1.5`} value={form.city} onChange={e => set("city", e.target.value)} placeholder="London" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-slate-400">{t.country}</label>
              <input className={`${inputCls} mt-1.5`} value={form.country} onChange={e => set("country", e.target.value)} placeholder="UK" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-slate-400">{t.currency}</label>
            <select className={`${inputCls} mt-1.5`} value={form.currency} onChange={e => set("currency", e.target.value)}>
              {CURRENCIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          <button onClick={handleSave} disabled={saving}
            className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            {saving ? "..." : saved ? t.saved : t.save}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SettingsMenu ─────────────────────────────────────────────────────────────

function SettingsMenu({ lang, dark, onToggleLang, onToggleDark, onExport, onSignOut, onProfile, onImport }: {
  lang: Lang; dark: boolean;
  onToggleLang: () => void; onToggleDark: () => void;
  onExport: () => void; onSignOut: () => void; onProfile: () => void; onImport: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const t = i18n[lang];

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(v => !v)}
        className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-400 hover:border-indigo-400 transition-colors">
        ⚙
      </button>
      {open && (
        <div className="absolute right-0 top-11 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700 py-2 w-44 z-40">
          {[
            { label: t.profile.menu, action: onProfile },
            { label: t.import.menu, action: onImport },
            { label: `${dark ? t.light : t.dark} ${t.darkMode}`, action: onToggleDark },
            { label: t.langToggle, action: onToggleLang },
            { label: t.exportCsv, action: onExport },
            { label: t.signOut, action: onSignOut, danger: true },
          ].map(({ label, action, danger }) => (
            <button key={label} onClick={() => { action(); setOpen(false); }}
              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors ${danger ? "text-red-400 hover:text-red-500" : "text-gray-700 dark:text-slate-300"}`}>
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── HomeTab ─────────────────────────────────────────────────────────────────

function HomeTab({ gigs, setGigs, lang, showForm, setShowForm, user, profile }: {
  gigs: Gig[]; setGigs: (g: Gig[]) => void;
  lang: Lang; showForm: boolean; setShowForm: (v: boolean) => void; user: User; profile: Profile;
}) {
  const t = i18n[lang];
  const ft = t.filter;

  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterYear, setFilterYear] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [filterVenue, setFilterVenue] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("date-desc");
  const [selectedGig, setSelectedGig] = useState<Gig | null>(null);

  const years = Array.from(new Set(gigs.map(g => g.date.slice(0, 4)))).sort((a, b) => Number(b) - Number(a));
  const allTags = Array.from(new Set(gigs.flatMap(g => g.tags)));
  const allVenues = Array.from(new Set(gigs.map(g => g.venue).filter(Boolean)));

  const hasActiveFilter = !!(filterYear || filterTag || filterVenue || sortBy !== "date-desc");

  const filtered = gigs
    .filter(g => {
      const q = search.toLowerCase();
      return (
        (!q || g.artist.toLowerCase().includes(q) || g.venue.toLowerCase().includes(q) || g.city.toLowerCase().includes(q) || g.country.toLowerCase().includes(q)) &&
        (!filterYear || g.date.startsWith(filterYear)) &&
        (!filterTag || g.tags.includes(filterTag)) &&
        (!filterVenue || g.venue === filterVenue)
      );
    })
    .sort((a, b) => {
      if (sortBy === "date-asc") return a.date.localeCompare(b.date);
      if (sortBy === "rating-desc") return b.rating - a.rating || b.date.localeCompare(a.date);
      return b.date.localeCompare(a.date);
    });

  const byYear: Record<string, Gig[]> = {};
  if (sortBy === "date-desc" || sortBy === "date-asc") {
    filtered.forEach(g => { const y = g.date.slice(0, 4); (byYear[y] ||= []).push(g); });
  }
  const groupedYears = Object.keys(byYear).sort((a, b) => sortBy === "date-asc" ? Number(a) - Number(b) : Number(b) - Number(a));

  const resetFilters = () => { setFilterYear(""); setFilterTag(""); setFilterVenue(""); setSortBy("date-desc"); };

  const addGig = async (data: Omit<Gig, "id">) => {
    const saved = await insertGig(data, user.id);
    if (saved) setGigs([saved, ...gigs]);
    setShowForm(false);
  };

  const handleUpdate = (updated: Gig) => {
    setGigs(gigs.map(g => g.id === updated.id ? updated : g));
    setSelectedGig(updated);
  };

  const handleDelete = (id: string) => {
    setGigs(gigs.filter(g => g.id !== id));
    setSelectedGig(null);
  };

  return (
    <div className="space-y-3">
      {/* Create form */}
      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold">{t.form.createTitle}</h2>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
          </div>
          <GigForm
            lang={lang}
            onSave={addGig}
            onCancel={() => setShowForm(false)}
            initial={{ artist: "", venue: "", date: "", city: profile.city, country: profile.country, tags: [], rating: 5, notes: "", price: undefined, currency: profile.currency, companions: [], setlist: [] }}
          />
        </div>
      )}

      {/* Search */}
      <div className="flex gap-2">
        <input
          className="flex-1 border dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          placeholder={ft.search} value={search} onChange={e => setSearch(e.target.value)}
        />
        <button onClick={() => setFilterOpen(v => !v)}
          className={`px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-colors ${filterOpen || hasActiveFilter ? "bg-indigo-600 text-white border-indigo-600" : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-400"}`}>
          {ft.title}{hasActiveFilter ? " •" : ""}
        </button>
      </div>

      {/* Filter panel */}
      {filterOpen && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-4 space-y-4 shadow-sm">
          {/* Year */}
          {years.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-2">{ft.year}</p>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => setFilterYear("")} className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${!filterYear ? "bg-indigo-600 text-white border-indigo-600" : "border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-400"}`}>{ft.all}</button>
                {years.map(y => (
                  <button key={y} onClick={() => setFilterYear(y === filterYear ? "" : y)} className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${filterYear === y ? "bg-indigo-600 text-white border-indigo-600" : "border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-400"}`}>{y}</button>
                ))}
              </div>
            </div>
          )}

          {/* Genre */}
          {allTags.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-2">{ft.genre}</p>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => setFilterTag("")} className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${!filterTag ? "bg-indigo-600 text-white border-indigo-600" : "border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-400"}`}>{ft.all}</button>
                {allTags.map(tag => (
                  <button key={tag} onClick={() => setFilterTag(tag === filterTag ? "" : tag)} className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${filterTag === tag ? "bg-indigo-600 text-white border-indigo-600" : "border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-400"}`}>{tag}</button>
                ))}
              </div>
            </div>
          )}

          {/* Venue */}
          {allVenues.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-2">{ft.venue}</p>
              <select className="w-full border dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                value={filterVenue} onChange={e => setFilterVenue(e.target.value)}>
                <option value="">{ft.all}</option>
                {allVenues.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          )}

          {/* Sort */}
          <div>
            <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-2">{ft.sort}</p>
            <div className="flex gap-1.5">
              {([["date-desc", ft.newest], ["date-asc", ft.oldest], ["rating-desc", ft.topRated]] as [SortBy, string][]).map(([val, label]) => (
                <button key={val} onClick={() => setSortBy(val)} className={`flex-1 text-xs py-1.5 rounded-lg border transition-colors ${sortBy === val ? "bg-indigo-600 text-white border-indigo-600" : "border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-400"}`}>{label}</button>
              ))}
            </div>
          </div>

          {hasActiveFilter && (
            <button onClick={resetFilters} className="w-full py-2 text-xs text-red-400 hover:text-red-500 border border-dashed border-red-200 dark:border-red-900 rounded-xl transition-colors">
              {ft.reset}
            </button>
          )}
        </div>
      )}

      {/* Gig list */}
      {gigs.length === 0 ? (
        <div className="text-center py-24 text-gray-400 dark:text-slate-500">{t.empty}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-slate-500">{t.noResults}</div>
      ) : sortBy === "rating-desc" ? (
        <div className="space-y-2.5">
          {filtered.map(gig => <GigCard key={gig.id} gig={gig} onClick={() => setSelectedGig(gig)} lang={lang} />)}
        </div>
      ) : (
        groupedYears.map(year => (
          <div key={year}>
            <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-2 px-1">
              {year} · {byYear[year].length} {t.shows}
            </p>
            <div className="space-y-2.5">
              {byYear[year].map(gig => <GigCard key={gig.id} gig={gig} onClick={() => setSelectedGig(gig)} lang={lang} />)}
            </div>
          </div>
        ))
      )}

      {/* Detail modal */}
      {selectedGig && (
        <GigDetailModal
          gig={selectedGig}
          lang={lang}
          onClose={() => setSelectedGig(null)}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}

// ─── StatsTab ─────────────────────────────────────────────────────────────────

function StatsTab({ gigs, lang }: { gigs: Gig[]; lang: Lang }) {
  const t = i18n[lang].stats;
  if (gigs.length === 0) return <div className="text-center py-24 text-gray-400 dark:text-slate-500">{i18n[lang].empty}</div>;

  const artists = new Set(gigs.map(g => g.artist)).size;
  const cities = new Set(gigs.map(g => g.city).filter(Boolean)).size;
  const avgRating = (gigs.reduce((s, g) => s + g.rating, 0) / gigs.length).toFixed(1);

  const cityCount: Record<string, number> = {};
  gigs.forEach(g => { if (g.city) cityCount[g.city] = (cityCount[g.city] || 0) + 1; });
  const citiesSorted = Object.entries(cityCount).sort((a, b) => b[1] - a[1]);

  const spend: Record<string, number> = {};
  gigs.filter(g => g.price != null).forEach(g => { spend[g.currency] = (spend[g.currency] || 0) + (g.price ?? 0); });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: t.total, value: gigs.length },
          { label: t.artists, value: artists },
          { label: t.cities, value: cities },
          { label: t.avgRating, value: avgRating + " ★" },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-700 text-center">
            <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{value}</div>
            <div className="text-xs text-gray-400 dark:text-slate-500 mt-1.5">{label}</div>
          </div>
        ))}
      </div>

      {Object.keys(spend).length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-700">
          <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-3">{t.totalSpent}</p>
          {Object.entries(spend).map(([cur, amt]) => (
            <div key={cur} className="flex justify-between items-center py-1">
              <span className="text-sm text-gray-500 dark:text-slate-400">{cur}</span>
              <span className="text-base font-bold">{amt.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}

      {citiesSorted.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-3">{t.citiesTitle}</p>
          <div className="grid grid-cols-2 gap-2">
            {citiesSorted.map(([city, count]) => (
              <div key={city} className="bg-white dark:bg-slate-800 rounded-xl p-3.5 shadow-sm border border-gray-100 dark:border-slate-700 flex justify-between items-center">
                <span className="text-sm font-medium truncate">{city}</span>
                <span className="text-xs bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full shrink-0 ml-2">{count} {t.shows}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── RecapTab ─────────────────────────────────────────────────────────────────

function RecapTab({ gigs, lang }: { gigs: Gig[]; lang: Lang }) {
  const t = i18n[lang].recap;
  const years = Array.from(new Set(gigs.map(g => g.date.slice(0, 4)))).sort((a, b) => Number(b) - Number(a));
  const [selectedYear, setSelectedYear] = useState(years[0] ?? "");

  const yearGigs = gigs.filter(g => g.date.startsWith(selectedYear));

  const topOf = (arr: string[]) => {
    const cnt: Record<string, number> = {};
    arr.forEach(x => { if (x) cnt[x] = (cnt[x] || 0) + 1; });
    return Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
  };

  const topArtist = topOf(yearGigs.map(g => g.artist));
  const topCity = topOf(yearGigs.map(g => g.city));
  const topTag = topOf(yearGigs.flatMap(g => g.tags));
  const bestShow = [...yearGigs].sort((a, b) => b.rating - a.rating)[0];

  const spend: Record<string, number> = {};
  yearGigs.filter(g => g.price != null).forEach(g => { spend[g.currency] = (spend[g.currency] || 0) + (g.price ?? 0); });

  if (gigs.length === 0) return <div className="text-center py-24 text-gray-400 dark:text-slate-500">{i18n[lang].empty}</div>;

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {years.map(y => (
          <button key={y} onClick={() => setSelectedYear(y)}
            className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${selectedYear === y ? "bg-indigo-600 text-white" : "bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 border border-gray-200 dark:border-slate-700"}`}>
            {y}
          </button>
        ))}
      </div>

      {yearGigs.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-slate-500">{t.noData}</div>
      ) : (
        <>
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl p-6 text-white text-center shadow-lg">
            <div className="text-6xl font-bold">{yearGigs.length}</div>
            <div className="text-indigo-200 mt-1">{selectedYear} {t.total}</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              topArtist && { label: t.topArtist, value: topArtist[0], sub: `${topArtist[1]} ${t.times}` },
              topCity && { label: t.topCity, value: topCity[0], sub: `${topCity[1]} ${t.times}` },
              bestShow && { label: t.bestShow, value: bestShow.artist, sub: "★".repeat(bestShow.rating) },
              topTag && { label: t.topTag, value: topTag[0], sub: `${topTag[1]} ${t.times}` },
            ].filter(Boolean).map(card => card && (
              <div key={card.label} className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-slate-700">
                <p className="text-xs text-gray-400 dark:text-slate-500 mb-1">{card.label}</p>
                <p className="font-bold truncate">{card.value}</p>
                <p className="text-xs text-indigo-500 mt-0.5">{card.sub}</p>
              </div>
            ))}
          </div>
          {Object.keys(spend).length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-slate-700">
              <p className="text-xs text-gray-400 dark:text-slate-500 mb-2">{t.totalSpent}</p>
              {Object.entries(spend).map(([cur, amt]) => (
                <div key={cur} className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-slate-400">{cur}</span>
                  <span className="font-bold">{amt.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [showProfile, setShowProfile] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingGigs, setLoadingGigs] = useState(false);
  const [lang, setLang] = useState<Lang>("zh");
  const [dark, setDark] = useState(false);
  const [tab, setTab] = useState<Tab>("home");
  const [showForm, setShowForm] = useState(false);

  const t = i18n[lang];

  useEffect(() => {
    const savedLang = localStorage.getItem("gig-lang") as Lang;
    const savedDark = localStorage.getItem("gig-dark");
    if (savedLang) setLang(savedLang);
    if (savedDark === "1") { setDark(true); document.documentElement.classList.add("dark"); }

    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
      setUser(u);
      setLoadingAuth(false);
      if (!u) router.replace("/login");
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (!u) router.replace("/login");
    });

    return () => subscription.unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!user) return;
    setLoadingGigs(true);
    Promise.all([fetchGigs(), fetchProfile(user.id)]).then(([gigsData, profileData]) => {
      setGigs(gigsData);
      setProfile(profileData);
      setLoadingGigs(false);
    });
  }, [user]);

  const toggleLang = () => {
    const next: Lang = lang === "zh" ? "en" : "zh";
    setLang(next); localStorage.setItem("gig-lang", next);
  };

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("gig-dark", next ? "1" : "0");
  };

  const signOut = async () => { await supabase.auth.signOut(); router.replace("/login"); };

  if (loadingAuth) return (
    <div className="min-h-screen flex items-center justify-center text-gray-400 dark:text-slate-500">{t.loading}</div>
  );
  if (!user) return null;

  return (
    <div className="max-w-xl mx-auto px-4 pb-24 pt-5 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold tracking-tight">{t.appName}</h1>
        <div className="flex items-center gap-2">
          <SettingsMenu
            lang={lang} dark={dark}
            onToggleLang={toggleLang}
            onToggleDark={toggleDark}
            onExport={() => exportCSV(gigs, lang)}
            onSignOut={signOut}
            onProfile={() => setShowProfile(true)}
            onImport={() => setShowImport(true)}
          />
          {tab === "home" && (
            <button onClick={() => setShowForm(v => !v)}
              className="h-9 px-4 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 shadow-sm transition-colors">
              {t.add}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {loadingGigs ? (
        <div className="text-center py-24 text-gray-400 dark:text-slate-500">{t.loading}</div>
      ) : (
        <>
          {tab === "home" && <HomeTab gigs={gigs} setGigs={setGigs} lang={lang} showForm={showForm} setShowForm={setShowForm} user={user} profile={profile} />}
          {tab === "stats" && <StatsTab gigs={gigs} lang={lang} />}
          {tab === "recap" && <RecapTab gigs={gigs} lang={lang} />}
        </>
      )}

      {showImport && user && (
        <ImportModal
          user={user} lang={lang}
          onImported={newGigs => { setGigs(prev => [...newGigs, ...prev]); setShowImport(false); }}
          onClose={() => setShowImport(false)}
        />
      )}

      {showProfile && user && (
        <ProfileModal
          user={user} profile={profile} lang={lang}
          onSave={p => setProfile(p)}
          onClose={() => setShowProfile(false)}
        />
      )}

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-800/90 backdrop-blur border-t border-gray-200 dark:border-slate-700 flex safe-bottom">
        {([["home", t.nav.home], ["stats", t.nav.stats], ["recap", t.nav.recap]] as [Tab, string][]).map(([key, label]) => (
          <button key={key} onClick={() => { setTab(key); if (key !== "home") setShowForm(false); }}
            className={`flex-1 py-3.5 text-sm font-medium transition-colors ${tab === key ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400 dark:text-slate-500"}`}>
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
