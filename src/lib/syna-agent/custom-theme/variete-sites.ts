/**
 * La variété entre les sites du Studio (règle du propriétaire du 17 novembre 2026, devant les deux premiers sites de
 * SINA) : « 4 fois la même section entre les deux alors qu'on a une centaine de sections, et surtout elles ont la même
 * disposition alors qu'il y a 2 ou 3 possibilités de placement » ; « sur les 2 premiers thèmes faits par SINA il y a déjà
 * la moitié des sections qui sont identiques. J'appelle pas ça de la variété moi ».
 *
 * Les anciens contrôles ne voyaient pas cela : l'un ne réagissait qu'à 70 % de sections en commun, l'autre ne comparait
 * qu'avec les sites du même métier. Ici, contre CHAQUE site déjà monté pour une autre marque, quel que soit son métier :
 *  - l'accueil a au plus 2 pièces en commun avec lui ;
 *  - le site entier (hors pages pratiques : mentions légales, page introuvable, panier, compte) en a au plus un quart ;
 *  - une pièce reprise ne l'est jamais avec la même disposition quand elle en a plusieurs (pages pratiques comprises).
 * Le concepteur reçoit ces sites avant de concevoir ; le contrôle du Studio, sans IA, rend les écarts à sa seule reprise ;
 * puis, sans IA, une disposition encore reprise est changée pour une disposition libre. L'en-tête, le pied de page et
 * l'ouverture de l'accueil ont leur propre règle (ils restent dans les choix de la famille et tournent) : ils ne sont pas
 * comptés ici, et la correction sans IA n'y touche jamais.
 */
import { constructionsOf } from "./tenue";

export const ACCUEIL_COMMUNES_MAX = 2;
export const SITE_COMMUNES_PART = 0.25;
/** Nombre de derniers sites comparés (les plus récents d'abord). */
export const SITES_COMPARES = 12;
/** Nombre de derniers sites montrés au concepteur, pour garder sa demande courte. */
export const SITES_MONTRES = 6;

/** Un site vu par la règle : chaque page (clé) et ses pièces posées « pièce:disposition », dans l'ordre. */
export type SiteVu = { pages: Record<string, string[]>; /** Les pages qui ne sont pas pratiques (comptées pour le quart). */ utiles: string[]; metier?: string | null };

const bare = (x: string) => x.split(":")[0];
/** Les pages sans l'ouverture de l'accueil (sa première pièce), qui suit la règle de sa famille. */
const sansOuverture = (pages: Record<string, string[]>): Record<string, string[]> => Object.fromEntries(Object.entries(pages).map(([k, v]) => [k, k === "home" ? v.slice(1) : v]));
const plusieurs = (id: string) => constructionsOf(id).length > 1;
const piecesDe = (s: SiteVu, keys?: string[]) => { const p = sansOuverture(s.pages); return new Set((keys ?? Object.keys(p)).flatMap((k) => (p[k] ?? []).map(bare))); };
const accueil = (s: SiteVu) => new Set((s.pages.home ?? []).slice(1).map(bare));

/** Dispositions déjà prises par les sites comparés : « pièce:disposition » → nombre de sites. */
export function dispositionsPrises(sites: SiteVu[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const s of sites.slice(0, SITES_COMPARES)) for (const x of new Set(Object.values(sansOuverture(s.pages)).flat())) if (x.includes(":") && x.split(":")[1]) out.set(x, (out.get(x) ?? 0) + 1);
  return out;
}

