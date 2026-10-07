/**
 * Création du jeu d'images d'un projet : détourage, packshots, détails réels,
 * mises en scène (décor IA si disponible, sinon studio local), bannières,
 * visuels sociaux et publicitaires. Chaque fichier est rangé, nommé et lié.
 * Entreprise de services : pas de détourage ni de packshot — voir ./service-media
 * (photos réelles de l'activité ou visuels typographiques, offre réelle).
 */
import { effectivePalette } from "../route-palette";
import { dedupeCreativeText, renderProCreatives } from "../media/creative-html";
import sharp from "sharp";
import { loadImage } from "@napi-rs/canvas";
import { all, one } from "../db";
import { assetData, saveAsset, type Asset } from "../library";
import { loadProject, notify, type Project } from "../projects";
import { detailCrops } from "../media/cutout";
import { ensureCutouts } from "./cutouts";
import { FORMATS, renderCreative, renderPackshot, renderScene, renderBanner, type FormatId, type Layout, type SceneStyle, type Typo } from "../media/compose";
import { canvasFamily } from "../media/fonts";
import { aiImageBrief, aiQcImage, qcScore, qcTier, type QcTier } from "../ai/tasks";
import { llmConfigured } from "../ai/llm";
import { geminiPlate, imageProviderAvailable, openaiScene, refundMediaQuota } from "../ai/media-providers";
import { JobCancelled, JobPaused, type JobContext } from "../jobs";
import { directionById } from "../theme/directions";
import { C, L } from "../i18n-server";
import { generateServiceImageSet, generateServiceSingleImage, isServices, type ServiceSingleRequest } from "./service-media";
import { finalImagePrompt, photoLine, photoLineInput, scenePromptFromLine, type PhotoLine } from "./photo-line";
import type { CreativeLook } from "../media/creative-html";
import type { SceneLook } from "../media/compose";

/** Ligne photographique de la marque (piste créative choisie, secteur, cible) : toutes les images en découlent. */
export function brandPhotoLine(p: Project): PhotoLine {
  return photoLine(photoLineInput(p));
}
/** Réglages des décors locaux tirés de la ligne (mur, plateau, côté de la lumière, étalonnage). */
export function sceneLook(l: PhotoLine): SceneLook {
  return { wall: l.local.wall, top: l.local.top, tint: l.local.tint, tintAlpha: l.local.tintAlpha, lightFrom: l.light.from, grain: l.grade.grain };
}
/** Couleurs des visuels avec texte tirées de la ligne (même campagne que les photos). */
export function creativeLook(l: PhotoLine): CreativeLook {
  return { ...l.creative, lightFrom: l.light.from };
}

export function latestAsset(projectId: string, role: string): Asset | undefined {
  return one<Asset>("SELECT * FROM assets WHERE project_id = ? AND role = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1", projectId, role);
}
export function assetsByRole(projectId: string, role: string, limit = 20): Asset[] {
  return all<Asset>("SELECT * FROM assets WHERE project_id = ? AND role = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT ?", projectId, role, limit);
}

export function brandTypo(p: Project): Typo {
  const d = directionById(p.brand?.direction ?? "atelier");
  const heading = canvasFamily(p.brand?.fonts.heading ?? d.fonts.heading, "Cormorant");
  const body = canvasFamily(p.brand?.fonts.body ?? d.fonts.body, "Jost");
  const heavy = ["brut", "elan", "pop"].includes(d.id);
  // Piste de logo retenue : visuels et publications reprennent ses typographies (même voix que le logo et le kit).
  const route = p.brand?.logo.route;
  if (route) return { heading: route.heading, body: route.body, headingWeight: Math.min(800, Math.max(500, route.headingWeight)), uppercase: d.id === "brut" || d.id === "elan" };
  return { heading, body, headingWeight: heavy ? 800 : 500, uppercase: d.id === "brut" || d.id === "elan" };
}

/** Palette des visuels : celle de la piste de logo retenue (voir route-palette.ts), sinon celle de la marque. */
export function palette(p: Project) {
  return effectivePalette(p.brand) ?? { primary: "#6E5644", secondary: "#E6DACB", accent: "#B98B5E", light: "#F6F2EC", dark: "#1C1713" };
}

const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || C("produit", "product");

