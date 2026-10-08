/**
 * Kits de reprise pour les plateformes qui n'acceptent pas de thème importé (Wix, Squarespace) : médias, charte,
 * textes, CSV produit, guide. Les thèmes WooCommerce et PrestaShop sont produits par le CMS Engine V2
 * (src/lib/cms-v2/adapters).
 */
import fs from "node:fs";
import path from "node:path";
import { zipSync, strToU8 } from "fflate";
import { storeProducts, themeLang, type ElementStyle, type ThemeSpec, type SectionInstance } from "./spec";
import { pick, type Lang } from "../i18n";
import { L } from "../i18n-server";
import { themeAssetBinary, type AssetLoader } from "./compile";
import { FONT_FILES } from "./render";

type Scheme = { background: string; surface: string; text: string; muted: string; accent: string; accent_text: string; border: string };

function schemes(spec: ThemeSpec): Record<string, Scheme> {
  const s = spec.settings.color_schemes as Record<string, { settings: Scheme }>;
  return Object.fromEntries(Object.entries(s).map(([k, v]) => [k, v.settings]));
}
function fontFamily(handle: unknown) {
  const key = String(handle ?? "").replace(/_[ni]\d$/, "");
  return FONT_FILES[key] ?? FONT_FILES.dm_sans;
}
const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const strip = (s: unknown) => String(s ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "boutique";

/**
 * Texte placé dans un commentaire PHP ou CSS (nom de boutique, titre de page repris d'un site) :
 * la fin de commentaire (étoile puis barre oblique) fermerait le commentaire et le reste deviendrait du code (erreur fatale sur WordPress).
 */
export const commentSafe = (s: unknown) => String(s ?? "").replace(/\*\//g, "* /").replace(/\?>/g, "? >").replace(/[\r\n]+/g, " ");

/** Liste ordonnée des sections de l'accueil avec leurs contenus (indépendant de la plateforme). */
function homeBlocks(spec: ThemeSpec) {
  const t = spec.templates.index;
  return t.order.map((id) => ({ id, s: t.sections[id] ? fromV2(t.sections[id]) : t.sections[id] })).filter((x) => x.s && !x.s.disabled);
}

/**
 * Sections du Theme Engine V2 (phase 10A) traduites en leur équivalent connu des exports WordPress / PrestaShop /
 * kits : le CONTENU (titres, textes, boutons, faits, questions, images) est repris ; la mise en page V2 propre à
 * Shopify (compositions, langage visuel) ne l'est pas — ces exports restent des bases à finir sur la plateforme.
 */
export function fromV2(s: SectionInstance): SectionInstance {
  if (!s.type.startsWith("v2-")) return s;
  const st = s.settings as Record<string, any>;
  const bl = blocksOf(s);
  const blocks = (list: { type: string; settings: Record<string, unknown> }[]) => ({
    blocks: Object.fromEntries(list.map((b, i) => [`b${i + 1}`, b])) as SectionInstance["blocks"],
    block_order: list.map((_, i) => `b${i + 1}`),
  });
  const heading = [st.heading, st.heading_em].filter(Boolean).join(" ");
  switch (s.type) {
    case "v2-hero":
      return { ...s, type: "hero-split", settings: { ...st, heading, text: [strip(st.text), ...bl.map((b) => [b.settings.label, b.settings.value].filter(Boolean).join(" : "))].filter(Boolean).join(" · ") } };
    case "v2-split":
      return { ...s, type: "image-with-text", settings: { ...st, heading, text: [strip(st.text), ...bl.map((b) => String(b.settings.text ?? ""))].filter(Boolean).join(" · ") } };
    case "v2-index":
      return { ...s, type: "features-grid", settings: { ...st, heading }, ...blocks(bl.map((b) => ({ type: "feature", settings: { title: b.settings.title, text: [strip(b.settings.text), b.settings.meta].filter(Boolean).join(" — ") } }))) };
    case "v2-steps":
      return { ...s, type: "scroll-story", settings: { ...st, heading }, ...blocks(bl.map((b) => ({ type: "step", settings: { title: b.settings.title, text: b.settings.text ?? "" } }))) };
    case "v2-facts":
    case "v2-specs":
      return { ...s, type: "specs-list", settings: { ...st, heading }, ...blocks(bl.map((b) => ({ type: "spec", settings: { label: b.settings.label, value: b.settings.value } }))) };
    case "v2-faq":
      return { ...s, type: "faq", settings: { ...st, heading } };
    case "v2-media":
      return { ...s, type: "gallery-mosaic", settings: { ...st, heading }, ...blocks(bl.map((b) => ({ type: "image", settings: { image_asset: b.settings.image_asset ?? "" } }))) };
    case "v2-cta":
      return { ...s, type: "rich-text", settings: { ...st }, ...blocks([{ type: "heading", settings: { text: heading } }, ...(strip(st.text) ? [{ type: "text", settings: { text: st.text } }] : []), ...(st.button_label ? [{ type: "button", settings: { label: st.button_label, link: st.button_link } }] : [])]) };
    default:
      return s;
  }
}
const blocksOf = (s: SectionInstance) => (s.block_order ?? Object.keys(s.blocks ?? {})).map((b) => s.blocks?.[b]).filter(Boolean) as { type: string; settings: Record<string, any> }[];

async function collectMedia(spec: ThemeSpec, load: AssetLoader) {
  const out: Record<string, Buffer> = {};
  for (const f of Object.keys(spec.files)) {
    const b = await themeAssetBinary(spec, f, load);
    if (b) out[f] = b.data;
  }
  return out;
}

// WooCommerce et PrestaShop : thèmes produits par le CMS Engine V2 (src/lib/cms-v2/adapters), mêmes gabarits que
// Shopify et que l'aperçu du studio. Ce fichier garde les kits de reconstruction (Wix, Squarespace).

// ---------------------------------------------------------------- Wix / Squarespace (kits)

export async function exportKit(spec: ThemeSpec, load: AssetLoader, platform: "wix" | "squarespace") {
  const sc = schemes(spec);
  const hf = fontFamily(spec.settings.type_heading_font), bf = fontFamily(spec.settings.type_body_font);
  const media = await collectMedia(spec, load);
  const files: Record<string, Uint8Array> = {};
  for (const [f, data] of Object.entries(media)) files[`medias/${f}`] = new Uint8Array(data);
  const fontsDir = L("polices", "fonts");
  const textsFile = L("textes-des-pages.md", "page-texts.md");
  const csvFile = L("produits.csv", "products.csv");
  for (const fam of [hf, bf]) for (const f of new Set(Object.values(fam.files))) files[`${fontsDir}/${f}`] = new Uint8Array(fs.readFileSync(path.join(process.cwd(), "assets", "fonts", f)));
  const sep = L(" :", ":");
  const textPage = (key: string, title: string) => {
    const t = spec.templates[key];
    if (!t) return "";
    const lines: string[] = [`## ${title}`];
    for (const id of t.order) {
      const s = t.sections[id];
      if (!s || s.disabled) continue;
      const st = s.settings as Record<string, any>;
      lines.push(L(`\n### Section : ${s.type}`, `\n### Section: ${s.type}`));
      for (const k of ["eyebrow", "heading", "heading_line1", "heading_line2", "text", "lead", "button_label", "button_link", "caption", "hours", "address", "area", "phone", "email", "booking_url"]) if (st[k]) lines.push(`- ${k}${sep} ${strip(st[k])}`);
      if (st.image_asset) lines.push(`- image${sep} medias/${st.image_asset}`);
      for (const b of blocksOf(s)) lines.push(`  - ${Object.entries(b.settings).filter(([, v]) => typeof v === "string" && v).map(([k, v]) => `${k}${sep} ${strip(v)}`).join(" · ")}`);
    }
    return lines.join("\n");
  };
  const guideFr =
    platform === "wix"
      ? `1. Dans l'éditeur Wix, créez un site vierge (ou un modèle Wix Stores sobre).
2. Thème du site › Couleurs : reportez la palette ci-dessous ; Thème du site › Texte : importez les polices du dossier « polices » (Ajouter des polices › Importer).
3. Médias : importez le dossier « medias » dans le gestionnaire de médias.
4. Wix Stores › Produits › Importer : utilisez « produits.csv » (vérifiez les colonnes avec le modèle CSV de Wix, puis ajoutez les images).
5. Reconstituez les pages avec les textes de « textes-des-pages.md » (accueil, produit, histoire, FAQ, contact, livraison).
6. Animations : Wix propose des effets d'apparition au défilement natifs (Animation › Entrée) ; préférez des effets discrets et vérifiez l'option de réduction des mouvements.`
      : `1. Dans Squarespace, choisissez un modèle Commerce épuré.
2. Conception du site › Couleurs : créez une palette avec les couleurs ci-dessous ; Polices : choisissez les familles indiquées (ou les plus proches disponibles ; Squarespace autorise l'import de polices personnalisées via CSS sur les offres compatibles).
3. Importez les médias du dossier « medias » dans la bibliothèque d'images.
4. Commerce › Produits › Importer : utilisez « produits.csv » (adaptez les colonnes au modèle d'import Squarespace).
5. Reconstituez les pages avec « textes-des-pages.md ».
6. Utilisez les animations de section natives avec parcimonie.`;
  const guideEn =
    platform === "wix"
      ? `1. In the Wix editor, create a blank site (or a simple Wix Stores template).
2. Site Design › Colors: copy the palette below; Site Design › Text: upload the fonts from the "${fontsDir}" folder (Add Fonts › Upload).
3. Media: upload the "medias" folder to the Media Manager.
4. Wix Stores › Products › Import: use "${csvFile}" (check the columns against the Wix CSV template, then add the images).
5. Rebuild the pages using the texts in "${textsFile}" (home, product, story, FAQ, contact, shipping).
6. Animations: Wix offers native scroll-in effects (Animation › Entrance); keep them subtle and check the reduced-motion option.`
      : `1. In Squarespace, choose a clean Commerce template.
2. Site Styles › Colors: create a palette with the colors below; Fonts: pick the families listed (or the closest available; Squarespace allows custom fonts via CSS on eligible plans).
3. Upload the media from the "medias" folder to the image library.
4. Commerce › Products › Import: use "${csvFile}" (adapt the columns to the Squarespace import template).
5. Rebuild the pages using "${textsFile}".
6. Use the native section animations sparingly.`;
  // Site de services : modèle vitrine, prise de rendez-vous native, pas de catalogue ni de CSV produit.
  const services = spec.store.business === "services";
  const svcFr =
    platform === "wix"
      ? `1. Dans l'éditeur Wix, créez un site vierge (pas de modèle Wix Stores : aucune boutique n'est nécessaire).
2. Thème du site › Couleurs : reportez la palette ci-dessous ; Thème du site › Texte : importez les polices du dossier « polices ».
3. Médias : importez le dossier « medias » dans le gestionnaire de médias.
4. Rendez-vous : ajoutez Wix Bookings, ou un bouton vers votre lien de réservation (Calendly, Planity, Doctolib…).
5. Reconstituez les pages avec « textes-des-pages.md » (accueil, prestations, à propos, contact / rendez-vous, FAQ, mentions légales).
6. Infos pratiques : ajoutez l'élément Google Maps avec votre adresse et un bouton « Appeler » (lien téléphone).`
      : `1. Dans Squarespace, choisissez un modèle « Services » ou « Portfolio » épuré (pas de modèle Commerce).
2. Conception du site › Couleurs et Polices : reportez la palette et les familles indiquées ci-dessous.
3. Importez les médias du dossier « medias » dans la bibliothèque d'images.
4. Rendez-vous : utilisez Acuity Scheduling (intégré à Squarespace) ou un bouton vers votre lien de réservation.
5. Reconstituez les pages avec « textes-des-pages.md » (accueil, prestations, à propos, contact / rendez-vous, FAQ, mentions légales).
6. Infos pratiques : bloc Carte avec votre adresse, horaires en texte, téléphone en lien « tel: ».`;
  const svcEn =
    platform === "wix"
      ? `1. In the Wix editor, create a blank site (no Wix Stores template: you don't need a store).
2. Site Design › Colors: copy the palette below; Site Design › Text: upload the fonts from the "${fontsDir}" folder.
3. Media: upload the "medias" folder to the Media Manager.
4. Appointments: add Wix Bookings, or a button to your booking link (Calendly, Planity, Doctolib…).
5. Rebuild the pages using "${textsFile}" (home, services, about, contact / booking, FAQ, legal notice).
6. Practical info: add the Google Maps element with your address and a "Call" button (phone link).`
      : `1. In Squarespace, choose a clean "Services" or "Portfolio" template (not a Commerce template).
2. Site Styles › Colors and Fonts: copy the palette and font families listed below.
3. Upload the media from the "medias" folder to the image library.
4. Appointments: use Acuity Scheduling (built into Squarespace) or a button to your booking link.
5. Rebuild the pages using "${textsFile}" (home, services, about, contact / booking, FAQ, legal notice).
6. Practical info: Map block with your address, opening hours as text, phone as a "tel:" link.`;
  const guide = services ? L(svcFr, svcEn) : L(guideFr, guideEn);
  const pf = platform === "wix" ? "Wix" : "Squarespace";
  files["GUIDE.md"] = strToU8(
    L(
      `# Kit de création ${pf} — ${spec.store.shopName}

${pf} n'accepte pas l'import d'un thème externe : ce kit n'est pas un thème installable.
Il rassemble tout ce qu'il faut pour reproduire fidèlement ${services ? "le site" : "la boutique"} conçu${services ? "" : "e"} dans le studio, dans l'éditeur de la plateforme.

## Étapes
${guide}

## Palette
${Object.entries(sc).map(([k, v]) => `- ${k} : fond ${v.background} · texte ${v.text} · accent ${v.accent} · texte sur accent ${v.accent_text}`).join("\n")}

## Typographies
- Titres : ${hf.family}
- Texte : ${bf.family}
`,
      `# ${pf} build kit — ${spec.store.shopName}

${pf} doesn't accept importing an external theme: this kit isn't an installable theme.
It gathers everything you need to faithfully recreate the ${services ? "website" : "store"} designed in the studio, in the platform's editor.

## Steps
${guide}

## Palette
${Object.entries(sc).map(([k, v]) => `- ${k}: background ${v.background} · text ${v.text} · accent ${v.accent} · text on accent ${v.accent_text}`).join("\n")}

## Typography
- Headings: ${hf.family}
- Body: ${bf.family}
`,
    ),
  );
  if (services) {
    files[textsFile] = strToU8([textPage("index", L("Accueil", "Home")), ...spec.store.pages.map((pg) => textPage(`page.${pg.template_suffix}`, pg.title))].filter(Boolean).join("\n\n"));
    return { zip: Buffer.from(zipSync(files, { level: 6, mtime: new Date("2026-01-01T00:00:00Z") })), name: `${slug(spec.store.shopName)}-kit-${platform}.zip`, kind: "kit" as const };
  }
  files[textsFile] = strToU8([textPage("index", L("Accueil", "Home")), textPage("product", L("Fiche produit", "Product page")), textPage("page.about", L("Notre histoire", "Our story")), textPage("page.faq", "FAQ"), textPage("page.contact", "Contact"), textPage("page.shipping", L("Livraison et retours", "Shipping and returns"))].join("\n\n"));
  const csvEsc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  files[csvFile] = strToU8(
    [L("Nom,Description,Prix,Variante,SKU,Images", "Name,Description,Price,Variant,SKU,Images")]
      .concat(storeProducts(spec).flatMap((p) => (p.variants.length ? p.variants : [{ title: "", options: [""], price: p.price, available: true }]).map((v) => [p.title, strip(p.description_html), (v.price ?? p.price) != null ? ((v.price ?? p.price)! / 100).toFixed(2) : "", v.title === "Default Title" ? "" : v.title, (v as any).sku ?? "", p.images.map((f) => `medias/${f}`).join(" ")].map(csvEsc).join(","))))
      .join("\n"),
  );
  return { zip: Buffer.from(zipSync(files, { level: 6, mtime: new Date("2026-01-01T00:00:00Z") })), name: `${slug(spec.store.shopName)}-kit-${platform}.zip`, kind: "kit" as const };
}

export const PLATFORMS = [
  { id: "shopify", label: "Shopify", delivery: { fr: "Thème Online Store 2.0 installable (ZIP), modifiable dans l'éditeur de thème", en: "Installable Online Store 2.0 theme (ZIP), editable in the theme editor" }, installable: true },
  { id: "woocommerce", label: "WooCommerce", delivery: { fr: "Thème de blocs WordPress installable (Apparence › Thèmes › Téléverser)", en: "Installable WordPress block theme (Appearance › Themes › Upload)" }, installable: true },
  { id: "prestashop", label: "PrestaShop", delivery: { fr: "Thème enfant du thème Classic, installable (Apparence › Thème et logo)", en: "Installable child theme of the Classic theme (Design › Theme & Logo)" }, installable: true },
  { id: "wix", label: "Wix", delivery: { fr: "Kit de reprise : Wix n'accepte pas de thème importé", en: "Rebuild kit: Wix doesn't accept imported themes" }, installable: false },
  { id: "squarespace", label: "Squarespace", delivery: { fr: "Kit de reprise : Squarespace n'accepte pas de thème importé", en: "Rebuild kit: Squarespace doesn't accept imported themes" }, installable: false },
] as const;
