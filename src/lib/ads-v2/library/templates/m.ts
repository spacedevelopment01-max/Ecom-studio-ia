/**
 * Bibliothèque de modèles — lot M (« éditorial »), d'après la planche de référence SONORE du propriétaire : la photo
 * publicitaire entière en plein cadre porte la création ; par-dessus, une typographie d'éditeur (grand titre, ligne en
 * petites capitales espacées), un bouton pilule, et selon le modèle une rangée ou une liste d'atouts à pictogrammes au
 * trait, une carte d'atouts flottante, une phrase manuscrite, ou presque rien (bouton dans le coin). Le texte se place
 * du côté calme de la photo et son encre suit le ton réel de l'image (claire sur sombre, sombre sur clair).
 * Rien d'inventé : atouts = faits confirmés du projet ; phrase manuscrite = signature de la marque.
 */
import { featureIcon } from "../../feature-icons";
import { rgba, type Box, type Kit } from "../kit";
import type { Template } from "../types";

const SCRIPT = "Nothing You Could Do";

/** Encre et voile selon le ton mesuré sous une zone de la photo. */
function inkFor(k: Kit, b: Box): { ink: string; soft: string; veil: string; tone: "dark" | "light" } {
  const tone = k.toneAt(b);
  return tone === "dark" ? { ink: "#FFFFFF", soft: "rgba(255,255,255,0.86)", veil: k.c.dark, tone } : { ink: k.c.dark, soft: rgba(k.c.dark, 0.8), veil: "#FFFFFF", tone };
}

/** Ligne en petites capitales espacées (« UN SON QUI VOUS SUIT PARTOUT »). Renvoie sa hauteur (0 sans texte). */
function caps(k: Kit, text: string | null | undefined, b: { x: number; y: number; w: number }, align: "left" | "center" | "right", color: string, scale = 1): number {
  // Le séparateur reste collé au mot qui le précède : une ligne ne commence jamais par « · ».
  const t = text?.trim().replace(/\s+([•·|])\s+/g, "\u00A0$1 ");
  if (!t) return 0;
  const size = Math.max(22, k.U * 0.022 * scale);
  return k.text("subtitle", t, b, { size, align, color, upper: true, spacing: Math.round(size * 0.2), weight: 500, maxLines: 2, minSize: 22, lineHeight: 1.35 }, "subline", "Ligne").h;
}

/**
 * Signature de la marque dans un coin : le logo (version claire sur fond sombre) s'il existe, sinon le nom en petites
 * capitales très espacées. `bottom` : posée sur la marge basse.
 */
function signature(k: Kit, b0: { x: number; y: number; w: number }, align: "left" | "center" | "right", color: string, bottom = false) {
  // Panneau photo : la signature reste sur l'aplat, au pied de la colonne de texte (jamais sur la photo).
  if (k.panel) {
    const f = k.free;
    const x = f.x + (f.x > 0 ? k.m.side * 0.8 : k.m.side);
    b0 = { x, y: b0.y, w: f.w - k.m.side * 1.8 };
    align = "left";
    bottom = true;
  }
  // Boîte étroite dans son coin : la signature ne recouvre jamais le bouton ni le titre.
  const w = Math.min(b0.w, k.W * 0.3);
  // Posée en bas : sa hauteur est connue d'avance, la version du logo (claire ou sombre) est choisie à sa vraie place.
  const y = bottom ? k.H - k.m.bottom - (k.i.logo ? k.logoHeight(0.5) : Math.max(22, k.U * 0.024) * 1.3) : b0.y;
  const b = { x: align === "right" ? b0.x + b0.w - w : align === "center" ? b0.x + (b0.w - w) / 2 : b0.x, y, w };
  const l = k.i.logo
    ? k.brandMark(b, { align, height: k.logoHeight(0.5) })
    : k.text("body", k.i.brand, b, { family: k.i.art.heading, size: Math.max(22, k.U * 0.024), align, color, upper: true, spacing: Math.round(Math.max(22, k.U * 0.024) * 0.38), weight: 600, maxLines: 1, minSize: 22 }, "brand", "Marque");
  if (bottom) l.y = k.H - k.m.bottom - l.h;
  return l;
}

