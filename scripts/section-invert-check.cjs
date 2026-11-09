/**
 * Contrôle du fond inversé (scripts/section-invert.cjs) dans un vrai navigateur : chaque section est affichée normale
 * puis inversée, aux couleurs d'une marque d'essai ; pour chaque texte visible, le contraste avec son fond réel est
 * mesuré (4,5 pour un texte courant, 3 pour un grand titre). Une section est « inversable » si, inversée, elle n'a pas
 * plus de textes illisibles que normale et que son fond a bien changé (clair → sombre ou sombre → clair).
 * Écrit `inversable` dans public/sections/section-traits.json. Usage : node scripts/section-invert-check.cjs [id…]
 */
const { chromium } = require("playwright");
const fs = require("fs"), path = require("path"), os = require("os");
const DIR = path.join(__dirname, "..", "public", "sections");
const lib = JSON.parse(fs.readFileSync(path.join(DIR, "library.json"), "utf8"));
const only = process.argv.slice(2);
const BRAND = ":root{--b-dark:#1f2a26;--b-ink:#1f2a26;--b-soft:#f6f1e7;--b-primary:#c4622d;--b-gold:#d9a441;--c1:#c4622d;--c2:#d9a441;--c3:#6b7f5e;--c4:#1f2a26;--c5:#f6f1e7}";
(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "inv-"));
  for (const f of ["library.css", "library.js"]) fs.copyFileSync(path.join(DIR, f), path.join(tmp, f));
  fs.symlinkSync(path.join(DIR, "photos"), path.join(tmp, "photos"));
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const measure = () => {
    const lum = (r, g, b) => { const f = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    // Toute couleur (rgb, oklab, color(srgb …) issue de color-mix…) est convertie par le navigateur lui-même.
    const cv = document.createElement("canvas"); cv.width = cv.height = 1; const cx = cv.getContext("2d", { willReadFrequently: true });
    const rgba = (s) => { if (!s || s === "transparent") return null; cx.clearRect(0, 0, 1, 1); cx.fillStyle = "rgba(0,0,0,0)"; cx.fillStyle = s; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; return d[3] === 0 ? null : [d[0], d[1], d[2], d[3] / 255]; };
    const root = document.querySelector("[data-t]");
    const sec = root.firstElementChild?.matches?.(".ct-inv") ? root.firstElementChild.firstElementChild : root.firstElementChild;
    if (!sec) return null;
    // Fond en dégradé : moyenne de ses couleurs (le navigateur les rend en rgb, oklab ou color(srgb …)).
    const gradient = (img) => { const cs = (img.match(/(?:rgba?|oklab|oklch|lab|lch|color)\([^()]*(?:\([^()]*\)[^()]*)*\)/g) || []).map(rgba).filter((c) => c && c[3] > 0.6); if (!cs.length) return null; return [0, 1, 2].map((i) => cs.reduce((a, c) => a + c[i], 0) / cs.length).concat(1); };
    const bgOf = (el) => { for (let e = el; e && e !== document.body; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.backgroundImage.includes("url(")) return "photo"; if (cs.backgroundImage.includes("gradient")) { const g = gradient(cs.backgroundImage); if (g) return g; } const c = rgba(cs.backgroundColor); if (c && c[3] > 0.6) return c; } return [255, 255, 255, 1]; };
    let bad = 0, total = 0;
    const walker = document.createTreeWalker(sec, NodeFilter.SHOW_TEXT);
    const seen = new Set();
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement; if (!el || seen.has(el) || !n.textContent.trim()) continue; seen.add(el);
      const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
      if (!r.width || !r.height || cs.visibility === "hidden" || +cs.opacity === 0 || el.closest("[hidden]")) continue;
      const fg = rgba(cs.color); const bg = bgOf(el); if (!fg || bg === "photo" || fg[3] < 0.3) continue;
      total++;
      const a = fg[3], mix = [0, 1, 2].map((i) => fg[i] * a + bg[i] * (1 - a));
      const L1 = lum(...mix), L2 = lum(bg[0], bg[1], bg[2]); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
      const big = parseFloat(cs.fontSize) >= 24 || (parseFloat(cs.fontSize) >= 18.6 && +cs.fontWeight >= 700);
      if (ratio < (big ? 3 : 4.5)) { bad++; if (window.__dbg) window.__dbg.push(`${el.tagName}.${(el.className + "").slice(0, 20)} « ${n.textContent.trim().slice(0, 24)} » texte ${mix.map(Math.round)} fond ${bg.slice(0, 3)} ratio ${ratio.toFixed(2)}`); }
    }
    // fond dominant de la section
    const R = sec.getBoundingClientRect(); let ground = null, best = 0;
    for (const e of [sec, ...sec.querySelectorAll("*")]) { const b2 = e.getBoundingClientRect(), area = b2.width * b2.height; if (area < R.width * R.height * 0.45) continue; const cs = getComputedStyle(e); if (cs.backgroundImage.includes("url(")) { if (area > best) { best = area; ground = "photo"; } continue; } const c = (cs.backgroundImage.includes("gradient") && gradient(cs.backgroundImage)) || rgba(cs.backgroundColor); if (c && c[3] > 0.6 && area >= best) { best = area; ground = lum(c[0], c[1], c[2]) < 0.2 ? "sombre" : "clair"; } }
    return { bad, total, ground: ground ?? "clair" };
  };
  const traitsFile = path.join(DIR, "section-traits.json");
  const traits = JSON.parse(fs.readFileSync(traitsFile, "utf8"));
  const res = [];
  for (const s of lib.sections) {
    if (only.length && !only.includes(s.id)) continue;
    const page = (inv) => `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="library.css"><style>${BRAND}</style></head><body style="margin:0;background:#fff"><div data-t style="container-type:inline-size">${inv ? `<div class="ct-inv ${inv}">` : ""}${s.html}${inv ? "</div>" : ""}</div><script src="library.js"></script></body></html>`;
    const run = async (inv) => { fs.writeFileSync(path.join(tmp, "one.html"), page(inv)); await p.goto("file://" + path.join(tmp, "one.html")); await p.waitForTimeout(250); if (process.env.DBG) await p.evaluate(() => { window.__dbg = []; }); const r = await p.evaluate(measure); if (process.env.DBG && inv) console.log(s.id, await p.evaluate(() => window.__dbg)); return r; };
    const a = await run(false);
    const z = a ? await run(a.ground === "sombre" ? "ct-light" : "ct-dark") : null;
    if (!a || !z) continue;
    const flipped = (a.ground === "clair" && z.ground === "sombre") || (a.ground === "sombre" && z.ground === "clair");
    const ok = flipped && z.bad <= a.bad;
    if (traits[s.id]) traits[s.id].inversable = ok;
    res.push({ id: s.id, family: s.family, normal: `${a.bad}/${a.total}`, inverse: `${z.bad}/${z.total}`, fond: `${a.ground}→${z.ground}`, ok });
  }
  await b.close();
  if (!only.length) fs.writeFileSync(traitsFile, JSON.stringify(traits));
  const ko = res.filter((x) => !x.ok);
  console.log(`${res.length} sections : ${res.length - ko.length} inversables, ${ko.length} non`);
  for (const x of ko) console.log(`  ${x.family} | ${x.id} | fond ${x.fond} | illisibles normal ${x.normal}, inversé ${x.inverse}`);
})();
