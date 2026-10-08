/**
 * Contrôle visuel automatisé d'un thème rendu dans un vrai navigateur (Chromium / Playwright) — phase 10A.
 * Détecte des DÉFAUTS techniques et ergonomiques (débordements, textes coupés ou superposés, images déformées ou
 * manquantes, boutons invisibles, appel à l'action hors écran, contraste, sections vides, liens cassés, erreurs
 * JavaScript, éléments trop petits au toucher, navigation au clavier, contenu bloqué par les animations).
 * Il NE MESURE PAS la beauté d'un design : le jugement artistique reste distinct (et appartient au propriétaire).
 */
import type { Page } from "playwright";

export type Finding = { check: string; severity: "blocking" | "warning"; detail: string };

/**
 * Mesures faites DANS la page (chaîne évaluée telle quelle : aucun code transformé par l'outil de compilation).
 * `mode` : "desktop" | "mobile".
 */
const IN_PAGE = `(mode, home) => {
  const out = [];
  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;
  const vis = (el) => { const s = getComputedStyle(el); const r = el.getBoundingClientRect(); return s.display !== "none" && s.visibility !== "hidden" && Number(s.opacity) > 0.05 && r.width > 0 && r.height > 0; };
  const rgb = (c) => { const m = c.match(/rgba?\\(([^)]+)\\)/); if (!m) return null; const p = m[1].split(/[ ,\\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  // Fond effectif : premier ancêtre au fond opaque ; null si une image, un dégradé ou une vidéo est derrière (non mesurable).
  const bgOf = (el) => {
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const s = getComputedStyle(n);
      if (s.backgroundImage && s.backgroundImage !== "none") return null;
      if (n.querySelector && n !== el && n.querySelector(":scope > img, :scope > picture, :scope > video") && getComputedStyle(n).position !== "static") return null;
      const c = rgb(s.backgroundColor);
      if (c && c.a > 0.9) return c;
    }
    return rgb(getComputedStyle(document.body).backgroundColor) || { r: 255, g: 255, b: 255, a: 1 };
  };
  const label = (el) => (el.tagName.toLowerCase() + (el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\\s+/)[0] : "") + " « " + (el.innerText || el.getAttribute("aria-label") || "").trim().slice(0, 40) + " »");
  const scrollable = (el) => { for (let n = el.parentElement; n; n = n.parentElement) { const s = getComputedStyle(n); if (/(auto|scroll)/.test(s.overflowX) || (s.overflowX === "hidden" && n.scrollWidth > n.clientWidth + 2)) return true; } return false; };

  // 1. Débordement horizontal de la page.
  const sw = document.documentElement.scrollWidth - vw;
  if (sw > 1) out.push({ check: "overflow", severity: "blocking", detail: "la page déborde de " + sw + " px en largeur" });

  // 2. Éléments plus larges que l'écran (hors carrousels défilants).
  let wide = 0;
  for (const el of document.querySelectorAll("main *, header *, footer *")) {
    if (!vis(el)) continue;
    const r = el.getBoundingClientRect();
    if ((r.right > vw + 2 || r.left < -2) && r.width < vw * 3 && !scrollable(el) && getComputedStyle(el).position !== "fixed") { if (wide++ < 3) out.push({ check: "offscreen-element", severity: mode === "mobile" ? "blocking" : "warning", detail: label(el) + " dépasse l'écran (" + Math.round(r.left) + "→" + Math.round(r.right) + " px)" }); }
  }

  // Textes réservés aux lecteurs d'écran (lien d'évitement, libellés masqués) exclus : ils sont masqués par conception.
  const srOnly = (el) => { for (let n = el; n; n = n.parentElement) { if (/visually-hidden|skip-link|sr-only/.test(typeof n.className === "string" ? n.className : "")) return true; const r = n.getBoundingClientRect(); const cs = getComputedStyle(n); if (cs.position === "absolute" && r.width <= 1 && r.height <= 1) return true; } return false; };
  const texts = [...document.querySelectorAll("h1,h2,h3,h4,p,li,a,button,label,summary,span,dd,dt,blockquote")].filter((el) => vis(el) && !srOnly(el) && [...el.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim().length > 1));

  // 3. Textes coupés (débordement masqué sans points de suspension, ni limitation de lignes voulue).
  let cut = 0;
  for (const el of texts) {
    const s = getComputedStyle(el);
    const clipX = el.scrollWidth > el.clientWidth + 2 && /hidden|clip/.test(s.overflowX) && s.textOverflow !== "ellipsis";
    const clipY = el.scrollHeight > el.clientHeight + 4 && /hidden|clip/.test(s.overflowY) && s.webkitLineClamp === "none" && !/-webkit-box/.test(s.display);
    if ((clipX || clipY) && cut++ < 4) out.push({ check: "clipped-text", severity: "warning", detail: label(el) + " est coupé" });
  }

  // 4. Titres et boutons qui se chevauchent.
  // Éléments flottants (boutons fixes, en-tête collant) exclus : ils passent au-dessus du contenu par conception.
  const fixedIn = (el) => { for (let n = el; n; n = n.parentElement) if (/fixed|sticky/.test(getComputedStyle(n).position)) return true; return false; };
  const key = [...document.querySelectorAll("h1,h2,h3,.button,button,a.btn,[class*=button]")].filter((el) => vis(el) && !fixedIn(el));
  let over = 0;
  for (let i = 0; i < key.length; i++) for (let j = i + 1; j < key.length; j++) {
    const a = key[i], b = key[j];
    if (a.contains(b) || b.contains(a)) continue;
    const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    const ix = Math.max(0, Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left));
    const iy = Math.max(0, Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top));
    const small = Math.min(ra.width * ra.height, rb.width * rb.height);
    if (small > 0 && (ix * iy) / small > 0.25 && over++ < 4) out.push({ check: "overlap", severity: "blocking", detail: label(a) + " chevauche " + label(b) });
  }

  // 5. Images déformées ou manquantes.
  for (const img of document.querySelectorAll("img")) {
    if (!vis(img)) continue;
    if (img.complete && img.naturalWidth === 0) { out.push({ check: "missing-image", severity: "blocking", detail: "image introuvable : " + (img.getAttribute("src") || "").slice(0, 80) }); continue; }
    const s = getComputedStyle(img);
    if (img.naturalWidth && s.objectFit === "fill") {
      const r = img.getBoundingClientRect();
      const d = Math.abs(img.naturalWidth / img.naturalHeight - r.width / r.height) / (img.naturalWidth / img.naturalHeight);
      if (d > 0.04) out.push({ check: "distorted-image", severity: "blocking", detail: "image déformée de " + Math.round(d * 100) + " % : " + (img.getAttribute("src") || "").slice(0, 60) });
    }
  }

  // 6. Contraste des textes (fond uni mesurable seulement).
  let low = 0;
  for (const el of texts) {
    const bg = bgOf(el);
    if (!bg) continue;
    const s = getComputedStyle(el);
    const fg = rgb(s.color);
    if (!fg || fg.a < 0.5) continue;
    const size = parseFloat(s.fontSize);
    const big = size >= 24 || (size >= 18.6 && Number(s.fontWeight) >= 700);
    const r = ratio(fg, bg);
    if (r < (big ? 3 : 4.5) && low++ < 5) out.push({ check: "contrast", severity: r < 2.5 ? "blocking" : "warning", detail: label(el) + " contraste " + r.toFixed(2) + ":1" });
  }

  // 7. Boutons invisibles ou trop petits au toucher.
  for (const el of document.querySelectorAll("main a.button, main button, main .button, header button, header a")) {
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (s.display === "none" || r.width === 0) continue;
    if (Number(s.opacity) < 0.1 || s.visibility === "hidden") { out.push({ check: "invisible-button", severity: "warning", detail: label(el) + " est invisible" }); continue; }
    if (mode === "mobile" && (r.width < 24 || r.height < 24) && (el.innerText || "").trim().length < 30) out.push({ check: "tap-target", severity: "warning", detail: label(el) + " " + Math.round(r.width) + "×" + Math.round(r.height) + " px (< 24 px)" });
  }

  // 8. Appel à l'action de l'ouverture visible sans défiler.
  const first = document.querySelector("main [id^=shopify-section], main > section, main > div");
  if (first && home) {
    const cta = [...first.querySelectorAll("a.button, a[class*=button], a[class*=btn], button")].find(vis);
    if (!cta) out.push({ check: "hero-cta", severity: "warning", detail: "aucun bouton dans l'ouverture" });
    else if (cta.getBoundingClientRect().bottom > vh) out.push({ check: "hero-cta", severity: "warning", detail: "le bouton de l'ouverture est sous la ligne de flottaison (" + Math.round(cta.getBoundingClientRect().bottom) + " px > " + vh + " px)" });
  }

  // 9. Sections vides.
  for (const s of document.querySelectorAll("main [id^=shopify-section]")) {
    const r = s.getBoundingClientRect();
    if (r.height < 40) continue;
    const txt = (s.innerText || "").replace(/\\s+/g, "").length;
    const media = s.querySelector("img, video, svg, iframe, canvas");
    if (txt < 3 && !media) out.push({ check: "empty-section", severity: "blocking", detail: "section vide : " + s.id });
  }

  // 10. Textes de remplissage interdits.
  if (/lorem ipsum/i.test(document.body.innerText)) out.push({ check: "lorem", severity: "blocking", detail: "texte « Lorem ipsum » présent" });

  return out;
}`;

