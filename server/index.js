import express from 'express';
import pg from 'pg';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, readFileSync } from 'fs';
import 'dotenv/config';

import { buildFreeQuizzes, listSimulationDefinitions, buildSimulationQuestions, buildBalancedSimulation, buildSubjectSimulation, listAvailableSubjects } from './quizEngine.js';
import { parseQuestionsWorkbook } from './excelParser.js';
import { sendWelcomeEmail, sendPremiumActivatedEmail, sendPasswordResetEmail } from './email.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const JWT_SECRET = process.env.JWT_SECRET || 'cambia-questo-segreto-in-produzione';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const IDONEO_THRESHOLD = 60;

if (!process.env.JWT_SECRET) {
  console.warn('ATTENZIONE: JWT_SECRET non impostato nel .env — usando un valore di default non sicuro.');
}
if (!process.env.DATABASE_URL) {
  console.error('Manca DATABASE_URL nel file .env — vedi README per come ottenerlo da Neon.');
  process.exit(1);
}

// ============================================================
// 1. Database (Postgres esterno, es. Neon — piano gratuito permanente)
// ============================================================

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admins (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      nome TEXT,
      creato_il TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      nome TEXT,
      cognome TEXT,
      email TEXT,
      attivo BOOLEAN NOT NULL DEFAULT true,
      premium BOOLEAN NOT NULL DEFAULT false,
      premium_dal TIMESTAMPTZ,
      creato_il TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      external_id TEXT,
      tipo TEXT NOT NULL,
      materia TEXT NOT NULL,
      domanda TEXT NOT NULL,
      opzione_a TEXT NOT NULL,
      opzione_b TEXT NOT NULL,
      opzione_c TEXT,
      opzione_d TEXT,
      risposta_corretta TEXT NOT NULL,
      spiegazione TEXT,
      livello TEXT,
      categoria TEXT,
      creato_il TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS results (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      tipo TEXT NOT NULL,
      titolo TEXT NOT NULL,
      corrette INTEGER NOT NULL,
      errate INTEGER NOT NULL,
      non_risposte INTEGER NOT NULL,
      totale INTEGER NOT NULL,
      percentuale INTEGER NOT NULL,
      tempo_secondi INTEGER NOT NULL,
      dettaglio JSONB NOT NULL,
      materie_breakdown JSONB,
      creato_il TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // ---------- Auto-inizializzazione: primo admin ----------
  const { rows: adminRows } = await pool.query('SELECT count(*)::int AS n FROM admins');
  if (adminRows[0].n === 0) {
    const email = process.env.BOOTSTRAP_ADMIN_EMAIL || 'admin@pecs1695.it';
    const password = process.env.BOOTSTRAP_ADMIN_PASSWORD || 'admin1695';
    const hash = await bcrypt.hash(password, 12);
    await pool.query('INSERT INTO admins (id, email, password_hash, nome) VALUES ($1,$2,$3,$4)', [
      crypto.randomUUID(), email, hash, 'Amministratore',
    ]);
    console.log(`✔ Primo amministratore creato: ${email} (password: quella in BOOTSTRAP_ADMIN_PASSWORD nel .env)`);
  }

  // ---------- Sincronizzazione domande da server/domande.xlsx ----------
  // Ad ogni avvio, controlliamo se il file è cambiato rispetto all'ultima
  // sincronizzazione (confrontando un'impronta del contenuto). Se è
  // cambiato, sostituiamo tutte le domande con quelle presenti nel file:
  // così, per aggiornarle, basta modificare/sostituire domande.xlsx e
  // riavviare l'app (o rifare il deploy) — senza dover passare dal
  // pannello admin. Se il file non è cambiato, non tocchiamo nulla, così
  // eventuali modifiche fatte a mano dal pannello admin restano intatte.
  try {
    const excelPath = join(__dirname, 'domande.xlsx');
    if (existsSync(excelPath)) {
      const buffer = readFileSync(excelPath);
      const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');

      const { rows: metaRows } = await pool.query(
        "SELECT value FROM app_meta WHERE key = 'domande_xlsx_hash'"
      );
      const lastHash = metaRows[0]?.value;

      if (fileHash !== lastHash) {
        const { questions, problems } = parseQuestionsWorkbook(buffer);
        if (questions.length > 0) {
          const client = await pool.connect();
          try {
            await client.query('BEGIN');
            await client.query('DELETE FROM questions');
            for (const q of questions) {
              await client.query(
                `INSERT INTO questions (id, external_id, tipo, materia, domanda, opzione_a, opzione_b, opzione_c, opzione_d, risposta_corretta, spiegazione, livello, categoria)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
                [crypto.randomUUID(), q.external_id, q.tipo, q.materia, q.domanda, q.opzione_a, q.opzione_b, q.opzione_c, q.opzione_d, q.risposta_corretta, q.spiegazione, q.livello, q.categoria]
              );
            }
            await client.query(
              `INSERT INTO app_meta (key, value) VALUES ('domande_xlsx_hash', $1)
               ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
              [fileHash]
            );
            await client.query('COMMIT');
          } catch (err) {
            await client.query('ROLLBACK');
            throw err;
          } finally {
            client.release();
          }
          console.log(
            `✔ domande.xlsx è cambiato: sincronizzate ${questions.length} domande nel database` +
              (problems.length ? ` (${problems.length} righe scartate per errori, vedi sotto).` : '.')
          );
          if (problems.length) console.warn(problems.join('\n'));
        } else {
          console.warn('domande.xlsx non contiene domande valide: sincronizzazione saltata.');
        }
      } else {
        console.log('domande.xlsx non è cambiato dall\u2019ultimo avvio: nessuna sincronizzazione necessaria.');
      }
    } else {
      console.warn('Non ho trovato server/domande.xlsx: nessuna domanda caricata automaticamente.');
    }
  } catch (err) {
    console.warn('Errore durante la sincronizzazione di domande.xlsx:', err.message);
  }
}

// ============================================================
// 2. Autenticazione: password e token
// ============================================================

const hashPassword = (plain) => bcrypt.hash(plain, 12);
const verifyPassword = (plain, hash) => bcrypt.compare(plain, hash);
const signToken = (payload) => jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
const verifyToken = (token) => jwt.verify(token, JWT_SECRET);

function extractToken(req) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  return scheme === 'Bearer' ? token : null;
}

function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: 'Accesso richiesto.' });
  try {
    const payload = verifyToken(token);
    if (payload.role !== 'user') throw new Error('ruolo non valido');
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Sessione non valida o scaduta.' });
  }
}