/** Ligne d'accroche courte pour les visuels (au plus ~60 caractères, coupée sur une virgule ou un mot). */
export function shortLine(text: string, max = 60): string {
  const first = text.split(/(?<=[.!?])\s/)[0].replace(/[.!?]$/, "").trim();
  if (first.length <= max) return first;
  const clause = first.split(",")[0].trim();
  if (clause.length >= 20 && clause.length <= max) return clause;
  return first.slice(0, max).replace(/\s+\S*$/, "").replace(/[\s,;:–-]+$/, "");
}

/** Détourages triés, contrôlés et utilisables (voir ./cutouts) : les détourages refusés ne servent jamais. */
export { ensureCutouts, validCutouts } from "./cutouts";

type ImgCtx = { userId: string; projectId: string; jobId?: string | null };

/**
 * Contrôle de fidélité OBLIGATOIRE d'une image produite avec l'IA (décor peint autour du produit, ou décor généré
 * puis produit composé) : même produit, non déformé, pas en double, ombre et échelle crédibles, aucun texte ajouté.
 * Sans IA de contrôle disponible, l'image n'est pas utilisée (jamais d'image IA non vérifiée montrée au client).
 */
export async function verifyAiImage(ictx: ImgCtx & { usageKey: string }, reference: Buffer, image: Buffer): Promise<{ ok: boolean; tier: QcTier; qc: unknown; reason: string }> {
  if (!llmConfigured()) return { ok: false, tier: "warn", qc: null, reason: L("contrôle de fidélité indisponible : vérifiez l'image", "fidelity check unavailable: check the image") };
  let check: Awaited<ReturnType<typeof aiQcImage>>;
  try {
    check = await aiQcImage(ictx, reference, image);
  } catch (e) {
    if (e instanceof JobCancelled || e instanceof JobPaused) throw e;
    // Contrôle en panne : l'image payée est gardée, signalée à vérifier par le client.
    return { ok: false, tier: "warn", qc: null, reason: L("contrôle automatique impossible : vérifiez l'image", "automatic check unavailable: check the image") };
  }
  const tier = qcTier(check);
  const ok = tier === "good";
  const reason = ok ? "" : !check.sameProduct ? L(`produit différent du vôtre${check.issues.length ? ` (${check.issues.join(" ; ")})` : ""}`, `product differs from yours${check.issues.length ? ` (${check.issues.join("; ")})` : ""}`) : L(`contrôle de fidélité insuffisant (${qcScore(check.score)}/10${check.issues.length ? ` : ${check.issues.join(" ; ")}` : ""})`, `fidelity check failed (${qcScore(check.score)}/10${check.issues.length ? `: ${check.issues.join("; ")}` : ""})`);
  return { ok, tier, qc: check, reason };
}

/** Statut et mention d'une image générée selon son contrôle (jamais perdue : écartée reste visible dans Images). */
export const tierSave = (tier: QcTier, reason: string) => ({ status: (tier === "bad" ? "rejected" : "review") as "rejected" | "review", meta: tier === "good" ? {} : { qcWarning: reason } });

