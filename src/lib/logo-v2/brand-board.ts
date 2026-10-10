/**
 * Planche d'identité de marque (après le choix d'un logo) : le logo ORIGINAL en grand, ses déclinaisons fidèles
 * (fond sombre, noir seul, version simplifiée pour les petites tailles), les couleurs exactes (codes HEX), les
 * typographies de la marque et des applications (carte de visite recto verso, en-tête de site, avatar de réseau
 * social) sur fonds clair et sombre. Rendu local, sans IA.
 */
import sharp, { type OverlayOptions } from "sharp";
import { createCanvas } from "@napi-rs/canvas";
import { contrast } from "../color";
import { ensureFonts, font } from "../media/fonts";
import { L } from "../i18n-server";

export type BoardInput = {
  name: string;
  /** Logo principal (original), fond transparent. */
  logo: Buffer;
  /** Version pour fonds sombres. */
  light: Buffer;
  /** Noir seul. */
  mono: Buffer;
  /** Version simplifiée (favicon, tampon, broderie), carrée. */
  mark: Buffer;
  palette: Record<string, string>;
  fonts: { heading: string; body: string; headingWeight?: number };
  styleLabel?: string;
  svgNote?: string;
  /** La marque réduite est le symbole découpé dans le logo (sinon version simplifiée construite par le studio). */
  markIsSymbol?: boolean;
};

const W = 2400;
const H = 1720;

async function fit(img: Buffer, w: number, h: number) {
  return sharp(img).resize({ width: w, height: h, fit: "inside" }).png().toBuffer();
}

/** Panneau de couleur avec une image centrée. */
async function panel(w: number, h: number, bg: string, img: Buffer, pad = 60, radius = 18) {
  const inner = await fit(img, w - pad * 2, h - pad * 2);
  const shape = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${radius}" fill="${bg}"/></svg>`);
  return sharp(shape).composite([{ input: inner, gravity: "center" }]).png().toBuffer();
}

/** Calque de textes (vraies polices du studio). */
function textLayer(w: number, h: number, draw: (ctx: ReturnType<ReturnType<typeof createCanvas>["getContext"]>) => void) {
  ensureFonts();
  const c = createCanvas(w, h);
  draw(c.getContext("2d"));
  return c.encode("png").then((b) => Buffer.from(b));
}

