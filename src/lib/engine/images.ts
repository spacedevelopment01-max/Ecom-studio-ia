/**
 * Création du jeu d'images d'un projet : détourage, packshots, détails réels,
 * mises en scène (décor IA si disponible, sinon studio local), bannières,
 * visuels sociaux et publicitaires. Chaque fichier est rangé, nommé et lié.
 */
import sharp from "sharp";
import { loadImage } from "@napi-rs/canvas";
import { all, one } from "../db";
import { assetData, saveAsset, type Asset } from "../library";
import { loadProject, type Project } from "../projects";
import { cutoutProduct, detailCrops, extractPalette } from "../media/cutout";
import { FORMATS, renderCreative, renderPackshot, renderScene, renderBanner, type FormatId, type Layout, type SceneStyle, type Typo } from "../media/compose";
import { canvasFamily } from "../media/fonts";
import { aiImageBrief, aiQcImage } from "../ai/tasks";
import { llmConfigured } from "../ai/llm";
import { geminiPlate, imageProviderAvailable, openaiScene } from "../ai/media-providers";
import type { JobContext } from "../jobs";
import { directionById } from "../theme/directions";

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
  return { heading, body, headingWeight: heavy ? 800 : 500, uppercase: d.id === "brut" || d.id === "elan" };
}

export function palette(p: Project) {
  return p.brand?.palette ?? { primary: "#6E5644", secondary: "#E6DACB", accent: "#B98B5E", light: "#F6F2EC", dark: "#1C1713" };
}

const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "produit";

/** Ligne d'accroche courte pour les visuels (au plus ~60 caractères, coupée sur une virgule ou un mot). */
export function shortLine(text: string, max = 60): string {
  const first = text.split(/(?<=[.!?])\s/)[0].replace(/[.!?]$/, "").trim();
  if (first.length <= max) return first;
  const clause = first.split(",")[0].trim();
  if (clause.length >= 20 && clause.length <= max) return clause;
  return first.slice(0, max).replace(/\s+\S*$/, "").replace(/[\s,;:–-]+$/, "");
}

/** Détoure les photos originales qui ne le sont pas encore. */
export async function ensureCutouts(ctx: JobContext | null, project: Project): Promise<Asset[]> {
  const originals = all<Asset>("SELECT * FROM assets WHERE project_id = ? AND role = 'original' AND kind = 'image' AND deleted_at IS NULL ORDER BY created_at", project.id);
  const out: Asset[] = [];
  for (const [i, o] of originals.entries()) {
    const existing = one<Asset>("SELECT * FROM assets WHERE project_id = ? AND role = 'cutout' AND source_asset_id = ? AND deleted_at IS NULL", project.id, o.id);
    if (existing) {
      out.push(existing);
      continue;
    }
    ctx?.progress(0.05 + (i / Math.max(1, originals.length)) * 0.3, `Détourage de la photo ${i + 1}/${originals.length}`);
    const cut = await cutoutProduct(assetData(o));
    const colors = await extractPalette(cut.png);
    out.push(
      await saveAsset({
        projectId: project.id,
        userId: project.userId,
        data: cut.png,
        name: `${slug(project.product.name || project.name)}-detoure-${i + 1}.png`,
        mime: "image/png",
        role: "cutout",
        folderKey: "product.cutouts",
        origin: "generated",
        sourceAssetId: o.id,
        meta: { method: cut.method === "model" ? "Détourage local (modèle embarqué)" : "Détourage local (fond uni)", bbox: cut.bbox, source: { w: cut.sourceW, h: cut.sourceH }, colors },
      }),
    );
  }
  return out;
}

type ImgCtx = { userId: string; projectId: string; jobId?: string | null };

