/**
 * Tour des sections : le tour lui-même. Pour chaque pièce à tenue, chaque construction, chaque état de contenu, chaque
 * tenue et chaque largeur d'écran : la page est rendue comme le Studio la rend, mesurée par les détecteurs, capturée,
 * puis rangée en planches. Voir LISEZMOI.md pour les commandes.
 *
 * `process.env.DATA_DIR` doit pointer vers un dossier jetable AVANT l'import de ce fichier (tour.ts s'en charge).
 */
import fs from "node:fs";
import path from "node:path";
import { TENUE_SECTIONS, tenueSection, exampleProductNames } from "../../src/lib/syna-agent/custom-theme/tenue";
import { ETATS, HAUTEUR, LARGEURS, MARQUE, TENUES, type Etat, type TenueBanc } from "./donnees";
import { MODULES, moduleDe, recenser, totaux, type Module } from "./recensement";
import * as R from "./rendu";
import { mesurer, onglet, ouvrir, ouvrirNavigateur, servir, type Defaut } from "./banc";
import { assembler, type Ligne } from "./planches";

export type Options = {
  sortie: string; modules?: string[]; pieces?: string[]; etats?: Etat[]; tenues?: string[]; largeurs?: number[];
  /** Captures et planches (sinon : seulement les détecteurs). */
  planches?: boolean;
  /** Les pages en situation : « oui » (avec le reste), « non », « seules ». */
  situations?: "oui" | "non" | "seules";
  parallele?: number; dire?: (s: string) => void;
};
export type Enregistrement = Defaut & { module: string; piece: string; section: string; construction: string; etat: Etat; tenue: string; largeur: number; variante: "base" | "ouvert"; numero: number; capture: string | null };
export type Rendu = { piece: string; module: string; construction: string; etat: Etat; tenue: string; largeur: number; variante: "base" | "ouvert"; hauteur: number; coupee: boolean; capture: string | null; ouverts: string[]; defauts: number };
export type NonRendue = { piece: string; module: string; construction: string; etat: Etat; pourquoi: string };
type FichePiece = { piece: string; module: string; titre: string; rendus: Rendu[]; nonRendues: NonRendue[]; defauts: Enregistrement[] };

export const SITUATION = "situation";
const nomSur = (s: string) => s.replace(/[^a-z0-9-]+/gi, "_") || "seule";

/** Une file de travaux menée par `n` ouvriers à la fois. */
async function file<T>(travaux: T[], n: number, faire: (t: T, ouvrier: number) => Promise<void>): Promise<void> {
  let i = 0;
  await Promise.all(Array.from({ length: Math.max(1, n) }, async (_x, ouvrier) => { while (i < travaux.length) { const t = travaux[i++]; await faire(t, ouvrier); } }));
}

