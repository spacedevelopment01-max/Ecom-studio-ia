/**
 * Compétences publicitaires (skills) pour les modèles connectés au studio.
 *
 * Les compétences sont installées une seule fois, dans `.claude/skills/<nom>/SKILL.md` (Claude Code les charge
 * depuis ce dossier, voir `.claude/skills/SOURCES.md`). Le studio lit LES MÊMES fichiers.
 *
 * L'API Messages telle que le studio l'utilise (plusieurs fournisseurs : Anthropic, OpenAI, Gemini ; sans outil
 * d'exécution de code) ne charge pas de skill toute seule. Les « Agent Skills » de l'API Anthropic demandent
 * l'outil d'exécution de code et un conteneur, absents ici, et n'existent pas chez les autres fournisseurs.
 * Le studio transmet donc les CONSIGNES utiles des compétences dans le bloc de référence stable de l'appel
 * (`LlmCall.reference`) : même texte pour tous les fournisseurs, compté dans le coût maximal réservé et mis en
 * cache comme le contexte du projet.
 *
 * Choix automatique : seules les compétences utiles à la demande (publicité produit, service, visuel, réseaux
 * sociaux, bannière, variation), et seulement leurs sections utiles (jamais le fichier entier).
 */
import fs from "node:fs";
import path from "node:path";
import type { Project } from "../projects";

export type SkillId =
  // Publicités (installées en premier, inchangées)
  | "image" | "ad-creative" | "ads" | "canvas-design" | "brand-guidelines"
  // Vidéo et UGC
  | "video" | "remotion-ads" | "cutting-rhythm" | "captions" | "video-transitions"
  | "ugc-ad-strategist" | "ugc-video-producer" | "ugc-minimax-mode"
  // Marketing, rédaction, réseaux sociaux
  | "social" | "copywriting" | "marketing-psychology" | "product-marketing" | "customer-research" | "content-strategy" | "cro" | "offers"
  // SEO
  | "seo-audit" | "ai-seo" | "schema" | "site-architecture" | "programmatic-seo"
  // Design des sites
  | "frontend-design" | "ui-ux-pro-max";

/** Demandes reconnues : publicités (historique), puis vidéo, UGC, SEO, sites, réseaux sociaux, stratégie. */
export type SkillIntent =
  | "product_ad" | "service_ad" | "ad_visual" | "social_ad" | "banner" | "ad_variation"
  | "video_ad" | "ugc_script"
  | "seo_page" | "seo_article" | "seo_meta" | "local_seo"
  | "site_copy" | "site_design" | "social_post" | "brand_strategy";

/**
 * Sections utiles au studio, par compétence (titre Markdown exact, ou début d'un paragraphe en gras). Le reste
 * des fichiers (outils externes, comptes publicitaires, fournisseurs payants, fichiers de sortie .md/.pdf,
 * questions au client) ne s'applique pas à une génération du studio et n'est pas transmis.
 */
