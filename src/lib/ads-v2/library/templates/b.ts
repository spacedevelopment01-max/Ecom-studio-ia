/**
 * Bibliothèque de modèles — lot B (10 modèles) « photo et cinéma » : format cinéma, bichromie, coupe en diagonale,
 * projecteur, persiennes, carte en coin, billet, album, grand cercle, cadre à onglet. Chaque modèle refait sa
 * composition pour le format (paysage, carré, portrait, story).
 */
import { createCanvas } from "@napi-rs/canvas";
import { contrast, isDark, mix } from "../../../color";
import { serverFont } from "../../../ad-doc/server";
import type { TextLayer } from "../../../ad-doc/types";
import type { Box, Kit } from "../kit";
import type { Template } from "../types";

/** Ombre portée douce, proportionnelle au format. */
const drop = (k: Kit, a = 0.3, s = 1) => ({ color: `rgba(0,0,0,${a})`, blur: Math.round(k.U * 0.04 * s), x: 0, y: Math.round(k.U * 0.014 * s) });

/** Repeint le bouton (le texte reste lisible : encre claire ou sombre, sinon couleur d'origine conservée). */
const tintButton = (k: Kit, fill: string) => {
  const b = k.layers.find((l) => l.id === "cta");
  if (!b || b.kind !== "button") return;
  const ink = contrast("#FFFFFF", fill) >= contrast("#111111", fill) ? "#FFFFFF" : "#111111";
  if (contrast(ink, fill) < 4.6) return;
  b.fill = fill;
  b.color = ink;
};

/** Déplace verticalement des calques (une pile de texte posée après coup). */
const shift = (k: Kit, from: number, dy: number) => {
  for (const l of k.layers.slice(from)) l.y += dy;
};

