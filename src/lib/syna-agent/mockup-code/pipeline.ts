/**
 * SINA (#492), étape 7 : site codé À L'IDENTIQUE de la maquette choisie. Toutes les dépendances (lecture des images,
 * écriture des sections, captures, comparaison, corrections, Theme Check, rendu) sont injectées : le déroulé est le
 * même en réel (deps.ts) et en test (simulé, aucun appel).
 *
 * Déroulé : lecture de chaque image (a) → correspondance des sections (b) → écriture page par page, en-tête et pied
 * d'abord → boucle par page : captures à la largeur de la maquette (c), comparaison locale gratuite + comparaison par
 * l'IA (d), corrections (e), au plus `maxRounds` tours et jamais au-delà du plafond de dépense → contrôles finaux (f) :
 * débordements à 5 largeurs, Theme Check, liens internes, SEO de base. Le rapport dit page par page ce qui est bon et
 * ce qui ne l'est pas : une page ratée n'est jamais présentée comme bonne.
 */
import sharp from "sharp";
import { applyOps, validateSpec, type ThemeOp } from "../../theme/ops";
import { addPage } from "../../theme/pages";
import { routeFor } from "../../theme/render";
import { cloneSpec, storeProducts, type ThemeSpec } from "../../theme/spec";
import type { ThemeCheckResult } from "../../theme/theme-check";
import { SEO_DESCRIPTION_MAX, SEO_TITLE_MAX } from "../../seo-limits";
import { mapSection, mergeViewports, type AnalyzedPage, type AnalyzedSection, type SectionRole, type SectionTarget } from "./analyze";
import { coverageOf, type MockupDirection } from "./mockup-set";
import { CHECK_WIDTHS, VIEWPORT_WIDTH, pageByKey, pageLayout, requiredPage, type MockupPage, type Viewport } from "./pages";
import type { PageCopy } from "./copy";
import { siteImagePrompt } from "./prompts";

export type PlannedSection = AnalyzedSection & { index: number; target: SectionTarget };
export type WriteResult = {
  ops: ThemeOp[]; written: string[]; library: string[]; failed: { name: string; reason: string }[];
  /** Types des sections du gabarit dans l'ordre de la maquette (remise en ordre après écriture). */
  order?: string[];
  /** Plafond de dépense atteint pendant l'écriture : le reste n'est pas fait. */
  budget?: boolean;
};
export type Shot = { image: Buffer; scrollWidth: number };
export type CallKind = "analyze" | "write" | "compare" | "fix";

export type Step7Deps = {
  /** Point de reprise (tâche) : une étape déjà faite n'est ni refaite ni repayée. */
  step<T>(key: string, fn: () => Promise<T>): Promise<T>;
  image(assetId: string): Promise<Buffer>;
  analyzeMockup(i: { imageId: string; image: Buffer; pages: MockupPage[]; viewport: Viewport }): Promise<AnalyzedPage[]>;
  writeSections(i: { spec: ThemeSpec; page: MockupPage; template: string; plan: PlannedSection[]; mockup: Buffer | null }): Promise<WriteResult>;
  /** null : navigateur de captures indisponible (la page est alors « non vérifiée », jamais « bonne »). */
  screenshot(i: { spec: ThemeSpec; path: string; width: number }): Promise<Shot | null>;
  compare(i: { page: MockupPage; viewport: Viewport; mockup: Buffer; shot: Buffer; local: number }): Promise<{ score: number; differences: string[] }>;
  fix(i: { spec: ThemeSpec; page: MockupPage; template: string; plan: PlannedSection[]; differences: string[]; mockup: Buffer | null }): Promise<WriteResult>;
  themeCheck(spec: ThemeSpec): Promise<ThemeCheckResult>;
  render(spec: ThemeSpec, path: string): Promise<{ html: string; status: number }>;
  /** Dépense déjà engagée par la tâche (micro-euros). */
  spentMicro(): number;
  /** Coût maximal d'un appel de chaque nature (devis : le plafond est vérifié AVANT chaque appel). */
  callMaxMicro: Record<CallKind, number>;
  /** Types de sections que le thème sait rendre (correspondance avec la bibliothèque). */
  available(spec: ThemeSpec): string[];
  /** Avancement montré au client (facultatif). */
  progress?(fraction: number, message: string): void;
};