/** Les écarts à la règle, pour la seule reprise du concepteur. */
export function varieteSitesGaps(mine: SiteVu, sites: SiteVu[]): string[] {
  const out: string[] = [];
  const autres = sites.slice(0, SITES_COMPARES);
  if (!autres.length) return out;
  // ── l'accueil : au plus deux pièces en commun avec chaque site déjà monté
  const h = accueil(mine);
  let pire: string[] = [];
  for (const s of autres) { const c = [...h].filter((x) => accueil(s).has(x)); if (c.length > pire.length) pire = c; }
  if (pire.length > ACCUEIL_COMMUNES_MAX) out.push(`accueil : ${pire.length} pièces en commun avec l'accueil d'un site déjà monté pour une autre marque (${pire.join(", ")}) ; au plus ${ACCUEIL_COMMUNES_MAX} : remplace-en ${pire.length - ACCUEIL_COMMUNES_MAX} par d'autres pièces de la bibliothèque qui servent le même moment (règle du propriétaire : la variété d'un client à l'autre)`);
  // ── le site entier : au plus un quart de pièces en commun
  const u = piecesDe(mine, mine.utiles);
  if (u.size) {
    let pis: string[] = [];
    for (const s of autres) { const theirs = piecesDe(s, s.utiles); const c = [...u].filter((x) => theirs.has(x)); if (c.length > pis.length) pis = c; }
    const max = Math.floor(u.size * SITE_COMMUNES_PART);
    if (pis.length > max) out.push(`site entier : ${pis.length} pièces sur ${u.size} en commun avec un site déjà monté pour une autre marque (${pis.join(", ")}) ; au plus ${max} (un quart) : remplace-en ${pis.length - max} par d'autres pièces de la bibliothèque qui servent le même moment`);
  }
  // ── jamais la même disposition d'une pièce qu'un autre site, quand elle en a plusieurs
  const prises = dispositionsPrises(autres);
  const memes = [...new Set(Object.values(sansOuverture(mine.pages)).flat())].filter((x) => prises.has(x) && plusieurs(bare(x)));
  if (memes.length) {
    const libres = (x: string) => constructionsOf(bare(x)).map((c) => `${bare(x)}:${c.key}`).filter((y) => !prises.has(y));
    out.push(`dispositions déjà prises par un autre site du Studio, pour une autre marque : ${memes.map((x) => { const l = libres(x); return `${x} (${l.length ? `libres : ${l.join(" ou ")}` : "toutes ses dispositions sont déjà prises : prends une autre pièce pour ce moment"})`; }).join(" ; ")} ; une pièce reprise prend toujours une autre disposition`);
  }
  return out;
}

/**
 * Dernier recours, sans IA : une pièce posée avec une disposition déjà prise par un autre site reçoit la disposition la
 * moins prise (une libre d'abord). Les pages `garder` (un concept déjà montré au client) ne bougent pas.
 */
export function fitVarieteSites<D extends { pages: { key: string; sections: { section: string; construction?: string | null }[] }[] }>(d: D, sites: SiteVu[], o: { resolve: (id: string, c: string | null | undefined) => string | null; /** Identifiant de bibliothèque d'une pièce nommée par le concepteur. */ id?: (section: string) => string; garder?: string[] }): { d: D; changed: string[] } {
  const prises = dispositionsPrises(sites);
  if (!prises.size) return { d, changed: [] };
  const out: D = JSON.parse(JSON.stringify(d));
  const changed: string[] = [];
  for (const pg of out.pages) {
    if (o.garder?.includes(pg.key)) continue;
    for (const [i, s] of pg.sections.entries()) {
      if (pg.key === "home" && i === 0) continue; // l'ouverture suit sa famille
      const id = o.id ? o.id(s.section) : s.section;
      const now = o.resolve(s.section, s.construction);
      if (!now || !prises.has(`${id}:${now}`) || !plusieurs(id)) continue;
      const best = constructionsOf(id).map((c) => c.key).filter((k) => k !== now).sort((a, b) => (prises.get(`${id}:${a}`) ?? 0) - (prises.get(`${id}:${b}`) ?? 0))[0];
      if (!best || (prises.get(`${id}:${best}`) ?? 0) >= (prises.get(`${id}:${now}`) ?? 0)) continue;
      changed.push(`${pg.key} › ${id} : ${now} → ${best}`);
      s.construction = best;
    }
  }
  return { d: out, changed };
}

/** Ce que le concepteur reçoit : les derniers sites montés pour d'autres marques, et la règle. */
export function varieteSitesBrief(sites: SiteVu[]): string {
  const vus = sites.slice(0, SITES_MONTRES);
  if (!vus.length) return "";
  const ligne = (s: SiteVu, i: number) => {
    const home = (s.pages.home ?? []).join(", ");
    const autres = [...new Set(Object.entries(s.pages).filter(([k]) => k !== "home").flatMap(([, v]) => v))].join(", ");
    return `- site ${i + 1}${s.metier ? ` (${s.metier})` : ""} · accueil : ${home || "—"} · autres pages : ${autres || "—"}`;
  };
  return [
    `SITES DÉJÀ MONTÉS PAR LE STUDIO POUR D'AUTRES MARQUES (pièce:disposition). Règle du propriétaire, contrôlée par le Studio : chaque client a un site qui ne ressemble pas aux autres. Avec CHACUN de ces sites : l'accueil a au plus ${ACCUEIL_COMMUNES_MAX} pièces en commun ; le site entier (hors mentions légales, page introuvable, panier, compte) au plus un quart ; une pièce reprise prend TOUJOURS une autre disposition que la sienne. La bibliothèque a plusieurs pièces pour chaque moment : cherche celle qui sert CETTE marque au lieu de la pièce habituelle.`,
    ...vus.map(ligne),
  ].join("\n");
}