export async function tourner(o: Options) {
  const dire = o.dire ?? (() => {}), t0 = Date.now();
  const sortie = path.resolve(o.sortie);
  fs.mkdirSync(path.join(sortie, "defauts"), { recursive: true });
  const etats = o.etats?.length ? o.etats : [...ETATS], tenues = TENUES.filter((t) => !o.tenues?.length || o.tenues.includes(t.cle)), largeurs = o.largeurs?.length ? o.largeurs : LARGEURS;
  const avecPlanches = o.planches !== false, situations = o.situations ?? (o.modules?.length || o.pieces?.length ? "non" : "oui");

  // ── le recensement
  const pieces = recenser(), tot = totaux(pieces);
  fs.writeFileSync(path.join(sortie, "recensement.json"), JSON.stringify({ totaux: tot, pieces }, null, 2));
  const voulues = situations === "seules" ? [] : pieces.filter((p) => (!o.modules?.length || o.modules.includes(p.module)) && (!o.pieces?.length || o.pieces.includes(p.id)));
  if (o.pieces?.length) for (const id of o.pieces) if (!tenueSection(id) && !R.SITUATIONS.some((s) => s.cle === id)) throw new Error(`Pièce inconnue : ${id}`);
  if (o.modules?.length) for (const m of o.modules) if (!(MODULES as readonly string[]).includes(m) && m !== SITUATION) throw new Error(`Module inconnu : ${m} (modules : ${MODULES.join(", ")}, ${SITUATION})`);

  // ── la base d'essai, et la preuve que le banc rend comme le Studio
  const banc = await R.monter();
  const ecarts = R.memeQueLeStudio(banc);
  if (ecarts.length) throw new Error(`Le banc ne rend plus comme le Studio (render.ts a changé : reporter le changement dans scripts/tour-des-sections/rendu.ts) :\n${ecarts.join("\n")}`);
  const exemples = ["Brindi", ...exampleProductNames()].filter((x) => x.length >= 5);

  // ── les travaux : une page par pièce × construction × état × tenue, vue à chaque largeur
  type Travail = { piece: string; module: string; titre: string; suite: R.Cas[]; construction: string; etat: Etat; tenue: TenueBanc; largeur: number; html: string };
  const travaux: Travail[] = [], fiches = new Map<string, FichePiece>();
  const fiche = (piece: string, module: string, titre: string) => { let f = fiches.get(piece); if (!f) { f = { piece, module, titre, rendus: [], nonRendues: [], defauts: [] }; fiches.set(piece, f); } return f; };
  for (const p of voulues) {
    const s = tenueSection(p.id)!, f = fiche(p.id, p.module, p.titre);
    for (const c of R.constructionsDe(s)) for (const etat of etats) {
      if (etat === "seul" && !R.aUneListe(s)) continue;
      for (const tenue of tenues) {
        const x = R.page(banc, [{ piece: p.id, construction: c }], etat, tenue);
        if (!x.rendues.length) { if (tenue === tenues[0]) f.nonRendues.push({ piece: p.id, module: p.module, construction: c, etat, pourquoi: "le Studio ne rend rien pour cette pièce avec ces données (pièce sans sa vraie donnée, ou retirée faute de photo)" }); continue; }
        for (const largeur of largeurs) travaux.push({ piece: p.id, module: p.module, titre: p.titre, suite: [{ piece: p.id, construction: c }], construction: c, etat, tenue, largeur, html: x.html });
      }
    }
  }
  for (const sit of R.SITUATIONS) {
    // Une page en situation : avec tout le tour, à la demande (« --situations », module « situation »), ou nommée par sa clé.
    if (!(situations === "seules" || o.pieces?.includes(sit.cle) || o.modules?.includes(SITUATION) || (situations === "oui" && !o.pieces?.length && !o.modules?.length))) continue;
    const suite = R.suiteValable(sit.suite);
    fiche(sit.cle, SITUATION, sit.titre);
    for (const etat of etats.filter((e) => e === "vrai" || e === "difficile")) for (const tenue of tenues) { const x = R.page(banc, suite, etat, tenue); for (const largeur of largeurs) travaux.push({ piece: sit.cle, module: SITUATION, titre: sit.titre, suite, construction: "", etat, tenue, largeur, html: x.html }); }
  }
  dire(`${voulues.length} pièce(s)${[...fiches.values()].some((f) => f.module === SITUATION) ? ` et ${[...fiches.values()].filter((f) => f.module === SITUATION).length} page(s) en situation` : ""} : ${travaux.length} rendus (${etats.join(", ")} × ${tenues.map((t) => t.cle).join(", ")} × ${largeurs.join(", ")} px)${avecPlanches ? "" : ", détecteurs seuls"}`);

  // ── le navigateur
  const browser = await ouvrirNavigateur(), service = await servir(R.fichier);
  const n = o.parallele ?? 4;
  let faits = 0;
  try {
    const onglets = await Promise.all(Array.from({ length: n }, () => onglet(browser, service)));
    await file(travaux, n, async (t, ouvrier) => {
      const og = onglets[ouvrier], f = fiches.get(t.piece)!;
      const dossier = path.join(sortie, "captures", t.module, nomSur(t.piece.replace(/^tn-/, "")));
      const garder = async (variante: "base" | "ouvert", ouverts: string[]) => {
        const m = await mesurer(og.page, { monte: t.etat !== "exemple", titreLourd: t.tenue.titreLourd, exemples }, { capture: avecPlanches });
        let capture: string | null = null;
        if (m.capture) { fs.mkdirSync(dossier, { recursive: true }); capture = path.join(dossier, `${nomSur(t.construction)}--${t.etat}--${t.tenue.cle}--${t.largeur}${variante === "ouvert" ? "--ouvert" : ""}.jpg`); fs.writeFileSync(capture, m.capture); }
        const section = (uid: string | null) => { const i = uid && /^t(\d+)$/.exec(uid); return i ? t.suite[+i[1]]?.piece ?? t.piece : t.piece; };
        f.rendus.push({ piece: t.piece, module: t.module, construction: t.construction, etat: t.etat, tenue: t.tenue.cle, largeur: t.largeur, variante, hauteur: m.hauteur, coupee: m.coupee, capture, ouverts, defauts: m.defauts.length });
        m.defauts.forEach((d, i) => f.defauts.push({ ...d, module: t.module, piece: t.piece, section: section(d.uid), construction: t.module === SITUATION ? R.suiteValable(t.suite).find((c) => c.piece === section(d.uid))?.construction ?? "" : t.construction, etat: t.etat, tenue: t.tenue.cle, largeur: t.largeur, variante, numero: i + 1, capture }));
      };
      try {
        await og.montrer(t.html, t.largeur, HAUTEUR(t.largeur));
        await garder("base", []);
        const ouverts = await ouvrir(og.page);
        if (ouverts.length) await garder("ouvert", ouverts);
      } catch (e) {
        f.defauts.push({ type: "rendu-impossible", gravite: "bloquant", uid: null, selecteur: "(page)", texte: "", detail: `le banc n'a pas pu rendre cette page : ${(e as Error).message.split("\n")[0].slice(0, 200)}`, cadre: [0, 0, 0, 0], module: t.module, piece: t.piece, section: t.piece, construction: t.construction, etat: t.etat, tenue: t.tenue.cle, largeur: t.largeur, variante: "base", numero: 1, capture: null });
      }
      if (++faits % 200 === 0) dire(`  ${faits} / ${travaux.length} rendus (${Math.round((Date.now() - t0) / 1000)} s)`);
    });
    await Promise.all(onglets.map((x) => x.context.close()));
  } finally { await browser.close(); await service.fermer(); }
  const tRendus = Date.now();

  // ── une fiche par pièce (un tour partiel ne touche que ses pièces), puis l'ensemble
  for (const f of fiches.values()) {
    const ordre = (x: { construction: string; etat: string; tenue: string; largeur: number; variante?: string }) => `${x.construction}|${ETATS.indexOf(x.etat as Etat)}|${TENUES.findIndex((t) => t.cle === x.tenue)}|${String(x.largeur).padStart(5, "0")}|${x.variante ?? ""}`;
    f.rendus.sort((a, b) => ordre(a).localeCompare(ordre(b))); f.defauts.sort((a, b) => ordre(a).localeCompare(ordre(b)) || a.numero - b.numero);
    const complet = !o.etats?.length && !o.tenues?.length && !o.largeurs?.length;
    const chemin = path.join(sortie, "defauts", `${nomSur(f.piece)}.json`);
    // Un tour restreint (un état, une tenue, une largeur) garde ce que la fiche savait du reste.
    if (!complet && fs.existsSync(chemin)) {
      const avant = JSON.parse(fs.readFileSync(chemin, "utf8")) as FichePiece, refait = (x: { etat: string; tenue: string; largeur?: number }) => etats.includes(x.etat as Etat) && tenues.some((t) => t.cle === x.tenue) && (x.largeur === undefined || largeurs.includes(x.largeur));
      f.rendus.push(...avant.rendus.filter((x) => !refait(x))); f.defauts.push(...avant.defauts.filter((x) => !refait(x))); f.nonRendues.push(...avant.nonRendues.filter((x) => !etats.includes(x.etat)));
    }
    fs.writeFileSync(chemin, JSON.stringify(f, null, 1));
  }

  // ── les planches
  const planches: string[] = [];
  if (avecPlanches) {
    const liste = [...fiches.values()];
    await file(liste, 3, async (f) => {
      const dossier = path.join(sortie, "planches", f.module), base = nomSur(f.piece.replace(/^tn-/, ""));
      fs.mkdirSync(dossier, { recursive: true });
      for (const etat of etats) {
        for (const vieux of fs.readdirSync(dossier).filter((x) => x.startsWith(`${base}--${etat}--`))) fs.rmSync(path.join(dossier, vieux));
        const rendus = f.rendus.filter((r) => r.etat === etat);
        if (!rendus.length) continue;
        const s = tenueSection(f.piece);
        const cles = [...new Set(rendus.map((r) => `${r.construction}|${r.variante}`))];
        const lignes: Ligne[] = cles.map((cle) => {
          const [c, variante] = cle.split("|"), label = s?.constructions.find((k) => k.key === c)?.label;
          const lr = rendus.filter((r) => r.construction === c && r.variante === variante);
          return { libelle: `${c || (f.module === SITUATION ? "la page entière" : "(seule façon)")}${variante === "ouvert" ? ` — ouvert (${[...new Set(lr.flatMap((r) => r.ouverts))].join(", ")})` : ""}${label ? ` : ${label}` : ""}`, cellules: lr.map((r) => ({ tenue: r.tenue, largeur: r.largeur, fichier: r.capture, hauteur: r.hauteur, note: r.coupee ? "capture coupée (page très haute)" : undefined, defauts: f.defauts.filter((d) => d.etat === etat && d.construction !== undefined && d.tenue === r.tenue && d.largeur === r.largeur && d.variante === variante && (f.module === SITUATION || d.construction === c)) })) };
        });
        planches.push(...await assembler({ dossier, nom: `${base}--${etat}`, titre: `${f.titre} (${f.piece}) · ${f.module} · état « ${etat} »`, lignes, tenues: tenues.map((t) => t.cle), largeurs }));
      }
    });
  }

  const ensemble = rassembler(sortie);
  const duree = { total: Math.round((Date.now() - t0) / 1000), rendus: Math.round((tRendus - t0) / 1000), planches: Math.round((Date.now() - tRendus) / 1000) };
  dire(`fini en ${duree.total} s (rendus et détecteurs : ${duree.rendus} s ; planches : ${duree.planches} s) : ${travaux.length} rendus, ${[...fiches.values()].reduce((a, f) => a + f.defauts.length, 0)} défauts mesurés sur ce tour, ${planches.length} planche(s)`);
  return { recensement: tot, fiches: [...fiches.values()], planches, duree, rendus: travaux.length, ensemble };
}