/** Corrections automatiques d'une section refusée par les contrôles du Studio (avant la boucle de comparaison). */
export const SECTION_CORRECTIONS = 1;
/** Hypothèses du devis : sections par page, sections réécrites par tour de correction. */
export const ESTIMATE = { sectionsPerPage: 8, sectionsPerFix: 2 };

/**
 * Coût maximal de l'étape 7 (devis, plafond de la tâche) : lecture de chaque image, écriture de chaque page (avec sa
 * correction automatique), comparaison de chaque version à chaque tour, corrections entre les tours. Rien n'est
 * dépensé au-delà : le déroulé s'arrête avant l'appel qui dépasserait et le dit.
 */
export function step7MaxMicro(c: { images: number; pages: number; views: number; maxRounds?: number }, unit: Record<CallKind, number>): number {
  const rounds = c.maxRounds ?? DEFAULTS.maxRounds;
  return c.images * unit.analyze
    + c.pages * ESTIMATE.sectionsPerPage * (1 + SECTION_CORRECTIONS) * unit.write
    + c.views * rounds * unit.compare
    + c.pages * (rounds - 1) * ESTIMATE.sectionsPerFix * (1 + SECTION_CORRECTIONS) * unit.fix;
}

export type Step7Options = {
  maxRounds?: number;
  /** Note de l'IA (sur 10) exigée pour dire une page conforme : 8 (niveau FINAL de la charte). */
  passScore?: number;
  /** Ressemblance locale minimale (0 à 1) : garde-fou gratuit contre une note trop indulgente. */
  minLocal?: number;
  costCapMicro: number;
  /** Largeurs contrôlées pour les débordements (défaut : 1440, 768, 430, 390, 360). */
  overflowWidths?: readonly number[];
};

/**
 * ok : conforme à la maquette (note et ressemblance suffisantes, sans débordement) · a_corriger : écarts restants ·
 * maquette_manquante : page ou version sans image · non_verifiable : page que l'aperçu ne rend pas (comptes clients de
 * la plateforme…), à vérifier sur la plateforme · non_verifie : captures impossibles, rien n'a été comparé ·
 * budget_atteint : arrêtée par le plafond · echec : page illisible sur la maquette · derivee : page simple sans image à
 * elle, codée dans le style de la maquette (structure de boutique, textes écrits), contrôlée sans comparaison.
 */
export type PageStatus = "ok" | "a_corriger" | "maquette_manquante" | "derivee" | "non_verifiable" | "non_verifie" | "budget_atteint" | "echec";
export type PageReport = {
  key: string; label: string; status: PageStatus; path: string | null;
  scores: { viewport: Viewport; round: number; score: number; local: number }[];
  differences: string[]; written: string[]; library: string[]; failed: { name: string; reason: string }[];
  overflow: number[]; seo: string[]; brokenLinks: string[]; note?: string;
};
const slug = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
/** Type stable d'une section sur mesure (même type à la correction : la section est réécrite, pas dupliquée). */
export const customType = (page: Pick<MockupPage, "key">, s: Pick<PlannedSection, "index" | "target">) =>
  s.target.kind === "group" ? `es-custom-${s.target.group}-maquette` : `es-custom-${slug(page.key).slice(0, 24) || "page"}-${s.index + 1}`;

/**
 * Emplacement d'image du site codé (demande du propriétaire du 8 novembre : « OpenAI devra refaire toutes les images du
 * thème en haute résolution pour les inclure, et que ce soit comme les maquettes ») : où il est dans le thème (gabarit,
 * type de section, rang de l'image dans la section) et où le voir sur la maquette (image, zone), pour le recréer.
 */
export type ImageSlot = { page: string; section: string; template: string; type: string; index: number; imageId?: string; box?: { x: number; y: number; w: number; h: number }; ratio?: string; description: string; prompt: string };

export type Step7Report = {
  ok: boolean;
  pages: PageReport[];
  themeCheck: { available: boolean; errors: string[] };
  duplicates: { titles: string[]; descriptions: string[] };
  imageSlots: ImageSlot[];
  stoppedBy: "budget" | null;
  spentMicro: number;
  summary: string;
};

