/** Fiches isolées par identité. Le gabarit commun reste dynamique, sans fait du produit principal. */
import crypto from "node:crypto";
import { currentTheme, type Project } from "../projects";
import { associatePages, plannedPages, themePages } from "../seo-v2/pages";
import { referenceContent } from "../seo-v2/theme-copy";
import { toHtml } from "../seo-v2/doc";
import { pick } from "../i18n";
import { escapeHtml, storeProducts, type ProductContentBinding, type TemplateJson, type ThemeSpec } from "./spec";

const hash = (x: unknown) => crypto.createHash("sha256").update(JSON.stringify(x) ?? "null").digest("hex");
const dynamicBlocks = new Set(["title", "price", "buy_buttons", "description"]);
/**
 * La description du produit répète-t-elle seulement ce que la fiche montre déjà (accroche du bloc « texte », points forts,
 * onglets dépliables) ? Dans ce cas la poser en plus ferait lire trois fois les mêmes phrases (défaut ORBE du 19 octobre).
 */
function descriptionRepeatsBlocks(main: { blocks?: Record<string, { type: string; settings: Record<string, unknown> }> }, descriptionHtml: string): boolean {
  const letters = (s: string) => String(s ?? "").replace(/<[^>]+>/g, " ").toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "");
  let rest = letters(descriptionHtml);
  if (!rest) return true;
  const known: string[] = [];
  for (const b of Object.values(main.blocks ?? {})) {
    if (b.type === "text") known.push(String(b.settings.text ?? ""));
    if (b.type === "highlights") known.push(...String(b.settings.items ?? "").split("\n"));
    if (b.type === "collapsible") known.push(String(b.settings.content ?? ""), ...String(b.settings.content ?? "").replace(/<[^>]+>/g, "\n").split(/[\n,;:•·]/));
  }
  for (const k of known.map(letters).filter((x) => x.length >= 4).sort((a, b) => b.length - a.length)) rest = rest.split(k).join("");
  return rest.length <= 24;
}

/** Fiche propre à un thème (ONDE : « on-product », la section Produit commune masquée) et ses réglages liés au produit principal. */
const OWN_BODY: Record<string, string[]> = { "on-product": ["product", "heading", "current_label", "brand_line", "price_note", "card_brand", "card_name", "finish_value", "text", "bar_image_asset", "bar_name", "bar_note"] };

export function neutralProductTemplate(source: TemplateJson): TemplateJson {
  const out = structuredClone(source);
  out.order = out.order.filter((id) => ["main-product", "product-recommendations"].includes(out.sections[id]?.type) || (!out.sections[id]?.disabled && !!OWN_BODY[out.sections[id]?.type ?? ""]));
  out.sections = Object.fromEntries(out.order.map((id) => [id, out.sections[id]]));
  // Fiche du thème gardée sans les textes du produit principal (nom, carte, barre) ni ses onglets (sections absentes ici) ;
  // sans elle, la section Produit commune redevient visible : jamais de fiche vide.
  const own = Object.values(out.sections).find((s) => OWN_BODY[s.type]);
  if (own) { for (const k of OWN_BODY[own.type]) delete own.settings[k]; own.settings.show_description = true; own.blocks = {}; own.block_order = []; }
  else for (const s of Object.values(out.sections)) if (s.type === "main-product") delete s.disabled;
  for (const s of Object.values(out.sections)) if (s.type === "main-product") {
    s.block_order = (s.block_order ?? Object.keys(s.blocks ?? {})).filter((id) => dynamicBlocks.has(s.blocks?.[id]?.type ?? ""));
    s.blocks = Object.fromEntries(s.block_order.map((id) => [id, s.blocks![id]]));
    for (const b of Object.values(s.blocks)) { delete b.settings.product_handle; delete b.settings.hide_for_handle; }
    if (!Object.values(s.blocks).some((b) => b.type === "description") && !descriptionRepeatsBlocks(s as never, "")) { s.blocks.own_description = { type: "description", settings: {} }; s.block_order.push("own_description"); }
  }
  return out;
}

