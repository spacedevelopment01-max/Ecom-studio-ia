/**
 * Vidéo déclinée dans un autre format (9:16, 4:5, 1:1, 16:9) : gratuit, sans IA. Les plans filmés et les photos
 * remplissent le nouveau cadre (recadrage centré), les titres, logos, boutons et la carte de fin sont recomposés
 * par le moteur de l'éditeur publicitaire (rien n'est coupé : zones de sécurité de la plateforme), les sous-titres
 * gardent leur taille relative ; textes, musique, voix et durées restent ceux du client.
 */
import { reflow } from "../ad-doc/reflow";
import type { AdDocument } from "../ad-doc/types";
import { SIZES, safeZone } from "./doc";
import { PLATFORM_SPECS } from "./intent";
import type { VideoAspect, VideoDocument, VideoPlatform } from "./types";

export const VIDEO_ASPECTS: VideoAspect[] = ["9:16", "4:5", "1:1", "16:9"];

/** Plateforme du nouveau format : celle du document si elle convient, sinon la plateforme type de ce format. */
export function platformFor(aspect: VideoAspect, current: VideoPlatform): VideoPlatform {
  if (PLATFORM_SPECS[current].aspect === aspect) return current;
  return ({ "9:16": "reels", "4:5": "meta_feed", "1:1": "linkedin", "16:9": "youtube" } as const)[aspect];
}

export function reformatVideoDoc(src: VideoDocument, aspect: VideoAspect): VideoDocument {
  if (src.aspect === aspect) return structuredClone(src);
  const { w, h } = SIZES[aspect];
  const platform = platformFor(aspect, src.platform);
  const safe = safeZone(aspect, platform);
  const target = { width: w, height: h, safe, aspect, platform };
  const asDoc = (layers: AdDocument["layers"]): AdDocument => ({ version: 1, width: src.width, height: src.height, background: "transparent", safe: src.safe, format: { platform: null, aspect: src.aspect }, layers, brand: src.brand, meta: { conceptId: null, source: "user", createdFrom: null } });
  const k = Math.min(w / src.width, h / src.height);
  return {
    ...structuredClone(src),
    width: w,
    height: h,
    aspect,
    platform,
    safe,
    clips: src.clips.map((c) => ({
      ...structuredClone(c),
      overlays: c.overlays.length ? reflow(asDoc(c.overlays), target).layers : [],
      source:
        c.source.kind === "doc"
          ? { ...c.source, doc: reflow(c.source.doc, target) }
          : c.source.kind === "image"
            ? { ...c.source, crop: null } // l'ancien recadrage visait l'ancien format : la photo recouvre le nouveau cadre
            : structuredClone(c.source),
    })),
    subtitles: { ...structuredClone(src.subtitles), style: { ...src.subtitles.style, size: Math.max(18, Math.round(src.subtitles.style.size * k)), offsetY: Math.round(src.subtitles.style.offsetY * k) } },
  };
}
