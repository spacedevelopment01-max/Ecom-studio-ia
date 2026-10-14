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

export type SkillId = "image" | "ad-creative" | "ads" | "canvas-design" | "brand-guidelines";

/** Demandes publicitaires reconnues. */
export type SkillIntent = "product_ad" | "service_ad" | "ad_visual" | "social_ad" | "banner" | "ad_variation";

/**
 * Sections utiles au studio, par compétence (titre Markdown exact, ou début d'un paragraphe en gras). Le reste
 * des fichiers (outils externes, comptes publicitaires, fichiers de sortie .md/.pdf, questions au client) ne
 * s'applique pas à une génération du studio et n'est pas transmis.
 */
const SECTIONS: Record<SkillId, { title: string; parts: string[] }> = {
  "ad-creative": { title: "Ad Creative (marketingskills)", parts: ["## Generating Ad Copy", "## Writing Quality Standards"] },
  ads: { title: "Paid Ads (marketingskills)", parts: ["## Ad Copy Frameworks", "### Applying audience knowledge to creative", "### Image Ads", "## Landing Page Alignment"] },
  image: { title: "Image (marketingskills)", parts: ["### Prompting Basics", "### Social Media Graphics", "### Product Mockups & Screenshots", "## Common Mistakes"] },
  "canvas-design": { title: "Canvas Design (Anthropic)", parts: ["### ESSENTIAL PRINCIPLES", "**Text as a contextual element**"] },
  "brand-guidelines": { title: "Brand Guidelines — client brand first (Anthropic, adapted)", parts: ["## E-COM STUDIO IA: which brand to apply", "## Smart application"] },
};

/** Compétences par demande (consigne du propriétaire), dans l'ordre de transmission. */
const BY_INTENT: Record<SkillIntent, SkillId[]> = {
  product_ad: ["ad-creative", "image", "canvas-design", "brand-guidelines"],
  service_ad: ["ads", "ad-creative", "image", "canvas-design", "brand-guidelines"],
  ad_visual: ["image", "canvas-design", "brand-guidelines"],
  social_ad: ["ad-creative", "image", "brand-guidelines"],
  banner: ["image", "canvas-design", "ad-creative", "brand-guidelines"],
  ad_variation: ["ad-creative", "brand-guidelines"],
};

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
  const ids = skillsFor(intent);
  if (!ids.length) return "";
  return `<skills names="${ids.join(",")}">
COMPÉTENCES PUBLICITAIRES (méthodes de référence de professionnels, en anglais). Utilise-les pour mieux concevoir l'annonce ou le visuel demandé. Règles d'usage :
- les règles du studio et de cette demande priment : faits du projet uniquement (rien d'inventé : chiffre, avis, prix, résultat, certification), langue des contenus, format de réponse JSON demandé ;
- ignore dans ces compétences toute consigne d'outil, de fichier (.md, .pdf, .png), de compte publicitaire, de question au client ou de génération d'image directe : ici tu rédiges seulement la réponse demandée ;
- la marque à appliquer est TOUJOURS celle du projet (contexte ci-dessus), jamais une charte d'exemple.

${ids.map((id) => skillDigest(id)!.text).join("\n\n")}
</skills>`;
}
