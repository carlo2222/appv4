"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ListChecks,
  CalendarCheck2,
  Trophy,
  Gauge,
  TrendingUp,
  TrendingDown,
  Minus,
  PlayCircle,
  Trash2,
  Clock3,
} from "lucide-react";
import type { SimulationHistoryEntry } from "@/lib/types";
import { getToken } from "@/lib/api";
import { getSimulationHistory, clearSimulationHistory } from "@/lib/storage";
import { TrendChart, RecentComparisonChart } from "@/components/DashboardCharts";

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function scoreOf(entry: SimulationHistoryEntry): number {
  // Se la simulazione ha le regole di correzione attive, il punteggio "vero"
  // e' quello con penalita' riportato in percentuale sul massimo teorico,
  // altrimenti si usa la percentuale di risposte corrette.
  return entry.scorePercent;
}

export default function AreaRiservataPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [history, setHistory] = useState<SimulationHistoryEntry[]>([]);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/");
      return;
    }
    setCheckingAuth(false);
    setHistory(getSimulationHistory());
  }, [router]);

  const stats = useMemo(() => {
    if (history.length === 0) return null;

    const scores = history.map(scoreOf);
    const total = history.length;
    const last = history[history.length - 1];
    const previous = history.length > 1 ? history[history.length - 2] : null;

    const best = history.reduce((acc, cur) => (scoreOf(cur) > scoreOf(acc) ? cur : acc), history[0]);

    const average = Math.round((scores.reduce((a, b) => a + b, 0) / total) * 10) / 10;

    // Percentuale di miglioramento rispetto alla simulazione precedente.
    let improvementVsPrevious: number | null = null;
    if (previous) {
      improvementVsPrevious =
        previous.scorePercent > 0
          ? Math.round(((last.scorePercent - previous.scorePercent) / previous.scorePercent) * 1000) / 10
          : null;
    }

    // Andamento medio: confronto tra la media delle ultime 5 e quella delle 5 precedenti.
    const recentWindow = scores.slice(-5);
    const priorWindow = scores.slice(-10, -5);
    const recentAvg =
      recentWindow.length > 0
        ? Math.round((recentWindow.reduce((a, b) => a + b, 0) / recentWindow.length) * 10) / 10
        : null;
    const priorAvg =
      priorWindow.length > 0
        ? Math.round((priorWindow.reduce((a, b) => a + b, 0) / priorWindow.length) * 10) / 10
        : null;
    const trendDelta = recentAvg !== null && priorAvg !== null ? Math.round((recentAvg - priorAvg) * 10) / 10 : null;

    return {
      total,
      last,
      previous,
      best,
      average,
      improvementVsPrevious,
      recentAvg,
      priorAvg,
      trendDelta,
    };
  }, [history]);

  function handleReset() {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    clearSimulationHistory();
    setHistory([]);
    setConfirmReset(false);
  }

  if (checkingAuth) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center text-slate-400">
        Verifica dell&apos;accesso in corso...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-1.5 text-sm font-semibold text-brand-700">
            Area riservata
          </span>
          <h1 className="mt-3 font-display text-3xl font-extrabold text-brand-900 sm:text-4xl">
            I tuoi progressi
          </h1>
          <p className="mt-2 max-w-xl text-sm text-slate-600 sm:text-base">
            Panoramica generale delle tue simulazioni: risultati, andamento nel tempo e
            indicatori di crescita, per capire a colpo d&apos;occhio come sta andando la tua
            preparazione.
          </p>
        </div>

        {history.length > 0 && (
          <button
            onClick={handleReset}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
              confirmReset
                ? "border-wrong/40 bg-red-50 text-wrong"
                : "border-surface-border bg-white text-slate-500 hover:border-wrong/30 hover:text-wrong"
            }`}
          >
            <Trash2 size={14} />
            {confirmReset ? "Confermi l'azzeramento?" : "Azzera storico"}
          </button>
        )}
      </div>

      {!stats ? (
        <div className="mt-10 card flex flex-col items-center gap-4 p-10 text-center">
          <Gauge className="text-brand-300" size={40} />
          <p className="max-w-sm text-sm text-slate-500">
            Non hai ancora completato nessuna simulazione. Completa la tua prima prova per
            iniziare a vedere qui le statistiche sui tuoi progressi.
          </p>
          <button onClick={() => router.push("/simulazioni")} className="btn-primary">
            <PlayCircle size={18} />
            Inizia una simulazione
          </button>
        </div>
      ) : (
        <>
          {/* Panoramica generale */}
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard
              icon={<ListChecks className="text-brand-500" size={18} />}
              label="Simulazioni effettuate"
              value={String(stats.total)}
            />
            <StatCard
              icon={<CalendarCheck2 className="text-brand-500" size={18} />}
              label="Ultima simulazione"
              value={`#${stats.last.simulationNumber} · ${stats.last.scorePercent}%`}
              sub={formatDate(stats.last.finishedAt)}
            />
            <StatCard
              icon={<Trophy className="text-brand-500" size={18} />}
              label="Miglior risultato"
              value={`${stats.best.scorePercent}%`}
              sub={`Simulazione #${stats.best.simulationNumber}`}
            />
            <StatCard
              icon={<Gauge className="text-brand-500" size={18} />}
              label="Media generale"
              value={`${stats.average}%`}
              sub="su tutte le simulazioni"
            />
            <GrowthCard
              label="Vs. simulazione precedente"
              value={stats.improvementVsPrevious}
            />
          </div>

          {/* Indicatori di crescita o calo */}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <TrendIndicatorCard
              title="Andamento recente"
              description="Media delle ultime 5 simulazioni rispetto alle 5 precedenti."
              delta={stats.trendDelta}
              recentAvg={stats.recentAvg}
              priorAvg={stats.priorAvg}
            />
            <TimeCard last={stats.last} previous={stats.previous} />
          </div>

          {/* Grafici interattivi */}
          <div className="mt-8 grid gap-6">
            <TrendChart history={history} />
            <RecentComparisonChart history={history} />
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="card flex flex-col items-center gap-1.5 p-4 text-center">
      {icon}
      <span className="font-display text-lg font-bold text-slate-800">{value}</span>
      <span className="text-[11px] font-medium leading-tight text-slate-500">{label}</span>
      {sub && <span className="text-[10px] leading-tight text-slate-400">{sub}</span>}
    </div>
  );
}

