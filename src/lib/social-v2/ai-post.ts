/**
 * Publication entièrement conçue par l'IA : l'IA d'images compose le visuel complet (scène, mise en page,
 * typographie, bouton) avec le VRAI produit en référence, dans les couleurs de la marque. Les textes sont donnés mot
 * pour mot ; un contrôle visuel vérifie ensuite l'orthographe exacte, la lisibilité et la fidélité au produit. Un
 * essai refusé est refait une fois avec la correction demandée ; sinon la publication garde son rendu du studio.
 * Coût vérifié avant chaque appel (plafond du lot) ; jamais sans IA active ni accord.
 */
import { z } from "zod";
import { all } from "../db";
import { assetData, getAsset, saveAsset } from "../library";
import type { Project } from "../projects";
import { effectivePalette } from "../route-palette";
import { C } from "../i18n-server";
import { peopleAllowedFor } from "../people-policy";
import { aiPostImage, aiPostMaxMicro } from "../ai/media-providers";
import type { MediaResult, PostBrief } from "./deps";

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
 * Consigne de l'IA d'images pour une publication complète — ligne « campagne » choisie par le propriétaire pour TOUS
 * les clients (référence : reports/alibaba-qwen-essai/style-luxe-cinematique.md) : on garde une MISE EN PAGE et un
 * NIVEAU DE FINITION de campagne haut de gamme, jamais un décor tout fait ; chaque publication invente son univers.
 */
export function aiPostPrompt(p: Project, post: PostBrief, o: { aspect: string; hasReference: boolean; hasLogo?: boolean; fix?: string; texts?: AiPostTexts; people?: boolean }): string {
  const t = o.texts ?? aiPostTexts(p, post);
  const pal = effectivePalette(p.brand) ?? p.brand?.palette;
  const colors = pal ? [pal.dark, pal.primary, pal.accent, pal.light].filter(Boolean).join(", ") : "";
  const logoRef = o.hasReference ? "second" : "first";
  return `Create a finished, ultra-premium social media advertisement (${post.network}, aspect ratio ${o.aspect}) for the brand "${t.brand}", at the level of a top brand's advertising campaign: real campaign photography and refined typography in one image, ready to publish.
Subject: ${p.product.name || p.product.category} — ${p.product.summary?.slice(0, 300) ?? ""}
Post angle: ${post.pillar ?? ""} — ${post.title}.
${t.scene ? `Universe of THIS post (its own setting, light and mood — not a generic template): ${t.scene}\n` : ""}${o.hasReference ? `The product in the first reference image is the hero: reproduce it EXACTLY, seen from the SAME angle and viewpoint as the photo (same shape, proportions, materials, colours, details, printed text); never redraw it from another angle, never redesign it, never add a word or logo on it that is not on the reference, never add a second copy. If the reference shows it worn or held by someone, take only the product.
` : ""}Finish: real light (key light, rim light, crisp reflections), depth of field with a blurred environment that tells the story, rich true-to-life materials, high dynamic range. No text, letters or signs anywhere in the decor.
Layout, from top to bottom:
1. Top center: ${o.hasLogo ? `the brand logo from the ${logoRef} reference image, reproduced faithfully (same emblem, same letters), small and elegant` : `the brand name "${t.brand}" typeset in elegant spaced capitals`}; under it a short thin line in the accent colour, then the small line "${t.subline}" in small widely spaced capitals.
2. The product, large, as the hero in the middle.
3. Lower part: the headline "${t.headline}" in a large refined typeface, on one or two lines, with ONE single word highlighted in the brand accent colour (or italic).
4. Under it, a slim pill-shaped button with a fine outline and a small arrow, text: "${t.cta}".
Brand colours to build the whole design with: ${colors} (dark anchor, brand colour, accent, light neutral); generous margins, strong hierarchy, maximum legibility (strong contrast behind every text).
Write ONLY these texts, spelled EXACTLY (same accents, same punctuation), nothing else: "${t.headline}", "${t.subline}", "${t.cta}"${o.hasLogo ? "" : `, "${t.brand}"`}${o.hasLogo ? ` (plus the brand name inside the logo, as on the logo: "${t.brand}")` : ""}.
No other words, no fake letters, no prices, no percentages, no claims, no reviews, no stars, no hashtags, no website, no watermark. ${o.people ? "If a person appears, they look like a real photographed person (natural skin, natural expression, anatomically correct face, hands and fingers, natural posture), wearing or using the product naturally; the product stays clearly visible and identical to the reference." : "No people, no hands, no faces, no body parts."}${o.fix ? `\nCorrect the previous attempt: ${o.fix}` : ""}`;
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
};

