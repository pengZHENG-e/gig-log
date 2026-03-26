"use client";

import { useState, useEffect } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

type Lang = "zh" | "en";
type Tab = "home" | "stats" | "recap";

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
    exportCsv: "导出 CSV",
    langToggle: "EN",
    nav: { home: "记录", stats: "统计", recap: "年度" },
    form: {
      title: "记录新 Gig",
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
      cancel: "取消",
    },
    card: { delete: "删除", setlist: "歌单", companions: "同行", paid: "票价" },
    search: "搜索艺人、场馆、城市...",
    allTags: "全部",
    stats: {
      title: "统计",
      total: "总场次",
      artists: "艺人数",
      cities: "城市数",
      avgRating: "平均评分",
      totalSpent: "总花费",
      citiesTitle: "去过的城市",
      shows: "场",
    },
    recap: {
      title: "年度回顾",
      selectYear: "选择年份",
      total: "场演出",
      topArtist: "最常看",
      topCity: "常去城市",
      bestShow: "最佳演出",
      totalSpent: "总花费",
      topTag: "最爱类型",
      times: "次",
      noData: "这年没有记录",
    },
    empty: "还没有记录，点右上角开始吧 🎸",
    noResults: "没有找到相关演出",
    noYear: "这年没有演出记录",
    dark: "🌙",
    light: "☀️",
  },
  en: {
    appName: "Gig Tracker",
    add: "+ Add",
    exportCsv: "Export CSV",
    langToggle: "中文",
    nav: { home: "Log", stats: "Stats", recap: "Recap" },
    form: {
      title: "Log a Gig",
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
      cancel: "Cancel",
    },
    card: { delete: "Delete", setlist: "Setlist", companions: "With", paid: "Paid" },
    search: "Search artist, venue, city...",
    allTags: "All",
    stats: {
      title: "Stats",
      total: "Total Shows",
      artists: "Artists",
      cities: "Cities",
      avgRating: "Avg Rating",
      totalSpent: "Total Spent",
      citiesTitle: "Cities Visited",
      shows: "shows",
    },
    recap: {
      title: "Year in Review",
      selectYear: "Select year",
      total: "shows",
      topArtist: "Most Seen",
      topCity: "Top City",
      bestShow: "Best Show",
      totalSpent: "Total Spent",
      topTag: "Top Genre",
      times: "times",
      noData: "No gigs this year",
    },
    empty: "No gigs yet. Tap + Add to start 🎸",
    noResults: "No gigs match your search",
    noYear: "No shows this year",
    dark: "🌙",
    light: "☀️",
  },
} as const;

// ─── Constants ───────────────────────────────────────────────────────────────

const STORAGE_KEY = "gig-tracker-v2";
const CURRENCIES = ["CNY", "USD", "GBP", "EUR", "HKD", "JPY", "AUD", "SGD"];
const PRESET_TAGS = ["rock", "pop", "jazz", "classical", "electronic", "hip-hop", "folk", "metal", "indie", "r&b", "punk", "soul"];

// ─── Storage helpers ─────────────────────────────────────────────────────────

function loadGigs(): Gig[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}

function persistGigs(gigs: Gig[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(gigs));
}

function exportCSV(gigs: Gig[], lang: Lang) {
  const t = i18n[lang];
  const headers = lang === "zh"
    ? ["日期", "艺人", "场馆", "城市", "国家", "评分", "票价", "货币", "标签", "同行", "歌单", "笔记"]
    : ["Date", "Artist", "Venue", "City", "Country", "Rating", "Price", "Currency", "Tags", "Companions", "Setlist", "Notes"];
  void t;
  const rows = gigs.map(g => [
    g.date, g.artist, g.venue, g.city, g.country, g.rating,
    g.price ?? "", g.currency, g.tags.join(";"), g.companions.join(";"),
    g.setlist.join(";"), g.notes,
  ]);
  const csv = [headers, ...rows]
    .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "gig-tracker.csv"; a.click();
  URL.revokeObjectURL(url);
}

// ─── StarRating ───────────────────────────────────────────────────────────────

function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(s => (
        <button key={s} type="button" onClick={() => onChange?.(s)}
          className={`text-xl ${s <= value ? "text-yellow-400" : "text-gray-300 dark:text-slate-600"} ${onChange ? "cursor-pointer hover:scale-110" : "cursor-default"} transition-transform`}>
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
    <div>
      <div className="flex flex-wrap gap-1 mb-1">
        {values.map(v => (
          <span key={v} className="flex items-center gap-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs px-2 py-0.5 rounded-full">
            {v}
            <button type="button" onClick={() => onChange(values.filter(x => x !== v))} className="hover:text-red-500">×</button>
          </span>
        ))}
      </div>
      <input
        className="w-full border dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        value={input} placeholder={placeholder}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
        onBlur={add}
      />
    </div>
  );
}

