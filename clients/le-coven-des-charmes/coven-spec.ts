/**
 * Le Coven des Charmes — projet CLIENT dédié (consigne `docs/client-briefs/le-coven-des-charmes/CONSIGNE_CLAUDE.md`).
 *
 * Isolement : rien n'est ajouté au thème de base du studio (`theme-base/`), au catalogue, aux démonstrations ni à la
 * bibliothèque de sections partagée. Le site est posé dans le thème DU projet client :
 *  - sections propres au projet (`spec.customSections`, types `es-custom-coven-*`), sources dans `theme/sections/` ;
 *  - médias dans la bibliothèque du projet (`spec.files` → identifiants d'assets du projet) : photos et logo du
 *    client, icônes et polices ; aucun média du client n'est versionné ni servi depuis `public/` ;
 *  - pages, menus, fiche produit et réglages dans le thème du projet ; tout reste modifiable dans le studio.
 *
 * Rien d'inventé : prix, tailles, matières, dimensions, délais, livraison, retours et identité du vendeur restent
 * « À renseigner ». Le tirage au scoop est physique et a lieu APRÈS la commande ; le site ne tire rien.
 */
import fs from "node:fs";
import path from "node:path";
import { sectionSchema, withDefaults, type MenuLink, type SectionInstance, type StorePage, type TemplateJson, type ThemeSpec } from "../../src/lib/theme/spec";
import { COVEN_TEMPLATES, COVEN_PAGES, COVEN_MENUS, COVEN_HEADER, COVEN_FOOTER, COVEN_PRODUCT } from "./coven-pages";

export const COVEN_KEY = "le-coven-des-charmes";
export const COVEN_NAME = "Le Coven des Charmes";
export const COVEN_DIR = path.join(process.cwd(), "clients", COVEN_KEY);
const THEME_DIR = path.join(COVEN_DIR, "theme");

/** Médias du projet. `source` : chemin dans le kit privé COVEN_CLIENT (ou dans ce dossier pour les polices). */
export type CovenMedia = { file: string; source: string; alt: string; origin: "client" | "maquette" | "icones" | "police"; note?: string };

/** Photos et logo fournis par le client (fichiers du client, convertis pour le web sans retouche des pixels). */
export const COVEN_CLIENT_MEDIA: CovenMedia[] = [
  { file: "coven-logo.jpg", source: "images/LOGO_ORIGINAL_LE_COVEN_DES_CHARMES.jpg", alt: "Le Coven des Charmes", origin: "client", note: "Logo original du client (1000034256.jpg), dessin et proportions inchangés." },
  { file: "coven-photo-cabinet.jpg", source: "images/originaux-client/1000034259.png", alt: "Deux cabinets en bois aux tiroirs étiquetés Familiers, Divinations, Accessoires, Charmes Mystères, Pierres Arbres de vie, Rituels et Protections", origin: "client" },
  { file: "coven-photo-tableau.jpg", source: "images/originaux-client/1000034258.png", alt: "Tableau de correspondance noir : symboles et familles de charms autour du logo", origin: "client" },
  { file: "coven-photo-poignet.jpg", source: "images/originaux-client/1000034257.png", alt: "Exemple de bracelet de charms porté au poignet : arbre de vie, chouette, chat et pierres", origin: "client" },
  { file: "coven-photo-bracelet.jpg", source: "images/originaux-client/1000034255.jpg", alt: "Exemple de bracelet de charms posé sur une toile astrologique", origin: "client" },
];

/**
 * Visuels de CONTRÔLE et visuels provisoires : découpés aux pixels natifs dans les planches finales, textes des
 * maquettes effacés (`scripts/visuels-maquette.py`, liste dans `planches.json`). Ils servent aux superpositions à
 * 50 % (aperçu de contrôle) et, dans l'aperçu client, aux scènes ABSENTES des photos du client (coupelle, scoop,
 * velours, tiroirs ouverts) : signalés dans le rapport, à remplacer par de vraies photos ; jamais présentés comme des
 * photographies sources. Les 20 extraits du kit (`images/extraits-maquettes/`) contiennent des textes et des cadres
 * des planches : ils restent des références de composition et ne sont pas posés dans le site.
 */
