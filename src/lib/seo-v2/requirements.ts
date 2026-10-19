/** Contrôles déterministes des formulations/longueurs explicites. Le reste reste à vérifier, jamais deviné. */
import { blockText, plainText, wordCount } from "./doc";
import type { ContentBrief, ContentDoc } from "./types";

const number = (s: string) => Number(s) || ({ un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10, one: 1, two: 2, three: 3, four: 4, five: 5 } as Record<string, number>)[s.toLowerCase()];
export function requirementsOf(request: string): NonNullable<ContentBrief["requirements"]> {
  const exact: string[] = [], forbidden: string[] = [];
  let ending: string | undefined;
  for (const m of request.matchAll(/([^.!?\n]*?)[«“"]([^»”"]+)[»”"]/g)) {
    const quoted = m[2].trim();
    if (/interdi|jamais|ne pas|sans le mot|forbid|never|do not|don't/i.test(m[1])) forbidden.push(quoted);
    else if (/termin|derni[eè]re|finir|end|last/i.test(m[1])) { exact.push(quoted); ending = quoted; }
    else if (/exact|impos|inclu|mot pour mot|verbatim|contien|must/i.test(m[1])) exact.push(quoted);
  }
  const length = request.match(/(?:exactement|exactly)\s+(\d+|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|one|two|three|four|five)\s+(phrases?|sentences?|mots?|words?)/i);
  return { exact, forbidden, ...(ending ? { ending } : {}), ...(length ? { [/phrase|sentence/i.test(length[2]) ? "sentences" : "words"]: number(length[1]) } : {}), unchecked: request.trim() ? ["Les autres consignes libres (ton, style, pertinence et sens) demandent une relecture."] : [] };
}

export function checkRequirements(doc: ContentDoc, r?: ContentBrief["requirements"]) {
  const checked: string[] = [], issues: string[] = [];
  const text = `${plainText(doc)}\n${doc.meta.seoTitle}\n${doc.meta.metaDescription}`;
  const prose = doc.blocks.filter((b) => b.kind === "p").map(blockText).join(" ").trim();
  if (r) {
    for (const t of r.exact) { checked.push(`texte exact : ${t}`); if (!text.includes(t)) issues.push(`formulation exacte absente : « ${t} »`); }
    for (const t of r.forbidden) { checked.push(`interdit : ${t}`); if (text.toLocaleLowerCase().includes(t.toLocaleLowerCase())) issues.push(`formulation interdite présente : « ${t} »`); }
    if (r.ending) { checked.push("fin du corps rédactionnel"); if (!prose.endsWith(r.ending)) issues.push(`le corps doit se terminer par « ${r.ending} »`); }
    if (r.sentences) { const n = prose.split(/(?<=[.!?…])\s+/).filter(Boolean).length; checked.push("nombre de phrases du corps rédactionnel"); if (n !== r.sentences) issues.push(`${r.sentences} phrases demandées dans les paragraphes, ${n} obtenues`); }
    if (r.words) { const n = wordCount(prose); checked.push("nombre de mots du corps rédactionnel"); if (n !== r.words) issues.push(`${r.words} mots demandés dans les paragraphes, ${n} obtenus`); }
  }
  return { checked, issues, unchecked: r?.unchecked ?? [] };
}

/** Localise la retouche : fin dans le dernier paragraphe, interdiction dans son bloc, longueur sur le corps. */
export function requirementTargets(doc: ContentDoc, r?: ContentBrief["requirements"]) {
  if (!r) return [];
  const paragraphs = doc.blocks.filter((b) => b.kind === "p");
  const last = paragraphs.at(-1)?.id;
  const ids = new Set<string>();
  const prose = paragraphs.map(blockText).join(" ").trim();
  if ((r.ending && !prose.endsWith(r.ending)) || r.exact.some((t) => !`${plainText(doc)}\n${doc.meta.seoTitle}\n${doc.meta.metaDescription}`.includes(t))) if (last) ids.add(last);
  if ((r.sentences && prose.split(/(?<=[.!?…])\s+/).filter(Boolean).length !== r.sentences) || (r.words && wordCount(prose) !== r.words)) paragraphs.forEach((b) => ids.add(b.id));
  for (const t of r.forbidden) {
    for (const b of doc.blocks) if (blockText(b).toLocaleLowerCase().includes(t.toLocaleLowerCase())) ids.add(b.id);
    if (`${doc.meta.seoTitle}\n${doc.meta.metaDescription}`.toLocaleLowerCase().includes(t.toLocaleLowerCase())) ids.add("meta");
  }
  return [...ids];
}
