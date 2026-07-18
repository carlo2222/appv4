"use client";

import { Check, X, MinusCircle } from "lucide-react";
import type { AnswerKey, Question } from "@/lib/types";

interface ReviewListProps {
  questions: Question[];
  userAnswers: Record<string, AnswerKey | undefined>;
}

const OPTION_KEYS: AnswerKey[] = ["A", "B", "C", "D"];

export default function ReviewList({ questions, userAnswers }: ReviewListProps) {
  return (
    <div className="space-y-4">
      {questions.map((q, i) => {
        const userAnswer = userAnswers[q.id];
        const isCorrect = userAnswer === q.correct;
        const isUnanswered = !userAnswer;

        return (
          <div key={q.id} className="card p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold text-slate-500">
                Domanda {i + 1} di {questions.length}
              </span>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                  {q.subject}
                </span>
                {isUnanswered ? (
                  <span className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                    <MinusCircle size={13} /> Senza risposta
                  </span>
                ) : isCorrect ? (
                  <span className="flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-correct">
                    <Check size={13} /> Corretta
                  </span>
                ) : (
                  <span className="flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-wrong">
                    <X size={13} /> Errata
                  </span>
                )}
              </div>
            </div>

            <p className="mt-3 font-medium text-slate-800">{q.text}</p>

            <div className="mt-4 grid gap-2">
              {OPTION_KEYS.map((key) => {
                const isThisCorrect = key === q.correct;
                const isThisUserChoice = key === userAnswer;

                let style = "border-surface-border bg-white text-slate-600";
                if (isThisCorrect) {
                  style = "border-correct/40 bg-green-50 text-green-800";
                } else if (isThisUserChoice && !isCorrect) {
                  style = "border-wrong/40 bg-red-50 text-red-800";
                }

                return (
                  <div
                    key={key}
                    className={`flex items-center gap-3 rounded-xl border-2 px-4 py-2.5 text-sm ${style}`}
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/70 text-xs font-bold">
                      {key}
                    </span>
                    <span className="flex-1">{q.options[key]}</span>
                    {isThisCorrect && <Check size={16} className="text-correct" />}
                    {isThisUserChoice && !isThisCorrect && (
                      <X size={16} className="text-wrong" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
