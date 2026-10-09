/**
 * Construction de la boutique : rassemble les créations validées (logo,
 * images, vidéo, textes) et produit une version du thème. La composition de
 * l'accueil est confiée à l'IA lorsqu'elle est disponible ; sinon la
 * direction artistique fournit une composition éprouvée.
 */
import { decide } from "../quality/gate";
import { gateMeta, saveCheck } from "../quality/store";
import { isAutoUsable } from "../quality/usable";
import { sectionSchema } from "../theme/spec";
import { all, json, one } from "../db";
import { getAsset, type Asset } from "../library";
import { loadProject, saveThemeVersion, currentTheme, type Project } from "../projects";
import { buildSpec, directionById, type DirectionId, type ImageSlots } from "../theme/directions";
import type { ShopCopy } from "../theme/copy";
import { applyOps, validateSpec, type ThemeOp } from "../theme/ops";
import type { StoreProduct, ThemeSpec } from "../theme/spec";
import { localCopy } from "./local-copy";
import { serviceTermsHtml } from "./services-text";
import { attachVariantMedia, catalogStore, ensureCatalogMedia, ensureVariantMedia } from "./catalog";
import { assetsByRole, latestAsset } from "./images";
import { aiDesignHome, aiReviewHome } from "../ai/tasks";
import { snapshotTheme } from "../theme/snapshot";
import { FONT_HANDLES } from "../theme/render";
import { effectivePalette, paletteKey } from "../route-palette";
import { SHOPIFY_TO_CANVAS } from "../media/fonts";
import { tidyComposition } from "../theme/tidy";
import { llmConfigured } from "../ai/llm";
import { JobCancelled, JobPaused, type JobContext } from "../jobs";
import { C, L, contentLang, inBothLangs } from "../i18n-server";
import type { Bi } from "../step-notes";
import type { LanguageId } from "../theme-v2/art-direction";

/** Note de relecture visuelle en dessous de laquelle la composition de l'IA n'est pas gardée (défauts visibles). */
export const MIN_DESIGN_SCORE = 5;

const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "produit";

/** Nom de fichier stable dans le dossier assets du thème pour un média. */
export function themeFileName(a: Asset, hint?: string): string {
  const ext = a.kind === "video" ? "mp4" : a.mime === "image/png" || a.role === "cutout" || a.role === "logo" ? "png" : "jpg";
  return `es-${slug(hint ?? a.role ?? "media")}-${a.id.slice(0, 6)}.${ext}`;
}

export function savedCopy(projectId: string): ShopCopy | null {
  const row = one<{ value: string }>("SELECT value FROM memory WHERE project_id = ? AND kind = 'artifact' AND key = 'shop_copy'", projectId);
  return row ? json<ShopCopy | null>(row.value, null) : null;
}

