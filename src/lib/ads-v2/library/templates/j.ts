/**
 * Bibliothèque de modèles — lot J (10 modèles « produit ») d'après des publicités produit de marques (soin, audio,
 * beauté) : le VRAI produit détouré mis en scène (halo lumineux, socle éclairé, panneau, cadre), et ses atouts
 * CONFIRMÉS en liste numérotée, en cases ou en légendes reliées au produit. Sans détourage, la photo prend sa place ;
 * sans atout confirmé, rien n'est listé (jamais de caractéristique inventée).
 */
import { isDark, mix } from "../../../color";
import { rgba, type Box, type Kit } from "../kit";
import type { Template } from "../types";
import { col, hair, pad, soft, tsize } from "./util";

/** Le produit détouré, sinon la photo cadrée (arrondie), sinon rien. Renvoie la boîte occupée. */
function hero(k: Kit, b: Box, o: { radius?: number; align?: "center" | "bottom"; frame?: boolean } = {}): Box | null {
  if (k.hasProduct) return k.productShot(b, { align: o.align });
  if (k.hasPhoto) {
    k.photo(b, { radius: o.radius ?? Math.round(k.U * 0.03), focus: k.point(0), shadow: o.frame === false ? null : soft(k, 0.22) });
    return b;
  }
  return null;
}

/** Socle éclairé (disque vu de biais) sous le produit. */
function podium(k: Kit, cx: number, y: number, w: number, color: string, rim: string) {
  const h = w * 0.2;
  k.ellipse({ x: cx - w / 2, y: y - h * 0.15, w, h: h * 1.25 }, mix(color, "#000000", 0.25), { name: "Socle (côté)" });
  k.ellipse({ x: cx - w / 2, y: y - h / 2, w, h }, color, { name: "Socle", stroke: { color: rim, width: hair(k) * 1.5 } });
}

/**
 * Liste d'atouts numérotés (01, 02…) : pastille ronde + texte. Renvoie la hauteur utilisée (0 sans atout).
 */
function featureList(k: Kit, items: string[], b: Box, o: { color?: string; dot?: string; dotInk?: string; size?: number; gap?: number } = {}): number {
  if (!items.length) return 0;
  const size = Math.max(22, o.size ?? k.U * k.pick(0.032, 0.03, 0.03, 0.032));
  const d = Math.round(size * 1.9);
  const gap = o.gap ?? size * 0.9;
  let y = b.y;
  items.forEach((s, n) => {
    if (y + d > b.y + b.h) return;
    const dot = o.dot ?? k.c.accent;
    k.ellipse({ x: b.x, y, w: d, h: d }, dot, { name: `Pastille ${n + 1}` });
    k.text("body", String(n + 1).padStart(2, "0"), { x: b.x, y: y + d / 2 - size * 0.62, w: d }, { size: Math.max(22, size * 0.82), weight: 700, align: "center", color: o.dotInk ?? (isDark(dot) ? "#FFFFFF" : "#111111"), maxLines: 1 }, `feat-n-${n}`, `Numéro ${n + 1}`);
    const t = k.text("body", s, { x: b.x + d + size * 0.7, y: y + d / 2 - size * 0.7, w: b.w - d - size * 0.7 }, { size, weight: 600, color: o.color ?? k.c.ink, maxLines: 2, lineHeight: 1.15 }, `feat-${n}`, `Atout ${n + 1}`);
    y += Math.max(d, t.h) + gap;
  });
  return y - b.y - gap;
}

/** Points décoratifs en grille (trame de points). */
function dots(k: Kit, x: number, y: number, cols: number, rows: number, color: string, step = k.U * 0.022) {
  const r = Math.max(3, step * 0.18);
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) k.ellipse({ x: x + i * step, y: y + j * step, w: r * 2, h: r * 2 }, color, { name: "Trame" });
}