export function covenControlMedia(): CovenMedia[] {
  const crops = JSON.parse(fs.readFileSync(path.join(COVEN_DIR, "planches.json"), "utf8")).crops as Record<string, { panel: string }>;
  return Object.keys(crops).map((name) => ({ file: `coven-mq-${name}.jpg`, source: `coven-mq-${name}.jpg`, alt: "", origin: "maquette" as const }));
}

/** Polices (EB Garamond, licence OFL, versionnée dans ce dossier) et sprite d'icônes (kit, ajusté). */
export const COVEN_FILE_MEDIA: CovenMedia[] = [
  { file: "coven-eb-garamond-400.ttf", source: "fonts/EBGaramond-400.ttf", alt: "", origin: "police" },
  { file: "coven-eb-garamond-500.ttf", source: "fonts/EBGaramond-500.ttf", alt: "", origin: "police" },
  { file: "coven-eb-garamond-600.ttf", source: "fonts/EBGaramond-600.ttf", alt: "", origin: "police" },
  { file: "coven-icones.svg", source: "icones/coven-sprite.svg", alt: "", origin: "icones" },
];

export const covenMedia = (): CovenMedia[] => [...COVEN_CLIENT_MEDIA, ...covenControlMedia(), ...COVEN_FILE_MEDIA];

/** Sections du projet : sources Liquid, feuille de style et script insérés dans l'en-tête et le pied. */
export function covenSections(): Record<string, { name: string; liquid: string }> {
  const css = fs.readFileSync(path.join(THEME_DIR, "assets", "coven.css"), "utf8");
  const js = fs.readFileSync(path.join(THEME_DIR, "assets", "coven.js"), "utf8");
  const out: Record<string, { name: string; liquid: string }> = {};
  for (const f of fs.readdirSync(path.join(THEME_DIR, "sections")).filter((x) => x.endsWith(".liquid")).sort()) {
    const type = f.replace(/\.liquid$/, "");
    let liquid = fs.readFileSync(path.join(THEME_DIR, "sections", f), "utf8");
    liquid = liquid.replace("/*COVEN_CSS*/", () => css).replace("/*COVEN_JS*/", () => js);
    const name = JSON.parse(liquid.match(/\{%-?\s*schema\s*-?%\}([\s\S]*?)\{%-?\s*endschema\s*-?%\}/)![1]).name as string;
    out[type] = { name, liquid };
  }
  return out;
}

type Blocks = { type: string; settings: Record<string, unknown> }[];
export type CovenSectionDef = [id: string, type: string, settings: Record<string, unknown>, blocks?: Blocks];

/** Instance de section complétée par les valeurs par défaut de son schéma (le studio retrouve tous les réglages). */
export function covenSection(spec: Pick<ThemeSpec, "customSections" | "language">, type: string, settings: Record<string, unknown>, blocks: Blocks = []): SectionInstance {
  const schema = sectionSchema(spec as ThemeSpec, type);
  if (!schema) throw new Error(`Section inconnue : ${type}`);
  for (const k of Object.keys(settings)) if (!schema.settings.some((x) => x.id === k)) throw new Error(`${type} : réglage inconnu ${k}`);
  return {
    type,
    settings: withDefaults(schema.settings, settings),
    blocks: Object.fromEntries(blocks.map((b, i) => {
      const bs = schema.blocks.find((x) => x.type === b.type);
      if (!bs) throw new Error(`${type} : bloc inconnu ${b.type}`);
      for (const k of Object.keys(b.settings)) if (!bs.settings?.some((x) => x.id === k)) throw new Error(`${type}/${b.type} : réglage inconnu ${k}`);
      return [`b${i + 1}`, { type: b.type, settings: withDefaults(bs.settings, b.settings) }];
    })),
    block_order: blocks.map((_, i) => `b${i + 1}`),
  };
}

