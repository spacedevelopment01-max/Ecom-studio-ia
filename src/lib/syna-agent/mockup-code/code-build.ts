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
import sharp from "sharp";
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
import { listProducts } from "../../products/catalog";
import { buyBlockBrief, decideBuyFeatures, deliveryFrom, freeShippingFrom, loadShopOffers } from "../product-features";
import { companyOf } from "../activity";
import { copyLines, type PageCopy } from "./copy";
import type { MockupDirection } from "./mockup-set";
import type { MockupPage, Viewport } from "./pages";
import {
  applyEdits, autoTagProducts, CODE_MOCKUP_SYSTEM as CODE_SYSTEM_TEXT, codeMockupPrompt, duplicatePhotos, photoUses, continuationPrompt, expectedTexts, fontOf, fontsCss, inspectCodeMockup, isComplete, joinContinuation,
  parseCodeMockup, resolvePhotos, shellOf, splitBaseCss, stripFences, type CodeEdit, type CodePhoto, type InspectResult, type LibraryPhoto, type MockupFiles,
} from "./code-mockup";

/** Modèle des maquettes en code : Claude Opus, réflexion moyenne (essai réel du 8 novembre : réflexion haute coupée avant la fin). */
export const CODE_MODEL = { provider: "anthropic" as const, model: "claude-opus-5-5", effort: "medium" };
const FIX_MODEL = { provider: "anthropic" as const, model: "claude-opus-5-5", effort: "low" };
/** Longueur maximale d'une réponse (essai réel du 8 novembre : 32 000 coupait l'accueil animé) ; deux suites au plus. */
export const CODE_MAX_TOKENS = 64000;
const CONTINUATIONS = 2;
const FIX_MAX_TOKENS = 8000;
/** Au-delà de ce nombre de textes manquants ou ajoutés, la page est ratée : pas de correction ciblée. */
const MAX_FIXABLE_TEXTS = 6;
/** Jetons habituels (entrée, sortie) : essai réel du 8 novembre (accueil complet ≈ 30 000 jetons de sortie en réflexion haute). */
// Mis à jour d'après les essais réels du 8 novembre avec les animations : accueil ≈ 45 000 jetons de sortie (0,90 €),
// fiche produit ≈ 28 000 (0,59 €).
const TYPICAL = { first: { input: 8000, output: 45000 }, next: { input: 18000, output: 28000 }, fix: { input: 26000, output: 2500 } };
/** Photos nouvelles au plus : accueil de la première maquette, accueil des suivantes (photos partagées), autres pages. */
export const MAX_NEW = { firstHome: 16, home: 6, page: 10 };
/** Photos nouvelles habituelles (coût probable). */
const TYPICAL_NEW = { firstHome: 12, home: 3, page: 5 };

export type DirectionCode = {
  base: string | null; shell: string | null;
  /** base : feuille commune avec laquelle la page a été construite (l'accueil refait ne casse jamais les autres pages). */
  pages: Record<string, { html: string; previous?: string | null; at: number; base?: string | null }>;
  /** Photos demandées par une page mais pas encore créées (fournisseur indisponible…) : créées plus tard, sans réécrire la page. */
  pending?: Record<string, CodePhoto[]>;
};
export const codeKey = (direction: string) => `syna.mockup_code.${direction}`;

/** Noms des produits de l'onglet Produits (étiquetage des photos de cartes). */
/**
 * Bloc d'achat d'une fiche produit (consigne du propriétaire du 8 novembre) : fonctions activées d'après la fiche du
 * produit visé par la page (sinon le premier produit) et les offres saisies par le client. Gratuit, sans IA.
 */
export function productBuyBlock(projectId: string, page: Pick<MockupPage, "key" | "fr">): { lines: string[]; allowed: string[] } {
  try {
    const products = listProducts(projectId);
    if (!products.length) return { lines: [], allowed: [] };
    const name = page.fr.replace(/^Fiche produit\s*—\s*/i, "").trim().toLowerCase();
    const target = products.find((x) => x.data.title.trim().toLowerCase() === name) ?? products[0];
    const f = decideBuyFeatures(target, loadShopOffers(projectId), { catalog: products.map((x) => x.data.title), freeShippingFrom: freeShippingFrom(companyOf(projectId).shipping), shippingDelay: deliveryFrom(companyOf(projectId).shipping) });
    return buyBlockBrief(f);
  } catch { return { lines: [], allowed: [] }; }
}