/** Liens internes de la page (vérifiés côté serveur). */
const LINKS = `() => [...new Set([...document.querySelectorAll("a[href]")].map((a) => a.href).filter((h) => h.startsWith(location.origin) && !h.includes("#")))]`;

/** Défile lentement jusqu'en bas (images paresseuses, révélations au défilement), puis remonte. */
export async function scrollThrough(page: Page) {
  await page.evaluate(`(async () => { const h = () => document.documentElement.scrollHeight; for (let y = 0; y < h(); y += Math.round(innerHeight * 0.6)) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 90)); } scrollTo(0, 0); await new Promise((r) => setTimeout(r, 600)); })()`);
}

export async function visualCheck(page: Page, mode: "desktop" | "mobile", opts: { checkLinks?: boolean; home?: boolean } = {}): Promise<Finding[]> {
  await scrollThrough(page);
  const found = (await page.evaluate(`(${IN_PAGE})(${JSON.stringify(mode)}, ${opts.home !== false})`)) as Finding[];
  if (opts.checkLinks) {
    const links = (await page.evaluate(`(${LINKS})()`)) as string[];
    for (const href of links.slice(0, 40)) {
      const r = await page.request.get(href).catch(() => null);
      if (!r || r.status() >= 400) found.push({ check: "broken-link", severity: "blocking", detail: `lien cassé (${r?.status() ?? "erreur"}) : ${new URL(href).pathname}` });
    }
  }
  return found;
}

