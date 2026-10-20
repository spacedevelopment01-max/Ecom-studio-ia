import { authorizedPublicationTexts, copyNeedsEvidence, publicationCopyIssues } from "./publication-copy-policy";
import { acquiredCorrection, makeCopyReview } from "./publication-copy-recovery";
import { creativeContract, creativeInstruction, editorialPages, commercialCta, EditorialBlockSchema, type CreativeContract, type EditorialBlock } from "./creative-contract";
import { platformSpec } from "./platforms";
import { publicationIdentity } from "../image-v2/publication-identity";
import sharp from "sharp";
import { brainView } from "../brain/facade";
import { stableHash } from "../brain/hash";
import {
  publicationKey,
  publicationStage,
  publicationImageStage,
  publicationStageDone,
  publicationStageValue,
} from "./publication-recipe";
import {
  PUBLICATION_POLICY,
  PublicationGridSchema,
  qualityGridPasses,
  publicationRendition,
  formatPlan,
} from "./publication-quality";
import type { AspectId } from "../image-v2/types";
import { estimateTaskMicro } from "../ai/estimate";
/**
 * Publication entièrement conçue par l'IA : l'IA d'images compose le visuel complet (scène, mise en page,
 * typographie, bouton) avec le VRAI produit en référence, dans les couleurs de la marque. Les textes sont donnés mot
 * pour mot ; un contrôle visuel vérifie ensuite l'orthographe exacte, la lisibilité et la fidélité au produit. Un
 * essai refusé est refait avec la correction demandée (3 essais au plus, règle du propriétaire) ; sinon le blocage est
 * signalé (jamais un gabarit à la place : toute image finale est créée par l'IA, guide du moteur d'images). La
 * direction artistique du CLIENT (image-v2/art-direction.ts) et un brief structuré en 16 points guident chaque image.
 * Coût vérifié avant chaque appel (plafond du lot) ; jamais sans IA active ni accord.
 */
import { z } from "zod";
import { all, run } from "../db";
import { assetData, getAsset, assetMeta, saveAsset } from "../library";
import { loadProject as loadProjectForReview, type Project } from "../projects";
import { effectivePalette } from "../route-palette";
import { C } from "../i18n-server";
import { peopleAllowedFor } from "../people-policy";
import {
  prepareImageReference,
  aiPostImage,
  aiPostMaxMicro,
  aiTextLayout,
  textLayoutMaxMicro,
} from "../ai/media-providers";
import { usageExplicit } from "../ai/media-routing";
import { AI_POST_ATTEMPTS, type MediaResult, type PostBrief } from "./deps";
import { MAIN_PRODUCT, type SubjectOption } from "../creative-subject";
import {
  applyWording,
  loadWordingRules,
  wordingPromptLine,
} from "../client-wording";
import {
  artDirectionFor,
  briefPrompt,
  briefScenePrompt,
  buildGenerationBrief,
  layoutPrompt,
  type GenerationBrief,
} from "../image-v2/art-direction";

export const AiPostReviewSchema = z.object({
  /** Textes lus dans l'image, recopiés lettre pour lettre (comparés ensuite par le studio, pas par l'IA). */
  transcribed: z.array(z.string()).max(80).default([]),
  /** Une personne (visage, corps, mains, silhouette) apparaît : refusé (aucun humain généré sans photo du client). */
  person: z.boolean().default(false),
  /** Personne (autorisée) réaliste : visage, mains et doigts corrects, posture naturelle. */
  anatomyOk: z.boolean().default(true),
  logoFaithful: z.boolean().optional(),
  grid: PublicationGridSchema.optional(),
  fatal: z.array(z.string()).max(12).optional(),
  productFaithful: z.boolean(),
  textsExact: z.boolean(),
  legible: z.boolean(),
  score: z.number().min(0).max(10),
  issues: z.array(z.string()).max(8).default([]),
  fix: z.string().max(400).default(""),
  fixTarget: z.enum(["scene", "layout", "both", "none"]).optional(),
});
export type AiPostReview = z.infer<typeof AiPostReviewSchema>;

/** Accroche et direction artistique écrites par l'IA de texte pour une publication (comme une agence). */
export const AiPostCopySchema = z.object({
  blocks:z.array(EditorialBlockSchema).max(24).optional(),
  headline: z.string().min(2).max(60),
  subline: z.string().max(60).default(""),
  cta: z.string().max(28),
  scene: z.string().min(10).max(2000),
  concept: z
    .object({
      idea: z.string().min(12),
      composition: z.string().min(12),
      framing: z.string().min(8),
      setting: z.string().min(8),
      light: z.string().min(8),
      materials: z.string().min(8),
      typography: z.string().min(8),
      effects: z.string(),
      rationale: z.string().min(20),
      diversity: z.string().min(20),
      ctaStyle: z.enum(["none", "link", "button"]),
    })
    .optional(),
});
export type AiPostCopy = z.infer<typeof AiPostCopySchema>;
export type AiPostTexts = {
  headline: string;
  subline: string;
  cta: string;
  brand: string;
  scene?: string;
  concept?: AiPostCopy["concept"];
  blocks?: EditorialBlock[];
};

/** Editorial composition may be a diagram, checklist, advice card or photograph; photography is not imposed. */
function organicVisualPrompt(p:Project, post:PostBrief, o:{aspect:string;hasReference:boolean;hasLogo?:boolean;brief:GenerationBrief;fix?:string;people?:boolean}, sceneOnly=false) {
  const c=creativeContract(post,"organic");
  return `${creativeInstruction(c)}
CONTRAT ÉDITORIAL COMPLET (contexte, pas du texte à recopier) : ${JSON.stringify(c)}.
Créer ${sceneOnly?"la base visuelle SANS texte ni logo, pour une mise en page éditoriale ensuite":"le visuel éditorial complet, entièrement créé par IA"}, ${post.network}, ratio ${o.aspect}, avec la finition d'une publication professionnelle.
${sceneOnly?`Concept : ${o.brief.concept}. Composition : ${o.brief.composition}. Cadrage : ${o.brief.framing}. Décor : ${o.brief.setting}. Lumière : ${o.brief.light}. Palette : ${o.brief.palette}. Réserver les espaces des blocs et de la hiérarchie. Aucun texte, aucune lettre, aucun logo.`:briefPrompt(o.brief)}
La structure peut être graphique : un schéma doit expliquer uniquement des faits vérifiables, pas inventer des mesures ou chiffres. Une photo éditoriale n'est ni une publicité ni une fausse réalisation client. Aucun produit héros obligatoire : s'il apparaît, respecter strictement la référence, sans changement de couleur, matière ou face inventée. ${o.hasReference?"La première référence documente le sujet, elle n'impose pas sa présence.":"Le sujet peut être expliqué par des outils, matériaux et repères graphiques pertinents."}
${sceneOnly?"":o.hasLogo?`Logo exact fourni dans la référence ${o.hasReference?2:1}, jamais réinventé.`:`Signature de marque exacte : « ${p.brand?.name ?? ""} ». Aucun emblème inventé.`}
${o.people?"Présence humaine uniquement selon l'autorisation du projet, anatomie crédible.":"Aucune personne, main, visage, silhouette ni corps."}
Pas d'incitation commerciale imposée. Les contenus et citations fournis restent exacts ; aucune information supplémentaire, aucun avis fabriqué. Typographie, espaces et blocs lisibles à 360 px ; si le contenu est trop dense, ne jamais prétendre qu'une image illisible est finale.
${o.fix?`Correction ciblée : ${o.fix}`:""}`;
}

