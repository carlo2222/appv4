"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PlayCircle,
  Timer,
  TimerOff,
  Loader2,
  AlertTriangle,
  ListChecks,
  Zap,
  BookOpen,
  Check,
} from "lucide-react";
import type { Question, SimulationConfig, SimulationMode } from "@/lib/types";
import {
  getNextSimulationNumber,
  commitSimulationNumber,
  getMaxSimulations,
  saveCurrentSimulation,
  loadCurrentSimulation,
  getRecentQuestionIds,
} from "@/lib/storage";
import { getToken, fetchSubjects, generateSimulation } from "@/lib/api";

const DEFAULT_DURATION_MINUTES = 60;

interface ModeOption {
  mode: SimulationMode;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const MODE_OPTIONS: ModeOption[] = [
  {
    mode: "completa",
    title: "Simulazione completa",
    description: "60 domande miste, distribuite in modo equilibrato tra tutte le materie.",
    icon: <ListChecks size={20} />,
  },
  {
    mode: "breve",
    title: "Simulazione breve",
    description: "30 domande miste: ideale per un ripasso veloce.",
    icon: <Zap size={20} />,
  },
  {
    mode: "materia",
    title: "Simulazione per materia",
    description: "20 domande concentrate su una singola materia a tua scelta.",
    icon: <BookOpen size={20} />,
  },
];

export default function SimulazioniPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timerEnabled, setTimerEnabled] = useState(true);
  const [penaltyEnabled, setPenaltyEnabled] = useState(false);
  const [nextNumber, setNextNumber] = useState<number>(1);
  const [resumable, setResumable] = useState<SimulationConfig | null>(null);
  const [selectedMode, setSelectedMode] = useState<SimulationMode>("completa");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const maxSimulations = getMaxSimulations();

  useEffect(() => {
    if (!getToken()) {
      router.replace("/");
      return;
    }
    setCheckingAuth(false);
    setNextNumber(getNextSimulationNumber());
    setResumable(loadCurrentSimulation());
  }, [router]);

  useEffect(() => {
    if (selectedMode !== "materia" || subjects.length > 0 || checkingAuth) return;
    setSubjectsLoading(true);
    fetchSubjects()
      .then((list) => {
        setSubjects(list);
        if (list.length > 0) setSelectedSubject(list[0]);
      })
      .catch(() => setError("Impossibile caricare l'elenco delle materie."))
      .finally(() => setSubjectsLoading(false));
  }, [selectedMode, subjects.length, checkingAuth]);

  async function startSimulation() {
    if (selectedMode === "materia" && !selectedSubject) {
      setError("Seleziona una materia prima di iniziare.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const excludeIds = getRecentQuestionIds();
      const questions: Question[] = await generateSimulation({
        mode: selectedMode,
        subject: selectedMode === "materia" ? selectedSubject : undefined,
        excludeIds,
      });

      const simulationNumber = getNextSimulationNumber();
      const config: SimulationConfig = {
        simulationNumber,
        durationMinutes: timerEnabled ? DEFAULT_DURATION_MINUTES : 0,
        questions,
        createdAt: Date.now(),
        mode: selectedMode,
        subject: selectedMode === "materia" ? selectedSubject : undefined,
        penaltyEnabled,
      };

      saveCurrentSimulation(config);
      commitSimulationNumber(simulationNumber);
      router.push("/simulazione");
    } catch (e) {
      if (e instanceof Error && (e as Error & { status?: number }).status === 403) {
        setError(
          "Il tuo account non ha ancora l'accesso Premium attivo. Contatta l'amministratore per attivarlo."
        );
      } else {
        setError(e instanceof Error ? e.message : "Errore imprevisto.");
      }
      setLoading(false);
    }
  }

  if (checkingAuth) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center text-slate-400">
        Verifica dell&apos;accesso in corso...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
      <h1 className="font-display text-3xl font-extrabold text-brand-900 sm:text-4xl">
        Simulazioni d&apos;esame
      </h1>
      <p className="mt-3 text-slate-600">
        Scegli la modalita&apos; di simulazione che preferisci. Le domande vengono estratte
        casualmente ad ogni avvio ed evitano, quando possibile, quelle usate nelle ultime
        simulazioni, cosi&apos; ogni prova risulta davvero diversa dalla precedente.
      </p>

      {resumable && (
        <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4">
          <div className="text-sm text-brand-800">
            Hai una simulazione #{resumable.simulationNumber} in corso, non ancora completata.
          </div>
          <button
            onClick={() => router.push("/simulazione")}
            className="shrink-0 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-brand-700 shadow-sm hover:bg-brand-100"
          >
            Riprendi
          </button>
        </div>
      )}

      {/* Menu di scelta della modalita' */}
      <div className="mt-8 grid gap-3">
        {MODE_OPTIONS.map((option) => {
          const isSelected = selectedMode === option.mode;
          return (
            <button
              key={option.mode}
              onClick={() => setSelectedMode(option.mode)}
              className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition ${
                isSelected
                  ? "border-brand-400 bg-brand-50 ring-1 ring-brand-300"
                  : "border-surface-border bg-white hover:border-brand-200"
              }`}
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  isSelected ? "bg-brand-500 text-white" : "bg-brand-50 text-brand-500"
                }`}
              >
                {option.icon}
              </div>
              <div className="flex-1">
                <p className="font-display text-base font-bold text-slate-800">
                  {option.title}
                </p>
                <p className="mt-0.5 text-sm text-slate-500">{option.description}</p>
              </div>
              {isSelected && <Check className="mt-1 shrink-0 text-brand-500" size={18} />}
            </button>
          );
        })}
      </div>

      {selectedMode === "materia" && (
        <div className="mt-4 rounded-2xl border border-surface-border bg-white p-4">
          <p className="text-sm font-semibold text-slate-700">Scegli la materia</p>
          {subjectsLoading ? (
            <div className="mt-3 flex items-center gap-2 text-sm text-slate-400">
              <Loader2 className="animate-spin" size={16} />
              Caricamento materie...
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {subjects.map((subject) => (
                <button
                  key={subject}
                  onClick={() => setSelectedSubject(subject)}
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                    selectedSubject === subject
                      ? "border-brand-400 bg-brand-500 text-white"
                      : "border-surface-border bg-white text-slate-600 hover:border-brand-200"
                  }`}
                >
                  {subject}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-8 card p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Prossima simulazione</p>
            <p className="font-display text-2xl font-bold text-slate-800">
              #{nextNumber} <span className="text-base font-medium text-slate-400">di {maxSimulations}</span>
            </p>
          </div>
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 font-display text-lg font-bold text-brand-600">
            {selectedMode === "completa" ? "60Q" : selectedMode === "breve" ? "30Q" : "20Q"}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between rounded-xl border border-surface-border p-4">
          <div className="flex items-center gap-3">
            {timerEnabled ? (
              <Timer className="text-brand-500" size={20} />
            ) : (
              <TimerOff className="text-slate-400" size={20} />
            )}
            <div>
              <p className="text-sm font-semibold text-slate-700">Timer da 60 minuti</p>
              <p className="text-xs text-slate-500">
                {timerEnabled ? "Consegna automatica allo scadere del tempo." : "Nessun limite di tempo."}
              </p>
            </div>
          </div>
          <button
            role="switch"
            aria-checked={timerEnabled}
            onClick={() => setTimerEnabled((v) => !v)}
            className={`relative h-7 w-12 shrink-0 rounded-full transition ${
              timerEnabled ? "bg-brand-500" : "bg-slate-300"
            }`}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
                timerEnabled ? "left-6" : "left-1"
              }`}
            />
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-surface-border p-4">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={penaltyEnabled}
              onChange={(e) => setPenaltyEnabled(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 text-brand-500 focus:ring-2 focus:ring-brand-400"
            />
            <div>
              <p className="text-sm font-semibold text-slate-700">Regole di correzione</p>
              <p className="mt-1 text-xs text-slate-500">
                Con questa modalita&apos; ogni risposta corretta vale +1 punto, ogni risposta
                errata comporta una penalizzazione di &minus;0,27 punti, mentre le risposte non
                date valgono 0 punti.
              </p>
            </div>
          </label>
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-wrong/30 bg-red-50 p-3 text-sm text-wrong">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          onClick={startSimulation}
          disabled={loading}
          className="btn-primary mt-6 w-full"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : <PlayCircle size={20} />}
          {loading ? "Preparazione in corso..." : "Genera e inizia simulazione"}
        </button>
      </div>
    </div>
  );
}
