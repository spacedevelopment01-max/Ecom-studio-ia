/**
 * SINA (#492), étape 6 : construction d'une page de MAQUETTE EN CODE (code-mockup.ts) pour une direction graphique.
 *
 * Déroulé d'une page : 1) Claude écrit la page en HTML et CSS (ordinateur ET téléphone dans le même fichier), avec les
 * textes écrits par mockup.copy et les photos déjà disponibles ; 2) les photos nouvelles qu'il demande sont créées UNE
 * fois en haute définition (OpenAI, comme les photos du site) et rangées dans les Fichiers : elles servent aux autres
 * maquettes, aux autres pages et au site codé (étape 7), sans être refaites ; 3) captures et contrôle automatique
 * gratuits ; 4) au plus une correction ciblée (remplacements exacts, compris dans le prix annoncé) si le contrôle
 * relève un défaut. Les captures deviennent les images de la maquette (cartes du fil, choix du client).
 *
 * Le code de chaque maquette vit dans la mémoire du projet (artefact `syna.mockup_code.<lettre>`) : feuille commune
 * (base.css, écrite avec l'accueil), en-tête et pied de page, et le fichier de chaque page (avec sa version précédente).
 */
import { z } from "zod";
import { all, run } from "../../db";
import { remember, type Project } from "../../projects";
import { assetData, getAsset, saveAsset } from "../../library";
import { FONT_FILES } from "../../theme/render";
import { chromiumPath } from "../../theme/snapshot";
import fs from "node:fs";
import path from "node:path";
import { callCostBoundMicro, estimateCallMicro, jsonCallMaxMicro, llmJson, llmText, routeLlm } from "../../ai/llm";
import { withTrace } from "../../ai/trace";
import { copyLines, type PageCopy } from "./copy";
import type { MockupDirection } from "./mockup-set";
import type { MockupPage, Viewport } from "./pages";
import {
  applyEdits, CODE_MOCKUP_SYSTEM as CODE_SYSTEM_TEXT, codeMockupPrompt, continuationPrompt, expectedTexts, fontOf, fontsCss, inspectCodeMockup, isComplete, joinContinuation,
  parseCodeMockup, resolvePhotos, shellOf, splitBaseCss, stripFences, type CodeEdit, type CodePhoto, type InspectResult, type LibraryPhoto, type MockupFiles,
} from "./code-mockup";

/** Modèle des maquettes en code : Claude Opus, réflexion moyenne (essai réel du 8 novembre : réflexion haute coupée avant la fin). */
export const CODE_MODEL = { provider: "anthropic" as const, model: "claude-opus-5-5", effort: "medium" };
const FIX_MODEL = { provider: "anthropic" as const, model: "claude-opus-5-5", effort: "low" };
/** Longueur maximale d'une réponse ; deux suites au plus si le fichier s'arrête avant la fin. */
export const CODE_MAX_TOKENS = 32000;
const CONTINUATIONS = 2;
const FIX_MAX_TOKENS = 8000;
/** Jetons habituels (entrée, sortie) : essai réel du 8 novembre (accueil complet ≈ 30 000 jetons de sortie en réflexion haute). */
const TYPICAL = { first: { input: 7000, output: 20000 }, next: { input: 16000, output: 11000 }, fix: { input: 26000, output: 2500 } };
/** Photos nouvelles au plus : accueil de la première maquette, accueil des suivantes (photos partagées), autres pages. */
export const MAX_NEW = { firstHome: 14, home: 4, page: 6 };
/** Photos nouvelles habituelles (coût probable). */
const TYPICAL_NEW = { firstHome: 10, home: 2, page: 3 };

export type DirectionCode = {
  base: string | null; shell: string | null; pages: Record<string, { html: string; previous?: string | null; at: number }>;
  /** Photos demandées par une page mais pas encore créées (fournisseur indisponible…) : créées plus tard, sans réécrire la page. */
  pending?: Record<string, CodePhoto[]>;
};
export const codeKey = (direction: string) => `syna.mockup_code.${direction}`;

