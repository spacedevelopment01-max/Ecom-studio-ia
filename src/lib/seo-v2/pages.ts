/**
 * Pages du site : EXISTANTES (vues dans la boutique ou le site créé par le studio) et PRÉVUES (proposées par la
 * stratégie, pas encore créées). Les deux ne sont jamais confondues : un lien vers une page prévue est signalé
 * comme tel et n'est pas publié tant que la page n'existe pas. Aucune URL n'est inventée pour une page prévue.
 */
import { currentTheme, type Project } from "../projects";
import type { ThemeSpec } from "../theme/spec";
import { all } from "../db";
import { fold } from "./lang";
import type { PageRef } from "./types";

export const legacyPageKey = (kind: string, name: string) => `${kind}:${fold(name).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60)}`;
const key = legacyPageKey;

export function themePages(spec: ThemeSpec): PageRef[] {
  const out: PageRef[] = [];
  out.push({ key: "home:accueil", contentTarget: "home:accueil", title: spec.store.shopName, url: "/", kind: "home", status: "existing" });
  if (spec.store.business !== "services") for (const product of [spec.store.product, ...(spec.store.products ?? [])]) if (product.handle) out.push({ key: product.contentTarget ?? key("product", product.title), ...(product.contentTarget != null ? { contentTarget: product.contentTarget } : {}), title: product.title, url: `/products/${product.handle}`, kind: "product", status: "existing" });
  for (const c of spec.store.collections ?? []) out.push({ key: key("collection", c.title), title: c.title, url: `/collections/${c.handle}`, kind: "collection", status: "existing" });
  for (const page of spec.store.pages) if (page.handle) {
    const plan = spec.meta?.v2?.plan?.find((p: { handle?: string; key: string }) => p.handle === page.handle);
    const target = page.contentTarget ?? (plan?.key === "about" ? "brand:a-propos" : undefined);
    const kind = target?.startsWith("service:") ? "service" : target?.startsWith("brand:") ? "brand" : target?.startsWith("local:") ? "local" : "page";
    out.push({ key: target ?? key("page", page.title), ...(target != null ? { contentTarget: target } : {}), title: page.title, url: `/pages/${page.handle}`, kind, status: "existing" });
  }
  return out;
}

export function existingPages(projectId: string): PageRef[] {
  const cur = currentTheme(projectId);
  const out = cur ? themePages(cur.spec) : [];
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
  planned.push({ key: "contact", title: "Contact", url: null, kind: "page", status: "planned" });
  return planned;
}

/** Association injective : identités d'abord ; titres/alias seulement sans autre propriétaire possible. */
export function associatePages(planned: PageRef[], existing: PageRef[]): Map<string, PageRef> {
  const matches = new Map<string, PageRef>();
  const usedUrls = new Set<string>();
  const uniqueKey = (p: PageRef) => planned.filter((x) => x.key === p.key).length === 1;
  const uniqueUrl = (e: PageRef) => e.url != null && existing.filter((x) => x.url === e.url).length === 1;
  // Une identité explicite, même retirée du projet, ne participe jamais au rapprochement par nom.
  for (const p of planned) {
    const exact = existing.filter((e) => e.contentTarget === p.key && e.kind === p.kind);
    if (uniqueKey(p) && exact.length === 1 && uniqueUrl(exact[0]) && !usedUrls.has(exact[0].url!)) {
      matches.set(p.key, exact[0]);
      usedUrls.add(exact[0].url!);
    }
  }
  const compatible = (p: PageRef, e: PageRef) => e.kind === p.kind || (e.kind === "page" && ["service", "brand", "local"].includes(p.kind));
  const legacyMatch = (p: PageRef, e: PageRef) => compatible(p, e) && (p.aliases?.includes(e.key) || p.aliases?.includes(key(p.kind, e.title)) || fold(e.title) === fold(p.title));
  const legacy = existing.filter((e) => e.contentTarget == null && uniqueUrl(e));
  // Compter aussi les offres déjà identifiées : une ancienne page commune reste ambiguë après cette attribution.
  for (const p of planned) {
    if (matches.has(p.key) || !uniqueKey(p)) continue;
    if (existing.some((e) => e.contentTarget === p.key)) continue;
    const candidates = legacy.filter((e) => legacyMatch(p, e));
    if (candidates.length !== 1) continue;
    const e = candidates[0];
    if (planned.filter((other) => legacyMatch(other, e)).length !== 1 || usedUrls.has(e.url!)) continue;
    matches.set(p.key, e);
    usedUrls.add(e.url!);
  }
  return matches;
}

/** Conserver séparément les pages dont l'association historique ne peut pas être établie. */
export function sitePages(p: Project): PageRef[] {
  const existing = existingPages(p.id);
  const planned = plannedPages(p);
  const matches = associatePages(planned, existing);
  const used = new Set(matches.values());
  const canonical = planned.map((page) => {
    const hit = matches.get(page.key);
    if (!hit) return page;
    return { ...page, contentTarget: page.key, url: hit.url, status: hit.status };
  });
  return [...canonical, ...existing.filter((e) => !used.has(e)).map((e) => ({ ...e, aliases: [e.key], key: e.url ? `page:${e.url}`.slice(0, 120) : e.key }))];
}

/** Une ancienne clé n'est admise que si elle désigne une cible sans ambiguïté. */
export function resolvePage(pages: PageRef[], key: string): PageRef | null {
  const exact = pages.filter((p) => p.key === key);
  if (exact.length) return exact.length === 1 ? exact[0] : null;
  const aliases = pages.filter((p) => p.aliases?.includes(key));
  return aliases.length === 1 ? aliases[0] : null;
}