export function collectImages(projectId: string): { slots: ImageSlots; files: Record<string, string>; gallery: string[] } {
  const files: Record<string, string> = {};
  const slots: ImageSlots = {};
  const put = (slot: Exclude<keyof ImageSlots, "reels" | "byService">, a: Asset | undefined, hint?: string) => {
    if (!a) return;
    const f = themeFileName(a, hint ?? slot);
    files[f] = a.id;
    slots[slot] = f;
  };
  // Préférence aux médias validés par le client, sinon les plus récents.
  const brand = loadProject(projectId).brand;
  const pal = effectivePalette(brand);
  // Carte générée dessinée avec d'autres couleurs que celles de la piste retenue : elle n'illustre plus le site
  // (dès qu'une version aux bonnes couleurs existe).
  const stale = (a: Asset) => {
    if (a.origin !== "generated" || !pal) return false;
    const m = json<{ palette?: string; business?: string }>(a.meta, {});
    return m.business === "services" && m.palette !== paletteKey(pal);
  };
  const pick = (role: string, n = 0) => {
    const approved = all<Asset>("SELECT * FROM assets WHERE project_id = ? AND role = ? AND status = 'approved' AND deleted_at IS NULL ORDER BY created_at DESC", projectId, role);
    let list = (approved.length ? [...approved, ...assetsByRole(projectId, role).filter((x) => !approved.some((y) => y.id === x.id))] : assetsByRole(projectId, role)).filter(isAutoUsable);
    if (list.some((x) => stale(x)) && list.some((x) => x.origin === "generated" && !stale(x))) list = list.filter((x) => !stale(x));
    return list[n];
  };
  // Photos en situation (vie de tous les jours) : héros de la boutique et première scène.
  // Celles du marchand passent avant celles générées par l'IA.
  // Photos du produit en situation de l'Image Engine V2 (rangées en « scènes ») comptent aussi comme photos en situation.
  const life = all<Asset>("SELECT * FROM assets WHERE project_id = ? AND (role = 'lifestyle' OR (role = 'scene' AND json_extract(meta, '$.imageV2.brief.kind') IN ('lifestyle','usage_scene'))) AND deleted_at IS NULL AND status != 'rejected' ORDER BY (origin = 'upload') DESC, (origin != 'generated') DESC, (status = 'approved') DESC, (json_extract(meta, '$.qcWarning') IS NULL) DESC, created_at DESC", projectId).filter(isAutoUsable);
  put("lifestyle", life[0], "en-situation-1");
  // Ambiances de l'univers (photos libres, sans le produit) : seulement pour les emplacements d'ambiance encore vides.
  const amb = all<Asset>("SELECT * FROM assets WHERE project_id = ? AND role = 'ambiance' AND deleted_at IS NULL AND status != 'rejected' ORDER BY (status = 'approved') DESC, created_at DESC LIMIT 8", projectId).filter(isAutoUsable).slice(0, 2);
  put("lifestyle2", life[1] ?? amb[0], "en-situation-2");
  put("cutout", pick("cutout"), "produit-detoure");
  put("packshot", pick("packshot"), "packshot");
  put("detail1", pick("detail", 0), "detail-1");
  put("detail2", pick("detail", 1), "detail-2");
  put("scene1", life[1] ?? pick("scene", 0), "scene-1");
  put("scene2", pick("scene", 1), "scene-2");
  put("scene3", pick("scene", 2) ?? amb[1] ?? amb[0], "scene-3");
  put("banner", pick("banner"), "banniere");
  put("hero", pick("scene", 0) ?? pick("banner") ?? pick("packshot"), "hero");
  const video = all<Asset>("SELECT * FROM assets WHERE project_id = ? AND role = 'video' AND deleted_at IS NULL AND (json_extract(meta, '$.format') = '16:9') ORDER BY created_at DESC LIMIT 6", projectId).filter(isAutoUsable)[0];
  if (video) {
    put("video", video, "video");
    const poster = all<Asset>("SELECT * FROM assets WHERE project_id = ? AND role = 'video-poster' AND source_asset_id = ? LIMIT 1", projectId, video.id)[0];
    put("videoPoster", poster ?? pick("banner"), "video-affiche");
  }
  // Vidéos verticales (9:16) pour la section « Vidéos verticales ».
  const verticals = all<Asset>("SELECT * FROM assets WHERE project_id = ? AND role = 'video' AND deleted_at IS NULL AND status != 'rejected' AND (json_extract(meta, '$.format') = '9:16') ORDER BY created_at DESC LIMIT 12", projectId).filter(isAutoUsable).slice(0, 4);
  if (verticals.length) {
    slots.reels = verticals.map((v, i) => {
      const vf = themeFileName(v, `reel-${i + 1}`);
      files[vf] = v.id;
      const poster = all<Asset>("SELECT * FROM assets WHERE project_id = ? AND role = 'video-poster' AND source_asset_id = ? LIMIT 1", projectId, v.id)[0];
      let pf: string | undefined;
      if (poster) { pf = themeFileName(poster, `reel-affiche-${i + 1}`); files[pf] = poster.id; }
      return { video: vf, poster: pf };
    });
  }
  // Le site prend la version horizontale du logo quand elle existe (l'emblème rond reste pour les étiquettes).
  // Logo de la piste choisie (pas le dernier logo validé d'une piste précédente).
  const chosen = brand?.logo?.assetId ? getAsset(brand.logo.assetId) : undefined;
  const logo = chosen && !chosen.deleted_at && chosen.role === "logo" ? chosen : pick("logo");
  const horizontal = logo ? all<Asset>("SELECT * FROM assets WHERE project_id = ? AND role = 'logo-horizontal' AND source_asset_id = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1", projectId, logo.id)[0] : undefined;
  put("logo", horizontal ?? logo, "logo");
  put("logoLight", pick("logo-light"), "logo-clair");
  put("favicon", pick("favicon"), "favicon");
  // Galerie produit : packshots puis détails puis scènes.
  const gallery: string[] = [];
  for (const a of [pick("packshot"), life[0], pick("detail", 0), life[1], pick("scene", 0), pick("detail", 1), pick("scene", 1)]) {
    if (!a) continue;
    const f = themeFileName(a, a.role === "packshot" ? "galerie-packshot" : `galerie-${a.role}-${a.id.slice(0, 4)}`);
    files[f] = a.id;
    gallery.push(f);
  }
  return { slots, files, gallery };
}

