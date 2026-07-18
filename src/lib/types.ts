export type AnswerKey = "A" | "B" | "C" | "D";

export interface Question {
  id: string;
  subject: string;
  text: string;
  options: Record<AnswerKey, string>;
  correct?: AnswerKey; // presente SOLO dopo l'invio delle risposte (arriva dal backend)
}

export type SimulationMode = "completa" | "breve" | "materia";

export interface SimulationConfig {
  simulationNumber: number; // 1..50
  durationMinutes: number;
  questions: Question[];
  createdAt: number;
  mode: SimulationMode;
  subject?: string; // valorizzato solo quando mode === "materia"
  penaltyEnabled?: boolean; // regole di correzione con penalizzazione (+1 / -0,27 / 0)
}

export interface SubjectStat {
  subject: string;
  total: number;
  correct: number;
  wrong: number;
  unanswered: number;
  percentCorrect: number;
  percentWrong: number;
}

export interface SimulationResult {
  simulationNumber: number;
  mode?: SimulationMode;
  subject?: string;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  scorePercent: number;
  timeTakenSeconds: number;
  finishedAt: number;
  subjectStats: SubjectStat[];
  questions: Question[];
  userAnswers: Record<string, AnswerKey | undefined>;
  penaltyEnabled?: boolean; // true se e' stata applicata la penalizzazione sulle risposte errate
  penaltyScore?: number; // punteggio finale con regole di correzione: +1 / -0,27 / 0
}

/**
 * Voce "leggera" dello storico simulazioni, usata dall'area riservata per i
 * grafici e le statistiche di andamento. Non include le domande complete
 * (quelle restano solo nell'ultimo risultato) per non appesantire lo storage.
 */
export interface SimulationHistoryEntry {
  simulationNumber: number;
  mode: SimulationMode;
  subject?: string;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  scorePercent: number;
  timeTakenSeconds: number;
  finishedAt: number;
  penaltyEnabled?: boolean;
  penaltyScore?: number;
}
