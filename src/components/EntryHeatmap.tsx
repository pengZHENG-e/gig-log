"use client";

import type { Lang } from "@/lib/categories";

const monthsShort = {
  zh: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"],
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
};

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function EntryHeatmap({ dates, year, lang, onDayClick }: {
  dates: string[]; year: string; lang: Lang; onDayClick?: (date: string) => void;
}) {
  const yearNum = Number(year);
  const dayCount: Record<string, number> = {};
  dates.forEach(d => { if (d.startsWith(year)) dayCount[d] = (dayCount[d] || 0) + 1; });

  const startDow = new Date(yearNum, 0, 1).getDay();
  const daysInYear = ((yearNum % 4 === 0 && yearNum % 100 !== 0) || yearNum % 400 === 0) ? 366 : 365;
  const cells: { date: string | null; count: number; month: number }[] = [];
  for (let i = 0; i < startDow; i++) cells.push({ date: null, count: 0, month: -1 });
  const cur = new Date(yearNum, 0, 1);
  for (let i = 0; i < daysInYear; i++) {
    const dateStr = fmtDate(cur);
    cells.push({ date: dateStr, count: dayCount[dateStr] || 0, month: cur.getMonth() });
    cur.setDate(cur.getDate() + 1);
  }
  const totalCols = Math.ceil(cells.length / 7);

  const monthLabelCols: (number | null)[] = Array(12).fill(null);
  for (let col = 0; col < totalCols; col++) {
    const firstRow = cells[col * 7];
    if (!firstRow || firstRow.month < 0) continue;
    if (monthLabelCols[firstRow.month] === null) monthLabelCols[firstRow.month] = col;
  }

  const colorOf = (count: number) => {
    if (count === 0) return "bg-gray-100 dark:bg-slate-700/40";
    if (count === 1) return "bg-indigo-200 dark:bg-indigo-900/70";
    if (count === 2) return "bg-indigo-400 dark:bg-indigo-600";
    return "bg-indigo-600 dark:bg-indigo-400";
  };

  return (
    <div>
      <div className="overflow-x-auto -mx-1 px-1">
        <div className="inline-block min-w-full">
          <div className="grid gap-[2px] mb-1 text-[10px] text-gray-400 dark:text-slate-500"
            style={{ gridTemplateColumns: `repeat(${totalCols}, minmax(0, 1fr))` }}>
            {Array.from({ length: totalCols }, (_, col) => {
              const monthIdx = monthLabelCols.indexOf(col);
              return <div key={col} className="text-left">{monthIdx >= 0 ? monthsShort[lang][monthIdx] : ""}</div>;
            })}
          </div>
          <div className="grid grid-flow-col gap-[2px]"
            style={{ gridTemplateRows: "repeat(7, minmax(0, 1fr))", gridTemplateColumns: `repeat(${totalCols}, minmax(0, 1fr))` }}>
            {cells.map((c, i) => (
              <div key={i}
                onClick={() => c.date && c.count > 0 && onDayClick?.(c.date)}
                className={`aspect-square rounded-[2px] ${c.date ? colorOf(c.count) : "bg-transparent"} ${c.count > 0 && onDayClick ? "cursor-pointer hover:ring-2 hover:ring-indigo-400" : ""}`}
                title={c.date ? `${c.date}${c.count > 0 ? ` · ${c.count}` : ""}` : ""} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
