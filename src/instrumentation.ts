/**
 * Démarrage du serveur Next.js : masquage des secrets dans tout ce que le serveur écrit en console ; signalement d'une
 * adresse d'écoute qui empêcherait de servir les sites hébergés (`launch-check.ts`).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    (await import("./lib/redact")).installConsoleRedaction();
    const host = (await import("./lib/sites/launch-check")).unsupportedSitesHostname(process.argv, process.env.SITES_DOMAIN);
    if (host) console.error(`[sites] Lancement « -H ${host} » non pris en charge avec SITES_DOMAIN : chaque site publié répondrait 404. Lancez sans -H, ou avec -H localhost ou -H 0.0.0.0.`);
  }
}
