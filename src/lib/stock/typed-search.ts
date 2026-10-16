/**
 * Recherche tapée par le client dans les banques libres de droits (Pixabay), commune aux vidéos et aux images :
 *  - le texte est cherché TEL QUEL, en anglais et en français ;
 *  - recherche élargie (case cochée) : chaque mot est aussi cherché seul, et un seul mot cité suffit ;
 *  - silhouettes acceptées (case cochée, projet sans personnes) : une personne de dos ou dans l'ombre, visage non
 *    visible, d'après les mots-clés de la banque. Un visage reconnaissable reste toujours écarté.
 */

const SILHOUETTE_RE = /\b(silhouettes?|shadows?|from behind|back view|rear view|backlit|hooded|hoods?|cloaked|ombres?|de dos|contre-jour|capuche)\b/i;
const FACE_RE = /\b(faces?|portraits?|selfies?|smil(e|es|ing)|close-?ups?|eyes|looking at (the )?camera|visages?|sourires?|gros plan)\b/i;
/** Mots-clés d'un média : une personne, mais seulement en silhouette (de dos, dans l'ombre), sans visage cité. */
export const silhouetteOnly = (alt: string) => SILHOUETTE_RE.test(alt) && !FACE_RE.test(alt);

const STOP = new Set(["les", "des", "une", "est", "avec", "pour", "dans", "sur", "par", "aux", "the", "and", "with", "for", "from", "into", "dun", "dune", "video", "videos", "plan", "plans", "photo", "photos", "image", "images"]);
/** Mots significatifs d'un texte tapé (« escape game » → escape, game ; « porte d'entrée » → porte, entree). */
export function typedWords(text: string): string[] {
  const t = text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\b[dlj]'/g, " ");
  return [...new Set(t.split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && !STOP.has(w)))].slice(0, 6);
}

/** Les mots-clés d'un média citent-ils les mots tapés (tous, ou un seul en recherche élargie) ? Pluriels acceptés. */
export function citesTyped(alt: string, words: string[], any = false): boolean {
  if (!words.length) return false;
  const a = ` ${alt.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ")} `;
  const one = (w: string) => a.includes(` ${w} `) || a.includes(` ${w}s `) || a.includes(` ${w}es `) || a.includes(` ${w}x `);
  // Féminin français : « secrète » cite aussi « secret ».
  const has = (w: string) => one(w) || (w.length > 4 && w.endsWith("e") && one(w.slice(0, -1)));
  return any ? words.some(has) : words.every(has);
}

/** Requêtes d'un texte tapé : tel quel en anglais puis en français ; en recherche élargie, chacun de ses mots seul. */
export function typedQueries(typed: string, broad = false): { q: string; lang: "en" | "fr" }[] {
  const t = typed.trim();
  if (!t) return [];
  const words = typedWords(t);
  return [{ q: t, lang: "en" }, { q: t, lang: "fr" }, ...(broad && words.length > 1 ? words.map((w) => ({ q: w, lang: "en" as const })) : [])];
}
