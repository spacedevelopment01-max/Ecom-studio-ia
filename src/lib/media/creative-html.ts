/**
 * Visuels publicitaires et réseaux sociaux de niveau agence, mis en page en HTML/CSS puis photographiés
 * par un navigateur sans interface (typographie fine, ombres réalistes, zones qui ne se chevauchent jamais).
 * Le produit est toujours la photo détourée réelle ; les textes ne reprennent que des informations confirmées.
 * Entreprises de services : visuels à partir des photos réelles de l'activité ou typographiques (voir plus bas).
 * Sans Chromium, renvoie null et l'appelant garde la composition classique.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { chromiumPath } from "../theme/snapshot";
import { CANVAS_FONTS, FONT_DIR } from "./fonts";
import { isDark, mix, onColor, withLightness, hsl } from "../color";
import type { Palette, Typo } from "./compose";
import { contentLang } from "../i18n-server";
import { intlLocale } from "../i18n";

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
  /** Ligne photographique de la marque (fond, encre, accent, côté de la lumière) : même campagne que les photos. */
  look?: CreativeLook;
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

/** Même texte, à la casse, aux accents et à la ponctuation près. */
const same = (a?: string, b?: string) => {
  const n = (x?: string) => (x ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return !!n(a) && n(a) === n(b);
};

/**
 * Textes sans répétition : la ligne secondaire et les pastilles ne redisent ni la marque ni le titre
 * (sinon « SOVA · SOVA · SOVA » quand le produit porte le nom de la marque).
 */
export function dedupeCreativeText(i: ProInput): ProInput {
  const subline = i.subline && !same(i.subline, i.brand) && !same(i.subline, i.headline) ? i.subline : undefined;
  const facts: string[] = [];
  for (const f of i.facts) if (!same(f, i.brand) && !same(f, i.headline) && !same(f, subline) && !facts.some((x) => same(x, f))) facts.push(f);
  return { ...i, subline, facts };
}

/** Couleurs d'un visuel : ligne photographique de la marque si fournie, sinon dérivées de la palette. */
export type CreativeLook = { mode: "tonal" | "deep" | "light"; ground: string; ink: string; accent: string; soft: string; lightFrom?: "left" | "right" };

/** Pas de mot seul en dernière ligne (veuve) : les deux derniers mots restent ensemble. */
export function noWidow(text: string): string {
  const m = text.trim().match(/^(.*\S)\s+(\S{1,9})$/);
  return m && m[1].includes(" ") ? `${m[1]} ${m[2]}` : text.trim();
}

/**
 * Système typographique d'affiche (unité u = 1 % du petit côté) : marges de 7u, interlignage et espacements en
 * multiples de 0,8u, échelle modulaire (surtitre 2,2u → texte 3u → titre 8 à 11u). Hiérarchie unique : un titre,
 * un texte d'appui, une ligne d'informations confirmées, un appel à l'action.
 */
function page(t: ProTemplate, f: ProFormat, i0: ProInput, productUri: string, logoUri: string | null, wide: boolean) {
  const i = dedupeCreativeText(i0);
  const { w, h } = SIZES[f];
  const u = Math.min(w, h) / 100;
  const p = i.palette;
  const deepFromPal = isDark(p.primary) ? p.primary : withLightness(p.primary, Math.min(0.42, hsl(p.primary)[2]));
  const look: CreativeLook = i.look ?? { mode: "deep", ground: deepFromPal, ink: onColor(deepFromPal), accent: p.accent, soft: mix(deepFromPal, "#FFFFFF", 0.16) };
  const cream = mix(p.light, "#FFFFFF", 0.35);
  const inkDark = withLightness(p.dark, 0.12);
  // Fond du visuel principal (« signature ») : celui de la ligne ; le visuel éditorial reste clair.
  const sig = look.mode === "light" ? { bg: deepFromPal, fg: onColor(deepFromPal) } : { bg: look.ground, fg: look.ink };
  const H = i.typo.heading, B = i.typo.body;
  const hw = i.typo.headingWeight ?? 500;
  const serif = CANVAS_FONTS[H]?.kind === "serif";
  const upper = i.typo.uppercase ? "uppercase" : "none";
  const tall = f === "story";
  const from = look.lightFrom ?? "left";
  const sx = from === "left" ? 1 : -1;
  const headline = esc(noWidow(i.headline));
  const facts = i.facts.slice(0, 3).map((x) => `<li>${esc(x)}</li>`).join("");
  const kw = esc((i.keyword ?? "").toLocaleUpperCase(intlLocale(contentLang())));
  const cta = i.cta ? `<span class="cta">${esc(i.cta)}<b aria-hidden="true">→</b></span>` : "";
  const logo = logoUri ? `<img class="logo" src="${logoUri}" alt="">` : `<span class="wordmark">${esc(i.brand)}</span>`;
  const M = 7 * u;
  const base = `
    *{box-sizing:border-box;margin:0;padding:0}
    html,body{width:${w}px;height:${h}px;overflow:hidden}
    body{font-family:"${B}",sans-serif;-webkit-font-smoothing:antialiased;font-kerning:normal;font-feature-settings:"kern","liga"}
    .stage{position:relative;width:${w}px;height:${h}px;overflow:hidden}
    .h{font-family:"${H}",serif;font-weight:${hw};text-transform:${upper};letter-spacing:${serif ? "-.012em" : "-.028em"};line-height:${serif ? 1.02 : 0.98};text-wrap:balance}
    .eyebrow{display:flex;align-items:center;gap:${1.6 * u}px;font-size:${2.2 * u}px;letter-spacing:.24em;text-transform:uppercase;font-weight:600}
    .eyebrow::before{content:"";display:block;width:${5 * u}px;height:${Math.max(2, 0.25 * u)}px;background:currentColor;opacity:.7}
    .sub{font-size:${3 * u}px;line-height:1.4;max-width:32ch;text-wrap:pretty}
    .prod{position:absolute;object-fit:contain;filter:drop-shadow(${sx * h * 0.012}px ${h * 0.026}px ${h * 0.028}px rgba(0,0,0,.24)) drop-shadow(0 ${h * 0.005}px ${h * 0.005}px rgba(0,0,0,.18))}
    .floor{position:absolute;border-radius:50%;background:radial-gradient(closest-side,rgba(0,0,0,.32),rgba(0,0,0,0));filter:blur(${w * 0.01}px)}
    .facts{display:flex;flex-wrap:wrap;list-style:none;font-size:${2.2 * u}px;letter-spacing:.14em;text-transform:uppercase;font-weight:600;row-gap:${0.8 * u}px}
    .facts li{padding:0 ${1.6 * u}px;border-left:${Math.max(1, 0.15 * u)}px solid currentColor}
    .facts li:first-child{padding-left:0;border-left:0}
    .cta{display:inline-flex;align-items:center;gap:${1.6 * u}px;height:${6.4 * u}px;padding:0 ${3.6 * u}px;border-radius:999px;font-size:${2.8 * u}px;font-weight:600;letter-spacing:.02em;white-space:nowrap}
    .logo{height:${4.4 * u}px;width:auto;object-fit:contain}
    .wordmark{font-family:"${H}",serif;font-weight:${Math.max(hw, 500)};font-size:${3 * u}px;letter-spacing:.16em;text-transform:uppercase}
    .fit{display:block}`;
  const lightGrad = (bg: string) => `radial-gradient(120% 90% at ${from === "left" ? 22 : 78}% 18%, ${mix(bg, "#FFFFFF", 0.2)} 0%, ${bg} 52%, ${withLightness(bg, Math.max(0.06, hsl(bg)[2] - 0.1))} 100%)`;
  if (f === "landscape") {
    const dark = t === "signature";
    const bg = dark ? sig.bg : cream;
    const fg = dark ? sig.fg : inkDark;
    return `<style>${base}
      .stage{background:${dark ? lightGrad(bg) : `linear-gradient(90deg, ${cream} 0%, ${cream} 46%, ${mix(p.secondary, cream, 0.2)} 46%, ${mix(p.secondary, deepFromPal, 0.18)} 100%)`};color:${fg}}
      .kw{position:absolute;left:46%;right:${M}px;top:${h * 0.08}px;text-align:center;font-family:"${H}",serif;font-weight:700;font-size:${h * 0.3}px;line-height:1;letter-spacing:-.03em;color:${fg};opacity:${dark ? 0.09 : 0.1};white-space:nowrap;overflow:hidden}
      .prod{left:${w * 0.5}px;width:${w * 0.42}px;top:${h * 0.2}px;height:${h * 0.66}px}
      .floor{left:${w * 0.6}px;width:${w * 0.24}px;top:${h * 0.84}px;height:${h * 0.05}px}
      .col{position:absolute;left:${w * 0.07}px;width:${w * 0.37}px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center;gap:${2.8 * u}px}
      .eyebrow{color:${dark ? look.accent : deepFromPal}}
      .col .h{font-size:${h * 0.1}px;max-height:${h * 0.1 * 3.3}px}
      .sub{opacity:.78}
      .facts{opacity:.86}
      .cta{background:${dark ? fg : inkDark};color:${dark ? bg : cream};align-self:flex-start;margin-top:${0.8 * u}px}
      </style><div class="stage"><div class="kw"><span>${kw}</span></div><div class="floor"></div><img class="prod" src="${productUri}" alt="">
      <div class="col"><p class="eyebrow">${esc(i.brand)}</p><p class="h fit">${headline}</p>${i.subline ? `<p class="sub">${esc(i.subline)}</p>` : ""}${facts ? `<ul class="facts">${facts}</ul>` : ""}${cta}</div></div>`;
  }
  if (t === "signature") {
    // Affiche : grand mot en tête (entièrement lisible), produit qui le chevauche par le bas, texte en pied de page.
    const { bg, fg } = sig;
    const top = tall ? h * 0.12 : M;
    const kwTop = top + 7 * u;
    const prodTop = tall ? h * 0.2 : h * 0.17;
    const prodH = tall ? h * 0.42 : h * (f === "square" ? 0.48 : 0.52);
    return `<style>${base}
      .stage{background:${lightGrad(bg)};color:${fg}}
      .top{position:absolute;left:${M}px;right:${M}px;top:${top}px;display:flex;justify-content:space-between;align-items:center}
      .tag{font-size:${2.2 * u}px;letter-spacing:.2em;text-transform:uppercase;opacity:.8}
      .kw{position:absolute;left:${M}px;right:${M}px;overflow:hidden;top:${kwTop}px;text-align:center;font-family:"${H}",serif;font-weight:700;font-size:${w * 0.26}px;line-height:.86;letter-spacing:-.03em;color:${fg};opacity:.13;white-space:nowrap}
      .prod{left:${w * 0.16}px;width:${w * 0.68}px;top:${prodTop}px;height:${prodH}px}
      .floor{left:${w * 0.3}px;width:${w * 0.4}px;top:${prodTop + prodH - w * 0.02}px;height:${w * 0.05}px}
      .bottom{position:absolute;left:${M}px;right:${M}px;bottom:${tall ? h * 0.2 : M}px;display:grid;gap:${2.4 * u}px}
      .bottom .h{font-size:${(tall ? 11 : 8.4) * u}px;max-height:${(tall ? 11 : 8.4) * u * 2.15}px}
      .row{display:flex;justify-content:space-between;align-items:center;gap:${3.2 * u}px}
      .facts{opacity:.85}
      .cta{background:${fg};color:${bg}}
      </style><div class="stage"><div class="top">${logo}<span class="tag">${esc(i.subline ?? "")}</span></div>
      <div class="kw"><span>${kw}</span></div><div class="floor"></div><img class="prod" src="${productUri}" alt="">
      <div class="bottom"><p class="h fit">${headline}</p><div class="row">${facts ? `<ul class="facts">${facts}</ul>` : "<span></span>"}${cta}</div></div></div>`;
  }
  if (t === "editorial") {
    // Page de magazine : grand titre en haut à gauche, produit posé sur un panneau à la couleur de la ligne.
    const panelBg = look.mode === "light" ? mix(p.secondary, cream, 0.1) : look.mode === "tonal" ? look.ground : mix(p.secondary, cream, 0.1);
    const panelFg = onColor(panelBg, inkDark, "#FFFFFF");
    const panelH = tall ? h * 0.56 : h * (f === "square" ? 0.44 : 0.48);
    return `<style>${base}
      .stage{background:${cream};color:${inkDark}}
      .head{position:absolute;left:${M}px;right:${M}px;top:${tall ? h * 0.12 : M}px;display:grid;gap:${2.4 * u}px}
      .eyebrow{color:${withLightness(look.accent, Math.min(0.42, hsl(look.accent)[2]))}}
      .head .h{font-size:${(tall ? 11 : 8.8) * u}px;max-height:${(tall ? 11 : 8.8) * u * 3.3}px;max-width:${w * 0.8}px}
      .sub{color:${mix(inkDark, cream, 0.3)}}
      .panel{position:absolute;right:${M}px;left:${M}px;bottom:${tall ? h * 0.2 : M}px;height:${panelH}px;border-radius:${2 * u}px;background:linear-gradient(${from === "left" ? 160 : 200}deg, ${mix(panelBg, "#FFFFFF", 0.14)}, ${mix(panelBg, "#000000", 0.08)})}
      .prod{right:${w * (wide ? 0.1 : 0.12)}px;width:${w * (wide ? 0.56 : tall ? 0.5 : 0.44)}px;bottom:${(tall ? h * 0.2 : M) + panelH * 0.1}px;height:${panelH * (wide ? 0.66 : 1.08)}px;object-position:bottom}
      .floor{right:${w * 0.19}px;width:${w * 0.32}px;bottom:${h * 0.075}px;height:${w * 0.04}px}
      .side{position:absolute;left:${M + 4 * u}px;${wide ? `top:${h - (tall ? h * 0.2 : M) - panelH + 4 * u}px` : `bottom:${(tall ? h * 0.2 : M) + 4 * u}px`};display:grid;gap:${2.4 * u}px;max-width:${w * (wide ? 0.7 : 0.36)}px;color:${panelFg}}
      .side .facts{${wide ? "" : "flex-direction:column;align-items:flex-start"}}
      .side .facts li{${wide ? "" : `padding:${0.8 * u}px 0;border-left:0;border-top:${Math.max(1, 0.15 * u)}px solid currentColor;width:100%`}}
      .side .facts li:first-child{${wide ? "" : "border-top:0"}}
      .cta{background:${panelFg};color:${panelBg};justify-self:start}
      </style><div class="stage"><div class="head"><p class="eyebrow">${esc(i.brand)}</p><p class="h fit">${headline}</p>${i.subline ? `<p class="sub">${esc(i.subline)}</p>` : ""}</div>
      <div class="panel"></div><div class="floor"></div><img class="prod" src="${productUri}" alt="">
      <div class="side">${facts ? `<ul class="facts">${facts}</ul>` : ""}${cta}</div></div>`;
  }
  // Arguments : produit au centre, trois informations confirmées numérotées, titre en haut.
  const cards = i.facts.slice(0, 3);
  const pos = tall
    ? [[0.07, 0.56], [0.58, 0.64], [0.07, 0.72]]
    : f === "square"
      ? [[0.06, 0.44], [0.64, 0.56], [0.06, 0.7]]
      : [[0.06, 0.46], [0.62, 0.58], [0.06, 0.72]];
  const ringBg = look.mode === "tonal" ? look.ground : mix(p.secondary, "#FFFFFF", 0.3);
  return `<style>${base}
    .stage{background:linear-gradient(180deg, ${cream} 0%, ${mix(look.mode === "tonal" ? look.ground : p.secondary, cream, 0.45)} 100%);color:${inkDark}}
    .head{position:absolute;left:${M}px;right:${M}px;top:${tall ? h * 0.12 : M}px;text-align:center;display:grid;gap:${2 * u}px;justify-items:center}
    .head .h{font-size:${(tall ? 10 : 7.6) * u}px;max-height:${(tall ? 10 : 7.6) * u * 2.2}px}
    .eyebrow{color:${withLightness(look.accent, Math.min(0.42, hsl(look.accent)[2]))}}
    .ring{position:absolute;left:50%;top:${tall ? h * 0.5 : h * 0.6}px;width:${w * 0.62}px;height:${w * 0.62}px;margin:-${w * 0.31}px;border-radius:50%;background:${ringBg}}
    .prod{left:${w * 0.25}px;width:${w * 0.5}px;top:${h * 0.3}px;height:${tall ? h * 0.4 : h * 0.55}px}
    .floor{left:${w * 0.33}px;width:${w * 0.34}px;top:${tall ? h * 0.68 : h * 0.83}px;height:${w * 0.04}px}
    .card{position:absolute;display:flex;align-items:baseline;gap:${1.6 * u}px;padding:${1.8 * u}px ${2.6 * u}px;border-radius:${1.6 * u}px;background:#fff;box-shadow:0 ${1.2 * u}px ${3 * u}px -${1.2 * u}px rgba(0,0,0,.22);font-size:${2.8 * u}px;font-weight:600;max-width:${w * 0.34}px;line-height:1.25}
    .card i{font-family:"${H}",serif;font-style:normal;font-weight:${Math.max(hw, 600)};font-size:${2.4 * u}px;color:${withLightness(look.accent, Math.min(0.42, hsl(look.accent)[2]))};flex:none}
    .foot{position:absolute;left:0;right:0;bottom:${tall ? h * 0.2 : M}px;display:flex;justify-content:center}
    .cta{background:${inkDark};color:${cream}}
    </style><div class="stage"><div class="head"><p class="eyebrow">${esc(i.brand)}</p><p class="h fit">${headline}</p></div>
    <div class="ring"></div><div class="floor"></div><img class="prod" src="${productUri}" alt="">
    ${cards.map((c, k) => `<div class="card" style="left:${w * pos[k][0]}px;top:${h * pos[k][1]}px"><i>${String(k + 1).padStart(2, "0")}</i>${esc(c)}</div>`).join("")}
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
      await pg.setContent(`<!doctype html><html lang="${contentLang()}"><head><meta charset="utf-8"><style>${faces}</style></head><body>${page(j.template, j.format, input, productUri, logoUri, wide)}</body></html>`, { waitUntil: "load" });
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
          // Lisible ou absent : si le produit (boîte réellement occupée) masque plus que le bas du mot, il disparaît.
          const prod = document.querySelector<HTMLImageElement>(".prod");
          if (prod && prod.naturalWidth) {
            const r = prod.getBoundingClientRect();
            const k = Math.min(r.width / prod.naturalWidth, r.height / prod.naturalHeight);
            const iw = prod.naturalWidth * k, ih = prod.naturalHeight * k;
            const pos = getComputedStyle(prod).objectPosition.includes("bottom") || getComputedStyle(prod).objectPosition.endsWith("100%") ? 1 : 0.5;
            const px = r.left + (r.width - iw) / 2, py = r.top + (r.height - ih) * pos;
            const t = span.getBoundingClientRect();
            const overlapX = Math.max(0, Math.min(t.right, px + iw) - Math.max(t.left, px)) / Math.max(1, t.width);
            if (overlapX > 0.15 && py < t.top + t.height * 0.6) el.style.display = "none";
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

// ---------------------------------------------------------------- entreprises de services

/**
 * Visuels d'une entreprise de services (artisan, coach, salon, cabinet…) : pas de produit détouré.
 * Ils partent des photos réelles fournies (réalisations, équipe, lieu) ou, sans photo, d'une composition
 * typographique et graphique à la marque. Les textes viennent de l'offre réelle (prestations, horaires, zone).
 */
export type ServiceTemplate = "announce" | "carousel-cover" | "carousel-slide" | "carousel-end" | "quote" | "info" | "booking" | "services" | "graphic";
export type ServiceFormat = ProFormat | "banner";
export type ServiceIcon = "clock" | "pin" | "phone" | "mail" | "web";
export type ServiceCard = {
  template: ServiceTemplate;
  format: ServiceFormat;
  eyebrow?: string;
  title?: string;
  text?: string;
  chips?: string[];
  cta?: string;
  items?: { name: string; meta?: string }[];
  rows?: { icon: ServiceIcon; text: string }[];
  index?: number;
  total?: number;
  author?: string;
  /** Ligne de contact affichée sous le bouton (téléphone, adresse du site). */
  contact?: string;
  /** Indication « faites glisser » (couverture de carrousel). */
  swipe?: string;
  photo?: Buffer | null;
};
export type ServiceBrandInput = { palette: Palette; typo: Typo; brand: string };
export const SERVICE_SIZES: Record<ServiceFormat, { w: number; h: number; label: string }> = { ...SIZES, banner: { w: 2400, h: 1200, label: "2:1" } };

const ICONS: Record<ServiceIcon, string> = {
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  web: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
};
const icon = (k: ServiceIcon, color: string) => `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[k]}</svg>`;

/** Décor graphique sans photo : cercles et anneaux à la couleur de marque (aucun texte). */
function deco(fg: string, accent: string, second: string, variant = 0) {
  const v = [
    `<circle cx="88" cy="14" r="34" fill="${accent}" opacity=".22"/><circle cx="88" cy="14" r="46" fill="none" stroke="${fg}" stroke-opacity=".16" stroke-width=".35"/><circle cx="6" cy="96" r="20" fill="${second}" opacity=".18"/>`,
    `<circle cx="12" cy="10" r="26" fill="${accent}" opacity=".2"/><circle cx="96" cy="80" r="30" fill="none" stroke="${fg}" stroke-opacity=".16" stroke-width=".35"/><circle cx="96" cy="80" r="18" fill="${second}" opacity=".16"/>`,
    `<path d="M-5 70 Q 40 40 105 62 L105 105 L-5 105Z" fill="${accent}" opacity=".16"/><circle cx="80" cy="22" r="14" fill="none" stroke="${fg}" stroke-opacity=".2" stroke-width=".35"/>`,
  ][variant % 3];
  return `<svg class="deco" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${v}</svg>`;
}

function servicePage(c: ServiceCard, b: ServiceBrandInput, photoUri: string | null, variant: number) {
  const { w, h } = SERVICE_SIZES[c.format];
  const u = Math.min(w, h) / 100;
  const p = b.palette;
  const deep = isDark(p.primary) ? p.primary : withLightness(p.primary, Math.min(0.32, hsl(p.primary)[2]));
  const deeper = withLightness(deep, Math.max(0.07, hsl(deep)[2] - 0.1));
  const cream = mix(p.light, "#FFFFFF", 0.35);
  const ink = withLightness(p.dark, 0.12);
  const accent = p.accent;
  const H = b.typo.heading, B = b.typo.body;
  const hw = b.typo.headingWeight ?? 500;
  const upperCase = b.typo.uppercase ? "uppercase" : "none";
  const tall = h / w > 1.6;
  const wide = w > h * 1.2;
  const side = wide ? w * 0.06 : 7 * u;
  const top = tall ? h * 0.12 : 6.5 * u;
  const bottom = tall ? h * 0.2 : 6.5 * u;
  const onDeep = onColor(deep);
  const ctaBg = accent;
  const ctaFg = onColor(accent);
  const chips = (c.chips ?? []).filter(Boolean).slice(0, 3).map((x) => `<li>${esc(x)}</li>`).join("");
  const cta = c.cta ? `<span class="cta">${esc(c.cta)} <b aria-hidden="true">→</b></span>` : "";
  const word = `<span class="wordmark">${esc(b.brand)}</span>`;
  const css = `
    *{box-sizing:border-box;margin:0;padding:0}
    html,body{width:${w}px;height:${h}px;overflow:hidden}
    body{font-family:"${B}",sans-serif;-webkit-font-smoothing:antialiased}
    .stage{position:relative;width:${w}px;height:${h}px;overflow:hidden}
    .deco{position:absolute;inset:0;width:100%;height:100%}
    .bgimg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
    .h{font-family:"${H}",serif;font-weight:${hw};text-transform:${upperCase};letter-spacing:-.015em;line-height:1.04;text-wrap:balance}
    .eyebrow{font-size:${2.4 * u}px;letter-spacing:.2em;text-transform:uppercase;font-weight:600}
    .pill{display:inline-block;padding:${1.1 * u}px ${2.2 * u}px;border-radius:999px;font-size:${2.2 * u}px;letter-spacing:.16em;text-transform:uppercase;font-weight:600}
    .txt{font-size:${3.1 * u}px;line-height:1.4;display:-webkit-box;-webkit-box-orient:vertical;overflow:hidden}
    .chips{display:flex;flex-wrap:wrap;gap:${1.2 * u}px;list-style:none}
    .chips li{padding:${1 * u}px ${2.2 * u}px;border-radius:999px;font-size:${2.5 * u}px;font-weight:600}
    .cta{display:inline-flex;align-items:center;gap:${1.2 * u}px;padding:${2.1 * u}px ${4.2 * u}px;border-radius:999px;font-size:${3.1 * u}px;font-weight:600;background:${ctaBg};color:${ctaFg};align-self:flex-start;white-space:nowrap}
    .wordmark{font-family:"${H}",serif;font-weight:${Math.max(hw, 500)};font-size:${3.2 * u}px;letter-spacing:.14em;text-transform:uppercase}
    .fit{display:block}
    .topbar{position:absolute;left:${side}px;right:${side}px;top:${top}px;display:flex;justify-content:space-between;align-items:center;gap:${2 * u}px}
    .contact{font-size:${2.6 * u}px;opacity:.85}`;
  const shade = (strength = 0.78) => `<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.28) 0%,rgba(0,0,0,0) 26%,rgba(0,0,0,0) 40%,rgba(0,0,0,${strength}) 100%)"></div>`;
  const darkBg = `background:radial-gradient(120% 90% at 20% 10%, ${mix(deep, "#FFFFFF", 0.12)} 0%, ${deep} 50%, ${deeper} 100%)`;
  const counter = c.total ? `<span class="pill" style="background:${mix(ink, cream, 0.92)};color:${ink}">${c.index ?? 1} / ${c.total}</span>` : "";
  const T = c.template;

  if (T === "graphic") {
    // Bannière sans texte (les textes vivent dans le site, modifiables).
    return `<style>${css}</style><div class="stage" style="${photoUri ? "background:#000" : darkBg}">${photoUri ? `<img class="bgimg" src="${photoUri}" alt=""><div style="position:absolute;inset:0;background:linear-gradient(90deg, ${deep}cc 0%, ${deep}55 38%, rgba(0,0,0,0) 70%)"></div>` : deco(onDeep, accent, p.secondary, variant)}</div>`;
  }

  if (T === "announce" || T === "booking") {
    const hasPhoto = !!photoUri;
    const fg = "#FFFFFF";
    const title = c.title ?? "";
    const size = tall ? 9.6 * u : wide ? 7.4 * u : 8.4 * u;
    const box = wide
      ? `left:${side}px;width:${w * 0.5}px;top:0;bottom:0;justify-content:center`
      : `left:${side}px;right:${side}px;bottom:${bottom}px`;
    const bg = hasPhoto
      ? `<img class="bgimg" src="${photoUri}" alt="">${wide ? `<div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(0,0,0,.78) 0%,rgba(0,0,0,.5) 45%,rgba(0,0,0,0) 75%)"></div>` : shade(0.82)}`
      : deco(onDeep, accent, p.secondary, variant);
    const big = !hasPhoto && !wide ? `<div class="h" aria-hidden="true" style="position:absolute;right:${side * 0.6}px;top:${top + 8 * u}px;font-size:${44 * u}px;line-height:.8;color:${accent};opacity:.22">${esc((b.brand.trim()[0] ?? "").toUpperCase())}</div>` : "";
    return `<style>${css}
      .col{position:absolute;${box};display:flex;flex-direction:column;gap:${2.4 * u}px;color:${fg}}
      .col .h{font-size:${size}px;max-height:${size * 1.04 * (tall ? 4.2 : 3.2)}px}
      .col .txt{-webkit-line-clamp:${tall ? 4 : 3};opacity:.9;max-width:${wide ? w * 0.46 : w * 0.82}px}
      .chips li{background:rgba(255,255,255,.16);color:#fff;backdrop-filter:blur(6px)}
      ${hasPhoto ? ".topbar .wordmark,.col{text-shadow:0 1px 10px rgba(0,0,0,.45)}.col .cta,.chips li{text-shadow:none}" : ""}
      </style><div class="stage" style="${hasPhoto ? "background:#111" : darkBg};color:${fg}">${bg}${big}
      <div class="topbar">${word}${c.eyebrow && !wide ? `<span class="pill" style="background:${hasPhoto ? "rgba(255,255,255,.92)" : accent};color:${hasPhoto ? ink : ctaFg}">${esc(c.eyebrow)}</span>` : ""}</div>
      <div class="col">${wide && c.eyebrow ? `<p class="eyebrow" style="color:${mix(accent, "#FFFFFF", 0.35)}">${esc(c.eyebrow)}</p>` : ""}<p class="h fit">${esc(title)}</p>${c.text ? `<p class="txt">${esc(c.text)}</p>` : ""}${chips ? `<ul class="chips">${chips}</ul>` : ""}${cta}${c.contact ? `<p class="contact">${esc(c.contact)}</p>` : ""}</div></div>`;
  }

  if (T === "carousel-cover" || T === "carousel-slide") {
    const cover = T === "carousel-cover";
    const bg = cover ? cream : variant % 2 ? mix(p.secondary, cream, 0.55) : cream;
    const num = String(c.index ?? 1).padStart(2, "0");
    const dots = c.total ? Array.from({ length: c.total }, (_, k) => `<i style="width:${k + 1 === c.index ? 5 * u : 1.4 * u}px;background:${k + 1 === c.index ? ink : mix(ink, bg, 0.75)}"></i>`).join("") : "";
    const size = cover ? (tall ? 11 * u : 9.6 * u) : 7 * u;
    return `<style>${css}
      .stage{background:${bg};color:${ink}}
      .main{position:absolute;left:${side}px;right:${side}px;top:${top + 12 * u}px;bottom:${bottom + 12 * u}px;display:flex;flex-direction:column;justify-content:${cover ? "center" : "flex-start"};gap:${3 * u}px}
      .main .h{font-size:${size}px;max-height:${size * 1.04 * (cover ? 4.2 : 3.2)}px}
      .num{font-family:"${H}",serif;font-weight:${Math.max(hw, 600)};font-size:${16 * u}px;line-height:.9;color:${accent}}
      .main .txt{-webkit-line-clamp:${tall ? 9 : 6};font-size:${3.5 * u}px;color:${mix(ink, bg, 0.2)}}
      .foot{position:absolute;left:${side}px;right:${side}px;bottom:${bottom}px;display:flex;justify-content:space-between;align-items:center}
      .dots{display:flex;gap:${1 * u}px}.dots i{display:block;height:${1.4 * u}px;border-radius:999px}
      .swipe{font-size:${2.8 * u}px;font-weight:600}
      </style><div class="stage">${cover ? deco(ink, accent, p.secondary, variant) : ""}
      <div class="topbar">${cover && c.eyebrow ? `<span class="pill" style="background:${ink};color:${cream}">${esc(c.eyebrow)}</span>` : `<span class="eyebrow" style="color:${mix(ink, bg, 0.3)}">${esc(c.eyebrow ?? "")}</span>`}${counter}</div>
      <div class="main">${cover ? "" : `<span class="num">${num}</span>`}<p class="h fit">${esc(c.title ?? "")}</p>${c.text ? `<p class="txt">${esc(c.text)}</p>` : ""}</div>
      <div class="foot">${word}${cover && c.swipe ? `<span class="swipe">${esc(c.swipe)} →</span>` : `<span class="dots">${dots}</span>`}</div></div>`;
  }

  if (T === "carousel-end" || T === "quote") {
    const quote = T === "quote";
    const size = quote ? (tall ? 8.2 * u : 6.8 * u) : tall ? 10 * u : 8.4 * u;
    return `<style>${css}
      .stage{${darkBg};color:${onDeep}}
      .main{position:absolute;left:${side}px;right:${side}px;top:${top + 10 * u}px;bottom:${bottom + 8 * u}px;display:flex;flex-direction:column;justify-content:center;gap:${3 * u}px}
      .main .h{font-size:${size}px;max-height:${size * 1.1 * (quote ? 5.2 : 3.2)}px;${quote ? "font-style:italic;line-height:1.12" : ""}}
      .mark{font-family:"${H}",serif;font-size:${30 * u}px;line-height:.6;height:${12 * u}px;color:${accent}}
      .author{font-size:${3 * u}px;letter-spacing:.12em;text-transform:uppercase;opacity:.85}
      .main .txt{-webkit-line-clamp:3;opacity:.85}
      </style><div class="stage">${deco(onDeep, accent, p.secondary, variant + 1)}
      <div class="topbar">${word}${counter.replace(mix(ink, cream, 0.92), "rgba(255,255,255,.14)").replace(`color:${ink}`, `color:${onDeep}`)}</div>
      <div class="main">${quote ? `<span class="mark" aria-hidden="true">“</span>` : ""}${!quote && c.eyebrow ? `<p class="eyebrow" style="color:${mix(accent, "#FFFFFF", 0.3)}">${esc(c.eyebrow)}</p>` : ""}<p class="h fit">${esc(c.title ?? "")}</p>${c.text ? `<p class="txt">${esc(c.text)}</p>` : ""}${quote && c.author ? `<p class="author">${esc(c.author)}</p>` : ""}${cta}${c.contact ? `<p class="contact">${esc(c.contact)}</p>` : ""}</div></div>`;
  }

  if (T === "info") {
    const rows = (c.rows ?? []).slice(0, 5);
    const size = tall ? 9 * u : 7.2 * u;
    const rs = rows.length > 3 ? 3.2 * u : 3.6 * u;
    return `<style>${css}
      .stage{background:${cream};color:${ink}}
      .main{position:absolute;left:${side}px;right:${side}px;top:${top + 11 * u}px;bottom:${bottom}px;display:flex;flex-direction:column;gap:${3.4 * u}px}
      .main .h{font-size:${size}px;max-height:${size * 1.04 * 2.2}px}
      .rows{display:grid;gap:${2.2 * u}px;list-style:none}
      .rows li{display:flex;align-items:center;gap:${2.4 * u}px;padding:${2 * u}px ${2.4 * u}px;border-radius:${2.4 * u}px;background:#fff;box-shadow:0 ${0.6 * u}px ${2.4 * u}px -${1 * u}px rgba(0,0,0,.18);font-size:${rs}px;font-weight:500;line-height:1.3}
      .rows i{flex:none;display:grid;place-items:center;width:${7.4 * u}px;height:${7.4 * u}px;border-radius:50%;background:${mix(accent, "#FFFFFF", 0.78)}}
      .rows svg{width:${3.8 * u}px;height:${3.8 * u}px}
      .rows span{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}
      .main .cta{margin-top:auto;background:${ink};color:${cream}}
      </style><div class="stage">${deco(ink, accent, p.secondary, variant + 2)}
      <div class="topbar">${word}${c.eyebrow ? `<span class="pill" style="background:${ink};color:${cream}">${esc(c.eyebrow)}</span>` : ""}</div>
      <div class="main"><p class="h fit">${esc(c.title ?? "")}</p><ul class="rows">${rows.map((r) => `<li><i>${icon(r.icon, withLightness(accent, Math.min(0.4, hsl(accent)[2])))}</i><span>${esc(r.text)}</span></li>`).join("")}</ul>${cta}</div></div>`;
  }

  // Liste des prestations : colonne de texte et photo (ou panneau graphique).
  const items = (c.items ?? []).slice(0, wide ? 5 : 4);
  const size = wide ? 6.4 * u : 7.6 * u;
  const isize = items.length > 4 ? 3.2 * u : 3.6 * u;
  const visual = photoUri ? `<img class="bgimg" src="${photoUri}" alt="" style="border-radius:${wide ? 0 : 3 * u}px">` : `<div style="position:absolute;inset:0;${darkBg}">${deco(onDeep, accent, p.secondary, variant)}<div class="h" aria-hidden="true" style="position:absolute;inset:0;display:grid;place-items:center;font-size:${(wide ? 52 : 34) * u}px;color:${accent};opacity:.32">${esc((b.brand.trim()[0] ?? "").toUpperCase())}</div></div>`;
  const vbox = wide ? `left:${w * 0.56}px;right:0;top:0;bottom:0` : `left:${side}px;right:${side}px;top:${top + 9 * u}px;height:${h * (tall ? 0.24 : 0.26)}px;border-radius:${3 * u}px;overflow:hidden`;
  const cbox = wide ? `left:${side}px;width:${w * 0.44}px;top:0;bottom:0;justify-content:center` : `left:${side}px;right:${side}px;top:${top + 9 * u + h * (tall ? 0.24 : 0.26) + 4 * u}px;bottom:${bottom}px`;
  return `<style>${css}
    .stage{background:${cream};color:${ink}}
    .vis{position:absolute;${vbox};overflow:hidden}
    .col{position:absolute;${cbox};display:flex;flex-direction:column;gap:${2.6 * u}px}
    .col .h{font-size:${size}px;max-height:${size * 1.04 * 2.2}px}
    .list{list-style:none;display:grid}
    .list li{display:flex;justify-content:space-between;align-items:baseline;gap:${2 * u}px;padding:${1.6 * u}px 0;border-bottom:1px solid ${mix(ink, cream, 0.82)};font-size:${isize}px;font-weight:500}
    .list li span:first-child{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:1;overflow:hidden}
    .list li span:last-child{flex:none;font-size:${isize * 0.8}px;color:${mix(ink, cream, 0.35)}}
    .col .cta{background:${ink};color:${cream}}
    </style><div class="stage"><div class="vis">${visual}</div>
    ${wide ? "" : `<div class="topbar">${word}</div>`}
    <div class="col">${c.eyebrow ? `<p class="eyebrow" style="color:${withLightness(accent, Math.min(0.42, hsl(accent)[2]))}">${esc(c.eyebrow)}</p>` : ""}<p class="h fit">${esc(c.title ?? "")}</p><ul class="list">${items.map((it) => `<li><span>${esc(it.name)}</span>${it.meta ? `<span>${esc(it.meta)}</span>` : "<span></span>"}</li>`).join("")}</ul>${cta}${c.contact ? `<p class="contact">${esc(c.contact)}</p>` : ""}</div></div>`;
}