/** Bouton pilule (couleur de la marque sur fond clair, blanc sur fond sombre). */
function pill(k: Kit, x: number, y: number, maxW: number, align: "left" | "center" | "right", tone: "dark" | "light") {
  const size = Math.max(24, k.U * k.pick(0.032, 0.03, 0.03, 0.034));
  return k.button(x, y, { maxW, align, style: "pill", size, arrow: false, fill: tone === "dark" ? "#FFFFFF" : k.i.palette.primary, shadow: tone === "dark" });
}

const titleSize = (k: Kit, f = 1) => k.U * k.pick(0.088, 0.092, 0.096, 0.1) * f;
const btnH = (k: Kit) => Math.round(Math.max(24, k.U * k.pick(0.032, 0.03, 0.03, 0.034)) * 2.5);

/** Rangée de pictogrammes (2 ou 3 atouts) : icône au-dessus, libellé dessous. Renvoie la hauteur. */
function iconRow(k: Kit, b: { x: number; y: number; w: number }, feats: string[], color: string): number {
  const n = feats.length;
  const cw = b.w / n;
  const d = Math.max(30, k.U * k.pick(0.05, 0.055, 0.055, 0.06));
  const s = Math.max(22, k.U * 0.02);
  let h = 0;
  feats.forEach((f, i) => {
    const ic = featureIcon(f, i);
    const cx = b.x + cw * i + cw / 2;
    if (ic) k.icon(ic.path, { x: cx - d / 2, y: b.y, w: d, h: d }, color, Math.max(2, Math.round(d * 0.06)));
    const t = k.text("body", f, { x: b.x + cw * i + cw * 0.05, y: b.y + d + s * 0.5, w: cw * 0.9 }, { size: s, align: "center", color, weight: 500, maxLines: 2, minSize: 22, lineHeight: 1.15 }, undefined, "Atout");
    h = Math.max(h, d + s * 0.5 + t.h);
  });
  return h;
}

/** Liste d'atouts : pictogramme à gauche, libellé à droite. Renvoie la hauteur. */
function iconList(k: Kit, b: { x: number; y: number; w: number }, feats: string[], color: string, scale = 1): number {
  const d = Math.max(28, k.U * 0.046 * scale);
  const s = Math.max(22, k.U * 0.024 * scale);
  let y = b.y;
  feats.forEach((f, i) => {
    const ic = featureIcon(f, i);
    if (ic) k.icon(ic.path, { x: b.x, y, w: d, h: d }, color, Math.max(2, Math.round(d * 0.065)));
    const t = k.text("body", f, { x: b.x + d * 1.5, y: y + d / 2 - s * 0.62, w: b.w - d * 1.5 }, { size: s, align: "left", color, weight: 500, maxLines: 2, minSize: 22, lineHeight: 1.15 }, undefined, "Atout");
    y += Math.max(d, t.h) + d * 0.5;
  });
  return y - b.y - d * 0.5;
}

/** Colonne de texte du côté calme de la photo. */
function column(k: Kit, share: number): Box & { align: "left" | "right" } {
  const side = k.calmSide();
  // Panneau photo : la colonne remplit l'aplat, à distance de la photo.
  if (k.panel) {
    const f = k.free;
    const x = f.x + (f.x > 0 ? k.m.side * 0.8 : k.m.side);
    return { x, y: k.m.top, w: f.w - k.m.side * 1.8, h: k.H - k.m.top - k.m.bottom, align: "left" };
  }
  const w = k.wide ? k.W * share : k.W - k.m.side * 2;
  const x = !k.wide ? k.m.side : side === "left" ? k.m.side : k.W - k.m.side - w;
  return { x, y: k.m.top, w, h: k.H - k.m.top - k.m.bottom, align: k.wide && side === "right" ? "left" : "left" };
}