function requireAdmin(req, res, next) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: 'Accesso amministratore richiesto.' });
  try {
    const payload = verifyToken(token);
    if (payload.role !== 'admin') throw new Error('ruolo non valido');
    req.admin = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Sessione amministratore non valida o scaduta.' });
  }
}

// ============================================================
// 3. App Express
// ============================================================

const app = express();
app.use(express.json());

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Troppi tentativi di accesso. Riprova tra qualche minuto.' },
});
app.use('/api/auth/login', loginLimiter);
app.use('/api/admin/login', loginLimiter);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

app.get('/api/health', (req, res) => res.json({ ok: true }));

// ---------- Rappresentazioni pubbliche ----------
function toPublicUser(row) {
  return {
    id: row.id,
    username: row.username,
    nome: row.nome,
    cognome: row.cognome,
    email: row.email,
    attivo: row.attivo,
    premium: row.premium,
    premiumSince: row.premium_dal,
    creatoIl: row.creato_il,
  };
}

function toPublicQuestion(row) {
  return {
    id: row.id,
    tipo: row.tipo,
    materia: row.materia,
    domanda: row.domanda,
    options: {
      A: row.opzione_a,
      B: row.opzione_b,
      ...(row.opzione_c ? { C: row.opzione_c } : {}),
      ...(row.opzione_d ? { D: row.opzione_d } : {}),
    },
    correct: row.risposta_corretta,
    spiegazione: row.spiegazione,
    livello: row.livello,
    categoria: row.categoria,
  };
}

const PHRASES = [
  { min: 100, text: 'Prestazione eccellente! Continua così.' },
  { min: 80, text: 'Ottimo lavoro, sei sulla strada giusta.' },
  { min: 60, text: 'Buon risultato, puoi migliorare ancora.' },
  { min: 40, text: 'Allenati ancora e vedrai grandi miglioramenti.' },
  { min: 20, text: 'Non arrenderti. Ogni simulazione ti rende più preparato.' },
  { min: 0, text: 'È solo l\u2019inizio: ogni tentativo è un passo avanti.' },
];
const motivationalPhrase = (pct) => (PHRASES.find((p) => pct >= p.min) || PHRASES.at(-1)).text;