/**
 * Site de services : les vraies photos du marchand (rôle « lifestyle », dossier « Scènes & usages »)
 * passent avant les scènes générées dans les emplacements de la composition (méthode, réalisations…).
 */
/** Nom de prestation comparable (casse, accents et espaces ignorés). */
export const serviceKey = (name: string) => name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

function serviceSlots(projectId: string, slots: ImageSlots, files: Record<string, string>) {
  const life = all<Asset>("SELECT * FROM assets WHERE project_id = ? AND role = 'lifestyle' AND deleted_at IS NULL AND status != 'rejected' ORDER BY (origin = 'upload') DESC, (origin != 'generated') DESC, (status = 'approved') DESC, (json_extract(meta, '$.qcWarning') IS NULL) DESC, created_at DESC LIMIT 24", projectId).filter(isAutoUsable).slice(0, 8);
  const order: Exclude<keyof ImageSlots, "reels" | "byService">[] = ["lifestyle", "scene1", "scene2", "scene3", "detail1", "detail2", "lifestyle2"];
  life.slice(0, order.length).forEach((a, i) => {
    const f = themeFileName(a, `photo-${i + 1}`);
    files[f] = a.id;
    slots[order[i]] = f;
  });
  // Photo propre à chaque prestation (votre photo d'abord, puis photo libre, puis image IA) : la carte « Carrelage » montre du
  // carrelage, jamais la photo d'une autre prestation.
  const tagged = all<Asset>("SELECT * FROM assets WHERE project_id = ? AND role IN ('lifestyle','original') AND kind = 'image' AND deleted_at IS NULL AND status != 'rejected' AND json_extract(meta, '$.service') IS NOT NULL ORDER BY (origin IN ('upload','site')) DESC, (json_extract(meta, '$.stock') IS NOT NULL) DESC, (status = 'approved') DESC, (json_extract(meta, '$.qcWarning') IS NULL) DESC, created_at DESC", projectId).filter(isAutoUsable);
  for (const a of tagged) {
    const key = serviceKey(json<{ service?: string }>(a.meta, {}).service ?? "");
    if (!key || slots.byService?.[key]) continue;
    const f = themeFileName(a, `prestation-${a.id.slice(0, 6)}`);
    files[f] = a.id;
    slots.byService = { ...(slots.byService ?? {}), [key]: f };
  }
  if (!slots.hero && slots.lifestyle) slots.hero = slots.lifestyle;
}

export function storeProduct(p: Project, copy: ShopCopy, gallery: string[]): StoreProduct {
  const variants = p.product.variants.length
    ? p.product.variants[0].values.map((v) => ({ title: v, options: [v], price: p.product.price.amount, available: true }))
    : [{ title: "Default Title", options: ["Default Title"], price: p.product.price.amount, available: true }];
  return {
    title: copy.product.title || p.product.name || p.name,
    handle: slug(copy.product.title || p.product.name || p.name),
    vendor: p.brand?.name ?? p.name,
    description_html: copy.product.description_html,
    price: p.product.price.amount,
    compare_at_price: null,
    currency: p.product.price.currency || "EUR",
    options: p.product.variants.length ? [p.product.variants[0].name] : [],
    variants,
    images: gallery,
    tags: [],
  };
}

/** Police Shopify (identifiant « famille_nN ») la plus proche d'une famille locale et d'une graisse, si le thème la connaît. */
function fontHandle(family: string, weight: number): string | null {
  // Familles du logo sans équivalent dans les polices Shopify du thème : la plus proche en esprit.
  const NEAREST: Record<string, string> = { "Bricolage Grotesque": "Archivo", "Instrument Serif": "Cormorant", Inter: "Inter" };
  const fam = SHOPIFY_TO_CANVAS[family.toLowerCase().replace(/ /g, "_")] ? family : NEAREST[family] ?? family;
  const key = Object.entries(SHOPIFY_TO_CANVAS).find(([, v]) => v === fam)?.[0] ?? (fam === "Inter" ? "inter" : null);
  if (!key) return null;
  const weights = FONT_HANDLES.filter((h) => h.startsWith(`${key}_n`)).map((h) => Number(h.slice(-1)) * 100);
  if (!weights.length) return null;
  const w = weights.sort((a, b) => Math.abs(a - weight) - Math.abs(b - weight))[0];
  return `${key}_n${w / 100}`;
}

