/**
 * Le contrôle par l'image, branché dans la création du site (point 5 validé par le propriétaire le 17 novembre 2026) :
 * après le montage, avant que le client voie son site, le Studio capture l'accueil (téléphone et ordinateur), en fait
 * l'empreinte (ressemblance.ts) et la compare aux empreintes des sites comparés par la règle de variété (les 12 derniers
 * montés, tous métiers, et les 30 derniers du même métier). Gratuit, sans IA.
 *
 * Trop proche d'un site : le Studio corrige lui-même, sans IA, et recapture après chaque essai :
 *  1) chaque section jumelle à l'œil d'une section de ce site prend une autre disposition (la moins prise par les
 *     sites récents), sinon un autre fond ou un autre alignement de titre permis par la signature de sa famille ;
 *  2) puis l'ouverture prend une autre façon permise par sa famille ;
 *  3) puis un réglage de la tenue permis par la famille (boutons, cadre des photos, fond, titres, petits textes) ;
 *  4) puis les autres sections de l'accueil, du haut vers le bas.
 * Chaque changement n'est gardé que s'il ne casse rien : aucun défaut bloquant du thème en plus, la variété entre les
 * sites tenue (règle des pièces et des dispositions, rotation de l'ouverture, combinaison de dispositions), l'allure
 * dans les choix de la famille, la signature de la famille (ses fonds), aucune photo d'exemple qui réapparaîtrait ; et seulement s'il rend l'accueil moins
 * proche du site le plus proche.
 *
 * Aucune porte de sortie (« elle doit y arriver ») : si rien ne suffit, le site n'est pas présenté comme fini (il ne
 * devient pas la version active du moteur des thèmes) et c'est écrit en tête du compte rendu, à dire au client. Sans
 * navigateur de captures sur le serveur, le contrôle n'est pas fait et c'est écrit de même : jamais en silence.
 */
import fs from "node:fs";
import path from "node:path";
import { all } from "../../db";
import { loadProject, remember } from "../../projects";
import { chromiumPath } from "../../theme/snapshot";
import { familleGaps, familleOf, choixDeLaFamille } from "./familles";
import { LIBRARY_DIR } from "./library";
import { varieteGaps, type SiteMonte } from "./ordre";
import { pageKind } from "./partitions";
import { empreinteDe, ressemblance, SEUIL, VUES, type Empreinte, type VueId } from "./ressemblance";
import { renderCustomTheme } from "./render";
import { shootAccueil } from "./shots";
import { ALIGNEMENTS, FONDS, reglagesPermis, signatureGaps } from "./signatures";
import { constructionsOf, TENUE_FILES, validConstruction, type Tenue } from "./tenue";
import { checkCustomTheme, loadCustomTheme, saveCustomTheme, THEME_KEY, type CustomTheme, type SiteKind } from "./theme";
import { dispositionsPrises, METIER_COMPARES, SITES_COMPARES, sorte, varieteSitesGaps, type SiteVu } from "./variete-sites";

/** L'empreinte gardée avec le site monté (mémoire du projet) : la version du thème et de la bibliothèque qu'elle montre. */
export const EMPREINTE_KEY = "syna.site_empreinte";
type Gardee = Empreinte & { rev: number; lib: string };
/** Nombre d'essais de correction, et de captures de l'accueil au plus (téléphone et ordinateur : environ 8 secondes chacune). */
export const ESSAIS_MAX = 12;
export const CAPTURES_MAX = 20;

export type ControleImage = {
  /** passe : aucun site trop proche ; corrige : trop proche, corrigé sans IA ; trop-proche : la correction n'a pas suffi ; non-fait : pas de capture possible. */
  statut: "passe" | "corrige" | "trop-proche" | "non-fait";
  /** La note du site le plus proche (0 à 100), avant et après la correction. */
  avant: number | null;
  note: number | null;
  seuil: number;
  /** Sites comparés, et sites que le Studio n'a pas pu capturer (dits, jamais oubliés). */
  compares: number;
  nonCompares: number;
  changements: string[];
  raison?: string;
};

