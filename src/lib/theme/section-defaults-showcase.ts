/**
 * Médias du projet pour les sections « vitrine » : avis immersifs, carrousel vidéo premium, contenus alternés,
 * collections premium. Chaque bloc reçoit une photo différente du projet ; une seule carte d'avis et une seule
 * rangée reçoivent une vidéo (la photo sert d'affiche), le carrousel vidéo reçoit toutes les vidéos du projet.
 * Seuls les champs vides sont complétés : les textes (citations, titres) restent les espaces réservés du préréglage.
 */
import type { SectionSchema } from "./spec";

type Blocks = { type: string; settings?: Record<string, unknown> }[];
type Pools = { cutout: string[]; photos: string[]; life: string[]; videos: string[]; posters: string[] };

export const SHOWCASE_MEDIA_TYPES = new Set(["immersive-reviews", "video-carousel", "alternating-content", "collection-list"]);

export function showcaseProjectMedia(type: string, schema: SectionSchema, p: Pools, settings: Record<string, unknown>, blocks?: Blocks, collections: { handle: string; image?: string }[] = []): { settings: Record<string, unknown>; blocks?: Blocks } {
  const out = { ...settings };
  // Photos en situation d'abord (plus parlantes en plein cadre), puis scènes et détails ; la photo détourée en dernier recours.
  const photos = [...p.life, ...p.photos].filter((f, i, a) => a.indexOf(f) === i);
  const pool = photos.length ? photos : p.cutout;
  let n = 0;
  const photo = () => (pool.length ? pool[n++ % pool.length] : undefined);
  const set = (o: Record<string, unknown>, id: string, val: unknown) => {
    if (val !== undefined && !o[id]) o[id] = val;
  };
  // Vidéos verticales (reels) uniquement : le carrousel passe au format 9:16.
  if (type === "video-carousel" && p.videos.length && p.videos.every((f) => /reel/.test(f))) set(out, "ratio", "portrait");

  // Collections premium : grille asymétrique (préréglage) et vraies collections du projet, une par carte.
  if (type === "collection-list") set(out, "layout", "asymmetric");

  const preset = ((schema.presets?.[0] as { blocks?: Blocks } | undefined)?.blocks ?? []).filter((b) => !b.type.startsWith("@"));
  const base = !blocks && type === "collection-list" && collections.length > preset.length ? collections.slice(0, 6).map(() => ({ type: "collection" })) : (blocks ?? preset);
  const list = base.map((b: { type: string; settings?: Record<string, unknown> }, i: number) => {
    const s: Record<string, unknown> = { ...(b.settings ?? {}) };
    const defs = schema.blocks.find((x) => x.type === b.type)?.settings ?? [];
    const has = (id: string) => defs.some((x) => x.id === id);
    if (type === "video-carousel") {
      if (has("video_asset") && p.videos.length) set(s, "video_asset", p.videos[i % p.videos.length]);
      // Affiche : celle de la vidéo si le projet en a, sinon une photo (le carrousel reste illustré sans vidéo).
      if (has("poster_asset")) set(s, "poster_asset", p.videos.length && p.posters.length ? p.posters[i % p.posters.length] : photo());
    } else {
      const col = type === "collection-list" ? collections[i] : undefined;
      if (col && has("collection")) set(s, "collection", col.handle);
      if (has("image_asset")) set(s, "image_asset", col?.image || photo());
      const wantsVideo = (type === "immersive-reviews" || type === "alternating-content") && i === 1;
      if (wantsVideo && has("video_asset") && p.videos.length) set(s, "video_asset", p.videos[0]);
    }
    return { type: b.type, settings: s };
  });
  return { settings: out, blocks: list.length ? list : blocks };
}
