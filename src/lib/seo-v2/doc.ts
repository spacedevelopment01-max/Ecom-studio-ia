/**
 * Document texte éditable (V2) : une suite de blocs (titres, paragraphes, listes, questions, appel à l'action) avec
 * trois marques en ligne seulement (**gras**, *italique*, [lien](url)). Export HTML propre, Markdown, texte brut ;
 * données structurées (JSON-LD) construites UNIQUEMENT à partir de faits confirmés — jamais de note, d'avis, de
 * disponibilité ni de prix inventés.
 */
import crypto from "node:crypto";
import { z } from "zod";
import { fold } from "./lang";
import type { Block, ContentDoc, ContentType, VerifiedFacts } from "./types";

export const CONTENT_DOC_VERSION = 1;
export const SEO_TITLE_TARGET = 60;
export const META_DESC_TARGET = 155;

export const blockId = () => `b${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;

export function slugify(s: string): string {
  return fold(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70).replace(/-+$/, "") || "page";
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Adresse de lien acceptée : interne (« / ») ou https. Jamais javascript:, data:, etc. */
export const safeUrl = (u: string | null | undefined) => !!u && (/^\/(?!\/)[^\s]*$/.test(u) || /^https:\/\/[^\s]+$/.test(u));

/** Marques en ligne → HTML échappé (aucune autre balise ne passe). */
export function inlineHtml(text: string): string {
  let s = esc(text);
  s = s.replace(/\[([^\]]+)\]\(([^\s()]*(?:\([^\s()]*\))?[^\s()]*)\)/g, (_m, t: string, u: string) => (safeUrl(u.replace(/&amp;/g, "&")) ? `<a href="${u}">${t}</a>` : t));
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
  return s;
}

/** Texte sans marques. */
export const stripInline = (text: string) => text.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*]+)\*/g, "$1");

export function blockText(b: Block): string {
  switch (b.kind) {
    case "ul":
    case "ol":
      return b.items.map(stripInline).join("\n");
    case "faq":
      return `${stripInline(b.q)}\n${stripInline(b.a)}`;
    default:
      return stripInline(b.text);
  }
}

export const plainText = (doc: Pick<ContentDoc, "blocks">) => doc.blocks.map(blockText).join("\n\n");
export const wordCount = (s: string) => s.split(/\s+/).filter((w) => /\p{L}/u.test(w)).length;

export function toHtml(doc: Pick<ContentDoc, "blocks">): string {
  const out: string[] = [];
  let faqOpen = false;
  for (const b of doc.blocks) {
    if (b.kind !== "faq" && faqOpen) {
      out.push("</div>");
      faqOpen = false;
    }
    switch (b.kind) {
      case "h1":
      case "h2":
      case "h3":
        out.push(`<${b.kind}>${inlineHtml(b.text)}</${b.kind}>`);
        break;
      case "p":
        out.push(`<p>${inlineHtml(b.text)}</p>`);
        break;
      case "ul":
      case "ol":
        out.push(`<${b.kind}>${b.items.map((i) => `<li>${inlineHtml(i)}</li>`).join("")}</${b.kind}>`);
        break;
      case "faq":
        if (!faqOpen) {
          out.push('<div class="faq">');
          faqOpen = true;
        }
        out.push(`<details><summary>${inlineHtml(b.q)}</summary><p>${inlineHtml(b.a)}</p></details>`);
        break;
      case "cta":
        out.push(b.url && safeUrl(b.url) ? `<p class="cta"><a href="${esc(b.url)}">${esc(b.text)}</a></p>` : `<p class="cta">${esc(b.text)}</p>`);
        break;
    }
  }
  if (faqOpen) out.push("</div>");
  return out.join("\n");
}

export function toMarkdown(doc: Pick<ContentDoc, "blocks" | "meta">): string {
  const lines = [`<!-- title: ${doc.meta.seoTitle} -->`, `<!-- description: ${doc.meta.metaDescription} -->`, ""];
  for (const b of doc.blocks) {
    if (b.kind === "h1") lines.push(`# ${b.text}`);
    else if (b.kind === "h2") lines.push(`## ${b.text}`);
    else if (b.kind === "h3") lines.push(`### ${b.text}`);
    else if (b.kind === "p") lines.push(b.text);
    else if (b.kind === "ul") lines.push(b.items.map((i) => `- ${i}`).join("\n"));
    else if (b.kind === "ol") lines.push(b.items.map((i, k) => `${k + 1}. ${i}`).join("\n"));
    else if (b.kind === "faq") lines.push(`**${b.q}**\n\n${b.a}`);
    else if (b.kind === "cta") lines.push(b.url ? `[${b.text}](${b.url})` : `**${b.text}**`);
    lines.push("");
  }
  return lines.join("\n").trim() + "\n";
}