/**
 * Mouvements réduits : avec « prefers-reduced-motion: reduce », aucun texte de la page ne doit rester caché par une
 * animation d'apparition après le défilement.
 */
export async function reducedMotionCheck(page: Page): Promise<Finding[]> {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload({ waitUntil: "networkidle" });
  await scrollThrough(page);
  const hidden = (await page.evaluate(`(() => [...document.querySelectorAll("main h1, main h2, main h3, main p")].filter((el) => { const s = getComputedStyle(el); const r = el.getBoundingClientRect(); let o = 1; for (let n = el; n; n = n.parentElement) o *= Number(getComputedStyle(n).opacity); return r.width > 0 && s.display !== "none" && o < 0.2 && el.innerText.trim().length > 2; }).length)()`)) as number;
  await page.emulateMedia({ reducedMotion: "no-preference" });
  return hidden ? [{ check: "reduced-motion", severity: "blocking", detail: `${hidden} texte(s) restent invisibles avec les mouvements réduits` }] : [];
}

/** Navigation au clavier : les premiers éléments atteints par Tab sont visibles et ont un repère de focus. */
export async function keyboardCheck(page: Page): Promise<Finding[]> {
  await page.evaluate("scrollTo({ top: 0, behavior: \"instant\" })");
  await page.waitForTimeout(300);
  const out: Finding[] = [];
  let seen = 0;
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press("Tab");
    await page.waitForTimeout(400); // défilement doux vers l'élément atteint
    const probe = async () => (await page.evaluate(`(() => { const el = document.activeElement; if (!el || el === document.body) return null; const s = getComputedStyle(el); const b = el.getBoundingClientRect(); return { tag: el.tagName, text: (el.innerText || el.getAttribute("aria-label") || "").trim().slice(0, 30), ring: (s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0) || s.boxShadow !== "none", inView: b.bottom > 0 && b.top < innerHeight && b.width > 0, where: (typeof el.className === "string" ? el.className.split(" ")[0] : "") + " @" + Math.round(b.top) + "," + Math.round(b.left) + " " + Math.round(b.width) + "x" + Math.round(b.height) + " vue " + Math.round(scrollY) + "/" + innerHeight }; })()`)) as { tag: string; text: string; ring: boolean; inView: boolean; where: string } | null;
    let r = await probe();
    // Défilement doux encore en cours vers l'élément atteint : on laisse le temps d'arriver avant de conclure.
    if (r && !r.inView) {
      await page.waitForTimeout(900);
      r = await probe();
    }
    if (!r) continue;
    seen++;
    if (!r.inView) out.push({ check: "keyboard", severity: "warning", detail: `focus hors écran sur ${r.tag} « ${r.text} » (${r.where})` });
    else if (!r.ring) out.push({ check: "keyboard", severity: "warning", detail: `aucun repère de focus visible sur ${r.tag} « ${r.text} »` });
  }
  if (!seen) out.push({ check: "keyboard", severity: "blocking", detail: "aucun élément atteignable au clavier" });
  return out.slice(0, 4);
}
