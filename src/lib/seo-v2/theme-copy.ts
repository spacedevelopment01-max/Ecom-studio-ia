/**
 * Textes de la boutique : les documents SEO & Copywriting V2 sont la RÉFÉRENCE pour les textes qu'ils couvrent
 * (fiche produit, page d'accueil : titre, description, points clés, FAQ, titre et description SEO). Le kit de textes
 * de mise en page (accroches de sections, bandeau, pied de page…) ne fait que compléter ce qu'aucun document ne couvre.
 * Ainsi un même texte n'existe jamais en deux versions contradictoires : ce qui est modifié dans l'éditeur V2 est ce
 * que la boutique et les exports (Theme Engine, CMS Engine) affichent.
 */
import type { ShopCopy } from "../theme/copy";
import { latestContent, listContents } from "./store";
import type { Block, ContentDoc, ContentType } from "./types";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Document V2 de référence d'un type dans la langue de la boutique : le plus récent, jamais un brouillon refusé. */
function referenceDoc(projectId: string, type: ContentType, lang: string): ContentDoc | null {
  for (const v of listContents(projectId, [type])) {
    if (v.lang !== lang) continue;
    // Un document modifié par le client compte toujours ; sinon il doit avoir passé la barrière.
    if (v.source === "engine" && v.verdict === "REJECTED") continue;
    const d = latestContent(projectId, v.docKey)?.doc;
    if (d) return d;
  }
  return null;
}

/** Corps HTML d'un document (titres de section, paragraphes, listes) ; FAQ et appels à l'action à part. */
export function docHtml(blocks: Block[]): string {
  const out: string[] = [];
  for (const b of blocks) {
    if (b.kind === "h2" || b.kind === "h3") out.push(`<h3>${esc(b.text)}</h3>`);
    else if (b.kind === "p") out.push(`<p>${esc(b.text)}</p>`);
    else if (b.kind === "ul" || b.kind === "ol") out.push(`<${b.kind}>${b.items.map((i) => `<li>${esc(i)}</li>`).join("")}</${b.kind}>`);
  }
  return out.join("\n");
}

export type CopySource = { product: string | null; home: string | null };

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
    if (h1?.text) next.product.title = h1.text;
    if (firstP?.text) next.product.short = firstP.text;
    const html = docHtml(body);
    if (html) next.product.description_html = html;
    if (list?.items.length) next.product.highlights = list.items.slice(0, 6);
    const faq = product.blocks.filter((b): b is Extract<Block, { kind: "faq" }> => b.kind === "faq").map((b) => ({ q: b.q, a: b.a }));
    if (faq.length >= 2) next.faq.items = faq.slice(0, 12);
    if (product.meta.seoTitle) next.seo.title = product.meta.seoTitle;
    if (product.meta.metaDescription) next.seo.description = product.meta.metaDescription;
    sources.product = product.page.key;
  }
  const home = referenceDoc(projectId, "home_page", lang);
  if (home) {
    const h1 = home.blocks.find((b): b is Extract<Block, { kind: "h1" | "h2" | "h3" }> => b.kind === "h1");
    const firstP = home.blocks.find((b) => b.kind === "p") as Extract<Block, { kind: "p" }> | undefined;
    if (h1?.text) next.hero.heading = h1.text;
    if (firstP?.text) next.hero.text = firstP.text;
    const faq = home.blocks.filter((b): b is Extract<Block, { kind: "faq" }> => b.kind === "faq").map((b) => ({ q: b.q, a: b.a }));
    if (!product && faq.length >= 2) next.faq.items = faq.slice(0, 12);
    // Accueil : la page d'accueil porte le titre et la description SEO de la boutique (sauf fiche produit présente).
    if (!product && home.meta.seoTitle) next.seo.title = home.meta.seoTitle;
    if (!product && home.meta.metaDescription) next.seo.description = home.meta.metaDescription;
    sources.home = home.page.key;
  }
  return { copy: next, sources };
}
