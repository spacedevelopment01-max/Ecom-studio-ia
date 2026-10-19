/**
 * Textes de la boutique : les documents SEO & Copywriting V2 sont la RÉFÉRENCE pour les textes qu'ils couvrent
 * (fiche produit, page d'accueil : titre, description, points clés, FAQ, titre et description SEO). Le kit de textes
 * de mise en page (accroches de sections, bandeau, pied de page…) ne fait que compléter ce qu'aucun document ne couvre.
 * Ainsi un même texte n'existe jamais en deux versions contradictoires : ce qui est modifié dans l'éditeur V2 est ce
 * que la boutique et les exports (Theme Engine, CMS Engine) affichent.
 */
import {preparedContentTarget} from "../project-handoff/content-targets";
import type { ShopCopy } from "../theme/copy";
import { usableContent, listContents } from "./store";
import { inlineHtml, stripInline, toHtml } from "./doc";
import { loadProject } from "../projects";
import { resolvePage, sitePages } from "./pages";
import type { Block, ContentDoc, ContentType } from "./types";

/** Document V2 de référence d'un type dans la langue de la boutique : le plus récent, jamais un brouillon refusé. */
export function referenceContent(projectId: string, type: ContentType | ContentType[], lang: string, target?: string) {
  const p=loadProject(projectId);const pages = sitePages(p);
  const types = Array.isArray(type) ? type : [type];
  const key = target ?? (types[0] === "product_page" ? "product:main" : types[0] === "home_page" ? "home:accueil" : types[0] === "brand_page" ? "brand:a-propos" : null);
  if (!key) return null;
  const candidates = listContents(projectId, types).flatMap((v) => { const usable = usableContent(projectId, v.docKey); return usable ? [usable] : []; });
  // Une correction du client a priorité sur une nouvelle proposition du moteur ; ordre stable en cas d'égalité.
  candidates.sort((a, b) => Number(b.version.source !== "engine") - Number(a.version.source !== "engine") || b.version.createdAt - a.version.createdAt || b.version.id.localeCompare(a.version.id));
  for (const { version: v, doc: d } of candidates) {
    if (v.lang !== lang) continue;
    if (d.page.key === key || resolvePage(pages, d.page.key)?.key === key || preparedContentTarget(p,v.docKey,d)===key) return { doc: d, version: v, target:key };
  }
  return null;
}

export const referenceDoc = (...args: Parameters<typeof referenceContent>): ContentDoc | null => referenceContent(...args)?.doc ?? null;

/** Corps HTML d'un document (titres de section, paragraphes, listes) ; FAQ et appels à l'action à part.
 * Les marques en ligne des documents (« **gras** », liens) deviennent du HTML : jamais d'astérisques affichés. */
export function docHtml(blocks: Block[]): string {
  const out: string[] = [];
  for (const b of blocks) {
    if (b.kind === "h2" || b.kind === "h3") out.push(`<h3>${inlineHtml(stripInline(b.text))}</h3>`);
    else if (b.kind === "p") out.push(`<p>${inlineHtml(b.text)}</p>`);
    else if (b.kind === "ul" || b.kind === "ol") out.push(`<${b.kind}>${b.items.map((i) => `<li>${inlineHtml(i)}</li>`).join("")}</${b.kind}>`);
  }
  return out.join("\n");
}

export type CopySource = { product: string | null; home: string | null };

/** Page d'accueil rédigée par SEO & Copywriting V2 (par l'IA quand elle est active, sinon à partir des faits). */
export type HomeSeo = { h1: string; intro: string; seoTitle: string; metaDescription: string; by: "ai" | "local" | null };

export function homeSeoDoc(projectId: string, lang: string): HomeSeo | null {
  const home = referenceDoc(projectId, "home_page", lang);
  if (!home) return null;
  const h1 = home.blocks.find((b): b is Extract<Block, { kind: "h1" | "h2" | "h3" }> => b.kind === "h1")?.text ?? "";
  const intro = (home.blocks.find((b) => b.kind === "p") as Extract<Block, { kind: "p" }> | undefined)?.text ?? "";
  return { h1, intro, seoTitle: home.meta.seoTitle ?? "", metaDescription: home.meta.metaDescription ?? "", by: home.meta2?.by ?? null };
}

/** Kit de textes complété par les documents V2 de référence (même structure, aucun champ inventé). */
export function overlayV2Copy(copy: ShopCopy, projectId: string, lang: string, business: "products" | "services"): { copy: ShopCopy; sources: CopySource } {
  const next: ShopCopy = structuredClone(copy);
  const sources: CopySource = { product: null, home: null };
  const product = business === "products" ? referenceDoc(projectId, "product_page", lang) : null;
  if (product) {
    const h1 = product.blocks.find((b): b is Extract<Block, { kind: "h1" | "h2" | "h3" }> => b.kind === "h1");
    const body = product.blocks.filter((b) => b.kind !== "h1" && b.kind !== "faq" && b.kind !== "cta");
    const firstP = body.find((b) => b.kind === "p") as Extract<Block, { kind: "p" }> | undefined;
    const list = body.find((b) => b.kind === "ul") as Extract<Block, { kind: "ul" }> | undefined;
    if (h1?.text) next.product.title = stripInline(h1.text);
    if (firstP?.text) next.product.short = stripInline(firstP.text);
    const html = toHtml({ blocks: product.blocks.filter((b) => b.kind !== "h1") });
    if (html) next.product.description_html = html;
    // Points forts affichés en texte simple : sans « ** » ni liens markdown.
    if (list?.items.length) next.product.highlights = list.items.slice(0, 6).map(stripInline);
    const faq = product.blocks.filter((b): b is Extract<Block, { kind: "faq" }> => b.kind === "faq").map((b) => ({ q: stripInline(b.q), a: stripInline(b.a) }));
    if (faq.length >= 2) next.faq.items = faq.slice(0, 12);
    if (product.meta.seoTitle) next.seo.title = product.meta.seoTitle;
    if (product.meta.metaDescription) next.seo.description = product.meta.metaDescription;
    sources.product = product.page.key;
  }
  const home = referenceDoc(projectId, "home_page", lang);
  if (home) {
    const h1 = home.blocks.find((b): b is Extract<Block, { kind: "h1" | "h2" | "h3" }> => b.kind === "h1");
    const firstP = home.blocks.find((b) => b.kind === "p") as Extract<Block, { kind: "p" }> | undefined;
    if (h1?.text) next.hero.heading = stripInline(h1.text);
    if (firstP?.text) next.hero.text = stripInline(firstP.text);
    const faq = home.blocks.filter((b): b is Extract<Block, { kind: "faq" }> => b.kind === "faq").map((b) => ({ q: stripInline(b.q), a: stripInline(b.a) }));
    if (!product && faq.length >= 2) next.faq.items = faq.slice(0, 12);
    // Accueil : la page d'accueil porte le titre et la description SEO de la boutique (sauf fiche produit présente).
    if (!product && home.meta.seoTitle) next.seo.title = home.meta.seoTitle;
    if (!product && home.meta.metaDescription) next.seo.description = home.meta.metaDescription;
    sources.home = home.page.key;
  }
  return { copy: next, sources };
}
