/**
 * DIRECTION ARTISTIQUE PROPRE À CHAQUE CLIENT (guide images, règles 3, 4, 12, 13, 14).
 *
 * Avant toute image : une idée créative, une composition, une palette (charte d'abord), un traitement typographique,
 * une lumière, un décor, un style photo ou illustration, une densité d'information, une émotion et des éléments à
 * éviter — justifiés par le projet. Elle est ENREGISTRÉE et VERSIONNÉE (table `memory`, portée « images », une ligne
 * par version, l'ancienne passe en « rejected ») ; relue à chaque génération ; modifiable par le client.
 *
 * Diversité : un même secteur peut produire plusieurs univers. Le studio choisit, parmi les univers possibles, celui
 * qui est le MOINS proche des signatures déjà utilisées par d'autres projets du même secteur (seulement des
 * caractéristiques de style : jamais leurs photos, logos ni informations).
 *
 * Brief de génération structuré en 16 points (objectif → critères de validation), jamais « une belle pub ».
 */
import { all, id, now, one, run } from "../db";
import type { Project } from "../projects";
import { palette, brandTypo } from "../engine/images";
import { loadImageGuide, share, type ImageCreativeGuide, type ImagePurpose } from "./image-guide";

export type ArtDirection = {
  version: number;
  universe: string;
  idea: string;
  composition: string[];
  palette: { dominant: string; text: string; accent: string; secondary: string };
  typography: string;
  light: string;
  setting: string;
  style: string;
  density: "sparse" | "balanced" | "rich";
  emotion: string;
  avoid: string[];
  /** Pourquoi ces choix (lisible dans l'aperçu). */
  why: string;
};

type Universe = { id: string; idea: string; light: string; setting: string; style: string; emotion: string; composition: string[]; density: ArtDirection["density"] };

