"use client";

import { useState } from "react";
import { X, Lock, AlertTriangle, Loader2 } from "lucide-react";
import { login } from "@/lib/api";

interface AuthModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AuthModal({ onClose, onSuccess }: AuthModalProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(username, password);
      onSuccess();
    } catch {
      // Qualunque sia il motivo del fallimento (credenziali errate, account
      // revocato, ecc.) mostriamo sempre lo stesso messaggio, come richiesto:
      // non serve dare dettagli tecnici a chi tenta l'accesso.
      setError("Accesso non riuscito. Contatta l'amministratore.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl animate-fadeIn dark:bg-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-brand-700 dark:text-brand-300">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-500/15">
              <Lock size={18} />
            </span>
            <h3 className="font-display text-lg font-bold text-slate-800 dark:text-slate-100">
              Accedi per continuare
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-surface-light hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        <p className="mt-2 text-sm text-slate-500">
          Le simulazioni sono riservate agli account abilitati. Inserisci le credenziali che ti ha
          fornito l&apos;amministratore.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Username
            </label>
            <input
              type="text"
              required
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-surface-border bg-white px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-brand-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-surface-border bg-white px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-brand-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-wrong/30 bg-red-50 p-3 text-sm text-wrong">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary mt-2 w-full">
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Lock size={18} />}
            {loading ? "Accesso in corso..." : "Accedi"}
          </button>
        </form>
      </div>
    </div>
  );
}
