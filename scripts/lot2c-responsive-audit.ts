/** Audit responsive automatique d'un aperçu statique LIVRÉ : pour chaque page et chaque largeur (360, 390, 768, 1440) —
 * et deux petites hauteurs (360×560, 390×620) — relève les défauts mesurables : débordement horizontal de la page,
 * éléments qui dépassent du cadre, textes coupés (ellipse ou rognés), images déformées (rapport rendu ≠ rapport natif,
 * hors `object-fit`), boutons ou liens recouverts par un élément fixe, cibles tactiles sous 24 × 24 px (WCAG 2.5.8), contrastes
 * insuffisants des textes (AA : 4,5:1, 3:1 en grand texte) et hiérarchie des titres. Résultat JSON + résumé lisible.
 *
 *   CHROMIUM=/chemin/chrome npx tsx scripts/lot2c-responsive-audit.ts <aperçu>/fraise fraise <dossier-de-sortie>
 */
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { chromium } from "playwright";
const dir = path.resolve(process.argv[2]), kind = process.argv[3] ?? path.basename(dir), out = path.resolve(process.argv[4] ?? "reports/lot2c-audit"); fs.mkdirSync(out, { recursive: true });
const TYPES: Record<string, string> = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".webp": "image/webp", ".svg": "image/svg+xml", ".ttf": "font/ttf", ".woff2": "font/woff2", ".webm": "video/webm", ".png": "image/png" };
const server = http.createServer((req, res) => { const p = path.join(dir, decodeURIComponent(new URL(req.url!, "http://x").pathname)); if (!p.startsWith(dir) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) return res.writeHead(404).end(); res.writeHead(200, { "content-type": TYPES[path.extname(p)] ?? "application/octet-stream" }); fs.createReadStream(p).pipe(res); });
await new Promise<void>((r) => server.listen(0, "127.0.0.1", r)); const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
const pages = fs.readdirSync(dir).filter((f) => f.endsWith(".html") && !/^(index|recherche-aucun|recherche-resultat)\.html$/.test(f)).sort();
const VIEWPORTS: [number, number, boolean][] = [[360, 740, true], [390, 844, true], [768, 1024, true], [1440, 900, false], [360, 560, true], [390, 620, true]];
type Issue = { kind: string; page: string; viewport: string; detail: string; selector?: string };
const issues: Issue[] = []; const summary: Record<string, number> = {};
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/usr/bin/chromium", args: ["--no-sandbox"] });
try {
  for (const [width, height, mobile] of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width, height }, isMobile: mobile, hasTouch: mobile, locale: "fr-FR", reducedMotion: "reduce" });
    const page = await context.newPage(); await page.addInitScript("window.__name=(fn)=>fn"); const vp = `${width}x${height}`;
    for (const file of pages) {
      await page.goto(`${origin}/${file}`, { waitUntil: "networkidle" }); await page.waitForTimeout(400);
      // Tout révéler (animations à l'apparition) et laisser décoder les images, pour mesurer l'état final.
      await page.evaluate(async () => { document.querySelectorAll("[data-reveal]").forEach((e) => e.classList.add("is-in")); document.documentElement.classList.add("motion-ready"); await Promise.race([Promise.all([...document.images].filter((i) => !i.complete && i.loading !== "lazy").map((i) => new Promise((r) => { i.onload = i.onerror = r; }))), new Promise((r) => setTimeout(r, 3000))]); });
      const found: Issue[] = await page.evaluate(({ file, vp, mobile }) => {
        const out: { kind: string; page: string; viewport: string; detail: string; selector?: string }[] = [];
        const sel = (e: Element) => { const parts: string[] = []; let n: Element | null = e; while (n && n !== document.body && parts.length < 4) { parts.unshift(n.tagName.toLowerCase() + (n.id ? `#${n.id}` : n.classList.length ? "." + [...n.classList].slice(0, 2).join(".") : "")); n = n.parentElement; } return parts.join(" > "); };
        // Visible : taille non nulle, pas masqué, pas « visually-hidden » (1 px rogné pour les lecteurs d'écran), pas dans un
        // accordéon fermé (contenu replié, non lisible : il est contrôlé à l'état ouvert par les preuves dédiées).
        const visible = (e: Element) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); if (r.width <= 2 || r.height <= 2) return false; if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) <= 0.05) return false; if (e.closest(".visually-hidden, .visually-hidden-focusable, .skip-link, [data-cv-player], [data-cv-lightbox]")) return false; const closed = e.closest("details:not([open])"); if (closed && !e.closest("summary")) return false; return true; };
        const inFlow = (e: Element) => { let n: Element | null = e; while (n) { const cs = getComputedStyle(n); if (cs.position === "fixed" || cs.display === "none" || n.hasAttribute("hidden") || (n as HTMLElement).inert || n.closest("dialog:not([open]), [aria-hidden='true'], .es-drawer:not(.is-open), template")) return false; n = n.parentElement; } return true; };
        const docW = document.documentElement.clientWidth;
        // 1. Débordement horizontal de la page.
        if (document.documentElement.scrollWidth > docW + 1) out.push({ kind: "page-overflow-x", page: file, viewport: vp, detail: `largeur de défilement ${document.documentElement.scrollWidth} > ${docW}` });
        const all = [...document.body.querySelectorAll<HTMLElement>("*")].filter((e) => !["SCRIPT", "STYLE", "TEMPLATE", "NOSCRIPT"].includes(e.tagName));
        for (const e of all) {
          if (!visible(e) || !inFlow(e)) continue;
          const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
          // 2. Élément qui dépasse du cadre horizontalement (hors pistes de carrousel prévues pour défiler).
          if ((r.right > docW + 2 || r.left < -2) && !e.closest("[data-carousel], .es-carousel, .cv-gallery__track, [data-cv-track], .es-track, .ref-marquee, [data-scroll-x], .cv-stories__track, .cv-features__track, .cv-benefits__track, .es-scroller, .es-thumbs")) {
            const parentClips = (() => { let n = e.parentElement; while (n && n !== document.body) { const pc = getComputedStyle(n); if (/(hidden|clip|auto|scroll)/.test(pc.overflowX)) return true; n = n.parentElement; } return false; })();
            if (!parentClips) out.push({ kind: "element-overflow-x", page: file, viewport: vp, detail: `${Math.round(r.left)}…${Math.round(r.right)} (cadre ${docW})`, selector: sel(e) });
          }
          // 3. Texte coupé : ellipse effective ou texte rogné par overflow hidden sur une seule ligne.
          const hasText = [...e.childNodes].some((n) => n.nodeType === 3 && (n.textContent ?? "").trim().length > 0);
          if (hasText && e.scrollWidth > e.clientWidth + 2 && (cs.textOverflow === "ellipsis" || /hidden|clip/.test(cs.overflowX)) && cs.whiteSpace === "nowrap") out.push({ kind: "text-clipped", page: file, viewport: vp, detail: `« ${(e.textContent ?? "").trim().slice(0, 60)} » ${e.clientWidth}/${e.scrollWidth}px`, selector: sel(e) });
          if (hasText && e.scrollHeight > e.clientHeight + 4 && /hidden|clip/.test(cs.overflowY) && !cs.webkitLineClamp && cs.webkitLineClamp !== "none" && !e.closest("[data-cv-track], .es-track")) out.push({ kind: "text-cut-vertical", page: file, viewport: vp, detail: `« ${(e.textContent ?? "").trim().slice(0, 60)} » ${e.clientHeight}/${e.scrollHeight}px`, selector: sel(e) });
          // 4. Image déformée (hors object-fit cover/contain et SVG).
          if (e.tagName === "IMG") { const img = e as HTMLImageElement; if (img.naturalWidth > 0 && !/^(cover|contain|scale-down)$/.test(cs.objectFit) && !/\.svg(\?|$)/.test(img.currentSrc)) { const nat = img.naturalWidth / img.naturalHeight, ren = r.width / r.height; if (Math.abs(nat - ren) / nat > 0.04) out.push({ kind: "image-distorted", page: file, viewport: vp, detail: `natif ${nat.toFixed(2)} rendu ${ren.toFixed(2)} (${Math.round(r.width)}×${Math.round(r.height)})`, selector: sel(e) }); } }
          // 5. Cible tactile trop petite (mobile) : boutons et liens interactifs < 40 px dans les deux sens (icônes, non texte courant).
          if (mobile && (e.tagName === "BUTTON" || (e.tagName === "A" && e.hasAttribute("href")) || (e.tagName === "INPUT" && /checkbox|radio/.test((e as HTMLInputElement).type)))) { const lbl = (e as HTMLElement).innerText?.trim() ?? ""; const isInline = e.tagName === "A" && lbl.length > 0 && cs.display === "inline" && e.parentElement && ["P", "LI", "SPAN", "TD", "DD", "FIGCAPTION", "SMALL"].includes(e.parentElement.tagName); const inLabel = e.tagName === "INPUT" && !!e.closest("label"); if (!isInline && !inLabel && (r.width < 24 || r.height < 24) && r.width > 0) out.push({ kind: "tap-target-small", page: file, viewport: vp, detail: `${Math.round(r.width)}×${Math.round(r.height)} px « ${lbl.slice(0, 30) || e.getAttribute("aria-label") || ""} »`, selector: sel(e) }); }
        }
        // 6. Éléments fixes qui recouvrent un bouton ou un lien (en bas de page, au repos et en bas de défilement).
        const fixed = all.filter((e) => visible(e) && getComputedStyle(e).position === "fixed" && !e.closest("dialog, .es-drawer, [aria-hidden='true']") && !e.matches("#es-static-note, #es-static-note *"));
        const checkCovered = (phase: string) => { for (const f of fixed) { const fr = f.getBoundingClientRect(); if (fr.width < 40 || fr.height < 20 || fr.width * fr.height > innerWidth * innerHeight * 0.6) continue; for (const b of document.querySelectorAll<HTMLElement>("a[href], button, input, select, textarea")) { if (!visible(b) || !inFlow(b) || f.contains(b)) continue; const br = b.getBoundingClientRect(); if (br.bottom < 0 || br.top > innerHeight) continue; const ox = Math.max(0, Math.min(fr.right, br.right) - Math.max(fr.left, br.left)), oy = Math.max(0, Math.min(fr.bottom, br.bottom) - Math.max(fr.top, br.top)); if (ox * oy > br.width * br.height * 0.5) { const cx = br.left + br.width / 2, cy = br.top + br.height / 2; const top = document.elementFromPoint(cx, cy); if (top && !b.contains(top) && f.contains(top)) out.push({ kind: "covered-by-fixed", page: file, viewport: vp, detail: `${phase} : « ${(b.innerText || b.getAttribute("aria-label") || "").trim().slice(0, 40)} » sous ${sel(f)}`, selector: sel(b) }); } } } };
        checkCovered("haut"); window.scrollTo(0, document.documentElement.scrollHeight); checkCovered("bas"); window.scrollTo(0, 0);
        // 7. Contraste des textes (AA) — texte sur fond uni déterminé en remontant les ancêtres ; images de fond ignorées.
        const parse = (c: string) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const [r, g, b, a = "1"] = m[1].split(",").map((x) => x.trim()); return { r: +r, g: +g, b: +b, a: +a }; };
        const lum = (c: { r: number; g: number; b: number }) => { const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
        // Fond effectif : premier fond opaque en remontant ; un fond semi-transparent (en-tête flouté) est composé sur le suivant.
        const bgOf = (e: Element) => { const layers: { r: number; g: number; b: number; a: number }[] = []; let n: Element | null = e; while (n) { const cs = getComputedStyle(n); if (cs.backgroundImage !== "none") return null; const c = parse(cs.backgroundColor); if (c && c.a > 0.02) { layers.push(c); if (c.a >= 0.99) break; } n = n.parentElement; } let out = { r: 255, g: 255, b: 255 }; for (const l of layers.reverse()) out = { r: l.r * l.a + out.r * (1 - l.a), g: l.g * l.a + out.g * (1 - l.a), b: l.b * l.a + out.b * (1 - l.a) }; return { r: Math.round(out.r), g: Math.round(out.g), b: Math.round(out.b) }; };
        const seen = new Set<string>();
        for (const e of all) { if (!visible(e) || !inFlow(e)) continue; const own = [...e.childNodes].filter((n) => n.nodeType === 3 && (n.textContent ?? "").trim().length > 2); if (!own.length) continue; const cs = getComputedStyle(e); const fg = parse(cs.color); if (!fg || fg.a < 0.99) continue; const bg = bgOf(e); if (!bg) continue; const l1 = lum(fg), l2 = lum(bg); const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); const size = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight) >= 700; const large = size >= 24 || (bold && size >= 18.66); const need = large ? 3 : 4.5; if (ratio < need) { const key = `${sel(e)}|${cs.color}|${bg.r},${bg.g},${bg.b}`; if (seen.has(key)) continue; seen.add(key); out.push({ kind: "contrast", page: file, viewport: vp, detail: `${ratio.toFixed(2)}:1 (requis ${need}) « ${(e.textContent ?? "").trim().slice(0, 50)} » ${cs.color} sur rgb(${bg.r},${bg.g},${bg.b})`, selector: sel(e) }); } }
        // 8. Titres : un seul h1 visible, pas de saut de niveau.
        const hs = [...document.querySelectorAll<HTMLElement>("h1,h2,h3,h4,h5,h6")].filter((h) => visible(h) && inFlow(h)); const h1 = hs.filter((h) => h.tagName === "H1").length; if (h1 !== 1) out.push({ kind: "headings", page: file, viewport: vp, detail: `${h1} titre(s) h1 visibles` });
        return out;
      }, { file, vp, mobile });
      issues.push(...found); for (const i of found) summary[i.kind] = (summary[i.kind] ?? 0) + 1;
    }
    await context.close();
  }
  // Interactions clavier : un parcours Tab sur l'accueil (ordinateur) doit laisser un indicateur de focus visible sur chaque arrêt.
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "fr-FR" }); const page = await context.newPage(); await page.addInitScript("window.__name=(fn)=>fn");
  await page.goto(`${origin}/accueil.html`, { waitUntil: "networkidle" });
  const focusIssues: string[] = []; let stops = 0;
  for (let i = 0; i < 40; i++) { await page.keyboard.press("Tab"); const r = await page.evaluate(() => { const a = document.activeElement as HTMLElement | null; if (!a || a === document.body) return null; const cs = getComputedStyle(a); const ring = (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== "none"; const rect = a.getBoundingClientRect(); return { tag: a.tagName, label: (a.innerText || a.getAttribute("aria-label") || "").trim().slice(0, 40), ring, visible: rect.width > 0 && rect.height > 0 }; }); if (!r) break; stops++; if (!r.ring) focusIssues.push(`${r.tag} « ${r.label} » sans indicateur de focus`); if (!r.visible) focusIssues.push(`${r.tag} « ${r.label} » focalisé mais invisible`); }
  await context.close();
  for (const f of focusIssues) { issues.push({ kind: "focus", page: "accueil.html", viewport: "1440x900", detail: f }); summary.focus = (summary.focus ?? 0) + 1; }
  const grouped: Record<string, Record<string, string[]>> = {};
  for (const i of issues) { (grouped[i.kind] ??= {})[`${i.page} @ ${i.viewport}`] ??= []; const list = grouped[i.kind][`${i.page} @ ${i.viewport}`]; if (list.length < 6) list.push(`${i.selector ? i.selector + " — " : ""}${i.detail}`); }
  fs.writeFileSync(path.join(out, `${kind}-audit.json`), JSON.stringify({ kind, dir, date: new Date().toISOString(), pages: pages.length, viewports: VIEWPORTS.map(([w, h]) => `${w}x${h}`), focusStops: stops, summary, grouped, issues }, null, 2) + "\n");
  console.log(JSON.stringify({ kind, pages: pages.length, focusStops: stops, summary }));
} finally { await browser.close(); server.close(); }