async function aiBackground(ictx: ImgCtx, project: Project, cut: Buffer, style: string, formatId: FormatId, key: string, lifestyle?: string): Promise<{ image: Buffer; provider: string; lightFrom?: "left" | "right" } | null> {
  const provider = imageProviderAvailable();
  if (!provider) return null;
  // Brief de directeur artistique (grille notée, une reprise au plus) ; sans IA de rédaction, consigne du studio
  // tirée de la ligne photographique — dans les deux cas, la même ligne de campagne pour toutes les images.
  const line = brandPhotoLine(project);
  const brief = llmConfigured()
    ? await aiImageBrief({ ...ictx, usageKey: `${key}:brief` }, project, lifestyle ? C(`PHOTO EN SITUATION (vie de tous les jours) : ${lifestyle}`, `LIFESTYLE PHOTO (everyday life): ${lifestyle}`) : C(`mise en scène produit (style ${style})`, `product staging (${style} style)`), { line, lifestyle, format: FORMATS[formatId].label })
    : (() => {
        const st = scenePromptFromLine(line, { lifestyle, format: FORMATS[formatId].label });
        return { ...st, prompt: finalImagePrompt(st, line, { lifestyle: !!lifestyle }) };
      })();
  const f = FORMATS[formatId];
  if (provider === "openai") {
    // Cadre à la taille OpenAI la plus proche, produit placé, masque du produit.
    const size = f.w > f.h * 1.2 ? "1536x1024" : f.h > f.w * 1.2 ? "1024x1536" : "1024x1024";
    const [W, H] = size.split("x").map(Number);
    const prod = await sharp(cut).resize({ height: Math.round(H * 0.6), width: Math.round(W * 0.7), fit: "inside" }).png().toBuffer();
    const pm = await sharp(prod).metadata();
    const left = Math.round((W - (pm.width ?? 0)) / 2);
    const top = Math.round(H * 0.82 - (pm.height ?? 0));
    const base = sharp({ create: { width: W, height: H, channels: 4, background: { r: 235, g: 230, b: 224, alpha: 1 } } });
    const composite = await base.composite([{ input: prod, left, top }]).png().toBuffer();
    const mask = await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: prod, left, top }]).png().toBuffer();
    const painted = await openaiScene({ ...ictx, usageKey: `${key}:openai` }, { composite, productMask: mask, prompt: brief.prompt, size: size as any });
    // On replace exactement les pixels du produit d'origine par-dessus.
    const restored = await sharp(painted).resize(W, H).composite([{ input: prod, left, top }]).png().toBuffer();
    return { image: restored, provider: "openai" };
  }
  const aspect = f.w > f.h * 1.5 ? "16:9" : f.h > f.w * 1.5 ? "9:16" : f.h > f.w * 1.1 ? "4:5" : "1:1";
  const plate = await geminiPlate({ ...ictx, usageKey: `${key}:gemini` }, { prompt: brief.prompt, aspect });
  return { image: plate, provider: "google-plate", lightFrom: brief.lightFrom };
}

export type ImageSetOptions = { scenes?: SceneStyle[]; withAi?: boolean; social?: boolean; banner?: boolean };

/**
 * Jeu d'images complet. Idempotent par étape (points de reprise du job) :
 * une reprise ne refait pas — et ne repaie pas — ce qui est déjà produit.
 */
