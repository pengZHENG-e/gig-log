"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { CATEGORY_CONFIGS, type Category, type CategoryConfig, type Lang } from "@/lib/categories";
import { blankEntry, fetchEntries, insertEntry, type Entry, type EntryInput } from "@/lib/entries";
import { EntryCard } from "./EntryCard";
import { EntryDetailModal } from "./EntryDetailModal";
import { EntryForm } from "./EntryForm";
import { EntryHeatmap } from "./EntryHeatmap";
import { StarRating } from "./StarRating";

type SubnavT = {
  log: string; stats: string; recap: string;
  empty: string; noResults: string; search: string;
  total: string; monthly: string; topRanking: string; spend: string; times: string;
  recapNoData: string; bestTitle: string; mostCommon: string;
};

const subnav: Record<Lang, SubnavT> = {
  zh: { log: "记录", stats: "统计", recap: "年度", empty: "还没有记录，点 + 开始吧", noResults: "没有匹配", search: "搜索...", total: "总数", monthly: "月份活跃度", topRanking: "Top 5", spend: "总花费", times: "次", recapNoData: "这年没有记录", bestTitle: "最爱", mostCommon: "最多" },
  en: { log: "Log", stats: "Stats", recap: "Recap", empty: "Nothing here yet — tap + to start", noResults: "No matches", search: "Search...", total: "Total", monthly: "Monthly activity", topRanking: "Top 5", spend: "Spent", times: "times", recapNoData: "Nothing this year", bestTitle: "Top pick", mostCommon: "Most common" },
};

type Sub = "log" | "stats" | "recap";

