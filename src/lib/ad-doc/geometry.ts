/**
 * Géométrie de l'éditeur visuel (pure, testable) : sélection au point (rotation comprise), poignées de
 * redimensionnement, rotation, repères d'alignement magnétiques (bords, centres, zones de sécurité, autres calques).
 */
import type { AdDocument, Layer } from "./types";

export type Box = { x: number; y: number; w: number; h: number };
export type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
export type Guide = { axis: "x" | "y"; at: number };

/** Point dans le repère non tourné du calque. */
export function toLocal(l: Box & { rotation: number }, x: number, y: number) {
  if (!l.rotation) return { x, y };
  const cx = l.x + l.w / 2;
  const cy = l.y + l.h / 2;
  const a = (-l.rotation * Math.PI) / 180;
  const dx = x - cx;
  const dy = y - cy;
  return { x: cx + dx * Math.cos(a) - dy * Math.sin(a), y: cy + dx * Math.sin(a) + dy * Math.cos(a) };
}

export const inside = (l: Box & { rotation: number }, x: number, y: number) => {
  const p = toLocal(l, x, y);
  return p.x >= l.x && p.x <= l.x + l.w && p.y >= l.y && p.y <= l.y + l.h;
};

/** Calque visible le plus en avant sous le point (les fonds pleine page passent après les autres). */
export function hitTest(doc: AdDocument, x: number, y: number): Layer | null {
  const hits = [...doc.layers].reverse().filter((l) => l.visible && inside(l, x, y));
  const full = (l: Layer) => l.w >= doc.width * 0.98 && l.h >= doc.height * 0.98;
  return hits.find((l) => !full(l)) ?? hits[0] ?? null;
}

/** Nouveau cadre après glissement d'une poignée (`keep` : proportions conservées, ex. image ou Maj enfoncée). */
export function resizeBox(b: Box, h: Handle, dx: number, dy: number, keep = false, min = 8): Box {
  let { x, y, w, h: hh } = b;
  if (h.includes("e")) w = b.w + dx;
  if (h.includes("s")) hh = b.h + dy;
  if (h.includes("w")) {
    w = b.w - dx;
    x = b.x + dx;
  }
  if (h.includes("n")) {
    hh = b.h - dy;
    y = b.y + dy;
  }
  if (keep && h.length === 2) {
    const r = b.w / b.h;
    if (Math.abs(w / b.w) > Math.abs(hh / b.h)) hh = w / r;
    else w = hh * r;
    if (h.includes("w")) x = b.x + b.w - w;
    if (h.includes("n")) y = b.y + b.h - hh;
  }
  if (w < min) {
    if (h.includes("w")) x -= min - w;
    w = min;
  }
  if (hh < min) {
    if (h.includes("n")) y -= min - hh;
    hh = min;
  }
  return { x, y, w, h: hh };
}

/** Angle (degrés) du pointeur autour du centre ; par pas de 15° si `step`. */
export function angleAt(b: Box, x: number, y: number, step = false): number {
  const deg = (Math.atan2(y - (b.y + b.h / 2), x - (b.x + b.w / 2)) * 180) / Math.PI + 90;
  const a = ((deg % 360) + 360) % 360;
  return step ? Math.round(a / 15) * 15 % 360 : Math.round(a * 10) / 10;
}

/**
 * Repères magnétiques : le cadre déplacé s'aligne sur les bords et le centre de la page, les zones de sécurité et les
 * autres calques quand il en est à moins de `threshold` pixels. Renvoie le décalage à appliquer et les repères.
 */
export function snapBox(doc: AdDocument, b: Box, excludeId: string | null, threshold: number): { dx: number; dy: number; guides: Guide[] } {
  const xs = [0, doc.width / 2, doc.width, doc.safe.side, doc.width - doc.safe.side];
  const ys = [0, doc.height / 2, doc.height, doc.safe.top, doc.height - doc.safe.bottom];
  for (const l of doc.layers) {
    if (l.id === excludeId || !l.visible || (l.w >= doc.width * 0.98 && l.h >= doc.height * 0.98)) continue;
    xs.push(l.x, l.x + l.w / 2, l.x + l.w);
    ys.push(l.y, l.y + l.h / 2, l.y + l.h);
  }
  const best = (edges: number[], targets: number[]) => {
    let d: number | null = null;
    let at = 0;
    for (const e of edges)
      for (const t of targets)
        if (Math.abs(t - e) <= threshold && (d == null || Math.abs(t - e) < Math.abs(d))) {
          d = t - e;
          at = t;
        }
    return d == null ? null : { d, at };
  };
  const sx = best([b.x, b.x + b.w / 2, b.x + b.w], xs);
  const sy = best([b.y, b.y + b.h / 2, b.y + b.h], ys);
  const guides: Guide[] = [];
  if (sx) guides.push({ axis: "x", at: sx.at });
  if (sy) guides.push({ axis: "y", at: sy.at });
  return { dx: sx?.d ?? 0, dy: sy?.d ?? 0, guides };
}

/** Alignement d'un calque sur la page (gauche, centre, droite, haut, milieu, bas), dans la zone de sécurité. */
export function alignBox(doc: AdDocument, b: Box, where: "left" | "center" | "right" | "top" | "middle" | "bottom"): { x: number; y: number } {
  const S = doc.safe;
  switch (where) {
    case "left":
      return { x: S.side, y: b.y };
    case "center":
      return { x: (doc.width - b.w) / 2, y: b.y };
    case "right":
      return { x: doc.width - S.side - b.w, y: b.y };
    case "top":
      return { x: b.x, y: S.top };
    case "middle":
      return { x: b.x, y: (doc.height - b.h) / 2 };
    case "bottom":
      return { x: b.x, y: doc.height - S.bottom - b.h };
  }
}

/** Identifiant unique d'un nouveau calque. */
export const newLayerId = (doc: AdDocument, prefix: string) => {
  let i = 1;
  while (doc.layers.some((l) => l.id === `${prefix}-${i}`)) i++;
  return `${prefix}-${i}`;
};
