// @ts-nocheck
// Percorsi relativi ("/api/...") perché in produzione il frontend esportato
// e il backend Express sono la stessa app, sullo stesso indirizzo. In
// sviluppo (next dev), next.config.mjs inoltra queste chiamate al backend
// sulla porta 4000.

const TOKEN_KEY = 'concorsopro:token';

export function getToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (typeof window === 'undefined') return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`/api${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    // risposta senza corpo
  }

  if (!response.ok) {
    const err = new Error(data?.error || `Errore ${response.status}`);
    err.status = response.status;
    throw err;
  }
  return data;
}

// ---------- Autenticazione ----------
export async function login(username, password) {
  const data = await request('/auth/login', { method: 'POST', body: { username, password }, auth: false });
  setToken(data.token);
  return data.user;
}

export function logout() {
  setToken(null);
}

export async function getCurrentUser() {
  if (!getToken()) return null;
  try {
    const data = await request('/auth/me');
    return data.user;
  } catch {
    setToken(null);
    return null;
  }
}

// ---------- Materie e generazione simulazioni ----------

function questionFromServer(q) {
  // Il backend usa i nomi "materia"/"domanda"; qui li rinominiamo in
  // "subject"/"text" per restare compatibili con i componenti esistenti.
  return { id: q.id, subject: q.materia, text: q.domanda, options: q.options };
}

export async function fetchSubjects() {
  const data = await request('/quizzes/subjects');
  return data.subjects;
}

export async function generateSimulation({ mode, subject, excludeIds }) {
  const data = await request('/quizzes/generate', {
    method: 'POST',
    body: { mode, subject, excludeIds },
  });
  return data.questions.map(questionFromServer);
}

// ---------- Risultati ----------

/**
 * Invia le risposte al backend, che calcola il punteggio confrontandole con
 * il database (il client non conosce mai le risposte corrette prima di
 * questo momento). Restituisce il dettaglio già arricchito di risposta
 * corretta e spiegazione per ogni domanda.
 */
export async function submitResult({ titolo, answers, elapsedSeconds }) {
  const data = await request('/results', {
    method: 'POST',
    body: { tipo: 'simulation', titolo, answers, elapsedSeconds },
  });
  return {
    ...data,
    dettaglio: data.dettaglio.map((d) => ({
      questionId: d.questionId,
      subject: d.materia,
      text: d.domanda,
      options: d.options,
      chosen: d.chosen,
      correct: d.correct,
      spiegazione: d.spiegazione,
    })),
  };
}

// ---------- Amministrazione ----------
export async function adminLogin(email, password) {
  const data = await request('/admin/login', { method: 'POST', body: { email, password }, auth: false });
  return data;
}
