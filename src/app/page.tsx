"use client";

import { useState, useEffect } from "react";

interface Gig {
  id: string;
  artist: string;
  venue: string;
  date: string;
  city: string;
  rating: number;
  notes: string;
}

const STORAGE_KEY = "gig-tracker-gigs";

function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange?.(star)}
          className={`text-2xl ${star <= value ? "text-yellow-400" : "text-gray-300"} ${onChange ? "hover:text-yellow-300 cursor-pointer" : "cursor-default"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function GigForm({ onSave, onCancel }: { onSave: (gig: Gig) => void; onCancel: () => void }) {
  const [form, setForm] = useState({ artist: "", venue: "", date: "", city: "", rating: 5, notes: "" });

  const set = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.artist || !form.date) return;
    onSave({ ...form, id: Date.now().toString() });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
      <h2 className="text-xl font-bold text-gray-800">记录新 Gig</h2>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm text-gray-500">艺人 / 乐队 *</label>
          <input className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" value={form.artist} onChange={(e) => set("artist", e.target.value)} placeholder="The Beatles" required />
        </div>
        <div>
          <label className="text-sm text-gray-500">日期 *</label>
          <input type="date" className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" value={form.date} onChange={(e) => set("date", e.target.value)} required />
        </div>
        <div>
          <label className="text-sm text-gray-500">场馆</label>
          <input className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" value={form.venue} onChange={(e) => set("venue", e.target.value)} placeholder="Madison Square Garden" />
        </div>
        <div>
          <label className="text-sm text-gray-500">城市</label>
          <input className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="New York" />
        </div>
      </div>

      <div>
        <label className="text-sm text-gray-500">评分</label>
        <div className="mt-1">
          <StarRating value={form.rating} onChange={(v) => set("rating", v)} />
        </div>
      </div>

      <div>
        <label className="text-sm text-gray-500">笔记 / 感受</label>
        <textarea className="w-full mt-1 border rounded-lg px-3 py-2 text-sm h-24 resize-none" value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="写下你的感受..." />
      </div>

      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">取消</button>
        <button type="submit" className="px-5 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">保存</button>
      </div>
    </form>
  );
}

function GigCard({ gig, onDelete }: { gig: Gig; onDelete: () => void }) {
  return (
    <div className="bg-white rounded-2xl shadow p-5 space-y-2">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-bold text-gray-800">{gig.artist}</h3>
          <p className="text-sm text-gray-500">
            {gig.venue && `${gig.venue} · `}{gig.city}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-400">{new Date(gig.date).toLocaleDateString("zh-CN")}</p>
          <StarRating value={gig.rating} />
        </div>
      </div>
      {gig.notes && <p className="text-sm text-gray-600 border-t pt-2">{gig.notes}</p>}
      <div className="flex justify-end">
        <button onClick={onDelete} className="text-xs text-red-400 hover:text-red-600">删除</button>
      </div>
    </div>
  );
}

export default function Home() {
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setGigs(JSON.parse(saved));
  }, []);

  const saveGigs = (updated: Gig[]) => {
    setGigs(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const addGig = (gig: Gig) => {
    saveGigs([gig, ...gigs]);
    setShowForm(false);
  };

  const deleteGig = (id: string) => {
    saveGigs(gigs.filter((g) => g.id !== id));
  };

  const sorted = [...gigs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gig Tracker</h1>
            <p className="text-sm text-gray-500 mt-1">{gigs.length} 场演出</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-indigo-700 shadow"
          >
            + 记录 Gig
          </button>
        </div>

        {showForm && (
          <div className="mb-6">
            <GigForm onSave={addGig} onCancel={() => setShowForm(false)} />
          </div>
        )}

        {gigs.length > 0 && (
          <div className="bg-indigo-50 rounded-xl p-4 mb-6 flex gap-6 text-center">
            <div className="flex-1">
              <div className="text-2xl font-bold text-indigo-600">{gigs.length}</div>
              <div className="text-xs text-gray-500">总场次</div>
            </div>
            <div className="flex-1">
              <div className="text-2xl font-bold text-indigo-600">
                {new Set(gigs.map((g) => g.artist)).size}
              </div>
              <div className="text-xs text-gray-500">不同艺人</div>
            </div>
            <div className="flex-1">
              <div className="text-2xl font-bold text-indigo-600">
                {gigs.length ? (gigs.reduce((s, g) => s + g.rating, 0) / gigs.length).toFixed(1) : "-"}
              </div>
              <div className="text-xs text-gray-500">平均评分</div>
            </div>
          </div>
        )}

        {sorted.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-5xl mb-4">🎸</div>
            <p>还没有记录，点击右上角开始吧</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sorted.map((gig) => (
              <GigCard key={gig.id} gig={gig} onDelete={() => deleteGig(gig.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
