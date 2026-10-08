/**
 * Maillage interne : suggestions de liens d'un contenu vers les autres pages du site. Jamais d'adresse inventée :
 * une page EXISTANTE est proposée avec son adresse réelle ; une page PRÉVUE est signalée « à lier quand elle sera
 * créée » (aucun lien publié vers une page qui n'existe pas).
 */
import { blockText } from "./doc";
import { fold } from "./lang";
import type { ContentDoc, PageRef } from "./types";

export type LinkSuggestion = { to: PageRef; anchor: string; blockId: string | null; status: "existing" | "planned"; note: string };

const STOP = new Set(["les", "des", "une", "pour", "avec", "and", "the", "for", "con", "para", "los", "las"]);
const keyWords = (s: string) => fold(s).split(/[^a-z0-9]+/).filter((w) => w.length > 3 && !STOP.has(w));

export function suggestLinks(doc: ContentDoc, pages: PageRef[], max = 6): LinkSuggestion[] {
  const out: LinkSuggestion[] = [];
  const already = new Set([...doc.blocks.flatMap((b) => [...blockText(b).matchAll(/\]\(([^)]+)\)/g)].map((m) => m[1]))]);
  for (const pg of pages) {
    if (pg.key === doc.page.key || (pg.url && already.has(pg.url)) || out.some((o) => o.to.title === pg.title)) continue;
    const kw = keyWords(pg.title);
    if (!kw.length) continue;
    // Bloc qui parle de cette page : tous ses mots significatifs (ou au moins deux) y figurent.
    const hit = doc.blocks.find((b) => b.kind !== "h1" && b.kind !== "cta" && (() => {
      const t = fold(blockText(b));
      const n = kw.filter((w) => t.includes(w)).length;
      return n === kw.length || n >= 2;
    })());
    const relevant = hit || (doc.type === "blog_article" && (pg.kind === "product" || pg.kind === "service"));
    if (!relevant) continue;
    out.push({
      to: pg,
      anchor: pg.title,
      blockId: hit?.id ?? null,
      status: pg.status,
      note: pg.status === "existing" ? `lien vers ${pg.url}` : "page prévue : à lier quand elle sera créée (aucune adresse pour l'instant)",
    });
    if (out.length >= max) break;
  }
  return out;
}
