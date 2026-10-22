/**
 * Rédaction des sections du profil « conversion » (cv-*, thèmes FRAISE et ONDE) à partir du contexte du projet :
 * marque, produit, faits confirmés, stratégie. Rien n'est inventé : un avis, une garantie, une composition ou un
 * mode d'emploi qu'on ne connaît pas reste « [À compléter : …] », donc la section est posée masquée par le thème.
 */
import type { CopyFn, ContentContext } from "./section-content";
import { todo, tr } from "./section-content";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const html = (s: string) => (s.trim() ? `<p>${esc(s.trim())}</p>` : "");
const real = (s: string | undefined) => !!s && !!s.trim() && !s.includes("[");
const productLink = (ctx: ContentContext) => (ctx.product.handle ? `/products/${ctx.product.handle}` : "/collections/all");
const buyLabel = (ctx: ContentContext) => (ctx.business === "services" ? tr(ctx, "Nous contacter", "Contact us") : tr(ctx, "Commander", "Shop now"));
const price = (ctx: ContentContext) => (ctx.product.price != null ? new Intl.NumberFormat(ctx.lang === "en" ? "en-GB" : "fr-FR", { style: "currency", currency: ctx.product.currency || "EUR" }).format(ctx.product.price / 100) : "");
/** Phrases courtes et sûres : faits confirmés, puis messages clés de la stratégie. */
const facts = (ctx: ContentContext) => ctx.product.facts.filter((f) => real(f.label) && real(f.value));
const shortLines = (ctx: ContentContext, n: number) => [
  ...facts(ctx).map((f) => `${f.label} : ${f.value}`),
  ...(ctx.strategy?.keyMessages ?? []).filter(real),
].filter((x, i, a) => a.indexOf(x) === i).slice(0, n);
const heading = (ctx: ContentContext) => (real(ctx.brand?.tagline) ? ctx.brand!.tagline : ctx.product.name || ctx.shopName);

const fill = (settings: Record<string, unknown>, values: Record<string, unknown>) => {
  const out = { ...settings };
  for (const [k, v] of Object.entries(values)) if (out[k] === undefined || out[k] === "" || out[k] === null) out[k] = v;
  return out;
};

const hero: CopyFn = (ctx, base) => ({
  settings: fill(base.settings, {
    heading: heading(ctx), heading_accent: "", heading_tag: "h1", text: html(ctx.product.summary),
    button_label: buyLabel(ctx), button_link: productLink(ctx), image_alt: ctx.product.name,
    // Aucune note tant qu'aucune application d'avis n'est connectée : rien de fictif sur un vrai site.
    rating_text: "", rating_note: "", guarantee_text: "",
  }),
  blocks: base.blocks?.some((b) => b.settings?.text) ? base.blocks : shortLines(ctx, 4).map((text) => ({ type: "check", settings: { text } })),
  samples: false,
});

const feature: CopyFn = (ctx, base) => {
  // Le rôle du visuel décide du propos (deux sections « produit en détail » identiques sur FRAISE, constat du 19 octobre) :
  // détail ou packshot → le produit de près (histoire de la marque, sinon résumé) ; scène ou situation → l'usage (positionnement).
  const file = String(base.settings.image_asset ?? "");
  const inUse = /scene|situation|lifestyle|hero|banni/.test(file);
  const angle = ctx.strategy?.angles?.[inUse ? 1 : 0] ?? ctx.strategy?.angles?.[0];
  // Les idées d'angle du moteur local sont des consignes de contenu (« Montrer les détails réels… »), jamais un texte de site.
  const story = real(ctx.brand?.story) ? ctx.brand!.story : "";
  const positioning = real(ctx.brand?.positioning) ? ctx.brand!.positioning : "";
  const lines = shortLines(ctx, 4);
  return {
    settings: fill(base.settings, {
      heading: real(angle?.title) ? angle!.title : inUse ? tr(ctx, "En situation", "In use") : tr(ctx, "Le produit en détail", "The product up close"), heading_accent: "",
      text: html(inUse ? positioning || story || ctx.product.summary : story || positioning || ctx.product.summary), button_label: buyLabel(ctx), button_link: productLink(ctx), image_alt: ctx.product.name, guarantee_text: "",
    }),
    blocks: base.blocks?.some((b) => b.settings?.text || b.settings?.title) ? base.blocks : lines.map((text) => ({ type: "pill", settings: { text } })),
    samples: false,
  };
};

