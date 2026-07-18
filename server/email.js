import 'dotenv/config';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'PECS 1695 2026 <onboarding@resend.dev>';

/**
 * Invia una email tramite l'API di Resend (https://resend.com).
 * Se RESEND_API_KEY non è configurata, non fallisce l'operazione principale
 * (es. la creazione dell'utente): stampa solo un avviso in console, così puoi
 * sviluppare senza aver configurato subito l'invio email.
 */
async function sendEmail({ to, subject, html }) {
  if (!RESEND_API_KEY) {
    console.warn(`[email] RESEND_API_KEY non configurata: email a ${to} con oggetto "${subject}" NON inviata.`);
    return { skipped: true };
  }
  if (!to) {
    console.warn('[email] Nessun indirizzo email per questo utente: invio saltato.');
    return { skipped: true };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: EMAIL_FROM, to, subject, html }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`[email] Invio fallito (${response.status}):`, body);
    return { error: true, status: response.status };
  }

  return response.json();
}

export function sendWelcomeEmail({ to, nome, username, password }) {
  return sendEmail({
    to,
    subject: 'Il tuo accesso a PECS 1695 2026',
    html: `
      <p>Ciao ${nome || ''},</p>
      <p>Il tuo account per la piattaforma di preparazione al concorso PECS 1695 2026 è stato creato.</p>
      <p><strong>Username:</strong> ${username}<br/>
         <strong>Password:</strong> ${password}</p>
      <p>Ti consigliamo di cambiare la password al primo accesso, se la piattaforma lo prevede,
         oppure di contattarci per farlo.</p>
    `,
  });
}

export function sendPremiumActivatedEmail({ to, nome }) {
  return sendEmail({
    to,
    subject: 'Accesso Premium attivato — PECS 1695 2026',
    html: `
      <p>Ciao ${nome || ''},</p>
      <p>Il tuo accesso Premium è stato attivato: da ora puoi svolgere tutte le Simulazioni Complete.</p>
      <p>Buono studio!</p>
    `,
  });
}

export function sendPasswordResetEmail({ to, nome, newPassword }) {
  return sendEmail({
    to,
    subject: 'La tua nuova password — PECS 1695 2026',
    html: `
      <p>Ciao ${nome || ''},</p>
      <p>La tua password è stata reimpostata dall'amministratore.</p>
      <p><strong>Nuova password:</strong> ${newPassword}</p>
    `,
  });
}