export function loadDirectionCode(projectId: string, direction: string): DirectionCode {
  const row = all<{ value: string }>("SELECT value FROM memory WHERE project_id=? AND kind='artifact' AND key=? AND state='active' LIMIT 1", projectId, codeKey(direction))[0];
  try { const v = row ? JSON.parse(row.value) : null; if (v && typeof v === "object" && v.pages) return v; } catch { /* valeur abîmée : repartir de zéro */ }
  return { base: null, shell: null, pages: {} };
}
export function saveDirectionCode(projectId: string, direction: string, code: DirectionCode): void {
  remember(projectId, { kind: "artifact", key: codeKey(direction), value: JSON.stringify(code), source: "local", origin: "system" });
}

type PhotoMeta = { page: string; direction: string; description: string; ratio: string; background?: string | null; product?: boolean; packaging?: boolean };
/** Photos déjà disponibles : photos des maquettes en code (créées une fois, partagées) et photos réelles du produit. */
export function photoLibrary(projectId: string): LibraryPhoto[] {
  const rows = all<{ id: string; meta: string | null; role: string; name: string; width: number | null; height: number | null }>(
    "SELECT id, meta, role, name, width, height FROM assets WHERE project_id=? AND deleted_at IS NULL AND kind='image' AND role IN ('site','original','product') ORDER BY created_at", projectId);
  const out: LibraryPhoto[] = [];
  for (const r of rows) {
    let meta: any = null;
    try { meta = r.meta ? JSON.parse(r.meta) : null; } catch { meta = null; }
    // Photo jugée ratée (texte ou logo dans la photo, objet coupé…) : jamais reproposée.
    if (meta?.rejected) continue;
    const ratio = r.width && r.height ? `${r.width}:${r.height}` : "4:3";
    if (r.role === "site" && meta?.synaPhoto) out.push({ id: r.id, description: String(meta.synaPhoto.description).slice(0, 400), ratio: meta.synaPhoto.ratio ?? ratio });
    // Photos du site déjà recréées en haute définition (étape 7, ancienne méthode) : déjà payées, réutilisables.
    else if (r.role === "site" && meta?.synaSiteImage?.description) out.push({ id: r.id, description: String(meta.synaSiteImage.description).slice(0, 400), ratio });
    else if (r.role !== "site") out.push({ id: r.id, description: `photo réelle du produit (${r.name.replace(/\.[a-z0-9]+$/i, "")})`, ratio, real: true });
  }
  return out;
}

function fontsOf(p: Project): { heading: { key: string; family: string; weight: number }; body: { key: string; family: string; weights: number[] } } {
  const h = fontOf(p.brand?.fonts?.heading, FONT_FILES) ?? { key: "inter", family: "Inter", weight: 700, italic: false, fallback: "sans-serif" };
  const b = fontOf(p.brand?.fonts?.body, FONT_FILES) ?? { key: "inter", family: "Inter", weight: 400, italic: false, fallback: "sans-serif" };
  const weights = Object.keys(FONT_FILES[b.key]?.files ?? { 400: "" }).map(Number).filter((w) => w <= 700);
  return { heading: { key: h.key, family: h.family, weight: h.weight }, body: { key: b.key, family: b.family, weights: weights.length ? weights : [400] } };
}

function logoOf(p: Project): { name: string; data: Buffer; width?: number; height?: number } | null {
  const a = p.brand?.logo?.assetId ? getAsset(p.brand.logo.assetId) : undefined;
  if (!a || a.project_id !== p.id || a.deleted_at) return null;
  const svg = /svg/.test(a.mime);
  return { name: svg ? "logo.svg" : "logo.png", data: assetData(a), width: a.width ?? undefined, height: a.height ?? undefined };
}