export async function generateImageSet(ctx: JobContext, projectId: string, opts: ImageSetOptions = {}) {
  let project = loadProject(projectId);
  if (isServices(project)) return generateServiceImageSet(ctx, projectId, opts);
  const ictx: ImgCtx = { userId: project.userId, projectId, jobId: ctx.job.id };
  const cutouts = await ensureCutouts(ctx, project);
  if (!cutouts.length) throw new Error(L("Aucune photo du produit : importez au moins une photo pour créer les images.", "No product photo: upload at least one photo to create the images."));
  project = loadProject(projectId);
  const main = cutouts[0];
  const cutBuf = assetData(main);
  const product = await loadImage(cutBuf);
  const pal = palette(project);
  const typo = brandTypo(project);
  const line = brandPhotoLine(project);
  const look = sceneLook(line);
  const lineMeta = { photoLine: L(line.name.fr, line.name.en) };
  const base = slug(project.product.name || project.name);
  const created: string[] = [];
  const originalPhoto = () => assetData(one<Asset>("SELECT * FROM assets WHERE id = ?", main.source_asset_id) ?? main);
  const save = async (data: Buffer, name: string, role: string, folderKey: string, meta: Record<string, unknown>, mime = "image/jpeg", status: "review" | "rejected" = "review") => {
    const a = await saveAsset({ projectId, userId: project.userId, data, name, mime, role, folderKey, origin: "generated", sourceAssetId: main.id, meta, status });
    created.push(a.id);
    return a.id;
  };

  await ctx.step("packshots", async () => {
    ctx.progress(0.38, L("Packshots fond blanc et fond de marque", "Packshots on white and on brand background"));
    const ids = [
      await save(await renderPackshot(product), `${base}-packshot-${C("blanc", "white")}.jpg`, "packshot", "images.packshots", { recipe: L("Packshot fond blanc, ombre de contact", "Packshot on white, contact shadow"), fidelity: L("pixels d'origine du produit", "original product pixels") }),
      await save(await renderPackshot(product, { background: line.creative.mode === "tonal" ? line.creative.ground : pal.light }), `${base}-packshot-${C("fond-marque", "brand-background")}.jpg`, "packshot", "images.packshots", { recipe: L("Packshot fond de marque", "Packshot on brand background"), fidelity: L("pixels d'origine du produit", "original product pixels") }),
    ];
    return ids;
  });

  await ctx.step("details", async () => {
    ctx.progress(0.45, L("Détails produit (recadrages de la photo originale)", "Product details (crops of the original photo)"));
    const original = one<Asset>("SELECT * FROM assets WHERE id = ?", main.source_asset_id)!;
    const meta = JSON.parse(main.meta || "{}");
    const regions = project.product.visual && (project.product as any).detailRegions;
    const crops = await detailCrops(assetData(original), { png: cutBuf, width: product.width, height: product.height, bbox: meta.bbox, sourceW: meta.source.w, sourceH: meta.source.h, method: "model" }, regions);
    const ids: string[] = [];
    for (const [i, c] of crops.entries()) ids.push(await save(c, `${base}-detail-${i + 1}.jpg`, "detail", "images.details", { recipe: L("Recadrage haute définition de la photo originale (aucune génération)", "High-resolution crop of the original photo (nothing generated)") }));
    return ids;
  });

  // Mises en scène de la ligne photographique (même lumière, mêmes matières, même étalonnage).
  const styles = opts.scenes ?? (line.local.scenes as SceneStyle[]);
  const withAi = opts.withAi !== false && !!imageProviderAvailable();
  for (const [i, style] of styles.entries()) {
    await ctx.step(`scene:${style}`, async () => {
      ctx.progress(0.5 + i * 0.08, L(`Mise en scène « ${style} »${withAi ? " (décor généré)" : ""}`, `Staging "${style}"${withAi ? " (generated set)" : ""}`));
      let qc: unknown = null;
      const provider = "local";
      if (withAi && i === 0) {
        try {
          const r = await aiBackground(ictx, project, cutBuf, style, "product", `${ctx.job.id}:scene:${style}`);
          if (r) {
            // OpenAI : décor peint autour du produit (pixels d'origine replacés) ; Gemini : décor vide + produit réel composé.
            const image = r.provider === "openai" ? r.image : (await renderScene({ product, palette: pal, style, format: FORMATS.product, seed: 7 + i, background: await loadImage(r.image), lightFrom: r.lightFrom })).png;
            const check = await verifyAiImage({ ...ictx, usageKey: `${ctx.job.id}:qc:${style}` }, originalPhoto(), image);
            qc = check.qc;
            const keep = tierSave(check.tier, check.reason);
            const id = await save(await sharp(image).jpeg({ quality: 92 }).toBuffer(), `${base}-scene-${style}-${C("ia", "ai")}.jpg`, "scene", "images.scenes", { ...(r.provider === "openai" ? { recipe: L(`Décor peint par IA autour du produit réel (${style})`, `AI-painted set around the real product (${style})`), provider: "OpenAI", qc } : { recipe: L(`Décor généré par IA, produit réel composé (${style})`, `AI-generated set with the real product composited (${style})`), provider: L("Gemini (décor) + composition locale", "Gemini (set) + local compositing"), qc }), ...keep.meta }, "image/jpeg", keep.status);
            if (check.tier === "good") return [id];
            // Image de l'IA gardée (signalée ou écartée, visible dans Images) ; une scène du studio complète la série.
            if (check.tier === "bad") refundMediaQuota(ictx.userId, `${ctx.job.id}:scene:${style}`);
            const s = await renderScene({ product, palette: pal, style, format: FORMATS.product, seed: 7 + i, look });
            return [id, await save(await sharp(s.png).jpeg({ quality: 92 }).toBuffer(), `${base}-scene-${style}.jpg`, "scene", "images.scenes", { recipe: L(`Mise en scène ${style}`, `Staging: ${style}`), provider, qc: { fallback: check.reason }, ...lineMeta })];
          }
        } catch (e) {
          if (e instanceof JobCancelled || e instanceof JobPaused) throw e;
          // Image IA écartée (fidélité non concluante, contrôle impossible…) : remplacée par une scène locale, le visuel n'est pas décompté.
          refundMediaQuota(ictx.userId, `${ctx.job.id}:scene:${style}`);
          qc = { fallback: (e as Error).message };
        }
      }
      const s = await renderScene({ product, palette: pal, style, format: FORMATS.product, seed: 7 + i, look });
      return [await save(await sharp(s.png).jpeg({ quality: 92 }).toBuffer(), `${base}-scene-${style}.jpg`, "scene", "images.scenes", { recipe: L(`Mise en scène ${style}`, `Staging: ${style}`), provider, qc, ...lineMeta })];
    });
  }

  // Photos en situation, dans la vie de tous les jours (IA d'image requise) : elles ouvrent la boutique.
  if (withAi) {
    // Situations de la ligne photographique : secteur, cible, lumière et matières de la marque.
    const contexts = line.situations.map((x) => x.en);
    for (const [i, situation] of contexts.entries()) {
      await ctx.step(`lifestyle:${i}`, async () => {
        ctx.progress(0.7 + i * 0.02, L("Photos du produit en situation", "Lifestyle product photos"));
        try {
          // Gemini : décor de vie généré, produit réel posé dessus par la composition locale (ombres, sol).
          const attempt = async (key: string, avoid?: string) => {
            const r = await aiBackground(ictx, project, cutBuf, "lifestyle", i === 0 ? "landscape" : "product", key, avoid ? `${situation}. A previous attempt was rejected for: ${avoid}. Avoid exactly these defects.` : situation);
            if (!r) return null;
            const image = r.provider === "openai" ? r.image : (await renderScene({ product, palette: pal, style: "spotlight", format: i === 0 ? FORMATS.landscape : FORMATS.product, seed: 31 + i, background: await loadImage(r.image), lightFrom: r.lightFrom })).png;
            return { r, image, check: await verifyAiImage({ ...ictx, usageKey: `${key}:qc` }, originalPhoto(), image) };
          };
          let got = await attempt(`${ctx.job.id}:lifestyle:${i}`);
          if (!got) return [];
          // Photo ratée : une reprise qui reprend les défauts relevés (le raté n'est ni livré ni décompté).
          if (got.check.tier === "bad") {
            refundMediaQuota(ictx.userId, `${ctx.job.id}:lifestyle:${i}`);
            got = (await attempt(`${ctx.job.id}:lifestyle:${i}:retry`, got.check.reason).catch((e) => { if (e instanceof JobCancelled || e instanceof JobPaused) throw e; return null; })) ?? got;
          }
          const { r, image, check } = got;
          // Photo gardée dans tous les cas (payée) : signalée si défaut mineur, écartée (visible, non utilisée) si inutilisable.
          if (check.tier === "bad") refundMediaQuota(ictx.userId, `${ctx.job.id}:lifestyle:${i}:retry`);
          const keep = tierSave(check.tier, check.reason);
          return [await save(await sharp(image).jpeg({ quality: 92 }).toBuffer(), `${base}-${C("en-situation", "lifestyle")}-${i + 1}.jpg`, "lifestyle", "images.scenes", { ...(r.provider === "openai" ? { recipe: L(`Photo en situation générée autour du produit réel : ${situation}`, `Lifestyle photo generated around the real product: ${situation}`), provider: "OpenAI", qc: check.qc } : { recipe: L(`Photo en situation : décor généré (${situation}) et produit réel composé`, `Lifestyle photo: generated set (${situation}) with the real product composited`), provider: L("Gemini + composition locale", "Gemini + local compositing"), qc: check.qc }), ...keep.meta }, "image/jpeg", keep.status)];
        } catch (e) {
          if (e instanceof JobCancelled || e instanceof JobPaused) throw e;
          console.warn("[images] photo en situation indisponible :", (e as Error).message);
          refundMediaQuota(ictx.userId, `${ctx.job.id}:lifestyle:${i}`);
          return [];
        }
      });
    }
  }

  // Univers du produit en photos libres de droits (gratuites) : sections du site sans produit, plans de coupe vidéo.
  await ctx.step("universe", async () => {
    ctx.progress(0.73, L("Photos libres de droits de l'univers du produit", "Royalty-free photos of the product's world"));
    const { universePhotos } = await import("./stock-universe");
    const got = await universePhotos(ictx, project, 2).catch((e) => {
      if (e instanceof JobCancelled || e instanceof JobPaused) throw e;
      console.warn("[univers] photos libres indisponibles :", (e as Error).message);
      return [] as Asset[];
    });
    created.push(...got.map((a) => a.id));
    return got.map((a) => a.id);
  });

  // Bannière publicitaire 16:9 de niveau agence (texte, produit, informations confirmées).
  const proBanner = async () => {
    const r = await renderProCreatives({ product: cutBuf, palette: pal, typo: brandTypo(project), brand: project.brand?.name ?? project.name, headline: project.brand?.tagline || project.product.name || project.name, subline: shortLine(project.product.name || ""), keyword: keywordFor(project), facts: confirmedFacts(project), cta: C("Découvrir", "Shop now"), look: creativeLook(line) }, [{ template: "signature", format: "landscape" }]).catch(() => null);
    return r?.length ? [await save(r[0].jpg, `${base}-${C("banniere-publicite", "ad-banner")}-16x9.jpg`, "banner", "images.banners", { recipe: L("Bannière publicitaire 16:9 (mise en page agence)", "16:9 ad banner (agency layout)") })] : [];
  };
  if (opts.banner !== false) {
    await ctx.step("banner", async () => {
      ctx.progress(0.75, L("Bannières de boutique", "Store banners"));
      return [
        await save(await renderBanner(product, pal, line.local.scenes[0] === "spotlight" || line.local.scenes[0] === "window" ? line.local.scenes[0] : "studio", FORMATS.banner, 21, null, look), `${base}-${C("banniere", "banner")}-studio.jpg`, "banner", "images.banners", { recipe: L("Bannière 2:1 sans texte (textes dans le thème)", "2:1 banner without text (text lives in the theme)") }),
        await save(await renderBanner(product, pal, "color", FORMATS.landscape, 22, null, look), `${base}-${C("banniere-couleur", "banner-color")}.jpg`, "banner", "images.banners", { recipe: L("Bannière 16:9 fond de marque", "16:9 banner on brand background") }),
        ...(await proBanner()),
      ];
    });
  }

  if (opts.social !== false) {
    await ctx.step("social", async () => {
      ctx.progress(0.85, L("Visuels réseaux sociaux et publicités", "Social media and ad visuals"));
      const headline = project.brand?.tagline || project.product.name || project.brand?.name || C("Découvrir", "Discover");
      const sub = shortLine(project.product.summary ?? "");
      const brandName = project.brand?.name ?? project.name;
      const logoAsset = latestAsset(projectId, "logo");
      const logo = logoAsset ? await loadImage(assetData(logoAsset)) : null;
      const variants: [FormatId, Layout, string, string][] = [
        ["portrait", "editorial", "images.social", "social"],
        ["square", "centered", "images.social", "social"],
        ["story", "centered", "images.ads", "ad"],
        ["square", "bold", "images.ads", "ad"],
      ];
      const ids: string[] = [];
      // Visuels de niveau agence (mise en page HTML) quand un navigateur est disponible.
      // Textes dédoublonnés avant de choisir la mise en page : la mise en page « arguments » demande 3 informations distinctes.
      const proIn = dedupeCreativeText({ product: cutBuf, palette: pal, typo, brand: brandName, logo: null, headline, subline: shortLine(project.product.name || ""), keyword: keywordFor(project), facts: confirmedFacts(project), cta: C("Découvrir", "Shop now"), look: creativeLook(line) });
      const args = proIn.facts.length >= 3;
      const pro = await renderProCreatives(
        proIn,
        [
          { template: "signature", format: "portrait" },
          { template: "editorial", format: "square" },
          { template: "signature", format: "story" },
          { template: args ? "arguments" : "editorial", format: args ? "square" : "story" },
        ],
      ).catch(() => null);
      if (pro?.length) {
        for (const [k, r] of pro.entries()) {
          const role = k < 2 ? "social" : "ad";
          ids.push(await save(r.jpg, `${base}-${role === "ad" ? C("publicite", "ad") : "post"}-${r.label.replace(":", "x")}-${r.template}.jpg`, role, role === "ad" ? "images.ads" : "images.social", { recipe: L(`Visuel ${r.label} (${r.template})`, `${r.label} visual (${r.template})`), text: { headline }, format: r.label }));
        }
        return ids;
      }
      for (const [fmt, layout, folder, role] of variants) {
        const r = await renderCreative({ product, palette: pal, typo, format: FORMATS[fmt], layout, headline, subline: sub, cta: role === "ad" ? C("Découvrir", "Shop now") : undefined, brand: brandName, logo, seed: ids.length + 3, look });
        ids.push(await save(r.jpg, `${base}-${role === "ad" ? C("publicite", "ad") : "post"}-${FORMATS[fmt].label.replace(":", "x")}-${layout}.jpg`, role, folder, { recipe: L(`Visuel ${FORMATS[fmt].label} (${layout})`, `${FORMATS[fmt].label} visual (${layout})`), text: { headline, sub }, safeArea: r.safe, minFontPx: r.minFontPx, format: FORMATS[fmt].label }));
      }
      return ids;
    });
  }
  ctx.progress(0.98, L("Images prêtes", "Images ready"));
  return { created };
}

