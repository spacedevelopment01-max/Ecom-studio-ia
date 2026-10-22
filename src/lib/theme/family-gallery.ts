/**
 * Galerie « Sections » par famille (issue #141) : les 20 fonctions de la famille du projet, chacune avec ses
 * dispositions et une vignette dessinée (schéma neutre de la disposition, aucune image ni texte de démonstration).
 * Les identifiants d'élément sont « fam:<fonction>~<disposition> » : l'ajout, l'aperçu et l'IA les résolvent vers
 * la section du thème et ses réglages (section-families.ts).
 */
import type { Lang } from "../i18n";
import { FAMILY_LABEL, FAMILY_LIBRARY, libraryId, parseLibraryId, pickT, type FamilyEntry, type FamilyId, type Thumb } from "./section-families";

/** Rubrique de la galerie de chaque fonction (clés de catégorie de l'interface). */
const CATEGORY: Record<string, string> = {
  "specialty.hero": "Ouverture", "specialty.benefits": "Produit", "specialty.details": "Produit", "specialty.composition": "Produit", "specialty.specs": "Produit",
  "specialty.howto": "Produit", "specialty.situations": "Images et vidéos", "specialty.video": "Images et vidéos", "specialty.comparison": "Conversion", "specialty.results": "Preuves",
  "specialty.reviews": "Preuves", "specialty.press": "Preuves", "specialty.story": "Textes", "specialty.making": "Textes", "specialty.purchase": "Conversion",
  "specialty.addons": "Collections", "specialty.guarantees": "Preuves", "specialty.faq": "Textes", "specialty.newsletter": "Conversion", "specialty.contact": "Textes",
  "catalog.hero": "Ouverture", "catalog.collections": "Collections", "catalog.products": "Collections", "catalog.featured": "Produit", "catalog.lookbook": "Images et vidéos",
  "catalog.finishes": "Produit", "catalog.dimensions": "Produit", "catalog.uses": "Images et vidéos", "catalog.care": "Produit", "catalog.comparison": "Conversion",
  "catalog.campaign": "Conversion", "catalog.heritage": "Textes", "catalog.atelier": "Textes", "catalog.commitments": "Preuves", "catalog.reviews": "Preuves",
  "catalog.press": "Preuves", "catalog.journal": "Textes", "catalog.faq": "Textes", "catalog.newsletter": "Conversion", "catalog.contact": "Textes",
  "services.hero": "Ouverture", "services.offers": "Services", "services.detail": "Services", "services.needs": "Services", "services.portfolio": "Images et vidéos",
  "services.case": "Preuves", "services.before-after": "Images et vidéos", "services.method": "Services", "services.commitments": "Preuves", "services.team": "Textes",
  "services.history": "Textes", "services.credentials": "Preuves", "services.equipment": "Services", "services.testimonials": "Preuves", "services.references": "Preuves",
  "services.pricing": "Conversion", "services.area": "Services", "services.faq": "Textes", "services.news": "Textes", "services.contact": "Conversion",
};
export const categoryOf = (entry: FamilyEntry) => CATEGORY[entry.key] ?? "Textes";