/* ---------------------------------------------------------------- comparaison locale (gratuite) */

const GRID = { w: 24, h: 48 };
/** Zone d'une page sur l'image de maquette (fractions) ; l'image entière si la zone est absente ou absurde. */
export async function cropRegion(image: Buffer, region?: { x: number; y: number; w: number; h: number }): Promise<Buffer> {
  if (!region || region.w < 0.02 || region.h < 0.02) return image;
  const m = await sharp(image).metadata();
  const W = m.width ?? 0, Hh = m.height ?? 0;
  const left = Math.max(0, Math.min(W - 1, Math.round(region.x * W))), top = Math.max(0, Math.min(Hh - 1, Math.round(region.y * Hh)));
  const width = Math.max(1, Math.min(W - left, Math.round(region.w * W))), height = Math.max(1, Math.min(Hh - top, Math.round(region.h * Hh)));
  return sharp(image).extract({ left, top, width, height }).png().toBuffer();
}

/**
 * Ressemblance locale de deux images (0 à 1) : structure (niveaux de gris sur une grille 24 × 48, les deux images
 * ramenées au même cadre) et couleurs dominantes (histogramme grossier). Indicatif et gratuit : il repère un écart
 * grossier (mauvais fond, sections dans le désordre) ; seule la comparaison détaillée dit « identique ».
 */
export async function localSimilarity(a: Buffer, b: Buffer): Promise<number> {
  const grey = (x: Buffer) => sharp(x).resize(GRID.w, GRID.h, { fit: "fill" }).greyscale().raw().toBuffer();
  const rgb = (x: Buffer) => sharp(x).resize(16, 32, { fit: "fill" }).removeAlpha().raw().toBuffer();
  const [ga, gb, ca, cb] = await Promise.all([grey(a), grey(b), rgb(a), rgb(b)]);
  let d = 0;
  for (let i = 0; i < ga.length; i++) d += Math.abs(ga[i] - gb[i]);
  const structure = 1 - d / (ga.length * 255);
  const hist = (px: Buffer) => {
    const h = new Array(64).fill(0);
    for (let i = 0; i < px.length; i += 3) h[(px[i] >> 6) * 16 + (px[i + 1] >> 6) * 4 + (px[i + 2] >> 6)]++;
    return h.map((v) => v / (px.length / 3));
  };
  const ha = hist(ca), hb = hist(cb);
  const colour = ha.reduce((s, v, i) => s + Math.min(v, hb[i]), 0);
  return Math.round((0.6 * structure + 0.4 * colour) * 1000) / 1000;
}

/* ---------------------------------------------------------------- pages du thème */

/** Adresse et gabarit d'une page dans le thème ; crée la page (vide) si elle manque. Fonction pure. */
export function resolveTarget(spec: ThemeSpec, page: MockupPage): { spec: ThemeSpec; template: string; path: string | null } {
  const first = storeProducts(spec)[0];
  if (page.template === "product") return { spec, template: "product", path: first ? `/products/${first.handle}` : null };
  if (page.template.startsWith("product.")) {
    // Autre type de produit : sa propre mise en page (copie de la fiche commune), affichée par les produits qui y sont reliés.
    const out = spec.templates[page.template] ? spec : cloneSpec(spec);
    out.templates[page.template] ??= JSON.parse(JSON.stringify(spec.templates.product ?? { sections: {}, order: [] }));
    const linked = storeProducts(out).find((p) => p.template_suffix === page.template.slice(8));
    return { spec: out, template: page.template, path: linked ? `/products/${linked.handle}` : null };
  }
  if (page.key === "category") {
    const c = spec.store.collections?.[0];
    return { spec, template: "collection", path: c ? `/collections/${c.handle}` : null };
  }
  if (page.template.startsWith("page.") && page.handle) {
    // Page déjà posée par le moteur natif (gabarit « page.faq », « page.about »…) : reprise, jamais en double.
    const found = spec.store.pages.find((p) => p.handle === page.handle) ?? spec.store.pages.find((p) => p.template_suffix === page.key || p.handle === page.key);
    if (found) return { spec, template: found.template_suffix ? `page.${found.template_suffix}` : "page", path: `/pages/${found.handle}` };
    const r = addPage(spec, { title: page.fr, handle: page.handle, template: { sections: {}, order: [] }, model: "syna-maquette", inNav: !!page.nav });
    const created = r.spec.store.pages.find((p) => p.handle === r.handle)!;
    return { spec: r.spec, template: `page.${created.template_suffix}`, path: `/pages/${created.handle}` };
  }
  return { spec, template: page.template, path: page.path };
}

