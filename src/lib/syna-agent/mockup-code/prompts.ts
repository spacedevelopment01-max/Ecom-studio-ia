/**
 * SINA (#492), étape 6 : consignes des images de maquette (une par image du découpage), en français, concrètes,
 * écrites comme une photo décrite (docs/guide-images-ia.md) : type d'image et cadrage, fond, chaque page à sa place
 * avec ses sections, compte exact des pages, rien de coupé, lumière et style, puis les interdits. Seuls les textes
 * voulus sont entre guillemets (nom, slogan, noms des pages, produits ou prestations). AUCUN appel ici : le Studio
 * construit les consignes et donne le coût maximal ; la génération (payante) reste un geste séparé, accepté avant.
 */
import type { Brand } from "../../project-types";
import { FONT_FILES } from "../../theme/render";
import { pageByKey, VIEWPORT_WIDTH, type MockupPage } from "./pages";
import type { MockupDirection, MockupImage } from "./mockup-set";

export type MockupFacts = {
  business: "products" | "services";
  name: string;
  brand: Pick<Brand, "name" | "tagline" | "palette" | "fonts" | "ground" | "gradient" | "paletteRoles"> | null;
  /** Produits (prix seulement s'il est confirmé, en centimes) ou prestations (prix donnés par le client). */
  offers: { name: string; price?: string }[];
  /** Accroche de l'angle marketing choisi (étape 4), si elle existe. */
  angle?: string;
  /** Photo du produit fournie en référence à l'IA d'images. */
  productPhoto: boolean;
  /**
   * Textes EXACTS de la marque pour l'accueil (consigne du propriétaire : logo, typographies, couleurs et textes de la
   * marque gardés) : accroche et appel à l'action de l'angle choisi, messages clés de la recherche.
   */
  texts?: { headline?: string; cta?: string; messages?: string[] };
};

const family = (handle: string) => FONT_FILES[handle.replace(/_[ni]\d$/, "")]?.family ?? handle;
const euros = (cents: number) => `${(cents / 100).toFixed(2).replace(".", ",").replace(",00", "")} €`;

/** Faits utiles à la maquette, lus dans le projet (rien d'inventé : prix confirmés seulement). */
export function mockupFacts(p: { business: "products" | "services"; name: string; brand: Brand | null; product: { name: string; price: { amount: number | null; status: string } }; catalog: { name: string; price: number | null }[]; services: { services: { name: string; price?: string }[] } }, angle?: string, productPhoto = false, extra: { products?: { title: string; price: number | null }[]; texts?: MockupFacts["texts"] } = {}): MockupFacts {
  // Produits de l'onglet Produits d'abord (essai réel du 8 novembre : le nom de la fiche de départ, tronqué, « 6 mélanges
  // vendus en vrac dans des », aurait été écrit comme un produit).
  const offers = p.business === "services"
    ? p.services.services.slice(0, 8).map((s) => ({ name: s.name, ...(s.price ? { price: s.price } : {}) }))
    : extra.products?.length
      ? extra.products.slice(0, 8).map((x) => ({ name: x.title, ...(x.price != null ? { price: euros(x.price) } : {}) }))
      : [
        ...(p.product.name ? [{ name: p.product.name, ...(p.product.price.status === "confirmed" && p.product.price.amount != null ? { price: euros(p.product.price.amount) } : {}) }] : []),
        ...p.catalog.slice(0, 8).map((c) => ({ name: c.name, ...(c.price != null ? { price: euros(c.price) } : {}) })),
      ];
  return { business: p.business, name: p.brand?.name ?? p.name, brand: p.brand, offers, angle, productPhoto, ...(extra.texts ? { texts: extra.texts } : {}) };
}

