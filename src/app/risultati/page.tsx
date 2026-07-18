"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Trophy,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Clock3,
  ListChecks,
  RotateCcw,
  Eye,
  EyeOff,
} from "lucide-react";
import type { SimulationResult } from "@/lib/types";
import { loadLastResult } from "@/lib/storage";
import { computeMotivationalMessage } from "@/lib/quiz-logic";
import ResultsCharts from "@/components/ResultsCharts";
import ReviewList from "@/components/ReviewList";

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes} min ${String(seconds).padStart(2, "0")} sec`;
}

export default function RisultatiPage() {
  const router = useRouter();
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const loaded = loadLastResult();
    if (!loaded) {
      router.replace("/simulazioni");
      return;
    }
    setResult(loaded);
    setReady(true);
  }, [router]);

  if (!ready || !result) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center text-slate-400">
        Caricamento risultati...
      </div>
    );
  }

  const message = computeMotivationalMessage(result.scorePercent);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
      <div className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-1.5 text-sm font-semibold text-brand-700">
          Simulazione #{result.simulationNumber} completata
        </span>
        <h1 className="mt-4 font-display text-4xl font-extrabold text-brand-900 sm:text-5xl">
          {result.scorePercent}%
        </h1>
        <p className="mt-3 flex items-center justify-center gap-2 text-base font-medium text-slate-600 sm:text-lg">
          <Trophy size={20} className="text-brand-500" />
          {message}
        </p>
        {result.penaltyEnabled && (
          <p className="mt-2 text-sm font-semibold text-brand-700">
            Punteggio con regole di correzione: {result.penaltyScore?.toFixed(2)} punti
          </p>
        )}
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard
          icon={<ListChecks className="text-brand-500" size={18} />}
          label="Domande totali"
          value={String(result.totalQuestions)}
        />
        <StatCard
          icon={<CheckCircle2 className="text-correct" size={18} />}
          label="Risposte corrette"
          value={String(result.correctCount)}
        />
        <StatCard
          icon={<XCircle className="text-wrong" size={18} />}
          label="Risposte errate"
          value={String(result.wrongCount)}
        />
        <StatCard
          icon={<MinusCircle className="text-slate-400" size={18} />}
          label="Senza risposta"
          value={String(result.unansweredCount)}
        />
        <StatCard
          icon={<Clock3 className="text-brand-500" size={18} />}
          label="Tempo impiegato"
          value={formatTime(result.timeTakenSeconds)}
        />
      </div>

      <div className="mt-8">
        <ResultsCharts subjectStats={result.subjectStats} />
      </div>

      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <button onClick={() => setShowReview((v) => !v)} className="btn-secondary">
          {showReview ? <EyeOff size={18} /> : <Eye size={18} />}
          {showReview ? "Nascondi revisione" : "Rivedi la prova"}
        </button>
        <button onClick={() => router.push("/simulazioni")} className="btn-primary">
          <RotateCcw size={18} />
          Nuova simulazione
        </button>
      </div>

      {showReview && (
        <div className="mt-10">
          <h2 className="mb-4 font-display text-xl font-bold text-slate-800">
            Revisione completa
          </h2>
          <ReviewList questions={result.questions} userAnswers={result.userAnswers} />
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="card flex flex-col items-center gap-1.5 p-4 text-center">
      {icon}
      <span className="font-display text-lg font-bold text-slate-800">{value}</span>
      <span className="text-[11px] font-medium leading-tight text-slate-500">{label}</span>
    </div>
  );
}