function GrowthCard({ label, value }: { label: string; value: number | null }) {
  const isPositive = value !== null && value > 0;
  const isNegative = value !== null && value < 0;
  return (
    <div className="card flex flex-col items-center gap-1.5 p-4 text-center">
      {isPositive && <TrendingUp className="text-correct" size={18} />}
      {isNegative && <TrendingDown className="text-wrong" size={18} />}
      {value === null && <Minus className="text-slate-400" size={18} />}
      <span
        className={`font-display text-lg font-bold ${
          isPositive ? "text-correct" : isNegative ? "text-wrong" : "text-slate-800"
        }`}
      >
        {value === null ? "—" : `${value > 0 ? "+" : ""}${value}%`}
      </span>
      <span className="text-[11px] font-medium leading-tight text-slate-500">{label}</span>
    </div>
  );
}

function TrendIndicatorCard({
  title,
  description,
  delta,
  recentAvg,
  priorAvg,
}: {
  title: string;
  description: string;
  delta: number | null;
  recentAvg: number | null;
  priorAvg: number | null;
}) {
  const isPositive = delta !== null && delta > 0;
  const isNegative = delta !== null && delta < 0;
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <p className="font-display text-sm font-bold text-slate-800">{title}</p>
        {isPositive && (
          <span className="flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-correct">
            <TrendingUp size={13} /> In crescita
          </span>
        )}
        {isNegative && (
          <span className="flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-wrong">
            <TrendingDown size={13} /> In calo
          </span>
        )}
        {delta === null && (
          <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
            <Minus size={13} /> Dati insufficienti
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
      {recentAvg !== null && priorAvg !== null ? (
        <p className="mt-3 text-sm text-slate-600">
          Ultime 5: <span className="font-semibold text-slate-800">{recentAvg}%</span> · Precedenti
          5: <span className="font-semibold text-slate-800">{priorAvg}%</span> · Variazione:{" "}
          <span
            className={`font-semibold ${
              isPositive ? "text-correct" : isNegative ? "text-wrong" : "text-slate-800"
            }`}
          >
            {delta !== null ? `${delta > 0 ? "+" : ""}${delta} punti` : "—"}
          </span>
        </p>
      ) : (
        <p className="mt-3 text-sm text-slate-500">
          Completa piu&apos; simulazioni per vedere l&apos;andamento recente.
        </p>
      )}
    </div>
  );
}

function TimeCard({
  last,
  previous,
}: {
  last: SimulationHistoryEntry;
  previous: SimulationHistoryEntry | null;
}) {
  const minutes = Math.floor(last.timeTakenSeconds / 60);
  const seconds = last.timeTakenSeconds % 60;
  const prevMinutes = previous ? Math.floor(previous.timeTakenSeconds / 60) : null;

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <p className="font-display text-sm font-bold text-slate-800">Tempo impiegato</p>
        <Clock3 className="text-brand-500" size={18} />
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Tempo di completamento dell&apos;ultima simulazione.
      </p>
      <p className="mt-3 text-sm text-slate-600">
        Ultima prova:{" "}
        <span className="font-semibold text-slate-800">
          {minutes} min {String(seconds).padStart(2, "0")} sec
        </span>
        {prevMinutes !== null && (
          <>
            {" "}
            · Prova precedente:{" "}
            <span className="font-semibold text-slate-800">{prevMinutes} min</span>
          </>
        )}
      </p>
    </div>
  );
}
