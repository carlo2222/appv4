export const SUBJECTS = [
  'Logica',
  'Comprensione del testo',
  'Ragionamento verbale',
  'Lingua Inglese',
  'Informatica',
  'Cultura Generale',
];

const FREE_QUIZ_COUNT = 5;
const FREE_QUIZ_SIZE = 8;
const SIMULATION_COUNT = 5;
const SIMULATION_SIZE = 60;

export function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Toglie la risposta corretta e la spiegazione: quello che il client vede PRIMA di rispondere. */
function sanitize(row) {
  const options = { A: row.opzione_a, B: row.opzione_b };
  if (row.opzione_c) options.C = row.opzione_c;
  if (row.opzione_d) options.D = row.opzione_d;
  return {
    id: row.id,
    materia: row.materia,
    domanda: row.domanda,
    options,
  };
}

export function buildFreeQuizzes(freeRows) {
  if (freeRows.length === 0) return [];
  const shuffled = shuffle(freeRows);
  const quizzes = [];
  for (let i = 0; i < FREE_QUIZ_COUNT; i++) {
    const slice = [];
    for (let j = 0; j < FREE_QUIZ_SIZE; j++) {
      slice.push(shuffled[(i * FREE_QUIZ_SIZE + j) % shuffled.length]);
    }
    quizzes.push({ id: `free-${i + 1}`, title: `Quiz Gratuito ${i + 1}`, questions: slice.map(sanitize) });
  }
  return quizzes;
}

export function listSimulationDefinitions(premiumRows) {
  const bySubject = groupBySubject(premiumRows);
  return Array.from({ length: SIMULATION_COUNT }, (_, i) => ({
    id: `sim-${i + 1}`,
    title: `Simulazione ${i + 1}`,
    available: premiumRows.length > 0,
    subjectCoverage: SUBJECTS.map((s) => ({ materia: s, count: (bySubject[s] || []).length })),
  }));
}

export function buildSimulationQuestions(premiumRows) {
  const bySubject = groupBySubject(premiumRows);
  const perSubject = Math.floor(SIMULATION_SIZE / SUBJECTS.length);
  let picked = [];

  SUBJECTS.forEach((subject) => {
    const pool = shuffle(bySubject[subject] || []);
    if (pool.length === 0) return;
    const chunk = [];
    for (let i = 0; i < perSubject; i++) chunk.push(pool[i % pool.length]);
    picked = picked.concat(chunk);
  });

  while (picked.length < SIMULATION_SIZE && premiumRows.length > 0) {
    picked.push(premiumRows[Math.floor(Math.random() * premiumRows.length)]);
  }

  return shuffle(picked).slice(0, SIMULATION_SIZE).map(sanitize);
}

function normalizeSubject(materia) {
  const found = SUBJECTS.find((s) => s.toLowerCase() === materia?.toLowerCase());
  return found || materia || 'Cultura Generale';
}

function groupBySubject(rows) {
  const map = {};
  rows.forEach((r) => {
    const subject = normalizeSubject(r.materia);
    if (!map[subject]) map[subject] = [];
    map[subject].push(r);
  });
  return map;
}

/**
 * Rimescola una lista mettendo per prime (in ordine casuale) le righe il cui
 * id NON è tra quelli recenti, e in coda quelle già viste di recente. Così,
 * prendendo i primi N elementi, si privilegiano le domande "fresche" senza
 * bloccare la generazione se non bastano.
 */
function prioritizeFresh(list, excludeIds) {
  const excludeSet = new Set(excludeIds || []);
  if (excludeSet.size === 0) return shuffle(list);
  const fresh = shuffle(list.filter((r) => !excludeSet.has(r.id)));
  const seen = shuffle(list.filter((r) => excludeSet.has(r.id)));
  return [...fresh, ...seen];
}

/**
 * Estrae "count" domande dal pool, distribuite in modo equilibrato tra le
 * materie disponibili. Usata per le modalità "completa" (60) e "breve" (30).
 */
export function buildBalancedSimulation(rows, count, excludeIds = []) {
  const bySubject = groupBySubject(rows);
  const subjects = Object.keys(bySubject);
  if (subjects.length === 0) return [];

  const shuffledBySubject = {};
  subjects.forEach((s) => {
    shuffledBySubject[s] = prioritizeFresh(bySubject[s], excludeIds);
  });

  const targetCount = Math.min(count, rows.length);
  const baseQuota = Math.floor(targetCount / subjects.length);
  let remainder = targetCount - baseQuota * subjects.length;

  const selected = [];
  const takenIndex = {};

  subjects.forEach((subject) => {
    const pool = shuffledBySubject[subject];
    const quota = baseQuota + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder--;
    const take = Math.min(quota, pool.length);
    selected.push(...pool.slice(0, take));
    takenIndex[subject] = take;
  });

  let stillNeeded = targetCount - selected.length;
  if (stillNeeded > 0) {
    for (const subject of subjects) {
      if (stillNeeded <= 0) break;
      const pool = shuffledBySubject[subject];
      const already = takenIndex[subject] || 0;
      const remaining = pool.slice(already);
      const take = Math.min(remaining.length, stillNeeded);
      if (take > 0) {
        selected.push(...remaining.slice(0, take));
        takenIndex[subject] = already + take;
        stillNeeded -= take;
      }
    }
  }

  return shuffle(selected).slice(0, targetCount).map(sanitize);
}

/** Estrae "count" domande di una singola materia. Usata dalla modalità "materia". */
export function buildSubjectSimulation(rows, subject, count, excludeIds = []) {
  const pool = rows.filter((r) => normalizeSubject(r.materia) === subject);
  const ordered = prioritizeFresh(pool, excludeIds);
  return ordered.slice(0, Math.min(count, ordered.length)).map(sanitize);
}

/** Elenco delle materie presenti nel pool, nell'ordine dell'elenco SUBJECTS. */
export function listAvailableSubjects(rows) {
  const bySubject = groupBySubject(rows);
  return SUBJECTS.filter((s) => (bySubject[s] || []).length > 0);
}
