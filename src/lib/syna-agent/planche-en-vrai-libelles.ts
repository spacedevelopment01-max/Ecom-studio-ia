/**
 * LES NOMS LISIBLES DES CASES DE LA PLANCHE EN VRAI (25 novembre 2026, onglet Marque de Racine : « Ce que SINA n'a pas pu
 * réussir » affichait « ouverture-planche, produit-1, reference-6 »). Le client ne lit jamais l'identifiant technique
 * d'une case (les clés de assets/planche-de-marque/cases.json, les versions du logo) : il lit le nom déjà utilisé sous la
 * planche, en français ou en anglais.
 *
 * Module sans dépendance lourde : lu par l'onglet Marque, le fil de SINA et ce que SINA dit.
 */
import { L } from "../i18n-server";

/** Les 17 images de la planche (planche-en-vrai.ts, ELEMENTS), avec leur nom lisible. */
export const LIBELLES_DES_ELEMENTS: Record<string, { fr: string; en: string }> = {
  "publication-1x1": { fr: "Publication carrée", en: "Square post" },
  "publication-4x5": { fr: "Publication portrait", en: "Portrait post" },
  "publication-9x16": { fr: "Story", en: "Story" },
  "ouverture-site": { fr: "Ouverture du site (1920 × 720)", en: "Site hero (1920 × 720)" },
  "ouverture-planche": { fr: "Bandeau de la planche", en: "Board banner" },
  "site-ordinateur": { fr: "Site sur ordinateur", en: "Site on desktop" },
  "site-telephone": { fr: "Site sur téléphone", en: "Site on phone" },
  emballage: { fr: "Emballage et supports", en: "Packaging" },
  ...Object.fromEntries([1, 2, 3].map((i) => [`produit-${i}`, { fr: `Produit ${i}`, en: `Product ${i}` }])),
  ...Object.fromEntries([1, 2, 3, 4, 5, 6].map((i) => [`reference-${i}`, { fr: `Image de référence ${i}`, en: `Reference image ${i}` }])),
};
/** Les autres cases de la planche (titres, tuiles du logo, blocs du code) et les versions du logo, si un texte les nomme. */
const AUTRES_CASES: Record<string, { fr: string; en: string }> = {
  ...Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`titre-${String(i + 1).padStart(2, "0")}`, { fr: `Titre ${i + 1} de la planche`, en: `Board title ${i + 1}` }])),
  ...Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`logo-${i + 1}`, { fr: `Logo ${i + 1} de la planche`, en: `Board logo ${i + 1}` }])),
  "logo-principal": { fr: "Logo principal", en: "Main logo" }, "logo-horizontal": { fr: "Logo horizontal", en: "Horizontal logo" },
  "logo-empile": { fr: "Logo empilé", en: "Stacked logo" }, "logo-compact": { fr: "Logo compact", en: "Compact logo" },
  "monochrome-fonce": { fr: "Monochrome foncé", en: "Dark monochrome" }, "monochrome-clair": { fr: "Monochrome clair", en: "Light monochrome" },
};

/** Le nom lisible d'une case (dans la langue du client) ; une case inconnue garde son nom, jamais vide. */
export function libelleDeLElement(n: string): string {
  const l = LIBELLES_DES_ELEMENTS[n] ?? AUTRES_CASES[n];
  return l ? L(l.fr, l.en) : n;
}

const TOUTES = Object.keys({ ...LIBELLES_DES_ELEMENTS, ...AUTRES_CASES }).sort((a, b) => b.length - a.length);
const MOTIF = new RegExp(`(?<![\\p{L}\\p{N}_-])(${TOUTES.join("|")})(?![\\p{L}\\p{N}_-])`, "gu");

/**
 * Un texte montré au client, sans aucun identifiant technique de case : chaque identifiant est remplacé par son nom
 * lisible. Sert aux textes déjà enregistrés (une planche en vrai faite avant cette règle les porte encore).
 */
export function sansIdentifiantsDeCase(texte: string): string {
  return String(texte ?? "").replace(MOTIF, (k) => libelleDeLElement(k));
}
