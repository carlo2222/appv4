"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { SubjectStat } from "@/lib/types";

interface ResultsChartsProps {
  subjectStats: SubjectStat[];
}

export default function ResultsCharts({ subjectStats }: ResultsChartsProps) {
  const data = subjectStats.map((s) => ({
    materia: s.subject,
    Corrette: s.correct,
    Errate: s.wrong,
    "Senza risposta": s.unanswered,
  }));

  // Il grafico (recharts) usa colori impostati via prop JS e non tramite
  // classi Tailwind, quindi va reso consapevole della modalita' notturna
  // osservando la classe "dark" sull'elemento <html>.
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    setIsDark(root.classList.contains("dark"));
    const observer = new MutationObserver(() => setIsDark(root.classList.contains("dark")));
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const gridColor = isDark ? "#334155" : "#e4e8f1";
  const axisColor = isDark ? "#94a3b8" : "#64748b";

  return (
    <div className="card p-4 sm:p-6">
      <h3 className="font-display text-base font-bold text-slate-800">
        Risultati per materia
      </h3>
      <div className="mt-4 h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
            <XAxis
              dataKey="materia"
              tick={{ fontSize: 11, fill: axisColor }}
              interval={0}
              angle={-15}
              textAnchor="end"
              height={60}
            />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: axisColor }} />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: `1px solid ${gridColor}`,
                fontSize: 13,
                backgroundColor: isDark ? "#1e293b" : "#ffffff",
                color: isDark ? "#e2e8f0" : "#1e293b",
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: axisColor }} />
            <Bar dataKey="Corrette" fill="#1f9d5a" radius={[6, 6, 0, 0]} />
            <Bar dataKey="Errate" fill="#e0433d" radius={[6, 6, 0, 0]} />
            <Bar dataKey="Senza risposta" fill="#cbd5e1" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {subjectStats.map((s) => (
          <div
            key={s.subject}
            className="flex items-center justify-between rounded-xl border border-surface-border px-3 py-2 text-sm"
          >
            <span className="font-medium text-slate-700">{s.subject}</span>
            <span className="text-slate-500">
              {s.correct}/{s.total} corrette ({s.percentCorrect}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
