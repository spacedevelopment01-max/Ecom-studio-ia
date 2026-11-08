/**
 * SINA (#492), étape 6 : consignes des images de maquette (une par image du découpage), en français, concrètes,
 * écrites comme une photo décrite (docs/guide-images-ia.md) : type d'image et cadrage, fond, chaque page à sa place
 * avec ses sections, compte exact des pages, rien de coupé, lumière et style, puis les interdits. Seuls les textes
 * voulus sont entre guillemets (nom, slogan, noms des pages, produits ou prestations). AUCUN appel ici : le Studio
 * construit les consignes et donne le coût maximal ; la génération (payante) reste un geste séparé, accepté avant.
 */
import type { Brand } from "../../project-types";
import { FONT_FILES } from "../../theme/render";
import { pageByKey, pageLayout, VIEWPORT_WIDTH, type MockupPage } from "./pages";
import type { MockupDirection, MockupImage } from "./mockup-set";
import { copyLines, type PageCopy } from "./copy";

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
  /** Textes complets écrits avant la maquette (mockup.copy), par page : écrits lettre pour lettre sur l'image. */
  copy?: Record<string, PageCopy>;
};

const family = (handle: string) => FONT_FILES[handle.replace(/_[ni]\d$/, "")]?.family ?? handle;
/**
 * Police décrite par son style, jamais par son nom (essai réel du 8 novembre : « Cormorant Garamond » et « Karla »
 * écrits sur la maquette comme titre et comme lien du menu).
 */