/** Rôles des couleurs (palettes du propriétaire du 7 novembre : bouton, détails, texte, fond, surface). */
export function colourRoles(b: MockupFacts["brand"]): string {
  if (!b?.palette) return "";
  const p = b.palette;
  if (b.paletteRoles === "sina-2026") {
    const dark = b.ground === "sombre";
    const bg = b.ground === "degrade" && b.gradient ? `un dégradé à 135° de ${b.gradient.from} à ${b.gradient.to}` : dark ? `le sombre ${p.dark}` : `le clair ${p.light}`;
    return `Couleurs de l'identité, strictement : fond des pages ${bg} ; textes ET titres ${dark ? p.light : p.dark} ; boutons et liens d'action ${p.primary} (couleur de marque, la seule couleur d'action) ; surfaces des cartes et bandeaux ${p.secondary} ; détails graphiques (filets, puces, icônes au trait) ${p.accent}.`;
  }
  return `Couleurs de l'identité, strictement : ${Object.entries(p).map(([k, v]) => `${k} ${v}`).join(", ")} ; une seule couleur d'action.`;
}

const POS = ["à gauche", "en deuxième position", "en troisième position", "en quatrième position", "en cinquième position", "en sixième position"];

/** Consigne d'UNE image de maquette. */
export function mockupImagePrompt(f: MockupFacts, d: Pick<MockupDirection, "name" | "style">, img: Pick<MockupImage, "viewport" | "pages">, pages: MockupPage[]): string {
  const list = img.pages.map((k) => pageByKey(pages, k)).filter((x): x is MockupPage => !!x);
  const desktop = img.viewport === "desktop";
  const w = VIEWPORT_WIDTH[img.viewport];
  const n = list.length;
  const brand = f.brand;
  const offers = f.offers.length ? f.offers.map((o) => `« ${o.name} »${o.price ? ` (${o.price})` : ""}`).join(", ") : "";
  return [
    // 1) type d'image, format, point de vue, cadrage
    `Planche de maquette de site web (design d'interface professionnel de 2026, rendu net et lisible), format portrait, vue de face, à plat, sans perspective, sans écran ni appareil autour. Direction graphique « ${d.name} » : ${d.style.trim().replace(/[.\s]+$/, "")}.`,
    desktop
      ? n === 1 ? `Une seule page en version ordinateur (${w} px de large), montrée entière, de l'en-tête au pied de page, en une longue colonne centrée.` : `${n} pages en version ordinateur (${w} px de large), posées côte à côte en colonnes de même largeur, chacune entière de l'en-tête au pied de page.`
      : `${n} écran${n > 1 ? "s" : ""} de téléphone (${w} px de large) posé${n > 1 ? "s côte à côte" : ""}, chacun montrant la page entière en longueur, composée pour le téléphone (titres et coupes de lignes propres au téléphone, menu replié en icône).`,
    // 2) surface et fond
    "Autour des pages : un fond uni gris très clair et neutre, sans texture ni ombre portée marquée.",
    // 3) chaque page à sa place
    ...list.map((p, i) => `${n > 1 ? `Page ${POS[i] ?? `n° ${i + 1}`}` : "La page"}, avec son nom écrit en petit au-dessus : « ${p.fr} ». Elle montre dans cet ordre : ${p.sections.join(" ; ")}.`),
    // Textes exacts de la marque pour l'accueil, mot pour mot (jamais réécrits par le modèle d'images).
    ...(list.some((p) => p.key === "home") && f.texts?.headline ? [`Textes de la page « Accueil », recopiés mot pour mot, lettre pour lettre : grand titre d'ouverture « ${f.texts.headline} »${brand?.tagline ? ` ; sous le titre, le slogan « ${brand.tagline} »` : ""}${f.texts.cta ? ` ; bouton principal « ${f.texts.cta} »` : ""}${f.texts.messages?.length ? ` ; plus bas, ces messages, un par bloc : ${f.texts.messages.map((m) => `« ${m} »`).join(", ")}` : ""}. Les autres textes sont de simples libellés courts (menu, noms et prix des produits).`] : []),
    // 4) compte exact
    `La planche contient exactement ${n} page${n > 1 ? "s" : ""} : ${list.map((p) => `« ${p.fr} »`).join(", ")}. Aucune autre page, aucun écran supplémentaire.`,
    // 5) cadrage
    "Rien n'est coupé par le cadre : chaque page est entière, avec de l'air autour.",
    // 6) style, lumière, typographie
    `Marque : « ${f.name} »${brand?.tagline ? `, slogan « ${brand.tagline} »` : ""}. Le logo fourni en référence est reproduit à l'identique dans l'en-tête de chaque page ; aucun autre logo.`,
    colourRoles(brand),
    brand?.fonts ? `Deux polices seulement : titres en ${family(brand.fonts.heading)}, textes en ${family(brand.fonts.body)} (15 à 17 px), tailles fluides et hiérarchie nette.` : "",
    "Mise en page aérée et rythmée (bandes pleine largeur, sections aérées, grandes photos), un motif graphique propre à la marque, boutons d'au moins 44 px, effets sobres.",
    f.business === "services"
      ? `Activité : prestations ${offers || "du client"}. Photos de lieux, d'outils et de réalisations, jamais de personne.`
      : `Produits : ${offers || `« ${f.name} »`}.${f.productPhoto ? " La photo du produit fournie en référence est utilisée telle quelle (même produit, mêmes couleurs, entier, rien de redessiné)." : ""}`,
    f.angle ? `Ton des textes : ${f.angle}. Titres courts et émotionnels (2 à 8 mots), boutons « verbe + objet ».` : "Titres courts et émotionnels (2 à 8 mots), boutons « verbe + objet ».",
    // 7) interdits
    "Textes en français, exacts et lisibles. Aucun avis, note, étoile, chiffre, garantie, label, promotion, compte à rebours ou prix barré inventé ; une information inconnue s'écrit « [À compléter] ». Aucune personne, aucun visage, aucun filigrane, aucun autre logo. Aucun objet supplémentaire.",
  ].filter(Boolean).join("\n");
}

