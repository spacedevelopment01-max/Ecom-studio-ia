/**
 * Exemple du fauteuil (thème sur mesure à tenue, 13 novembre 2026) : la marque, le produit, les photos et les textes
 * des écrans faits à la main et envoyés au propriétaire (accueil, fiche produit, page introuvable, contact). Les photos
 * sont celles de la démonstration ALCÔVE (public/theme-assets/alcove), recadrées pour leur emplacement comme le serait
 * une photo créée pour lui. Sert aux tests et à la comparaison en image ; aucun appel réel.
 */
import fs from "node:fs";
import path from "node:path";

export const FAUTEUIL_BRAND = {
  name: "Alcôve", nameStatus: "validated", alternatives: [], tagline: "Une alcôve à soi.", positioning: "Un fauteuil enveloppant pour créer son coin lecture, même dans un logement partagé.", audience: "", personality: ["calme", "soignée"],
  tone: { voice: "Vouvoiement, phrases courtes.", do: [], dont: [] },
  palette: { primary: "#B4532C", secondary: "#E7D6BB", accent: "#5A3A24", light: "#F1E5D1", dark: "#38231A" },
  fonts: { heading: "instrument_serif", body: "karla" }, logo: { concept: "", status: "proposed" },
} as const;
export const FAUTEUIL_TENUE = { titres: "fins", bouton: "pilule", cadre: "niche", fond: "uni", petits: "normal", signe: "la niche du mur" } as const;

const DIR = path.join(process.cwd(), "public", "theme-assets", "alcove");
/** Photo recadrée (fractions de l'image : gauche, haut, droite, bas), ou entière. */
export async function photo(file: string, crop?: [number, number, number, number], dir = DIR): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  const src = fs.readFileSync(path.join(dir, file));
  if (!crop) return sharp(src).jpeg({ quality: 92 }).toBuffer();
  const m = await sharp(src).metadata(), W = m.width!, H = m.height!;
  const left = Math.round(crop[0] * W), top = Math.round(crop[1] * H);
  return sharp(src).extract({ left, top, width: Math.min(W - left, Math.round((crop[2] - crop[0]) * W)), height: Math.min(H - top, Math.round((crop[3] - crop[1]) * H)) }).jpeg({ quality: 92 }).toBuffer();
}

/** Photos du produit (catalogue), dans l'ordre de la galerie. */
export const PRODUCT_PHOTOS = ["produit-01.webp", "produit-02.webp", "produit-03.webp", "produit-04.webp", "produit-05.webp"];
/** Photos de scène et de détail, nommées par leur emplacement. */
export const SCENES: Record<string, { file: string; crop?: [number, number, number, number] }> = {
  ouverture: { file: "ambiance-07.webp" },
  "ouverture-b": { file: "ambiance-03.webp" },
  "niche-1": { file: "produit-05.webp" }, "niche-2": { file: "ambiance-09.webp" }, "niche-3": { file: "ambiance-06.webp" },
  "detail-tissu": { file: "produit-05.webp" }, "detail-dossier": { file: "produit-04.webp" }, "detail-pieds": { file: "produit-02.webp", crop: [0.113, 0.391, 0.548, 0.984] },
  emotion: { file: "ambiance-05.webp", crop: [0.1055, 0, 0.9353, 1] },
  "place-fenetre": { file: "ambiance-03.webp", crop: [0, 0.1, 1, 0.9333] }, "place-salon": { file: "ambiance-01.webp", crop: [0.363, 0, 0.813, 1] },
  introuvable: { file: "ambiance-09.webp", crop: [0.122, 0, 0.948, 1] },
  // Pages et sections que les écrans envoyés ne montraient pas : d'autres photos, jamais deux fois la même scène.
  "emotion-accueil": { file: "ambiance-02.webp" }, "place-loft": { file: "ambiance-08.webp" }, "place-jardin": { file: "ambiance-10.webp" }, histoire: { file: "ambiance-04.webp" },
};