const SECTIONS: Record<SkillId, { title: string; parts: string[] }> = {
  "ad-creative": { title: "Ad Creative (marketingskills)", parts: ["## Generating Ad Copy", "## Writing Quality Standards"] },
  ads: { title: "Paid Ads (marketingskills)", parts: ["## Ad Copy Frameworks", "### Applying audience knowledge to creative", "### Image Ads", "## Landing Page Alignment"] },
  image: { title: "Image (marketingskills)", parts: ["### Prompting Basics", "### Social Media Graphics", "### Product Mockups & Screenshots", "## Common Mistakes"] },
  "canvas-design": { title: "Canvas Design (Anthropic)", parts: ["### ESSENTIAL PRINCIPLES", "**Text as a contextual element**"] },
  "brand-guidelines": { title: "Brand Guidelines — client brand first (Anthropic, adapted)", parts: ["## E-COM STUDIO IA: which brand to apply", "## Smart application"] },
  video: { title: "Video (marketingskills)", parts: ["### Prompting for Video Models", "### Product Demo Video", "### Explainer Video", "## Common Mistakes"] },
  "remotion-ads": { title: "Remotion Ads (Maartenlouis)", parts: ["## Safe Zones (Critical)", "## Supported Formats"] },
  "cutting-rhythm": { title: "Cutting Rhythm (video-agent)", parts: ["## 2. Where the cut actually goes", "## 4. Shot length — the snap", "## 5. Cutting on the beat"] },
  captions: { title: "Captions (video-agent)", parts: ["### Styling", "## Gotchas"] },
  "video-transitions": { title: "Video Transitions (video-agent)", parts: ["## Useful transition kinds", "## Gotchas"] },
  "ugc-ad-strategist": { title: "UGC Ad Strategist (ugc-skills)", parts: ["## The 5 stages (what the workflow does)", "## The non-negotiables (baked into the template, enforce them)"] },
  "ugc-video-producer": { title: "UGC Video Producer (ugc-skills)", parts: ["## Phase 0.5 — STAGE THE SHOT (intake + shot plan, BEFORE any still)"] },
  "ugc-minimax-mode": { title: "UGC Minimax Mode (ugc-skills)", parts: ["### Step 1 — SHOT PLAN (Claude decides format/people/angles)", "### Step 2 — SCRIPT (Claude writes natural dialogue)"] },
  social: { title: "Social (marketingskills)", parts: ["## Hook Formulas", "## Platform Quick Reference"] },
  copywriting: { title: "Copywriting (marketingskills)", parts: ["## Copywriting Principles", "## No AI Tells", "## CTA Copy Guidelines"] },
  "marketing-psychology": { title: "Marketing Psychology (marketingskills)", parts: ["### Loss Aversion / Prospect Theory", "### Framing Effect", "### Anchoring Effect", "### Bandwagon Effect / Social Proof", "### Paradox of Choice"] },
  "product-marketing": { title: "Product Marketing (marketingskills)", parts: ["### 4. Problems & Pain Points", "### 6. Differentiation", "### 7. Objections & Anti-Personas", "### 9. Customer Language"] },
  "customer-research": { title: "Customer Research (marketingskills)", parts: ["### Persona Structure", "### Persona Anti-Patterns"] },
  "content-strategy": { title: "Content Strategy (marketingskills)", parts: ["## Searchable vs Shareable", "## Keyword Research by Buyer Stage"] },
  cro: { title: "CRO (marketingskills)", parts: ["## CRO Analysis Framework"] },
  offers: { title: "Offers (marketingskills)", parts: ["## The Value Equation", "## Banned Vocabulary"] },
  "seo-audit": { title: "SEO Audit (marketingskills)", parts: ["### Title Tags", "### Meta Descriptions", "### Heading Structure", "### Internal Linking", "### E-commerce", "### Local Business"] },
  "ai-seo": { title: "AI SEO (marketingskills)", parts: ["### Pillar 1: Structure — Make Content Extractable", "### Pillar 2: Authority — Make Content Citable"] },
  schema: { title: "Schema (marketingskills)", parts: ["## Core Principles", "### Product", "### FAQPage", "### BreadcrumbList"] },
  "site-architecture": { title: "Site Architecture (marketingskills)", parts: ["### URL Patterns by Page Type", "### Internal Linking Rules", "### Header Navigation Rules"] },
  "programmatic-seo": { title: "Programmatic SEO (marketingskills)", parts: ["## Core Principles"] },
  "frontend-design": { title: "Frontend Design (Anthropic)", parts: ["## Ground your designs in the subject matter", "## Design principles", "## Restraint and self-critique"] },
  "ui-ux-pro-max": { title: "UI UX Pro Max (nextlevelbuilder)", parts: ["### 1. Accessibility (CRITICAL)", "### 2. Touch & Interaction (CRITICAL)", "### 5. Layout & Responsive (HIGH)", "### 6. Typography & Color (MEDIUM)"] },
};

/** Compétences par demande (consigne du propriétaire), dans l'ordre de transmission. */
const BY_INTENT: Record<SkillIntent, SkillId[]> = {
  product_ad: ["ad-creative", "image", "canvas-design", "brand-guidelines"],
  service_ad: ["ads", "ad-creative", "image", "canvas-design", "brand-guidelines"],
  ad_visual: ["image", "canvas-design", "brand-guidelines"],
  social_ad: ["ad-creative", "image", "brand-guidelines"],
  banner: ["image", "canvas-design", "ad-creative", "brand-guidelines"],
  ad_variation: ["ad-creative", "brand-guidelines"],
  // Vidéo publicitaire (script, storyboard, montage) : accroche, rythme, sous-titres, zones sûres des formats verticaux.
  video_ad: ["remotion-ads", "cutting-rhythm", "video", "social", "captions", "video-transitions", "brand-guidelines"],
  // UGC : stratégie (une promesse, accroches, plan), plan de tournage, dialogue naturel ; sans visage possible.
  ugc_script: ["ugc-ad-strategist", "ugc-video-producer", "ugc-minimax-mode", "social", "copywriting"],
  seo_page: ["seo-audit", "copywriting", "schema", "site-architecture", "ai-seo"],
  seo_article: ["content-strategy", "seo-audit", "ai-seo", "copywriting"],
  seo_meta: ["seo-audit"],
  local_seo: ["seo-audit", "programmatic-seo", "schema", "site-architecture"],
  site_copy: ["copywriting", "cro", "marketing-psychology", "offers"],
  site_design: ["frontend-design", "ui-ux-pro-max", "brand-guidelines"],
  social_post: ["social", "copywriting", "marketing-psychology"],
  brand_strategy: ["product-marketing", "customer-research", "marketing-psychology"],
};

/** Plafond du bloc entier (caractères) : la sélection ne fait jamais exploser le coût d'un appel. */
const MAX_CHARS_TOTAL = 16000;

