/** Audit visuel d'une galerie de contrôle des bibliothèques (scripts/family-gallery-export.ts), issue #145.
 *
 * Chaque page est ouverte dans Chromium à 390 px (téléphone) et 1440 px (ordinateur), animations jouées, puis chaque
 * section ajoutée est contrôlée :
 *  - débordement horizontal (page plus large que l'écran, élément qui dépasse hors d'un carrousel) ;
 *  - textes qui se chevauchent (deux blocs de texte l'un sur l'autre) ;
 *  - même image répétée dans une section (hors défilement en boucle, qui duplique volontairement) ;
 *  - produit masqué (carte produit sans image visible, ou image recouverte) ;
 *  - texte peu lisible (contraste inférieur à 3:1 sur un fond uni) ;
 *  - cadrage : image recadrée à moins de 55 % de sa surface sur téléphone (sujet probablement coupé) ;
 *  - icône au trait rendue en forme pleine (style manquant).
 * Une capture pleine page par page et par largeur est enregistrée. Aucun réseau, aucune IA.
 *
 *   npx tsx scripts/family-visual-audit.ts <dossier-galerie> <dossier-de-sortie> [--no-shots]
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const [galleryArg, outArg] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const shots = !process.argv.includes("--no-shots");
const gallery = path.resolve(galleryArg), out = path.resolve(outArg ?? "reports/audit-visuel"); fs.mkdirSync(out, { recursive: true });
const pages: string[] = [];
const walk = (d: string) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory() && e.name !== "assets" && e.name !== "fonts") walk(p); else if (e.name.endsWith(".html") && d !== gallery) pages.push(p); } };
walk(gallery);
pages.sort();

/** Exécuté dans la page : défauts de chaque section de contrôle (repérée par son étiquette « fam-ctl »). */
const AUDIT = `(() => {
  const vw = document.documentElement.clientWidth, out = [];
  const lum = (c) => { const m = c.match(/rgba?\\(([^)]+)\\)/); if (!m) return null; const [r, g, b, a = 1] = m[1].split(/[ ,\\/]+/).filter(Boolean).map(Number); if (a < 0.9) return null; const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const bgOf = (el) => { for (let n = el; n && n !== document.documentElement; n = n.parentElement) { const s = getComputedStyle(n); if (s.backgroundImage && s.backgroundImage !== 'none') return null; if (n.querySelector(':scope > img, :scope > picture, :scope > video') && n !== el) return null; const L = lum(s.backgroundColor); if (L !== null) return L; } return lum(getComputedStyle(document.body).backgroundColor); };
  const visible = (el) => { const r = el.getBoundingClientRect(), s = getComputedStyle(el); return r.width > 1 && r.height > 1 && s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0.05; };
  const scrollerOf = (el) => { for (let n = el.parentElement; n; n = n.parentElement) { const s = getComputedStyle(n); if (/(auto|scroll|hidden|clip)/.test(s.overflowX)) return n; } return null; };
  const sections = [...document.querySelectorAll('.fam-ctl')].map((label) => ({ label: label.textContent.trim(), el: label.nextElementSibling })).filter((x) => x.el);
  if (!sections.length) { const main = document.querySelector('main'); if (main) for (const el of main.children) sections.push({ label: el.getAttribute('data-es-type') || el.id, el }); }
  for (const { label, el } of sections) {
    const issues = [];
    // Débordement : élément visible qui sort de l'écran sans être dans un conteneur qui le coupe ou le fait défiler.
    for (const n of el.querySelectorAll('*')) { if (!visible(n)) continue; const r = n.getBoundingClientRect(); if ((r.right > vw + 1 || r.left < -1) && !scrollerOf(n)) { issues.push({ kind: 'debordement', detail: (n.className && String(n.className).slice(0, 60)) || n.tagName, px: Math.round(Math.max(r.right - vw, -r.left)) }); break; } }
    // Textes superposés : deux feuilles de texte visibles dont les rectangles se recouvrent nettement.
    const texts = [...el.querySelectorAll('h1,h2,h3,h4,p,li,a,button,span,dt,dd,blockquote,figcaption,label')].filter((n) => visible(n) && n.childElementCount === 0 && n.textContent.trim().length > 1);
    let overlap = null;
    for (let i = 0; i < texts.length && !overlap; i++) for (let j = i + 1; j < texts.length; j++) {
      const a = texts[i].getBoundingClientRect(), b = texts[j].getBoundingClientRect();
      const w = Math.min(a.right, b.right) - Math.max(a.left, b.left), h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (w > 6 && h > 6 && w * h > 0.25 * Math.min(a.width * a.height, b.width * b.height) && !texts[i].contains(texts[j]) && !texts[j].contains(texts[i]) && !texts[i].closest('[aria-hidden="true"]') && !texts[j].closest('[aria-hidden="true"]') && !texts[i].closest('.visually-hidden') && !texts[j].closest('.visually-hidden')) { overlap = texts[i].textContent.trim().slice(0, 40) + ' ⟂ ' + texts[j].textContent.trim().slice(0, 40); break; }
    }
    if (overlap) issues.push({ kind: 'chevauchement', detail: overlap });
    // Image répétée dans la section (hors défilement en boucle et vignettes de navigation).
    const loop = el.querySelector('[data-fs-marquee], .marquee, [data-marquee], .es-marquee');
    if (!loop) { const seen = new Map(); for (const img of el.querySelectorAll('img')) { if (!visible(img) || img.closest('[aria-hidden="true"]')) continue; const k = (img.currentSrc || img.src).split('?')[0]; if (!k) continue; seen.set(k, (seen.get(k) || 0) + 1); } for (const [k, n] of seen) if (n > 1) issues.push({ kind: 'image-repetee', detail: k.split('/').pop() + ' ×' + n }); }
    // Produit masqué : carte produit sans image visible, ou image recouverte en son centre.
    for (const card of el.querySelectorAll('.es-card, [data-product-card], .fs-products__item')) { const img = card.querySelector('img'); if (!img) continue; const r = img.getBoundingClientRect(); if (r.width < 40 || r.height < 40) { issues.push({ kind: 'produit-masque', detail: 'image ' + Math.round(r.width) + '×' + Math.round(r.height) }); continue; } const x = r.left + r.width / 2, y = r.top + Math.min(r.height / 2, innerHeight / 2); if (y > 0 && y < innerHeight) { const top = document.elementFromPoint(x, y); if (top && !card.contains(top) && !top.closest('.fam-top')) issues.push({ kind: 'produit-masque', detail: 'recouvert par ' + (top.className || top.tagName) }); } }
    // Lisibilité : contraste du texte sur un fond uni.
    let worst = null;
    for (const n of texts) { const fg = lum(getComputedStyle(n).color), bg = bgOf(n); if (fg === null || bg === null) continue; const ratio = (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05); if (ratio < 3 && (!worst || ratio < worst.ratio)) worst = { ratio: Math.round(ratio * 100) / 100, text: n.textContent.trim().slice(0, 40) }; }
    if (worst) issues.push({ kind: 'contraste', detail: worst.text + ' (' + worst.ratio + ':1)' });
    // Cadrage : part de l'image affichée (object-fit: cover).
    for (const img of el.querySelectorAll('img')) { if (!visible(img) || !img.naturalWidth) continue; const s = getComputedStyle(img); if (s.objectFit !== 'cover') continue; const r = img.getBoundingClientRect(); const box = r.width / r.height, nat = img.naturalWidth / img.naturalHeight; const shown = Math.min(box, nat) / Math.max(box, nat); if (shown < 0.55) issues.push({ kind: 'cadrage', detail: (img.currentSrc || img.src).split('/').pop() + ' ' + Math.round(shown * 100) + ' % visible' }); }
    // Icône au trait rendue pleine (style absent : forme noire au lieu du pictogramme).
    const icon = [...el.querySelectorAll('svg.fs-icon, svg[class*="icon"]')].find((svg) => visible(svg) && getComputedStyle(svg).fill !== 'none' && getComputedStyle(svg).stroke === 'none' && !svg.querySelector('[fill]'));
    if (icon) issues.push({ kind: 'icone-pleine', detail: icon.getAttribute('class') || 'svg' });
    out.push({ label, issues });
  }
  return { overflowPage: document.documentElement.scrollWidth - vw, sections: out };
})()`;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
const results: { page: string; width: number; overflowPage: number; sections: { label: string; issues: { kind: string; detail: string }[] }[] }[] = [];
try {
  for (const width of [390, 1440]) {
    const ctx = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    for (const file of pages) {
      const rel = path.relative(gallery, file);
      await page.goto(`file://${file}`, { waitUntil: "load" });
      // Défilement complet : apparitions au défilement jouées, images différées chargées.
      await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } window.scrollTo(0, 0); await new Promise((r) => setTimeout(r, 400)); });
      const r = await page.evaluate(AUDIT) as { overflowPage: number; sections: { label: string; issues: { kind: string; detail: string }[] }[] };
      results.push({ page: rel, width, ...r });
      if (shots) { const dest = path.join(out, String(width), rel.replace(/\.html$/, ".png")); fs.mkdirSync(path.dirname(dest), { recursive: true }); await page.screenshot({ path: dest, fullPage: true }); }
    }
    await ctx.close();
  }
} finally { await browser.close(); }
const issues = results.flatMap((r) => r.sections.flatMap((s) => s.issues.map((i) => ({ page: r.page, width: r.width, section: s.label.replace(/\s+/g, " ").slice(0, 140), ...i }))));
const byKind = issues.reduce<Record<string, number>>((m, i) => ((m[i.kind] = (m[i.kind] ?? 0) + 1), m), {});
fs.writeFileSync(path.join(out, "audit.json"), JSON.stringify({ date: new Date().toISOString(), pages: pages.length, mesures: results.length, debordementsPage: results.filter((r) => r.overflowPage > 1).map((r) => ({ page: r.page, width: r.width, px: r.overflowPage })), parType: byKind, defauts: issues }, null, 2));
console.log(`${results.length} mesures (${pages.length} pages × 2 largeurs) · pages qui débordent : ${results.filter((r) => r.overflowPage > 1).length} · défauts par type : ${JSON.stringify(byKind)}`);