/** Fichiers d'une page pour les captures (polices locales, logo, photos utilisées). */
export function mockupFiles(p: Project, html: string, baseCss: string | null): MockupFiles {
  const f = fontsOf(p), fc = fontsCss([f.heading.key, f.body.key], FONT_FILES);
  const dir = path.join(process.cwd(), "assets", "fonts");
  const fontFiles = fc.files.filter((n) => fs.existsSync(path.join(dir, n))).map((n) => ({ name: n, data: fs.readFileSync(path.join(dir, n)) }));
  const logo = logoOf(p) ?? { name: "logo.png", data: Buffer.alloc(0) };
  const photos: Record<string, Buffer> = {};
  for (const id of new Set([...html.matchAll(/data-photo=["']([^"']+)["']/g)].map((m) => m[1]))) {
    const a = getAsset(id);
    if (a && a.project_id === p.id && !a.deleted_at) photos[id] = assetData(a);
  }
  return { html, baseCss, fontsCss: fc.css, fontFiles, logo: { name: logo.name, data: logo.data }, photos };
}

const FixSchema = z.object({ edits: z.array(z.object({ find: z.string().min(1).max(6000), replace: z.string().max(12000) })).max(30) });

/** Dépendances d'une construction (remplaçables par les tests : aucun appel réel). */
export type BuildDeps = {
  writeHtml: (prompt: string, usageKey: string) => Promise<string>;
  fixEdits: (prompt: string, usageKey: string) => Promise<CodeEdit[]>;
  makePhoto: (photo: CodePhoto, usageKey: string) => Promise<Buffer>;
  inspect: (files: MockupFiles, expect: { texts: string[]; allowed: string[] }) => Promise<InspectResult>;
};

/** Dépendances réelles : Claude (plafonné par appel), captures dans le Chromium local. */
export function realBuildDeps(b: { userId: string; projectId: string; jobId: string | null; capMicro: (kind: "html" | "fix") => number; spentMicro: () => number }, makePhoto: BuildDeps["makePhoto"]): BuildDeps {
  return {
    writeHtml: (prompt, usageKey) => withTrace({ jobId: b.jobId, projectId: b.projectId, step: "mockup-code", costCapMicro: b.spentMicro() + b.capMicro("html") }, () =>
      llmText({ task: "theme_custom", userId: b.userId, projectId: b.projectId, jobId: b.jobId, usageKey, promptKey: "syna-mockup-code-1", system: CODE_SYSTEM_TEXT, prompt, maxTokens: CODE_MAX_TOKENS, routing: { difficulty: "complex", prefer: CODE_MODEL } })),
    fixEdits: async (prompt, usageKey) => (await withTrace({ jobId: b.jobId, projectId: b.projectId, step: "mockup-code-fix", costCapMicro: b.spentMicro() + b.capMicro("fix") }, () =>
      llmJson({ task: "theme_custom", userId: b.userId, projectId: b.projectId, jobId: b.jobId, usageKey, promptKey: "syna-mockup-code-fix-1", system: CODE_SYSTEM_TEXT, prompt, maxTokens: FIX_MAX_TOKENS, routing: { difficulty: "complex", prefer: FIX_MODEL } }, FixSchema))).edits,
    makePhoto,
    inspect: (files, expect) => inspectCodeMockup(files, expect, chromiumPath()),
  };
}

/** Coût maximal et probable d'un appel de chaque nature (null : modèle ou tarif inconnu). */
export function codeCallCosts(userId: string): { html: { max: number; first: number; next: number }; fix: { max: number; typical: number } } | null {
  const r = routeLlm({ task: "theme_custom", userId, routing: { difficulty: "complex", prefer: CODE_MODEL } });
  if (r.mode !== "llm") return null;
  const max = callCostBoundMicro(r.provider, r.model, TYPICAL.next.input + 12000, CODE_MAX_TOKENS, r.effort ?? null);
  // Correction en JSON validé : son pire cas compte les relances possibles (comme la réservation faite à l'envoi).
  const fixMax = jsonCallMaxMicro(r.provider, r.model, TYPICAL.fix.input + 12000, FIX_MAX_TOKENS, FIX_MAX_TOKENS * 2, "low")?.maxMicro ?? null;
  const first = estimateCallMicro(r.provider, r.model, TYPICAL.first.input, TYPICAL.first.output);
  const next = estimateCallMicro(r.provider, r.model, TYPICAL.next.input, TYPICAL.next.output);
  const fix = estimateCallMicro(r.provider, r.model, TYPICAL.fix.input, TYPICAL.fix.output);
  if (max == null || fixMax == null || first == null || next == null || fix == null) return null;
  return { html: { max, first, next }, fix: { max: fixMax, typical: fix } };
}

