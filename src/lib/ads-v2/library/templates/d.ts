/**
 * Bibliothèque de modèles — lot D (10 modèles) : premium, éditorial, galerie. Légende sous photo, mur de galerie,
 * pellicule, cercles, article de magazine, panorama, grille, loupe sur un détail, étiquette, épure.
 * Chaque modèle refait sa composition pour le format (paysage, carré, portrait, story).
 */
import type { Layer } from "../../../ad-doc/types";
import { contrast, ensureContrast, isDark, mix } from "../../../color";
import type { Box, Kit } from "../kit";
import type { Template } from "../types";

/** Épaisseur d'un filet fin. */
const hair = (k: Kit) => Math.max(2, Math.round(k.U * 0.0025));
/** Ombre douce portée (cadres, cartes). */
const soft = (k: Kit, a = 0.26) => ({ color: `rgba(0,0,0,${a})`, blur: Math.round(k.U * 0.04), x: 0, y: Math.round(k.U * 0.014) });
/** Taille du libellé du bouton telle que le kit la calcule (pour réserver sa place avant de le poser). */
const ctaSize = (k: Kit) => Math.round(Math.max(24, k.U * k.pick(0.042, 0.032, 0.032, 0.036)));
const ctaH = (k: Kit) => Math.round(ctaSize(k) * 2.5);

/**
 * Essaie une composition à des échelles décroissantes tant qu'elle ne tient pas : `draw` renvoie false quand la
 * place manque, ses calques sont alors retirés et l'essai suivant est plus petit.
 */
function fit(k: Kit, draw: (s: number) => boolean) {
  const start = k.layers.length;
  for (let n = 0, s = 1; n < 6; n++, s *= 0.9) {
    if (draw(s) || n === 5) return;
    k.layers.splice(start);
  }
}

/** Recolore le bouton (posé sur une case de la couleur du bouton, par exemple), libellé toujours lisible. */
function recolorCta(k: Kit, fill: string) {
  const b = k.layers.find((l) => l.id === "cta");
  if (!b || b.kind !== "button") return;
  const ink = contrast("#FFFFFF", fill) >= contrast("#111111", fill) ? "#FFFFFF" : "#111111";
  b.fill = contrast(ink, fill) >= 4.6 ? fill : ensureContrast(fill, ink, 4.6);
  b.color = ink;
}

/** Recalcule l'ancrage des calques déplacés après coup (pour le redimensionnement dans l'éditeur). */
function reanchor(k: Kit, layers: Layer[]) {
  for (const l of layers) {
    const a = k.anchorOf(l);
    l.anchor = l.kind === "text" ? { ...l.anchor, v: a.v === "bottom" ? "bottom" : "top" } : a;
  }
}

/** Trait fin entre deux points (filet tourné). */
function link(k: Kit, x1: number, y1: number, x2: number, y2: number, color: string, width = hair(k)) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const l = k.line((x1 + x2) / 2 - len / 2, (y1 + y2) / 2 - width / 2, len, color, width);
  l.rotation = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  l.name = "Trait";
  return l;
}

/** Photo encadrée façon galerie : baguette fine, passe-partout clair, ombre douce sur le mur. */
function framed(k: Kit, b: Box, focus: { u: number; v: number }, zoom: number) {
  const f = Math.max(4, Math.round(k.U * 0.01));
  const mat = Math.round(Math.min(b.w, b.h) * 0.09);
  k.rect(b, mix(k.c.dark, "#000000", 0.2), { name: "Cadre", shadow: soft(k, 0.32) });
  k.rect({ x: b.x + f, y: b.y + f, w: b.w - f * 2, h: b.h - f * 2 }, "#FBFAF6", { name: "Passe-partout" });
  const p = { x: b.x + f + mat, y: b.y + f + mat, w: b.w - (f + mat) * 2, h: b.h - (f + mat) * 2 };
  // Biseau du passe-partout : un filet à peine plus sombre autour de la photo.
  k.rect({ x: p.x - 2, y: p.y - 2, w: p.w + 4, h: p.h + 4 }, "#E4E0D6", { name: "Biseau" });
  k.photo(p, { focus, zoom });
}

