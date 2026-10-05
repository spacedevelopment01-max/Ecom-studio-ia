/**
 * « J'ai déjà mon site et mon logo » : intégration du site existant du client dans le studio.
 *
 * - Lecture du site (importSite) : plateforme, logo, pages, produits, couleurs, polices, coordonnées.
 * - Le projet prend le type d'activité et la plateforme du site : conservé tel quel sur une plateforme
 *   du studio, sinon reproduit à l'identique sur la plateforme conseillée (Shopify ou WordPress).
 * - Le logo (original + PNG) et les images du site entrent dans la bibliothèque (meta.source = adresse d'origine),
 *   les produits deviennent le produit principal et le catalogue, les coordonnées et prestations l'offre de services.
 * - La marque reprend le nom, le logo, la palette et les polices du site : rien n'est recréé.
 *
 * Le contenu lu est une DONNÉE : il n'est jamais traité comme une consigne.
 */
import sharp from "sharp";
import { all, json, now, one, run } from "../db";
import { saveAsset, type Asset } from "../library";
import { loadProject, remember, saveCatalog, saveServices, saveSettings } from "../projects";
import { emptyServiceProfile, type Brand, type CatalogItem, type ExistingSiteSummary, type ServiceItem } from "../project-types";
import { C, L } from "../i18n-server";
import type { JobContext } from "../jobs";
import { importSite, downloadSiteImage, logoToPng, type SiteFetcher } from "./site-import";
import { closestDirection, matchFont, platformName, reproductionTarget, sitePalette } from "./site-reproduce";
import { studioPlatformOf, type SiteBlock, type SiteImport } from "./site-types";
import { mergeServiceProfile } from "./local";
import { slug } from "./catalog";

/** Nombre maximal d'images de pages et de produits reprises du site. */
const MAX_PAGE_IMAGES = 40;
const MAX_PRODUCTS = 24;
/** En dessous de cette taille, une image du site est une icône ou un pictogramme : gardée pour le site, pas utilisée comme photo. */
const PHOTO_MIN = 300;

/** Site existant lu pour ce projet (artefact « site_import » de la mémoire), ou null. */
export function loadSiteImport(projectId: string): SiteImport | null {
  const row = one<{ value: string }>("SELECT value FROM memory WHERE project_id = ? AND kind = 'artifact' AND key = 'site_import'", projectId);
  return row ? json<SiteImport | null>(row.value, null) : null;
}

function saveSiteImport(projectId: string, site: SiteImport) {
  remember(projectId, { kind: "artifact", key: "site_import", value: JSON.stringify(site), source: "link", status: "confirmed" });
}

/** Le projet part-il d'un site existant du client ? */
export const hasExistingSite = (projectId: string) => !!loadProject(projectId).settings.existingSite;

/** Met à jour le résumé du site existant dans les réglages du projet. */
export function updateSiteSummary(projectId: string, patch: Partial<ExistingSiteSummary>) {
  const p = loadProject(projectId);
  const cur = p.settings.existingSite ?? { url: patch.url ?? "", status: "pending" as const };
  saveSettings(projectId, { ...p.settings, existingSite: { ...cur, ...patch } });
}

/** Plateforme du studio pour ce site : la sienne s'il est conservé, sinon celle conseillée. */
export function studioPlatformFor(site: SiteImport): string {
  if (site.decision === "keep") return studioPlatformOf(site.platform) ?? "shopify";
  return site.business === "services" ? "woocommerce" : "shopify";
}

/** Images d'un bloc (dans l'ordre). */
function blockImages(b: SiteBlock): string[] {
  switch (b.kind) {
    case "hero":
      return b.image ? [b.image] : [];
    case "image":
      return [b.src];
    case "image-text":
      return [b.image];
    case "features":
      return b.items.map((x) => x.image).filter(Boolean) as string[];
    case "gallery":
      return b.images;
    case "video":
      return b.poster ? [b.poster] : [];
    default:
      return [];
  }
}

