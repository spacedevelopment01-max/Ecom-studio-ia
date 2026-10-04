/**
 * Section ajoutée depuis la bibliothèque : remplie d'emblée avec les médias du projet
 * (photo détourée, photos en situation, scènes, vidéos) au lieu d'emplacements vides.
 * Seuls les champs vides sont complétés ; les textes restent ceux du préréglage, à personnaliser.
 */
import { sectionSchema, type ThemeSpec } from "./spec";
import { PREMIUM_MEDIA_TYPES, premiumProjectMedia } from "./section-defaults-premium";
import { SHOWCASE_MEDIA_TYPES, showcaseProjectMedia } from "./section-defaults-showcase";
import { BRAND_MEDIA_TYPES, brandProjectMedia } from "./section-defaults-brand";
import { UTILITY_MEDIA_TYPES, utilityProjectMedia } from "./section-defaults-utility";
import { NARRATIVE_MEDIA_TYPES, narrativeProjectMedia } from "./section-defaults-narrative";
import { applySectionCopy } from "./section-copy";
import type { ContentContext } from "./section-content";

type Blocks = { type: string; settings?: Record<string, unknown> }[];

/** Sections dont les blocs portent des images (galeries, cartes) : on les illustre aussi. */
const BLOCK_IMAGES = new Set(["gallery-mosaic", "horizontal-gallery", "stack-cards", "story-circles", "routine-steps", "situations"]);

export function mediaPools(spec: ThemeSpec) {
  const files = Object.keys(spec.files);
  const pick = (re: RegExp) => files.filter((f) => re.test(f) && !/galerie|favicon|logo/.test(f));
  const cutout = pick(/detoure/);
  const life = pick(/en-situation|lifestyle/);
  const scenes = pick(/scene|hero/).filter((f) => /\.(jpe?g|png|webp)$/.test(f));
  const details = pick(/detail|packshot/);
  return {
    cutout,
    photos: [...life, ...scenes, ...details].filter((f, i, a) => a.indexOf(f) === i),
    life: life.length ? life : scenes,
    videos: pick(/^es-video-[^a]|^es-reel-[^a]/).filter((f) => f.endsWith(".mp4")),
    posters: pick(/affiche/),
  };
}

/**
 * Section remplie avec les médias du projet puis, si un contexte de rédaction est fourni,
 * avec des textes rédigés à partir du projet (section-copy.ts).
 */
export function withProjectMedia(spec: ThemeSpec, type: string, settings: Record<string, unknown> = {}, blocks?: Blocks, ctx?: ContentContext): { settings: Record<string, unknown>; blocks?: Blocks; samples?: boolean } {
  const media = projectMediaOnly(spec, type, settings, blocks);
  const schema = sectionSchema(spec, type);
  if (!ctx || !schema) return media;
  // Les blocs du préréglage servent de base à la rédaction quand la section n'en a pas reçu.
  const preset = ((schema.presets?.[0] as { blocks?: Blocks } | undefined)?.blocks ?? []).filter((b) => !b.type.startsWith("@")).map((b) => ({ type: b.type, settings: { ...(b.settings ?? {}) } }));
  return applySectionCopy(type, schema, ctx, { settings: media.settings, blocks: media.blocks ?? (preset.length ? preset : undefined) });
}

function projectMediaOnly(spec: ThemeSpec, type: string, settings: Record<string, unknown> = {}, blocks?: Blocks): { settings: Record<string, unknown>; blocks?: Blocks } {
  const schema = sectionSchema(spec, type);
  if (!schema) return { settings, blocks };
  const p = mediaPools(spec);
  if (PREMIUM_MEDIA_TYPES.has(type)) return premiumProjectMedia(type, schema, p, settings, blocks);
  if (SHOWCASE_MEDIA_TYPES.has(type)) return showcaseProjectMedia(type, schema, p, settings, blocks, spec.store.collections ?? []);
  if (BRAND_MEDIA_TYPES.has(type)) return brandProjectMedia(type, schema, p, settings, blocks);
  if (UTILITY_MEDIA_TYPES.has(type)) return utilityProjectMedia(type, schema, p, settings, blocks);
  if (NARRATIVE_MEDIA_TYPES.has(type)) return narrativeProjectMedia(spec, type, schema, p, settings, blocks);
  let n = 0;
  const nextPhoto = () => p.photos.length ? p.photos[n++ % p.photos.length] : undefined;
  const out = { ...settings };
  const has = (id: string) => schema.settings.some((s) => s.id === id);
  const empty = (id: string) => has(id) && !out[id];
  if (type === "routine-steps") {
    if (empty("image_asset") && p.cutout[0]) out.image_asset = p.cutout[0];
  } else if (type === "before-after") {
    if (empty("image_before_asset")) out.image_before_asset = p.cutout[0] ?? nextPhoto();
    if (empty("image_after_asset")) out.image_after_asset = p.life[0] ?? nextPhoto();
  } else if (empty("image_asset")) {
    // Héros éditorial : le produit détouré flotte sur le grand titre (une photo pleine le masquerait).
    const v = type === "hero-editorial" && p.cutout[0] ? p.cutout[0] : type.startsWith("hero") || type === "image-with-text" || type === "cta-banner" ? p.life[0] ?? nextPhoto() : nextPhoto();
    if (v) out.image_asset = v;
  }
  if (empty("video_asset") && p.videos[0]) out.video_asset = p.videos[0];
  if (empty("poster_asset") && p.posters[0]) out.poster_asset = p.posters[0];

  const preset = ((schema.presets?.[0] as { blocks?: Blocks } | undefined)?.blocks ?? []).filter((b) => !b.type.startsWith("@"));
  let outBlocks = blocks ?? preset.map((b) => ({ type: b.type, settings: { ...(b.settings ?? {}) } }));
  if (BLOCK_IMAGES.has(type) || type === "video-reels") {
    let v = 0;
    outBlocks = outBlocks.map((b) => {
      const bs = schema.blocks.find((x) => x.type === b.type)?.settings ?? [];
      const s = { ...(b.settings ?? {}) };
      if (bs.some((x) => x.id === "image_asset") && !s.image_asset) {
        const img = type === "routine-steps" ? p.cutout[0] ?? nextPhoto() : nextPhoto();
        if (img) s.image_asset = img;
      }
      if (bs.some((x) => x.id === "video_asset") && !s.video_asset && p.videos.length) s.video_asset = p.videos[v++ % p.videos.length];
      if (bs.some((x) => x.id === "poster_asset") && !s.poster_asset && p.posters.length) s.poster_asset = p.posters[(v - 1 + p.posters.length) % p.posters.length];
      return { type: b.type, settings: s };
    });
  }
  return { settings: out, blocks: outBlocks.length ? outBlocks : blocks };
}
