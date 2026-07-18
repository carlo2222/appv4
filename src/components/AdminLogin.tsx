"use client";

import { useState } from "react";
import { adminLogin } from "@/lib/adminApi";

export default function AdminLogin({ onSuccess }: { onSuccess: (token: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { token } = await adminLogin(email, password);
      onSuccess(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore imprevisto.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <div className="card p-6">
        <span className="text-xs font-semibold uppercase tracking-wide text-brand-600">
          Area riservata
        </span>
        <h1 className="font-display mt-1 text-2xl font-bold text-slate-800">
          Accesso amministratore
        </h1>
        <form onSubmit={submit} className="mt-5 space-y-3">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-surface-border bg-white px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-brand-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-surface-border bg-white px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-brand-400"
            />
          </div>
          {error && <p className="text-sm text-wrong">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Accesso in corso..." : "Accedi"}
          </button>
        </form>
      </div>
    </div>
  );
}