async function aiBackground(ictx: ImgCtx, project: Project, cut: Buffer, style: string, formatId: FormatId, key: string, lifestyle?: string): Promise<{ image: Buffer; provider: string; qc?: unknown } | null> {
  const provider = imageProviderAvailable();
  if (!provider) return null;
  const brief = llmConfigured()
    ? await aiImageBrief({ ...ictx, usageKey: `${key}:brief` }, project, lifestyle ? `PHOTO EN SITUATION (vie de tous les jours) : ${lifestyle}, format ${FORMATS[formatId].label}` : `${style}, format ${FORMATS[formatId].label}`)
    : lifestyle
      ? { prompt: `Authentic everyday lifestyle photograph: ${lifestyle}. Natural daylight, real home or outdoor setting, candid editorial style, shallow depth of field. People may appear naturally around the product without covering it. No text, no logos, no other branded products.`, surface: "", lightFrom: "left" as const }
      : { prompt: `${style} product photography set, soft natural light, ${project.brand?.palette.secondary ?? "neutral"} tones`, surface: "", lightFrom: "left" as const };
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
  const plate = await geminiPlate({ ...ictx, usageKey: `${key}:gemini` }, { prompt: brief.prompt, reference: cut, aspect });
  return { image: plate, provider: "google-plate" };
}

/** Situations de la vie de tous les jours, par secteur (consignes pour le modèle d'image). */
const LIFESTYLE: Record<string, [string, string]> = {
  beaute: ["on a sunlit bathroom shelf among everyday toiletries, morning routine", "held near a vanity mirror in a bright bedroom, getting ready"],
  mode: ["laid on a bed next to sneakers and a tote bag, bright apartment, getting dressed", "hanging in an entryway by the door, keys and plants nearby, city apartment"],
  bijoux: ["on a wooden dresser next to a hand, soft morning light through linen curtains", "on a café table beside a cup of coffee and a notebook, city morning"],
  maison: ["in a cosy lived-in bedroom on an unmade bed with linen sheets, warm morning light", "in a bright living room on a sofa with a throw blanket and a book, afternoon light"],
  hightech: ["outdoors on a wooden picnic table with a backpack, hills in the background, golden hour", "on a tidy home desk next to a laptop and a coffee mug, daylight"],
  sport: ["on a forest trail next to running shoes and a backpack, early morning", "on a gym bench beside a towel and a water bottle, natural light"],
  alimentation: ["on a sunny café terrace table next to a glass with ice, summer afternoon", "in a picnic basket on a blanket in a park, friends blurred in the background"],
  enfants: ["on a playroom rug among wooden toys, soft daylight", "on a child's bedside table next to a picture book, evening lamp light"],
  animaux: ["on a light grey sofa with a relaxed cat nearby, cosy living room, daylight", "on a wooden floor in a bright living room with a dog resting nearby"],
  artisanat: ["on a wooden workshop table among tools and paper, window light", "on a shelf in a bright home studio next to plants and ceramics"],
};

export type ImageSetOptions = { scenes?: SceneStyle[]; withAi?: boolean; social?: boolean; banner?: boolean };

/**
 * Jeu d'images complet. Idempotent par étape (points de reprise du job) :
 * une reprise ne refait pas — et ne repaie pas — ce qui est déjà produit.
 */