/** Informations confirmées, très courtes, pour les pastilles des visuels (jamais d'allégation inventée). */
export function confirmedFacts(p: Project): string[] {
  const out: string[] = [];
  const cat = (p.product as any).category as string | undefined;
  if (cat && cat.length <= 24) out.push(cat);
  for (const f of p.product.facts) {
    if (f.status === "unknown" || !f.value || f.key === "price") continue;
    const v = f.value.replace(/\.$/, "").trim();
    if (v.length <= 28) out.push(v);
  }
  for (const v of p.product.variants ?? []) if (v.values.length > 1) out.push(C(`${v.values.length} ${v.name.toLowerCase()}${/[sx]$/.test(v.name) ? "" : "s"} au choix`, `${v.values.length} ${v.name.toLowerCase()}${/s$/i.test(v.name) ? "" : "s"} available`));
  // Peu d'informations confirmées : le nom du produit sert de repère (jamais d'argument inventé).
  if (out.length < 2 && p.product.name) {
    // Nom long : les premiers mots, sans couper un mot.
    let short = "";
    for (const w of p.product.name.split(/\s+/)) if ((short + " " + w).trim().length <= 26) short = (short + " " + w).trim(); else break;
    if (short) out.unshift(short.replace(C(/\s+(à|de|du|des|et|en|pour|avec)$/i, /\s+(a|an|the|of|and|in|for|with|to)$/i), ""));
  }
  return [...new Set(out)].slice(0, 3);
}

