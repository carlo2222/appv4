"use client";

import type { AnswerKey, Question } from "@/lib/types";

interface QuestionCardProps {
  question: Question;
  index: number;
  total: number;
  selected?: AnswerKey;
  onSelect: (answer: AnswerKey) => void;
}

const OPTION_KEYS: AnswerKey[] = ["A", "B", "C", "D"];

export default function QuestionCard({
  question,
  index,
  total,
  selected,
  onSelect,
}: QuestionCardProps) {
  return (
    <div key={question.id} className="card animate-fadeIn p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold text-brand-600">
          Domanda {index + 1} di {total}
        </span>
        <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
          {question.subject}
        </span>
      </div>

      <h2 className="mt-4 font-display text-lg font-bold leading-snug text-slate-800 sm:text-xl">
        {question.text}
      </h2>

      <div className="mt-6 grid gap-3">
        {OPTION_KEYS.map((key) => {
          const isSelected = selected === key;
          return (
            <button
              key={key}
              onClick={() => onSelect(key)}
              aria-pressed={isSelected}
              className={`flex items-start gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm transition-all sm:text-base ${
                isSelected
                  ? "border-brand-500 bg-brand-50 text-brand-900 shadow-sm"
                  : "border-surface-border bg-white text-slate-700 hover:border-brand-200 hover:bg-brand-50/40"
              }`}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                  isSelected ? "bg-brand-500 text-white" : "bg-surface-light text-slate-500"
                }`}
              >
                {key}
              </span>
              <span className="pt-0.5">{question.options[key]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
