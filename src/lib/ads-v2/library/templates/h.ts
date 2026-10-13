/**
 * Bibliothèque de modèles — lot H (10 modèles) : promotionnels, francs et colorés. Coin de couleur en biais,
 * confettis, chevrons qui mènent au bouton, rayures d'angle, bordure épaisse, titre sur bloc à ombre franche,
 * soleil levant, photo « pop » à double, éclat derrière la photo, bande déchirée. Aucun texte n'est ajouté :
 * les formes portent l'énergie, le message reste celui du client.
 */
import { mix } from "../../../color";
import type { Kit } from "../kit";
import { rgba } from "../kit";
import type { Template } from "../types";
import { col, deep, halves, hard, pad, readVeil, soft, tsize } from "./util";

/** Générateur pseudo-aléatoire stable (mêmes confettis à chaque rendu d'un même format). */
const rnd = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

/** Boîte de texte sous la photo (formats hauts) ou à droite (paysage). */
function belowOrRight(k: Kit, pic: { x: number; y: number; w: number; h: number }, gap = 0.06) {
  const g = k.U * gap;
  return k.cls === "land" ? { x: pic.x + pic.w + g, y: k.m.top, w: k.W - (pic.x + pic.w + g) - k.m.side, h: k.H - k.m.top - k.m.bottom } : { x: k.m.side, y: pic.y + pic.h + g, w: k.W - k.m.side * 2, h: k.H - k.m.bottom - (pic.y + pic.h + g) };
}

