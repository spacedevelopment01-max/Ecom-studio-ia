import {UserFacingError} from "../jobs";
import {higgsfieldMessage} from "./higgsfield/errors";
import {approvedQuote} from "./higgsfield/pricing";
import {defaultConfiguration} from "./higgsfield/catalog";
/**
 * Estimation du coût IA d'une action, pour prévenir le client avant une action gourmande.
 * Devis au COÛT PROBABLE (choix du propriétaire, 16/10) : un seul essai et ses contrôles, sans marge de sécurité ni
 * reprise comptée d'avance ; le coefficient de l'administration (`billing.markup`) est compris, comme au débit réel.
 * Une reprise n'est débitée que si elle a lieu, et elle est annoncée. Les PLAFONDS des tâches (jamais débités en
 * eux-mêmes, ils protègent le budget) restent plus larges : `capMicro`.
 * Montré au client en % de son budget IA du mois (`src/lib/budget-pct.ts`), jamais en euros.
 */
import { balance, EUR } from "../billing";
import { getJsonSetting } from "../settings";
import { priceFor, routeFor, usdToEur, type TaskId } from "./config";
import { mediaRouteFor } from "./media-providers";
import { usageExplicit, type MediaUsage } from "./media-routing";
import { L } from "../i18n-server";
import { budgetPctOf } from "./budget-pct";
import { CAP_FACTOR, formatBudgetPct } from "../budget-pct";

export type CostAction = "pipeline" | "theme" | "images" | "image" | "video-clip" | "ugc" | "theme-custom" | "blog";

const ACTIONS: Record<CostAction, { fr: string; en: string }> = {
  pipeline: { fr: "Création complète (marque, boutique, images, vidéos avec plans filmés par l'IA, calendrier)", en: "Full creation (brand, store, images, videos with AI-filmed shots, calendar)" },
  theme: { fr: "Composition du thème sur mesure", en: "Custom theme design" },
  images: { fr: "Jeu d'images complet avec décors IA", en: "Full image set with AI backgrounds" },
  image: { fr: "Image avec décor IA", en: "Image with AI background" },
  "video-clip": { fr: "Vidéo avec plan filmé généré par IA", en: "Video with an AI-generated shot" },
  ugc: { fr: "Vidéo UGC générée par IA", en: "AI-generated UGC video" },
  blog: { fr: "Article de blog écrit par l'IA", en: "AI-written blog post" },
  "theme-custom": { fr: "Thème entièrement sur mesure (chaque section écrite par l'IA)", en: "Fully custom theme (every section written by AI)" },
};

/**
 * Modèle qui sera réellement appelé : pour les images et les vidéos, celui du routage multimédia (ex. Qwen-Image
 * 3.0 Pro) ; sinon (ou si aucun modèle multimédia n'est utilisable) la route de la tâche.
 */
function routeOf(task: TaskId, usage?: MediaUsage): { provider: string; model: string } {
  if (task === "image_generation" || task === "video_generation") {
    const m = mediaRouteFor(usage ?? (task === "video_generation" ? "product_video" : "product_image"), usage==="social_image"?{text:!usageExplicit("text_layout"),references:2}:usage==="text_layout"?{text:true,references:2}:{});
    if (m) return m;
  }
  return routeFor(task);
}

function usd(task: TaskId, units: { input?: number; output?: number; images?: number; seconds?: number }, usage?: MediaUsage): number {
  const r = routeOf(task, usage);
  if(r.provider==='higgsfield') {
    let quote:ReturnType<typeof approvedQuote>;
    try{quote=approvedQuote(defaultConfiguration(r.model,units.seconds??5));}catch(e){throw new UserFacingError(higgsfieldMessage((e as Error).message));}
    // This helper feeds legacy USD aggregation: cancel its global FX and retain the sourced video FX exactly.
    return quote.usd*quote.fx.usdToEur/usdToEur();
  }
  const p = priceFor(r.provider, r.model);
  if (!p) return 0;
  if (p.unit === "tokens") {
    // Images : jetons d'image (gpt-image-1) ; texte : entrée / sortie.
    if (units.images) return units.images * ((400 * p.inputPerM + (usage==="social_image"||usage==="text_layout"?3000:1500) * (p.imageInputPerM ?? p.inputPerM) + 6300 * (p.imageOutputPerM ?? p.outputPerM)) / 1e6);
    return ((units.input ?? 0) * p.inputPerM + (units.output ?? 0) * p.outputPerM) / 1e6;
  }
  if (p.unit === "image") return (units.images ?? 0) * p.perImage;
  return (units.seconds ?? 0) * p.perSecond;
}