const cards: CopyFn = (ctx, base) => {
  const f = facts(ctx).slice(0, 3);
  return {
    settings: fill(base.settings, { heading: ctx.product.name || heading(ctx), heading_accent: tr(ctx, "en détail", "in detail"), text: html(ctx.product.summary) }),
    blocks: base.blocks?.some((b) => b.settings?.title) ? base.blocks : f.length >= 2 ? f.map((x) => ({ type: "card", settings: { title: x.label, text: html(x.value) } })) : [{ type: "card", settings: { title: todo(ctx, "un détail du produit", "a product detail"), text: "" } }],
    samples: false,
  };
};

const guarantee: CopyFn = (ctx, base) => ({
  settings: fill(base.settings, { heading: tr(ctx, "Notre engagement", "Our commitment"), heading_accent: "", text: html(todo(ctx, "votre garantie réelle (durée, conditions de retour, remboursement)", "your real guarantee (duration, return conditions, refund)")), demo_note: "", button_label: buyLabel(ctx), button_link: productLink(ctx) }),
  blocks: [],
  samples: false,
});

const reviews: CopyFn = (ctx, base) => ({
  settings: fill(base.settings, { heading: tr(ctx, "Ils en parlent", "What customers say"), heading_accent: "", rating_text: "", rating_note: "", text: html(todo(ctx, "vos avis clients réels, ou connectez une application d'avis", "your real customer reviews, or connect a reviews app")), fictional_label: tr(ctx, "Avis fictif", "Fictional review") }),
  blocks: [],
  samples: false,
});

const specs: CopyFn = (ctx, base) => {
  const f = facts(ctx);
  return {
    settings: fill(base.settings, { eyebrow: tr(ctx, "Fiche", "Details"), heading: tr(ctx, "Caractéristiques", "Specifications"), heading_accent: "", text: "", note: "" }),
    blocks: base.blocks?.some((b) => b.settings?.rows || b.settings?.items) ? base.blocks : f.length >= 2 ? [{ type: "group", settings: { title: ctx.product.name, rows: f.map((x) => `${x.label} : ${x.value}`).join("\n"), open: true } }] : [{ type: "group", settings: { title: ctx.product.name, rows: todo(ctx, "caractéristiques confirmées", "confirmed specifications"), open: true } }],
    samples: false,
  };
};

const steps: CopyFn = (ctx, base) => ({
  settings: fill(base.settings, { eyebrow: tr(ctx, "Mode d'emploi", "How to use"), heading: tr(ctx, "Comment l'utiliser", "How to use it"), heading_accent: "", text: "", button_label: buyLabel(ctx), button_link: productLink(ctx) }),
  blocks: base.blocks?.some((b) => b.settings?.title) ? base.blocks : [1, 2, 3].map((i) => ({ type: "step", settings: { title: todo(ctx, `étape ${i}`, `step ${i}`), text: "" } })),
  samples: false,
});

const banner: CopyFn = (ctx, base) => ({
  settings: fill(base.settings, { eyebrow: ctx.brand?.name || ctx.shopName, heading: ctx.product.name || heading(ctx), heading_accent: "", text: html(real(ctx.brand?.tagline) ? ctx.brand!.tagline : ctx.product.summary), price_text: price(ctx), price_note: "", button_label: buyLabel(ctx), button_link: productLink(ctx), note: "", image_alt: ctx.product.name }),
  blocks: [],
  samples: false,
});