/** Textes écrits dans la publication, mot pour mot (titre, ligne du produit, bouton, nom de la marque). */
export function aiPostTexts(p: Project, post: PostBrief): AiPostTexts {
  const strip = (s: string) => s.replace(/[\s·•|,;:–-]+$/, "").trim();
  const cta =
    p.business === "services"
      ? C("Demander un devis", "Request a quote")
      : post.objective === "sell" || post.objective === "convert"
        ? C("Commander", "Shop now")
        : C("Découvrir", "Discover");
  return {
    headline: strip(post.headline || post.title),
    subline: strip(p.product.name || p.product.category || ""),
    cta: post.objective === "sell" || post.objective === "convert" ? cta : "",
    brand: p.brand?.name ?? "",
  };
}

const PEOPLE =
  /\b(?:(?:a|an|the|one|two|young|confident|stylish|seated|smiling)\s+)*(?:person|people|woman|women|man|men|model|supporter|fan|athlete|hiker|runner|girl|boy|child|someone|hands?|neck|shoulders?|face)s?\b[^,.;]*/gi;

/** Accroche de l'IA de texte nettoyée : rien d'inventé de chiffré (prix, %, avis), longueur d'une vraie publicité. */
export function cleanAiCopy(
  c: AiPostCopy,
  fallback: AiPostTexts,
  people = false,
  authorized: string[] = [],
): AiPostTexts {
  const ok = (x: string) => !copyNeedsEvidence(x) || authorized.includes(x.trim());
  return {
    headline: ok(c.headline) ? c.headline.trim() : fallback.headline,
    subline: ok(c.subline) ? c.subline.trim() : fallback.subline,
    cta: ok(c.cta) ? c.cta.trim() : fallback.cta,
    brand: fallback.brand,
    concept: c.concept,
    // Aucune personne dans la scène (règle du propriétaire : jamais d'humain généré sans photo du client).
    scene: people
      ? c.scene.trim()
      : c.scene.trim().replace(PEOPLE, "nobody in frame"),
  };
}

/**
 * Consigne de l'IA d'images pour une publication complète — exigence du propriétaire pour TOUS les clients : un rendu
 * digne des plus grandes campagnes publicitaires. Seul le NIVEAU est imposé : mise en page, cadrage, typographie, place
 * du logo, du produit et des textes, décor et lumière sont libres et changent d'une publication à l'autre.
 */
export function aiPostPrompt(
  p: Project,
  post: PostBrief,
  o: {
    aspect: string;
    hasReference: boolean;
    hasLogo?: boolean;
    fix?: string;
    texts?: AiPostTexts;
    people?: boolean;
    /** Brief structuré (direction artistique du client) : remplace la direction libre générique. */ brief?: GenerationBrief;
  },
): string {
  if(o.brief?.objective.startsWith("organic")) return organicVisualPrompt(p,post,{...o,brief:o.brief});
  const t = o.texts ?? aiPostTexts(p, post);
  const pal = effectivePalette(p.brand) ?? p.brand?.palette;
  const colors = pal
    ? [pal.dark, pal.primary, pal.secondary, pal.accent, pal.light]
        .filter(Boolean)
        .join(", ")
    : "";
  const logoRef = o.hasReference ? "second" : "first";
  // Brief du client : seuls les textes que le rôle de l'image permet (une publication n'a pas toujours de bouton).
  const keep = (x: string) =>
    !!x && (!o.brief || o.brief.exactTexts.some((e) => e.text === x));
  const shown = [t.headline, t.subline, t.cta].filter(keep);
  const kind =
    o.brief && !o.brief.objective.startsWith("ad")
      ? "social media post"
      : "social media advertisement";
  return `Create a finished, ultra-premium ${kind} (${post.network}, aspect ratio ${o.aspect}) for the brand "${t.brand}", at the level of a top brand's advertising campaign: real campaign photography and refined typography in one image, ready to publish.
Subject (context for you only — NEVER write this description or any product detail in the image): ${p.product.name || p.product.category} — ${p.product.summary?.slice(0, 300) ?? ""}
Post angle: ${post.pillar ? `${post.pillar} — ` : ""}${post.title}.
${post.request ? `Client's brief for THIS visual (follow it closely; it has priority over the post angle, but never breaks the rules below): ${post.request}\n` : ""}${t.scene ? `Universe of THIS post (its own setting, light and mood — not a generic template): ${t.scene}\n` : ""}${
    o.hasReference
      ? `The product in the first reference image is the hero: reproduce it EXACTLY, use only documented views and details (same shape, proportions, materials, colours and markings); a justified faithful detail crop is allowed, never invent an unseen side or redesign it, never add a word or logo on it that is not on the reference, never add copies beyond the explicitly requested quantity. If the reference shows it worn or held by someone, take only the product.
`
      : ""
  }Finish: real light (key light, rim light, crisp reflections), depth of field and sharpness chosen for the specific concept, credible materials, coherent contact shadows and perspective. Background blur is optional, never automatic. No text, letters or signs anywhere in the decor.
