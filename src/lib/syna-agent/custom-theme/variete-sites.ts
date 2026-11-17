/**
 * La variété entre les sites du Studio (règle du propriétaire du 17 novembre 2026, devant les deux premiers sites de
 * SINA) : « 4 fois la même section entre les deux alors qu'on a une centaine de sections, et surtout elles ont la même
 * disposition alors qu'il y a 2 ou 3 possibilités de placement » ; « sur les 2 premiers thèmes faits par SINA il y a déjà
 * la moitié des sections qui sont identiques. J'appelle pas ça de la variété moi ».
 *
 * Les anciens contrôles ne voyaient pas cela : l'un ne réagissait qu'à 70 % de sections en commun, l'autre ne comparait
 * qu'avec les sites du même métier. Ici :
 *  - avec chaque site comparé, l'accueil a au plus 2 pièces en commun ;
 *  - le site entier (hors pages pratiques : mentions légales, page introuvable, panier, compte) au plus un quart ;
 *  - sur une même sorte de page (accueil contre accueil, fiche contre fiche…), une pièce reprise ne l'est jamais avec la
 *    même disposition qu'un site récent quand elle en a plusieurs. Page par page, et seulement contre les sites les plus
 *    proches dans le temps ou du même métier : sinon une pièce que les premiers sites ont posée dans toutes ses
 *    dispositions serait interdite pour toujours, et la règle finirait par bloquer.
 * Sites comparés : les 12 derniers montés, tous métiers, et les 30 derniers du même métier, même anciens (deux concurrents
 * ne se ressemblent jamais) ; pour les dispositions, les 4 derniers et les 10 derniers du même métier.
 *
 * Aucune porte de sortie (« elle doit y arriver, on ne laisse pas de porte de sortie sinon elle va la prendre ») : le
 * concepteur reçoit ces sites avant de concevoir ; le contrôle du Studio, sans IA, rend les écarts à sa seule reprise ;
 * puis le Studio corrige sans IA : une disposition prise devient une disposition libre, une pièce de trop est remplacée
 * par une autre qui sert le même moment de la page. Une conception qui ne tient toujours pas la règle est refusée.
 * L'en-tête, le pied de page et l'ouverture de l'accueil suivent leur famille et tournent à part : ils ne sont pas comptés
 * ici, et la correction sans IA n'y touche jamais.
 */
import { constructionsOf } from "./tenue";

export const ACCUEIL_COMMUNES_MAX = 2;
export const SITE_COMMUNES_PART = 0.25;
/** Nombre de derniers sites comparés, tous métiers (les plus récents d'abord). */
export const SITES_COMPARES = 12;
/** Nombre de derniers sites du même métier comparés en plus, même anciens. */
export const METIER_COMPARES = 30;
/** Pour les dispositions : les derniers sites, et les derniers du même métier. */
export const DISPO_RECENTS = 4;
export const DISPO_METIER = 10;
/** Nombre de sites montrés au concepteur, pour garder sa demande courte. */
export const SITES_MONTRES = 8;

/** Un site vu par la règle : chaque page (clé) et ses pièces posées « pièce:disposition », dans l'ordre. */
export type SiteVu = { pages: Record<string, string[]>; /** Les pages qui ne sont pas pratiques (comptées pour le quart). */ utiles: string[]; metier?: string | null };
type Pages = { pages: { key: string; sections: { section: string; construction?: string | null }[] }[] };

const bare = (x: string) => x.split(":")[0];
const plusieurs = (id: string) => constructionsOf(id).length > 1;
/** La sorte d'une page : toutes les fiches produit se comparent entre elles, « shop-sacs » est une page boutique. */
export const sorte = (key: string) => (/^product/.test(key) ? "fiche" : key.split(/[-:]/)[0]);
/** Les pages sans l'ouverture de l'accueil (sa première pièce), qui suit la règle de sa famille. */
const sansOuverture = (pages: Record<string, string[]>): [string, string[]][] => Object.entries(pages).map(([k, v]) => [k, k === "home" ? v.slice(1) : v]);
const piecesDe = (s: SiteVu, keys?: string[]) => new Set(sansOuverture(s.pages).filter(([k]) => !keys || keys.includes(k)).flatMap(([, v]) => v.map(bare)));
const accueil = (s: SiteVu) => new Set((s.pages.home ?? []).slice(1).map(bare));
/** Ce qu'un site pose : « sorte|pièce:disposition » (seulement les pages `keys`, quand elles sont données). */
const posees = (s: SiteVu, keys?: string[]) => new Set(sansOuverture(s.pages).filter(([k]) => !keys || keys.includes(k)).flatMap(([k, v]) => v.filter((x) => !!x.split(":")[1]).map((x) => `${sorte(k)}|${x}`)));
/**
 * Options de la règle. `seule` : une pièce qui n'a aucune autre pièce libre pour son moment (le bloc d'achat d'une
 * fiche, ou une pièce dont la seule autre est déjà posée ailleurs sur le site) : toutes les boutiques la partagent, elle n'est pas comptée parmi les pièces en commun, et seule sa
 * disposition change quand une est libre. Jamais d'impasse.
 */
