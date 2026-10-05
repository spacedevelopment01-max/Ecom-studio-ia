/**
 * Estimation du coût IA d'une action, pour prévenir le client avant une action gourmande.
 * Ordres de grandeur prudents (arrondis vers le haut) à partir des tarifs et du routage de l'administration ;
 * le débit réel reste celui mesuré pendant la génération.
 */
import { balance, EUR } from "../billing";
import { getJsonSetting } from "../settings";
import { priceFor, routeFor, usdToEur, type TaskId } from "./config";
import { L } from "../i18n-server";

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

function usd(task: TaskId, units: { input?: number; output?: number; images?: number; seconds?: number }): number {
  const r = routeFor(task);
  const p = priceFor(r.provider, r.model);
  if (!p) return 0;
  if (p.unit === "tokens") {
    // Images : jetons d'image (gpt-image-1) ; texte : entrée / sortie.
    if (units.images) return units.images * ((400 * p.inputPerM + 1500 * (p.imageInputPerM ?? p.inputPerM) + 6300 * (p.imageOutputPerM ?? p.outputPerM)) / 1e6);
    return ((units.input ?? 0) * p.inputPerM + (units.output ?? 0) * p.outputPerM) / 1e6;
  }
  if (p.unit === "image") return (units.images ?? 0) * p.perImage;
  return (units.seconds ?? 0) * p.perSecond;
}

/** Coût estimé en micro-euros débités de l'enveloppe (coefficient de l'administration compris). */
export type VideoChoice = "ai" | "edited" | "none";
export function estimateMicro(action: CostAction, opts: { beats?: number; videos?: VideoChoice } = {}): number {
  const qc = (n: number) => n * usd("quality_control", { input: 4000, output: 600 });
  const brief = (n: number) => n * usd("video_direction", { input: 3000, output: 400 });
  const images = (n: number) => usd("image_generation", { images: n }) + brief(n) + qc(n);
  // Plan vidéo généré : 8 s chez Google (Veo), 5 s chez fal (Kling).
  const clip = () => usd("video_generation", { seconds: routeFor("video_generation").provider === "fal" ? 5 : 8 });
  const theme = usd("theme_design", { input: 60000, output: 16000 }) + usd("quality_control", { input: 20000, output: 2000 });
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
      total = clip() + qc(3) + usd("video_direction", { input: 8000, output: 3000 });
      break;
    case "ugc": {
      const n = Math.max(1, Math.min(5, opts.beats ?? 3));
      const fal = routeFor("video_generation").provider === "fal";
      total = usd("video_direction", { input: 8000, output: 2000 }) + n * 1.5 * (usd("image_generation", { images: 1 }) + qc(1)) + usd("video_generation", { seconds: n * (fal ? 10 : 8) });
      break;
    }
    case "theme-custom":
      // Plan de page, puis chaque section écrite (une dizaine), avec corrections automatiques et relecture visuelle.
      total = usd("theme_custom", { input: 40000, output: 8000 }) + 12 * 1.5 * usd("theme_custom", { input: 30000, output: 12000 }) + usd("theme_design", { input: 30000, output: 4000 });
      break;
    case "blog":
      // Rédaction (jusqu'à deux reprises guidées par le contrôle) et relecture qualité.
      total = 2 * usd("blog_writing", { input: 14000, output: 6000 }) + 2 * usd("quality_control", { input: 12000, output: 1500 });
      break;
    case "pipeline":
      total =
        usd("vision_analysis", { input: 8000, output: 2000 }) +
        usd("strategy", { input: 20000, output: 6000 }) +
        1.5 * usd("copywriting", { input: 30000, output: 8000 }) +
        theme +
        images(5) +
        usd("social_planning", { input: 20000, output: 8000 }) +
        // Deux vidéos (publicité 9:16, vidéo de boutique 16:9), chacune avec un plan filmé par l'IA et son contrôle de fidélité.
        (opts.videos === "none" ? 0 : 2 * (usd("video_direction", { input: 8000, output: 3000 }) + (opts.videos === "edited" ? 0 : clip() + qc(3))));
      break;
  }
  const markup = getJsonSetting<number>("billing.markup", 1);
  // Marge de sécurité de 20 % : une estimation trop basse surprendrait le client.
  return Math.round(total * 1.2 * usdToEur() * markup * EUR);
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
  return { action, label, pctOfAvailable, leftAfterPct, level } as const;
}