function container(spec: ThemeSpec, defs: CovenSectionDef[], extra: Partial<TemplateJson> = {}): TemplateJson {
  const sections: Record<string, SectionInstance> = {};
  for (const [id, type, settings, blocks] of defs) sections[id] = covenSection(spec, type, settings, blocks);
  return { ...extra, sections, order: defs.map(([id]) => id) } as TemplateJson;
}

/**
 * Pose le site du Coven dans le thème du projet : sections, médias (noms de fichiers → identifiants d'assets du
 * projet), gabarits, en-tête, pied, pages, menus, fiche produit et réglages globaux. Les autres projets ne changent pas.
 */
export type CovenMode = "client" | "controle";
export function applyCoven(spec: ThemeSpec, assetIds: Record<string, string>, opts: { preview?: boolean; mode?: CovenMode } = {}): ThemeSpec {
  spec.name = COVEN_NAME;
  spec.language = "fr";
  spec.customSections = { ...spec.customSections, ...covenSections() };
  spec.files = { ...assetIds };
  const has = (file: string) => !!assetIds[file];
  const img = (file: string) => (has(file) ? file : "");
  // Réglages globaux : thème sombre, ni panier tiroir, ni bandeau de cookies du thème de base (celui du Coven le remplace).
  Object.assign(spec.settings, {
    editorial_profile: "none", conversion_profile: "none", ds_language: "none", cart_type: "page", cookie_banner: false, fab_back_to_top: false, fab_contact_link: "",
    color_background: "#0a090d", color_foreground: "#ece4d6", color_accent: "#e2b765", color_button: "#e2b765", color_button_text: "#24170a",
  });
  for (const k of Object.keys(spec.settings)) if (/^(floating_|whatsapp_|sticky_)/.test(k) && typeof spec.settings[k] === "boolean") spec.settings[k] = false;
  const mode = opts.mode ?? "client";
  // Photo du client si elle convient (aperçu client), sinon visuel découpé dans la planche (provisoire ou contrôle).
  const v = (clientFile: string | null, crop: string) => (mode === "client" && clientFile && has(clientFile) ? clientFile : img(`coven-mq-${crop}.jpg`));
  const ctx = { img, v, mode, preview: !!opts.preview };
  spec.groups.header = container(spec, COVEN_HEADER(ctx), { type: "header", name: "Header" } as Partial<TemplateJson>) as never;
  spec.groups.footer = container(spec, COVEN_FOOTER(ctx), { type: "footer", name: "Footer" } as Partial<TemplateJson>) as never;
  const templates: Record<string, TemplateJson> = {};
  for (const [key, defs] of Object.entries(COVEN_TEMPLATES(ctx))) templates[key] = container(spec, defs);
  // La fiche produit garde la section Produit du studio (exigée par la validation), masquée : la section Coven l'affiche.
  const main = Object.entries(spec.templates.product?.sections ?? {}).find(([, s]) => s.type === "main-product");
  if (main) { templates.product.sections = { "studio-product": { ...main[1], disabled: true }, ...templates.product.sections }; templates.product.order = ["studio-product", ...templates.product.order]; }
  for (const key of ["collection", "list-collections", "search", "blog", "article", "password"]) if (spec.templates[key] && !templates[key]) templates[key] = spec.templates[key];
  spec.templates = templates;
  const product = COVEN_PRODUCT(ctx);
  spec.store = {
    ...spec.store,
    shopName: COVEN_NAME,
    product,
    products: [product],
    collections: [{ handle: "all", title: "Les bracelets de charms", description: "", products: [product.handle] }],
    pages: COVEN_PAGES as StorePage[],
    menus: COVEN_MENUS as Record<string, { title: string; links: MenuLink[] }>,
  };
  spec.meta = { ...(spec.meta ?? {}), client: { key: COVEN_KEY, brief: "docs/client-briefs/le-coven-des-charmes", catalogue: false }, ...(opts.preview ? { demo: { ...(spec.meta?.demo ?? {}), isDemo: true } } : {}) } as ThemeSpec["meta"];
  return spec;
}
