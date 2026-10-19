/**
 * Theme Engine V2 — orchestration :
 *   PROJECT BRAIN → WEBSITE INTENT → ART DIRECTION → DESIGN SYSTEM → CONTENT & ASSETS → PAGE PLANNER
 *   → SECTION COMPOSITION → THEME GENERATION (ThemeSpec Shopify OS 2.0) → (aperçu, éditeur, export existants).
 * Réutilise : composition de base du moteur existant (gabarits obligatoires, fiche produit, panier, catalogue),
 * médias de la bibliothèque (Image Engine V2 compris ; médias refusés ou non utilisables exclus par `collectImages`),
 * faits vérifiés du SEO Engine V2, textes de la boutique, verrous de marque du Project Brain.
 * 100 % local : aucun appel d'IA, aucune dépense.
 */
import { homeSeoDoc } from "../seo-v2/theme-copy";
import { deliverContent } from "../seo-v2/theme-delivery";
import { currentTheme, loadProject, saveThemeVersion, setStatus } from "../projects";
import { all } from "../db";
import type { JobContext } from "../jobs";
import { validateSpec } from "../theme/ops";
import { gateMeta, saveCheck } from "../quality/store";
import { L, inBothLangs } from "../i18n-server";
import type { Bi } from "../step-notes";
import { checkThemeV2 } from "./quality";
import { isDark } from "../color";
import { composeShop, collectImages, savedCopy } from "../engine/shop";
import { localCopy } from "../engine/local-copy";
import { cloneSpec, storeProducts, type ThemeSpec } from "../theme/spec";
import { tidyComposition } from "../theme/tidy";
import { websiteIntent, type WebsiteIntent } from "./intent";
import { artDirection, type ArtDirection, type LanguageId } from "./art-direction";
import { designSettings } from "./design-system";
import { siteContent, type SiteContent } from "./content";
import { compose, type PagePlan } from "./compose";
import { bindProductContent, stampProductContent } from "../theme/product-content";

export const THEME_ENGINE_V2_VERSION = "10a.1";

export type ThemeV2Result = { spec: ThemeSpec; intent: WebsiteIntent; art: ArtDirection; content: SiteContent; plan: PagePlan[] };

