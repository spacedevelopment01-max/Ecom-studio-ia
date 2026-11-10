/**
 * Contrôle du fond inversé (scripts/section-invert.cjs) dans un vrai navigateur, sur l'IMAGE affichée : chaque section
 * est affichée normale puis inversée, aux couleurs d'une marque d'essai, sur ordinateur (1280 px) et sur téléphone
 * (390 px). Pour chaque ligne de texte visible, le fond réellement peint derrière elle est lu pixel par pixel (capture
 * prise avec les textes rendus transparents : photos, dégradés, voiles, pastilles compris) et comparé à la couleur du
 * texte (4,5 pour un texte courant, 3 pour un grand titre ; un texte posé sur une photo est jugé sur la moitié la plus
 * claire ou la plus sombre de la photo, selon sa couleur).
 * Une section est « inversable » si son fond change bien (clair → sombre ou l'inverse) et qu'inversée, elle n'a AUCUN
 * texte illisible de plus qu'à l'origine.
 * Écrit `inversable` dans public/sections/section-traits.json et le détail dans public/sections/section-invert-report.json.
 * Usage : node scripts/section-invert-check.cjs [id…]   (DBG=1 : liste les textes illisibles)
 */
const { chromium } = require("playwright");
const fs = require("fs"), path = require("path"), os = require("os");
const DIR = path.join(__dirname, "..", "public", "sections");
const lib = JSON.parse(fs.readFileSync(path.join(DIR, "library.json"), "utf8"));
const only = process.argv.slice(2);
// Marque d'essai, posée comme le fait brandCss (src/lib/syna-agent/custom-theme/render.ts).
const BRAND = ":root{--b-dark:#1f2a26;--b-ink:#1f2a26;--b-soft:#f6f1e7;--b-primary:#c4622d;--b-gold:#d9a441}:root,.tA,.tB,.tN{--c1:#1f2a26;--c2:#c4622d;--c3:color-mix(in srgb,#f6f1e7 86%,#c4622d);--c4:color-mix(in srgb,#f6f1e7 95%,#1f2a26);--c5:#d9a441}:where(.ctw) .el{--e-nv:#1f2a26;--e-nv2:color-mix(in srgb,#1f2a26 88%,#f6f1e7);--e-or:#c4622d;--e-tl:#d9a441;--e-cr:#f6f1e7;--e-gr:#6b7f5e;--e-ink:#1f2a26}:where(.ctw) .dq{--q-bk:#1f2a26;--q-gr:color-mix(in srgb,#1f2a26 90%,#f6f1e7);--q-lm:#c4622d;--q-rd:#d9a441;--q-tx:#f6f1e7;--q-mu:color-mix(in srgb,#f6f1e7 62%,#1f2a26);--q-ln:color-mix(in srgb,#f6f1e7 14%,#1f2a26)}.ctw{--tb-ac:#c4622d;--tb-tbg:#1f2a26;--tb-tfg:#f6f1e7}";
const WIDTHS = [1280, 390];