export function productNames(projectId: string): string[] {
  try { return listProducts(projectId).map((x) => x.data.title).filter(Boolean); } catch { return []; }
}

/**
 * Feuille commune d'une page : celle de l'accueil pour l'accueil, sinon celle avec laquelle la page a été construite
 * (essai réel du 8 novembre : l'accueil refait avait changé la feuille, la fiche produit et le panier s'affichaient de
 * travers, menu visible sur téléphone et logo étiré).
 */
export function baseFor(code: DirectionCode, pageKey: string): string | null {
  return pageKey === "home" ? code.base : code.pages[pageKey]?.base ?? code.base;
}

/** Pages restées dans l'ancien style après un nouvel accueil : à reconstruire pour prendre le nouveau. */
export function staleStylePages(code: DirectionCode): string[] {
  return Object.entries(code.pages).filter(([k, v]) => k !== "home" && v.base != null && v.base !== code.base).map(([k]) => k);
}

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
      llmJson({ task: "theme_custom", userId: b.userId, projectId: b.projectId, jobId: b.jobId, usageKey, promptKey: "syna-mockup-code-fix-1", system: CODE_SYSTEM_TEXT, prompt, maxTokens: FIX_MAX_TOKENS, maxOutputTokens: FIX_MAX_TOKENS, routing: { difficulty: "complex", prefer: FIX_MODEL } }, FixSchema))).edits,
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

/** Autres pages déjà construites de la maquette (pour les doublons de photos). */
export function otherPages(projectId: string, direction: string, pageKey: string): { page: string; html: string }[] {
  const code = loadDirectionCode(projectId, direction);
  return Object.entries(code.pages).filter(([k]) => k !== pageKey).map(([k, v]) => ({ page: k, html: v.html }));
}

/** Photos montrées ailleurs dans la maquette : interdites (hors carte du même produit). */
function photosElsewhere(others: { page: string; html: string }[]): { used: { id: string; page: string }[]; products: { id: string; product: string }[] } {
  const used: { id: string; page: string }[] = [], products: { id: string; product: string }[] = [];
  for (const o of others) for (const u of photoUses(o.html)) {
    if (u.product) { if (!products.some((x) => x.id === u.id)) products.push({ id: u.id, product: u.product }); }
    else if (!used.some((x) => x.id === u.id)) used.push({ id: u.id, page: o.page });
  }
  // Une photo montrée hors carte quelque part n'est jamais reprise, même pour un produit.
  return { used, products: products.filter((x) => !used.some((y) => y.id === x.id)) };
}