// ============================================================
// 4. Rotte — autenticazione utente
// ============================================================

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username e password sono obbligatori.' });

    const { rows } = await pool.query('SELECT * FROM users WHERE lower(username) = lower($1)', [username]);
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Username o password non corretti.' });

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Username o password non corretti.' });
    if (!user.attivo) return res.status(403).json({ error: 'Questo account è stato revocato. Contatta l\u2019amministratore.' });

    const token = signToken({ role: 'user', id: user.id, username: user.username });
    res.json({ token, user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
});

app.get('/api/auth/me', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Utente non trovato.' });
    res.json({ user: toPublicUser(rows[0]) });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// 5. Rotte — autenticazione admin
// ============================================================

app.post('/api/admin/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email e password sono obbligatorie.' });

    const { rows } = await pool.query('SELECT * FROM admins WHERE lower(email) = lower($1)', [email]);
    const admin = rows[0];
    if (!admin) return res.status(401).json({ error: 'Credenziali non valide.' });

    const valid = await verifyPassword(password, admin.password_hash);
    if (!valid) return res.status(401).json({ error: 'Credenziali non valide.' });

    const token = signToken({ role: 'admin', id: admin.id, email: admin.email });
    res.json({ token, admin: { id: admin.id, email: admin.email, nome: admin.nome } });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// 6. Rotte — gestione utenze (admin)
// ============================================================

app.get('/api/admin/users', requireAdmin, async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM users ORDER BY creato_il DESC');
    res.json({ users: rows.map(toPublicUser) });
  } catch (err) {
    next(err);
  }
});

app.post('/api/admin/users', requireAdmin, async (req, res, next) => {
  try {
    const { username, password, nome, cognome, email, premium } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username e password sono obbligatori.' });

    const existing = await pool.query('SELECT id FROM users WHERE lower(username) = lower($1)', [username]);
    if (existing.rows.length > 0) return res.status(409).json({ error: 'Username già esistente.' });

    const passwordHash = await hashPassword(password);
    const id = crypto.randomUUID();
    const { rows } = await pool.query(
      `INSERT INTO users (id, username, password_hash, nome, cognome, email, premium, premium_dal)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [id, username, passwordHash, nome || null, cognome || null, email || null, !!premium, premium ? new Date() : null]
    );

    const user = rows[0];
    sendWelcomeEmail({ to: user.email, nome: user.nome, username: user.username, password }).catch(() => {});
    res.status(201).json({ user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
});

app.patch('/api/admin/users/:id', requireAdmin, async (req, res, next) => {
  try {
    const { attivo, premium, nome, cognome, email } = req.body;
    const current = (await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id])).rows[0];
    if (!current) return res.status(404).json({ error: 'Utente non trovato.' });

    const next_ = {
      attivo: attivo !== undefined ? attivo : current.attivo,
      premium: premium !== undefined ? premium : current.premium,
      premium_dal: premium !== undefined ? (premium ? new Date() : null) : current.premium_dal,
      nome: nome !== undefined ? nome : current.nome,
      cognome: cognome !== undefined ? cognome : current.cognome,
      email: email !== undefined ? email : current.email,
    };

    const { rows } = await pool.query(
      'UPDATE users SET attivo=$1, premium=$2, premium_dal=$3, nome=$4, cognome=$5, email=$6 WHERE id=$7 RETURNING *',
      [next_.attivo, next_.premium, next_.premium_dal, next_.nome, next_.cognome, next_.email, req.params.id]
    );

    const user = rows[0];
    if (premium === true) sendPremiumActivatedEmail({ to: user.email, nome: user.nome }).catch(() => {});
    res.json({ user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
});

app.post('/api/admin/users/:id/reset-password', requireAdmin, async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword) return res.status(400).json({ error: 'Nuova password obbligatoria.' });

    const passwordHash = await hashPassword(newPassword);
    const { rows } = await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING *', [passwordHash, req.params.id]);
    const user = rows[0];
    if (!user) return res.status(404).json({ error: 'Utente non trovato.' });

    sendPasswordResetEmail({ to: user.email, nome: user.nome, newPassword }).catch(() => {});
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

app.delete('/api/admin/users/:id', requireAdmin, async (req, res, next) => {
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// 7. Rotte — gestione domande (admin)
// ============================================================

app.get('/api/admin/questions', requireAdmin, async (req, res, next) => {
  try {
    const { search, materia, tipo } = req.query;
    const clauses = [];
    const values = [];
    let idx = 1;
    if (search) { clauses.push(`domanda ILIKE $${idx++}`); values.push(`%${search}%`); }
    if (materia) { clauses.push(`materia = $${idx++}`); values.push(materia); }
    if (tipo) { clauses.push(`tipo = $${idx++}`); values.push(tipo); }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const { rows } = await pool.query(`SELECT * FROM questions ${where} ORDER BY creato_il DESC`, values);
    res.json({ questions: rows.map(toPublicQuestion) });
  } catch (err) {
    next(err);
  }
});

app.post('/api/admin/questions', requireAdmin, async (req, res, next) => {
  try {
    const { tipo, materia, domanda, options, correct, spiegazione, livello, categoria } = req.body;
    if (!tipo || !materia || !domanda || !options?.A || !options?.B || !correct) {
      return res.status(400).json({ error: 'Campi obbligatori mancanti.' });
    }
    const { rows } = await pool.query(
      `INSERT INTO questions (id, tipo, materia, domanda, opzione_a, opzione_b, opzione_c, opzione_d, risposta_corretta, spiegazione, livello, categoria)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [crypto.randomUUID(), tipo, materia, domanda, options.A, options.B, options.C || null, options.D || null, correct, spiegazione || null, livello || null, categoria || null]
    );
    res.status(201).json({ question: toPublicQuestion(rows[0]) });
  } catch (err) {
    next(err);
  }
});