/** Photos nouvelles permises pour une page (les suivantes réutilisent les photos déjà faites). */
export function maxNewPhotos(pageKey: string, libraryCount: number): number {
  return pageKey === "home" ? (libraryCount >= 6 ? MAX_NEW.home : MAX_NEW.firstHome) : MAX_NEW.page;
}

/**
 * Devis de la construction de pages d'une maquette : maximum (jamais dépassé) et coût probable (un essai, annoncé au
 * client). Par page : un appel d'écriture (et ses deux suites possibles), une correction possible, les photos nouvelles.
 */
export function codeBuildEstimate(userId: string, pages: string[], libraryCount: number, photoUnitMicro: number): { maxMicro: number; probableMicro: number } | null {
  const c = codeCallCosts(userId);
  if (!c) return null;
  let max = 0, probable = 0, lib = libraryCount;
  for (const k of pages) {
    const n = maxNewPhotos(k, lib);
    const typicalNew = k === "home" ? (n === MAX_NEW.firstHome ? TYPICAL_NEW.firstHome : TYPICAL_NEW.home) : TYPICAL_NEW.page;
    max += c.html.max * (1 + CONTINUATIONS) + c.fix.max + n * photoUnitMicro;
    probable += (k === "home" ? c.html.first : c.html.next) + Math.round(c.fix.typical / 2) + Math.round(typicalNew * photoUnitMicro * 0.75);
    lib += typicalNew;
  }
  return { maxMicro: max, probableMicro: probable };
}

export type BuildResult = {
  ok: boolean;
  page: string;
  shots: Record<Viewport, Buffer> | null;
  problems: string[];
  toVerify: string[];
  newPhotos: string[];
  failed: string[];
  fixed: boolean;
};

/** Consigne de correction ciblée (défauts relevés par le contrôle automatique). */
export function fixPrompt(html: string, problems: string[], lines: string[]): string {
  return `Voici le fichier HTML d'une maquette de page et les défauts relevés par le contrôle automatique.
<fichier>
${html}
</fichier>
Défauts à corriger :
${problems.map((p) => `- ${p}`).join("\n")}
Textes de la page (seuls textes permis, mot pour mot) :
${lines.join("\n")}
Corrige UNIQUEMENT ces défauts, sans rien changer d'autre, par des remplacements exacts : find = un passage copié EXACTEMENT du fichier, assez long pour n'y figurer qu'une fois ; replace = le passage corrigé. Un texte ajouté est retiré (ou remplacé par le texte exact de la liste) ; un texte manquant est ajouté à sa place ; sur téléphone, l'en-tête ne garde que le logo et l'icône du menu, et jamais trois éléments côte à côte (deux par rangée pour les produits, sinon l'un sous l'autre, dans la règle CSS du téléphone).`;
}

/**
 * Construit (ou refait) une page d'une maquette en code. L'accueil d'abord : il fixe la feuille commune, l'en-tête et
 * le pied de page que les autres pages reprennent.
 */