export const TEMPLATES_D: Template[] = [
  {
    id: "lux-caption",
    name: ["Photo et légende raffinée", "Photo with refined caption"],
    family: "lux",
    photo: "required",
    styles: ["premium", "warm", "craft"],
    schemes: ["light", "dark", "brand"],
    treatments: ["natural", "warm", "mono"],
    build(k) {
      k.fill();
      const hw = hair(k);
      const rule = mix(k.c.ink, k.c.bg, 0.45);
      if (k.cls === "land") {
        // Paysage : la photo à gauche, la légende en colonne à droite entre deux filets.
        const pic = { x: 0, y: 0, w: k.W * 0.57, h: k.H };
        k.photo(pic, { focus: k.point(0), zoom: 1 });
        const x = pic.w + k.W * 0.055;
        const w = k.W - x - k.m.side;
        k.line(x, k.m.top, w, rule, hw);
        k.line(x, k.H - k.m.bottom - hw, w, rule, hw);
        k.stack({ x, y: k.m.top + k.H * 0.06, w, h: k.H - k.m.top - k.m.bottom - k.H * 0.12 }, { valign: "middle", title: k.U * 0.085, italic: true, ctaStyle: "square", gap: k.U * 0.03 });
        return;
      }
      // Formats hauts : la photo occupe le haut, la bande de légende claire le bas.
      const ph = k.H * k.pick(0.6, 0.5, 0.52, 0.4);
      k.photo({ x: 0, y: 0, w: k.W, h: ph }, { focus: k.point(0), zoom: 1 });
      k.rect({ x: 0, y: ph, w: k.W, h: Math.max(4, k.U * 0.006) }, k.c.accent, { name: "Liseré" });
      const pad = k.U * k.pick(0.04, 0.045, 0.05, 0.06);
      const x = k.m.side;
      const w = k.W - k.m.side * 2;
      k.line(x, ph + pad, w, rule, hw);
      const bottom = k.H - k.m.bottom;
      k.line(x, bottom, w, rule, hw);
      k.stack({ x: x + k.W * 0.02, y: ph + pad * 1.6, w: w - k.W * 0.04, h: bottom - ph - pad * 2.2 }, { align: "center", valign: "middle", title: k.U * k.pick(0.07, 0.062, 0.07, 0.08), italic: true, ctaStyle: "square", subUpper: true, sub: k.cls !== "square", gap: k.U * 0.028 });
    },
  },
  {
    id: "gallery-wall",
    name: ["Mur de galerie", "Gallery wall"],
    family: "frame",
    photo: "required",
    styles: ["premium", "craft", "warm"],
    schemes: ["brand", "light", "dark"],
    treatments: ["natural", "warm", "mono"],
    build(k) {
      k.fill();
      // Lumière de galerie : le mur s'éclaire vers le haut.
      k.rect({ x: 0, y: 0, w: k.W, h: k.H }, { type: "radial", angle: 0, stops: [{ offset: 0, color: mix(k.c.bg, "#FFFFFF", 0.1) }, { offset: 1, color: mix(k.c.bg, "#000000", 0.1) }] }, { name: "Lumière" });
      const W = k.W;
      const H = k.H;
      // Deux cadres accrochés sur une même ligne médiane, puis le cartel.
      const [big, small, card] = k.pick<Box[]>(
        [
          { x: W * 0.06, y: H * 0.13, w: W * 0.25, h: H * 0.74 },
          { x: W * 0.35, y: H * 0.29, w: W * 0.2, h: H * 0.42 },
          { x: W * 0.6, y: k.m.top, w: W * 0.4 - k.m.side, h: H - k.m.top - k.m.bottom },
        ],
        [
          { x: W * 0.07, y: H * 0.08, w: W * 0.4, h: H * 0.56 },
          { x: W * 0.52, y: H * 0.08, w: W * 0.41, h: H * 0.3 },
          { x: W * 0.52, y: H * 0.43, w: W * 0.41, h: H * 0.51 - k.m.bottom + H * 0.06 },
        ],
        [
          { x: W * 0.08, y: k.m.top, w: W * 0.48, h: H * 0.44 },
          { x: W * 0.62, y: k.m.top + H * 0.1, w: W * 0.3, h: H * 0.24 },
          { x: W * 0.08, y: k.m.top + H * 0.49, w: W * 0.84, h: H * 0.51 - k.m.top - k.m.bottom },
        ],
        [
          { x: W * 0.07, y: k.m.top, w: W * 0.54, h: H * 0.37 },
          { x: W * 0.66, y: k.m.top + H * 0.09, w: W * 0.27, h: H * 0.19 },
          { x: W * 0.07, y: k.m.top + H * 0.41, w: W * 0.86, h: H - k.m.bottom - k.m.top - H * 0.41 },
        ],
      );
      const first = k.layers.length;
      framed(k, big, { u: 0.5, v: 0.5 }, 1);
      framed(k, small, k.point(0), 2);
      // Cartel : petite carte claire, texte aligné à gauche comme une notice de musée.
      const pad = k.U * k.pick(0.05, 0.04, 0.045, 0.05);
      const cardL = k.rect(card, "#FBFAF6", { name: "Cartel", shadow: soft(k, 0.18) });
      const st = k.stack({ x: card.x + pad, y: card.y + pad, w: card.w - pad * 2, h: card.h - pad * 2 }, { valign: "top", title: k.U * k.pick(0.068, 0.06, 0.068, 0.085), ctaStyle: "square", subUpper: k.tall, gap: k.U * 0.028 });
      // La carte épouse son texte (centrée verticalement dans la place prévue en formats larges).
      const h = st.h + pad * 2;
      const dy = k.wide ? (card.h - h) / 2 : 0;
      for (const l of k.layers.slice(k.layers.indexOf(cardL) + 1)) l.y += dy;
      cardL.y += dy;
      cardL.h = h;
      // Formats hauts : l'accrochage entier (cadres et cartel) se centre dans la hauteur disponible.
      if (k.tall) for (const l of k.layers.slice(first)) l.y += Math.max(0, (card.y + card.h - (cardL.y + h)) / 2);
      reanchor(k, k.layers.slice(k.layers.indexOf(cardL)));
    },
  },
  {
    id: "film-strip",
    name: ["Pellicule en trois vues", "Three-frame film strip"],
    family: "collage",
    photo: "required",
    styles: ["premium", "craft", "warm"],
    schemes: ["light", "brand", "dark"],
    treatments: ["natural", "warm", "mono"],
    build(k) {
      k.fill();
      const base = isDark(k.c.bg) ? mix(k.c.bg, "#000000", 0.6) : "#151515";
      const vertical = k.cls === "land";
      // Bande de film : en paysage elle est verticale à droite (images empilées), sinon horizontale en haut.
      const film: Box = vertical ? { x: k.W * 0.5, y: 0, w: k.W * 0.5, h: k.H } : { x: 0, y: k.pick(0, k.H * 0.05, k.H * 0.04, k.H * 0.06), w: k.W, h: k.H * k.pick(0, 0.5, 0.46, 0.4) };
      k.rect(film, base, { name: "Pellicule" });
      const perf = k.U * 0.05;
      const g = Math.max(4, Math.round(k.U * 0.01));
      // Perforations sur les deux bords du film.
      const hole = k.U * 0.018;
      const along = vertical ? film.h : film.w;
      const n = Math.round(along / (hole * 2.4));
      const step = along / n;
      for (let i = 0; i < n; i++) {
        const t = i * step + (step - hole * 1.2) / 2;
        for (const side of [0, 1]) {
          const off = side ? (vertical ? film.w : film.h) - perf / 2 - hole * 0.4 : perf / 2 - hole * 0.4;
          const b = vertical ? { x: film.x + off, y: film.y + t, w: hole * 0.8, h: hole * 1.2 } : { x: film.x + t, y: film.y + off, w: hole * 1.2, h: hole * 0.8 };
          k.rect(b, "#EDEAE3", { radius: hole * 0.2, name: "Perforation" });
        }
      }
      const inner = vertical ? { x: film.x + perf, y: film.y + g * 2, w: film.w - perf * 2, h: film.h - g * 4 } : { x: film.x + g * 2, y: film.y + perf, w: film.w - g * 4, h: film.h - perf * 2 };
      const crops: [{ u: number; v: number }, number][] = [[k.point(0), 1.7], [{ u: 0.5, v: 0.5 }, 1], [k.point(1), 1.7]];
      crops.forEach(([focus, zoom], i) => {
        const b = vertical ? { x: inner.x, y: inner.y + i * ((inner.h + g) / 3), w: inner.w, h: (inner.h - g * 2) / 3 } : { x: inner.x + i * ((inner.w + g) / 3), y: inner.y, w: (inner.w - g * 2) / 3, h: inner.h };
        k.photo(b, { focus, zoom });
      });
      const col = vertical ? { x: k.m.side, y: k.m.top, w: film.x - k.m.side - k.W * 0.05, h: k.H - k.m.top - k.m.bottom } : { x: k.m.side, y: film.y + film.h + k.H * 0.045, w: k.W - k.m.side * 2, h: k.H - k.m.bottom - (film.y + film.h + k.H * 0.045) };
      k.stack(col, { valign: "middle", title: k.U * k.pick(0.09, 0.07, 0.08, 0.095), eyebrow: true, sub: k.cls !== "square", ctaStyle: "square", gap: k.U * 0.03 });
    },
  },
  {
    id: "duo-circles",
    name: ["Deux cercles, vue et détail", "Two circles, view and detail"],
    family: "frame",
    photo: "required",
    styles: ["premium", "warm", "craft"],
    schemes: ["light", "brand", "dark"],
    treatments: ["natural", "warm", "punch"],
    build(k) {
      k.fill();
      const [d1, d2] = k.pick([k.H * 0.74, k.H * 0.42], [k.W * 0.5, k.W * 0.28], [k.W * 0.6, k.W * 0.33], [k.W * 0.64, k.W * 0.36]);
      const a = k.pick(
        { x: k.W * 0.44, y: k.H * 0.1 },
        { x: k.W * 0.1, y: k.H * 0.07 },
        { x: k.W * 0.1, y: k.H * 0.06 },
        { x: k.W * 0.08, y: k.m.top - k.H * 0.03 },
      );
      const b = k.pick(
        { x: a.x + d1 * 0.7, y: a.y + d1 - d2 * 1.05 },
        { x: a.x + d1 * 0.84, y: a.y + d1 - d2 * 0.85 },
        { x: a.x + d1 * 0.8, y: a.y + d1 - d2 * 0.82 },
        { x: a.x + d1 * 0.78, y: a.y + d1 - d2 * 0.9 },
      );
      const ring = Math.max(3, Math.round(k.U * 0.004));
      const o = k.U * 0.022;
      // Anneau décalé autour de la vue large.
      k.ellipse({ x: a.x - o, y: a.y - o * 0.4, w: d1 + o * 2, h: d1 + o * 2 }, null, { stroke: { color: k.c.accent, width: ring }, name: "Anneau" });
      k.photo({ x: a.x, y: a.y, w: d1, h: d1 }, { radius: d1 / 2, focus: { u: 0.5, v: 0.5 }, zoom: 1 });
      // Le détail : cercle plus petit cerclé de la couleur du fond, puis anneau d'accent.
      const sep = k.U * 0.016;
      k.ellipse({ x: b.x - sep, y: b.y - sep, w: d2 + sep * 2, h: d2 + sep * 2 }, k.c.bg, { name: "Séparation" });
      k.photo({ x: b.x, y: b.y, w: d2, h: d2 }, { radius: d2 / 2, focus: k.point(0), zoom: 2.5 });
      k.ellipse({ x: b.x - sep * 0.5, y: b.y - sep * 0.5, w: d2 + sep, h: d2 + sep }, null, { stroke: { color: k.c.accent, width: ring }, name: "Anneau" });
      const bottom = Math.max(a.y + d1, b.y + d2 + sep);
      const col = k.cls === "land" ? { x: k.m.side, y: k.m.top, w: a.x - k.m.side - k.W * 0.06, h: k.H - k.m.top - k.m.bottom } : { x: k.m.side, y: bottom + k.H * 0.045, w: k.W - k.m.side * 2, h: k.H - k.m.bottom - bottom - k.H * 0.045 };
      k.stack(col, { valign: "middle", title: k.U * k.pick(0.09, 0.066, 0.08, 0.1), italic: true, sub: k.cls !== "square", gap: k.U * 0.03 });
    },
  },
  {
    id: "editorial-columns",
    name: ["Article de magazine", "Magazine article"],
    family: "lux",
    photo: "required",
    styles: ["premium", "craft"],
    schemes: ["light", "dark", "brand"],
    treatments: ["natural", "mono", "warm"],
    build(k) {
      k.fill();
      const hw = hair(k);
      const rule = mix(k.c.ink, k.c.bg, 0.3);
      const X = k.m.side;
      const Wd = k.W - k.m.side * 2;
      const top = k.m.top;
      const bot = k.H - k.m.bottom;
      fit(k, (s) => {
        // En-tête : marque à gauche, surtitre à droite, filet double.
        const mark = k.brandMark({ x: X, y: top, w: Wd * 0.5 });
        let headH = mark.h;
        if (k.i.eyebrow) {
          const e = k.label(k.i.eyebrow, { x: X + Wd * 0.4, y: top, w: Wd * 0.6 }, { size: Math.max(22, k.U * 0.024), align: "right", color: k.c.accent, id: "eyebrow" });
          e.y = top + Math.max(0, (mark.h - e.h) / 2);
          headH = Math.max(headH, e.h);
        }
        let y = top + headH + k.U * 0.025;
        k.line(X, y, Wd, rule, hw * 2);
        k.line(X, y + hw * 4, Wd, rule, hw);
        y += hw * 5 + k.U * 0.04;
        const gap = k.U * 0.04;
        if (k.cls === "land") {
          // Paysage : titre, ligne et bouton en colonne à gauche ; filet vertical ; photo à droite.
          const cw = Wd * 0.44;
          const t = k.title({ x: X, y, w: cw }, { size: k.U * 0.085 * s, maxLines: 3 });
          let ty = y + t.h + gap * 0.6;
          const sub = k.subline({ x: X, y: ty, w: cw }, { size: k.U * 0.034 });
          if (sub) ty += sub.h;
          k.button(X, bot - ctaH(k), { maxW: cw, style: "square" });
          if (ty > bot - ctaH(k) - gap * 0.5) return false;
          const px = X + cw + Wd * 0.06;
          k.rect({ x: X + cw + Wd * 0.03 - hw / 2, y, w: hw, h: bot - y }, rule, { name: "Filet vertical" });
          k.photo({ x: px, y, w: X + Wd - px, h: bot - y }, { focus: k.point(0), zoom: 1 });
          return true;
        }
        // Formats hauts : titre et chapeau sur toute la largeur, puis deux colonnes d'images (vue, détail), bouton en pied.
        const t = k.title({ x: X, y, w: Wd }, { size: k.U * k.pick(0, 0.075, 0.09, 0.1) * s, maxLines: 3 });
        y += t.h + gap * 0.5;
        const sub = k.subline({ x: X, y, w: Wd }, { size: k.U * 0.032 });
        if (sub) y += sub.h + gap * 0.4;
        k.line(X, y, Wd, rule, hw);
        y += gap * 0.8;
        const by = bot - ctaH(k);
        const fy = by - gap * 0.7;
        const ph = fy - gap * 0.8 - y;
        if (ph < k.H * 0.22) return false;
        const pw = Wd * 0.64;
        k.photo({ x: X, y, w: pw, h: ph }, { focus: k.point(0), zoom: 1 });
        k.rect({ x: X + pw + Wd * 0.03 - hw / 2, y, w: hw, h: ph }, rule, { name: "Filet vertical" });
        const dx = X + pw + Wd * 0.06;
        k.photo({ x: dx, y, w: X + Wd - dx, h: ph }, { focus: k.point(1), zoom: 2 });
        k.line(X, fy, Wd, rule, hw);
        k.button(X, by, { maxW: Wd, style: "square" });
        return true;
      });
    },
  },
  {
    id: "panorama-band",
    name: ["Bande panoramique", "Panoramic band"],
    family: "lux",
    photo: "required",
    styles: ["premium", "warm", "craft"],
    schemes: ["light", "dark", "brand"],
    treatments: ["natural", "warm", "cool"],
    build(k) {
      k.fill();
      const X = k.m.side;
      const Wd = k.W - k.m.side * 2;
      const top = k.m.top;
      const bot = k.H - k.m.bottom;
      const hw = hair(k);
      const gap = k.U * k.pick(0.05, 0.045, 0.05, 0.06);
      // La bande : toute la largeur, très allongée, bordée de deux filets d'accent.
      const band = (y: number, h: number) => {
        const o = k.U * 0.016;
        k.line(0, y - o - hw, k.W, k.c.accent, hw);
        k.photo({ x: 0, y, w: k.W, h }, { focus: k.point(0), zoom: 1 });
        k.line(0, y + h + o, k.W, k.c.accent, hw);
      };
      if (k.cls === "land") {
        fit(k, (s) => {
          const t = k.title({ x: X, y: top, w: Wd * 0.68 }, { size: k.U * 0.085 * s, maxLines: 2 });
          const mark = k.brandMark({ x: X + Wd * 0.72, y: top, w: Wd * 0.28 }, { align: "right" });
          mark.y = top + Math.max(0, (Math.min(t.h, k.U * 0.1) - mark.h) / 2);
          const bh = ctaH(k);
          const by = bot - bh;
          const y = top + t.h + gap;
          const h = by - gap - y;
          if (h < k.H * 0.28) return false;
          band(y, h);
          const sub = k.subline({ x: X, y: by, w: Wd * 0.58 }, { size: k.U * 0.036 });
          if (sub) sub.y = by + (bh - sub.h) / 2;
          k.button(X + Wd, by, { maxW: Wd * 0.4, align: "right" });
          return true;
        });
        return;
      }
      fit(k, (s) => {
        const mark = k.brandMark({ x: X, y: top, w: Wd }, { align: "center" });
        let y = top + mark.h + gap * 0.8;
        const t = k.title({ x: X, y, w: Wd }, { size: k.U * k.pick(0, 0.075, 0.085, 0.095) * s, align: "center", italic: true, maxLines: 3 });
        y += t.h + gap;
        const bh = ctaH(k);
        const hasSub = !!k.i.subline?.trim();
        const subH = hasSub ? k.U * 0.032 * 1.25 + gap * 0.6 : 0;
        const avail = bot - y - gap - subH - bh;
        if (avail < k.H * 0.18) return false;
        // Hauteur panoramique (au plus la largeur / 2,2) ; le reste de la place est réparti autour.
        const h = Math.min(avail, k.W / k.pick(2.2, 2.4, 2.2, 1.8));
        const spare = avail - h;
        // Tout le bloc descend de la moitié de la place restante (composition centrée).
        const shift = spare / 2;
        for (const l of [mark, t]) l.y += shift;
        reanchor(k, [mark, t]);
        y += shift;
        band(y, h);
        y += h + gap;
        if (hasSub) {
          const sub = k.subline({ x: X, y, w: Wd }, { align: "center", upper: true, size: k.U * 0.03 });
          if (sub) y += sub.h + gap * 0.6;
        }
        k.button(k.W / 2, y, { maxW: Wd, align: "center" });
        return true;
      });
    },
  },
  {
    id: "grid-four",
    name: ["Grille de quatre cases", "Four-panel grid"],
    family: "collage",
    photo: "required",
    styles: ["premium", "craft", "warm"],
    schemes: ["light", "dark", "brand"],
    treatments: ["natural", "warm", "mono"],
    build(k) {
      k.fill();
      // Marges extérieures et gouttières égales.
      const g = Math.round(k.U * k.pick(0.03, 0.03, 0.03, 0.03));
      const area = { x: g, y: g, w: k.W - g * 2, h: k.H - g * 2 };
      // Proportions des colonnes et rangées : la case de texte est la plus grande.
      const [cx, ry] = k.pick([0.46, 0.58], [0.52, 0.52], [0.55, 0.55], [0.6, 0.56]);
      const cw0 = (area.w - g) * cx;
      const cw1 = area.w - g - cw0;
      // En formats hauts, la case de texte est en bas à gauche (place pour le texte dans les marges).
      const rh0 = (area.h - g) * (k.tall ? 1 - ry : ry);
      const rh1 = area.h - g - rh0;
      const cells: Box[] = [
        { x: area.x, y: area.y, w: cw0, h: rh0 },
        { x: area.x + cw0 + g, y: area.y, w: cw1, h: rh0 },
        { x: area.x, y: area.y + rh0 + g, w: cw0, h: rh1 },
        { x: area.x + cw0 + g, y: area.y + rh0 + g, w: cw1, h: rh1 },
      ];
      const textIdx = k.tall ? 2 : 0;
      const crops: [{ u: number; v: number }, number][] = [[{ u: 0.5, v: 0.5 }, 1], [k.point(0), 2.2], [k.point(1), 1.8]];
      let n = 0;
      const r = Math.round(k.U * 0.008);
      cells.forEach((c, i) => {
        if (i === textIdx) return;
        // La plus grande case photo reçoit la vue d'ensemble.
        const [focus, zoom] = crops[(i === (k.tall ? 1 : 3) ? 0 : ++n) % 3];
        k.photo(c, { focus, zoom, radius: r });
      });
      const tc = cells[textIdx];
      // Case de la couleur d'accent, ajustée pour qu'une encre de la marque y reste lisible (5:1).
      const ink = contrast(k.c.light, k.c.accent) >= contrast(k.c.dark, k.c.accent) ? k.c.light : k.c.dark;
      const cell = contrast(ink, k.c.accent) >= 5 ? k.c.accent : ensureContrast(k.c.accent, ink, 5);
      k.rect(tc, cell, { name: "Case de couleur", radius: r });
      const pad = k.U * k.pick(0.05, 0.045, 0.05, 0.055);
      const col = { x: Math.max(tc.x + pad, k.m.side), y: Math.max(tc.y + pad, k.m.top), w: 0, h: 0 };
      col.w = tc.x + tc.w - pad - col.x;
      col.h = Math.min(tc.y + tc.h - pad, k.H - k.m.bottom) - col.y;
      k.stack(col, { valign: k.tall ? "top" : "middle", title: k.U * k.pick(0.07, 0.06, 0.068, 0.075), sub: k.cls !== "square", ctaStyle: "square", gap: k.U * 0.028 });
      recolorCta(k, isDark(cell) ? k.c.light : k.c.dark);
    },
  },
  {
    id: "detail-zoom",
    name: ["Loupe sur un détail", "Detail magnifier"],
    family: "frame",
    photo: "required",
    styles: ["premium", "craft"],
    schemes: ["dark", "light", "brand"],
    treatments: ["natural", "punch", "warm"],
    build(k) {
      k.fill();
      const pic: Box = k.pick(
        { x: 0, y: 0, w: k.W * 0.56, h: k.H },
        { x: 0, y: 0, w: k.W, h: k.H * 0.6 },
        { x: 0, y: 0, w: k.W, h: k.H * 0.6 },
        { x: 0, y: 0, w: k.W, h: k.H * 0.55 },
      );
      k.photo(pic, { focus: { u: 0.5, v: 0.5 }, zoom: 1 });
      const main = k.cropFor(pic, { u: 0.5, v: 0.5 }, 1)!;
      const size = k.U * k.pick(0.46, 0.36, 0.38, 0.42);
      const med: Box = k.pick(
        { x: pic.w - size * 0.5, y: k.H - k.m.bottom - size, w: size, h: size },
        { x: k.W - k.m.side - size, y: pic.h - size * 0.55, w: size, h: size },
        { x: k.W - k.m.side - size, y: pic.h - size * 0.5, w: size, h: size },
        { x: k.W - k.m.side - size, y: pic.h - size * 0.45, w: size, h: size },
      );
      // Zone de la photo que montre la loupe, en coordonnées de l'image.
      const zoneOf = (f: { u: number; v: number }, z: number): Box => {
        const c = k.cropFor(med, f, z)!;
        return { x: pic.x + ((c.x - main.x) / main.w) * pic.w, y: pic.y + ((c.y - main.y) / main.h) * pic.h, w: (c.w / main.w) * pic.w, h: (c.h / main.h) * pic.h };
      };
      // Vrai grossissement : la loupe montre une zone d'environ 2,3 fois plus petite qu'elle (zoom 2,5 au moins).
      const zoom = Math.min(5, Math.max(2.5, zoneOf({ u: 0.5, v: 0.5 }, 1).w / (size / 2.3)));
      // Détail : un point d'intérêt dont la zone est entière dans la photo affichée et loin de la loupe.
      const free = (f: { u: number; v: number }) => {
        const z = zoneOf(f, zoom);
        const pad = k.U * 0.04;
        const inPic = z.x >= pic.x + pad * 0.5 && z.y >= pic.y + pad * 0.5 && z.x + z.w <= pic.x + pic.w - pad * 0.5 && z.y + z.h <= pic.y + pic.h - pad * 0.5;
        const clear = z.x + z.w < med.x - pad || z.x > med.x + med.w + pad || z.y + z.h < med.y - pad || z.y > med.y + med.h + pad;
        return inPic && clear;
      };
      const cands = [0, 1, 2, 3].map((i) => k.point(i));
      const focus = cands.find(free) ?? [{ u: 0.3, v: 0.35 }, { u: 0.5, v: 0.3 }, { u: 0.35, v: 0.5 }].find(free) ?? { u: 0.3, v: 0.3 };
      const { x: zx, y: zy, w: zw, h: zh } = zoneOf(focus, zoom);
      const white = "#FFFFFF";
      k.rect({ x: zx, y: zy, w: zw, h: zh }, null, { radius: k.U * 0.01, stroke: { color: white, width: Math.max(3, Math.round(k.U * 0.004)) }, name: "Zone du détail", shadow: { color: "rgba(0,0,0,0.4)", blur: Math.round(k.U * 0.01), x: 0, y: 0 } });
      // Trait du coin de la zone vers le coin de la loupe le plus proche.
      const zcx = zx + zw / 2;
      const zcy = zy + zh / 2;
      const mx = zcx < med.x ? med.x : zcx > med.x + med.w ? med.x + med.w : med.x + med.w / 2;
      const my = zcy < med.y ? med.y : med.y + med.h;
      const sx = mx > zcx ? zx + zw : zx;
      const sy = my > zcy ? zy + zh : zy;
      link(k, sx, sy, mx, my, white, Math.max(3, Math.round(k.U * 0.004)));
      const bd = Math.max(6, Math.round(k.U * 0.012));
      k.rect({ x: med.x - bd, y: med.y - bd, w: med.w + bd * 2, h: med.h + bd * 2 }, white, { radius: k.U * 0.035 + bd, shadow: soft(k, 0.35), name: "Loupe" });
      k.photo(med, { focus, zoom, radius: k.U * 0.035 });
      const col = k.cls === "land" ? { x: med.x + med.w + k.W * 0.05, y: k.m.top, w: k.W - k.m.side - (med.x + med.w + k.W * 0.05), h: k.H - k.m.top - k.m.bottom } : { x: k.m.side, y: pic.h + k.H * 0.04, w: med.x - k.m.side - k.W * 0.05, h: k.H - k.m.bottom - pic.h - k.H * 0.04 };
      k.stack(col, { valign: k.cls === "land" ? "middle" : "top", title: k.U * k.pick(0.08, 0.06, 0.068, 0.08), sub: k.cls !== "square", ctaStyle: "square", gap: k.U * 0.028 });
    },
  },
  {
    id: "tag-label",
    name: ["Étiquette de boutique", "Shop tag"],
    family: "promo",
    photo: "required",
    styles: ["craft", "warm", "premium"],
    schemes: ["light", "brand", "accent"],
    treatments: ["warm", "natural", "punch"],
    build(k) {
      k.fill();
      k.fullPhoto();
      const tw = k.W * k.pick(0.36, 0.5, 0.6, 0.66);
      const pad = k.U * k.pick(0.045, 0.04, 0.045, 0.05);
      const holeZone = k.U * 0.07;
      const x = k.cls === "land" ? k.W - k.m.side - tw - k.W * 0.02 : k.W - k.m.side - tw - k.W * 0.02;
      const maxH = k.H - k.m.top - k.m.bottom - k.U * 0.04;
      const tag = k.rect({ x, y: 0, w: tw, h: maxH }, k.c.bg, { radius: k.U * 0.03, name: "Étiquette", shadow: soft(k, 0.35) });
      const start = k.layers.length;
      const st = k.stack({ x: x + pad, y: holeZone + pad * 0.6, w: tw - pad * 2, h: maxH - holeZone - pad * 1.6 }, { align: "center", valign: "top", title: k.U * k.pick(0.07, 0.062, 0.07, 0.08), italic: true, sub: true, ctaStyle: "pill", gap: k.U * 0.026 });
      tag.h = holeZone + pad * 1.6 + st.h;
      // L'étiquette repose en bas (formats hauts) ou au centre (paysage), dans les marges.
      const ty = k.cls === "land" ? (k.H - tag.h) / 2 : k.H - k.m.bottom - tag.h - k.U * 0.02;
      tag.y = ty;
      const texts = k.layers.slice(start);
      for (const l of texts) l.y += ty;
      // Œillet : anneau d'accent et trou.
      const hd = k.U * 0.034;
      const hx = x + tw / 2;
      const hy = ty + holeZone * 0.55;
      const eyelet = k.ellipse({ x: hx - hd * 0.85, y: hy - hd * 0.85, w: hd * 1.7, h: hd * 1.7 }, mix(k.c.bg, k.c.ink, 0.12), { stroke: { color: k.c.accent, width: Math.max(3, Math.round(k.U * 0.004)) }, name: "Œillet" });
      const hole = k.ellipse({ x: hx - hd / 2, y: hy - hd / 2, w: hd, h: hd }, mix(k.c.dark, "#000000", 0.3), { name: "Trou" });
      const deg = k.pick(4, -4, -4, -3);
      k.rotateGroup([tag, eyelet, hole, ...texts], deg, x + tw / 2, ty + tag.h / 2);
      reanchor(k, [tag, eyelet, hole, ...texts]);
      // Ficelle : du trou jusqu'au haut de l'image, légèrement en biais.
      const a = (deg * Math.PI) / 180;
      const rx = hx - (x + tw / 2);
      const ry = hy - (ty + tag.h / 2);
      const px = x + tw / 2 + rx * Math.cos(a) - ry * Math.sin(a);
      const py = ty + tag.h / 2 + rx * Math.sin(a) + ry * Math.cos(a);
      const string = link(k, px, py, px - k.W * 0.06, -k.U * 0.02, "#EFE8DA", Math.max(3, Math.round(k.U * 0.005)));
      string.shadow = { color: "rgba(0,0,0,0.45)", blur: Math.round(k.U * 0.008), x: 0, y: Math.round(k.U * 0.004) };
      // Le nœud dans le trou passe par-dessus l'œillet.
      k.layers.splice(k.layers.indexOf(string), 1);
      k.layers.splice(k.layers.indexOf(hole) + 1, 0, string);
    },
  },
  {
    id: "minimal-line",
    name: ["Épure et filet", "Minimal line"],
    family: "lux",
    photo: "required",
    styles: ["premium", "craft"],
    schemes: ["light", "dark", "mono"],
    treatments: ["natural", "mono", "warm"],
    build(k) {
      k.fill();
      const X = k.m.side;
      const Wd = k.W - k.m.side * 2;
      const top = k.m.top;
      const bot = k.H - k.m.bottom;
      // Grille stricte de 6 colonnes (8 en paysage) : la photo et le texte s'alignent sur ses bords.
      const cols = k.cls === "land" ? 8 : 6;
      const gut = k.U * 0.03;
      const colW = (Wd - gut * (cols - 1)) / cols;
      const cx = (i: number) => X + i * (colW + gut);
      const span = (n: number) => n * colW + (n - 1) * gut;
      if (k.cls === "land") {
        const pic = { x: cx(5), y: top, w: span(3), h: bot - top };
        k.photo(pic, { focus: k.point(0), zoom: 1 });
        k.brandMark({ x: X, y: top, w: span(4) });
        fit(k, (s) => {
          const bh = ctaH(k);
          const t = k.title({ x: X, y: 0, w: span(4) }, { size: k.U * 0.085 * s, maxLines: 3 });
          const sub = k.subline({ x: X, y: 0, w: span(4) }, { size: k.U * 0.032 });
          const g = k.U * 0.04;
          const total = k.U * 0.004 + g + t.h + g * 0.6 + (sub ? sub.h + g : g * 0.4) + bh;
          let y = bot - total;
          if (y < top + k.U * 0.14 && s > 0.6) return false;
          k.rect({ x: X, y, w: colW, h: Math.max(4, k.U * 0.006) }, k.c.accent, { name: "Filet d'accent" });
          y += k.U * 0.006 + g;
          t.y = y;
          y += t.h + g * 0.6;
          if (sub) ((sub.y = y), (y += sub.h + g));
          else y += g * 0.4;
          reanchor(k, sub ? [t, sub] : [t]);
          k.button(X, y, { maxW: span(4), style: "square" });
          return true;
        });
        return;
      }
      // Formats hauts : marque en haut à gauche, petite photo calée à droite, texte en bas à gauche.
      const mark = k.brandMark({ x: X, y: top, w: span(k.cls === "square" ? 3 : 2) });
      const pw = span(k.cls === "square" ? 3 : 4);
      const ph = k.pick(0, pw * 1.15, pw * 1.22, pw * 1.12);
      const py = top;
      k.photo({ x: X + Wd - pw, y: py, w: pw, h: ph }, { focus: k.point(0), zoom: 1 });
      fit(k, (s) => {
        const tw = span(k.cls === "square" ? 3 : 5);
        const bh = ctaH(k);
        const t = k.title({ x: X, y: 0, w: tw }, { size: k.U * k.pick(0, 0.062, 0.072, 0.08) * s, maxLines: 4 });
        const sub = k.subline({ x: X, y: 0, w: tw }, { size: k.U * 0.03 });
        const g = k.U * 0.035;
        const total = k.U * 0.006 + g + t.h + g * 0.6 + (sub ? sub.h + g : g * 0.4) + bh;
        // Le bloc de texte s'aligne en bas de la grille ; en carré il est à gauche de la photo.
        let y = bot - total;
        const limit = k.cls === "square" ? top + mark.h + k.U * 0.05 : py + ph + k.U * 0.05;
        if (y < limit && s > 0.6) return false;
        y = Math.max(y, limit);
        k.rect({ x: X, y, w: colW, h: Math.max(4, k.U * 0.006) }, k.c.accent, { name: "Filet d'accent" });
        y += k.U * 0.006 + g;
        t.y = y;
        y += t.h + g * 0.6;
        if (sub) ((sub.y = y), (y += sub.h + g));
        else y += g * 0.4;
        reanchor(k, sub ? [t, sub] : [t]);
        k.button(X, y, { maxW: tw, style: "square" });
        return true;
      });
    },
  },
];