export async function designPostWithAi(p: Project, post: PostBrief, o: { aspect: "1:1" | "4:5" | "9:16" | "16:9"; maxCostEur: number; reference: string | null }, deps: AiPostDeps): Promise<MediaResult> {
  const capMicro = Math.round(o.maxCostEur * 1e6);
  const ref = o.reference ? getAsset(o.reference) : null;
  const refBuf = ref ? assetData(ref) : null;
  if (p.business !== "services" && !refBuf) return { assetId: null, costMicro: 0, by: "image_v2", note: C("publication IA : aucune photo de référence du produit (le studio n'invente pas le produit)", "AI post: no product reference photo (the studio never invents the product)") };
  // Chaque passage a ses propres clés : un essai d'un passage précédent n'est ni recompté dans ce plafond, ni rejoué.
  const prefix = `ai-post:${post.id}:${Date.now().toString(36)}`;
  const base = aiPostTexts(p, post);
  // Personnes : seulement avec l'accord du client (réglage, ou photo fournie qui en montre une).
  const people = peopleAllowedFor(p);
  // Logo de la marque (pointeur de la marque) transmis à l'IA d'images : reproduit, jamais réinventé.
  const logoAsset = p.brand?.logo?.assetId ? getAsset(p.brand.logo.assetId) : null;
  const logoBuf = logoAsset && logoAsset.project_id === p.id && !logoAsset.deleted_at ? assetData(logoAsset) : null;
  const written = deps.copy ? await deps.copy(p, post, base, `${prefix}:copy`, people).catch(() => null) : null;
  const t = written ? cleanAiCopy(written, base, people) : base;
  let fix = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const max = deps.maxMicro();
    if (max == null) return { assetId: null, costMicro: deps.spentMicro(prefix), by: "image_v2", note: C("publication IA : aucun modèle d'images disponible", "AI post: no image model available") };
    if (deps.spentMicro(prefix) + max > capMicro) break;
    const key = `${prefix}:${attempt}`;
    const img = await deps.generate(aiPostPrompt(p, post, { aspect: o.aspect, hasReference: !!refBuf, hasLogo: !!logoBuf, fix, texts: t, people }), o.aspect, refBuf, key, logoBuf);
    // Avec le vrai logo, le nom de la marque est dans le logo : contrôlé contre le logo, pas comme un texte libre.
    const expected = [t.headline, t.subline, t.cta, ...(logoBuf ? [] : [t.brand])].filter(Boolean);
    const r = await deps.review(img, refBuf, expected, key, people, logoBuf);
    if (!aiPostAccepted(r, !!refBuf, expected, people)) {
      // Image payée refusée : gardée (statut refusé, défauts notés), jamais jetée.
      await saveAsset({ projectId: p.id, userId: p.userId, data: img, name: `publication-ia-refusee-${post.id.slice(0, 6)}-${attempt + 1}.png`, mime: "image/png", role: "social-trial", folderKey: "content.calendar", origin: "generated", status: "rejected", meta: { recipe: "Essai de publication conçue par l'IA, refusé par le contrôle", post: post.id, aiPost: { texts: t, transcribed: r.transcribed, issues: r.issues, score: r.score, attempt: attempt + 1 } } });
    } else {
      const a = await saveAsset({ projectId: p.id, userId: p.userId, data: img, name: `publication-ia-${post.network}-${post.id.slice(0, 6)}.png`, mime: "image/png", role: "social", folderKey: "content.calendar", origin: "generated", status: "ready", meta: { recipe: "Publication entièrement conçue par l'IA (produit réel en référence, textes vérifiés)", post: post.id, socialV2: true, aiPost: { texts: t, score: r.score, attempts: attempt + 1, reference: o.reference } } });
      return { assetId: a.id, costMicro: deps.spentMicro(prefix), by: "image_v2" };
    }
    fix = [r.fix, ...r.issues].filter(Boolean).join(" ; ").slice(0, 400) || "spell every text exactly and keep the product identical to the reference";
  }
  return { assetId: null, costMicro: deps.spentMicro(prefix), by: "image_v2", note: C("publication IA refusée par le contrôle (texte ou produit non conformes) : rendu du studio à la place", "AI post rejected by the check (text or product not faithful): studio render instead") };
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
          prompt: `Brand: "${fallback.brand}". Product or service: ${facts}.\nPost angle: ${post.pillar ?? ""} — ${post.title}.\nWrite, in ${p.settings.language === "en" ? "English" : "French"}:\n- headline: a short, punchy, emotional ad headline (2 to 6 words, may be two short sentences like "Partez léger. Voyez grand."), no product jargon;\n- subline: one short line naming the product or service (max 6 words);\n- cta: a button label (2 to 3 words, e.g. "Découvrir", "Commander", "Demander un devis");\n- scene: in English, the art direction of the image as for a high-end campaign: a distinctive universe of its own (setting, materials, props, dominant light — e.g. golden hour, daylight through an arch, moody studio, night reflections), the product alone as hero and room for the text, consistent with the brand and the real use of the product; never a plain or generic background. ${people ? "A person may wear or use the product if it serves the idea (natural, real-looking, product clearly visible); otherwise the product alone." : "NEVER any person, body part, hand, face, silhouette or mannequin: the product is shown on its own (worn items are shown laid flat, hung or floating, never on a body)."}\nNever invent facts: no numbers, prices, percentages, awards, reviews, guarantees or claims not in the product description.\nReply { "headline": "", "subline": "", "cta": "", "scene": "" }.`,
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
    spentMicro: (prefix) => all<{ c: number }>("SELECT COALESCE(SUM(cost), 0) c FROM ai_calls WHERE usage_key LIKE ?", `${prefix}%`)[0]?.c ?? 0,
    maxMicro: aiPostMaxMicro,
  };
}
