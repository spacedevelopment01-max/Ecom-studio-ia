/**
 * Contenu des sections ajoutées depuis la bibliothèque, rédigé à partir du VRAI projet
 * (marque, produit, faits confirmés, stratégie), pour que le client se projette tout de suite.
 *
 * Deux modes :
 * - ajout réel (`sample: false`) : uniquement des textes vrais ou neutres ; ce qui demande une
 *   information du marchand (avis, partenaires, remises, délais, mentions légales) reste en
 *   espace réservé « [À compléter : …] ».
 * - aperçu de la bibliothèque (`sample: true`) : en plus, des exemples réalistes à la place des
 *   espaces réservés, chacun marqué « Exemple » (jamais exportés : rien n'est enregistré).
 */
import type { Lang } from "../i18n";
import { pick } from "../i18n";
import { sectorLabel } from "../project-types";
import type { Project } from "../projects";
import type { ThemeSpec, SectionSchema } from "./spec";
import { themeLang } from "./spec";

export type ContentContext = {
  /** Médias appartenant explicitement à la fiche ciblée ; tableau vide = aucun média connu. */
  mediaFiles?: string[];
  /** Visuels de la galerie du produit principal, pour les légendes et choix de cadres (ne restreint pas les médias disponibles). */
  galleryFiles?: string[];
  /** Langue des textes de la boutique (celle du thème). */
  lang: Lang;
  /** Aperçu de la bibliothèque : exemples réalistes autorisés, marqués « Exemple ». */
  sample: boolean;
  shopName: string;
  brand: { name: string; tagline: string; story: string; positioning: string; audience: string; personality: string[]; values: { title: string; text: string }[] } | null;
  product: { handle?: string; target?: string; name: string; summary: string; category: string; sector: string; facts: { label: string; value: string }[]; price: number | null; currency: string; variants: { name: string; values: string[] }[] };
  strategy: { angles: { title: string; idea: string }[]; pillars: string[]; keyMessages: string[]; needs: string[] } | null;
  collections: { title: string; handle: string }[];
  products: { title: string; handle: string }[];
  /** Boutique de produits ou site d'entreprise de services (et son offre). */
  business: "products" | "services";
  services: import("../project-types").ServiceProfile;
};

/** Contexte de rédaction pour un projet et son thème. */
export function contentContext(project: Project, spec: ThemeSpec, sample: boolean): ContentContext {
  const lang = themeLang(spec);
  const b = project.brand;
  const pr = project.product;
  const s = project.strategy;
  return {
    lang,
    sample,
    shopName: b?.name || project.name,
    galleryFiles: spec.store.product?.images ?? [],
    brand: b ? { name: b.name, tagline: b.tagline, story: b.story, positioning: b.positioning, audience: b.audience, personality: b.personality ?? [], values: b.values ?? [] } : null,
    product: {
      handle: spec.store.product.handle, target: spec.store.product.contentTarget,
      name: pr.name || spec.store.product.title || project.name,
      summary: pr.summary,
      category: pr.category,
      sector: sectorLabel(pr.sector, lang),
      facts: pr.facts.filter((f) => f.status === "confirmed" && f.value).map((f) => ({ label: f.label, value: f.value })),
      price: pr.price.status === "confirmed" ? pr.price.amount : null,
      currency: pr.price.currency || "EUR",
      variants: pr.variants ?? [],
    },
    strategy: s ? { angles: s.angles ?? [], pillars: s.pillars ?? [], keyMessages: s.keyMessages ?? [], needs: (s.audience ?? []).flatMap((a) => a.needs ?? []) } : null,
    collections: (spec.store.collections ?? []).map((c: any) => ({ title: String(c.title ?? ""), handle: String(c.handle ?? "") })).filter((c) => c.title),
    business: project.business,
    services: project.services,
    products: ((spec.store as any).products ?? [spec.store.product]).map((p: any) => ({ title: String(p.title ?? ""), handle: String(p.handle ?? "") })).filter((p: any) => p.title),
  };
}