export async function generateImageSet(ctx: JobContext, projectId: string, opts: ImageSetOptions = {}) {
  let project = loadProject(projectId);
  const ictx: ImgCtx = { userId: project.userId, projectId, jobId: ctx.job.id };
  const cutouts = await ensureCutouts(ctx, project);
  if (!cutouts.length) throw new Error("Aucune photo du produit : importez au moins une photo pour créer les images.");
  project = loadProject(projectId);
  const main = cutouts[0];
  const cutBuf = assetData(main);
  const product = await loadImage(cutBuf);
  const pal = palette(project);
  const typo = brandTypo(project);
  const base = slug(project.product.name || project.name);
  const created: string[] = [];
  const save = async (data: Buffer, name: string, role: string, folderKey: string, meta: Record<string, unknown>, mime = "image/jpeg") => {
    const a = await saveAsset({ projectId, userId: project.userId, data, name, mime, role, folderKey, origin: "generated", sourceAssetId: main.id, meta, status: "review" });
    created.push(a.id);
    return a.id;
  };

  await ctx.step("packshots", async () => {
    ctx.progress(0.38, "Packshots fond blanc et fond de marque");
    const ids = [
      await save(await renderPackshot(product), `${base}-packshot-blanc.jpg`, "packshot", "images.packshots", { recipe: "Packshot fond blanc, ombre de contact", fidelity: "pixels d'origine du produit" }),
      await save(await renderPackshot(product, { background: pal.light }), `${base}-packshot-fond-marque.jpg`, "packshot", "images.packshots", { recipe: "Packshot fond de marque", fidelity: "pixels d'origine du produit" }),
    ];
    return ids;
  });

  await ctx.step("details", async () => {
    ctx.progress(0.45, "Détails produit (recadrages de la photo originale)");
    const original = one<Asset>("SELECT * FROM assets WHERE id = ?", main.source_asset_id)!;
    const meta = JSON.parse(main.meta || "{}");
    const regions = project.product.visual && (project.product as any).detailRegions;
    const crops = await detailCrops(assetData(original), { png: cutBuf, width: product.width, height: product.height, bbox: meta.bbox, sourceW: meta.source.w, sourceH: meta.source.h, method: "model" }, regions);
    const ids: string[] = [];
    for (const [i, c] of crops.entries()) ids.push(await save(c, `${base}-detail-${i + 1}.jpg`, "detail", "images.details", { recipe: "Recadrage haute définition de la photo originale (aucune génération)" }));
    return ids;
  });

  const styles = opts.scenes ?? (["window", "arch", "spotlight"] as SceneStyle[]);
  const withAi = opts.withAi !== false && !!imageProviderAvailable();
  for (const [i, style] of styles.entries()) {
    await ctx.step(`scene:${style}`, async () => {
      ctx.progress(0.5 + i * 0.08, `Mise en scène « ${style} »${withAi ? " (décor généré)" : ""}`);
      let bg: Buffer | null = null;
      let provider = "local";
      let qc: unknown = null;
      if (withAi && i === 0) {
        try {
          const r = await aiBackground(ictx, project, cutBuf, style, "product", `${ctx.job.id}:scene:${style}`);
          if (r) {
            if (r.provider === "openai") {
              // Vérification de fidélité par vision, puis repli local si échec.
              if (llmConfigured()) {
                const check = await aiQcImage({ ...ictx, usageKey: `${ctx.job.id}:qc:${style}` }, assetData(one<Asset>("SELECT * FROM assets WHERE id = ?", main.source_asset_id)!), r.image);
                qc = check;
                if (!check.sameProduct || check.score < 6) throw new Error(`Contrôle de fidélité non concluant : ${check.issues.join(" ; ")}`);
              }
              const id = await save(await sharp(r.image).jpeg({ quality: 92 }).toBuffer(), `${base}-scene-${style}-ia.jpg`, "scene", "images.scenes", { recipe: `Décor peint par IA autour du produit réel (${style})`, provider: "OpenAI", qc });
              return [id];
            }
            bg = r.image;
            provider = "Gemini (décor) + composition locale";
          }
        } catch (e) {
          qc = { fallback: (e as Error).message };
        }
      }
      const s = await renderScene({ product, palette: pal, style, format: FORMATS.product, seed: 7 + i, background: bg ? await loadImage(bg) : null });
      return [await save(await sharp(s.png).jpeg({ quality: 92 }).toBuffer(), `${base}-scene-${style}.jpg`, "scene", "images.scenes", { recipe: `Mise en scène ${style}`, provider, qc })];
    });
  }

  // Photos en situation, dans la vie de tous les jours (IA d'image requise) : elles ouvrent la boutique.
  if (withAi) {
    const contexts = LIFESTYLE[project.product.sector ?? ""] ?? LIFESTYLE.maison;
    for (const [i, situation] of contexts.entries()) {
      await ctx.step(`lifestyle:${i}`, async () => {
        ctx.progress(0.7 + i * 0.02, "Photos du produit en situation");
        try {
          const r = await aiBackground(ictx, project, cutBuf, "lifestyle", i === 0 ? "landscape" : "product", `${ctx.job.id}:lifestyle:${i}`, situation);
          if (!r) return [];
          if (r.provider !== "openai") {
            // Gemini : décor de vie généré, produit réel posé dessus par la composition locale (ombres, sol).
            const s = await renderScene({ product, palette: pal, style: "spotlight", format: i === 0 ? FORMATS.landscape : FORMATS.product, seed: 31 + i, background: await loadImage(r.image) });
            return [await save(await sharp(s.png).jpeg({ quality: 92 }).toBuffer(), `${base}-en-situation-${i + 1}.jpg`, "lifestyle", "images.scenes", { recipe: `Photo en situation : décor généré (${situation}) et produit réel composé`, provider: "Gemini + composition locale" })];
          }
          let qc: unknown = null;
          if (llmConfigured()) {
            const check = await aiQcImage({ ...ictx, usageKey: `${ctx.job.id}:qc:lifestyle:${i}` }, assetData(one<Asset>("SELECT * FROM assets WHERE id = ?", main.source_asset_id)!), r.image);
            qc = check;
            if (!check.sameProduct || check.score < 6) return [];
          }
          return [await save(await sharp(r.image).jpeg({ quality: 92 }).toBuffer(), `${base}-en-situation-${i + 1}.jpg`, "lifestyle", "images.scenes", { recipe: `Photo en situation générée autour du produit réel : ${situation}`, provider: "OpenAI", qc })];
        } catch (e) {
          console.warn("[images] photo en situation indisponible :", (e as Error).message);
          return [];
        }
      });
    }
  }

  if (opts.banner !== false) {
    await ctx.step("banner", async () => {
      ctx.progress(0.75, "Bannières de boutique");
      return [
        await save(await renderBanner(product, pal, "studio", FORMATS.banner, 21), `${base}-banniere-studio.jpg`, "banner", "images.banners", { recipe: "Bannière 2:1 sans texte (textes dans le thème)" }),
        await save(await renderBanner(product, pal, "color", FORMATS.landscape, 22), `${base}-banniere-couleur.jpg`, "banner", "images.banners", { recipe: "Bannière 16:9 fond de marque" }),
      ];
    });
  }

  if (opts.social !== false) {
    await ctx.step("social", async () => {
      ctx.progress(0.85, "Visuels réseaux sociaux et publicités");
      const headline = project.brand?.tagline || project.product.name || project.brand?.name || "Découvrir";
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
      for (const [fmt, layout, folder, role] of variants) {
        const r = await renderCreative({ product, palette: pal, typo, format: FORMATS[fmt], layout, headline, subline: sub, cta: role === "ad" ? "Découvrir" : undefined, brand: brandName, logo, seed: ids.length + 3 });
        ids.push(await save(r.jpg, `${base}-${role === "ad" ? "publicite" : "post"}-${FORMATS[fmt].label.replace(":", "x")}-${layout}.jpg`, role, folder, { recipe: `Visuel ${FORMATS[fmt].label} (${layout})`, text: { headline, sub }, safeArea: r.safe, minFontPx: r.minFontPx, format: FORMATS[fmt].label }));
      }
      return ids;
    });
  }
  ctx.progress(0.98, "Images prêtes");
  return { created };
}