export const TEMPLATES_B: Template[] = [
  {
    id: "cinema-bars",
    name: ["Format cinéma", "Cinema letterbox"],
    family: "photo",
    photo: "required",
    styles: ["premium", "bold"],
    schemes: ["dark", "mono"],
    treatments: ["moody", "cool", "warm", "mono"],
    build(k) {
      // Bandes noires (presque noires, teintées de la marque) en haut et en bas, image au format large au milieu.
      const ink = mix(k.c.dark, "#000000", 0.7);
      k.fill(ink);
      const [top, bot] = k.pick([0.17, 0.38], [0.2, 0.36], [0.2, 0.38], [0.24, 0.42]);
      const pic = { x: 0, y: Math.round(k.H * top), w: k.W, h: Math.round(k.H * (1 - top - bot)) };
      k.photo(pic, { focus: { u: 0.5, v: k.point(0).v }, zoom: 1 });
      // Filets fins de couleur au ras de l'image, comme la lumière du projecteur sur le bord de l'écran.
      const fl = Math.max(3, Math.round(k.U * 0.004));
      k.rect({ x: 0, y: pic.y - fl, w: k.W, h: fl }, mix(k.c.accent, ink, 0.25), { name: "Filet" });
      k.rect({ x: 0, y: pic.y + pic.h, w: k.W, h: fl }, mix(k.c.accent, ink, 0.25), { name: "Filet" });
      const side = k.m.side;
      const below = pic.y + pic.h;
      if (k.cls === "land") {
        // Paysage : marque à gauche et ligne à droite dans la bande haute ; titre et bouton côte à côte en bas.
        const mk = k.brandMark({ x: side, y: 0, w: k.W * 0.4 }, { onDark: true, height: Math.round(k.H * 0.06) });
        mk.y = Math.max(k.H * 0.05, (pic.y - mk.h) / 2);
        const s = k.subline({ x: k.W * 0.45, y: 0, w: k.W * 0.55 - side }, { align: "right", upper: true, size: k.U * 0.03 });
        if (s) s.y = Math.max(k.H * 0.05, (pic.y - s.h) / 2);
        const zone = { y: below + k.H * 0.04, h: k.H - k.m.bottom - below - k.H * 0.04 };
        const t = k.title({ x: side, y: zone.y, w: k.W * 0.56 }, { size: k.U * 0.085, maxLines: 2 });
        t.y = zone.y + Math.max(0, (zone.h - t.h) / 2);
        const b = k.button(k.W - side, zone.y, { maxW: k.W * 0.34, align: "right", style: "square" });
        b.y = zone.y + (zone.h - b.h) / 2;
        return;
      }
      // Formats hauts : la marque au centre de la bande haute ; générique centré dans la bande basse.
      const mk = k.brandMark({ x: side, y: 0, w: k.W - side * 2 }, { align: "center", onDark: true });
      const tz = k.cls === "story" ? k.m.top : k.H * 0.05;
      mk.y = tz + Math.max(0, (pic.y - tz - mk.h) / 2);
      const gap = k.H * 0.035;
      k.stack({ x: side, y: below + gap, w: k.W - side * 2, h: k.H - k.m.bottom - below - gap }, { align: "center", valign: "middle", mark: false, title: k.U * k.pick(0.08, 0.075, 0.08, 0.085), subUpper: true, ctaStyle: "square", onDark: true });
    },
  },
  {
    id: "duotone-poster",
    name: ["Affiche en bichromie", "Duotone poster"],
    family: "photo",
    photo: "required",
    styles: ["bold", "warm"],
    schemes: ["brand", "accent", "dark"],
    treatments: ["duotone", "mono"],
    build(k) {
      // Cadre épais : le fond (couleur du schéma) reste visible tout autour de la photo.
      k.fill();
      const t = Math.round(k.U * k.pick(0.035, 0.04, 0.04, 0.042));
      const pic = { x: t, y: t, w: k.W - t * 2, h: k.H - t * 2 };
      k.photo(pic, { focus: k.point(0) });
      k.veil({ x: t, y: t, w: pic.w, h: pic.h * k.pick(0.75, 0.55, 0.5, 0.5) }, 90, k.c.dark, 0.85);
      k.veil({ x: t, y: k.H - t - pic.h * 0.3, w: pic.w, h: pic.h * 0.3 }, 270, k.c.dark, 0.8);
      const side = Math.max(k.m.side, t + k.U * 0.05);
      const top = Math.max(k.m.top, t + k.U * 0.05);
      const bottom = k.H - Math.max(k.m.bottom, t + k.U * 0.05);
      const w = k.W - side * 2;
      // Titre d'affiche en capitales, très grand, en haut ; filet de couleur puis la ligne.
      const tl = k.title({ x: side, y: top, w: k.wide ? w * k.pick(0.62, 0.9, 1) : w }, { size: k.U * k.pick(0.13, 0.135, 0.14, 0.15), display: true, upper: true, maxLines: k.pick(3, 3, 3, 4) });
      const ry = tl.y + tl.h + k.U * 0.03;
      k.rect({ x: side, y: ry, w: k.U * 0.12, h: Math.max(6, Math.round(k.U * 0.01)) }, k.c.accent === k.c.bg ? k.c.light : k.c.accent, { name: "Filet" });
      k.subline({ x: side, y: ry + k.U * 0.035, w: k.wide ? w * 0.6 : w }, { upper: true });
      // Pied d'affiche : la marque à gauche, le bouton à droite.
      const b = k.button(k.W - side, bottom, { maxW: w * 0.58, align: "right", style: "square" });
      b.y = bottom - b.h;
      const mk = k.brandMark({ x: side, y: bottom, w: w * 0.36 }, { onDark: true, height: Math.round(k.U * k.pick(0.07, 0.055, 0.055, 0.06)) });
      mk.y = b.y + (b.h - mk.h) / 2;
    },
  },
  {
    id: "diagonal-split",
    name: ["Coupe en diagonale", "Diagonal split"],
    family: "split",
    photo: "required",
    styles: ["bold", "warm", "craft"],
    schemes: ["accent", "brand", "light", "dark"],
    treatments: ["punch", "natural", "cool"],
    build(k) {
      k.fill();
      k.fullPhoto();
      const side = k.m.side;
      if (k.cls === "land") {
        // Paysage : aplat à gauche, bord droit incliné (le haut plus à droite que le bas).
        const deg = 12;
        const a = (deg * Math.PI) / 180;
        const w = k.W * 1.4;
        const h = k.H * 2.2;
        const E = k.W * 0.5;
        const cx = E - w / 2 / Math.cos(a);
        const edgeX = (y: number) => E - (y - k.H / 2) * Math.tan(a);
        k.rect({ x: cx + (k.U * 0.035) / Math.cos(a) - w / 2, y: k.H / 2 - h / 2, w, h }, k.c.accent, { rotation: deg, name: "Liseré" });
        k.rect({ x: cx - w / 2, y: k.H / 2 - h / 2, w, h }, k.c.bg, { rotation: deg, name: "Aplat", shadow: drop(k, 0.25) });
        const col = { x: side, y: k.m.top, w: edgeX(k.H - k.m.bottom) - side - k.W * 0.05, h: k.H - k.m.top - k.m.bottom };
        k.stack(col, { valign: "middle", title: k.U * 0.1, display: true, ctaStyle: "square" });
        return;
      }
      // Formats hauts : aplat en bas, bord supérieur montant vers la droite.
      const deg = -k.pick(12, 11, 13, 14);
      const a = (deg * Math.PI) / 180;
      const w = k.W * 2.2;
      const h = k.H * 1.4;
      const E = k.H * k.pick(0.5, 0.48, 0.5, 0.48);
      const edgeY = (x: number) => E + (x - k.W / 2) * Math.tan(a);
      const cy = E + h / 2 / Math.cos(a);
      const off = k.U * 0.035;
      k.rect({ x: k.W / 2 - w / 2, y: cy - off / Math.cos(a) - h / 2, w, h }, k.c.accent, { rotation: deg, name: "Liseré" });
      k.rect({ x: k.W / 2 - w / 2, y: cy - h / 2, w, h }, k.c.bg, { rotation: deg, name: "Aplat", shadow: drop(k, 0.25) });
      const y0 = edgeY(side) + k.U * 0.05;
      k.stack({ x: side, y: y0, w: k.W - side * 2, h: k.H - k.m.bottom - y0 }, { valign: "middle", title: k.U * k.pick(0.1, 0.085, 0.09, 0.1), display: true, ctaStyle: "square" });
    },
  },
  {
    id: "spotlight",
    name: ["Sous le projecteur", "Spotlight"],
    family: "lux",
    photo: "required",
    styles: ["premium", "bold"],
    schemes: ["dark", "mono"],
    treatments: ["moody", "natural", "warm", "mono"],
    build(k) {
      k.fill();
      k.fullPhoto();
      // Position du sujet sur la page (photo en « cover »), ramenée dans la zone du projecteur.
      const p = k.i.photo!;
      const s = Math.max(k.W / p.width, k.H / p.height);
      const subj = { x: (k.W - p.width * s) / 2 + k.point(0).u * p.width * s, y: (k.H - p.height * s) / 2 + k.point(0).v * p.height * s };
      const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
      const spot = k.cls === "land" ? { x: clamp(subj.x, k.W * 0.62, k.W * 0.74), y: clamp(subj.y, k.H * 0.4, k.H * 0.6) } : { x: clamp(subj.x, k.W * 0.35, k.W * 0.65), y: clamp(subj.y, k.H * k.pick(0, 0.3, 0.3, 0.32), k.H * k.pick(0, 0.34, 0.36, 0.38)) };
      const r0 = k.U * k.pick(0.36, 0.26, 0.3, 0.34);
      const r1 = r0 * 2.1;
      // Grand carré centré sur le projecteur : dégradé radial transparent au centre, sombre sur les bords.
      const D = Math.hypot(Math.max(spot.x, k.W - spot.x), Math.max(spot.y, k.H - spot.y)) * 1.02;
      const gr = D * Math.SQRT2;
      const dark = mix(k.c.dark, "#000000", 0.55);
      const rgba = (a: number) => {
        const h = dark.replace("#", "");
        return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`;
      };
      k.rect({ x: spot.x - D, y: spot.y - D, w: D * 2, h: D * 2 }, { type: "radial", angle: 0, stops: [{ offset: 0, color: rgba(0) }, { offset: (r0 * 0.6) / gr, color: rgba(0) }, { offset: r0 / gr, color: rgba(0.35) }, { offset: r1 / gr, color: rgba(0.9) }, { offset: 1, color: rgba(0.96) }] }, { name: "Projecteur", role: "scrim" });
      // Halo fin autour du faisceau.
      k.ellipse({ x: spot.x - r0 * 1.15, y: spot.y - r0 * 1.15, w: r0 * 2.3, h: r0 * 2.3 }, null, { stroke: { color: mix(k.c.accent, "#FFFFFF", 0.2), width: Math.max(2, Math.round(k.U * 0.003)) }, opacity: 0.55, name: "Halo" });
      const side = k.m.side;
      if (k.cls === "land") {
        const col = { x: side, y: k.m.top, w: spot.x - r0 * 1.25 - side - k.W * 0.02, h: k.H - k.m.top - k.m.bottom };
        k.stack(col, { align: "center", valign: "middle", title: k.U * 0.1, italic: true, onDark: true, subUpper: true });
        return;
      }
      const y0 = spot.y + r0 * 1.2 + k.H * 0.02;
      k.stack({ x: side, y: y0, w: k.W - side * 2, h: k.H - k.m.bottom - y0 }, { align: "center", valign: "middle", title: k.U * k.pick(0.1, 0.075, 0.085, 0.1), italic: true, onDark: true, subUpper: true });
    },
  },
  {
    id: "window-blinds",
    name: ["Persiennes", "Window blinds"],
    family: "collage",
    photo: "required",
    styles: ["premium", "craft", "warm"],
    schemes: ["light", "dark", "brand"],
    treatments: ["natural", "warm", "mono"],
    build(k) {
      k.fill();
      const n = k.pick(5, 5, 5, 6);
      const gap = Math.round(k.U * 0.016);
      // Zone de la photo : à droite en paysage (lames verticales), en haut ailleurs (lames horizontales).
      const R: Box = k.cls === "land" ? { x: k.W * 0.44, y: 0, w: k.W * 0.56, h: k.H } : { x: 0, y: 0, w: k.W - k.m.side * 0.6, h: k.H * k.pick(0, 0.56, 0.58, 0.6) };
      const g = k.cropFor(R, { u: 0.5, v: k.point(0).v })!;
      // Décalage des lames (escalier sur le bord libre) : la photo reste continue d'une lame à l'autre.
      const stag = [0, 0.11, 0.04, 0.15, 0.07, 0.12];
      const vertical = k.cls === "land";
      const len = vertical ? R.h : R.w;
      const th = ((vertical ? R.w : R.h) - gap * (n - 1)) / n;
      for (let i = 0; i < n; i++) {
        const cut = len * stag[i] * k.pick(0.9, 0.7, 0.7, 0.7);
        const b: Box = vertical ? { x: R.x + i * (th + gap), y: R.y, w: th, h: R.h - cut } : { x: R.x, y: R.y + i * (th + gap), w: R.w - cut, h: th };
        const l = k.photo(b, { focus: { u: 0.5, v: 0.5 }, name: "Lame" });
        if (l) l.crop = { x: g.x + ((b.x - R.x) / R.w) * g.w, y: g.y + ((b.y - R.y) / R.h) * g.h, w: (b.w / R.w) * g.w, h: (b.h / R.h) * g.h };
      }
      // Petit carré de couleur au bout de la dernière lame (repère).
      const sq = k.U * 0.05;
      if (vertical) k.rect({ x: R.x + (n - 1) * (th + gap), y: R.h - len * stag[n - 1] * 0.9 + gap, w: th, h: sq }, k.c.accent, { name: "Repère" });
      else k.rect({ x: R.w - len * stag[n - 1] * 0.7 + gap, y: R.y + (n - 1) * (th + gap), w: sq, h: th }, k.c.accent, { name: "Repère" });
      const side = k.m.side;
      const col = vertical ? { x: side, y: k.m.top, w: R.x - side - k.W * 0.05, h: k.H - k.m.top - k.m.bottom } : { x: side, y: R.h + k.H * 0.045, w: k.W - side * 2, h: k.H - k.m.bottom - R.h - k.H * 0.045 };
      k.stack(col, { valign: "middle", title: k.U * k.pick(0.095, 0.075, 0.085, 0.095), eyebrow: true });
    },
  },
  {
    id: "corner-card",
    name: ["Carte en coin", "Corner card"],
    family: "photo",
    photo: "required",
    styles: ["premium", "warm", "craft"],
    schemes: ["light", "dark", "brand"],
    treatments: ["natural", "warm", "punch"],
    build(k) {
      k.fill();
      k.fullPhoto();
      const pad = Math.round(k.U * k.pick(0.05, 0.055, 0.055, 0.06));
      const cw = k.W * k.pick(0.44, 0.66, 0.74, 0.84);
      const cx = k.m.side * k.pick(0.8, 0.8, 0.8, 1);
      const maxH = (k.H - k.m.top - k.m.bottom) * k.pick(1, 0.8, 0.75, 0.6);
      // Carte posée d'abord (taille provisoire), puis ajustée à la pile de texte et collée au coin bas gauche.
      const card = k.rect({ x: cx, y: 0, w: cw, h: 10 }, k.c.bg, { radius: Math.round(k.U * 0.028), shadow: drop(k, 0.32), name: "Carte" });
      const bar = k.rect({ x: cx + pad, y: 0, w: k.U * 0.07, h: Math.max(6, Math.round(k.U * 0.009)) }, k.c.accent, { name: "Filet" });
      const start = k.layers.length;
      const st = k.stack({ x: cx + pad, y: 0, w: cw - pad * 2, h: maxH - pad * 2.4 }, { valign: "top", title: k.U * k.pick(0.075, 0.065, 0.07, 0.08), eyebrow: true, gap: k.U * 0.03 });
      const ch = st.h + pad * 2.4;
      const bottom = k.H - k.m.bottom + pad * 0.6;
      card.y = k.cls === "land" ? (k.H - ch) / 2 : bottom - ch;
      card.h = ch;
      bar.y = card.y + pad * 0.7;
      shift(k, start, card.y + pad * 1.6 - st.y);
    },
  },
  {
    id: "ticket",
    name: ["Billet", "Ticket"],
    family: "frame",
    photo: "required",
    styles: ["bold", "warm", "craft"],
    schemes: ["brand", "accent", "dark"],
    treatments: ["natural", "warm", "punch"],
    build(k) {
      k.fill();
      const paper = isDark(k.c.bg) ? k.c.light : mix(k.c.light, "#FFFFFF", 0.6);
      const land = k.cls === "land";
      const tk: Box = land ? { x: k.m.side * 0.7, y: k.m.top * 0.6, w: k.W - k.m.side * 1.4, h: k.H - k.m.top * 0.6 - k.m.bottom * 0.6 } : { x: k.m.side * 0.6, y: k.m.top * k.pick(0, 0.55, 0.6, 0.75), w: k.W - k.m.side * 1.2, h: 0 };
      if (!land) tk.h = k.H - k.m.bottom * k.pick(0, 0.6, 0.6, 0.8) - tk.y;
      k.rect(tk, paper, { radius: Math.round(k.U * 0.03), shadow: drop(k, 0.35), name: "Billet" });
      const p = Math.round(k.U * 0.032);
      const dn = k.U * 0.08;
      const dash = Math.max(5, Math.round(k.U * 0.006));
      const dashCol = mix(paper, k.c.dark, 0.35);
      let col: Box;
      if (land) {
        // Talon à droite : photo dans la partie gauche, perforation verticale, encoches en haut et en bas.
        const sx = tk.x + tk.w * 0.5;
        k.photo({ x: tk.x + p, y: tk.y + p, w: sx - tk.x - p * 1.6, h: tk.h - p * 2 }, { focus: k.point(0), radius: Math.round(k.U * 0.016) });
        for (const y of [tk.y, tk.y + tk.h]) k.ellipse({ x: sx - dn / 2, y: y - dn / 2, w: dn, h: dn }, k.c.bg, { name: "Encoche" });
        for (let y = tk.y + dn * 0.75; y < tk.y + tk.h - dn * 0.75; y += dash * 3.4) k.rect({ x: sx - dash / 2, y, w: dash, h: dash * 1.8 }, dashCol, { name: "Pointillé" });
        col = { x: sx + p * 1.6, y: Math.max(k.m.top, tk.y + p), w: tk.x + tk.w - sx - p * 3.2, h: Math.min(k.H - k.m.bottom, tk.y + tk.h - p) - Math.max(k.m.top, tk.y + p) };
      } else {
        const sy = tk.y + tk.h * k.pick(0, 0.5, 0.54, 0.54);
        k.photo({ x: tk.x + p, y: tk.y + p, w: tk.w - p * 2, h: sy - tk.y - p * 1.6 }, { focus: k.point(0), radius: Math.round(k.U * 0.016) });
        for (const x of [tk.x, tk.x + tk.w]) k.ellipse({ x: x - dn / 2, y: sy - dn / 2, w: dn, h: dn }, k.c.bg, { name: "Encoche" });
        for (let x = tk.x + dn * 0.75; x < tk.x + tk.w - dn * 0.75; x += dash * 3.4) k.rect({ x, y: sy - dash / 2, w: dash * 1.8, h: dash }, dashCol, { name: "Pointillé" });
        const y0 = Math.max(k.m.top, sy + p * 1.2);
        col = { x: tk.x + p * 1.5, y: y0, w: tk.w - p * 3, h: Math.min(k.H - k.m.bottom, tk.y + tk.h - p * 1.2) - y0 };
      }
      k.stack(col, { align: "center", valign: "middle", title: k.U * k.pick(0.075, 0.07, 0.075, 0.085), display: true, gap: k.U * 0.028, ctaStyle: "square" });
      // Bouton de la couleur du fond : il rappelle les encoches.
      tintButton(k, k.c.bg);
    },
  },
  {
    id: "scrapbook-tape",
    name: ["Album et ruban adhésif", "Scrapbook tape"],
    family: "collage",
    photo: "required",
    styles: ["warm", "craft"],
    schemes: ["light", "brand", "accent"],
    treatments: ["warm", "natural"],
    build(k) {
      k.fill();
      // Papier quadrillé discret.
      const step = k.U * 0.06;
      const grid = mix(k.c.bg, k.c.ink, 0.07);
      for (let x = step; x < k.W; x += step) k.rect({ x, y: 0, w: Math.max(1, k.U * 0.0015), h: k.H }, grid, { name: "Quadrillage" });
      for (let y = step; y < k.H; y += step) k.rect({ x: 0, y, w: k.W, h: Math.max(1, k.U * 0.0015) }, grid, { name: "Quadrillage" });
      const land = k.cls === "land";
      // Tirage principal (bord blanc), incliné.
      const pw = land ? k.W * 0.42 : k.W * k.pick(0, 0.62, 0.72, 0.76);
      const ph = pw * (land ? 0.78 : 0.82);
      const px = land ? k.W - k.m.side - pw - k.W * 0.03 : (k.W - pw) / 2 + k.W * 0.04;
      const py = land ? (k.H - ph) / 2 - k.H * 0.03 : k.m.top * k.pick(0, 0.9, 0.9, 0.75) + k.U * 0.03;
      const bd = Math.round(pw * 0.035);
      const print = k.rect({ x: px - bd, y: py - bd, w: pw + bd * 2, h: ph + bd * 2 }, "#FFFFFF", { shadow: drop(k, 0.22, 0.7), name: "Tirage" });
      const pic = k.photo({ x: px, y: py, w: pw, h: ph }, { focus: k.point(0) })!;
      const tape = mix(k.c.accent, "#FFFFFF", 0.4);
      const tw = k.U * 0.17;
      const thh = k.U * 0.055;
      const t1 = k.rect({ x: px - bd - tw * 0.4, y: py - bd - thh * 0.3, w: tw, h: thh }, tape, { rotation: -38, opacity: 0.82, name: "Ruban" });
      const t2 = k.rect({ x: px + pw + bd - tw * 0.6, y: py - bd - thh * 0.3, w: tw, h: thh }, tape, { rotation: 38, opacity: 0.82, name: "Ruban" });
      k.rotateGroup([print, pic, t1, t2], 3, px + pw / 2, py + ph / 2);
      // Second tirage : un détail de la même photo, de l'autre côté, scotché en haut.
      const sw = pw * 0.42;
      const sx = land ? px - sw * 0.45 : px - sw * 0.32;
      const sy = py + ph - sw * (land ? 0.55 : 0.5);
      const sb = Math.round(sw * 0.05);
      const p2 = k.rect({ x: sx - sb, y: sy - sb, w: sw + sb * 2, h: sw + sb * 2 }, "#FFFFFF", { shadow: drop(k, 0.25, 0.6), name: "Tirage" });
      const d2 = k.photo({ x: sx, y: sy, w: sw, h: sw }, { focus: k.point(1), zoom: 2.2 })!;
      const t3 = k.rect({ x: sx + sw / 2 - tw * 0.45, y: sy - sb - thh * 0.55, w: tw * 0.9, h: thh }, tape, { rotation: 3, opacity: 0.82, name: "Ruban" });
      k.rotateGroup([p2, d2, t3], -6, sx + sw / 2, sy + sw / 2);
      const bottomOf = sy + sw + sb + k.U * 0.04;
      const col = land ? { x: k.m.side, y: k.m.top, w: sx - k.m.side - k.W * 0.04, h: k.H - k.m.top - k.m.bottom } : { x: k.m.side, y: Math.max(bottomOf, py + ph + bd + k.U * 0.05), w: k.W - k.m.side * 2, h: 0 };
      if (!land) col.h = k.H - k.m.bottom - col.y;
      k.stack(col, { valign: "middle", title: k.U * k.pick(0.09, 0.075, 0.08, 0.095), italic: true, align: land ? "left" : "center" });
    },
  },
  {
    id: "big-circle",
    name: ["Grand cercle", "Big circle"],
    family: "split",
    photo: "required",
    styles: ["bold", "premium", "warm"],
    schemes: ["light", "brand", "dark"],
    treatments: ["natural", "punch", "cool"],
    build(k) {
      k.fill();
      const side = k.m.side;
      let d: number;
      let c: { x: number; y: number };
      let col: Box;
      if (k.wide) {
        // Cercle qui sort par la droite ; texte à gauche.
        d = k.H * k.pick(1.12, 1.05, 1);
        c = { x: k.W + d * k.pick(0.12, 0.04, 0), y: k.H / 2 };
        const edge = c.x - d / 2;
        col = { x: side, y: k.m.top, w: edge - side - k.W * k.pick(0.05, 0.06, 0), h: k.H - k.m.top - k.m.bottom };
      } else {
        // Cercle qui sort par le bas ; texte en haut.
        d = k.W * k.pick(0, 0, 1.08, 1.2);
        c = { x: k.W * 0.56, y: k.H - d * k.pick(0, 0, 0.26, 0.24) };
        const top = c.y - d / 2;
        col = { x: side, y: k.m.top, w: k.W - side * 2, h: top - k.m.top - k.H * 0.035 };
      }
      const ring = k.U * 0.035;
      k.ellipse({ x: c.x - d / 2 - ring, y: c.y - d / 2 - ring, w: d + ring * 2, h: d + ring * 2 }, null, { stroke: { color: k.c.accent, width: Math.max(4, Math.round(k.U * 0.006)) }, name: "Anneau" });
      k.photo({ x: c.x - d / 2, y: c.y - d / 2, w: d, h: d }, { radius: d / 2, focus: k.point(0), zoom: 1.05 });
      // Pastille de couleur posée sur le bord du cercle.
      const dot = k.U * 0.09;
      const ang = k.wide ? Math.PI * 0.78 : Math.PI * 1.22;
      k.ellipse({ x: c.x + Math.cos(ang) * (d / 2 + ring) - dot / 2, y: c.y + Math.sin(ang) * (d / 2 + ring) - dot / 2, w: dot, h: dot }, k.c.accent, { name: "Pastille" });
      k.stack(col, { valign: k.wide ? "middle" : "top", title: k.U * k.pick(0.1, 0.085, 0.09, 0.1), display: true });
    },
  },
  {
    id: "frame-tab",
    name: ["Cadre à onglet", "Tabbed frame"],
    family: "frame",
    photo: "required",
    styles: ["premium", "craft", "warm"],
    schemes: ["brand", "dark", "light"],
    treatments: ["natural", "warm", "cool"],
    build(k) {
      k.fill();
      const t = Math.round(k.U * k.pick(0.05, 0.05, 0.05, 0.055));
      const tabTxt = Math.max(24, k.U * 0.026);
      const tabPad = Math.round(tabTxt * 0.9);
      const land = k.cls === "land";
      // Photo dans un cadre épais (le fond) ; plus épais côté texte.
      const pic: Box = land ? { x: k.W * 0.46, y: t, w: k.W * 0.54 - t, h: k.H - t * 2 } : { x: t, y: k.cls === "story" ? k.m.top - tabPad : t, w: k.W - t * 2, h: 0 };
      if (!land) pic.h = k.H * k.pick(0, 0.58, 0.6, 0.5) - pic.y + t;
      k.photo(pic, { focus: k.point(0) });
      k.rect({ x: pic.x + t * 0.35, y: pic.y + t * 0.35, w: pic.w - t * 0.7, h: pic.h - t * 0.7 }, null, { stroke: { color: "rgba(255,255,255,0.7)", width: Math.max(2, Math.round(k.U * 0.0025)) }, name: "Filet" });
      // Onglet : étiquette de couleur qui pend du haut du cadre, avec le surtitre (ou la marque).
      const tabCol = k.c.accent;
      const tab = k.rect({ x: 0, y: pic.y - 1, w: 10, h: 10 }, tabCol, { name: "Onglet" });
      const eb = k.i.eyebrow?.trim();
      const ly = Math.max(k.m.top, pic.y + tabPad);
      const lab = eb ? k.label(eb, { x: pic.x, y: ly, w: pic.w * 0.8 }, { size: tabTxt, id: "eyebrow" }) : k.brandMark({ x: pic.x, y: ly, w: pic.w * 0.5 }, { height: Math.round(tabTxt * 1.4), onDark: isDark(tabCol) });
      // Largeur réelle du libellé (mesurée) pour ajuster l'onglet.
      const tw = lab.kind === "text" ? Math.min(lab.w, measureLabel(lab)) : lab.w;
      tab.w = tw + tabPad * 2.6;
      tab.x = pic.x + (pic.w - tab.w) / 2;
      tab.h = ly + lab.h + tabPad - pic.y;
      lab.x = tab.x + tabPad * 1.3;
      if (lab.kind === "text") ((lab.w = tw + 2), (lab.align = "left"));
      const side = k.m.side;
      const col = land ? { x: side, y: k.m.top, w: pic.x - side - k.W * 0.05, h: k.H - k.m.top - k.m.bottom } : { x: side, y: pic.y + pic.h + k.H * 0.035, w: k.W - side * 2, h: 0 };
      if (!land) col.h = k.H - k.m.bottom - col.y;
      k.stack(col, { mark: !eb ? false : true, valign: "middle", title: k.U * k.pick(0.095, 0.075, 0.08, 0.095), align: land ? "left" : "center" });
    },
  },
];

/** Largeur réelle d'un libellé (police, taille, espacement et capitales du calque). */
function measureLabel(l: TextLayer) {
  const ctx = createCanvas(8, 8).getContext("2d");
  ctx.font = serverFont(l.font.family, l.font.weight, l.font.size, l.font.italic);
  ctx.letterSpacing = `${l.letterSpacing}px`;
  return Math.ceil(ctx.measureText(l.uppercase ? l.text.toUpperCase() : l.text).width) + 2;
}
