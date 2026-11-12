/**
 * Savoir des spécialistes de la marque : les cahiers de métier de `docs/sina-savoir/` (noms, idée de marque, slogans
 * et ton, identité visuelle), relus à chaque projet. Chaque spécialiste de la chaîne lit SON cahier, sans la liste
 * des sources (utile aux humains, pas au modèle).
 *
 * Un cahier absent n'est jamais remplacé en silence : la chaîne s'arrête avant tout appel payant et le dit.
 */
import fs from "node:fs";
import path from "node:path";

export const BRAND_BOOKS = {
  noms: "noms-de-marque.md",
  idee: "idee-de-marque.md",
  voix: "slogans-et-ton.md",
  signes: "identite-visuelle.md",
} as const;
export type BrandBook = keyof typeof BRAND_BOOKS;

export const brandKnowledgeDir = () => process.env.SINA_SAVOIR_DIR ?? path.join(process.cwd(), "docs", "sina-savoir");

/** Plafond par cahier (caractères) : un cahier qui grossit ne fait pas exploser le coût de chaque projet. */
export const MAX_BOOK_CHARS = 22_000;

const cache = new Map<string, string>();

/** Texte d'un cahier, sans titre de sources ni liens ; erreur claire s'il manque. */
export function brandBook(book: BrandBook): string {
  const file = path.join(brandKnowledgeDir(), BRAND_BOOKS[book]);
  const hit = cache.get(file);
  if (hit) return hit;
  let md: string;
  try { md = fs.readFileSync(file, "utf8"); } catch { throw new Error(`Cahier de métier introuvable : ${file}. La création de la marque ne peut pas commencer sans lui.`); }
  const text = withoutSources(md).slice(0, MAX_BOOK_CHARS).trim();
  if (text.length < 2000) throw new Error(`Cahier de métier trop court ou vide : ${file}.`);
  cache.set(file, text);
  return text;
}

/** Coupe la partie « Sources » (toujours la dernière) et retire les adresses des liens gardés dans le texte. */
export function withoutSources(md: string): string {
  const lines = md.split("\n");
  const cut = lines.findIndex((l) => /^##\s+Sources\b/i.test(l));
  return (cut < 0 ? lines : lines.slice(0, cut)).join("\n").replace(/\[([^\]]+)\]\(https?:\/\/[^)]+\)/g, "$1");
}

/** Tous les cahiers sont-ils lisibles ? (contrôle gratuit avant de lancer la chaîne) */
export function brandKnowledgeReady(): { ok: true } | { ok: false; reason: string } {
  try { for (const b of Object.keys(BRAND_BOOKS) as BrandBook[]) brandBook(b); return { ok: true }; } catch (e) { return { ok: false, reason: (e as Error).message }; }
}