${o.brief ? `CLIENT ART DIRECTION (specific to this brand — follow it; never a generic look, never the model's default style):\n${briefScenePrompt(o.brief, { photoOnly: false })}` : "Art direction: free and original for THIS post — choose the composition, framing, typography and placement of each element that best serves the idea (never a fixed template: product, texts and brand mark may sit anywhere, as the best agencies would decide). The result must be worthy of the greatest advertising campaigns in the world."}
Elements to include:
- ${o.hasLogo ? `the brand logo from the ${logoRef} reference image, reproduced faithfully (same emblem, same letters), placed where it looks best` : `the brand name "${t.brand}", elegantly typeset`};
${[keep(t.headline) ? `- the headline "${t.headline}" (the hero text${o.brief?.exactTexts.find((e) => e.text === t.headline) ? `, cap height about ${o.brief.exactTexts.find((e) => e.text === t.headline)!.sharePct}% of the image width` : ""})` : "", keep(t.subline) ? `- the small line "${t.subline}"` : "", keep(t.cta) ? `- a call-to-action that clearly reads as a button or link: "${t.cta}"` : ""].filter(Boolean).join(";\n")}.
Brand colours to build the whole design with: ${colors} (dark, primary, secondary, accent, light; use the validated roles from the identity, with contrasting text rather than always dark text); strong hierarchy, maximum legibility (strong contrast behind every text).
Write ONLY these texts, spelled EXACTLY (same accents, same punctuation), nothing else: ${shown.map((x) => `"${x}"`).join(", ")}${o.hasLogo ? "" : `, "${t.brand}"`}${o.hasLogo ? ` (plus the brand name inside the logo, as on the logo: "${t.brand}")` : ""}.
No other words (no description paragraph, no small print), no colour swatches or palette blocks, no fake letters, no unconfirmed prices, invented percentages, unsupported claims, fabricated reviews or stars, no hashtags, no website, no watermark. ${o.people ? "If a person appears, they look like a real photographed person (natural skin, natural expression, anatomically correct face, hands and fingers, natural posture), wearing or using the product naturally; the product stays clearly visible and identical to the reference." : "No people, no hands, no faces, no body parts."}${o.fix ? `\nCorrect the previous attempt: ${o.fix}` : ""}`;
}

/** Forme comparable d'un texte : espaces et apostrophes unifiés, accents et lettres gardés tels quels. */
const norm = (x: string) =>
  x
    .normalize("NFC")
    .replace(/[’ʼ]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
/**
 * Textes attendus tous présents, lettre pour lettre, dans ce que le contrôle a lu (« Découvrïr » ≠ « Découvrir »),
 * et aucun mot en plus. Vérifié par le studio : l'IA de contrôle ne décide pas seule de l'orthographe.
 */
export function textsMatch(expected: string[], transcribed: string[]): boolean {
  const seen = norm(transcribed.join(" \n "));
  const want = expected.filter((x) => x.trim()).map(norm);
  if (!want.every((w) => seen.includes(w))) return false;
  const rest = want
    .reduce((acc, w) => acc.replace(w, " "), seen)
    .replace(/[\s\n.,;:!?→>›»«"'–-]+/g, "");
  return rest.length <= 2;
}

/** Verdict du contrôle : publication acceptée seulement si le produit est fidèle, les textes exacts et lisibles. */
export const aiPostAccepted = (
  r: AiPostReview,
  hasReference: boolean,
  expected?: string[],
  people = false,
  hasLogo = false,
) =>
  (people ? !r.person || r.anatomyOk : !r.person) &&
  (!hasReference || r.productFaithful) &&
  (!hasLogo || r.logoFaithful === true) &&
  r.textsExact &&
  (!expected || textsMatch(expected, r.transcribed)) &&
  r.legible &&
  r.score >= 9 &&
  !r.issues.length &&
  !r.fatal?.length &&
  qualityGridPasses(r.grid);

export type PublicationContext = {
  creative?: CreativeContract;
  renderedBlocks?:EditorialBlock[];
  stage?: "scene" | "final";
  peopleAllowed?: boolean;
  brief?: GenerationBrief;
  identity: unknown;
  strategy: unknown;
  facts: unknown;
  request: string | null;
  aspect: AspectId;
  mode: "one-step" | "two-step";
  recent: { assetId: string; composition: string; concept: unknown }[];
  native?: Buffer;
  scene?: Buffer;
  referenceManifest?: unknown;
  clientTexts?: Partial<AiPostCopy>;
};

export type AiPostDeps = {
  /** Accroche, ligne, bouton et scène écrits par l'IA de texte (null : textes du calendrier). */
  copy?: (
    p: Project,
    post: PostBrief,
    fallback: AiPostTexts,
    key: string,
    people: boolean,
    context?: PublicationContext,
  ) => Promise<AiPostCopy | null>;
  generate: (
    prompt: string,
    aspect: AspectId,
    reference: Buffer | null,
    key: string,
    logo?: Buffer | null,
    options?: { photoOnly?: boolean },
  ) => Promise<Buffer>;
  review: (
    image: Buffer,
    reference: Buffer | null,
    texts: string[],
    key: string,
    people?: boolean,
    logo?: Buffer | null,
    context?: PublicationContext,
  ) => Promise<AiPostReview>;
  spentMicro: (keyPrefix: string) => number;
  maxMicro: (references?: number, photoOnly?: boolean) => number | null;
  conceptMaxMicro?: () => number;
  reviewMaxMicro?: () => number;
  clientTexts?: Partial<AiPostCopy>;
  /** Explicit operation id is supplied only by a deliberate new-version action, not retries. */
  operationId?: string;
  sourceAssetId?: string;
  confirmedCommercialTexts?: string[];
  /** An explicit free correction must reuse this acquired copy, never silently pay for another one. */
  expectedCopyKey?: string;
  /**
   * Étape 2 (choix du propriétaire) : sur la photo créée SANS texte (étape 1, Qwen-Image), l'IA « Texte et logo »
   * (seulement si l'administration règle cet usage) pose les textes exacts, le bouton et le vrai logo. Absent (par défaut) : une seule étape, Qwen-Image 3.0 Pro.
   */
  layout?: (
    photo: Buffer,
    prompt: string,
    aspect: AspectId,
    logo: Buffer | null,
    key: string,
  ) => Promise<Buffer>;
  layoutMaxMicro?: () => number | null;
};

/** Étape 1 : la photographie seule (vrai produit en référence), sans texte ni logo. */
export function aiScenePrompt(
  p: Project,
  post: PostBrief,
  o: {
    aspect: string;
    hasReference: boolean;
    people?: boolean;
    brief: GenerationBrief;
    fix?: string;
  },
): string {
  if(o.brief.objective.startsWith("organic")) return organicVisualPrompt(p,post,o,true);
  return `Create a premium campaign PHOTOGRAPH (aspect ratio ${o.aspect}) for the brand's ${post.network} ${o.brief.objective.startsWith("ad") ? "advertisement" : "post"}. Text and logo will be added afterwards by a designer: the photograph itself contains no text at all.
Subject (context for you only — never write it): ${p.product.name || p.product.category} — ${p.product.summary?.slice(0, 300) ?? ""}
${post.request ? `Client's brief for this visual (follow it closely): ${post.request}\n` : ""}${
    o.hasReference
      ? `The product in the reference image is the hero: reproduce it EXACTLY, use only documented views and details (same shape, proportions, materials, colours and markings); a justified faithful detail crop is allowed, never invent an unseen side or redesign it, never add copies beyond the explicitly requested quantity. If the reference shows it worn or held by someone, take only the product.
`
      : ""
  }Finish: real light (key light, rim light, crisp reflections), depth of field and sharpness chosen for the specific concept, credible materials, coherent contact shadows and perspective. Background blur is optional, never automatic.
