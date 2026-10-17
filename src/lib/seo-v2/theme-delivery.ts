/** Livraison des documents par cible stable, après composition : aucun résumé ne remplace un corps validé. */
import { referenceContent } from "./theme-copy";
import { toHtml, stripInline } from "./doc";
import { slugify } from "./doc";
import type { Project } from "../projects";
import { storeProducts, type SectionInstance, type ThemeSpec } from "../theme/spec";
import { sitePages } from "./pages";
import type { ContentType } from "./types";

export function deliverContent(spec: ThemeSpec, p: Project, lang: string) {
  const section = (html: string, heading = ""): SectionInstance => ({ type: "rich-text", settings: { align: "left", style: "plain", color_scheme: "scheme-1", padding_top: 48, padding_bottom: 48 }, blocks: { ...(heading ? { heading: { type: "heading", settings: { text: heading, size: "h2" } } } : {}), body: { type: "text", settings: { text: html } } }, block_order: [...(heading ? ["heading"] : []), "body"] });
  const traces = new Map<string, { docKey: string; version: number; target: string; runId: string | null; contextHash: string | null }>();
  const referenceDoc = (...args: Parameters<typeof referenceContent>) => {
    const selected = referenceContent(...args);
    if (!selected) return null;
    const { doc, version } = selected;
    traces.set(`${version.docKey}:${version.version}`, { docKey: version.docKey, version: version.version, target: doc.page.key, runId: doc.meta2.runId, contextHash: doc.meta2.contract?.contextHash ?? null });
    return doc;
  };
  const body = (doc: NonNullable<ReturnType<typeof referenceDoc>>) => {
    return toHtml({ blocks: doc.blocks.filter((b) => b.kind !== "h1") });
  };
  const seo = (target: string, fallback: { title: string; description: string } | undefined, type: ContentType) => {
    const doc = referenceDoc(p.id, ["metadata", type], lang, target);
    if (!doc) return fallback;
    body(doc);
    return { title: doc.meta.seoTitle, description: doc.meta.metaDescription };
  };
  const faq = (target: string) => {
    const doc = referenceDoc(p.id, "faq", lang, target);
    return doc ? body(doc) : "";
  };
  if (p.business !== "services") for (const product of storeProducts(spec)) {
    const target = product.contentTarget ?? (product === spec.store.product ? "product:main" : null);
    if (!target) continue;
    const doc = referenceDoc(p.id, "product_page", lang, target);
    product.seo = seo(target, doc ? { title: doc.meta.seoTitle, description: doc.meta.metaDescription } : product.seo, "product_page");
    const questions = faq(target);
    if (!doc && !questions) continue;
    product.description_html = (doc ? body(doc) : product.description_html) + questions;
    const title = doc?.blocks.find((b) => b.kind === "h1");
    if (title && "text" in title) product.title = stripInline(title.text);
    const template = product.template_suffix ? spec.templates[`product.${product.template_suffix}`] ?? spec.templates.product : spec.templates.product;
    const main = template?.order.map((id) => template.sections[id]).find((s) => s.type === "main-product");
    if (main) {
      main.blocks ??= {};
      main.block_order ??= Object.keys(main.blocks);
      const id = Object.keys(main.blocks).find((id) => main.blocks![id].type === "description") ?? "seo_description";
      main.blocks[id] ??= { type: "description", settings: {} };
      if (main.blocks[id].settings.hide_for_handle === product.handle) main.blocks[id].settings.hide_for_handle = "";
      if (!main.block_order.includes(id)) main.block_order.push(id);
    }
  }
  const home = referenceDoc(p.id, "home_page", lang);
  const homeFaq = faq("home:accueil");
  if (home || homeFaq) {
    const h1 = home?.blocks.find((b) => b.kind === "h1");
    const opening = spec.templates.index.sections[spec.templates.index.order[0]];
    if (h1 && "text" in h1 && opening) { opening.settings.heading = stripInline(h1.text); if ("heading_em" in opening.settings) opening.settings.heading_em = ""; }
    // Le héros peut raccourcir son introduction : le corps conserve donc tous les paragraphes.
    const html = (home ? body(home) : "") + homeFaq;
    if (html) {
      const id = "seo_home_body";
      spec.templates.index.sections[id] = section(html);
      spec.templates.index.order = [...spec.templates.index.order.filter((x) => x !== id), id];
    }
  }
  spec.store.seo = seo("home:accueil", home ? { title: home.meta.seoTitle, description: home.meta.metaDescription } : spec.store.seo, "home_page");
  for (const collection of spec.store.collections ?? []) {
    const page = sitePages(p).find((x) => x.kind === "collection" && (x.title === collection.title || x.url === `/collections/${collection.handle}`));
    const doc = page && referenceDoc(p.id, "category_page", lang, page.key);
    if (doc) collection.description = body(doc);
  }
  for (const page of sitePages(p)) {
    const type = page.kind === "service" ? "service_page" : page.kind === "brand" ? "brand_page" : page.kind === "local" ? "local_page" : null;
    if (!type) continue;
    const doc = referenceDoc(p.id, type, lang, page.key);
    if (!doc) continue;
    const handle = page.url?.startsWith("/pages/") ? page.url.slice(7) : `texte-${slugify(page.key)}`;
    const suffix = `seo-${slugify(page.key)}`;
    const questions = faq(page.key);
    const html = body(doc) + questions;
    const h1 = doc.blocks.find((b) => b.kind === "h1");
    const title = h1 && "text" in h1 ? stripInline(h1.text) : page.title;
    spec.templates[`page.${suffix}`] = { order: ["seo_body"], sections: { seo_body: section(toHtml(doc) + questions) } };
    const existing = spec.store.pages.findIndex((x) => x.handle === handle);
    const next = { handle, title, contentTarget: page.key, template_suffix: suffix, body_html: html, seo: seo(page.key, { title: doc.meta.seoTitle, description: doc.meta.metaDescription }, type) };
    if (existing >= 0) spec.store.pages[existing] = { ...spec.store.pages[existing], ...next };
    else spec.store.pages.push(next);
    // Les pages livrées sont accessibles depuis le thème, sans inventer de lien vers une page prévue.
    const menu = spec.store.menus?.footer;
    if (menu && !menu.links.some((l) => l.url === `/pages/${handle}`)) menu.links.push({ title, url: `/pages/${handle}` });
  }
  return [...traces.values()];
}