const isPlaceholder = (s: string) => /\[(À|A) compléter|\[To complete|\[Por completar/i.test(s);

/**
 * Données structurées proposées : seulement des champs confirmés. Pas de note ni d'avis (AggregateRating, Review),
 * pas de disponibilité, pas d'adresse inventée. Une FAQ n'est balisée que pour des réponses réelles affichées.
 */
export function structuredData(type: ContentType, doc: Pick<ContentDoc, "blocks" | "meta" | "lang">, f: VerifiedFacts): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  const h1 = doc.blocks.find((b) => b.kind === "h1");
  const name = h1 && "text" in h1 ? stripInline(h1.text) : f.offerName;
  if (type === "product_page") {
    const product: Record<string, unknown> = { "@context": "https://schema.org", "@type": "Product", name: f.offerName, description: doc.meta.metaDescription, brand: { "@type": "Brand", name: f.brand } };
    const m = f.price?.match(/^(\d+),(\d{2})\s*(€|[A-Z]{3})$/);
    if (m) product.offers = { "@type": "Offer", price: `${m[1]}.${m[2]}`, priceCurrency: m[3] === "€" ? "EUR" : m[3] };
    out.push(product);
  }
  if (type === "service_page" || type === "local_page" || (type === "home_page" && f.business === "services")) {
    const biz: Record<string, unknown> = { "@context": "https://schema.org", "@type": "LocalBusiness", name: f.brand };
    if (f.area) biz.areaServed = f.area;
    if (f.contact.phone) biz.telephone = f.contact.phone;
    if (f.contact.email) biz.email = f.contact.email;
    if (f.contact.address) biz.address = f.contact.address;
    if (f.contact.hours) biz.openingHours = f.contact.hours;
    out.push(biz);
    if (type === "service_page") out.push({ "@context": "https://schema.org", "@type": "Service", name, provider: { "@type": "LocalBusiness", name: f.brand }, ...(f.area ? { areaServed: f.area } : {}) });
  }
  if (type === "blog_article") out.push({ "@context": "https://schema.org", "@type": "Article", headline: name, inLanguage: doc.lang, publisher: { "@type": "Organization", name: f.brand } });
  const faqs = doc.blocks.filter((b): b is Extract<Block, { kind: "faq" }> => b.kind === "faq" && !isPlaceholder(b.a) && !isPlaceholder(b.q));
  if (faqs.length) out.push({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((q) => ({ "@type": "Question", name: stripInline(q.q), acceptedAnswer: { "@type": "Answer", text: stripInline(q.a) } })) });
  return out;
}

// ---------------------------------------------------------------- validation (document reçu de l'interface)

const text = z.string().max(4000);
const BlockSchema = z.discriminatedUnion("kind", [
  z.object({ id: z.string().min(1).max(40), kind: z.enum(["h1", "h2", "h3"]), text: z.string().max(300) }),
  z.object({ id: z.string().min(1).max(40), kind: z.literal("p"), text }),
  z.object({ id: z.string().min(1).max(40), kind: z.enum(["ul", "ol"]), items: z.array(z.string().max(600)).max(40) }),
  z.object({ id: z.string().min(1).max(40), kind: z.literal("faq"), q: z.string().max(300), a: z.string().max(2000) }),
  z.object({ id: z.string().min(1).max(40), kind: z.literal("cta"), text: z.string().max(120), url: z.string().max(500).nullable() }),
]);
const PageRefSchema = z.object({ key: z.string().max(120), title: z.string().max(200), url: z.string().max(500).nullable(), kind: z.enum(["product", "collection", "page", "service", "home", "brand", "local", "article"]), status: z.enum(["existing", "planned"]) });
export const ContentDocSchema = z.object({
  version: z.number(),
  type: z.enum(["product_page", "category_page", "service_page", "home_page", "brand_page", "local_page", "blog_article", "faq", "metadata", "ad_copy"]),
  lang: z.enum(["fr", "en", "es"]),
  page: PageRefSchema,
  primaryKeyword: z.string().max(200).nullable(),
  meta: z.object({ seoTitle: z.string().max(200), metaDescription: z.string().max(400), slug: z.string().max(120), canonical: z.string().max(500).nullable(), robots: z.enum(["index,follow", "noindex,follow"]) }),
  blocks: z.array(BlockSchema).max(200),
  schema: z.array(z.record(z.string(), z.unknown())).max(10),
  links: z.array(PageRefSchema).max(40),
  meta2: z.object({ source: z.enum(["engine", "user", "ai_local", "ai"]), by: z.enum(["ai", "local"]), runId: z.string().max(60).nullable(), createdFrom: z.string().max(80).nullable() }),
});

/** Ids uniques (une copie ou un collage de bloc garde un identifiant distinct). */
export function normalizeIds(doc: ContentDoc): ContentDoc {
  const seen = new Set<string>();
  return { ...doc, blocks: doc.blocks.map((b): Block => (seen.has(b.id) || !b.id ? ({ ...b, id: blockId() } as Block) : (seen.add(b.id), b))) };
}
