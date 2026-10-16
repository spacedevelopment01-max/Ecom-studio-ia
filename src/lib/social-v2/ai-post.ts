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
import { all } from "../db";
import { assetData, getAsset, saveAsset } from "../library";
import type { Project } from "../projects";
import { effectivePalette } from "../route-palette";
import { C } from "../i18n-server";
import { peopleAllowedFor } from "../people-policy";
import { aiPostImage, aiPostMaxMicro, aiTextLayout, textLayoutMaxMicro } from "../ai/media-providers";
import { usageExplicit } from "../ai/media-routing";
import { AI_POST_ATTEMPTS, type MediaResult, type PostBrief } from "./deps";
import { MAIN_PRODUCT, type SubjectOption } from "../creative-subject";
import { applyWording, loadWordingRules, wordingPromptLine } from "../client-wording";
import { artDirectionFor, briefPrompt, briefScenePrompt, buildGenerationBrief, layoutPrompt, type GenerationBrief } from "../image-v2/art-direction";

export const AiPostReviewSchema = z.object({
  /** Textes lus dans l'image, recopiés lettre pour lettre (comparés ensuite par le studio, pas par l'IA). */
  transcribed: z.array(z.string()).max(12).default([]),
  /** Une personne (visage, corps, mains, silhouette) apparaît : refusé (aucun humain généré sans photo du client). */
  person: z.boolean().default(false),
  /** Personne (autorisée) réaliste : visage, mains et doigts corrects, posture naturelle. */
  anatomyOk: z.boolean().default(true),
  productFaithful: z.boolean(),
  textsExact: z.boolean(),
  legible: z.boolean(),
  score: z.number().min(0).max(10),
  issues: z.array(z.string()).max(8).default([]),
  fix: z.string().max(400).default(""),
});
export type AiPostReview = z.infer<typeof AiPostReviewSchema>;

/** Accroche et direction artistique écrites par l'IA de texte pour une publication (comme une agence). */
export const AiPostCopySchema = z.object({
  headline: z.string().min(2).max(60),
  subline: z.string().max(60).default(""),
  cta: z.string().min(2).max(28),
  scene: z.string().min(10).max(500),
});
export type AiPostCopy = z.infer<typeof AiPostCopySchema>;
export type AiPostTexts = { headline: string; subline: string; cta: string; brand: string; scene?: string };

/** Textes écrits dans la publication, mot pour mot (titre, ligne du produit, bouton, nom de la marque). */
export function aiPostTexts(p: Project, post: PostBrief): AiPostTexts {
  const strip = (s: string) => s.replace(/[\s·•|,;:–-]+$/, "").trim();
  const cta = p.business === "services" ? C("Demander un devis", "Request a quote") : post.objective === "sell" || post.objective === "convert" ? C("Commander", "Shop now") : C("Découvrir", "Discover");
  return { headline: strip(post.headline || post.title).slice(0, 70), subline: strip(p.product.name || p.product.category || "").slice(0, 50), cta, brand: p.brand?.name ?? "" };
}

const PEOPLE = /\b(?:(?:a|an|the|one|two|young|confident|stylish|seated|smiling)\s+)*(?:person|people|woman|women|man|men|model|supporter|fan|athlete|hiker|runner|girl|boy|child|someone|hands?|neck|shoulders?|face)s?\b[^,.;]*/gi;

/** Accroche de l'IA de texte nettoyée : rien d'inventé de chiffré (prix, %, avis), longueur d'une vraie publicité. */
export function cleanAiCopy(c: AiPostCopy, fallback: AiPostTexts, people = false): AiPostTexts {
  const bad = /\d+\s?%|€|\$|\b(n°\s?1|meilleur(?:e|s|es)?|best|garanti(?:e|s|es)?|guaranteed|avis|reviews?|étoiles|stars)\b/i;
  const ok = (x: string) => !!x.trim() && !bad.test(x);
  return {
    headline: ok(c.headline) ? c.headline.trim() : fallback.headline,
    subline: c.subline && ok(c.subline) ? c.subline.trim() : fallback.subline,
    cta: ok(c.cta) ? c.cta.trim() : fallback.cta,
    brand: fallback.brand,
    // Aucune personne dans la scène (règle du propriétaire : jamais d'humain généré sans photo du client).
    scene: people ? c.scene.trim() : c.scene.trim().replace(PEOPLE, "nobody in frame"),
  };
}