/** Typographies du site tirées de la piste de logo retenue (titres et texte), ou null si le thème ne les a pas. */
export function routeFonts(route: { heading: string; headingWeight: number; body: string } | null | undefined): { heading: string; body: string } | null {
  if (!route) return null;
  const heading = fontHandle(route.heading, route.headingWeight);
  const body = fontHandle(route.body, 400);
  return heading && body ? { heading, body } : null;
}

/**
 * Boutique composée dans une direction, avec le contenu du projet (marque, textes, photos, prestations).
 * `ctx` présent : les médias manquants (variantes, catalogue) sont préparés d'abord ; sans `ctx` (vignettes
 * d'aperçu des directions), on compose avec ce qui existe déjà, sans rien générer.
 */
export async function composeShop(projectId: string, directionOpt?: DirectionId, ctx?: JobContext | null, prepare = ctx !== undefined) {
  const p = loadProject(projectId);
  const brand = p.brand;
  if (!brand) throw new Error(L("La marque doit être définie avant la boutique.", "The brand must be defined before the store."));
  const copy = savedCopy(projectId) ?? localCopy(p.product, brand, p);
  if (prepare) await ensureVariantMedia(ctx ?? null, projectId);
  const { slots, files, gallery } = collectImages(projectId);
  const services = p.business === "services";
  // Entreprise de services : les photos du marchand (rôle « lifestyle ») illustrent ouverture, prestations, méthode et réalisations.
  if (services) serviceSlots(projectId, slots, files);
  const main = storeProduct(p, copy, gallery);
  attachVariantMedia(projectId, main, files, themeFileName);
  // Boutique multi-produit ou niche : les autres produits sont détourés, mis en packshot et rangés en collections.
  let catalog: ReturnType<typeof catalogStore> | null = null;
  if (!services && p.storeType !== "mono" && p.catalog.length) {
    if (prepare) await ensureCatalogMedia(ctx ?? null, projectId);
    catalog = catalogStore(loadProject(projectId), main, themeFileName);
    Object.assign(files, catalog.files);
  }
  const direction = directionOpt ?? brand.direction;
  ctx?.progress(0.2, L(`Composition de la boutique (direction ${directionById(direction).name})`, `Composing the store (${directionById(direction).name} direction)`));
  const spec = buildSpec({
    direction,
    shopName: brand.name,
    // Couleurs de la piste de logo retenue : le site suit l'identité choisie.
    palette: effectivePalette(brand) ?? brand.palette,
    // Typographies de la piste de logo retenue (logo, site et réseaux parlent d'une seule voix), quelle que soit la
    // direction ; à défaut, celles de la marque si elles ont été choisies (IA ou client), pas recopiées d'une direction.
    fonts: routeFonts(brand.logo?.route) ?? ((directionOpt && directionOpt !== brand.direction) || brand.generatedBy === "local" ? undefined : brand.fonts),
    copy,
    images: slots,
    files,
    product: main,
    social: p.settings.socialLinks,
    language: contentLang(),
    ...(services ? { business: "services" as const, services: p.services, servicesTermsHtml: serviceTermsHtml(p.services) } : {}),
    ...(catalog ? { storeType: p.storeType, products: catalog.products, collections: catalog.collections } : {}),
  });
  return { p, direction, services, catalog, spec };
}