export async function composeThemeV2(projectId: string, opts: { language?: LanguageId; ctx?: JobContext | null } = {}): Promise<ThemeV2Result> {
  // Base : composition existante (gabarits obligatoires, fiche produit, panier, catalogue, médias). Dans une tâche,
  // les médias manquants des variantes et du catalogue sont préparés comme avant ; sinon rien n'est généré.
  const { p, spec: base } = await composeShop(projectId, undefined, opts.ctx ?? null, !!opts.ctx);
  const intent = websiteIntent(p);
  const art = artDirection(p, intent, opts);
  const copy = savedCopy(projectId) ?? localCopy(p.product, p.brand!, p);
  const { slots, gallery, files } = collectImages(projectId);
  // Site de services : les photos du marchand ont été placées par la composition de base (mêmes emplacements).
  const images = { ...slots, ...(base.store.business === "services" ? pickServiceSlots(base) : {}) };
  // Site de services : sa galerie, ce sont ses photos (les vôtres d'abord, puis les photos libres du métier).
  const servicePhotos = base.store.business === "services" ? Object.keys(base.files).filter((f) => /^es-photo-\d/.test(f)) : null;
  const content = siteContent(p, intent, copy, images, servicePhotos ?? gallery, homeSeoDoc(projectId, intent.lang));
  content.wide = wideFiles(files);
  const shop = intent.site === "shop_mono" || intent.site === "shop_multi";
  const mainProduct = storeProducts(base).find((x) => x.contentTarget === "product:main");
  const mainTemplate = mainProduct?.template_suffix ? base.templates[`product.${mainProduct.template_suffix}`] ?? base.templates.product : base.templates.product;
  const c = compose(intent, art, content, shop ? mainProduct?.handle ?? base.store.product.handle : null, shop ? structuredClone(mainTemplate) : null, { collections: base.store.collections ?? [], products: shop ? storeProducts(base) : [] });

  const spec = cloneSpec(base);
  spec.direction = base.direction;
  spec.settings = { ...base.settings, ...designSettings(art) };
  // Thème : gabarits du plan (accueil, pages, fiche produit) ; les autres gabarits obligatoires restent ceux de base.
  for (const [k, t] of Object.entries(c.templates)) spec.templates[k] = t;
  // En-tête : sans bandeau d'annonce (aucune offre réelle à annoncer) ; réglages du langage visuel.
  const hg = spec.groups.header;
  for (const id of [...hg.order]) if (hg.sections[id].type === "announcement-bar") {
    delete hg.sections[id];
    hg.order = hg.order.filter((x) => x !== id);
  }
  const headerId = hg.order.find((id) => hg.sections[id].type === "header");
  if (headerId) hg.sections[headerId].settings = { ...hg.sections[headerId].settings, ...c.header };
  const fg = spec.groups.footer;
  const footerId = fg.order.find((id) => fg.sections[id].type === "footer");
  if (footerId) {
    const f = fg.sections[footerId];
    f.settings = { ...f.settings, ...c.footer };
    f.blocks = Object.fromEntries(c.footerBlocks.map((b, i) => [`v2_${b.type}_${i + 1}`, { type: b.type, settings: b.settings }]));
    f.block_order = c.footerBlocks.map((b, i) => `v2_${b.type}_${i + 1}`);
  }
  // Langage sombre sans version claire du logo : le nom s'affiche en texte (un logo foncé sur fond foncé serait illisible).
  if (art.palette.bg && isDark(art.palette.bg) && !slots.logoLight) {
    spec.settings.logo_asset = "";
    if (footerId) fg.sections[footerId].settings.logo_asset = "";
  }
  // SaaS : ni panier ni fiche produit dans le parcours (le gabarit produit reste présent pour la validité Shopify).
  if (intent.site === "saas") spec.settings.cart_type = "none";
  spec.store = { ...spec.store, seo: content.seo, pages: c.pages, menus: { ...spec.store.menus, ...c.menus } };
  if (shop && content.descriptionHtml) spec.store.product = { ...spec.store.product, description_html: content.descriptionHtml };
  const contentDelivery = deliverContent(spec, p, intent.lang);
  spec.meta = {
    engine: "v2",
    v2: {
      version: THEME_ENGINE_V2_VERSION,
      site: intent.site,
      conversion: intent.conversion,
      reasons: intent.reasons,
      language: art.language,
      languageLabel: art.label,
      scores: art.scores,
      art: { mood: art.mood, rhythm: art.rhythm, photoStyle: art.photoStyle, graphicLanguage: art.graphicLanguage, ctaStyle: art.ctaStyle, palette: art.palette, typography: art.typography, density: art.density, motion: art.motion },
      hero: c.hero,
      plan: c.plan,
      todo: content.todo,
      secondary: c.secondary,
      demoMedia: false,
    },
  };
  // Trace limitée aux identifiants et empreintes, jamais aux consignes ni aux données client.
  (spec.meta as typeof spec.meta & { contentDelivery?: typeof contentDelivery }).contentDelivery = contentDelivery;
  if (shop) bindProductContent(spec, p, c.templates.product);
  const tidied = tidyComposition(spec, { strictAssets: true });
  stampProductContent(tidied);
  return { spec: tidied, intent, art, content, plan: c.plan };
}

/** Fichiers du thème dont l'image est en format paysage (dimensions enregistrées dans la bibliothèque). */
function wideFiles(files: Record<string, string>): string[] {
  const ids = Object.values(files);
  if (!ids.length) return [];
  const rows = all<{ id: string; width: number | null; height: number | null }>(`SELECT id, width, height FROM assets WHERE id IN (${ids.map(() => "?").join(",")})`, ...ids);
  const wide = new Set(rows.filter((r) => r.width && r.height && r.width >= r.height * 1.3).map((r) => r.id));
  return Object.entries(files).filter(([, id]) => wide.has(id)).map(([f]) => f);
}

