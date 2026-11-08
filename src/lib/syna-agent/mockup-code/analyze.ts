/**
 * SINA (#492), étape 7 a et b : lecture d'une image de maquette en une description structurée de chaque page
 * (sections dans l'ordre, mise en page, textes lus sur l'image, emplacements d'images, couleurs, typographie,
 * espacements), puis correspondance de chaque section : section FONCTIONNELLE de la bibliothèque quand la page doit
 * fonctionner (achat, panier, recherche, formulaires, textes légaux…), section sur mesure sinon (dessin identique à la
 * maquette, écrite puis validée par le moteur du thème sur mesure).
 */
import { z } from "zod";
import { llmJson, type LlmImage } from "../../ai/llm";
import type { MockupPage, Viewport } from "./pages";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const optHex = hex.optional().catch(undefined);

export const SECTION_ROLES = [
  "header", "footer", "ouverture", "produits", "offre", "details", "usages", "univers", "journal", "questions", "inscription",
  "texte", "galerie", "etapes", "prestations", "tarifs", "realisations", "zone", "contact", "appel", "achat", "panier",
  "recherche", "grille", "legal", "formulaire", "reservation", "compte", "message", "autre",
] as const;
export type SectionRole = (typeof SECTION_ROLES)[number];

export const AnalyzedSectionSchema = z.object({
  role: z.enum(SECTION_ROLES).catch("autre"),
  /** Nom court de la section dans l'éditeur (25 caractères au plus). */
  name: z.string().max(60).transform((s) => s.slice(0, 25)),
  layout: z.string().max(1200),
  /** Mise en page sur téléphone, si une image téléphone la montre. */
  phone: z.string().max(1200).optional(),
  texts: z.array(z.object({ kind: z.enum(["surtitre", "titre", "sous-titre", "paragraphe", "bouton", "lien", "legende", "prix", "autre"]).catch("autre"), text: z.string().max(600) })).max(40).default([]),
  images: z.array(z.object({ description: z.string().max(500), ratio: z.string().max(12).optional(), objects: z.array(z.string().max(160)).max(8).optional(),
    /** Zone de la photo sur l'image de maquette (fractions) : référence pour la recréer en haute définition. */
    box: z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1), w: z.number().min(0).max(1), h: z.number().min(0).max(1) }).optional() })).max(16).default([]),
  colors: z.object({ background: optHex, text: optHex, accent: optHex }).default({}),
  typography: z.string().max(300).optional(),
  spacing: z.string().max(300).optional(),
  effects: z.string().max(300).optional(),
});
export type AnalyzedSection = z.infer<typeof AnalyzedSectionSchema>;

const Box = z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1), w: z.number().min(0).max(1), h: z.number().min(0).max(1) });
export const AnalyzedPageSchema = z.object({
  page: z.string().max(60),
  /** Zone de la page sur l'image (fractions de la largeur et de la hauteur), pour la comparer au site codé. */
  region: Box,
  sections: z.array(AnalyzedSectionSchema).min(1).max(30),
  notes: z.string().max(600).optional(),
});
export type AnalyzedPage = z.infer<typeof AnalyzedPageSchema> & { viewport?: Viewport; imageId?: string };

/**
 * Variantes de forme de la réponse ramenées à la forme attendue (premier essai réel du 8 novembre, accueil de Brindi :
 * lecture complète et juste, refusée pour sa forme, payée deux fois pour rien — palette en objet nommé, polices et
 * notes en listes, nature des textes sous la clé « nature »).
 */