/** Dans la page : lignes de texte visibles de la section (rectangles, couleur, taille). */
function collect() {
  const cv = document.createElement("canvas"); cv.width = cv.height = 1; const cx = cv.getContext("2d", { willReadFrequently: true });
  const rgba = (s) => { if (!s || s === "transparent") return null; cx.clearRect(0, 0, 1, 1); cx.fillStyle = "rgba(0,0,0,0)"; cx.fillStyle = s; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
  const root = document.querySelector("[data-t]");
  const R = root.getBoundingClientRect();
  const out = [], seen = new Set();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const el = n.parentElement; if (!el || !n.textContent.trim() || el.closest("script,style,noscript,[hidden],[aria-hidden=true]")) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none") continue;
    let op = 1; for (let e = el; e && e !== root; e = e.parentElement) op *= +getComputedStyle(e).opacity; if (op < 0.35) continue;
    const fg = rgba(cs.webkitTextFillColor && cs.webkitTextFillColor !== cs.color && !/^rgba\(0, 0, 0, 0\)$/.test(cs.webkitTextFillColor) ? cs.webkitTextFillColor : cs.color);
    if (!fg || fg[3] * op < 0.3) continue;
    const range = document.createRange(); range.selectNodeContents(n);
    for (const r of range.getClientRects()) {
      if (r.width < 4 || r.height < 6) continue;
      const x = Math.max(r.left, R.left) - R.left, y = r.top - R.top + window.scrollY - (window.scrollY);
      const w = Math.min(r.right, R.right) - R.left - x, h = r.height; if (w < 4) continue;
      const key = `${Math.round(x)}:${Math.round(y)}`; if (seen.has(key)) continue; seen.add(key);
      const fs_ = parseFloat(cs.fontSize), fw = +cs.fontWeight || 400;
      out.push({ x, y: r.top - R.top, w, h, fg: [fg[0], fg[1], fg[2], fg[3] * op], big: fs_ >= 24 || (fs_ >= 18.6 && fw >= 700), txt: n.textContent.trim().slice(0, 28), tag: `${el.tagName.toLowerCase()}.${(el.className + "").split(" ")[0].slice(0, 18)}` });
    }
  }
  // part de la section couverte par une photo ou une vidéo (grille de points ; seule la partie visible à l'écran)
  let onPhoto = 0, pts = 0;
  for (let gx = 0.05; gx < 1; gx += 0.1) for (let gy = 0.05; gy < 1; gy += 0.1) {
    const x = R.left + R.width * gx, y = R.top + Math.min(R.height, innerHeight) * gy; pts++;
    for (const e of document.elementsFromPoint(x, y)) {
      if (!root.contains(e)) break;
      if (/^(IMG|VIDEO|PICTURE|CANVAS)$/.test(e.tagName) || getComputedStyle(e).backgroundImage.includes("url(")) { onPhoto++; break; }
    }
  }
  return { lines: out, W: R.width, H: R.height, photo: pts ? onPhoto / pts : 0 };
}