/** Emplacements photo d'un site de services déjà résolus par la composition de base (photos réelles du marchand). */
function pickServiceSlots(spec: ThemeSpec): Record<string, string> {
  const files = Object.keys(spec.files).filter((f) => /^es-photo-\d/.test(f));
  const order = ["lifestyle", "scene1", "scene2", "scene3", "detail1", "detail2", "lifestyle2"];
  return Object.fromEntries(files.slice(0, order.length).map((f, i) => [order[i], f]));
}

export { loadProject };

/** Libellés anglais des langages visuels (le français est dans LANGUAGES). */
export const LANGUAGE_LABEL_EN: Record<LanguageId, string> = { craft: "Precise workshop", maison: "Editorial house", precision: "Technical precision", bistro: "Bistro", product: "Digital product" };

/**
 * Construction d'une version du site par le Theme Engine V2 (création, « nouvelle composition », changement de
 * langage visuel) : 100 % local, aucune dépense. Verdict de qualité `theme_v2` : au mieux PROVISOIRE tant que le
 * propriétaire n'a pas validé le rendu.
 */
export async function buildShopV2(ctx: JobContext | null, projectId: string, opts: { language?: LanguageId; summary?: Bi } = {}) {
  const parent = currentTheme(projectId)?.version.id ?? null;
  ctx?.progress(0.2, L("Composition du site", "Composing the website"));
  const r = await composeThemeV2(projectId, { language: opts.language, ctx });
  const problems = validateSpec(r.spec);
  if (problems.length) throw new Error(L(`Thème invalide : ${problems.join(" ; ")}`, `Invalid theme: ${problems.join("; ")}`));
  const q = checkThemeV2(r.spec, r.plan);
  const p = loadProject(projectId);
  const qcId = saveCheck(q.decision, { userId: p.userId, projectId, jobId: ctx?.job.id ?? null, candidateId: `theme-v2:${projectId}:${r.art.language}` });
  const incomplete = r.plan.filter((x) => !x.complete).length;
  const summary: Bi = opts.summary ?? inBothLangs(() => L(
    `Site composé — ${r.art.label}${incomplete ? ` · ${incomplete} page(s) à compléter` : ""} · à valider par vous`,
    `Website composed — ${LANGUAGE_LABEL_EN[r.art.language]}${incomplete ? ` · ${incomplete} page(s) to complete` : ""} · for your review`,
  ));
  ctx?.progress(0.9, L("Conservation du thème et de son contrôle", "Saving the theme and its check"));
  const conflict = (currentTheme(projectId)?.version.id ?? null) !== parent;
  const rejected = q.decision.verdict === "REJECTED" || q.decision.verdict === "RETRY";
  const v = saveThemeVersion(projectId, r.spec, JSON.stringify(summary), "system", { checks: L(["structure", "sections remplies", "contrastes", "pages et données à compléter"], ["structure", "filled sections", "contrast", "pages and data to complete"]), problems, gate: gateMeta(q.decision, qcId) }, parent, { activate: !conflict && !rejected });
  const active = currentTheme(projectId)?.version.id === v.id;
  const delivery = { state: active ? "to_verify" : conflict ? "partial" : "blocked", active, versionId: v.id, message: active ? L("Thème enregistré, à vérifier.", "Theme saved, review before use.") : L("Tentative conservée en brouillon ; la version utilisable est protégée.", "Attempt saved as a draft; the usable version is protected."), reasons: conflict ? [L("Le thème a changé pendant la composition : votre version est conservée, la tentative reste consultable.", "The theme changed during composition: your version is kept and this attempt remains available.")] : q.issues, verdict: q.decision.verdict };
  if (!active && !currentTheme(projectId)) setStatus(projectId, "awaiting_validation");
  ctx?.progress(0.95, active ? L("Thème enregistré, à vérifier", "Theme saved, to review") : L("Tentative conservée, version courante protégée", "Attempt saved, current version protected"));
  return { versionId: v.id, number: v.number, language: r.art.language, quality: q, delivery };
}
