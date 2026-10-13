/**
 * Bibliothèque de modèles — lot G (10 modèles) : la photo encadrée. Passe-partout, double cadre décalé, tuile
 * ombrée, timbre dentelé, crochets d'angle, écran arrondi, carte postale, cadre suspendu, camée ovale, vitrine.
 * Chaque cadre est redessiné pour le format, le texte reste sous ou à côté du cadre.
 */
import { mix } from "../../../color";
import type { Box, Kit } from "../kit";
import { rgba } from "../kit";
import type { Template } from "../types";
import { col, hair, pad, paper, soft, tsize } from "./util";

/** Boîte de la photo et boîte du texte d'un cadre : photo en haut (formats hauts) ou à gauche (paysage). */
function frameLayout(k: Kit, o: { photo?: number; gap?: number } = {}): { pic: Box; txt: Box } {
  const g = k.U * (o.gap ?? 0.06);
  if (k.cls === "land") {
    const w = k.W * (o.photo ?? 0.46);
    const pic = { x: k.m.side + k.W * 0.02, y: k.m.top, w, h: k.H - k.m.top - k.m.bottom };
    const tx = pic.x + pic.w + g;
    return { pic, txt: { x: tx, y: k.m.top, w: k.W - tx - k.m.side, h: k.H - k.m.top - k.m.bottom } };
  }
  const h = k.H * (o.photo ?? k.pick(0, 0.5, 0.5, 0.42)) * (k.cls === "story" ? 0.8 : 1);
  const top = k.cls === "story" ? k.m.top : k.H * 0.07;
  const pic = { x: k.W * 0.1, y: top, w: k.W * 0.8, h };
  const ty = pic.y + pic.h + g;
  return { pic, txt: { x: k.m.side, y: ty, w: k.W - k.m.side * 2, h: k.H - k.m.bottom - ty } };
}

