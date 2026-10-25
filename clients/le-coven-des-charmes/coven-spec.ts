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
export type CovenMedia = { file: string; source: string; alt: string; origin: "client" | "hd" | "maquette" | "icones" | "police"; note?: string };

/** Photos et logo fournis par le client (fichiers du client, convertis pour le web sans retouche des pixels). */
export const COVEN_CLIENT_MEDIA: CovenMedia[] = [
  { file: "coven-logo.jpg", source: "images/LOGO_ORIGINAL_LE_COVEN_DES_CHARMES.jpg", alt: "Le Coven des Charmes", origin: "client", note: "Logo original du client (1000034256.jpg), dessin et proportions inchangés." },
  { file: "coven-photo-cabinet.jpg", source: "images/originaux-client/1000034259.png", alt: "Deux cabinets en bois aux tiroirs étiquetés Familiers, Divinations, Accessoires, Charmes Mystères, Pierres Arbres de vie, Rituels et Protections", origin: "client" },
  { file: "coven-photo-tableau.jpg", source: "images/originaux-client/1000034258.png", alt: "Tableau de correspondance noir : symboles et familles de charms autour du logo", origin: "client" },
  { file: "coven-photo-poignet.jpg", source: "images/originaux-client/1000034257.png", alt: "Exemple de bracelet de charms porté au poignet : arbre de vie, chouette, chat et pierres", origin: "client" },
  { file: "coven-photo-bracelet.jpg", source: "images/originaux-client/1000034255.jpg", alt: "Exemple de bracelet de charms posé sur une toile astrologique", origin: "client" },
];

/**
 * Images du thème en haute définition fournies par le client (5 archives LE_COVEN_DES_CHARMES_IMAGES_0x_SUR_05) :
 * les scènes d'origine des planches. Dossier privé passé par `--images` (jamais dans le dépôt) ; converties en JPEG
 * pour le web (2000 px au plus), sans retouche. Clé : numéro du fichier du client.
 */
