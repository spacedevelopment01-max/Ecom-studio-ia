/**
 * Le nom de domaine d'une marque (demandes du propriétaire du 13 novembre 2026 : « le nom de domaine doit aussi être
 * disponible avec le nom de la marque », puis « il faut trouver une alternative disponible comme pulpefrance.fr ou
 * .com, tout en gardant le nom »).
 *
 * Gratuit, sans IA ni clé : l'annuaire public de chaque registre (RDAP : AFNIC pour .fr, Verisign pour .com) dit si un
 * domaine est enregistré. SINA regarde
 * d'abord le domaine exact (.fr et .com), puis des domaines construits AVEC le nom, qui reste entier : « nomfrance »,
 * le nom et le métier, « maison » devant, etc. Elle rend ce qui est pris, ce qui est libre aujourd'hui, et ce qu'elle
 * n'a pas pu vérifier. « Libre » veut dire « pas enregistré à l'heure du contrôle » : seule la réservation le garantit,
 * et c'est toujours dit au client.
 */
export type DomainStatus = "libre" | "pris" | "inconnu";
export type NameDomains = { taken: string[]; free: string[]; unknown: string[]; at: number };

const STOP = new Set(["avec", "pour", "sans", "dans", "tout", "tous", "toute", "toutes", "bien", "tres", "plus", "leur", "leurs", "votre", "notre", "cette", "entre", "chez", "vrac", "boire", "froid", "froide", "froides", "frais", "fraiche", "fraiches", "chaud", "chaude", "petit", "petite", "grand", "grande", "sur", "mesure", "main", "fait", "faits", "faite"]);
const plain = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Le nom, tel qu'il s'écrit dans une adresse : sans accent, sans espace ni ponctuation. Vide s'il ne peut pas faire un domaine. */
export function domainSlug(name: string): string {
  const s = plain(name).replace(/[^a-z0-9]+/g, "");
  return s.length >= 2 && s.length <= 40 ? s : "";
}

/** Le mot du métier (« infusions »), tiré de la ligne de métier de la planche : le premier vrai mot, jamais inventé. */
export function tradeWord(descriptor?: string | null): string {
  const w = plain(descriptor ?? "").split(/[^a-z0-9]+/).find((x) => x.length >= 4 && x.length <= 16 && !STOP.has(x));
  return w ?? "";
}

/** Domaines à regarder : l'exact d'abord, puis ceux qui GARDENT le nom entier, du plus simple au moins simple. */
export function domainCandidates(name: string, descriptor?: string | null): { exact: string[]; alternatives: string[] } {
  const s = domainSlug(name), w = tradeWord(descriptor);
  if (!s) return { exact: [], alternatives: [] };
  const alt = [`${s}france.fr`, `${s}france.com`, ...(w && w !== s ? [`${s}-${w}.fr`, `${s}-${w}.com`] : []), `maison${s}.fr`, `${s}-officiel.fr`, `${s}boutique.fr`];
  return { exact: [`${s}.fr`, `${s}.com`], alternatives: [...new Set(alt)].filter((d) => d.length <= 67) };
}

/** Remplaçable par les tests (aucun appel réseau). */
export const domainDeps: { lookup?: (domain: string) => Promise<DomainStatus> } = {};

/** Annuaire public (RDAP) du registre de chaque extension : l'AFNIC pour .fr, Verisign pour .com. */
const REGISTRY: Record<string, (domain: string) => string> = {
  fr: (d) => `https://rdap.nic.fr/domain/${d}`,
  com: (d) => `https://rdap.verisign.com/com/v1/domain/${d}`,
};

/** Un domaine est-il enregistré ? Le registre répond 404 = pas enregistré, 200 = enregistré ; autre chose : on ne sait pas. */
export async function domainStatus(domain: string): Promise<DomainStatus> {
  if (domainDeps.lookup) return domainDeps.lookup(domain);
  const m = /^[a-z0-9-]{2,63}\.(fr|com)$/.exec(domain);
  if (!m) return "inconnu";
  try {
    const r = await fetch(REGISTRY[m[1]](domain), { redirect: "follow", headers: { accept: "application/rdap+json, application/json" }, signal: AbortSignal.timeout(12_000) });
    return r.status === 404 ? "libre" : r.status === 200 ? "pris" : "inconnu";
  } catch { return "inconnu"; }
}

/**
 * Le domaine exact, puis des alternatives qui gardent le nom, jusqu'à en trouver `want` de libres (9 contrôles au
 * plus par nom). Rien n'est inventé : chaque domaine rendu a été regardé à l'instant.
 */
export async function findDomains(name: string, descriptor?: string | null, want = 2): Promise<NameDomains> {
  const c = domainCandidates(name, descriptor), out: NameDomains = { taken: [], free: [], unknown: [], at: Date.now() };
  const look = async (d: string) => { const st = await domainStatus(d); (st === "libre" ? out.free : st === "pris" ? out.taken : out.unknown).push(d); return st; };
  for (const d of c.exact) await look(d);
  for (const d of c.alternatives) { if (out.free.length >= want) break; await look(d); }
  return out;
}

const list = (a: string[]) => (a.length > 1 ? `${a.slice(0, -1).join(", ")} et ${a[a.length - 1]}` : a[0] ?? "");
/** Ce que SINA dit du nom de domaine, franchement : pris, libre aujourd'hui (à réserver), ou pas vérifié. */
export function domainLine(d: NameDomains | null | undefined, lang: "fr" | "en" = "fr"): string {
  if (!d || (!d.taken.length && !d.free.length && !d.unknown.length)) return "";
  const en = lang === "en", parts: string[] = [];
  if (d.taken.length) parts.push(en ? `${list(d.taken)} already taken` : `${list(d.taken)} ${d.taken.length > 1 ? "sont déjà pris" : "est déjà pris"}`);
  if (d.free.length) parts.push(en ? `free today: ${list(d.free)} (book it quickly, only booking guarantees it)` : `${d.free.length > 1 ? "libres" : "libre"} aujourd'hui : ${list(d.free)} (à réserver vite : seule la réservation le garantit)`);
  else if (d.taken.length && !d.unknown.length) parts.push(en ? "I found no simple free domain with this name" : "je n'ai pas trouvé de domaine libre simple avec ce nom");
  if (d.unknown.length && !d.free.length) parts.push(en ? `not checked: ${list(d.unknown)}` : `pas pu vérifier : ${list(d.unknown)}`);
  return `${en ? "Domain name" : "Nom de domaine"} : ${parts.join(" ; ")}.`;
}