/** Univers possibles par grande famille : plusieurs pour un même secteur (jamais une seule recette). */
const UNIVERSES: { when: RegExp; list: Universe[] }[] = [
  {
    when: /montre|horlog|joaill|bijou/,
    list: [
      { id: "atelier-matiere", idea: "La matière vue de près : acier, cuir, gestes d'horloger", light: "lumière rasante chaude d'établi", setting: "établi en bois clair, outils d'horlogerie neutres", style: "photographie macro éditoriale", emotion: "précision tranquille", composition: ["gros plan", "nature morte", "diagonale"], density: "sparse" },
      { id: "voyage-poignet", idea: "Le temps porté au quotidien, en mouvement", light: "lumière naturelle du matin", setting: "carnet, gare, bureau en bois, tissus naturels", style: "photographie lifestyle documentaire", emotion: "liberté posée", composition: ["scène narrative", "asymétrique", "plein cadre"], density: "balanced" },
      { id: "architecture-calme", idea: "Lignes architecturales et ombres franches", light: "soleil dur, ombres géométriques", setting: "pierre claire, béton ciré, marches", style: "photographie graphique minimaliste", emotion: "assurance sobre", composition: ["centrée", "éditoriale", "diagonale"], density: "sparse" },
    ],
  },
  {
    when: /cosmet|serum|creme|soin|parfum|beaute|savon/,
    list: [
      { id: "texture-macro", idea: "La texture du produit, tactile et vraie", light: "lumière douce diffuse", setting: "surfaces minérales humides, verre", style: "macro photo nette", emotion: "fraîcheur", composition: ["gros plan", "centrée"], density: "sparse" },
      { id: "rituel-salle-de-bain", idea: "Le rituel quotidien, sans mise en scène forcée", light: "lumière de fenêtre du matin", setting: "salle de bain réelle, carrelage, serviette", style: "lifestyle naturel", emotion: "douceur", composition: ["nature morte", "asymétrique"], density: "balanced" },
      { id: "couleur-pop", idea: "Couleur franche de la marque en aplats", light: "flash studio net", setting: "fonds colorés unis, ombres portées nettes", style: "photographie studio graphique", emotion: "énergie joyeuse", composition: ["diagonale", "plein cadre"], density: "balanced" },
    ],
  },
  {
    when: /tech|drone|casque|ecouteur|electroni|informati|enceinte|gaming/,
    list: [
      { id: "usage-reel", idea: "L'objet en usage, dans un vrai lieu", light: "lumière naturelle de fin de journée", setting: "intérieur habité, bureau, extérieur urbain", style: "photographie lifestyle", emotion: "simplicité", composition: ["scène narrative", "asymétrique"], density: "balanced" },
      { id: "precision-technique", idea: "Ce qui fait la différence, montré net", light: "lumière studio froide et précise", setting: "fond uni mat, détails techniques", style: "présentation technique", emotion: "confiance", composition: ["présentation technique", "gros plan"], density: "rich" },
      { id: "matiere-douce", idea: "La technologie apaisée, matières douces", light: "lumière douce de studio", setting: "textiles, bois clair, céramique", style: "nature morte éditoriale", emotion: "calme", composition: ["nature morte", "centrée"], density: "sparse" },
    ],
  },
  {
    when: /peint|platr|plomb|electri|menuis|macon|carrel|renov|artisan|jardin|paysag/,
    list: [
      { id: "geste-precis", idea: "Le geste juste, au plus près des mains et de l'outil", light: "lumière de chantier naturelle, latérale", setting: "pièce en cours de travaux, protections, matériaux réels", style: "photographie documentaire", emotion: "maîtrise", composition: ["gros plan", "diagonale"], density: "sparse" },
      { id: "avant-apres", idea: "La transformation d'un lieu, étape par étape", light: "lumière naturelle constante", setting: "même pièce à différents moments", style: "photographie d'intérieur", emotion: "fierté du travail fini", composition: ["éditoriale", "plein cadre"], density: "balanced" },
      { id: "matieres-couleurs", idea: "Les matières et couleurs choisies avec le client", light: "lumière douce de fin de journée", setting: "nuanciers, échantillons, murs finis", style: "nature morte éditoriale", emotion: "projet personnel", composition: ["nature morte", "asymétrique"], density: "sparse" },
    ],
  },
  {
    when: /fleur|florist|patiss|boulang|restau|traiteur|cafe/,
    list: [
      { id: "mains-matiere", idea: "Les mains qui composent, la matière brute", light: "lumière de fenêtre d'atelier", setting: "atelier, plan de travail, matières premières", style: "photographie documentaire", emotion: "chaleur", composition: ["gros plan", "scène narrative"], density: "balanced" },
      { id: "nature-morte-couleur", idea: "Une nature morte colorée de saison", light: "lumière douce diffuse", setting: "table, fonds colorés de la charte", style: "nature morte éditoriale", emotion: "gourmandise / fraîcheur", composition: ["nature morte", "centrée"], density: "sparse" },
    ],
  },
];
const GENERIC: Universe[] = [
  { id: "usage-quotidien", idea: "Le produit ou le service dans la vraie vie", light: "lumière naturelle", setting: "lieu réel d'usage", style: "photographie lifestyle", emotion: "évidence", composition: ["scène narrative", "asymétrique"], density: "balanced" },
  { id: "matiere-detail", idea: "Le détail qui fait la qualité", light: "lumière rasante", setting: "surface neutre de matière", style: "photographie macro", emotion: "soin", composition: ["gros plan", "centrée"], density: "sparse" },
  { id: "graphique-marque", idea: "Les couleurs de la marque en aplats graphiques", light: "lumière studio nette", setting: "fonds unis de la charte", style: "photographie studio graphique", emotion: "affirmation", composition: ["diagonale", "plein cadre"], density: "balanced" },
];

const fold = (x: string) => x.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const subjectText = (p: Project) => fold(`${p.brand?.direction ?? ""} ${p.product.category ?? ""} ${p.product.sector ?? ""} ${p.product.name ?? ""} ${(p.services?.services ?? []).map((s) => s.name).join(" ")}`);

/** Univers déjà utilisés par les AUTRES projets du même secteur (caractéristique de style seulement). */
function universesUsedElsewhere(p: Project): Map<string, number> {
  const rows = all<{ value: string }>(
    "SELECT m.value FROM memory m JOIN projects pr ON pr.id = m.project_id WHERE m.scope = 'images' AND m.key = 'image.art_direction' AND m.status != 'rejected' AND m.project_id != ? AND COALESCE(json_extract(pr.product_json, '$.category'), '') = ?",
    p.id,
    p.product.category ?? "",
  );
  const count = new Map<string, number>();
  for (const r of rows) {
    try {
      const u = (JSON.parse(r.value) as ArtDirection).universe;
      count.set(u, (count.get(u) ?? 0) + 1);
    } catch {
      /* ligne illisible ignorée */
    }
  }
  return count;
}