export async function buildCodePage(p: Project, d: Pick<MockupDirection, "key" | "name" | "style" | "ground">, page: MockupPage, copy: PageCopy, deps: BuildDeps, o: { usageKey: string; photoBrief: (photo: CodePhoto) => { prompt: string } }): Promise<BuildResult> {
  const code = loadDirectionCode(p.id, d.key);
  const res: BuildResult = { ok: false, page: page.key, shots: null, problems: [], toVerify: [], newPhotos: [], failed: [], fixed: false };
  if (page.key !== "home" && !code.base) { res.failed.push("l'accueil de cette maquette doit être construit d'abord (il fixe la feuille commune, l'en-tête et le pied de page)"); return res; }
  const brand = p.brand;
  if (!brand) { res.failed.push("identité de marque absente"); return res; }
  const logo = logoOf(p);
  if (!logo) { res.failed.push("logo de la marque absent des Fichiers"); return res; }
  const library = photoLibrary(p.id);
  const maxNew = maxNewPhotos(page.key, library.length);
  const f = fontsOf(p);
  const lines = copyLines(copy), phoneLines = copyLines(copy, { phone: true });
  const prompt = codeMockupPrompt({
    brand: { name: brand.name, palette: brand.palette as any, personality: brand.personality },
    fonts: { heading: f.heading, body: f.body },
    logo: { file: logo.name, width: logo.width, height: logo.height },
    direction: d, page, copy, lines, phoneLines, photos: library, maxNew,
    baseCss: page.key === "home" ? null : code.base, shell: page.key === "home" ? null : code.shell,
  });
  // 1) Écriture (et suites si le fichier s'arrête avant la fin).
  let html = stripFences(await deps.writeHtml(prompt, `${o.usageKey}:html:${d.key}:${page.key}:1`));
  for (let n = 2; !isComplete(html) && n <= 1 + CONTINUATIONS; n++) html = joinContinuation(html, await deps.writeHtml(continuationPrompt(html), `${o.usageKey}:html:${d.key}:${page.key}:${n}`));
  const parsed = parseCodeMockup(html, new Set(library.map((x) => x.id)), maxNew);
  if (!isComplete(parsed.html)) { res.failed.push("la page écrite s'arrête avant la fin, même après deux suites : rien n'est gardé (aucune photo créée)"); return res; }
  res.problems.push(...parsed.problems.filter((x) => !/incomplet/.test(x)));
  // 2) Photos nouvelles : créées une fois, rangées dans les Fichiers (partagées ensuite).
  const ids: Record<string, string> = {};
  for (const ph of parsed.newPhotos) {
    try {
      const data = await deps.makePhoto(ph, `${o.usageKey}:photo:${d.key}:${page.key}:${ph.id}`);
      const jpeg = data[0] === 0xff && data[1] === 0xd8;
      const meta: PhotoMeta = { page: page.key, direction: d.key, description: ph.description, ratio: ph.ratio, background: ph.background ?? null, product: ph.product, packaging: ph.packaging };
      const a = await saveAsset({ projectId: p.id, userId: p.userId, data, name: `photo-${page.key.replace(/[^a-z0-9]+/gi, "-")}-${ph.id}.${jpeg ? "jpg" : "png"}`, mime: jpeg ? "image/jpeg" : "image/png", role: "site", origin: "generated", meta: { synaPhoto: { ...meta, prompt: o.photoBrief(ph).prompt.slice(0, 4000) } } });
      ids[ph.id] = a.id;
      res.newPhotos.push(a.id);
    } catch (e) { res.failed.push(`photo ${ph.id} non créée : ${(e as Error).message.slice(0, 160)}`); }
  }
  const pending = parsed.newPhotos.filter((ph) => !ids[ph.id]);
  let full = resolvePhotos(parsed.html, ids);
  // 3) Captures et contrôle gratuits ; 4) une correction ciblée au plus.
  const expect = { texts: expectedTexts(copy), allowed: [brand.name] };
  const base = page.key === "home" ? null : code.base;
  let r = await deps.inspect(mockupFiles(p, full, base), expect);
  const fixable = r.problems.filter((x) => !/image non chargée/.test(x));
  if (fixable.length) {
    try {
      const edits = await deps.fixEdits(fixPrompt(full, fixable, lines), `${o.usageKey}:fix:${d.key}:${page.key}`);
      const applied = applyEdits(full, edits);
      if (!applied.failed.length && applied.html !== full) {
        const again = await deps.inspect(mockupFiles(p, applied.html, base), expect);
        // La correction n'est gardée que si elle réduit les défauts (jamais une page pire que la première).
        if (again.problems.length < r.problems.length) { full = applied.html; r = again; res.fixed = true; }
      } else if (applied.failed.length) res.toVerify.push(`correction automatique non appliquée (${applied.failed[0]})`);
    } catch (e) { res.toVerify.push(`correction automatique impossible : ${(e as Error).message.slice(0, 120)}`); }
  }
  res.shots = r.shots;
  res.problems = [...new Set([...res.problems, ...r.problems])];
  res.toVerify.push(...r.toVerify);
  // 5) Enregistrement : l'accueil fixe la feuille commune, l'en-tête et le pied de page.
  const next: DirectionCode = { ...code, pages: { ...code.pages } };
  if (page.key === "home") {
    const s = splitBaseCss(full);
    next.base = s.css ?? next.base;
    next.shell = shellOf(s.html) ?? next.shell;
    full = s.html;
  }
  next.pages[page.key] = { html: full, previous: code.pages[page.key]?.html ?? null, at: Date.now() };
  next.pending = { ...(code.pending ?? {}), [page.key]: pending };
  if (!pending.length) delete next.pending[page.key];
  saveDirectionCode(p.id, d.key, next);
  res.ok = !!res.shots && !res.problems.length && !res.failed.length;
  return res;
}

