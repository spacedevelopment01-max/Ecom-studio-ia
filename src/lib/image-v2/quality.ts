/**
 * Barrière de qualité des images V2 : réutilise la fondation de la phase 1 (`decide`, politiques `image_v2` et
 * `stock_v2`), avec :
 *  - des contrôles LOCAUX gratuits d'abord (image lisible, résolution et recadrage au format, image trop floue ou
 *    trop sombre / claire, quasi-doublon d'une image du projet) : un échec ici évite un contrôle payant ;
 *  - une relecture de directeur artistique (IA de vision) sur des critères explicites : pertinence, fidélité,
 *    esthétique, composition, réalisme, cohérence de marque, respect du brief, adéquation au support, artefacts,
 *    exploitabilité commerciale.
 * Une image hors sujet n'est jamais FINAL, même très belle ; un produit transformé est fatal ; une panne du contrôle
 * n'est jamais un résultat validé. Une note automatique n'est pas une preuve de qualité réelle : c'est un filtre.
 */
import sharp from "sharp";
import { z } from "zod";
import { decide, type GateDecision } from "../quality/gate";
import { fitsFormat } from "./formats";
import { IMAGE_CRITERIA, type ImageCriterion, type ImageReview, type VisualBrief } from "./types";

// ---------------------------------------------------------------- contrôles locaux (gratuits)

export type LocalImageCheck = { ok: boolean; codes: string[]; issues: string[]; width: number; height: number; sharpness: number; luminance: number; hash: string };

/** Empreinte perceptive (dHash 64 bits) : quasi-doublons entre images d'une série ou d'un projet. */
export async function dHash(img: Buffer): Promise<string> {
  const px = await sharp(img, { failOn: "none" }).rotate().greyscale().resize(9, 8, { fit: "fill" }).raw().toBuffer();
  let bits = "";
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits += px[y * 9 + x] > px[y * 9 + x + 1] ? "1" : "0";
  return BigInt(`0b${bits}`).toString(16).padStart(16, "0");
}

export function hamming(a: string, b: string): number {
  let x = BigInt(`0x${a}`) ^ BigInt(`0x${b}`);
  let n = 0;
  while (x) {
    n += Number(x & 1n);
    x >>= 1n;
  }
  return n;
}

/** Quasi-doublon : distance de Hamming ≤ 6 sur 64 bits (même photo recadrée, réencodée ou légèrement retouchée). */
export const NEAR_DUPLICATE = 6;

/**
 * Contrôles locaux. Seuils de netteté et d'exposition volontairement prudents (seuls les cas extrêmes bloquent) :
 * ils n'ont pas été calibrés sur de vrais rendus — c'est l'objet du benchmark réel (5B).
 */
export async function localImageCheck(img: Buffer, brief: VisualBrief, others: string[] = []): Promise<LocalImageCheck> {
  const codes: string[] = [];
  const issues: string[] = [];
  let meta: Awaited<ReturnType<ReturnType<typeof sharp>["metadata"]>>;
  try {
    meta = await sharp(img, { failOn: "error" }).metadata();
  } catch {
    return { ok: false, codes: ["corrupt"], issues: ["image illisible"], width: 0, height: 0, sharpness: 0, luminance: 0, hash: "" };
  }
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  const fit = fitsFormat(width, height, brief.format.aspect);
  if (!fit.ok) {
    codes.push(/résolution/.test(fit.reason ?? "") ? "low_resolution" : "bad_crop");
    issues.push(fit.reason ?? "format");
  }
  const small = await sharp(img, { failOn: "none" }).rotate().greyscale().resize(512, 512, { fit: "inside" });
  const stats = await small.clone().stats();
  const luminance = stats.channels[0]?.mean ?? 128;
  const lap = await small.clone().convolve({ width: 3, height: 3, kernel: [0, 1, 0, 1, -4, 1, 0, 1, 0], offset: 128 }).stats();
  const sharpness = lap.channels[0]?.stdev ?? 0;
  if (sharpness < 2.5) {
    codes.push("artifacts");
    issues.push("image très floue ou vide");
  }
  if (luminance < 12 || luminance > 248) {
    codes.push("artifacts");
    issues.push(luminance < 12 ? "image presque noire" : "image presque blanche");
  }
  const hash = await dHash(img);
  if (others.some((h) => h && hamming(h, hash) <= NEAR_DUPLICATE)) {
    codes.push("duplicate");
    issues.push("quasi-doublon d'une image déjà retenue");
  }
  return { ok: !codes.length, codes: [...new Set(codes)], issues, width, height, sharpness: Math.round(sharpness * 10) / 10, luminance: Math.round(luminance), hash };
}

// ---------------------------------------------------------------- relecture IA (schéma, codes, décision)

const score = z.coerce.number().min(0).max(10).catch(0);
export const ImageReviewSchema = z.object({
  criteria: z.object(Object.fromEntries(IMAGE_CRITERIA.map((k) => [k, score])) as Record<ImageCriterion, typeof score>),
  shows: z.string().catch(""),
  offTopic: z.boolean().catch(false),
  productAltered: z.boolean().catch(false),
  wrongProduct: z.boolean().catch(false),
  textInImage: z.boolean().catch(false),
  deformed: z.boolean().catch(false),
  artifacts: z.boolean().catch(false),
  issues: z.array(z.string()).catch([]),
  fix: z.object({ target: z.enum(["lighting", "composition", "background", "crop", "product", "direction", "none"]).catch("none"), instruction: z.string().catch("") }).catch({ target: "none", instruction: "" }),
});

