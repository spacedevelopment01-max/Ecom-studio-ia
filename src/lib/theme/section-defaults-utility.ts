/**
 * Médias du projet pour les sections « pratiques » (menu visuel, mode d'emploi, mur d'images, onglets,
 * offre centrale, newsletter avec média) : chaque bloc reçoit une photo différente du projet ; une seule
 * vidéo là où elle a du sens. Seuls les champs vides sont complétés.
 * Jamais de logo (Logos et partenaires) : les logos de partenaires viennent uniquement du marchand.
 */
import type { SectionSchema } from "./spec";

type Blocks = { type: string; settings?: Record<string, unknown> }[];
type Pools = { cutout: string[]; photos: string[]; life: string[]; videos: string[]; posters: string[] };

export const UTILITY_MEDIA_TYPES = new Set(["visual-menu", "how-to", "customer-wall", "content-tabs", "featured-offer", "newsletter-media", "logo-list", "product-360", "legal-page", "shipping-journey"]);

/** Index du bloc qui reçoit une vidéo du projet (aucun : -1). */
const VIDEO_BLOCK: Record<string, number> = { "how-to": 1, "customer-wall": 2 };

export function utilityProjectMedia(type: string, schema: SectionSchema, p: Pools, settings: Record<string, unknown>, blocks?: Blocks): { settings: Record<string, unknown>; blocks?: Blocks } {
  const out: Record<string, unknown> = { ...settings };
  const photos = p.photos.length ? p.photos : p.cutout;
  let n = 0;
  const photo = () => (photos.length ? photos[n++ % photos.length] : undefined);
  const has = (id: string) => schema.settings.some((s) => s.id === id);
  const set = (o: Record<string, unknown>, id: string, val: unknown) => {
    if (val !== undefined && !o[id]) o[id] = val;
  };

  if (type === "featured-offer" && has("image_asset")) set(out, "image_asset", p.life[0] ?? photo());
  if (type === "newsletter-media") {
    set(out, "image_asset", p.life[1] ?? p.life[0] ?? photo());
    if (has("video_asset")) set(out, "video_asset", p.videos[0]);
  }

  const preset = ((schema.presets?.[0] as { blocks?: Blocks } | undefined)?.blocks ?? []).filter((b) => !b.type.startsWith("@"));
  let outBlocks = blocks ?? preset.map((b) => ({ type: b.type, settings: { ...(b.settings ?? {}) } }));
  if (type === "visual-menu" || type === "how-to" || type === "customer-wall" || type === "content-tabs") {
    outBlocks = outBlocks.map((b, i) => {
      const bs = schema.blocks.find((x) => x.type === b.type)?.settings ?? [];
      const s = { ...(b.settings ?? {}) };
      if (bs.some((x) => x.id === "image_asset")) set(s, "image_asset", photo());
      if (VIDEO_BLOCK[type] === i && bs.some((x) => x.id === "video_asset")) set(s, "video_asset", p.videos[0]);
      return { type: b.type, settings: s };
    });
  }
  return { settings: out, blocks: outBlocks.length ? outBlocks : blocks };
}