// ─── Vignettes : schémas SVG (gris neutres + une touche d'accent) ─────────────────────────────────────────────────────
const W = 160, H = 100;
const r = (x: number, y: number, w: number, h: number, k: "m" | "l" | "a" | "s" = "l", rx = 3) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" class="${k}"/>`;
const lines = (x: number, y: number, w: number, n = 2, gap = 7) => Array.from({ length: n }, (_, i) => r(x, y + i * gap, i === n - 1 ? w * 0.7 : w, 3, "s", 1.5)).join("");
const head = (y = 10) => r(55, y, 50, 5, "m", 2) + r(65, y + 9, 30, 3, "s", 1.5);
const grid = (cols: number, rows = 1, y = 26, h = 54) => {
  const gap = 6, w = (W - 24 - gap * (cols - 1)) / cols, hh = (h - gap * (rows - 1)) / rows;
  let o = "";
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) o += r(12 + i * (w + gap), y + j * (hh + gap), w, hh, "l");
  return o;
};
const DRAW: Record<string, () => string> = {
  "split-right": () => lines(12, 30, 52, 3) + r(12, 58, 30, 9, "a", 4) + r(84, 12, 64, 76, "m"),
  "split-left": () => r(12, 12, 64, 76, "m") + lines(90, 30, 54, 3) + r(90, 58, 30, 9, "a", 4),
  stacked: () => head() + r(12, 30, 136, 58, "m"),
  background: () => r(0, 0, W, H, "m", 0) + lines(16, 52, 60, 2) + r(16, 70, 30, 9, "a", 4),
  "grid-2": () => head() + grid(2),
  "grid-3": () => head() + grid(3),
  "grid-4": () => head() + grid(4),
  carousel: () => head() + r(12, 28, 52, 52) + r(70, 28, 52, 52) + r(128, 28, 32, 52, "l") + r(120, 86, 8, 4, "a", 2) + r(132, 86, 8, 4, "s", 2),
  list: () => head() + [30, 46, 62, 78].map((y) => r(30, y, 6, 6, "a", 3) + r(42, y, 88, 4, "s", 2) + r(42, y + 7, 60, 3, "s", 1.5)).join(""),
  marquee: () => r(0, 40, W, 20, "m", 0) + [8, 48, 88, 128].map((x) => r(x, 47, 28, 6, "s", 3)).join(""),
  "cards-rows": () => head() + [28, 52, 76].map((y) => r(12, y, 136, 18) + r(14, y + 2, 40, 14, "m", 2)).join(""),
  hotspots: () => r(12, 12, 90, 76, "m") + [[40, 36], [70, 60], [56, 24]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" class="a"/>`).join("") + lines(110, 30, 38, 4),
  tabs: () => head() + r(20, 30, 30, 7, "a", 3) + r(54, 30, 30, 7, "s", 3) + r(88, 30, 30, 7, "s", 3) + r(20, 44, 120, 40),
  accordion: () => head() + [30, 44, 58, 72].map((y) => r(20, y, 120, 10, "l", 2) + r(132, y + 3, 4, 4, "a", 1)).join(""),
  steps: () => head() + [12, 62, 112].map((x, i) => `<circle cx="${x + 18}" cy="36" r="6" class="${i ? "s" : "a"}"/>` + r(x, 48, 36, 30)).join(""),
  timeline: () => head() + r(78, 28, 3, 64, "s", 1) + [32, 54, 76].map((y, i) => `<circle cx="79.5" cy="${y}" r="4" class="a"/>` + r(i % 2 ? 88 : 24, y - 6, 48, 12)).join(""),
  mosaic: () => r(12, 12, 70, 76, "m") + r(88, 12, 60, 36) + r(88, 52, 60, 36),
  video: () => head() + r(20, 28, 120, 62, "m") + `<path d="M74 50l14 9-14 9z" class="a"/>`,
  "video-split": () => r(12, 18, 86, 64, "m") + `<path d="M48 42l14 8-14 8z" class="a"/>` + lines(106, 30, 42, 4),
  "video-vertical": () => r(24, 8, 48, 84, "m") + `<path d="M43 44l12 7-12 7z" class="a"/>` + lines(84, 30, 60, 4),
  stories: () => head() + [14, 50, 86, 122].map((x) => r(x, 28, 28, 60, "m") + `<circle cx="${x + 14}" cy="58" r="5" class="a"/>`).join(""),
  table: () => head() + r(16, 28, 128, 60) + [40, 52, 64, 76].map((y) => r(20, y, 120, 1, "s", 0)).join("") + r(84, 28, 30, 60, "a", 0),
  cards: () => head() + grid(3, 1, 26, 60) + r(62, 22, 36, 6, "a", 3),
  stats: () => head() + [16, 60, 104].map((x) => r(x, 36, 34, 12, "a", 2) + r(x, 54, 34, 4, "s", 2)).join(""),
  beforeafter: () => r(12, 12, 136, 76, "m") + r(80, 12, 68, 76, "l", 0) + r(79, 12, 2, 76, "a", 0) + `<circle cx="80" cy="50" r="6" class="a"/>`,
  quote: () => r(70, 18, 20, 10, "a", 2) + lines(30, 40, 100, 3, 9) + r(60, 76, 40, 4, "s", 2),
  "quote-split": () => r(12, 12, 60, 76, "m") + r(84, 22, 14, 8, "a", 2) + lines(84, 40, 62, 3, 9),
  band: () => r(0, 30, W, 40, "a", 0) + lines(30, 44, 100, 2, 8),
  logos: () => head() + [14, 50, 86, 122].map((x) => r(x, 44, 26, 12, "s", 3)).join("") + lines(40, 70, 80, 1),
  sticky: () => r(12, 12, 64, 76, "m") + [16, 40, 64].map((y, i) => r(88, y, 60, 18, i === 1 ? "a" : "l")).join(""),
  drawing: () => head() + `<path d="M40 40h50v40H40z M90 40l20-12v40l-20 12 M40 40l20-12h50" class="o"/>` + r(40, 86, 50, 2, "a", 1),
  form: () => head() + [30, 44, 58].map((y) => r(40, y, 80, 9, "l", 2)).join("") + r(40, 74, 40, 10, "a", 5),
  "form-split": () => lines(12, 26, 54, 4) + [22, 36, 50].map((y) => r(84, y, 64, 9, "l", 2)).join("") + r(84, 66, 36, 10, "a", 5),
  map: () => r(12, 12, 86, 76, "m") + `<circle cx="55" cy="46" r="6" class="a"/>` + lines(106, 30, 42, 4),
  pricing: () => head() + grid(3, 1, 26, 60) + [34, 80, 126].map((x) => r(x - 12, 34, 24, 8, "a", 2)).join(""),
  featured: () => r(12, 12, 70, 76, "m") + lines(92, 22, 52, 2) + r(92, 42, 52, 10, "l", 2) + r(92, 56, 52, 10, "l", 2) + r(92, 74, 52, 12, "a", 6),
  index: () => head() + [30, 44, 58, 72].map((y, i) => r(20, y, 100, 9, i === 1 ? "a" : "s", 2) + r(130, y, 10, 9, "s", 2)).join(""),
  product: () => head() + grid(4, 1, 26, 46) + [12, 48, 84, 120].map((x) => r(x, 76, 24, 4, "s", 2)).join(""),
  newsletter: () => head(22) + r(36, 50, 62, 12, "l", 6) + r(102, 50, 26, 12, "a", 6),
  stores: () => head() + grid(3, 1, 28, 56) + [28, 74, 120].map((x) => `<circle cx="${x}" cy="44" r="4" class="a"/>`).join(""),
  asym: () => head() + r(12, 26, 66, 64, "m") + r(84, 26, 30, 30) + r(118, 26, 30, 30) + r(84, 60, 64, 30),
  statement: () => r(16, 26, 96, 8, "m", 2) + r(16, 40, 80, 8, "m", 2) + lines(16, 60, 70, 2) + r(118, 20, 28, 40, "l"),
  "header-centered": () => r(0, 0, W, 26, "l", 0) + r(64, 9, 32, 8, "m", 2) + r(10, 11, 12, 4, "s", 2) + r(130, 10, 8, 6, "a", 2) + r(142, 10, 8, 6, "a", 2) + r(12, 40, 136, 50, "s", 3),
  "header-mega-featured": () => r(0, 0, W, 20, "l", 0) + r(8, 6, 24, 8, "m", 2) + r(48, 8, 60, 4, "s", 2) + r(10, 24, 140, 50, "l") + r(16, 30, 46, 38, "m") + lines(72, 34, 60, 3),
  "header-cta": () => r(0, 0, W, 24, "l", 0) + r(8, 8, 26, 8, "m", 2) + r(54, 10, 50, 4, "s", 2) + r(112, 7, 40, 10, "a", 5) + r(12, 38, 136, 52, "s", 3),
  "header-floating": () => r(10, 8, 140, 20, "l", 10) + r(20, 14, 24, 8, "m", 2) + `<circle cx="128" cy="18" r="5" class="a"/><circle cx="140" cy="18" r="5" class="a"/>` + r(12, 40, 136, 50, "s", 3),
  "header-two-rows": () => r(0, 0, W, 34, "l", 0) + r(64, 6, 32, 8, "m", 2) + r(130, 7, 18, 6, "a", 2) + r(30, 22, 100, 4, "s", 2) + r(12, 44, 136, 46, "s", 3),
  "header-transparent": () => r(0, 0, W, 100, "m", 0) + r(8, 7, 26, 6, "l", 2) + r(56, 9, 48, 3, "l", 2) + r(136, 8, 6, 6, "l", 2) + r(146, 8, 6, 6, "l", 2) + r(12, 46, 54, 8, "l", 2) + r(12, 60, 40, 4, "l", 2) + r(12, 72, 30, 8, "a", 2),
  "header-classic": () => r(0, 0, W, 22, "l", 0) + r(8, 7, 26, 8, "m", 2) + r(44, 9, 70, 4, "s", 2) + r(132, 8, 8, 6, "a", 2) + r(144, 8, 8, 6, "a", 2) + r(12, 36, 136, 54, "s", 3),
  "header-mega-columns": () => r(0, 0, W, 20, "l", 0) + r(8, 6, 24, 8, "m", 2) + r(10, 24, 140, 56, "l") + [16, 50, 84].map((x) => lines(x, 32, 28, 4)).join("") + r(118, 30, 26, 44, "m"),
  "header-mega-cards": () => r(0, 0, W, 30, "l", 0) + r(64, 5, 32, 8, "m", 2) + r(30, 20, 100, 4, "s", 2) + [14, 50, 86, 122].map((x) => r(x, 36, 26, 30, "m") + r(x, 70, 20, 3, "s", 1)).join(""),
  "header-nav-left": () => r(0, 0, W, 22, "l", 0) + r(8, 9, 40, 4, "s", 2) + r(64, 7, 32, 8, "m", 2) + r(132, 8, 8, 6, "a", 2) + r(144, 8, 8, 6, "a", 2) + r(12, 36, 136, 54, "s", 3),
  "header-store": () => r(0, 0, W, 26, "l", 0) + r(8, 8, 30, 10, "m", 2) + r(48, 11, 70, 4, "s", 2) + r(126, 8, 26, 10, "a", 5) + r(12, 40, 64, 50, "m") + lines(84, 48, 60, 3),
  "header-phone": () => r(0, 0, W, 24, "l", 0) + r(8, 8, 26, 8, "m", 2) + r(70, 10, 34, 4, "a", 2) + r(110, 7, 42, 10, "a", 5) + r(12, 38, 136, 52, "s", 3),
  "footer-columns": () => r(12, 10, 136, 30, "s", 3) + r(0, 48, W, 52, "m", 0) + [14, 50, 86].map((x) => lines(x, 58, 28, 4)).join("") + r(118, 58, 30, 10, "a", 5),
  "footer-centered": () => r(12, 10, 136, 30, "s", 3) + r(0, 48, W, 52, "m", 0) + r(62, 56, 36, 8, "l", 2) + r(46, 70, 50, 9, "l", 5) + r(98, 70, 18, 9, "a", 5) + r(40, 88, 80, 3, "s", 1),
  "footer-card": () => r(12, 10, 136, 30, "s", 3) + r(0, 48, W, 52, "m", 0) + r(16, 54, 128, 40, "l", 6) + lines(24, 62, 50, 3) + r(96, 64, 40, 10, "a", 5),
  "footer-wordmark": () => r(12, 10, 136, 26, "s", 3) + r(0, 42, W, 58, "m", 0) + [14, 50, 86].map((x) => lines(x, 48, 28, 2)).join("") + r(14, 70, 132, 20, "l", 2),
  "footer-minimal": () => r(12, 10, 136, 56, "s", 3) + r(0, 76, W, 24, "m", 0) + r(10, 84, 24, 8, "l", 2) + r(50, 86, 60, 4, "s", 2) + r(122, 84, 28, 8, "a", 4),
  "footer-store": () => r(12, 10, 136, 26, "s", 3) + r(0, 42, W, 58, "m", 0) + r(12, 50, 70, 16, "l", 2) + [92, 124].map((x) => lines(x, 50, 24, 4)).join("") + r(12, 86, 60, 4, "a", 2),
  "footer-boxed": () => r(12, 10, 136, 30, "s", 3) + r(0, 46, W, 54, "m", 0) + r(12, 52, 136, 34, "l", 2) + [20, 56, 92].map((x) => lines(x, 58, 26, 3)).join("") + r(40, 90, 80, 3, "s", 1),
  "footer-stacked": () => r(12, 10, 136, 24, "s", 3) + r(0, 40, W, 60, "m", 0) + [46, 60, 74, 88].map((y) => r(12, y, 136, 8, "l", 2)).join(""),
  "footer-split": () => r(12, 10, 136, 30, "s", 3) + r(0, 48, W, 52, "m", 0) + r(12, 58, 60, 14, "l", 2) + lines(12, 78, 50, 2) + [92, 124].map((x) => lines(x, 58, 24, 4)).join(""),
  "footer-brand-left": () => r(12, 10, 136, 30, "s", 3) + r(0, 48, W, 52, "m", 0) + r(12, 56, 64, 36, "l", 4) + `<circle cx="24" cy="66" r="4" class="a"/>` + lines(32, 64, 36, 3) + [90, 122].map((x) => lines(x, 58, 26, 4)).join(""),
  "footer-studio": () => r(12, 10, 136, 26, "s", 3) + r(0, 42, W, 58, "m", 0) + r(12, 52, 110, 12, "l", 2) + r(12, 68, 80, 12, "l", 2) + r(12, 88, 136, 3, "s", 1),
};

/** Vignette SVG d'une disposition (data: URI, sans fichier ni image de démonstration). */
export function thumbSvg(kind: Thumb | string): string {
  const body = (DRAW[kind] ?? DRAW.stacked)();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}"><style>.l{fill:#e7e3dc}.m{fill:#cfc8bd}.s{fill:#b9b1a5}.a{fill:#c2603d}.o{fill:none;stroke:#8d857a;stroke-width:1.5}</style><rect width="${W}" height="${H}" fill="#f6f3ee"/>${body}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export type GalleryItem = {
  type: string; name: string; category: string; description: string; keywords: string; preview: string | null; addable: boolean;
  family: string; n: number; dispositions: { id: string; label: string; preview: string }[];
};

