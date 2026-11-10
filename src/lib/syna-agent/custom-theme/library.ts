/**
 * Bibliothèque des sections des THÈMES SUR MESURE (SINA, étape 6 ; décision du propriétaire du 9 novembre 2026 :
 * « on ne va plus appeler ça maquette mais thème sur mesure »). Les sections viennent du catalogue montré au
 * propriétaire (public/sections/, préparé par scripts/sections-library.py) : 191 sections, familles « Classique » et
 * « Moderne », jamais mélangées dans un thème. Gratuit, sans IA.
 */
import fs from "node:fs";
import path from "node:path";
import type { FamilyId } from "../section-families";

export type LibSection = {
  id: string;
  title: string;
  /** Catégorie et place dans le site (ex. « Ouverture · accueil »). */
  kind: string;
  /** Ce que fait la section, tel que le propriétaire l'a validé. */
  does: string;
  anim: string;
  family: FamilyId;
  /** Famille Moderne : style d'exemple de la section (les deux styles se reprennent aux couleurs de la marque). */
  style: string | null;
  /** Rôle dans l'histoire de la page (en-tête, ouverture, produits, produit vedette, confiance, pied de page…). */
  role: string;
  tags: string[];
  /** Démonstration dans une fausse fenêtre qui défile (catalogue seulement) : jamais posée telle quelle dans un thème. */
  demoFrame?: boolean;
  html: string;
};
type Library = { version: number; fonts: string[]; sections: LibSection[] };

let cache: Library | null = null;
export const LIBRARY_DIR = () => path.join(process.cwd(), "public", "sections");
export function sectionLibrary(): Library {
  if (!cache) cache = JSON.parse(fs.readFileSync(path.join(LIBRARY_DIR(), "library.json"), "utf8")) as Library;
  return cache;
}
/**
 * Photos de fond posées par la feuille commune (ex. « .hero .bg{background:url(photos/hero.jpg)} ») : écrites dans la
 * section elle-même (style en ligne), pour que SINA les voie, les compte et les remplace comme les autres photos (essai
 * réel du 9 novembre 2026 : la théière d'exemple restait en ouverture d'un site de confitures).
 */