/** Mot court pour le filigrane : dernier mot distinctif du nom (saveur, modèle), sinon la marque. */
function keywordFor(p: Project): string {
  const all = (p.product.name || "").split(/\s+/).filter(Boolean);
  // Nom court (« Thé glacé Pêche ») : son dernier mot ; nom descriptif long : la marque.
  const last = all.at(-1) ?? "";
  return all.length <= 3 && last.length >= 3 && last.length <= 10 ? last : p.brand?.name ?? last;
}

/** Génère une image unique à la demande (studio Images). */
export async function generateSingleImage(ctx: JobContext, projectId: string, req: { kind: "packshot" | "scene" | "social" | "ad" | "banner" | ServiceSingleRequest["kind"]; style?: SceneStyle; format?: FormatId; layout?: Layout; headline?: string; subline?: string; cta?: string; useAi?: boolean; sourceCutoutId?: string; serviceIndex?: number; items?: string[]; usePhoto?: boolean; photoId?: string }) {
  const project = loadProject(projectId);
  if (isServices(project)) return generateServiceSingleImage(ctx, projectId, { ...req, kind: req.kind === "packshot" ? "banner" : req.kind });
  if (!["packshot", "scene", "social", "ad", "banner"].includes(req.kind)) throw new Error(L("Ce type d'image est réservé aux entreprises de services.", "This image type is for service businesses only."));
  const cutouts = await ensureCutouts(ctx, project);
  const cut = (req.sourceCutoutId && cutouts.find((c) => c.id === req.sourceCutoutId)) || cutouts[0];
  if (!cut) throw new Error(L("Importez d'abord une photo du produit.", "Upload a product photo first."));
  const product = await loadImage(assetData(cut));
  const pal = palette(project);
  const look = sceneLook(brandPhotoLine(project));
  const fmt = FORMATS[req.format ?? (req.kind === "banner" ? "banner" : req.kind === "packshot" ? "packshot" : "portrait")];
  const base = slug(project.product.name || project.name);
  const ictx: ImgCtx = { userId: project.userId, projectId, jobId: ctx.job.id };
  let data: Buffer;
  let meta: Record<string, unknown> = {};
  let role: string = req.kind;
  let folder = "images.scenes";
  ctx.progress(0.3, L("Composition de l'image", "Composing the image"));
  if (req.kind === "packshot") {
    data = await renderPackshot(product, { format: fmt });
    folder = "images.packshots";
    meta = { recipe: "Packshot" };
  } else if (req.kind === "scene" || req.kind === "banner") {
    let aiNote: string | null = null;
    if (req.useAi) {
      const r = await ctx.step("ai-bg", async () => {
        try {
          const out = await aiBackground(ictx, project, assetData(cut), req.style ?? "studio", req.format ?? "product", `${ctx.job.id}:single`);
          if (!out) return null;
          const image = out.provider === "openai" ? out.image : (await renderScene({ product, palette: pal, style: req.style ?? "studio", format: fmt, seed: Date.now() % 1000, background: await loadImage(out.image), lightFrom: out.lightFrom, offsetX: req.kind === "banner" ? 0.18 : 0 })).png;
          const original = one<Asset>("SELECT * FROM assets WHERE id = ?", cut.source_asset_id) ?? cut;
          const check = await verifyAiImage({ ...ictx, usageKey: `${ctx.job.id}:single:qc` }, assetData(original), image);
          if (!check.ok) {
            refundMediaQuota(ictx.userId, `${ctx.job.id}:single`);
            return { rejected: check.reason };
          }
          return { b64: image.toString("base64"), provider: out.provider, qc: check.qc };
        } catch (e) {
          if (e instanceof JobCancelled || e instanceof JobPaused) throw e;
          refundMediaQuota(ictx.userId, `${ctx.job.id}:single`);
          return { rejected: (e as Error).message };
        }
      });
      if (r && "b64" in r && r.b64) {
        data = await sharp(Buffer.from(r.b64, "base64")).jpeg({ quality: 92 }).toBuffer();
        const recipe = r.provider === "openai" ? L("Décor peint par IA autour du produit réel", "AI-painted set around the real product") : L("Décor généré par IA, produit réel composé", "AI-generated set with the real product composited");
        const a = await saveAsset({ projectId, userId: project.userId, data, name: `${base}-${req.kind === "banner" ? C("banniere", "banner") : "scene"}-${C("ia", "ai")}-${Date.now().toString(36)}.jpg`, mime: "image/jpeg", role: req.kind, folderKey: req.kind === "banner" ? "images.banners" : "images.scenes", origin: "generated", sourceAssetId: cut.id, meta: { recipe, provider: r.provider === "openai" ? "OpenAI" : L("Gemini (décor) + composition locale", "Gemini (set) + local compositing"), qc: r.qc, format: fmt.label }, status: "review" });
        return { assetId: a.id };
      }
      // Image IA refusée au contrôle (ou indisponible) : scène composée localement, la raison est gardée et affichée.
      aiNote = r && "rejected" in r ? r.rejected ?? null : L("génération d'image IA indisponible", "AI image generation unavailable");
    }
    const s = await renderScene({ product, palette: pal, style: req.style ?? "studio", format: fmt, seed: Date.now() % 1000, offsetX: req.kind === "banner" ? 0.18 : 0, look });
    data = await sharp(s.png).jpeg({ quality: 92 }).toBuffer();
    folder = req.kind === "banner" ? "images.banners" : "images.scenes";
    meta = { recipe: L(`Scène ${req.style ?? "studio"}`, `Scene: ${req.style ?? "studio"}`), provider: "local", ...(aiNote ? { aiFallback: L(`Image IA non utilisée : ${aiNote}. Scène composée à partir de votre photo.`, `AI image not used: ${aiNote}. Scene composed from your photo.`) } : {}) };
  } else {
    const logoAsset = latestAsset(projectId, "logo");
    const r = await renderCreative({ product, palette: pal, typo: brandTypo(project), format: fmt, layout: req.layout ?? "editorial", headline: req.headline || project.brand?.tagline || project.product.name, subline: req.subline, cta: req.cta, brand: project.brand?.name ?? project.name, logo: logoAsset ? await loadImage(assetData(logoAsset)) : null, scene: req.style, seed: Date.now() % 1000, look });
    data = r.jpg;
    folder = req.kind === "ad" ? "images.ads" : "images.social";
    role = req.kind;
    meta = { recipe: L(`Visuel ${fmt.label}`, `${fmt.label} visual`), safeArea: r.safe, minFontPx: r.minFontPx, text: { headline: req.headline, sub: req.subline, cta: req.cta } };
  }
  const a = await saveAsset({ projectId, userId: project.userId, data, name: `${base}-${role}-${fmt.label.replace(":", "x")}-${Date.now().toString(36)}.jpg`, mime: "image/jpeg", role, folderKey: folder, origin: "generated", sourceAssetId: cut.id, meta: { ...meta, format: fmt.label }, status: "review" });
  // Image IA demandée mais non utilisée : dit honnêtement au client (note du travail), jamais passé sous silence.
  if (typeof meta.aiFallback === "string") notify(project.userId, projectId, L("Image IA non utilisée", "AI image not used"), meta.aiFallback, "warning");
  return { assetId: a.id, ...(typeof meta.aiFallback === "string" ? { note: meta.aiFallback } : {}) };
}
