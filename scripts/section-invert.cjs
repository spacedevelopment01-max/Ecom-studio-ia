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
/** Couleur inversée. `text` : couleur d'un texte, poussée vers l'extrême lisible selon le sens (vers le clair quand la
 *  section devient sombre, vers le sombre quand elle devient claire) : un gris moyen sur blanc ne reste pas un gris moyen
 *  sur sombre (contraste mesuré trop faible). */
function inverted(rgba, o = {}) {
  const L = lightness(rgba);
  let x = 1 - L;
  if (o.text === "dark") x = x ** 0.55; else if (o.text === "light") x = x ** 1.8;
  let c = `color-mix(in oklab, var(--b-soft, #fff) ${pct(x)}, var(--b-dark, #141414))`;
  if (rgba[3] < 1) c = `color-mix(in srgb, ${c} ${pct(rgba[3])}, transparent)`;
  return c;
}
const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|\b(?:white|black)\b/g;
/** o.text : « dark » (la section devient sombre) ou « light » (elle devient claire) pour une couleur de texte. */
function convert(value, o = {}) {
  let changed = false;
  // 1) couleurs sombre et claire de la marque : échangées (AVANT d'écrire les couleurs inversées, qui en contiennent)
  let v = value.replace(/var\(\s*(--b-dark|--b-ink|--b-soft|--c4|--c5)\b/g, (m, name) => {
    changed = true;
    return `var(${name === "--b-soft" ? "--b-dark" : name === "--c5" ? "--c4" : name === "--c4" ? "--c5" : "--b-soft"}`;
  });
  // 2) couleurs neutres écrites en dur : clarté retournée entre la couleur sombre et la couleur claire de la marque
  v = v.replace(COLOR_RE, (lit) => {
    const c = parseColor(lit); if (!c) return lit;
    if (!neutral(c)) {
      // couleur vive d'un texte : légèrement éclaircie sur fond devenu sombre (ou assombrie sur fond devenu clair)
      if (!o.text) return lit;
      changed = true;
      return `color-mix(in oklab, ${lit} 72%, var(${o.text === "dark" ? "--b-soft, #fff" : "--b-dark, #141414"}))`;
    }
    changed = true; return inverted(c, o);
  });
  // Texte dont la couleur vient d'un réglage (accent de la marque, réglage propre à une famille comme --q-lm ou --e-or) :
  // renforcé vers le contraste du nouveau fond (un vert fluo sur crème ou un bleu sur vert sombre devenaient illisibles).
  if (o.text && !changed && /var\(--/.test(v) && !/transparent|inherit|currentcolor/i.test(v)) {
    changed = true;
    v = `color-mix(in oklab, ${v} ${o.text === "light" ? "58%" : "70%"}, var(${o.text === "dark" ? "--b-soft, #fff" : "--b-dark, #141414"}))`;
  }
  return changed ? v : null;
}
const COLOR_PROPS = /^(color|background|background-color|background-image|border|border-(top|right|bottom|left)(-color)?|border-color|outline|outline-color|fill|stroke|caret-color|text-decoration-color|column-rule-color|--.+)$/;
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
root.walkRules((rule) => { if (/(^|[\s,])\.ct-(inv|dark|light)\b/.test(rule.selector) || /^\.ct-(inv|dark|light)/.test(rule.selector)) { const p = rule.parent; rule.remove(); if (p && p.type === "atrule" && !p.nodes.length) p.remove(); } });
root.walkComments((c) => { if (c.text.startsWith("Fond inversé des sections")) c.remove(); });
let rules = 0, decls = 0;
const todo = [];
const TEXT_PROPS = /^(color|fill|stroke|caret-color|text-decoration-color)$/;
root.walkRules((rule) => {
  if (rule.parent && rule.parent.type === "atrule" && /keyframes$/i.test(rule.parent.name)) return;
  const ground = [], dark = [], light = [];
  // Élément intérieur qui porte déjà sa propre paire fond de marque + texte (pastille, badge, bouton) : gardé tel quel,
  // son contraste ne dépend pas du fond de la section (une pastille sombre au chiffre doré devenait claire et illisible).
  const inner = /[\s>+~]/.test(rule.selector.split(",")[0].trim());
  const bgDecl = rule.nodes.find((d) => d.type === "decl" && /^background(-color)?$/.test(d.prop));
  const hasText = rule.nodes.some((d) => d.type === "decl" && d.prop === "color");
  if (inner && bgDecl && hasText && /var\(--(b-dark|b-ink|b-primary|b-gold|c[1-4])\b/.test(bgDecl.value) && !/#|rgb/.test(bgDecl.value)) return;
  rule.walkDecls((d) => {
    if (!COLOR_PROPS.test(d.prop)) return;
    // Réglage de couleur qui désigne un texte (--po-mu, --q-tx, --e-ink, --muted…) : traité comme un texte.
    if (TEXT_PROPS.test(d.prop) || /^--[\w-]*(mu|muted|tx|text|ink|fg|on)$/i.test(d.prop)) {
      const a = convert(d.value, { text: "dark" }), b = convert(d.value, { text: "light" });
      if (a) dark.push(postcss.decl({ prop: d.prop, value: a, important: d.important }));
      if (b) light.push(postcss.decl({ prop: d.prop, value: b, important: d.important }));
      return;
    }
    const v = convert(d.value); if (v) ground.push(postcss.decl({ prop: d.prop, value: v, important: d.important }));
  });
  for (const [cls, decls_] of [[".ct-inv", ground], [".ct-dark", dark], [".ct-light", light]]) {
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
root.prepend(postcss.comment({ text: "Fond inversé des sections (scripts/section-invert.cjs) : règles .ct-inv insérées après leur règle d'origine." }));
root.append(postcss.rule({ selector: ".ct-inv", nodes: [postcss.decl({ prop: "display", value: "contents" })] }));
// Section sans fond à elle (elle laissait voir le fond clair de la page) : fond et texte inversés par défaut. Les règles
// inversées propres à la section (spécificité plus forte) gardent la main quand elle a son propre fond.
root.append(postcss.rule({ selector: ".ct-dark>*", nodes: [postcss.decl({ prop: "background-color", value: "var(--b-dark, #141414)" }), postcss.decl({ prop: "color", value: "var(--b-soft, #fff)" })] }));
root.append(postcss.rule({ selector: ".ct-light>*", nodes: [postcss.decl({ prop: "background-color", value: "var(--b-soft, #fff)" }), postcss.decl({ prop: "color", value: "var(--b-dark, #141414)" })] }));
fs.writeFileSync(file, root.toString());
console.log(`library.css : ${rules} règles inversées ajoutées (${decls} couleurs)`);
