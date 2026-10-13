/**
 * Bibliothèque de modèles de publications : des dizaines de compositions (photo pleine page, partages, cadres,
 * collages, typographiques, promotionnelles, épurées), chacune déclinable en schémas de couleurs de la marque et
 * en traitements de photo, refaite pour chaque format. Choix automatique sans répétition (poster.ts) ou choix du
 * client dans la galerie du studio. Aucun appel à l'IA.
 */
import { loadImage } from "@napi-rs/canvas";
import type { RenderEnv } from "../../ad-doc/render";
import type { AdDocument } from "../../ad-doc/types";
import { ensureFonts } from "../../media/fonts";
import type { ComposeInput } from "../compose";
import { interestPoints, Kit, type Scheme } from "./kit";
import type { Template } from "./types";
import { TEMPLATES_A } from "./templates/a";
import { TEMPLATES_B } from "./templates/b";
import { TEMPLATES_C } from "./templates/c";
import { TEMPLATES_D } from "./templates/d";
import { TEMPLATES_E } from "./templates/e";
import { TEMPLATES_F } from "./templates/f";
import { TEMPLATES_G } from "./templates/g";
import { TEMPLATES_H } from "./templates/h";
import { TEMPLATES_I } from "./templates/i";

export const TEMPLATES: Template[] = [...TEMPLATES_A, ...TEMPLATES_B, ...TEMPLATES_C, ...TEMPLATES_D, ...TEMPLATES_E, ...TEMPLATES_F, ...TEMPLATES_G, ...TEMPLATES_H, ...TEMPLATES_I];
export const templateById = (id: string) => TEMPLATES.find((t) => t.id === id) ?? null;
export const isTemplateLayout = (l: unknown): l is `tpl:${string}` => typeof l === "string" && l.startsWith("tpl:");

/** Modèles utilisables pour une création (avec ou sans photo). */
export const templatesFor = (hasPhoto: boolean) => TEMPLATES.filter((t) => (hasPhoto ? t.photo !== "none" : t.photo !== "required"));

export async function buildTemplateDocument(i: ComposeInput, id: string): Promise<{ doc: AdDocument; images: RenderEnv["images"] }> {
  ensureFonts();
  const hasPhoto = !!i.background;
  let tpl = templateById(id);
  if (!tpl || (tpl.photo === "required" && !hasPhoto)) tpl = templatesFor(hasPhoto)[0];
  const images: RenderEnv["images"] = new Map();
  const bgId = i.background ? (i.ids?.background ?? "background") : null;
  const logoId = i.logo ? (i.ids?.logo ?? "logo") : null;
  const lightId = i.logoLight ? (i.ids?.logoLight ?? "logo-light") : null;
  if (bgId) images.set(bgId, (await loadImage(i.background!)) as never);
  if (logoId) images.set(logoId, (await loadImage(i.logo!)) as never);
  if (lightId) images.set(lightId, (await loadImage(i.logoLight!)) as never);
  const v = i.variant ?? {};
  const scheme = (v.scheme && tpl.schemes.includes(v.scheme as Scheme) ? v.scheme : tpl.schemes[0]) as Scheme;
  const treatment = v.treatment && (!tpl.treatments || tpl.treatments.includes(v.treatment)) ? v.treatment : (tpl.treatments?.[0] ?? "natural");
  const bg = bgId ? images.get(bgId)! : null;
  const lg = logoId ? images.get(logoId)! : null;
  const art = i.art ?? { style: "warm", heading: i.typo.heading, headingWeight: i.typo.headingWeight ?? 600, body: i.typo.body, display: i.typo.heading, displayWeight: 800, uppercase: !!i.typo.uppercase, cta: "pill", arrow: true, cycle: ["editorial"] };
  const k = new Kit({
    format: i.format,
    palette: i.palette,
    typo: i.typo,
    art,
    brand: i.brand,
    headline: i.headline,
    subline: i.subline?.trim() || null,
    eyebrow: i.eyebrow?.trim() || null,
    cta: i.cta,
    scheme,
    treatment,
    photo: bg && bgId ? { id: bgId, width: bg.width, height: bg.height, points: await interestPoints(i.background!).catch(() => []) } : null,
    logo: lg && logoId ? { id: logoId, width: lg.width, height: lg.height, lightId } : null,
    images,
  });
  tpl.build(k);
  const doc = k.finalize();
  doc.meta = { ...doc.meta, conceptId: i.conceptId ?? null, recipe: { layout: `tpl:${tpl.id}`, art: art as unknown as Record<string, unknown>, palette: { ...i.palette }, typo: { heading: i.typo.heading, body: i.typo.body, ...(i.typo.headingWeight ? { headingWeight: i.typo.headingWeight } : {}), ...(i.typo.uppercase ? { uppercase: true } : {}) }, brand: i.brand, eyebrow: i.eyebrow ?? null, logo: logoId, logoLight: lightId, variant: { treatment, scheme, logo: "column" } } };
  return { doc, images };
}