/** Rend les visuels de services (navigateur sans interface). Sans Chromium : null (repli Skia chez l'appelant). */
export async function renderServiceCreatives(brand: ServiceBrandInput, cards: ServiceCard[]): Promise<{ card: ServiceCard; label: string; jpg: Buffer }[] | null> {
  const exe = chromiumPath();
  if (!exe || !cards.length) return null;
  let chromium: typeof import("playwright").chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    return null;
  }
  const faces = fontFaces([brand.typo.heading, brand.typo.body]);
  const photoCache = new Map<Buffer, string>();
  const uri = async (buf: Buffer) => {
    if (!photoCache.has(buf)) photoCache.set(buf, `data:image/jpeg;base64,${(await sharp(buf).rotate().resize(1800, 1800, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer()).toString("base64")}`);
    return photoCache.get(buf)!;
  };
  const browser = await chromium.launch({ executablePath: exe, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  try {
    const out: { card: ServiceCard; label: string; jpg: Buffer }[] = [];
    for (const [k, c] of cards.entries()) {
      const { w, h, label } = SERVICE_SIZES[c.format];
      const pg = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
      await pg.setContent(`<!doctype html><html lang="${contentLang()}"><head><meta charset="utf-8"><style>${faces}</style></head><body>${servicePage(c, brand, c.photo ? await uri(c.photo) : null, k)}</body></html>`, { waitUntil: "load" });
      await pg.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all([...document.images].map((img) => (img.complete ? null : new Promise((r) => ((img.onload = r), (img.onerror = r))))));
        document.querySelectorAll<HTMLElement>(".fit").forEach((el) => {
          const max = parseFloat(getComputedStyle(el).maxHeight);
          let size = parseFloat(getComputedStyle(el).fontSize);
          if (!max || Number.isNaN(max)) return;
          el.style.maxHeight = "none";
          while (el.scrollHeight > max && size > 22) {
            size *= 0.94;
            el.style.fontSize = `${size}px`;
          }
        });
        // Colonne de texte trop haute pour sa zone : on réduit tout le bloc (jamais de texte coupé hors cadre).
        document.querySelectorAll<HTMLElement>(".col,.main").forEach((col) => {
          const fit = col.querySelector<HTMLElement>(".fit");
          let guard = 0;
          const bar = document.querySelector<HTMLElement>(".topbar");
          const limit = bar && bar.offsetHeight ? bar.getBoundingClientRect().bottom + 12 : 0;
          const first = col.firstElementChild as HTMLElement | null;
          // (pas de fonction nommée ici : le code est sérialisé vers le navigateur)
          while ((col.scrollHeight > col.clientHeight + 1 || (!!first && first.getBoundingClientRect().top < limit)) && guard++ < 30) {
            if (fit) fit.style.fontSize = `${parseFloat(getComputedStyle(fit).fontSize) * 0.94}px`;
            col.querySelectorAll<HTMLElement>(".txt,.list li,.rows li").forEach((t) => (t.style.fontSize = `${parseFloat(getComputedStyle(t).fontSize) * 0.97}px`));
          }
        });
      });
      out.push({ card: c, label, jpg: await pg.screenshot({ type: "jpeg", quality: 92 }) });
      await pg.close();
    }
    return out;
  } finally {
    await browser.close();
  }
}