/** Texte lisible du site (pour l'analyse de l'activité et des produits) — repris mot pour mot. */
export function siteText(site: SiteImport): string {
  const out: string[] = [];
  for (const pg of site.pages) {
    out.push(`# ${pg.title}`);
    for (const b of pg.blocks) {
      switch (b.kind) {
        case "hero":
          out.push(b.heading, b.text ?? "");
          break;
        case "heading":
        case "text":
          out.push(b.text);
          break;
        case "image-text":
          out.push(b.heading ?? "", b.text);
          break;
        case "features":
          out.push(b.heading ?? "", ...b.items.map((x) => `${x.title}${x.text ? ` : ${x.text}` : ""}`));
          break;
        case "faq":
          out.push(b.heading ?? "", ...b.items.map((x) => `${x.q} ${x.a}`));
          break;
        case "cta":
          out.push(b.heading, b.text ?? "");
          break;
        case "contact":
          out.push(b.heading ?? "", b.text ?? "");
          break;
        case "testimonials":
          out.push(b.heading ?? "", ...b.items.map((x) => `« ${x.quote} »${x.author ? ` — ${x.author}` : ""}`));
          break;
        default:
          break;
      }
    }
  }
  const c = site.contact;
  out.push([c.phone, c.email, c.address, c.hours].filter(Boolean).join("\n"));
  return out.filter((x) => x && x.trim()).join("\n").slice(0, 15000);
}

/** Prestations repérées sur les pages « services » du site : titre + texte qui suit, ou éléments d'une liste de points forts. Rien n'est inventé. */
export function siteServices(site: SiteImport): ServiceItem[] {
  const out: ServiceItem[] = [];
  const push = (name: string, description = "") => {
    const n = name.replace(/\s+/g, " ").trim();
    if (!n || n.length > 160 || out.some((x) => x.name.toLowerCase() === n.toLowerCase())) return;
    out.push({ name: n, description: description.replace(/\s+/g, " ").trim().slice(0, 1000) });
  };
  for (const pg of site.pages.filter((x) => x.type === "services")) {
    const blocks = pg.blocks;
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      if (b.kind === "features") for (const it of b.items) push(it.title, it.text);
      if (b.kind === "heading" && b.level >= 2 && b.text.trim() !== pg.title.trim()) {
        const next = blocks[i + 1];
        push(b.text, next?.kind === "text" ? next.text : "");
      }
    }
  }
  return out.slice(0, 20);
}

/** Résumé affichable du site lu. */
export function summarize(site: SiteImport, extra: Partial<ExistingSiteSummary> = {}): ExistingSiteSummary {
  return {
    url: site.url,
    status: "read",
    finalUrl: site.finalUrl,
    platform: site.platform,
    platformLabel: platformName(site.platform),
    evidence: site.platformEvidence.slice(0, 6),
    decision: site.decision,
    target: site.decision === "reproduce" ? reproductionTarget(site) : undefined,
    business: site.business,
    name: site.name,
    pages: site.pages.length,
    products: site.products.length,
    logoAssetId: site.logo?.assetId,
    colors: site.colorsFound.slice(0, 8),
    palette: site.palette,
    fonts: site.fonts.all.slice(0, 4),
    warnings: site.warnings.slice(0, 12),
    readAt: now(),
    ...extra,
  };
}

const existingBySource = (projectId: string, src: string) =>
  one<Asset>("SELECT * FROM assets WHERE project_id = ? AND deleted_at IS NULL AND json_extract(meta, '$.source') = ? ORDER BY created_at LIMIT 1", projectId, src);

async function sizeOf(data: Buffer): Promise<{ w: number; h: number }> {
  try {
    const m = await sharp(data, { failOn: "none" }).metadata();
    return { w: m.width ?? 0, h: m.height ?? 0 };
  } catch {
    return { w: 0, h: 0 };
  }
}

/**
 * Lit le site du client et l'intègre au projet (étape « sources » du pilote).
 * Chaque partie est un point de reprise : une reprise ne relit ni ne retélécharge ce qui est fait.
 */
