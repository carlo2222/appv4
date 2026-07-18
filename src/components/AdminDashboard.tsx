// @ts-nocheck
"use client";

import { useEffect, useRef, useState } from "react";
import {
  adminListUsers,
  adminCreateUser,
  adminUpdateUser,
  adminResetPassword,
  adminDeleteUser,
  adminListQuestions,
  adminCreateQuestion,
  adminUpdateQuestion,
  adminDeleteQuestion,
  adminImportQuestions,
  adminGetStats,
} from "@/lib/adminApi";

const SUBJECTS = [
  "Logica",
  "Comprensione del testo",
  "Ragionamento verbale",
  "Lingua Inglese",
  "Informatica",
  "Cultura Generale",
];

const emptyQuestion = () => ({
  tipo: "Simulazione",
  materia: SUBJECTS[0],
  domanda: "",
  options: { A: "", B: "", C: "", D: "" },
  correct: "A",
  spiegazione: "",
  livello: "Medio",
  categoria: "",
});

const emptyNewUser = () => ({ username: "", password: "", nome: "", cognome: "", email: "", premium: true });

function Pill({ label, tone = "muted" }: { label: string; tone?: "success" | "danger" | "muted" }) {
  const styles =
    tone === "success"
      ? "bg-green-50 text-correct"
      : tone === "danger"
      ? "bg-red-50 text-wrong"
      : "bg-surface-light text-slate-500";
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles}`}>{label}</span>;
}

export default function AdminDashboard({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [tab, setTab] = useState("panoramica");

  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [newUser, setNewUser] = useState(emptyNewUser());
  const [userMsg, setUserMsg] = useState("");

  const [questions, setQuestions] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterMateria, setFilterMateria] = useState("");
  const [filterTipo, setFilterTipo] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<any>(null);
  const [importMsg, setImportMsg] = useState("");
  const [loadError, setLoadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  const refreshUsers = () => adminListUsers(token).then((d) => setUsers(d.users)).catch((e) => setLoadError(e.message));
  const refreshQuestions = () =>
    adminListQuestions(token, { search, materia: filterMateria, tipo: filterTipo })
      .then((d) => setQuestions(d.questions))
      .catch((e) => setLoadError(e.message));
  const refreshStats = () => adminGetStats(token).then(setStats).catch((e) => setLoadError(e.message));

  useEffect(() => {
    refreshStats();
    refreshUsers();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    refreshQuestions();
  }, [search, filterMateria, filterTipo]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredUsers = users.filter((u) => {
    if (!userSearch) return true;
    const q = userSearch.toLowerCase();
    return (
      u.username.toLowerCase().includes(q) ||
      u.nome?.toLowerCase().includes(q) ||
      u.cognome?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
    );
  });

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setUserMsg("");
    try {
      const { user } = await adminCreateUser(token, newUser);
      setNewUser(emptyNewUser());
      setUserMsg(`Account "${user.username}" creato.`);
      refreshUsers();
      refreshStats();
    } catch (err: any) {
      setUserMsg(err.message);
    }
  }

  async function toggleActive(u: any) {
    await adminUpdateUser(token, u.id, { attivo: !u.attivo });
    refreshUsers();
    refreshStats();
  }

  async function togglePremium(u: any) {
    await adminUpdateUser(token, u.id, { premium: !u.premium });
    refreshUsers();
    refreshStats();
  }

  async function resetPassword(u: any) {
    const pw = prompt(`Nuova password per ${u.username}:`);
    if (!pw) return;
    await adminResetPassword(token, u.id, pw);
    alert("Password aggiornata ed email inviata (se configurata).");
  }

  async function deleteUser(u: any) {
    if (!confirm(`Eliminare definitivamente l'account "${u.username}"?`)) return;
    await adminDeleteUser(token, u.id);
    refreshUsers();
    refreshStats();
  }

  function startEdit(q: any) {
    setEditingId(q.id);
    setDraft({ ...q, options: { ...q.options } });
  }

  async function saveEdit() {
    await adminUpdateQuestion(token, editingId, draft);
    setEditingId(null);
    setDraft(null);
    refreshQuestions();
  }

  async function deleteQuestion(id: string) {
    if (!confirm("Eliminare questa domanda?")) return;
    await adminDeleteQuestion(token, id);
    refreshQuestions();
  }

  async function addQuestion() {
    const { question } = await adminCreateQuestion(token, emptyQuestion());
    refreshQuestions();
    startEdit(question);
  }

  async function handleImport(file: File, mode: "merge" | "replace") {
    setImportMsg("Importazione in corso...");
    try {
      const result = await adminImportQuestions(token, file, mode);
      setImportMsg(
        `Importate ${result.imported} domande${
          result.problems?.length ? ` (${result.problems.length} righe scartate per errori)` : ""
        }.`
      );
      refreshQuestions();
    } catch (err: any) {
      setImportMsg(`Errore: ${err.message}`);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wide text-brand-600">
            Pannello amministratore
          </span>
          <h1 className="font-display text-2xl font-bold text-slate-800">Concorso PRO Premium</h1>
        </div>
        <button onClick={onLogout} className="btn-secondary">
          Esci
        </button>
      </div>

      {loadError && <p className="mt-4 text-sm text-wrong">{loadError}</p>}

      <div className="mt-6 flex gap-2 border-b border-surface-border">
        {["panoramica", "utenti", "domande"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border-b-2 px-1 py-2 text-sm font-semibold capitalize transition ${
              tab === t ? "border-brand-500 text-brand-700" : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "panoramica" && stats && (
        <div className="mt-6">
          <p className="rounded-xl border border-surface-border bg-white p-3 text-sm text-slate-500">
            Questi dati arrivano dal database Neon: sono condivisi tra tutti gli amministratori e
            dispositivi.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Utenti totali", stats.numeroUtenti],
              ["Nuovi (7gg)", stats.newUsers7d],
              ["Premium", stats.premiumUsers],
              ["Revocati", stats.revoked],
              ["Simulazioni svolte", stats.simulazioniEffettuate],
              ["Tempo medio (sec)", stats.tempoMedio],
            ].map(([label, value]) => (
              <div key={label as string} className="card p-4">
                <p className="text-xs font-medium text-slate-400">{label}</p>
                <p className="font-display text-xl font-bold text-slate-800">{value as any}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "utenti" && (
        <div className="mt-6">
          <div className="card p-5">
            <h3 className="font-display text-base font-bold text-slate-800">Crea nuova utenza</h3>
            <form onSubmit={createUser} className="mt-3 grid gap-3 sm:grid-cols-2">
              <input
                required
                placeholder="Username"
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                className="rounded-xl border border-surface-border px-3 py-2 text-sm"
              />
              <input
                required
                placeholder="Password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                className="rounded-xl border border-surface-border px-3 py-2 text-sm"
              />
              <input
                placeholder="Nome"
                value={newUser.nome}
                onChange={(e) => setNewUser({ ...newUser, nome: e.target.value })}
                className="rounded-xl border border-surface-border px-3 py-2 text-sm"
              />
              <input
                placeholder="Cognome"
                value={newUser.cognome}
                onChange={(e) => setNewUser({ ...newUser, cognome: e.target.value })}
                className="rounded-xl border border-surface-border px-3 py-2 text-sm"
              />
              <input
                type="email"
                placeholder="Email (facoltativa)"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                className="rounded-xl border border-surface-border px-3 py-2 text-sm sm:col-span-2"
              />
              <label className="flex items-center gap-2 text-sm text-slate-600 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={newUser.premium}
                  onChange={(e) => setNewUser({ ...newUser, premium: e.target.checked })}
                />
                Accesso Premium attivo (l&apos;utente ha già pagato)
              </label>
              {userMsg && <p className="text-sm text-brand-700 sm:col-span-2">{userMsg}</p>}
              <button type="submit" className="btn-primary sm:col-span-2">
                Crea account
              </button>
            </form>
          </div>

          <input
            type="search"
            placeholder="Cerca per username, nome o email..."
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            className="mt-4 w-full rounded-xl border border-surface-border px-3 py-2 text-sm"
          />

          <div className="mt-3 space-y-2">
            {filteredUsers.map((u) => (
              <div key={u.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-semibold text-slate-800">
                    {u.username} <span className="font-normal text-slate-400">({u.nome} {u.cognome})</span>
                  </p>
                  <div className="mt-1 flex gap-2">
                    <Pill label={u.attivo ? "Attivo" : "Revocato"} tone={u.attivo ? "success" : "danger"} />
                    <Pill label={u.premium ? "Premium" : "Standard"} tone={u.premium ? "success" : "muted"} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-sm">
                  <button onClick={() => toggleActive(u)} className="font-medium text-brand-600 hover:underline">
                    {u.attivo ? "Revoca" : "Riattiva"}
                  </button>
                  <button onClick={() => togglePremium(u)} className="font-medium text-brand-600 hover:underline">
                    {u.premium ? "Rimuovi Premium" : "Attiva Premium"}
                  </button>
                  <button onClick={() => resetPassword(u)} className="font-medium text-brand-600 hover:underline">
                    Reset password
                  </button>
                  <button onClick={() => deleteUser(u)} className="font-medium text-wrong hover:underline">
                    Elimina
                  </button>
                </div>
              </div>
            ))}
            {filteredUsers.length === 0 && <p className="text-sm text-slate-400">Nessun utente trovato.</p>}
          </div>
        </div>
      )}

      {tab === "domande" && (
        <div className="mt-6">
          <div className="flex flex-wrap gap-2">
            <input
              type="search"
              placeholder="Cerca nel testo della domanda..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 rounded-xl border border-surface-border px-3 py-2 text-sm"
            />
            <select
              value={filterMateria}
              onChange={(e) => setFilterMateria(e.target.value)}
              className="rounded-xl border border-surface-border px-3 py-2 text-sm"
            >
              <option value="">Tutte le materie</option>
              {SUBJECTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
              className="rounded-xl border border-surface-border px-3 py-2 text-sm"
            >
              <option value="">Tutti i tipi</option>
              <option value="Gratuito">Gratuito</option>
              <option value="Simulazione">Simulazione</option>
            </select>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={addQuestion} className="btn-primary">
              + Aggiungi domanda
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="btn-secondary">
              Importa Excel (aggiungi)
            </button>
            <button onClick={() => replaceInputRef.current?.click()} className="btn-secondary">
              Sostituisci tutto da Excel
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              hidden
              onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0], "merge")}
            />
            <input
              ref={replaceInputRef}
              type="file"
              accept=".xlsx,.xls"
              hidden
              onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0], "replace")}
            />
          </div>
          {importMsg && <p className="mt-2 text-sm text-brand-700">{importMsg}</p>}

          <p className="mt-3 text-sm text-slate-400">{questions.length} domande trovate</p>

          <div className="mt-2 space-y-2">
            {questions.map((q) => (
              <div key={q.id} className="card p-4">
                {editingId === q.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={draft.domanda}
                      onChange={(e) => setDraft({ ...draft, domanda: e.target.value })}
                      className="w-full rounded-xl border border-surface-border p-2 text-sm"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        value={draft.materia}
                        onChange={(e) => setDraft({ ...draft, materia: e.target.value })}
                        className="rounded-xl border border-surface-border p-2 text-sm"
                        placeholder="Materia"
                      />
                      <select
                        value={draft.tipo}
                        onChange={(e) => setDraft({ ...draft, tipo: e.target.value })}
                        className="rounded-xl border border-surface-border p-2 text-sm"
                      >
                        <option value="Gratuito">Gratuito</option>
                        <option value="Simulazione">Simulazione</option>
                      </select>
                      <input
                        value={draft.livello || ""}
                        onChange={(e) => setDraft({ ...draft, livello: e.target.value })}
                        className="rounded-xl border border-surface-border p-2 text-sm"
                        placeholder="Livello"
                      />
                    </div>
                    {["A", "B", "C", "D"].map((letter) => (
                      <input
                        key={letter}
                        value={draft.options[letter] || ""}
                        onChange={(e) =>
                          setDraft({ ...draft, options: { ...draft.options, [letter]: e.target.value } })
                        }
                        placeholder={`Risposta ${letter}`}
                        className="w-full rounded-xl border border-surface-border p-2 text-sm"
                      />
                    ))}
                    <select
                      value={draft.correct}
                      onChange={(e) => setDraft({ ...draft, correct: e.target.value })}
                      className="rounded-xl border border-surface-border p-2 text-sm"
                    >
                      {["A", "B", "C", "D"].map((l) => (
                        <option key={l} value={l}>
                          Corretta: {l}
                        </option>
                      ))}
                    </select>
                    <textarea
                      value={draft.spiegazione || ""}
                      onChange={(e) => setDraft({ ...draft, spiegazione: e.target.value })}
                      placeholder="Spiegazione (facoltativa)"
                      className="w-full rounded-xl border border-surface-border p-2 text-sm"
                    />
                    <div className="flex gap-2">
                      <button onClick={saveEdit} className="btn-primary">
                        Salva
                      </button>
                      <button onClick={() => setEditingId(null)} className="btn-secondary">
                        Annulla
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex gap-2">
                        <Pill label={q.tipo} />
                        <span className="text-xs font-semibold text-brand-600">{q.materia}</span>
                      </div>
                      <p className="mt-1.5 text-sm text-slate-700">{q.domanda}</p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1 text-sm">
                      <button onClick={() => startEdit(q)} className="font-medium text-brand-600 hover:underline">
                        Modifica
                      </button>
                      <button onClick={() => deleteQuestion(q.id)} className="font-medium text-wrong hover:underline">
                        Elimina
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {questions.length === 0 && <p className="text-sm text-slate-400">Nessuna domanda trovata.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
