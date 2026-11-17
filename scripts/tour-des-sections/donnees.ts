/**
 * Tour des sections : les clients d'essai du banc. Tout est INVENTÉ pour le banc, neutre, et ne vient d'aucun projet
 * d'essai du Studio. Rien ne part vers une IA ni vers un client : ces données ne servent qu'à remplir les pièces pour
 * les regarder.
 *
 * Trois clients, un par état de contenu :
 *  - « vrai »      : un petit site réaliste (3 produits dont un sans photo, 4 prestations avec prix, horaires, zone,
 *                    téléphone, adresse ; aucun avis) ;
 *  - « difficile » : les mêmes rubriques poussées à bout (7 produits aux noms longs, un prix à cinq chiffres, 3 options,
 *                    le premier produit sans photo, 7 prestations, 7 villes, des avis longs) ;
 *  - « seul »      : un seul élément partout (1 produit, 1 prestation, 1 ville, 1 période d'horaires).
 */
import type * as TD from "../../src/lib/syna-agent/custom-theme/tenue-data";
import type { Tenue } from "../../src/lib/syna-agent/custom-theme/tenue";

export const MARQUE = "Maison Essai";

// ---------------------------------------------------------------- les tenues du banc

export type TenueBanc = {
  cle: string; libelle: string;
  palette: { light: string; dark: string; primary: string; secondary: string; accent: string };
  fonts: { heading: string; body: string }; tenue: Tenue;
  /** La police des titres est très grasse à sa graisse normale (Archivo Black) : elle compte comme « gras » pour le pavé gras. */
  titreLourd: boolean;
};
const DIFFICILE = { light: "#FFF6E0", dark: "#1A1F3A", primary: "#FFD23F", secondary: "#2A3157", accent: "#FFD23F" };
export const TENUES: TenueBanc[] = [
  { cle: "calme", libelle: "calme (fond clair, titres fins, bouton pilule, cadre droit)", palette: { light: "#F6F1E7", dark: "#1F2A24", primary: "#2F4A3C", secondary: "#E9D8B8", accent: "#2F4A3C" }, fonts: { heading: "instrument_serif", body: "dm_sans" }, tenue: { titres: "fins", bouton: "pilule", cadre: "droit", fond: "uni", petits: "normal", signe: "" } as Tenue, titreLourd: false },
  { cle: "gras", libelle: "difficile, titres gras (jaune vif, bleu nuit, bouton à ombre, cadre penché, police très large)", palette: DIFFICILE, fonts: { heading: "archivo_black", body: "dm_sans" }, tenue: { titres: "gras", bouton: "ombre", cadre: "penche", fond: "uni", petits: "normal", signe: "" } as Tenue, titreLourd: true },
  { cle: "capitales", libelle: "difficile, titres en capitales (mêmes couleurs, fond en toile, petits textes à la machine)", palette: DIFFICILE, fonts: { heading: "archivo_black", body: "dm_sans" }, tenue: { titres: "capitales", bouton: "ombre", cadre: "penche", fond: "toile", petits: "machine", signe: "" } as Tenue, titreLourd: true },
];

export const LARGEURS = [320, 390, 1280];
export const HAUTEUR = (largeur: number) => (largeur <= 480 ? 844 : largeur <= 900 ? 1024 : 860);

export const ETATS = ["exemple", "vrai", "difficile", "seul"] as const;
export type Etat = (typeof ETATS)[number];
export type Client = Exclude<Etat, "exemple">;

// ---------------------------------------------------------------- textes difficiles

/** Un mot de 24 lettres, inventé, sans trait d'union : il ne tient pas sur un téléphone étroit en grandes lettres. */
export const MOT_LONG = "extraordinairementsolide";
export const TITRE_LONG = `Un titre vraiment long de dix mots avec ${MOT_LONG} dedans`;
export const TITRE_CARTE_LONG = "Un nom de carte un peu trop long ici";
export const BOUTON_LONG = "Réserver ma place dès maintenant ici";
export const MARQUE_LONGUE = "[À compléter : une information un peu longue à demander au client]";
export const FAIT_LONG = "Une réponse longue du client, écrite d'une traite, avec tous les détails qu'il a tenu à donner.";
export const PRIX_LONG = 1245000; // 12 450,00 €

// ---------------------------------------------------------------- ce que le client d'essai aurait répondu

