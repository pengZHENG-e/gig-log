"use client";

export function StarRating({ value, onChange, size = "md" }: {
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