export const TEMPLATES_H: Template[] = [
  {
    id: "color-corner",
    name: ["Coin de couleur en biais", "Slanted color corner"],
    family: "promo",
    photo: "required",
    schemes: ["accent", "brand", "dark"],
    treatments: ["punch", "natural", "warm"],
    build(k) {
      k.fullPhoto();
      // Grand triangle (carré tourné) de la couleur du schéma qui entre par le bas-gauche.
      const s = Math.max(k.W, k.H) * 1.15;
      const cy = k.H * k.pick(1.12, 1.0, 0.94, 0.9);
      k.rect({ x: -s * 0.62, y: cy - s / 2, w: s, h: s }, k.c.bg, { rotation: 45, name: "Coin" });
      k.rect({ x: -s * 0.62 + k.U * 0.04, y: cy - s / 2 - k.U * 0.04, w: s, h: s }, null, { rotation: 45, stroke: { color: k.c.accent, width: Math.max(4, k.U * 0.006) }, name: "Liseré" });
      col(k, { x: k.m.side, y: k.H * k.pick(0.36, 0.5, 0.55, 0.56), w: k.W * k.pick(0.36, 0.52, 0.54, 0.6), h: k.H }, { valign: "bottom", title: tsize(k, 0.07, 0.058, 0.062, 0.068), display: true, sub: false, ctaStyle: "pill" });
    },
  },
  {
    id: "confetti",
    name: ["Confettis", "Confetti"],
    family: "promo",
    photo: "required",
    schemes: ["light", "brand", "accent"],
    treatments: ["punch", "warm", "natural"],
    build(k) {
      k.fill();
      const { pic, txt } = halves(k, k.pick(0.5, 0.5, 0.5, 0.48));
      k.photo(pic, { focus: k.point(0) });
      // Confettis : petites pastilles et bâtonnets aux couleurs de la marque, autour de la jonction photo / texte.
      const r = rnd(k.W * 7 + k.H);
      const cols = [k.c.accent, k.i.palette.secondary, k.i.palette.primary, mix(k.c.accent, "#FFFFFF", 0.4)];
      for (let n = 0; n < 26; n++) {
        const along = r();
        const off = (r() - 0.5) * k.U * 0.16;
        const x = k.cls === "land" ? pic.w + off : along * k.W;
        const y = k.cls === "land" ? along * k.H : pic.h + off;
        const s = k.U * (0.012 + r() * 0.016);
        const c = cols[n % cols.length];
        if (n % 3) k.rect({ x, y, w: s * 2.2, h: s * 0.8 }, c, { rotation: Math.round(r() * 180), radius: s * 0.3, name: "Confetti" });
        else k.ellipse({ x, y, w: s, h: s }, c, { name: "Confetti" });
      }
      const gap = k.U * 0.1;
      const t = k.cls === "land" ? { ...txt, x: txt.x + gap, w: txt.w - gap } : { ...txt, y: txt.y + gap, h: txt.h - gap };
      col(k, pad(t, k.U * 0.04, 0), { valign: "middle", title: tsize(k, 0.075, 0.062, 0.068, 0.075), display: true, sub: k.cls !== "square", ctaStyle: "pill" });
    },
  },
  {
    id: "chevrons",
    name: ["Chevrons vers le bouton", "Chevrons to the button"],
    family: "promo",
    photo: "required",
    schemes: ["dark", "brand", "accent"],
    treatments: ["natural", "punch", "cool"],
    build(k) {
      k.fill();
      const { pic, txt } = halves(k, k.pick(0.48, 0.5, 0.5, 0.46), { photoEnd: true });
      k.photo(pic, { focus: k.point(0) });
      const zone = pad(txt, k.U * 0.06, k.U * 0.04);
      col(k, k.cls === "land" ? zone : { ...zone, y: zone.y + k.U * 0.02 }, { valign: "middle", title: tsize(k, 0.075, 0.062, 0.068, 0.075), display: true, sub: k.cls !== "square", ctaStyle: "square" });
      // Trois chevrons de taille croissante qui pointent vers la photo, placés dans l'espace libre du texte.
      const cta = k.layers.find((l) => l.id === "cta");
      if (!cta) return;
      const s = k.U * 0.035;
      const right = k.cls === "land" ? pic.x - k.U * 0.04 : k.W - k.m.side;
      for (let i = 0; i < 3; i++) {
        const x = right - (3 - i) * s * 1.6;
        if (x < cta.x + cta.w + s) continue;
        const y = cta.y + cta.h / 2;
        for (const d of [45, -45]) k.rect({ x: x, y: y - (d > 0 ? s * 0.42 : -s * 0.12) - s * 0.15, w: s, h: s * 0.3 }, mix(k.c.accent, k.c.bg, 0.5 - i * 0.25), { rotation: d, name: "Chevron" });
      }
    },
  },
  {
    id: "corner-stripes",
    name: ["Rayures d'angle", "Corner stripes"],
    family: "promo",
    photo: "required",
    schemes: ["dark", "brand"],
    treatments: ["natural", "punch", "moody"],
    build(k) {
      k.fullPhoto();
      // Bande de rayures obliques dans le coin haut-droit (pur décor), voile de lecture en bas.
      const L = Math.max(k.W, k.H) * 0.9;
      const w = k.U * 0.035;
      for (let i = 0; i < 5; i++) k.rect({ x: k.W - L * 0.32 + i * w * 2.1, y: -L * 0.2 + i * w * 0.1, w, h: L * 0.55 }, i % 2 ? rgba("#FFFFFF", 0.85) : k.c.accent, { rotation: 45, name: "Rayure" });
      readVeil(k, "bottom", 0.62, deep(k), 0.92);
      col(k, { x: k.m.side, y: k.H * k.pick(0.32, 0.45, 0.48, 0.5), w: k.W * k.pick(0.6, 0.84, 0.84, 0.86), h: k.H }, { valign: "bottom", title: tsize(k, 0.08, 0.066, 0.07, 0.078), display: true, onDark: true, ctaStyle: "square" });
    },
  },
  {
    id: "thick-border",
    name: ["Bordure épaisse", "Thick border"],
    family: "promo",
    photo: "required",
    schemes: ["accent", "brand", "dark"],
    treatments: ["natural", "punch", "warm"],
    build(k) {
      // Toute la publication bordée d'une large bande de couleur, la photo à l'intérieur, le texte sur la bande basse.
      k.fill();
      const b = k.U * 0.045;
      const bottomBand = k.cls === "land" ? 0 : k.H * k.pick(0, 0.38, 0.38, 0.4);
      const sideBand = k.cls === "land" ? k.W * 0.44 : 0;
      const pic = { x: b + sideBand, y: b, w: k.W - b * 2 - sideBand, h: k.H - b * 2 - bottomBand };
      k.photo(pic, { focus: k.point(0) });
      k.rect(pic, null, { stroke: { color: k.c.ink, width: hair2(k) }, name: "Contour" });
      const txt = k.cls === "land" ? { x: k.m.side, y: k.m.top, w: sideBand - k.m.side - b, h: k.H - k.m.top - k.m.bottom } : { x: k.m.side, y: pic.y + pic.h + b, w: k.W - k.m.side * 2, h: k.H - k.m.bottom - (pic.y + pic.h + b) };
      col(k, txt, { valign: "middle", title: tsize(k, 0.075, 0.062, 0.066, 0.072), display: true, sub: k.cls !== "square", ctaStyle: "block" });
    },
  },
  {
    id: "hard-shadow-title",
    name: ["Titre sur bloc à ombre franche", "Title on a hard-shadow block"],
    family: "promo",
    photo: "required",
    schemes: ["light", "accent", "brand"],
    treatments: ["punch", "natural", "warm"],
    build(k) {
      k.fill();
      const { pic, txt } = halves(k, k.pick(0.5, 0.48, 0.48, 0.44));
      k.photo(pic, { focus: k.point(0) });
      // Un bloc clair à ombre franche (sans flou) porte le texte, à cheval sur la photo.
      const over = k.U * 0.08;
      const card = k.cls === "land" ? { x: txt.x - over, y: k.H * 0.12, w: txt.w + over - k.m.side * 0.6, h: k.H * 0.76 } : { x: k.W * 0.07, y: txt.y - over, w: k.W * 0.86, h: txt.h + over - Math.max(k.m.bottom, k.U * 0.06) };
      k.rect(card, k.c.surface, { shadow: hard(k, k.c.accent, 0.022), stroke: { color: k.c.ink, width: Math.max(3, k.U * 0.004) }, name: "Bloc" });
      col(k, pad(card, k.U * 0.05, k.U * 0.04), { valign: "middle", title: tsize(k, 0.07, 0.058, 0.064, 0.07), display: true, sub: k.cls !== "square", ctaStyle: "square" });
    },
  },
  {
    id: "rising-sun",
    name: ["Soleil levant", "Rising sun"],
    family: "promo",
    photo: "required",
    schemes: ["brand", "dark", "accent"],
    treatments: ["warm", "natural", "punch"],
    build(k) {
      k.fill();
      // La photo en haut, et un demi-soleil à rayons qui se lève derrière le texte.
      const { pic, txt } = halves(k, k.pick(0.5, 0.48, 0.48, 0.44));
      const cx = k.cls === "land" ? txt.x + txt.w / 2 : k.W / 2;
      const cy = k.cls === "land" ? k.H : k.H;
      const R = k.cls === "land" ? txt.w * 0.55 : k.W * 0.55;
      for (let i = 0; i < 12; i++) k.rect({ x: cx - R, y: cy - k.U * 0.012, w: R * 2, h: k.U * 0.024 }, rgba(k.c.accent, 0.35), { rotation: i * 15, name: "Rayon" });
      k.ellipse({ x: cx - R * 0.42, y: cy - R * 0.42, w: R * 0.84, h: R * 0.84 }, rgba(k.c.accent, 0.5), { name: "Soleil" });
      k.photo(pic, { focus: k.point(0) });
      col(k, pad(txt, k.U * 0.06, k.U * 0.05), { valign: "top", align: "center", title: tsize(k, 0.075, 0.062, 0.068, 0.075), display: true, sub: k.cls !== "square", ctaStyle: "pill" });
    },
  },
  {
    id: "pop-double",
    name: ["Photo pop à double", "Pop double photo"],
    family: "promo",
    photo: "required",
    schemes: ["accent", "light", "brand"],
    treatments: ["punch", "duotone", "natural"],
    build(k) {
      k.fill();
      // Deux aplats de couleur décalés derrière la photo, comme une sérigraphie mal calée (volontairement).
      const pic = k.pick(
        { x: k.W * 0.08, y: k.H * 0.12, w: k.W * 0.38, h: k.H * 0.7 },
        { x: k.W * 0.12, y: k.H * 0.08, w: k.W * 0.62, h: k.H * 0.46 },
        { x: k.W * 0.12, y: k.H * 0.07, w: k.W * 0.64, h: k.H * 0.46 },
        { x: k.W * 0.12, y: k.m.top, w: k.W * 0.7, h: k.H * 0.3 },
      );
      const d = k.U * 0.03;
      k.rect({ x: pic.x + d * 2, y: pic.y + d * 2, w: pic.w, h: pic.h }, k.i.palette.secondary, { name: "Aplat" });
      k.rect({ x: pic.x + d, y: pic.y + d, w: pic.w, h: pic.h }, k.c.accent, { name: "Aplat" });
      k.photo(pic, { focus: k.point(0) });
      col(k, belowOrRight(k, pic, 0.1), { valign: "middle", title: tsize(k, 0.075, 0.062, 0.068, 0.075), display: true, sub: k.cls !== "square", ctaStyle: "pill" });
    },
  },
  {
    id: "burst-back",
    name: ["Éclat derrière la photo", "Burst behind the photo"],
    family: "promo",
    photo: "required",
    schemes: ["brand", "accent", "light"],
    treatments: ["punch", "natural", "warm"],
    build(k) {
      k.fill();
      // Photo ronde, avec derrière elle une étoile à douze branches (trois carrés tournés) de la couleur accent.
      const r = k.cls === "land" ? k.H * 0.34 : k.W * k.pick(0, 0.21, 0.25, 0.28);
      const cx = k.cls === "land" ? k.W * 0.27 : k.W / 2;
      const cy = k.cls === "land" ? k.H / 2 : (k.cls === "story" ? k.m.top : k.H * 0.06) + r * 1.15;
      const side = r * 2.05;
      for (const a of [0, 30, 60]) k.rect({ x: cx - side / 2, y: cy - side / 2, w: side, h: side }, k.c.accent, { rotation: a, name: "Éclat" });
      k.photo({ x: cx - r, y: cy - r, w: r * 2, h: r * 2 }, { focus: k.point(0), radius: r, shadow: soft(k, 0.25) });
      const reach = r * 1.45;
      const txt = k.cls === "land" ? { x: cx + reach + k.W * 0.04, y: k.m.top, w: k.W - (cx + reach + k.W * 0.04) - k.m.side, h: k.H - k.m.top - k.m.bottom } : { x: k.m.side, y: cy + reach + k.U * 0.03, w: k.W - k.m.side * 2, h: k.H - k.m.bottom - (cy + reach + k.U * 0.03) };
      col(k, txt, { valign: "middle", align: k.cls === "land" ? "left" : "center", title: tsize(k, 0.075, 0.06, 0.066, 0.074), display: true, sub: k.cls !== "square", ctaStyle: "pill" });
    },
  },
  {
    id: "torn-band",
    name: ["Bande déchirée", "Torn band"],
    family: "promo",
    photo: "required",
    schemes: ["light", "dark", "brand"],
    treatments: ["natural", "warm", "punch"],
    build(k) {
      k.fill();
      const { pic, txt, vertical } = halves(k, k.pick(0.52, 0.52, 0.52, 0.5));
      k.photo(pic, { focus: k.point(0) });
      // Bord déchiré : une rangée de petits carrés tournés de la couleur du fond mord sur la photo.
      const s = k.U * 0.028;
      const n = Math.ceil((vertical ? k.W : k.H) / (s * 1.1)) + 1;
      const r = rnd(k.W + k.H * 3);
      for (let i = 0; i < n; i++) {
        const j = s * (0.6 + r() * 0.8);
        const b = vertical ? { x: i * s * 1.1 - j / 2, y: pic.h - j / 2, w: j, h: j } : { x: pic.w - j / 2, y: i * s * 1.1 - j / 2, w: j, h: j };
        k.rect(b, k.c.bg, { rotation: 45, name: "Déchirure" });
      }
      col(k, pad(txt, k.U * 0.06, k.U * 0.05), { valign: "middle", title: tsize(k, 0.075, 0.062, 0.068, 0.075), display: true, eyebrow: true, sub: k.cls !== "square", ctaStyle: "rounded" });
    },
  },
];

/** Contour franc (bordure épaisse). */
function hair2(k: Kit) {
  return Math.max(3, Math.round(k.U * 0.004));
}
