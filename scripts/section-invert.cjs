/**
 * Règles « fond inversé » de la bibliothèque de sections (insérées dans public/sections/library.css), demande du propriétaire du
 * 9 novembre 2026 : une section sur fond clair doit pouvoir passer en sombre (et l'inverse), selon l'ambiance voulue par
 * le client.
 *
 * Lit library.css et, pour chaque règle qui porte une couleur NEUTRE (blancs, crèmes, gris, noirs, écrits en dur ou par
 * les couleurs sombre et claire de la marque), écrit la même règle préfixée par `.ct-inv` avec la couleur inversée :
 * sa clarté est retournée entre la couleur sombre (--b-dark) et la couleur claire (--b-soft) de la marque. Les couleurs
 * vives (accent, bouton, couleur principale) ne bougent pas ; les états (survol, onglet actif…) et les règles propres au
 * téléphone sont gardés puisque chaque règle est reprise avec ses sélecteurs et son bloc @container / @media.
 * Une section inversée est posée dans `<div class="ct-inv" style="display:contents">` (aucun effet sur la mise en page).
 * Usage : node scripts/section-invert.cjs (gratuit, aucune IA ; à relancer après chaque génération de la bibliothèque).
 */
const fs = require("fs"), path = require("path");
const postcss = require("postcss");
const DIR = path.join(__dirname, "..", "public", "sections");

const NAMED = { white: [255, 255, 255, 1], black: [0, 0, 0, 1] };
function parseColor(t) {
  t = t.trim().toLowerCase();
  if (NAMED[t]) return NAMED[t];
  let m = t.match(/^#([0-9a-f]{3,8})$/);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = h.split("").map((c) => c + c).join("");
    if (h.length !== 6 && h.length !== 8) return null;
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1];
  }
  m = t.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/);
  if (m) { const a = m[4] === undefined ? 1 : m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4]); return [+m[1], +m[2], +m[3], a]; }
  return null;
}
/** Clarté perçue (0 noir, 1 blanc), proche de la clarté L d'Oklab. */
function lightness([r, g, b]) {
  const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const Y = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return Math.cbrt(Y);
}
const neutral = ([r, g, b]) => { const mx = Math.max(r, g, b), mn = Math.min(r, g, b); return mx === 0 || (mx - mn) / mx < 0.22 || mx < 40 || mn > 225; };
const pct = (x) => `${Math.round(Math.max(0, Math.min(1, x)) * 100)}%`;
/** Couleur neutre inversée : sa clarté est retournée entre la couleur sombre et la couleur claire de la marque. */
function inverted(rgba, o = {}) {
  const L = lightness(rgba);
  let x = 1 - L;
  // poussée vers l'extrême (un fond sombre devient vraiment clair, pas un gris moyen sur lequel aucun texte n'est
  // lisible), en douceur : l'écart entre deux fonds voisins est gardé
  x = 0.5 + 0.5 * Math.sign(x - 0.5) * Math.abs(2 * x - 1) ** (o.palette ? 0.25 : 0.3);
  let c = `color-mix(in oklab, var(--b-soft, #fff) ${pct(x)}, var(--b-dark, #141414))`;
  if (rgba[3] < 1) c = `color-mix(in srgb, ${c} ${pct(rgba[3])}, transparent)`;
  return c;
}
const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|\b(?:white|black)\b/g;
/** Noir ou blanc (adoucis) selon la clarté du fond donné : texte toujours lisible sur un bouton de couleur vive. */
const onBg = (bg) => `oklch(from ${bg.replace(/\s*!important/, "")} calc(0.17 + 0.8 * clamp(0, (0.64 - l) * 999, 1)) 0 0)`;
/** Couleur d'un fond, d'un bord ou d'un réglage de couleur dans une section inversée (null : rien à changer). */
function convert(value, o = {}) {
  let changed = false;
  // 1) couleurs sombre et claire de la marque : échangées (AVANT d'écrire les couleurs inversées, qui en contiennent)
  // (sections Classique à palette tA / tB / tN : --c1 encre sombre ↔ --c4 fond clair ; --c3, teinte claire de la marque,
  // devient une teinte sombre de la marque ; --c2 et --c5, couleurs vives, ne bougent pas)
  let v = value.replace(/var\(\s*(--b-dark|--b-ink|--b-soft|--b-white|--c1|--c4)\b/g, (m, name) => {
    changed = true;
    return `var(${name === "--b-soft" || name === "--b-white" ? "--b-dark" : name === "--c1" ? "--c4" : name === "--c4" ? "--c1" : "--b-soft"}`;
  });
  v = v.replace(/var\(\s*--c3\s*\)/g, () => { changed = true; return "color-mix(in oklab, var(--c2) 30%, var(--b-dark, #141414))"; });
  // 2) couleurs neutres écrites en dur : clarté retournée entre la couleur sombre et la couleur claire de la marque
  v = v.replace(COLOR_RE, (lit) => {
    const c = parseColor(lit); if (!c) return lit;
    // couleur vive : gardée (un texte vif est rendu lisible plus bas). Dans un réglage de couleur (--q-bk, --e-nv…),
    // un fond très sombre ou très clair, même teinté (bleu nuit, crème), est un fond : il s'inverse.
    const L = lightness(c);
    const tinted = () => { const mx = Math.max(c[0], c[1], c[2]), mn = Math.min(c[0], c[1], c[2]); return mx === 0 || (mx - mn) / mx < 0.5; };
    if (!neutral(c) && !(o.palette && (L < 0.34 || L > 0.9) && tinted())) return lit;
    changed = true; return inverted(c, o);
  });
  return changed ? v : null;
}
const COLOR_PROPS = /^(color|text-shadow|-webkit-text-fill-color|background|background-color|background-image|border|border-(top|right|bottom|left)(-color)?|border-color|outline|outline-color|fill|stroke|caret-color|text-decoration-color|column-rule-color|--.+)$/;
function prefix(sel, cls = ".ct-inv") {
  return sel.split(",").map((x) => {
    x = x.trim();
    const m = x.match(/^((?:html|body|:root)(?:\[[^\]]*\])*)(\s+|$)(.*)$/);
    if (m) return m[3] ? `${m[1]} ${cls} ${m[3]}` : null;
    return `${cls} ${x}`;
  }).filter(Boolean).join(",");
}