const HEX = /#[0-9a-fA-F]{6}\b/;
const textOf = (v: unknown): string => (Array.isArray(v) ? v.map(textOf).join(" ; ") : v && typeof v === "object" ? Object.values(v as object).map(textOf).join(" ; ") : v == null ? "" : String(v));
const kindOf = (n: unknown): string => {
  const t = String(n ?? "").toLowerCase();
  if (/sur-?titre/.test(t)) return "surtitre";
  if (/sous-?titre/.test(t)) return "sous-titre";
  if (/titre|logo/.test(t)) return "titre";
  if (/bouton/.test(t)) return "bouton";
  if (/lien|navigation|menu/.test(t)) return "lien";
  if (/prix/.test(t)) return "prix";
  if (/l[ée]gende/.test(t)) return "legende";
  if (/paragraphe|texte|description/.test(t)) return "paragraphe";
  return t;
};
export function normalizeAnalysis(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const r = { ...(raw as Record<string, unknown>) };
  const hexes = (v: unknown): string[] => (Array.isArray(v) ? v : v && typeof v === "object" ? Object.values(v as object) : []).map((x) => (typeof x === "string" ? x.match(HEX)?.[0] : x && typeof x === "object" ? textOf(x).match(HEX)?.[0] : undefined)).filter((x): x is string => !!x).slice(0, 8);
  r.palette = hexes(r.palette);
  if (Array.isArray(r.fonts)) r.fonts = { heading: textOf(r.fonts[0]).slice(0, 60) || undefined, body: textOf(r.fonts[1]).slice(0, 60) || undefined };
  else if (r.fonts && typeof r.fonts === "object") r.fonts = Object.fromEntries(Object.entries(r.fonts as object).filter(([k]) => k === "heading" || k === "body").map(([k, v]) => [k, textOf(v).slice(0, 60)]));
  if (r.notes != null && typeof r.notes !== "string") r.notes = textOf(r.notes);
  if (typeof r.notes === "string") r.notes = r.notes.slice(0, 800);
  if (Array.isArray(r.pages)) r.pages = r.pages.map((pg: any) => !pg || typeof pg !== "object" ? pg : {
    ...pg,
    ...(pg.notes != null && typeof pg.notes !== "string" ? { notes: textOf(pg.notes).slice(0, 600) } : typeof pg.notes === "string" ? { notes: pg.notes.slice(0, 600) } : {}),
    sections: Array.isArray(pg.sections) ? pg.sections.map((sec: any) => !sec || typeof sec !== "object" ? sec : {
      ...sec,
      texts: Array.isArray(sec.texts) ? sec.texts.map((t: any) => (typeof t === "string" ? { kind: "autre", text: t } : t && typeof t === "object" ? { kind: kindOf(t.kind ?? t.nature ?? t.type), text: textOf(t.text ?? t.texte ?? "").slice(0, 600) } : t)) : sec.texts,
      ...(sec.colors && typeof sec.colors === "object" ? { colors: Object.fromEntries(["background", "text", "accent"].map((k) => [k, textOf((sec.colors as any)[k] ?? (sec.colors as any)[{ background: "fond", text: "texte", accent: "accent" }[k]!]).match(HEX)?.[0]])) } : {}),
      ...(["typography", "spacing", "effects", "phone", "layout"].reduce((o, k) => (sec[k] != null && typeof sec[k] !== "string" ? { ...o, [k]: textOf(sec[k]) } : o), {})),
    }) : pg.sections,
  });
  return r;
}

export const MockupAnalysisSchema = z.preprocess(normalizeAnalysis, z.object({
  pages: z.array(AnalyzedPageSchema).min(1).max(12),
  palette: z.array(hex).max(8).default([]),
  fonts: z.object({ heading: z.string().max(60).optional(), body: z.string().max(60).optional() }).default({}),
  notes: z.string().max(800).default(""),
}));
export type MockupAnalysis = z.infer<typeof MockupAnalysisSchema>;

/** Consigne de lecture d'une image (sert aussi au devis : même longueur). */
export function analysisPrompt(pages: MockupPage[], viewport: Viewport): string {
  return `Cette image est une maquette de site web (version ${viewport === "desktop" ? "ordinateur, 1440 px" : "téléphone, 390 px"}). Elle montre exactement ces pages, dans l'ordre de lecture : ${pages.map((p) => `${p.key} (« ${p.fr} »)`).join(", ")}.
Pour CHAQUE page, décris fidèlement ce que tu VOIS, sans rien inventer ni améliorer :
- page : sa clé exacte ci-dessus ; region : sa zone sur l'image (x, y, w, h en fractions de 0 à 1) ;
- sections : toutes, de haut en bas, en-tête (role header) et pied de page (role footer) compris. Pour chacune : role (${SECTION_ROLES.join(", ")}), name (25 caractères au plus), layout (grille, colonnes, alignements, proportions, position des images et des textes, fond plein ou non), ${viewport === "phone" ? "phone (mise en page téléphone), " : ""}texts (chaque texte lu MOT POUR MOT, avec sa nature ; un texte illisible s'écrit « [illisible] »), images (chaque emplacement de photo : ce qu'il montre, format approximatif, objets visibles, et box : sa zone exacte sur l'image entière, x, y, w, h en fractions de 0 à 1), colors (fond, texte, accent en hexadécimal), typography (famille, graisse, casse, taille relative), spacing (marges et espacements approximatifs en px), effects (seulement s'ils sont visibles).
Ajoute la palette lue (palette), les polices reconnues (fonts) et tes remarques (notes : ce qui est ambigu ou illisible).`;
}