export type Options = { seule?: (id: string) => boolean };

/** Les sites contre lesquels se comparent les dispositions : les plus récents, et les plus récents du même métier. */
export function sitesPourDispositions(mine: Pick<SiteVu, "metier">, sites: SiteVu[]): SiteVu[] {
  let memes = 0;
  return sites.filter((s, i) => { if (i < DISPO_RECENTS) { if (mine.metier && s.metier === mine.metier) memes++; return true; } if (mine.metier && s.metier === mine.metier && memes < DISPO_METIER) { memes++; return true; } return false; });
}

/** Dispositions déjà prises, page par page : « sorte|pièce:disposition » → nombre de sites. */
export function dispositionsPrises(mine: Pick<SiteVu, "metier">, sites: SiteVu[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const s of sitesPourDispositions(mine, sites)) for (const x of posees(s)) out.set(x, (out.get(x) ?? 0) + 1);
  return out;
}

/** Un écart de cette règle (pour le distinguer des autres écarts d'une conception). */
export const estVariete = (gap: string) => /^(accueil : \d+ pièces en commun|site entier : \d+ pièces sur|dispositions déjà prises par un autre site)/.test(gap);

/** Les pièces posées avec une disposition déjà prise sur cette sorte de page, alors que TOUTES leurs dispositions le sont. */
export function sansDispositionLibre(mine: SiteVu, sites: SiteVu[], o: Options = {}): string[] {
  const prises = dispositionsPrises(mine, sites);
  return [...new Set([...posees(mine, mine.utiles)].filter((x) => { const [s, pc] = x.split("|"); const id = bare(pc); return prises.has(x) && plusieurs(id) && !o.seule?.(id) && constructionsOf(id).every((c) => prises.has(`${s}|${id}:${c.key}`)); }).map((x) => bare(x.split("|")[1])))];
}

/** Les pièces de trop, de la plus urgente à la moins urgente (l'accueil d'abord). */
export function piecesEnTrop(mine: SiteVu, sites: SiteVu[], o: Options = {}): string[] {
  const score = new Map<string, number>();
  for (const x of sansDispositionLibre(mine, sites, o)) score.set(x, 50);
  const garde = (x: string) => !o.seule?.(x);
  const h = new Set([...accueil(mine)].filter(garde)), u = new Set([...piecesDe(mine, mine.utiles)].filter(garde)), max = Math.floor(u.size * SITE_COMMUNES_PART);
  for (const s of sites) {
    const ch = [...h].filter((x) => accueil(s).has(x));
    if (ch.length > ACCUEIL_COMMUNES_MAX) for (const x of ch) score.set(x, (score.get(x) ?? 0) + 100);
    const theirs = piecesDe(s, s.utiles), cu = [...u].filter((x) => theirs.has(x));
    if (cu.length > max) for (const x of cu) score.set(x, (score.get(x) ?? 0) + 1);
  }
  return [...score].sort((a, b) => b[1] - a[1]).map(([x]) => x);
}