/** Consignes de toutes les images d'une maquette (même style pour toutes : même direction, mêmes règles). */
export function mockupRequests(f: MockupFacts, d: Pick<MockupDirection, "name" | "style">, images: Pick<MockupImage, "id" | "viewport" | "pages">[], pages: MockupPage[]) {
  return images.map((img) => ({ id: img.id, viewport: img.viewport, pages: img.pages, prompt: mockupImagePrompt(f, d, img, pages) }));
}

/**
 * Coût maximal des images de maquette : nombre d'images × coût maximal d'une image (référence du logo, et de la photo
 * du produit s'il y en a une). `unit` : coût d'une image (siteMockupMaxMicro du Studio, simulé en test) ; null =
 * aucun modèle d'images utilisable, rien n'est promis.
 */
export function mockupImagesMaxMicro(imageCount: number, references: number, unit: (references: number) => number | null): number | null {
  const one = unit(references);
  return one == null ? null : one * imageCount;
}

/**
 * Consigne d'une image DU SITE (étape 7, créée par l'IA d'images à partir d'un emplacement lu sur la maquette), dans
 * l'ordre du guide : type et cadrage, surface, objets, compte, coupes, lumière, interdits. Jamais de personne.
 */
export function siteImagePrompt(slot: { description: string; ratio?: string; objects?: string[]; light?: string }, f: Pick<MockupFacts, "name" | "business">): string {
  const objects = (slot.objects ?? []).filter(Boolean);
  return [
    `Photographie ${slot.ratio ? `au format ${slot.ratio}` : ""} pour le site « ${f.name} » : ${slot.description}.`.replace(/\s+/g, " "),
    ...objects.map((o) => `${o}.`),
    objects.length ? `La scène contient exactement ${objects.length} objet${objects.length > 1 ? "s" : ""} : ${objects.join(" ; ")}.` : "",
    "Chaque objet principal est entier, rien d'important n'est coupé par le cadre ; de l'air est laissé autour.",
    slot.light ? `Lumière : ${slot.light}.` : "Lumière douce et naturelle, ombres douces, textures nettes, mise au point sur le sujet.",
    "Aucun texte, aucune lettre, aucun chiffre, aucune gravure, aucun logo, aucun filigrane, aucune personne. Aucun objet supplémentaire.",
  ].filter(Boolean).join("\n");
}