const file = path.join(DIR, "library.css");
const root = postcss.parse(fs.readFileSync(file, "utf8"));
// relançable : on retire d'abord les règles inversées d'un passage précédent
root.walkRules((rule) => { if (/(^|[\s,])(:where\()?\.ct-(inv|dark|light)\b/.test(rule.selector) || /^(:where\()?\.ct-(inv|dark|light)/.test(rule.selector)) { const p = rule.parent; rule.remove(); if (p && p.type === "atrule" && !p.nodes.length) p.remove(); } });
root.walkComments((c) => { if (c.text.startsWith("Fond inversé des sections")) c.remove(); });
const TEXT_NAME = /^--[\w-]*(mu|muted|tx|text|ink|fg)$/i;
// Réglages de couleur de fond (--q-bk, --e-nv, --e-cr…) redéfinis par l'inversion : un texte qui s'en sert est déjà
// retourné avec eux.
const redefined = new Set();
// (les couleurs de la marque --b-*, posées sur :root, ne sont jamais redéfinies : elles sont échangées là où elles servent)
root.walkDecls(/^--/, (d) => { if (!TEXT_NAME.test(d.prop) && !/-on$/i.test(d.prop) && !/^--(c[1-5]|b-[\w-]+)$/.test(d.prop) && d.parent.type === "rule" && prefix(d.parent.selector) && convert(d.value, { palette: true })) redefined.add(d.prop); });
/**
 * Couleur d'un texte dans une section inversée, calculée par le navigateur avec les vraies couleurs de la marque.
 * Chaque fond (la section, une carte, un bandeau) dit s'il est devenu clair ou sombre (--ct-gl : 1 clair, 0 sombre) ;
 * le texte posé dessus prend la clarté lisible sur CE fond : sur un fond devenu clair, un texte clair est retourné en
 * sombre (au plus 0,40) et un texte sombre le reste ; sur un fond devenu sombre, l'inverse (au moins 0,83). Teinte et
 * saturation gardées (un doré reste doré). Dans une carte ou un bouton qui GARDE son fond (--ct-flip : 0), le texte
 * garde sa couleur d'origine, faite pour ce fond (retour du propriétaire du 9 novembre 2026 : textes de la couleur du
 * fond).
 */
function textValue(value) {
  const v = value.trim();
  if (/^(transparent|inherit|currentcolor|initial|unset|none)$/i.test(v) || !/var\(--|#|rgb|oklab|oklch|hsl|color-mix|\b(white|black)\b/i.test(v)) return null;
  const s = "clamp(0, (l - 0.5) * 999, 1)"; // 1 : texte clair à l'origine
  const onLight = `(${s} * clamp(0.16, 1 - l, 0.4) + (1 - ${s}) * min(l, 0.4))`;
  const onDark = `((1 - ${s}) * clamp(0.83, 1 - l, 0.97) + ${s} * max(l, 0.83))`;
  const L = `(var(--ct-gl, 0) * ${onLight} + (1 - var(--ct-gl, 0)) * ${onDark})`;
  return `oklch(from ${v} calc(var(--ct-flip, 1) * ${L} + (1 - var(--ct-flip, 1)) * l) c h / calc(var(--ct-flip, 1) * max(alpha, 0.8) + (1 - var(--ct-flip, 1)) * alpha))`;
}
/** Clarté d'origine approchée d'un fond (couleurs de la bibliothèque, réglages compris) : il devient clair s'il était sombre. */
const defaults = new Map();
root.walkDecls(/^--/, (d) => { if (!defaults.has(d.prop)) defaults.set(d.prop, d.value); });
function origLight(value, depth = 0) {
  const v = value.replace(/var\(\s*(--[\w-]+)\s*(?:,[^()]*(?:\([^()]*\)[^()]*)*)?\)/g, (m, name) => (depth < 4 && defaults.has(name) ? defaults.get(name) : m));
  if (v !== value && depth < 4 && /var\(--/.test(v)) return origLight(v, depth + 1);
  const c = (v.match(COLOR_RE) || []).map(parseColor).filter((x) => x && x[3] >= 0.5)[0];
  return c ? lightness(c) : null;
}
let rules = 0, decls = 0;
const todo = [];
const TEXT_PROPS = /^(color|fill|stroke|caret-color|text-decoration-color|-webkit-text-fill-color)$/;
root.walkRules((rule) => {
  if (rule.parent && rule.parent.type === "atrule" && /keyframes$/i.test(rule.parent.name)) return;
  // palettes d'exemple des sections Classique (.tA, .tB, .tN) : remplacées par la marque, inversées par référence
  if (/^\.t[ABN](\s*,\s*\.t[ABN])*$/.test(rule.selector.trim())) return;
  const ground = [], dark = [], light = [];
  const own = rule.nodes.filter((d) => d.type === "decl");
  // Paire fond + texte posée par la même règle (bouton, pastille, badge, bandeau) : elle reste cohérente. Si son fond
  // s'inverse et son texte aussi, les deux s'inversent ensemble (le contraste est gardé) ; si l'un des deux est une
  // couleur vive qui ne bouge pas (bouton doré, chiffre doré sur pastille sombre), la paire est gardée telle quelle.
  const bgDecl = [...own].reverse().find((d) => /^background(-color)?$/.test(d.prop) && !/^\s*(none|transparent|inherit|initial|unset)\s*$/i.test(d.value) && !/url\(/.test(d.value));
  const opaque = (val) => { const lits = val.match(COLOR_RE) || []; const cs = lits.map(parseColor).filter(Boolean); return !cs.length ? /var\(--/.test(val) : cs.some((c) => c[3] >= 0.6); };
  const pairBg = bgDecl && opaque(bgDecl.value) && !/gradient\(/.test(bgDecl.value) ? bgDecl : null;
  const pairText = pairBg ? own.filter((d) => /^(color|fill|-webkit-text-fill-color)$/.test(d.prop) && !/^\s*(inherit|currentcolor|transparent)\s*$/i.test(d.value)) : [];
  let keepPair = false;
  if (pairBg && pairText.length) {
    // chaque couleur de la paire « bascule » soit par conversion (couleur neutre, couleur sombre ou claire de la marque),
    // soit parce qu'elle vient d'un réglage redéfini par l'inversion (var(--e-nv), var(--q-bk)…)
    const viaVar = (v) => [...v.matchAll(/var\(\s*(--[\w-]+)/g)].some((m) => redefined.has(m[1]));
    const bgV = convert(pairBg.value), bgFlips = !!bgV || viaVar(pairBg.value);
    const tx = pairText.map((d) => ({ d, v: convert(d.value), flips: !!convert(d.value) || viaVar(d.value) }));
    const push = (d, v) => ground.push(postcss.decl({ prop: d.prop, value: v, important: d.important }));
    if (!bgV && /var\(--/.test(pairBg.value) && (viaVar(pairBg.value) || tx.some((t) => viaVar(t.d.value)))) {
      // fond pris dans un réglage de couleur (var(--po-ac), var(--q-bk)…) : selon l'endroit, il s'inverse ou reste
      // vif ; le texte est choisi noir ou blanc d'après la clarté réelle de ce fond, calculée par le navigateur
      tx.forEach((t) => push(t.d, onBg(pairBg.value)));
    } else if (bgFlips && tx.every((t) => t.flips)) { // les deux s'inversent ensemble : le contraste est gardé
      if (bgV) push(pairBg, bgV);
      tx.forEach((t) => { if (t.v && !viaVar(t.d.value)) push(t.d, t.v); });
    } else if (bgFlips && !bgV) { // fond inversé par son réglage, texte vif : le texte est retourné (doré foncé sur clair)
      tx.forEach((t) => { if (!t.flips) { const v = textValue(t.d.value); if (v) push(t.d, v); } else if (t.v && !viaVar(t.d.value)) push(t.d, t.v); });
    } else if (bgFlips) { // fond converti mais texte vif (pastille sombre au chiffre doré) : la paire garde ses couleurs
      keepPair = true;
    } else { // fond vif gardé (bouton doré, bouton fluo) : un texte inversé par son réglage devient noir ou blanc selon lui
      keepPair = true;
      tx.forEach((t) => { if (t.flips && viaVar(t.d.value)) push(t.d, onBg(pairBg.value)); });
    }
  }
  // Ce fond s'inverse-t-il avec la section ? Il le dit aux textes qu'il porte (--ct-flip : 1 oui, 0 non).
  const anyBg = [...own].reverse().find((d) => /^background(-color|-image)?$/.test(d.prop) && !/^\s*(none|transparent|inherit|initial|unset)\s*$/i.test(d.value));
  if (anyBg && !/::?(before|after|placeholder|marker|selection)/.test(rule.selector)) {
    const lits = (anyBg.value.match(COLOR_RE) || []).map(parseColor).filter(Boolean);
    // (un dégradé n'est un fond que s'il couvre l'élément : pas de taille donnée, aucune partie transparente ; un trait
    // de soulignement dessiné en dégradé n'en est pas un)
    const outer = anyBg.value.replace(/\([^()]*(?:\([^()]*\)[^()]*)*\)/g, "()");
    const sized = /\//.test(outer) || own.some((d) => d.prop === "background-size");
    const gradientOk = !/gradient\(/.test(anyBg.value) || (!sized && !/transparent/.test(anyBg.value));
    const solid = /url\(/.test(anyBg.value) ? !sized : gradientOk && (lits.length ? lits.every((c) => c[3] >= 0.6) : /var\(--/.test(anyBg.value));
    if (solid) {
      const viaVar = [...anyBg.value.matchAll(/var\(\s*(--[\w-]+)/g)].some((m) => redefined.has(m[1]));
      const flips = !/url\(/.test(anyBg.value) && !keepPair && (!!convert(anyBg.value) || viaVar);
      ground.push(postcss.decl({ prop: "--ct-flip", value: flips ? "1" : "0" }));
      const L0 = flips ? origLight(anyBg.value) : null;
      // fond tiré d'un réglage redéfini (var(--q-bk)…) : il est sombre dans une famille, clair dans une autre ; le
      // réglage porte lui-même le sens de son inversion (--q-bk-gl)
      const first = anyBg.value.match(/^\s*var\(\s*(--[\w-]+)/);
      if (flips && first && redefined.has(first[1])) ground.push(postcss.decl({ prop: "--ct-gl", value: `var(${first[1]}-gl, ${L0 !== null && L0 >= 0.5 ? 0 : 1})` }));
      else if (L0 !== null) ground.push(postcss.decl({ prop: "--ct-gl", value: L0 < 0.5 ? "1" : "0" }));
    }
  }
  const done = new Set(pairBg && pairText.length ? [pairBg, ...pairText] : []);
  for (const d of own) {
    if (done.has(d) || !COLOR_PROPS.test(d.prop)) continue;
    if (/^--[\w-]*-on$/i.test(d.prop)) continue; // texte posé sur la couleur vive d'un bouton : gardé avec elle
    if (keepPair && /^border/.test(d.prop)) continue; // bord d'un bouton vif : gardé avec lui
    // voile en dégradé dont aucune couleur n'est pleine (assombrit une photo pour qu'un texte blanc s'y lise) : gardé
    if (/^background(-image)?$/.test(d.prop) && /gradient\(/.test(d.value)) {
      const cs = (d.value.match(COLOR_RE) || []).map(parseColor).filter(Boolean);
      if (cs.length && cs.every((c) => c[3] < 1) && !/var\(--/.test(d.value)) continue;
    }
    // Réglage de couleur qui désigne un texte (--po-mu, --q-tx, --e-ink, --muted…) : laissé tel quel, c'est là où il
    // colore un texte qu'il est retourné (sinon il le serait deux fois).
    if (TEXT_NAME.test(d.prop)) continue;
    if (TEXT_PROPS.test(d.prop)) {
      const t = textValue(d.value);
      if (t) ground.push(postcss.decl({ prop: d.prop, value: t, important: d.important }));
      continue;
    }
    const v = convert(d.value, { palette: d.prop.startsWith("--") }); if (v) ground.push(postcss.decl({ prop: d.prop, value: v, important: d.important }));
    // réglage de couleur inversé : il dit aussi dans quel sens (1 : devenu clair, 0 : devenu sombre)
    if (v && redefined.has(d.prop)) { const L0 = origLight(d.value); if (L0 !== null) ground.push(postcss.decl({ prop: `${d.prop}-gl`, value: L0 < 0.5 ? "1" : "0" })); }
  }
  // « background: » raccourci : il remettrait à zéro le découpage du fond (texte en dégradé : background-clip:text) ;
  // on le recopie après lui.
  if (ground.some((d) => d.prop === "background")) for (const d of own) if (/^(-webkit-)?background-clip$/.test(d.prop)) ground.push(postcss.decl({ prop: d.prop, value: d.value, important: d.important }));
  // Règle inversée posée juste après l'original avec la MÊME priorité (:where ne compte pas) : une règle plus précise
  // écrite plus loin garde la main (deux sections qui partagent un nom de classe, comme .s3, ne se gênent plus).
  // Seuls les réglages de couleur (--e-nv, --po-ac…) gardent une classe de plus : ils doivent l'emporter sur les
  // couleurs de la marque posées par le Studio.
  const isVar = (d) => d.prop.startsWith("--") && !d.prop.startsWith("--ct-");
  const vars = ground.filter(isVar), plain = ground.filter((d) => !isVar(d));
  for (const [cls, decls_] of [[":where(.ct-inv)", plain], [".ct-inv", vars], [":where(.ct-inv.ct-dark)", dark], [":where(.ct-inv.ct-light)", light]]) {
    if (!decls_.length) continue;
    const sel = prefix(rule.selector, cls);
    if (!sel) continue;
    const r = postcss.rule({ selector: sel }); decls_.forEach((d) => r.append(d));
    todo.push([rule, r]); rules++; decls += decls_.length;
  }
});
// chaque règle inversée juste après sa règle d'origine, dans le même bloc : l'ordre de la cascade est gardé
// chaque règle inversée juste après sa règle d'origine (dans l'ordre), dans le même bloc : la cascade est gardée
const after = new Map();
for (const [rule, r] of todo) { const last = after.get(rule) ?? rule; last.after(r); after.set(rule, r); }
// Couleurs écrites dans le code HTML d'une section (attribut style, ex. style="color:#fff") : une feuille de style ne les
// remplace qu'avec !important ; on les retrouve par le texte de l'attribut.
const lib = JSON.parse(fs.readFileSync(path.join(DIR, "library.json"), "utf8"));
const inline = new Map();
for (const sec of lib.sections) for (const m of sec.html.matchAll(/style="([^"]*)"/g)) for (const d of m[1].split(";")) {
  const i = d.indexOf(":"); if (i < 0) continue;
  const prop = d.slice(0, i).trim(), value = d.slice(i + 1).trim();
  if (/^(color|background|background-color|border|border-color|fill|stroke)$/.test(prop) && /#|rgb|var\(--|\b(white|black)\b/.test(value)) inline.set(`${prop}:${value}`, { prop, value, raw: d.trim() });
}
for (const { prop, value, raw } of inline.values()) {
  const attr = `[style^="${raw}"],[style*=";${raw}"],[style*="; ${raw}"]`;
  const wrap = (cls) => attr.split(",").map((x) => `${cls} ${x}`).join(",");
  if (TEXT_PROPS.test(prop)) {
    const t = textValue(value);
    if (t) root.append(postcss.rule({ selector: wrap(":where(.ct-inv)"), nodes: [postcss.decl({ prop, value: t, important: true })] }));
  } else {
    const v = convert(value), nodes = [];
    if (v) nodes.push(postcss.decl({ prop, value: v, important: true }));
    if (/^background/.test(prop)) {
      const L0 = v ? origLight(value) : null;
      nodes.push(postcss.decl({ prop: "--ct-flip", value: v ? "1" : "0" }));
      if (L0 !== null) nodes.push(postcss.decl({ prop: "--ct-gl", value: L0 < 0.5 ? "1" : "0" }));
    }
    if (nodes.length) root.append(postcss.rule({ selector: wrap(":where(.ct-inv)"), nodes }));
  }
  rules++;
}
root.prepend(postcss.comment({ text: "Fond inversé des sections (scripts/section-invert.cjs) : règles .ct-inv insérées après leur règle d'origine." }));
root.append(postcss.rule({ selector: ".ct-inv", nodes: [postcss.decl({ prop: "display", value: "contents" }), postcss.decl({ prop: "--ct-flip", value: "1" })] }));
// sens du fond de la section : devenu sombre (--ct-gl 0) ou devenu clair (1)
root.append(postcss.rule({ selector: ".ct-inv.ct-dark", nodes: [postcss.decl({ prop: "--ct-gl", value: "0" })] }));
root.append(postcss.rule({ selector: ".ct-inv.ct-light", nodes: [postcss.decl({ prop: "--ct-gl", value: "1" })] }));
// Champs de formulaire sans fond à eux (fond blanc du navigateur) : transparents dans une section inversée, sinon un
// texte devenu clair s'écrit sur du blanc (priorité nulle : toute règle des sections passe devant).
root.append(postcss.rule({ selector: ":where(.ct-inv :is(input,textarea,select))", nodes: [postcss.decl({ prop: "background-color", value: "transparent" })] }));
// Boutons et champs sans couleur de texte à eux (noir du navigateur) : ils prennent celle de la section inversée.
root.append(postcss.rule({ selector: ":where(.ct-inv :is(button,input,textarea,select))", nodes: [postcss.decl({ prop: "color", value: "inherit" })] }));
// Section sans fond à elle (elle laissait voir le fond clair de la page) : fond et texte inversés par défaut. Les règles
// inversées propres à la section (spécificité plus forte) gardent la main quand elle a son propre fond.
root.append(postcss.rule({ selector: ".ct-dark>*", nodes: [postcss.decl({ prop: "background-color", value: "var(--b-dark, #141414)" }), postcss.decl({ prop: "color", value: "var(--b-soft, #fff)" })] }));
root.append(postcss.rule({ selector: ".ct-light>*", nodes: [postcss.decl({ prop: "background-color", value: "var(--b-soft, #fff)" }), postcss.decl({ prop: "color", value: "var(--b-dark, #141414)" })] }));
fs.writeFileSync(file, root.toString());
console.log(`library.css : ${rules} règles inversées ajoutées (${decls} couleurs)`);
