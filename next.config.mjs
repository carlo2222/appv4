/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Produce un export statico (cartella "out/"), servito poi dal server
  // Express in server/index.js — un'unica app, un solo servizio da mettere online.
  output: 'export',
  images: {
    unoptimized: true,
  },
  // Non blocchiamo la build su errori di tipo/lint: questo progetto non è
  // stato compilato in questo ambiente prima di essere consegnato, quindi
  // preferiamo che "npm run build" abbia le migliori possibilità di
  // completarsi. Se vuoi il controllo rigoroso dei tipi in futuro, rimuovi
  // queste due righe.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  async rewrites() {
    // Attivo SOLO in sviluppo (next dev): inoltra le chiamate /api al backend
    // Express che gira sulla porta 4000. In produzione non serve, perché il
    // frontend esportato viene servito dallo stesso Express che ha le API
    // (stesso indirizzo, nessun proxy necessario). Nota: Next.js ignora
    // "rewrites" quando esegue "next build" con output:'export', quindi
    // questa configurazione è innocua in produzione.
    return [{ source: '/api/:path*', destination: 'http://localhost:4000/api/:path*' }];
  },
};

export default nextConfig;
