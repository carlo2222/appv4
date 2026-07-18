"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlayCircle, BarChart3, Clock3, Shuffle } from "lucide-react";
import AuthModal from "@/components/AuthModal";
import { getToken } from "@/lib/api";

export default function HomePage() {
  const router = useRouter();
  const [showAuth, setShowAuth] = useState(false);

  function handleStartClick() {
    if (getToken()) {
      router.push("/simulazioni");
    } else {
      setShowAuth(true);
    }
  }

  function handleAuthSuccess() {
    setShowAuth(false);
    router.push("/simulazioni");
  }

  return (
    <div className="relative overflow-hidden">
      {/* Sfondo decorativo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-24 -z-10 flex justify-center"
      >
        <div className="h-[420px] w-[820px] rounded-full bg-brand-100/70 blur-3xl" />
      </div>

      <section className="mx-auto flex max-w-3xl flex-col items-center px-4 pb-14 pt-16 text-center sm:pt-24">
        <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 text-sm font-medium text-brand-700 animate-fadeIn">
          Concorso PRO · Premium
        </span>

        <h1 className="font-display text-4xl font-extrabold tracking-tight text-brand-900 sm:text-6xl animate-fadeIn">
          PECS 1695 <span className="text-brand-500">2026</span>
        </h1>

        <p className="mt-5 max-w-xl text-balance text-base text-slate-600 sm:text-lg animate-fadeIn">
          Preparati al concorso PECS 1695 2026 con simulazioni d&apos;esame realistiche e
          aggiornate. Accesso riservato agli utenti abilitati.
        </p>

        <div className="mt-9 flex flex-col gap-3 sm:flex-row animate-fadeIn">
          <button onClick={handleStartClick} className="btn-primary">
            <PlayCircle size={20} />
            Inizia una simulazione
          </button>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-4 px-4 pb-20 sm:grid-cols-3">
        <FeatureCard
          icon={<Shuffle className="text-brand-500" size={22} />}
          title="Più modalità di simulazione"
          description="Completa (60 domande), breve (30) o concentrata su una singola materia (20), sempre distribuite in modo equilibrato."
        />
        <FeatureCard
          icon={<Clock3 className="text-brand-500" size={22} />}
          title="Timer e regole di correzione"
          description="Attiva il timer da 60 minuti con consegna automatica, e le regole di correzione con penalità sulle risposte errate."
        />
        <FeatureCard
          icon={<BarChart3 className="text-brand-500" size={22} />}
          title="Statistiche dettagliate"
          description="Analizza i risultati per materia con grafici chiari e rivedi ogni singola risposta al termine della prova."
        />
      </section>

      {showAuth && (
        <AuthModal onClose={() => setShowAuth(false)} onSuccess={handleAuthSuccess} />
      )}
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="card p-6 transition hover:shadow-md">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50">
        {icon}
      </div>
      <h3 className="font-display text-base font-bold text-slate-800">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{description}</p>
    </div>
  );
}