const ESSENTIAL = /^main-(product|cart|search|collection|list-collections|blog|article|password)$/;
/** Gabarit vidé avant d'y poser les sections écrites : restent les sections fonctionnelles (plan et « main-* »). */
export function clearTemplate(spec: ThemeSpec, template: string, keepTypes: string[]): ThemeSpec {
  const c = spec.templates[template];
  if (!c) return spec;
  const out = cloneSpec(spec);
  // Les sections qui font fonctionner la page (achat, panier, recherche, collections, blog) restent toujours.
  const keep = c.order.filter((sid) => keepTypes.includes(c.sections[sid]?.type ?? "") || ESSENTIAL.test(c.sections[sid]?.type ?? ""));
  out.templates[template] = { ...c, sections: Object.fromEntries(keep.map((sid) => [sid, c.sections[sid]])), order: keep };
  return out;
}

/** Remet les sections du gabarit dans l'ordre de la maquette (par type, dans l'ordre du plan). */
export function orderLike(spec: ThemeSpec, template: string, types: string[]): ThemeSpec {
  const c = spec.templates[template];
  if (!c) return spec;
  const rank = (sid: string) => { const i = types.indexOf(c.sections[sid]?.type ?? ""); return i < 0 ? types.length : i; };
  const out = cloneSpec(spec);
  out.templates[template].order = [...c.order].sort((a, b) => rank(a) - rank(b));
  return out;
}

/* ---------------------------------------------------------------- contrôles finaux (gratuits) */

const BASE = "/p";
const PLATFORM = /^\/(account|checkout|cart\/|apps\/|services\/|tools\/|localization)/;

export function internalLinks(html: string): string[] {
  const out = new Set<string>();
  for (const m of html.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"'#][^"']*)["']/gi)) {
    let h = m[1].trim();
    if (/^(https?:|mailto:|tel:|javascript:|\/\/)/i.test(h)) continue;
    if (h.startsWith(BASE + "/") || h === BASE) h = h.slice(BASE.length) || "/";
    if (h.startsWith("/")) out.add(h);
  }
  return [...out];
}

/** Liens internes qui mènent à une page introuvable (adresse résolue comme dans l'aperçu et dans Shopify). */
export function brokenLinks(spec: ThemeSpec, links: string[]): string[] {
  return links.filter((l) => {
    const u = new URL(l, "http://x");
    if (PLATFORM.test(u.pathname)) return false;
    return routeFor(spec, u.pathname, u.searchParams).status === 404;
  });
}

const textOf = (s: string) => s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
/** Règles SEO de base sur une page rendue (charte § 4) ; renvoie les manques en français. */
export function seoIssues(html: string, page: MockupPage): { issues: string[]; title: string; description: string } {
  const issues: string[] = [];
  const title = textOf(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
  const description = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i)?.[1]?.trim() ?? "";
  if (!title) issues.push("titre de page absent");
  else if (title.length > SEO_TITLE_MAX + 10) issues.push(`titre trop long (${title.length} caractères, ${SEO_TITLE_MAX} visés)`);
  if (!description) issues.push("méta-description absente");
  else if (description.length < 120 || description.length > SEO_DESCRIPTION_MAX + 5) issues.push(`méta-description de ${description.length} caractères (120 à 160 visés)`);
  const h1 = (html.match(/<h1\b/gi) ?? []).length;
  if (h1 !== 1) issues.push(h1 ? `${h1} titres H1 (un seul attendu)` : "aucun titre H1");
  const noAlt = [...html.matchAll(/<img\b[^>]*>/gi)].filter((m) => !/\balt\s*=/.test(m[0])).length;
  if (noAlt) issues.push(`${noAlt} image(s) sans texte alternatif`);
  const ld = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]).join(" ");
  const need: string[] = page.key === "home" ? ["Organization|LocalBusiness|Restaurant|HairSalon|Electrician|Store"] : page.template.startsWith("product") ? ["Product", "BreadcrumbList"] : page.key === "faq" ? ["FAQPage"] : page.template === "article" ? ["Article|BlogPosting"] : [];
  for (const n of need) if (!new RegExp(`"@type"\\s*:\\s*"(${n})"`).test(ld)) issues.push(`données structurées ${n.split("|")[0]} absentes`);
  return { issues, title, description };
}