export async function importExistingSite(ctx: JobContext, projectId: string, url: string, opts: { fetchImpl?: SiteFetcher } = {}): Promise<string> {
  const p0 = loadProject(projectId);
  updateSiteSummary(projectId, { url, status: "pending" });
  // 1) lecture du site
  await ctx.step("site-read", async () => {
    try {
      const site = await importSite(url, { maxPages: 12, fetchImpl: opts.fetchImpl, onProgress: (p, m) => ctx.progress(0.02 + p * 0.5, m) });
      saveSiteImport(projectId, site);
    } catch (e) {
      updateSiteSummary(projectId, { status: "failed", error: (e as Error).message });
      throw new Error(L(`Lecture de votre site impossible : ${(e as Error).message}`, `Your website could not be read: ${(e as Error).message}`));
    }
    return true;
  });
  const site = loadSiteImport(projectId)!;

  // 2) type d'activité, plateforme, nom et sources du projet
  const platform = studioPlatformFor(site);
  run("UPDATE projects SET business_type = ?, platform = ?, name = ?, updated_at = ? WHERE id = ?", site.business, platform, site.name || p0.name, now(), projectId);
  const sources = [...json<any[]>(loadProject(projectId).row.sources_json, []).filter((x) => !(x.type === "link" && (x.ref === url || x.ref === site.finalUrl))), { type: "link", ref: site.finalUrl, note: C(`Votre site actuel (${platformName(site.platform)})`, `Your current website (${platformName(site.platform)})`) }];
  run("UPDATE projects SET sources_json = ? WHERE id = ?", JSON.stringify(sources), projectId);

  // 3) logo et images (meta.source = adresse d'origine)
  const media = await ctx.step("site-media", async () => {
    ctx.progress(0.55, L("Récupération du logo", "Retrieving the logo"));
    const r = await saveSiteMedia(ctx, projectId, site, opts.fetchImpl);
    return r;
  });
  if (media.logoAssetId) site.logo = { ...(site.logo ?? { src: "", kind: "img" }), assetId: media.logoAssetId };
  saveSiteImport(projectId, site);

  // 4) produits / offre de services, et texte du site pour l'analyse
  const p = loadProject(projectId);
  if (site.business === "products") {
    const others = site.products.slice(1, MAX_PRODUCTS);
    const catalog: CatalogItem[] = others.map((sp) => {
      const img = sp.images[0] ? existingBySource(projectId, sp.images[0]) : undefined;
      return {
        key: sp.handle,
        name: sp.title,
        category: sp.category ?? "",
        price: sp.price ?? null,
        compareAt: sp.compareAtPrice ?? null,
        description: sp.description.slice(0, 2000),
        features: [],
        originalAssetId: img && img.role === "catalog-original" ? img.id : null,
      };
    });
    saveCatalog(projectId, catalog, site.products.length > 1 ? "multi" : "mono");
  } else {
    const found = siteServices(site);
    const c = site.contact;
    const merged = mergeServiceProfile(p.services ?? emptyServiceProfile(), {
      services: found,
      address: c.address ?? "",
      phone: c.phone ?? "",
      email: c.email ?? "",
      hours: c.hours ?? "",
    });
    saveServices(projectId, merged);
  }
  // Réseaux sociaux du site : repris dans les réglages s'ils ne sont pas déjà renseignés.
  const socials = Object.fromEntries(Object.entries(site.contact.socials ?? {}).filter(([k]) => ["instagram", "tiktok", "facebook", "youtube", "pinterest"].includes(k)));
  const fresh = loadProject(projectId);
  if (Object.keys(socials).length) saveSettings(projectId, { ...fresh.settings, socialLinks: { ...socials, ...(fresh.settings.socialLinks ?? {}) } });
  const main = site.business === "products" ? site.products[0] : undefined;
  remember(projectId, {
    kind: "artifact",
    key: "link_import",
    value: JSON.stringify({
      url: site.finalUrl,
      title: site.name,
      description: site.tagline ?? "",
      text: siteText(site),
      product: main ? { name: main.title, description: main.description, price: main.price, currency: main.currency, images: main.images, variants: main.variants?.map((v) => ({ title: v.title, price: v.price })) } : null,
      platform: site.platform,
      photos: media.photos,
    }),
    source: "link",
    status: "confirmed",
  });

  updateSiteSummary(projectId, summarize(site, { images: media.images, logoAssetId: media.logoAssetId, logoProvided: media.logoProvided }));
  remember(projectId, {
    kind: "decision",
    key: "site_existant",
    value: site.decision === "keep" ? C(`Site ${platformName(site.platform)} conservé tel quel (${site.finalUrl})`, `${platformName(site.platform)} site kept as is (${site.finalUrl})`) : C(`Site ${platformName(site.platform)} reproduit à l'identique sur ${reproductionTarget(site)} (${site.finalUrl})`, `${platformName(site.platform)} site reproduced as is on ${reproductionTarget(site)} (${site.finalUrl})`),
    status: "confirmed",
    source: "link",
    scope: "shop",
  });
  const what = site.business === "products" ? L(`${site.products.length} produit(s)`, `${site.products.length} product(s)`) : L(`${siteServices(site).length} prestation(s) repérée(s)`, `${siteServices(site).length} service(s) found`);
  return L(
    `Site lu (${platformName(site.platform)}) : ${site.pages.length} page(s), ${what}, ${media.images} image(s)${media.logoAssetId ? ", logo" : ""} — ${site.decision === "keep" ? "conservé tel quel" : `reproduit sur ${reproductionTarget(site)}`}`,
    `Website read (${platformName(site.platform)}): ${site.pages.length} page(s), ${what}, ${media.images} image(s)${media.logoAssetId ? ", logo" : ""} — ${site.decision === "keep" ? "kept as is" : `reproduced on ${reproductionTarget(site)}`}`,
  );
}