/** Chaque « [À compléter : …] » reçoit une réponse plausible d'après ce qui est demandé (la première règle qui va). */
const REPONSES: [RegExp, string][] = [
  [/t[ée]l[ée]phone/i, "04 72 00 00 00"], [/e-?mail|courriel/i, "bonjour@maison-essai.example"],
  [/adresse et horaires/i, "12 rue des Lilas, Lyon, du mardi au samedi"], [/adresse/i, "12 rue des Lilas, 69003 Lyon"],
  [/jours et heures|horaires/i, "Du mardi au samedi, 9 h – 18 h"], [/date et heure/i, "samedi 14 mars, 10 h"], [/mois et ann[ée]e/i, "mars 2026"],
  [/prix et d[ée]lai|d[ée]lai et prix/i, "4,90 €, sous 48 heures"], [/prix par|prix du|prix$|^prix|tarif|montant|frais|loyer/i, "38 €"],
  [/d[ée]lai|sous combien de temps|quand/i, "48 heures"], [/dur[ée]e|temps/i, "45 min"], [/remise|pourcentage/i, "10 %"],
  [/villes? desservies|zone/i, "Lyon, Villeurbanne et Bron"], [/ville|quartier|r[ée]gion|pays|lieu/i, "Lyon"],
  [/note moyenne/i, "4,8 sur 5"], [/nombre d'avis/i, "126 avis"], [/note/i, "4,8 sur 5"], [/nombre|combien|chiffre|quantit[ée]|places/i, "120"],
  [/pr[ée]nom et date|pr[ée]nom, date/i, "Camille, mars 2026"], [/pr[ée]nom|qui [ée]crit|signature|qui r[ée]pond/i, "Camille"], [/ann[ée]e/i, "2014"],
  [/date de la carte/i, "14 mars"], [/date|jour|saison/i, "le 14 mars"], [/heures?$/i, "10 h"], [/surface/i, "85 m², 4 pièces"], [/distance/i, "à 5 minutes à pied"],
  [/poids|contenance|portion|ration|taille|temp[ée]rature/i, "250 g"], [/couleur/i, "Sable"], [/code/i, "BIENVENUE"],
  [/nom du produit|nom du pack|nom |^nom/i, "Le classique"], [/avis d'un client|la phrase cit[ée]e|un avis/i, "Reçu vite, bien emballé, exactement comme sur la photo."],
  [/question/i, "Combien de temps faut-il compter ?"], [/moyens/i, "Carte bancaire, virement"], [/livraison/i, "Chez toi sous 48 heures"], [/retours?/i, "30 jours pour changer d'avis"],
];
const reponse = (quoi: string): string => REPONSES.find(([rx]) => rx.test(quoi))?.[1] ?? (quoi.length <= 28 ? "La réponse du client" : "La réponse du client, écrite avec ses mots, en une phrase simple.");
const MARQUE_RX = /\[À compléter(?:\s*:\s*([^\]]*))?\]/g;
/** Les textes du client d'essai : chaque manque reçoit sa réponse. */
export const remplir = (html: string) => html.replace(MARQUE_RX, (_m, quoi: string | undefined) => reponse((quoi ?? "").trim()));

// ---------------------------------------------------------------- une lecture légère du HTML d'une pièce

type Noeud = { tag: string; ouvre: string; debut: number; finOuvre: number; debutFerme: number; fin: number; enfants: Noeud[]; parent: Noeud | null };
const VIDES = new Set(["img", "input", "br", "hr", "source", "meta", "link", "wbr", "col", "area", "path", "circle", "rect", "line", "use", "polyline", "polygon", "ellipse", "stop"]);
/** L'arbre des balises, avec la place de chacune dans le texte d'origine (le HTML des pièces est bien formé). */
export function arbre(html: string): Noeud {
  const racine: Noeud = { tag: "", ouvre: "", debut: 0, finOuvre: 0, debutFerme: html.length, fin: html.length, enfants: [], parent: null };
  let cur = racine;
  const rx = /<!--[\s\S]*?-->|<(\/)?([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;
  for (let m = rx.exec(html); m; m = rx.exec(html)) {
    if (!m[2]) continue;
    const tag = m[2].toLowerCase();
    if (m[1]) { let n: Noeud | null = cur; while (n && n !== racine && n.tag !== tag) n = n.parent; if (n && n !== racine) { n.debutFerme = m.index; n.fin = rx.lastIndex; cur = n.parent ?? racine; } continue; }
    const n: Noeud = { tag, ouvre: m[0], debut: m.index, finOuvre: rx.lastIndex, debutFerme: rx.lastIndex, fin: rx.lastIndex, enfants: [], parent: cur };
    cur.enfants.push(n);
    if (VIDES.has(tag) || /\/\s*>$/.test(m[0])) continue;
    if (tag === "script" || tag === "style") { const end = html.indexOf(`</${tag}>`, rx.lastIndex); if (end < 0) continue; n.debutFerme = end; n.fin = end + tag.length + 3; rx.lastIndex = n.fin; continue; }
    cur = n;
  }
  return racine;
}
/** Les attributs de vraies données que le Studio pose lui-même : la liste d'une telle pièce vient du client d'essai, pas d'une répétition. */
const POSES = /\sdata-tn-(?:prestations|prestations-choix|prestations-options|equipe-options|produits|rayons|comparatif|garanties|avis|articles|biens|bien|biens-choix|carte|panier|panier-cote|lignes|suggestions|recherche|mots|versions|guide-tailles|lots|looks|coloris|packs|messages|cartes-vente|guide|temoignages|avis-page|avis-liste|reseaux|horaires|zone)\b/;
const classe = (n: Noeud) => /\sclass="([^"]*)"/.exec(n.ouvre)?.[1] ?? "";
/**
 * Les listes d'une pièce : un élément dont les enfants (trois au moins, ou deux « li ») ont tous la même balise et la
 * même classe. Une liste que le Studio remplit avec de vraies données n'en fait pas partie.
 */
export function listes(html: string): Noeud[] {
  const out: Noeud[] = [];
  const visite = (n: Noeud, pose: boolean) => {
    const ici = pose || POSES.test(n.ouvre);
    const e = n.enfants;
    if (!ici && n.tag && !["select", "svg", "tr", "thead", "colgroup", "picture"].includes(n.tag) && e.length >= (e[0]?.tag === "li" ? 2 : 3) && e.every((x) => x.tag === e[0].tag && classe(x) === classe(e[0])) && !["option", "br", "input", "span", "i", "b", "em", "strong", "path", "source", "col", "th", "td"].includes(e[0].tag)) out.push(n);
    for (const x of e) visite(x, ici);
  };
  visite(arbre(html), false);
  // Une liste dans une liste : seule la plus extérieure change de longueur.
  return out.filter((n) => !out.some((o) => o !== n && o.debut < n.debut && o.fin > n.fin));
}
/** La pièce avec chacune de ses listes à `n` éléments (les éléments d'origine, repris dans l'ordre s'il en faut plus). */
export function avecListes(html: string, n: number): string {
  let out = html;
  for (const l of listes(html).sort((a, b) => b.debut - a.debut)) {
    const e = l.enfants, items = e.map((x) => html.slice(x.debut, x.fin));
    const voulu = n < items.length ? items.slice(0, n) : n > items.length ? Array.from({ length: n }, (_x, i) => items[i % items.length]) : items;
    out = out.slice(0, e[0].debut) + voulu.join("") + out.slice(e[e.length - 1].fin);
  }
  return out;
}

/**
 * Le contenu difficile : chaque titre devient long (avec un mot de 24 lettres), chaque bouton prend six mots, chaque
 * manque devient une marque longue. Les faits d'une pièce « jamais sans sa vraie donnée » reçoivent une réponse longue
 * (avec une marque, le Studio retirerait la pièce entière : il n'y aurait rien à regarder).
 */
export function durcir(html: string): string {
  let out = html;
  // Les faits marqués : une réponse longue du client.
  const faits = (function trouve(n: Noeud, acc: Noeud[]): Noeud[] { if (/\sdata-tn-fait(?=[\s>])/.test(n.ouvre)) acc.push(n); else for (const x of n.enfants) trouve(x, acc); return acc; })(arbre(out), []);
  for (const f of faits.sort((a, b) => b.debut - a.debut)) out = out.slice(0, f.debut) + out.slice(f.debut, f.fin).replace(MARQUE_RX, FAIT_LONG) + out.slice(f.fin);
  out = out.replace(/(<h[12]\b[^>]*>)[\s\S]*?(<\/h[12]>)/g, `$1${TITRE_LONG}$2`).replace(/(<h3\b[^>]*>)[\s\S]*?(<\/h3>)/g, `$1${TITRE_CARTE_LONG}$2`);
  out = out.replace(/(<(a|button)\b[^>]*\sclass="[^"]*\btn-bt\b[^"]*"[^>]*>)([^<]{2,60})(<\/\2>)/g, `$1${BOUTON_LONG}$4`);
  // Le dernier choix d'une série de pastilles (boutons radio) : un manque long à la place de son libellé.
  const choix = [...out.matchAll(/(<input type="radio"[^>]*><span>)([^<]{1,40})(<\/span>)/g)].pop();
  if (choix) out = out.slice(0, choix.index!) + choix[1] + MARQUE_LONGUE + choix[3] + out.slice(choix.index! + choix[0].length);
  return out.replace(MARQUE_RX, MARQUE_LONGUE);
}

/** Les photos créées pour le client d'essai : une photo d'exemple devient « sa » photo (servie par le banc, même image). */
export const SCENE = "/api/files/scene-";
export const enScenes = (html: string) => html.replace(/(?:\/sections\/|\.\/)?photos\/([\w.-]+\.(?:webp|png|jpe?g))/g, (_m, f: string) => `${SCENE}${f}`);

// ---------------------------------------------------------------- les trois clients

export type ProduitEssai = { titre: string; prix: number; compare?: number; genre?: string; famille: string; photos: { couleur: string; forme: "rond" | "haut" | "large"; w: number; h: number }[]; options?: { name: string; values: string[] }[]; stock?: number };
export type ClientEssai = {
  produits: ProduitEssai[];
  prestations: { name: string; description: string; price?: string; duration?: string }[];
  phone: string; address: string; hours: string; area: string; shipping: string; returns: string;
  biens: TD.TenueBien[]; carte: TD.TenueRubrique[]; equipe: TD.TenueMembre[]; reseaux: string; articles: TD.TenueArticle[];
  vitrine?: Partial<TD.TenueVitrine>;
};
const P = (couleur: string, forme: "rond" | "haut" | "large" = "rond") => ({ couleur, forme, w: forme === "large" ? 1200 : 900, h: forme === "haut" ? 1200 : 900 });
const bien = (i: number, o: Partial<TD.TenueBien> = {}): TD.TenueBien => ({
  ref: `E-000${i}`, title: "Maison de ville et son jardin", type: "maison", transaction: i % 2 ? "vente" : "location", status: "published", city: "Lyon", sector: "Croix-Rousse",
  price: i % 2 ? 420000 : null, rent: i % 2 ? null : 1450, charges: i % 2 ? null : 80, deposit: i % 2 ? null : 1450, fees: "Honoraires à la charge du vendeur", surface: 142, land: 320, rooms: 6, bedrooms: 4, floor: "De plain-pied", furnished: false,
  exteriors: ["jardin", "terrasse"], pool: false, features: ["Garage", "Cheminée", "Cuisine équipée", "Fibre"], availability: "Dès la signature", dpe: "C", ges: "B", propertyTax: "1 480 € par an",
  summary: "Une maison de ville au calme.", description: "Une maison de ville au calme, tournée vers son jardin.\nQuatre chambres, un séjour traversant, une terrasse plein sud.", photos: [`${SCENE}im-maison.jpg`, `${SCENE}im-salon.jpg`, `${SCENE}im-cuisine.jpg`, `${SCENE}im-chambre.jpg`], featured: i === 1,
  neighborhood: { text: "Un quartier vivant, avec son marché le dimanche.", photos: [`${SCENE}im-quartier.jpg`], places: [{ label: "École", detail: "à 5 minutes à pied" }, { label: "Métro", detail: "à 8 minutes à pied" }] }, ...o,
});
const article = (i: number, titre: string): TD.TenueArticle => ({ title: titre, excerpt: "Quelques lignes qui donnent envie de lire la suite, sans tout dire.", tag: i % 2 ? "Conseils" : "Coulisses", image: `${SCENE}${["bureau.jpg", "fenetre.jpg", "bol.jpg"][i % 3]}`, bodyHtml: "<p>Le premier paragraphe de l'article, écrit simplement.</p><h2>Un intertitre</h2><p>Un second paragraphe, un peu plus long, qui développe l'idée avec un exemple concret.</p>" });

export const CLIENTS: Record<Client, ClientEssai> = {
  vrai: {
    produits: [
      { titre: "Le sac du quotidien", prix: 8900, compare: 10900, genre: "Sac en toile", famille: "Les sacs", photos: [P("#B9A27F"), P("#8F7A5C", "haut"), P("#D5C6A8", "large")], options: [{ name: "Couleur", values: ["Sable", "Nuit", "Olive"] }, { name: "Taille", values: ["Petit", "Moyen", "Grand"] }], stock: 4 },
      { titre: "La trousse assortie", prix: 2900, genre: "Trousse", famille: "Les sacs", photos: [P("#7C8B76", "haut")] },
      { titre: "La sangle réglable", prix: 1900, genre: "Sangle", famille: "Les accessoires", photos: [] },
    ],
    prestations: [
      { name: "Coupe et coiffage", description: "Un shampoing, la coupe, le coiffage.", price: "38 €", duration: "45 min" },
      { name: "Couleur complète", description: "La couleur, le soin, le coiffage.", price: "72 €", duration: "1 h 30" },
      { name: "Soin profond", description: "Un soin posé sous chaleur douce.", price: "25 €", duration: "30 min" },
      { name: "Chignon de fête", description: "Un essai, puis le chignon le jour venu.", price: "90 €", duration: "1 h" },
    ],
    phone: "04 72 00 00 00", address: "12 rue des Lilas, 69003 Lyon", hours: "Du mardi au vendredi 9 h – 19 h ; samedi 9 h – 17 h", area: "Lyon, Villeurbanne, Bron et Caluire",
    shipping: "Offerte dès 60 € d'achat, sinon 4,90 €. Chez toi en 2 à 4 jours ouvrés.", returns: "30 jours pour changer d'avis, produit non utilisé.",
    biens: [bien(1), bien(2, { title: "Appartement traversant", type: "appartement", city: "Villeurbanne", sector: "Gratte-Ciel", surface: 68, land: null, rooms: 3, bedrooms: 2 }), bien(3, { title: "Maison avec atelier", city: "Bron", sector: "Centre" })],
    carte: [
      { title: "Entrées", items: [{ name: "Velouté de saison", description: "Légumes du marché, crème, croûtons.", price: "9 €", allergens: "lait, gluten", vegetarian: true }, { name: "Terrine maison", description: "Servie avec des cornichons.", price: "11 €", allergens: "", vegetarian: false }] },
      { title: "Plats", items: [{ name: "Poisson du jour", description: "Selon l'arrivage, légumes rôtis.", price: "22 €", allergens: "poisson", vegetarian: false }, { name: "Risotto aux champignons", description: "Parmesan, herbes fraîches.", price: "18 €", allergens: "lait", vegetarian: true }, { name: "Pièce de bœuf", description: "Pommes grenaille, jus corsé.", price: "26 €", allergens: "", vegetarian: false }] },
      { title: "Desserts", items: [{ name: "Tarte du moment", description: "Aux fruits de saison.", price: "8 €", allergens: "gluten, œufs", vegetarian: true }, { name: "Mousse au chocolat", description: "Chocolat noir, fleur de sel.", price: "8 €", allergens: "œufs, lait", vegetarian: true }] },
    ],
    equipe: [{ name: "Camille", role: "Coiffeuse" }, { name: "Sacha", role: "Coloriste" }],
    reseaux: "Instagram : @maison.essai ; https://www.facebook.com/maison.essai ; https://www.youtube.com/@maisonessai",
    articles: [article(0, "Bien choisir sa taille"), article(1, "Dans l'atelier, un mardi"), article(2, "Trois façons de le porter")],
  },
  difficile: {
    produits: [
      { titre: `Le grand sac de voyage ${MOT_LONG} en toile épaisse cirée`, prix: PRIX_LONG, compare: 1390000, genre: "Sac de voyage en toile cirée", famille: "Les grands sacs de voyage", photos: [], options: [{ name: "Couleur", values: ["Sable du désert", "Bleu nuit profond", "Vert olive foncé"] }, { name: "Taille", values: ["Petit modèle", "Modèle moyen", "Très grand modèle"] }, { name: "Matière de la doublure", values: ["Coton épais", "Lin lavé", "Toile enduite renforcée"] }], stock: 2 },
      { titre: "La trousse de toilette assortie à suspendre partout", prix: 129900, famille: "Les grands sacs de voyage", photos: [P("#7C8B76", "haut")] },
      { titre: "La sangle réglable de rechange", prix: 1900, famille: "Les accessoires indispensables du voyageur", photos: [P("#B9A27F", "large")] },
      { titre: "Le porte-étiquette", prix: 990, famille: "Les accessoires indispensables du voyageur", photos: [P("#8F7A5C")] },
      { titre: "La housse de protection contre la pluie", prix: 3450, famille: "Les accessoires indispensables du voyageur", photos: [P("#D5C6A8", "haut")] },
      { titre: "Le cadenas", prix: 1250, famille: "Les petits plus", photos: [P("#5E6B58")] },
      { titre: "Le kit d'entretien complet pour la toile et le cuir", prix: 2790, famille: "Les petits plus", photos: [] },
    ],
    prestations: [
      { name: "Coupe, soin profond et coiffage pour cheveux très longs", description: "Un shampoing, un soin posé sous chaleur douce, la coupe, puis le coiffage, avec des conseils pour l'entretien à la maison.", price: "12 450,00 €", duration: "2 h 45 min environ" },
      { name: "Couleur complète avec patine", description: "La couleur, la patine, le soin.", price: "172 €", duration: "2 h 30" },
      { name: "Balayage", description: "", price: "", duration: "" },
      { name: "Chignon de fête avec essai préalable au salon", description: "Un essai, puis le chignon le jour venu.", price: "à partir de 90 €", duration: "1 h" },
      { name: "Soin", description: "Un soin.", price: "25 €", duration: "30 min" },
      { name: "Forfait mariée et ses demoiselles d'honneur", description: "Sur devis.", price: "sur devis", duration: "" },
      { name: "Barbe", description: "Taille et contours.", price: "18 €", duration: "20 min" },
    ],
    phone: "+33 (0)4 72 00 00 00", address: "Bâtiment B, 3e étage, 128 bis avenue du Général-de-Gaulle, 69300 Caluire-et-Cuire", hours: "Lundi 14 h – 19 h ; mardi 9 h – 19 h ; mercredi 9 h – 12 h 30 et 14 h – 19 h ; jeudi 9 h – 21 h ; vendredi 9 h – 19 h ; samedi 9 h – 17 h ; dimanche sur rendez-vous seulement", area: "Lyon, Villeurbanne, Bron, Caluire-et-Cuire, Sainte-Foy-lès-Lyon, Saint-Didier-au-Mont-d'Or et Vaulx-en-Velin",
    shipping: "Offerte dès 60 € d'achat en point relais, sinon 4,90 € en point relais et 7,90 € à domicile. Chez toi en 2 à 4 jours ouvrés, selon le transporteur que tu choisis au moment de payer.", returns: "30 jours pour changer d'avis, produit non utilisé, dans son emballage d'origine, étiquette de retour envoyée par e-mail.",
    biens: Array.from({ length: 7 }, (_x, i) => bien(i + 1, i === 0 ? { title: `Grande maison de famille ${MOT_LONG} avec dépendances et verger`, city: "Saint-Didier-au-Mont-d'Or", sector: "Le haut du village, côté collines", price: 1245000, surface: 1245, land: 12450, rooms: 14, bedrooms: 9, features: ["Vue dégagée sur toute la vallée", "Garage pour trois voitures", "Cheminée", "Cuisine équipée", "Fibre", "Cave voûtée", "Dépendance aménageable"], fees: "Honoraires à la charge de l'acquéreur : 4,5 % du prix de vente, soit 56 025 €" } : {})),
    carte: [
      { title: "Pour commencer ou pour partager à plusieurs", items: Array.from({ length: 7 }, (_x, i) => ({ name: i === 0 ? `Velouté de légumes ${MOT_LONG} du marché et ses croûtons dorés` : `Entrée numéro ${i + 1}`, description: i % 2 ? "Courte." : "Une description longue, avec la provenance des produits, la cuisson, l'accompagnement et le conseil du chef.", price: i === 0 ? "12 450,00 €" : "9 €", allergens: i % 2 ? "" : "lait, gluten, œufs, fruits à coque, céleri, moutarde", vegetarian: i % 2 === 0 })) },
      { title: "Plats", items: [{ name: "Poisson du jour", description: "Selon l'arrivage.", price: null, allergens: "poisson", vegetarian: false }] },
    ],
    equipe: [{ name: "Marie-Charlotte de La Rochefoucauld", role: "Coiffeuse, coloriste et formatrice" }, { name: "Sacha", role: null }, { name: "Jean-Baptiste", role: "Barbier" }, { name: "Léa", role: "Apprentie" }],
    reseaux: "Instagram : @maison.essai.officiel.lyon ; https://www.facebook.com/maison.essai.officiel ; https://www.youtube.com/@maisonessai ; https://www.tiktok.com/@maison.essai ; https://www.linkedin.com/company/maison-essai ; https://www.pinterest.fr/maisonessai",
    articles: Array.from({ length: 7 }, (_x, i) => article(i, i === 0 ? `Comment bien choisir sa taille quand on hésite entre deux modèles ${MOT_LONG}` : `Article numéro ${i + 1}`)),
    vitrine: {
      offre: { label: "L'offre de rentrée, sur toute la boutique et sans minimum d'achat", fin: "2099-12-31" },
      macaron: { chiffre: "12 450", quoi: "clients servis depuis l'ouverture de la boutique" },
      messages: ["Un premier message vrai du bandeau, écrit un peu long par le client", "Un deuxième message", "Un troisième message, encore plus long que le premier, pour voir ce que le bandeau en fait"],
      avis: { source: "Avis recueillis par la boutique", verifies: true, liste: Array.from({ length: 7 }, (_x, i) => ({ text: i % 3 === 0 ? "Un avis très long, écrit d'une traite par une cliente contente, qui raconte la commande, la livraison, l'emballage, la première utilisation, et ce qu'elle en pense trois semaines plus tard, sans oublier de remercier toute l'équipe." : "Reçu vite, bien emballé.", name: i === 0 ? "Marie-Charlotte de La Rochefoucauld" : `Client ${i + 1}`, date: `2026-0${(i % 9) + 1}-1${i}`, rating: 5 - (i % 3), verified: i % 2 === 0, product: null, reply: i === 0 ? "Merci beaucoup pour ce message, toute l'équipe l'a lu avec plaisir." : null })) },
    },
  },
  seul: {
    produits: [{ titre: "Le sac du quotidien", prix: 8900, genre: "Sac en toile", famille: "Les sacs", photos: [P("#B9A27F")] }],
    prestations: [{ name: "Coupe et coiffage", description: "Un shampoing, la coupe, le coiffage.", price: "38 €", duration: "45 min" }],
    phone: "04 72 00 00 00", address: "12 rue des Lilas, 69003 Lyon", hours: "Du mardi au samedi 9 h – 18 h", area: "Lyon",
    shipping: "4,90 €, en 2 à 4 jours.", returns: "30 jours.",
    biens: [bien(1)], carte: [{ title: "Plats", items: [{ name: "Poisson du jour", description: "Selon l'arrivage.", price: "22 €", allergens: "poisson", vegetarian: false }] }],
    equipe: [{ name: "Camille", role: "Coiffeuse" }], reseaux: "Instagram : @maison.essai", articles: [article(0, "Bien choisir sa taille")],
  },
};

/** Une photo de produit inventée : un objet simple et neutre sur un fond uni (jamais un vrai produit, jamais une personne). */
export function photoProduitSvg(p: ProduitEssai["photos"][number]): string {
  const { w, h, couleur } = p, cx = w / 2, cy = h / 2, r = Math.min(w, h) * 0.26;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F4F0E8"/><stop offset="1" stop-color="#DDD6C8"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#f)"/><ellipse cx="${cx}" cy="${cy + r * 1.22}" rx="${r * 1.1}" ry="${r * 0.16}" fill="#000" opacity=".16"/><rect x="${cx - r}" y="${cy - r * 0.9}" width="${r * 2}" height="${r * 2.05}" rx="${r * 0.22}" fill="${couleur}"/><path d="M${cx - r * 0.5} ${cy - r * 0.9}c0-${r * 0.9} ${r} -${r * 0.9} ${r} 0" fill="none" stroke="${couleur}" stroke-width="${r * 0.12}"/><rect x="${cx - r}" y="${cy - r * 0.2}" width="${r * 2}" height="${r * 0.12}" fill="#000" opacity=".12"/></svg>`;
}
