/**
 * Médias du projet pour les sections de marque et de réassurance (promesse, bénéfices animés,
 * histoire animée, scène flottante, professionnels, précautions, réassurance, recommandations).
 * - produit détouré là où il « flotte » (scène flottante, bénéfices animés) ;
 * - photo en situation pour la promesse, scène pour le fond de la scène flottante ;
 * - une photo différente par chapitre de l'histoire animée ;
 * - jamais de photo du projet pour les professionnels (leur photo n'est utilisable qu'avec leur accord).
 * Seuls les champs vides sont complétés.
 */
import type { SectionSchema } from "./spec";

type Blocks = { type: string; settings?: Record<string, unknown> }[];
type Pools = { cutout: string[]; photos: string[]; life: string[]; videos: string[]; posters: string[] };

export const BRAND_MEDIA_TYPES = new Set(["brand-promise", "animated-benefits", "animated-story", "floating-scene", "expert-endorsements", "precautions", "reassurance", "product-recommendations"]);

export function brandProjectMedia(type: string, schema: SectionSchema, p: Pools, settings: Record<string, unknown>, blocks?: Blocks): { settings: Record<string, unknown>; blocks?: Blocks } {
  const out: Record<string, unknown> = { ...settings };
  const photos = p.photos.length ? p.photos : p.cutout;
  const scenes = photos.filter((f) => /scene|hero|banniere/.test(f));
  const set = (id: string, val: unknown) => {
    if (val !== undefined && schema.settings.some((s) => s.id === id) && !out[id]) out[id] = val;
  };
  if (type === "brand-promise") set("image_asset", p.life[0] ?? photos[0]);
  if (type === "animated-benefits") set("image_asset", p.cutout[0] ?? photos[0]);
  if (type === "floating-scene") {
    set("product_asset", p.cutout[0] ?? photos[0]);
    set("image_asset", scenes[0] ?? photos.find((f) => f !== out.product_asset));
  }
  const preset = ((schema.presets?.[0] as { blocks?: Blocks } | undefined)?.blocks ?? []).filter((b) => !b.type.startsWith("@"));
  let list = (blocks ?? preset).map((b) => ({ type: b.type, settings: { ...(b.settings ?? {}) } }));
  if (type === "animated-story") {
    // Photos en situation et scènes d'abord (récit), détails ensuite.
    // Un même média peut porter deux noms (en-situation-2-abc / scene-1-abc) : dédoublonné par sa clé.
    const key = (f: string) => f.replace(/\.[a-z0-9]+$/i, "").split("-").pop();
    const pool = [...p.life, ...photos].filter((f, i, a) => a.findIndex((g) => key(g) === key(f)) === i);
    let n = 0;
    list = list.map((b) => (b.settings.image_asset || !pool.length ? b : { ...b, settings: { ...b.settings, image_asset: pool[n++ % pool.length] } }));
  }
  return { settings: out, blocks: list.length ? list : blocks };
}
