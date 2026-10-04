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
import { COPY as SERVICES, SERVICE_COPY } from "./section-copy-services";

const ALL: Record<string, CopyFn> = { ...HERO, ...PROOF, ...PRODUCT, ...MEDIA, ...STORY, ...SERVICES };

export function applySectionCopy(type: string, schema: SectionSchema, ctx: ContentContext, base: { settings: Record<string, unknown>; blocks?: { type: string; settings?: Record<string, unknown> }[] }) {
  // Entreprise de services : rédaction propre aux services pour les sections génériques (ouverture, FAQ, avis…).
  const fn = (ctx.business === "services" ? SERVICE_COPY[type] : undefined) ?? ALL[type];
  if (!fn) return { ...base, samples: false };
  try {
    const r = fn(ctx, base, schema);
    return { settings: r.settings, blocks: r.blocks ?? base.blocks, samples: !!r.samples };
  } catch (e) {
    console.warn(`[section-copy] ${type} :`, (e as Error).message);
    return { ...base, samples: false };
  }
}
