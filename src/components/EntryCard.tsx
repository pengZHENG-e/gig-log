"use client";

import { useState } from "react";
import { StarRating } from "./StarRating";
import type { CategoryConfig, Lang } from "@/lib/categories";
import type { Entry } from "@/lib/entries";

function Avatar({ name, photoUrl, size = 44 }: { name: string; photoUrl?: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const hasPhoto = !!photoUrl && !failed;
  const hue = ((): number => {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
    return Math.abs(h) % 360;
  })();
  const initials = name
    .replace(/\s*\(.*?\)\s*/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? "")
    .join("") || name.slice(0, 1).toUpperCase() || "?";

  return (
    <div
      className="rounded-full overflow-hidden shrink-0 flex items-center justify-center font-semibold text-white"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.4),
        background: hasPhoto ? undefined : `linear-gradient(135deg, hsl(${hue} 65% 55%), hsl(${(hue + 40) % 360} 65% 45%))`,
      }}
    >
      {hasPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl!} alt={name} className="w-full h-full object-cover"
          loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}

export function EntryCard({ entry, config, onClick, lang, hideDate }: {
  entry: Entry; config: CategoryConfig; onClick: () => void; lang: Lang; hideDate?: boolean;
}) {
  const dateStr = new Date(entry.date + "T00:00:00").toLocaleDateString(lang === "zh" ? "zh-CN" : "en-GB", {
    weekday: "short", year: "numeric", month: "short", day: "numeric",
  });
  const endStr = entry.end_date
    ? new Date(entry.end_date + "T00:00:00").toLocaleDateString(lang === "zh" ? "zh-CN" : "en-GB", { month: "short", day: "numeric" })
    : null;

  const photoUrl = (entry.extras?.photo as string | undefined) ?? (entry.extras?.poster as string | undefined);
  const displayTitle = entry.title || (lang === "zh" ? "（无标题）" : "(Untitled)");
  const secondary = config.cardSecondary?.({
    subtitle: entry.subtitle,
    city: entry.city,
    country: entry.country,
    extras: entry.extras,
    date: entry.date,
    end_date: entry.end_date,
  }) ?? [entry.subtitle, entry.city].filter(Boolean).join(" · ");

  return (
    <div onClick={onClick}
      className="w-full text-left bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-4 border border-gray-100 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-md transition-all active:scale-[0.99] cursor-pointer">
      <div className="flex justify-between items-start gap-3">
        <Avatar name={entry.title || config.emoji} photoUrl={photoUrl} size={44} />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-base leading-snug truncate">{displayTitle}</p>
          {secondary && (
            <p className="text-sm text-gray-400 dark:text-slate-500 truncate mt-0.5">{secondary}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          {!hideDate && (
            <p className="text-xs text-gray-400 dark:text-slate-500">
              {dateStr}{endStr ? ` – ${endStr}` : ""}
            </p>
          )}
          {config.hasRating && entry.rating > 0 && <StarRating value={entry.rating} size="sm" />}
        </div>
      </div>
      {entry.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2.5">
          {entry.tags.map(tag => (
            <span key={tag} className="text-xs bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full">{tag}</span>
          ))}
        </div>
      )}
    </div>
  );
}
