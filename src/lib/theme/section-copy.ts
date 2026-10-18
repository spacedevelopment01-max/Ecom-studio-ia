/**
 * Registre des rédactions de sections (voir section-content.ts).
 * Chaque groupe de sections a son fichier : section-copy-<groupe>.ts exportant COPY: Record<type, CopyFn>.
 */
import type { CopyFn, ContentContext } from "./section-content";
import type { SectionSchema } from "./spec";
import { COPY as HERO } from "./section-copy-hero";
import { COPY as PROOF } from "./section-copy-proof";
import { COPY as PRODUCT } from "./section-copy-product";
import { COPY as MEDIA } from "./section-copy-media";
import { COPY as STORY } from "./section-copy-story";
import { COPY as SERVICES, SERVICE_COPY, serviceCta } from "./section-copy-services";
import { EDITORIAL_COPY } from "./section-copy-editorial";
import { REFERENCE_COPY } from "./section-copy-reference";

const ALL: Record<string, CopyFn> = { ...HERO, ...PROOF, ...PRODUCT, ...MEDIA, ...STORY, ...SERVICES, ...REFERENCE_COPY, ...EDITORIAL_COPY };

export function applySectionCopy(type: string, schema: SectionSchema, ctx: ContentContext, base: { settings: Record<string, unknown>; blocks?: { type: string; settings?: Record<string, unknown> }[] }) {
  // Entreprise de services : rédaction propre aux services pour les sections génériques (ouverture, FAQ, avis…).
  const fn = (ctx.business === "services" ? SERVICE_COPY[type] : undefined) ?? ALL[type];
  if (!fn) return { ...base, samples: false };
  try {
    const r = fn(ctx, base, schema);
    if (ctx.business === "services") servicesCta(ctx, r.settings, r.blocks ?? base.blocks);
    return { settings: r.settings, blocks: r.blocks ?? base.blocks, samples: !!r.samples };
  } catch (e) {
    console.warn(`[section-copy] ${type} :`, (e as Error).message);
    return { ...base, samples: false };
  }
}

/** Boutons de vente (« Voir le produit », « Commander », « Ajouter au panier »…) : sans objet sur un site de services. */
const SHOP_CTA = /^(voir le produit|view (the )?product|see the product|commander|shop now|ajouter au panier|add to cart|acheter|buy( now)?|voir la boutique|visit the store|voir la collection|view the collection)\b/i;
const CTA_KEYS = ["button_label", "button", "link_label", "cta", "cta_label", "button_label_1", "button_label_2"];

/** Site de services : chaque bouton de vente devient l'appel à l'action du projet (rendez-vous, devis, appel, contact). */
function servicesCta(ctx: ContentContext, settings: Record<string, unknown>, blocks?: { settings?: Record<string, unknown> }[]) {
  const cta = serviceCta(ctx);
  const fix = (o?: Record<string, unknown>) => {
    if (!o) return;
    for (const k of CTA_KEYS) {
      const v = o[k];
      if (typeof v === "string" && SHOP_CTA.test(v.trim())) {
        o[k] = cta.label;
        const link = k.replace(/label$|_label$/, "").replace(/_$/, "") + "_link";
        for (const lk of [link, "link", "button_link", "url"]) if (lk in o && typeof o[lk] === "string" && /\/products\/|\/collections\//.test(o[lk] as string)) o[lk] = cta.url;
      }
    }
  };
  fix(settings);
  for (const b of blocks ?? []) fix(b.settings);
}
