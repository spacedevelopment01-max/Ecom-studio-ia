/**
 * Plateformes publicitaires (Ads V2) : formats, zones de sécurité (interface qui recouvre la création), limites de
 * texte et boutons. Valeurs issues des recommandations publiques des régies au moment du développement : elles
 * changent régulièrement, à revérifier avant une campagne réelle.
 */
import type { Lang } from "../i18n";
import type { AspectId } from "../image-v2/types";
import type { FormatSpec, Platform } from "./types";

export type PlatformSpec = {
  label: string;
  formats: { aspect: AspectId; width: number; height: number }[];
  /** Part de la hauteur / largeur recouverte par l'interface (haut, bas, côtés). */
  safe: { top: number; bottom: number; side: number };
  text: { hookWords: number; primaryFirstLine: number; headline: number; description: number };
  /** Ton attendu (natif, éditorial, professionnel). */
  tone: string;
  /** Texte sur l'image : quantité recommandée (moins c'est mieux pour la diffusion). */
  maxTextShare: number;
};

export const PLATFORM_SPECS: Record<Platform, PlatformSpec> = {
  meta_feed: { label: "Meta (fil)", formats: [{ aspect: "4:5", width: 1080, height: 1350 }, { aspect: "1:1", width: 1080, height: 1080 }], safe: { top: 0.06, bottom: 0.08, side: 0.06 }, text: { hookWords: 10, primaryFirstLine: 125, headline: 40, description: 30 }, tone: "direct, concret", maxTextShare: 0.25 },
  meta_story: { label: "Meta (Stories, Reels)", formats: [{ aspect: "9:16", width: 1080, height: 1920 }], safe: { top: 0.14, bottom: 0.2, side: 0.06 }, text: { hookWords: 8, primaryFirstLine: 125, headline: 40, description: 30 }, tone: "rapide, vertical", maxTextShare: 0.22 },
  tiktok: { label: "TikTok", formats: [{ aspect: "9:16", width: 1080, height: 1920 }], safe: { top: 0.12, bottom: 0.24, side: 0.08 }, text: { hookWords: 8, primaryFirstLine: 100, headline: 40, description: 30 }, tone: "natif, parlé", maxTextShare: 0.18 },
  google_display: { label: "Google (Display)", formats: [{ aspect: "1:1", width: 1200, height: 1200 }, { aspect: "16:9", width: 1200, height: 675 }], safe: { top: 0.05, bottom: 0.05, side: 0.05 }, text: { hookWords: 10, primaryFirstLine: 90, headline: 30, description: 90 }, tone: "clair, sans majuscules ni ponctuation répétée", maxTextShare: 0.2 },
  pinterest: { label: "Pinterest", formats: [{ aspect: "2:3", width: 1000, height: 1500 }], safe: { top: 0.05, bottom: 0.12, side: 0.06 }, text: { hookWords: 10, primaryFirstLine: 100, headline: 40, description: 30 }, tone: "inspirant, éditorial", maxTextShare: 0.2 },
  linkedin: { label: "LinkedIn", formats: [{ aspect: "1:1", width: 1200, height: 1200 }, { aspect: "16:9", width: 1200, height: 675 }], safe: { top: 0.05, bottom: 0.06, side: 0.05 }, text: { hookWords: 12, primaryFirstLine: 150, headline: 70, description: 30 }, tone: "professionnel, précis", maxTextShare: 0.2 },
};

export function formatsFor(platforms: Platform[]): FormatSpec[] {
  const out: FormatSpec[] = [];
  for (const p of platforms) {
    const s = PLATFORM_SPECS[p];
    for (const f of s.formats) out.push({ platform: p, aspect: f.aspect, width: f.width, height: f.height, label: `${s.label} ${f.aspect}`, safe: s.safe });
  }
  return out;
}

/** Plateformes par défaut : produits → Meta (fil + stories) ; services → Meta (fil) + Google. */
export const defaultPlatforms = (business: "products" | "services"): Platform[] => (business === "services" ? ["meta_feed", "google_display"] : ["meta_feed", "meta_story"]);

/** Limites de texte les plus strictes parmi les plateformes choisies (un concept doit passer partout). */
export function strictestText(platforms: Platform[]) {
  const s = platforms.map((p) => PLATFORM_SPECS[p].text);
  return { hookWords: Math.min(...s.map((x) => x.hookWords)), primaryFirstLine: Math.min(...s.map((x) => x.primaryFirstLine)), headline: Math.min(...s.map((x) => x.headline)), description: Math.min(...s.map((x) => x.description)) };
}

export const CTAS: Record<"products" | "services", Record<Lang, string[]>> = {
  products: { fr: ["Découvrir", "Acheter", "En savoir plus", "Voir le produit"], en: ["Discover", "Shop now", "Learn more", "View product"] },
  services: { fr: ["Prendre rendez-vous", "Demander un devis", "Appeler", "Nous contacter", "En savoir plus"], en: ["Book now", "Get a quote", "Call now", "Contact us", "Learn more"] },
};