/** Direction artistique enregistrée du projet (dernière version), ou null. */
export function loadArtDirection(projectId: string): ArtDirection | null {
  const r = one<{ value: string }>("SELECT value FROM memory WHERE project_id = ? AND scope = 'images' AND key = 'image.art_direction' AND status != 'rejected' ORDER BY created_at DESC LIMIT 1", projectId);
  try {
    return r ? (JSON.parse(r.value) as ArtDirection) : null;
  } catch {
    return null;
  }
}

/** Enregistre une nouvelle VERSION (l'ancienne reste en historique, marquée « rejected »). */
export function saveArtDirection(projectId: string, ad: ArtDirection, source: "user" | "ai" = "ai"): ArtDirection {
  const prev = loadArtDirection(projectId);
  const next = { ...ad, version: (prev?.version ?? 0) + 1 };
  run("UPDATE memory SET status = 'rejected', updated_at = ? WHERE project_id = ? AND scope = 'images' AND key = 'image.art_direction' AND status != 'rejected'", now(), projectId);
  run("INSERT INTO memory (id, project_id, kind, key, value, status, source, scope, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)", id(), projectId, "decision", "image.art_direction", JSON.stringify(next), "confirmed", source, "images", now(), now());
  return next;
}

/** Direction artistique du projet : celle enregistrée, sinon définie à partir du projet puis enregistrée. */
export function artDirectionFor(p: Project, o: { refresh?: boolean } = {}): ArtDirection {
  const saved = !o.refresh ? loadArtDirection(p.id) : null;
  if (saved) return saved;
  const t = subjectText(p);
  const list = UNIVERSES.find((u) => u.when.test(t))?.list ?? GENERIC;
  const used = universesUsedElsewhere(p);
  // Univers le moins utilisé ailleurs dans le même secteur ; à égalité, choix stable propre au projet.
  const seed = [...p.id].reduce((s, c) => s + c.charCodeAt(0), 0);
  const u = [...list].sort((a, b) => (used.get(a.id) ?? 0) - (used.get(b.id) ?? 0) || ((seed + list.indexOf(a)) % list.length) - ((seed + list.indexOf(b)) % list.length))[0];
  const pal = palette(p);
  const typo = brandTypo(p);
  const guide = loadImageGuide();
  const avoid = guide.cliches.filter((c) => c.when.test(t)).map((c) => c.avoid);
  return saveArtDirection(p.id, {
    version: 0,
    universe: u.id,
    idea: u.idea,
    composition: u.composition,
    palette: { dominant: pal.light, text: pal.dark, accent: pal.accent, secondary: pal.primary },
    typography: `titres ${typo.heading}${typo.uppercase ? " en capitales" : ""}, textes ${typo.body} ; deux familles au plus`,
    light: u.light,
    setting: u.setting,
    style: u.style,
    density: u.density,
    emotion: u.emotion,
    avoid: [...avoid, "marques tierces, faux logos, filigranes", "texte décoratif inventé"],
    why: `${p.business === "services" ? "Prestation" : "Produit"} « ${p.business === "services" ? (p.services?.services ?? []).map((s) => s.name).slice(0, 2).join(", ") : p.product.name} » ; univers « ${u.id} » choisi parmi ${list.length} possibles${used.size ? ` (le moins utilisé par les autres projets du secteur)` : ""} ; couleurs de la charte de la marque.`,
  });
}

export type GenerationBrief = {
  objective: string;
  subject: string;
  references: string[];
  concept: string;
  composition: string;
  framing: string;
  setting: string;
  light: string;
  palette: string;
  typography: string;
  exactTexts: { role: string; text: string; sharePct: number }[];
  logo: string;
  fidelity: string;
  forbidden: string[];
  format: string;
  validation: string[];
};

/**
 * Brief de génération en 16 points. `recent` : compositions des créations récentes du projet (à ne pas répéter).
 * Les textes exacts sont donnés entre délimiteurs « » ; leur taille est traduite en part de la largeur.
 */
