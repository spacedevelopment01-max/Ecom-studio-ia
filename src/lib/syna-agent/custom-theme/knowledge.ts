/**
 * Le savoir des spécialistes du thème sur mesure (13 novembre 2026, demande du propriétaire : « tu n'as pas été sur
 * internet contrôler 1000 thèmes pour pas que sina s'en servent »). Les cahiers de métier `docs/sina-savoir/theme-*.md`
 * viennent de neuf recherches et de 1 072 sites relevés ; chaque spécialiste lit LES SIENS à chaque projet, sans la
 * liste des sources (utile aux humains, pas au modèle). Les références du secteur et les chiffres de l'atlas arrivent,
 * eux, par la documentaliste (references.ts).
 *
 * Les cahiers sont posés à la fin de la consigne de chaque spécialiste : le fournisseur garde cette consigne en mémoire
 * quelques minutes, si bien que les appels qui se suivent (une section après l'autre) relisent le cahier pour un dixième
 * du prix. Un cahier absent n'est jamais remplacé en silence : le travail s'arrête avant tout appel payant et le dit.
 */
import fs from "node:fs";
import path from "node:path";
import { estimateTaskMicro } from "../../ai/estimate";
import type { TaskId } from "../../ai/config";
import { brandKnowledgeDir, withoutSources } from "../brand-knowledge";

export const THEME_BOOKS = {
  pages: { file: "theme-construction-des-pages.md", title: "CONSTRUIRE LES PAGES D'UN SITE" },
  gestes: { file: "theme-repertoire-gestes-et-ouvertures.md", title: "GESTES DE SIGNATURE ET FORMES D'OUVERTURE" },
  miseEnPage: { file: "theme-mise-en-page-et-mouvement.md", title: "MISE EN PAGE ET MOUVEMENT" },
  originalite: { file: "theme-originalite-et-signature.md", title: "ORIGINALITÉ ET SIGNATURE" },
  achat: { file: "theme-pieces-achat.md", title: "LES PIÈCES DE L'ACHAT" },
  catalogue: { file: "theme-pieces-catalogue.md", title: "LES PIÈCES DU CATALOGUE" },
  textes: { file: "theme-textes.md", title: "ÉCRIRE LES TEXTES D'UN SITE" },
  images: { file: "theme-images.md", title: "LES IMAGES D'UN SITE" },
} as const;
export type ThemeBook = keyof typeof THEME_BOOKS;

/** Les spécialistes du thème, et ce que chacun lit. */
export const THEME_READS = {
  /** Conçoit le site : pages, sections, constructions, tenue. */
  concepteur: ["pages", "gestes", "miseEnPage"],
  /** Relit la conception en directeur commercial, et la corrige. */
  relecteur: ["pages", "achat", "catalogue"],
  /** Juge l'originalité d'un concept, sans le réécrire. */
  juge: ["originalite"],
  /** Fait le plan des textes, puis écrit chaque section. */
  redacteur: ["textes"],
  /** Relit tous les textes du site avant le client. */
  relecteurTextes: ["textes"],
  /** Décrit les photos, puis relit toutes les descriptions avant qu'une seule soit payée. */
  directriceArtistique: ["images"],
} as const satisfies Record<string, readonly ThemeBook[]>;
export type ThemeSpecialist = keyof typeof THEME_READS;

/** Plafond par cahier (caractères) : un cahier qui grossit ne fait pas exploser le coût de chaque projet. */
export const MAX_THEME_BOOK_CHARS = 20_000;

/**
 * Un cahier tel que le lit un spécialiste : sans ses sources, sans les repères de source (« [S12] », « (lu) »), sans
 * adresse de site, et sans les notes laissées au propriétaire (points à trancher, désaccords entre les sources).
 */
