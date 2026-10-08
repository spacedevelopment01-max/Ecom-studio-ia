/**
 * Audit SEO technique : ce que le studio peut vérifier LOCALEMENT sur ses propres contenus (titre, méta, H1,
 * H2/H3, canonique proposée, robots, données structurées, textes alternatifs des images, liens internes, doublons)
 * et ce qui demande une exploration du site en ligne (indexation, sitemap, robots.txt, redirections, codes HTTP,
 * vitesse). Le studio ne prétend JAMAIS qu'une page est indexée : il n'a pas cette information.
 */
import { all } from "../db";
import { META_DESC_TARGET, SEO_TITLE_TARGET } from "./doc";
import { fold } from "./lang";
import type { ContentDoc, PageRef } from "./types";

export type TechStatus = "ok" | "issue" | "needs_crawl";
export type TechItem = { check: string; status: TechStatus; detail: string; page?: string };

/** Contrôles qui demandent le site en ligne : jamais conclus par le studio. */
export const NEEDS_CRAWL = [
  { check: "indexation", detail: "Indexation par les moteurs : à vérifier dans Google Search Console (le studio ne le sait pas)." },
  { check: "sitemap", detail: "Plan du site (sitemap.xml) : généré par la plateforme ; présence et contenu à vérifier en ligne." },
  { check: "robots.txt", detail: "Fichier robots.txt : à vérifier en ligne." },
  { check: "redirections", detail: "Redirections (anciennes adresses, http → https) : à vérifier par une exploration du site." },
  { check: "codes HTTP", detail: "Pages en erreur (404, 500) : à vérifier par une exploration du site." },
  { check: "vitesse", detail: "Vitesse et Core Web Vitals : à mesurer sur le site en ligne." },
] as const;

export function auditDocs(docs: ContentDoc[], pages: PageRef[]): TechItem[] {
  const items: TechItem[] = [];
  const urls = new Set(pages.filter((p) => p.status === "existing" && p.url).map((p) => p.url!));
  const titles = new Map<string, string[]>();
  for (const d of docs) {
    const name = d.page.title;
    const t = d.meta.seoTitle.trim();
    items.push(!t ? { check: "title", status: "issue", detail: "titre SEO absent", page: name } : t.length > SEO_TITLE_TARGET ? { check: "title", status: "issue", detail: `${t.length} caractères (${SEO_TITLE_TARGET} visés)`, page: name } : { check: "title", status: "ok", detail: `${t.length} caractères`, page: name });
    if (t) titles.set(fold(t), [...(titles.get(fold(t)) ?? []), name]);
    const m = d.meta.metaDescription.trim();
    items.push(!m ? { check: "meta description", status: "issue", detail: "absente", page: name } : m.length > META_DESC_TARGET ? { check: "meta description", status: "issue", detail: `${m.length} caractères (${META_DESC_TARGET} visés)`, page: name } : { check: "meta description", status: "ok", detail: `${m.length} caractères`, page: name });
    const h1 = d.blocks.filter((b) => b.kind === "h1").length;
    if (!["faq", "metadata", "ad_copy"].includes(d.type)) items.push({ check: "H1", status: h1 === 1 ? "ok" : "issue", detail: h1 === 1 ? "un seul H1" : `${h1} H1`, page: name });
    let lastH = 1;
    let skip = false;
    for (const b of d.blocks) {
      if (b.kind === "h3" && lastH < 2) skip = true;
      if (b.kind === "h2" || b.kind === "h3") lastH = b.kind === "h2" ? 2 : 3;
    }
    items.push({ check: "H2/H3", status: skip ? "issue" : "ok", detail: skip ? "H3 sans H2 au-dessus" : "hiérarchie respectée", page: name });
    items.push({ check: "canonique", status: d.meta.canonical ? "ok" : "needs_crawl", detail: d.meta.canonical ? `proposée : ${d.meta.canonical}` : "page pas encore en ligne : canonique fixée par la plateforme à la publication", page: name });
    items.push({ check: "robots", status: "ok", detail: `balise proposée : ${d.meta.robots}`, page: name });
    items.push({ check: "données structurées", status: d.schema.length ? "ok" : "issue", detail: d.schema.length ? `${d.schema.map((s) => s["@type"]).join(", ")} (faits confirmés uniquement ; validation Google non effectuée)` : "aucune", page: name });
    const bad = d.blocks.flatMap((b) => [...JSON.stringify(b).matchAll(/\]\(([^)]+)\)/g)].map((x) => x[1])).filter((u) => !urls.has(u));
    items.push({ check: "liens internes", status: bad.length ? "issue" : "ok", detail: bad.length ? `liens vers des pages inconnues : ${bad.join(", ")}` : "liens vers des pages existantes uniquement", page: name });
  }
  for (const [, names] of titles) if (names.length > 1) items.push({ check: "doublons", status: "issue", detail: `même titre SEO pour : ${names.join(", ")}` });
  return items;
}

/** Textes alternatifs des images des articles déjà enregistrés (vérifiable localement). */
export function auditBlogImages(projectId: string): TechItem[] {
  const out: TechItem[] = [];
  for (const a of all<{ title: string; body_html: string | null }>("SELECT title, body_html FROM blog_articles WHERE project_id = ? AND deleted_at IS NULL", projectId)) {
    const imgs = [...(a.body_html ?? "").matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
    const missing = imgs.filter((t) => !/\balt="[^"]+"/i.test(t)).length;
    if (imgs.length) out.push({ check: "alt", status: missing ? "issue" : "ok", detail: missing ? `${missing} image(s) sans texte alternatif` : "textes alternatifs présents", page: a.title });
  }
  return out;
}

export function technicalAudit(projectId: string, docs: ContentDoc[], pages: PageRef[]): { local: TechItem[]; needsCrawl: TechItem[]; note: string } {
  return {
    local: [...auditDocs(docs, pages), ...auditBlogImages(projectId)],
    needsCrawl: NEEDS_CRAWL.map((x) => ({ ...x, status: "needs_crawl" as const })),
    note: "Contrôles locaux sur les contenus du studio. Indexation, sitemap, robots.txt, redirections et vitesse ne sont pas vérifiés (exploration du site en ligne nécessaire).",
  };
}
