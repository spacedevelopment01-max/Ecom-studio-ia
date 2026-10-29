/**
 * Outils du moteur Image V2 : banques d'images, téléchargement, relecture (IA de vision) et génération.
 * Interface injectable : le studio et le benchmark réel utilisent `realImageDeps` ; les tests utilisent des
 * fournisseurs simulés (aucun appel réel, aucune dépense).
 *
 * Génération routée par le Router V2 :
 *  - image du PRODUIT réel : jamais un texte vers image avec le produit (il serait réinventé), jamais une retouche par
 *    masque (le modèle redessine un second produit à côté du vrai). Décor vide (banque d'images d'abord, sinon généré)
 *    puis produit réel composé par le studio, pixels d'origine. Sans détourage valide : aucune image du produit ;
 *  - ambiance, métier, univers : génération d'ambiance (consignes d'honnêteté du studio).
 */
import sharp from "sharp";
import { activeProviderKey } from "../ai/config";
import { llmConfigured, llmJson,type LlmCall } from "../ai/llm";
import { ambianceImage, imageProviderAvailable, mediaRouteFor, productImagePath, productScene } from "../ai/media-providers";
import type { MediaUsage } from "../ai/media-routing";
import { brainView } from "../ai/context";
import { assetData, getAsset } from "../library";
import type { Project } from "../projects";
import { downloadStock } from "../stock/photos";
import { L } from "../i18n-server";
import { personCheckEn } from "../people-policy";
import { FORMATS, generationAspect } from "./formats";
import { ImageReviewSchema,BoundedImageReviewSchema, REVIEW_SYSTEM } from "./quality";
import { STOCK_PROVIDERS, type StockProvider } from "./sources";
import type { ImageReview, StockCandidate, VisualBrief } from "./types";

