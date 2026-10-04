/**
 * Médias du projet pour les sections premium à médias multiples (diaporama, double bannière, jour / nuit,
 * galeries) : chaque bloc reçoit une photo différente du projet, et seuls les blocs prévus pour la vidéo
 * reçoivent une vidéo (première diapositive, blocs « Vidéo » des galeries). Seuls les champs vides sont complétés.
 */
import type { SectionSchema } from "./spec";

type Blocks = { type: string; settings?: Record<string, unknown> }[];
type Pools = { cutout: string[]; photos: string[]; life: string[]; videos: string[]; posters: string[] };

export const PREMIUM_MEDIA_TYPES = new Set(["slideshow", "double-banner", "day-night", "media-gallery", "social-gallery", "editorial-gallery", "faq", "hero", "hero-flex"]);

export function premiumProjectMedia(type: string, schema: SectionSchema, p: Pools, settings: Record<string, unknown>, blocks?: Blocks): { settings: Record<string, unknown>; blocks?: Blocks } {
  // Comme l'éditeur Shopify : les réglages du préréglage s'appliquent à l'ajout (sans écraser ceux fournis).
  const presetSettings = (schema.presets?.[0] as { settings?: Record<string, unknown> } | undefined)?.settings ?? {};
  const out: Record<string, unknown> = { ...presetSettings, ...settings };
  // Photos en situation d'abord, puis scènes et détails ; la photo détourée en dernier recours.
  const photos = p.photos.length ? p.photos : p.cutout;
  let n = 0;
  const photo = () => (photos.length ? photos[n++ % photos.length] : undefined);
  let v = 0;
  const video = () => (p.videos.length ? p.videos[v++ % p.videos.length] : undefined);
  const set = (o: Record<string, unknown>, id: string, val: unknown) => {
    if (val !== undefined && !o[id]) o[id] = val;
  };

  if (type === "hero" || type === "hero-flex") {
    set(out, "image_asset", p.life[0] ?? photo());
    set(out, "video_asset", video());
  }
  if (type === "day-night") {
    set(out, "day_image_asset", p.life[0] ?? photo());
    set(out, "night_image_asset", photos.find((f) => f !== out.day_image_asset) ?? photo());
    return { settings: out, blocks };
  }

  const preset = ((schema.presets?.[0] as { blocks?: Blocks } | undefined)?.blocks ?? []).filter((b) => !b.type.startsWith("@"));
  let list = (blocks ?? preset).map((b) => ({ type: b.type, settings: { ...(b.settings ?? {}) } }));
  // Sans vidéo dans le projet, les blocs « Vidéo » des galeries deviennent des blocs photo.
  if (!p.videos.length) list = list.map((b) => (b.type === "video" && schema.blocks.some((x) => x.type === "image") ? { ...b, type: "image" } : b));
  list = list.map((b, i) => {
    const s = b.settings;
    const defs = schema.blocks.find((x) => x.type === b.type)?.settings ?? [];
    const has = (id: string) => defs.some((x) => x.id === id);
    if (has("image_asset")) set(s, "image_asset", photo());
    const wantsVideo = b.type === "video" || (type === "slideshow" && i === 0) || (type === "social-gallery" && (i === 1 || i === 4));
    if (wantsVideo && has("video_asset")) set(s, "video_asset", video());
    // Affiche d'une vidéo de galerie : une photo du projet (les affiches générées portent du texte, mal recadré en vignette).
    if (b.type === "video" && has("poster_asset")) set(s, "poster_asset", photo());
    return { type: b.type, settings: s };
  });
  return { settings: out, blocks: list.length ? list : blocks };
}
