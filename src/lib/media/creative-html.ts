/**
 * Visuels publicitaires et réseaux sociaux de niveau agence, mis en page en HTML/CSS puis photographiés
 * par un navigateur sans interface (typographie fine, ombres réalistes, zones qui ne se chevauchent jamais).
 * Le produit est toujours la photo détourée réelle ; les textes ne reprennent que des informations confirmées.
 * Sans Chromium, renvoie null et l'appelant garde la composition classique.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { chromiumPath } from "../theme/snapshot";
import { CANVAS_FONTS, FONT_DIR } from "./fonts";
import { isDark, mix, onColor, withLightness, hsl } from "../color";
import type { Palette, Typo } from "./compose";

export type ProTemplate = "signature" | "editorial" | "arguments";
export type ProFormat = "square" | "portrait" | "story" | "landscape";
const SIZES: Record<ProFormat, { w: number; h: number; label: string }> = { square: { w: 1080, h: 1080, label: "1:1" }, portrait: { w: 1080, h: 1350, label: "4:5" }, story: { w: 1080, h: 1920, label: "9:16" }, landscape: { w: 1920, h: 1080, label: "16:9" } };

export type ProInput = {
  product: Buffer; // détourage PNG (transparent)
  palette: Palette;
  typo: Typo;
  brand: string;
  logo?: Buffer | null; // logo clair ou foncé (PNG)
  headline: string;
  subline?: string;
  keyword?: string; // grand mot en fond (saveur, modèle…)
  facts: string[]; // informations confirmées, très courtes
  cta?: string;
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function fontFaces(families: string[]) {
  const out: string[] = [];
  for (const fam of new Set(families)) {
    const def = CANVAS_FONTS[fam];
    if (!def) continue;
    for (const [w, file] of Object.entries(def.file)) {
      const p = path.join(FONT_DIR, file);
      if (fs.existsSync(p)) out.push(`@font-face{font-family:"${fam}";font-weight:${w};src:url("data:font/ttf;base64,${fs.readFileSync(p).toString("base64")}")}`);
    }
    if (def.italic && fs.existsSync(path.join(FONT_DIR, def.italic))) out.push(`@font-face{font-family:"${fam}";font-style:italic;src:url("data:font/ttf;base64,${fs.readFileSync(path.join(FONT_DIR, def.italic)).toString("base64")}")}`);
  }
  return out.join("\n");
}

function page(t: ProTemplate, f: ProFormat, i: ProInput, productUri: string, logoUri: string | null, wide: boolean) {
  const { w, h } = SIZES[f];
  const p = i.palette;
  const deep = isDark(p.primary) ? p.primary : withLightness(p.primary, Math.min(0.42, hsl(p.primary)[2]));
  const cream = mix(p.light, "#FFFFFF", 0.35);
  const ink = withLightness(p.dark, 0.12);
  const accent = p.accent;
  const H = i.typo.heading, B = i.typo.body;
  const hw = i.typo.headingWeight ?? 500;
  const upper = i.typo.uppercase ? "uppercase" : "none";
  const tall = f === "story";
  const facts = i.facts.slice(0, 3).map((x) => `<li>${esc(x)}</li>`).join("");
  const kw = esc((i.keyword ?? "").toUpperCase());
  const cta = i.cta ? `<span class="cta">${esc(i.cta)} <b>→</b></span>` : "";
  const logo = logoUri ? `<img class="logo" src="${logoUri}" alt="">` : `<span class="wordmark">${esc(i.brand)}</span>`;
  const base = `
    *{box-sizing:border-box;margin:0}
    html,body{width:${w}px;height:${h}px;overflow:hidden}
    body{font-family:"${B}",sans-serif;-webkit-font-smoothing:antialiased}
    .stage{position:relative;width:${w}px;height:${h}px;overflow:hidden}
    .h{font-family:"${H}",serif;font-weight:${hw};text-transform:${upper};letter-spacing:-.02em;line-height:1.02;text-wrap:balance}
    .prod{position:absolute;object-fit:contain;filter:drop-shadow(0 ${h * 0.03}px ${h * 0.03}px rgba(0,0,0,.22)) drop-shadow(0 ${h * 0.006}px ${h * 0.006}px rgba(0,0,0,.18))}
    .floor{position:absolute;border-radius:50%;background:radial-gradient(closest-side,rgba(0,0,0,.34),rgba(0,0,0,0));filter:blur(${w * 0.01}px)}
    .chips{display:flex;flex-wrap:wrap;gap:${w * 0.012}px;list-style:none;padding:0}
    .chips li{padding:${w * 0.011}px ${w * 0.022}px;border-radius:999px;font-size:${w * 0.024}px;font-weight:600;letter-spacing:.02em}
    .cta{display:inline-flex;align-items:center;gap:${w * 0.012}px;padding:${w * 0.02}px ${w * 0.04}px;border-radius:999px;font-size:${w * 0.03}px;font-weight:600}
    .logo{height:${w * 0.05}px;width:auto;object-fit:contain}
    .wordmark{font-family:"${H}",serif;font-weight:${Math.max(hw, 500)};font-size:${w * 0.034}px;letter-spacing:.14em;text-transform:uppercase}
    .fit{display:block}`;
  if (f === "landscape") {
    const dark = t === "signature";
    const bg = dark ? deep : cream;
    const fg = dark ? onColor(deep) : ink;
    return `<style>${base}
      .stage{background:${dark ? `radial-gradient(90% 120% at 72% 50%, ${mix(deep, "#FFFFFF", 0.2)} 0%, ${deep} 60%, ${withLightness(deep, Math.max(0.08, hsl(deep)[2] - 0.12))} 100%)` : `linear-gradient(90deg, ${cream} 0%, ${cream} 46%, ${mix(p.secondary, cream, 0.2)} 46%, ${mix(p.secondary, deep, 0.18)} 100%)`};color:${fg}}
      .kw{position:absolute;left:46%;right:0;top:${h * 0.2}px;text-align:center;font-family:"${H}",serif;font-weight:700;font-size:${h * 0.34}px;line-height:1;letter-spacing:-.03em;color:${fg};opacity:${dark ? 0.1 : 0.12};white-space:nowrap;overflow:hidden}
      .prod{left:${w * 0.5}px;width:${w * 0.44}px;top:${h * 0.12}px;height:${h * 0.72}px}
      .floor{left:${w * 0.6}px;width:${w * 0.24}px;top:${h * 0.82}px;height:${h * 0.05}px}
      .col{position:absolute;left:${w * 0.06}px;width:${w * 0.37}px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center;gap:${h * 0.035}px}
      .eyebrow{font-size:${h * 0.024}px;letter-spacing:.22em;text-transform:uppercase;font-weight:600;color:${dark ? fg : deep};opacity:${dark ? 0.8 : 1}}
      .col .h{font-size:${h * 0.095}px;max-height:${h * 0.095 * 3.3}px}
      .sub{font-size:${h * 0.03}px;opacity:.75}
      .chips li{font-size:${h * 0.024}px;padding:${h * 0.011}px ${h * 0.022}px;background:${dark ? mix(deep, "#FFFFFF", 0.16) : "#fff"};color:${fg}}
      .cta{font-size:${h * 0.03}px;padding:${h * 0.02}px ${h * 0.042}px;background:${dark ? fg : ink};color:${dark ? deep : cream};align-self:flex-start}
      </style><div class="stage"><div class="kw"><span>${kw}</span></div><div class="floor"></div><img class="prod" src="${productUri}" alt="">
      <div class="col"><p class="eyebrow">${esc(i.brand)}</p><p class="h fit">${esc(i.headline)}</p>${i.subline ? `<p class="sub">${esc(i.subline)}</p>` : ""}<ul class="chips">${facts}</ul>${cta}</div></div>`;
  }
  if (t === "signature") {
    // Fond de marque, grand mot en filigrane, produit au centre, texte en bas.
    const fg = onColor(deep);
    return `<style>${base}
      .stage{background:radial-gradient(120% 80% at 50% 38%, ${mix(deep, "#FFFFFF", 0.22)} 0%, ${deep} 55%, ${withLightness(deep, Math.max(0.08, hsl(deep)[2] - 0.12))} 100%);color:${fg}}
      .top{position:absolute;left:${w * 0.07}px;right:${w * 0.07}px;top:${h * 0.05}px;display:flex;justify-content:space-between;align-items:center}
      .tag{font-size:${w * 0.022}px;letter-spacing:.2em;text-transform:uppercase;opacity:.8}
      .kw{position:absolute;left:0;right:0;overflow:hidden;top:${tall ? h * 0.2 : h * 0.15}px;text-align:center;font-family:"${H}",serif;font-weight:700;font-size:${w * (kw.length > 7 ? 0.2 : 0.28)}px;line-height:1;letter-spacing:-.03em;color:${fg};opacity:.1;white-space:nowrap}
      .prod{left:${w * 0.18}px;width:${w * 0.64}px;top:${tall ? h * 0.15 : h * 0.12}px;height:${tall ? h * 0.5 : h * (f === "square" ? 0.52 : 0.56)}px}
      .floor{left:${w * 0.3}px;width:${w * 0.4}px;top:${tall ? h * 0.63 : h * (f === "square" ? 0.62 : 0.66)}px;height:${w * 0.05}px}
      .bottom{position:absolute;left:${w * 0.07}px;right:${w * 0.07}px;bottom:${tall ? h * 0.12 : h * 0.06}px;display:grid;gap:${w * 0.024}px}
      .bottom .h{font-size:${w * (tall ? 0.085 : 0.07)}px;max-height:${w * (tall ? 0.085 : 0.07) * 2.2}px}
      .row{display:flex;justify-content:space-between;align-items:center;gap:${w * 0.03}px}
      .chips li{background:${mix(deep, "#FFFFFF", 0.16)};color:${fg}}
      .cta{background:${fg};color:${deep}}
      </style><div class="stage"><div class="top">${logo}<span class="tag">${esc(i.subline ?? "")}</span></div>
      <div class="kw"><span>${kw}</span></div><div class="floor"></div><img class="prod" src="${productUri}" alt="">
      <div class="bottom"><p class="h fit">${esc(i.headline)}</p><div class="row"><ul class="chips">${facts}</ul>${cta}</div></div></div>`;
  }
  if (t === "editorial") {
    // Crème, grand titre en haut à gauche, produit posé sur un panneau de couleur arrondi.
    return `<style>${base}
      .stage{background:${cream};color:${ink}}
      .head{position:absolute;left:${w * 0.07}px;right:${w * 0.07}px;top:${h * 0.06}px;display:grid;gap:${w * 0.02}px}
      .eyebrow{font-size:${w * 0.022}px;letter-spacing:.22em;text-transform:uppercase;color:${deep};font-weight:600}
      .head .h{font-size:${w * (tall ? 0.1 : 0.082)}px;max-height:${w * (tall ? 0.1 : 0.082) * 3.3}px;max-width:${w * 0.8}px}
      .sub{font-size:${w * 0.03}px;color:${mix(ink, cream, 0.35)};max-width:${w * 0.7}px;line-height:1.35}
      .panel{position:absolute;right:${w * 0.07}px;left:${w * 0.07}px;bottom:${h * 0.06}px;height:${tall ? h * 0.48 : h * (f === "square" ? 0.42 : 0.47)}px;border-radius:${w * 0.05}px;background:linear-gradient(160deg, ${mix(p.secondary, cream, 0.1)}, ${mix(p.secondary, deep, 0.25)})}
      .prod{right:${w * (wide ? 0.09 : 0.12)}px;width:${w * (wide ? 0.66 : 0.46)}px;bottom:${h * 0.09}px;height:${tall ? h * (wide ? 0.34 : 0.52) : h * (wide ? (f === "square" ? 0.2 : 0.27) : f === "square" ? 0.5 : 0.52)}px;object-position:bottom}
      .floor{right:${w * 0.19}px;width:${w * 0.32}px;bottom:${h * 0.075}px;height:${w * 0.04}px}
      .side{position:absolute;left:${w * 0.12}px;${wide ? `top:${h - h * 0.06 - (tall ? h * 0.48 : h * (f === "square" ? 0.42 : 0.47)) + w * 0.05}px` : `bottom:${h * 0.11}px`};display:grid;gap:${w * 0.025}px;max-width:${w * (wide ? 0.7 : 0.34)}px}
      .chips{${wide ? "" : "flex-direction:column;align-items:flex-start"}}
      .chips li{background:${cream};color:${ink}}
      .cta{background:${ink};color:${cream};justify-self:start}
      .brandmark{position:absolute;right:${w * 0.07}px;top:${h * 0.06}px}
      </style><div class="stage"><div class="head"><p class="eyebrow">${esc(i.brand)}</p><p class="h fit">${esc(i.headline)}</p>${i.subline ? `<p class="sub">${esc(i.subline)}</p>` : ""}</div>
      <div class="panel"></div><div class="floor"></div><img class="prod" src="${productUri}" alt="">
      <div class="side"><ul class="chips">${facts}</ul>${cta}</div></div>`;
  }
  // Arguments : produit au centre, cartes d'arguments autour, titre en haut.
  const cards = i.facts.slice(0, 3);
  const pos = tall
    ? [[0.07, 0.58], [0.6, 0.66], [0.07, 0.76]]
    : f === "square"
      ? [[0.06, 0.44], [0.66, 0.56], [0.06, 0.7]]
      : [[0.06, 0.46], [0.64, 0.58], [0.06, 0.72]];
  return `<style>${base}
    .stage{background:linear-gradient(180deg, ${cream} 0%, ${mix(p.secondary, cream, 0.45)} 100%);color:${ink}}
    .head{position:absolute;left:${w * 0.07}px;right:${w * 0.07}px;top:${h * 0.06}px;text-align:center;display:grid;gap:${w * 0.016}px;justify-items:center}
    .head .h{font-size:${w * (tall ? 0.09 : 0.072)}px;max-height:${w * (tall ? 0.09 : 0.072) * 2.2}px}
    .eyebrow{font-size:${w * 0.022}px;letter-spacing:.22em;text-transform:uppercase;color:${deep};font-weight:600}
    .ring{position:absolute;left:50%;top:${tall ? h * 0.52 : h * 0.6}px;width:${w * 0.62}px;height:${w * 0.62}px;margin:-${w * 0.31}px;border-radius:50%;background:${mix(p.secondary, "#FFFFFF", 0.3)}}
    .prod{left:${w * 0.25}px;width:${w * 0.5}px;top:${tall ? h * 0.3 : h * 0.3}px;height:${tall ? h * 0.42 : h * 0.55}px}
    .floor{left:${w * 0.33}px;width:${w * 0.34}px;top:${tall ? h * 0.7 : h * 0.83}px;height:${w * 0.04}px}
    .card{position:absolute;display:flex;align-items:center;gap:${w * 0.014}px;padding:${w * 0.016}px ${w * 0.026}px;border-radius:${w * 0.024}px;background:#fff;box-shadow:0 ${w * 0.012}px ${w * 0.03}px -${w * 0.012}px rgba(0,0,0,.25);font-size:${w * 0.028}px;font-weight:600;max-width:${w * 0.34}px}
    .card i{display:grid;place-items:center;width:${w * 0.036}px;height:${w * 0.036}px;border-radius:50%;background:${accent};color:${onColor(accent)};font-style:normal;font-size:${w * 0.02}px;flex:none}
    .foot{position:absolute;left:0;right:0;bottom:${tall ? h * 0.1 : h * 0.05}px;display:flex;justify-content:center}
    .cta{background:${ink};color:${cream}}
    </style><div class="stage"><div class="head"><p class="eyebrow">${esc(i.brand)}</p><p class="h fit">${esc(i.headline)}</p></div>
    <div class="ring"></div><div class="floor"></div><img class="prod" src="${productUri}" alt="">
    ${cards.map((c, k) => `<div class="card" style="left:${w * pos[k][0]}px;top:${h * pos[k][1]}px"><i>✓</i>${esc(c)}</div>`).join("")}
    <div class="foot">${cta}</div></div>`;
}

export async function renderProCreatives(input: ProInput, jobs: { template: ProTemplate; format: ProFormat }[]): Promise<{ template: ProTemplate; format: ProFormat; label: string; jpg: Buffer }[] | null> {
  const exe = chromiumPath();
  if (!exe) return null;
  let chromium: typeof import("playwright").chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    return null;
  }
  // Détourage recadré au plus juste : le produit occupe vraiment sa zone.
  const prod = await sharp(input.product).trim({ threshold: 1 }).png().toBuffer();
  const meta = await sharp(prod).metadata();
  const wide = (meta.width ?? 1) / (meta.height ?? 1) > 1.25;
  const productUri = `data:image/png;base64,${prod.toString("base64")}`;
  const logoUri = input.logo ? `data:image/png;base64,${(await sharp(input.logo).trim().png().toBuffer()).toString("base64")}` : null;
  const faces = fontFaces([input.typo.heading, input.typo.body]);
  const browser = await chromium.launch({ executablePath: exe, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  try {
    const out: { template: ProTemplate; format: ProFormat; label: string; jpg: Buffer }[] = [];
    for (const j of jobs) {
      const { w, h, label } = SIZES[j.format];
      const pg = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
      await pg.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${faces}</style></head><body>${page(j.template, j.format, input, productUri, logoUri, wide)}</body></html>`, { waitUntil: "load" });
      await pg.evaluate(async () => {
        await document.fonts.ready;
        const img = document.querySelector<HTMLImageElement>(".prod");
        if (img && !img.complete) await new Promise((r) => (img.onload = r));
        // Ombre au sol posée exactement sous le produit (boîte réelle de l'image contenue).
        const floor = document.querySelector<HTMLElement>(".floor");
        if (img && floor) {
          const r = img.getBoundingClientRect();
          const k = Math.min(r.width / img.naturalWidth, r.height / img.naturalHeight);
          const iw = img.naturalWidth * k, ih = img.naturalHeight * k;
          const pos = getComputedStyle(img).objectPosition.includes("bottom") || getComputedStyle(img).objectPosition.endsWith("100%") ? 1 : 0.5;
          const left = r.left + (r.width - iw) / 2, bottom = r.top + (r.height - ih) * pos + ih;
          const sr = floor.parentElement!.getBoundingClientRect();
          Object.assign(floor.style, { left: `${left - sr.left + iw * 0.12}px`, right: "auto", width: `${iw * 0.76}px`, top: `${bottom - sr.top - floor.offsetHeight * 0.55}px`, bottom: "auto" });
        }
        // Grand mot en filigrane : occupe la largeur sans être coupé.
        document.querySelectorAll<HTMLElement>(".kw").forEach((el) => {
          let size = parseFloat(getComputedStyle(el).fontSize);
          const span = el.firstElementChild as HTMLElement | null;
          if (!span) return;
          span.style.display = "inline-block";
          while (span.offsetWidth > el.clientWidth * 0.92 && size > 40) {
            size *= 0.95;
            el.style.fontSize = `${size}px`;
          }
        });
        // Titre trop long : on réduit la taille jusqu'à tenir dans sa zone.
        document.querySelectorAll<HTMLElement>(".fit").forEach((el) => {
          const max = parseFloat(getComputedStyle(el).maxHeight);
          let size = parseFloat(getComputedStyle(el).fontSize);
          if (!max || Number.isNaN(max)) return;
          el.style.maxHeight = "none";
          while (el.scrollHeight > max && size > 24) {
            size *= 0.94;
            el.style.fontSize = `${size}px`;
          }
        });
      });
      out.push({ template: j.template, format: j.format, label, jpg: await pg.screenshot({ type: "jpeg", quality: 92 }) });
      await pg.close();
    }
    return out;
  } finally {
    await browser.close();
  }
}