export const REVIEW_SYSTEM = `Rôle : directeur artistique exigeant d'une agence de création visuelle (niveau 2026). Tu juges UNE image avant qu'elle soit utilisée par une marque, à partir de son brief.
Note chaque critère de 0 à 10 : relevance (montre exactement le sujet du brief : le métier ET son geste, ou l'univers du produit), fidelity (si un produit de référence est fourni : même forme, couleurs, logo, étiquette, proportions ; sinon 10), aesthetics (qualité esthétique réelle, pas seulement technique), composition (hiérarchie, cadrage, équilibre, espace pour le texte si demandé), realism, brand (cohérence avec la palette et le ton), brief (direction artistique, lumière, cadrage demandés), support (adaptée au format et à l'usage), artifacts (10 = aucun artefact), commercial (exploitable par une marque sans gêne).
offTopic = vrai si l'image ne montre pas le sujet (mur nu ou texture pour un artisan, décor sans lien, autre métier ou autre prestation) — même si elle est belle. productAltered = vrai si le produit est redessiné, déformé, recoloré, si son texte ou son logo change. wrongProduct = vrai si ce n'est pas le même produit. textInImage = texte, lettres, logo ou filigrane ajoutés. deformed = mains, visages ou objets déformés. artifacts = défauts de génération visibles.
Sois strict : 8 se mérite ; une image correcte mais banale n'a pas plus de 6 en esthétique. « issues » : défauts concrets. « fix » : LA correction la plus utile — lighting, composition, background, crop, product (abandonner la transformation et revenir à la photo d'origine), direction (scène hors sujet : changer de direction) ou none — avec l'instruction précise.`;

/** Codes de défauts tirés d'une relecture. */
export function reviewCodes(r: ImageReview, brief: VisualBrief): string[] {
  const codes: string[] = [];
  if (r.offTopic || r.criteria.relevance < 4) codes.push("off_topic");
  if (brief.productFidelity && r.wrongProduct) codes.push("wrong_product");
  if (brief.productFidelity && (r.productAltered || r.criteria.fidelity < 6)) codes.push("product_altered");
  if (r.textInImage) codes.push("text_in_image");
  if (r.deformed) codes.push("deformed");
  if (r.artifacts || r.criteria.artifacts < 5) codes.push("artifacts");
  // Techniquement correcte mais esthétiquement faible : jamais FINAL (les planchers de critères font le reste).
  if (r.criteria.aesthetics < 5) codes.push("weak_aesthetics");
  if (r.criteria.brand < 4) codes.push("brand_mismatch");
  if (r.criteria.brief < 4) codes.push("brief_mismatch");
  return [...new Set(codes)];
}

/** Moyenne pondérée : la pertinence et la fidélité comptent double, l'esthétique une fois et demie. */
export function reviewScore(r: ImageReview, brief: VisualBrief): number {
  const w: Record<ImageCriterion, number> = { relevance: 2, fidelity: brief.productFidelity ? 2 : 0, aesthetics: 1.5, composition: 1, realism: 1, brand: 0.75, brief: 1, support: 0.75, artifacts: 1, commercial: 1 };
  const tot = IMAGE_CRITERIA.reduce((s, k) => s + w[k], 0);
  return Math.round((IMAGE_CRITERIA.reduce((s, k) => s + r.criteria[k] * w[k], 0) / tot) * 10) / 10;
}

/**
 * Décision de la barrière pour une image. `review` null : aucun contrôle visuel possible (forfait sans IA ou contrôle
 * en panne) → jamais FINAL ; une photo de banque dont la description cite le métier est au mieux PROVISOIRE.
 */
export function gateImage(o: { brief: VisualBrief; origin: "stock" | "generated"; local: LocalImageCheck; review: ImageReview | null; reviewError?: string | null; metadataMatch?: boolean; attempt: number }): GateDecision {
  const deliverable = o.origin === "stock" ? "stock_v2" : "image_v2";
  if (!o.local.ok) return decide(deliverable, { checker: "local", score: 0, codes: o.local.codes, issues: o.local.issues }, { attempt: o.attempt });
  if (o.reviewError) return decide(deliverable, { checker: "ai", score: null, error: o.reviewError }, { attempt: o.attempt });
  if (!o.review) return o.origin === "stock" && o.metadataMatch ? decide(deliverable, { checker: "metadata", score: 7 }, { attempt: o.attempt }) : decide(deliverable, { checker: "none", score: null }, { attempt: o.attempt });
  const criteria = { ...o.review.criteria } as Record<string, number>;
  if (!o.brief.productFidelity) delete criteria.fidelity;
  const issues = [...o.review.issues, ...(o.review.fix.target !== "none" && o.review.fix.instruction ? [`${o.review.fix.target} : ${o.review.fix.instruction}`] : [])];
  return decide(deliverable, { checker: "ai", score: reviewScore(o.review, o.brief), criteria, codes: reviewCodes(o.review, o.brief), issues }, { attempt: o.attempt });
}