const stories: CopyFn = (ctx, base) => ({
  settings: fill(base.settings, { heading: tr(ctx, "En situation", "In use"), heading_accent: "", text: "", ai_label: "" }),
  blocks: base.blocks?.length ? base.blocks : [],
  samples: false,
});

const alternating: CopyFn = (ctx, base) => {
  const f = facts(ctx).slice(0, 3);
  return {
    settings: fill(base.settings, { eyebrow: "", heading: ctx.product.name || heading(ctx), heading_accent: "", text: html(ctx.product.summary) }),
    blocks: base.blocks?.some((b) => b.settings?.heading) ? base.blocks : f.length >= 2 ? f.map((x) => ({ type: "row", settings: { eyebrow: "", heading: x.label, heading_accent: "", text: html(x.value), button_label: "", button_link: "", image_alt: ctx.product.name } })) : [{ type: "row", settings: { heading: todo(ctx, "un argument", "an argument"), text: "" } }],
    samples: false,
  };
};

const ingredients: CopyFn = (ctx, base) => ({
  settings: fill(base.settings, { eyebrow: tr(ctx, "Composition", "Composition"), heading: tr(ctx, "Ce qu'il y a dedans", "What is inside"), heading_accent: "", text: "", note: "" }),
  blocks: base.blocks?.some((b) => b.settings?.name) ? base.blocks : [{ type: "ingredient", settings: { name: todo(ctx, "composant", "component"), role: "", note: "" } }],
  samples: false,
});

const quote: CopyFn = (ctx, base) => ({
  // Aucun avis réel connu : ni note en étoiles ni étiquette « Avis fictif » (rien d'inventé sur le site du client).
  settings: fill(base.settings, { eyebrow: tr(ctx, "Témoignage", "Testimonial"), quote: todo(ctx, "un avis client réel", "a real customer review"), author: "", detail: "", rating: ctx.sample ? 5 : 0, label: ctx.sample ? tr(ctx, "Avis fictif", "Fictional review") : "", button_label: buyLabel(ctx), button_link: productLink(ctx) }),
  blocks: [],
  samples: false,
});

const hotspots: CopyFn = (ctx, base) => ({
  settings: fill(base.settings, { eyebrow: tr(ctx, "En détail", "In detail"), heading: ctx.product.name || heading(ctx), heading_accent: "", text: "", demo_note: "", image_alt: ctx.product.name }),
  blocks: base.blocks?.some((b) => b.settings?.title) ? base.blocks : [{ type: "hotspot", settings: { x: 50, y: 50, title: todo(ctx, "un détail à situer sur l'image", "a detail to place on the image"), text: "" } }],
  samples: false,
});

const gallery: CopyFn = (ctx, base) => ({
  settings: fill(base.settings, { eyebrow: "", heading: tr(ctx, "En situation", "In use"), heading_accent: "", text: "", ai_label: "" }),
  blocks: base.blocks,
  samples: false,
});

const featuredPurchase: CopyFn = (ctx, base) => ({
  settings: fill(base.settings, { label: ctx.brand?.name || ctx.shopName, heading: ctx.product.name || heading(ctx), text: html(ctx.product.summary), product_target: ctx.product.target ?? "", product: ctx.product.handle ?? "" }),
  blocks: base.blocks,
  samples: false,
});

const article: CopyFn = (ctx, base) => ({
  settings: fill(base.settings, { heading: todo(ctx, "titre de votre article", "your article title"), heading_accent: "", intro: "", author: "", label_bar: "" }),
  blocks: base.blocks,
  samples: false,
});

export const CONVERSION_COPY: Record<string, CopyFn> = {
  "cv-hero": hero, "cv-feature": feature, "cv-cards": cards, "cv-guarantee": guarantee, "cv-reviews": reviews, "cv-specs": specs, "cv-steps": steps,
  "cv-banner": banner, "cv-stories": stories, "cv-alternating": alternating, "cv-ingredients": ingredients, "cv-quote": quote, "cv-hotspots": hotspots,
  "cv-gallery": gallery, "cv-article": article, "featured-purchase": featuredPurchase,
};