/* ---------------------------------------------------------------- déroulé */

const DEFAULTS = { maxRounds: 3, passScore: 8, minLocal: 0.55 };

/**
 * Étape 7 complète sur une maquette choisie. `base` : thème de départ (pages, produits reliés à l'onglet Produits,
 * menus) ; il n'est jamais modifié, le résultat est un nouveau spec.
 */
/** Lecture « dérivée » d'une page simple sans image : sections de l'inventaire, structure de boutique, textes écrits. */
export function derivedAnalysis(page: MockupPage, copy?: PageCopy | null): AnalyzedPage {
  const lay = pageLayout(page) ?? "dans le style des pages de la maquette";
  const roleOf = (name: string): SectionRole => /en-t[êe]te/i.test(name) ? "header" : /pied de page/i.test(name) ? "footer" : page.group === "legal" ? "legal" : page.group === "compte" ? "compte"
    : /panier|lignes/i.test(name) ? "panier" : /recherche|résultats/i.test(name) ? "recherche" : /formulaire/i.test(name) ? "formulaire" : /questions|accordéon/i.test(name) ? "questions" : /message/i.test(name) ? "message" : /grille/i.test(name) ? "grille" : "texte";
  return {
    page: page.key, region: { x: 0, y: 0, w: 1, h: 1 },
    sections: page.sections.map((name, i) => {
      const c = copy?.sections[i];
      const texts = c ? [...(c.title ? [{ kind: "titre" as const, text: c.title }] : []), ...(c.text ? [{ kind: "paragraphe" as const, text: c.text }] : []), ...c.items.flatMap((x) => [{ kind: "sous-titre" as const, text: x.title }, ...(x.text ? [{ kind: "paragraphe" as const, text: x.text }] : [])]), ...(c.button ? [{ kind: "bouton" as const, text: c.button }] : [])] : [];
      return { role: roleOf(name), name: name.slice(0, 25), layout: `structure : ${lay} ; partie : ${name}`, texts: texts.slice(0, 40), images: [], colors: {} };
    }),
    notes: "page dérivée : aucune image de maquette",
  };
}