export function buildGenerationBrief(p: Project, o: { purpose: ImagePurpose; subject: string; aspect: string; texts?: { hook?: string; secondary?: string; benefit?: string; cta?: string }; references?: string[]; recent?: string[]; guide?: ImageCreativeGuide; ad?: ArtDirection }): GenerationBrief {
  const g = o.guide ?? loadImageGuide();
  const ad = o.ad ?? artDirectionFor(p);
  const purpose = g.purposes[o.purpose];
  const composition = ad.composition.find((c) => !(o.recent ?? []).includes(c)) ?? ad.composition[(o.recent?.length ?? 0) % ad.composition.length];
  const texts: GenerationBrief["exactTexts"] = [];
  if (purpose.text !== "none") {
    if (o.texts?.hook) texts.push({ role: "accroche", text: o.texts.hook, sharePct: share(g.text.hook) });
    if (purpose.text === "full" && o.texts?.secondary) texts.push({ role: "titre secondaire", text: o.texts.secondary, sharePct: share(g.text.secondary) });
    if (o.texts?.benefit) texts.push({ role: "bénéfice", text: o.texts.benefit, sharePct: share(g.text.benefit) });
    if (purpose.cta && o.texts?.cta) texts.push({ role: "bouton", text: o.texts.cta, sharePct: share(g.text.cta) });
  }
  const services = p.business === "services";
  return {
    objective: `${o.purpose} — ${purpose.note}`,
    subject: o.subject,
    references: o.references ?? [],
    concept: ad.idea,
    composition,
    framing: composition === "gros plan" ? "plan serré" : composition === "plein cadre" ? "sujet qui occupe le cadre" : "plan moyen avec respiration",
    setting: ad.setting,
    light: ad.light,
    palette: `dominante ${ad.palette.dominant}, texte ${ad.palette.text}, accent ${ad.palette.accent} (une seule information mise en valeur), secondaire ${ad.palette.secondary} ; ne jamais recolorer le produit`,
    typography: texts.length ? ad.typography : "aucun texte dans l'image",
    exactTexts: texts,
    // Image sans texte (produit seul, ambiance, bannière) : aucun logo dessiné par le modèle.
    logo: purpose.text === "none" ? "aucun logo dans l'image" : p.brand?.logo?.assetId ? "logo du projet fourni en référence : à reproduire exactement, ou laisser l'emplacement libre" : "aucun logo",
    fidelity: services
      ? "geste, outils, posture et matériaux exacts du métier ; mains correctes ; illustration (jamais un chantier, un salarié ou un témoignage réels)"
      : "le produit de la référence à l'identique : forme, proportions, matières, couleurs réelles, détails, nombre de pièces ; aucune fonction ni accessoire inventés",
    forbidden: [...ad.avoid, "aucune autre marque que celle du projet", ...g.effectsNeedIntent.map((e) => `${e} sans raison`), purpose.cta ? "" : "aucun bouton", purpose.text === "none" ? "aucun texte, aucune lettre" : ""].filter(Boolean),
    format: `${o.aspect}, marges extérieures ${g.layout.marginPx.min}–${g.layout.marginPx.max} px pour 1080 px${purpose.calmZone ? ", grande zone calme réservée au texte du site" : ""}`,
    validation: g.grid.map((x) => x.label),
  };
}

/** Consigne envoyée au modèle d'images (en anglais pour le modèle, textes exacts conservés tels quels). */
export function briefPrompt(b: GenerationBrief): string {
  const lines = [
    `OBJECTIVE: ${b.objective}.`,
    `SUBJECT: ${b.subject}.`,
    b.references.length ? `REFERENCES: ${b.references.join("; ")}.` : "",
    `CONCEPT: ${b.concept}.`,
    `COMPOSITION: ${b.composition}; framing: ${b.framing}; one clear focal point, then a secondary one; generous breathing space.`,
    `SETTING: ${b.setting}. LIGHT: ${b.light}; coherent light direction, temperature, perspective, contact shadows and reflections; nothing floating.`,
    `PALETTE: ${b.palette}.`,
    b.exactTexts.length
      ? `TEXT (render EXACTLY, letter for letter, nothing else written): ${b.exactTexts.map((t) => `${t.role} «${t.text}» (cap height about ${t.sharePct}% of the image width)`).join("; ")}. Typography: ${b.typography}. Contrast at least 4.5:1, calm zone or soft local gradient behind text if needed.`
      : "TEXT: none — no letters, no words, no numbers anywhere.",
    `LOGO: ${b.logo}.`,
    `FIDELITY: ${b.fidelity}.`,
    `FORBIDDEN: ${b.forbidden.join("; ")}.`,
    `FORMAT: ${b.format}.`,
  ];
  return lines.filter(Boolean).join("\n");
}

