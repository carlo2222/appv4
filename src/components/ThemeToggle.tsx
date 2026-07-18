"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

const STORAGE_KEY = "concorsopro:theme";

function applyTheme(isDark: boolean) {
  document.documentElement.classList.toggle("dark", isDark);
}

export default function ThemeToggle() {
  // Lo stato iniziale viene sincronizzato al mount con quanto gia' impostato
  // dallo script inline in layout.tsx (che evita il flash del tema sbagliato).
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    setMounted(true);
  }, []);

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    applyTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    } catch {
      // localStorage non disponibile: il tema resta comunque applicato per la sessione corrente
    }
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      role="switch"
      aria-checked={mounted ? isDark : undefined}
      aria-label={isDark ? "Attiva modalita' diurna" : "Attiva modalita' notturna"}
      title={isDark ? "Modalita' diurna" : "Modalita' notturna"}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-surface-border bg-white text-brand-700 transition hover:bg-brand-50 active:scale-95 dark:bg-slate-800 dark:text-brand-300 dark:hover:bg-brand-500/15"
    >
      {mounted && isDark ? <Moon size={18} /> : <Sun size={18} />}
    </button>
  );
}
