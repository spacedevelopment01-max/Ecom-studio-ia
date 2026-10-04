/**
 * Rendu anglais des médias de l'accueil (LANG=en) : suffixe des fichiers produits et liste des images
 * de démonstration déjà déclinées en anglais (public/demo/**\/*.en.*), que les pages substituent
 * aux versions françaises (voir scripts/film/lang.js).
 */
import fs from "node:fs";
import path from "node:path";

export const EN = process.env.LANG === "en";
/** "" en français, ".en" en anglais : film-court.mp4 → film-court.en.mp4. */
export const SUFFIX = EN ? ".en" : "";
/** Paramètre d'URL des pages HTML. */
export const QUERY = EN ? "lang=en" : "";

export function enAssets(): string[] {
  const root = path.join(process.cwd(), "public", "demo");
  if (!EN || !fs.existsSync(root)) return [];
  return (fs.readdirSync(root, { recursive: true }) as string[]).filter((f) => /\.en\.\w+$/.test(f)).map((f) => f.split(path.sep).join("/"));
}