/** Remplaçable par les tests : la capture d'un thème en empreinte (null : pas de navigateur). */
export const controleDeps: { capture?: (projectId: string, t: CustomTheme) => Promise<Empreinte | null> } = {};

/** Version de la bibliothèque (feuilles et scripts) : une empreinte faite avant un changement d'allure est refaite. */
function libVersion(): string {
  return ["library.css", "library.js", ...TENUE_FILES.css, ...TENUE_FILES.js].map((f) => { try { return Math.round(fs.statSync(path.join(LIBRARY_DIR(), f)).mtimeMs).toString(36); } catch { return "0"; } }).join("");
}

/** Capture l'accueil d'un thème (téléphone puis ordinateur) et en fait l'empreinte. Sans navigateur : null. */
export async function capturerAccueil(projectId: string, t: CustomTheme): Promise<Empreinte | null> {
  if (controleDeps.capture) return controleDeps.capture(projectId, t);
  if (!chromiumPath()) return null;
  const html = renderCustomTheme(loadProject(projectId), t, { embed: true });
  const out: Empreinte = { v: 1, at: Date.now(), telephone: null, ordinateur: null };
  for (const vue of ["telephone", "ordinateur"] as VueId[]) {
    const r = await shootAccueil(html, vue === "telephone" ? "téléphone" : "ordinateur", VUES[vue].max);
    if (!r) return null;
    out[vue] = await empreinteDe(r.image, vue, r.sections, r.masses);
  }
  return out;
}

function lireEmpreinte(projectId: string): Gardee | null {
  const row = all<{ value: string }>("SELECT value FROM memory WHERE project_id=? AND kind='artifact' AND key=? AND state='active' LIMIT 1", projectId, EMPREINTE_KEY)[0];
  try { return row ? (JSON.parse(row.value) as Gardee) : null; } catch { return null; }
}
function garderEmpreinte(projectId: string, e: Empreinte, rev: number) {
  remember(projectId, { kind: "artifact", key: EMPREINTE_KEY, value: JSON.stringify({ ...e, rev, lib: libVersion() }), source: "local", origin: "system" });
}
/** L'empreinte d'un site monté : celle gardée si elle montre encore ce site, sinon capturée et gardée. */
async function empreinteDuSite(projectId: string, t: CustomTheme): Promise<Empreinte | null> {
  const g = lireEmpreinte(projectId);
  if (g && g.rev === t.rev && g.lib === libVersion()) return g;
  const e = await capturerAccueil(projectId, t).catch(() => null);
  if (e) garderEmpreinte(projectId, e, t.rev);
  return e;
}

/**
 * Les sites comparés : les mêmes que la règle de variété entre sites (tools.ts, sitesVus) : les 12 derniers montés pour
 * d'autres projets, tous métiers, puis les plus anciens du même métier jusqu'à 30.
 */
