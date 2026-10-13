/**
 * Bibliothèque de modèles — lot E (10 modèles) : la photo en pleine page, mise en scène différemment à chaque fois
 * (bloc d'angle, carte flottante, bande dépolie, ruban vertical, cadre fin, voile en biais, anneau, pastille,
 * lumière latérale, dégradé du haut). Le texte reste toujours lisible : voile ou surface sous chaque bloc.
 */
import { rgba } from "../kit";
import type { Template } from "../types";
import { col, deep, hair, pad, readVeil, soft, tsize } from "./util";

export const TEMPLATES_E: Template[] = [
  {
    id: "top-fade",
    name: ["Dégradé du haut", "Top fade"],
    family: "photo",
    photo: "required",
    schemes: ["dark", "brand"],
    treatments: ["natural", "moody", "cool"],
    build(k) {
      k.fullPhoto();
      readVeil(k, "top", k.pick(0.75, 0.62, 0.58, 0.55), deep(k), 0.88);
      const h = k.H * k.pick(0.82, 0.55, 0.5, 0.46);
      col(k, { x: k.m.side, y: k.m.top, w: k.W * k.pick(0.55, 0.84, 0.84, 0.86), h }, { valign: "top", title: tsize(k, 0.1, 0.085, 0.09, 0.1), eyebrow: true, onDark: true });
    },
  },
  {
    id: "corner-block",
    name: ["Bloc d'angle", "Corner block"],
    family: "photo",
    photo: "required",
    schemes: ["light", "brand", "accent"],
    treatments: ["natural", "punch", "warm"],
    build(k) {
      k.fullPhoto();
      // Un bloc plein, collé au coin bas-droit, porte tout le texte.
      const bw = k.W * k.pick(0.46, 0.66, 0.74, 0.8);
      const bh = k.H * k.pick(0.78, 0.5, 0.48, 0.58);
      const b = { x: k.W - bw, y: k.H - bh, w: bw, h: bh };
      k.rect(b, k.c.bg, { name: "Bloc" });
      k.rect({ x: b.x, y: b.y, w: Math.max(6, k.U * 0.012), h: b.h }, k.c.accent, { name: "Liseré" });
      const p = k.U * 0.06;
      col(k, { x: b.x + p, y: b.y + p, w: b.w - p * 2, h: b.h - p * 2 }, { valign: "middle", title: tsize(k, 0.075, 0.068, 0.072, 0.08), sub: k.cls !== "square" });
    },
  },
  {
    id: "floating-card",
    coversSubject: true,
    name: ["Carte flottante", "Floating card"],
    family: "photo",
    photo: "required",
    schemes: ["light", "dark"],
    treatments: ["natural", "warm", "moody"],
    build(k) {
      k.fullPhoto();
      // Carte arrondie posée au centre, ombre douce : la photo encadre le message.
      const cw = k.W * k.pick(0.5, 0.72, 0.78, 0.82);
      const ch = k.H * k.pick(0.72, 0.56, 0.5, 0.42);
      const cy = k.cls === "story" ? k.H * 0.5 - ch / 2 : (k.H - ch) / 2;
      const card = { x: (k.W - cw) / 2, y: cy, w: cw, h: ch };
      k.rect(card, k.c.bg, { radius: k.U * 0.035, shadow: soft(k, 0.35), name: "Carte" });
      col(k, pad(card, k.U * 0.05), { align: "center", valign: "middle", title: tsize(k, 0.07, 0.065, 0.07, 0.075), sub: k.cls !== "square" });
    },
  },
  {
    id: "frosted-strip",
    coversSubject: true,
    name: ["Bande dépolie", "Frosted strip"],
    family: "photo",
    photo: "required",
    schemes: ["dark", "light"],
    treatments: ["natural", "cool", "mono"],
    build(k) {
      k.fullPhoto();
      // Bande horizontale translucide sur toute la largeur, texte centré dedans.
      const bh = k.H * k.pick(0.62, 0.46, 0.42, 0.36);
      const y = k.cls === "story" ? k.H * 0.56 - bh / 2 : (k.H - bh) / 2;
      k.rect({ x: 0, y, w: k.W, h: bh }, rgba(k.c.bg, 0.86), { name: "Bande dépolie" });
      k.line(0, y, k.W, k.c.accent, hair(k) * 2);
      k.line(0, y + bh - hair(k) * 2, k.W, k.c.accent, hair(k) * 2);
      col(k, { x: k.W * 0.1, y: y + k.U * 0.04, w: k.W * 0.8, h: bh - k.U * 0.08 }, { align: "center", valign: "middle", title: tsize(k, 0.075, 0.068, 0.07, 0.075), sub: k.cls !== "square", gap: k.U * 0.025 });
    },
  },
  {
    id: "vertical-ribbon",
    name: ["Ruban vertical", "Vertical ribbon"],
    family: "photo",
    photo: "required",
    schemes: ["brand", "accent", "dark"],
    treatments: ["natural", "punch", "duotone"],
    build(k) {
      k.fullPhoto();
      // Ruban de couleur de la marque, du haut au bas, à gauche ; le texte y est posé.
      const rw = k.W * k.pick(0.42, 0.56, 0.62, 0.7);
      const rx = k.W * k.pick(0.06, 0.06, 0.05, 0.04);
      k.rect({ x: rx, y: 0, w: rw, h: k.H }, rgba(k.c.bg, 0.94), { name: "Ruban" });
      col(k, { x: rx + k.U * 0.05, y: k.m.top, w: rw - k.U * 0.1, h: k.H - k.m.top - k.m.bottom }, { valign: "bottom", title: tsize(k, 0.08, 0.07, 0.075, 0.085), eyebrow: true, sub: k.cls !== "square" });
    },
  },
  {
    id: "outline-frame",
    name: ["Cadre fin sur la photo", "Fine outline frame"],
    family: "photo",
    photo: "required",
    schemes: ["dark", "brand"],
    treatments: ["moody", "natural", "mono"],
    build(k) {
      k.fullPhoto();
      readVeil(k, "bottom", 0.62, deep(k), 0.9);
      // Cadre fin à l'intérieur de la photo, comme une marie-louise tracée.
      const i = k.U * 0.04;
      const frame = { x: i, y: Math.max(i, k.m.top * 0.5), w: k.W - i * 2, h: k.H - Math.max(i, k.m.top * 0.5) - Math.max(i, k.m.bottom * 0.5) };
      k.rect(frame, null, { stroke: { color: rgba("#FFFFFF", 0.8), width: hair(k) }, name: "Cadre" });
      col(k, { x: k.m.side + i * 0.5, y: k.H * k.pick(0.3, 0.45, 0.5, 0.48), w: k.W * k.pick(0.6, 0.78, 0.8, 0.8), h: k.H }, { valign: "bottom", title: tsize(k, 0.085, 0.075, 0.08, 0.09), italic: true, onDark: true, ctaStyle: "square" });
    },
  },
  {
    id: "slant-veil",
    name: ["Voile en biais", "Slanted veil"],
    family: "photo",
    photo: "required",
    schemes: ["brand", "dark", "accent"],
    treatments: ["natural", "punch", "warm"],
    build(k) {
      k.fullPhoto();
      // Grande forme inclinée de la couleur du schéma qui monte depuis le bas-gauche.
      const s = Math.max(k.W, k.H) * 1.6;
      const cy = k.H * k.pick(1.02, 1.04, 1.02, 0.98);
      const shape = k.rect({ x: -s * 0.35, y: cy - s * 0.5, w: s, h: s * 0.62 }, rgba(k.c.bg, 0.95), { rotation: k.cls === "land" ? -14 : -9, name: "Voile en biais" });
      shape.y -= k.pick(k.H * 0.25, k.H * 0.12, k.H * 0.08, k.H * 0.02);
      col(k, { x: k.m.side, y: k.H * k.pick(0.32, 0.5, 0.52, 0.55), w: k.W * k.pick(0.5, 0.8, 0.82, 0.84), h: k.H }, { valign: "bottom", title: tsize(k, 0.085, 0.07, 0.075, 0.085), sub: k.cls !== "square" });
    },
  },
  {
    id: "halo-ring",
    name: ["Anneau de lumière", "Halo ring"],
    family: "photo",
    photo: "required",
    schemes: ["dark", "brand"],
    treatments: ["moody", "natural", "duotone"],
    build(k) {
      k.fullPhoto();
      // Anneau accent autour du point fort de la photo, voile de lecture en bas.
      const f = k.point(0);
      const r = k.U * k.pick(0.34, 0.3, 0.3, 0.32);
      const cx = Math.max(r * 0.6, Math.min(k.W - r * 0.6, f.u * k.W));
      const cy = Math.max(r * 0.6, Math.min(k.H * 0.55, f.v * k.H));
      k.ellipse({ x: cx - r, y: cy - r, w: r * 2, h: r * 2 }, null, { stroke: { color: k.c.accent, width: Math.max(4, k.U * 0.008) }, name: "Anneau" });
      k.ellipse({ x: cx - r * 1.12, y: cy - r * 1.12, w: r * 2.24, h: r * 2.24 }, null, { stroke: { color: rgba("#FFFFFF", 0.45), width: hair(k) }, name: "Anneau fin" });
      readVeil(k, "bottom", 0.58, deep(k), 0.9);
      col(k, { x: k.m.side, y: k.H * 0.4, w: k.W * k.pick(0.6, 0.84, 0.84, 0.86), h: k.H }, { valign: "bottom", title: tsize(k, 0.085, 0.072, 0.078, 0.085), onDark: true });
    },
  },
  {
    id: "sun-dot",
    name: ["Pastille solaire", "Sun dot"],
    family: "photo",
    photo: "required",
    schemes: ["dark", "light", "brand"],
    treatments: ["warm", "natural", "punch"],
    build(k) {
      k.fullPhoto();
      // Grand disque accent qui déborde du coin haut-droit (pur décor), voile de lecture à gauche / en bas.
      const r = k.U * k.pick(0.38, 0.3, 0.3, 0.3);
      k.ellipse({ x: k.W - r * 1.3, y: -r * 0.7, w: r * 2, h: r * 2 }, rgba(k.c.accent, 0.92), { name: "Disque" });
      if (k.cls === "land") readVeil(k, "left", 0.66, deep(k), 0.9);
      else readVeil(k, "bottom", 0.6, deep(k), 0.9);
      const b = k.cls === "land" ? { x: k.m.side, y: k.m.top, w: k.W * 0.5, h: k.H } : { x: k.m.side, y: k.H * 0.42, w: k.W * 0.84, h: k.H };
      col(k, b, { valign: k.cls === "land" ? "middle" : "bottom", title: tsize(k, 0.09, 0.075, 0.08, 0.09), display: true, onDark: true });
    },
  },
  {
    id: "side-glow",
    name: ["Lumière latérale", "Side glow"],
    family: "photo",
    photo: "required",
    schemes: ["brand", "accent", "dark"],
    treatments: ["natural", "mono", "cool"],
    build(k) {
      k.fullPhoto();
      // Lumière colorée qui entre par la gauche (couleur du schéma), plus dense derrière le texte.
      const w = k.pick(0.72, 0.85, 0.95, 1);
      k.rect({ x: 0, y: 0, w: k.W * w, h: k.H }, { type: "linear", angle: 0, stops: [{ offset: 0, color: rgba(k.c.bg, 0.96) }, { offset: 0.55, color: rgba(k.c.bg, 0.8) }, { offset: 1, color: rgba(k.c.bg, 0) }] }, { name: "Lumière", role: "scrim" });
      if (k.tall) k.rect({ x: 0, y: k.H * 0.45, w: k.W, h: k.H * 0.55 }, { type: "linear", angle: 270, stops: [{ offset: 0, color: rgba(k.c.bg, 0.95) }, { offset: 1, color: rgba(k.c.bg, 0) }] }, { name: "Lumière basse", role: "scrim" });
      k.rect({ x: k.m.side, y: k.m.top, w: k.U * 0.08, h: Math.max(6, k.U * 0.01) }, k.c.accent, { name: "Trait" });
      const b = k.cls === "land" ? { x: k.m.side, y: k.m.top + k.U * 0.05, w: k.W * 0.52, h: k.H } : { x: k.m.side, y: k.H * 0.45, w: k.W * 0.8, h: k.H };
      col(k, b, { valign: k.cls === "land" ? "middle" : "bottom", title: tsize(k, 0.09, 0.075, 0.08, 0.09), eyebrow: true });
    },
  },
];

