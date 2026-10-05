/**
 * Construction de la boutique : rassemble les créations validées (logo,
 * images, vidéo, textes) et produit une version du thème. La composition de
 * l'accueil est confiée à l'IA lorsqu'elle est disponible ; sinon la
 * direction artistique fournit une composition éprouvée.
 */
import { all, json, one } from "../db";
import type { Asset } from "../library";
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
import { llmConfigured } from "../ai/llm";
import { JobCancelled, JobPaused, type JobContext } from "../jobs";
import { C, L, contentLang, inBothLangs } from "../i18n-server";
import type { Bi } from "../step-notes";

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
  const put = (slot: Exclude<keyof ImageSlots, "reels">, a: Asset | undefined, hint?: string) => {
    if (!a) return;
    const f = themeFileName(a, hint ?? slot);
    files[f] = a.id;
    slots[slot] = f;
  };
  // Préférence aux médias validés par le client, sinon les plus récents.
  const pick = (role: string, n = 0) => {
    const approved = all<Asset>("SELECT * FROM assets WHERE project_id = ? AND role = ? AND status = 'approved' AND deleted_at IS NULL ORDER BY created_at DESC", projectId, role);
    const list = approved.length ? [...approved, ...assetsByRole(projectId, role).filter((x) => !approved.some((y) => y.id === x.id))] : assetsByRole(projectId, role);
    return list.filter((x) => x.status !== "rejected")[n];
  };
  // Photos en situation (vie de tous les jours) : héros de la boutique et première scène.
  // Celles du marchand passent avant celles générées par l'IA.
  const life = all<Asset>("SELECT * FROM assets WHERE project_id = ? AND role = 'lifestyle' AND deleted_at IS NULL AND status != 'rejected' ORDER BY (origin = 'upload') DESC, (status = 'approved') DESC, created_at DESC", projectId);
  put("lifestyle", life[0], "en-situation-1");
  put("lifestyle2", life[1], "en-situation-2");
  put("cutout", pick("cutout"), "produit-detoure");
  put("packshot", pick("packshot"), "packshot");
  put("detail1", pick("detail", 0), "detail-1");
  put("detail2", pick("detail", 1), "detail-2");
  put("scene1", life[1] ?? pick("scene", 0), "scene-1");
  put("scene2", pick("scene", 1), "scene-2");
  put("scene3", pick("scene", 2), "scene-3");
  put("banner", pick("banner"), "banniere");
  put("hero", pick("scene", 0) ?? pick("banner") ?? pick("packshot"), "hero");
  const video = all<Asset>("SELECT * FROM assets WHERE project_id = ? AND role = 'video' AND deleted_at IS NULL AND (json_extract(meta, '$.format') = '16:9') ORDER BY created_at DESC LIMIT 1", projectId)[0];
  if (video) {
    put("video", video, "video");
    const poster = all<Asset>("SELECT * FROM assets WHERE project_id = ? AND role = 'video-poster' AND source_asset_id = ? LIMIT 1", projectId, video.id)[0];
    put("videoPoster", poster ?? pick("banner"), "video-affiche");
  }
  // Vidéos verticales (9:16) pour la section « Vidéos verticales ».
  const verticals = all<Asset>("SELECT * FROM assets WHERE project_id = ? AND role = 'video' AND deleted_at IS NULL AND status != 'rejected' AND (json_extract(meta, '$.format') = '9:16') ORDER BY created_at DESC LIMIT 4", projectId);
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
  const logo = pick("logo");
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
function serviceSlots(projectId: string, slots: ImageSlots, files: Record<string, string>) {
  const life = all<Asset>("SELECT * FROM assets WHERE project_id = ? AND role = 'lifestyle' AND deleted_at IS NULL AND status != 'rejected' ORDER BY (origin = 'upload') DESC, (status = 'approved') DESC, created_at DESC LIMIT 8", projectId);
  const order: Exclude<keyof ImageSlots, "reels">[] = ["lifestyle", "scene1", "scene2", "scene3", "detail1", "detail2", "lifestyle2"];
  life.slice(0, order.length).forEach((a, i) => {
    const f = themeFileName(a, `photo-${i + 1}`);
    files[f] = a.id;
    slots[order[i]] = f;
  });
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

export async function buildShop(ctx: JobContext | null, projectId: string, opts: { direction?: DirectionId; useAi?: boolean; summary?: Bi } = {}) {
  const p = loadProject(projectId);
  const brand = p.brand;
  if (!brand) throw new Error(L("La marque doit être définie avant la boutique.", "The brand must be defined before the store."));
  const copy = savedCopy(projectId) ?? localCopy(p.product, brand, p);
  await ensureVariantMedia(ctx, projectId);
  const { slots, files, gallery } = collectImages(projectId);
  const services = p.business === "services";
  // Entreprise de services : les photos du marchand (rôle « lifestyle ») illustrent ouverture, prestations, méthode et réalisations.
  if (services) serviceSlots(projectId, slots, files);
  const main = storeProduct(p, copy, gallery);
  attachVariantMedia(projectId, main, files, themeFileName);
  // Boutique multi-produit ou niche : les autres produits sont détourés, mis en packshot et rangés en collections.
  let catalog: ReturnType<typeof catalogStore> | null = null;
  if (!services && p.storeType !== "mono" && p.catalog.length) {
    await ensureCatalogMedia(ctx, projectId);
    catalog = catalogStore(loadProject(projectId), main, themeFileName);
    Object.assign(files, catalog.files);
  }
  const direction = opts.direction ?? brand.direction;
  ctx?.progress(0.2, L(`Composition de la boutique (direction ${directionById(direction).name})`, `Composing the store (${directionById(direction).name} direction)`));
  let spec = buildSpec({
    direction,
    shopName: brand.name,
    palette: brand.palette,
    // Les polices de la marque ne priment que si elles ont été choisies (IA ou client), pas recopiées d'une direction.
    fonts: (opts.direction && opts.direction !== brand.direction) || brand.generatedBy === "local" ? undefined : brand.fonts,
    copy,
    images: slots,
    files,
    product: main,
    social: p.settings.socialLinks,
    language: contentLang(),
    ...(services ? { business: "services" as const, services: p.services, servicesTermsHtml: serviceTermsHtml(p.services) } : {}),
    ...(catalog ? { storeType: p.storeType, products: catalog.products, collections: catalog.collections } : {}),
  });
  let author: "ai" | "system" = "system";
  // Résumé de la version enregistré dans les deux langues : affiché ensuite dans celle de l'interface.
  let summary: Bi = opts.summary ?? inBothLangs(() => (services ? L(`Site créé — direction ${directionById(direction).name}`, `Website created — ${directionById(direction).name} direction`) : L(`Boutique créée — direction ${directionById(direction).name}`, `Store created — ${directionById(direction).name} direction`)));
  const append = (b: Bi) => (summary = { fr: summary.fr + b.fr, en: summary.en + b.en });
  if (opts.useAi !== false && llmConfigured() && ctx) {
    try {
      const design = await ctx.step(`design:${direction}`, () => aiDesignHome({ userId: p.userId, projectId, jobId: ctx.job.id, usageKey: `${ctx.job.id}:design:${direction}` }, p, spec));
      const ops: ThemeOp[] = [];
      if (design.custom && /^es-custom-[a-z0-9-]{2,40}$/.test(design.custom.type)) ops.push({ op: "custom_section", type: design.custom.type, name: design.custom.name.slice(0, 25), liquid: design.custom.liquid });
      const fresh: ThemeSpec = { ...spec, settings: { ...spec.settings, ...Object.fromEntries(Object.entries(design.globals ?? {}).filter(([, v]) => v !== undefined)) }, templates: { ...spec.templates, index: { sections: {}, order: [] } } };
      // Site de services : aucune section de vente, même si l'IA en propose.
      const SALES = /^(featured-product|featured-collection|collection-list|product-|shipping-journey|featured-offer|countdown|main-)/;
      for (const s of design.index) if (!(services && SALES.test(s.type))) ops.push({ op: "add_section", template: "index", type: s.type, settings: s.settings, blocks: s.blocks });
      // Catalogue : la grille de produits figure toujours juste après l'ouverture.
      if (catalog && !design.index.some((s) => s.type === "featured-collection")) {
        const first = ops.findIndex((o) => o.op === "add_section");
        ops.splice(first + 1, 0, { op: "add_section", template: "index", type: "featured-collection", settings: { heading: p.storeType === "multi" ? C("Les incontournables", "Best sellers") : C("La sélection", "The selection"), collection: "all", limit: 8, columns: 4 } });
      }
      const r = applyOps(fresh, ops);
      if (r.spec.templates.index.order.length >= 4 && !validateSpec(r.spec).length) {
        spec = r.spec;
        author = "ai";
        summary = inBothLangs(() => L(`Boutique conçue par l'IA — ${design.reasoning.slice(0, 160)}`, `Store designed by AI — ${design.reasoning.slice(0, 160)}`));
      }
    } catch (e) {
      if (e instanceof JobCancelled || e instanceof JobPaused) throw e;
      console.warn("[shop] composition IA indisponible, direction conservée :", (e as Error).message);
    }
    // Relecture visuelle : l'IA regarde la boutique rendue (ordinateur et téléphone) et corrige ce qui se voit.
    try {
      ctx.progress(0.7, L("Relecture visuelle de la boutique", "Visual review of the store"));
      const review = await ctx.step(`review:${direction}`, async () => {
        const shots = await snapshotTheme(spec);
        return shots ? aiReviewHome({ userId: p.userId, projectId, jobId: ctx.job.id, usageKey: `${ctx.job.id}:review:${direction}` }, p, spec, shots) : null;
      });
      if (review?.ops.length) {
        const r = applyOps(spec, services ? review.ops.filter((o) => !("type" in o && typeof o.type === "string" && /^(featured-product|featured-collection|collection-list|product-|shipping-journey|featured-offer|countdown)/.test(o.type))) : review.ops);
        if (r.applied.length && !validateSpec(r.spec).length) {
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
  const v = saveThemeVersion(projectId, spec, JSON.stringify(summary), author, { checks: L(["structure", "schémas des sections", "contraste des couleurs"], ["structure", "section schemas", "color contrast"]), problems });
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