export function sitesCompares(projectId: string, metier: string | null | undefined): { projectId: string; t: CustomTheme }[] {
  const rows = all<{ project_id: string; value: string }>("SELECT project_id, value FROM memory WHERE kind='artifact' AND key=? AND state='active' AND project_id<>? ORDER BY rowid DESC LIMIT 400", THEME_KEY, projectId);
  const out: { projectId: string; t: CustomTheme }[] = [];
  let recents = 0, memes = 0;
  for (const r of rows) {
    try {
      const t = JSON.parse(r.value) as CustomTheme;
      if (!t.pages?.length) continue;
      const meme = !!metier && t.metier === metier;
      if (recents < SITES_COMPARES) { recents++; if (meme) memes++; out.push({ projectId: r.project_id, t }); }
      else if (meme && memes < METIER_COMPARES) { memes++; out.push({ projectId: r.project_id, t }); }
    } catch { /* thème illisible : ignoré */ }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────── les contrôles existants, rejoués sur le site monté

const utile = (key: string) => { const k = pageKind(key, "products") ?? pageKind(key, "services"); return !!k && k !== "utilitaire"; };
const built = (id: string, c?: string | null) => (c ? `${id}:${c}` : id);
/** Un site monté vu par la règle de variété entre sites. */
export function siteVuDuTheme(t: CustomTheme): SiteVu {
  return { pages: Object.fromEntries(t.pages.map((pg) => [pg.key, pg.sections.map((x) => `${x.id}:${validConstruction(x.id, x.construction) ?? ""}`)])), utiles: t.pages.filter((pg) => utile(pg.key)).map((pg) => pg.key), metier: t.metier ?? null };
}
/** Un site monté vu par le contrôle de la famille (forme d'une conception). */
const vuParFamille = (t: CustomTheme) => ({
  famille: t.famille ?? null, tenue: t.tenue as Tenue, header: t.header?.id ?? "", headerConstruction: t.header?.construction ?? null, footer: t.footer?.id ?? "", footerConstruction: t.footer?.construction ?? null,
  pages: t.pages.map((pg) => ({ key: pg.key, sections: pg.sections.map((s) => ({ section: s.id, construction: s.construction ?? null })) })),
});
/** Un site monté vu par la règle « l'ouverture tourne » et « jamais la même combinaison de dispositions ». */
const vuParVariete = (t: CustomTheme) => {
  const home = t.pages.find((pg) => pg.key === "home")?.sections ?? [];
  return { famille: t.famille ?? null, partitions: {}, header: t.header ? built(t.header.id, validConstruction(t.header.id, t.header.construction)) : "", footer: t.footer ? built(t.footer.id, validConstruction(t.footer.id, t.footer.construction)) : "",
    opening: home[0] ? built(home[0].id, validConstruction(home[0].id, home[0].construction)) : "",
    pages: Object.fromEntries(t.pages.filter((pg) => utile(pg.key)).map((pg) => [pg.key, pg.sections.map((x) => built(x.id, validConstruction(x.id, x.construction)))])) };
};
/** Une photo d'exemple de la bibliothèque encore dans le HTML d'une section (une autre disposition pourrait la montrer). */
const photoExemple = (html?: string) => !!html && /(?:^|["'(\s])(?:\.\/)?photos\/[\w-]+\.(?:webp|png|jpe?g)/.test(html);

type Contexte = { site: SiteKind; vus: SiteVu[]; monte: SiteMonte[]; families: number };
/** Le nombre d'écarts que les contrôles du Studio trouvent sur un site monté (aucun ne doit apparaître en corrigeant). */
function ecarts(t: CustomTheme, c: Contexte): number[] {
  const choix = choixDeLaFamille(t.famille, { business: c.site.business, families: c.families });
  const wide = (list: string[]) => list.flatMap((r) => (r.includes(":") || !constructionsOf(r).length ? [r] : constructionsOf(r).map((x) => `${r}:${x.key}`)));
  return [
    checkCustomTheme(t, c.site).filter((x) => x.level === "bloquant").length,
    varieteSitesGaps(siteVuDuTheme(t), c.vus).length,
    t.famille ? familleGaps(vuParFamille(t) as never, { business: c.site.business, families: c.families }).length : 0,
    varieteGaps(vuParVariete(t), c.monte, t.metier ?? null, { kinds: {}, plusieurs: () => false, ...(choix ? { choix: { entete: wide(choix.entete), pied: wide(choix.pied), ouvertures: wide(choix.ouvertures) } } : {}) }).length,
    signatureGaps({ famille: t.famille ?? null, pages: t.pages.map((pg) => ({ key: pg.key, label: pg.label, sections: pg.sections.map((s) => ({ section: s.id, construction: s.construction ?? null, reglages: s.reglages ?? null })) })) }).length,
  ];
}

// ─────────────────────────────────────────────────────────────── les retouches sans IA

type Retouche = { cle: string; dit: string; faire: (t: CustomTheme) => boolean };
const accueil = (t: CustomTheme) => t.pages.find((pg) => pg.key === "home") ?? null;

/** Une autre disposition pour une section de l'accueil, de la moins prise par les sites récents à la plus prise. */
function dispositions(t: CustomTheme, uid: string, vus: SiteVu[]): Retouche[] {
  const home = accueil(t), i = home?.sections.findIndex((s) => s.uid === uid) ?? -1;
  if (!home || i <= 0) return []; // l'ouverture suit sa famille : elle a sa propre retouche
  const s = home.sections[i];
  const list = constructionsOf(s.id).map((c) => c.key), now = validConstruction(s.id, s.construction);
  if (list.length < 2 || photoExemple(s.html)) return [];
  const prises = dispositionsPrises({ metier: t.metier }, vus);
  const n = (k: string) => prises.get(`${sorte("home")}|${s.id}:${k}`) ?? 0;
  return list.filter((k) => k !== now).sort((a, b) => n(a) - n(b)).map((k) => ({
    cle: `dispo:${uid}:${k}`, dit: `${s.id} : disposition ${now} → ${k}`,
    faire: (x) => { const y = accueil(x)?.sections.find((z) => z.uid === uid); if (!y) return false; y.construction = k; return true; },
  }));
}
/**
 * Un autre réglage pour une section de l'accueil (signatures.ts) : un autre fond, puis l'autre alignement du titre,
 * seulement quand la pièce les accepte ; la signature de la famille est vérifiée avec les autres contrôles.
 */
function reglages(t: CustomTheme, uid: string): Retouche[] {
  const s = accueil(t)?.sections.find((x) => x.uid === uid);
  if (!s) return [];
  const ok = reglagesPermis(s.id, s.construction), now = s.reglages ?? {};
  const out: Retouche[] = [];
  const pose = (k: "fond" | "alignement", v: string) => (x: CustomTheme) => { const y = accueil(x)?.sections.find((z) => z.uid === uid); if (!y) return false; y.reglages = { ...(y.reglages ?? {}), [k]: v }; return true; };
  if (ok.fond) for (const f of FONDS) if (f !== (now.fond ?? "clair")) out.push({ cle: `fond:${uid}:${f}`, dit: `${s.id} : fond ${now.fond ?? "clair"} → ${f}`, faire: pose("fond", f) });
  if (ok.alignement) for (const a of ALIGNEMENTS) if (a !== now.alignement) out.push({ cle: `aligne:${uid}:${a}`, dit: `${s.id} : titre ${a === "centre" ? "centré" : "à gauche"}`, faire: pose("alignement", a) });
  return out;
}
/** Les retouches d'une section de l'accueil : ses dispositions d'abord, puis ses réglages. */
const retouches = (t: CustomTheme, uid: string, vus: SiteVu[]) => [...dispositions(t, uid, vus), ...reglages(t, uid)];
/** Une autre façon d'ouvrir l'accueil, parmi celles que la famille permet pour la même pièce (le texte écrit reste juste). */
function ouvertures(t: CustomTheme, site: SiteKind, families: number): Retouche[] {
  const first = accueil(t)?.sections[0];
  const choix = choixDeLaFamille(t.famille, { business: site.business, families });
  if (!first || !choix || photoExemple(first.html)) return [];
  const now = validConstruction(first.id, first.construction);
  return choix.ouvertures.filter((o) => o.startsWith(`${first.id}:`)).map((o) => o.split(":")[1]).filter((k) => k !== now && constructionsOf(first.id).some((c) => c.key === k)).map((k) => ({
    cle: `ouverture:${k}`, dit: `ouverture : ${now} → ${k}`,
    faire: (x) => { const y = accueil(x)?.sections[0]; if (!y) return false; y.construction = k; return true; },
  }));
}
/** Un réglage de l'allure (tenue) que la famille du site permet. */
function tenues(t: CustomTheme): Retouche[] {
  const f = familleOf(t.famille);
  if (!f || !t.tenue) return [];
  const out: Retouche[] = [];
  for (const k of ["bouton", "fond", "titres", "cadre", "petits"] as const) {
    for (const v of f.tenue[k] as string[]) if (v !== t.tenue[k]) out.push({ cle: `tenue:${k}:${v}`, dit: `allure : ${k} ${t.tenue[k]} → ${v}`, faire: (x) => { if (!x.tenue) return false; (x.tenue as Record<string, unknown>)[k] = v; return true; } });
  }
  return out;
}

const copie = (t: CustomTheme): CustomTheme => JSON.parse(JSON.stringify(t));
const pire = (mine: Empreinte, autres: { projectId: string; e: Empreinte }[]) => {
  let best: { projectId: string; note: number; paires: string[] } | null = null;
  for (const o of autres) {
    const r = ressemblance(mine, o.e);
    if (!best || r.note > best.note) best = { projectId: o.projectId, note: r.note, paires: Object.values(r.vues).flatMap((v) => v!.paires.map((p) => p.a)) };
  }
  return best;
};

/**
 * Le contrôle par l'image du site monté d'un projet, avec sa correction sans IA. Le site corrigé est enregistré (sans
 * point d'annulation de plus : c'est la fin du montage) et son empreinte gardée pour les sites suivants.
 */
export async function controleParImage(projectId: string, site: SiteKind, o: { families?: number; progress?: (texte: string) => void } = {}): Promise<ControleImage> {
  const base: ControleImage = { statut: "non-fait", avant: null, note: null, seuil: SEUIL, compares: 0, nonCompares: 0, changements: [] };
  const t0 = loadCustomTheme(projectId);
  if (!t0) return { ...base, raison: "aucun site monté à contrôler" };
  if (!controleDeps.capture && !chromiumPath()) return { ...base, raison: "le navigateur de captures n'est pas installé sur le serveur : l'accueil n'a pas pu être comparé en image aux autres sites du Studio" };
  let mine = await capturerAccueil(projectId, t0).catch(() => null);
  if (!mine) return { ...base, raison: "la capture de l'accueil a échoué : il n'a pas pu être comparé en image aux autres sites du Studio" };
  const liste = sitesCompares(projectId, t0.metier);
  const autres: { projectId: string; e: Empreinte }[] = [];
  let nonCompares = 0;
  for (const s of liste) { const e = await empreinteDuSite(s.projectId, s.t); if (e) autres.push({ projectId: s.projectId, e }); else nonCompares++; }
  const fin = (r: Omit<ControleImage, "seuil" | "compares" | "nonCompares">): ControleImage => ({ ...r, seuil: SEUIL, compares: autres.length, nonCompares, ...(nonCompares && !r.raison ? { raison: `${nonCompares} site(s) du Studio n'ont pas pu être capturés pour la comparaison` } : {}) });
  let p = pire(mine, autres);
  const avant = p?.note ?? null;
  if (!p || p.note < SEUIL) { garderEmpreinte(projectId, mine, t0.rev); return fin({ statut: "passe", avant, note: avant, changements: [] }); }

  // ── la correction sans IA
  o.progress?.("ton site ressemble trop à un autre site du Studio : je le rends différent");
  const ctx: Contexte = { site, vus: liste.map((x) => siteVuDuTheme(x.t)), monte: liste.map((x) => siteMonte(x.t)), families: o.families ?? 0 };
  const depart = ecarts(t0, ctx);
  const accepte = (t: CustomTheme) => ecarts(t, ctx).every((n, i) => n <= depart[i]);
  let t = copie(t0);
  const essayes = new Set<string>(), changements: string[] = [];
  let captures = 0;
  for (let essai = 0; essai < ESSAIS_MAX && p.note >= SEUIL && captures < CAPTURES_MAX; essai++) {
    const jumelles = [...new Set(p.paires)];
    // Les retouches de cet essai : une par section jumelle ; sinon l'ouverture ; sinon l'allure ; sinon les autres sections.
    const lots: Retouche[][] = [
      jumelles.map((uid) => retouches(t, uid, ctx.vus).find((r) => !essayes.has(r.cle))).filter((r): r is Retouche => !!r),
      ouvertures(t, site, ctx.families).filter((r) => !essayes.has(r.cle)).slice(0, 1),
      tenues(t).filter((r) => !essayes.has(r.cle)).slice(0, 1),
      (accueil(t)?.sections ?? []).slice(1).map((s) => retouches(t, s.uid, ctx.vus).find((r) => !essayes.has(r.cle))).filter((r): r is Retouche => !!r).slice(0, 3),
    ];
    let fait = false;
    for (const lot of lots) {
      if (!lot.length) continue;
      const next = copie(t), dits: string[] = [];
      for (const r of lot) {
        essayes.add(r.cle);
        const essaiT = copie(next);
        if (!r.faire(essaiT) || !accepte(essaiT)) continue;
        r.faire(next); dits.push(r.dit);
      }
      if (!dits.length) continue;
      if (captures++ >= CAPTURES_MAX) break;
      const e = await capturerAccueil(projectId, next).catch(() => null);
      if (!e) break;
      const q = pire(e, autres)!;
      if (q.note < p.note) { t = next; mine = e; p = q; changements.push(...dits); fait = true; break; }
    }
    if (!fait && lotsVides(t, site, ctx, essayes)) break;
  }
  const corrige = changements.length > 0;
  const saved = corrige ? saveCustomTheme(projectId, t, { history: false }) : t0;
  garderEmpreinte(projectId, mine, saved.rev);
  if (p.note < SEUIL) return fin({ statut: "corrige", avant, note: p.note, changements });
  return fin({ statut: "trop-proche", avant, note: p.note, changements, raison: `l'accueil ressemble encore trop à un site déjà monté par le Studio pour une autre marque (note ${p.note} sur 100, seuil ${SEUIL}), même après ${changements.length} retouche(s) sans IA` });
}

/** Plus aucune retouche à essayer ? */
function lotsVides(t: CustomTheme, site: SiteKind, ctx: Contexte, essayes: Set<string>): boolean {
  const restent = [
    ...(accueil(t)?.sections ?? []).flatMap((s) => retouches(t, s.uid, ctx.vus)),
    ...ouvertures(t, site, ctx.families), ...tenues(t),
  ];
  return restent.every((r) => essayes.has(r.cle));
}

/** Ce que la règle « l'ouverture tourne » et « jamais la même combinaison » garde d'un site déjà monté. */
function siteMonte(t: CustomTheme): SiteMonte {
  const v = vuParVariete(t);
  return { metier: t.metier ?? null, partitions: t.partitions ?? {}, header: v.header, footer: v.footer, opening: v.opening, pages: v.pages };
}

/** Une ligne simple pour le compte rendu de la création (SINA la relit ; le client n'entend jamais le mot « empreinte »). */
export function ligneControle(c: ControleImage): string {
  const proche = c.note != null ? ` (ressemblance ${c.note} sur 100 avec le site le plus proche ; trop proche à partir de ${c.seuil})` : "";
  if (c.statut === "passe") return c.compares ? `comparé en image à ${c.compares} site(s) du Studio : différent${proche}` : "premier site du Studio : rien à comparer en image";
  if (c.statut === "corrige") return `comparé en image à ${c.compares} site(s) du Studio : il ressemblait trop à l'un d'eux (${c.avant} sur 100), corrigé sans IA (${c.changements.join(" ; ")})${proche}`;
  if (c.statut === "trop-proche") return `comparé en image : il ressemble encore trop à un site déjà fait par le Studio${proche}`;
  return `pas comparé en image aux autres sites du Studio : ${c.raison ?? "raison inconnue"}`;
}
