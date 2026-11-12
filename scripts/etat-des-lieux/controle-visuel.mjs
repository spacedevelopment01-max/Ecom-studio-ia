/**
 * PROTOTYPE du contrôle visuel automatique, SANS IA (proposition de l'état des lieux du 12 novembre 2026).
 * Il ouvre une page comme un visiteur, en largeur ordinateur et téléphone, et mesure section par section :
 *  débordements, textes peu lisibles (contraste mesuré sur les vrais pixels), images cassées / en double / floues,
 *  liens morts, vides, colonnes étroites, sections collées, titres mal alignés, textes trop petits et boutons trop
 *  petits sur téléphone, erreurs de script. Chaque défaut est entouré en rouge sur une capture.
 * Usage : node controle-visuel.mjs <dossier d'audit> <dossier de sortie> <compte> <chemin> <nom> [pages séparées par des virgules]
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { chromium, auditOf, contextFor } from "./session.mjs";
const require = createRequire(process.cwd() + "/");
const sharp = require("sharp");

const [auditDir, outDir, who, urlPath, name, pagesArg] = process.argv.slice(2);
const audit = auditOf(auditDir);
fs.mkdirSync(outDir, { recursive: true });
const WIDTHS = [["ordinateur", 1440, 900], ["telephone", 390, 844]];

const lum = (r, g, b) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

/** Tout ce qu'on mesure dans la page pour UNE section (coordonnées relatives à la section). */
async function measureSection(el, phone) {
  const R = el.getBoundingClientRect();
  const rel = (r) => ({ x: Math.round(r.left - R.left), y: Math.round(r.top - R.top), w: Math.round(r.width), h: Math.round(r.height) });
  const opac = (e) => { let o = 1; for (let p = e; p && p !== document.documentElement; p = p.parentElement) o *= parseFloat(getComputedStyle(p).opacity || "1"); return o; };
  const vis = (e) => { const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false; if (e.checkVisibility && !e.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false; return opac(e) > 0.25; };
  const inside = (r) => r.bottom > R.top + 1 && r.top < R.bottom - 1;
  const clipped = (e) => { for (let p = e.parentElement; p && p !== el.parentElement; p = p.parentElement) { const s = getComputedStyle(p); if (/(hidden|clip|auto|scroll)/.test(s.overflowX)) { const pr = p.getBoundingClientRect(), r = e.getBoundingClientRect(); if (r.right <= pr.left + 1 || r.left >= pr.right - 1 || r.bottom <= pr.top + 1 || r.top >= pr.bottom - 1) return "out"; return "scroller"; } } return null; };
  const texts = [], ranges = [];
  const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  // Un relevé par morceau de texte (le rectangle des LETTRES seulement, jamais celui d'une icône voisine).
  for (let n = tw.nextNode(); n && texts.length < 320; n = tw.nextNode()) {
    const t = n.nodeValue.replace(/\s+/g, " ").trim();
    const p = n.parentElement;
    if (t.length < 2 || !/[\p{L}\p{N}]/u.test(t) || !p || /^(SCRIPT|STYLE|TEMPLATE|OPTION|NOSCRIPT|TITLE)$/.test(p.tagName) || p.closest("template,svg,[aria-hidden='true']")) continue;
    if (!vis(p)) continue;
    const range = document.createRange(); range.selectNodeContents(n);
    const r = range.getBoundingClientRect();
    if (r.width < 2 || r.height < 2 || !inside(r)) continue;
    const c = clipped(p); if (c === "out") continue;
    // Texte coupé par son propre cadre (masqué en partie) : seul le morceau visible compte.
    const s = getComputedStyle(p);
    const fill = s.webkitTextFillColor || s.color;
    ranges.push({ range, p });
    texts.push({ t: t.slice(0, 70), ...rel(r), size: parseFloat(s.fontSize), weight: parseInt(s.fontWeight, 10) || 400, color: fill, clipText: /text/.test(s.webkitBackgroundClip || s.backgroundClip || ""), dim: opac(p) < 0.9, stroke: parseFloat(s.webkitTextStrokeWidth || "0") > 0, align: s.textAlign, tag: p.tagName.toLowerCase(), heading: !!p.closest("h1,h2,h3"), inScroller: c === "scroller", left: Math.round(r.left), right: Math.round(r.right), fixed: !!p.closest("[style*='position:fixed'],[style*='position: fixed']") });
  }
  // Qui est AU-DESSUS de chaque texte ? (face cachée d'une carte qui se retourne, texte recouvert par un autre élément)
  const paints = (e) => { if (!e) return false; if (/^(IMG|VIDEO|CANVAS|PICTURE)$/.test(e.tagName) || e.closest("svg")) return "image"; const cs = getComputedStyle(e); const own = [...e.childNodes].some((n) => n.nodeType === 3 && n.nodeValue.trim().length > 1); if (own) return "texte"; if (/url\(|gradient/.test(cs.backgroundImage)) return "fond"; const m = /rgba?\(([^)]+)\)/.exec(cs.backgroundColor); if (m) { const a = m[1].split(/[,\s/]+/).filter(Boolean).map(Number)[3]; if (a === undefined || a > 0.5) return "fond"; } return false; };
  const startY = scrollY, top0 = R.top + scrollY, bottom0 = top0 + R.height, vh = innerHeight;
  for (let y = Math.max(0, top0 - 150); y < bottom0; y += Math.max(200, vh - 260)) {
    scrollTo(0, y); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    ranges.forEach(({ range, p }, i) => {
      if (texts[i].hit) return;
      const r = range.getBoundingClientRect(); const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      if (cx < 1 || cx > innerWidth - 1 || cy < 140 || cy > vh - 20) return;
      texts[i].hit = true;
      const top = document.elementFromPoint(cx, cy);
      if (!top || top === p || p.contains(top) || top.contains(p)) return;
      const what = paints(top); if (!what) return; // voile transparent ou lien étiré : rien ne cache le texte
      let back = false; for (let q = p; q && q !== el.parentElement; q = q.parentElement) if (getComputedStyle(q).backfaceVisibility === "hidden") { back = true; break; }
      texts[i].covered = back ? "face cachée" : what;
      if (!back) texts[i].coveredBy = `${top.tagName.toLowerCase()}.${String(top.className).slice(0, 28)}` + (what === "texte" ? ` « ${(top.innerText || "").replace(/\s+/g, " ").trim().slice(0, 26)} »` : "");
    });
  }
  scrollTo(0, startY); await new Promise((r) => requestAnimationFrame(r));
  const images = [...el.querySelectorAll("img")].filter((i) => vis(i) && inside(i.getBoundingClientRect()) && clipped(i) !== "out").map((i) => { const r = i.getBoundingClientRect(); return { src: (i.currentSrc || i.src || "").replace(location.origin, "").slice(0, 160), nw: i.naturalWidth, nh: i.naturalHeight, complete: i.complete, fit: getComputedStyle(i).objectFit, ...rel(r) }; });
  const bgImages = [...el.querySelectorAll("*"), el].filter((e) => /url\(/.test(getComputedStyle(e).backgroundImage) && vis(e)).map((e) => ({ src: (getComputedStyle(e).backgroundImage.match(/url\(["']?([^"')]+)/)?.[1] ?? "").replace(location.origin, "").slice(0, 160), ...rel(e.getBoundingClientRect()) }));
  const media = [...el.querySelectorAll("video,canvas,iframe,svg")].filter((e) => vis(e) && e.getBoundingClientRect().width > 40).map((e) => rel(e.getBoundingClientRect()));
  const links = [...el.querySelectorAll("a,button")].filter((a) => vis(a) && inside(a.getBoundingClientRect()) && clipped(a) !== "out").map((a) => { const r = a.getBoundingClientRect(); const href = a.tagName === "A" ? a.getAttribute("href") : null; const dead0 = a.tagName === "A" && (!href || href === "#" || /^javascript:/i.test(href)); if (dead0) a.setAttribute("data-cv-dead", String(document.querySelectorAll("[data-cv-dead]").length)); return { cvid: a.getAttribute("data-cv-dead"), tag: a.tagName.toLowerCase(), href, t: (a.innerText || a.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim().slice(0, 40), dead: a.tagName === "A" && (!href || href === "#" || /^javascript:/i.test(href)), ...rel(r) }; });
  // Débordement : un élément qui dépasse de l'écran sans être dans une zone qui défile ou qui coupe.
  const vw = document.documentElement.clientWidth;
  const wide = [...el.querySelectorAll("*")].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 4 && r.height > 4 && (r.right > vw + 3 || r.left < -3) && vis(e) && !clipped(e) && getComputedStyle(e).position !== "fixed"; }).slice(0, 6).map((e) => ({ what: `${e.tagName.toLowerCase()}.${String(e.className).slice(0, 30)}`, ...rel(e.getBoundingClientRect()) }));
  const cs = getComputedStyle(el);
  return { uid: el.getAttribute("data-ct"), role: el.getAttribute("data-ct-role"), cls: String(el.className).slice(0, 60), abs: { x: Math.round(R.left + scrollX), y: Math.round(R.top + scrollY), w: Math.round(R.width), h: Math.round(R.height) }, bg: cs.backgroundColor, bgImg: /url\(/.test(cs.backgroundImage), padTop: parseFloat(cs.paddingTop), padBottom: parseFloat(cs.paddingBottom), texts, images, bgImages, media, links, wide, vw, phone };
}

function parseColor(c) { const m = /rgba?\(([^)]+)\)/.exec(c || ""); if (!m) return null; const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p[3] ?? 1 }; }

/** Contraste d'un texte mesuré sur les vrais pixels de la section capturée SANS ses textes. */
function contrastOf(text, raw, info) {
  const col = parseColor(text.color); if (!col || text.clipText || col.a < 0.3) return null;
  const x0 = Math.max(0, text.x), y0 = Math.max(0, text.y), x1 = Math.min(info.width, text.x + text.w), y1 = Math.min(info.height, text.y + text.h);
  if (x1 - x0 < 3 || y1 - y0 < 3) return null;
  const ratios = []; const step = Math.max(1, Math.floor(Math.sqrt(((x1 - x0) * (y1 - y0)) / 900)));
  for (let y = y0; y < y1; y += step) for (let x = x0; x < x1; x += step) {
    const i = (y * info.width + x) * info.channels; const br = raw[i], bg = raw[i + 1], bb = raw[i + 2];
    const fr = col.r * col.a + br * (1 - col.a), fg = col.g * col.a + bg * (1 - col.a), fb = col.b * col.a + bb * (1 - col.a);
    ratios.push(ratio(lum(fr, fg, fb), lum(br, bg, bb)));
  }
  if (!ratios.length) return null; ratios.sort((a, b) => a - b);
  return { worst: ratios[Math.floor(ratios.length * 0.15)], median: ratios[Math.floor(ratios.length / 2)] };
}

const browser = await chromium.launch();
const all = [];
for (const [device, w, h] of WIDTHS) {
  const phone = device === "telephone";
  const ctx = await contextFor(browser, auditDir, who === "-" ? null : who, { viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: phone, hasTouch: phone, locale: "fr-FR" });
  // CV_REMPLI=1 : la banque est mesurée avec ses exemples remplis (et non en « sections vierges »).
  if (process.env.CV_REMPLI === "1") await ctx.addInitScript(() => { try { localStorage.setItem("ct-blank", "0"); } catch {} });
  const page = await ctx.newPage();
  const scriptErrors = [];
  page.on("pageerror", (e) => scriptErrors.push(String(e.message).slice(0, 200)));
  let cspBlocked = 0;
  page.on("console", (m) => { if (m.type() !== "error") return; if (/Content Security Policy/.test(m.text())) { cspBlocked++; return; } scriptErrors.push(`console : ${m.text().slice(0, 200)}`); });
  await page.goto(/^(file|https?):/.test(urlPath) ? urlPath : audit.origin + urlPath, { waitUntil: "networkidle", timeout: 60000 });
  await page.addStyleTag({ content: "html.cv-notext *{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;caret-color:transparent!important}html.cv-notext *::placeholder{color:transparent!important}html.cv-still *{animation-play-state:paused!important;transition:none!important}html.cv-nohead [data-ct-role=header]{visibility:hidden!important}.tb-bar{position:static!important}.cg-panel{position:static!important}.ct-blank-sw{display:none!important}" });
  const pageKeys = pagesArg ? pagesArg.split(",") : await page.evaluate(() => { const b = [...document.querySelectorAll("[data-pgb]")].map((x) => x.dataset.pgb); return b.length ? b : [null]; });
  for (const key of pageKeys) {
    if (key) { await page.evaluate((k) => document.querySelector(`[data-pgb="${k}"]`)?.click(), key); await page.waitForTimeout(500); }
    // Défilement lent jusqu'en bas : les animations d'apparition se déclenchent comme pour un visiteur.
    const total = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < total; y += Math.round(h * 0.7)) { await page.evaluate((yy) => scrollTo(0, yy), y); await page.waitForTimeout(110); }
    await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(350);
    const pageOverflow = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    const handles = await page.$$(key ? `[data-ct-role="header"], main[data-pg="${key}"] [data-ct], [data-ct-role="footer"]` : "[data-ct]");
    const sections = [];
    for (const [i, hd] of handles.entries()) {
      const box = await hd.boundingBox(); if (!box || box.height < 8 || box.width < 8) continue;
      await hd.scrollIntoViewIfNeeded().catch(() => {}); await page.waitForTimeout(140);
      const m = await hd.evaluate(measureSection, phone);
      if (m.abs.h > 6000) { sections.push({ ...m, issues: [], skipped: "section trop haute pour la mesure" }); continue; }
      const file = `${name}--${key ?? "page"}--${String(i).padStart(2, "0")}-${m.uid ?? "s"}--${device}`;
      await page.evaluate((isHead) => { document.documentElement.classList.add("cv-still"); document.documentElement.classList.toggle("cv-nohead", !isHead); }, m.role === "header");
      let shot = null, bare = null;
      try {
        shot = await hd.screenshot({ type: "png", timeout: 15000 });
        await page.evaluate(() => document.documentElement.classList.add("cv-notext"));
        bare = await hd.screenshot({ type: "png", timeout: 15000 });
      } catch (e) { m.shotError = String(e.message).slice(0, 100); }
      await page.evaluate(() => document.documentElement.classList.remove("cv-notext", "cv-still", "cv-nohead"));
      const issues = [];
      const add = (type, text, box2, level = "défaut") => issues.push({ type, text, box: box2 ?? null, level });
      // 1. Débordement
      for (const x of m.wide) add("débordement", `« ${x.what} » dépasse de l'écran`, x);
      // 2. Lisibilité (contraste mesuré)
      if (bare) {
        const { data, info } = await sharp(bare).raw().toBuffer({ resolveWithObject: true });
        for (const t of m.texts.slice(0, 220)) {
          if (t.dim || t.stroke || t.covered) continue; // estompé exprès, lettres au contour, ou texte sous un autre élément
          const c = contrastOf(t, data, info); if (!c) continue;
          const large = t.size >= 24 || (t.size >= 18.5 && t.weight >= 700);
          const need = large ? 3 : 4.5;
          // Défaut franc : vraiment difficile à lire. « À regarder » : sous la norme d'accessibilité, mais lisible (blanc sur orange…).
          const hard = large ? (t.size >= 60 ? 1.7 : 2.2) : 3;
          if (c.worst < need * 0.82) add("lisibilité", `« ${t.t.slice(0, 44)} » : contraste ${c.worst.toFixed(1)} pour ${need} demandé (${Math.round(t.size)} px)`, t, c.worst < hard ? "défaut" : "à regarder");
          t.contrast = +c.worst.toFixed(2);
        }
      }
      // 2 bis. Textes recouverts par un autre élément (deux textes superposés : défaut franc)
      const cov = m.texts.filter((t) => t.covered && t.covered !== "face cachée" && !t.dim);
      const covText = cov.filter((t) => t.covered === "texte");
      if (covText.length) add("textes superposés", `« ${covText[0].t.slice(0, 32)} » est recouvert par ${covText[0].coveredBy}${covText.length > 1 ? ` (+ ${covText.length - 1} autre(s))` : ""}`, covText[0]);
      const covOther = cov.filter((t) => t.covered !== "texte");
      if (covOther.length) add("texte recouvert", `« ${covOther[0].t.slice(0, 32)} » passe sous ${covOther[0].coveredBy}${covOther.length > 1 ? ` (+ ${covOther.length - 1} autre(s))` : ""}`, covOther[0], "à regarder");
      // 3. Images
      const srcCount = {};
      for (const im of m.images) {
        if (im.complete && im.nw === 0) add("image cassée", `image absente : ${im.src.slice(-50)}`, im);
        else if (im.w >= 120 && im.nw && im.nw < im.w * 0.62) add("image floue", `image de ${im.nw} px affichée sur ${im.w} px`, im);
        if (im.w >= 90 && im.h >= 90 && im.src) (srcCount[im.src] ??= []).push(im);
      }
      for (const [src, list] of Object.entries(srcCount)) if (list.length > 1) add("image en double", `la même image ${list.length} fois : ${src.slice(-40)}`, list[1]);
      // 4. Liens morts
      const dead = [];
      for (const l of m.links.filter((x) => x.dead && x.cvid != null).slice(0, 6)) {
        const did = await page.evaluate(async (cvid) => {
          const a = document.querySelector(`[data-cv-dead="${cvid}"]`); if (!a) return true;
          const before = { pg: [...document.querySelectorAll("main[data-pg]")].find((x) => x.getBoundingClientRect().height > 0)?.dataset.pg, url: location.href, y: scrollY };
          let changed = 0; const mo = new MutationObserver((list) => { for (const r of list) if (!a.contains(r.target) && r.attributeName !== "data-cv-dead") changed++; });
          mo.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["class", "hidden", "open", "style", "aria-expanded", "aria-hidden"] });
          a.click(); await new Promise((r) => setTimeout(r, 350)); mo.disconnect();
          const after = { pg: [...document.querySelectorAll("main[data-pg]")].find((x) => x.getBoundingClientRect().height > 0)?.dataset.pg, url: location.href, y: scrollY };
          const moved = before.pg !== after.pg || before.url !== after.url || Math.abs(before.y - after.y) > 40;
          return moved || changed > 0 ? (moved ? "moved" : "changed") : false;
        }, l.cvid).catch(() => "moved");
        if (did === false) dead.push(l);
        if (did === "moved") { // retour à la page contrôlée
          await page.keyboard.press("Escape").catch(() => {});
          if (key) { await page.evaluate((k) => document.querySelector(`[data-pgb="${k}"]`)?.click(), key); await page.waitForTimeout(250); }
        } else if (did === "changed") await page.keyboard.press("Escape").catch(() => {});
      }
      await page.evaluate(() => document.querySelectorAll("[data-cv-dead]").forEach((x) => x.removeAttribute("data-cv-dead")));
      if (dead.length) add("bouton sans effet", `${dead.length} bouton(s) ou lien(s) où rien ne se passe au clic : ${dead.slice(0, 4).map((l) => `« ${l.t || "?"} »`).join(", ")}`, dead[0]);
      // Bouton collé au texte du dessus
      for (const b of m.links.filter((x) => x.h >= 30 && x.w >= 60).slice(0, 12)) {
        const above = m.texts.filter((t) => !t.dim && t.y + t.h <= b.y + 6 && t.y + t.h >= b.y - 9 && t.x < b.x + b.w && t.x + t.w > b.x && !(t.x >= b.x - 2 && t.x + t.w <= b.x + b.w + 2 && t.y >= b.y - 2));
        if (above.length) { add("bouton collé au texte", `« ${b.t || "bouton"} » est à ${Math.max(0, b.y - (above[0].y + above[0].h))} px du texte « ${above[0].t.slice(0, 28)} »`, b, "à regarder"); break; }
      }
      // 5. Vide et colonne étroite (ordinateur) : la largeur réellement occupée par le contenu
      const content = [...m.texts.filter((t) => !t.fixed), ...m.images.filter((x) => x.w > 30), ...m.bgImages.filter((x) => x.w > 30), ...m.media];
      if (!phone && m.abs.h >= 220 && content.length && !m.bgImg) {
        const L = Math.max(0, Math.min(...content.map((c) => c.x))), Rr = Math.min(m.abs.w, Math.max(...content.map((c) => c.x + c.w)));
        const used = (Rr - L) / m.abs.w;
        if (Rr < m.abs.w * 0.6) add("vide", `rien sur les ${Math.round((1 - Rr / m.abs.w) * 100)} % de droite`, { x: Rr, y: 0, w: m.abs.w - Rr, h: m.abs.h });
        else if (L > m.abs.w * 0.4) add("vide", `rien sur les ${Math.round((L / m.abs.w) * 100)} % de gauche`, { x: 0, y: 0, w: L, h: m.abs.h });
        else if (used < 0.46 && m.abs.h > 320) add("colonne étroite", `le contenu n'occupe que ${Math.round(used * 100)} % de la largeur`, { x: L, y: 0, w: Rr - L, h: m.abs.h });
      }
      if (m.abs.h >= 160 && !content.length && !m.bgImg) add("vide", "section sans contenu visible", { x: 0, y: 0, w: m.abs.w, h: m.abs.h });
      // 6. Téléphone : textes trop petits, boutons trop petits, texte collé au bord
      if (phone) {
        const tiny = m.texts.filter((t) => t.size < 11.5 && t.t.length > 3);
        if (tiny.length) add("texte trop petit", `${tiny.length} texte(s) sous 12 px : « ${tiny[0].t.slice(0, 30)} » (${tiny[0].size.toFixed(0)} px)`, tiny[0]);
        const small = m.links.filter((l) => l.w > 0 && (l.h < 30 || l.w < 30) && l.t);
        if (small.length) add("bouton trop petit", `${small.length} bouton(s) ou lien(s) difficiles à toucher : « ${small[0].t} » (${small[0].w}×${small[0].h} px)`, small[0]);
        const edge = m.texts.filter((t) => !t.inScroller && t.w > 30 && (t.left < 7 || t.right > m.vw - 7) && t.left >= -2 && t.right <= m.vw + 2);
        if (edge.length) add("collé au bord", `« ${edge[0].t.slice(0, 30)} » touche le bord de l'écran`, edge[0]);
      }
      // Capture annotée
      if (shot && issues.length) {
        const meta = await sharp(shot).metadata();
        const boxes = issues.filter((x) => x.box).map((x, n) => { const b = x.box; const bx = Math.max(1, Math.min(meta.width - 4, b.x)), by = Math.max(1, Math.min(meta.height - 4, b.y)); const bw = Math.max(6, Math.min(meta.width - bx - 1, b.w)), bh = Math.max(6, Math.min(meta.height - by - 1, b.h)); return `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="rgba(230,30,60,.10)" stroke="#e61e3c" stroke-width="3"/><circle cx="${Math.min(meta.width - 11, bx + bw)}" cy="${Math.max(11, by)}" r="10" fill="#e61e3c"/><text x="${Math.min(meta.width - 11, bx + bw)}" y="${Math.max(11, by) + 4.5}" font-family="Arial" font-size="12" font-weight="700" fill="#fff" text-anchor="middle">${n + 1}</text>`; }).join("");
        const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${meta.width}" height="${meta.height}">${boxes}</svg>`);
        await sharp(shot).composite([{ input: svg, top: 0, left: 0 }]).jpeg({ quality: 70 }).toFile(path.join(outDir, `${file}.jpg`));
      } else if (shot && process.env.CV_ALL === "1") await sharp(shot).jpeg({ quality: 70 }).toFile(path.join(outDir, `${file}.jpg`));
      sections.push({ uid: m.uid, role: m.role, cls: m.cls, abs: m.abs, bg: m.bg, bgImg: m.bgImg, padTop: m.padTop, padBottom: m.padBottom, nTexts: m.texts.length, nImages: m.images.length, headings: m.texts.filter((t) => t.heading && t.size >= 22).map((t) => ({ t: t.t.slice(0, 40), left: t.left, align: t.align, size: t.size })), firstY: content.length ? Math.min(...content.map((c) => c.y)) : null, lastY: content.length ? Math.max(...content.map((c) => c.y + c.h)) : null, imgs: m.images.filter((x) => x.w >= 90 && x.h >= 90).map((x) => x.src), file: shot && issues.length ? `${file}.jpg` : null, issues });
    }
    // Contrôles entre sections : titres mal alignés, sections collées, image en double dans la page.
    const cross = [];
    const body = sections.filter((s) => !s.role);
    if (!phone) {
      const lefts = body.flatMap((s) => s.headings.filter((x) => /^(left|start)$/.test(x.align)).slice(0, 1).map((x) => ({ s, left: x.left, t: x.t })));
      if (lefts.length >= 3) {
        const counts = {}; for (const x of lefts) counts[x.left] = (counts[x.left] ?? 0) + 1;
        const main = +Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
        for (const x of lefts) if (Math.abs(x.left - main) >= 6 && Math.abs(x.left - main) <= 120 && x.left < 300) cross.push({ type: "alignement", text: `le titre « ${x.t} » commence à ${x.left} px du bord, les autres à ${main} px`, uid: x.s.uid });
      }
    }
    for (let i = 1; i < body.length; i++) {
      const a = body[i - 1], b = body[i];
      if (a.lastY == null || b.firstY == null || a.bgImg || b.bgImg) continue;
      const gap = (a.abs.h - a.lastY) + b.firstY;
      if (a.bg === b.bg && gap < 36) cross.push({ type: "sections collées", text: `seulement ${Math.max(0, Math.round(gap))} px entre deux sections de même fond`, uid: b.uid });
      if (a.bg === b.bg && gap > (phone ? 260 : 340)) cross.push({ type: "vide", text: `${Math.round(gap)} px de vide entre deux sections`, uid: b.uid });
    }
    const pageImgs = {}; for (const s of body) for (const src of new Set(s.imgs)) (pageImgs[src] ??= []).push(s.uid);
    for (const [src, uids] of Object.entries(pageImgs)) if (uids.length > 1) cross.push({ type: "image en double", text: `la même image dans ${uids.length} sections : ${src.slice(-40)}`, uid: uids[1] });
    if (pageOverflow.sw > pageOverflow.cw + 2) cross.push({ type: "débordement", text: `la page est plus large que l'écran (${pageOverflow.sw} px pour ${pageOverflow.cw})`, uid: null });
    all.push({ name, device, page: key, sections, cross, scriptErrors: [...new Set(scriptErrors)].slice(0, 10), cspBlocked });
    const n = sections.reduce((t, s) => t + s.issues.length, 0) + cross.length;
    console.log(`${device} · ${name} · ${key ?? "page"} : ${sections.length} sections, ${n} défaut(s)${scriptErrors.length ? `, ${scriptErrors.length} erreur(s) de script` : ""}`);
  }
  await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(outDir, `${name}.json`), JSON.stringify(all, null, 1));
const byType = {}, soft = {}; for (const p of all) { for (const s of p.sections) for (const i of s.issues) (i.level === "à regarder" ? soft : byType)[i.type] = ((i.level === "à regarder" ? soft : byType)[i.type] ?? 0) + 1; for (const c of p.cross) byType[c.type] = (byType[c.type] ?? 0) + 1; }
console.log("DÉFAUTS par type :", JSON.stringify(byType));
console.log("À REGARDER par type :", JSON.stringify(soft));