/** Copie d'un gabarit possédé par une cible : ses médias/sections ne sont pas remplacés par ceux d'une autre. */
function keepTemplate(spec: ThemeSpec, previous: ThemeSpec, template: TemplateJson): TemplateJson {
  let json = JSON.stringify(template);
  const keptTypes: string[] = [];
  for (const [type, section] of Object.entries(previous.customSections)) if (json.includes(`"${type}"`)) {
    let next = type;
    const assetConflict = Object.entries(previous.files).some(([file, asset]) => section.liquid.includes(file) && spec.files[file] && spec.files[file] !== asset);
    if (assetConflict || spec.customSections[type] && hash(spec.customSections[type]) !== hash(section)) next = `es-custom-kept-${hash([type, section, previous.files]).slice(0, 12)}`;
    spec.customSections[next] = structuredClone(section);
    keptTypes.push(next);
    if (next !== type) json = json.replaceAll(`"${type}"`, `"${next}"`);
  }
  for (const [file, asset] of Object.entries(previous.files)) if (json.includes(file) || keptTypes.some((t) => spec.customSections[t].liquid.includes(file))) {
    let next = file;
    if (spec.files[file] && spec.files[file] !== asset) next = `es-kept-${hash([file, asset]).slice(0, 12)}.${file.split(".").pop()}`;
    spec.files[next] = asset;
    if (next !== file) { json = json.replaceAll(file, next); for (const type of keptTypes) spec.customSections[type].liquid = spec.customSections[type].liquid.replaceAll(file, next); }
  }
  return JSON.parse(json) as TemplateJson;
}