/** Les écarts à la règle, pour la seule reprise du concepteur. `sites` : les sites comparés (sitesVus). */
export function varieteSitesGaps(mine: SiteVu, sites: SiteVu[], o: Options = {}): string[] {
  const out: string[] = [];
  if (!sites.length) return out;
  const garde = (x: string) => !o.seule?.(x);
  // ── l'accueil : au plus deux pièces en commun avec chaque site comparé
  const h = new Set([...accueil(mine)].filter(garde));
  let pire: string[] = [];
  for (const s of sites) { const c = [...h].filter((x) => accueil(s).has(x)); if (c.length > pire.length) pire = c; }
  if (pire.length > ACCUEIL_COMMUNES_MAX) out.push(`accueil : ${pire.length} pièces en commun avec l'accueil d'un site déjà monté pour une autre marque (${pire.join(", ")}) ; au plus ${ACCUEIL_COMMUNES_MAX} : remplace-en ${pire.length - ACCUEIL_COMMUNES_MAX} par d'autres pièces de la bibliothèque qui servent le même moment (règle du propriétaire : la variété d'un client à l'autre)`);
  // ── le site entier : au plus un quart de pièces en commun
  const u = new Set([...piecesDe(mine, mine.utiles)].filter(garde));
  if (u.size) {
    let pis: string[] = [];
    for (const s of sites) { const theirs = piecesDe(s, s.utiles); const c = [...u].filter((x) => theirs.has(x)); if (c.length > pis.length) pis = c; }
    const max = Math.floor(u.size * SITE_COMMUNES_PART);
    if (pis.length > max) out.push(`site entier : ${pis.length} pièces sur ${u.size} en commun avec un site déjà monté pour une autre marque (${pis.join(", ")}) ; au plus ${max} (un quart) : remplace-en ${pis.length - max} par d'autres pièces de la bibliothèque qui servent le même moment`);
  }
  // ── sur une même sorte de page (hors pages pratiques), jamais la même disposition d'une pièce qu'un site récent, quand
  //    elle en a plusieurs ; une pièce sans autre pièce pour son moment n'est refusée que si une disposition est libre
  const prises = dispositionsPrises(mine, sites);
  const libresDe = (s: string, id: string) => constructionsOf(id).map((c) => `${id}:${c.key}`).filter((y) => !prises.has(`${s}|${y}`));
  const memes = [...posees(mine, mine.utiles)].filter((x) => { const [s, pc] = x.split("|"), id = bare(pc); return prises.has(x) && plusieurs(id) && (!o.seule?.(id) || libresDe(s, id).length > 0); });
  if (memes.length) {
    const dit = (x: string) => {
      const [s, pc] = x.split("|"), id = bare(pc);
      const l = libresDe(s, id);
      return `${pc} sur la page ${s} (${l.length ? `libres : ${l.join(" ou ")}` : "toutes ses dispositions sont déjà prises sur cette page : prends une autre pièce pour ce moment"})`;
    };
    out.push(`dispositions déjà prises par un autre site du Studio, pour une autre marque : ${memes.map(dit).join(" ; ")} ; une pièce reprise prend toujours une autre disposition`);
  }
  return out;
}

/**
 * Sans IA : une pièce posée avec une disposition déjà prise sur cette sorte de page reçoit la disposition la moins prise
 * (une libre d'abord). Chaque changement n'est gardé que si `accepte` le valide. Les pages `garder` (un concept déjà
 * montré au client) et l'ouverture de l'accueil ne bougent pas.
 */
export function fitVarieteSites<D extends Pages>(d: D, sites: SiteVu[], o: { resolve: (id: string, c: string | null | undefined) => string | null; /** Identifiant de bibliothèque d'une pièce nommée par le concepteur. */ id?: (section: string) => string; garder?: string[]; accepte?: (d: D) => boolean; metier?: string | null }): { d: D; changed: string[] } {
  const prises = dispositionsPrises({ metier: o.metier }, sites);
  if (!prises.size) return { d, changed: [] };
  let out: D = JSON.parse(JSON.stringify(d));
  const changed: string[] = [];
  for (let p = 0; p < out.pages.length; p++) {
    const key = out.pages[p].key, so = sorte(key);
    if (o.garder?.includes(key)) continue;
    for (let i = 0; i < out.pages[p].sections.length; i++) {
      if (key === "home" && i === 0) continue; // l'ouverture suit sa famille
      const s = out.pages[p].sections[i];
      const id = o.id ? o.id(s.section) : s.section;
      const now = o.resolve(s.section, s.construction);
      const n = (k: string) => prises.get(`${so}|${id}:${k}`) ?? 0;
      if (!now || !n(now) || !plusieurs(id)) continue;
      const best = constructionsOf(id).map((c) => c.key).filter((k) => k !== now).sort((a, b) => n(a) - n(b))[0];
      if (!best || n(best) >= n(now)) continue;
      const next: D = JSON.parse(JSON.stringify(out));
      next.pages[p].sections[i].construction = best;
      if (o.accepte && !o.accepte(next)) continue;
      out = next;
      changed.push(`${key} › ${id} : ${now} → ${best}`);
    }
  }
  return { d: out, changed };
}

