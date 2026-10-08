/**
 * Theme Engine V2 — orchestration :
 *   PROJECT BRAIN → WEBSITE INTENT → ART DIRECTION → DESIGN SYSTEM → CONTENT & ASSETS → PAGE PLANNER
 *   → SECTION COMPOSITION → THEME GENERATION (ThemeSpec Shopify OS 2.0) → (aperçu, éditeur, export existants).
 * Réutilise : composition de base du moteur existant (gabarits obligatoires, fiche produit, panier, catalogue),
 * médias de la bibliothèque (Image Engine V2 compris ; médias refusés ou non utilisables exclus par `collectImages`),
 * faits vérifiés du SEO Engine V2, textes de la boutique, verrous de marque du Project Brain.
 * 100 % local : aucun appel d'IA, aucune dépense.
 */
import { loadProject, saveThemeVersion } from "../projects";
import type { JobContext } from "../jobs";
import { validateSpec } from "../theme/ops";
import { gateMeta, saveCheck } from "../quality/store";
import { L, inBothLangs } from "../i18n-server";
import type { Bi } from "../step-notes";
import { checkThemeV2 } from "./quality";
import { isDark } from "../color";
import { composeShop, collectImages, savedCopy } from "../engine/shop";
import { localCopy } from "../engine/local-copy";
import { cloneSpec, type ThemeSpec } from "../theme/spec";
import { tidyComposition } from "../theme/tidy";
import { websiteIntent, type WebsiteIntent } from "./intent";
import { artDirection, type ArtDirection, type LanguageId } from "./art-direction";
import { designSettings } from "./design-system";
import { siteContent, type SiteContent } from "./content";
import { compose, type PagePlan } from "./compose";

export const THEME_ENGINE_V2_VERSION = "10a.1";

export type ThemeV2Result = { spec: ThemeSpec; intent: WebsiteIntent; art: ArtDirection; content: SiteContent; plan: PagePlan[] };

export async function composeThemeV2(projectId: string, opts: { language?: LanguageId; ctx?: JobContext | null } = {}): Promise<ThemeV2Result> {
  // Base : composition existante (gabarits obligatoires, fiche produit, panier, catalogue, médias). Dans une tâche,
  // les médias manquants des variantes et du catalogue sont préparés comme avant ; sinon rien n'est généré.
  const { p, spec: base } = await composeShop(projectId, undefined, opts.ctx ?? null, !!opts.ctx);
  const intent = websiteIntent(p);
  const art = artDirection(p, intent, opts);
  const copy = savedCopy(projectId) ?? localCopy(p.product, p.brand!, p);
  const { slots, gallery } = collectImages(projectId);
  // Site de services : les photos du marchand ont été placées par la composition de base (mêmes emplacements).
  const images = { ...slots, ...(base.store.business === "services" ? pickServiceSlots(base) : {}) };
  const content = siteContent(p, intent, copy, images, gallery);
  const shop = intent.site === "shop_mono" || intent.site === "shop_multi";
  const c = compose(intent, art, content, shop ? base.store.product.handle : null, shop ? base.templates.product : null);

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
  spec.store = { ...spec.store, pages: c.pages, menus: { ...spec.store.menus, ...c.menus } };
  if (shop && content.descriptionHtml) spec.store.product = { ...spec.store.product, description_html: content.descriptionHtml };
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
  const tidied = tidyComposition(spec, { strictAssets: true });
  return { spec: tidied, intent, art, content, plan: c.plan };
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
  ctx?.progress(0.2, L("Composition du site (Theme Engine V2)", "Composing the website (Theme Engine V2)"));
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
  const v = saveThemeVersion(projectId, r.spec, JSON.stringify(summary), "system", { checks: L(["structure", "sections remplies", "contrastes", "pages et données à compléter"], ["structure", "filled sections", "contrast", "pages and data to complete"]), problems, gate: gateMeta(q.decision, qcId) });
  ctx?.progress(0.95, L("Site enregistré", "Website saved"));
  return { versionId: v.id, number: v.number, language: r.art.language, quality: q };
}