export type Instance = { id: string; construction?: string; texts?: [string, string][]; photos?: [string, string][] };
// L'étiquette ne se voit que dans la construction « titre géant » : le rédacteur l'écrit quand même, pour la marque.
const OUVERTURE: [string, string][] = [["Thés et infusions bio", "Fauteuil en tissu terracotta"], ["Le thé vert au jasmin", "Le fauteuil Alcôve"], ["Pose ton écran.<br>Respire.", "Le soir tombe.<br>Vous aussi."], ["Quelques minutes, une tasse chaude, plus rien d'autre. Le reste de la journée attendra.", "Une assise profonde, des bras qui entourent, un tissu qu'on a envie de toucher. La journée s'arrête ici."], ["Choisir mon mélange", "M'y installer"]];
const DE_PRES: [string, string][] = [["Des feuilles entières, roulées à la main.", "Un tissu à la texture visible."], ["De vraies fleurs de jasmin.", "Un seul arrondi, du dossier aux accoudoirs."], ["Une cuillère par tasse.", "Quatre pieds courts en bois brun."]];
const q = (a: [string, string, string, string, string, string]): [string, string][] => [["Avant de choisir.", a[0]], ["Combien de tasses dans un sachet ?", a[1]], ["[À compléter : nombre de tasses]", a[2]], ["Et s'il ne me plaît pas ?", a[3]], ["[À compléter : retours]", "[À compléter : retours]"], ["Comment le conserver ?", a[4]], ["À l'abri de la lumière, dans son sachet refermé.", a[5]]];