const ROLE_EN: Record<string, string> = { accroche: "headline", "titre secondaire": "secondary line", bénéfice: "benefit line", bouton: "button" };

/**
 * ÉTAPE 1 (Qwen-Image) : la PHOTOGRAPHIE seule, sans aucun texte ni logo. Les notes de direction artistique sont
 * données comme instructions (le modèle ne doit jamais en écrire un mot : défaut constaté à l'essai réel ARVEN).
 */
export function briefScenePrompt(b: GenerationBrief, o: { photoOnly?: boolean } = {}): string {
  const photoOnly = o.photoOnly ?? true;
  const textLater = photoOnly && b.exactTexts.length > 0;
  return [
    "ART DIRECTION NOTES — instructions for you only: never write any of these words, labels, colour codes or notes in the image.",
    `Concept (an idea to convey with the picture only — never write it): ${b.concept}.`,
    `Composition: ${b.composition}; framing: ${b.framing}; one clear focal point; generous breathing space${textLater ? "; keep a calm, uncluttered area (plain wall, sky, table surface, soft blur) where a headline will be added later, never on the product" : ""}.`,
    `Setting (objects and place, not words): ${b.setting}. Light: ${b.light}; coherent light direction, temperature, perspective, contact shadows and reflections; nothing floating.`,
    `Colour mood: ${b.palette}.`,
    `Fidelity: ${b.fidelity}.`,
    `Avoid: ${b.forbidden.filter((f) => !/texte|bouton|lettre/i.test(f)).join("; ")}.`,
    "Decor objects stay blank: no writing, letters, title or logo on books, notebooks, papers, labels, boxes or signs.",
    `Format: ${b.format}.`,
    photoOnly ? "OUTPUT: a PHOTOGRAPH ONLY — absolutely no text, letters, numbers, words, logo, label, caption, watermark, frame or graphic element anywhere (the text printed on the real product itself stays as on the reference)." : "",
  ].filter(Boolean).join("\n");
}

/**
 * ÉTAPE 2 (ChatGPT Images par défaut) : sur la photo de l'étape 1, poser les textes exacts, le bouton et le vrai logo,
 * sans toucher à la photo. Tailles en part de la largeur (guide : px pour 1080 px), contraste 4,5:1, marges.
 */
export function layoutPrompt(b: GenerationBrief, o: { hasLogo: boolean; brand: string; textColor: string; accent: string }): string {
  const lines = b.exactTexts.map((t) => `- ${ROLE_EN[t.role] ?? t.role}: "${t.text}" (cap height about ${t.sharePct}% of the image width)`);
  return [
    "Graphic design step on an existing photograph.",
    "Image 1 is the finished campaign photograph: keep it EXACTLY as it is — same product, same framing, same light, same colours; do not redraw, move, crop, retouch or recolour anything in it.",
    "Add ONLY the typography" + (o.hasLogo ? " and the brand logo" : "") + " on top of it, as the art director of a top agency would: in the calm area of the photo, never covering the product, clear reading order (headline first).",
    "Texts to set — spell them EXACTLY, letter for letter, with the same accents and punctuation; write nothing else:",
    ...lines,
    o.hasLogo ? `Logo: image 2 is the brand's real logo — place it small and clean, reproduced exactly (same emblem, same letters "${o.brand}", same colours); no other logo, no invented emblem.` : `Brand: no logo is provided — do not draw any logo or brand name.`,
    `Typography: ${b.typography}; two font families at most, two or three hierarchy levels, clean alignment, outer margins about 6–8% of the width.`,
    `Colours: text ${o.textColor}${b.exactTexts.some((t) => t.role === "bouton") ? `, button filled with ${o.accent} (the only highlighted element)` : ""}; contrast at least 4.5:1 — if needed a soft local gradient on the photo behind the text, never a solid band or box.`,
    "Forbidden: any other word, label, note, colour code, swatch, price, percentage, claim, hashtag, website, watermark, frame or second product.",
    `Format: ${b.format.split(",")[0]}.`,
  ].join("\n");
}
