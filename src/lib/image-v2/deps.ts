/**
 * Outils du moteur Image V2 : banques d'images, téléchargement, relecture (IA de vision) et génération.
 * Interface injectable : le studio et le benchmark réel utilisent `realImageDeps` ; les tests utilisent des
 * fournisseurs simulés (aucun appel réel, aucune dépense).
 *
 * Génération routée par le Router V2 :
 *  - image du PRODUIT réel : jamais un texte vers image (le produit serait réinventé). Retouche par masque autour des
 *    pixels du produit (OpenAI) ou décor vide généré puis produit réel composé (Google) ; dans les deux cas, les
 *    pixels du produit sont remis exactement à la fin. Sans détourage valide : aucune image du produit ;
 *  - ambiance, métier, univers : génération d'ambiance (consignes d'honnêteté du studio).
 */
import sharp from "sharp";
import { activeProviderKey } from "../ai/config";
import { llmConfigured, llmJson } from "../ai/llm";
import { ambianceImage, imageProviderAvailable, mediaRouteFor, openaiScene, productImagePath, productPlate } from "../ai/media-providers";
import type { MediaUsage } from "../ai/media-routing";
import { brainContext } from "../ai/context";
import { assetData, getAsset } from "../library";
import type { Project } from "../projects";
import { downloadStock } from "../stock/photos";
import { L } from "../i18n-server";
import { FORMATS, generationAspect } from "./formats";
import { ImageReviewSchema, REVIEW_SYSTEM } from "./quality";
import { STOCK_PROVIDERS, type StockProvider } from "./sources";
import type { ImageReview, StockCandidate, VisualBrief } from "./types";

export type GenerationPath = "masked_edit" | "composite_plate" | "text_to_image" | "none";

export type ImageV2Deps = {
  providers: StockProvider[];
  /** Contrôle visuel possible (IA de vision active pour le compte). */
  canReview: boolean;
  /** Génération possible (forfait, fournisseur d'images). */
  canGenerate: boolean;
  download: (c: StockCandidate) => Promise<Buffer>;
  review: (brief: VisualBrief, img: Buffer, reference: Buffer | null, key: string, origin: "stock" | "generated") => Promise<ImageReview>;
  /** Parcours de génération choisi pour ce brief (Router V2), sans rien générer. */
  path: (brief: VisualBrief) => GenerationPath;
  generate: (brief: VisualBrief, prompt: string, reference: Buffer | null, key: string) => Promise<{ img: Buffer; provider: string; model: string | null; path: GenerationPath }>;
  /** Détourage (PNG transparent) du produit de référence. */
  reference: (assetId: string) => Buffer | null;
};

/** Résumé du brief pour la relecture (structuré, en anglais). */
export function reviewPrompt(b: VisualBrief): string {
  return `BRIEF — kind: ${b.kind}; support: ${b.support}; format: ${b.format.aspect}${b.format.textZone !== "none" ? ` (text area ${b.format.textZone})` : ""}.
Subject that MUST be shown: ${b.subject}.${b.action ? ` Action: ${b.action}.` : ""}${b.environment ? ` Setting: ${b.environment}.` : ""}
Art direction: ${b.artDirection} — composition: ${b.composition}; lighting: ${b.lighting}; camera: ${b.framing}.
Relevant concepts: ${b.positive.slice(0, 8).join("; ")}.
Off-topic (fail relevance if this is all the image shows): ${b.negative.slice(0, 10).join("; ")}.
${b.productFidelity ? "A reference image of the REAL product is attached second: the product in the image must be the same, unchanged (shape, colours, logo, label text, proportions).\n" : ""}Constraints: ${b.facts.slice(0, 8).join("; ")}.
Answer { "criteria": { "relevance": 0, "fidelity": 0, "aesthetics": 0, "composition": 0, "realism": 0, "brand": 0, "brief": 0, "support": 0, "artifacts": 0, "commercial": 0 }, "shows": "…", "offTopic": false, "productAltered": false, "wrongProduct": false, "textInImage": false, "deformed": false, "artifacts": false, "issues": [], "fix": { "target": "lighting|composition|background|crop|product|direction|none", "instruction": "…" } }.`;
}

/** Image du produit posée sur un décor (pixels du produit inchangés), ombre de contact douce. */
export async function compositeProduct(plate: Buffer, cutout: Buffer, aspect: VisualBrief["format"]["aspect"]): Promise<Buffer> {
  const f = FORMATS[aspect];
  const base = await sharp(plate, { failOn: "none" }).resize(f.width, f.height, { fit: "cover" }).toBuffer();
  const prod = await sharp(cutout).resize({ width: Math.round(f.width * 0.5), height: Math.round(f.height * 0.62), fit: "inside" }).png().toBuffer();
  const pm = await sharp(prod).metadata();
  const left = Math.round((f.width - (pm.width ?? 0)) / 2);
  const top = Math.round(f.height * 0.86 - (pm.height ?? 0));
  const shadow = await sharp({ create: { width: Math.max(1, Math.round((pm.width ?? 10) * 0.9)), height: Math.max(1, Math.round((pm.height ?? 10) * 0.06)), channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0.28 } } }).blur(12).png().toBuffer();
  return sharp(base)
    .composite([
      { input: shadow, left: left + Math.round((pm.width ?? 0) * 0.05), top: top + (pm.height ?? 0) - Math.round((pm.height ?? 0) * 0.03) },
      { input: prod, left, top },
    ])
    .jpeg({ quality: 90 })
    .toBuffer();
}