/**
 * Consigne de l'IA d'images pour une publication complète — exigence du propriétaire pour TOUS les clients : un rendu
 * digne des plus grandes campagnes publicitaires. Seul le NIVEAU est imposé : mise en page, cadrage, typographie, place
 * du logo, du produit et des textes, décor et lumière sont libres et changent d'une publication à l'autre.
 */
export function aiPostPrompt(p: Project, post: PostBrief, o: { aspect: string; hasReference: boolean; hasLogo?: boolean; fix?: string; texts?: AiPostTexts; people?: boolean; /** Brief structuré (direction artistique du client) : remplace la direction libre générique. */ brief?: GenerationBrief }): string {
  const t = o.texts ?? aiPostTexts(p, post);
  const pal = effectivePalette(p.brand) ?? p.brand?.palette;
  const colors = pal ? [pal.dark, pal.primary, pal.accent, pal.light].filter(Boolean).join(", ") : "";
  const logoRef = o.hasReference ? "second" : "first";
  // Brief du client : seuls les textes que le rôle de l'image permet (une publication n'a pas toujours de bouton).
  const keep = (x: string) => !!x && (!o.brief || o.brief.exactTexts.some((e) => e.text === x));
  const shown = [t.headline, t.subline, t.cta].filter(keep);
  const kind = o.brief && !o.brief.objective.startsWith("ad") ? "social media post" : "social media advertisement";
  return `Create a finished, ultra-premium ${kind} (${post.network}, aspect ratio ${o.aspect}) for the brand "${t.brand}", at the level of a top brand's advertising campaign: real campaign photography and refined typography in one image, ready to publish.
Subject (context for you only — NEVER write this description or any product detail in the image): ${p.product.name || p.product.category} — ${p.product.summary?.slice(0, 300) ?? ""}
Post angle: ${post.pillar ? `${post.pillar} — ` : ""}${post.title}.
${post.request ? `Client's brief for THIS visual (follow it closely; it has priority over the post angle, but never breaks the rules below): ${post.request.slice(0, 600)}\n` : ""}${t.scene ? `Universe of THIS post (its own setting, light and mood — not a generic template): ${t.scene}\n` : ""}${o.hasReference ? `The product in the first reference image is the hero: reproduce it EXACTLY, seen from the SAME angle and viewpoint as the photo (same shape, proportions, materials, colours, details, printed text); never redraw it from another angle, never redesign it, never add a word or logo on it that is not on the reference, never add a second copy. If the reference shows it worn or held by someone, take only the product.
` : ""}Finish: real light (key light, rim light, crisp reflections), depth of field with a blurred environment that tells the story, rich true-to-life materials, high dynamic range. No text, letters or signs anywhere in the decor.
${o.brief ? `CLIENT ART DIRECTION (specific to this brand — follow it; never a generic look, never the model's default style):\n${briefScenePrompt(o.brief, { photoOnly: false })}` : "Art direction: free and original for THIS post — choose the composition, framing, typography and placement of each element that best serves the idea (never a fixed template: product, texts and brand mark may sit anywhere, as the best agencies would decide). The result must be worthy of the greatest advertising campaigns in the world."}
Elements to include:
- ${o.hasLogo ? `the brand logo from the ${logoRef} reference image, reproduced faithfully (same emblem, same letters), placed where it looks best` : `the brand name "${t.brand}", elegantly typeset`};
${[keep(t.headline) ? `- the headline "${t.headline}" (the hero text${o.brief?.exactTexts.find((e) => e.text === t.headline) ? `, cap height about ${o.brief.exactTexts.find((e) => e.text === t.headline)!.sharePct}% of the image width` : ""})` : "", keep(t.subline) ? `- the small line "${t.subline}"` : "", keep(t.cta) ? `- a call-to-action that clearly reads as a button or link: "${t.cta}"` : ""].filter(Boolean).join(";\n")}.
Brand colours to build the whole design with: ${colors} (dark anchor, brand colour, accent, light neutral); strong hierarchy, maximum legibility (strong contrast behind every text).
Write ONLY these texts, spelled EXACTLY (same accents, same punctuation), nothing else: ${shown.map((x) => `"${x}"`).join(", ")}${o.hasLogo ? "" : `, "${t.brand}"`}${o.hasLogo ? ` (plus the brand name inside the logo, as on the logo: "${t.brand}")` : ""}.
No other words (no description paragraph, no small print), no colour swatches or palette blocks, no fake letters, no prices, no percentages, no claims, no reviews, no stars, no hashtags, no website, no watermark. ${o.people ? "If a person appears, they look like a real photographed person (natural skin, natural expression, anatomically correct face, hands and fingers, natural posture), wearing or using the product naturally; the product stays clearly visible and identical to the reference." : "No people, no hands, no faces, no body parts."}${o.fix ? `\nCorrect the previous attempt: ${o.fix}` : ""}`;
}

/** Forme comparable d'un texte : espaces et apostrophes unifiés, accents et lettres gardés tels quels. */
const norm = (x: string) => x.normalize("NFC").replace(/[’ʼ]/g, "'").replace(/\s+/g, " ").trim().toLowerCase();
/**
 * Textes attendus tous présents, lettre pour lettre, dans ce que le contrôle a lu (« Découvrïr » ≠ « Découvrir »),
 * et aucun mot en plus. Vérifié par le studio : l'IA de contrôle ne décide pas seule de l'orthographe.
 */
export function textsMatch(expected: string[], transcribed: string[]): boolean {
  const seen = norm(transcribed.join(" \n "));
  const want = expected.filter((x) => x.trim()).map(norm);
  if (!want.every((w) => seen.includes(w))) return false;
  const rest = want.reduce((acc, w) => acc.replace(w, " "), seen).replace(/[\s\n.,;:!?→>›»«"'–-]+/g, "");
  return rest.length <= 2;
}

/** Verdict du contrôle : publication acceptée seulement si le produit est fidèle, les textes exacts et lisibles. */
export const aiPostAccepted = (r: AiPostReview, hasReference: boolean, expected?: string[], people = false) => (people ? !r.person || r.anatomyOk : !r.person) && (!hasReference || r.productFaithful) && r.textsExact && (!expected || textsMatch(expected, r.transcribed)) && r.legible && r.score >= 7;

export type AiPostDeps = {
  /** Accroche, ligne, bouton et scène écrits par l'IA de texte (null : textes du calendrier). */
  copy?: (p: Project, post: PostBrief, fallback: AiPostTexts, key: string, people: boolean) => Promise<AiPostCopy | null>;
  generate: (prompt: string, aspect: "1:1" | "4:5" | "9:16" | "16:9", reference: Buffer | null, key: string, logo?: Buffer | null) => Promise<Buffer>;
  review: (image: Buffer, reference: Buffer | null, texts: string[], key: string, people?: boolean, logo?: Buffer | null) => Promise<AiPostReview>;
  spentMicro: (keyPrefix: string) => number;
  maxMicro: () => number | null;
  /**
   * Étape 2 (choix du propriétaire) : sur la photo créée SANS texte (étape 1, Qwen-Image), l'IA « Texte et logo »
   * (seulement si l'administration règle cet usage) pose les textes exacts, le bouton et le vrai logo. Absent (par défaut) : une seule étape, Qwen-Image 3.0 Pro.
   */
  layout?: (photo: Buffer, prompt: string, aspect: "1:1" | "4:5" | "9:16" | "16:9", logo: Buffer | null, key: string) => Promise<Buffer>;
  layoutMaxMicro?: () => number | null;
};

/** Étape 1 : la photographie seule (vrai produit en référence), sans texte ni logo. */
export function aiScenePrompt(p: Project, post: PostBrief, o: { aspect: string; hasReference: boolean; people?: boolean; brief: GenerationBrief; fix?: string }): string {
  return `Create a premium campaign PHOTOGRAPH (aspect ratio ${o.aspect}) for the brand's ${post.network} ${o.brief.objective.startsWith("ad") ? "advertisement" : "post"}. Text and logo will be added afterwards by a designer: the photograph itself contains no text at all.
Subject (context for you only — never write it): ${p.product.name || p.product.category} — ${p.product.summary?.slice(0, 300) ?? ""}
${post.request ? `Client's brief for this visual (follow it closely): ${post.request.slice(0, 600)}\n` : ""}${o.hasReference ? `The product in the reference image is the hero: reproduce it EXACTLY, seen from the SAME angle and viewpoint as the photo (same shape, proportions, materials, colours, details, printed text); never redraw it from another angle, never redesign it, never add a second copy. If the reference shows it worn or held by someone, take only the product.
` : ""}Finish: real light (key light, rim light, crisp reflections), depth of field with a blurred environment that tells the story, rich true-to-life materials, high dynamic range.
${briefScenePrompt(o.brief)}
${o.people ? "If a person appears, they look like a real photographed person (natural skin, anatomically correct face, hands and fingers), using the product naturally; the product stays clearly visible and identical to the reference." : "No people, no hands, no faces, no body parts."}${o.fix ? `\nCorrect the previous attempt: ${o.fix}` : ""}`;
}

/**
 * Projet vu à travers le sujet choisi (produit du catalogue ou service) : le visuel parle de CE produit ou service,
 * avec ses informations, sans rien inventer (les faits vérifiés ne valent que pour le produit principal).
 */
export function projectForSubject(p: Project, subject: SubjectOption | null | undefined): Project {
  if (!subject || (subject.kind === "product" && subject.key === MAIN_PRODUCT)) return p;
  return { ...p, product: { ...p.product, name: subject.name, summary: subject.summary || p.product.summary, facts: [] } };
}

export async function designPostWithAi(p0: Project, post: PostBrief, o: { aspect: "1:1" | "4:5" | "9:16" | "16:9"; maxCostEur: number; reference: string | null; subject?: SubjectOption | null; /** Publicité (rôle « ad ») plutôt que publication organique. */ as?: "post" | "ad" }, deps: AiPostDeps): Promise<MediaResult> {
  const p = projectForSubject(p0, o.subject);
  const isAd = o.as === "ad";
  const capMicro = Math.round(o.maxCostEur * 1e6);
  const ref = o.reference ? getAsset(o.reference) : null;
  const refBuf = ref ? assetData(ref) : null;
  if (p.business !== "services" && o.subject?.kind !== "service" && !refBuf) return { assetId: null, costMicro: 0, by: "image_v2", note: C("publication IA : aucune photo de référence du produit (le studio n'invente pas le produit)", "AI post: no product reference photo (the studio never invents the product)") };
  // Chaque passage a ses propres clés : un essai d'un passage précédent n'est ni recompté dans ce plafond, ni rejoué.
  const prefix = `ai-post:${post.id}:${Date.now().toString(36)}`;
  const base = aiPostTexts(p, post);
  // Personnes : seulement avec l'accord du client (réglage, ou photo fournie qui en montre une).
  const people = peopleAllowedFor(p);
  // Logo de la marque (pointeur de la marque) transmis à l'IA d'images : reproduit, jamais réinventé.
  const logoAsset = p.brand?.logo?.assetId ? getAsset(p.brand.logo.assetId) : null;
  const logoBuf = logoAsset && logoAsset.project_id === p.id && !logoAsset.deleted_at ? assetData(logoAsset) : null;
  const written = deps.copy ? await deps.copy(p, post, base, `${prefix}:copy`, people).catch(() => null) : null;
  // Consignes de vocabulaire du client (mémoire du projet) : appliquées aux textes ET aux consignes des modèles.
  const rules = loadWordingRules(p0.id);
  const W = (x: string) => applyWording(x, rules);
  const P = (x: string) => [W(x), wordingPromptLine(rules)].filter(Boolean).join("\n");
  const t0 = written ? cleanAiCopy(written, base, people) : base;
  const t = { ...t0, headline: W(t0.headline), subline: W(t0.subline), cta: W(t0.cta) };
  // Direction artistique du client (enregistrée, versionnée) + brief en 16 points ; composition différente des
  // créations récentes du projet (diversité réelle, pas seulement une autre couleur de fond).
  const art = artDirectionFor(p);
  const recent = all<{ c: string | null }>("SELECT json_extract(meta, '$.finalImage.composition') c FROM assets WHERE project_id = ? AND deleted_at IS NULL AND json_extract(meta, '$.finalImage') IS NOT NULL ORDER BY created_at DESC LIMIT 6", p.id).map((r) => r.c).filter((c): c is string => !!c);
  const brief = buildGenerationBrief(p, { purpose: isAd ? "ad" : "post", subject: `${p.product.name || p.product.category} — ${post.title}`, aspect: o.aspect, texts: { hook: t.headline, secondary: t.subline, cta: t.cta }, references: [refBuf ? "image 1: the real product (keep it identical)" : "", logoBuf ? `image ${refBuf ? 2 : 1}: the project's real logo` : ""].filter(Boolean), recent, ad: art });
  let fix = "";
  // Deux étapes (photo par Qwen, texte et logo par ChatGPT) quand l'image porte du texte et que l'étape 2 existe.
  const twoSteps = !!deps.layout && brief.exactTexts.length > 0;
  const pal = effectivePalette(p.brand) ?? p.brand?.palette;
  let scene: Buffer | null = null;
  let sceneFix = "";
  for (let attempt = 0; attempt < AI_POST_ATTEMPTS; attempt++) {
    const max = deps.maxMicro();
    if (max == null) return { assetId: null, costMicro: deps.spentMicro(prefix), by: "image_v2", note: C("publication IA : aucun modèle d'images disponible", "AI post: no image model available") };
    const layMax = twoSteps ? (deps.layoutMaxMicro?.() ?? null) : 0;
    if (layMax == null) return { assetId: null, costMicro: deps.spentMicro(prefix), by: "image_v2", note: C("publication IA : aucun modèle pour poser le texte et le logo — aucun gabarit à la place", "AI post: no model to lay out the text and logo — no template instead") };
    if (deps.spentMicro(prefix) + (twoSteps && scene ? 0 : max) + layMax > capMicro) break;
    const key = `${prefix}:${attempt}`;
    let img: Buffer;
    if (twoSteps) {
      // Étape 1 refaite seulement si le produit ou la scène étaient en cause ; sinon la photo payée est gardée.
      if (!scene) scene = await deps.generate(P(aiScenePrompt(p, post, { aspect: o.aspect, hasReference: !!refBuf, people, brief, fix: sceneFix })), o.aspect, refBuf, `${key}:scene`, null);
      img = await deps.layout!(scene, P(layoutPrompt(brief, { hasLogo: !!logoBuf, brand: t.brand, textColor: pal?.dark ?? art.palette.text, accent: pal?.accent ?? art.palette.accent }) + (fix ? `\nCorrect the previous attempt: ${fix}` : "")), o.aspect, logoBuf, `${key}:layout`);
    } else img = await deps.generate(P(aiPostPrompt(p, post, { aspect: o.aspect, hasReference: !!refBuf, hasLogo: !!logoBuf, fix, texts: t, people, brief })), o.aspect, refBuf, key, logoBuf);
    // Avec le vrai logo, le nom de la marque est dans le logo : contrôlé contre le logo, pas comme un texte libre.
    // Textes attendus = ceux du brief (le rôle de l'image décide : une publication sans bouton n'en attend pas).
    const expected = [...brief.exactTexts.map((x) => x.text), ...(logoBuf ? [] : [t.brand])].filter(Boolean);
    const r = await deps.review(img, refBuf, expected, key, people, logoBuf);
    if (!aiPostAccepted(r, !!refBuf, expected, people)) {
      // Image payée refusée : gardée (statut refusé, défauts notés), jamais jetée.
      await saveAsset({ projectId: p.id, userId: p.userId, data: img, name: `${isAd ? "publicite" : "publication"}-ia-refusee-${post.id.slice(0, 6)}-${attempt + 1}.png`, mime: "image/png", role: "social-trial", folderKey: isAd ? "images.ads" : "content.calendar", origin: "generated", status: "rejected", meta: { recipe: "Essai de publication conçue par l'IA, refusé par le contrôle", post: post.id, aiPost: { texts: t, transcribed: r.transcribed, issues: r.issues, score: r.score, attempt: attempt + 1 } } });
    } else {
      const a = await saveAsset({ projectId: p.id, userId: p.userId, data: img, name: `${isAd ? "publicite" : "publication"}-ia-${post.network}-${post.id.slice(0, 6)}.png`, mime: "image/png", role: isAd ? "ad" : "social", folderKey: isAd ? "images.ads" : "content.calendar", origin: "generated", status: "ready", meta: { recipe: isAd ? "Publicité entièrement conçue par l'IA (produit réel en référence, textes vérifiés)" : "Publication entièrement conçue par l'IA (produit réel en référence, textes vérifiés)", ...(isAd ? { aiAd: true } : { post: post.id, socialV2: true }), aspect: o.aspect, finalImage: { purpose: isAd ? "ad" : "post", composition: brief.composition, universe: art.universe, artDirectionVersion: art.version, brief, steps: twoSteps ? ["photo (usage social_image)", "texte et logo (usage text_layout)"] : ["image complète (usage social_image)"] }, aiPost: { texts: t, score: r.score, attempts: attempt + 1, reference: o.reference, subject: o.subject ? { kind: o.subject.kind, key: o.subject.key, name: o.subject.name } : null, request: post.request ?? null, brand: { name: p.brand?.name ?? "", logo: p.brand?.logo?.assetId ?? null, palette: p.brand?.palette ?? null } } } });
      return { assetId: a.id, costMicro: deps.spentMicro(prefix), by: "image_v2" };
    }
    fix = [r.fix, ...r.issues].filter(Boolean).join(" ; ").slice(0, 400) || "spell every text exactly and keep the product identical to the reference";
    // Produit ou personne en cause : la photo est refaite ; texte seul en cause : seule la mise en page est refaite.
    if (twoSteps && ((refBuf && !r.productFaithful) || (!people && r.person))) {
      scene = null;
      sceneFix = fix;
    }
  }
  return { assetId: null, costMicro: deps.spentMicro(prefix), by: "image_v2", note: C("publication IA refusée par le contrôle après ses essais (texte, logo ou produit non conformes) : à refaire, aucun gabarit à la place", "AI post rejected by the check after its attempts (text, logo or product not faithful): to redo, no template instead") };
}

/** Branchement réel : IA d'images de l'usage « Publicités », contrôle visuel, coûts lus dans le journal des appels. */
export function realAiPostDeps(base: { userId: string; projectId: string; jobId: string | null }): AiPostDeps {
  return {
    async copy(p, post, fallback, key, people) {
      const { llmJson } = await import("../ai/llm");
      const facts = [p.product.name, p.product.category, p.product.summary, ...(p.product.facts ?? []).filter((f) => f.status === "confirmed").map((f) => `${f.label} : ${f.value}`).slice(0, 8)].filter(Boolean).join(" · ").slice(0, 900);
      return llmJson(
        {
          task: "copywriting",
          ...base,
          usageKey: key,
          promptKey: "social-ai-post-copy",
          routing: { difficulty: "standard", deliverable: "ad_v2" },
          system: "You are the creative director of a top advertising agency. You write French ad copy for social media posts. Answer with JSON only.",
          prompt: `Brand: "${fallback.brand}". Product or service: ${facts}.\nPost angle: ${post.pillar ?? ""} — ${post.title}.\n${post.request ? `Client's brief for this visual (follow it closely): ${post.request.slice(0, 600)}\n` : ""}Write, in ${p.settings.language === "en" ? "English" : "French"}:\n- headline: a short, punchy, emotional ad headline (2 to 6 words, may be two short sentences like "Partez léger. Voyez grand."), no product jargon;\n- subline: one short line naming the product or service (max 6 words);\n- cta: a button label (2 to 3 words, e.g. "Découvrir", "Commander", "Demander un devis");\n- scene: in English, the art direction of the image as for a high-end campaign: a distinctive universe of its own (setting, materials, props, dominant light — e.g. golden hour, daylight through an arch, moody studio, night reflections), the product alone as hero and room for the text, consistent with the brand and the real use of the product; never a plain or generic background. ${people ? "A person may wear or use the product if it serves the idea (natural, real-looking, product clearly visible); otherwise the product alone." : "NEVER any person, body part, hand, face, silhouette or mannequin: the product is shown on its own (worn items are shown laid flat, hung or floating, never on a body)."}\nNever invent facts: no numbers, prices, percentages, awards, reviews, guarantees or claims not in the product description.\nReply { "headline": "", "subline": "", "cta": "", "scene": "" }.`,
          maxTokens: 600,
        },
        AiPostCopySchema,
      );
    },
    async generate(prompt, aspect, reference, key, logo) {
      return aiPostImage({ ...base, usageKey: key }, { prompt, aspect, reference, logo });
    },
    async review(image, reference, texts, key, people, logo) {
      const { llmJson } = await import("../ai/llm");
      return llmJson(
        {
          task: "quality_control",
          ...base,
          usageKey: `${key}:check`,
          promptKey: "social-ai-post-check",
          routing: { difficulty: "standard", deliverable: "image_v2" },
          system: "You are a strict art director checking a finished social media post before publication. Answer with JSON only.",
          images: [{ data: image, label: "post" }, ...(reference ? [{ data: reference, label: "real product (reference)" }] : []), ...(logo ? [{ data: logo, label: "brand logo (reference)" }] : [])],
          prompt: `Check the post.\n- transcribed: every piece of text of the DESIGN (headline, lines, button, brand name), copied EXACTLY letter by letter as it is drawn (keep any wrong letter, accent or typo as you see it; one item per text block). Do NOT include text printed on the product itself (it belongs to the real product, compare it with the reference instead)${logo ? " nor the text inside the brand logo (emblem, brand name, trade line or slogan drawn as part of the logo: compare it with the logo reference; a logo that is altered, misspelled or invented counts as an issue and lowers the score)" : ""}.\n- textsExact: true only if the design contains exactly these texts, each spelled exactly (accents included), and no other words (text printed on the product, when it matches the reference, is allowed): ${texts.map((x) => `"${x}"`).join(", ")}.\n- legible: every text is clearly readable (contrast, size).\n- person: true if any person, face, hand, body part or human silhouette appears.\n- anatomyOk: ${people ? "false if a person looks fake or has a wrong face, hands, fingers, limbs or posture; true otherwise" : "true"}.\n- productFaithful: ${reference ? "the product in the post is the same as the reference (shape, colour, details, printed text); false if altered, invented or duplicated" : "true"}.\n- score: overall quality 0-10 for a premium brand.\n- issues: short list of problems; fix: one instruction to correct them.\nReply { "transcribed": ["..."], "person": false, "anatomyOk": true, "productFaithful": true, "textsExact": true, "legible": true, "score": 8, "issues": [], "fix": "" }.`,
          maxTokens: 700,
        },
        AiPostReviewSchema,
      );
    },
    // Deuxième étape (texte et logo par une autre IA) seulement si l'administration a réglé l'usage « Texte et logo » :
    // par défaut, Qwen-Image 3.0 Pro crée l'image entière en une fois (choix du propriétaire).
    ...(usageExplicit("text_layout")
      ? {
          async layout(photo: Buffer, prompt: string, aspect: "1:1" | "4:5" | "9:16" | "16:9", logo: Buffer | null, key: string) {
            return aiTextLayout({ ...base, usageKey: key }, { prompt, aspect, image: photo, logo });
          },
          layoutMaxMicro: textLayoutMaxMicro,
        }
      : {}),
    spentMicro: (prefix) => all<{ c: number }>("SELECT COALESCE(SUM(cost), 0) c FROM ai_calls WHERE usage_key LIKE ?", `${prefix}%`)[0]?.c ?? 0,
    maxMicro: aiPostMaxMicro,
  };
}