const lum = (r, g, b) => { const f = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

/** Lit la capture (PNG décodé par le navigateur lui-même) et juge chaque ligne de texte. */
async function judge(p, png, info, W) {
  return p.evaluate(async ({ b64, lines }) => {
    const img = new Image(); img.src = "data:image/png;base64," + b64; await img.decode();
    const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; const g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(img, 0, 0);
    const sx = img.width / document.querySelector("[data-t]").getBoundingClientRect().width;
    return lines.map((l) => {
      const x0 = Math.max(0, Math.floor(l.x * sx)), y0 = Math.max(0, Math.floor(l.y * sx)), w = Math.min(img.width - x0, Math.ceil(l.w * sx)), h = Math.min(img.height - y0, Math.ceil(l.h * sx));
      if (w < 2 || h < 2) return null;
      const d = g.getImageData(x0, y0, w, h).data; const px = [];
      const step = Math.max(1, Math.floor((w * h) / 4000));
      for (let i = 0; i < w * h; i += step) px.push([d[i * 4], d[i * 4 + 1], d[i * 4 + 2]]);
      return px;
    });
  }, { b64: png.toString("base64"), lines: info.lines }).then((all) => info.lines.map((l, i) => {
    const px = all[i]; if (!px || !px.length) return null;
    const L = px.map(([r, g, b]) => ({ y: lum(r, g, b), c: [r, g, b] })).sort((a, b) => a.y - b.y);
    const at = (q) => L[Math.min(L.length - 1, Math.floor(L.length * q))];
    const spread = at(0.9).y - at(0.1).y;
    // fond uni : médiane ; fond varié (photo) : la moitié qui sert le texte (clair pour un texte sombre et inversement)
    const a = l.fg[3];
    const tL = lum(l.fg[0], l.fg[1], l.fg[2]);
    const photo = spread > 0.25;
    const bg = photo ? (tL > 0.4 ? at(0.3) : at(0.7)) : at(0.5);
    // texte transparent mêlé à son fond comme le fait le navigateur (dans l'espace sRGB, couche par couche)
    const mix = [0, 1, 2].map((k) => l.fg[k] * a + bg.c[k] * (1 - a));
    const r = ratio(lum(mix[0], mix[1], mix[2]), bg.y);
    const bgL = bg.y;
    return { r: +r.toFixed(2), bad: r < (l.big ? 3 : 4.5), photo, txt: l.txt, tag: l.tag, bgL: +bgL.toFixed(3) };
  }).filter(Boolean));
}

(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "inv-"));
  for (const f of ["library.css", "library.js"]) fs.copyFileSync(path.join(DIR, f), path.join(tmp, f));
  fs.symlinkSync(path.join(DIR, "photos"), path.join(tmp, "photos"));
  const b = await chromium.launch();
  // plusieurs pages en parallèle (une par fil de travail et par largeur)
  const WORKERS = Math.max(1, Math.min(6, +(process.env.WORKERS || 4)));
  const pools = [];
  for (let k = 0; k < WORKERS; k++) { const c = {}; for (const w of WIDTHS) c[w] = await (await b.newContext({ viewport: { width: w, height: 900 }, reducedMotion: "reduce" })).newPage(); pools.push(c); }
  const traitsFile = path.join(DIR, "section-traits.json");
  const traits = JSON.parse(fs.readFileSync(traitsFile, "utf8"));
  const res = [];
  const shot = async (p, s, inv, W, k = 0) => {
    const html = `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="library.css"><style>${BRAND}*{animation-delay:0s!important;animation-duration:0s!important;transition:none!important}</style></head><body style="margin:0;background:#fff"><div data-t class="ctw" style="container-type:inline-size;position:relative;overflow:hidden">${inv ? `<div class="ct-inv ${inv}" style="display:contents">` : ""}${s.html}${inv ? "</div>" : ""}</div><script charset="utf-8" src="library.js"></script></body></html>`;
    fs.writeFileSync(path.join(tmp, `one-${k}-${W}.html`), html);
    await p.goto("file://" + path.join(tmp, `one-${k}-${W}.html`)); await p.waitForTimeout(350);
    // les apparitions au défilement : on fait défiler toute la section
    await p.evaluate(async () => { const H = document.body.scrollHeight; for (let y = 0; y < H; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 30)); } window.scrollTo(0, 0); });
    await p.waitForTimeout(250);
    const info = await p.evaluate(collect);
    const el = await p.$("[data-t]");
    if (!info.H || info.H < 10) return { bad: 0, total: 0, ground: "clair", mean: 1, ys: [], list: [] };
    // fond : moyenne de l'image sans les textes
    await p.addStyleTag({ content: "[data-t] *,[data-t] *::before,[data-t] *::after{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;-webkit-text-stroke:0!important;caret-color:transparent!important}" });
    await p.waitForTimeout(60);
    const png = await el.screenshot({ animations: "disabled" });
    const judged = await judge(p, png, info, W);
    const ground = await p.evaluate(async (b64) => { const img = new Image(); img.src = "data:image/png;base64," + b64; await img.decode(); const c = document.createElement("canvas"); c.width = 64; c.height = 64; const g = c.getContext("2d"); g.drawImage(img, 0, 0, 64, 64); const d = g.getImageData(0, 0, 64, 64).data; let dark = 0, n = 0, varied = 0, sum = 0; const ys = []; const L = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; for (let i = 0; i < d.length; i += 4) { const y = 0.2126 * L(d[i]) + 0.7152 * L(d[i + 1]) + 0.0722 * L(d[i + 2]); n++; sum += y; ys.push(+y.toFixed(3)); if (y < 0.18) dark++; } return { g: dark / n > 0.5 ? "sombre" : "clair", mean: sum / n, ys }; }, png.toString("base64"));
    return { bad: judged.filter((x) => x.bad).length, total: judged.length, ground: ground.g, mean: ground.mean, ys: ground.ys, photo: info.photo, list: judged.filter((x) => x.bad) };
  };
  const queue = lib.sections.filter((s) => !only.length || only.includes(s.id));
  const one = async (s, k) => {
    const out = { id: s.id, family: s.family, ok: true, widths: {} };
    // le sens de l'inversion est choisi une fois pour toutes (fond mesuré sur ordinateur), comme dans le thème
    let dir = null;
    for (const W of WIDTHS) {
      const p = pools[k][W];
      const a = await shot(p, s, false, W, k);
      dir = dir || (a.ground === "sombre" ? "ct-light" : "ct-dark");
      const z = await shot(p, s, dir, W, k);
      // le fond a bien changé : passé de clair à sombre (ou l'inverse), ou clarté moyenne nettement déplacée (une section
      // à moitié occupée par une photo ou une carte ne bascule pas entièrement)
      // (ou plus d'un tiers de sa surface a changé de clarté : une section faite de deux moitiés, carte sombre et
      // formulaire clair, s'inverse sans que sa clarté moyenne bouge)
      const moved = a.ys.length && a.ys.length === z.ys.length ? a.ys.filter((y, i) => Math.abs(y - z.ys[i]) > 0.3).length / a.ys.length : 0;
      const flipped = a.ground !== z.ground || Math.abs(a.mean - z.mean) > 0.2 || moved > 0.33;
      const ok = (W !== WIDTHS[0] || flipped) && z.bad <= a.bad;
      if (W === WIDTHS[0]) out.photo = +a.photo.toFixed(2);
      out.widths[W] = { normal: `${a.bad}/${a.total}`, inverse: `${z.bad}/${z.total}`, fond: `${a.ground}→${z.ground}`, ok, illisibles: z.list.slice(0, 12).map((x) => `${x.tag} « ${x.txt} » ${x.r}`), illisiblesNormal: a.list.slice(0, 6).map((x) => `${x.tag} « ${x.txt} » ${x.r}`) };
      if (!ok) out.ok = false;
    }
    // fond fait d'une photo (plus de la moitié de la surface visible, ou repéré comme tel par scripts/section-traits.cjs) :
    // elle va avec les deux ambiances et ne s'inverse pas
    if (traits[s.id]?.fond === "photo" || (!out.ok && out.photo > 0.5)) { out.fondPhoto = true; out.ok = false; }
    if (traits[s.id]) {
      traits[s.id].inversable = out.ok;
      // fond d'origine mesuré sur l'image (c'est lui qui choisit le sens de l'inversion dans le thème)
      const g = out.widths[1280]?.fond?.split("→")[0];
      if ((out.ok || /^(clair|sombre)$/.test(traits[s.id].fond)) && /^(clair|sombre)$/.test(g)) traits[s.id].fond = g;
      if (out.fondPhoto) traits[s.id].fond = "photo";
    }
    res.push(out);
    if (process.env.DBG && !out.ok) console.log(JSON.stringify(out, null, 1));
  };
  let next = 0;
  await Promise.all(pools.map(async (_, k) => { while (next < queue.length) { const s = queue[next++]; await one(s, k); } }));
  const order = new Map(lib.sections.map((s, i) => [s.id, i])); res.sort((x, y) => order.get(x.id) - order.get(y.id));
  await b.close();
  // un contrôle partiel (quelques sections) met à jour leurs lignes seulement
  const repFile = path.join(DIR, "section-invert-report.json");
  let report = res;
  if (only.length && fs.existsSync(repFile)) { const old = JSON.parse(fs.readFileSync(repFile, "utf8")); const byId = new Map(res.map((x) => [x.id, x])); report = old.map((x) => byId.get(x.id) || x); }
  fs.writeFileSync(traitsFile, JSON.stringify(traits));
  fs.writeFileSync(repFile, JSON.stringify(report, null, 1));
  const ko = res.filter((x) => !x.ok && !x.fondPhoto), ph = res.filter((x) => !x.ok && x.fondPhoto);
  console.log(`${res.length} sections : ${res.length - ko.length - ph.length} inversables, ${ph.length} sur une photo (vont avec les deux ambiances), ${ko.length} non`);
  for (const x of ph) console.log(`  photo | ${x.family} | ${x.id} | ${Math.round(x.photo * 100)} % de photo`);
  for (const x of ko) console.log(`  ${x.family} | ${x.id} | ${WIDTHS.map((w) => `${w}: ${x.widths[w].fond} ${x.widths[w].normal}→${x.widths[w].inverse}`).join(" ; ")}`);
})();
