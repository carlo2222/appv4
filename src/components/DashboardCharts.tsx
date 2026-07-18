"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import type { SimulationHistoryEntry } from "@/lib/types";

interface DashboardChartsProps {
  history: SimulationHistoryEntry[];
}

/**
 * Media mobile semplice: utile per mostrare l'andamento generale del
 * punteggio senza farsi distrarre dalle oscillazioni tra una simulazione e
 * l'altra.
 */
function movingAverage(values: number[], window: number): number[] {
  return values.map((_, i) => {
    const start = Math.max(0, i - window + 1);
    const slice = values.slice(start, i + 1);
    const sum = slice.reduce((a, b) => a + b, 0);
    return Math.round((sum / slice.length) * 10) / 10;
  });
}

function useIsDark() {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    setIsDark(root.classList.contains("dark"));
    const observer = new MutationObserver(() => setIsDark(root.classList.contains("dark")));
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return isDark;
}

export function TrendChart({ history }: DashboardChartsProps) {
  const isDark = useIsDark();
  const gridColor = isDark ? "#334155" : "#e4e8f1";
  const axisColor = isDark ? "#94a3b8" : "#64748b";

  const scores = history.map((h) => h.scorePercent);
  const avgLine = movingAverage(scores, 3);
  const overallAvg =
    scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : 0;

  const data = history.map((h, i) => ({
    label: `#${h.simulationNumber}`,
    data: new Date(h.finishedAt).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" }),
    Punteggio: h.scorePercent,
    "Media mobile": avgLine[i],
  }));

  return (
    <div className="card p-4 sm:p-6">
      <h3 className="font-display text-base font-bold text-slate-800">
        Andamento del punteggio nel tempo
      </h3>
      <p className="mt-1 text-xs text-slate-500">
        Punteggio ottenuto in ciascuna simulazione, con media mobile sulle ultime 3 prove.
      </p>
      <div className="mt-4 h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: axisColor }} interval="preserveStartEnd" />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: axisColor }} unit="%" />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: `1px solid ${gridColor}`,
                fontSize: 13,
                backgroundColor: isDark ? "#1e293b" : "#ffffff",
                color: isDark ? "#e2e8f0" : "#1e293b",
              }}
              labelFormatter={(label, payload) => {
                const p = payload?.[0]?.payload as { data?: string } | undefined;
                return p?.data ? `Simulazione ${label} · ${p.data}` : `Simulazione ${label}`;
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: axisColor }} />
            <ReferenceLine
              y={overallAvg}
              stroke="#94a3b8"
              strokeDasharray="4 4"
              label={{ value: `Media: ${overallAvg}%`, fontSize: 11, fill: axisColor, position: "insideTopRight" }}
            />
            <Line
              type="monotone"
              dataKey="Punteggio"
              stroke="#2f66f0"
              strokeWidth={2.5}
              dot={{ r: 3, fill: "#2f66f0" }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="Media mobile"
              stroke="#1f9d5a"
              strokeWidth={2}
              strokeDasharray="5 3"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function RecentComparisonChart({ history }: DashboardChartsProps) {
  const isDark = useIsDark();
  const gridColor = isDark ? "#334155" : "#e4e8f1";
  const axisColor = isDark ? "#94a3b8" : "#64748b";

  const recent = history.slice(-8);
  const data = recent.map((h) => ({
    label: `#${h.simulationNumber}`,
    Punteggio: h.scorePercent,
  }));

  return (
    <div className="card p-4 sm:p-6">
      <h3 className="font-display text-base font-bold text-slate-800">
        Confronto tra le ultime simulazioni
      </h3>
      <p className="mt-1 text-xs text-slate-500">
        Punteggio percentuale delle ultime {recent.length} prove completate.
      </p>
      <div className="mt-4 h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: axisColor }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: axisColor }} unit="%" />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: `1px solid ${gridColor}`,
                fontSize: 13,
                backgroundColor: isDark ? "#1e293b" : "#ffffff",
                color: isDark ? "#e2e8f0" : "#1e293b",
              }}
            />
            <Bar dataKey="Punteggio" fill="#2f66f0" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