/** Lecture réelle (vision, payante) d'une image de maquette ; `call` est simulé dans les tests. */
export async function analyzeMockupImage(base: { userId: string; projectId: string; jobId?: string | null; usageKey: string }, image: LlmImage, pages: MockupPage[], viewport: Viewport): Promise<AnalyzedPage[]> {
  const out = await llmJson({
    task: "theme_custom", userId: base.userId, projectId: base.projectId, jobId: base.jobId, usageKey: base.usageKey,
    system: "Tu es directeur artistique et intégrateur web senior. Tu lis une maquette de site avec une précision de relevé : tu décris ce qui est visible, mot pour mot pour les textes, sans rien ajouter. Réponses en français.",
    prompt: analysisPrompt(pages, viewport), images: [image], maxTokens: 16000, routing: { difficulty: "complex" },
  }, MockupAnalysisSchema);
  const known = new Set(pages.map((p) => p.key));
  return out.pages.filter((p) => known.has(p.page)).map((p) => ({ ...p, viewport }));
}

/* ---------------------------------------------------------------- correspondance des sections */

export type SectionTarget =
  | { kind: "library"; type: string; why: string }
  | { kind: "custom"; why: string }
  | { kind: "group"; group: "header" | "footer" };

/**
 * Sections qui FONT fonctionner la page (formulaire d'achat, panier, recherche, grille de collection, formulaires,
 * textes légaux, réservation) : celles de la bibliothèque, éprouvées, quand le thème les sait rendre. Le reste est
 * dessiné sur mesure, identique à la maquette.
 */
const FUNCTIONAL: Partial<Record<SectionRole, (page: MockupPage) => string[]>> = {
  achat: () => ["main-product"],
  panier: () => ["main-cart"],
  recherche: () => ["main-search"],
  grille: (p) => (p.template === "collection" ? ["main-collection"] : p.template === "list-collections" ? ["main-list-collections"] : p.template === "blog" ? ["main-blog"] : []),
  legal: () => ["legal-page", "main-page"],
  reservation: () => ["booking", "booking-calendar"],
  formulaire: (p) => (p.key === "contact" ? ["contact-form"] : []),
  compte: () => [],
  message: (p) => (p.template === "404" ? ["main-404"] : p.template === "password" ? ["main-password"] : []),
  texte: (p) => (p.template === "article" ? ["main-article"] : []),
};

export function mapSection(s: Pick<AnalyzedSection, "role">, page: MockupPage, available: string[]): SectionTarget {
  if (s.role === "header" || s.role === "footer") return { kind: "group", group: s.role };
  const wanted = FUNCTIONAL[s.role]?.(page) ?? [];
  const type = wanted.find((t) => available.includes(t));
  if (type) return { kind: "library", type, why: `section fonctionnelle (${s.role}) : celle de la bibliothèque, éprouvée, mise aux couleurs de la maquette` };
  return { kind: "custom", why: wanted.length ? `aucune section fonctionnelle rendue par ce thème (${wanted.join(", ")}) : dessinée sur mesure` : "dessin propre à la maquette" };
}

/** Fusion des lectures ordinateur et téléphone d'une même page (la mise en page téléphone rejoint chaque section). */
export function mergeViewports(desktop: AnalyzedPage | undefined, phone: AnalyzedPage | undefined): AnalyzedPage | null {
  const base = desktop ?? phone;
  if (!base) return null;
  if (!desktop || !phone) return base;
  return {
    ...desktop,
    sections: desktop.sections.map((s, i) => {
      const twin = phone.sections.find((x) => x.role === s.role && x.name === s.name) ?? phone.sections.filter((x) => x.role === s.role)[0] ?? phone.sections[i];
      return twin ? { ...s, phone: twin.phone ?? twin.layout } : s;
    }),
  };
}