/**
 * Aucune porte de sortie, sans IA : tant que l'accueil ou le site entier a trop de pièces en commun avec un site comparé,
 * ou qu'une pièce n'a plus de disposition libre sur sa page, la pièce la plus urgente est remplacée, partout où elle est
 * posée, par une autre pièce qui sert le même moment (`candidats`, de la moins prise à la plus prise), avec sa
 * disposition la moins prise. Un remplacement n'est gardé que si `accepte` le valide (aucune règle du thème cassée,
 * aucun autre défaut en plus). L'ouverture de l'accueil et les pages `garder` ne bougent jamais.
 */
export function fitVarietePieces<D extends Pages>(d: D, sites: SiteVu[], o: {
  siteVu: (d: D) => SiteVu; candidats: (d: D, id: string) => string[]; accepte: (d: D) => boolean; id: (section: string) => string; garder?: string[]; tours?: number; metier?: string | null;
}): { d: D; changed: string[] } {
  let cur = d;
  const changed: string[] = [];
  const prises = dispositionsPrises({ metier: o.metier }, sites);
  const usage = new Map<string, number>();
  for (const s of sites) for (const x of piecesDe(s)) usage.set(x, (usage.get(x) ?? 0) + 1);
  for (let tour = 0; tour < (o.tours ?? 60); tour++) {
    const mine = { ...o.siteVu(cur), metier: o.metier };
    const posee = piecesDe(o.siteVu(cur));
    const seule = (id: string) => !o.candidats(cur, id).some((c) => c !== id && !posee.has(c));
    if (!varieteSitesGaps(mine, sites, { seule }).some((g) => /^(accueil|site entier) :/.test(g)) && !sansDispositionLibre(mine, sites, { seule }).length) break;
    const deja = piecesDe(mine);
    let fait = false;
    for (const id of piecesEnTrop(mine, sites, { seule })) {
      const cands = o.candidats(cur, id).filter((c) => c !== id && !deja.has(c)).sort((a, b) => (usage.get(a) ?? 0) - (usage.get(b) ?? 0));
      for (const c of cands) {
        const next: D = JSON.parse(JSON.stringify(cur));
        let n = 0;
        for (const pg of next.pages) {
          if (o.garder?.includes(pg.key)) continue;
          const libre = constructionsOf(c).map((x) => x.key).sort((a, b) => (prises.get(`${sorte(pg.key)}|${c}:${a}`) ?? 0) - (prises.get(`${sorte(pg.key)}|${c}:${b}`) ?? 0))[0] ?? null;
          pg.sections.forEach((s, i) => { if ((pg.key !== "home" || i > 0) && o.id(s.section) === id) { s.section = c; s.construction = libre; n++; } });
        }
        if (n > 0 && o.accepte(next)) { cur = next; changed.push(`${id} → ${c}`); fait = true; break; }
      }
      if (fait) break;
    }
    if (!fait) break;
  }
  return { d: cur, changed };
}

/** Ce que le concepteur reçoit : les derniers sites montés pour d'autres marques, et la règle. */
export function varieteSitesBrief(sites: SiteVu[]): string {
  const vus = sites.slice(0, SITES_MONTRES);
  if (!vus.length) return "";
  const ligne = (s: SiteVu, i: number) => {
    const home = (s.pages.home ?? []).join(", ");
    const autres = Object.entries(s.pages).filter(([k]) => k !== "home").map(([k, v]) => `${sorte(k)} : ${v.join(", ")}`).join(" · ");
    return `- site ${i + 1}${s.metier ? ` (${s.metier})` : ""} · accueil : ${home || "—"}${autres ? ` · ${autres}` : ""}`;
  };
  return [
    `SITES DÉJÀ MONTÉS PAR LE STUDIO POUR D'AUTRES MARQUES (pièce:disposition). Règle du propriétaire, contrôlée par le Studio, sans exception : chaque client a un site qui ne ressemble pas aux autres. Avec CHACUN de ces sites : l'accueil a au plus ${ACCUEIL_COMMUNES_MAX} pièces en commun (l'ouverture n'est pas comptée) ; le site entier (hors mentions légales, page introuvable, panier, compte) au plus un quart ; sur une même sorte de page, une pièce reprise prend TOUJOURS une autre disposition que la sienne. La bibliothèque a plusieurs pièces pour chaque moment : cherche celle qui sert CETTE marque au lieu de la pièce habituelle. Ce que tu laisses, le Studio le remplace lui-même.`,
    ...vus.map(ligne),
  ].join("\n");
}