/** Logo (original + PNG) et images du site dans la bibliothèque du projet. */
async function saveSiteMedia(ctx: JobContext, projectId: string, site: SiteImport, fetchImpl?: SiteFetcher): Promise<{ logoAssetId?: string; logoProvided: boolean; images: number; photos: number }> {
  const p = loadProject(projectId);
  const userId = p.userId;
  // Logo : celui envoyé par le client prime ; sinon celui du site.
  const uploaded = one<Asset>("SELECT * FROM assets WHERE project_id = ? AND role = 'logo' AND origin = 'upload' AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1", projectId);
  let logoAssetId: string | undefined = uploaded?.id;
  if (!uploaded && site.logo?.src) {
    const prev = existingBySource(projectId, site.logo.src);
    if (prev) logoAssetId = prev.id;
    else {
      const got = await downloadSiteImage(site.logo.src, fetchImpl);
      if (got) {
        const base = `${C("logo", "logo")}-${slug(site.name) || "site"}`;
        const meta = { source: site.logo.src, provided: true, fromSite: true, kind: site.logo.kind };
        const original = await saveAsset({ projectId, userId, data: got.data, name: `${base}.${got.ext}`, mime: got.mime, kind: "image", role: "logo", folderKey: "brand.logos", origin: "site", meta: { ...meta, original: true } });
        logoAssetId = original.id;
        if (got.mime !== "image/png") {
          try {
            const png = await logoToPng(got.data, got.mime);
            const conv = await saveAsset({ projectId, userId, data: png, name: `${base}.png`, mime: "image/png", kind: "image", role: "logo", folderKey: "brand.logos", origin: "site", sourceAssetId: original.id, meta: { ...meta, png: true } });
            // Le thème garde l'original (SVG net) ; une icône ICO est remplacée par sa version PNG.
            if (/icon/.test(got.mime)) logoAssetId = conv.id;
          } catch {
            /* conversion impossible : l'original reste le logo */
          }
        }
      }
    }
  }

  // Images : produits d'abord (produit principal = originaux à détourer ; autres = catalogue), puis pages.
  let images = 0;
  let photos = 0;
  const seen = new Set<string>();
  const save = async (src: string, role: string, folderKey: string, extra: Record<string, unknown> = {}) => {
    if (!src || seen.has(src) || /^data:/i.test(src) && src.length > 2_000_000) return null;
    seen.add(src);
    const prev = existingBySource(projectId, src);
    if (prev) return prev;
    const got = await downloadSiteImage(src, fetchImpl);
    if (!got || /icon/.test(got.mime)) return null;
    let r = role;
    let folder = folderKey;
    if (r === "lifestyle") {
      // Petites images et dessins (SVG) : gardés pour la reproduction du site, pas utilisés comme photos.
      const { w, h } = await sizeOf(got.data);
      if (got.mime === "image/svg+xml" || Math.min(w, h) < PHOTO_MIN) {
        r = "site-image";
        folder = "imports.site";
      } else photos++;
    }
    const name = `${C("site", "site")}-${slug(String(extra.hint ?? "image"))}-${images + 1}.${got.ext}`;
    const a = await saveAsset({ projectId, userId, data: got.data, name, mime: got.mime, kind: "image", role: r, folderKey: folder, origin: "site", meta: { source: src, fromSite: true, ...extra } });
    images++;
    return a;
  };
  const products = site.business === "products" ? site.products.slice(0, MAX_PRODUCTS) : [];
  const total = products.reduce((n, sp) => n + Math.min(4, sp.images.length), 0) + MAX_PAGE_IMAGES;
  let done = 0;
  const tick = (label: string) => ctx.progress(0.6 + (0.38 * ++done) / Math.max(1, total), label);
  for (const [i, sp] of products.entries()) {
    for (const [k, src] of sp.images.slice(0, 4).entries()) {
      tick(L(`Photos du produit « ${sp.title} »`, `Photos of “${sp.title}”`));
      if (i === 0) {
        if (await save(src, "original", "product.originals", { hint: sp.handle, product: sp.handle })) photos++;
      } else await save(src, k === 0 ? "catalog-original" : "site-image", k === 0 ? "product.catalog" : "imports.site", { hint: sp.handle, product: sp.handle });
    }
  }
  const pageImages: { src: string; page: string }[] = [];
  for (const pg of site.pages) for (const b of pg.blocks) for (const src of blockImages(b)) if (!pageImages.some((x) => x.src === src)) pageImages.push({ src, page: pg.url });
  for (const { src, page } of pageImages.slice(0, MAX_PAGE_IMAGES)) {
    tick(L("Images du site", "Website images"));
    await save(src, "lifestyle", "images.scenes", { hint: "image", page });
  }
  if (pageImages.length > MAX_PAGE_IMAGES) {
    site.warnings.push(L(`${pageImages.length - MAX_PAGE_IMAGES} image(s) du site non reprise(s) : limite de ${MAX_PAGE_IMAGES} images atteinte.`, `${pageImages.length - MAX_PAGE_IMAGES} site image(s) not retrieved: ${MAX_PAGE_IMAGES}-image limit reached.`));
  }
  return { logoAssetId, logoProvided: !!uploaded, images, photos };
}