/** Voile doux sous la colonne de texte (du bord vers l'intérieur), pour une lecture nette sans masquer la photo. */
function sideVeil(k: Kit, col: Box, color: string, alpha: number) {
  if (k.wide) {
    const left = col.x + col.w / 2 < k.W / 2;
    k.veil({ x: left ? 0 : k.W * 0.35, y: 0, w: k.W * 0.65, h: k.H }, left ? 0 : 180, color, alpha);
  } else k.veil({ x: 0, y: 0, w: k.W, h: k.H * 0.52 }, 90, color, alpha);
}

export const TEMPLATES_M: Template[] = [
  {
    id: "editorial-corner",
    name: ["Éditorial : titre en tête, bouton pilule", "Editorial: headline on top, pill button"],
    family: "photo",
    photo: "required",
    schemes: ["light", "dark"],
    treatments: ["natural", "warm", "cool", "punch"],
    build(k) {
      k.fill(k.c.bg);
      k.fullPhoto({ panel: true });
      const col = column(k, 0.5);
      const probe = { x: col.x, y: col.y, w: col.w, h: k.H * 0.4 };
      const t0 = inkFor(k, probe);
      // Voile posé après la mesure du texte (glissé dessous) : il s'arrête sous le titre au lieu de laver la photo.
      const veilAt = k.layers.length;
      const { ink, soft, tone } = t0;
      let y = col.y;
      // Formats hauts : la signature en tête, dans la zone calme du texte (en bas, elle tomberait sur la photo).
      if (!k.wide) {
        const sg = signature(k, { x: col.x, y, w: col.w }, "left", ink);
        y += sg.h + k.U * 0.035;
      }
      const t = k.title({ x: col.x, y, w: col.w }, { size: titleSize(k), color: ink, maxLines: 3, lineHeight: 1.0 });
      y += t.h + k.U * 0.025;
      y += caps(k, k.i.subline, { x: col.x, y, w: col.w * 0.9 }, "left", soft);
      const alpha = t0.tone === "dark" ? 0.6 : 0.62;
      if (k.wide) sideVeil(k, col, t0.veil, alpha);
      else k.veil({ x: 0, y: 0, w: k.W, h: Math.min(k.H * 0.6, y + k.U * 0.14) }, 90, t0.veil, alpha);
      k.layers.splice(veilAt, 0, k.layers.pop()!);
      // Bouton : sous le texte, ou en bas de la colonne — la place qui cache le moins le produit de la photo.
      const bh = btnH(k);
      const under = y + k.U * 0.05;
      const low = k.H - k.m.bottom - bh;
      const bw = Math.min(col.w, k.W * 0.42);
      const at = (by: number) => k.subjectOverlap({ x: col.x, y: by, w: bw, h: bh });
      // Formats larges : en bas de colonne comme la référence, sauf si le produit y est.
      // Panneau photo : bouton sous le texte, la signature tient le pied de la colonne.
      const by = k.panel ? under : k.wide && at(low) < 0.1 ? Math.max(under, low) : at(low) < at(under) - 0.05 ? low : under;
      pill(k, col.x, by, col.w, "left", by > under + 1 ? k.toneAt({ x: col.x, y: by, w: bw, h: bh }) : tone);
      // Formats larges : signature dans le coin bas opposé au texte (jamais contre le titre).
      if (k.wide) signature(k, { x: k.m.side, y: 0, w: k.W - k.m.side * 2 }, col.x + col.w / 2 < k.W / 2 ? "right" : "left", ink, true);
    },
  },
  {
    id: "icon-row",
    name: ["Titre et rangée d'atouts à pictogrammes", "Headline and icon feature row"],
    family: "photo",
    photo: "required",
    schemes: ["dark", "light"],
    treatments: ["natural", "moody", "cool", "punch"],
    build(k) {
      k.fill(k.c.dark);
      k.fullPhoto();
      const col = column(k, 0.5);
      const top = { x: col.x, y: col.y, w: col.w, h: k.H * 0.45 };
      const t0 = inkFor(k, top);
      sideVeil(k, col, t0.veil, 0.7);
      k.veil({ x: 0, y: k.H * 0.62, w: k.W, h: k.H * 0.38 }, 270, t0.veil, 0.78);
      const { ink, soft, tone } = inkFor(k, top);
      let y = col.y;
      const t = k.title({ x: col.x, y, w: col.w }, { size: titleSize(k, 0.95), color: ink, maxLines: 3, lineHeight: 1.0 });
      y += t.h + k.U * 0.022;
      y += caps(k, k.i.subline, { x: col.x, y, w: col.w * 0.9 }, "left", soft) + k.U * 0.04;
      const b = pill(k, col.x, y, col.w, "left", tone);
      y += b.h;
      if (k.wide) signature(k, { x: k.m.side, y: k.m.top, w: k.W - k.m.side * 2 }, col.x + col.w / 2 < k.W / 2 ? "right" : "left", ink);
      // Rangée d'atouts au pied (2 ou 3 atouts confirmés) ; sans atouts, la création reste épurée.
      const feats = k.features(3);
      if (feats.length >= 2) {
        const rowW = k.wide ? Math.min(k.W * 0.62, k.W - k.m.side * 2) : k.W - k.m.side * 2;
        const start = k.layers.length;
        const h = iconRow(k, { x: k.m.side, y: 0, w: rowW }, feats, ink);
        const ry = k.H - k.m.bottom - h;
        if (ry > y + k.U * 0.04) k.layers.slice(start).forEach((l) => (l.y += ry));
        else k.layers.splice(start);
      }
    },
  },
  {
    id: "feature-card",
    name: ["Carte d'atouts flottante", "Floating feature card"],
    family: "photo",
    photo: "required",
    schemes: ["light", "dark"],
    treatments: ["natural", "warm", "punch", "cool"],
    build(k) {
      k.fill(k.c.bg);
      k.fullPhoto();
      const feats = k.features(3);
      const w = k.wide ? k.W * 0.46 : k.W - k.m.side * 2;
      const col = { x: k.m.side, y: k.m.top, w };
      const probe = { x: col.x, y: col.y, w, h: k.H * 0.38 };
      const t0 = inkFor(k, probe);
      k.veil({ x: 0, y: 0, w: k.wide ? k.W * 0.62 : k.W, h: k.wide ? k.H : k.H * 0.5 }, k.wide ? 0 : 90, t0.veil, 0.6);
      const { ink, soft, tone } = inkFor(k, probe);
      let y = col.y;
      const t = k.title({ ...col, y }, { size: titleSize(k, 0.92), color: ink, maxLines: 3, lineHeight: 1.0 });
      y += t.h + k.U * 0.022;
      y += caps(k, k.i.subline, { ...col, y, w: w * 0.9 }, "left", soft);
      pill(k, col.x, k.H - k.m.bottom - btnH(k), w, "left", tone);
      signature(k, { x: k.m.side, y: k.H - k.m.bottom - k.U * 0.06, w: k.W - k.m.side * 2 }, "right", ink, true);
      // Carte blanche aux coins arrondis, ombre douce : liste d'atouts à pictogrammes (encre de la marque).
      if (feats.length >= 2) {
        const cw = k.wide ? k.W * 0.27 : k.W * 0.5;
        const pad = k.U * 0.035;
        const start = k.layers.length;
        const card = k.rect({ x: 0, y: 0, w: cw, h: 10 }, rgba("#FFFFFF", 0.94), { radius: Math.round(k.U * 0.025), shadow: { color: "rgba(0,0,0,0.16)", blur: Math.round(k.U * 0.04), x: 0, y: Math.round(k.U * 0.012) }, name: "Carte" });
        const h = iconList(k, { x: pad, y: pad, w: cw - pad * 2 }, feats, k.c.dark, 0.82);
        card.h = h + pad * 2;
        // Place de la carte : celle qui cache le moins le produit de la photo, dans les marges, sous le titre et
        // au-dessus du bouton ; aucune place libre → pas de carte (le produit reste entier).
        const top = y + k.U * 0.06;
        const bottom = k.H - k.m.bottom - btnH(k) - k.U * 0.03 - card.h;
        const xs = [k.W - k.m.side - cw, k.m.side];
        const ys = k.wide ? [(k.H - card.h) / 2, top, bottom] : [top, (top + bottom) / 2, bottom];
        const spots = xs.flatMap((x) => ys.filter((yy) => yy >= top - 1 && yy <= bottom + 1).map((yy) => ({ x, y: yy, o: k.subjectOverlap({ x, y: yy, w: cw, h: card.h }) })));
        // Le texte occupe la gauche en haut dans les formats larges : la carte n'y va pas.
        const ok = spots.filter((p) => !(k.wide && p.x < k.W / 2)).sort((a, b) => a.o - b.o);
        const best = ok[0];
        if (best && best.o < 0.2) k.layers.slice(start).forEach((l) => ((l.x += best.x), (l.y += best.y)));
        else k.layers.splice(start);
      }
    },
  },
  {
    id: "script-accent",
    name: ["Titre et phrase manuscrite", "Headline and handwritten line"],
    family: "photo",
    photo: "required",
    schemes: ["light", "dark"],
    treatments: ["natural", "warm", "punch", "cool"],
    build(k) {
      k.fill(k.c.bg);
      k.fullPhoto({ panel: true });
      const col = column(k, 0.46);
      const probe = { x: col.x, y: col.y, w: col.w, h: k.H * 0.45 };
      const t0 = inkFor(k, probe);
      sideVeil(k, col, t0.veil, 0.6);
      const { ink, soft, tone } = inkFor(k, probe);
      let y = col.y;
      // Formats hauts : la signature en tête, dans la zone calme du texte (en bas, elle tomberait sur la photo).
      if (!k.wide) y += signature(k, { x: col.x, y, w: col.w }, "left", ink).h + k.U * 0.035;
      const t = k.title({ x: col.x, y, w: col.w }, { size: titleSize(k), color: ink, maxLines: 3, lineHeight: 1.0 });
      y += t.h + k.U * 0.022;
      y += caps(k, k.i.subline, { x: col.x, y, w: col.w * 0.9 }, "left", soft) + k.U * 0.04;
      const b = pill(k, col.x, y, col.w, "left", tone);
      y += b.h;
      const leftCol = k.wide ? col.x + col.w / 2 < k.W / 2 : true;
      if (k.wide) signature(k, { x: k.m.side, y: k.m.top, w: k.W - k.m.side * 2 }, leftCol ? "right" : "left", ink);
      // Phrase manuscrite : la signature de la marque, si elle n'est pas déjà le titre (jamais un slogan inventé). Posée
      // sous le bouton ou en bas — la place qui ne recouvre pas le produit de la photo ; sinon pas de phrase.
      const sig = k.i.tagline?.trim();
      if (sig && sig.toLowerCase() !== k.i.headline.trim().toLowerCase() && sig.length <= 40) {
        const size = Math.max(30, k.U * k.pick(0.06, 0.062, 0.062, 0.068));
        // Panneau photo : la phrase reste dans la colonne, sur l'aplat.
        const w = k.panel ? col.w : k.W * (k.wide ? 0.42 : 0.7);
        const x = k.panel ? col.x : k.wide ? (leftCol ? k.W - k.m.side - w : k.m.side) : k.m.side;
        const hh = size * 2.4;
        const spots = [{ x: k.wide ? x : col.x, y: y + k.U * 0.05 }, { x, y: k.H - k.m.bottom - hh }]
          .filter((p) => p.y + hh <= k.H - k.m.bottom + 1)
          .map((p) => ({ ...p, o: k.subjectOverlap({ x: p.x, y: p.y, w, h: hh }) }))
          .sort((a, b) => a.o - b.o);
        const at = spots[0];
        if (at && at.o < 0.02) {
          const s2 = inkFor(k, { x: at.x, y: at.y, w, h: hh });
          const l = k.text("body", sig, { x: at.x, y: at.y, w }, { family: SCRIPT, size, align: k.wide ? "center" : "left", color: s2.ink, maxLines: 2, minSize: 24, lineHeight: 1.05 }, "script", "Phrase manuscrite");
          l.rotation = -6;
        }
      }
    },
  },
  {
    id: "corner-minimal",
    name: ["Gros plan, bouton dans le coin", "Close-up, corner button"],
    family: "photo",
    photo: "required",
    schemes: ["dark", "light"],
    treatments: ["natural", "moody", "punch", "cool"],
    build(k) {
      k.fill(k.c.dark);
      k.fullPhoto();
      const w = k.wide ? k.W * 0.6 : k.W - k.m.side * 2;
      const center = !k.wide;
      const x = center ? k.m.side : (k.W - w) / 2;
      const probe = { x, y: k.m.top, w, h: k.H * 0.3 };
      const t0 = inkFor(k, probe);
      k.veil({ x: 0, y: 0, w: k.W, h: k.H * 0.34 }, 90, t0.veil, 0.6);
      k.veil({ x: k.W * 0.45, y: k.H * 0.7, w: k.W * 0.55, h: k.H * 0.3 }, 270, t0.veil, 0.45);
      const { ink, soft, tone } = inkFor(k, probe);
      let y = k.m.top;
      const t = k.title({ x, y, w }, { size: titleSize(k, 0.82), color: ink, align: "center", maxLines: 2, lineHeight: 1.02 });
      y += t.h + k.U * 0.02;
      caps(k, k.i.subline, { x, y, w }, "center", soft, 0.95);
      pill(k, k.W - k.m.side, k.H - k.m.bottom - btnH(k), k.W * 0.4, "right", tone);
      signature(k, { x: k.m.side, y: 0, w: k.W * 0.45 }, "left", ink, true);
    },
  },
  {
    id: "crown-center",
    name: ["Titre centré en tête", "Centred crown headline"],
    family: "photo",
    photo: "required",
    schemes: ["light", "dark"],
    treatments: ["natural", "warm", "cool", "punch"],
    build(k) {
      k.fill(k.c.bg);
      k.fullPhoto();
      const w = Math.min(k.W - k.m.side * 2, k.W * k.pick(0.6, 0.84, 0.86, 0.86));
      const x = (k.W - w) / 2;
      const probe = { x, y: k.m.top, w, h: k.H * 0.36 };
      const t0 = inkFor(k, probe);
      k.veil({ x: 0, y: 0, w: k.W, h: k.H * (k.cls === "land" ? 0.62 : 0.46) }, 90, t0.veil, 0.62);
      const { ink, soft, tone } = inkFor(k, probe);
      let y = k.m.top;
      y += caps(k, k.i.eyebrow, { x, y, w }, "center", soft, 0.9);
      if (k.i.eyebrow) y += k.U * 0.018;
      const t = k.title({ x, y, w }, { size: titleSize(k, 0.9), color: ink, align: "center", maxLines: 2, lineHeight: 1.02 });
      y += t.h + k.U * 0.04;
      pill(k, k.W / 2, y, w, "center", tone);
      signature(k, { x: k.m.side, y: 0, w: k.W - k.m.side * 2 }, "center", ink, true);
    },
  },
];
