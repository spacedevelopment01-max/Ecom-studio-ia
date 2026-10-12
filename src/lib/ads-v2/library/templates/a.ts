/**
 * Bibliothèque de modèles — lot A (12 modèles) : photo pleine page, partages, cadres, collage, typographie,
 * promotion. Chaque modèle refait sa composition pour le format (paysage, carré, portrait, story).
 */
import { contrast, mix } from "../../../color";
import type { Kit } from "../kit";
import type { Template } from "../types";

/** Colonne de texte posée en bas (formats hauts) ou à gauche (formats larges). */
const lowerCol = (k: Kit, share: number) => (k.wide ? { x: k.m.side, y: k.m.top, w: k.W * share, h: k.H - k.m.top - k.m.bottom } : { x: k.m.side, y: k.H * 0.42, w: k.W - k.m.side * 2, h: k.H * 0.58 - k.m.bottom });

export const TEMPLATES_A: Template[] = [
  {
    id: "hero-bottom",
    name: ["Photo plein cadre, texte en bas", "Full-bleed photo, text at bottom"],
    family: "photo",
    photo: "required",
    schemes: ["dark", "brand"],
    treatments: ["natural", "warm", "punch"],
    build(k) {
      k.fill();
      k.fullPhoto();
      if (k.cls === "land") k.veil({ x: 0, y: 0, w: k.W * 0.72, h: k.H }, 0, k.c.dark, 0.86);
      else k.veil({ x: 0, y: k.H * 0.32, w: k.W, h: k.H * 0.68 }, 270, k.c.dark, 0.88);
      k.stack(lowerCol(k, 0.5), { valign: "bottom", title: k.U * k.pick(0.12, 0.1, 0.105, 0.115), onDark: true });
    },
  },
  {
    id: "frame-center",
    name: ["Photo encadrée, titre centré", "Framed photo, centred headline"],
    family: "lux",
    photo: "required",
    styles: ["premium", "warm"],
    schemes: ["dark"],
    treatments: ["moody", "mono", "warm"],
    build(k) {
      k.fill();
      k.fullPhoto();
      k.rect({ x: 0, y: 0, w: k.W, h: k.H }, `rgba(0,0,0,0.38)`, { role: "scrim", name: "Voile" });
      const inset = k.U * 0.045;
      k.rect({ x: inset, y: inset, w: k.W - inset * 2, h: k.H - inset * 2 }, null, { stroke: { color: "rgba(255,255,255,0.75)", width: Math.max(2, Math.round(k.U * 0.003)) }, name: "Cadre" });
      const w = k.W * k.pick(0.62, 0.78, 0.8, 0.84);
      k.stack({ x: (k.W - w) / 2, y: k.m.top + inset, w, h: k.H - k.m.top - k.m.bottom - inset * 2 }, { align: "center", valign: "middle", title: k.U * k.pick(0.12, 0.1, 0.105, 0.11), italic: true, ctaStyle: "square", onDark: true, subUpper: true });
    },
  },
  {
    id: "color-band",
    name: ["Bandeau de couleur et photo", "Colour band and photo"],
    family: "split",
    photo: "required",
    schemes: ["brand", "accent", "light"],
    treatments: ["natural", "punch", "cool"],
    build(k) {
      k.fill();
      k.fullPhoto();
      const band = k.wide ? { x: 0, y: 0, w: k.W * k.pick(0.42, 0.48, 1), h: k.H } : { x: 0, y: 0, w: k.W, h: k.H * (k.cls === "story" ? 0.44 : 0.4) };
      k.rect(band, k.c.bg, { name: "Bandeau" });
      k.rect(k.wide ? { x: band.w, y: 0, w: Math.max(6, k.U * 0.012), h: k.H } : { x: 0, y: band.h, w: k.W, h: Math.max(6, k.U * 0.012) }, k.c.accent, { name: "Liseré" });
      const pad = k.wide ? k.W * 0.05 : k.m.side;
      k.stack({ x: pad, y: k.m.top, w: band.w - pad * 2, h: band.h - k.m.top - (k.wide ? k.m.bottom : k.H * 0.03) }, { valign: k.wide ? "middle" : "bottom", title: k.U * k.pick(0.1, 0.075, 0.085, 0.095), sub: true });
    },
  },
  {
    id: "magazine",
    name: ["Couverture de magazine", "Magazine cover"],
    family: "photo",
    photo: "required",
    styles: ["bold", "premium", "warm"],
    schemes: ["dark"],
    treatments: ["punch", "warm", "mono"],
    build(k) {
      k.fill();
      k.fullPhoto();
      k.veil({ x: 0, y: 0, w: k.W, h: k.H * 0.3 }, 90, k.c.dark, 0.7);
      k.veil({ x: 0, y: k.H * 0.45, w: k.W, h: k.H * 0.55 }, 270, k.c.dark, 0.88);
      // Titre de magazine : le nom de la marque en très grand sur toute la largeur.
      const a = k.i.art;
      k.text("body", k.i.brand, { x: k.m.side, y: k.m.top, w: k.W - k.m.side * 2 }, { family: a.display, weight: a.displayWeight, size: k.U * k.pick(0.16, 0.17, 0.17, 0.18), align: "center", upper: true, spacing: Math.round(k.U * 0.004), lineHeight: 0.95, maxLines: 1, minSize: 40 }, "brand", "Titre du magazine");
      const w = k.W - k.m.side * 2;
      k.stack({ x: k.m.side, y: k.H * 0.4, w: k.wide ? k.W * 0.6 : w, h: k.H * 0.6 - k.m.bottom }, { valign: "bottom", mark: false, eyebrow: true, title: k.U * k.pick(0.1, 0.085, 0.09, 0.1), ctaStyle: "square" });
    },
  },
  {
    id: "slanted-slab",
    name: ["Bandeau incliné", "Slanted slab"],
    family: "promo",
    photo: "required",
    styles: ["bold", "warm"],
    schemes: ["accent", "brand"],
    treatments: ["punch", "natural"],
    build(k) {
      k.fill();
      k.fullPhoto();
      k.brandMark({ x: k.m.side, y: k.m.top, w: k.W * 0.4 }, { onDark: true });
      const sh = k.H * k.pick(0.5, 0.36, 0.32, 0.27);
      const cy = k.H - k.m.bottom - sh / 2 - k.H * 0.02;
      const slab = k.rect({ x: -k.W * 0.2, y: cy - sh / 2, w: k.W * 1.4, h: sh }, k.c.bg, { name: "Bandeau", shadow: { color: "rgba(0,0,0,0.3)", blur: Math.round(k.U * 0.04), x: 0, y: Math.round(k.U * 0.01) } });
      const start = k.layers.length;
      const w = k.W - k.m.side * 2 - k.W * 0.06;
      k.stack({ x: k.m.side + k.W * 0.03, y: cy - sh / 2 + k.U * 0.04, w: k.wide ? k.W * 0.62 : w, h: sh - k.U * 0.08 }, { mark: false, valign: "middle", title: k.U * k.pick(0.1, 0.085, 0.09, 0.1), display: true, sub: false, ctaStyle: "square" });
      k.rotateGroup([slab, ...k.layers.slice(start)], -6, k.W / 2, cy);
    },
  },
  {
    id: "split-half",
    name: ["Moitié photo, moitié couleur", "Half photo, half colour"],
    family: "split",
    photo: "required",
    schemes: ["light", "dark", "brand"],
    treatments: ["natural", "warm", "cool"],
    build(k) {
      k.fill();
      const pic = k.wide ? { x: k.W * 0.5, y: 0, w: k.W * 0.5, h: k.H } : { x: 0, y: 0, w: k.W, h: k.H * 0.5 };
      k.photo(pic, { focus: k.point(0), zoom: 1 });
      const seam = Math.max(6, Math.round(k.U * 0.01));
      k.rect(k.wide ? { x: pic.x - seam, y: 0, w: seam, h: k.H } : { x: 0, y: pic.h, w: k.W, h: seam }, k.c.accent, { name: "Liseré" });
      const col = k.wide ? { x: k.m.side, y: k.m.top, w: k.W * 0.5 - k.m.side * 2, h: k.H - k.m.top - k.m.bottom } : { x: k.m.side, y: pic.h + k.H * 0.05, w: k.W - k.m.side * 2, h: k.H * 0.5 - k.H * 0.05 - k.m.bottom };
      k.stack(col, { valign: "middle", title: k.U * k.pick(0.1, 0.078, 0.085, 0.1), eyebrow: true });
    },
  },
  {
    id: "arch-window",
    name: ["Arche et pastille", "Arch window"],
    family: "frame",
    photo: "required",
    styles: ["premium", "warm", "craft"],
    schemes: ["light", "brand", "dark"],
    treatments: ["warm", "natural"],
    build(k) {
      k.fill();
      const pic = k.wide ? { x: k.W * (k.cls === "land" ? 0.08 : 0.07), y: k.H * 0.08, w: k.W * (k.cls === "land" ? 0.3 : 0.4), h: k.H * 0.84 } : { x: k.W * 0.17, y: k.m.top, w: k.W * 0.66, h: k.H * (k.cls === "story" ? 0.38 : 0.46) };
      k.rect({ x: pic.x - k.U * 0.02, y: pic.y - k.U * 0.02, w: pic.w + k.U * 0.04, h: pic.h + k.U * 0.04 }, null, { radius: pic.w / 2 + k.U * 0.02, stroke: { color: k.c.accent, width: Math.max(3, Math.round(k.U * 0.004)) }, name: "Contour" });
      k.photo(pic, { radius: pic.w / 2, focus: k.point(0) });
      const d = k.U * 0.14;
      k.ellipse({ x: pic.x + pic.w - d * 0.55, y: pic.y + pic.h - d * 0.9, w: d, h: d }, k.c.accent, { name: "Pastille" });
      const col = k.wide ? { x: pic.x + pic.w + k.W * 0.07, y: k.m.top, w: k.W - (pic.x + pic.w + k.W * 0.07) - k.m.side, h: k.H - k.m.top - k.m.bottom } : { x: k.m.side, y: pic.y + pic.h + k.H * 0.05, w: k.W - k.m.side * 2, h: k.H - k.m.bottom - (pic.y + pic.h + k.H * 0.05) };
      k.stack(col, { align: k.wide ? "left" : "center", valign: "middle", title: k.U * k.pick(0.1, 0.075, 0.082, 0.095), italic: true });
    },
  },
  {
    id: "polaroid",
    name: ["Photo souvenir", "Instant photo"],
    family: "frame",
    photo: "required",
    styles: ["warm", "craft"],
    schemes: ["brand", "accent", "light"],
    treatments: ["warm", "natural"],
    build(k) {
      k.fill();
      k.rect({ x: 0, y: 0, w: k.W, h: k.H }, { type: "radial", angle: 0, stops: [{ offset: 0, color: mix(k.c.bg, "#FFFFFF", 0.12) }, { offset: 1, color: mix(k.c.bg, "#000000", 0.12) }] }, { name: "Lumière" });
      const cw = k.wide ? k.W * (k.cls === "land" ? 0.34 : 0.46) : k.W * 0.72;
      const pw = cw * 0.88;
      const ph = pw * 0.9;
      const ch = ph + cw * 0.06 + cw * 0.22;
      const cx = k.wide ? k.W - k.m.side - cw - k.W * 0.02 : (k.W - cw) / 2;
      const cy = k.wide ? (k.H - ch) / 2 : k.m.top + k.H * 0.01;
      const card = k.rect({ x: cx, y: cy, w: cw, h: ch }, "#FFFFFF", { name: "Photo souvenir", shadow: { color: "rgba(0,0,0,0.3)", blur: Math.round(k.U * 0.04), x: 0, y: Math.round(k.U * 0.015) } });
      const pic = k.photo({ x: cx + (cw - pw) / 2, y: cy + (cw - pw) / 2, w: pw, h: ph }, { focus: k.point(0) })!;
      // Légende manuscrite : la marque, en italique, sur le bas de la carte.
      const cap = k.text("body", k.i.brand, { x: cx + cw * 0.08, y: cy + ph + cw * 0.09, w: cw * 0.84 }, { family: /Cormorant|Instrument Serif/.test(k.i.art.heading) ? k.i.art.heading : "Instrument Serif", italic: true, size: cw * 0.085, align: "center", color: "#1A1A1A", maxLines: 1, minSize: 22 }, "brand", "Légende");
      k.rotateGroup([card, pic, cap], -4, cx + cw / 2, cy + ch / 2);
      const col = k.wide ? { x: k.m.side, y: k.m.top, w: cx - k.m.side - k.W * 0.06, h: k.H - k.m.top - k.m.bottom } : { x: k.m.side, y: cy + ch + k.H * 0.05, w: k.W - k.m.side * 2, h: k.H - k.m.bottom - (cy + ch + k.H * 0.05) };
      k.stack(col, { mark: false, valign: "middle", title: k.U * k.pick(0.1, 0.075, 0.08, 0.095), align: k.wide ? "left" : "center" });
    },
  },
  {
    id: "collage-trio",
    name: ["Collage de trois vues", "Three-view collage"],
    family: "collage",
    photo: "required",
    schemes: ["light", "dark", "brand"],
    treatments: ["natural", "warm", "mono"],
    build(k) {
      k.fill();
      const g = Math.round(k.U * 0.018);
      const grid = k.wide ? { x: k.W * 0.42, y: k.m.top * 0.7, w: k.W * 0.58 - k.m.side * 0.7, h: k.H - k.m.top * 0.7 - k.m.bottom * 0.7 } : { x: k.m.side * 0.7, y: k.m.top * 0.7, w: k.W - k.m.side * 1.4, h: k.H * (k.cls === "story" ? 0.4 : 0.52) };
      const big = { x: grid.x, y: grid.y, w: grid.w * 0.6 - g / 2, h: grid.h };
      const s1 = { x: grid.x + grid.w * 0.6 + g / 2, y: grid.y, w: grid.w * 0.4 - g / 2, h: grid.h / 2 - g / 2 };
      const s2 = { ...s1, y: grid.y + grid.h / 2 + g / 2 };
      const r = Math.round(k.U * 0.016);
      k.photo(big, { focus: { u: 0.5, v: 0.5 }, zoom: 1, radius: r });
      k.photo(s1, { focus: k.point(0), zoom: 2.2, radius: r });
      k.photo(s2, { focus: k.point(1), zoom: 2.2, radius: r });
      const col = k.wide ? { x: k.m.side, y: k.m.top, w: grid.x - k.m.side - k.W * 0.04, h: k.H - k.m.top - k.m.bottom } : { x: k.m.side, y: grid.y + grid.h + k.H * 0.04, w: k.W - k.m.side * 2, h: k.H - k.m.bottom - (grid.y + grid.h + k.H * 0.04) };
      k.stack(col, { valign: "middle", title: k.U * k.pick(0.09, 0.07, 0.075, 0.09) });
    },
  },
  {
    id: "highlight-type",
    name: ["Titre surligné", "Highlighted headline"],
    family: "type",
    photo: "optional",
    styles: ["bold", "warm", "craft"],
    schemes: ["light", "brand", "dark"],
    treatments: ["natural", "punch"],
    build(k) {
      k.fill();
      const hasPic = k.hasPhoto;
      const d = k.U * k.pick(0.56, 0.4, 0.46, 0.5);
      if (hasPic) {
        const pic = k.wide ? { x: k.W - k.m.side - d, y: (k.H - d) / 2, w: d, h: d } : { x: k.W - k.m.side - d, y: k.H - k.m.bottom - d, w: d, h: d };
        k.ellipse({ x: pic.x - k.U * 0.025, y: pic.y + k.U * 0.025, w: d, h: d }, k.c.accent, { name: "Ombre de couleur" });
        k.photo(pic, { radius: d / 2, focus: k.point(0), zoom: 1.2 });
      }
      const w = hasPic && k.wide ? k.W - d - k.m.side * 3 : k.W - k.m.side * 2;
      const col = { x: k.m.side, y: k.m.top, w, h: (hasPic && !k.wide ? k.H - d - k.m.bottom - k.H * 0.04 : k.H - k.m.bottom) - k.m.top };
      const st = k.stack(col, { valign: hasPic && !k.wide ? "top" : "middle", title: k.U * k.pick(0.1, 0.085, 0.09, 0.1), display: true });
      const t = k.layers.find((l) => l.id === "title");
      if (t && t.kind === "text" && st.h) {
        // Surligneur clair de la couleur d'accent sous le bas des lettres (le titre reste lisible).
        let hl = mix(k.c.accent, k.c.bg, 0.45);
        for (let n = 0; n < 6 && contrast(k.c.ink, hl) < 5; n++) hl = mix(hl, k.c.bg, 0.3);
        t.color = k.c.ink;
        k.markers(t, hl, { skew: -1 });
      }
    },
  },
  {
    id: "neon-glow",
    name: ["Néon de nuit", "Neon night"],
    family: "promo",
    photo: "required",
    styles: ["bold", "premium"],
    schemes: ["dark"],
    treatments: ["punch", "cool"],
    build(k) {
      k.fill();
      const glow = k.c.accent;
      const pic = k.wide ? { x: k.W * 0.52, y: k.H * 0.12, w: k.W * 0.4, h: k.H * 0.76 } : { x: k.W * 0.12, y: k.m.top, w: k.W * 0.76, h: k.H * (k.cls === "story" ? 0.36 : 0.42) };
      k.rect(pic, glow, { radius: k.U * 0.04, name: "Halo", shadow: { color: glow, blur: Math.round(k.U * 0.09), x: 0, y: 0 }, opacity: 0.9 });
      k.photo(pic, { radius: k.U * 0.04, focus: k.point(0) });
      const col = k.wide ? { x: k.m.side, y: k.m.top, w: pic.x - k.m.side - k.W * 0.05, h: k.H - k.m.top - k.m.bottom } : { x: k.m.side, y: pic.y + pic.h + k.H * 0.06, w: k.W - k.m.side * 2, h: k.H - k.m.bottom - (pic.y + pic.h + k.H * 0.06) };
      k.stack(col, { valign: "middle", title: k.U * k.pick(0.11, 0.085, 0.09, 0.1), display: true, onDark: true, align: k.wide ? "left" : "center" });
      const t = k.layers.find((l) => l.id === "title");
      if (t && t.kind === "text") t.shadow = { color: glow, blur: Math.round(t.font.size * 0.5), x: 0, y: 0 };
    },
  },
  {
    id: "burst-card",
    name: ["Carte et étoile", "Card and burst"],
    family: "promo",
    photo: "required",
    styles: ["bold", "warm"],
    schemes: ["accent", "brand", "light"],
    treatments: ["punch", "natural", "warm"],
    build(k) {
      k.fill();
      // Rayures discrètes en fond (motif d'affiche).
      for (let x = -k.H; x < k.W; x += k.U * 0.08) k.rect({ x, y: k.H / 2 - k.U * 0.004, w: k.H * 2.2, h: k.U * 0.012 }, mix(k.c.bg, k.c.ink, 0.07), { rotation: -45, name: "Rayure" });
      const pic = k.wide ? { x: k.W * 0.5, y: k.H * 0.1, w: k.W * 0.42, h: k.H * 0.78 } : { x: k.W * 0.1, y: k.m.top, w: k.W * 0.8, h: k.H * (k.cls === "story" ? 0.36 : 0.42) };
      k.rect({ x: pic.x + k.U * 0.025, y: pic.y + k.U * 0.025, w: pic.w, h: pic.h }, k.c.ink, { name: "Ombre décalée" });
      k.photo(pic, { focus: k.point(0) });
      const r = k.U * k.pick(0.13, 0.11, 0.11, 0.12);
      k.burst(pic.x + pic.w - r * 0.4, pic.y + r * 0.5, r, k.c.accent === k.c.bg ? k.c.ink : mix(k.c.accent, "#FFFFFF", 0.1), k.shortWord(), { rotation: -10 });
      const col = k.wide ? { x: k.m.side, y: k.m.top, w: pic.x - k.m.side - k.W * 0.05, h: k.H - k.m.top - k.m.bottom } : { x: k.m.side, y: pic.y + pic.h + k.H * 0.05, w: k.W - k.m.side * 2, h: k.H - k.m.bottom - (pic.y + pic.h + k.H * 0.05) };
      k.stack(col, { valign: "middle", title: k.U * k.pick(0.11, 0.085, 0.09, 0.1), display: true, ctaStyle: "square" });
    },
  },
];