/**
 * Marque d'un projet parti d'un site existant : nom, logo, palette et polices du site.
 * Seuls le ton, la stratégie et les messages (déduits par l'IA ou le moteur local) complètent.
 */
export function applySiteIdentity(projectId: string, brand: Brand, site: SiteImport): Brand {
  const pal = sitePalette(site);
  const hf = matchFont(site.fonts.heading ?? site.fonts.all[0], "heading");
  const bf = matchFont(site.fonts.body ?? site.fonts.all[0], "body");
  // Logo pour les visuels : la version PNG du logo du site (ou celui envoyé par le client).
  const logos = all<Asset>("SELECT * FROM assets WHERE project_id = ? AND role = 'logo' AND origin IN ('upload','site') AND deleted_at IS NULL ORDER BY (origin = 'upload') DESC, created_at DESC", projectId);
  const uploaded = logos.find((a) => a.origin === "upload");
  const png = logos.find((a) => a.mime === "image/png" || a.mime === "image/jpeg" || a.mime === "image/webp");
  const logo = uploaded ?? png ?? logos[0];
  // Signature : celle du site seulement (slogan ou description courte) ; rien n'est inventé.
  const tagline = site.tagline && site.tagline.length <= 140 ? site.tagline : "";
  return {
    ...brand,
    name: site.name || brand.name,
    nameStatus: "provided",
    alternatives: [],
    tagline,
    palette: pal,
    fonts: { heading: hf.handle, body: bf.handle },
    direction: closestDirection(site),
    logo: logo
      ? { assetId: logo.id, concept: uploaded ? C("Logo fourni par le client", "Logo provided by the client") : C("Logo repris de votre site", "Logo taken from your website"), status: "provided" }
      : { concept: C("Aucun logo trouvé sur votre site : ajoutez-le dans l'onglet Marque.", "No logo found on your website: add it in the Brand tab."), status: "provided" },
    validated: [...new Set([...(brand.validated ?? []), "name", "logo", "palette", "fonts"])],
  };
}

/** Notes de reproduction (ce qui est fidèle / approché) enregistrées avec la version, recopiées dans le résumé du site. */
export function saveReproductionNotes(projectId: string, versionId: string) {
  const row = one<{ qc: string | null }>("SELECT qc FROM theme_versions WHERE id = ?", versionId);
  const notes = json<{ notes?: string[] }>(row?.qc, {}).notes ?? [];
  updateSiteSummary(projectId, { notes });
  return notes;
}

/** Le site du client est-il conservé (pas de thème créé par le studio) ? */
export function siteKept(projectId: string): boolean {
  const s = loadProject(projectId).settings.existingSite;
  return !!s && s.decision === "keep" && !s.newSiteRequested;
}