app.patch('/api/admin/questions/:id', requireAdmin, async (req, res, next) => {
  try {
    const current = (await pool.query('SELECT * FROM questions WHERE id = $1', [req.params.id])).rows[0];
    if (!current) return res.status(404).json({ error: 'Domanda non trovata.' });

    const { tipo, materia, domanda, options, correct, spiegazione, livello, categoria } = req.body;
    const { rows } = await pool.query(
      `UPDATE questions SET tipo=$1, materia=$2, domanda=$3, opzione_a=$4, opzione_b=$5, opzione_c=$6, opzione_d=$7, risposta_corretta=$8, spiegazione=$9, livello=$10, categoria=$11
       WHERE id=$12 RETURNING *`,
      [
        tipo ?? current.tipo, materia ?? current.materia, domanda ?? current.domanda,
        options?.A ?? current.opzione_a, options?.B ?? current.opzione_b,
        options?.C ?? current.opzione_c, options?.D ?? current.opzione_d,
        correct ?? current.risposta_corretta, spiegazione ?? current.spiegazione,
        livello ?? current.livello, categoria ?? current.categoria, req.params.id,
      ]
    );
    res.json({ question: toPublicQuestion(rows[0]) });
  } catch (err) {
    next(err);
  }
});

app.delete('/api/admin/questions/:id', requireAdmin, async (req, res, next) => {
  try {
    await pool.query('DELETE FROM questions WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

app.post('/api/admin/questions/import', requireAdmin, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nessun file caricato.' });
    const mode = req.query.mode === 'replace' ? 'replace' : 'merge';

    const { questions, problems } = parseQuestionsWorkbook(req.file.buffer);
    if (questions.length === 0) {
      return res.status(400).json({ error: 'Nessuna domanda valida trovata nel file.', problems });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      if (mode === 'replace') await client.query('DELETE FROM questions');
      for (const q of questions) {
        await client.query(
          `INSERT INTO questions (id, external_id, tipo, materia, domanda, opzione_a, opzione_b, opzione_c, opzione_d, risposta_corretta, spiegazione, livello, categoria)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
          [crypto.randomUUID(), q.external_id, q.tipo, q.materia, q.domanda, q.opzione_a, q.opzione_b, q.opzione_c, q.opzione_d, q.risposta_corretta, q.spiegazione, q.livello, q.categoria]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    res.json({ imported: questions.length, problems, mode });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// 8. Rotte — statistiche (admin)
// ============================================================

app.get('/api/admin/stats', requireAdmin, async (req, res, next) => {
  try {
    const { rows: users } = await pool.query('SELECT * FROM users');
    const { rows: results } = await pool.query('SELECT * FROM results');

    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const newUsers7d = users.filter((u) => now - new Date(u.creato_il).getTime() < sevenDays).length;
    const premiumUsers = users.filter((u) => u.premium).length;
    const revoked = users.filter((u) => !u.attivo).length;
    const quizCompletati = results.filter((r) => r.tipo === 'free').length;
    const simulazioniEffettuate = results.filter((r) => r.tipo === 'simulation').length;
    const tempoMedio = results.length > 0 ? Math.round(results.reduce((s, r) => s + r.tempo_secondi, 0) / results.length) : 0;

    const byMonth = {};
    users.forEach((u) => {
      const mese = new Date(u.creato_il).toISOString().slice(0, 7);
      byMonth[mese] = (byMonth[mese] || 0) + 1;
    });
    const monthlyData = Object.entries(byMonth).sort().map(([mese, nuovi]) => ({ mese, nuovi }));

    res.json({ numeroUtenti: users.length, newUsers7d, premiumUsers, revoked, quizCompletati, simulazioniEffettuate, tempoMedio, monthlyData });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// 9. Rotte — quiz e simulazioni (utente loggato)
// ============================================================

app.get('/api/quizzes/free', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query("SELECT * FROM questions WHERE tipo = 'Gratuito'");
    res.json({ quizzes: buildFreeQuizzes(rows) });
  } catch (err) {
    next(err);
  }
});

app.get('/api/quizzes/simulations', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query("SELECT * FROM questions WHERE tipo = 'Simulazione'");
    res.json({ simulations: listSimulationDefinitions(rows) });
  } catch (err) {
    next(err);
  }
});

app.get('/api/quizzes/simulations/:id/start', requireAuth, async (req, res, next) => {
  try {
    const { rows: userRows } = await pool.query('SELECT premium FROM users WHERE id = $1', [req.user.id]);
    if (!userRows[0]?.premium) return res.status(403).json({ error: 'Serve l\u2019accesso Premium per avviare una simulazione.' });

    const { rows } = await pool.query("SELECT * FROM questions WHERE tipo = 'Simulazione'");
    const questions = buildSimulationQuestions(rows);
    if (questions.length === 0) return res.status(404).json({ error: 'Nessuna domanda di simulazione disponibile.' });
    res.json({ id: req.params.id, questions });
  } catch (err) {
    next(err);
  }
});

// ---------- Materie disponibili e generazione per modalità (completa/breve/materia) ----------

app.get('/api/quizzes/subjects', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query("SELECT materia FROM questions WHERE tipo = 'Simulazione'");
    res.json({ subjects: listAvailableSubjects(rows) });
  } catch (err) {
    next(err);
  }
});

app.post('/api/quizzes/generate', requireAuth, async (req, res, next) => {
  try {
    const { rows: userRows } = await pool.query('SELECT premium FROM users WHERE id = $1', [req.user.id]);
    if (!userRows[0]?.premium) {
      return res.status(403).json({ error: 'Serve l\u2019accesso Premium per avviare una simulazione.' });
    }

    const { mode, subject, excludeIds } = req.body;
    const { rows } = await pool.query("SELECT * FROM questions WHERE tipo = 'Simulazione'");
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Nessuna domanda di simulazione disponibile.' });
    }

    let questions;
    if (mode === 'materia') {
      if (!subject) return res.status(400).json({ error: 'Devi specificare una materia per questa modalità.' });
      questions = buildSubjectSimulation(rows, subject, 20, excludeIds);
      if (questions.length === 0) {
        return res.status(400).json({ error: `Nessuna domanda disponibile per la materia "${subject}".` });
      }
    } else if (mode === 'breve') {
      questions = buildBalancedSimulation(rows, 30, excludeIds);
    } else {
      questions = buildBalancedSimulation(rows, 60, excludeIds);
    }

    res.json({ questions });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// 10. Rotte — risultati
// ============================================================

app.post('/api/results', requireAuth, async (req, res, next) => {
  try {
    const { tipo, titolo, answers, elapsedSeconds } = req.body;
    if (!tipo || !titolo || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ error: 'Dati mancanti o non validi.' });
    }

    const ids = answers.map((a) => a.questionId);
    const { rows: questionRows } = await pool.query('SELECT * FROM questions WHERE id = ANY($1)', [ids]);
    const byId = Object.fromEntries(questionRows.map((q) => [q.id, q]));

    let corrette = 0, errate = 0, nonRisposte = 0;
    const dettaglio = [];
    const subjectAgg = {};

    answers.forEach((a) => {
      const q = byId[a.questionId];
      if (!q) return;
      const isCorrect = a.chosen === q.risposta_corretta;
      if (!a.chosen) nonRisposte += 1;
      else if (isCorrect) corrette += 1;
      else errate += 1;

      if (!subjectAgg[q.materia]) subjectAgg[q.materia] = { correct: 0, wrong: 0, total: 0 };
      subjectAgg[q.materia].total += 1;
      if (isCorrect) subjectAgg[q.materia].correct += 1;
      else subjectAgg[q.materia].wrong += 1;

      dettaglio.push({
        questionId: q.id,
        domanda: q.domanda,
        materia: q.materia,
        options: {
          A: q.opzione_a,
          B: q.opzione_b,
          ...(q.opzione_c ? { C: q.opzione_c } : {}),
          ...(q.opzione_d ? { D: q.opzione_d } : {}),
        },
        chosen: a.chosen || null,
        correct: q.risposta_corretta,
        spiegazione: q.spiegazione,
      });
    });

    const totale = dettaglio.length;
    const percentuale = totale > 0 ? Math.round((corrette / totale) * 100) : 0;
    const materieBreakdown = Object.entries(subjectAgg).map(([materia, v]) => ({
      materia,
      corrette: Math.round((v.correct / v.total) * 100),
      errate: Math.round((v.wrong / v.total) * 100),
    }));

    const id = crypto.randomUUID();
    await pool.query(
      `INSERT INTO results (id, user_id, tipo, titolo, corrette, errate, non_risposte, totale, percentuale, tempo_secondi, dettaglio, materie_breakdown)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [id, req.user.id, tipo, titolo, corrette, errate, nonRisposte, totale, percentuale, elapsedSeconds || 0, JSON.stringify(dettaglio), JSON.stringify(materieBreakdown)]
    );

    res.status(201).json({
      id, titolo, tipo, corrette, errate, nonRisposte, totale, percentuale,
      idoneo: tipo === 'simulation' ? percentuale >= IDONEO_THRESHOLD : null,
      frase: motivationalPhrase(percentuale),
      tempoSecondi: elapsedSeconds || 0,
      dettaglio,
      materieBreakdown,
    });
  } catch (err) {
    next(err);
  }
});

app.get('/api/results/me', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM results WHERE user_id = $1 ORDER BY creato_il ASC', [req.user.id]);
    res.json({
      history: rows.map((r) => ({
        id: r.id,
        type: r.tipo,
        title: r.titolo,
        percentage: r.percentuale,
        elapsedSeconds: r.tempo_secondi,
        subjectBreakdown: r.materie_breakdown || [],
        date: r.creato_il,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// 11. Serve il frontend già compilato (npm run build)
// ============================================================

const publicDir = join(__dirname, '..', 'out');
if (existsSync(publicDir)) {
  // extensions: ['html'] e' fondamentale: "next build" con output:'export'
  // genera file come "help.html" o "pannello-gestione-7k2x9.html" (non
  // cartelle con index.html dentro), quindi senza questa opzione una
  // richiesta diretta a /help o un refresh su quella pagina non trova nulla
  // e ricade sull'index.html della Home, dando l'impressione di un 404.
  app.use(express.static(publicDir, { extensions: ['html'] }));
  app.get(/^\/(?!api).*/, (req, res) => {
    // Prova prima la pagina 404 statica generata da Next (se esiste),
    // altrimenti torna alla Home.
    const notFoundPath = join(publicDir, '404.html');
    if (existsSync(notFoundPath)) {
      res.status(404).sendFile(notFoundPath);
    } else {
      res.sendFile(join(publicDir, 'index.html'));
    }
  });
} else {
  app.get('/', (req, res) => {
    res.send('Frontend non ancora compilato. Esegui "npm run build" prima di "npm start".');
  });
}

// ============================================================
// 12. Avvio
// ============================================================

const PORT = process.env.PORT || 4000;
initDb()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`PECS 1695 2026 in ascolto sulla porta ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Errore durante l\u2019inizializzazione del database:', err.message);
    process.exit(1);
  });
