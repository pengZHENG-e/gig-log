"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Lang = "zh" | "en";

const i18n = {
  zh: {
    subtitle: "记录你看过的每一场演出",
    signin: "登录",
    signup: "注册",
    email: "邮箱",
    password: "密码",
    passwordPlaceholder: "至少6位",
    submitting: "...",
    signupSuccess: "注册成功！请检查邮箱确认链接，然后登录。",
    footer: "你的数据只有你自己能看到",
    langToggle: "EN",
  },
  en: {
    subtitle: "Track every live show you've ever been to",
    signin: "Sign in",
    signup: "Sign up",
    email: "Email",
    password: "Password",
    passwordPlaceholder: "Min. 6 characters",
    submitting: "...",
    signupSuccess: "Account created! Check your email to confirm, then sign in.",
    footer: "Your data is private to you",
    langToggle: "中文",
  },
};

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState<Lang>("zh");

  const t = i18n[lang];

  useEffect(() => {
    const saved = localStorage.getItem("gig-lang") as Lang;
    if (saved) setLang(saved);
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/");
    });
  }, [router]);

  const toggleLang = () => {
    const next: Lang = lang === "zh" ? "en" : "zh";
    setLang(next);
    localStorage.setItem("gig-lang", next);
  };

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setMessage(""); setLoading(true);

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else router.replace("/");
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else setMessage(t.signupSuccess);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Language toggle */}
        <div className="flex justify-end mb-4">
          <button onClick={toggleLang}
            className="text-xs text-gray-500 dark:text-slate-400 border border-gray-300 dark:border-slate-600 px-2 py-1 rounded-lg hover:border-indigo-400 transition-colors">
            {t.langToggle}
          </button>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gig Tracker</h1>
          <p className="text-gray-500 dark:text-slate-400 mt-1 text-sm">{t.subtitle}</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6">
          {/* Tabs */}
          <div className="flex rounded-xl bg-gray-100 dark:bg-slate-700 p-1 mb-5">
            {(["signin", "signup"] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(""); setMessage(""); }}
                className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${mode === m ? "bg-white dark:bg-slate-600 shadow text-gray-900 dark:text-white" : "text-gray-500 dark:text-slate-400"}`}>
                {m === "signin" ? t.signin : t.signup}
              </button>
            ))}
          </div>

          <form onSubmit={handle} className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 dark:text-slate-400">{t.email}</label>
              <input type="email" required autoComplete="email"
                className="w-full mt-1 border dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-slate-400">{t.password}</label>
              <input type="password" required autoComplete={mode === "signin" ? "current-password" : "new-password"}
                className="w-full mt-1 border dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                value={password} onChange={e => setPassword(e.target.value)} placeholder={t.passwordPlaceholder} minLength={6} />
            </div>

            {error && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{error}</p>}
            {message && <p className="text-xs text-green-600 bg-green-50 dark:bg-green-900/20 rounded-lg px-3 py-2">{message}</p>}

            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors mt-1">
              {loading ? t.submitting : mode === "signin" ? t.signin : t.signup}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-slate-500 mt-4">{t.footer}</p>
      </div>
    </div>
  );
}