/** Texte dans la langue de la boutique. */
export const tr = (ctx: ContentContext, fr: string, en: string) => pick(ctx.lang, fr, en);
/** Espace réservé explicite (ajout réel) : « [À compléter : …] » / « [To complete: …] ». */
export const todo = (ctx: ContentContext, fr: string, en: string) => pick(ctx.lang, `[À compléter : ${fr}]`, `[To complete: ${en}]`);
/** Marque un exemple d'aperçu (jamais exporté). */
export const example = (ctx: ContentContext, text: string) => pick(ctx.lang, `${text}`, `${text}`);
/** Libellé « Exemple » à afficher à côté d'un contenu d'exemple (nom d'avis, logo…). */
export const exampleTag = (ctx: ContentContext) => pick(ctx.lang, "Exemple", "Example");

/** Rédaction d'une section : complète les textes (seulement les champs vides ou restés au préréglage). */
export type CopyFn = (ctx: ContentContext, base: { settings: Record<string, unknown>; blocks?: { type: string; settings?: Record<string, unknown> }[] }, schema: SectionSchema) => {
  settings: Record<string, unknown>;
  blocks?: { type: string; settings?: Record<string, unknown> }[];
  /** Des exemples d'aperçu ont été utilisés (affiche le bandeau « contenus d'exemple »). */
  samples?: boolean;
};

/** Contexte d'insertion lié à la fiche, sans emprunter les faits ni les photos d'une autre offre. */
export function sectionContentContext(project: Project, spec: ThemeSpec, sample: boolean, template = "index"): ContentContext {
  const ctx = contentContext(project, spec, sample);
  if (template === "product" || template.startsWith("product.")) {
    const candidates = [spec.store.product, ...(spec.store.products ?? [])].filter((p) => (p.template_suffix ? `product.${p.template_suffix}` : "product") === template);
    const p = candidates.length === 1 ? candidates[0] : undefined;
    const item = p?.contentTarget?.startsWith("product:catalog:") ? project.catalog.find((x) => `product:catalog:${x.key}` === p.contentTarget) : undefined;
    ctx.product = p ? { ...ctx.product, name:p.title, handle:p.handle, target:p.contentTarget, category:p.contentTarget === "product:main" ? ctx.product.category : item?.category ?? "", sector:p.contentTarget === "product:main" ? ctx.product.sector : "", summary: p.contentTarget === "product:main" ? project.product.summary : item?.description ?? "", facts:p.contentTarget === "product:main" ? ctx.product.facts : (item?.features ?? []).map((value) => ({ label:pick(ctx.lang,"Caractéristique","Feature"),value })), price:p.price, currency:p.currency, variants:p.options.map((name,i) => ({name,values:[...new Set(p.variants.map((v)=>v.options[i]).filter(Boolean))]})) } : { ...ctx.product, name:pick(ctx.lang,"Produit à choisir","Choose a product"),handle:undefined,target:undefined,summary:"",facts:[],price:null,variants:[] };
    ctx.mediaFiles = p?.images ?? [];
  } else if (template.startsWith("page.")) {
    const pages = spec.store.pages.filter((p) => `page.${p.template_suffix}` === template && p.contentTarget?.startsWith("service:"));
    const service = pages.length === 1 ? project.services.services.find((s) => `service:${s.key}` === pages[0].contentTarget) : undefined;
    if (service) {
      ctx.product = { ...ctx.product, name:service.name,summary:service.description,facts:[],price:null,variants:[] };
      const opening = Object.values(spec.templates[template]?.sections ?? {}).find((s)=>s.type==="ref-hero");
      ctx.mediaFiles = typeof opening?.settings.image_asset === "string" && spec.files[opening.settings.image_asset] ? [opening.settings.image_asset] : [];
    }
  }
  return ctx;
}
