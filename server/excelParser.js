import * as XLSX from 'xlsx';

const LETTERS = ['A', 'B', 'C', 'D'];

export function parseQuestionsWorkbook(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  const questions = [];
  const problems = [];

  rows.forEach((row, i) => {
    const rowNum = i + 2;
    const tipoRaw = row['Tipo']?.toString().trim().toLowerCase();
    const domanda = row['Domanda']?.toString().trim();
    const correttaRaw = row['Risposta Corretta']?.toString().trim().toUpperCase();
    const materia = row['Materia']?.toString().trim() || 'Generale';

    if (!tipoRaw || !domanda || !correttaRaw) {
      problems.push(`Riga ${rowNum}: mancano Tipo, Domanda o Risposta Corretta.`);
      return;
    }
    const isSimulazione = tipoRaw.startsWith('sim');
    const isGratuito = tipoRaw.startsWith('grat');
    if (!isSimulazione && !isGratuito) {
      problems.push(`Riga ${rowNum}: "Tipo" deve essere "Gratuito" o "Simulazione".`);
      return;
    }

    const options = {};
    LETTERS.forEach((l) => {
      const val = row[`Risposta ${l}`]?.toString().trim();
      if (val) options[l] = val;
    });
    if (Object.keys(options).length < 2) {
      problems.push(`Riga ${rowNum}: servono almeno due risposte.`);
      return;
    }
    if (isSimulazione && Object.keys(options).length < 4) {
      problems.push(`Riga ${rowNum}: le domande da Simulazione richiedono tutte e 4 le risposte.`);
      return;
    }
    if (!LETTERS.includes(correttaRaw) || !options[correttaRaw]) {
      problems.push(`Riga ${rowNum}: "Risposta Corretta" non corrisponde a una risposta compilata.`);
      return;
    }

    questions.push({
      external_id: row['ID']?.toString().trim() || null,
      tipo: isSimulazione ? 'Simulazione' : 'Gratuito',
      materia,
      domanda,
      opzione_a: options.A,
      opzione_b: options.B,
      opzione_c: options.C || null,
      opzione_d: options.D || null,
      risposta_corretta: correttaRaw,
      spiegazione: row['Spiegazione']?.toString().trim() || null,
      livello: row['Livello']?.toString().trim() || null,
      categoria: row['Categoria']?.toString().trim() || null,
    });
  });

  return { questions, problems };
}