/** Un défaut « distinct » : le même défaut d'une pièce, quelles que soient la tenue, la largeur et l'état où il se voit. */
export const cleDistincte = (d: Enregistrement) => `${d.piece}|${d.section}|${d.construction}|${d.type}|${d.selecteur}`;

/** Relit toutes les fiches du dossier de sortie et écrit `defauts.json`, `resume.json` et `resume.md`. */
export function rassembler(sortie: string) {
  const dir = path.join(sortie, "defauts");
  const fiches = fs.readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) as FichePiece);
  const defauts = fiches.flatMap((f) => f.defauts), nonRendues = fiches.flatMap((f) => f.nonRendues), rendus = fiches.reduce((a, f) => a + f.rendus.length, 0);
  fs.writeFileSync(path.join(sortie, "defauts.json"), JSON.stringify(defauts.map((d) => ({ ...d, capture: d.capture ? path.relative(sortie, d.capture) : null })), null, 1));
  const compter = <T,>(list: T[], cle: (x: T) => string) => { const o: Record<string, number> = {}; for (const x of list) o[cle(x)] = (o[cle(x)] ?? 0) + 1; return Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1])); };
  const distincts = [...new Map(defauts.map((d) => [cleDistincte(d), d])).values()];
  const POIDS = { bloquant: 5, important: 2, mineur: 1 } as const;
  const parPiece = fiches.map((f) => { const d = distincts.filter((x) => x.piece === f.piece); return { piece: f.piece, module: f.module, titre: f.titre, mesures: f.defauts.length, distincts: d.length, bloquants: d.filter((x) => x.gravite === "bloquant").length, importants: d.filter((x) => x.gravite === "important").length, mineurs: d.filter((x) => x.gravite === "mineur").length, poids: d.reduce((a, x) => a + POIDS[x.gravite], 0), types: compter(d, (x) => x.type) }; }).sort((a, b) => b.poids - a.poids);
  const modules = [...MODULES, SITUATION].filter((m) => fiches.some((f) => f.module === m));
  const resume = {
    le: new Date().toISOString(), pieces: fiches.length, rendus, mesures: defauts.length, distincts: distincts.length,
    parGravite: compter(distincts, (d) => d.gravite), parType: compter(distincts, (d) => d.type), parTypeMesures: compter(defauts, (d) => d.type),
    parModule: Object.fromEntries(modules.map((m) => { const d = distincts.filter((x) => x.module === m); return [m, { pieces: fiches.filter((f) => f.module === m).length, mesures: defauts.filter((x) => x.module === m).length, distincts: d.length, bloquants: d.filter((x) => x.gravite === "bloquant").length, importants: d.filter((x) => x.gravite === "important").length, mineurs: d.filter((x) => x.gravite === "mineur").length, types: compter(d, (x) => x.type) }]; })),
    parEtat: compter(defauts, (d) => d.etat), parTenue: compter(defauts, (d) => d.tenue), parLargeur: compter(defauts, (d) => String(d.largeur)),
    pires: parPiece.slice(0, 10), parPiece, nonRendues,
  };
  fs.writeFileSync(path.join(sortie, "resume.json"), JSON.stringify(resume, null, 1));
  const md = [
    `# Tour des sections : résumé`, ``, `Fait le ${resume.le.slice(0, 16).replace("T", " à ")} (temps universel). ${resume.pieces} pièces, ${rendus} rendus.`,
    `**${resume.distincts} défauts distincts** (${resume.mesures} mesures : le même défaut se revoit d'une tenue, d'une largeur et d'un état à l'autre).`,
    `Par gravité : ${Object.entries(resume.parGravite).map(([k, v]) => `${v} ${k}`).join(", ")}.`, ``,
    `## Par module`, ``, `| Module | Pièces | Distincts | Bloquants | Importants | Mineurs | Mesures |`, `|---|---|---|---|---|---|---|`,
    ...Object.entries(resume.parModule).map(([m, x]) => `| ${m} | ${x.pieces} | ${x.distincts} | ${x.bloquants} | ${x.importants} | ${x.mineurs} | ${x.mesures} |`), ``,
    `## Par type de défaut`, ``, `| Type | Distincts | Mesures |`, `|---|---|---|`, ...Object.entries(resume.parType).map(([t, v]) => `| ${t} | ${v} | ${resume.parTypeMesures[t]} |`), ``,
    `## Les dix pires pièces`, ``, `| Pièce | Module | Bloquants | Importants | Mineurs | Surtout |`, `|---|---|---|---|---|---|`,
    ...resume.pires.map((p) => `| ${p.piece} | ${p.module} | ${p.bloquants} | ${p.importants} | ${p.mineurs} | ${Object.entries(p.types).slice(0, 3).map(([t, v]) => `${t} (${v})`).join(", ")} |`), ``,
    `## Pièces que le Studio ne rend pas avec ces données (${nonRendues.length})`, ``, ...[...new Set(nonRendues.map((x) => `- ${x.piece}${x.construction ? ` (${x.construction})` : ""}, état « ${x.etat} »`))], ``,
  ].join("\n");
  fs.writeFileSync(path.join(sortie, "resume.md"), md);
  return { resume, defauts, md };
}

