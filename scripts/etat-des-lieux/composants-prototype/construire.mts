/**
 * PROTOTYPE « une section = un composant, une seule source » (12 novembre 2026, gratuit, sans IA).
 * À partir des MÊMES composants (schéma + gabarit Liquid + style) et de jeux de DONNÉES :
 *   1. contrôle des données (réglage inconnu, texte trop long ou trop court) AVANT tout affichage ;
 *   2. aperçu du Studio pour chaque marque (rendu Liquid) ;
 *   3. thème Shopify (sections avec schéma, modèles JSON) vérifié par Theme Check, l'outil officiel de Shopify.
 * Aucune ligne de HTML n'est retouchée à la main ni par remplacement : seules les données changent.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import os from "node:os";

const REPO = process.cwd();
const ICI = path.dirname(new URL(import.meta.url).pathname);
const require = createRequire(REPO + "/");
const { Liquid } = require("liquidjs");

type Champ = { type: string; id: string; label: string; default?: unknown; options?: { value: string; label: string }[]; info?: string };
type Schema = { name: string; tag: string; class: string; sina: { role: string; fait: string; fond: string; demande: string[] }; settings: Champ[]; blocks?: { type: string; name: string; limit?: number; settings: Champ[] }[]; limites: Record<string, [number, number]>; presets: unknown[] };
type Section = { composant: string; pourquoi: string; settings: Record<string, any>; blocks?: { type: string; settings: Record<string, any> }[] };
type Marque = { cle: string; nom: string; metier: string; polices: { titre: string; texte: string; graisse_titre: number }; couleurs: Record<string, string>; sections: Section[] };

const noms = fs.readdirSync(path.join(ICI, "composants"));
const composants = Object.fromEntries(noms.map((n) => [n, {
  schema: JSON.parse(fs.readFileSync(path.join(ICI, "composants", n, "schema.json"), "utf8")) as Schema,
  gabarit: fs.readFileSync(path.join(ICI, "composants", n, "gabarit.liquid"), "utf8"),
  style: fs.readFileSync(path.join(ICI, "composants", n, "style.css"), "utf8"),
}]));
const jetons = fs.readFileSync(path.join(ICI, "jetons.css"), "utf8");
const { marques } = JSON.parse(fs.readFileSync(path.join(ICI, "donnees", "marques.json"), "utf8")) as { marques: Marque[] };

// ---------- 1. Contrôle des données ----------
const longueur = (v: unknown) => String(v ?? "").replace(/<[^>]+>/g, "").trim().length;
export function controler(m: Marque): string[] {
  const out: string[] = [];
  m.sections.forEach((s, i) => {
    const c = composants[s.composant];
    const ou = `${m.nom} · section ${i + 1} « ${c?.schema.name ?? s.composant} »`;
    if (!c) { out.push(`${ou} : composant inconnu`); return; }
    const connus = new Set(c.schema.settings.map((x) => x.id));
    for (const k of Object.keys(s.settings)) if (!connus.has(k)) out.push(`${ou} : réglage inconnu « ${k} »`);
    for (const f of c.schema.settings) {
      const v = s.settings[f.id];
      if (f.type === "select" && v != null && !f.options!.some((o) => o.value === v)) out.push(`${ou} : « ${f.label} » = « ${v} » n'est pas un choix permis`);
      const lim = c.schema.limites[f.id];
      if (lim && (longueur(v) < lim[0] || longueur(v) > lim[1])) out.push(`${ou} : « ${f.label} » fait ${longueur(v)} signes (permis : ${lim[0]} à ${lim[1]})`);
      if (f.type === "image_picker" && v && !v.alt) out.push(`${ou} : la photo n'a pas de description`);
      if (f.type === "url" && s.settings[f.id.replace(/_lien$/, "")] && !v) out.push(`${ou} : le bouton « ${s.settings[f.id.replace(/_lien$/, "")]} » ne mène nulle part`);
    }
    const blocs = s.blocks ?? [];
    for (const b of blocs) {
      const def = c.schema.blocks?.find((x) => x.type === b.type);
      if (!def) { out.push(`${ou} : bloc inconnu « ${b.type} »`); continue; }
      for (const f of def.settings) { const lim = c.schema.limites[`${b.type}.${f.id}`]; if (lim && (longueur(b.settings[f.id]) < lim[0] || longueur(b.settings[f.id]) > lim[1])) out.push(`${ou} : « ${f.label} » d'un bloc fait ${longueur(b.settings[f.id])} signes (permis : ${lim[0]} à ${lim[1]})`); }
    }
    for (const def of c.schema.blocks ?? []) { const n = blocs.filter((b) => b.type === def.type).length; if (def.limit && n > def.limit) out.push(`${ou} : ${n} blocs « ${def.name} » (au plus ${def.limit})`); }
    const lb = c.schema.limites.blocs; if (lb && (blocs.length < lb[0] || blocs.length > lb[1])) out.push(`${ou} : ${blocs.length} blocs (permis : ${lb[0]} à ${lb[1]})`);
  });
  const photos = m.sections.map((s) => s.settings.photo?.src).filter(Boolean);
  for (const p of new Set(photos)) if (photos.filter((x) => x === p).length > 1) out.push(`${m.nom} : la photo « ${p} » est posée deux fois`);
  return out;
}

// ---------- Couleurs lisibles calculées une fois pour la marque ----------
const rgb = (h: string) => { const x = h.replace("#", ""); return [0, 2, 4].map((i) => parseInt(x.slice(i, i + 2), 16)); };
const lum = (h: string) => { const [r, g, b] = rgb(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contraste = (a: string, b: string) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
const melange = (a: string, b: string, t: number) => "#" + rgb(a).map((v, i) => Math.round(v * (1 - t) + rgb(b)[i] * t).toString(16).padStart(2, "0")).join("");
/** La couleur demandée, assombrie ou éclaircie juste ce qu'il faut pour rester lisible sur ce fond. */
function lisible(couleur: string, fond: string, cible = 4.5): string {
  const vers = lum(fond) > 0.4 ? "#000000" : "#ffffff";
  for (let t = 0; t <= 1; t += 0.05) { const c = melange(couleur, vers, t); if (contraste(c, fond) >= cible) return c; }
  return vers;
}
export function variables(m: Marque): string {
  const c = m.couleurs;
  const v: Record<string, string> = {
    "--es-fond": c.fond, "--es-fond-doux": c.fond_doux, "--es-encre": c.encre, "--es-sombre": c.sombre, "--es-marque": c.marque, "--es-accent": c.accent,
    "--es-sur-marque": contraste("#ffffff", c.marque) >= 4.5 ? "#ffffff" : lisible("#ffffff", c.marque),
    "--es-sur-sombre": lisible("#ffffff", c.sombre),
    "--es-encre-douce": lisible(melange(c.encre, c.fond, 0.3), c.fond_doux, 5),
    "--es-accent-lisible": lisible(c.marque, c.fond_doux, 4.6),
    "--es-accent-sur-sombre": lisible(c.accent, c.sombre, 4.6),
    "--es-trait": melange(c.encre, c.fond, 0.84),
    "--es-police-titre": `'${m.polices.titre}', Georgia, serif`, "--es-police-texte": `'${m.polices.texte}', system-ui, sans-serif`, "--es-graisse-titre": String(m.polices.graisse_titre),
  };
  return Object.entries(v).map(([k, x]) => `${k}:${x}`).join(";");
}

