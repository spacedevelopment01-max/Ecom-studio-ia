/**
 * Bibliothèque de modèles — lot F (10 modèles) : partages photo / texte. Panneau de tiers, bandes empilées, photo
 * décalée sur un bloc, gélule, disque qui déborde, deux vitres, photo inclinée, demi-teinte, marches, encadré
 * intérieur. En paysage la photo prend une part de la largeur, dans les formats hauts une part de la hauteur.
 */
import { mix } from "../../../color";
import { rgba } from "../kit";
import type { Template } from "../types";
import { col, halves, hair, pad, soft, tsize } from "./util";

export const TEMPLATES_F: Template[] = [
  {
    id: "third-panel",
    name: ["Panneau d'un tiers", "One-third panel"],
    family: "split",
    photo: "required",
    schemes: ["accent", "brand", "dark"],
    treatments: ["natural", "punch", "warm"],
    build(k) {
      k.fill();
      const { pic, txt } = halves(k, k.pick(0.62, 0.58, 0.56, 0.58), { photoEnd: true });
      k.photo(pic, { focus: k.point(0) });
      k.rect({ x: txt.x, y: txt.y, w: txt.w, h: txt.h }, k.c.bg, { name: "Panneau" });
      col(k, pad(txt, k.U * 0.06, k.U * 0.05), { valign: k.cls === "land" ? "middle" : "middle", title: tsize(k, 0.08, 0.068, 0.072, 0.08), eyebrow: true, sub: k.cls !== "square" });
    },
  },
  {
    id: "stacked-bands",
    name: ["Bandes empilées", "Stacked bands"],
    family: "split",
    photo: "required",
    schemes: ["light", "dark", "brand"],
    treatments: ["natural", "warm", "cool"],
    build(k) {
      k.fill();
      const { pic, txt, vertical } = halves(k, k.pick(0.55, 0.54, 0.54, 0.56));
      k.photo(pic, { focus: k.point(0) });
      // Trois bandes de couleur de la marque entre la photo et le texte.
      const t = Math.max(6, k.U * 0.014);
      const cols = [k.c.accent, mix(k.c.accent, k.c.bg, 0.4), mix(k.c.accent, k.c.bg, 0.7)];
      cols.forEach((c, i) => (vertical ? k.rect({ x: 0, y: pic.h + i * t, w: k.W, h: t }, c, { name: "Bande" }) : k.rect({ x: pic.w + i * t, y: 0, w: t, h: k.H }, c, { name: "Bande" })));
      const off = t * 3;
      const b = vertical ? { x: txt.x, y: txt.y + off, w: txt.w, h: txt.h - off } : { x: txt.x + off, y: txt.y, w: txt.w - off, h: txt.h };
      col(k, pad(b, k.U * 0.06, k.U * 0.04), { valign: "middle", title: tsize(k, 0.08, 0.066, 0.072, 0.08), sub: k.cls !== "square" });
    },
  },
  {
    id: "offset-photo",
    name: ["Photo décalée sur un bloc", "Offset photo on a block"],
    family: "split",
    photo: "required",
    schemes: ["light", "brand", "dark"],
    treatments: ["natural", "warm", "mono"],
    build(k) {
      k.fill();
      // Un bloc de couleur accent, et la photo posée en décalé dessus avec une ombre.
      const pb = k.pick(
        { x: k.W * 0.08, y: k.H * 0.14, w: k.W * 0.42, h: k.H * 0.72 },
        { x: k.W * 0.1, y: k.H * 0.08, w: k.W * 0.6, h: k.H * 0.46 },
        { x: k.W * 0.1, y: k.H * 0.07, w: k.W * 0.64, h: k.H * 0.46 },
        { x: k.W * 0.1, y: k.m.top, w: k.W * 0.7, h: k.H * 0.33 },
      );
      const d = k.U * 0.05;
      k.rect({ x: pb.x + d, y: pb.y + d, w: pb.w, h: pb.h }, k.c.accent, { name: "Bloc" });
      k.photo(pb, { focus: k.point(0), shadow: soft(k, 0.3) });
      const b = k.cls === "land" ? { x: pb.x + pb.w + d + k.W * 0.06, y: k.m.top, w: k.W - (pb.x + pb.w + d + k.W * 0.06) - k.m.side, h: k.H - k.m.top - k.m.bottom } : { x: k.m.side, y: pb.y + pb.h + d + k.U * 0.06, w: k.W - k.m.side * 2, h: k.H - k.m.bottom - (pb.y + pb.h + d + k.U * 0.06) };
      col(k, b, { valign: "middle", title: tsize(k, 0.075, 0.064, 0.072, 0.08), sub: k.cls !== "square" });
    },
  },
  {
    id: "capsule-photo",
    name: ["Photo en gélule", "Capsule photo"],
    family: "split",
    photo: "required",
    schemes: ["light", "accent", "brand"],
    treatments: ["natural", "warm", "punch"],
    build(k) {
      k.fill();
      // Photo dans une gélule (bords entièrement arrondis), le texte à côté ou dessous.
      const pb = k.pick(
        { x: k.W * 0.6, y: k.H * 0.08, w: k.W * 0.32, h: k.H * 0.84 },
        { x: k.W * 0.56, y: k.H * 0.08, w: k.W * 0.36, h: k.H * 0.84 },
        { x: k.W * 0.12, y: k.m.top, w: k.W * 0.76, h: k.H * 0.4 },
        { x: k.W * 0.12, y: k.m.top, w: k.W * 0.76, h: k.H * 0.3 },
      );
      k.photo(pb, { focus: k.point(0), radius: Math.min(pb.w, pb.h) / 2 });
      k.ellipse({ x: pb.x - k.U * 0.04, y: pb.y + pb.h * 0.7, w: k.U * 0.1, h: k.U * 0.1 }, k.c.accent, { name: "Point" });
      const side = pb.x > k.W * 0.4;
      const b = side ? { x: k.m.side, y: k.m.top, w: pb.x - k.m.side - k.W * 0.06, h: k.H - k.m.top - k.m.bottom } : { x: k.m.side, y: pb.y + pb.h + k.U * 0.06, w: k.W - k.m.side * 2, h: k.H - k.m.bottom - (pb.y + pb.h + k.U * 0.06) };
      col(k, b, { valign: "middle", title: tsize(k, 0.075, 0.062, 0.072, 0.08), align: side ? "left" : "center", sub: k.cls !== "square" });
    },
  },
  {
    id: "rising-disc",
    name: ["Disque qui se lève", "Rising disc"],
    family: "split",
    photo: "required",
    schemes: ["dark", "brand", "light"],
    treatments: ["natural", "warm", "duotone"],
    build(k) {
      k.fill();
      // Photo dans un grand disque qui déborde du bas (ou de la droite en paysage), le texte au-dessus.
      const r = k.cls === "land" ? k.H * 0.78 : k.W * k.pick(0, 0.5, 0.55, 0.6);
      const cx = k.cls === "land" ? k.W * 0.78 : k.W / 2;
      const cy = k.cls === "land" ? k.H / 2 : k.H + r * k.pick(0, 0.2, 0.15, 0.1);
      k.ellipse({ x: cx - r - k.U * 0.03, y: cy - r - k.U * 0.03, w: (r + k.U * 0.03) * 2, h: (r + k.U * 0.03) * 2 }, null, { stroke: { color: k.c.accent, width: Math.max(4, k.U * 0.006) }, name: "Halo" });
      k.photo({ x: cx - r, y: cy - r, w: r * 2, h: r * 2 }, { focus: k.point(0), radius: r });
      const b = k.cls === "land" ? { x: k.m.side, y: k.m.top, w: cx - r - k.m.side - k.W * 0.06, h: k.H - k.m.top - k.m.bottom } : { x: k.m.side, y: k.m.top, w: k.W - k.m.side * 2, h: cy - r - k.m.top - k.U * 0.06 };
      col(k, b, { valign: "middle", align: k.cls === "land" ? "left" : "center", title: tsize(k, 0.08, 0.066, 0.075, 0.085), sub: k.cls !== "square" });
    },
  },
  {
    id: "twin-panes",
    name: ["Deux vitres", "Twin panes"],
    family: "split",
    photo: "required",
    schemes: ["light", "dark"],
    treatments: ["natural", "cool", "mono"],
    build(k) {
      k.fill();
      // La même photo vue à travers deux vitres côte à côte (un montant entre elles).
      const { pic, txt, vertical } = halves(k, k.pick(0.58, 0.56, 0.56, 0.56));
      const inset = k.U * 0.04;
      const area = { x: pic.x + inset, y: pic.y + (vertical ? Math.max(inset, k.m.top * 0.6) : inset), w: pic.w - inset * 2, h: pic.h - (vertical ? Math.max(inset, k.m.top * 0.6) : inset) - inset };
      const g = Math.max(8, k.U * 0.018);
      const crop = k.cropFor(area, k.point(0));
      const half = (area.w - g) / 2;
      for (const n of [0, 1]) {
        const b = { x: area.x + n * (half + g), y: area.y, w: half, h: area.h };
        const c = crop ? { x: crop.x + (crop.w * (n * (half + g))) / area.w, y: crop.y, w: (crop.w * half) / area.w, h: crop.h } : null;
        k.photo(b, { crop: c, radius: k.U * 0.012 });
      }
      col(k, pad(txt, k.U * 0.05, k.U * 0.03), { valign: "middle", title: tsize(k, 0.075, 0.064, 0.072, 0.08), sub: k.cls !== "square", ctaStyle: "square" });
    },
  },
  {
    id: "tilted-print",
    name: ["Tirage incliné", "Tilted print"],
    family: "split",
    photo: "required",
    schemes: ["brand", "accent", "dark"],
    treatments: ["warm", "natural", "punch"],
    build(k) {
      k.fill();
      // Tirage photo à bord blanc, légèrement incliné, posé sur la couleur de la marque.
      const pb = k.pick(
        { x: k.W * 0.07, y: k.H * 0.14, w: k.W * 0.38, h: k.H * 0.72 },
        { x: k.W * 0.12, y: k.H * 0.07, w: k.W * 0.64, h: k.H * 0.47 },
        { x: k.W * 0.12, y: k.H * 0.06, w: k.W * 0.66, h: k.H * 0.46 },
        { x: k.W * 0.12, y: k.m.top, w: k.W * 0.72, h: k.H * 0.32 },
      );
      const bord = k.U * 0.022;
      const group = [k.rect({ x: pb.x - bord, y: pb.y - bord, w: pb.w + bord * 2, h: pb.h + bord * 2.6 }, "#FBFAF7", { shadow: soft(k, 0.32), name: "Tirage" }), k.photo(pb, { focus: k.point(0) })!];
      k.rotateGroup(group, -4, pb.x + pb.w / 2, pb.y + pb.h / 2);
      const b = k.cls === "land" ? { x: pb.x + pb.w + k.W * 0.08, y: k.m.top, w: k.W - (pb.x + pb.w + k.W * 0.08) - k.m.side, h: k.H - k.m.top - k.m.bottom } : { x: k.m.side, y: pb.y + pb.h + k.U * 0.1, w: k.W - k.m.side * 2, h: k.H - k.m.bottom - (pb.y + pb.h + k.U * 0.1) };
      col(k, b, { valign: "middle", title: tsize(k, 0.08, 0.064, 0.072, 0.08), sub: k.cls !== "square" });
    },
  },
  {
    id: "half-tint",
    name: ["Demi-teinte", "Half tint"],
    family: "split",
    photo: "required",
    schemes: ["brand", "dark", "accent"],
    treatments: ["mono", "natural", "duotone"],
    build(k) {
      // Photo en pleine page, dont une moitié est recouverte d'une teinte dense de la marque.
      k.fullPhoto();
      const { txt } = halves(k, k.pick(0.5, 0.48, 0.5, 0.52));
      k.rect(txt, rgba(k.c.bg, 0.9), { name: "Teinte" });
      k.line(txt.x + (k.cls === "land" ? 0 : k.m.side), txt.y + (k.cls === "land" ? k.m.top : 0), k.cls === "land" ? hair(k) * 2 : k.W - k.m.side * 2, k.c.accent, hair(k) * 2);
      col(k, pad(txt, k.U * 0.06, k.U * 0.05), { valign: "middle", title: tsize(k, 0.08, 0.066, 0.072, 0.08), eyebrow: true, sub: k.cls !== "square" });
    },
  },
  {
    id: "steps",
    name: ["Marches", "Steps"],
    family: "split",
    photo: "required",
    schemes: ["light", "dark", "brand"],
    treatments: ["natural", "warm", "cool"],
    build(k) {
      k.fill();
      const { pic, txt, vertical } = halves(k, k.pick(0.5, 0.5, 0.5, 0.52));
      k.photo(pic, { focus: k.point(0) });
      // Trois marches de couleur qui montent le long de la photo.
      const n = 3;
      for (let i = 0; i < n; i++) {
        const s = k.U * (0.05 + i * 0.045);
        const c = mix(k.c.accent, k.c.bg, i * 0.3);
        if (vertical) k.rect({ x: k.W - s * 2.2 - i * k.U * 0.02, y: pic.h - s, w: s * 2.2, h: s }, c, { name: "Marche" });
        else k.rect({ x: pic.w - s, y: k.H - s * 2.2, w: s, h: s * 2.2 }, c, { name: "Marche" });
      }
      col(k, pad(txt, k.U * 0.06, k.U * 0.04), { valign: "middle", title: tsize(k, 0.08, 0.066, 0.072, 0.08), sub: k.cls !== "square" });
    },
  },
  {
    id: "inset-border",
    name: ["Encadré intérieur", "Inset border"],
    family: "split",
    photo: "required",
    schemes: ["light", "dark"],
    treatments: ["natural", "mono", "warm"],
    build(k) {
      k.fill();
      const { pic, txt, vertical } = halves(k, k.pick(0.5, 0.52, 0.52, 0.54));
      k.photo(pic, { focus: k.point(0) });
      // Un filet clair à l'intérieur de la photo, et un filet vertical / horizontal qui guide vers le texte.
      const i = k.U * 0.035;
      k.rect({ x: pic.x + i, y: pic.y + Math.max(i, vertical ? k.m.top * 0.6 : i), w: pic.w - i * 2, h: pic.h - i - Math.max(i, vertical ? k.m.top * 0.6 : i) }, null, { stroke: { color: rgba("#FFFFFF", 0.85), width: hair(k) }, name: "Filet" });
      const b = pad(txt, k.U * 0.07, k.U * 0.04);
      k.rect(vertical ? { x: b.x, y: b.y, w: k.U * 0.12, h: Math.max(5, k.U * 0.008) } : { x: b.x, y: b.y, w: Math.max(5, k.U * 0.008), h: k.U * 0.12 }, k.c.accent, { name: "Trait" });
      col(k, vertical ? { x: b.x, y: b.y + k.U * 0.04, w: b.w, h: b.h - k.U * 0.04 } : { x: b.x + k.U * 0.04, y: b.y, w: b.w - k.U * 0.04, h: b.h }, { valign: "middle", title: tsize(k, 0.075, 0.064, 0.07, 0.078), italic: true, sub: k.cls !== "square", ctaStyle: "square" });
    },
  },
];