export async function brandBoard(b: BoardInput): Promise<Buffer> {
  const dark = b.palette.dark && contrast(b.palette.dark, "#FFFFFF") >= 4 ? b.palette.dark : "#16161A";
  const primary = b.palette.primary ?? dark;
  const comps: OverlayOptions[] = [];
  // Titre.
  comps.push({
    input: await textLayer(W, 150, (ctx) => {
      ctx.fillStyle = "#16161A";
      ctx.font = font(b.fonts.heading, b.fonts.headingWeight ?? 700, 64);
      ctx.fillText(b.name, 70, 92);
      ctx.fillStyle = "#6B6B70";
      ctx.font = font(b.fonts.body, 400, 28);
      ctx.fillText(`${L("Identité visuelle", "Visual identity")}${b.styleLabel ? ` — ${b.styleLabel}` : ""}`, 72, 132);
    }),
    left: 0,
    top: 0,
  });
  // Logo original en grand + déclinaisons.
  comps.push({ input: await panel(1300, 780, "#FFFFFF", b.logo, 70), left: 70, top: 170 });
  comps.push({ input: await panel(890, 380, dark, b.light, 50), left: 1440, top: 170 });
  comps.push({ input: await panel(890, 380, "#FFFFFF", b.mono, 50), left: 1440, top: 570 });
  const label = async (text: string, left: number, top: number, color = "#6B6B70") =>
    comps.push({
      input: await textLayer(900, 40, (ctx) => {
        ctx.fillStyle = color;
        ctx.font = font(b.fonts.body, 500, 22);
        ctx.fillText(text, 0, 28);
      }),
      left,
      top,
    });
  await label(L("Logo original (livrable principal, PNG haute définition)", "Original logo (main deliverable, high-resolution PNG)"), 70, 958);
  await label(L("Sur fond sombre", "On dark background"), 1462, 180, "#BDBDC2");
  await label(L("Noir seul (impression une couleur)", "Black only (one-colour print)"), 1462, 580);
  // Version simplifiée aux petites tailles, sur clair et sombre.
  // Sur fond coloré ou sombre : la version simplifiée en blanc (sinon elle disparaît).
  const { data: md, info: mi } = await sharp(b.mark).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < md.length; i += 4) md[i] = md[i + 1] = md[i + 2] = 255;
  const markWhite = await sharp(md, { raw: { width: mi.width, height: mi.height, channels: 4 } }).png().toBuffer();
  const markTile = async (size: number, bg: string) => panel(size + 40, size + 40, bg, bg === "#FFFFFF" ? b.mark : markWhite, 20, 12);
  const row2 = 1010;
  const tiles = [
    { s: 160, bg: "#FFFFFF" },
    { s: 96, bg: "#FFFFFF" },
    { s: 48, bg: "#FFFFFF" },
    { s: 160, bg: primary },
    { s: 96, bg: dark },
    { s: 48, bg: dark },
  ];
  let x = 70;
  for (const t of tiles) {
    comps.push({ input: await markTile(t.s, t.bg), left: x, top: row2 + 20 + (200 - t.s) });
    x += t.s + 60;
  }
  await label(b.markIsSymbol ? L("Symbole seul, tiré du logo : favicon, avatar, tampon", "Symbol only, taken from the logo: favicon, avatar, stamp") : L("Version simplifiée : favicon, tampon, broderie", "Simplified version: favicon, stamp, embroidery"), 70, row2 + 250);
  // Couleurs exactes.
  const entries = Object.entries(b.palette).slice(0, 5);
  comps.push({
    input: await textLayer(1000, 300, (ctx) => {
      entries.forEach(([role, hex], i) => {
        const cx = i * 196;
        ctx.fillStyle = hex;
        ctx.beginPath();
        ctx.roundRect(cx, 0, 176, 176, 14);
        ctx.fill();
        ctx.strokeStyle = "#D9D8D2";
        ctx.stroke();
        ctx.fillStyle = "#16161A";
        ctx.font = font(b.fonts.body, 600, 24);
        ctx.fillText(hex.toUpperCase(), cx, 214);
        ctx.fillStyle = "#6B6B70";
        ctx.font = font(b.fonts.body, 400, 20);
        ctx.fillText(role, cx, 244);
      });
    }),
    left: 1340,
    top: row2 + 10,
  });
  // Typographies.
  const row3 = 1310;
  comps.push({
    input: await textLayer(1100, 370, (ctx) => {
      ctx.fillStyle = "#16161A";
      ctx.font = font(b.fonts.heading, b.fonts.headingWeight ?? 700, 120);
      ctx.fillText("Aa", 0, 120);
      ctx.font = font(b.fonts.heading, b.fonts.headingWeight ?? 700, 34);
      ctx.fillText(`${b.fonts.heading} — ${L("titres", "headings")}`, 190, 70);
      ctx.fillStyle = "#3A3A40";
      ctx.font = font(b.fonts.body, 400, 30);
      ctx.fillText(`${b.fonts.body} — ${L("textes", "body text")}`, 190, 116);
      ctx.font = font(b.fonts.body, 400, 26);
      ctx.fillText("ABCDEFGHIJKLMNOPQRSTUVWXYZ  àéèêëîïôùç  0123456789", 0, 200);
      ctx.fillStyle = "#6B6B70";
      ctx.font = font(b.fonts.body, 400, 22);
      if (b.svgNote) {
        // Note sur deux lignes au plus (coupée aux mots).
        const lines: string[] = [""];
        for (const w of b.svgNote.split(" ")) {
          const next = lines[lines.length - 1] ? `${lines[lines.length - 1]} ${w}` : w;
          if (ctx.measureText(next).width > 1040 && lines.length < 2) lines.push(w);
          else lines[lines.length - 1] = next;
        }
        lines.forEach((l, i) => ctx.fillText(l, 0, 260 + i * 32));
      }
    }),
    left: 70,
    top: row3,
  });
  // Applications : carte de visite recto (clair) et verso (sombre), en-tête de site, avatar.
  comps.push({ input: await panel(420, 250, "#FFFFFF", b.logo, 40, 10), left: 1180, top: row3 });
  comps.push({ input: await panel(420, 250, dark, b.light, 50, 10), left: 1620, top: row3 });
  const header = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="980" height="96"><rect width="980" height="96" rx="10" fill="#FFFFFF"/><g fill="#C9C8C2"><rect x="560" y="42" width="70" height="12" rx="6"/><rect x="650" y="42" width="70" height="12" rx="6"/><rect x="740" y="42" width="70" height="12" rx="6"/></g><rect x="840" y="28" width="110" height="40" rx="20" fill="${primary}"/></svg>`);
  comps.push({ input: await sharp(header).composite([{ input: await fit(b.logo, 300, 76), left: 30, top: 10 }]).png().toBuffer(), left: 1180, top: row3 + 270 });
  const avatar = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="250" height="250"><circle cx="125" cy="125" r="120" fill="${primary}"/></svg>`);
  comps.push({ input: await sharp(avatar).composite([{ input: await fit(markWhite, 150, 150), gravity: "center" }]).png().toBuffer(), left: 2080, top: row3 });
  await label(L("Applications : carte de visite, en-tête du site, avatar", "Applications: business card, website header, avatar"), 1180, row3 + 376);
  const bg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#F2F1EC"/></svg>`);
  return sharp(bg).composite(comps).png().toBuffer();
}