let bgRules: { classes: string[]; file: string }[] | null = null;
function backgroundRules() {
  if (bgRules) return bgRules;
  bgRules = [];
  let css = "";
  try { css = fs.readFileSync(path.join(LIBRARY_DIR(), "library.css"), "utf8"); } catch { return bgRules; }
  for (const m of css.matchAll(/([^{}]+)\{[^{}]*?background(?:-image)?\s*:[^;{}]*url\(\s*["']?photos\/([\w.-]+\.(?:webp|png|jpe?g))["']?\s*\)/g)) {
    for (const sel of m[1].split(",")) {
      if (/[:\[>+~*]/.test(sel)) continue; // pseudo-éléments, attributs : jamais en ligne
      const classes = sel.trim().split(/\s+/).map((x) => x.match(/^\.([\w-]+)$/)?.[1] ?? null);
      if (!classes.length || classes.some((c) => !c)) continue;
      bgRules.push({ classes: classes as string[], file: m[2] });
    }
  }
  return bgRules;
}
export function inlineBackgrounds(html: string): string {
  let out = html;
  for (const r of backgroundRules()) {
    const last = r.classes[r.classes.length - 1];
    const has = (c: string) => new RegExp(`class="[^"]*\\b${c}\\b[^"]*"`).test(out);
    if (!r.classes.every(has)) continue;
    const tag = new RegExp(`<([a-z][a-z0-9]*)\\b([^>]*\\bclass="[^"]*\\b${last}\\b[^"]*"[^>]*)>`);
    const m = tag.exec(out);
    if (!m || /background-image|photos\//.test(m[2])) continue;
    const attrs = /\bstyle="/.test(m[2]) ? m[2].replace(/\bstyle="/, `style="background-image:url(photos/${r.file});`) : `${m[2]} style="background-image:url(photos/${r.file})"`;
    out = out.slice(0, m.index) + `<${m[1]}${attrs}>` + out.slice(m.index + m[0].length);
  }
  return out;
}
export const libSection = (id: string): LibSection | null => sectionLibrary().sections.find((s) => s.id === id) ?? null;
/**
 * Sections dont le contenu AFFICHÉ est fabriqué par le script de démonstration (produits, questions ou prestations de
 * la démo : thés, électricien, restaurant) : le rédacteur ne voit pas ces textes et ne peut pas les réécrire pour la
 * marque. Relevé automatique du 9 novembre 2026 (rendu de chaque section comparé à son HTML) après l'essai Heure Dorée
 * (« Comment conserver mon thé ? » sur un site de confitures). Interdites aux thèmes sur mesure tant qu'elles ne sont
 * pas rendues réécrivables. Les paniers restent permis (le vrai panier est un chantier à part).
 */
export const SCRIPT_DEMO_SECTIONS = new Set([
  "comparateur-de-produits", "composition-interactive", "choisir-selon-le-moment", "recherche-guidee", "quiz-quel-produit-pour-toi",
  "questions-en-bulles-de-discussion", "produit-vedette-lots-degressifs", "produit-vedette-loupe-et-onglets", "produit-vedette-abonnement",
  "produit-vedette-toute-la-gamme", "produit-vedette-calculateur-de-tasses", "panier-tiroir-a-paliers", "prise-de-rendez-vous",
  "demande-de-devis-en-etapes", "la-carte-du-restaurant", "panier-tiroir-neon",
]);
/**
 * Sections qui fabriquent une urgence ou une offre d'exemple (audit du 10 novembre 2026) : comptes à rebours calculés
 * depuis l'heure du visiteur (« dans 3 j 5 h »), remises, codes promo et cadeaux d'exemple. Jamais posées : les offres
 * réelles du client sont des fonctions du bloc d'achat « Produit vedette », lues dans ses vraies données.
 */
export const FAKE_OFFER_SECTIONS: Record<string, "compte à rebours" | "offre"> = {
  "ouverture-drop": "compte à rebours", "produit-vedette-drop-limite": "compte à rebours", "lancement-facon-drop": "compte à rebours",
  "barre-compte-a-rebours": "compte à rebours", "compte-a-rebours-en-bloc": "compte à rebours",
  "offre-en-deux-tuiles": "offre", "abonnement-ou-achat-unique": "offre", "code-promo-a-copier": "offre", "cadeau-offert-des-un-montant": "offre",
};
/**
 * Sections qu'un thème de cette famille peut recevoir : jamais les démonstrations en fausse fenêtre, les contenus
 * fabriqués par un script de démonstration, les faux comptes à rebours ni les offres d'exemple.
 */
export const familySections = (family: FamilyId): LibSection[] => sectionLibrary().sections.filter((s) => s.family === family && !s.demoFrame && !SCRIPT_DEMO_SECTIONS.has(s.id) && !FAKE_OFFER_SECTIONS[s.id]);
/** Retrouve une section par son identifiant ou par son titre exact. */
export const sectionByRef = (ref: string): LibSection | null => libSection(ref) ?? sectionLibrary().sections.find((s) => s.title === ref) ?? null;

/** Rôles « de structure » : un seul de chaque dans un thème, posé hors des pages. */
export const SHELL_ROLES = { header: "en-tête", footer: "pied de page", search: "recherche" } as const;
/** Sections de cartes produits ou familles : une seule par page (consigne du propriétaire du 8 novembre). */
const CARD_FAMILIES = new Set(["Choisis ton terrain", "Mosaïque de collections", "Familles en cartes défilantes", "Familles en éventail"]);
/** Sections réservées à un genre de produit (étiquettes de la bibliothèque) : jamais posées ailleurs (contrôle bloquant). */
const ONLY_FOR: Record<string, string> = { "pour-mode": "vêtements et accessoires de mode (tailles, tenues, looks)", "pour-the": "thés et infusions" };
export const onlyFor = (tags: string[] | undefined) => (tags ?? []).map((t) => ONLY_FOR[t]).find(Boolean) ?? null;
/** Section de cartes : cartes produits, ou cartes de familles avec photos (une liste de rayons en texte n'en est pas une). */
export const isCardSection = (l: Pick<LibSection, "role" | "title">) => l.role === "produits" || CARD_FAMILIES.has(l.title);
export const FEATURED_ROLE = "produit vedette";

/**
 * Photos que SINA ne peut pas inventer (décision du propriétaire du 9 novembre 2026, exigence 6.8) : les réalisations et
 * l'avant/après d'un artisan, les photos publiées par ses clients, les biens mis en vente. Seules les vraies photos du
 * client y vont ; tant qu'elles manquent, un cadre « Photo à fournir » les remplace dans l'aperçu.
 */
const AUTHENTIC_SECTIONS: Record<string, { kind: string; services?: boolean }> = {
  "realisations-filtrables": { kind: "tes réalisations" }, "projet-en-detail": { kind: "tes réalisations" },
  "avant-apres": { kind: "ton avant / après", services: true }, "vus-dans-la-rue": { kind: "les photos de tes clients" },
  "recherche-de-biens": { kind: "tes biens" }, "fiche-d-un-bien": { kind: "tes biens" },
};
/** Nature d'une photo impossible à inventer dans cette section, ou null (photo que SINA peut créer). */
export function authenticSection(id: string, business: "products" | "services"): string | null {
  const a = AUTHENTIC_SECTIONS[id];
  return a && (!a.services || business === "services") ? a.kind : null;
}
/** Sections où une photo de produit est la VRAIE photo du produit (cartes, bloc d'achat), jamais une scène créée. */
export const isProductPhotoSection = (l: Pick<LibSection, "role" | "title">) => isCardSection(l) || l.role === FEATURED_ROLE;

/** Photos de démonstration citées par une section (avec ou sans dossier). */
export function sectionPhotos(html: string): string[] {
  return [...new Set([...html.matchAll(/\/api\/files\/([\w-]+)|\b([a-z]{2,}-[a-z0-9]+\.(?:webp|png|jpg)|[a-z]+\.jpg)\b/g)].map((m) => m[1] ? `fichier:${m[1]}` : m[2]))];
}
/** Photos d'une section, une entrée par emplacement (une même photo deux fois dans la section compte deux fois). */
export function sectionPhotoUses(html: string): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(/(?:src|data-src)="([^"]+)"|url\(['"]?([^'")]+)['"]?\)/g)) {
    const v = m[1] ?? m[2] ?? "";
    const f = /\/api\/files\/([\w-]+)/.exec(v)?.[1];
    if (f) out.push(`fichier:${f}`);
    else { const ph = /(?:^|\/)([a-z]{2,}-[a-z0-9]+\.(?:webp|png|jpg)|[a-z]+\.jpg)$/.exec(v.split("?")[0])?.[1]; if (ph) out.push(ph); }
  }
  return out;
}

/**
 * Marques des démonstrations écrites dans les sections : remplacées par la marque du client au rendu (jamais le nom
 * d'un modèle sur le site d'un client), en gardant la casse (MAJUSCULES, Capitale, minuscules) ; un mot-dièse perd
 * ses espaces.
 */
export const DEMO_BRANDS = ["Atelier Nuance", "Brindi", "Solstice", "Rupture"];
const escHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
export function withBrandName(html: string, name: string): string {
  const n = escHtml(name.trim());
  if (!n) return html;
  // Mot géant écrit lettre par lettre (<span style="--i:0">S</span>…) : réécrit avec les lettres du nom du client.
  let out = html.replace(/(?:<span style="--i:\d+">[^<]<\/span>){3,}/g, (m) => {
    const letters = [...m.matchAll(/>([^<])</g)].map((x) => x[1]).join("");
    if (!DEMO_BRANDS.some((d) => d.replace(/\s+/g, "").toLowerCase() === letters.toLowerCase())) return m;
    const v = letters === letters.toUpperCase() ? name.trim().toUpperCase() : name.trim();
    return [...v].map((c, i) => `<span style="--i:${i}">${c === " " ? "&nbsp;" : escHtml(c)}</span>`).join("");
  });
  for (const demo of DEMO_BRANDS) {
    const re = new RegExp(`(#?)\\b(${demo.replace(/\s+/g, "\\s+")})\\b`, "gi");
    out = out.replace(re, (_m, hash: string, word: string) => {
      const v = word === word.toUpperCase() ? n.toUpperCase() : word === word.toLowerCase() ? n.toLowerCase() : n;
      return hash ? `#${v.replace(/\s+/g, "")}` : v;
    });
  }
  return out;
}

/** Caractéristiques mesurées des sections (scripts/section-traits.cjs). */
export type Trait = { fond: "clair" | "sombre" | "couleur" | "photo"; densite: "dense" | "moyenne" | "aérée"; photos: number; hauteur: number; inversable?: boolean };
let traitsCache: Record<string, Trait | null> | null = null;
export function sectionTraits(): Record<string, Trait | null> {
  if (!traitsCache) { try { traitsCache = JSON.parse(fs.readFileSync(path.join(LIBRARY_DIR(), "section-traits.json"), "utf8")); } catch { traitsCache = {}; } }
  return traitsCache!;
}

/** La section passe-t-elle le contrôle de lisibilité une fois inversée (scripts/section-invert-check.cjs) ? */
export const canInvert = (id: string): boolean => sectionTraits()[id]?.inversable === true;
/** Classe d'inversion d'une section selon le fond voulu et son fond d'origine (null : rien à inverser). */
export function inversionClass(id: string, ground?: "clair" | "sombre"): "ct-dark" | "ct-light" | null {
  if (!ground || !canInvert(id)) return null;
  const nat = sectionTraits()[id]?.fond;
  if (ground === "sombre" && nat === "clair") return "ct-dark";
  if (ground === "clair" && nat === "sombre") return "ct-light";
  return null;
}
