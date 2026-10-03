/**
 * Contenus rédactionnels de la boutique (produits par l'IA ou par le moteur
 * local), indépendants de la mise en page. Les informations inconnues sont
 * écrites sous la forme « [À compléter : …] » pour rester visibles.
 */
import { z } from "zod";

export const ICONS = ["sparkle", "leaf", "drop", "hand", "shield", "truck", "return", "check"] as const;

export const ShopCopySchema = z.object({
  seo: z.object({ title: z.string(), description: z.string() }),
  announcement: z.array(z.string()).max(3),
  hero: z.object({
    eyebrow: z.string(),
    heading: z.string(),
    line1: z.string(),
    line2: z.string(),
    text: z.string(),
    cta: z.string(),
  }),
  statement: z.object({ eyebrow: z.string(), heading: z.string(), text: z.string() }),
  features: z.object({
    heading: z.string(),
    items: z.array(z.object({ title: z.string(), text: z.string(), icon: z.enum(ICONS) })).min(2).max(6),
  }),
  story: z.object({ heading: z.string(), steps: z.array(z.object({ title: z.string(), text: z.string() })).min(2).max(5) }),
  detail: z.object({ eyebrow: z.string(), heading: z.string(), text: z.string() }),
  specs: z.object({ heading: z.string(), items: z.array(z.object({ label: z.string(), value: z.string() })).max(14) }),
  faq: z.object({ heading: z.string(), items: z.array(z.object({ q: z.string(), a: z.string() })).min(2).max(12) }),
  marquee: z.array(z.string()).min(2).max(6),
  gallery: z.object({ heading: z.string(), captions: z.array(z.string()).max(6) }),
  cta: z.object({ heading: z.string(), text: z.string(), button: z.string() }),
  newsletter: z.object({ heading: z.string(), text: z.string() }),
  product: z.object({
    title: z.string(),
    short: z.string(),
    description_html: z.string(),
    highlights: z.array(z.string()).max(6),
    tabs: z.array(z.object({ heading: z.string(), content_html: z.string() })).max(5),
    reassurance: z.array(z.string()).max(3),
  }),
  about: z.object({
    heading: z.string(),
    intro: z.string(),
    blocks: z.array(z.object({ heading: z.string(), text: z.string() })).min(1).max(4),
    values: z.array(z.object({ title: z.string(), text: z.string() })).max(4),
  }),
  shipping: z.object({ heading: z.string(), body_html: z.string() }),
  contact: z.object({ heading: z.string(), text: z.string() }),
  footer: z.object({ about: z.string(), newsletter: z.string() }),
});

export type ShopCopy = z.infer<typeof ShopCopySchema>;

export const UNKNOWN = (what: string) => `[À compléter : ${what}]`;
