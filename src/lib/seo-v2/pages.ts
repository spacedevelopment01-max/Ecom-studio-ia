/**
 * Pages du site : EXISTANTES (vues dans la boutique ou le site créé par le studio) et PRÉVUES (proposées par la
 * stratégie, pas encore créées). Les deux ne sont jamais confondues : un lien vers une page prévue est signalé
 * comme tel et n'est pas publié tant que la page n'existe pas. Aucune URL n'est inventée pour une page prévue.
 */
import type { Project } from "../projects";
import { storeLinks } from "../engine/blog";
import { all } from "../db";
import { fold } from "./lang";
import type { PageRef } from "./types";

const key = (kind: string, name: string) => `${kind}:${fold(name).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60)}`;

export function existingPages(projectId: string): PageRef[] {
  const out: PageRef[] = storeLinks(projectId).map((l) => ({ key: key(l.kind, l.title), title: l.title, url: l.url, kind: l.kind, status: "existing" as const }));
  for (const a of all<{ title: string; slug: string; status: string }>("SELECT title, slug, status FROM blog_articles WHERE project_id = ? AND deleted_at IS NULL", projectId))
    out.push({ key: key("article", a.title), title: a.title, url: a.status === "published" ? `/blogs/journal/${a.slug}` : null, kind: "article", status: a.status === "published" ? "existing" : "planned" });
  return out;
}

/** Pages prévues par type de projet (jamais d'URL inventée : `url` reste null jusqu'à leur création). */
export function plannedPages(p: Project): PageRef[] {
  const planned: PageRef[] = [{ key: "home:accueil", title: p.brand?.name ?? p.name, url: null, kind: "home", status: "planned" }];
  if (p.business === "services") {
    for (const s of p.services.services.filter((x) => x.name.trim())) planned.push({ key: key("service", s.name), title: s.name.trim(), url: null, kind: "service", status: "planned" });
    if (p.services.area?.trim()) planned.push({ key: "local:zone", title: p.services.area.trim(), url: null, kind: "local", status: "planned" });
  } else {
    if (p.catalog.length) {
      for (const c of p.catalog) planned.push({ key: key("product", c.name), title: c.name, url: null, kind: "product", status: "planned" });
      for (const cat of [...new Set(p.catalog.map((c) => c.category.trim()).filter(Boolean))]) planned.push({ key: key("collection", cat), title: cat, url: null, kind: "collection", status: "planned" });
    } else planned.push({ key: key("product", p.product.name || p.name), title: p.product.name || p.name, url: null, kind: "product", status: "planned" });
  }
  planned.push({ key: "brand:a-propos", title: p.brand?.name ?? p.name, url: null, kind: "brand", status: "planned" });
  return planned;
}

/** Toutes les pages : une page prévue qui existe déjà (même titre, même nature) prend le statut et l'URL réels. */
export function sitePages(p: Project): PageRef[] {
  const existing = existingPages(p.id);
  const seen = new Set(existing.map((e) => `${e.kind === "collection" ? "collection" : e.kind}:${fold(e.title)}`));
  const planned = plannedPages(p).filter((x) => !seen.has(`${x.kind}:${fold(x.title)}`));
  return [...existing, ...planned];
}
