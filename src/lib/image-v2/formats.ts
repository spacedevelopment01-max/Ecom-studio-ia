/**
 * Formats et cadrage (Image V2). Le format est choisi dès le brief : recherche dans la bonne orientation, génération
 * au bon rapport. Le recadrage n'est qu'un ajustement : il suit la zone la plus importante de l'image (attention) et
 * il est REFUSÉ quand il couperait trop (une image carrée ne devient pas une bannière 4:1).
 */
import sharp from "sharp";
import type { AspectId, FormatSpec, Support, VisualKind } from "./types";

export const FORMATS: Record<AspectId, FormatSpec> = {
  "1:1": { aspect: "1:1", width: 1080, height: 1080, label: "carré", textZone: "none" },
  "4:5": { aspect: "4:5", width: 1080, height: 1350, label: "portrait 4:5", textZone: "bottom" },
  "2:3": { aspect: "2:3", width: 1080, height: 1620, label: "portrait 2:3", textZone: "top" },
  "3:2": { aspect: "3:2", width: 1620, height: 1080, label: "paysage 3:2", textZone: "left" },
  "9:16": { aspect: "9:16", width: 1080, height: 1920, label: "vertical 9:16", textZone: "top" },
  "16:9": { aspect: "16:9", width: 1920, height: 1080, label: "paysage 16:9", textZone: "left" },
  "3:1": { aspect: "3:1", width: 2400, height: 800, label: "bannière 3:1", textZone: "left" },
  "4:1": { aspect: "4:1", width: 2400, height: 600, label: "bannière large 4:1", textZone: "left" },
};

/** Format personnalisé (largeur × hauteur) ramené au rapport connu le plus proche. */
export function nearestAspect(w: number, h: number): AspectId {
  const r = w / h;
  return (Object.values(FORMATS) as FormatSpec[]).reduce((best, f) => (Math.abs(Math.log(f.width / f.height / r)) < Math.abs(Math.log(FORMATS[best].width / FORMATS[best].height / r)) ? f.aspect : best), "1:1" as AspectId);
}

/** Format par défaut d'un support et d'une intention (le module peut toujours le préciser). */
export function defaultAspect(support: Support, kind: VisualKind): AspectId {
  if (kind === "banner" || support === "banner") return "3:1";
  if (support === "social") return kind === "social_image" ? "4:5" : "1:1";
  if (support === "ad") return "4:5";
  if (support === "video") return "9:16";
  if (support === "product_page" || kind === "packshot") return "1:1";
  if (support === "service_page") return "4:5";
  if (support === "blog") return "16:9";
  return "16:9";
}

export const orientationOf = (a: AspectId): "landscape" | "portrait" | "square" => {
  const f = FORMATS[a];
  return f.width > f.height * 1.1 ? "landscape" : f.height > f.width * 1.1 ? "portrait" : "square";
};

/** Rapport accepté par la génération d'ambiance (le plus proche) : le cadrage est pensé avant de générer. */
export function generationAspect(a: AspectId): "1:1" | "4:5" | "9:16" | "16:9" {
  if (a === "1:1") return "1:1";
  if (a === "4:5" || a === "2:3") return "4:5";
  if (a === "9:16") return "9:16";
  return "16:9";
}

/** Part de l'image source gardée par un recadrage au format visé (1 = rien de coupé). */
export function keptShare(w: number, h: number, a: AspectId): number {
  const target = FORMATS[a].width / FORMATS[a].height;
  const src = w / h;
  return src > target ? target / src : src / target;
}

/**
 * Recadrage refusé en dessous de cette part gardée : l'image ne convient pas à ce format. Une photo 3:2 donne une
 * bannière 3:1 (moitié gardée, zone importante suivie) ; un carré ne devient jamais une bannière (un tiers gardé).
 */
export const MIN_KEPT_SHARE = 0.5;

/** L'image convient-elle au format (résolution et recadrage raisonnable) ? Raison lisible sinon. */
export function fitsFormat(w: number, h: number, a: AspectId): { ok: boolean; reason: string | null } {
  const f = FORMATS[a];
  const kept = keptShare(w, h, a);
  if (kept < MIN_KEPT_SHARE) return { ok: false, reason: `recadrage trop fort pour ${f.label} (${Math.round(kept * 100)} % gardé)` };
  // Côté utile après recadrage : au moins 60 % de la taille de sortie (agrandir davantage dégrade l'image).
  const usefulW = w > h * (f.width / f.height) ? h * (f.width / f.height) : w;
  if (usefulW < f.width * 0.6) return { ok: false, reason: `résolution insuffisante pour ${f.label} (${Math.round(usefulW)} px utiles)` };
  return { ok: true, reason: null };
}

/** Recadre en gardant la zone la plus importante (stratégie « attention » de sharp), ou null si le format ne convient pas. */
export async function frameTo(img: Buffer, a: AspectId): Promise<Buffer | null> {
  const m = await sharp(img, { failOn: "none" }).metadata();
  if (!m.width || !m.height || !fitsFormat(m.width, m.height, a).ok) return null;
  const f = FORMATS[a];
  return sharp(img, { failOn: "none" }).rotate().resize(f.width, f.height, { fit: "cover", position: sharp.strategy.attention, withoutEnlargement: false }).jpeg({ quality: 88 }).toBuffer();
}
