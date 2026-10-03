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
const PAL_LABEL: Record<string, string> = { primary: "Principale", secondary: "Secondaire", accent: "Accent", light: "Clair", dark: "Sombre" };

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
  const para = (ctx: SKRSContext2D, s: string, x: number, y: number, maxW: number, size = 26, color = ink, lh = 1.5, weight = 400) => {
    ctx.font = font(BF, weight, size);
    ctx.fillStyle = color;
    ctx.textAlign = "left";
    let yy = y;
    for (const l of wrap(ctx, s, maxW)) {
      ctx.fillText(l, x, yy);
      yy += size * lh;
    }
    return yy;
  };
  const head = (ctx: SKRSContext2D, n: number, kicker: string, title: string, color = ink) => {
    text(ctx, `${String(n).padStart(2, "0")} — ${kicker.toLocaleUpperCase("fr-FR")}`, M, M + 10, font(BF, 600, 20), accent);
    text(ctx, title, M, M + 96, font(HF, 600, 72), color);
    // Pied de planche
    text(ctx, b.name, M, H - 60, font(BF, 500, 18), mix(color, paper, 0.45));
    text(ctx, `Charte de marque · ${n} / ${total}`, W - M, H - 60, font(BF, 500, 18), mix(color, paper, 0.45), "right");
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
  const label = (ctx: SKRSContext2D, s: string, x: number, y: number, color = mix(ink, paper, 0.4)) => text(ctx, s.toLocaleUpperCase("fr-FR"), x, y, font(BF, 600, 17), color);

  // 1 · Couverture
  {
    const ctx = page(paper);
    const bands = [pal.primary, pal.secondary, pal.accent, pal.light, pal.dark];
    bands.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect((W / bands.length) * i, H - 46, W / bands.length + 1, 46);
    });
    contain(ctx, inp.logo, W / 2 - 430, 300, 860, 400);
    if (b.tagline && b.logo.proposal !== "embleme") text(ctx, b.tagline, W / 2, 800, font(HF, 500, 44, true), ink, "center");
    text(ctx, "CHARTE DE MARQUE", W / 2, 940, font(BF, 600, 24), accent, "center");
    text(ctx, `${inp.sectorLabel} · ${inp.date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`, W / 2, 985, font(BF, 400, 22), mix(ink, paper, 0.4), "center");
  }

  // 2 · Identité
  {
    const ctx = page();
    head(ctx, 2, "Identité", "Qui nous sommes");
    const col = (W - M * 2 - 60) / 2;
    let y = 330;
    label(ctx, "Positionnement", M, y);
    y = para(ctx, b.positioning || "[À définir]", M, y + 44, col, 28);
    y += 30;
    label(ctx, "Cible", M, y);
    para(ctx, b.audience || "[À définir]", M, y + 44, col, 28);
    let y2 = 330;
    const x2 = M + col + 60;
    label(ctx, "Personnalité", x2, y2);
    y2 = para(ctx, b.personality.length ? b.personality.join(" · ") : "[À définir avec vous]", x2, y2 + 44, col, 28);
    y2 += 30;
    label(ctx, "Histoire", x2, y2);
    y2 = para(ctx, b.story || "[À écrire à partir de faits réels : origine, fabrication, fondateurs]", x2, y2 + 44, col, 26);
    if (b.values.length) {
      y2 += 30;
      label(ctx, "Valeurs", x2, y2);
      para(ctx, b.values.map((v) => `${v.title} — ${v.text}`).join("\n"), x2, y2 + 44, col, 24);
    }
  }

  // 3 · Logo et déclinaisons
  {
    const ctx = page();
    head(ctx, 3, "Logo", "Le logo et ses versions");
    para(ctx, b.logo.concept, M, 300, W - M * 2, 26, mix(ink, paper, 0.25));
    const cw = (W - M * 2 - 40) / 2;
    card(ctx, M, 380, cw, 440, "#FFFFFF", mix(ink, paper, 0.85));
    contain(ctx, inp.logo, M + 60, 430, cw - 120, 340);
    label(ctx, "Version principale", M, 860);
    card(ctx, M + cw + 40, 380, cw, 440, ink);
    contain(ctx, inp.logoLight, M + cw + 100, 430, cw - 120, 340);
    label(ctx, "Version claire (fonds sombres)", M + cw + 40, 860);
    const sw = (W - M * 2 - 80) / 3;
    const minis: [Image | Canvas | null, string, string][] = [[inp.logoWeb, "Version horizontale (site, en-tête)", "#FFFFFF"], [inp.mark, "Marque réduite (réseaux, favicon)", "#FFFFFF"], [tint(inp.mark, onColor(accent)), "Marque réduite sur couleur", accent]];
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
    head(ctx, 4, "Logo", "Respiration et taille minimale");
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
    label(ctx, "Zone de protection", tx, 440);
    para(ctx, "Aucun texte, aucune image ni aucun bord ne pénètre dans le cadre pointillé. Sa marge « x » vaut le quart de la plus petite dimension du logo.", tx, 484, 560, 26);
    label(ctx, "Taille minimale", tx, 720);
    para(ctx, "Imprimé : 25 mm de large.\nÉcran : 120 px de large.\nEn dessous, utilisez la marque réduite.", tx, 764, 560, 26);
  }

  // 5 · Usages à éviter
  {
    const ctx = page();
    head(ctx, 5, "Logo", "Usages à éviter");
    const items = ["Déformer les proportions", "Changer les couleurs", "Poser sur un fond chargé", "Incliner ou faire pivoter"];
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
    head(ctx, 6, "Couleurs", "La palette");
    const keys = ["primary", "secondary", "accent", "light", "dark"] as const;
    const cw = (W - M * 2 - 4 * 28) / 5;
    keys.forEach((k, i) => {
      const hex = pal[k];
      const x = M + i * (cw + 28), y = 320;
      card(ctx, x, y, cw, 360, hex, k === "light" ? mix(ink, paper, 0.8) : undefined);
      const on = onColor(hex);
      text(ctx, PAL_LABEL[k], x + 26, y + 56, font(BF, 600, 26), on);
      text(ctx, hex.toUpperCase(), x + 26, y + 320, font(BF, 500, 24), on);
      const [r, g, bb] = hexToRgb(hex);
      label(ctx, "RVB", x, y + 410);
      text(ctx, `${r} · ${g} · ${bb}`, x, y + 444, font(BF, 500, 22));
      label(ctx, "CMJN (indicatif)", x, y + 490);
      text(ctx, cmyk(hex), x, y + 524, font(BF, 500, 22));
      label(ctx, "Contraste", x, y + 570);
      const cw1 = contrast(hex, "#FFFFFF"), cw2 = contrast(hex, ink);
      text(ctx, `blanc ${cw1.toFixed(1)} ${cw1 >= 4.5 ? "AA" : cw1 >= 3 ? "AA gros" : "—"}`, x, y + 604, font(BF, 500, 20));
      text(ctx, `sombre ${cw2.toFixed(1)} ${cw2 >= 4.5 ? "AA" : cw2 >= 3 ? "AA gros" : "—"}`, x, y + 636, font(BF, 500, 20));
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
    label(ctx, "Proportions conseillées : 60 % clair · 30 % principale · 10 % accent", M, y + 90);
  }

  // 7 · Typographies
  {
    const ctx = page();
    head(ctx, 7, "Typographies", "Deux familles, des rôles clairs");
    const cw = (W - M * 2 - 80) / 2;
    label(ctx, `Titres — ${HF}`, M, 330);
    text(ctx, "Aa", M, 560, font(HF, 600, 220));
    para(ctx, "ABCDEFGHIJKLMNOPQRSTUVWXYZ\nabcdefghijklmnopqrstuvwxyz\n0123456789 € & ! ?", M, 640, cw, 30, ink, 1.45);
    text(ctx, b.tagline || b.name, M, 900, font(HF, 600, 54));
    const x2 = M + cw + 80;
    label(ctx, `Texte — ${BF}`, x2, 330);
    text(ctx, "Aa", x2, 560, font(BF, 500, 220));
    para(ctx, "ABCDEFGHIJKLMNOPQRSTUVWXYZ\nabcdefghijklmnopqrstuvwxyz\n0123456789 € & ! ?", x2, 640, cw, 30, ink, 1.45);
    para(ctx, b.positioning && !b.positioning.startsWith("[") ? b.positioning : "Le texte courant reste sobre et lisible : 16 px minimum à l'écran, interlignage généreux, une seule idée par paragraphe.", x2, 880, cw, 24, mix(ink, paper, 0.2));
    label(ctx, "Hiérarchie : titre 1 · titre 2 · texte · légende — jamais plus de deux familles", M, 1080);
  }

  // 8 · Ton de voix
  {
    const ctx = page();
    head(ctx, 8, "Ton", "Notre façon de parler");
    label(ctx, "Voix", M, 330);
    para(ctx, b.tone.voice, M, 380, W - M * 2, 34, ink, 1.4, 500);
    const cw = (W - M * 2 - 60) / 2;
    card(ctx, M, 460, cw, 330, mix(paper, "#FFFFFF", 0.6));
    label(ctx, "À faire", M + 36, 510, "#1F7A4D");
    para(ctx, b.tone.do.map((x) => `✓  ${x}`).join("\n"), M + 36, 560, cw - 72, 26);
    card(ctx, M + cw + 60, 460, cw, 330, mix(paper, "#FFFFFF", 0.6));
    label(ctx, "À éviter", M + cw + 96, 510, "#B42318");
    para(ctx, b.tone.dont.map((x) => `✕  ${x}`).join("\n"), M + cw + 96, 560, cw - 72, 26);
    label(ctx, "Signature et pistes", M, 860);
    const lines = [b.tagline, ...(b.taglineAlternatives ?? [])].filter(Boolean).slice(0, 4);
    para(ctx, lines.map((l, i) => (i === 0 ? `« ${l} »  (retenue)` : `« ${l} »`)).join("\n"), M, 910, cw, 28);
    if (inp.strategy?.keyMessages.length) {
      label(ctx, "Messages clés", M + cw + 60, 860);
      para(ctx, inp.strategy.keyMessages.slice(0, 4).map((m) => `— ${m}`).join("\n"), M + cw + 60, 910, cw, 24);
    }
  }

  // 9 · Applications : papeterie et numérique
  {
    const ctx = page();
    head(ctx, 9, "Applications", "Papeterie et numérique");
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
    text(ctx, "Prénom Nom", M + 70 + 40, 960, font(HF, 600, 32), onColor(accent));
    text(ctx, "contact@votre-domaine.fr", M + 70 + 40, 1000, font(BF, 400, 22), onColor(accent));
    label(ctx, "Carte de visite", M, 315);
    // Avatar réseaux
    const ax = M + 760;
    label(ctx, "Avatar réseaux sociaux", ax, 315);
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.arc(ax + 130, 470, 130, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 6;
    ctx.stroke();
    contain(ctx, inp.mark, ax + 50, 390, 160, 160);
    // En-tête e-mail
    label(ctx, "En-tête d'e-mail", ax, 690);
    shadow(() => card(ctx, ax, 710, 780, 380, "#FFFFFF"));
    ctx.fillStyle = paper;
    ctx.fillRect(ax + 20, 730, 740, 110);
    contain(ctx, inp.logoWeb ?? inp.logo, ax + 220, 745, 340, 80);
    para(ctx, `Bonjour,\nMerci pour votre commande chez ${b.name}.`, ax + 50, 900, 680, 24, ink);
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.roundRect(ax + 50, 990, 260, 60, 30);
    ctx.fill();
    text(ctx, "Suivre ma commande", ax + 180, 1029, font(BF, 600, 20), onColor(accent), "center");
  }

  // 10 · Applications : produit et emballage
  {
    const ctx = page();
    head(ctx, 10, "Applications", "Étiquette, sac et réseaux");
    // Étiquette ronde
    label(ctx, "Étiquette / sticker", M, 315);
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
    label(ctx, "Sac", sx, 315);
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
    label(ctx, "Publication 1:1", px, 315);
    const ps = 450;
    card(ctx, px, 340, ps, ps, pal.secondary);
    contain(ctx, inp.product, px + 60, 380, ps - 120, ps - 160);
    ctx.fillStyle = ink;
    ctx.fillRect(px, 340 + ps - 90, ps, 90);
    text(ctx, b.tagline || b.name, px + ps / 2, 340 + ps - 34, font(HF, 600, 30), onColor(ink), "center");
    para(ctx, "Les visuels du studio reprennent ces règles automatiquement : couleurs, typographies, marges et logo.", px, 880, ps, 22, mix(ink, paper, 0.3));
  }

  const pages = canvases.map((c) => c.toBuffer("image/jpeg", 88));
  const pdf = jpegPagesToPdf(pages.map((jpeg) => ({ jpeg, width: W, height: H })), 842, 595, `Charte de marque — ${b.name}`);
  return { pages, pdf };
}