export const TEMPLATES_J: Template[] = [
  {
    id: "halo-center",
    name: ["Halo lumineux", "Glow halo"],
    family: "lux",
    photo: "optional",
    product: true,
    schemes: ["light", "brand"],
    treatments: ["natural", "warm"],
    build(k) {
      k.fill();
      // Fond lumineux : la photo floutée et éclaircie (marbre, tissu…) ou un halo radial de la couleur de fond.
      if (k.hasPhoto && k.hasProduct) {
        k.photo({ x: 0, y: 0, w: k.W, h: k.H }, { full: true, fx: false, filter: "blur(10px) brightness(1.08)" });
        k.rect({ x: 0, y: 0, w: k.W, h: k.H }, rgba(k.c.bg, 0.55), { name: "Voile", role: "scrim" });
      }
      k.rect({ x: 0, y: 0, w: k.W, h: k.H }, { type: "radial", angle: 0, stops: [{ offset: 0, color: rgba(mix(k.c.bg, "#FFFFFF", 0.7), 0.95) }, { offset: 1, color: rgba(k.c.bg, 0) }] }, { name: "Halo" });
      // Bulles de lumière (bokeh) discrètes.
      [[0.12, 0.2, 0.05], [0.84, 0.16, 0.035], [0.9, 0.62, 0.06], [0.08, 0.7, 0.04], [0.7, 0.86, 0.03]].forEach(([u, v, r], n) => k.ellipse({ x: k.W * u, y: k.H * v, w: k.U * r * 2, h: k.U * r * 2 }, rgba("#FFFFFF", 0.35), { name: `Lumière ${n + 1}` }));
      if (k.cls === "land") {
        const txt = { x: k.m.side, y: k.m.top, w: k.W * 0.44, h: k.H - k.m.top - k.m.bottom };
        hero(k, { x: k.W * 0.52, y: k.H * 0.1, w: k.W * 0.42, h: k.H * 0.8 }, { align: "center" });
        col(k, txt, { valign: "middle", title: tsize(k, 0.07, 0.06), sub: true, subUpper: true, ctaStyle: "pill" });
        return;
      }
      const top = k.m.top;
      const s = col(k, { x: k.m.side, y: top, w: k.W - k.m.side * 2, h: k.H * k.pick(0, 0.3, 0.28, 0.26) }, { align: "center", valign: "top", title: tsize(k, 0.07, 0.062, 0.066, 0.072), sub: true, subUpper: true, cta: false, gap: k.U * 0.022 });
      const bh = k.U * 0.13;
      const py = s.y + s.h + k.U * 0.04;
      const ph = k.H - k.m.bottom - bh - py;
      hero(k, { x: k.W * 0.18, y: py, w: k.W * 0.64, h: ph }, { align: "bottom" });
      k.button(k.W / 2, k.H - k.m.bottom - k.U * 0.1, { maxW: k.W * 0.6, align: "center", style: "pill" });
    },
  },
  {
    id: "night-launch",
    name: ["Lancement nocturne", "Night launch"],
    family: "promo",
    photo: "optional",
    product: true,
    schemes: ["dark"],
    treatments: ["moody", "mono"],
    build(k) {
      k.fill();
      k.rect({ x: 0, y: 0, w: k.W, h: k.H }, { type: "linear", angle: 135, stops: [{ offset: 0, color: mix(k.c.bg, "#FFFFFF", 0.1) }, { offset: 1, color: mix(k.c.bg, "#000000", 0.35) }] }, { name: "Dégradé" });
      // Plans inclinés en arrière-plan (studio sombre).
      k.rect({ x: k.W * 0.55, y: -k.H * 0.2, w: k.W * 0.7, h: k.H * 1.4 }, rgba("#FFFFFF", 0.04), { rotation: 18, name: "Plan" });
      const rim = mix(k.c.accent, "#FFFFFF", 0.4);
      const items = k.features(3);
      if (k.cls === "land") {
        const pw = k.W * 0.42, cx = k.W * 0.72, py = k.H * 0.8;
        podium(k, cx, py, pw, mix(k.c.bg, "#FFFFFF", 0.08), rim);
        hero(k, { x: cx - pw * 0.42, y: k.H * 0.12, w: pw * 0.84, h: py - k.H * 0.12 }, { align: "bottom" });
        const s = col(k, { x: k.m.side, y: k.m.top, w: k.W * 0.44, h: k.H * 0.5 }, { valign: "top", title: tsize(k, 0.085, 0.07), display: true, upper: true, eyebrow: true, sub: true, cta: false, onDark: true });
        const fh = featureList(k, items, { x: k.m.side, y: s.y + s.h + k.U * 0.04, w: k.W * 0.42, h: k.H - k.m.bottom - (s.y + s.h + k.U * 0.04) - k.U * 0.14 });
        k.button(k.m.side, Math.min(k.H - k.m.bottom - k.U * 0.1, s.y + s.h + k.U * 0.07 + fh), { maxW: k.W * 0.4, style: "pill" });
        return;
      }
      const s = col(k, { x: k.m.side, y: k.m.top, w: k.W - k.m.side * 2, h: k.H * 0.36 }, { valign: "top", title: tsize(k, 0.085, 0.085, 0.09, 0.095), display: true, upper: true, eyebrow: true, sub: true, cta: false, onDark: true, maxLines: 3 });
      const ly = s.y + s.h + k.U * 0.04;
      const listW = k.W * (items.length ? 0.48 : 0);
      const fh = featureList(k, items, { x: k.m.side, y: ly, w: listW, h: k.H * 0.34 });
      const cx = items.length ? k.W * 0.7 : k.W / 2, pw = k.W * (items.length ? 0.52 : 0.7);
      const py = k.H - k.m.bottom - k.U * (k.cls === "story" ? 0.18 : 0.16);
      podium(k, cx, py, pw, mix(k.c.bg, "#FFFFFF", 0.08), rim);
      hero(k, { x: cx - pw * 0.45, y: ly - (items.length ? 0 : k.U * 0.02), w: pw * 0.9, h: py - ly }, { align: "bottom" });
      k.button(k.m.side, Math.max(ly + fh + k.U * 0.04, py + k.U * 0.06), { maxW: k.W * 0.5, style: "pill" });
    },
  },
  {
    id: "bento-features",
    name: ["Grille d'atouts", "Feature grid"],
    family: "split",
    photo: "optional",
    product: true,
    schemes: ["light", "brand"],
    treatments: ["natural", "warm"],
    build(k) {
      k.fill();
      const g = Math.round(k.U * 0.022);
      const r = Math.round(k.U * 0.03);
      const items = k.features(4);
      const tones = [k.c.accent, mix(k.c.dark, k.c.accent, 0.35), mix(k.c.accent, k.c.bg, 0.45), mix(k.c.dark, k.c.bg, 0.2)];
      const land = k.cls === "land";
      const head = land ? { x: k.m.side, y: k.m.top, w: k.W * 0.3, h: k.H - k.m.top - k.m.bottom } : { x: k.m.side, y: k.m.top, w: k.W - k.m.side * 2, h: k.H * 0.2 };
      const s = col(k, head, { valign: land ? "middle" : "top", title: tsize(k, 0.06, 0.055, 0.06, 0.066), sub: false, cta: land, eyebrow: false, maxLines: 3, gap: k.U * 0.02 });
      const grid = land ? { x: head.x + head.w + k.W * 0.04, y: k.m.top, w: k.W - k.m.side - (head.x + head.w + k.W * 0.04), h: k.H - k.m.top - k.m.bottom } : { x: k.m.side, y: s.y + s.h + k.U * 0.04, w: k.W - k.m.side * 2, h: k.H - k.m.bottom - (s.y + s.h + k.U * 0.04) };
      const lw = items.length ? grid.w * 0.56 : grid.w;
      // Grande case : le produit sur la couleur de marque (ou la photo).
      const big = { x: grid.x, y: grid.y, w: lw, h: land ? grid.h : grid.h - (items.length ? 0 : k.U * 0.16) };
      k.rect(big, mix(k.c.accent, k.c.bg, 0.25), { radius: r, name: "Case produit" });
      if (k.hasProduct) hero(k, pad(big, big.w * 0.08), { align: "center" });
      else hero(k, big, { radius: r, frame: false });
      // Cases d'atouts : couleurs de la marque en alternance.
      const n = items.length;
      if (n) {
        const rx = grid.x + lw + g, rw = grid.w - lw - g;
        const ch = (grid.h - g * (n - 1) - (land ? 0 : k.U * 0.13 + g)) / n;
        items.forEach((t, i) => {
          const b = { x: rx, y: grid.y + i * (ch + g), w: rw, h: ch };
          k.rect(b, tones[i % tones.length], { radius: r, name: `Case ${i + 1}` });
          k.text("body", t, { x: b.x + rw * 0.1, y: b.y + ch / 2 - k.U * 0.035, w: rw * 0.8 }, { size: Math.max(24, k.U * 0.034), weight: 700, align: "center", maxLines: 3, lineHeight: 1.1 }, `feat-${i}`, `Atout ${i + 1}`);
        });
      }
      if (!land) k.button(n ? grid.x + lw + g + (grid.w - lw - g) / 2 : k.W / 2, k.H - k.m.bottom - k.U * 0.115, { maxW: n ? grid.w - lw - g : k.W * 0.6, align: "center", style: "rounded" });
    },
  },
  {
    id: "satin-editorial",
    name: ["Éditorial satiné", "Satin editorial"],
    family: "lux",
    photo: "optional",
    product: true,
    schemes: ["brand", "dark"],
    treatments: ["warm", "natural"],
    build(k) {
      k.fill();
      // Fond : la photo (tissu, matière) assombrie vers le texte, sinon un drapé en dégradé de la marque.
      if (k.hasPhoto && k.hasProduct) {
        k.fullPhoto();
        k.veil({ x: 0, y: 0, w: k.W, h: k.H }, k.cls === "land" ? 180 : 90, mix(k.c.bg, "#000000", 0.2), 0.75);
      } else k.rect({ x: 0, y: 0, w: k.W, h: k.H }, { type: "linear", angle: 120, stops: [{ offset: 0, color: mix(k.c.bg, "#FFFFFF", 0.14) }, { offset: 0.55, color: k.c.bg }, { offset: 1, color: mix(k.c.bg, "#000000", 0.22) }] }, { name: "Drapé" });
      if (k.cls === "land") {
        hero(k, { x: k.W * 0.08, y: k.H * 0.12, w: k.W * 0.34, h: k.H * 0.78 }, { align: "bottom" });
        col(k, { x: k.W * 0.47, y: k.m.top, w: k.W * 0.47, h: k.H - k.m.top - k.m.bottom }, { valign: "middle", title: tsize(k, 0.075, 0.06), eyebrow: true, sub: true, ctaStyle: "square", onDark: true });
        return;
      }
      const s = col(k, { x: k.W * 0.36, y: k.m.top, w: k.W * 0.64 - k.m.side, h: k.H * 0.4 }, { valign: "top", title: tsize(k, 0.07, 0.062, 0.066, 0.07), eyebrow: true, sub: true, ctaStyle: "square", onDark: true, maxLines: 4 });
      const py = Math.max(s.y + s.h + k.U * 0.04, k.H * 0.42);
      hero(k, { x: k.m.side * 0.6, y: py, w: k.W * 0.78, h: k.H - k.m.bottom - py }, { align: "bottom" });
    },
  },
  {
    id: "spec-ring",
    name: ["Produit et ses atouts", "Product and its features"],
    family: "promo",
    photo: "optional",
    product: true,
    schemes: ["light"],
    treatments: ["natural", "mono"],
    build(k) {
      k.fill();
      const items = k.features(6);
      const s = col(k, { x: k.m.side, y: k.m.top, w: k.W - k.m.side * 2, h: k.H * k.pick(0.3, 0.2, 0.2, 0.18) }, { align: "center", valign: "top", title: tsize(k, 0.06, 0.058, 0.062, 0.066), display: true, upper: true, eyebrow: true, sub: false, cta: false, maxLines: 2, gap: k.U * 0.018 });
      const bh = k.U * 0.12;
      const top = s.y + s.h + k.U * 0.04;
      const bottom = k.H - k.m.bottom - bh - k.U * 0.03;
      const left = items.filter((_, i) => i % 2 === 0), right = items.filter((_, i) => i % 2 === 1);
      const sideW = items.length ? k.W * k.pick(0.22, 0.24, 0.25, 0.27) : 0;
      const mid = { x: k.m.side + sideW, y: top, w: k.W - (k.m.side + sideW) * 2, h: bottom - top };
      const shot = hero(k, { x: mid.x - sideW * 0.15, y: mid.y + mid.h * 0.08, w: mid.w + sideW * 0.3, h: mid.h * 0.78 }, { align: "center" });
      if (shot) k.ellipse({ x: shot.x + shot.w * 0.1, y: shot.y + shot.h - k.U * 0.01, w: shot.w * 0.8, h: k.U * 0.04 }, rgba(k.c.dark, 0.08), { name: "Reflet" });
      // Atouts de part et d'autre : pastille numérotée au-dessus du texte, centrée sur la colonne.
      const place = (list: string[], x: number, base: number) => {
        const ch = (bottom - top) / Math.max(1, list.length);
        list.forEach((t, j) => {
          const d = k.U * 0.07, cy = top + ch * j + ch / 2 - d;
          k.ellipse({ x: x + sideW / 2 - d / 2, y: cy, w: d, h: d }, k.c.dark, { name: `Pastille ${base + j * 2 + 1}` });
          k.text("body", String(base + j * 2 + 1).padStart(2, "0"), { x: x + sideW / 2 - d / 2, y: cy + d / 2 - k.U * 0.02, w: d }, { size: Math.max(22, k.U * 0.026), weight: 700, align: "center", color: "#FFFFFF", maxLines: 1 }, `feat-n-${base + j * 2}`);
          k.text("body", t, { x, y: cy + d + k.U * 0.015, w: sideW - k.U * 0.01 }, { size: Math.max(22, k.U * 0.028), weight: 700, align: "center", upper: true, maxLines: 3, lineHeight: 1.1 }, `feat-${base + j * 2}`, `Atout ${base + j * 2 + 1}`);
        });
      };
      if (items.length) {
        place(left, k.m.side, 0);
        place(right, k.W - k.m.side - sideW, 1);
      }
      k.button(k.W / 2, k.H - k.m.bottom - bh * 0.85, { maxW: k.W * 0.7, align: "center", style: "pill", fill: k.c.dark });
    },
  },
  {
    id: "beauty-panel",
    name: ["Panneau beauté", "Beauty panel"],
    family: "split",
    photo: "optional",
    product: true,
    schemes: ["light", "brand"],
    treatments: ["warm", "natural"],
    build(k) {
      k.fill();
      const land = k.cls === "land";
      const split = land ? k.W * 0.46 : k.H * (k.cls === "story" ? 0.46 : 0.52);
      // Haut (ou gauche) : la photo du produit en situation, sinon la couleur de la marque.
      const top = land ? { x: 0, y: 0, w: split, h: k.H } : { x: 0, y: 0, w: k.W, h: split };
      if (k.hasPhoto) k.photo(top, { focus: k.point(0) });
      else k.rect(top, mix(k.c.accent, k.c.bg, 0.35), { name: "Aplat" });
      // Encart du produit à cheval sur la limite, avec un cadre décalé.
      const iw = k.U * (land ? 0.42 : 0.38);
      const inset = land ? { x: split - iw * 0.55, y: k.H * 0.36, w: iw, h: iw } : { x: k.m.side, y: split - iw * 0.45, w: iw, h: iw };
      k.rect({ x: inset.x - k.U * 0.025, y: inset.y + k.U * 0.025, w: inset.w, h: inset.h }, mix(k.c.accent, k.c.bg, 0.3), { name: "Cadre décalé" });
      k.rect(inset, "#FFFFFF", { shadow: soft(k, 0.18), name: "Encart" });
      if (k.hasProduct) k.productShot(pad(inset, inset.w * 0.1), { align: "center", contact: false });
      else if (k.hasPhoto) k.photo(pad(inset, inset.w * 0.04), { focus: k.point(1), zoom: 1.6 });
      // Ligne de points sous l'encart.
      const dy = inset.y + inset.h + k.U * 0.04;
      for (let n = 0; n < 5; n++) k.ellipse({ x: inset.x + inset.w * 0.18 + n * inset.w * 0.16, y: dy, w: k.U * 0.016, h: k.U * 0.016 }, k.c.accent, { name: "Point" });
      const txt = land ? { x: split + k.W * 0.06, y: k.m.top, w: k.W - split - k.W * 0.06 - k.m.side, h: k.H - k.m.top - k.m.bottom } : { x: inset.x + inset.w + k.W * 0.05, y: split + k.U * 0.04, w: k.W - (inset.x + inset.w + k.W * 0.05) - k.m.side, h: k.H - k.m.bottom - split - k.U * 0.04 };
      col(k, txt, { valign: land ? "middle" : "top", title: tsize(k, 0.06, 0.05, 0.055, 0.06), display: true, upper: true, eyebrow: true, sub: true, ctaStyle: "square", maxLines: 3, gap: k.U * 0.02 });
      dots(k, k.W - k.U * 0.15, k.H - k.U * 0.1, 6, 4, rgba(k.c.ink, 0.3), k.U * 0.02);
    },
  },
  {
    id: "frame-launch",
    name: ["Cadre de lancement", "Launch frame"],
    family: "frame",
    photo: "optional",
    product: true,
    schemes: ["light", "brand"],
    treatments: ["warm", "natural"],
    build(k) {
      k.fill();
      const land = k.cls === "land";
      // Bandeau de couleur dans la moitié basse, le visuel à cheval.
      const bandY = land ? k.H * 0.5 : k.H * 0.5;
      k.rect({ x: 0, y: bandY, w: k.W, h: k.H - bandY }, mix(k.c.accent, k.c.bg, 0.15), { name: "Bandeau" });
      k.rect({ x: 0, y: 0, w: k.W, h: k.U * 0.014 }, mix(k.c.accent, k.c.bg, 0.15), { name: "Filet haut" });
      if (land) {
        // Paysage : le cadre et le visuel à gauche, à cheval sur le bandeau ; le texte à droite.
        const fw = k.W * 0.34, fh = k.H * 0.7, frame = { x: k.W * 0.07, y: k.H * 0.12, w: fw, h: fh };
        k.rect(frame, null, { stroke: { color: mix(k.c.accent, k.c.bg, 0.15), width: Math.round(k.U * 0.016) }, name: "Cadre" });
        const pic = { x: frame.x + fw * 0.09, y: frame.y + fh * 0.1, w: fw * 0.82, h: fh * 0.8 };
        if (k.hasProduct) {
          k.rect(pic, mix(k.c.accent, "#FFFFFF", 0.55), { name: "Fond produit" });
          k.productShot(pad(pic, pic.w * 0.08), { align: "center" });
        } else hero(k, pic, { radius: 0, frame: false });
        col(k, { x: k.W * 0.48, y: k.m.top, w: k.W * 0.46, h: k.H - k.m.top - k.m.bottom }, { valign: "middle", title: tsize(k, 0.07, 0.06), display: true, upper: true, sub: true, subUpper: true, ctaStyle: "square", maxLines: 3, gap: k.U * 0.02 });
        return;
      }
      const title = k.title({ x: k.m.side, y: k.m.top + k.U * 0.01, w: k.W - k.m.side * 2 }, { size: tsize(k, 0.07, 0.07, 0.075, 0.08), display: true, upper: true, align: "center", maxLines: 2, color: mix(k.c.accent, k.c.dark, 0.25) });
      const fy = title.y + title.h + k.U * 0.04;
      const fw = k.W * (land ? 0.4 : 0.62);
      const fh = Math.min(fw * 0.92, k.H * (land ? 0.6 : 0.42));
      const frame = { x: (k.W - fw) / 2, y: fy, w: fw, h: fh };
      k.rect(frame, null, { stroke: { color: mix(k.c.accent, k.c.bg, 0.15), width: Math.round(k.U * 0.016) }, name: "Cadre" });
      const pic = { x: frame.x + fw * 0.09, y: frame.y + fh * 0.12, w: fw * 0.82, h: fh * 0.98 };
      if (k.hasProduct) {
        k.rect(pic, mix(k.c.accent, "#FFFFFF", 0.55), { name: "Fond produit" });
        k.productShot(pad(pic, pic.w * 0.08), { align: "center" });
      } else hero(k, pic, { radius: 0, frame: false });
      // Sous le visuel, sur le bandeau : la ligne en capitales puis le bouton carré (pas de second titre).
      const sy = pic.y + pic.h + k.U * 0.04;
      const sub = k.subline({ x: k.m.side, y: sy, w: k.W - k.m.side * 2 }, { align: "center", upper: true });
      k.button(k.W / 2, (sub ? sub.y + sub.h : sy) + k.U * 0.03, { maxW: k.W * 0.6, align: "center", style: "square" });
      k.brandMark({ x: k.m.side, y: k.H - k.m.bottom - k.logoHeight(0.7), w: k.W * 0.3 }, { height: k.logoHeight(0.7), onDark: true });
    },
  },
  {
    id: "callout-lines",
    name: ["Légendes reliées", "Linked callouts"],
    family: "lux",
    photo: "optional",
    product: true,
    schemes: ["dark", "brand"],
    treatments: ["moody", "natural"],
    build(k) {
      k.fill();
      const items = k.features(3);
      const land = k.cls === "land";
      const area = land ? { x: k.W * 0.3, y: k.H * 0.16, w: k.W * 0.4, h: k.H * 0.66 } : { x: k.W * 0.24, y: k.H * 0.26, w: k.W * 0.52, h: k.H * (k.cls === "story" ? 0.36 : 0.42) };
      const prod = hero(k, area, { align: "center" }) ?? area;
      const ink = k.c.ink, line = mix(ink, k.c.bg, 0.25), w = hair(k);
      const size = Math.max(22, k.U * 0.026);
      const dot = (x: number, y: number, n: number) => k.ellipse({ x: x - k.U * 0.008, y: y - k.U * 0.008, w: k.U * 0.016, h: k.U * 0.016 }, ink, { name: `Repère ${n}` });
      // Légende du haut : centrée au-dessus, trait vertical vers le produit.
      if (items[0]) {
        const ty = k.m.top + k.logoHeight(0.8) + k.U * 0.05;
        const t = k.text("body", items[0], { x: k.W * 0.25, y: ty, w: k.W * 0.5 }, { size, weight: 500, align: "center", upper: true, maxLines: 2, color: ink }, "feat-0", "Atout 1");
        const x = k.W / 2, y0 = t.y + t.h + k.U * 0.015, y1 = prod.y + prod.h * 0.12;
        if (y1 > y0) k.rect({ x: x - w / 2, y: y0, w, h: y1 - y0 }, line, { name: "Trait 1" });
        dot(x, Math.max(y1, y0), 1);
      }
      // Légendes de gauche et de droite : trait horizontal vers le produit.
      ([[1, "left"], [2, "right"]] as const).forEach(([n, side]) => {
        const s = items[n];
        if (!s) return;
        const cy = prod.y + prod.h * (side === "left" ? 0.55 : 0.68);
        const room = side === "left" ? prod.x - k.m.side - k.U * 0.02 : k.W - k.m.side - (prod.x + prod.w) - k.U * 0.02;
        const tw = Math.max(k.W * 0.16, Math.min(land ? k.W * 0.2 : k.W * 0.22, room));
        const tx = side === "left" ? k.m.side : k.W - k.m.side - tw;
        const t = k.text("body", s, { x: tx, y: cy - size * 1.4, w: tw }, { size, weight: 500, align: side === "left" ? "left" : "right", upper: true, maxLines: 3, color: ink }, `feat-${n}`, `Atout ${n + 1}`);
        const lx0 = side === "left" ? tx + tw * 0.6 : prod.x + prod.w * 0.82;
        const lx1 = side === "left" ? prod.x + prod.w * 0.18 : tx + tw * 0.4;
        const ly = t.y + t.h + k.U * 0.015;
        if (lx1 > lx0) k.rect({ x: lx0, y: ly, w: lx1 - lx0, h: w }, line, { name: `Trait ${n + 1}` });
        dot(side === "left" ? lx1 : lx0, ly, n + 1);
      });
      k.brandMark({ x: k.m.side, y: k.m.top, w: k.W * 0.4 }, { height: k.logoHeight(0.8), onDark: isDark(k.c.bg) });
      const by = k.H - k.m.bottom;
      col(k, { x: k.m.side, y: land ? k.H * 0.72 : prod.y + prod.h + k.U * 0.05, w: land ? k.W * 0.42 : k.W - k.m.side * 2, h: by - (land ? k.H * 0.72 : prod.y + prod.h + k.U * 0.05) }, { valign: "bottom", mark: false, title: tsize(k, 0.05, 0.05, 0.055, 0.06), upper: true, sub: false, ctaStyle: "pill", onDark: isDark(k.c.bg), maxLines: 2, gap: k.U * 0.02 });
    },
  },
  {
    id: "spec-sheet",
    name: ["Fiche technique", "Spec sheet"],
    family: "split",
    photo: "optional",
    product: true,
    schemes: ["light"],
    treatments: ["natural", "mono"],
    build(k) {
      k.fill();
      const land = k.cls === "land";
      // En-tête : logo | surtitre, séparés par un filet vertical.
      const lh = k.logoHeight(0.8);
      const mark = k.brandMark({ x: k.m.side, y: k.m.top, w: k.W * 0.36 }, { height: lh });
      if (k.i.eyebrow) {
        const sx = mark.x + mark.w + k.U * 0.03;
        k.rect({ x: sx, y: k.m.top, w: hair(k) * 1.5, h: lh }, k.c.accent, { name: "Séparateur" });
        k.label(k.i.eyebrow, { x: sx + k.U * 0.03, y: k.m.top + lh / 2 - k.U * 0.014, w: k.W - sx - k.m.side - k.U * 0.03 }, { size: Math.max(22, k.U * 0.022), color: k.c.accent, id: "eyebrow" });
      }
      const items = k.features(4);
      const ty = k.m.top + lh + k.U * 0.07;
      const colW = land ? k.W * 0.46 : k.W * (items.length ? 0.54 : 0.86);
      k.rect({ x: k.m.side, y: ty, w: Math.round(k.U * 0.01), h: k.U * 0.15 }, k.c.accent, { name: "Barre" });
      const t = k.title({ x: k.m.side + k.U * 0.035, y: ty, w: colW - k.U * 0.035 }, { size: tsize(k, 0.06, 0.06, 0.065, 0.07), display: true, maxLines: 3 });
      const fy = t.y + t.h + k.U * 0.05;
      const fh = featureList(k, items, { x: k.m.side, y: fy, w: colW, h: k.H - k.m.bottom - fy - k.U * 0.12 }, { dot: mix(k.c.accent, k.c.bg, 0.15), size: Math.max(22, k.U * 0.028) });
      if (!items.length) k.subline({ x: k.m.side, y: fy, w: colW });
      const px = k.m.side + colW + k.U * 0.02;
      hero(k, land || items.length ? { x: px, y: ty, w: k.W - k.m.side - px, h: k.H - k.m.bottom - ty - k.U * 0.1 } : { x: k.W * 0.2, y: fy + k.U * 0.08, w: k.W * 0.6, h: k.H - k.m.bottom - fy - k.U * 0.2 }, { align: "center" });
      // Trame de points en quart de cercle (décor, coin bas gauche).
      for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) if (i * i + j * j < 42) k.ellipse({ x: -k.U * 0.01 + i * k.U * 0.022, y: k.H - k.U * 0.02 - j * k.U * 0.022, w: k.U * 0.009, h: k.U * 0.009 }, rgba(k.c.accent, 0.5 - (i + j) * 0.03), { name: "Trame" });
      k.button(k.W - k.m.side, Math.max(fy + fh + k.U * 0.04, k.H - k.m.bottom - k.U * 0.1), { maxW: k.W * 0.5, align: "right", style: "pill" });
    },
  },
  {
    id: "promo-card",
    name: ["Carte promo", "Promo card"],
    family: "promo",
    photo: "optional",
    product: true,
    schemes: ["brand", "accent"],
    treatments: ["natural", "warm"],
    build(k) {
      k.fill();
      // Carte posée sur le fond de la marque, grande ombre douce.
      const inset = k.U * 0.06;
      const card = { x: inset, y: Math.max(inset, k.m.top * 0.6), w: k.W - inset * 2, h: k.H - Math.max(inset, k.m.top * 0.6) - Math.max(inset, k.m.bottom * 0.6) };
      k.rect(card, mix(k.c.bg, "#000000", 0.12), { radius: Math.round(k.U * 0.02), shadow: soft(k, 0.35), name: "Carte" });
      k.ellipse({ x: card.x + card.w * 0.5, y: card.y - card.h * 0.1, w: card.w * 0.9, h: card.h * 0.9 }, rgba("#FFFFFF", 0.05), { name: "Halo" });
      dots(k, card.x + card.w - k.U * 0.16, card.y + k.U * 0.05, 4, 2, rgba("#FFFFFF", 0.7), k.U * 0.03);
      const land = k.cls === "land";
      const inner = pad(card, k.U * 0.06, k.U * 0.06);
      // Paysage et carré : texte à gauche, produit à droite ; formats hauts : texte en haut, produit en bas, en grand.
      const side = land || k.cls === "square";
      const txtW = side ? inner.w * (land ? 0.48 : 0.52) : inner.w;
      const s0 = col(k, { x: inner.x, y: inner.y, w: txtW, h: side ? inner.h : inner.h * 0.48 }, { valign: side ? "middle" : "top", title: tsize(k, 0.06, 0.05, 0.06, 0.066), upper: true, eyebrow: true, sub: true, ctaStyle: "pill", onDark: true, maxLines: 4, gap: k.U * 0.022 });
      const px = side ? inner.x + txtW + k.U * 0.02 : inner.x, pw = side ? inner.x + inner.w - px : inner.w;
      const top = side ? inner.y + inner.h * 0.06 : s0.y + s0.h + k.U * 0.05;
      const py = inner.y + inner.h - k.U * 0.06;
      podium(k, px + pw / 2, py, pw * (side ? 0.86 : 0.7), mix(k.c.accent, k.c.dark, 0.45), mix(k.c.accent, "#FFFFFF", 0.4));
      hero(k, { x: px + pw * (side ? 0.12 : 0.15), y: top, w: pw * (side ? 0.76 : 0.7), h: py - top }, { align: "bottom" });
      // Pastille ronde : un mot court confirmé (surtitre ou premier atout), jamais un prix ou une remise inventés.
      const word = k.shortWord(14);
      if (word) {
        const r = k.U * 0.075;
        const by = side ? inner.y + inner.h * 0.12 : top;
        k.ellipse({ x: px + pw - r * 2, y: by, w: r * 2, h: r * 2 }, "#FFFFFF", { shadow: soft(k, 0.2), name: "Pastille" });
        k.text("body", word, { x: px + pw - r * 2 + r * 0.15, y: by + r - k.U * 0.018, w: r * 1.7 }, { size: Math.max(22, k.U * 0.024), weight: 700, align: "center", color: mix(k.c.bg, "#000000", 0.2), maxLines: 2, upper: true }, "badge", "Pastille");
      }
    },
  },
];