const fontLook = (handle: string, role: "heading" | "body") => {
  const fb = FONT_FILES[handle.replace(/_[ni]\d$/, "")]?.fallback ?? "";
  if (/serif/.test(fb) && !/sans/.test(fb)) return role === "heading" ? "une police à empattements, fine et élégante" : "une police à empattements lisible";
  if (/cursive|script/.test(fb)) return "une écriture manuscrite soignée";
  if (/mono/.test(fb)) return "une police à chasse fixe";
  return role === "heading" ? "une police sans empattements, nette" : "une police sans empattements simple et lisible";
};
/** Retire d'un texte libre (style de la direction) les noms de polices et les codes couleur, qui seraient recopiés. */
const withoutTechnicalWords = (t: string, f: MockupFacts) => {
  const names = [f.brand?.fonts?.heading, f.brand?.fonts?.body].filter(Boolean).map((h) => family(h as string));
  // Une phrase qui nomme une police (« Titres en …, textes en … ») est retirée entière ; les codes couleur aussi.
  let out = (t.match(/[^.!?]+[.!?]*/g) ?? [t]).filter((x) => !names.some((n) => x.includes(n))).join(" ");
  out = out.replace(/#[0-9a-f]{3,8}\b/gi, "").replace(/\(\s*\)/g, "");
  return out.replace(/\b(en|et)\s*([,.;])/g, "$2").replace(/\s+([,.;])/g, "$1").replace(/[,;]\s*[,;.]/g, ".").replace(/\s{2,}/g, " ").trim();
};
/** Titre de plusieurs phrases : une phrase par ligne (le modèle d'images tient mieux les mots courts). */
const headlineLines = (h: string) => { const parts = h.match(/[^.!?…]+[.!?…]+/g)?.map((x) => x.trim()) ?? [h]; return parts.length > 1 ? `sur ${parts.length} lignes : ${parts.map((x) => `« ${x} »`).join(" puis ")}` : `« ${h} »`; };
const euros = (cents: number) => `${(cents / 100).toFixed(2).replace(".", ",").replace(",00", "")} €`;

/** Faits utiles à la maquette, lus dans le projet (rien d'inventé : prix confirmés seulement). */
export function mockupFacts(p: { business: "products" | "services"; name: string; brand: Brand | null; product: { name: string; price: { amount: number | null; status: string } }; catalog: { name: string; price: number | null }[]; services: { services: { name: string; price?: string }[] } }, angle?: string, productPhoto = false, extra: { products?: { title: string; price: number | null }[]; texts?: MockupFacts["texts"]; copy?: MockupFacts["copy"] } = {}): MockupFacts {
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
  return { business: p.business, name: p.brand?.name ?? p.name, brand: p.brand, offers, angle, productPhoto, ...(extra.texts ? { texts: extra.texts } : {}), ...(extra.copy ? { copy: extra.copy } : {}) };
}

/** Rôles des couleurs (palettes du propriétaire du 7 novembre : bouton, détails, texte, fond, surface). */
/**
 * Fond d'une maquette, au choix de la direction (demande du propriétaire du 8 novembre : trois maquettes qui jouent
 * franchement sur la palette de la marque) : clair (fond de l'identité), sombre (ancrage sombre de la marque), ou
 * grandes bandes pleines dans la couleur de marque. Toujours les seules couleurs de l'identité.
 */
export type MockupGround = "clair" | "sombre" | "marque";
export function colourRoles(b: MockupFacts["brand"], ground?: MockupGround): string {
  if (!b?.palette) return "";
  const p = b.palette;
  if (ground === "sombre") return `Couleurs de l'identité, strictement, en version sombre : l'ouverture, la plupart des bandes et le pied de page sont sur le sombre ${p.dark}, avec titres et textes clairs ${p.light} ; une ou deux sections claires ${p.light} (textes ${p.dark}) pour respirer ; boutons ${p.accent} avec texte ${p.dark} sur le sombre, ${p.primary} sur le clair ; surfaces des cartes ${p.secondary} ; détails graphiques ${p.accent}.`;
  if (ground === "marque") return `Couleurs de l'identité, strictement, en grands aplats : alternance franche de bandes pleine largeur en couleur de marque ${p.primary} (titres et textes ${p.light}), en surface ${p.secondary} (textes ${p.dark}) et en clair ${p.light} ; l'accent ${p.accent} pour un bandeau, des pastilles et des détails ; boutons ${p.accent} sur la couleur de marque, ${p.primary} ailleurs ; le sombre ${p.dark} pour le pied de page.`;
  if (b.paletteRoles === "sina-2026") {
    const dark = b.ground === "sombre";
    const bg = b.ground === "degrade" && b.gradient ? `un dégradé à 135° de ${b.gradient.from} à ${b.gradient.to}` : dark ? `le sombre ${p.dark}` : `le clair ${p.light}`;
    return `Couleurs de l'identité, strictement : fond des pages ${bg} ; textes ET titres ${dark ? p.light : p.dark} ; boutons et liens d'action ${p.primary} (couleur de marque, la seule couleur d'action) ; surfaces des cartes et bandeaux ${p.secondary} ; détails graphiques (filets, puces, icônes au trait) ${p.accent}.`;
  }
  return `Couleurs de l'identité, strictement : ${Object.entries(p).map(([k, v]) => `${k} ${v}`).join(", ")} ; une seule couleur d'action.`;
}

const POS = ["à gauche", "en deuxième position", "en troisième position", "en quatrième position", "en cinquième position", "en sixième position"];

/** Consigne d'UNE image de maquette. */
export function mockupImagePrompt(f: MockupFacts, d: Pick<MockupDirection, "name" | "style"> & { ground?: MockupGround }, img: Pick<MockupImage, "viewport" | "pages">, pages: MockupPage[]): string {
  const list = img.pages.map((k) => pageByKey(pages, k)).filter((x): x is MockupPage => !!x);
  const desktop = img.viewport === "desktop";
  const w = VIEWPORT_WIDTH[img.viewport];
  const n = list.length;
  const brand = f.brand;
  const onePhone = !desktop && n === 1;
  const offers = f.offers.length ? f.offers.map((o) => `« ${o.name} »${o.price ? ` (${o.price})` : ""}`).join(", ") : "";
  return [
    // 1) type d'image, format, point de vue, cadrage
    `Planche de maquette de site web (design d'interface professionnel de 2026, rendu net et lisible), format portrait, vue de face, à plat, sans perspective, sans écran ni appareil autour. Direction graphique « ${d.name} » : ${withoutTechnicalWords(d.style, f).replace(/[.\s]+$/, "")}.`,
    desktop
      ? n === 1 ? `Une seule page en version ordinateur (${w} px de large), montrée entière, de l'en-tête au pied de page, en une longue colonne centrée.` : `${n} pages en version ordinateur (${w} px de large), posées côte à côte en colonnes de même largeur, chacune entière de l'en-tête au pied de page.`
      // Téléphone (deux essais réels du 8 novembre : la page d'ordinateur rétrécie dans un cadre de téléphone) : la
      // page est montrée en DEUX tronçons côte à côte, chacun de la largeur d'un téléphone, vraiment composée pour lui ;
      // aucune phrase de la consigne ne parle plus d'« une page entière » (contradiction que le modèle résolvait en
      // dessinant la page d'ordinateur). Retour du propriétaire sur le 3e essai : les trois articles du journal côte à
      // côte ne vont pas sur téléphone ; jamais trois éléments côte à côte.
      : onePhone
        ? `Ce n'est PAS la page d'ordinateur rétrécie : c'est la version téléphone (${w} px de large) d'une seule page, montrée en 2 longues bandes verticales étroites de même largeur, posées côte à côte avec un espace entre elles, lues de gauche à droite : à gauche le haut de la page, à droite la suite jusqu'au pied de page. Aucun cadre d'appareil, aucun téléphone dessiné, aucune encoche, aucune barre d'état. Mise en page de téléphone : une seule colonne, tout est empilé verticalement ; en-tête avec seulement le logo à gauche et une icône de menu à trois traits à droite (aucun lien de menu ni aucun bouton en haut, règle du propriétaire) ; produits en cartes deux par rangée au plus ; gros plans, scènes d'usage et articles du journal l'un sous l'autre, chacun sur toute la largeur de la bande (jamais trois éléments côte à côte, nulle part) ; questions l'une sous l'autre ; boutons sur toute la largeur de la bande ; textes d'au moins 16 px.`
        : `${n} pages en version téléphone (${w} px de large), sans cadre d'appareil, posées côte à côte en colonnes étroites, chacune montrant le haut de sa page. Mise en page VRAIMENT pour téléphone : une seule colonne, tout empilé, deux éléments côte à côte au plus (jamais trois), en-tête avec seulement le logo et le menu replié en une icône à trois traits (aucun bouton en haut), boutons sur toute la largeur, textes d'au moins 16 px.`,
    // 2) surface et fond
    "Autour des pages : un fond uni gris très clair et neutre, sans texture ni ombre portée marquée.",
    // 3) chaque page à sa place
    ...list.map((p, i) => { const lay = pageLayout(p); return `${n > 1 ? `Page ${POS[i] ?? `n° ${i + 1}`}` : "La page"}, avec son nom écrit en petit au-dessus : « ${p.fr} ». Elle montre dans cet ordre : ${p.sections.join(" ; ")}.${lay ? ` Structure imposée : ${lay}. La direction graphique s'applique aux couleurs, aux polices, aux cartes et aux détails, jamais à cette structure.` : ""}`; }),
    // Textes complets de la page écrits avant la maquette (consigne du propriétaire : le copywriting est SUR la maquette).
    ...list.flatMap((p) => (f.copy?.[p.key] ? [`Textes de la page « ${p.fr} », écrits lettre pour lettre, chacun à sa place, sans en ajouter, sans en retirer :`, ...copyLines(f.copy[p.key], { phone: !desktop })] : [])),
    // Sans textes écrits : textes exacts de la marque pour l'accueil, mot pour mot (jamais réécrits par le modèle d'images).
    ...(list.some((p) => p.key === "home") && !f.copy?.home && f.texts?.headline ? [`Textes de la page « Accueil », recopiés mot pour mot, lettre pour lettre : grand titre d'ouverture ${headlineLines(f.texts.headline)}${brand?.tagline ? ` ; sous le titre, le slogan « ${brand.tagline} »` : ""}${f.texts.cta ? ` ; bouton principal « ${f.texts.cta} »` : ""}${f.texts.messages?.length ? ` ; plus bas, ces messages, un par bloc : ${f.texts.messages.map((m) => `« ${m} »`).join(", ")}` : ""}. Les autres textes sont de simples libellés courts (menu, noms et prix des produits).`] : []),
    // Moins de texte = moins de lettres abîmées (essai réel du 8 novembre) : seuls les textes cités sont écrits.
    list.every((p) => f.copy?.[p.key])
      ? "Les seuls textes de la page sont ceux cités entre guillemets dans cette consigne, plus les liens courts du menu et du pied de page. Les codes couleur, les noms de police et les noms de sections de cette consigne sont des indications : ils ne sont jamais écrits sur la page."
      : "Les paragraphes et les textes secondaires (descriptions, journal, inscription, pied de page) sont figurés par de fines lignes grises de faux texte, sans aucune lettre lisible ; seuls les textes cités entre guillemets dans cette consigne sont écrits en lettres. Les codes couleur et les noms de police de cette consigne sont des indications : ils ne sont jamais écrits sur la page.",
    // 4) compte exact
    onePhone
      ? `La planche contient exactement 2 bandes étroites, qui forment ensemble la seule page « ${list[0].fr} » en version téléphone. Aucune autre page, aucun écran supplémentaire.`
      : `La planche contient exactement ${n} page${n > 1 ? "s" : ""} : ${list.map((p) => `« ${p.fr} »`).join(", ")}. Aucune autre page, aucun écran supplémentaire.`,
    // 5) cadrage
    onePhone ? "Rien n'est coupé par le cadre : les deux bandes sont entières, avec de l'air autour." : "Rien n'est coupé par le cadre : chaque page est entière, avec de l'air autour.",
    // 6) style, lumière, typographie
    `Marque : « ${f.name} »${brand?.tagline ? `, slogan « ${brand.tagline} »` : ""}. Le logo fourni en référence est reproduit à l'identique dans l'en-tête de ${onePhone ? "la page" : "chaque page"} ; aucun autre logo.`,
    colourRoles(brand, d.ground),
    brand?.fonts ? `Deux polices seulement : titres en ${fontLook(brand.fonts.heading, "heading")}, textes en ${fontLook(brand.fonts.body, "body")} (15 à 17 px), tailles fluides et hiérarchie nette.` : "",
    "Mise en page rythmée selon la direction graphique (elle prime sur tout réglage par défaut), un motif graphique propre à la marque (son symbole), boutons d'au moins 44 px.",
    f.business === "services"
      ? `Activité : prestations ${offers || "du client"}. Photos de lieux, d'outils et de réalisations, jamais de personne.`
      : `Produits : ${offers || `« ${f.name} »`}.${f.productPhoto ? " La photo du produit fournie en référence est utilisée telle quelle (même produit, mêmes couleurs, entier, rien de redessiné)." : ""}${list.some((p) => p.key === "cart") ? ` Le panier d'exemple montre EXACTEMENT les ${cartLines(f) || "deux"} lignes citées dans ses textes, pas une de plus (essai réel : six lignes dessinées pour un sous-total de deux).` : ""}`,
    // Accroche citée seulement pour l'accueil (essai réel du 8 novembre : reprise en grand titre sur le contact, qui
    // n'en avait pas dans ses textes).
    f.angle ? `Ton des textes : ${list.some((p) => p.key === "home") ? f.angle : f.angle.replace(/,?\s*accroche « [^»]*»/, "")}. Titres courts et émotionnels, boutons courts qui commencent par un verbe.${list.some((p) => p.key === "home") ? "" : " Aucun titre ni texte de l'accueil n'est repris sur cette page."}` : "Titres courts et émotionnels, boutons courts qui commencent par un verbe.",
    // 7) interdits
    "Textes en français, exacts et lisibles. Aucun avis, note, étoile, chiffre, garantie, label, promotion, compte à rebours ou prix barré inventé. Aucune personne, aucun visage, aucune main ni aucune autre partie du corps (même pour « assemblé à la main » : montrer les ingrédients, les outils, le résultat), aucun filigrane, aucun autre logo. Aucun objet supplémentaire.",
  ].filter(Boolean).join("\n");
}

/** Nombre de lignes du panier d'exemple (textes de la page panier). */
function cartLines(f: MockupFacts): number {
  return f.copy?.cart?.sections.find((x) => /lignes du panier/.test(x.section))?.items.length ?? 0;
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

/**
 * Consigne d'une photo du site recréée en haute définition d'après la maquette (demande du propriétaire du 8 novembre :
 * « que ce soit comme les maquettes »). L'image 1 est la photo découpée sur la maquette : elle est reproduite, pas
 * réinventée. Ordre du guide des images : type et format, ce qu'on reproduit, compte, coupes, lumière, interdits.
 */
export function siteImageHdPrompt(slot: { description: string; ratio?: string }, f: { name: string; logo: boolean; product: boolean }): string {
  return [
    `Photographie en haute définition pour le site « ${f.name} », au format ${slot.ratio ?? "de la photo de référence"}, nette et détaillée.`,
    "L'image 1 est la photo de la maquette du site, en petite taille : reproduis-la À L'IDENTIQUE en haute définition, même cadrage, même point de vue, mêmes objets à la même place, mêmes formes, mêmes matières, mêmes couleurs, même lumière et même ambiance. Ne change pas la composition, n'ajoute rien, ne retire rien.",
    `Ce qu'elle montre : ${slot.description.replace(/[.\s]+$/, "")}.`,
    f.product ? "La photo du produit réel est jointe : le produit est reproduit exactement (forme, couleurs, étiquette), entier, rien n'est coupé." : "",
    f.logo ? "Le logo de la marque est joint : s'il apparaît sur un emballage de la photo, il est reproduit exactement, sans autre mot ; sinon il n'apparaît pas." : "",
    f.logo ? "" : "Aucun logo, aucun nom de marque : ni sur un objet, ni sur une tasse, ni posé sur le fond.",
    "Aucun autre texte, aucune lettre, aucun chiffre, aucun filigrane, aucune personne, aucun visage, aucune main. Aucun objet supplémentaire.",
  ].filter(Boolean).join("\n");
}

/** Format d'une photo du site (« 16:9 », « 3:2 », « carré »…) vers les formats des modèles d'images. */
export function hdAspect(ratio?: string): "1:1" | "4:5" | "9:16" | "16:9" | "2:3" {
  const m = ratio?.match(/(\d+(?:[.,]\d+)?)\s*[:/x×]\s*(\d+(?:[.,]\d+)?)/);
  const r = m ? Number(m[1].replace(",", ".")) / Number(m[2].replace(",", ".")) : /carr/i.test(ratio ?? "") ? 1 : 1.5;
  if (r >= 1.25) return "16:9";
  if (r >= 0.9) return "1:1";
  if (r >= 0.72) return "4:5";
  if (r >= 0.6) return "2:3";
  return "9:16";
}