export function CategoryView({ category, user, lang, year, showForm, setShowForm }: {
  category: Category;
  user: User;
  lang: Lang;
  year: string;
  showForm: boolean;
  setShowForm: (v: boolean) => void;
}) {
  const config = CATEGORY_CONFIGS[category];
  const t = subnav[lang];

  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [sub, setSub] = useState<Sub>("log");
  const [selected, setSelected] = useState<Entry | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    fetchEntries(category).then(data => {
      setEntries(data);
      setLoading(false);
    });
  }, [category]);

  const yearEntries = useMemo(
    () => year === "all" ? entries : entries.filter(e => e.date.startsWith(year)),
    [entries, year]
  );

  const filteredEntries = useMemo(() => {
    if (!search.trim()) return yearEntries;
    const q = search.toLowerCase();
    return yearEntries.filter(e =>
      e.title.toLowerCase().includes(q) ||
      e.subtitle.toLowerCase().includes(q) ||
      e.city.toLowerCase().includes(q) ||
      e.country.toLowerCase().includes(q) ||
      e.notes.toLowerCase().includes(q) ||
      e.tags.some(tag => tag.toLowerCase().includes(q)) ||
      e.companions.some(c => c.toLowerCase().includes(q))
    );
  }, [yearEntries, search]);

  const handleAdd = async (data: EntryInput) => {
    const saved = await insertEntry({ ...data, category }, user.id);
    if (saved) setEntries([saved, ...entries]);
    setShowForm(false);
  };

  const handleUpdate = (u: Entry) => {
    setEntries(entries.map(x => x.id === u.id ? u : x));
    setSelected(u);
  };
  const handleDelete = (id: string) => {
    setEntries(entries.filter(x => x.id !== id));
    setSelected(null);
  };

  if (loading) {
    return <div className="text-center py-24 text-gray-400 dark:text-slate-500">...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Sub-nav */}
      <div className="flex gap-1 bg-white dark:bg-slate-800 rounded-xl p-1 border border-gray-100 dark:border-slate-700">
        {(["log", "stats", "recap"] as const).map(s => (
          <button key={s} onClick={() => setSub(s)}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${sub === s ? "bg-indigo-600 text-white" : "text-gray-500 dark:text-slate-400 hover:text-indigo-500"}`}>
            {t[s]}
          </button>
        ))}
      </div>

      {sub === "log" && (
        <LogSub
          config={CATEGORY_CONFIGS[category]}
          year={year}
          entries={filteredEntries}
          allEntries={entries}
          lang={lang}
          search={search}
          setSearch={setSearch}
          showForm={showForm}
          setShowForm={setShowForm}
          onAdd={handleAdd}
          onPick={e => setSelected(e)}
          empty={t.empty}
          noResults={t.noResults}
          searchPlaceholder={t.search}
        />
      )}

      {sub === "stats" && (
        <StatsSub config={config} entries={yearEntries} allEntries={entries} year={year} lang={lang} t={t} onPick={e => setSelected(e)} />
      )}

      {sub === "recap" && (
        <RecapSub config={config} entries={yearEntries} year={year} lang={lang} t={t} onPick={e => setSelected(e)} />
      )}

      {selected && (
        <EntryDetailModal
          entry={selected}
          config={CATEGORY_CONFIGS[category]}
          lang={lang}
          onClose={() => setSelected(null)}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}

// ─── Log sub-view ───────────────────────────────────────────────────────────

function LogSub({ config, entries, lang, search, setSearch, showForm, setShowForm, onAdd, onPick, empty, noResults, searchPlaceholder, year }: {
  config: CategoryConfig;
  entries: Entry[];
  allEntries: Entry[];
  year: string;
  lang: Lang;
  search: string;
  setSearch: (v: string) => void;
  showForm: boolean;
  setShowForm: (v: boolean) => void;
  onAdd: (data: EntryInput) => void;
  onPick: (e: Entry) => void;
  empty: string;
  noResults: string;
  searchPlaceholder: string;
}) {
  const monthsLabel = lang === "zh"
    ? ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"]
    : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // Group by year → month
  const byYearMonth: Record<string, Record<number, Entry[]>> = {};
  for (const e of entries) {
    const y = e.date.slice(0, 4);
    const m = Number(e.date.slice(5, 7)) - 1;
    if (!byYearMonth[y]) byYearMonth[y] = {};
    if (!byYearMonth[y][m]) byYearMonth[y][m] = [];
    byYearMonth[y][m].push(e);
  }
  const sortedYears = Object.keys(byYearMonth).sort((a, b) => Number(b) - Number(a));

  return (
    <div className="space-y-3">
      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold">
              {config.emoji} {config.label[lang]}
            </h2>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
          </div>
          <EntryForm
            config={config}
            lang={lang}
            initial={{ ...blankEntry(config.key), date: year !== "all" ? `${year}-${todayMMDD()}` : "" }}
            onSave={onAdd}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      <input
        className="w-full border dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        placeholder={searchPlaceholder} value={search} onChange={e => setSearch(e.target.value)}
      />

      {entries.length === 0 ? (
        <div className="text-center py-20 text-gray-400 dark:text-slate-500">
          {search ? noResults : empty}
        </div>
      ) : (
        <div className="space-y-4">
          {sortedYears.map(y => (
            <div key={y} className="space-y-3">
              {sortedYears.length > 1 && (
                <div className="text-sm font-bold text-gray-700 dark:text-slate-300 px-1">{y}</div>
              )}
              {Object.keys(byYearMonth[y]).map(Number).sort((a, b) => b - a).map(m => (
                <div key={m} className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide px-1">
                    {monthsLabel[m]} · {byYearMonth[y][m].length}
                  </p>
                  <div className="space-y-2.5">
                    {byYearMonth[y][m]
                      .sort((a, b) => b.date.localeCompare(a.date))
                      .map(e => (
                        <EntryCard key={e.id} entry={e} config={config} lang={lang} onClick={() => onPick(e)} />
                      ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Stats sub-view ─────────────────────────────────────────────────────────

function StatsSub({ config, entries, allEntries, year, lang, t, onPick }: {
  config: CategoryConfig;
  entries: Entry[]; allEntries: Entry[]; year: string; lang: Lang;
  t: SubnavT;
  onPick: (e: Entry) => void;
}) {
  if (entries.length === 0) {
    return <div className="text-center py-20 text-gray-400 dark:text-slate-500">{t.empty}</div>;
  }

  const total = entries.length;

  // Top 5 by configured key (or by location/subtitle by default)
  const rankKey = config.topRanking?.key ?? "subtitle";
  const counts: Record<string, number> = {};
  entries.forEach(e => {
    const v = String(e[rankKey] ?? "").trim();
    if (v) counts[v] = (counts[v] || 0) + 1;
  });
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Heatmap dates for the active year (or current year if "all")
  const heatYear = year === "all" ? String(new Date().getFullYear()) : year;
  const heatDates = allEntries.map(e => e.date);

  // Rating distribution
  const ratingData = config.hasRating
    ? [1, 2, 3, 4, 5].map(r => ({ rating: r, count: entries.filter(e => e.rating === r).length }))
    : [];
  const maxRatingCount = Math.max(1, ...ratingData.map(d => d.count));

  // Top-rated entries
  const topRated = config.hasRating
    ? [...entries].filter(e => e.rating > 0).sort((a, b) => b.rating - a.rating).slice(0, 3)
    : [];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-700 text-center">
          <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{total}</div>
          <div className="text-xs text-gray-400 dark:text-slate-500 mt-1.5">{t.total}</div>
        </div>
        {config.hasRating && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-700 text-center">
            <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
              {(() => {
                const rated = entries.filter(e => e.rating > 0);
                if (rated.length === 0) return "—";
                return (rated.reduce((s, e) => s + e.rating, 0) / rated.length).toFixed(1) + " ★";
              })()}
            </div>
            <div className="text-xs text-gray-400 dark:text-slate-500 mt-1.5">{lang === "zh" ? "平均评分" : "Avg rating"}</div>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-700">
        <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-3">
          {t.monthly} · {heatYear}
        </p>
        <EntryHeatmap dates={heatDates} year={heatYear} lang={lang} />
      </div>

      {top.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-700">
          <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-3">
            {config.topRanking?.[lang === "zh" ? "labelZh" : "labelEn"] ?? t.topRanking}
          </p>
          <div className="space-y-0">
            {top.map(([name, count], i) => (
              <div key={name} className="flex items-center gap-3 py-2.5 border-b border-gray-50 dark:border-slate-700/50 last:border-0">
                <span className={`text-sm font-bold w-6 text-center shrink-0 ${i === 0 ? "text-yellow-400" : i === 1 ? "text-gray-400" : i === 2 ? "text-amber-600" : "text-gray-300 dark:text-slate-600"}`}>
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
                </span>
                <span className="flex-1 text-sm font-medium truncate">{name}</span>
                <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 shrink-0">{count}×</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {ratingData.length > 0 && ratingData.some(d => d.count > 0) && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-700">
          <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-3">
            {lang === "zh" ? "评分分布" : "Rating distribution"}
          </p>
          <div className="space-y-2">
            {ratingData.map(d => (
              <div key={d.rating} className="flex items-center gap-2 text-xs">
                <span className="w-12 text-yellow-400">{"★".repeat(d.rating)}</span>
                <div className="flex-1 h-4 bg-gray-100 dark:bg-slate-700/40 rounded overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded" style={{ width: `${(d.count / maxRatingCount) * 100}%` }} />
                </div>
                <span className="w-6 text-right text-gray-400 dark:text-slate-500">{d.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {topRated.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-2 px-1">
            {lang === "zh" ? "高分推荐" : "Top rated"}
          </p>
          <div className="space-y-2">
            {topRated.map(e => (
              <EntryCard key={e.id} entry={e} config={config} lang={lang} onClick={() => onPick(e)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Recap sub-view ─────────────────────────────────────────────────────────

function RecapSub({ config, entries, year, lang, t, onPick }: {
  config: CategoryConfig;
  entries: Entry[]; year: string; lang: Lang;
  t: SubnavT;
  onPick: (e: Entry) => void;
}) {
  if (entries.length === 0) {
    return <div className="text-center py-20 text-gray-400 dark:text-slate-500">{t.recapNoData}</div>;
  }

  const topOf = (arr: string[]) => {
    const cnt: Record<string, number> = {};
    arr.forEach(x => { const v = x.trim(); if (v) cnt[v] = (cnt[v] || 0) + 1; });
    return Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
  };
  const topSubtitle = topOf(entries.map(e => e.subtitle));
  const topCity = topOf(entries.map(e => e.city));
  const topTag = topOf(entries.flatMap(e => e.tags));
  const topCompanion = topOf(entries.flatMap(e => e.companions));
  const bestRated = config.hasRating
    ? [...entries].filter(e => e.rating > 0).sort((a, b) => b.rating - a.rating)[0]
    : null;

  const cards: { label: string; value: string; sub?: string }[] = [];
  if (config.subtitleLabel && topSubtitle) {
    cards.push({
      label: `${t.mostCommon} ${config.subtitleLabel[lang]}`,
      value: topSubtitle[0],
      sub: `${topSubtitle[1]} ${t.times}`,
    });
  }
  if (config.hasLocation && topCity) {
    cards.push({
      label: lang === "zh" ? "最常去的城市" : "Top city",
      value: topCity[0],
      sub: `${topCity[1]} ${t.times}`,
    });
  }
  if (bestRated) {
    cards.push({
      label: t.bestTitle,
      value: bestRated.title || (lang === "zh" ? "（无标题）" : "(Untitled)"),
      sub: "★".repeat(bestRated.rating),
    });
  }
  if (topTag) {
    cards.push({
      label: lang === "zh" ? "最常用标签" : "Top tag",
      value: topTag[0],
      sub: `${topTag[1]} ${t.times}`,
    });
  }
  if (config.hasCompanions && topCompanion) {
    cards.push({
      label: lang === "zh" ? "最常同行" : "Top companion",
      value: topCompanion[0],
      sub: `${topCompanion[1]} ${t.times}`,
    });
  }

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl p-6 text-white text-center shadow-lg">
        <div className="text-6xl font-bold">{entries.length}</div>
        <div className="text-indigo-200 mt-1">
          {year === "all" ? (lang === "zh" ? "总记录" : "all-time") : year} · {config.label[lang]}
        </div>
      </div>

      {cards.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {cards.map(card => (
            <div key={card.label} className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-slate-700">
              <p className="text-xs text-gray-400 dark:text-slate-500 mb-1">{card.label}</p>
              <p className="font-bold truncate">{card.value}</p>
              {card.sub && <p className="text-xs text-indigo-500 mt-0.5">{card.sub}</p>}
            </div>
          ))}
        </div>
      )}

      {bestRated && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide px-1">
            {lang === "zh" ? "高分推荐" : "Standouts"}
          </p>
          <EntryCard entry={bestRated} config={config} lang={lang} onClick={() => onPick(bestRated)} />
        </div>
      )}
    </div>
  );
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function todayMMDD(): string {
  const d = new Date();
  return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