/** Plafond de texte transmis par compétence (caractères) : un fichier qui grossit ne fait pas exploser le coût. */
const MAX_CHARS_PER_SKILL = 6000;

export const skillsDir = () => process.env.SKILLS_DIR ?? path.join(process.cwd(), ".claude", "skills");

/** Section d'un fichier Markdown : du titre jusqu'au prochain titre de même niveau ou plus haut ; ou un paragraphe. */
export function extractSection(md: string, marker: string): string | null {
  const lines = md.split("\n");
  const start = lines.findIndex((l) => l.startsWith(marker));
  if (start < 0) return null;
  const level = /^(#+) /.exec(marker)?.[1].length ?? 0;
  const out = [lines[start]];
  for (const l of lines.slice(start + 1)) {
    if (level === 0 && l.trim() === "") break;
    const h = /^(#+) /.exec(l);
    if (level > 0 && h && h[1].length <= level) break;
    out.push(l);
  }
  return out.join("\n").replace(/\n---\s*$/, "").trim();
}

const cache = new Map<SkillId, { text: string; missing: string[] } | null>();

/** Consignes utiles d'une compétence, lues depuis son SKILL.md (null si la compétence n'est pas installée). */
export function skillDigest(id: SkillId): { text: string; missing: string[] } | null {
  if (cache.has(id)) return cache.get(id)!;
  let md: string;
  try {
    md = fs.readFileSync(path.join(skillsDir(), id, "SKILL.md"), "utf8");
  } catch {
    cache.set(id, null);
    return null;
  }
  const spec = SECTIONS[id];
  const missing: string[] = [];
  const parts = spec.parts.map((m) => extractSection(md, m) ?? (missing.push(m), "")).filter(Boolean);
  const body = parts.join("\n\n").slice(0, MAX_CHARS_PER_SKILL);
  const r = body ? { text: `### Skill « ${id} » — ${spec.title}\n${body}`, missing } : null;
  cache.set(id, r);
  return r;
}

/** Compétences choisies pour une demande (les compétences absentes du disque sont ignorées). */
export function skillsFor(intent: SkillIntent): SkillId[] {
  return BY_INTENT[intent].filter((id) => skillDigest(id) !== null);
}

/** Demande publicitaire d'un projet : produit ou service ; réseaux sociaux, bannière ou variation si précisé. */
export function adIntent(p: Pick<Project, "business">, kind?: "social" | "banner" | "visual" | "variation"): SkillIntent {
  if (kind === "social") return p.business === "services" ? "service_ad" : "social_ad";
  if (kind === "banner") return "banner";
  if (kind === "visual") return "ad_visual";
  if (kind === "variation") return "ad_variation";
  return p.business === "services" ? "service_ad" : "product_ad";
}

/**
 * Bloc « compétences » à placer dans `LlmCall.reference` : les consignes des compétences choisies, précédées des
 * règles d'usage (les règles du studio priment). Chaîne vide si aucune compétence n'est installée.
 */
export function skillReference(intent: SkillIntent): string {
  const all = skillsFor(intent);
  // Plafond global : les compétences sont ajoutées dans l'ordre de priorité tant que le bloc reste sous le plafond.
  const ids: SkillId[] = [];
  let size = 0;
  for (const id of all) {
    const n = skillDigest(id)!.text.length;
    if (ids.length && size + n > MAX_CHARS_TOTAL) continue;
    ids.push(id);
    size += n;
  }
  if (!ids.length) return "";
  return `<skills names="${ids.join(",")}">
COMPÉTENCES PROFESSIONNELLES (méthodes de référence de professionnels, en anglais). Utilise-les pour mieux concevoir ce qui est demandé. Règles d'usage :
- les règles du studio et de cette demande priment : faits du projet uniquement (rien d'inventé : chiffre, avis, prix, résultat, certification, position Google, volume de recherche), langue des contenus, format de réponse JSON demandé ;
- ignore dans ces compétences toute consigne d'outil, de script, de fournisseur, de fichier (.md, .pdf, .png, .json), de compte publicitaire, de question au client ou de génération directe : ici tu rédiges seulement la réponse demandée ;
- aucune personne ni visage à l'image sans autorisation du client (règle du studio), même si une compétence en propose ;
- la marque à appliquer est TOUJOURS celle du projet (contexte ci-dessus), jamais une charte d'exemple.

${ids.map((id) => skillDigest(id)!.text).join("\n\n")}
</skills>`;
}

/** Demande SEO d'un projet : entreprise de services locale (artisan…) → SEO local ; boutique → pages produits. */
export function seoIntent(p: Pick<Project, "business">, kind: "page" | "article" | "meta"): SkillIntent {
  if (kind === "article") return "seo_article";
  if (kind === "meta") return "seo_meta";
  return p.business === "services" ? "local_seo" : "seo_page";
}