// ---------- 2. Aperçu du Studio (rendu Liquid, filtres Shopify émulés) ----------
const PHOTOS = path.join(REPO, "public/sections/photos");
const POLICES: Record<string, [string, string][]> = {
  "Newsreader": [["normal", "public/syna/fonts/newsreader.woff2"], ["italic", "public/syna/fonts/newsreader-italic.woff2"]],
  "Inter": [["normal", "public/fonts/inter.woff2"]], "Bricolage Grotesque": [["normal", "public/fonts/bricolage.woff2"]],
  // Dans le dépôt, les deux fichiers sont intervertis : « instrument.woff2 » est l'italique, « instrument-italic.woff2 » le droit.
  "Instrument Serif": [["normal", "public/fonts/instrument-italic.woff2"], ["italic", "public/fonts/instrument.woff2"]],
  "Onest": [["normal", "public/syna/fonts/onest.woff2"]], "Geist": [["normal", "public/syna/fonts/geist.woff2"]],
};
const esc = (v: unknown) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const nommes = (args: any[]) => Object.fromEntries(args.filter((a) => Array.isArray(a)).map((a) => [a[0], a[1]]));
function moteur() {
  const e = new Liquid({ strictFilters: true, strictVariables: false });
  e.registerFilter("image_url", (img: any, ...a: any[]) => (img ? { ...img, demande: nommes(a).width } : img));
  e.registerFilter("image_tag", (img: any, ...a: any[]) => { const o = nommes(a); return img ? `<img src="${esc(img.url)}" alt="${esc(o.alt ?? img.alt ?? "")}" width="${img.width}" height="${img.height}"${o.class ? ` class="${esc(o.class)}"` : ""}${o.loading ? ` loading="${esc(o.loading)}"` : ""}${o.sizes ? ` sizes="${esc(o.sizes)}"` : ""}>` : ""; });
  e.registerFilter("placeholder_svg_tag", (_n: string, cls: string) => `<svg class="${esc(cls)}" viewBox="0 0 525 525" role="img" aria-label="Photo à fournir"><rect width="525" height="525" opacity=".12"/><path d="M150 330l70-90 60 70 40-45 60 65z"/><circle cx="330" cy="200" r="26"/></svg>`);
  return e;
}
export async function apercu(m: Marque, photoUrl: (src: string) => string, policeUrl: (f: string) => string): Promise<string> {
  const e = moteur();
  const corps: string[] = [];
  for (const [i, s] of m.sections.entries()) {
    const c = composants[s.composant];
    const defauts = Object.fromEntries(c.schema.settings.filter((f) => f.default !== undefined).map((f) => [f.id, f.default]));
    const settings: Record<string, any> = { ...defauts, ...s.settings };
    for (const f of c.schema.settings) if (f.type === "image_picker" && settings[f.id]) settings[f.id] = { ...settings[f.id], url: photoUrl(settings[f.id].src) };
    const section = { id: `s${i + 1}`, settings, blocks: (s.blocks ?? []).map((b, k) => ({ id: `b${k}`, type: b.type, settings: b.settings, shopify_attributes: "" })) };
    const html = await e.parseAndRender(c.gabarit, { section, routes: { root_url: "#accueil", all_products_collection_url: "#boutique" } });
    corps.push(`<${c.schema.tag} class="${c.schema.class}" data-ct="${m.cle}-${i + 1}" data-composant="${s.composant}">${html}</${c.schema.tag}>`);
  }
  const faces = [m.polices.titre, m.polices.texte].flatMap((f) => (POLICES[f] ?? []).map(([style, file]) => `@font-face{font-family:"${f}";font-style:${style};font-weight:100 900;font-display:swap;src:url("${policeUrl(file)}") format("woff2")}`)).join("");
  const styles = [jetons, ...Object.values(composants).map((c) => c.style)].join("\n");
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(m.nom)} — aperçu du prototype</title><style>html,body{margin:0}${faces}${styles}</style></head><body><div class="es-page" style="${variables(m)}">${corps.join("\n")}</div></body></html>`;
}

// ---------- 3. Thème Shopify ----------
export function themeShopify(dir: string) {
  const ecrire = (p: string, c: string) => { fs.mkdirSync(path.dirname(path.join(dir, p)), { recursive: true }); fs.writeFileSync(path.join(dir, p), c); };
  fs.rmSync(dir, { recursive: true, force: true });
  for (const [nom, c] of Object.entries(composants)) {
    const { sina: _s, limites: _l, ...schema } = c.schema as any;
    ecrire(`sections/es-${nom}.liquid`, `${c.gabarit.trim()}\n\n{% schema %}\n${JSON.stringify(schema, null, 2)}\n{% endschema %}\n`);
  }
  ecrire("assets/es-composants.css", [jetons, ...Object.values(composants).map((c) => c.style)].join("\n"));
  const couleurs = [["sombre", "Couleur sombre"], ["marque", "Couleur de la marque"], ["accent", "Couleur d'accent"], ["fond", "Fond"], ["fond_doux", "Fond teinté"], ["encre", "Texte"], ["sur_marque", "Texte sur la couleur de la marque"], ["sur_sombre", "Texte sur fond sombre"], ["encre_douce", "Texte secondaire"], ["accent_lisible", "Accent lisible sur fond clair"], ["accent_sur_sombre", "Accent lisible sur fond sombre"], ["trait", "Filets"]];
  ecrire("config/settings_schema.json", JSON.stringify([
    { name: "theme_info", theme_name: "Prototype E-COM STUDIO", theme_version: "0.0.1", theme_author: "E-COM STUDIO IA", theme_documentation_url: "https://example.com", theme_support_url: "https://example.com" },
    { name: "Couleurs", settings: couleurs.map(([id, label]) => ({ type: "color", id: `couleur_${id}`, label, default: "#000000" })) },
    { name: "Polices", settings: [{ type: "font_picker", id: "police_titre", label: "Titres", default: "assistant_n6" }, { type: "font_picker", id: "police_texte", label: "Textes", default: "assistant_n4" }] },
  ], null, 2));
  const m0 = marques[0];
  const vars = Object.fromEntries(variables(m0).split(";").map((x) => x.split(":") as [string, string]));
  ecrire("config/settings_data.json", JSON.stringify({ current: Object.fromEntries(couleurs.map(([id]) => [`couleur_${id}`, vars[`--es-${id.replace(/_/g, "-")}`]])) }, null, 2));
  ecrire("layout/theme.liquid", `<!doctype html>