/** Les 20 éléments de galerie de la famille, dans la langue demandée. */
export function familyGallery(family: FamilyId, lang: Lang, available?: (type: string) => boolean): GalleryItem[] {
  return FAMILY_LIBRARY[family].map((entry) => {
    const disps = entry.dispositions.filter((x) => !available || available(x.type));
    return { entry, disps };
  }).filter(({ disps }) => disps.length).map(({ entry, disps }) => ({
    type: libraryId(entry),
    name: pickT(entry.name, lang),
    category: categoryOf(entry),
    description: pickT(entry.description, lang),
    keywords: `${entry.keywords} ${disps.map((x) => pickT(x.label, lang)).join(" ")} ${pickT(FAMILY_LABEL[family], lang)}`,
    preview: thumbSvg(disps[0].thumb),
    addable: true,
    family: pickT(FAMILY_LABEL[family], lang),
    n: entry.n,
    dispositions: disps.map((x) => ({ id: libraryId(entry, x), label: pickT(x.label, lang), preview: thumbSvg(x.thumb) })),
  }));
}

/** Type de section et réglages d'un identifiant de galerie (« fam:… ») ou d'un type de section direct. */
export function resolveLibraryType(id: string): { type: string; settings: Record<string, unknown>; blocks?: { type: string; settings: Record<string, unknown> }[]; entryKey?: string; dispositionId?: string } {
  const parsed = parseLibraryId(id);
  if (!parsed) return { type: id, settings: {} };
  const blocks = parsed.disposition.blocks?.map((b) => ({ type: b.type, settings: { ...(b.settings ?? {}) } }));
  return { type: parsed.disposition.type, settings: { ...(parsed.disposition.settings ?? {}) }, ...(blocks ? { blocks } : {}), entryKey: parsed.entry.key, dispositionId: parsed.disposition.id };
}
