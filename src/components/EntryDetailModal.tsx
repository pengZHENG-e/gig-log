"use client";

import { useState } from "react";
import { StarRating } from "./StarRating";
import { EntryForm } from "./EntryForm";
import type { CategoryConfig, Lang } from "@/lib/categories";
import type { Entry, EntryInput } from "@/lib/entries";
import { deleteEntry, updateEntry } from "@/lib/entries";

const detailI18n = {
  zh: { edit: "编辑", delete: "删除", confirm: "确定要删除这条记录吗？", cancel: "取消", companions: "同行", notes: "笔记", visited: "去过的城市", featured: "参展艺术家", metAt: "认识的契机" },
  en: { edit: "Edit", delete: "Delete", confirm: "Delete this entry?", cancel: "Cancel", companions: "Went with", notes: "Notes", visited: "Cities visited", featured: "Featured artists", metAt: "Met via" },
} as const;

export function EntryDetailModal({ entry, config, lang, onClose, onUpdate, onDelete }: {
  entry: Entry; config: CategoryConfig; lang: Lang;
  onClose: () => void;
  onUpdate: (updated: Entry) => void;
  onDelete: (id: string) => void;
}) {
  const t = detailI18n[lang];
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);

  const photoUrl = (entry.extras?.photo as string | undefined) ?? (entry.extras?.poster as string | undefined);
  const hasPhoto = !!photoUrl && !photoFailed;

  const dateStr = new Date(entry.date + "T00:00:00").toLocaleDateString(lang === "zh" ? "zh-CN" : "en-GB", {
    year: "numeric", month: "long", day: "numeric",
  });
  const endStr = entry.end_date
    ? new Date(entry.end_date + "T00:00:00").toLocaleDateString(lang === "zh" ? "zh-CN" : "en-GB", { year: "numeric", month: "long", day: "numeric" })
    : null;

  const handleUpdate = async (data: EntryInput) => {
    setSaving(true);
    const ok = await updateEntry(entry.id, data);
    if (ok) onUpdate({ ...data, id: entry.id } as Entry);
    setSaving(false);
    setEditing(false);
  };

  const handleDelete = async () => {
    await deleteEntry(entry.id);
    onDelete(entry.id);
    onClose();
  };

  const handleRate = async (rating: number) => {
    if (rating === entry.rating) return;
    const updated: Entry = { ...entry, rating };
    onUpdate(updated);
    const input: EntryInput = {
      category: updated.category, date: updated.date, end_date: updated.end_date,
      title: updated.title, subtitle: updated.subtitle,
      city: updated.city, country: updated.country,
      rating: updated.rating, notes: updated.notes,
      tags: updated.tags, companions: updated.companions, extras: updated.extras,
    };
    await updateEntry(entry.id, input);
  };

  const dateLine = [dateStr, endStr && `→ ${endStr}`, entry.subtitle, entry.city, entry.country]
    .filter(Boolean).join("  ·  ");

  const visited = Array.isArray(entry.extras?.cities) ? (entry.extras!.cities as string[]) : [];
  const featuredArtists = Array.isArray(entry.extras?.artists) ? (entry.extras!.artists as string[]) : [];
  const metAt = entry.extras?.met_at as string | undefined;
  const filmYear = entry.extras?.year as number | string | undefined;
  const filmWhere = entry.extras?.where as string | undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-gray-200 dark:bg-slate-600 rounded-full" />
        </div>

        <div className="px-6 pb-8 pt-4">
          {editing ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold">{config.label[lang]}</h2>
                <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 text-xl">×</button>
              </div>
              <EntryForm
                config={config}
                lang={lang}
                initial={{
                  category: entry.category,
                  date: entry.date,
                  end_date: entry.end_date,
                  title: entry.title,
                  subtitle: entry.subtitle,
                  city: entry.city,
                  country: entry.country,
                  rating: entry.rating,
                  notes: entry.notes,
                  tags: entry.tags,
                  companions: entry.companions,
                  extras: entry.extras,
                }}
                onSave={handleUpdate}
                onCancel={() => setEditing(false)}
                editMode
              />
              {saving && <p className="text-center text-sm text-gray-400 mt-2">...</p>}
            </>
          ) : (
            <>
              {hasPhoto && (
                <div className="-mx-6 -mt-4 mb-5 h-48 sm:h-56 bg-gray-100 dark:bg-slate-700 overflow-hidden relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoUrl!} alt={entry.title}
                    className="w-full h-full object-cover" loading="lazy" referrerPolicy="no-referrer"
                    onError={() => setPhotoFailed(true)} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                </div>
              )}

              <div className="flex items-start justify-between mb-1">
                <h2 className="text-2xl font-bold pr-4">
                  {entry.title || <span className="text-gray-300 dark:text-slate-600">{lang === "zh" ? "（无标题）" : "(Untitled)"}</span>}
                </h2>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 text-2xl shrink-0">×</button>
              </div>

              {dateLine && <p className="text-gray-500 dark:text-slate-400 text-sm mb-3">{dateLine}</p>}

              {config.hasRating && (
                <StarRating value={entry.rating} size="lg" onChange={handleRate} />
              )}

              {entry.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {entry.tags.map(tag => (
                    <span key={tag} className="text-sm bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-full">{tag}</span>
                  ))}
                </div>
              )}

              {(filmWhere || filmYear != null) && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {filmWhere && (
                    <span className="text-xs bg-gray-100 dark:bg-slate-700/60 text-gray-600 dark:text-slate-300 px-2.5 py-1 rounded-full">
                      {filmWhere}
                    </span>
                  )}
                  {filmYear != null && (
                    <span className="text-xs bg-gray-100 dark:bg-slate-700/60 text-gray-600 dark:text-slate-300 px-2.5 py-1 rounded-full">
                      {String(filmYear)}
                    </span>
                  )}
                </div>
              )}

              {metAt && (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-1">{t.metAt}</p>
                  <p className="text-sm text-gray-700 dark:text-slate-300">{metAt}</p>
                </div>
              )}

              {entry.companions.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-1.5">{t.companions}</p>
                  <p className="text-sm text-gray-700 dark:text-slate-300">{entry.companions.join(", ")}</p>
                </div>
              )}

              {featuredArtists.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-1.5">{t.featured}</p>
                  <p className="text-sm text-gray-700 dark:text-slate-300">{featuredArtists.join(", ")}</p>
                </div>
              )}

              {visited.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-1.5">{t.visited}</p>
                  <p className="text-sm text-gray-700 dark:text-slate-300">{visited.join(", ")}</p>
                </div>
              )}

              {entry.notes && (
                <div className="mt-5">
                  <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-1.5">{config.notesLabel?.[lang] ?? t.notes}</p>
                  <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{entry.notes}</p>
                </div>
              )}

              <div className="flex gap-2 mt-8">
                {confirming ? (
                  <>
                    <p className="flex-1 text-sm text-gray-600 dark:text-slate-400 flex items-center">{t.confirm}</p>
                    <button onClick={() => setConfirming(false)}
                      className="px-4 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-xl text-gray-500 hover:text-gray-700">
                      {t.cancel}
                    </button>
                    <button onClick={handleDelete}
                      className="px-4 py-2 text-sm bg-red-500 text-white rounded-xl hover:bg-red-600">
                      {t.delete}
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setConfirming(true)}
                      className="px-4 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-xl text-red-400 hover:text-red-600 hover:border-red-300 transition-colors">
                      {t.delete}
                    </button>
                    <button onClick={() => setEditing(true)}
                      className="flex-1 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium">
                      {t.edit}
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
