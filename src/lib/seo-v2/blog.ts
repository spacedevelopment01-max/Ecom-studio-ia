/**
 * Blog V2 : sujets → intention → mot-clé → plan → rédaction → relecture → vérification des faits → contrôle SEO →
 * liens internes → brouillon éditable. Les sujets viennent des groupes de la stratégie (aucune cannibalisation
 * avec une page existante) ; aucun minimum de mots n'est imposé (pas de remplissage) ; le brouillon est rangé dans
 * le blog existant (onglet Blog : relecture, couverture, publication) ET dans les documents éditables V2.
 */
import crypto from "node:crypto";
import { one, now, run } from "../db";
import { consumeQuota } from "../quotas";
import { blogPlanReason, pickCover, uniqueSlug } from "../engine/blog";
import type { Project } from "../projects";
import { blockText, stripInline, toHtml } from "./doc";
import { fold } from "./lang";
import type { ContentDoc, SeoStrategy } from "./types";

export type BlogTopicV2 = { title: string; keyword: string; intent: string; week: number; why: string; covered: boolean };

/** Sujets d'articles : calendrier de la stratégie ; un sujet déjà traité par un article existant est signalé. */
export function blogTopicsV2(p: Project, strategy: SeoStrategy): BlogTopicV2[] {
  const existing = new Set(
    (one<{ t: string }>("SELECT group_concat(lower(title), '|') t FROM blog_articles WHERE project_id = ? AND deleted_at IS NULL", p.id)?.t ?? "")
      .split("|")
      .filter(Boolean)
      .map(fold),
  );
  return strategy.calendar.map((c) => ({
    title: c.title,
    keyword: c.keyword,
    intent: c.intent,
    week: c.week,
    why: strategy.business === "services" ? "question que vos clients se posent avant de vous contacter" : "recherche d'information avant l'achat, reliée à la fiche produit",
    covered: existing.has(fold(c.title)),
  }));
}

/** Identifiant stable de l'article du blog lié à un document V2. */
export const blogIdFor = (docKey: string) => `b2${crypto.createHash("sha256").update(docKey).digest("hex").slice(0, 20)}`;

/** Les articles écrits par l'IA suivent le forfait (comme le blog existant) ; un brouillon local reste gratuit. */
export const blogAiAllowed = (userId: string) => blogPlanReason(userId) == null;

/** Range (ou met à jour) le brouillon dans le blog existant ; un article publié reste publié (statut « prêt »). */
export function saveBlogDraftV2(p: Project, docKey: string, doc: ContentDoc, o: { notes: string[]; ai: boolean; jobKey: string }) {
  const articleId = blogIdFor(docKey);
  const prev = one<{ slug: string; status: string; cover_asset_id: string | null }>("SELECT slug, status, cover_asset_id FROM blog_articles WHERE id = ?", articleId);
  const h1 = doc.blocks.find((b) => b.kind === "h1");
  const title = h1 ? stripInline(blockText(h1)) : doc.page.title;
  const body = toHtml({ blocks: doc.blocks.filter((b) => b.kind !== "h1") });
  const firstP = doc.blocks.find((b) => b.kind === "p" && !/^\[(À|A) compléter|^\[To complete|^\[Por completar/.test(b.text));
  const excerpt = (firstP ? stripInline(blockText(firstP)) : doc.meta.metaDescription).slice(0, 300);
  const slug = prev?.status === "published" ? prev.slug : uniqueSlug(p.id, doc.meta.slug || title, articleId);
  const t = now();
  run(
    `INSERT INTO blog_articles (id, project_id, user_id, title, slug, meta_title, meta_description, excerpt, body_html, tags, cover_asset_id, language, status, qc_notes, keyword, search_intent, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'draft',?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET title = excluded.title, slug = excluded.slug, meta_title = excluded.meta_title, meta_description = excluded.meta_description, excerpt = excluded.excerpt,
       body_html = excluded.body_html, language = excluded.language, status = CASE WHEN blog_articles.published_url IS NOT NULL THEN 'ready' ELSE 'draft' END, qc_notes = excluded.qc_notes, keyword = excluded.keyword, updated_at = excluded.updated_at`,
    articleId, p.id, p.userId, title, slug, doc.meta.seoTitle, doc.meta.metaDescription, excerpt, body, "[]", prev?.cover_asset_id ?? pickCover(p.id), doc.lang, JSON.stringify(o.notes.slice(0, 30)), doc.primaryKeyword, "informational", t, t,
  );
  // Un article écrit par l'IA = 1 article du forfait, décompté une seule fois par rédaction.
  if (o.ai) consumeQuota(p.userId, "blog", 1, `blog2:${o.jobKey}:${docKey}`);
  return articleId;
}
