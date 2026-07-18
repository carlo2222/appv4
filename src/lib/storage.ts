"use client";

import type {
  AnswerKey,
  SimulationConfig,
  SimulationHistoryEntry,
  SimulationResult,
} from "./types";

const CURRENT_SIM_KEY = "concorsopro:current-simulation";
const CURRENT_ANSWERS_KEY = "concorsopro:current-answers";
const LAST_RESULT_KEY = "concorsopro:last-result";
const SIM_COUNTER_KEY = "concorsopro:simulation-counter";
const RECENT_IDS_KEY = "concorsopro:recent-question-ids";
const HISTORY_KEY = "concorsopro:simulation-history";
// Quante voci di storico conservare al massimo: sufficienti per statistiche
// e grafici di andamento senza far crescere lo storage all'infinito.
const MAX_HISTORY_ENTRIES = 200;
const MAX_SIMULATIONS = 50;
// Quante simulazioni completate di recente tenere a mente per evitare di
// riproporre subito le stesse domande.
const RECENT_HISTORY_WINDOW = 3;

function isBrowser() {
  return typeof window !== "undefined";
}

export function getNextSimulationNumber(): number {
  if (!isBrowser()) return 1;
  const raw = window.localStorage.getItem(SIM_COUNTER_KEY);
  const current = raw ? parseInt(raw, 10) : 0;
  const next = current >= MAX_SIMULATIONS ? 1 : current + 1;
  return next;
}

export function commitSimulationNumber(n: number) {
  if (!isBrowser()) return;
  window.localStorage.setItem(SIM_COUNTER_KEY, String(n));
}

export function getMaxSimulations() {
  return MAX_SIMULATIONS;
}

export function saveCurrentSimulation(config: SimulationConfig) {
  if (!isBrowser()) return;
  window.localStorage.setItem(CURRENT_SIM_KEY, JSON.stringify(config));
  window.localStorage.removeItem(CURRENT_ANSWERS_KEY);
}

export function loadCurrentSimulation(): SimulationConfig | null {
  if (!isBrowser()) return null;
  const raw = window.localStorage.getItem(CURRENT_SIM_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SimulationConfig;
  } catch {
    return null;
  }
}

export function clearCurrentSimulation() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(CURRENT_SIM_KEY);
  window.localStorage.removeItem(CURRENT_ANSWERS_KEY);
}

export function saveCurrentAnswers(answers: Record<string, AnswerKey | undefined>) {
  if (!isBrowser()) return;
  window.localStorage.setItem(CURRENT_ANSWERS_KEY, JSON.stringify(answers));
}

export function loadCurrentAnswers(): Record<string, AnswerKey | undefined> {
  if (!isBrowser()) return {};
  const raw = window.localStorage.getItem(CURRENT_ANSWERS_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveLastResult(result: SimulationResult) {
  if (!isBrowser()) return;
  window.localStorage.setItem(LAST_RESULT_KEY, JSON.stringify(result));
}

export function loadLastResult(): SimulationResult | null {
  if (!isBrowser()) return null;
  const raw = window.localStorage.getItem(LAST_RESULT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SimulationResult;
  } catch {
    return null;
  }
}

/**
 * Aggiunge una simulazione appena completata allo storico persistente,
 * usato dall'area riservata per le statistiche e i grafici di andamento.
 * Se esiste gia' una voce con lo stesso simulationNumber (es. per un
 * eventuale doppio invio) viene sostituita invece che duplicata.
 */
export function addSimulationToHistory(result: SimulationResult) {
  if (!isBrowser()) return;
  const entry: SimulationHistoryEntry = {
    simulationNumber: result.simulationNumber,
    mode: result.mode ?? "completa",
    subject: result.subject,
    totalQuestions: result.totalQuestions,
    correctCount: result.correctCount,
    wrongCount: result.wrongCount,
    unansweredCount: result.unansweredCount,
    scorePercent: result.scorePercent,
    timeTakenSeconds: result.timeTakenSeconds,
    finishedAt: result.finishedAt,
    penaltyEnabled: result.penaltyEnabled,
    penaltyScore: result.penaltyScore,
  };

  const history = getSimulationHistory();
  // Rimuoviamo un'eventuale voce con lo stesso finishedAt (doppio invio dello
  // stesso risultato) prima di aggiungere quella nuova.
  const withoutDuplicate = history.filter((h) => h.finishedAt !== entry.finishedAt);
  const next = [...withoutDuplicate, entry].sort((a, b) => a.finishedAt - b.finishedAt);

  const trimmed =
    next.length > MAX_HISTORY_ENTRIES ? next.slice(next.length - MAX_HISTORY_ENTRIES) : next;

  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
}

/** Restituisce lo storico completo delle simulazioni, in ordine cronologico. */
export function getSimulationHistory(): SimulationHistoryEntry[] {
  if (!isBrowser()) return [];
  const raw = window.localStorage.getItem(HISTORY_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as SimulationHistoryEntry[];
    return Array.isArray(parsed) ? parsed.sort((a, b) => a.finishedAt - b.finishedAt) : [];
  } catch {
    return [];
  }
}

/** Svuota lo storico delle simulazioni (usato dal pulsante di reset nell'area riservata). */
export function clearSimulationHistory() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(HISTORY_KEY);
}

/**
 * Registra gli id delle domande usate in una simulazione appena completata.
 * Viene mantenuta solo una finestra delle ultime `RECENT_HISTORY_WINDOW`
 * simulazioni, cosi' il pool di domande "evitate" si rinnova nel tempo
 * invece di restringersi per sempre.
 */
export function addRecentQuestionIds(ids: string[]) {
  if (!isBrowser()) return;
  const raw = window.localStorage.getItem(RECENT_IDS_KEY);
  let history: string[][] = [];
  try {
    history = raw ? (JSON.parse(raw) as string[][]) : [];
  } catch {
    history = [];
  }
  history.push(ids);
  if (history.length > RECENT_HISTORY_WINDOW) {
    history = history.slice(history.length - RECENT_HISTORY_WINDOW);
  }
  window.localStorage.setItem(RECENT_IDS_KEY, JSON.stringify(history));
}

/** Restituisce l'elenco (senza duplicati) degli id usati nelle simulazioni recenti. */
export function getRecentQuestionIds(): string[] {
  if (!isBrowser()) return [];
  const raw = window.localStorage.getItem(RECENT_IDS_KEY);
  if (!raw) return [];
  try {
    const history: string[][] = JSON.parse(raw);
    return Array.from(new Set(history.flat()));
  } catch {
    return [];
  }
}
