export function computeMotivationalMessage(percent: number): string {
  if (percent >= 95) return "Eccellente! Sei pronto ad affrontare il concorso.";
  if (percent >= 80) return "Ottimo lavoro! Continua ad esercitarti.";
  if (percent >= 60) return "Buona preparazione. Ancora qualche esercizio e sarai pronto.";
  if (percent >= 40) return "Puoi migliorare con un allenamento costante.";
  return "Continua a studiare. Ogni simulazione ti fara' crescere.";
}
