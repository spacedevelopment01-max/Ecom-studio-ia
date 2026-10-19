/** Livraison des documents par cible stable, après composition : aucun résumé ne remplace un corps validé. */
import { referenceContent } from "./theme-copy";
import crypto from "node:crypto";
import { toHtml, stripInline } from "./doc";
import { slugify } from "./doc";
import { currentTheme, type Project } from "../projects";
import { storeProducts, type SectionInstance, type ThemeSpec } from "../theme/spec";
import { associatePages, plannedPages, sitePages, themePages } from "./pages";
import type { ContentType } from "./types";

export function deliverContent(spec: ThemeSpec, p: Project, lang: string) {
  const planned = plannedPages(p);
  const active = new Set(planned.map((page) => page.key));
  const pages = sitePages(p).filter((page) => active.has(page.key));
  // Une composition neuve ne doit pas faire disparaître les pages historiques sans association certaine.
  const previous = currentTheme(p.id)?.spec;
  const historicalPages = [] as ThemeSpec["store"]["pages"];
  for (const old of previous?.store.pages ?? []) {
    const page = structuredClone(old);
    const oldKey = page.template_suffix ? `page.${page.template_suffix}` : "page";
    const template = previous!.templates[oldKey];
    if (template) {
      if (!spec.templates[oldKey]) spec.templates[oldKey] = structuredClone(template);
      else if (JSON.stringify(spec.templates[oldKey]) !== JSON.stringify(template)) {
        const suffix = `kept-${crypto.createHash("sha256").update(JSON.stringify([old.handle, template])).digest("hex").slice(0, 16)}`;
        spec.templates[`page.${suffix}`] = structuredClone(template);
        page.template_suffix = suffix;
      }
      for (const section of Object.values(template.sections)) {
        if (previous!.customSections[section.type] && !spec.customSections[section.type]) spec.customSections[section.type] = structuredClone(previous!.customSections[section.type]);
      }
      const text = JSON.stringify(template);
      for (const [file, id] of Object.entries(previous!.files)) if (text.includes(file) && !spec.files[file]) spec.files[file] = id;
    }
    historicalPages.push(page);
  }
  spec.store.pages = [...historicalPages, ...spec.store.pages.filter((page) => !historicalPages.some((old) => old.handle === page.handle))];
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
  const productMatches = associatePages(planned, themePages(spec));
  if (p.business !== "services") for (const product of storeProducts(spec)) {
    const target = [...productMatches].find(([, page]) => page.kind === "product" && page.url === `/products/${product.handle}`)?.[0];
    if (!target) continue;
    product.contentTarget = target;
    const doc = referenceDoc(p.id, "product_page", lang, target);
    product.seo = seo(target, doc ? { title: doc.meta.seoTitle, description: doc.meta.metaDescription } : product.seo, "product_page");
    const questions = faq(target);
    if (!doc && !questions) continue;
    const base = doc ? body(doc) : product.description_html;
    product.description_html = base + (questions && !base.includes(questions) ? questions : "");
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
    const page = pages.find((x) => x.kind === "collection" && x.url === `/collections/${collection.handle}`);
    const doc = page && referenceDoc(p.id, "category_page", lang, page.key);
    if (doc) collection.description = body(doc);
  }
  for (const page of pages) {
    const type = page.kind === "service" ? "service_page" : page.kind === "brand" ? "brand_page" : page.kind === "local" ? "local_page" : null;
    if (!type) continue;
    const doc = referenceDoc(p.id, type, lang, page.key);
    if (!doc) continue;
    let handle = page.url?.startsWith("/pages/") ? page.url.slice(7) : `texte-${slugify(page.key)}`;
    // Le nom d'un nouveau fichier ne donne aucun droit sur une page historique déjà présente.
    if (!page.url) {
      const base = handle;
      const suffix = crypto.createHash("sha256").update(page.key).digest("hex").slice(0, 12);
      for (let n = 0; spec.store.pages.some((x) => x.handle === handle); n++) handle = `${base}-${suffix}${n ? `-${n}` : ""}`;
    }
    // Les anciennes pages peuvent partager un gabarit : le nouveau texte ne doit pas changer leur rendu.
    let suffix = `seo-${slugify(page.key)}`;
    const baseSuffix = suffix;
    const ownSuffix = spec.store.pages.find((x) => x.handle === handle)?.template_suffix;
    for (let n = 0; spec.store.pages.some((x) => x.handle !== handle && x.template_suffix === suffix) || (spec.templates[`page.${suffix}`] && ownSuffix !== suffix); n++) {
      suffix = `${baseSuffix}-${crypto.createHash("sha256").update(page.key).digest("hex").slice(0, 12)}${n ? `-${n}` : ""}`;
    }
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