<html lang="{{ request.locale.iso_code }}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>{{ page_title }}</title>
    {%- if page_description -%}<meta name="description" content="{{ page_description | escape }}">{%- endif -%}
    <link rel="canonical" href="{{ canonical_url }}">
    {{ settings.police_titre | font_face: font_display: 'swap' }}
    {{ settings.police_texte | font_face: font_display: 'swap' }}
    {{ 'es-composants.css' | asset_url | stylesheet_tag }}
    {{ content_for_header }}
  </head>
  <body>
    <div class="es-page" style="${couleurs.map(([id]) => `--es-${id.replace(/_/g, "-")}:{{ settings.couleur_${id} }}`).join(";")};--es-police-titre:{{ settings.police_titre.family }}, {{ settings.police_titre.fallback_families }};--es-police-texte:{{ settings.police_texte.family }}, {{ settings.police_texte.fallback_families }};--es-graisse-titre:{{ settings.police_titre.weight }}">
      {{ content_for_layout }}
    </div>
  </body>
</html>
`);
  ecrire("locales/fr.default.json", JSON.stringify({ general: { accessibilite: { photo_a_fournir: "Photo à fournir" } } }, null, 2));
  ecrire("locales/en.json", JSON.stringify({ general: { accessibilite: { photo_a_fournir: "Photo to provide" } } }, null, 2));
  for (const [k, m] of marques.entries()) {
    const sections: Record<string, unknown> = {}; const order: string[] = [];
    m.sections.forEach((s, i) => {
      const id = `section_${i + 1}`; order.push(id);
      const c = composants[s.composant];
      const settings = Object.fromEntries(Object.entries(s.settings).filter(([, v]) => v !== "" && v != null).map(([key, v]) => { const f = c.schema.settings.find((x) => x.id === key)!; return [key, f.type === "image_picker" ? `shopify://shop_images/${(v as any).src}` : f.type === "url" && String(v).startsWith("#") ? "shopify://collections/all" : v]; }));
      const blocks = Object.fromEntries((s.blocks ?? []).map((b, j) => [`bloc_${j + 1}`, { type: b.type, settings: b.settings }]));
      sections[id] = { type: `es-${s.composant}`, settings, ...(Object.keys(blocks).length ? { blocks, block_order: Object.keys(blocks) } : {}) };
    });
    ecrire(k === 0 ? "templates/index.json" : `templates/index.${m.cle}.json`, JSON.stringify({ sections, order }, null, 2));
  }
  return fs.readdirSync(dir, { recursive: true }).filter((f) => fs.statSync(path.join(dir, String(f))).isFile()).map(String).sort();
}