// ─── GigForm ─────────────────────────────────────────────────────────────────

function GigForm({ onSave, onCancel, lang }: { onSave: (g: Gig) => void; onCancel: () => void; lang: Lang }) {
  const t = i18n[lang].form;
  const [form, setForm] = useState<Omit<Gig, "id">>({
    artist: "", venue: "", date: "", city: "", country: "",
    tags: [], rating: 5, notes: "", price: undefined, currency: "CNY",
    companions: [], setlist: [],
  });

  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.artist.trim() || !form.date) return;
    onSave({ ...form, id: Date.now().toString() });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-5 space-y-4">
      <h2 className="text-lg font-bold">{t.title}</h2>

      {/* Basic info */}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 sm:col-span-1">
          <label className="text-xs text-gray-500 dark:text-slate-400">{t.artist}</label>
          <input required className="w-full mt-1 border dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            value={form.artist} onChange={e => set("artist", e.target.value)} />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="text-xs text-gray-500 dark:text-slate-400">{t.date}</label>
          <input required type="date" className="w-full mt-1 border dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            value={form.date} onChange={e => set("date", e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-gray-500 dark:text-slate-400">{t.venue}</label>
          <input className="w-full mt-1 border dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            value={form.venue} onChange={e => set("venue", e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-gray-500 dark:text-slate-400">{t.city}</label>
          <input className="w-full mt-1 border dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            value={form.city} onChange={e => set("city", e.target.value)} />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-gray-500 dark:text-slate-400">{t.country}</label>
          <input className="w-full mt-1 border dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            value={form.country} onChange={e => set("country", e.target.value)} />
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="text-xs text-gray-500 dark:text-slate-400">{t.tags}</label>
        <div className="mt-1">
          <ChipInput values={form.tags} onChange={v => set("tags", v)} placeholder={t.tagsPlaceholder} />
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          <span className="text-xs text-gray-400 dark:text-slate-500 mr-1">{t.presetTags}:</span>
          {PRESET_TAGS.map(tag => (
            <button key={tag} type="button"
              onClick={() => !form.tags.includes(tag) && set("tags", [...form.tags, tag])}
              className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${form.tags.includes(tag) ? "bg-indigo-600 text-white border-indigo-600" : "border-gray-300 dark:border-slate-600 hover:border-indigo-400 text-gray-500 dark:text-slate-400"}`}>
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Rating + Price */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 dark:text-slate-400">{t.rating}</label>
          <div className="mt-1"><StarRating value={form.rating} onChange={v => set("rating", v)} /></div>
        </div>
        <div>
          <label className="text-xs text-gray-500 dark:text-slate-400">{t.price}</label>
          <div className="flex gap-1 mt-1">
            <select className="border dark:border-slate-600 rounded-lg px-2 py-2 text-sm bg-white dark:bg-slate-700 focus:outline-none"
              value={form.currency} onChange={e => set("currency", e.target.value)}>
              {CURRENCIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <input type="number" min="0" placeholder="0" className="flex-1 border dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={form.price ?? ""} onChange={e => set("price", e.target.value ? Number(e.target.value) : undefined)} />
          </div>
        </div>
      </div>

      {/* Companions */}
      <div>
        <label className="text-xs text-gray-500 dark:text-slate-400">{t.companions}</label>
        <div className="mt-1">
          <ChipInput values={form.companions} onChange={v => set("companions", v)} placeholder={t.companionsPlaceholder} />
        </div>
      </div>

      {/* Setlist */}
      <div>
        <label className="text-xs text-gray-500 dark:text-slate-400">{t.setlist}</label>
        <div className="mt-1">
          <ChipInput values={form.setlist} onChange={v => set("setlist", v)} placeholder={t.setlistPlaceholder} />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="text-xs text-gray-500 dark:text-slate-400">{t.notes}</label>
        <textarea className="w-full mt-1 border dark:border-slate-600 rounded-lg px-3 py-2 text-sm h-20 resize-none bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          value={form.notes} onChange={e => set("notes", e.target.value)} placeholder={t.notesPlaceholder} />
      </div>

      <div className="flex gap-2 justify-end pt-1">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-500 dark:text-slate-400 hover:text-gray-700">{t.cancel}</button>
        <button type="submit" className="px-5 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium">{t.save}</button>
      </div>
    </form>
  );
}

// ─── GigCard ─────────────────────────────────────────────────────────────────

function GigCard({ gig, onDelete, lang }: { gig: Gig; onDelete: () => void; lang: Lang }) {
  const t = i18n[lang].card;
  const [expanded, setExpanded] = useState(false);
  const hasExtra = gig.notes || gig.setlist.length > 0 || gig.companions.length > 0;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-4 space-y-2 border border-gray-100 dark:border-slate-700">
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-base truncate">{gig.artist}</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 truncate">
            {[gig.venue, gig.city, gig.country].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-gray-400 dark:text-slate-500">{new Date(gig.date + "T00:00:00").toLocaleDateString(lang === "zh" ? "zh-CN" : "en-GB")}</p>
          <StarRating value={gig.rating} />
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {gig.tags.map(tag => (
          <span key={tag} className="text-xs bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full">{tag}</span>
        ))}
        {gig.price != null && (
          <span className="text-xs bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full">{t.paid}: {gig.currency} {gig.price}</span>
        )}
      </div>

      {hasExtra && (
        <button onClick={() => setExpanded(v => !v)} className="text-xs text-gray-400 dark:text-slate-500 hover:text-indigo-500 transition-colors">
          {expanded ? "▲" : "▼"} {expanded ? (lang === "zh" ? "收起" : "collapse") : (lang === "zh" ? "展开详情" : "show details")}
        </button>
      )}

      {expanded && (
        <div className="space-y-2 pt-1 border-t dark:border-slate-700">
          {gig.companions.length > 0 && (
            <p className="text-sm text-gray-600 dark:text-slate-400"><span className="font-medium">{t.companions}:</span> {gig.companions.join(", ")}</p>
          )}
          {gig.notes && <p className="text-sm text-gray-600 dark:text-slate-400">{gig.notes}</p>}
          {gig.setlist.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">{t.setlist}</p>
              <ol className="text-sm text-gray-600 dark:text-slate-400 space-y-0.5">
                {gig.setlist.map((song, i) => <li key={i}>{i + 1}. {song}</li>)}
              </ol>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end">
        <button onClick={onDelete} className="text-xs text-red-400 hover:text-red-600 transition-colors">{t.delete}</button>
      </div>
    </div>
  );
}

// ─── HomeTab ─────────────────────────────────────────────────────────────────

function HomeTab({ gigs, setGigs, lang, showForm, setShowForm }: {
  gigs: Gig[]; setGigs: (g: Gig[]) => void;
  lang: Lang; showForm: boolean; setShowForm: (v: boolean) => void;
}) {
  const t = i18n[lang];
  const [search, setSearch] = useState("");
  const [filterTag, setFilterTag] = useState("");

  const allTags = Array.from(new Set(gigs.flatMap(g => g.tags)));

  const filtered = gigs.filter(g => {
    const q = search.toLowerCase();
    const matchSearch = !q || g.artist.toLowerCase().includes(q) || g.venue.toLowerCase().includes(q) || g.city.toLowerCase().includes(q);
    const matchTag = !filterTag || g.tags.includes(filterTag);
    return matchSearch && matchTag;
  }).sort((a, b) => b.date.localeCompare(a.date));

  // Group by year
  const byYear: Record<string, Gig[]> = {};
  filtered.forEach(g => {
    const year = g.date.slice(0, 4);
    (byYear[year] ||= []).push(g);
  });
  const years = Object.keys(byYear).sort((a, b) => Number(b) - Number(a));

  const addGig = (gig: Gig) => { setGigs([gig, ...gigs]); setShowForm(false); };
  const deleteGig = (id: string) => setGigs(gigs.filter(g => g.id !== id));

  return (
    <div className="space-y-4">
      {showForm && <GigForm lang={lang} onSave={addGig} onCancel={() => setShowForm(false)} />}

      {/* Search + filter */}
      <div className="space-y-2">
        <input
          className="w-full border dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          placeholder={t.search} value={search} onChange={e => setSearch(e.target.value)}
        />
        {allTags.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button onClick={() => setFilterTag("")}
              className={`shrink-0 text-xs px-3 py-1 rounded-full border transition-colors ${!filterTag ? "bg-indigo-600 text-white border-indigo-600" : "border-gray-300 dark:border-slate-600 text-gray-500 dark:text-slate-400"}`}>
              {t.allTags}
            </button>
            {allTags.map(tag => (
              <button key={tag} onClick={() => setFilterTag(tag === filterTag ? "" : tag)}
                className={`shrink-0 text-xs px-3 py-1 rounded-full border transition-colors ${filterTag === tag ? "bg-indigo-600 text-white border-indigo-600" : "border-gray-300 dark:border-slate-600 text-gray-500 dark:text-slate-400"}`}>
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Gig list */}
      {gigs.length === 0 ? (
        <div className="text-center py-20 text-gray-400 dark:text-slate-500">{t.empty}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400 dark:text-slate-500">{t.noResults}</div>
      ) : (
        years.map(year => (
          <div key={year}>
            <h2 className="text-sm font-bold text-gray-400 dark:text-slate-500 mb-2 px-1">{year} · {byYear[year].length}{lang === "zh" ? " 场" : " shows"}</h2>
            <div className="space-y-3">
              {byYear[year].map(gig => (
                <GigCard key={gig.id} gig={gig} onDelete={() => deleteGig(gig.id)} lang={lang} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ─── StatsTab ─────────────────────────────────────────────────────────────────

function StatsTab({ gigs, lang }: { gigs: Gig[]; lang: Lang }) {
  const t = i18n[lang].stats;
  if (gigs.length === 0) return <div className="text-center py-20 text-gray-400 dark:text-slate-500">{i18n[lang].empty}</div>;

  const artists = new Set(gigs.map(g => g.artist)).size;
  const cities = new Set(gigs.map(g => g.city).filter(Boolean)).size;
  const avgRating = (gigs.reduce((s, g) => s + g.rating, 0) / gigs.length).toFixed(1);
  const withPrice = gigs.filter(g => g.price != null);

  // Cities breakdown
  const cityCount: Record<string, number> = {};
  gigs.forEach(g => { if (g.city) cityCount[g.city] = (cityCount[g.city] || 0) + 1; });
  const citiesSorted = Object.entries(cityCount).sort((a, b) => b[1] - a[1]);

  // Spend by currency
  const spend: Record<string, number> = {};
  withPrice.forEach(g => { spend[g.currency] = (spend[g.currency] || 0) + (g.price ?? 0); });

  const statCards = [
    { label: t.total, value: gigs.length },
    { label: t.artists, value: artists },
    { label: t.cities, value: cities },
    { label: t.avgRating, value: avgRating + " ★" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        {statCards.map(({ label, value }) => (
          <div key={label} className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-slate-700 text-center">
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{value}</div>
            <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {Object.keys(spend).length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-slate-700">
          <h3 className="text-sm font-bold mb-2">{t.totalSpent}</h3>
          {Object.entries(spend).map(([cur, amt]) => (
            <div key={cur} className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-slate-400">{cur}</span>
              <span className="font-medium">{amt.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}

      {citiesSorted.length > 0 && (
        <div>
          <h3 className="text-sm font-bold mb-3">{t.citiesTitle}</h3>
          <div className="grid grid-cols-2 gap-2">
            {citiesSorted.map(([city, count]) => (
              <div key={city} className="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-slate-700 flex justify-between items-center">
                <span className="text-sm font-medium truncate">{city}</span>
                <span className="text-xs bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full shrink-0 ml-1">{count} {t.shows}</span>
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

  const topArtist = (() => {
    const cnt: Record<string, number> = {};
    yearGigs.forEach(g => { cnt[g.artist] = (cnt[g.artist] || 0) + 1; });
    return Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
  })();

  const topCity = (() => {
    const cnt: Record<string, number> = {};
    yearGigs.forEach(g => { if (g.city) cnt[g.city] = (cnt[g.city] || 0) + 1; });
    return Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
  })();

  const topTag = (() => {
    const cnt: Record<string, number> = {};
    yearGigs.flatMap(g => g.tags).forEach(tag => { cnt[tag] = (cnt[tag] || 0) + 1; });
    return Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
  })();

  const bestShow = [...yearGigs].sort((a, b) => b.rating - a.rating)[0];

  const spend: Record<string, number> = {};
  yearGigs.filter(g => g.price != null).forEach(g => { spend[g.currency] = (spend[g.currency] || 0) + (g.price ?? 0); });

  if (gigs.length === 0) return <div className="text-center py-20 text-gray-400 dark:text-slate-500">{i18n[lang].empty}</div>;

  return (
    <div className="space-y-4">
      {/* Year selector */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {years.map(y => (
          <button key={y} onClick={() => setSelectedYear(y)}
            className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${selectedYear === y ? "bg-indigo-600 text-white" : "bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 border border-gray-200 dark:border-slate-700"}`}>
            {y}
          </button>
        ))}
      </div>

      {yearGigs.length === 0 ? (
        <div className="text-center py-12 text-gray-400 dark:text-slate-500">{t.noData}</div>
      ) : (
        <>
          {/* Hero stat */}
          <div className="bg-indigo-600 rounded-2xl p-6 text-white text-center">
            <div className="text-5xl font-bold">{yearGigs.length}</div>
            <div className="text-indigo-200 mt-1">{selectedYear} {t.total}</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {topArtist && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-slate-700">
                <div className="text-xs text-gray-400 dark:text-slate-500 mb-1">{t.topArtist}</div>
                <div className="font-bold truncate">{topArtist[0]}</div>
                <div className="text-xs text-indigo-500 mt-0.5">{topArtist[1]} {t.times}</div>
              </div>
            )}
            {topCity && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-slate-700">
                <div className="text-xs text-gray-400 dark:text-slate-500 mb-1">{t.topCity}</div>
                <div className="font-bold truncate">{topCity[0]}</div>
                <div className="text-xs text-indigo-500 mt-0.5">{topCity[1]} {t.times}</div>
              </div>
            )}
            {bestShow && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-slate-700">
                <div className="text-xs text-gray-400 dark:text-slate-500 mb-1">{t.bestShow}</div>
                <div className="font-bold truncate">{bestShow.artist}</div>
                <div className="text-xs text-yellow-500 mt-0.5">{"★".repeat(bestShow.rating)}</div>
              </div>
            )}
            {topTag && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-slate-700">
                <div className="text-xs text-gray-400 dark:text-slate-500 mb-1">{t.topTag}</div>
                <div className="font-bold truncate">{topTag[0]}</div>
                <div className="text-xs text-indigo-500 mt-0.5">{topTag[1]} {t.times}</div>
              </div>
            )}
          </div>

          {Object.keys(spend).length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-slate-700">
              <div className="text-xs text-gray-400 dark:text-slate-500 mb-2">{t.totalSpent}</div>
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
  const [gigs, setGigsState] = useState<Gig[]>([]);
  const [lang, setLang] = useState<Lang>("zh");
  const [dark, setDark] = useState(false);
  const [tab, setTab] = useState<Tab>("home");
  const [showForm, setShowForm] = useState(false);

  const t = i18n[lang];

  useEffect(() => {
    setGigsState(loadGigs());
    const savedLang = localStorage.getItem("gig-lang") as Lang;
    const savedDark = localStorage.getItem("gig-dark");
    if (savedLang) setLang(savedLang);
    if (savedDark === "1") { setDark(true); document.documentElement.classList.add("dark"); }
  }, []);

  const setGigs = (updated: Gig[]) => {
    setGigsState(updated);
    persistGigs(updated);
  };

  const toggleLang = () => {
    const next: Lang = lang === "zh" ? "en" : "zh";
    setLang(next);
    localStorage.setItem("gig-lang", next);
  };

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("gig-dark", next ? "1" : "0");
  };

  const navItems: { key: Tab; label: string }[] = [
    { key: "home", label: t.nav.home },
    { key: "stats", label: t.nav.stats },
    { key: "recap", label: t.nav.recap },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 pb-24 pt-4 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">{t.appName}</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => exportCSV(gigs, lang)}
            className="text-xs text-gray-500 dark:text-slate-400 border border-gray-300 dark:border-slate-600 px-2 py-1 rounded-lg hover:border-indigo-400 transition-colors">
            {t.exportCsv}
          </button>
          <button onClick={toggleDark}
            className="text-xs text-gray-500 dark:text-slate-400 border border-gray-300 dark:border-slate-600 px-2 py-1 rounded-lg hover:border-indigo-400 transition-colors">
            {dark ? t.light : t.dark}
          </button>
          <button onClick={toggleLang}
            className="text-xs text-gray-500 dark:text-slate-400 border border-gray-300 dark:border-slate-600 px-2 py-1 rounded-lg hover:border-indigo-400 transition-colors">
            {t.langToggle}
          </button>
          {tab === "home" && (
            <button onClick={() => setShowForm(v => !v)}
              className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-xl hover:bg-indigo-700 font-medium shadow">
              {t.add}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {tab === "home" && <HomeTab gigs={gigs} setGigs={setGigs} lang={lang} showForm={showForm} setShowForm={setShowForm} />}
      {tab === "stats" && <StatsTab gigs={gigs} lang={lang} />}
      {tab === "recap" && <RecapTab gigs={gigs} lang={lang} />}

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 flex">
        {navItems.map(({ key, label }) => (
          <button key={key} onClick={() => { setTab(key); if (key !== "home") setShowForm(false); }}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === key ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400 dark:text-slate-500"}`}>
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