/**
 * Photos restées en attente d'une page déjà construite : créées maintenant, posées dans la page (sans la réécrire),
 * puis captures, contrôle et au plus une correction ciblée.
 */
export async function completeCodePhotos(p: Project, direction: string, page: MockupPage, copy: PageCopy, deps: BuildDeps, o: { usageKey: string; photoBrief: (photo: CodePhoto) => { prompt: string } }): Promise<BuildResult> {
  const code = loadDirectionCode(p.id, direction);
  const res: BuildResult = { ok: false, page: page.key, shots: null, problems: [], toVerify: [], newPhotos: [], failed: [], fixed: false };
  const cur = code.pages[page.key], todo = code.pending?.[page.key] ?? [];
  if (!cur || !todo.length) { res.failed.push("aucune photo en attente sur cette page"); return res; }
  const ids: Record<string, string> = {};
  for (const ph of todo) {
    try {
      const data = await deps.makePhoto(ph, `${o.usageKey}:photo:${direction}:${page.key}:${ph.id}`);
      const jpeg = data[0] === 0xff && data[1] === 0xd8;
      const a = await saveAsset({ projectId: p.id, userId: p.userId, data, name: `photo-${page.key.replace(/[^a-z0-9]+/gi, "-")}-${ph.id}.${jpeg ? "jpg" : "png"}`, mime: jpeg ? "image/jpeg" : "image/png", role: "site", origin: "generated", meta: { synaPhoto: { page: page.key, direction, description: ph.description, ratio: ph.ratio, background: ph.background ?? null, product: ph.product, packaging: ph.packaging, prompt: o.photoBrief(ph).prompt.slice(0, 4000) } } });
      ids[ph.id] = a.id;
      res.newPhotos.push(a.id);
    } catch (e) { res.failed.push(`photo ${ph.id} non créée : ${(e as Error).message.slice(0, 160)}`); }
  }
  const source = pageSource(p.id, direction, page.key)!;
  let full = resolvePhotos(source, ids);
  const expect = { texts: expectedTexts(copy), allowed: [p.brand?.name ?? p.name] };
  const base = page.key === "home" ? null : code.base;
  let r = await deps.inspect(mockupFiles(p, full, base), expect);
  const fixable = r.problems.filter((x) => !/image non chargée/.test(x));
  if (fixable.length) {
    try {
      const applied = applyEdits(full, await deps.fixEdits(fixPrompt(full, fixable, copyLines(copy)), `${o.usageKey}:fix:${direction}:${page.key}`));
      if (!applied.failed.length && applied.html !== full) {
        const again = await deps.inspect(mockupFiles(p, applied.html, base), expect);
        if (again.problems.length < r.problems.length) { full = applied.html; r = again; res.fixed = true; }
      }
    } catch (e) { res.toVerify.push(`correction automatique impossible : ${(e as Error).message.slice(0, 120)}`); }
  }
  res.shots = r.shots;
  res.problems = r.problems;
  res.toVerify.push(...r.toVerify);
  const next: DirectionCode = { ...code, pages: { ...code.pages }, pending: { ...(code.pending ?? {}) } };
  if (page.key === "home") { const s2 = splitBaseCss(full); next.base = s2.css ?? next.base; next.shell = shellOf(s2.html) ?? next.shell; full = s2.html; }
  next.pages[page.key] = { html: full, previous: cur.html, at: Date.now() };
  const left = todo.filter((ph) => !ids[ph.id]);
  if (left.length) next.pending![page.key] = left; else delete next.pending![page.key];
  saveDirectionCode(p.id, direction, next);
  res.ok = !!res.shots && !res.problems.length && !res.failed.length;
  return res;
}