${briefScenePrompt(o.brief)}
${o.people ? "If a person appears, they look like a real photographed person (natural skin, anatomically correct face, hands and fingers), using the product naturally; the product stays clearly visible and identical to the reference." : "No people, no hands, no faces, no body parts."}${o.fix ? `\nCorrect the previous attempt: ${o.fix}` : ""}`;
}

/**
 * Projet vu à travers le sujet choisi (produit du catalogue ou service) : le visuel parle de CE produit ou service,
 * avec ses informations, sans rien inventer (les faits vérifiés ne valent que pour le produit principal).
 */
export function projectForSubject(
  p: Project,
  subject: SubjectOption | null | undefined,
): Project {
  if (!subject || (subject.kind === "product" && subject.key === MAIN_PRODUCT))
    return p;
  const selected =
    subject.kind === "product"
      ? p.catalog.find((x) => x.key === subject.key)
      : null;
  return {
    ...p,
    catalog: [],
    ...(subject.kind === "service"
      ? {
          services: {
            ...p.services,
            services: p.services.services.filter(
              (x) => x.name.trim() === subject.key,
            ),
          },
        }
      : {}),
    business: subject.kind === "service" ? "services" : "products",
    product: {
      ...p.product,
      name: subject.name,
      summary: subject.summary,
      category:
        subject.kind === "service"
          ? "Prestation de services"
          : (selected?.category ?? "Produit du catalogue"),
      price: {
        amount: selected?.price != null ? selected.price / 100 : null,
        currency: p.product.price.currency,
        status: selected?.price != null ? "confirmed" : "unknown",
      },
      variants: [],
      facts: [],
    },
  };
}

export async function designPostWithAi(p:Project,post:PostBrief,o:Parameters<typeof designSinglePostWithAi>[2],deps:AiPostDeps):Promise<MediaResult> {
  if(post.format!=="carousel" || o.as==="ad") return designSinglePostWithAi(p,post,o,deps);
  let pages:ReturnType<typeof editorialPages>;
  try {pages=editorialPages(post); if(pages.length>platformSpec(post.network).carouselMax)throw new Error("Ce réseau ne permet pas ce nombre de pages de carrousel ; choisissez un réseau compatible.");}
  catch(e){return {assetId:null,costMicro:0,by:"image_v2",note:String((e as Error).message)};}
  const ids:string[]=[],group=stableHash("editorial-series-1",{project:p.id,post,aspect:o.aspect});let cost=0,attempts=0;let family:unknown;
  for(const [index,page] of pages.entries()) {
    const r=await designSinglePostWithAi(p,{...post,id:`${post.id}:page:${index+1}`,format:"image",headline:page.title,title:page.title,
      editorial:{...post.editorial,slides:undefined,steps:undefined,blocks:page.blocks},
      series:{id:group,index:index+1,total:pages.length,pages,family}}, {...o,maxCostEur:Math.max(0,o.maxCostEur-cost/1e6)},deps);
    cost+=r.costMicro;attempts+=r.attempts??0;
    if(!r.assetId)return {assetId:null,partialAssetIds:ids,costMicro:cost,attempts,by:"image_v2",note:`Carrousel incomplet, page ${index+1}/${pages.length} : ${r.note??"contrôle refusé"}. Pages utilisables conservées, aucune publication complète annoncée.`};
    ids.push(r.assetId);
    if(index===0){const b=assetMeta<any>(getAsset(r.assetId)!).finalImage.brief;family={typography:b.typography,palette:b.palette,readingGrid:b.composition};}
  }
  for(const [index,aid] of ids.entries())run("UPDATE assets SET meta=json_set(meta,'$.carousel',json(?)) WHERE id=?",JSON.stringify({id:group,postId:post.id,index:index+1,total:ids.length,assetIds:ids}),aid);
  return {assetId:ids[0],assetIds:ids,costMicro:cost,attempts,by:"image_v2"};
}

async function designSinglePostWithAi(
  p0: Project,
  post: PostBrief,
  o: {
    aspect: AspectId;
    maxCostEur: number;
    reference: string | null;
    subject?: SubjectOption | null;
    as?: "post" | "ad";
    mode?: "one-step" | "two-step";
    maxAttempts?: number;
  },
  deps: AiPostDeps,
): Promise<MediaResult> {
  const p = projectForSubject(p0, o.subject),
    isAd = o.as === "ad",
    people = peopleAllowedFor(p);
  let creative:CreativeContract;
  try {creative=creativeContract(post,isAd?"ad":"organic");}
  catch(e){return {assetId:null,costMicro:0,by:"image_v2",note:(e as Error).message};}
  const capMicro = Math.round(o.maxCostEur * 1e6);
  const ref = o.reference ? getAsset(o.reference) : null;
  if (
    ref &&
    (ref.project_id !== p.id ||
      ref.deleted_at ||
      ref.status === "rejected" ||
      ref.kind !== "image")
  )
    return {
      assetId: null,
      costMicro: 0,
      by: "image_v2",
      note: "Référence indisponible dans ce projet.",
    };
  const refBuf = ref ? assetData(ref) : null;
  if (isAd && p.business !== "services" && !refBuf)
    return {
      assetId: null,
      costMicro: 0,
      by: "image_v2",
      note: "publication IA : aucune photo de référence du produit",
    };
  const logoAsset = p.brand?.logo?.assetId
    ? getAsset(p.brand.logo.assetId)
    : null;
  const logoBuf =
    logoAsset &&
    logoAsset.project_id === p.id &&
    !logoAsset.deleted_at &&
    logoAsset.status !== "rejected"
      ? assetData(logoAsset)
      : null;
  if (p.brand?.logo?.assetId && !logoBuf)
    return {
      assetId: null,
      costMicro: 0,
      by: "image_v2",
      note: "Logo validé indisponible : génération bloquée, aucun logo inventé.",
    };
  const mode = o.mode ?? (deps.layout ? "two-step" : "one-step");
  const rules = loadWordingRules(p0.id);
  const art = artDirectionFor(p0);
  const view = brainView(p, "image"); // completeness is enforced, no lost critical constraint
  const prefix = publicationKey(p.id, {
    policy: PUBLICATION_POLICY,
    post: {
      id: post.id,
      network: post.network,
      format: post.format,
      title: post.title,
      pillar: post.pillar,
      objective: post.objective,
      headline: post.headline,
      request: post.request,
      subject: post.subject,
    },
    aspect: o.aspect,
    identity: publicationIdentity(p),
    strategy: p.strategy,
    product: p.product,
    services: p.services,
    reference: ref?.id,
    logo: logoAsset?.id,
    people,
    mode,
    clientTexts: deps.clientTexts,
    confirmedTexts: deps.confirmedCommercialTexts,
    rules,
    brain: view.hash,
    operation: deps.operationId ?? null,
    creative,
  });
  const spent = () => deps.spentMicro(prefix);
  const blocked = (note: string): MediaResult => ({
    assetId: null,
    costMicro: spent(),
    by: "image_v2",
    note,
  });
  const fits = (n: number) => spent() + n <= capMicro;
  const qcMax = deps.reviewMaxMicro?.() ?? 0;
  try {
    if(deps.expectedCopyKey && deps.expectedCopyKey!==`${prefix}:copy`)return {...blocked("Le contexte a changé depuis cette rédaction : vérifiez le projet avant de reprendre. Aucun nouvel appel de rédaction envoyé."),code:"COPY_CONTEXT_CHANGED"};
    // An acquired final result does not need a currently available generation model.
    for(let i=0;i<Math.min(AI_POST_ATTEMPTS,Math.max(1,o.maxAttempts??AI_POST_ATTEMPTS));i++) {
      const cached=publicationStageValue<{assetId?:string}>(p.id,`${prefix}:${i}:outcome`);
      if(cached?.assetId){const a=getAsset(cached.assetId);if(!a||a.project_id!==p.id||a.deleted_at||!["ready","approved"].includes(a.status))return blocked("Version conservée indisponible : pas de nouvelle dépense automatique.");return {assetId:a.id,costMicro:spent(),by:"image_v2",attempts:i+1};}
    }
    // Deterministic prerequisites BEFORE buying copy or claiming a pending receipt.
    if(mode==="two-step"&&!deps.layout)return {...blocked("Étape de mise en page demandée indisponible, aucun remplacement automatique."),code:"LAYOUT_STAGE_UNAVAILABLE"};
    const photoOnly=mode==="two-step";
    const imageReady=publicationStageDone(p.id,photoOnly?`${prefix}:scene:0`:`${prefix}:0:image`);
    const layoutReady=!photoOnly||publicationStageDone(p.id,`${prefix}:0:layout`);
    const max=imageReady?0:deps.maxMicro((refBuf?1:0)+(photoOnly?0:logoBuf?1:0),photoOnly);
    if(max==null || (!layoutReady&&deps.layoutMaxMicro?.()==null))return {...blocked("Aucun modèle compatible avec toutes les références essentielles."),code:"ESSENTIAL_REFERENCES_NO_COMPATIBLE_MODEL"};
    if(!publicationStageDone(p.id,`${prefix}:copy`)) {
      const input={headline:deps.clientTexts?.headline??"",subline:deps.clientTexts?.subline??"",cta:deps.clientTexts?.cta??""};
      const explicit=Object.values(input).filter(Boolean);
      const issues=publicationCopyIssues(p,input,post.request??"",explicit,deps.confirmedCommercialTexts);
      if(issues.length)return {...blocked(`Texte saisi à vérifier (${[...new Set(issues.map(x=>x.field))].join(", ")}) : confirmez les faits de l’offre dans le projet ou retirez cette assertion. Aucun appel de rédaction envoyé.`),code:"CLIENT_COPY_FACTS_REQUIRED"};
      if(!deps.copy)return {...blocked("Conception IA indisponible : génération suspendue, aucun secours silencieux."),code:"COPY_ENGINE_UNAVAILABLE"};
      const minimum=(deps.conceptMaxMicro?.()??0)+max+(photoOnly?deps.layoutMaxMicro!()!:0)+(photoOnly?2:1)*qcMax;
      if(!fits(minimum))return {...blocked("Budget insuffisant pour concevoir le visuel et son premier contrôle : étapes acquises conservées, aucun appel envoyé."),code:"CREATIVE_CAP_BEFORE_COPY"};
    }
    const recent = all<{ id: string; meta: string }>(
      "SELECT id,meta FROM assets WHERE project_id = ? AND deleted_at IS NULL AND status IN ('ready','approved') AND json_extract(meta,'$.finalImage') IS NOT NULL ORDER BY created_at DESC,rowid DESC LIMIT 8",
      p.id,
    )
      .filter((a) => {
        try {
          return JSON.parse(a.meta).aiPost?.operationKey !== prefix;
        } catch {
          return false;
        }
      })
      .map((a) => {
        const m = JSON.parse(a.meta);
        return {
          assetId: a.id,
          composition: m.finalImage.composition,
          concept: m.finalImage.brief?.concept,
        };
      });
    const context: PublicationContext = {
      creative,
      identity: publicationIdentity(p),
      strategy: p.strategy,
      facts: [
        ...p.product.facts.filter((f) => f.status === "confirmed"),
        ...(deps.confirmedCommercialTexts ?? []).map((value) => ({
          label: "Offre de cette campagne",
          value,
          status: "confirmed",
          source: "user",
        })),
      ],
      peopleAllowed: people,
      request: post.request ?? null,
      aspect: o.aspect,
      mode,
      recent,
      clientTexts: deps.clientTexts,
      referenceManifest: [
        ...(refBuf
          ? [
              {
                role: p.business === "services" ? "scene" : "product",
                assetId: ref!.id,
              },
            ]
          : []),
        ...(logoBuf ? [{ role: "logo", assetId: logoAsset!.id }] : []),
      ],
    };
    const base = aiPostTexts(p, post);
    if(!creative.allowCommercial)base.cta="";
    const acquired = await publicationStage(p.id, `${prefix}:copy`, async () => {
      if (!fits(deps.conceptMaxMicro?.() ?? 0))
        throw new Error(
          "Budget insuffisant pour concevoir le visuel : aucun titre de calendrier certifié premium.",
        );
      if (!deps.copy)
        throw new Error(
          "Conception IA indisponible : génération suspendue, aucun secours silencieux.",
        );
      const result = await deps.copy(
        p,
        post,
        base,
        `${prefix}:copy`,
        people,
        context,
      );
      if (!result?.scene?.trim() || !result.concept)
        throw new Error(
          "Concept IA absent : aucune rédaction de secours certifiée premium.",
        );
      return result;
    });
    const correction=acquiredCorrection(p.id,`${prefix}:copy`,acquired);
    const written=correction?{...acquired,...correction}:acquired;
    const protectedTexts=[p.brand?.name,...Object.values({...deps.clientTexts,...correction})].filter((x):x is string=>typeof x==="string"&&!!x).sort((a,b)=>b.length-a.length);
    const protectedPattern=protectedTexts.length?new RegExp(`(${protectedTexts.map(x=>x.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join("|")})`,"g"):null;
    const W = (x:string) => protectedPattern?x.split(protectedPattern).map(part=>protectedTexts.includes(part)?part:applyWording(part,rules)).join(""):applyWording(x,rules);
    const authorized = [...Object.values(deps.clientTexts ?? {}),...Object.values(correction??{})].filter(
      (x): x is string => typeof x === "string",
    );
    const allowed = authorizedPublicationTexts(
      p,
      [written.headline, written.subline, written.cta],
      post.request ?? "",
      authorized,
      deps.confirmedCommercialTexts,
    );
    const issues=publicationCopyIssues(p,written,post.request??"",authorized,deps.confirmedCommercialTexts);
    if(issues.length)return {...blocked("Rédaction IA non conforme aux faits confirmés : vérifiez les passages indiqués et corrigez gratuitement le texte acquis avant de reprendre l'image."),code:"COPY_FACTS_REJECTED",copyReview:makeCopyReview(`${prefix}:copy`,acquired,issues,p)};
    const t0 = cleanAiCopy(written, base, people, allowed);
    const t = {
      ...t0,
      headline: W(t0.headline),
      subline: W(t0.subline),
      cta: W(t0.cta),
      blocks: isAd ? [] : (post.editorial?.blocks?.length || post.editorial?.steps?.length || post.editorial?.testimonial || post.series ? creative.blocks : written.blocks ?? creative.blocks),
    };
    if(!isAd && ["advice","faq","checklist","tutorial","infographic","comparison"].includes(creative.structure) && !(t.blocks??[]).some(b=>b.text.trim().length>0 && b.text.trim()!==t.headline.trim() && !commercialCta(b.text)))return blocked("Contenu éditorial utile manquant : fournir ou concevoir les explications à partir de faits/sources avant de générer l'image. Aucun conseil réduit à un slogan.");
    context.renderedBlocks=t.blocks;
    if(!creative.allowCommercial && commercialCta(t.cta)) return blocked("CTA commercial imposé à un contenu organique : conception à corriger, aucun appel image.");
    const brief = buildGenerationBrief(p, {
      purpose: isAd ? "ad" : "post",
      subject: `${p.product.name || p.product.category} — ${post.title}`,
      aspect: o.aspect,
      texts: { hook: t.headline, secondary: t.subline, cta: t.cta },
      references: [
        refBuf ? "image 1: real subject reference" : "",
        logoBuf ? `image ${refBuf ? 2 : 1}: exact logo` : "",
      ].filter(Boolean),
      recent: recent.map((r) => r.composition),
      ad: art,
      scene: t.scene,
    });
    const c = t.concept;
    if (c)
      Object.assign(brief, {
        concept: `${c.idea}. ${t.scene}. Materials: ${c.materials}. Effects: ${c.effects || "none"}. Justification: ${c.rationale}. Diversity: ${c.diversity}`,
        composition: c.composition,
        framing: c.framing,
        setting: c.setting,
        light: c.light,
        typography: `${art.typography}; ${c.typography}`,
      });
    brief.palette = JSON.stringify({
      palette: publicationIdentity(p)?.palette,
      roles: p.brand?.artIdentity?.colorRoles,
    });
    if (c?.ctaStyle === "none")
      brief.exactTexts = brief.exactTexts.filter((x) => x.role !== "bouton");
    if (c?.ctaStyle === "link")
      brief.exactTexts = brief.exactTexts.map((x) =>
        x.role === "bouton" ? { ...x, role: "link" } : x,
      );
    context.brief = brief;
    if(!isAd) {
      brief.objective=`organic — ${creative.structure} — ${creative.goal}`;
      brief.fidelity="Le produit peut être absent ; tout sujet représenté respecte ses références. Explication et diagrammes factuels uniquement, aucune réalisation client inventée.";
      for(const [i,b] of (t.blocks??[]).entries())for(const text of [b.title,b.text].filter((x):x is string=>!!x))
        if(!brief.exactTexts.some(x=>x.text===text))brief.exactTexts.push({role:`${b.kind} ${i+1}`,text,sharePct:3.8});
      if(t.cta && !brief.exactTexts.some(x=>x.text===t.cta))brief.exactTexts.push({role:"editorial action",text:t.cta,sharePct:3.8});
      brief.typography=`${art.typography}; ${c?.typography??""}; distinguer titre, contenu utile, sources ; aucune étape ou citation réduite à un slogan`;
    }
    const authorizedReferences = context.referenceManifest;
    const P = (x: string) =>
      [
        W(x),
        `VALIDATED IDENTITY: ${JSON.stringify(publicationIdentity(p))}`,
        wordingPromptLine(rules),
        "Vocabulary preferences apply to generic prose only. Proper brand names, the supplied logo and real product markings stay exactly as validated.",
        formatPlan(o.aspect),
      ]
        .filter(Boolean)
        .join("\n");
    const twoSteps = mode === "two-step" && brief.exactTexts.length > 0;
    if (twoSteps && !deps.layout)
      return blocked(
        "Étape de mise en page demandée indisponible, aucun remplacement automatique.",
      );
    let fix = "",
      sceneVersion = 0;
    const pal = effectivePalette(p.brand) ?? p.brand?.palette;
    for (let attempt = 0; attempt < Math.min(AI_POST_ATTEMPTS,Math.max(1,o.maxAttempts??AI_POST_ATTEMPTS)); attempt++) {
      const key = `${prefix}:${attempt}`;
      const result = await publicationStage(
        p.id,
        `${key}:outcome`,
        async () => {
          const imageReady = publicationStageDone(
            p.id,
            twoSteps ? `${prefix}:scene:${sceneVersion}` : `${key}:image`,
          );
          const layoutReady =
            !twoSteps || publicationStageDone(p.id, `${key}:layout`);
          const sceneReviewReady =
            !twoSteps ||
            publicationStageDone(
              p.id,
              `${prefix}:scene:${sceneVersion}:review`,
            );
          const finalReviewReady = publicationStageDone(p.id, `${key}:review`);
          const max = imageReady
            ? 0
            : deps.maxMicro(
                (refBuf ? 1 : 0) + (twoSteps ? 0 : logoBuf ? 1 : 0),
                twoSteps,
              );
          const lay = layoutReady ? 0 : deps.layoutMaxMicro?.();
          if (max == null || lay == null)
            throw new Error(
              "Aucun modèle compatible avec toutes les références essentielles.",
            );
          const needed =
            max +
            lay +
            (sceneReviewReady ? 0 : qcMax) +
            (finalReviewReady ? 0 : qcMax);
          if (!fits(needed))
            throw new Error(
              "Plafond atteint avant génération et contrôles : étapes utilisables conservées, aucun FINAL.",
            );
          let scene: { data: Buffer; assetId: string } | undefined;
          let native: { data: Buffer; assetId: string };
          if (twoSteps) {
            const sp = P(
              aiScenePrompt(p, post, {
                aspect: o.aspect,
                hasReference: !!refBuf,
                people,
                brief,
                fix: sceneVersion ? fix : undefined,
              }),
            );
            scene = await publicationImageStage(
              p,
              `${prefix}:scene:${sceneVersion}`,
              sp,
              () =>
                deps.generate(
                  sp,
                  o.aspect,
                  refBuf,
                  `${prefix}:scene:${sceneVersion}`,
                  null,
                  { photoOnly: true },
                ),
            );
            const sr = await publicationStage(
              p.id,
              `${prefix}:scene:${sceneVersion}:review`,
              () =>
                deps.review(
                  scene!.data,
                  refBuf,
                  [],
                  `${prefix}:scene:${sceneVersion}`,
                  people,
                  null,
                  {
                    ...context,
                    stage: "scene",
                    brief: { ...brief, exactTexts: [], logo: "none" },
                  },
                ),
            );
            if (
              (refBuf && !sr.productFaithful) ||
              (!people && sr.person) ||
              !sr.anatomyOk ||
              sr.fatal?.length ||
              sr.issues.length ||
              !qualityGridPasses(sr.grid) ||
              sr.score < 9
            )
              return {
                assetId: null,
                fix: sr.fix || sr.issues.join("; "),
                sceneFailed: true,
              };
            const lp = P(
              layoutPrompt(brief, {
                hasLogo: !!logoBuf,
                brand: t.brand,
                textColor: pal?.dark ?? art.palette.text,
                accent: pal?.accent ?? art.palette.accent,
              }) + (fix ? `\nTargeted correction: ${fix}` : ""),
            );
            native = await publicationImageStage(p, `${key}:layout`, lp, () =>
              deps.layout!(scene!.data, lp, o.aspect, logoBuf, `${key}:layout`),
            );
          } else {
            const gp = P(
              aiPostPrompt(p, post, {
                aspect: o.aspect,
                hasReference: !!refBuf,
                hasLogo: !!logoBuf,
                fix,
                texts: t,
                people,
                brief,
              }),
            );
            native = await publicationImageStage(p, `${key}:image`, gp, () =>
              deps.generate(gp, o.aspect, refBuf, `${key}:image`, logoBuf),
            );
          }
          let rendition;
          try {
            rendition = await publicationRendition(native.data, o.aspect);
          } catch (e) {
            return {
              assetId: null,
              fix: `Recompose at the requested ratio and sufficient native resolution. ${e instanceof Error ? e.message : "format failed"}`,
              sceneFailed: false,
            };
          }
          context.referenceManifest = {
            authorized: authorizedReferences,
            transports: [
              scene ? assetMeta(getAsset(scene.assetId)!).imageRequest : null,
              assetMeta(getAsset(native.assetId)!).imageRequest,
            ].filter(Boolean),
          };
          const expected = [
            ...brief.exactTexts.map((x) => x.text),
            ...(logoBuf ? [] : [t.brand]),
          ].filter(Boolean);
          const r = await publicationStage(p.id, `${key}:review`, () =>
            deps.review(
              rendition.data,
              refBuf,
              expected,
              key,
              people,
              logoBuf,
              { ...context, native: native.data, scene: scene?.data },
            ),
          );
          const accepted = aiPostAccepted(
            r,
            !!refBuf,
            expected,
            people,
            !!logoBuf,
          );
          const calls = all<Record<string, unknown>>(
            "SELECT id,provider,requested_model,served_model,task,usage_key,cost,status,estimated,input_tokens,output_tokens,routing_fallback,routing_reason,latency_ms FROM ai_calls WHERE project_id = ? AND usage_key LIKE ? ORDER BY created_at,rowid",
            p.id,
            `${prefix}%`,
          );
          const a = await saveAsset({
            projectId: p.id,
            userId: p.userId,
            data: rendition.data,
            name: `${isAd ? "publicite" : "publication"}-ia-${post.network}-${post.id.slice(0, 6)}-${attempt + 1}.png`,
            mime: "image/png",
            role: accepted ? (isAd ? "ad" : "social") : "social-trial",
            folderKey: isAd ? "images.ads" : "content.calendar",
            origin: "generated",
            status: accepted ? "ready" : "rejected",
            sourceAssetId: deps.sourceAssetId ?? native.assetId,
            meta: {
              recipe:
                "Campagne conçue par IA, originale native et étapes conservées",
              ...(isAd ? { aiAd: true } : { post: post.id, socialV2: true }),
              aspect: o.aspect,
              finalImage: {
                creative,
                editorialBlocks:t.blocks,
                editorialFingerprint:stableHash("editorial",creative),
                purpose: isAd ? "ad" : "post",
                composition: brief.composition,
                universe: art.universe,
                artDirectionVersion: art.version,
                brief,
                steps: twoSteps ? ["scene", "layout"] : ["one-step"],
                policy: PUBLICATION_POLICY,
                quality: r,
                dimensions: rendition.dimensions,
                native: rendition.native,
                crop: rendition.crop,
                adapted: rendition.adapted,
                scale: rendition.scale,
                identityHash: stableHash("identity", publicationIdentity(p)),
                contract: { ...context, native: undefined, scene: undefined },
                referenceManifest: context.referenceManifest,
                models: calls,
                costMicro: spent(),
                mode,
                nativeAssetId: native.assetId,
                sceneAssetId: scene?.assetId,
              },
              aiPost: {
                texts: t,
                score: r.score,
                attempts: attempt + 1,
                reference: o.reference,
                subject: o.subject
                  ? {
                      kind: o.subject.kind,
                      key: o.subject.key,
                      name: o.subject.name,
                    }
                  : null,
                request: post.request ?? null,
                brand: p.brand,
                operationKey: prefix,
                ...(!accepted
                  ? {
                      issues: [
                        ...r.issues,
                        ...(r.fatal ?? []),
                        "quality gate refused",
                      ],
                    }
                  : {}),
              },
            },
          });
          return {
            assetId: accepted ? a.id : null,
            fix: [r.fix, ...r.issues, ...(r.fatal ?? [])]
              .filter(Boolean)
              .join("; "),
            sceneFailed:
              r.fixTarget === "scene" ||
              r.fixTarget === "both" ||
              (!scene &&
                !!((refBuf && !r.productFaithful) || (!people && r.person))),
          };
        },
        true,
      );
      if (result.assetId) {
        const asset = getAsset(result.assetId);
        if (
          !asset ||
          asset.deleted_at ||
          asset.project_id !== p.id ||
          !["ready", "approved"].includes(asset.status)
        )
          return blocked(
            "Version conservée indisponible : pas de nouvelle dépense automatique.",
          );
        return {
          assetId: result.assetId,
          costMicro: spent(),
          by: "image_v2",
          attempts: attempt + 1,
        };
      }
      fix = result.fix;
      if (result.sceneFailed) sceneVersion++;
    }
    return blocked(
      "Publication refusée après trois essais : défauts et versions conservés, aucun remplacement local.",
    );
  } catch (e) {
    return blocked(
      e instanceof Error
        ? e.message
        : "Publication bloquée ; étapes conservées.",
    );
  }
}

/** Branchement réel : IA d'images de l'usage « Publicités », contrôle visuel, coûts lus dans le journal des appels. */
export function realAiPostDeps(base: {
  userId: string;
  projectId: string;
  jobId: string | null;
  sourceAssetId?: string;
}): AiPostDeps {
  const previous = base.sourceAssetId ? getAsset(base.sourceAssetId) : null;
  if (
    base.sourceAssetId &&
    (!previous || previous.project_id !== base.projectId || previous.deleted_at)
  )
    throw new Error("Création d'origine inaccessible dans ce projet.");
  return {
    operationId: previous ? (base.jobId ?? undefined) : undefined,
    sourceAssetId: previous?.id,
    async copy(p, post, fallback, key, people, context) {
      const { llmJson } = await import("../ai/llm");
      const view = brainView(p, "image");
      const facts = JSON.stringify({
        subject: p.product,
        services: p.business === "services" ? p.services : null,
        identity: publicationIdentity(p),
        strategy: p.strategy,
        request: post.request,
        creativeContext: context,
        previousCreative: previous ? assetMeta(previous) : null,
      });
      return llmJson(
        {
          task: "copywriting",
          ...base,
          usageKey: key,
          promptKey: "social-ai-post-copy",
          routing: { difficulty: "standard", deliverable: "ad_v2" },
          system: context?.creative?.purpose==="ad"
            ? "You are an advertising creative director. Preserve the established campaign strategy and direction. Answer with JSON only."
            : "You are an editorial art director. Design useful organic content, not sales advertising. Preserve educational content, evidence and narrative. Answer with JSON only.",
          context: view.stable,
          prompt: `${context?.creative?creativeInstruction(context.creative):"Respect the explicit ad or editorial purpose."}
Design ONE specific ${context?.creative?.purpose==="ad"?"commercial campaign":"editorial composition"} for THIS subject and destination, not a sector template. Identity, confirmed facts, complete client brief, explicit client text, complete useful caption, blocks and recent concepts: ${facts}.
Headline, image, light, physical materials, type and logo must be conceived together. Keep proper brand names exactly as validated, even when vocabulary preferences replace generic product terms. Reply in ${p.settings.language === "en" ? "English" : "French"}, image scene instructions may be English. No invented claims. A confirmed/requested price or promotion is allowed; preserve explicit clientTexts verbatim. Choose no CTA, a discreet link or button according to objective; organic posts need no button. A service scene is a generated illustration, never evidence of actual client work. ${people ? "Human presence permitted, anatomy must be credible." : "NO humans, hands, faces, bodies, silhouettes or mannequins; use tools, finished spaces, materials and documented products."}
If previousCreative is provided, preserve its exact texts and usable composition unless THIS client modification explicitly requests changing them. Do not treat a lighting retouch as a new campaign. Reformatting may recompose for the new ratio while preserving subject, logo and exact text.
Use ALL five identity palette roles and validated heading/body families appropriately without recolouring the product. Deliberately vary concept, layout, lighting, location and scale from recent work; justify any wave, panel or special effect. Sharp detail or a documented closeup is allowed; never invent hidden faces. Explain the hierarchy, safe areas for ${context?.aspect}, logo placement, negative space and differentiation. No universal blur or luxury style. Text must be concise and useful.
For organic content return blocks:[{kind:"paragraph|tip|step|question|answer|check|quote|source",title?:"...",text:"..."}]. Develop useful explanations, not just a slogan. Use confirmed facts and verified sources; missing knowledge is a reason to request material, not invent an answer. Preserve explicitly supplied blocks and authorized quotes verbatim. A photograph or community question may deliberately have no body blocks; advice, FAQ, checklist and tutorials need useful substance. A factual diagram needs documented data, never fabricated measurements. Ads may omit blocks.
Return blocks, headline, subline (may be empty), cta (may be empty), scene (specific setting), concept:{idea,composition,framing,setting,light,materials,typography,effects,rationale,diversity,ctaStyle:"none"|"link"|"button"}.`,
          maxTokens: 2000,
        },
        AiPostCopySchema.required({ concept: true,...(context?.creative?.purpose==="organic"?{blocks:true as const}:{}) }),
      );
    },
    async generate(prompt, aspect, reference, key, logo, options) {
      return aiPostImage(
        { ...base, usageKey: key },
        {
          prompt: previous
            ? `${prompt}\nEDIT ONLY THE REQUESTED MODIFICATION. The last style reference is the existing usable creative: preserve its composition and exact texts except where explicitly changed by this client request or where the new ratio needs recomposition.`
            : prompt,
          aspect,
          reference,
          logo,
          previous: previous ? assetData(previous) : null,
          people: peopleAllowedFor(loadProjectForReview(base.projectId)),
          photoOnly: options?.photoOnly,
        },
      );
    },
    async review(image, reference, texts, key, people, logo, context) {
      const { llmJson } = await import("../ai/llm");
      const phone = await sharp(image).resize({ width: 360 }).png().toBuffer();
      return llmJson(
        {
          task: "quality_control",
          ...base,
          usageKey: `${key}:check`,
          promptKey: "social-ai-post-check",
          routing: { difficulty: "standard", deliverable: "image_v2" },
          system:
            "You are a strict art director checking a finished social media post before publication. Answer with JSON only.",
          images: [
            { data: image, label: "post — final file" },
            { data: phone, label: "phone-size proof at 360px" },
            ...(reference
              ? [
                  {
                    data: await prepareImageReference(reference, 768),
                    label: "actual transmitted product/scene reference (768px)",
                  },
                ]
              : []),
            ...(logo
              ? [
                  {
                    data: await prepareImageReference(
                      logo,
                      context?.mode === "two-step" ? 1536 : 768,
                    ),
                    label: "actual transmitted logo reference",
                  },
                ]
              : []),
            ...(previous
              ? [
                  {
                    data: await prepareImageReference(assetData(previous), 768),
                    label:
                      "actual transmitted previous creative (edit only requested changes)",
                  },
                ]
              : []),
            ...(reference
              ? [{ data: reference, label: "real product (reference)" }]
              : []),
            ...(logo ? [{ data: logo, label: "brand logo (reference)" }] : []),
            ...(context?.native
              ? [
                  {
                    data: context.native,
                    label: "native BEFORE ratio adaptation",
                  },
                ]
              : []),
            ...(context?.scene
              ? [
                  {
                    data: context.scene,
                    label:
                      "scene BEFORE text/logo layout (product must remain faithful)",
                  },
                ]
              : []),
            ...(context?.recent ?? []).slice(0, 3).flatMap((r) => {
              const a = getAsset(r.assetId);
              return a && a.project_id === base.projectId && !a.deleted_at
                ? [
                    {
                      data: assetData(a),
                      label: "recent campaign — compare visual diversity",
                    },
                  ]
                : [];
            }),
          ],
          context: brainView(loadProjectForReview(base.projectId), "image")
            .stable,
          prompt: `${context?.creative?creativeInstruction(context.creative):""}
Evaluate relevance and hierarchy against the declared purpose. Organic content must teach, help, explain or invite dialogue according to its role; never penalize absence of a commercial CTA, hero product or photography. Product fidelity means faithful if depicted, or legitimately absent for an editorial subject. Every useful block/step/authorized quotation must remain intact and readable. Invented review, attribution, proof or diagram data is fatal. A carousel page must match its declared order and series, not repeat the same sales poster.
STAGE: ${context?.stage ?? "final"}. ${context?.stage === "scene" ? "This is the scene BEFORE layout: overlay texts and brand logo are deliberately absent, not missing. Score text/logo criteria as not applicable with evidence; do not demand the future overlay. Still check product, consent, light, materials, perspective, artifacts and diversity." : "This is the final composition: every required exact text and supplied logo must be present and faithful."}
Check the post against this FULL contract: ${JSON.stringify(context ? { ...context, native: undefined, scene: undefined } : null)}.
Set fixTarget to scene for wrong setting/light/materials or composition already wrong BEFORE layout; layout for misspelled/missing text/logo or damage introduced ONLY by layout; both only when both stages need repair; none when accepted. Never discard a faithful scene to fix typography.
Report logoFaithful explicitly: false for any changed emblem, missing or misspelled logo, even if overall design is attractive. Compare the final crop against native and layout against scene: no essential text/logo/subject cut or changed. Mobile viewing at 360px: hierarchy, safe margins, crisp letters, no interface overlap. No fabricated facts or false real-service evidence.
Give grid entries for relevance,hierarchy,product,identity,text,mobile,lightMaterials,artifacts,diversity; each {score:0..10,evidence:"visible specific observation (not generic praise)"}. Inspect materials/reflections/contact shadows, perspective, artifacts, product details and recent image similarity, not just JSON validity. Target 9/10, with each criterion >=8. Missing, inaccurate text/logo/product, unauthorized person, unreadable mobile, unsafe crop or unsupported claim is fatal regardless of average. issues must list every actionable defect; fatal lists critical ones. Never approve without evidence.
Check the post.\n- transcribed: every piece of text of the DESIGN (headline, lines, button, brand name), copied EXACTLY letter by letter as it is drawn (keep any wrong letter, accent or typo as you see it; one item per text block). Do NOT include text printed on the product itself (it belongs to the real product, compare it with the reference instead)${logo ? " nor the text inside the brand logo (emblem, brand name, trade line or slogan drawn as part of the logo: compare it with the logo reference; a logo that is altered, misspelled, missing or invented is a fatal refusal)" : ""}.\n- textsExact: true only if the design contains exactly these texts, each spelled exactly (accents included), and no other words (text printed on the product, when it matches the reference, is allowed): ${texts.map((x) => `"${x}"`).join(", ")}.\n- legible: every text is clearly readable (contrast, size).\n- person: true if any person, face, hand, body part or human silhouette appears.\n- anatomyOk: ${people ? "false if a person looks fake or has a wrong face, hands, fingers, limbs or posture; true otherwise" : "true"}.\n- productFaithful: ${reference ? `${context?.creative?.purpose === "organic" ? "If the product is absent for this editorial composition, true; if depicted, " : ""}the product in the post is the same as the reference (shape, colour, details, printed text); false if altered, invented or duplicated` : "true"}.\n- score: overall quality 0-10 for a premium brand.\n- issues: short list of problems; fix: one instruction to correct them.\nReply { "transcribed": ["..."], "person": false, "anatomyOk": true, "productFaithful": true, "textsExact": true, "legible": true, "score": 0, "logoFaithful": false, "grid": {"criterion":{"score":0,"evidence":"observation"}}, "fatal": [], "issues": [], "fix": "", "fixTarget":"none" }.`,
          maxTokens: 2000,
        },
        AiPostReviewSchema.required({
          logoFaithful: true,
          grid: true,
          fatal: true,
          fixTarget: true,
        }),
      );
    },
    // Deuxième étape (texte et logo par une autre IA) seulement si l'administration a réglé l'usage « Texte et logo » :
    // par défaut, Qwen-Image 3.0 Pro crée l'image entière en une fois (choix du propriétaire).
    ...(usageExplicit("text_layout")
      ? {
          async layout(
            photo: Buffer,
            prompt: string,
            aspect: AspectId,
            logo: Buffer | null,
            key: string,
          ) {
            return aiTextLayout(
              { ...base, usageKey: key },
              { prompt, aspect, image: photo, logo },
            );
          },
          layoutMaxMicro: textLayoutMaxMicro,
        }
      : {}),
    spentMicro: (prefix) =>
      all<{ c: number }>(
        "SELECT COALESCE(SUM(cost), 0) c FROM ai_calls WHERE project_id = ? AND usage_key LIKE ?",
        base.projectId,
        `${prefix}%`,
      )[0]?.c ?? 0,
    maxMicro: (references = 2, photoOnly = false) =>
      aiPostMaxMicro(references + (previous ? 1 : 0), photoOnly),
    conceptMaxMicro: () =>
      estimateTaskMicro("copywriting", { input: 18000, output: 2000 }),
    reviewMaxMicro: () =>
      estimateTaskMicro("quality_control", { input: 24000, output: 2000 }),
  };
}

/** Configuration readiness, not proof of provider authentication or creative quality. No network call. */
export async function publicationReadiness(p: Project, extraReferences = 0) {
  const mode = usageExplicit("text_layout") ? "two-step" : "one-step";
  try {
    const { llmConfigured } = await import("../ai/llm");
    if (!llmConfigured())
      return {
        ready: false,
        mode,
        reason: C(
          "Conception ou contrôle IA indisponible.",
          "AI concept or reviewer unavailable.",
        ),
      };
    const refs =
      (p.business === "services" ? 0 : 1) +
      (p.brand?.logo?.assetId ? 1 : 0) +
      extraReferences;
    if (
      aiPostMaxMicro(
        mode === "two-step"
          ? (p.business === "services" ? 0 : 1) + extraReferences
          : refs,
        mode === "two-step",
      ) == null ||
      (mode === "two-step" && textLayoutMaxMicro() == null)
    )
      return {
        ready: false,
        mode,
        reason: C(
          "Aucun modèle configuré ne reçoit toutes les références essentielles.",
          "No configured model can receive all essential references.",
        ),
      };
    return { ready: true, mode, reason: null };
  } catch {
    return {
      ready: false,
      mode,
      reason: C(
        "Configuration ou tarif incomplet : aucun appel lancé.",
        "Incomplete configuration or price: no call started.",
      ),
    };
  }
}
