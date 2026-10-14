/**
 * Bibliothèque de modèles — lot I (10 modèles) : épurés et raffinés. Filets centrés, anneau doré, trois colonnes,
 * panneau de pierre, horizon bas, grille fine, petit carré d'angle, fente verticale, boîte d'ombre, rideau ouvert.
 * Beaucoup d'air, typographie de titre en italique ou en capitales espacées, filets fins.
 */
import { mix } from "../../../color";
import { rgba } from "../kit";
import type { Template } from "../types";
import { col, deep, hair, pad, readVeil, soft, tsize } from "./util";

export const TEMPLATES_I: Template[] = [
  {
    id: "centered-rules",
    coversSubject: true,
    name: ["Filets centrés", "Centered rules"],
    family: "lux",
    photo: "required",
    schemes: ["dark", "brand"],
    treatments: ["mono", "moody", "natural"],
    build(k) {
      k.fullPhoto();
      k.rect({ x: 0, y: 0, w: k.W, h: k.H }, rgba(deep(k), 0.55), { name: "Voile", role: "scrim" });
      // Bloc centré entre deux filets fins accent.
      const w = k.W * k.pick(0.6, 0.76, 0.8, 0.82);
      const h = k.H * k.pick(0.66, 0.5, 0.46, 0.4);
      const y = k.cls === "story" ? k.H * 0.47 - h / 2 : (k.H - h) / 2;
      const x = (k.W - w) / 2;
      k.line(x + w * 0.3, y, w * 0.4, k.c.accent, hair(k));
      k.line(x + w * 0.3, y + h, w * 0.4, k.c.accent, hair(k));
      col(k, { x, y: y + k.U * 0.04, w, h: h - k.U * 0.08 }, { align: "center", valign: "middle", title: tsize(k, 0.075, 0.062, 0.068, 0.075), italic: true, onDark: true, sub: k.cls !== "square", subUpper: true, ctaStyle: "square" });
    },
  },
  {
    id: "golden-ring",
    coversSubject: true,
    name: ["Anneau doré", "Golden ring"],
    family: "lux",
    photo: "required",
    schemes: ["dark", "brand"],
    treatments: ["moody", "warm", "mono"],
    build(k) {
      k.fullPhoto();
      k.rect({ x: 0, y: 0, w: k.W, h: k.H }, rgba(deep(k), 0.6), { name: "Voile", role: "scrim" });
      // Un grand anneau fin centré, le texte inscrit dedans.
      const r = Math.min(k.W, k.H - k.m.top - k.m.bottom) * k.pick(0.46, 0.44, 0.44, 0.46);
      const cx = k.W / 2;
      const cy = k.cls === "story" ? k.m.top + (k.H - k.m.top - k.m.bottom) / 2 : k.H / 2;
      k.ellipse({ x: cx - r, y: cy - r, w: r * 2, h: r * 2 }, null, { stroke: { color: k.c.accent, width: hair(k) * 2 }, name: "Anneau" });
      const s = r * 1.3;
      col(k, { x: cx - s / 2, y: cy - s / 2, w: s, h: s }, { align: "center", valign: "middle", title: tsize(k, 0.06, 0.055, 0.06, 0.066), italic: true, onDark: true, sub: false, ctaStyle: "square", gap: k.U * 0.025 });
    },
  },
  {
    id: "three-columns",
    name: ["Trois colonnes", "Three columns"],
    family: "lux",
    photo: "required",
    schemes: ["light", "dark"],
    treatments: ["natural", "mono", "warm"],
    build(k) {
      k.fill();
      // La photo découpée en trois colonnes hautes séparées par un fin espace, comme des panneaux de paravent.
      const vertical = k.cls !== "land";
      const area = vertical ? { x: k.W * 0.08, y: k.cls === "story" ? k.m.top : k.H * 0.07, w: k.W * 0.84, h: k.H * k.pick(0, 0.5, 0.5, 0.34) } : { x: k.m.side, y: k.H * 0.1, w: k.W * 0.5, h: k.H * 0.8 };
      const g = Math.max(6, k.U * 0.014);
      const crop = k.cropFor(area, k.point(0));
      const cw = (area.w - g * 2) / 3;
      for (let n = 0; n < 3; n++) {
        const b = { x: area.x + n * (cw + g), y: area.y + (n === 1 ? -k.U * 0.02 : 0), w: cw, h: area.h };
        const c = crop ? { x: crop.x + (crop.w * (n * (cw + g))) / area.w, y: crop.y, w: (crop.w * cw) / area.w, h: crop.h } : null;
        k.photo(b, { crop: c });
      }
      const txt = vertical ? { x: k.m.side, y: area.y + area.h + k.U * 0.07, w: k.W - k.m.side * 2, h: k.H - k.m.bottom - (area.y + area.h + k.U * 0.07) } : { x: area.x + area.w + k.W * 0.06, y: k.m.top, w: k.W - (area.x + area.w + k.W * 0.06) - k.m.side, h: k.H - k.m.top - k.m.bottom };
      col(k, txt, { valign: "middle", align: vertical ? "center" : "left", title: tsize(k, 0.07, 0.058, 0.064, 0.07), italic: true, sub: k.cls !== "square", subUpper: true, ctaStyle: "square" });
    },
  },
  {
    id: "stone-panel",
    name: ["Panneau de pierre", "Stone panel"],
    family: "lux",
    photo: "required",
    schemes: ["light", "brand"],
    treatments: ["natural", "warm", "mono"],
    build(k) {
      k.fill();
      // Panneau texturé (dégradé doux du fond, comme une pierre polie) et une étroite bande de photo.
      k.rect({ x: 0, y: 0, w: k.W, h: k.H }, { type: "radial", angle: 0, stops: [{ offset: 0, color: mix(k.c.bg, "#FFFFFF", 0.12) }, { offset: 1, color: mix(k.c.bg, "#000000", 0.08) }] }, { name: "Pierre" });
      const strip = k.cls === "land" ? { x: k.W * 0.72, y: 0, w: k.W * 0.28, h: k.H } : { x: 0, y: 0, w: k.W, h: k.H * k.pick(0, 0.36, 0.38, 0.34) };
      k.photo(strip, { focus: k.point(0) });
      k.ellipse({ x: k.m.side, y: (k.cls === "land" ? k.m.top : strip.h + k.U * 0.06), w: k.U * 0.022, h: k.U * 0.022 }, k.c.accent, { name: "Point" });
      const top = k.cls === "land" ? k.m.top + k.U * 0.05 : strip.h + k.U * 0.11;
      col(k, { x: k.m.side, y: top, w: (k.cls === "land" ? strip.x - k.W * 0.06 : k.W - k.m.side) - k.m.side, h: k.H - k.m.bottom - top }, { valign: "middle", title: tsize(k, 0.075, 0.062, 0.068, 0.075), italic: true, sub: k.cls !== "square", subUpper: true, ctaStyle: "square" });
    },
  },
  {
    id: "low-horizon",
    name: ["Horizon bas", "Low horizon"],
    family: "lux",
    photo: "required",
    schemes: ["light", "dark", "brand"],
    treatments: ["natural", "cool", "warm"],
    build(k) {
      k.fill();
      // Beaucoup de ciel : le texte flotte en haut, la photo n'occupe que la bande basse, comme un paysage.
      const ph = k.H * k.pick(0.42, 0.4, 0.42, 0.38);
      const pic = { x: 0, y: k.H - ph, w: k.W, h: ph };
      k.photo(pic, { focus: k.point(0) });
      k.line(k.m.side, pic.y - k.U * 0.035, k.W - k.m.side * 2, mix(k.c.ink, k.c.bg, 0.55), hair(k));
      const top = k.cls === "story" ? k.m.top : k.H * 0.08;
      col(k, { x: k.W * 0.1, y: top, w: k.W * 0.8, h: pic.y - k.U * 0.07 - top }, { align: "center", valign: "middle", title: tsize(k, 0.075, 0.062, 0.068, 0.075), italic: true, sub: k.cls !== "square", ctaStyle: "square" });
    },
  },
  {
    id: "fine-grid",
    name: ["Grille fine", "Fine grid"],
    family: "lux",
    photo: "required",
    schemes: ["dark", "brand"],
    treatments: ["mono", "cool", "moody"],
    build(k) {
      k.fullPhoto();
      // Une grille de filets très fins sur toute la photo, comme un calque d'architecte, puis voile de lecture.
      const step = k.U * 0.12;
      const c = rgba("#FFFFFF", 0.18);
      for (let x = step; x < k.W; x += step) k.rect({ x, y: 0, w: 1.5, h: k.H }, c, { name: "Grille" });
      for (let y = step; y < k.H; y += step) k.rect({ x: 0, y, w: k.W, h: 1.5 }, c, { name: "Grille" });
      readVeil(k, k.cls === "land" ? "left" : "bottom", k.cls === "land" ? 0.62 : 0.6, deep(k), 0.92);
      const b = k.cls === "land" ? { x: k.m.side, y: k.m.top, w: k.W * 0.48, h: k.H - k.m.top - k.m.bottom } : { x: k.m.side, y: k.H * 0.45, w: k.W * 0.82, h: k.H };
      col(k, b, { valign: k.cls === "land" ? "middle" : "bottom", title: tsize(k, 0.08, 0.066, 0.07, 0.078), onDark: true, subUpper: true, ctaStyle: "square" });
    },
  },
  {
    id: "corner-square",
    name: ["Petit carré d'angle", "Small corner square"],
    family: "lux",
    photo: "required",
    schemes: ["light", "dark", "brand"],
    treatments: ["natural", "warm", "mono"],
    build(k) {
      k.fill();
      // La photo réduite à un carré dans le coin haut-droit ; le reste est de l'espace et du texte, posé en bas.
      const s = k.cls === "land" ? k.H * 0.62 : k.W * k.pick(0, 0.5, 0.56, 0.5);
      const pic = { x: k.W - k.m.side - s, y: k.cls === "story" ? k.m.top : Math.max(k.m.top, k.H * 0.07), w: s, h: s };
      k.photo(pic, { focus: k.point(0) });
      k.line(k.m.side, pic.y, pic.x - k.m.side - k.U * 0.04, mix(k.c.ink, k.c.bg, 0.5), hair(k));
      const txt = k.cls === "land" ? { x: k.m.side, y: pic.y + k.U * 0.06, w: pic.x - k.m.side - k.W * 0.06, h: k.H - k.m.bottom - pic.y - k.U * 0.06 } : { x: k.m.side, y: pic.y + pic.h + k.U * 0.07, w: k.W - k.m.side * 2, h: k.H - k.m.bottom - (pic.y + pic.h + k.U * 0.07) };
      col(k, txt, { valign: "bottom", title: tsize(k, 0.075, 0.062, 0.068, 0.075), italic: true, sub: k.cls !== "square", subUpper: true, ctaStyle: "square" });
    },
  },
  {
    id: "vertical-slit",
    name: ["Fente verticale", "Vertical slit"],
    family: "lux",
    photo: "required",
    schemes: ["dark", "light"],
    treatments: ["moody", "natural", "mono"],
    build(k) {
      k.fill();
      // Une fente étroite et haute laisse voir la photo, comme une porte entrouverte.
      const w = k.cls === "land" ? k.W * 0.16 : k.W * k.pick(0, 0.26, 0.24, 0.24);
      const pic = k.cls === "land" ? { x: k.W * 0.12, y: 0, w, h: k.H } : { x: (k.W - w) / 2, y: k.cls === "story" ? k.m.top * 0.6 : 0, w, h: k.H * k.pick(0, 0.48, 0.5, 0.34) };
      k.photo(pic, { focus: k.point(0) });
      k.rect({ x: pic.x - k.U * 0.012, y: pic.y, w: Math.max(3, k.U * 0.004), h: pic.h }, k.c.accent, { name: "Montant" });
      const txt = k.cls === "land" ? { x: pic.x + pic.w + k.W * 0.08, y: k.m.top, w: k.W - (pic.x + pic.w + k.W * 0.08) - k.m.side, h: k.H - k.m.top - k.m.bottom } : { x: k.m.side, y: pic.y + pic.h + k.U * 0.07, w: k.W - k.m.side * 2, h: k.H - k.m.bottom - (pic.y + pic.h + k.U * 0.07) };
      col(k, txt, { valign: "middle", align: k.cls === "land" ? "left" : "center", title: tsize(k, 0.075, 0.062, 0.068, 0.075), italic: true, sub: k.cls !== "square", subUpper: true, ctaStyle: "square" });
    },
  },
  {
    id: "shadow-box",
    name: ["Boîte d'ombre", "Shadow box"],
    family: "lux",
    photo: "required",
    schemes: ["light", "brand"],
    treatments: ["natural", "warm", "cool"],
    build(k) {
      k.fill();
      // Photo posée dans une boîte creuse : liseré intérieur sombre, longue ombre douce, beaucoup de marge.
      const pic = k.cls === "land" ? { x: k.W * 0.07, y: k.H * 0.16, w: k.W * 0.42, h: k.H * 0.68 } : { x: k.W * 0.14, y: k.cls === "story" ? k.m.top : k.H * 0.08, w: k.W * 0.72, h: k.H * k.pick(0, 0.46, 0.46, 0.3) };
      const e = k.U * 0.022;
      k.rect({ x: pic.x - e, y: pic.y - e, w: pic.w + e * 2, h: pic.h + e * 2 }, mix(k.c.bg, "#000000", 0.08), { shadow: { color: "rgba(0,0,0,0.22)", blur: Math.round(k.U * 0.08), x: Math.round(k.U * 0.03), y: Math.round(k.U * 0.04) }, name: "Boîte" });
      k.photo(pic, { focus: k.point(0), shadow: soft(k, 0.2) });
      const txt = k.cls === "land" ? { x: pic.x + pic.w + k.W * 0.08, y: k.m.top, w: k.W - (pic.x + pic.w + k.W * 0.08) - k.m.side, h: k.H - k.m.top - k.m.bottom } : { x: k.m.side, y: pic.y + pic.h + k.U * 0.08, w: k.W - k.m.side * 2, h: k.H - k.m.bottom - (pic.y + pic.h + k.U * 0.08) };
      col(k, txt, { valign: "middle", align: k.cls === "land" ? "left" : "center", title: tsize(k, 0.07, 0.06, 0.066, 0.072), italic: true, sub: k.cls !== "square", ctaStyle: "square" });
    },
  },
  {
    id: "open-curtain",
    name: ["Rideau ouvert", "Open curtain"],
    family: "lux",
    photo: "required",
    schemes: ["brand", "dark"],
    treatments: ["natural", "warm", "moody"],
    build(k) {
      k.fullPhoto();
      // Deux pans de la couleur du schéma s'écartent sur la photo ; le texte est posé sur un pan.
      const pw = k.W * k.pick(0.46, 0.18, 0.14, 0.12);
      k.rect({ x: 0, y: 0, w: pw, h: k.H }, { type: "linear", angle: 0, stops: [{ offset: 0, color: k.c.bg }, { offset: 0.8, color: k.c.bg }, { offset: 1, color: rgba(k.c.bg, 0.7) }] }, { name: "Pan gauche" });
      k.rect({ x: k.W - pw * (k.cls === "land" ? 0.25 : 1), y: 0, w: pw * (k.cls === "land" ? 0.25 : 1), h: k.H }, { type: "linear", angle: 180, stops: [{ offset: 0, color: k.c.bg }, { offset: 0.8, color: k.c.bg }, { offset: 1, color: rgba(k.c.bg, 0.7) }] }, { name: "Pan droit" });
      if (k.cls === "land") {
        col(k, pad({ x: 0, y: 0, w: pw, h: k.H }, k.U * 0.06, k.U * 0.05), { valign: "middle", title: tsize(k, 0.075, 0.06, 0.066, 0.072), italic: true, sub: true, ctaStyle: "square" });
        return;
      }
      // Formats hauts : une traverse basse de la même couleur porte le texte, entre les deux pans.
      const bh = k.H * k.pick(0, 0.4, 0.38, 0.44);
      k.rect({ x: 0, y: k.H - bh, w: k.W, h: bh }, k.c.bg, { name: "Traverse" });
      k.line(pw, k.H - bh, k.W - pw * 2, k.c.accent, hair(k) * 2);
      col(k, pad({ x: 0, y: k.H - bh, w: k.W, h: bh }, k.W * 0.1, k.U * 0.05), { align: "center", valign: "middle", title: tsize(k, 0.075, 0.06, 0.066, 0.072), italic: true, sub: k.cls !== "square", ctaStyle: "square" });
    },
  },
];