/** Retouche d'une page déjà construite par remplacements exacts (gratuite ou par Claude), puis captures et contrôle. */
export async function retouchCodePage(p: Project, direction: string, page: MockupPage, copy: PageCopy, edits: CodeEdit[], inspect: BuildDeps["inspect"], accept?: (problems: string[]) => boolean): Promise<{ ok: boolean; failed: string[]; shots: Record<Viewport, Buffer> | null; problems: string[]; toVerify: string[]; rejected?: boolean }> {
  const code = loadDirectionCode(p.id, direction);
  const cur = code.pages[page.key];
  if (!cur) return { ok: false, failed: ["page pas encore construite"], shots: null, problems: [], toVerify: [] };
  // L'accueil garde sa feuille commune à part : la retouche porte sur le fichier ET sur base.css réunis.
  const joined = page.key === "home" && code.base ? cur.html.replace('<link rel="stylesheet" href="base.css">', `<style id="base">\n${code.base}\n</style>`) : cur.html;
  const applied = applyEdits(joined, edits);
  if (applied.failed.length) return { ok: false, failed: applied.failed, shots: null, problems: [], toVerify: [] };
  const base = page.key === "home" ? null : code.base;
  const r = await inspect(mockupFiles(p, applied.html, base), { texts: expectedTexts(copy), allowed: [p.brand?.name ?? p.name] });
  // Retouche qui ajoute des défauts : jamais gardée (la page d'avant reste en place).
  if (accept && !accept(r.problems)) return { ok: false, failed: [], shots: r.shots, problems: r.problems, toVerify: r.toVerify, rejected: true };
  const next: DirectionCode = { ...code, pages: { ...code.pages } };
  let html = applied.html;
  if (page.key === "home") { const s = splitBaseCss(html); next.base = s.css ?? next.base; next.shell = shellOf(s.html) ?? next.shell; html = s.html; }
  next.pages[page.key] = { html, previous: cur.html, at: Date.now() };
  saveDirectionCode(p.id, direction, next);
  return { ok: !!r.shots && !r.problems.length, failed: [], shots: r.shots, problems: r.problems, toVerify: r.toVerify };
}

/** Fichier complet d'une page (feuille commune réintégrée), pour une retouche par Claude ou l'étape 7. */
export function pageSource(projectId: string, direction: string, pageKey: string): string | null {
  const code = loadDirectionCode(projectId, direction);
  const cur = code.pages[pageKey];
  if (!cur) return null;
  return pageKey === "home" && code.base ? cur.html.replace('<link rel="stylesheet" href="base.css">', `<style id="base">\n${code.base}\n</style>`) : cur.html;
}