const HD: [string, string, string][] = [
  ["01", "01_accueil.png", "Cabinet aux tiroirs, bracelet et coupelle de symboles sur velours violet, à la bougie"],
  ["02", "02_bracelet_principal.png", "Bracelet de charms sur velours violet : plume, clé, lunes, carte et livre"],
  ["03", "03_coupelle_etape.png", "Coupelle de symboles et scoop doré sur velours violet"],
  ["04", "04_tiroir_etape.png", "Tiroir ouvert rempli de charms, à la bougie"],
  ["05", "05_bracelet_detail.png", "Bracelet de charms en détail sur velours violet"],
  ["06", "06_accueil_creation_1.png", "Exemple de bracelet de charms sur velours violet"],
  ["07", "07_accueil_creation_2.png", "Exemple de bracelet de charms avec fantôme et chapeau, coupelle de symboles"],
  ["08", "08_accueil_creation_3.png", "Exemple de bracelet de charms avec carte et lune"],
  ["09", "09_concept_coupelle.png", "Coupelle dorée de symboles et scoop sur une table, à la bougie"],
  ["10", "10_cabinet_le_coven.png", "Le cabinet de curiosités aux tiroirs étiquetés"],
  ["11", "11_detail_poignee.png", "Poignée en chouette d'un tiroir du cabinet"],
  ["12", "12_detail_fiole.png", "Fiole de pierres sombres"],
  ["13", "13_detail_plume.png", "Charms plume, chouette et livre d'un bracelet"],
  ["14", "14_detail_grimoire.png", "Charms plume, chouette et grimoire d'un bracelet"],
  ["15", "15_galerie_creation_1.png", "Exemple de bracelet de charms"],
  ["16", "16_galerie_creation_2.png", "Exemple de bracelet de charms"],
  ["17", "17_galerie_creation_3.png", "Exemple de bracelet de charms"],
  ["18", "18_galerie_creation_4.png", "Exemple de bracelet de charms"],
  ["19", "19_galerie_creation_5.png", "Exemple de bracelet de charms"],
  ["20", "20_galerie_creation_6.png", "Exemple de bracelet de charms"],
  ["21", "21_symboles_tirage.png", "Symboles du tirage sur une table"],
  ["22", "22_fond_faq.png", "Livres anciens et bougies"],
  ["23", "23_accueil_mobile.png", "Cabinet aux tiroirs, bracelet et coupelle de symboles"],
  ["24", "24_produit_mobile.png", "Bracelet de charms sur velours violet"],
  ["25", "25_tirage_mobile.png", "Coupelle de symboles et scoop"],
  ["26", "26_cabinet_mobile.png", "Le cabinet aux tiroirs étiquetés"],
  ["27", "27_creation_mobile_1.png", "Exemple de bracelet de charms"],
  ["28", "28_creation_mobile_2.png", "Exemple de bracelet de charms"],
  ["29", "29_creation_mobile_3.png", "Exemple de bracelet de charms"],
  ["30", "30_creation_mobile_4.png", "Exemple de bracelet de charms"],
  ["31", "31_symbole_familiers.png", "Symboles des familiers : chat et chauve-souris"],
  ["32", "32_symbole_divinations.png", "Symbole des divinations : chapeau de sorcière"],
  ["33", "33_symbole_mystiques.png", "Symbole mystique : crâne"],
  ["34", "34_symbole_accessoires.png", "Symbole des accessoires : botte dorée"],
  ["35", "35_symbole_nature.png", "Symbole des éléments de la nature : fantôme"],
  ["36", "36_symbole_rituels.png", "Symbole des rituels : citrouille"],
  ["37", "37_tiroir_familiers.png", "Tiroir Familiers ouvert"],
  ["38", "38_tiroir_divination.png", "Tiroir Divination ouvert"],
  ["39", "39_tiroir_mysteres.png", "Tiroir Charmes & Mystères ouvert"],
  ["40", "40_tiroir_pierres.png", "Tiroir Pierres & Arbres de vie ouvert"],
  ["41", "41_tiroir_rituels.png", "Tiroir Rituels ouvert"],
  ["42", "42_tiroir_protection.png", "Tiroir Protection ouvert"],
  ["43", "43_banniere_fermoir.png", "Fermoir et charm en croissant de lune"],
  ["44", "44_banniere_fenetre.png", "Bougies devant une fenêtre à la pleine lune"],
  ["45", "45_banniere_coupelle.png", "Coupelle de symboles et bougies sur velours violet"],
  ["46", "46_fond_panier.png", "Bracelet et coupelle de symboles sur velours violet"],
  ["47", "47_fond_commande.png", "Grimoire ouvert à la bougie"],
  ["48", "48_fond_confirmation.png", "Pièce du Coven à la bougie, fenêtre à la lune"],
  ["49", "49_fond_compte.png", "Cabinet aux tiroirs à la bougie"],
  ["50", "50_fond_contact.png", "Cabinet et coupelle de symboles sur velours violet"],
  ["51", "51_fond_informations.png", "Étagères du Coven à la bougie"],
  ["52", "52_fond_404.png", "Pièce du Coven à la bougie"],
  ["53", "53_fond_panier_mobile.png", "Coupelle et bracelet à la bougie"],
  ["54", "54_fond_commande_mobile.png", "Pièce du Coven, fenêtre à la lune"],
  ["55", "55_fond_confirmation_mobile.png", "Fenêtre à la lune et bougies"],
  ["56", "56_fond_compte_mobile.png", "Cabinet aux tiroirs étiquetés"],
  ["57", "57_fond_contact_mobile.png", "Coupelle de symboles à la bougie"],
  ["58", "58_fond_informations_mobile.png", "Cabinet aux tiroirs à la bougie"],
];
export const covenHdFile = (n: string) => `coven-hd-${n}.jpg`;
export const COVEN_HD_MEDIA: CovenMedia[] = HD.map(([n, source, alt]) => ({ file: covenHdFile(n), source, alt, origin: "hd" as const }));