export const TEMPLATES_G: Template[] = [
  {
    id: "passe-partout",
    name: ["Passe-partout", "Passe-partout mat"],
    family: "frame",
    photo: "required",
    schemes: ["light", "brand", "dark"],
    treatments: ["natural", "warm", "mono"],
    build(k) {
      k.fill();
      const { pic, txt } = frameLayout(k);
      // Biseau du passe-partout : un filet clair juste autour de la photo, puis un second plus loin.
      const b = k.U * 0.016;
      k.rect({ x: pic.x - b, y: pic.y - b, w: pic.w + b * 2, h: pic.h + b * 2 }, mix(k.c.bg, "#FFFFFF", 0.35), { name: "Biseau" });
      k.photo(pic, { focus: k.point(0) });
      const o = k.U * 0.035;
      k.rect({ x: pic.x - o, y: pic.y - o, w: pic.w + o * 2, h: pic.h + o * 2 }, null, { stroke: { color: mix(k.c.ink, k.c.bg, 0.6), width: hair(k) }, name: "Filet" });
      col(k, txt, { valign: "middle", align: k.cls === "land" ? "left" : "center", title: tsize(k, 0.07, 0.06, 0.066, 0.075), italic: true, sub: k.cls !== "square", ctaStyle: "square" });
    },
  },
  {
    id: "double-frame",
    name: ["Double cadre décalé", "Offset double frame"],
    family: "frame",
    photo: "required",
    schemes: ["dark", "light", "brand"],
    treatments: ["natural", "cool", "punch"],
    build(k) {
      k.fill();
      const { pic, txt } = frameLayout(k, { photo: k.pick(0.46, 0.42, 0.46, 0.36) });
      const d = k.U * 0.03;
      k.rect({ x: pic.x + d, y: pic.y + d, w: pic.w, h: pic.h }, null, { stroke: { color: k.c.accent, width: Math.max(4, k.U * 0.006) }, name: "Cadre décalé" });
      k.photo(pic, { focus: k.point(0) });
      k.rect({ x: pic.x - d, y: pic.y - d, w: pic.w, h: pic.h }, null, { stroke: { color: mix(k.c.ink, k.c.bg, 0.3), width: hair(k) }, name: "Cadre" });
      const t = k.cls === "land" ? { ...txt, x: txt.x + d, w: txt.w - d } : { ...txt, y: txt.y + d, h: txt.h - d };
      col(k, t, { valign: "middle", title: tsize(k, 0.07, 0.06, 0.066, 0.075), eyebrow: true, sub: k.cls !== "square" });
    },
  },
  {
    id: "shadow-tile",
    name: ["Tuile ombrée", "Shadowed tile"],
    family: "frame",
    photo: "required",
    schemes: ["light", "accent", "brand"],
    treatments: ["natural", "warm", "punch"],
    build(k) {
      // Fond en deux tons, la tuile photo arrondie à cheval sur les deux, ombre profonde.
      k.fill();
      const split = k.cls === "land" ? { x: 0, y: 0, w: k.W * 0.38, h: k.H } : { x: 0, y: 0, w: k.W, h: k.H * k.pick(0, 0.36, 0.34, 0.3) };
      k.rect(split, mix(k.c.accent, k.c.bg, 0.15), { name: "Aplat" });
      const { pic, txt } = frameLayout(k, { photo: k.pick(0.42, 0.5, 0.5, 0.42) });
      k.photo(pic, { focus: k.point(0), radius: k.U * 0.03, shadow: soft(k, 0.4) });
      col(k, txt, { valign: "middle", align: k.cls === "land" ? "left" : "center", title: tsize(k, 0.07, 0.06, 0.066, 0.075), sub: k.cls !== "square" });
    },
  },
  {
    id: "stamp",
    name: ["Timbre dentelé", "Postage stamp"],
    family: "frame",
    photo: "required",
    schemes: ["brand", "dark", "light"],
    treatments: ["warm", "natural", "duotone"],
    build(k) {
      k.fill();
      const { pic, txt } = frameLayout(k, { photo: k.pick(0.4, 0.48, 0.48, 0.4) });
      // Bord du timbre : surface claire, perforations rondes de la couleur du fond tout autour.
      const m = k.U * 0.03;
      const st = { x: pic.x - m, y: pic.y - m, w: pic.w + m * 2, h: pic.h + m * 2 };
      k.rect(st, paper(k), { shadow: soft(k, 0.22), name: "Timbre" });
      const r = k.U * 0.012;
      const step = r * 3;
      for (let x = st.x + step / 2; x < st.x + st.w; x += step) for (const y of [st.y, st.y + st.h]) k.ellipse({ x: x - r, y: y - r, w: r * 2, h: r * 2 }, k.c.bg, { name: "Dent" });
      for (let y = st.y + step / 2; y < st.y + st.h; y += step) for (const x of [st.x, st.x + st.w]) k.ellipse({ x: x - r, y: y - r, w: r * 2, h: r * 2 }, k.c.bg, { name: "Dent" });
      k.photo(pic, { focus: k.point(0) });
      const t = k.cls === "land" ? { ...txt, x: txt.x + m, w: txt.w - m } : { ...txt, y: txt.y + m, h: txt.h - m };
      col(k, t, { valign: "middle", align: k.cls === "land" ? "left" : "center", title: tsize(k, 0.07, 0.06, 0.066, 0.075), sub: k.cls !== "square" });
    },
  },
  {
    id: "corner-marks",
    name: ["Crochets d'angle", "Corner marks"],
    family: "frame",
    photo: "required",
    schemes: ["dark", "brand"],
    treatments: ["moody", "natural", "mono"],
    build(k) {
      // Photo pleine page, quatre crochets d'angle comme un viseur, texte en bas sur voile.
      k.fullPhoto();
      k.veil({ x: 0, y: k.H * 0.4, w: k.W, h: k.H * 0.6 }, 270, k.c.dark, 0.9);
      const i = k.U * 0.05;
      const L = k.U * 0.1;
      const t = Math.max(4, k.U * 0.006);
      const c = k.c.accent;
      const top = Math.max(i, k.m.top * 0.6);
      const bot = k.H - Math.max(i, k.m.bottom * 0.6);
      for (const [x, y, dx, dy] of [[i, top, 1, 1], [k.W - i, top, -1, 1], [i, bot, 1, -1], [k.W - i, bot, -1, -1]] as const) {
        k.rect({ x: dx > 0 ? x : x - L, y: dy > 0 ? y : y - t, w: L, h: t }, c, { name: "Crochet" });
        k.rect({ x: dx > 0 ? x : x - t, y: dy > 0 ? y : y - L, w: t, h: L }, c, { name: "Crochet" });
      }
      col(k, { x: k.m.side + i * 0.6, y: k.H * k.pick(0.3, 0.45, 0.48, 0.48), w: k.W * k.pick(0.6, 0.78, 0.78, 0.8), h: k.H }, { valign: "bottom", title: tsize(k, 0.08, 0.068, 0.072, 0.08), onDark: true, ctaStyle: "square" });
    },
  },
  {
    id: "rounded-screen",
    name: ["Écran arrondi", "Rounded screen"],
    family: "frame",
    photo: "required",
    schemes: ["dark", "accent", "brand"],
    treatments: ["natural", "punch", "cool"],
    build(k) {
      k.fill();
      // Photo dans un écran aux coins très arrondis, bordé d'un épais contour de la couleur d'encre.
      const { pic, txt } = frameLayout(k, { photo: k.pick(0.48, 0.52, 0.52, 0.44) });
      const r = k.U * 0.07;
      const bz = k.U * 0.018;
      k.rect({ x: pic.x - bz, y: pic.y - bz, w: pic.w + bz * 2, h: pic.h + bz * 2 }, mix(k.c.ink, k.c.bg, 0.15), { radius: r + bz, name: "Bord" });
      k.photo(pic, { focus: k.point(0), radius: r });
      col(k, txt, { valign: "middle", align: k.cls === "land" ? "left" : "center", title: tsize(k, 0.07, 0.06, 0.066, 0.075), display: true, sub: k.cls !== "square", ctaStyle: "pill" });
    },
  },
  {
    id: "postcard",
    name: ["Carte postale", "Postcard"],
    family: "frame",
    photo: "required",
    schemes: ["light", "brand", "accent"],
    treatments: ["warm", "natural", "punch"],
    build(k) {
      k.fill();
      // Carte claire légèrement ombrée, liseré « par avion » aux couleurs de la marque, photo à l'intérieur.
      const card = k.cls === "land" ? { x: k.W * 0.04, y: k.H * 0.08, w: k.W * 0.92, h: k.H * 0.84 } : { x: k.W * 0.06, y: k.cls === "story" ? k.m.top * 0.7 : k.H * 0.05, w: k.W * 0.88, h: k.H * k.pick(0, 0.9, 0.9, 0.66) };
      k.rect(card, paper(k), { shadow: soft(k, 0.22), radius: k.U * 0.01, name: "Carte" });
      const s = k.U * 0.022;
      const n = Math.floor(card.w / (s * 2));
      for (let i = 0; i < n; i++) k.rect({ x: card.x + i * s * 2 + s * 0.2, y: card.y + s * 0.3, w: s * 1.2, h: s * 0.7 }, i % 2 ? k.c.accent : mix(k.c.accent, "#1E3A8A", 0.6), { rotation: -30, name: "Liseré" });
      const inner = pad(card, k.U * 0.05, k.U * 0.06);
      const vertical = k.cls !== "land";
      const pic = vertical ? { x: inner.x, y: inner.y, w: inner.w, h: inner.h * 0.55 } : { x: inner.x, y: inner.y, w: inner.w * 0.5, h: inner.h };
      k.photo(pic, { focus: k.point(0) });
      const txt = vertical ? { x: inner.x, y: pic.y + pic.h + k.U * 0.05, w: inner.w, h: inner.y + inner.h - (pic.y + pic.h + k.U * 0.05) } : { x: pic.x + pic.w + k.U * 0.06, y: inner.y, w: inner.w - pic.w - k.U * 0.06, h: inner.h };
      if (!vertical) k.rect({ x: txt.x - k.U * 0.03, y: inner.y, w: hair(k), h: inner.h }, mix(k.c.dark, paper(k), 0.6), { name: "Filet" });
      col(k, txt, { valign: "middle", title: tsize(k, 0.065, 0.055, 0.06, 0.068), italic: true, sub: k.cls !== "square", ctaStyle: "square" });
    },
  },
  {
    id: "hanging-frame",
    name: ["Cadre suspendu", "Hanging frame"],
    family: "frame",
    photo: "required",
    schemes: ["light", "brand", "dark"],
    treatments: ["natural", "warm", "mono"],
    build(k) {
      k.fill();
      const { pic, txt } = frameLayout(k, { photo: k.pick(0.42, 0.46, 0.46, 0.38) });
      const shift = k.U * 0.08;
      const p = { ...pic, y: pic.y + shift, h: pic.h - shift };
      // Deux cordons qui montent vers un clou, puis un cadre épais.
      const nail = { x: p.x + p.w / 2, y: p.y - shift * 0.85 };
      const len = Math.hypot(p.w * 0.3, shift * 0.85);
      const ang = (Math.atan2(shift * 0.85, p.w * 0.3) * 180) / Math.PI;
      const cord = mix(k.c.ink, k.c.bg, 0.4);
      for (const s of [-1, 1]) {
        const cx = nail.x + (s * p.w * 0.3) / 2;
        const cy = nail.y + (shift * 0.85) / 2;
        k.rect({ x: cx - len / 2, y: cy - hair(k) / 2, w: len, h: hair(k) }, cord, { rotation: s * ang, name: "Cordon" });
      }
      k.ellipse({ x: nail.x - k.U * 0.01, y: nail.y - k.U * 0.01, w: k.U * 0.02, h: k.U * 0.02 }, k.c.accent, { name: "Clou" });
      const fr = k.U * 0.025;
      k.rect({ x: p.x - fr, y: p.y - fr, w: p.w + fr * 2, h: p.h + fr * 2 }, mix(k.c.dark, k.c.accent, 0.25), { shadow: soft(k, 0.3), name: "Cadre" });
      k.photo(p, { focus: k.point(0) });
      col(k, txt, { valign: "middle", align: k.cls === "land" ? "left" : "center", title: tsize(k, 0.07, 0.06, 0.066, 0.075), sub: k.cls !== "square" });
    },
  },
  {
    id: "cameo",
    name: ["Camée ovale", "Oval cameo"],
    family: "frame",
    photo: "required",
    schemes: ["brand", "dark", "light"],
    treatments: ["warm", "mono", "natural"],
    build(k) {
      k.fill();
      // Photo dans un ovale (gélule haute), double filet accent autour, texte centré.
      const ow = k.cls === "land" ? k.H * 0.56 : k.W * k.pick(0, 0.36, 0.44, 0.42);
      const oh = ow * 1.35;
      const pic = k.cls === "land" ? { x: k.W * 0.12, y: (k.H - Math.min(oh, k.H * 0.84)) / 2, w: ow * 0.82, h: Math.min(oh, k.H * 0.84) } : { x: (k.W - ow) / 2, y: k.cls === "story" ? k.m.top : k.H * 0.06, w: ow, h: oh };
      const g = k.U * 0.022;
      k.rect({ x: pic.x - g, y: pic.y - g, w: pic.w + g * 2, h: pic.h + g * 2 }, null, { radius: (pic.w + g * 2) / 2, stroke: { color: k.c.accent, width: hair(k) * 2 }, name: "Filet" });
      k.photo(pic, { focus: k.point(0), radius: pic.w / 2 });
      const txt = k.cls === "land" ? { x: pic.x + pic.w + k.W * 0.08, y: k.m.top, w: k.W - (pic.x + pic.w + k.W * 0.08) - k.m.side, h: k.H - k.m.top - k.m.bottom } : { x: k.m.side, y: pic.y + pic.h + k.U * 0.06, w: k.W - k.m.side * 2, h: k.H - k.m.bottom - (pic.y + pic.h + k.U * 0.06) };
      col(k, txt, { valign: "middle", align: k.cls === "land" ? "left" : "center", title: tsize(k, 0.07, 0.058, 0.064, 0.072), italic: true, sub: k.cls !== "square", ctaStyle: "square" });
    },
  },
  {
    id: "showcase",
    name: ["Vitrine", "Showcase"],
    family: "frame",
    photo: "required",
    schemes: ["dark", "brand"],
    treatments: ["natural", "warm", "punch"],
    build(k) {
      k.fill();
      // Vitrine éclairée : un cône de lumière descend sur la photo posée sur un socle.
      const { pic, txt } = frameLayout(k, { photo: k.pick(0.44, 0.46, 0.46, 0.38) });
      k.rect({ x: pic.x - k.U * 0.1, y: 0, w: pic.w + k.U * 0.2, h: pic.y + pic.h }, { type: "linear", angle: 90, stops: [{ offset: 0, color: rgba("#FFFFFF", 0.16) }, { offset: 1, color: rgba("#FFFFFF", 0) }] }, { name: "Lumière" });
      k.photo(pic, { focus: k.point(0), shadow: soft(k, 0.45) });
      k.rect({ x: pic.x - k.U * 0.03, y: pic.y + pic.h, w: pic.w + k.U * 0.06, h: Math.max(6, k.U * 0.016) }, k.c.accent, { name: "Socle" });
      const t = k.cls === "land" ? txt : { ...txt, y: txt.y + k.U * 0.02, h: txt.h - k.U * 0.02 };
      col(k, t, { valign: "middle", align: k.cls === "land" ? "left" : "center", title: tsize(k, 0.07, 0.06, 0.066, 0.075), eyebrow: true, sub: k.cls !== "square" });
    },
  },
];