export function realImageDeps(p: Project, b: { jobId: string | null; aiActive: boolean }): ImageV2Deps {
  const base = { userId: p.userId, projectId: p.id, jobId: b.jobId };
  /** Usage de l'administration (Images & Vidéos) : publicité, image du produit réel, ou décor et ambiance. */
  const usageFor = (brief: VisualBrief): MediaUsage => (brief.support === "ad" || brief.kind === "ad_image" ? "ad_visual" : brief.productFidelity ? "product_image" : "scene");
  /** Parcours et usage réellement appliqué (retouche par masque : « Retouches produit » pour une image produit). */
  const routeFor = (brief: VisualBrief): { path: GenerationPath; usage: MediaUsage } => {
    const usage = usageFor(brief);
    if (!b.aiActive) return { path: "none", usage };
    if (brief.productFidelity) {
      if (!brief.references.length) return { path: "none", usage };
      // Retouche par masque si un modèle capable est choisi ; sinon décor vide du modèle choisi + produit réel composé.
      const r = productImagePath(usage === "ad_visual" ? "ad_visual" : "product_image");
      return r ? { path: r.path, usage: r.usage } : { path: "none", usage };
    }
    return { path: imageProviderAvailable({ usage }) ? "text_to_image" : "none", usage };
  };
  const pathFor = (brief: VisualBrief): GenerationPath => routeFor(brief).path;
  return {
    providers: STOCK_PROVIDERS,
    canReview: b.aiActive && llmConfigured(),
    canGenerate: b.aiActive && (!!activeProviderKey("openai") || !!activeProviderKey("google") || !!activeProviderKey("fal")),
    download: (c) => downloadStock({ source: c.source as never, id: c.id, url: c.url, page: c.page, author: c.author, license: c.license.name, width: c.width, height: c.height, alt: c.alt }),
    reference: (assetId) => {
      const a = getAsset(assetId);
      return a && a.project_id === p.id && !a.deleted_at ? assetData(a) : null;
    },
    path: pathFor,
    async review(brief, img, reference, key, origin) {
      const small = await sharp(img, { failOn: "none" }).rotate().resize(1024, 1024, { fit: "inside" }).jpeg({ quality: 85 }).toBuffer();
      const images = [{ data: small, label: L("image à juger", "image to review") }];
      if (reference) images.push({ data: await sharp(reference).resize(768, 768, { fit: "inside", background: { r: 255, g: 255, b: 255, alpha: 1 } }).flatten({ background: "#ffffff" }).jpeg({ quality: 85 }).toBuffer(), label: L("produit de référence (réel)", "reference product (real)") });
      return (await llmJson(
        {
          task: "quality_control",
          ...base,
          usageKey: key,
          promptKey: "image-v2-review",
          // La fidélité d'un produit réel se juge au niveau fort directement ; une ambiance au niveau standard.
          routing: { difficulty: brief.productFidelity ? "complex" : "standard", deliverable: origin === "stock" ? "stock_v2" : "image_v2" },
          system: REVIEW_SYSTEM,
          context: brainContext(p, "image"),
          images,
          prompt: reviewPrompt(brief),
          maxTokens: 2500,
        },
        ImageReviewSchema,
      )) as ImageReview;
    },
    async generate(brief, prompt, reference, key) {
      const { path, usage } = routeFor(brief);
      const aspect = generationAspect(brief.format.aspect);
      if (path === "masked_edit" && reference) {
        const size = aspect === "16:9" ? "1536x1024" : aspect === "1:1" ? "1024x1024" : "1024x1536";
        const [W, H] = size.split("x").map(Number);
        const prod = await sharp(reference).resize({ height: Math.round(H * 0.6), width: Math.round(W * 0.7), fit: "inside" }).png().toBuffer();
        const pm = await sharp(prod).metadata();
        const left = Math.round((W - (pm.width ?? 0)) / 2);
        const top = Math.round(H * 0.82 - (pm.height ?? 0));
        const composite = await sharp({ create: { width: W, height: H, channels: 4, background: { r: 235, g: 230, b: 224, alpha: 1 } } }).composite([{ input: prod, left, top }]).png().toBuffer();
        const mask = await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: prod, left, top }]).png().toBuffer();
        const painted = await openaiScene({ ...base, usageKey: key }, { composite, productMask: mask, prompt, size: size as "1024x1024", usage });
        // Pixels du produit d'origine remis exactement par-dessus (fidélité garantie par construction).
        return { img: await sharp(painted).resize(W, H).composite([{ input: prod, left, top }]).jpeg({ quality: 90 }).toBuffer(), provider: "openai", model: mediaRouteFor(usage, { mask: true })?.model ?? null, path };
      }
      if (path === "composite_plate" && reference) {
        const r = mediaRouteFor(usage);
        const plate = await productPlate({ ...base, usageKey: key }, { prompt, aspect, usage });
        return { img: await compositeProduct(plate, reference, brief.format.aspect), provider: r?.provider ?? "ai", model: r?.model ?? null, path };
      }
      if (path === "text_to_image") {
        const r = mediaRouteFor(usage);
        return { img: await ambianceImage({ ...base, usageKey: key }, { prompt, aspect, usage }), provider: r?.provider ?? "ai", model: r?.model ?? null, path };
      }
      throw new Error(L("aucun parcours de génération fiable pour cette image", "no reliable generation path for this image"));
    },
  };
}