/** Emplacement des planches (nom du visuel découpé) → image HD du client qui en est la source. */
export const CROP_HD: Record<string, string> = {
  "accueil-scene": "01", "m-accueil-scene": "23", "accueil-coupelle": "03", "accueil-exemple-1": "06", "accueil-exemple-2": "07", "accueil-exemple-3": "08",
  "accueil-livre": "43", "accueil-bougies": "44", "m-accueil-etape-1": "02", "m-accueil-etape-2": "03", "m-accueil-etape-3": "37", "m-accueil-etape-4": "05", "m-accueil-coupelle": "45",
  "produit-photo": "02", "m-produit-photo": "24", "produit-vignette-1": "02", "produit-vignette-2": "05", "produit-vignette-3": "13", "produit-vignette-4": "14", "produit-vignette-5": "43", "produit-vignette-6": "08",
  "m-produit-vignette-1": "24", "m-produit-vignette-2": "03", "m-produit-vignette-3": "10", "m-produit-vignette-4": "43",
  "produit-etape-1": "03", "produit-etape-2": "04", "produit-etape-3": "05", "m-produit-etape-2": "03", "m-produit-etape-3": "37", "m-produit-etape-4": "05",
  "produit-exemple-1": "06", "produit-exemple-2": "07", "produit-exemple-3": "08", "produit-exemple-4": "20", "m-produit-exemple-1": "19", "m-produit-exemple-2": "17", "produit-bougies": "45",
  "tirage-scene": "09", "m-tirage-scene": "25", "tirage-etape-1": "02", "tirage-etape-2": "09", "tirage-etape-3": "37", "tirage-etape-4": "05",
  "tirage-famille-1": "31", "tirage-famille-2": "32", "tirage-famille-3": "33", "tirage-famille-4": "34", "tirage-famille-5": "35", "tirage-famille-6": "36", "tirage-tableau": "21", "tirage-questions": "44",
  "coven-scene": "10", "m-coven-scene": "26", "coven-bougie": "44", "coven-photo-1": "11", "coven-photo-2": "12", "coven-photo-3": "13", "coven-photo-4": "14", "m-coven-photo-3": "43", "m-coven-photo-6": "14",
  "creations-scene": "16", "m-creations-scene": "44", "creations-1": "15", "creations-2": "16", "creations-3": "17", "creations-4": "18", "creations-5": "19", "creations-6": "20",
  "m-creations-1": "27", "m-creations-2": "28", "m-creations-3": "29", "m-creations-4": "30",
  "faq-scene": "22", "m-faq-scene": "22", "faq-livres": "51", "panier-scene": "46", "m-panier-scene": "53", "panier-ligne": "02",
  "commande-scene": "47", "m-commande-scene": "54", "confirmation-scene": "48", "m-confirmation-scene": "55", "compte-scene": "49", "m-compte-scene": "56",
  "contact-scene": "50", "m-contact-scene": "57", "informations-scene": "51", "m-informations-scene": "58", "404-scene": "52",
};

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

export const covenMedia = (): CovenMedia[] => [...COVEN_CLIENT_MEDIA, ...COVEN_HD_MEDIA, ...covenControlMedia(), ...COVEN_FILE_MEDIA];

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
  const mode = opts.mode ?? "client";
  // Aperçu client avec les images HD du client : chaque emplacement des planches reçoit sa scène d'origine et aucun
  // visuel découpé (flou) n'est posé ; sans elles, repli sur les photos du client et les visuels provisoires.
  const hd = mode === "client" && COVEN_HD_MEDIA.every((m) => has(m.file));
  const img = (file: string) => {
    const crop = hd ? file.match(/^coven-mq-(.+)\.jpg$/)?.[1] : undefined;
    if (crop !== undefined) return CROP_HD[crop] ? covenHdFile(CROP_HD[crop]) : "";
    return has(file) ? file : "";
  };
  // Réglages globaux : thème sombre, ni panier tiroir, ni bandeau de cookies du thème de base (celui du Coven le remplace).
  Object.assign(spec.settings, {
    editorial_profile: "none", conversion_profile: "none", ds_language: "none", cart_type: "page", cookie_banner: false, fab_back_to_top: false, fab_contact_link: "",
    color_background: "#0a090d", color_foreground: "#ece4d6", color_accent: "#e2b765", color_button: "#e2b765", color_button_text: "#24170a",
  });
  for (const k of Object.keys(spec.settings)) if (/^(floating_|whatsapp_|sticky_)/.test(k) && typeof spec.settings[k] === "boolean") spec.settings[k] = false;
  // Image HD du client, sinon photo du client si elle convient (aperçu client), sinon visuel découpé dans la planche.
  const v = (clientFile: string | null, crop: string) => (!hd && mode === "client" && clientFile && has(clientFile) ? clientFile : img(`coven-mq-${crop}.jpg`));
  const hdFile = (n: string) => (has(covenHdFile(n)) ? covenHdFile(n) : "");
  const ctx = { img, v, mode, preview: !!opts.preview, hd, hdFile };
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
