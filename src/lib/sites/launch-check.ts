/**
 * Hébergement des sites (#232, contre-vérification #277) : `next start -H 127.0.0.1` (ou une autre adresse de bouclage
 * littérale) n'est pas pris en charge quand `SITES_DOMAIN` est défini. Next ramène ces adresses à « localhost » dans le
 * middleware mais pas dans son routeur ; la réécriture vers la route interne des sites est alors traitée comme un renvoi
 * HTTP externe, sans le marqueur posé par le middleware, et chaque site répond 404. Sans `-H` (Docker, `npm run studio`),
 * avec `-H localhost` ou `-H 0.0.0.0`, la réécriture reste interne.
 */
const LOOPBACK_LITERAL = /^(127(\.\d{1,3}){3}|::1|\[::1\])$/;

/** Adresse d'écoute non prise en charge pour les sites hébergés, ou null. */
export function unsupportedSitesHostname(argv: readonly string[], sitesDomain: string | null | undefined): string | null {
  if (!sitesDomain) return null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const h = a === "-H" || a === "--hostname" ? argv[i + 1] : a.startsWith("--hostname=") ? a.slice(11) : a.startsWith("-H") && a.length > 2 ? a.slice(2) : undefined;
    if (h !== undefined) return LOOPBACK_LITERAL.test(h.trim()) ? h.trim() : null;
  }
  return null;
}
