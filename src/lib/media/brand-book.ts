/**
 * Charte de marque mise en page (planches A4 paysage) : couverture, identité, logo et usages,
 * zone de protection, couleurs (HEX, RVB, CMJN, contrastes), typographies, ton, applications.
 * Chaque planche est dessinée par Skia ; l'ensemble est assemblé en PDF.
 */
import { createCanvas, type Canvas, type Image, type SKRSContext2D } from "@napi-rs/canvas";
import { contrast, hexToRgb, isDark, mix, onColor } from "../color";
import { font } from "./fonts";
import { jpegPagesToPdf } from "./pdf";
import type { Brand, Strategy } from "../project-types";
import { C, contentLang } from "../i18n-server";
import { intlLocale } from "../i18n";

export type BookInput = {
  brand: Brand;
  strategy: Strategy | null;
  headingFamily: string;
  bodyFamily: string;
  logo: Image | null; // logo principal (couleur)
  logoLight: Image | null; // version claire
  logoWeb: Image | null; // version horizontale (site), sinon le logo principal
  mark: Image | null; // marque réduite
  product: Image | null; // produit détouré (applications)
  sectorLabel: string;
  date: Date;
};

const W = 1754, H = 1240, M = 110;
const PAL_LABEL: Record<string, { fr: string; en: string }> = {
  primary: { fr: "Principale", en: "Primary" },
  secondary: { fr: "Secondaire", en: "Secondary" },
  accent: { fr: "Accent", en: "Accent" },
  light: { fr: "Clair", en: "Light" },
  dark: { fr: "Sombre", en: "Dark" },
};

function wrap(ctx: SKRSContext2D, text: string, maxW: number): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const w of para.split(/\s+/)) {
      const t = line ? `${line} ${w}` : w;
      if (ctx.measureText(t).width > maxW && line) {
        out.push(line);
        line = w;
      } else line = t;
    }
    out.push(line);
  }
  return out;
}

