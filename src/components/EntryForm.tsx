"use client";

import { useState } from "react";
import { StarRating } from "./StarRating";
import { ChipInput } from "./ChipInput";
import type { CategoryConfig, ExtraField, Lang } from "@/lib/categories";
import type { EntryInput } from "@/lib/entries";

const formI18n = {
  zh: {
    date: "日期 *",
    endDate: "结束日期",
    city: "城市",
    country: "国家",
    rating: "评分",
    tags: "标签（回车添加）",
    tagsPlaceholder: "标签...",
    companions: "同行的人（回车添加）",
    companionsPlaceholder: "名字",
    save: "保存",
    saveChanges: "保存修改",
    cancel: "取消",
  },
  en: {
    date: "Date *",
    endDate: "End date",
    city: "City",
    country: "Country",
    rating: "Rating",
    tags: "Tags (press enter)",
    tagsPlaceholder: "Tag...",
    companions: "Went with (press enter)",
    companionsPlaceholder: "Name",
    save: "Save",
    saveChanges: "Save changes",
    cancel: "Cancel",
  },
} as const;

export function EntryForm({ config, initial, onSave, onCancel, lang, editMode = false }: {
  config: CategoryConfig;
  initial: EntryInput;
  onSave: (e: EntryInput) => void;
  onCancel: () => void;
  lang: Lang;
  editMode?: boolean;
}) {
  const t = formI18n[lang];
  const [form, setForm] = useState<EntryInput>(initial);
  const set = <K extends keyof EntryInput>(k: K, v: EntryInput[K]) => setForm(f => ({ ...f, [k]: v }));
  const setExtra = (key: string, v: unknown) => setForm(f => ({ ...f, extras: { ...f.extras, [key]: v } }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!config.titleOptional && !form.title.trim()) return;
    if (!form.date) return;
    onSave(form);
  };

  const inputCls = "w-full border dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400";
  const labelCls = "text-xs font-medium text-gray-500 dark:text-slate-400";

  const renderExtra = (field: ExtraField) => {
    const value = form.extras?.[field.key];
    const label = field.label[lang];
    const placeholder = field.placeholder?.[lang];

    if (field.type === "list") {
      const arr = Array.isArray(value) ? value as string[] : [];
      return (
        <div key={field.key}>
          <label className={labelCls}>{label}</label>
          <div className="mt-1.5">
            <ChipInput values={arr} onChange={v => setExtra(field.key, v)} placeholder={placeholder} />
          </div>
        </div>
      );
    }

    if (field.type === "select") {
      return (
        <div key={field.key}>
          <label className={labelCls}>{label}</label>
          <select className={`${inputCls} mt-1.5`}
            value={(value as string) ?? ""} onChange={e => setExtra(field.key, e.target.value || undefined)}>
            <option value="">—</option>
            {field.options?.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label[lang]}</option>
            ))}
          </select>
        </div>
      );
    }

    if (field.type === "textarea") {
      return (
        <div key={field.key}>
          <label className={labelCls}>{label}</label>
          <textarea className={`${inputCls} mt-1.5 h-24 resize-none`}
            value={(value as string) ?? ""} onChange={e => setExtra(field.key, e.target.value)} placeholder={placeholder} />
        </div>
      );
    }

    const inputType = field.type === "url" ? "url" : field.type === "number" ? "number" : "text";
    return (
      <div key={field.key}>
        <label className={labelCls}>{label}</label>
        <input type={inputType} className={`${inputCls} mt-1.5`}
          value={(value as string) ?? ""}
          onChange={e => setExtra(field.key, field.type === "number" && e.target.value ? Number(e.target.value) : e.target.value || undefined)}
          placeholder={placeholder} />
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className={labelCls}>
            {config.titleLabel[lang]}{!config.titleOptional && " *"}
          </label>
          <input
            required={!config.titleOptional}
            className={`${inputCls} mt-1.5`}
            value={form.title}
            placeholder={config.titlePlaceholder?.[lang]}
            onChange={e => set("title", e.target.value)}
          />
        </div>

        <div className={config.hasEndDate ? "col-span-1" : "col-span-2"}>
          <label className={labelCls}>{t.date}</label>
          <input required type="date" className={`${inputCls} mt-1.5`}
            value={form.date} onChange={e => set("date", e.target.value)} />
        </div>

        {config.hasEndDate && (
          <div className="col-span-1">
            <label className={labelCls}>{t.endDate}</label>
            <input type="date" className={`${inputCls} mt-1.5`}
              value={form.end_date ?? ""} onChange={e => set("end_date", e.target.value || undefined)} />
          </div>
        )}

        {config.subtitleLabel && (
          <div className="col-span-2">
            <label className={labelCls}>{config.subtitleLabel[lang]}</label>
            <input className={`${inputCls} mt-1.5`}
              value={form.subtitle}
              placeholder={config.subtitlePlaceholder?.[lang]}
              onChange={e => set("subtitle", e.target.value)} />
          </div>
        )}

        {config.hasLocation && (
          <>
            <div>
              <label className={labelCls}>{t.city}</label>
              <input className={`${inputCls} mt-1.5`} value={form.city} onChange={e => set("city", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>{t.country}</label>
              <input className={`${inputCls} mt-1.5`} value={form.country} onChange={e => set("country", e.target.value)} />
            </div>
          </>
        )}
      </div>

      {config.hasRating && (
        <div>
          <label className={labelCls}>{t.rating}</label>
          <div className="mt-2"><StarRating value={form.rating} onChange={v => set("rating", v)} /></div>
        </div>
      )}

      {config.hasTags && (
        <div>
          <label className={labelCls}>{t.tags}</label>
          <div className="mt-1.5">
            <ChipInput values={form.tags} onChange={v => set("tags", v)} placeholder={t.tagsPlaceholder} />
          </div>
        </div>
      )}

      {config.hasCompanions && (
        <div>
          <label className={labelCls}>{t.companions}</label>
          <div className="mt-1.5">
            <ChipInput values={form.companions} onChange={v => set("companions", v)} placeholder={t.companionsPlaceholder} />
          </div>
        </div>
      )}

      {config.extraFields?.map(renderExtra)}

      <div>
        <label className={labelCls}>{config.notesLabel?.[lang] ?? (lang === "zh" ? "笔记" : "Notes")}</label>
        <textarea className={`${inputCls} mt-1.5 h-28 resize-none`}
          value={form.notes} onChange={e => set("notes", e.target.value)}
          placeholder={config.notesPlaceholder?.[lang]} />
      </div>

      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel}
          className="px-4 py-2.5 text-sm text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 rounded-xl border border-gray-200 dark:border-slate-600">
          {t.cancel}
        </button>
        <button type="submit" className="px-6 py-2.5 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium">
          {editMode ? t.saveChanges : t.save}
        </button>
      </div>
    </form>
  );
}