export async function runStep7(input: { direction: MockupDirection; pages: MockupPage[]; base: ThemeSpec; options: Step7Options; copy?: Record<string, PageCopy> | null }, deps: Step7Deps): Promise<{ spec: ThemeSpec; report: Step7Report }> {
  const o = { ...DEFAULTS, overflowWidths: CHECK_WIDTHS, ...input.options };
  const pages = input.pages;
  const reports = new Map<string, PageReport>(pages.map((p) => [p.key, { key: p.key, label: p.fr, status: "echec" as PageStatus, path: null, scores: [], differences: [], written: [], library: [], failed: [], overflow: [], seo: [], brokenLinks: [] }]));
  const rep = (k: string) => reports.get(k)!;
  let stoppedBy: Step7Report["stoppedBy"] = null;
  /** Le plafond est vérifié AVANT chaque appel payant : jamais d'appel lancé sans la place de son coût maximal. */
  const canPay = (k: CallKind) => {
    if (deps.spentMicro() + deps.callMaxMicro[k] <= o.costCapMicro) return true;
    stoppedBy = "budget";
    return false;
  };
  const budget = () => { stoppedBy = "budget"; };
  /** Plafond dur de la tâche atteint pendant un appel (garde-fou du fournisseur) : arrêt propre, rien de plus n'est payé. */
  const capped = async <T,>(fn: () => Promise<T>): Promise<T | null> => {
    try {
      return await fn();
    } catch (e) {
      if ((e as Error)?.name !== "CostCapReached") throw e;
      stoppedBy = "budget";
      return null;
    }
  };

  // Pages sans image de maquette : signalées, jamais inventées.
  const cov = coverageOf(input.direction, pages);
  for (const m of cov.missing) {
    const r = rep(m.page);
    if (!input.direction.images.some((i) => i.status === "ready" && i.pages.includes(m.page))) { r.status = "maquette_manquante"; r.note = "aucune image de la maquette ne montre cette page"; }
  }

  const say = (f: number, m: string) => deps.progress?.(f, m);
  // (a) Lecture de chaque image (une fois, point de reprise par image).
  say(0.05, "Lecture de la maquette");
  const mockups = new Map<string, Buffer>();
  const analyses = new Map<string, { desktop?: AnalyzedPage; phone?: AnalyzedPage }>();
  for (const img of input.direction.images.filter((i) => i.status === "ready" && i.assetId)) {
    const data = await deps.image(img.assetId!);
    mockups.set(img.id, data);
    const list = img.pages.map((k) => pageByKey(pages, k)).filter((x): x is MockupPage => !!x);
    if (!canPay("analyze")) break;
    const read = await capped(() => deps.step(`analyze:${img.id}`, () => deps.analyzeMockup({ imageId: img.id, image: data, pages: list, viewport: img.viewport })));
    if (!read) break;
    for (const a of read) analyses.set(a.page, { ...analyses.get(a.page), [img.viewport]: { ...a, viewport: img.viewport, imageId: img.id } });
  }
  const crop = async (key: string, v: Viewport): Promise<Buffer | null> => {
    const a = analyses.get(key)?.[v];
    const img = a?.imageId ? mockups.get(a.imageId) : undefined;
    return img ? cropRegion(img, a!.region) : null;
  };

  // (b) Correspondance et écriture : accueil d'abord (en-tête et pied de page), puis les autres pages ; une variante
  // (panier vide, recherche sans résultat) partage le gabarit de sa page et n'est pas réécrite.
  let spec = cloneSpec(input.base);
  const plans = new Map<string, { template: string; path: string | null; plan: PlannedSection[] }>();
  const ordered = [...pages].sort((a, b) => (a.key === "home" ? -1 : b.key === "home" ? 1 : 0));
  let groupsWritten = false;
  say(0.2, "Écriture des pages d'après la maquette");
  for (const page of ordered) {
    const r = rep(page.key);
    const t = resolveTarget(spec, page);
    spec = t.spec;
    r.path = t.path;
    const derived = !requiredPage(page) && !analyses.has(page.key) && !input.direction.images.some((i) => i.status === "ready" && i.pages.includes(page.key));
    const analysis = mergeViewports(analyses.get(page.key)?.desktop, analyses.get(page.key)?.phone) ?? (derived ? derivedAnalysis(page, input.copy?.[page.key]) : undefined);
    if (!analysis) continue;
    const available = deps.available(spec);
    const plan = analysis.sections
      .map((s, index) => ({ ...s, index, target: mapSection(s, page, available) }))
      .filter((s) => s.target.kind !== "group" || !groupsWritten);
    plans.set(page.key, { template: t.template, path: t.path, plan });
    if (page.variantOf && plans.has(page.variantOf)) { r.note = `même gabarit que « ${pageByKey(pages, page.variantOf)?.fr} »`; if (derived) r.status = "derivee"; continue; }
    if (page.template.startsWith("customers/")) { r.status = "non_verifiable"; r.note = "gabarit des comptes clients de la plateforme, au style du thème ; non rendu par l'aperçu du Studio"; continue; }
    if (!canPay("write")) { r.status = "budget_atteint"; continue; }
    const res = await deps.step(`write:${page.key}`, async () => deps.writeSections({ spec, page, template: t.template, plan, mockup: await crop(page.key, "desktop") }));
    // Le gabarit n'est vidé que si la page a bien été écrite (sinon il reste tel quel, et le rapport le dit).
    if (res.written.length) spec = clearTemplate(spec, t.template, plan.filter((s) => s.target.kind === "library").map((s) => (s.target as { type: string }).type));
    spec = applyWrite(spec, res, r, budget);
    if (plan.some((s) => s.target.kind === "group")) groupsWritten = true;
    if (res.order?.length) spec = orderLike(spec, t.template, res.order);
    if (derived && (res.written.length || res.library.length)) { r.status = "derivee"; r.note = `codée dans le style de la maquette, sans image à elle${input.copy?.[page.key] ? "" : " (textes à écrire : « [À compléter] »)"}`; }
  }

  // (c, d, e) Boucle de contrôle par page : captures à la largeur de la maquette, comparaison, corrections.
  say(0.6, "Comparaison du site à la maquette");
  for (const page of ordered) {
    const r = rep(page.key), info = plans.get(page.key);
    if (r.status === "maquette_manquante" || r.status === "derivee" || r.status === "non_verifiable" || r.status === "budget_atteint") continue;
    if (!info) { r.status = stoppedBy ? "budget_atteint" : "echec"; r.note = stoppedBy ? "lecture de la maquette non faite : budget atteint" : "maquette illisible : la page n'a pas pu être lue sur l'image"; continue; }
    if (!info.path) { r.status = "non_verifiable"; r.note ??= "page non rendue par l'aperçu du Studio (à vérifier sur la plateforme)"; continue; }
    const views = page.viewports.filter((v) => analyses.get(page.key)?.[v]);
    let done = false;
    for (let round = 1; round <= o.maxRounds && !done; round++) {
      const diffs: string[] = [];
      let pass = true, measured = 0;
      for (const v of views) {
        const shot = await deps.screenshot({ spec, path: info.path, width: VIEWPORT_WIDTH[v] });
        const mock = await crop(page.key, v);
        if (!shot || !mock) { pass = false; r.note = "captures indisponibles : page non vérifiée"; continue; }
        if (!canPay("compare")) { pass = false; break; }
        const local = await localSimilarity(mock, shot.image);
        const ai = await capped(() => deps.step(`compare:${page.key}:${v}:${round}`, () => deps.compare({ page, viewport: v, mockup: mock, shot: shot.image, local })));
        if (!ai) { pass = false; break; }
        measured++;
        r.scores.push({ viewport: v, round, score: ai.score, local });
        if (ai.score < o.passScore || local < o.minLocal) { pass = false; diffs.push(...ai.differences.map((d) => `${v === "desktop" ? "ordinateur" : "téléphone"} : ${d}`)); }
      }
      r.differences = diffs;
      if (pass && measured === views.length && measured > 0) { r.status = "ok"; done = true; break; }
      if (!measured) { r.status = stoppedBy ? "budget_atteint" : "non_verifie"; break; }
      if (round === o.maxRounds) { r.status = "a_corriger"; break; }
      if (page.variantOf || !canPay("fix")) { r.status = stoppedBy ? "budget_atteint" : "a_corriger"; break; }
      const res = await deps.step(`fix:${page.key}:${round}`, async () => deps.fix({ spec, page, template: info.template, plan: info.plan, differences: diffs, mockup: await crop(page.key, "desktop") }));
      const before = JSON.stringify(spec.customSections);
      spec = applyWrite(spec, res, r, budget);
      if (JSON.stringify(spec.customSections) === before && !res.ops.length) { r.status = "a_corriger"; r.note = "aucune correction applicable"; break; }
    }
    if (r.status === "echec" && stoppedBy) r.status = "budget_atteint";
    // Une version (ordinateur ou téléphone) absente de la maquette n'a pas été comparée : jamais « conforme ».
    const absent = cov.missing.filter((m) => m.page === page.key).map((m) => (m.viewport === "desktop" ? "ordinateur" : "téléphone"));
    if (absent.length && r.status === "ok") { r.status = "maquette_manquante"; r.note = `version ${absent.join(" et ")} absente de la maquette : non comparée`; }
  }

  // (f) Contrôles finaux gratuits : débordements, liens, SEO, Theme Check.
  say(0.9, "Contrôles finaux : largeurs, liens, SEO, Theme Check");
  const titles = new Map<string, string[]>(), descriptions = new Map<string, string[]>();
  for (const page of ordered) {
    const r = rep(page.key), path = plans.get(page.key)?.path ?? r.path;
    if (!path) continue;
    for (const w of o.overflowWidths) {
      const s = await deps.screenshot({ spec, path, width: w });
      if (s && s.scrollWidth > w + 1) r.overflow.push(w);
    }
    if (r.overflow.length && r.status === "ok") { r.status = "a_corriger"; r.differences.push(`débordement horizontal à ${r.overflow.join(", ")} px`); }
    const html = await deps.render(spec, path);
    r.brokenLinks = brokenLinks(spec, internalLinks(html.html));
    const seo = seoIssues(html.html, page);
    r.seo = seo.issues;
    if (seo.title) titles.set(seo.title, [...(titles.get(seo.title) ?? []), page.key]);
    if (seo.description) descriptions.set(seo.description, [...(descriptions.get(seo.description) ?? []), page.key]);
  }
  const tc = await deps.themeCheck(spec);
  const tcErrors = tc.errors.map((e) => `${e.file}${e.line ? ` (ligne ${e.line})` : ""} : ${e.check} — ${e.message}`);
  const dup = (m: Map<string, string[]>) => [...m.entries()].filter(([, v]) => v.length > 1).map(([k, v]) => `« ${k} » (${v.join(", ")})`);

  const imageSlots: ImageSlot[] = [...plans.entries()].flatMap(([key, x]) => {
    const page = pageByKey(pages, key)!, read = analyses.get(key)?.desktop ?? analyses.get(key)?.phone;
    return x.plan.filter((s) => s.target.kind !== "library").flatMap((s) => s.images.map((img, index) => ({
      page: key, section: s.name, template: s.target.kind === "group" ? `group:${s.target.group}` : x.template, type: customType(page, s), index,
      ...(read?.imageId ? { imageId: read.imageId } : {}), ...(img.box ? { box: img.box } : {}), ...(img.ratio ? { ratio: img.ratio } : {}),
      description: img.description, prompt: siteImagePrompt(img, { name: input.base.store.shopName, business: input.base.store.business ?? "products" }),
    })));
  });
  const list = pages.map((p) => rep(p.key));
  const blocking = list.filter((r) => !["ok", "derivee", "non_verifiable"].includes(r.status) || r.brokenLinks.length || r.seo.length);
  const ok = !blocking.length && tc.available && !tcErrors.length && !dup(titles).length && !dup(descriptions).length && !stoppedBy;
  const count = (s: PageStatus) => list.filter((r) => r.status === s).length;
  const summary = [
    `${count("ok")} page(s) conforme(s) à la maquette sur ${list.length}`,
    count("a_corriger") ? `${count("a_corriger")} à corriger` : "",
    count("maquette_manquante") ? `${count("maquette_manquante")} sans maquette` : "",
    count("derivee") ? `${count("derivee")} page(s) simple(s) codée(s) dans le style de la maquette (sans image à elles)` : "",
    count("non_verifiable") ? `${count("non_verifiable")} à vérifier sur la plateforme` : "",
    count("non_verifie") ? `${count("non_verifie")} non vérifiée(s) (captures impossibles)` : "",
    count("budget_atteint") ? `${count("budget_atteint")} non faite(s) : budget atteint` : "",
    count("echec") ? `${count("echec")} en échec` : "",
    tc.available ? (tcErrors.length ? `Theme Check : ${tcErrors.length} erreur(s)` : "Theme Check sans erreur") : "Theme Check indisponible (non contrôlé)",
  ].filter(Boolean).join(" ; ");
  return { spec, report: { ok, pages: list, themeCheck: { available: tc.available, errors: tcErrors }, duplicates: { titles: dup(titles), descriptions: dup(descriptions) }, imageSlots, stoppedBy, spentMicro: deps.spentMicro(), summary } };
}

/** Applique les opérations d'une écriture ou d'une correction ; refus et validation du thème notés dans le rapport. */
function applyWrite(spec: ThemeSpec, res: WriteResult, r: PageReport, onBudget: () => void): ThemeSpec {
  if (res.budget) onBudget();
  r.written.push(...res.written.filter((w) => !r.written.includes(w)));
  r.library.push(...res.library.filter((w) => !r.library.includes(w)));
  r.failed.push(...res.failed);
  if (!res.ops.length) return spec;
  const a = applyOps(spec, res.ops, { overrideLocks: true });
  for (const x of a.rejected) r.failed.push({ name: x.op.op, reason: x.reason });
  const problems = validateSpec(a.spec);
  if (problems.length) { r.failed.push({ name: "validation du thème", reason: problems.slice(0, 3).join(" ; ") }); return spec; }
  return a.spec;
}