export function forModel(md: string): string {
  return withoutSources(md)
    .replace(/\n##\s+(?:Points à trancher|Désaccords)[^\n]*\n[\s\S]*?(?=\n##\s|$)/g, "\n")
    .replace(/\s?\[S\d+(?:\s?(?:,|à|et)\s?S\d+)*\]/g, "")
    .replace(/\s?\((?:lu|vu|déduit)\)/g, "")
    .replace(/https?:\/\/[^\s)]+/g, "")
    .replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

const cache = new Map<string, string>();
/** Texte d'un cahier, sans ses sources ni ses adresses ; erreur claire s'il manque. */
export function themeBook(book: ThemeBook): string {
  const file = path.join(brandKnowledgeDir(), THEME_BOOKS[book].file);
  const hit = cache.get(file);
  if (hit) return hit;
  let md: string;
  try { md = fs.readFileSync(file, "utf8"); } catch { throw new Error(`Cahier de métier introuvable : ${file}. Le thème sur mesure ne se conçoit pas sans lui.`); }
  // Coupé à la fin d'un paragraphe : jamais une phrase tronquée au milieu.
  const all = forModel(md);
  const text = all.length <= MAX_THEME_BOOK_CHARS ? all : all.slice(0, all.lastIndexOf("\n\n", MAX_THEME_BOOK_CHARS)).trim();
  if (text.length < 2000) throw new Error(`Cahier de métier trop court ou vide : ${file}.`);
  cache.set(file, text);
  return text;
}

/** Tous les cahiers d'un spécialiste, annoncés pour ce qu'ils sont. */
export function themeKnowledge(who: ThemeSpecialist): string {
  const books = THEME_READS[who].map((b) => `══ CAHIER : ${THEME_BOOKS[b].title} ══\n${themeBook(b)}`);
  return `TON SAVOIR DE MÉTIER (cahiers tirés de l'étude de plus de mille sites : démonstrations de thèmes, vraies boutiques de marques, sites de services). Sers-t'en comme un professionnel se sert de son expérience : pour décider, jamais pour réciter. Tu ne cites aucun site, aucune marque ni aucun thème de ces cahiers, et tu ne recopies aucun de leurs exemples : tu en gardes les principes. Les règles données plus haut et les faits de la marque passent toujours avant.\n\n${books.join("\n\n")}`;
}
/** La consigne d'un spécialiste, suivie de ses cahiers. */
export const educated = (system: string, who: ThemeSpecialist) => `${system}\n\n${themeKnowledge(who)}`;

/** Tous les cahiers du thème sont-ils lisibles ? (contrôle gratuit avant tout appel payant) */
export function themeKnowledgeReady(): { ok: true } | { ok: false; reason: string } {
  try { for (const b of Object.keys(THEME_BOOKS) as ThemeBook[]) themeBook(b); return { ok: true }; } catch (e) { return { ok: false, reason: (e as Error).message }; }
}

/** Jetons d'entrée ajoutés par les cahiers d'un spécialiste (estimation prudente : un jeton pour 3 caractères). */
export const knowledgeTokens = (who: ThemeSpecialist) => Math.ceil(themeKnowledge(who).length / 3);
/**
 * Coût probable (micro-euros) de la lecture des cahiers sur `calls` appels qui se suivent : le premier au plein tarif,
 * les suivants relus dans la mémoire du fournisseur (un dixième du prix).
 */
export function knowledgeTypicalMicro(who: ThemeSpecialist, task: TaskId, calls = 1): number {
  if (calls <= 0) return 0;
  return Math.round(estimateTaskMicro(task, { input: knowledgeTokens(who) }) * (1 + 0.1 * (calls - 1)));
}
/** Coût au plus (micro-euros) : chaque appel au tarif d'écriture en mémoire (le plus cher), avec une marge de change. */
export const knowledgeCapMicro = (who: ThemeSpecialist, task: TaskId, calls = 1) => (calls <= 0 ? 0 : Math.round(estimateTaskMicro(task, { input: knowledgeTokens(who) }) * 1.25 * 1.1 * calls));