/** Tout le site de l'exemple : chaque section, sa construction, ses textes [exemple de la bibliothèque, texte de la marque] et ses photos [photo d'exemple, scène]. */
export const SITE: { key: string; label: string; sections: Instance[] }[] = [
  { key: "home", label: "Accueil", sections: [
    { id: "tn-ouverture", construction: "dans-la-photo", texts: OUVERTURE, photos: [["photos/hero.jpg", "ouverture"]] },
    { id: "tn-de-pres", construction: "sans-titre", texts: [["De près.", "Le fauteuil, de près."], ["Des feuilles entières, roulées à la main.", "Le tissu."], ["De vraies fleurs de jasmin.", "Vu du dessus."], ["Une cuillère par tasse.", "Le soir."]], photos: [["photos/seches.jpg", "niche-1"], ["photos/jasmin.jpg", "niche-2"], ["photos/infuseur.jpg", "niche-3"]] },
    { id: "tn-produits", texts: [["Les mélanges.", "Le fauteuil."]] },
    { id: "tn-atouts", texts: [["Tout est bio", "Un seul arrondi"], ["Du thé, des fleurs, rien d'autre.", "Du dossier aux accoudoirs, d'un seul tenant."], ["Assemblé à la main", "Un coussin épais"], ["Par petites quantités, à la commande.", "Une assise profonde, faite pour rester."], ["En vrac", "Quatre pieds en bois brun"], ["Dans un sachet qui se referme.", "Courts et discrets."]] },
    { id: "tn-emotion", texts: [["La journée s'arrête<br>à la première gorgée.", "Votre coin,<br>même à plusieurs."]], photos: [["photos/fenetre.jpg", "emotion-accueil"]] },
    { id: "tn-places", texts: [["Quand le boire.", "Il se pose partout."], ["Trois moments où il fait la différence.", "Deux endroits où nous l'avons photographié."], ["Au réveil", "Dans un loft"], ["Après le déjeuner", "Au jardin d'hiver"]], photos: [["photos/nl-tasse.jpg", "place-loft"], ["photos/film-affiche.jpg", "place-jardin"]] },
    { id: "tn-questions", texts: q(["Vos questions.", "Est-il fait pour un petit espace ?", "[À compléter : dimensions]", "Puis-je le retourner ?", "Comment est-il livré ?", "[À compléter : livraison]"]) },
    { id: "tn-final", texts: [["Cinq minutes.<br>Rien que pour toi.", "Une alcôve à soi."], ["Choisir mon mélange", "Voir le fauteuil"]] },
  ] },
  { key: "product", label: "Fiche produit", sections: [
    { id: "tn-achat", texts: [["<small>Le thé</small>", "<small>Le fauteuil</small>"], [">Thé vert jasmin</h1>", ">Alcôve terracotta</h1>"], ["Des feuilles fines et de vraies fleurs de jasmin, pour une tasse douce qui s'ouvre dès que l'eau chaude la touche.", "Un dossier et des accoudoirs d'un seul arrondi, un coussin épais. Votre coin à vous, même quand le canapé est pris."], ["Sachet de 100 g", "Tissu terracotta"], [">Ajouter au panier</a><ul", ">Lui faire une place</a><ul"]], photos: [["photos/sachet.jpg", "produit"]] },
    { id: "tn-description", texts: [["La pause de l'après-midi, quand on veut ralentir sans s'endormir.", "Devenir votre coin lecture, dans un logement où le canapé est à tout le monde."], ["Ce qu'il y a dedans", "Ce qu'on voit"], ["Du thé vert, des fleurs de jasmin. Rien d'autre.", "Un dossier et des accoudoirs d'un seul arrondi autour d'un coussin d'assise épais, un tissu terracotta à la texture visible, quatre pieds courts en bois brun."], ["Comment le préparer", "Où le mettre"], ["[À compléter : quantité, température, durée]", "Dans votre chambre, au pied du lit, ou dans un coin de salon près d'une fenêtre."]] },
    { id: "tn-de-pres", construction: "avec-titre", texts: DE_PRES, photos: [["photos/seches.jpg", "detail-tissu"], ["photos/jasmin.jpg", "detail-dossier"], ["photos/infuseur.jpg", "detail-pieds"]] },
    { id: "tn-emotion", texts: [["La journée s'arrête<br>à la première gorgée.", "Le chapitre de trop<br>se lit ici."]], photos: [["photos/fenetre.jpg", "emotion"]] },
    { id: "tn-places", texts: [["Quand le boire.", "Où le mettre."], ["Trois moments où il fait la différence.", "Nos photos le montrent à chacune de ces places."], ["Au réveil", "Près d'une fenêtre"], ["Après le déjeuner", "Dans le salon"]], photos: [["photos/nl-tasse.jpg", "place-fenetre"], ["photos/film-affiche.jpg", "place-salon"]] },
    { id: "tn-mesures", construction: "fauteuil", texts: [["<td>Poids</td>", "<td>Hauteur d'assise</td>"]] },
    { id: "tn-questions", texts: q(["Avant de choisir.", "Arrive-t-il monté ?", "[À compléter : montage]", "Et s'il ne va pas chez moi ?", "Comment l'entretenir ?", "[À compléter : entretien]"]) },
    { id: "tn-final", texts: [["Cinq minutes.<br>Rien que pour toi.", "Le canapé est pris ?<br>Tant mieux."], ["Choisir mon mélange", "Lui faire une place"]] },
  ] },
  { key: "cart", label: "Panier", sections: [{ id: "tn-panier", texts: [["Ton panier.", "Votre panier."]], photos: [["photos/sachet.jpg", "produit"]] }] },
  { key: "compte", label: "Mon compte", sections: [{ id: "tn-compte", texts: [["Ton compte.", "Votre compte."], ["Retrouve tes commandes et tes adresses.", "Retrouvez vos commandes et vos adresses."], ["Ton e-mail", "Votre e-mail"], ["Ton mot de passe", "Votre mot de passe"]] }] },
  { key: "about", label: "Notre histoire", sections: [{ id: "tn-histoire", texts: [["D'où ça vient.", "D'où vient Alcôve."], // Le nom de la marque est déjà posé par le Studio quand le rédacteur reçoit la section.
    ["est né d'une envie simple : une vraie pause, sans écran, avec quelque chose de bon dans la tasse.", "est né pour les lecteurs qui partagent leur logement : un fauteuil qui devient leur coin à eux."]], photos: [["photos/bureau.jpg", "histoire"]] }] },
  { key: "contact", label: "Contact", sections: [{ id: "tn-contact", texts: [["Écris-nous.", "Écrivez-nous."], ["Une question sur un mélange, une commande en cours : nous lisons tout.", "Une question sur le fauteuil, une commande en cours : nous lisons tout."], ["Ton nom", "Votre nom"], ["Ton e-mail", "Votre e-mail"], ["Ton message", "Votre message"], ["E-mail : [À compléter : e-mail]", "E-mail et téléphone : ceux du projet"]] }] },
  { key: "aide", label: "Aide", sections: [{ id: "tn-questions", texts: q(["Besoin d'aide ?", "Où est ma commande ?", "[À compléter : suivi de commande]", "Comment vous joindre ?", "Quels moyens de paiement ?", "[À compléter : moyens de paiement]"]) }] },
  { key: "legal", label: "Informations légales", sections: [{ id: "tn-legal", texts: [["<h1>Informations légales</h1>", "<h1>Informations légales</h1>"]] }] },
  { key: "404", label: "Page introuvable", sections: [{ id: "tn-404", texts: [["Cette page<br>a trop infusé.", "Cette page<br>s'est assoupie."], ["Elle n'existe plus, ou son adresse a changé. Le thé, lui, t'attend toujours.", "Elle n'existe plus, ou son adresse a changé. Le fauteuil, lui, vous attend toujours."], ["Retour à l'accueil", "Revenir à l'accueil"], [">Boutique<", ">Voir le fauteuil<"], [">Contact<", ">Nous écrire<"]], photos: [["photos/bol.jpg", "introuvable"]] }] },
];
// En-tête, pied de page et page légale : le rédacteur garde leurs mots (le Studio pose lui-même le nom de la marque).
export const HEADER: Instance = { id: "tn-entete", construction: "centre", texts: [[">Accueil<", ">Accueil<"]] };
export const FOOTER: Instance = { id: "tn-pied", texts: [[">Livraison<", ">Livraison<"]] };
