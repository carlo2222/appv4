"use client";

import { useEffect, useRef, useState } from "react";
import { Clock3 } from "lucide-react";

interface TimerProps {
  durationSeconds: number; // 0 = timer disattivato
  onExpire: () => void;
  onTick?: (elapsedSeconds: number) => void;
}

export default function Timer({ durationSeconds, onExpire, onTick }: TimerProps) {
  const [remaining, setRemaining] = useState(durationSeconds);

  // Le callback vengono tenute sempre aggiornate in un ref, cosi' l'interval
  // (che si avvia una sola volta) chiama sempre la versione piu' recente
  // di onExpire/onTick, evitando di catturare uno stato "vecchio" (es. le
  // risposte date dall'utente) nella closure creata al montaggio.
  const onExpireRef = useRef(onExpire);
  const onTickRef = useRef(onTick);

  useEffect(() => {
    onExpireRef.current = onExpire;
    onTickRef.current = onTick;
  }, [onExpire, onTick]);

  useEffect(() => {
    if (durationSeconds <= 0) return;
    setRemaining(durationSeconds);
    let expired = false;
    let elapsed = 0;

    const interval = setInterval(() => {
      setRemaining((prev) => {
        const next = prev - 1;
        elapsed += 1;
        onTickRef.current?.(elapsed);
        if (next <= 0 && !expired) {
          expired = true;
          clearInterval(interval);
          onExpireRef.current();
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [durationSeconds]);

  if (durationSeconds <= 0) return null;

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const isLow = remaining <= 60;

  return (
    <div
      className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 font-display text-sm font-bold tabular-nums ${
        isLow
          ? "border-wrong/30 bg-red-50 text-wrong animate-pulse"
          : "border-surface-border bg-white text-brand-700"
      }`}
      aria-live="polite"
    >
      <Clock3 size={16} />
      {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
    </div>
  );
}