/** Génère une image unique à la demande (studio Images). */
export async function generateSingleImage(ctx: JobContext, projectId: string, req: { kind: "packshot" | "scene" | "social" | "ad" | "banner"; style?: SceneStyle; format?: FormatId; layout?: Layout; headline?: string; subline?: string; cta?: string; useAi?: boolean; sourceCutoutId?: string }) {
  const project = loadProject(projectId);
  const cutouts = await ensureCutouts(ctx, project);
  const cut = (req.sourceCutoutId && cutouts.find((c) => c.id === req.sourceCutoutId)) || cutouts[0];
  if (!cut) throw new Error("Importez d'abord une photo du produit.");
  const product = await loadImage(assetData(cut));
  const pal = palette(project);
  const fmt = FORMATS[req.format ?? (req.kind === "banner" ? "banner" : req.kind === "packshot" ? "packshot" : "portrait")];
  const base = slug(project.product.name || project.name);
  const ictx: ImgCtx = { userId: project.userId, projectId, jobId: ctx.job.id };
  let data: Buffer;
  let meta: Record<string, unknown> = {};
  let role: string = req.kind;
  let folder = "images.scenes";
  ctx.progress(0.3, "Composition de l'image");
  if (req.kind === "packshot") {
    data = await renderPackshot(product, { format: fmt });
    folder = "images.packshots";
    meta = { recipe: "Packshot" };
  } else if (req.kind === "scene" || req.kind === "banner") {
    let bg: Buffer | null = null;
    if (req.useAi) {
      const r = await ctx.step("ai-bg", async () => {
        const out = await aiBackground(ictx, project, assetData(cut), req.style ?? "studio", req.format ?? "product", `${ctx.job.id}:single`);
        return out ? { b64: out.image.toString("base64"), provider: out.provider } : null;
      });
      if (r?.provider === "openai") {
        data = await sharp(Buffer.from(r.b64, "base64")).jpeg({ quality: 92 }).toBuffer();
        const a = await saveAsset({ projectId, userId: project.userId, data, name: `${base}-scene-ia-${Date.now()}.jpg`, mime: "image/jpeg", role: "scene", folderKey: "images.scenes", origin: "generated", sourceAssetId: cut.id, meta: { recipe: "Décor peint par IA autour du produit réel", provider: "OpenAI" }, status: "review" });
        return { assetId: a.id };
      }
      if (r) bg = Buffer.from(r.b64, "base64");
    }
    const s = await renderScene({ product, palette: pal, style: req.style ?? "studio", format: fmt, seed: Date.now() % 1000, background: bg ? await loadImage(bg) : null, offsetX: req.kind === "banner" ? 0.18 : 0 });
    data = await sharp(s.png).jpeg({ quality: 92 }).toBuffer();
    folder = req.kind === "banner" ? "images.banners" : "images.scenes";
    meta = { recipe: `Scène ${req.style ?? "studio"}`, provider: bg ? "Décor IA + composition" : "local" };
  } else {
    const logoAsset = latestAsset(projectId, "logo");
    const r = await renderCreative({ product, palette: pal, typo: brandTypo(project), format: fmt, layout: req.layout ?? "editorial", headline: req.headline || project.brand?.tagline || project.product.name, subline: req.subline, cta: req.cta, brand: project.brand?.name ?? project.name, logo: logoAsset ? await loadImage(assetData(logoAsset)) : null, scene: req.style, seed: Date.now() % 1000 });
    data = r.jpg;
    folder = req.kind === "ad" ? "images.ads" : "images.social";
    role = req.kind;
    meta = { recipe: `Visuel ${fmt.label}`, safeArea: r.safe, minFontPx: r.minFontPx, text: { headline: req.headline, sub: req.subline, cta: req.cta } };
  }
  const a = await saveAsset({ projectId, userId: project.userId, data, name: `${base}-${role}-${fmt.label.replace(":", "x")}-${Date.now().toString(36)}.jpg`, mime: "image/jpeg", role, folderKey: folder, origin: "generated", sourceAssetId: cut.id, meta: { ...meta, format: fmt.label }, status: "review" });
  return { assetId: a.id };
}