// ══════════════════════════════════════════════════════════ les défauts connus

/** Les défauts bloquants connus, par pièce et par type : le nombre de mesures (construction × état × tenue × largeur). */
export type Connus = Record<string, Record<string, number>>;
export const bloquantsDe = (defauts: Enregistrement[]): Connus => { const o: Connus = {}; for (const d of defauts) if (d.gravite === "bloquant") { (o[d.piece] ??= {})[d.type] = (o[d.piece][d.type] ?? 0) + 1; } return Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)))])); };
/** Ce qui est bloquant et n'est pas dans la liste des défauts connus (un nouveau défaut, ou plus de mesures qu'avant). */
export function nouveaux(defauts: Enregistrement[], connus: Connus, pieces: string[]): string[] {
  const vus = bloquantsDe(defauts), out: string[] = [];
  for (const piece of pieces) for (const [type, n] of Object.entries(vus[piece] ?? {})) {
    const c = connus[piece]?.[type] ?? 0;
    if (n > c) { const ex = defauts.find((d) => d.piece === piece && d.type === type && d.gravite === "bloquant")!; out.push(`${piece} · ${type} : ${n} mesure(s) bloquante(s)${c ? ` (${c} connue(s))` : ""} — par exemple ${ex.construction || "(seule façon)"}, état ${ex.etat}, tenue ${ex.tenue}, ${ex.largeur} px : ${ex.detail} [${ex.selecteur}]`); }
  }
  return out;
}
/** Ce qui était connu et ne se mesure plus (à retirer de connus.json). */
export function repares(defauts: Enregistrement[], connus: Connus, pieces: string[]): string[] {
  const vus = bloquantsDe(defauts), out: string[] = [];
  for (const piece of pieces) for (const [type, c] of Object.entries(connus[piece] ?? {})) { const n = vus[piece]?.[type] ?? 0; if (n < c) out.push(`${piece} · ${type} : ${n} au lieu de ${c}`); }
  return out;
}
export const CONNUS = path.join(path.dirname(new URL(import.meta.url).pathname), "connus.json");
export const lireConnus = (): Connus => { try { return (JSON.parse(fs.readFileSync(CONNUS, "utf8")) as { bloquants: Connus }).bloquants ?? {}; } catch { return {}; } };
export function ecrireConnus(defauts: Enregistrement[], pieces: string[]): Connus {
  const avant = lireConnus(), vus = bloquantsDe(defauts), apres: Connus = { ...avant };
  for (const p of pieces) { if (vus[p]) apres[p] = vus[p]; else delete apres[p]; }
  const tri = Object.fromEntries(Object.entries(apres).sort(([a], [b]) => a.localeCompare(b)));
  fs.writeFileSync(CONNUS, JSON.stringify({ lisezmoi: "Défauts bloquants déjà mesurés par le tour des sections, par pièce et par type : le nombre de mesures (construction × état × tenue × largeur). L'essai tests/tour-des-sections.test.ts échoue dès qu'une pièce en compte plus. Une pièce corrigée : relancer « npx tsx scripts/tour-des-sections/tour.ts --piece <id> --ecrire-connus » pour retirer ses lignes. But : un fichier vide.", bloquants: tri }, null, 1) + "\n");
  return tri;
}
export { MARQUE, moduleDe, TENUE_SECTIONS, type Module };