export function bindProductContent(spec: ThemeSpec, p: Project, principalTemplate: TemplateJson = spec.templates.product) {
  if (p.business === "services" || !principalTemplate) return;
  const neutral = neutralProductTemplate(principalTemplate);
  spec.templates.product = neutral;
  const products = storeProducts(spec);
  const planned = plannedPages(p);
  const matches = associatePages(planned, themePages(spec));
  const current = currentTheme(p.id);
  const oldMatches = current ? associatePages(planned, themePages(current.spec)) : new Map();
  const previousProducts = current ? storeProducts(current.spec) : [];
  const bindings: ProductContentBinding[] = [];
  const lang = spec.language ?? "fr", t = (fr: string, en: string) => pick(lang, fr, en);
  for (const product of products) {
    const target = [...matches].find(([, page]) => page.kind === "product" && page.url === `/products/${product.handle}`)?.[0];
    if (!target) { delete product.template_suffix; continue; }
    product.contentTarget = target;
    const item = target.startsWith("product:catalog:") ? p.catalog.find((x) => `product:catalog:${x.key}` === target) : null;
    const oldUrl = oldMatches.get(target)?.url;
    const old = previousProducts.find((x) => `/products/${x.handle}` === oldUrl);
    const prior = current?.spec.meta?.productContent?.find((b) => b.target === target && b.suffix === old?.template_suffix);
    let suffix = `ecp-${hash(target).slice(0, 16)}`;
    let tpl = structuredClone(target === "product:main" ? principalTemplate : neutral);
    let templateSource: ProductContentBinding["templateSource"] = "generated";
    if (old?.template_suffix && current) {
      const oldTemplate = current.spec.templates[`product.${old.template_suffix}`];
      const uniquelyOwned = previousProducts.filter((x) => x.template_suffix === old.template_suffix).length === 1;
      if (oldTemplate && uniquelyOwned && (!prior || prior.templateSource === "user" || prior.templateHash !== hash(oldTemplate))) {
        tpl = keepTemplate(spec, current.spec, oldTemplate); suffix = old.template_suffix; templateSource = "user";
        // Un renommage change l'URL, pas la propriété des blocs réservés explicitement à cette fiche.
        for (const s of Object.values(tpl.sections)) for (const b of Object.values(s.blocks ?? {})) for (const k of ["product_handle", "hide_for_handle"]) if (b.settings[k] === old.handle) b.settings[k] = product.handle;
      }
    }
    if (item && templateSource === "generated") {
      const facts = [...(item.category.trim() ? [{ label: t("Type", "Type"), value: item.category.trim() }] : []), ...item.features.filter((s) => s.trim()).map((value) => ({ label: t("Caractéristique", "Feature"), value: value.trim() }))];
      const main = Object.values(tpl.sections).find((s) => s.type === "main-product");
      if (main && item.features.some((x) => x.trim())) {
        main.blocks ??= {}; main.block_order ??= Object.keys(main.blocks);
        main.blocks.own_highlights = { type: "highlights", settings: { items: item.features.filter((x) => x.trim()).map(escapeHtml).join("\n"), icon: "check", columns: 1 } };
        main.block_order.push("own_highlights");
      }
      if (facts.length >= 2) {
        tpl.sections.own_specs = { type: "v2-specs", settings: { layout: "table", eyebrow: t("Fiche", "Details"), heading: t("Caractéristiques", "Specifications"), image_asset: "", note: "", color_scheme: "scheme-1", padding_top: 64, padding_bottom: 64 }, blocks: Object.fromEntries(facts.map((f, i) => [`fact_${i}`, { type: "spec", settings: { label: escapeHtml(f.label), value: escapeHtml(f.value) } }])), block_order: facts.map((_, i) => `fact_${i}`) };
        tpl.order.push("own_specs");
      } else if (facts.length === 1) {
        tpl.sections.own_fact = { type: "rich-text", settings: { align: "left", color_scheme: "scheme-1", padding_top: 32, padding_bottom: 32 }, blocks: { body: { type: "text", settings: { text: `<p>${escapeHtml(facts[0].label)} : ${escapeHtml(facts[0].value)}</p>` } } }, block_order: ["body"] };
        tpl.order.push("own_fact");
      }
    }
    // Seulement la nouvelle composition générée ; une retouche client conservée n'est pas transformée.
    if (spec.meta?.reference?.kind === "products" && templateSource === "generated") {
      const ownImages = product.images.filter((f, i, list) => list.findIndex((x) => spec.files[x] === spec.files[f]) === i);
      for (const section of Object.values(tpl.sections)) if (section.type === "scroll-story") {
        section.type = "ref-narrative";
        section.settings = { ...section.settings, motion: "reveal", padding_top: 80, padding_bottom: 80 };
        (section.block_order ?? Object.keys(section.blocks ?? {})).forEach((id, i) => {
          const b = section.blocks?.[id]; if (!b) return;
          b.type = "chapter"; b.settings.image_asset = ownImages[i + 1] ?? ""; b.settings.image_alt = product.title;
        });
      }
    }
    // Les IDs de sections sont propres au produit : un style ciblé sur une fiche ne colore pas ses voisines.
    if (templateSource === "generated") {
      const prefix = `p_${hash(target).slice(0, 8)}_`;
      const scopedId = (id: string) => prefix + id.replace(/^(?:p_[a-f0-9]{8}_)+/, "");
      tpl = { ...tpl, order: tpl.order.map(scopedId), sections: Object.fromEntries(Object.entries(tpl.sections).map(([id, s]) => [scopedId(id), s])) };
    }
    const doc = referenceContent(p.id, "product_page", lang, target);
    const seoDoc = referenceContent(p.id, ["metadata", "product_page"], lang, target);
    const isEdited = (field: "body" | "seo") => {
      const selected = field === "body" ? doc : seoDoc;
      const newerDoc = selected && current && selected.version.createdAt > current.version.created_at;
      return old && !newerDoc && (prior ? prior[`${field}Source`] === "user" || prior[`${field}Hash`] !== hash(field === "body" ? old.description_html : old.seo) : current?.version.author === "user");
    };
    const bodySource = isEdited("body") ? "user" : "generated", seoSource = isEdited("seo") ? "user" : "generated";
    if (bodySource === "user") {
      product.description_html = old!.description_html;
      const faq = referenceContent(p.id, "faq", lang, target);
      const questions = faq ? toHtml({ blocks: faq.doc.blocks.filter((b) => b.kind !== "h1") }) : "";
      // Une FAQ plus ancienne que la retouche peut avoir été retirée volontairement du corps.
      if (questions && faq && current && faq.version.createdAt > current.version.created_at && !product.description_html.includes(questions)) product.description_html += questions;
    }
    if (seoSource === "user") product.seo = structuredClone(old!.seo);
    const main = Object.values(tpl.sections).find((s) => s.type === "main-product");
    if (main && !Object.values(main.blocks ?? {}).some((b) => b.type === "description") && !descriptionRepeatsBlocks(main as never, product.description_html)) {
      main.blocks ??= {}; main.block_order ??= Object.keys(main.blocks);
      main.blocks.own_description = { type: "description", settings: {} }; main.block_order.push("own_description");
    }
    const conflicts = (s: string) => products.some((x) => x !== product && x.template_suffix === s && x.contentTarget !== target) || previousProducts.some((x) => x !== old && x.contentTarget !== target && x.template_suffix === s);
    for (let n = 0; conflicts(suffix); n++) suffix = `ecp-${hash([target, n]).slice(0, 16)}`;
    if (old?.template_suffix && current && previousProducts.filter((x) => x.template_suffix === old.template_suffix).length === 1) {
      for (const style of current.spec.elementStyles ?? []) if (style.template === `product.${old.template_suffix}` && tpl.sections[style.section]) {
        const next = { ...structuredClone(style), template: `product.${suffix}` };
        spec.elementStyles ??= []; if (!spec.elementStyles.some((x) => hash(x) === hash(next))) spec.elementStyles.push(next);
      }
    }
    spec.templates[`product.${suffix}`] = tpl; product.template_suffix = suffix;
    bindings.push({ target, suffix, templateHash: hash(tpl), bodyHash: hash(product.description_html), seoHash: hash(product.seo), templateSource, bodySource, seoSource });
  }
  spec.meta ??= {}; spec.meta.productContent = bindings;
}

/** À appeler après les finitions : ne pas prendre leur nettoyage pour une retouche ultérieure du client. */
export function stampProductContent(spec: ThemeSpec) {
  for (const b of spec.meta?.productContent ?? []) if (b.templateSource === "generated") b.templateHash = hash(spec.templates[`product.${b.suffix}`]);
}