export async function buildShop(ctx: JobContext | null, projectId: string, opts: { direction?: DirectionId; useAi?: boolean; summary?: Bi; engine?: "v1" | "v2"; language?: LanguageId } = {}) {
  // Theme Engine V2 (phase 10A) par défaut pour toute nouvelle composition ; une direction V1 explicitement choisie
  // (galerie des thèmes, « change de direction ») ou un projet réglé sur l'ancien moteur garde le moteur V1.
  const engine = opts.engine ?? (opts.direction || (loadProject(projectId).settings as { themeEngine?: string }).themeEngine === "v1" ? "v1" : "v2");
  if (engine === "v2") {
    const { buildShopV2 } = await import("../theme-v2/engine");
    const r = await buildShopV2(ctx, projectId, { language: opts.language, summary: opts.summary });
    return { versionId: r.versionId, number: r.number };
  }
  const { p, direction, services, catalog, spec: built } = await composeShop(projectId, opts.direction, ctx);
  let spec = built;
  let author: "ai" | "system" = "system";
  // Résumé de la version enregistré dans les deux langues : affiché ensuite dans celle de l'interface.
  let summary: Bi = opts.summary ?? inBothLangs(() => (services ? L(`Site créé — direction ${directionById(direction).name}`, `Website created — ${directionById(direction).name} direction`) : L(`Boutique créée — direction ${directionById(direction).name}`, `Store created — ${directionById(direction).name} direction`)));
  const append = (b: Bi) => (summary = { fr: summary.fr + b.fr, en: summary.en + b.en });
  // Composition éprouvée de la direction : reprise si la composition de l'IA est jugée ratée à la relecture visuelle.
  const directionSpec = spec;
  const directionSummary = summary;
  let designedByAi = false;
  // Relecture visuelle (si elle a lieu) : sert au verdict de qualité de la version enregistrée.
  let reviewed: { score: number } | null = null;
  let reviewedKept = true;
  if (opts.useAi !== false && llmConfigured() && ctx) {
    try {
      const design = await ctx.step(`design:${direction}`, () => aiDesignHome({ userId: p.userId, projectId, jobId: ctx.job.id, usageKey: `${ctx.job.id}:design:${direction}` }, p, spec));
      const ops: ThemeOp[] = [];
      if (design.custom && /^es-custom-[a-z0-9-]{2,40}$/.test(design.custom.type)) ops.push({ op: "custom_section", type: design.custom.type, name: design.custom.name.slice(0, 25), liquid: design.custom.liquid });
      const fresh: ThemeSpec = { ...spec, settings: { ...spec.settings, ...Object.fromEntries(Object.entries(design.globals ?? {}).filter(([, v]) => v !== undefined)) }, templates: { ...spec.templates, index: { sections: {}, order: [] } } };
      // Site de services : aucune section de vente, même si l'IA en propose.
      const SALES = /^(featured-product|featured-collection|collection-list|product-|shipping-journey|featured-offer|countdown|main-)/;
      // Section d'un type inconnu proposée par l'IA : retirée seule (le reste de la composition payée est gardé).
      for (const s of design.index) if (!(services && SALES.test(s.type)) && sectionSchema(fresh, s.type)) ops.push({ op: "add_section", template: "index", type: s.type, settings: s.settings, blocks: s.blocks });
      // Catalogue : la grille de produits figure toujours juste après l'ouverture.
      if (catalog && !design.index.some((s) => s.type === "featured-collection")) {
        const first = ops.findIndex((o) => o.op === "add_section");
        ops.splice(first + 1, 0, { op: "add_section", template: "index", type: "featured-collection", settings: { heading: p.storeType === "multi" ? C("Les incontournables", "Best sellers") : C("La sélection", "The selection"), collection: "all", limit: 8, columns: 4 } });
      }
      // Finitions d'agence (doublons, sections d'espaces réservés, images inexistantes…) avant tout contrôle.
      const r = applyOps(fresh, ops);
      r.spec = tidyComposition(r.spec, { strictAssets: true });
      if (r.spec.templates.index.order.length >= 4 && !validateSpec(r.spec).length) {
        spec = r.spec;
        author = "ai";
        designedByAi = true;
        summary = inBothLangs(() => L(`Boutique conçue par l'IA — ${design.reasoning.slice(0, 160)}`, `Store designed by AI — ${design.reasoning.slice(0, 160)}`));
      }
    } catch (e) {
      if (e instanceof JobCancelled || e instanceof JobPaused) throw e;
      console.warn("[shop] composition IA indisponible, direction conservée :", (e as Error).message);
    }
    // Relecture visuelle : l'IA regarde la boutique rendue (ordinateur et téléphone) et corrige ce qui se voit.
    try {
      ctx.progress(0.7, L("Relecture visuelle de la boutique", "Visual review of the store"));
      const review = (reviewed = await ctx.step(`review:${direction}`, async () => {
        const shots = await snapshotTheme(spec);
        // La fiche produit est relue avec l'accueil (galerie, bloc d'achat, sections sous l'achat) ; jamais pour un site de services.
        const product = shots && !services ? await snapshotTheme(spec, `/products/${spec.store.product.handle}`, { desktopSheets: 2, mobileSheets: 1 }).catch(() => null) : null;
        return shots ? aiReviewHome({ userId: p.userId, projectId, jobId: ctx.job.id, usageKey: `${ctx.job.id}:review:${direction}` }, p, spec, { ...shots, product }) : null;
      }));
      if (review && designedByAi && review.score < MIN_DESIGN_SCORE) {
        reviewedKept = false;
        // Défauts visibles sur la composition de l'IA : on ne la montre pas, la composition de la direction est gardée.
        spec = directionSpec;
        author = "system";
        summary = directionSummary;
        append(inBothLangs(() => L(` · composition de l'IA écartée à la relecture visuelle (${review.score}/10)`, ` · AI layout discarded at visual review (${review.score}/10)`)));
      } else if (review?.ops.length) {
        const r = applyOps(spec, services ? review.ops.filter((o) => !("type" in o && typeof o.type === "string" && /^(featured-product|featured-collection|collection-list|product-|shipping-journey|featured-offer|countdown)/.test(o.type))) : review.ops);
        r.spec = tidyComposition(r.spec, { strictAssets: true });
        // Une relecture qui viderait l'accueil (moins de 4 sections) ou en retirerait l'ouverture n'est pas appliquée.
        const opening = (t: ThemeSpec) => t.templates.index.sections[t.templates.index.order[0]]?.type ?? "";
        const keepsOpening = !/^(hero-|video-|slideshow)/.test(opening(spec)) || /^(hero-|video-|slideshow)/.test(opening(r.spec));
        if (r.applied.length && r.spec.templates.index.order.length >= 4 && keepsOpening && !validateSpec(r.spec).length) {
          spec = r.spec;
          author = "ai";
          append(inBothLangs(() => L(` · relue sur captures (${review.score}/10, ${r.applied.length} correction${r.applied.length > 1 ? "s" : ""})`, ` · reviewed on screenshots (${review.score}/10, ${r.applied.length} fix${r.applied.length > 1 ? "es" : ""})`)));
        }
      } else if (review) append(inBothLangs(() => L(` · relue sur captures (${review.score}/10)`, ` · reviewed on screenshots (${review.score}/10)`)));
    } catch (e) {
      if (e instanceof JobCancelled || e instanceof JobPaused) throw e;
      console.warn("[shop] relecture visuelle indisponible :", (e as Error).message);
    }
  }
  const problems = validateSpec(spec);
  if (problems.length) throw new Error(L(`Thème invalide : ${problems.join(" ; ")}`, `Invalid theme: ${problems.join("; ")}`));
  // Niveau de qualité dit honnêtement (Phase 1 : comportement technique inchangé). 8/10 et plus : FINAL ; de 5 à
  // moins de 8 : PROVISOIRE, à améliorer (utilisable, jamais présenté comme un résultat final) ; sous 5 : refusé
  // (la composition de l'IA est alors écartée, celle de la direction gardée, non relue). Sans relecture : non contrôlé.
  const quality = decide("theme_home", reviewed && reviewedKept ? { checker: "ai", score: reviewed.score } : { checker: "none", score: null });
  const qcId = saveCheck(quality, { userId: p.userId, projectId, jobId: ctx?.job.id ?? null, candidateId: `theme:${projectId}:${direction}` });
  if (reviewed && !reviewedKept) saveCheck(decide("theme_home", { checker: "ai", score: reviewed.score }), { userId: p.userId, projectId, jobId: ctx?.job.id ?? null, candidateId: `theme-ai-layout:${projectId}:${direction}` });
  if (quality.verdict === "PROVISIONAL") append(inBothLangs(() => L(" · niveau provisoire, à améliorer (moins de 8/10)", " · provisional level, needs improvement (below 8/10)")));
  const v = saveThemeVersion(projectId, spec, JSON.stringify(summary), author, { checks: L(["structure", "schémas des sections", "contraste des couleurs"], ["structure", "section schemas", "color contrast"]), problems, gate: gateMeta(quality, qcId) });
  ctx?.progress(0.95, L("Boutique enregistrée", "Store saved"));
  return { versionId: v.id, number: v.number };
}

/** Change de direction en conservant les retouches de contenu ? Non : nouvelle version complète, l'ancienne reste restaurable. */
export async function switchDirection(ctx: JobContext | null, projectId: string, direction: DirectionId) {
  return buildShop(ctx, projectId, { direction, useAi: false, summary: inBothLangs(() => L(`Direction ${directionById(direction).name} appliquée`, `${directionById(direction).name} direction applied`)) });
}

export function hasTheme(projectId: string) {
  return !!currentTheme(projectId);
}
