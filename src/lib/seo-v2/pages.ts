/**
 * Pages du site : EXISTANTES (vues dans la boutique ou le site créé par le studio) et PRÉVUES (proposées par la
 * stratégie, pas encore créées). Les deux ne sont jamais confondues : un lien vers une page prévue est signalé
 * comme tel et n'est pas publié tant que la page n'existe pas. Aucune URL n'est inventée pour une page prévue.
 */
import { currentTheme, type Project } from "../projects";
import { storeLinks } from "../engine/blog";
import { all } from "../db";
import { fold } from "./lang";
import type { PageRef } from "./types";

export const legacyPageKey = (kind: string, name: string) => `${kind}:${fold(name).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60)}`;
const key = legacyPageKey;

export function existingPages(projectId: string): PageRef[] {
  const cur = currentTheme(projectId);
  const out: PageRef[] = storeLinks(projectId).map((l) => {
    const page = cur?.spec.store.pages.find((p) => l.url === `/pages/${p.handle}`);
    const plan = cur?.spec.meta?.v2?.plan?.find((p) => p.handle === page?.handle);
    const target = page?.contentTarget ?? (plan?.key === "about" ? "brand:a-propos" : null);
    const kind = target?.startsWith("service:") ? "service" : target?.startsWith("brand:") ? "brand" : target?.startsWith("local:") ? "local" : l.kind;
    return { key: target ?? key(l.kind, l.title), title: l.title, url: l.url, kind, status: "existing" as const };
  });
  if (cur) out.unshift({ key: "home:accueil", title: cur.spec.store.shopName, url: "/", kind: "home", status: "existing" });
  for (const a of all<{ title: string; slug: string; status: string }>("SELECT title, slug, status FROM blog_articles WHERE project_id = ? AND deleted_at IS NULL", projectId))
    out.push({ key: key("article", a.title), title: a.title, url: a.status === "published" ? `/blogs/journal/${a.slug}` : null, kind: "article", status: a.status === "published" ? "existing" : "planned" });
  return out;
}

/** Pages prévues par type de projet (jamais d'URL inventée : `url` reste null jusqu'à leur création). */
export function plannedPages(p: Project): PageRef[] {
  const planned: PageRef[] = [{ key: "home:accueil", title: p.brand?.name ?? p.name, url: null, kind: "home", status: "planned" }];
  if (p.business === "services") {
    p.services.services.forEach((s, i) => { if (s.name.trim()) planned.push({ key: `service:${s.key || `legacy-${i}`}`, aliases: [...new Set([s.name, ...(s.contentAliases ?? [])].map((n) => key("service", n)))], title: s.name.trim(), url: null, kind: "service", status: "planned" }); });
    if (p.services.area?.trim()) planned.push({ key: "local:zone", title: p.services.area.trim(), url: null, kind: "local", status: "planned" });
  } else {
    planned.push({ key: "product:main", aliases: [...new Set([p.product.name || p.name, ...(p.product.contentAliases ?? [])].map((n) => key("product", n)))], title: p.product.name || p.name, url: null, kind: "product", status: "planned" });
    if (p.catalog.length) {
      for (const c of p.catalog) planned.push({ key: `product:catalog:${c.key}`, aliases: [...new Set([c.name, ...(c.contentAliases ?? [])].map((n) => key("product", n)))], title: c.name, url: null, kind: "product", status: "planned" });
      for (const cat of [...new Set(p.catalog.map((c) => c.category.trim()).filter(Boolean))]) planned.push({ key: key("collection", cat), title: cat, url: null, kind: "collection", status: "planned" });
    }
  }
  planned.push({ key: "brand:a-propos", title: p.brand?.name ?? p.name, url: null, kind: "brand", status: "planned" });
  return planned;
}

/** Toutes les pages : une page prévue qui existe déjà (même titre, même nature) prend le statut et l'URL réels. */
export function sitePages(p: Project): PageRef[] {
  const existing = existingPages(p.id);
  const planned = plannedPages(p);
  const used = new Set<PageRef>();
  const canonical = planned.map((page) => {
    const hit = existing.find((e) => e.kind === page.kind && (e.key === page.key || page.aliases?.includes(e.key) || fold(e.title) === fold(page.title)));
    if (!hit) return page;
    used.add(hit);
    return { ...page, url: hit.url, status: hit.status };
  });
  return [...canonical, ...existing.filter((e) => !used.has(e)).map((e) => ({ ...e, aliases: [e.key], key: e.url ? `page:${e.url}`.slice(0, 120) : e.key }))];
}

/** Une ancienne clé n'est admise que si elle désigne une cible sans ambiguïté. */
export function resolvePage(pages: PageRef[], key: string): PageRef | null {
  const exact = pages.find((p) => p.key === key);
  if (exact) return exact;
  const aliases = pages.filter((p) => p.aliases?.includes(key));
  return aliases.length === 1 ? aliases[0] : null;
}