/** Consigne de correction ciblée (défauts relevés par le contrôle automatique). */
export function fixPrompt(html: string, problems: string[], lines: string[], spare: string[] = []): string {
  return `Voici le fichier HTML d'une maquette de page et les défauts relevés par le contrôle automatique.
<fichier>
${html}
</fichier>
Défauts à corriger :
${problems.map((p) => `- ${p}`).join("\n")}
Textes de la page (seuls textes permis, mot pour mot) :
${lines.join("\n")}
${spare.length ? `Photos libres (jamais montrées ailleurs), pour remplacer une photo en double (data-photo et src) :\n${spare.join("\n")}\n` : ""}Corrige UNIQUEMENT ces défauts, sans rien changer d'autre, par des remplacements exacts : find = un passage copié EXACTEMENT du fichier, assez long pour n'y figurer qu'une fois ; replace = le passage corrigé. Un texte ajouté est retiré (ou remplacé par le texte exact de la liste) ; un texte manquant est ajouté à sa place ; sur téléphone, l'en-tête ne garde que le logo et l'icône du menu, et jamais trois éléments côte à côte (deux par rangée pour les produits, sinon l'un sous l'autre, dans la règle CSS du téléphone).`;
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
  const others = otherPages(p.id, d.key, page.key);
  const elsewhere = photosElsewhere(others);
  const maxNew = maxNewPhotos(page.key, library.length - elsewhere.used.length);
  const f = fontsOf(p);
  const lines = copyLines(copy), phoneLines = copyLines(copy, { phone: true });
  const buy = page.key === "product" || page.key.startsWith("product:") ? productBuyBlock(p.id, page) : { lines: [], allowed: [] };
  const prompt = codeMockupPrompt({
    brand: { name: brand.name, palette: brand.palette as any, personality: brand.personality },
    fonts: { heading: f.heading, body: f.body },
    logo: { file: logo.name, width: logo.width, height: logo.height },
    direction: d, page, copy, lines, phoneLines, photos: library, usedElsewhere: elsewhere.used, productPhotos: elsewhere.products, maxNew,
    baseCss: page.key === "home" ? null : code.base, shell: page.key === "home" ? null : code.shell, buyBlock: buy.lines,
  });
  // 1) Écriture (et suites si le fichier s'arrête avant la fin).
  let html = stripFences(await deps.writeHtml(prompt, `${o.usageKey}:html:${d.key}:${page.key}:1`));
  for (let n = 2; !isComplete(html) && n <= 1 + CONTINUATIONS; n++) html = joinContinuation(html, await deps.writeHtml(continuationPrompt(html, prompt), `${o.usageKey}:html:${d.key}:${page.key}:${n}`));
  const parsed = parseCodeMockup(html, new Set(library.map((x) => x.id)), maxNew);
  if (!isComplete(parsed.html)) { res.failed.push("la page écrite s'arrête avant la fin, même après deux suites : rien n'est gardé (aucune photo créée)"); return res; }
  res.problems.push(...parsed.problems.filter((x) => !/incomplet/.test(x)));
  // 2) Photos nouvelles : créées une fois, rangées dans les Fichiers (partagées ensuite).
  const ids: Record<string, string> = {};
  for (const ph of parsed.newPhotos) {
    try {
      const data = await trimPhotoBands(await deps.makePhoto(ph, `${o.usageKey}:photo:${d.key}:${page.key}:${ph.id}`));
      const jpeg = data[0] === 0xff && data[1] === 0xd8;
      const meta: PhotoMeta = { page: page.key, direction: d.key, description: ph.description, ratio: ph.ratio, background: ph.background ?? null, product: ph.product, packaging: ph.packaging };
      const a = await saveAsset({ projectId: p.id, userId: p.userId, data, name: `photo-${page.key.replace(/[^a-z0-9]+/gi, "-")}-${ph.id}.${jpeg ? "jpg" : "png"}`, mime: jpeg ? "image/jpeg" : "image/png", role: "site", origin: "generated", meta: { synaPhoto: { ...meta, prompt: o.photoBrief(ph).prompt.slice(0, 4000) } } });
      ids[ph.id] = a.id;
      res.newPhotos.push(a.id);
    } catch (e) { res.failed.push(`photo ${ph.id} non créée : ${(e as Error).message.slice(0, 160)}`); }
  }
  const pending = parsed.newPhotos.filter((ph) => !ids[ph.id]);
  let full = autoTagProducts(resolvePhotos(parsed.html, ids), productNames(p.id));
  // 3) Captures et contrôle gratuits ; 4) une correction ciblée au plus.
  const expect = { texts: expectedTexts(copy), allowed: [brand.name, ...buy.allowed] };
  const base = page.key === "home" ? null : code.base;
  // Contrôle des captures et des doublons de photos (gratuits).
  const inspect = async (h: string) => { const x = await deps.inspect(mockupFiles(p, h, base), expect); return { ...x, problems: [...x.problems, ...duplicatePhotos(h, others)] }; };
  const spare = () => library.filter((x) => !photoUses(full).some((u) => u.id === x.id) && !elsewhere.used.some((u) => u.id === x.id) && !elsewhere.products.some((u) => u.id === x.id) && !x.real).map((x) => `- ${x.id} : ${x.description}`);
  let r = await inspect(full);
  const fixable = r.problems.filter((x) => !/image non chargée/.test(x));
  // Page ratée dans l'ensemble (textes manquants ou inventés en nombre) : aucune correction payée pour rien (essai réel
  // du 8 novembre : trois corrections à 0,82 € sur un accueil inventé). Elle est dite ratée, à refaire.
  const broken = r.problems.filter((x) => /^texte (manquant|ajouté)/.test(x)).length >= MAX_FIXABLE_TEXTS;
  if (broken) res.toVerify.push("page ratée dans l'ensemble (textes manquants ou inventés) : aucune correction automatique tentée, elle est à refaire");
  if (fixable.length && !broken) {
    try {
      const edits = await deps.fixEdits(fixPrompt(full, fixable, lines, spare()), `${o.usageKey}:fix:${d.key}:${page.key}`);
      const applied = applyEdits(full, edits);
      if (!applied.failed.length && applied.html !== full) {
        const again = await inspect(applied.html);
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
    // Les autres pages gardent la feuille avec laquelle elles ont été construites.
    for (const [k, v] of Object.entries(next.pages)) if (k !== "home" && v.base == null) next.pages[k] = { ...v, base: code.base };
    const s = splitBaseCss(full);
    next.base = s.css ?? next.base;
    next.shell = shellOf(s.html) ?? next.shell;
    full = s.html;
  }
  next.pages[page.key] = { html: full, previous: code.pages[page.key]?.html ?? null, at: Date.now(), ...(page.key === "home" ? {} : { base: code.base }) };
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
      const data = await trimPhotoBands(await deps.makePhoto(ph, `${o.usageKey}:photo:${direction}:${page.key}:${ph.id}`));
      const jpeg = data[0] === 0xff && data[1] === 0xd8;
      const a = await saveAsset({ projectId: p.id, userId: p.userId, data, name: `photo-${page.key.replace(/[^a-z0-9]+/gi, "-")}-${ph.id}.${jpeg ? "jpg" : "png"}`, mime: jpeg ? "image/jpeg" : "image/png", role: "site", origin: "generated", meta: { synaPhoto: { page: page.key, direction, description: ph.description, ratio: ph.ratio, background: ph.background ?? null, product: ph.product, packaging: ph.packaging, prompt: o.photoBrief(ph).prompt.slice(0, 4000) } } });
      ids[ph.id] = a.id;
      res.newPhotos.push(a.id);
    } catch (e) { res.failed.push(`photo ${ph.id} non créée : ${(e as Error).message.slice(0, 160)}`); }
  }
  const source = pageSource(p.id, direction, page.key)!;
  let full = autoTagProducts(resolvePhotos(source, ids), productNames(p.id));
  const expect = { texts: expectedTexts(copy), allowed: [p.brand?.name ?? p.name] };
  const base = page.key === "home" ? null : baseFor(code, page.key);
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
  next.pages[page.key] = { ...cur, html: full, previous: cur.html, at: Date.now() };
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
  const applied0 = applyEdits(joined, edits);
  if (applied0.failed.length) return { ok: false, failed: applied0.failed, shots: null, problems: [], toVerify: [] };
  const applied = { ...applied0, html: autoTagProducts(applied0.html, productNames(p.id)) };
  const base = page.key === "home" ? null : baseFor(code, page.key);
  const r0 = await inspect(mockupFiles(p, applied.html, base), { texts: expectedTexts(copy), allowed: [p.brand?.name ?? p.name] });
  const r = { ...r0, problems: [...r0.problems, ...duplicatePhotos(applied.html, otherPages(p.id, direction, page.key))] };
  // Retouche qui ajoute des défauts : jamais gardée (la page d'avant reste en place).
  if (accept && !accept(r.problems)) return { ok: false, failed: [], shots: r.shots, problems: r.problems, toVerify: r.toVerify, rejected: true };
  const next: DirectionCode = { ...code, pages: { ...code.pages } };
  let html = applied.html;
  if (page.key === "home") { for (const [k, v] of Object.entries(next.pages)) if (k !== "home" && v.base == null) next.pages[k] = { ...v, base: code.base }; const s = splitBaseCss(html); next.base = s.css ?? next.base; next.shell = shellOf(s.html) ?? next.shell; html = s.html; }
  next.pages[page.key] = { ...cur, html, previous: cur.html, at: Date.now() };
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
/**
 * Photos utilisables par une retouche de la page : libres (jamais montrées ailleurs dans la maquette, ni déjà sur la
 * page) et photos de produit (seulement sur la carte de ce produit).
 */
export function photoChoices(p: Project, direction: string, pageKey: string, html: string): string[] {
  const others = otherPages(p.id, direction, pageKey), elsewhere = photosElsewhere(others);
  const here = new Set(photoUses(html).map((u) => u.id));
  const free = photoLibrary(p.id).filter((x) => !here.has(x.id) && !elsewhere.used.some((u) => u.id === x.id) && !elsewhere.products.some((u) => u.id === x.id));
  return [
    ...free.map((x) => `- ${x.id} : ${x.description}`),
    ...elsewhere.products.filter((x) => !here.has(x.id)).map((x) => `- ${x.id} : photo du produit « ${x.product} », seulement sur la carte de ce produit (data-product="${x.product}")`),
  ];
}

export function editCodePrompt(source: string, changes: { zone: string; change: string }[], lines: string[], photos: string[] = []): string {
  return `Voici le fichier HTML d'une page de maquette déjà validée dans son ensemble par le client.
<fichier>
${source}
</fichier>
Le client demande SEULEMENT ces retouches :
${changes.map((c, i) => `${i + 1}. Où : ${c.zone}. Quoi : ${c.change}`).join("\n")}
Textes de la page (seuls textes permis, mot pour mot ; un texte nouveau demandé par le client est permis) :
${lines.join("\n")}
${photos.length ? `Photos utilisables (data-photo="ID" src="photos/ID.jpg" ; jamais une photo deux fois) :\n${photos.join("\n")}\n` : ""}Fais UNIQUEMENT ces retouches, sans rien changer d'autre (consigne du client : « modifier que les détails demandés »), par des remplacements exacts : find = un passage copié EXACTEMENT du fichier, assez long pour n'y figurer qu'une fois ; replace = le passage retouché. Garde les règles du téléphone (en-tête avec le logo et l'icône du menu seulement, jamais trois éléments côte à côte) et aucun débordement.`;
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
  saveDirectionCode(projectId, direction, { ...code, pages: { ...code.pages, [pageKey]: { ...cur, html, previous: cur.html, at: Date.now() } } });
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

/**
 * Bandes blanches unies sur les bords d'une photo (essai réel du 8 novembre : trois photos du journal avec 15 à 21 % de
 * blanc en haut et en bas, « images mal cadrées avec des contours blancs »). Une rangée compte comme bande si 97 % de
 * ses points sont presque blancs ; un fond clair teinté (vert d'eau, crème) n'est jamais pris pour une bande.
 */
export async function photoBands(data: Buffer): Promise<{ top: number; bottom: number; left: number; right: number; width: number; height: number }> {
  const { data: px, info } = await sharp(data).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, C = info.channels;
  const white = (x: number, y: number) => { const i = (y * W + x) * C; return px[i] >= 242 && px[i + 1] >= 242 && px[i + 2] >= 242; };
  const row = (y: number) => { let n = 0; for (let x = 0; x < W; x++) if (white(x, y)) n++; return n / W >= 0.97; };
  const col = (x: number) => { let n = 0; for (let y = 0; y < H; y++) if (white(x, y)) n++; return n / H >= 0.97; };
  let top = 0, bottom = 0, left = 0, right = 0;
  while (top < H / 2 && row(top)) top++;
  while (bottom < H / 2 && row(H - 1 - bottom)) bottom++;
  while (left < W / 2 && col(left)) left++;
  while (right < W / 2 && col(W - 1 - right)) right++;
  // Vraie bande seulement si elle s'arrête net sur un autre fond (photo collée dans un cadre blanc) ; un objet posé sur
  // un fond blanc garde son fond (sinon la photo serait recadrée au ras de l'objet).
  const share = (n: number, at: (k: number) => boolean) => { let w = 0; for (let k = 0; k < n; k++) if (at(k)) w++; return w / n; };
  top = top && share(W, (x) => white(x, Math.min(H - 1, top + 3))) < 0.5 ? top : 0;
  bottom = bottom && share(W, (x) => white(x, Math.max(0, H - 1 - bottom - 3))) < 0.5 ? bottom : 0;
  left = left && share(H, (y) => white(Math.min(W - 1, left + 3), y)) < 0.5 ? left : 0;
  right = right && share(H, (y) => white(Math.max(0, W - 1 - right - 3), y)) < 0.5 ? right : 0;
  return { top, bottom, left, right, width: W, height: H };
}

/** Coupe les bandes blanches d'au moins 2 % (sans IA, gratuit) ; la photo reste telle quelle sinon. */
export async function trimPhotoBands(data: Buffer): Promise<Buffer> {
  try {
    const b = await photoBands(data);
    const min = (n: number, size: number) => n >= Math.max(4, size * 0.02);
    if (![min(b.top, b.height), min(b.bottom, b.height), min(b.left, b.width), min(b.right, b.width)].some(Boolean)) return data;
    const cut = (n: number, size: number) => (min(n, size) ? n + 2 : 0);
    const top = cut(b.top, b.height), bottom = cut(b.bottom, b.height), left = cut(b.left, b.width), right = cut(b.right, b.width);
    const width = b.width - left - right, height = b.height - top - bottom;
    if (width < b.width * 0.4 || height < b.height * 0.3) return data; // presque tout blanc : rien à sauver
    const jpeg = data[0] === 0xff && data[1] === 0xd8;
    const out = sharp(data).extract({ left, top, width, height });
    return jpeg ? out.jpeg({ quality: 92 }).toBuffer() : out.png().toBuffer();
  } catch { return data; }
}

/**
 * Contrôle gratuit des photos proposées : une photo à bandes blanches est remplacée par sa version recadrée (nouveau
 * fichier, l'ancien écarté), et les pages des maquettes en code qui l'utilisaient la reprennent. Une photo déjà
 * contrôlée n'est pas relue. Renvoie les remplacements faits (ancien → nouveau) et les pages changées.
 */
export async function repairPhotoBands(p: Project): Promise<{ replaced: Record<string, string>; pages: { direction: string; page: string }[] }> {
  const replaced: Record<string, string> = {};
  for (const ph of photoLibrary(p.id)) {
    if (ph.real) continue;
    const a = getAsset(ph.id);
    if (!a) continue;
    let meta: any = {};
    try { meta = a.meta ? JSON.parse(a.meta) : {}; } catch { meta = {}; }
    if (meta.bandsChecked) continue;
    const data = assetData(a);
    const trimmed = await trimPhotoBands(data);
    if (trimmed === data) { run("UPDATE assets SET meta=? WHERE id=?", JSON.stringify({ ...meta, bandsChecked: true }), a.id); continue; }
    const jpeg = trimmed[0] === 0xff && trimmed[1] === 0xd8;
    const copy = await saveAsset({ projectId: p.id, userId: p.userId, data: trimmed, name: a.name.replace(/(\.[a-z0-9]+)?$/i, "-recadree$1").replace(/\.png$/i, jpeg ? ".jpg" : ".png"), mime: jpeg ? "image/jpeg" : "image/png", role: "site", origin: "generated", meta: { ...meta, bandsChecked: true, trimmedFrom: a.id } });
    rejectPhotos(p.id, [a.id], "bandes blanches sur les bords (remplacée par sa version recadrée)");
    replaced[a.id] = copy.id;
  }
  const pages: { direction: string; page: string }[] = [];
  if (!Object.keys(replaced).length) return { replaced, pages };
  for (const key of ["A", "B", "C"]) {
    const code = loadDirectionCode(p.id, key);
    let changed = false;
    const next: DirectionCode = { ...code, pages: { ...code.pages } };
    for (const [page, cur] of Object.entries(code.pages)) {
      let html = cur.html;
      for (const [from, to] of Object.entries(replaced)) html = html.split(from).join(to);
      if (html !== cur.html) { next.pages[page] = { ...cur, html, previous: cur.html, at: Date.now() }; pages.push({ direction: key, page }); changed = true; }
    }
    if (changed) saveDirectionCode(p.id, key, next);
  }
  return { replaced, pages };
}
