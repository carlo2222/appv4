"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Flag, CircleAlert, AlertTriangle } from "lucide-react";
import type { AnswerKey, SimulationConfig, SimulationResult, SubjectStat } from "@/lib/types";
import {
  loadCurrentSimulation,
  loadCurrentAnswers,
  saveCurrentAnswers,
  clearCurrentSimulation,
  saveLastResult,
  addSimulationToHistory,
  addRecentQuestionIds,
} from "@/lib/storage";
import { getToken, submitResult } from "@/lib/api";
import Timer from "@/components/Timer";
import ProgressBar from "@/components/ProgressBar";
import QuestionCard from "@/components/QuestionCard";

export default function SimulazionePage() {
  const router = useRouter();
  const [config, setConfig] = useState<SimulationConfig | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerKey | undefined>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/");
      return;
    }
    const loaded = loadCurrentSimulation();
    if (!loaded || loaded.questions.length === 0) {
      router.replace("/simulazioni");
      return;
    }
    setConfig(loaded);
    setAnswers(loadCurrentAnswers());
    setReady(true);
  }, [router]);

  const questions = config?.questions ?? [];
  const total = questions.length;
  const currentQuestion = questions[currentIndex];
  const answeredCount = useMemo(
    () => Object.values(answers).filter(Boolean).length,
    [answers]
  );

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => Math.max(0, i - 1));
  }, []);

  const goNext = useCallback(() => {
    setCurrentIndex((i) => Math.min(total - 1, i + 1));
  }, [total]);

  // La Navbar invia questi eventi quando l'utente clicca le frecce in alto
  useEffect(() => {
    window.addEventListener("concorsopro:prev-question", goPrev);
    window.addEventListener("concorsopro:next-question", goNext);
    return () => {
      window.removeEventListener("concorsopro:prev-question", goPrev);
      window.removeEventListener("concorsopro:next-question", goNext);
    };
  }, [goPrev, goNext]);

  function selectAnswer(answer: AnswerKey) {
    if (!currentQuestion) return;
    const next = { ...answers, [currentQuestion.id]: answer };
    setAnswers(next);
    saveCurrentAnswers(next);
  }

  const finishSimulation = useCallback(async () => {
    if (!config || submitting) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        titolo: `Simulazione #${config.simulationNumber}`,
        answers: config.questions.map((q) => ({ questionId: q.id, chosen: answers[q.id] || null })),
        elapsedSeconds,
      };
      const serverResult = await submitResult(payload);

      // Il backend restituisce "dettaglio" con la risposta corretta di ogni
      // domanda (che prima dell'invio il client non conosceva). Da qui
      // ricostruiamo le stesse statistiche che l'app calcolava in locale.
      const subjectMap = new Map<string, SubjectStat>();
      let correctCount = 0;
      let wrongCount = 0;

      for (const d of serverResult.dettaglio) {
        const stat =
          subjectMap.get(d.subject) ??
          ({
            subject: d.subject,
            total: 0,
            correct: 0,
            wrong: 0,
            unanswered: 0,
            percentCorrect: 0,
            percentWrong: 0,
          } as SubjectStat);

        stat.total += 1;
        if (!d.chosen) {
          stat.unanswered += 1;
        } else if (d.chosen === d.correct) {
          stat.correct += 1;
          correctCount += 1;
        } else {
          stat.wrong += 1;
          wrongCount += 1;
        }
        subjectMap.set(d.subject, stat);
      }

      const subjectStats = Array.from(subjectMap.values()).map((s) => ({
        ...s,
        percentCorrect: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
        percentWrong: s.total > 0 ? Math.round((s.wrong / s.total) * 100) : 0,
      }));

      const totalQuestions = serverResult.dettaglio.length;
      const unansweredCount = totalQuestions - correctCount - wrongCount;
      const scorePercent =
        totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

      const penaltyEnabled = Boolean(config.penaltyEnabled);
      // Regole di correzione: risposta corretta +1, risposta errata -0,27, risposta non data 0.
      const penaltyScore = penaltyEnabled
        ? Math.round((correctCount * 1 + wrongCount * -0.27 + unansweredCount * 0) * 100) / 100
        : undefined;

      const result: SimulationResult = {
        simulationNumber: config.simulationNumber,
        mode: config.mode,
        subject: config.subject,
        totalQuestions,
        correctCount,
        wrongCount,
        unansweredCount,
        scorePercent,
        timeTakenSeconds: elapsedSeconds,
        finishedAt: Date.now(),
        subjectStats,
        questions: serverResult.dettaglio.map((d) => ({
          id: d.questionId,
          subject: d.subject,
          text: d.text,
          options: d.options,
          correct: d.correct,
        })),
        userAnswers: answers,
        penaltyEnabled,
        penaltyScore,
      };

      saveLastResult(result);
      addSimulationToHistory(result);
      addRecentQuestionIds(config.questions.map((q) => q.id));
      clearCurrentSimulation();
      router.push("/risultati");
    } catch (e) {
      setSubmitError(
        e instanceof Error ? e.message : "Impossibile inviare le risposte. Riprova."
      );
      setSubmitting(false);
    }
  }, [config, answers, elapsedSeconds, router, submitting]);

  if (!ready || !config || !currentQuestion) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center text-slate-400">
        Caricamento simulazione...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">
            Simulazione #{config.simulationNumber}
            {config.mode === "breve" && " · Breve"}
            {config.mode === "materia" && config.subject ? ` · ${config.subject}` : ""}
          </p>
          <ProgressBar answered={answeredCount} total={total} />
        </div>
        <Timer
          durationSeconds={config.durationMinutes * 60}
          onExpire={finishSimulation}
          onTick={setElapsedSeconds}
        />
      </div>

      {/* Indicatore grafico delle domande risposte */}
      <div className="mt-5 flex flex-wrap gap-1.5">
        {questions.map((q, i) => {
          const isAnswered = Boolean(answers[q.id]);
          const isCurrent = i === currentIndex;
          return (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(i)}
              aria-label={`Vai alla domanda ${i + 1}`}
              className={`h-2.5 w-5 rounded-full transition ${
                isCurrent
                  ? "bg-brand-700"
                  : isAnswered
                  ? "bg-brand-400"
                  : "bg-surface-border"
              }`}
            />
          );
        })}
      </div>

      <div className="mt-6">
        <QuestionCard
          question={currentQuestion}
          index={currentIndex}
          total={total}
          selected={answers[currentQuestion.id]}
          onSelect={selectAnswer}
        />
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <button
          onClick={goPrev}
          disabled={currentIndex === 0}
          className="btn-secondary disabled:opacity-40"
        >
          <ChevronLeft size={18} />
          Precedente
        </button>

        {currentIndex < total - 1 ? (
          <button onClick={goNext} className="btn-primary">
            Successiva
            <ChevronRight size={18} />
          </button>
        ) : (
          <button onClick={() => setConfirmEnd(true)} className="btn-primary">
            <Flag size={18} />
            Termina simulazione
          </button>
        )}
      </div>

      {currentIndex < total - 1 && (
        <div className="mt-3 text-center">
          <button
            onClick={() => setConfirmEnd(true)}
            className="text-sm font-medium text-slate-400 underline-offset-2 hover:text-brand-600 hover:underline"
          >
            Termina simulazione ora
          </button>
        </div>
      )}

      {submitError && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-wrong/30 bg-red-50 p-3 text-sm text-wrong">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      {confirmEnd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl animate-fadeIn">
            <div className="flex items-center gap-2 text-amber-600">
              <CircleAlert size={22} />
              <h3 className="font-display text-lg font-bold">Terminare la prova?</h3>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Hai risposto a {answeredCount} domande su {total}. Una volta inviata, la
              simulazione non potra&apos; piu&apos; essere modificata.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setConfirmEnd(false)}
                disabled={submitting}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-surface-light disabled:opacity-50"
              >
                Annulla
              </button>
              <button
                onClick={finishSimulation}
                disabled={submitting}
                className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
              >
                {submitting ? "Invio in corso..." : "Conferma invio"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