// ---------- Exécution ----------
if (process.argv[2] === "tout") {
  // Rien n'est écrit dans le dépôt : aperçus et thème vont dans un dossier de sortie (SORTIE, ou le dossier temporaire).
  const BASE = process.env.SORTIE ?? path.join(os.tmpdir(), "prototype-composants");
  const sortie = path.join(BASE, "apercu"); fs.mkdirSync(sortie, { recursive: true });
  let refus = 0;
  for (const m of marques) {
    const pb = controler(m); refus += pb.length;
    console.log(`Données de « ${m.nom} » : ${pb.length ? `${pb.length} refus\n  - ${pb.join("\n  - ")}` : "conformes"}`);
    // Polices du dépôt incluses dans la page (un navigateur refuse une police lue depuis un autre fichier local).
    fs.writeFileSync(path.join(sortie, `${m.cle}.html`), await apercu(m, (src) => `file://${PHOTOS}/${src}`, (f) => `data:font/woff2;base64,${fs.readFileSync(path.join(REPO, f)).toString("base64")}`));
  }
  // Preuve du contrôle : une donnée volontairement fausse est refusée avant tout affichage.
  const faux: Marque = JSON.parse(JSON.stringify(marques[0])); faux.nom = "Essai volontairement faux";
  faux.sections[0].settings.titre = "Le soir ralentit, la tasse fume, et la maison tout entière se met à sentir le jardin de ta grand-mère";
  faux.sections[0].settings.bouton_lien = ""; faux.sections[1].settings.photo = faux.sections[0].settings.photo;
  console.log(`\nEssai volontairement faux (titre trop long, bouton sans lien, photo en double) :\n  - ${controler(faux).join("\n  - ")}`);
  const dir = path.join(BASE, "theme"); const fichiers = themeShopify(dir);
  console.log(`\nThème Shopify écrit : ${fichiers.length} fichiers\n  ${fichiers.join("\n  ")}`);
  const { loadThemeCheck } = await import(`${REPO}/src/lib/theme/shopify-docs`);
  const { check } = await loadThemeCheck();
  const offenses = await check(dir);
  for (const o of offenses) console.log(`${o.severity === 0 ? "ERREUR" : o.severity === 1 ? "AVERTISSEMENT" : "INFO"} ${o.check} ${String(o.uri).replace(/.*\/theme\//, "")}:${o.start?.line ?? ""} ${o.message}`);
  console.log(`\nTheme Check : ${offenses.filter((o: any) => o.severity === 0).length} erreur(s), ${offenses.filter((o: any) => o.severity === 1).length} avertissement(s), ${offenses.filter((o: any) => o.severity > 1).length} information(s) (refus si ${refus} > 0 : ${refus})`);
}