function contain(ctx: SKRSContext2D, img: Image | Canvas | null, x: number, y: number, w: number, h: number) {
  if (!img) return;
  const s = Math.min(w / img.width, h / img.height);
  const dw = img.width * s, dh = img.height * s;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

/** Logo recoloré d'une seule teinte (version blanche sur fond de couleur, exemples d'usage). */
function tint(img: Image | null, color: string): Canvas | null {
  if (!img) return null;
  const c = createCanvas(img.width, img.height);
  const x = c.getContext("2d");
  x.drawImage(img, 0, 0);
  x.globalCompositeOperation = "source-in";
  x.fillStyle = color;
  x.fillRect(0, 0, img.width, img.height);
  return c;
}

function cmyk(hex: string) {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const k = 1 - Math.max(r, g, b);
  if (k >= 1) return "0 · 0 · 0 · 100";
  const f = (v: number) => Math.round(((1 - v - k) / (1 - k)) * 100);
  return `${f(r)} · ${f(g)} · ${f(b)} · ${Math.round(k * 100)}`;
}

export function renderBrandBook(inp: BookInput): { pages: Buffer[]; pdf: Buffer } {
  const b = inp.brand;
  const pal = b.palette;
  const ink = isDark(pal.dark) ? pal.dark : "#1A1714";
  const paper = isDark(pal.light) ? "#F7F4EF" : pal.light;
  const accent = pal.primary;
  const HF = inp.headingFamily, BF = inp.bodyFamily;
  const total = 10;
  const canvases: Canvas[] = [];
  // Langue des contenus : toute la charte (titres, explications, dates) suit la langue du projet.
  const locale = intlLocale(contentLang());
  const BOOK = C("Charte de marque", "Brand guidelines");

  const page = (bg = paper) => {
    const c = createCanvas(W, H);
    const ctx = c.getContext("2d");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    canvases.push(c);
    return ctx;
  };
  const text = (ctx: SKRSContext2D, s: string, x: number, y: number, f: string, color = ink, align: CanvasTextAlign = "left") => {
    ctx.font = f;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = "alphabetic";
    ctx.fillText(s, x, y);
  };
  // Paragraphe borné : au-delà de maxY (pied de planche par défaut), le texte s'arrête sur « … » au lieu de déborder.
  const para = (ctx: SKRSContext2D, s: string, x: number, y: number, maxW: number, size = 26, color = ink, lh = 1.5, weight = 400, maxY = H - 110) => {
    ctx.font = font(BF, weight, size);
    ctx.fillStyle = color;
    ctx.textAlign = "left";
    let yy = y;
    const lines = wrap(ctx, s, maxW);
    for (const [i, l] of lines.entries()) {
      const last = i < lines.length - 1 && yy + size * lh > maxY;
      let t = l;
      if (last) {
        while (t && ctx.measureText(`${t}…`).width > maxW) t = t.slice(0, -1);
        t = `${t.trimEnd()}…`;
      }
      ctx.fillText(t, x, yy);
      yy += size * lh;
      if (last) break;
    }
    return yy;
  };
  const head = (ctx: SKRSContext2D, n: number, kicker: string, title: string, color = ink) => {
    text(ctx, `${String(n).padStart(2, "0")} — ${kicker.toLocaleUpperCase(locale)}`, M, M + 10, font(BF, 600, 20), accent);
    text(ctx, title, M, M + 96, font(HF, 600, 72), color);
    // Pied de planche
    text(ctx, b.name, M, H - 60, font(BF, 500, 18), mix(color, paper, 0.45));
    text(ctx, `${BOOK} · ${n} / ${total}`, W - M, H - 60, font(BF, 500, 18), mix(color, paper, 0.45), "right");
  };
  const card = (ctx: SKRSContext2D, x: number, y: number, w: number, h: number, fill: string, stroke?: string) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 28);
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  };
  // Puces dessinées (coche verte, croix rouge) : les glyphes ✓ et ✕ manquent dans la plupart des polices de texte.
  const marks = (ctx: SKRSContext2D, items: string[], x: number, y: number, maxW: number, kind: "do" | "dont") => {
    let yy = y;
    for (const it of items.slice(0, 5)) {
      ctx.save();
      ctx.strokeStyle = kind === "do" ? "#1F7A4D" : "#B42318";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      if (kind === "do") {
        ctx.moveTo(x, yy - 9);
        ctx.lineTo(x + 7, yy - 2);
        ctx.lineTo(x + 20, yy - 17);
      } else {
        ctx.moveTo(x + 2, yy - 17);
        ctx.lineTo(x + 17, yy - 2);
        ctx.moveTo(x + 17, yy - 17);
        ctx.lineTo(x + 2, yy - 2);
      }
      ctx.stroke();
      ctx.restore();
      if (yy > 760) break;
      yy = para(ctx, it, x + 36, yy, maxW - 36, 26, ink, 1.5, 400, 770) + 6;
    }
  };
  const label = (ctx: SKRSContext2D, s: string, x: number, y: number, color = mix(ink, paper, 0.4)) => text(ctx, s.toLocaleUpperCase(locale), x, y, font(BF, 600, 17), color);

  // 1 · Couverture
  {
    const ctx = page(paper);
    const bands = [pal.primary, pal.secondary, pal.accent, pal.light, pal.dark];
    bands.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect((W / bands.length) * i, H - 46, W / bands.length + 1, 46);
    });
    // La couleur claire se confond avec le papier : un filet la rend visible.
    ctx.strokeStyle = mix(ink, paper, 0.82);
    ctx.lineWidth = 2;
    ctx.strokeRect((W / bands.length) * 3 + 1, H - 45, W / bands.length - 2, 44);
    contain(ctx, inp.logo, W / 2 - 430, 300, 860, 400);
    if (b.tagline && b.logo.proposal !== "embleme") text(ctx, b.tagline, W / 2, 800, font(HF, 500, 44, true), ink, "center");
    text(ctx, BOOK.toLocaleUpperCase(locale), W / 2, 940, font(BF, 600, 24), accent, "center");
    text(ctx, `${inp.sectorLabel} · ${inp.date.toLocaleDateString(locale, { month: "long", year: "numeric" })}`, W / 2, 985, font(BF, 400, 22), mix(ink, paper, 0.4), "center");
  }

  // 2 · Identité
  {
    const ctx = page();
    head(ctx, 2, C("Identité", "Identity"), C("Qui nous sommes", "Who we are"));
    const col = (W - M * 2 - 60) / 2;
    let y = 330;
    label(ctx, C("Positionnement", "Positioning"), M, y);
    y = para(ctx, b.positioning || C("[À définir]", "[To be defined]"), M, y + 44, col, 28, ink, 1.5, 400, 760);
    y += 30;
    label(ctx, C("Cible", "Audience"), M, y);
    para(ctx, b.audience || C("[À définir]", "[To be defined]"), M, y + 44, col, 28);
    let y2 = 330;
    const x2 = M + col + 60;
    label(ctx, C("Personnalité", "Personality"), x2, y2);
    y2 = para(ctx, b.personality.length ? b.personality.join(" · ") : C("[À définir avec vous]", "[To be defined with you]"), x2, y2 + 44, col, 28);
    y2 += 30;
    label(ctx, C("Histoire", "Story"), x2, y2);
    y2 = para(ctx, b.story || C("[À écrire à partir de faits réels : origine, fabrication, fondateurs]", "[To write from real facts: origin, how it's made, founders]"), x2, y2 + 44, col, 26);
    if (b.values.length) {
      y2 += 30;
      label(ctx, C("Valeurs", "Values"), x2, y2);
      para(ctx, b.values.map((v) => `${v.title}${C(" : ", ": ")}${v.text}`).join("\n"), x2, y2 + 44, col, 24);
    }
  }

  // 3 · Logo et déclinaisons
  {
    const ctx = page();
    head(ctx, 3, "Logo", C("Le logo et ses versions", "The logo and its versions"));
    para(ctx, b.logo.concept, M, 300, W - M * 2, 26, mix(ink, paper, 0.25), 1.5, 400, 345);
    const cw = (W - M * 2 - 40) / 2;
    card(ctx, M, 380, cw, 440, "#FFFFFF", mix(ink, paper, 0.85));
    contain(ctx, inp.logo, M + 60, 430, cw - 120, 340);
    label(ctx, C("Version principale", "Primary version"), M, 860);
    card(ctx, M + cw + 40, 380, cw, 440, ink);
    contain(ctx, inp.logoLight, M + cw + 100, 430, cw - 120, 340);
    label(ctx, C("Version claire (fonds sombres)", "Light version (dark backgrounds)"), M + cw + 40, 860);
    const sw = (W - M * 2 - 80) / 3;
    const minis: [Image | Canvas | null, string, string][] = [[inp.logoWeb, C("Version horizontale (site, en-tête)", "Horizontal version (website, header)"), "#FFFFFF"], [inp.mark, C("Marque réduite (réseaux, favicon)", "Brand mark (social, favicon)"), "#FFFFFF"], [tint(inp.mark, onColor(accent)), C("Marque réduite sur couleur", "Brand mark on color"), accent]];
    minis.forEach(([img, l, bg], i) => {
      const x = M + i * (sw + 40);
      card(ctx, x, 900, sw, 170, bg, bg === "#FFFFFF" ? mix(ink, paper, 0.85) : undefined);
      contain(ctx, img, x + 30, 920, sw - 60, 130);
      label(ctx, l, x, 1110);
    });
  }

  // 4 · Zone de protection et taille minimale
  {
    const ctx = page();
    head(ctx, 4, "Logo", C("Respiration et taille minimale", "Clear space and minimum size"));
    const lw = 760, lh = 340, lx = M + 60, ly = 420;
    if (inp.logo) {
      const s = Math.min(lw / inp.logo.width, lh / inp.logo.height);
      const dw = inp.logo.width * s, dh = inp.logo.height * s;
      const x = lx + (lw - dw) / 2, y = ly + (lh - dh) / 2;
      const pad = Math.min(dw, dh) * 0.25;
      card(ctx, x - pad - 40, y - pad - 40, dw + pad * 2 + 80, dh + pad * 2 + 80, "#FFFFFF");
      ctx.setLineDash([12, 10]);
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      ctx.strokeRect(x - pad, y - pad, dw + pad * 2, dh + pad * 2);
      ctx.setLineDash([]);
      ctx.drawImage(inp.logo, x, y, dw, dh);
      text(ctx, "x", x - pad / 2, y + dh / 2, font(HF, 600, 34, true), accent, "center");
      text(ctx, "x", x + dw + pad / 2, y + dh / 2, font(HF, 600, 34, true), accent, "center");
    }
    const tx = M + 980;
    label(ctx, C("Zone de protection", "Clear space"), tx, 440);
    para(ctx, C("Aucun texte, aucune image ni aucun bord ne pénètre dans le cadre pointillé. Sa marge « x » vaut le quart de la plus petite dimension du logo.", "No text, image or edge may enter the dotted frame. Its margin \"x\" equals a quarter of the logo's smallest dimension."), tx, 484, 560, 26);
    label(ctx, C("Taille minimale", "Minimum size"), tx, 720);
    para(ctx, C("Imprimé : 25 mm de large.\nÉcran : 120 px de large.\nEn dessous, utilisez la marque réduite.", "Print: 25 mm wide.\nScreen: 120 px wide.\nBelow that, use the brand mark."), tx, 764, 560, 26);
  }

  // 5 · Usages à éviter
  {
    const ctx = page();
    head(ctx, 5, "Logo", C("Usages à éviter", "What to avoid"));
    const items = C(["Déformer les proportions", "Changer les couleurs", "Poser sur un fond chargé", "Incliner ou faire pivoter"], ["Distorting the proportions", "Changing the colors", "Placing it on a busy background", "Tilting or rotating it"]);
    const cw = (W - M * 2 - 3 * 36) / 4;
    items.forEach((t, i) => {
      const x = M + i * (cw + 36), y = 380;
      card(ctx, x, y, cw, 420, "#FFFFFF", mix(ink, paper, 0.85));
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(x, y, cw, 420, 28);
      ctx.clip();
      if (i === 2) {
        for (let k = 0; k < 18; k++) {
          ctx.fillStyle = [pal.primary, pal.accent, pal.secondary, pal.dark][k % 4];
          ctx.beginPath();
          ctx.arc(x + ((k * 97) % cw), y + ((k * 61) % 420), 40 + (k % 5) * 12, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      if (inp.logo) {
        const s = Math.min((cw - 60) / inp.logo.width, 220 / inp.logo.height);
        const dw = inp.logo.width * s, dh = inp.logo.height * s;
        ctx.translate(x + cw / 2, y + 210);
        if (i === 0) ctx.scale(1.45, 0.7);
        if (i === 3) ctx.rotate(-0.28);
        ctx.drawImage(i === 1 ? tint(inp.logo, "#29C46E")! : inp.logo, -dw / 2, -dh / 2, dw, dh);
      }
      ctx.restore();
      // Croix
      ctx.strokeStyle = "#C2261F";
      ctx.lineWidth = 7;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x + cw - 70, y + 30);
      ctx.lineTo(x + cw - 30, y + 70);
      ctx.moveTo(x + cw - 30, y + 30);
      ctx.lineTo(x + cw - 70, y + 70);
      ctx.stroke();
      para(ctx, t, x, y + 470, cw, 26, ink, 1.4, 600);
    });
  }

  // 6 · Couleurs
  {
    const ctx = page();
    head(ctx, 6, C("Couleurs", "Colors"), C("La palette", "The palette"));
    const keys = ["primary", "secondary", "accent", "light", "dark"] as const;
    const cw = (W - M * 2 - 4 * 28) / 5;
    keys.forEach((k, i) => {
      const hex = pal[k];
      const x = M + i * (cw + 28), y = 320;
      card(ctx, x, y, cw, 360, hex, k === "light" ? mix(ink, paper, 0.8) : undefined);
      const on = onColor(hex);
      text(ctx, C(PAL_LABEL[k].fr, PAL_LABEL[k].en), x + 26, y + 56, font(BF, 600, 26), on);
      text(ctx, hex.toUpperCase(), x + 26, y + 320, font(BF, 500, 24), on);
      const [r, g, bb] = hexToRgb(hex);
      label(ctx, C("RVB", "RGB"), x, y + 410);
      text(ctx, `${r} · ${g} · ${bb}`, x, y + 444, font(BF, 500, 22));
      label(ctx, C("CMJN (indicatif)", "CMYK (approximate)"), x, y + 490);
      text(ctx, cmyk(hex), x, y + 524, font(BF, 500, 22));
      label(ctx, C("Contraste", "Contrast"), x, y + 570);
      const cw1 = contrast(hex, "#FFFFFF"), cw2 = contrast(hex, ink);
      text(ctx, `${C("blanc", "white")} ${cw1.toFixed(1)} ${cw1 >= 4.5 ? "AA" : cw1 >= 3 ? C("AA gros", "AA large") : "—"}`, x, y + 604, font(BF, 500, 20));
      text(ctx, `${C("sombre", "dark")} ${cw2.toFixed(1)} ${cw2 >= 4.5 ? "AA" : cw2 >= 3 ? C("AA gros", "AA large") : "—"}`, x, y + 636, font(BF, 500, 20));
    });
    // Proportions conseillées
    const y = 1020, bw = W - M * 2;
    const parts: [string, number][] = [[pal.light, 0.6], [pal.primary, 0.3], [pal.accent, 0.1]];
    let x = M;
    for (const [c, f] of parts) {
      ctx.fillStyle = c;
      ctx.fillRect(x, y, bw * f, 50);
      x += bw * f;
    }
    ctx.strokeStyle = mix(ink, paper, 0.8);
    ctx.strokeRect(M, y, bw, 50);
    label(ctx, C("Proportions conseillées : 60 % clair · 30 % principale · 10 % accent", "Recommended proportions: 60% light · 30% primary · 10% accent"), M, y + 90);
  }

  // 7 · Typographies
  {
    const ctx = page();
    head(ctx, 7, C("Typographies", "Typography"), C("Deux familles, des rôles clairs", "Two families, clear roles"));
    const cw = (W - M * 2 - 80) / 2;
    label(ctx, `${C("Titres", "Headings")} — ${HF}`, M, 330);
    text(ctx, "Aa", M, 560, font(HF, 600, 220));
    para(ctx, "ABCDEFGHIJKLMNOPQRSTUVWXYZ\nabcdefghijklmnopqrstuvwxyz\n0123456789 € & ! ?", M, 640, cw, 30, ink, 1.45);
    text(ctx, b.tagline || b.name, M, 900, font(HF, 600, 54));
    const x2 = M + cw + 80;
    label(ctx, `${C("Texte", "Body")} — ${BF}`, x2, 330);
    text(ctx, "Aa", x2, 560, font(BF, 500, 220));
    para(ctx, "ABCDEFGHIJKLMNOPQRSTUVWXYZ\nabcdefghijklmnopqrstuvwxyz\n0123456789 € & ! ?", x2, 640, cw, 30, ink, 1.45);
    para(ctx, b.positioning && !b.positioning.startsWith("[") ? b.positioning : C("Le texte courant reste sobre et lisible : 16 px minimum à l'écran, interlignage généreux, une seule idée par paragraphe.", "Body text stays simple and readable: 16 px minimum on screen, generous line spacing, one idea per paragraph."), x2, 880, cw, 24, mix(ink, paper, 0.2), 1.5, 400, 1040);
    label(ctx, C("Hiérarchie : titre 1 · titre 2 · texte · légende — jamais plus de deux familles", "Hierarchy: heading 1 · heading 2 · body · caption — never more than two families"), M, 1080);
  }

  // 8 · Ton de voix
  {
    const ctx = page();
    head(ctx, 8, C("Ton", "Tone"), C("Notre façon de parler", "How we speak"));
    label(ctx, C("Voix", "Voice"), M, 330);
    para(ctx, b.tone.voice, M, 380, W - M * 2, 34, ink, 1.4, 500, 400);
    const cw = (W - M * 2 - 60) / 2;
    card(ctx, M, 460, cw, 330, mix(paper, "#FFFFFF", 0.6));
    label(ctx, C("À faire", "Do"), M + 36, 510, "#1F7A4D");
    marks(ctx, b.tone.do, M + 36, 560, cw - 72, "do");
    card(ctx, M + cw + 60, 460, cw, 330, mix(paper, "#FFFFFF", 0.6));
    label(ctx, C("À éviter", "Don't"), M + cw + 96, 510, "#B42318");
    marks(ctx, b.tone.dont, M + cw + 96, 560, cw - 72, "dont");
    label(ctx, C("Signature et pistes", "Tagline and alternatives"), M, 860);
    const lines = [b.tagline, ...(b.taglineAlternatives ?? [])].filter(Boolean).slice(0, 4);
    para(ctx, lines.map((l, i) => (i === 0 ? C(`« ${l} »  (retenue)`, `"${l}"  (chosen)`) : C(`« ${l} »`, `"${l}"`))).join("\n"), M, 910, cw, 28);
    if (inp.strategy?.keyMessages.length) {
      label(ctx, C("Messages clés", "Key messages"), M + cw + 60, 860);
      para(ctx, inp.strategy.keyMessages.slice(0, 4).map((m) => `— ${m}`).join("\n"), M + cw + 60, 910, cw, 24);
    }
  }

  // 9 · Applications : papeterie et numérique
  {
    const ctx = page();
    head(ctx, 9, "Applications", C("Papeterie et numérique", "Stationery and digital"));
    // Carte de visite recto / verso (85 × 55 mm)
    const cw = 520, ch = 336;
    const shadow = (fn: () => void) => {
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,.18)";
      ctx.shadowBlur = 40;
      ctx.shadowOffsetY = 18;
      fn();
      ctx.restore();
    };
    shadow(() => card(ctx, M, 340, cw, ch, "#FFFFFF"));
    contain(ctx, inp.logoWeb ?? inp.logo, M + 60, 400, cw - 120, ch - 120);
    shadow(() => card(ctx, M + 70, 720, cw, ch, accent));
    contain(ctx, tint(inp.mark, onColor(accent)), M + 70 + 30, 760, 140, 140);
    text(ctx, C("Prénom Nom", "First Last"), M + 70 + 40, 960, font(HF, 600, 32), onColor(accent));
    text(ctx, C("contact@votre-domaine.fr", "contact@your-domain.com"), M + 70 + 40, 1000, font(BF, 400, 22), onColor(accent));
    label(ctx, C("Carte de visite", "Business card"), M, 315);
    // Avatar réseaux
    const ax = M + 760;
    label(ctx, C("Avatar réseaux sociaux", "Social media avatar"), ax, 315);
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.arc(ax + 130, 470, 130, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 6;
    ctx.stroke();
    contain(ctx, inp.mark, ax + 50, 390, 160, 160);
    // En-tête e-mail
    label(ctx, C("En-tête d'e-mail", "Email header"), ax, 690);
    shadow(() => card(ctx, ax, 710, 780, 380, "#FFFFFF"));
    ctx.fillStyle = paper;
    ctx.fillRect(ax + 20, 730, 740, 110);
    contain(ctx, inp.logoWeb ?? inp.logo, ax + 220, 745, 340, 80);
    para(ctx, C(`Bonjour,\nMerci pour votre commande chez ${b.name}.`, `Hello,\nThank you for your order from ${b.name}.`), ax + 50, 900, 680, 24, ink);
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.roundRect(ax + 50, 990, 260, 60, 30);
    ctx.fill();
    text(ctx, C("Suivre ma commande", "Track my order"), ax + 180, 1029, font(BF, 600, 20), onColor(accent), "center");
  }

  // 10 · Applications : produit et emballage
  {
    const ctx = page();
    head(ctx, 10, "Applications", C("Étiquette, sac et réseaux", "Label, bag and social"));
    // Étiquette ronde
    label(ctx, C("Étiquette / sticker", "Label / sticker"), M, 315);
    ctx.fillStyle = paper === pal.light ? "#FFFFFF" : paper;
    ctx.beginPath();
    ctx.arc(M + 220, 560, 220, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 6;
    ctx.stroke();
    contain(ctx, inp.logo, M + 60, 430, 320, 260);
    // Sac shopping
    const sx = M + 560;
    label(ctx, C("Sac", "Bag"), sx, 315);
    ctx.fillStyle = mix(pal.secondary, "#FFFFFF", 0.2);
    ctx.beginPath();
    ctx.moveTo(sx + 40, 420);
    ctx.lineTo(sx + 380, 420);
    ctx.lineTo(sx + 410, 1000);
    ctx.lineTo(sx + 10, 1000);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = ink;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(sx + 210, 420, 90, Math.PI, 0);
    ctx.stroke();
    contain(ctx, inp.logo, sx + 90, 600, 240, 220);
    // Publication 1:1
    const px = M + 1080;
    label(ctx, C("Publication 1:1", "1:1 post"), px, 315);
    const ps = 450;
    card(ctx, px, 340, ps, ps, pal.secondary);
    contain(ctx, inp.product, px + 60, 380, ps - 120, ps - 160);
    ctx.fillStyle = ink;
    ctx.fillRect(px, 340 + ps - 90, ps, 90);
    text(ctx, b.tagline || b.name, px + ps / 2, 340 + ps - 34, font(HF, 600, 30), onColor(ink), "center");
    para(ctx, C("Les visuels du studio reprennent ces règles automatiquement : couleurs, typographies, marges et logo.", "The studio's visuals apply these rules automatically: colors, typefaces, margins and logo."), px, 880, ps, 22, mix(ink, paper, 0.3));
  }

  const pages = canvases.map((c) => c.toBuffer("image/jpeg", 88));
  const pdf = jpegPagesToPdf(pages.map((jpeg) => ({ jpeg, width: W, height: H })), 842, 595, `${BOOK} — ${b.name}`);
  return { pages, pdf };
}