/** Consigne de retouche d'une page en code : seuls les détails demandés changent, par remplacements exacts. */
export function editCodePrompt(source: string, changes: { zone: string; change: string }[], lines: string[]): string {
  return `Voici le fichier HTML d'une page de maquette déjà validée dans son ensemble par le client.
<fichier>
${source}
</fichier>
Le client demande SEULEMENT ces retouches :
${changes.map((c, i) => `${i + 1}. Où : ${c.zone}. Quoi : ${c.change}`).join("\n")}
Textes de la page (seuls textes permis, mot pour mot ; un texte nouveau demandé par le client est permis) :
${lines.join("\n")}
Fais UNIQUEMENT ces retouches, sans rien changer d'autre (consigne du client : « modifier que les détails demandés »), par des remplacements exacts : find = un passage copié EXACTEMENT du fichier, assez long pour n'y figurer qu'une fois ; replace = le passage retouché. Garde les règles du téléphone (en-tête avec le logo et l'icône du menu seulement, jamais trois éléments côte à côte) et aucun débordement.`;
}

/** Devis d'une retouche de page en code (un appel, réflexion légère). */
export function codeEditEstimate(userId: string, sourceChars: number): { maxMicro: number; probableMicro: number } | null {
  const r = routeLlm({ task: "theme_custom", userId, routing: { difficulty: "complex", prefer: FIX_MODEL } });
  if (r.mode !== "llm") return null;
  // Essai réel du 8 novembre : plafond trop bas (appel unique sans relances, 3 caractères par jeton), retouche bloquée.
  const input = Math.ceil(sourceChars / 2.5) + 4000;
  const max = jsonCallMaxMicro(r.provider, r.model, input, FIX_MAX_TOKENS, FIX_MAX_TOKENS * 2, "low")?.maxMicro ?? null;
  const probable = estimateCallMicro(r.provider, r.model, input, 2500);
  return max == null || probable == null ? null : { maxMicro: max, probableMicro: probable };
}

/**
 * Correction d'un texte par le client (mockup.copy_edit, gratuite) reportée sur les pages déjà construites : le texte
 * exact est remplacé dans le fichier, sans IA. Renvoie les pages changées.
 */
export function patchCodeText(projectId: string, direction: string, pageKey: string, find: string, replace: string): boolean {
  const code = loadDirectionCode(projectId, direction);
  const cur = code.pages[pageKey];
  const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  if (!cur) return false;
  const variants = [find, esc(find), find.replace(/'/g, "’"), esc(find).replace(/'/g, "’")].filter((v, i, a) => a.indexOf(v) === i);
  let html = cur.html, n = 0;
  for (const v of variants) if (html.includes(v)) { n += html.split(v).length - 1; html = html.split(v).join(v === find || v === find.replace(/'/g, "’") ? replace : esc(replace)); }
  if (!n) return false;
  saveDirectionCode(projectId, direction, { ...code, pages: { ...code.pages, [pageKey]: { html, previous: cur.html, at: Date.now() } } });
  return true;
}

/**
 * Écarte des photos ratées pour toujours (essai réel du 8 novembre : « Brindi » écrit sur des tasses et une photo de
 * menthe, réutilisées sur les maquettes en code). Les fichiers restent dans les Fichiers ; ils ne sont plus proposés.
 */
export function rejectPhotos(projectId: string, ids: string[], reason: string): string[] {
  const done: string[] = [];
  for (const id of ids) {
    const r = all<{ meta: string | null }>("SELECT meta FROM assets WHERE id=? AND project_id=? AND role='site' AND deleted_at IS NULL", id, projectId)[0];
    if (!r) continue;
    let meta: any = {};
    try { meta = r.meta ? JSON.parse(r.meta) : {}; } catch { meta = {}; }
    run("UPDATE assets SET meta=? WHERE id=?", JSON.stringify({ ...meta, rejected: { reason: reason.slice(0, 200), at: Date.now() } }), id);
    done.push(id);
  }
  return done;
}