export type GenerationPath = "masked_edit" | "composite_plate" | "reference_scene" | "text_to_image" | "none";

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
${b.instructions ? `Client instructions, also to verify: ${b.instructions}.` : ""}
Art direction: ${b.artDirection} — composition: ${b.composition}; lighting: ${b.lighting}; camera: ${b.framing}.
Relevant concepts: ${b.positive.slice(0, 8).join("; ")}.
Off-topic (fail relevance if this is all the image shows): ${b.negative.slice(0, 10).join("; ")}.
${b.productFidelity ? "A reference image of the REAL product is attached second: the product in the image must be the same, unchanged (shape, colours, logo, label text, proportions).\n" : ""}Constraints: ${b.facts.slice(0, 9).join("; ")}.
${personCheckEn(b.people !== false)}
Answer { "criteria": { "relevance": 0, "fidelity": 0, "aesthetics": 0, "composition": 0, "realism": 0, "brand": 0, "brief": 0, "support": 0, "artifacts": 0, "commercial": 0 }, "shows": "…", "offTopic": false, "productAltered": false, "wrongProduct": false, "textInImage": false, "deformed": false, "artifacts": false, "personVisible": false, "issues": [], "fix": { "target": "lighting|composition|background|crop|product|direction|none", "instruction": "…" } }.`;
}

/** Demande commune au contrôle et à son devis ; les images sont réduites avant l'appel réel. */
export function imageReviewRequest(p:Project,brief:VisualBrief,base:{userId:string;projectId:string;jobId:string|null;usageKey:string},images:NonNullable<LlmCall['images']>,origin:'stock'|'generated'='generated'):LlmCall{
 const view=brainView(p,'image');
 return{task:'quality_control',...base,promptKey:'image-v2-review',routing:{difficulty:brief.productFidelity?'complex':'standard',deliverable:origin==='stock'?'stock_v2':'image_v2'},system:REVIEW_SYSTEM,context:view.stable,volatile:view.volatile,images,prompt:reviewPrompt(brief),maxTokens:2500};
}

/**
 * Détourage nettoyé : les pixels presque transparents (reste de fond, halo d'ombre d'origine) sont effacés, sinon ils
 * dessinent un rectangle voilé autour du produit une fois posé sur un décor. Pixels du produit inchangés.
 */
async function cleanAlpha(png: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 3; i < data.length; i += 4) if (data[i] < 48) data[i] = 0;
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

/** Image du produit posée sur un décor (pixels du produit inchangés), ombre de contact douce. */
export async function compositeProduct(plate: Buffer, cutout: Buffer, aspect: VisualBrief["format"]["aspect"], textZone: VisualBrief["format"]["textZone"] = "none"): Promise<Buffer> {
  const f = FORMATS[aspect];
  const base = await sharp(plate, { failOn: "none" }).resize(f.width, f.height, { fit: "cover" }).toBuffer();
  const side = textZone === "left";
  const prod = await cleanAlpha(await sharp(cutout).resize({ width: Math.round(f.width * (side ? 0.4 : 0.5)), height: Math.round(f.height * (textZone === "top" ? 0.5 : 0.62)), fit: "inside" }).png().toBuffer());
  const pm = await sharp(prod).metadata();
  // Le produit se place à l'opposé de la zone gardée pour le texte (publicités) : jamais sous le titre.
  const left = Math.round(side ? f.width * 0.72 - (pm.width ?? 0) / 2 : (f.width - (pm.width ?? 0)) / 2);
  const top = Math.round(f.height * (textZone === "top" ? 0.9 : 0.86) - (pm.height ?? 0));
  const pw = pm.width ?? 10;
  const ph = pm.height ?? 10;
  // Ombre en deux couches, dessinées en ellipses floues (bords transparents) : contact serré et sombre sous le produit,
  // puis ombre portée large et douce — le produit repose sur la surface au lieu de flotter.
  // Ombre calculée pixel par pixel (ellipse à bord très doux, noir pur, transparente ailleurs) : aucun cadre visible.
  const shadowPng = (w: number, h: number, rx: number, ry: number, _blur: number, alpha: number) => {
    const buf = Buffer.alloc(w * h * 4);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const d = ((x - w / 2) / rx) ** 2 + ((y - h / 2) / ry) ** 2;
        const v = d >= 1 ? 0 : (1 - d) ** 2;
        buf[(y * w + x) * 4 + 3] = Math.round(255 * alpha * v);
      }
    return sharp(buf, { raw: { width: w, height: h, channels: 4 } });
  };
  const sw = Math.round(pw * 1.5);
  const sh = Math.max(24, Math.round(ph * 0.22));
  const soft = await shadowPng(sw, sh, pw * 0.62, sh * 0.42, 0, 0.3).png().toBuffer();
  const contact = await shadowPng(sw, sh, pw * 0.44, sh * 0.16, 0, 0.5).png().toBuffer();
  const sl = left + Math.round(pw / 2 - sw / 2);
  const st = top + ph - Math.round(sh / 2) - Math.round(ph * 0.01);
  const fit = async (buf: Buffer) => {
    // Rogne l'ombre aux bords du cadre (sharp refuse une incrustation qui dépasse).
    const x0 = Math.max(0, sl), y0 = Math.max(0, st);
    const x1 = Math.min(f.width, sl + sw), y1 = Math.min(f.height, st + sh);
    if (x1 <= x0 || y1 <= y0) return null;
    return { input: await sharp(buf).extract({ left: x0 - sl, top: y0 - st, width: x1 - x0, height: y1 - y0 }).png().toBuffer(), left: x0, top: y0 };
  };
  const shadows = (await Promise.all([fit(soft), fit(contact)])).flatMap((x) => (x ? [x] : []));
  return sharp(base)
    .composite([
      ...shadows,
      { input: prod, left, top },
    ])
    .jpeg({ quality: 90 })
    .toBuffer();
}

export function realImageDeps(p: Project, b: { jobId: string | null; aiActive: boolean;singleReviewCall?:boolean;reviewRoute?:LlmCall['expectedRoute'];reviewEnvelope?:Pick<LlmCall,'context'|'volatile'|'reference'> }): ImageV2Deps {
  const base = { userId: p.userId, projectId: p.id, jobId: b.jobId };
  /** Usage de l'administration (Images & Vidéos) : publicité, image du produit réel, ou décor et ambiance. */
  const usageFor = (brief: VisualBrief): MediaUsage => (brief.support === "ad" || brief.kind === "ad_image" ? "ad_visual" : brief.productFidelity ? "product_image" : "scene");
  /** Parcours et usage réellement appliqué (retouche par masque : « Retouches produit » pour une image produit). */
  const routeFor = (brief: VisualBrief): { path: GenerationPath; usage: MediaUsage } => {
    const usage = usageFor(brief);
    if (!b.aiActive) return { path: "none", usage };
    if (brief.productFidelity) {
      if (!brief.references.length) return { path: "none", usage };
      // Photographie publicitaire générée à partir de la photo du produit (référence) : le produit intégré à la scène.
      // Plus jamais de produit détouré collé sur un décor (rendu « produit devant une photo floue », refusé).
      const r = productImagePath(usage === "ad_visual" ? "ad_visual" : "product_image");
      return r ? { path: "reference_scene", usage: r.usage } : { path: "none", usage };
    }
    return { path: imageProviderAvailable({ usage,references:brief.references.length?1:0 }) ? "text_to_image" : "none", usage };
  };
  const pathFor = (brief: VisualBrief): GenerationPath => routeFor(brief).path;
  return {
    providers: STOCK_PROVIDERS,
    canReview: b.aiActive && llmConfigured(),
    canGenerate: b.aiActive && (!!activeProviderKey("openai") || !!activeProviderKey("google") || !!activeProviderKey("fal") || !!activeProviderKey("alibaba")),
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
        {...imageReviewRequest(p,brief,{...base,usageKey:key},images,origin),...b.reviewEnvelope,...(b.reviewRoute?{expectedRoute:b.reviewRoute}:{})},
        b.singleReviewCall?BoundedImageReviewSchema:ImageReviewSchema,
        b.singleReviewCall?{strict:true}:{},
      )) as ImageReview;
    },
    async generate(brief, prompt, reference, key) {
      const { path, usage } = routeFor(brief);
      const aspect = generationAspect(brief.format.aspect);
      if (path === "reference_scene" && reference) {
        const r = mediaRouteFor(usage, { references: 1 });
        const zone = brief.format.textZone && brief.format.textZone !== "none" ? `${{ left: "à gauche", right: "à droite", top: "en haut", bottom: "en bas", center: "au centre" }[brief.format.textZone]} du cadre` : null;
        return { img: await productScene({ ...base, usageKey: key }, { prompt, aspect, reference, textZone: zone, usage }), provider: r?.provider ?? "ai", model: r?.model ?? null, path };
      }
      if (path === "text_to_image") {
        const r = mediaRouteFor(usage,{references:reference?1:0});
        return { img: await ambianceImage({ ...base, usageKey: key }, { prompt, aspect, reference,usage, negative: brief.fr?.sceneExclude }), provider: r?.provider ?? "ai", model: r?.model ?? null, path };
      }
      throw new Error(L("aucun parcours de génération fiable pour cette image", "no reliable generation path for this image"));
    },
  };
}