/** Coût estimé en micro-euros débités de l'enveloppe (coefficient de l'administration compris). */
export type VideoChoice = "ai" | "edited" | "none";
export function estimateMicro(action: CostAction, opts: { beats?: number; videos?: VideoChoice } = {}): number {
  const qc = (n: number) => n * usd("quality_control", { input: 4000, output: 600 });
  // Brief photo (directeur artistique) : une passe.
  const brief = (n: number) => n * usd("art_direction", { input: 5000, output: 900 });
  const images = (n: number) => usd("image_generation", { images: n }) + brief(n) + qc(n);
  // Plan vidéo généré : 8 s chez Google (Veo), 5 s chez fal (Kling).
  const clip = () => usd("video_generation", { seconds: routeOf("video_generation").provider === "fal" ? 5 : 8 });
  // Découpage vidéo ou script UGC : réalisateur + relecture notée du directeur de création (une passe).
  const direction = (output: number) => usd("video_direction", { input: 9000, output }) + usd("quality_control", { input: 9000, output: 1200 });
  // Composition de l'accueil puis relecture visuelle sur captures : les deux passent par la tâche « theme_design »
  // (aiReviewHome), donc par le même modèle que la composition — l'estimation suit le modèle réellement appelé.
  const theme = usd("theme_design", { input: 60000, output: 16000 }) + usd("theme_design", { input: 20000, output: 2000 });
  let total = 0;
  switch (action) {
    case "theme":
      total = theme;
      break;
    case "images":
      total = images(5);
      break;
    case "image":
      total = images(1);
      break;
    case "video-clip":
      total = clip() + qc(3) + direction(3500);
      break;
    case "ugc": {
      const n = Math.max(1, Math.min(5, opts.beats ?? 3));
      const fal = routeOf("video_generation", "ugc_video").provider === "fal";
      total = direction(2500) + n * (usd("image_generation", { images: 1 }) + qc(1)) + usd("video_generation", { seconds: n * (fal ? 10 : 8) }, "ugc_video");
      break;
    }
    case "theme-custom":
      // Plan de page, puis chaque section écrite (une dizaine) et relecture visuelle.
      total = usd("theme_custom", { input: 40000, output: 8000 }) + 12 * usd("theme_custom", { input: 30000, output: 12000 }) + usd("theme_design", { input: 30000, output: 4000 });
      break;
    case "blog":
      // Rédaction et relecture qualité (une passe).
      total = usd("blog_writing", { input: 16000, output: 7000 }) + usd("quality_control", { input: 14000, output: 2000 });
      break;
    case "pipeline":
      total =
        usd("vision_analysis", { input: 8000, output: 2000 }) +
        // Marque et plateforme (persona, preuves, objections).
        usd("strategy", { input: 20000, output: 8000 }) +
        // Textes de la boutique : une passe forte relue par le directeur de création.
        usd("copywriting", { input: 34000, output: 12000 }) + usd("quality_control", { input: 26000, output: 2500 }) +
        theme +
        images(5) +
        // Calendrier : plan et relecture « directeur de création » notée.
        usd("social_planning", { input: 20000, output: 8000 }) + usd("quality_control", { input: 22000, output: 2500 }) +
        // Deux vidéos (publicité 9:16, vidéo de boutique 16:9), chacune avec un plan filmé par l'IA et son contrôle de fidélité.
        (opts.videos === "none" ? 0 : 2 * (direction(3500) + (opts.videos === "edited" ? 0 : clip() + qc(3))));
      break;
  }
  return toMicro(total);
}

/** Dollars du fournisseur → micro-euros débités (coefficient de l'administration compris, comme au débit réel). */
const toMicro = (totalUsd: number) => Math.round(totalUsd * usdToEur() * getJsonSetting<number>("billing.markup", 1) * EUR);

/** Coût probable (micro-euros, coefficient compris) d'une tâche d'IA isolée — devis des étapes d'un plan. */
export function estimateTaskMicro(task: TaskId, units: { input?: number; output?: number; images?: number; seconds?: number }, times = 1, usage?: MediaUsage): number {
  return toMicro(times * usd(task, units, usage));
}

/** Plafond d'une tâche (micro-euros) : voir `CAP_FACTOR`. Jamais débité en lui-même, jamais montré comme prix. */
export const capMicro = (probableMicro: number) => Math.round(probableMicro * CAP_FACTOR);

/**
 * Publication (ou visuel avec texte) entièrement conçue par l'IA : coût probable d'UN essai — l'image du modèle des
 * publications, son contrôle lettre par lettre, et l'accroche.
 */
export function aiPostProbableMicro(): number {
  const two = usageExplicit("text_layout");
  const qc = usd("quality_control", { input: 24000, output: 2000 }) * (two ? 2 : 1);
  const concept = usd("copywriting", { input: 18000, output: 2000 });
  return toMicro(usd("image_generation", { images: 1 }, "social_image") + (two ? usd("image_generation", { images: 1 }, "text_layout") : 0) + qc + concept);
}

export function estimateFor(userId: string, action: CostAction, opts: { beats?: number; videos?: VideoChoice } = {}) {
  const cost = estimateMicro(action, opts);
  const b = balance(userId);
  const pctOfAvailable = b.available > 0 ? Math.min(999, (cost / b.available) * 100) : 999;
  const leftAfterPct = b.capacity > 0 ? Math.max(0, ((b.available - cost) / b.capacity) * 100) : 0;
  const level = cost > b.available ? "insufficient" : pctOfAvailable >= 25 ? "very-heavy" : pctOfAvailable >= 5 ? "heavy" : "light";
  const label =
    action === "pipeline" && opts.videos === "edited" ? L("Création complète (marque, boutique, images, vidéos montées à partir des images, calendrier)", "Full creation (brand, store, images, videos edited from the images, calendar)")
    : action === "pipeline" && opts.videos === "none" ? L("Création complète sans vidéo (marque, boutique, images, calendrier)", "Full creation without video (brand, store, images, calendar)")
    : L(ACTIONS[action].fr, ACTIONS[action].en);
  // Part du budget IA du mois (même base que la jauge « Reste … % ») : seul chiffre montré au client.
  const pctOfBudget = budgetPctOf(userId, cost);
  return { action, label, pctOfAvailable, leftAfterPct, level, pctOfBudget, pctText: formatBudgetPct(pctOfBudget, L("fr", "en") as "fr" | "en") } as const;
}
