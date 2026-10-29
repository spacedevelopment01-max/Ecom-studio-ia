/**
 * Hébergement des sites de services (#232) : reconnaître, à partir du seul en-tête Host, une requête destinée à un site
 * publié plutôt qu'au studio. Aucune dépendance (exécuté par le middleware). Désactivé tant que `SITES_DOMAIN` n'est pas
 * défini : le studio se comporte alors exactement comme avant.
 *
 * - `SITES_DOMAIN` : domaine réservé aux sites (« sites-exemple.fr »), distinct du domaine du studio ; chaque site y a
 *   une adresse `<adresse>.<SITES_DOMAIN>`.
 * - `SITES_CUSTOM_DOMAINS=1` : les autres noms d'hôte, sauf ceux du studio, sont aussi confiés au service des sites,
 *   qui ne sert que les domaines personnalisés vérifiés (404 sinon).
 */

/** Nom d'hôte normalisé (minuscules, sans port ni point final), ou null s'il est invalide. */
export function normalizeHost(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const host = raw.trim().toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
  if (!host || host.length > 253 || !/^[a-z0-9.-]+$/.test(host) || host.split(".").some((l) => !l || l.length > 63 || l.startsWith("-") || l.endsWith("-"))) return null;
  return host;
}

export const sitesDomain = () => normalizeHost(process.env.SITES_DOMAIN);
export const customDomainsEnabled = () => process.env.SITES_CUSTOM_DOMAINS === "1" && !!sitesDomain();

/** Noms d'hôte du studio lui-même : jamais traités comme un site. */
export function studioHosts(): string[] {
  const hosts = ["localhost", "127.0.0.1", "0.0.0.0"];
  for (const u of [process.env.APP_URL]) {
    try { if (u) hosts.push(new URL(u).hostname.toLowerCase()); } catch { /* adresse invalide ignorée */ }
  }
  for (const h of (process.env.STUDIO_HOSTS ?? "").split(",")) { const n = normalizeHost(h); if (n) hosts.push(n); }
  return hosts;
}

/** Nom d'hôte du site visé par cette requête, ou null si elle s'adresse au studio. */
export function siteHostOf(rawHost: string | null | undefined): string | null {
  const domain = sitesDomain();
  if (!domain) return null;
  const host = normalizeHost(rawHost);
  if (!host) return null;
  if (host.endsWith(`.${domain}`) && host.length > domain.length + 1) return host;
  if (customDomainsEnabled() && host !== domain && !studioHosts().includes(host)) return host;
  return null;
}
