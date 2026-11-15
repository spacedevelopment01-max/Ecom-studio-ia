/**
 * Exemple du sac de voyage (thème sur mesure à tenue, 13 novembre 2026) : une marque brute, faite pour servir. Les mêmes
 * sections que le fauteuil, d'autres constructions et une autre tenue : le site n'a rien de commun à l'œil. Photos de la
 * démonstration TRAVERSE (public/theme-assets/traverse), recadrées pour leur emplacement. Aucun chiffre ni promesse
 * inventés : ce que le dossier ne donne pas reste « [À compléter] ». Aucun appel réel.
 */
import path from "node:path";
import type { Instance } from "./tenue-fauteuil-fixtures";

export const SAC_DIR = path.join(process.cwd(), "public", "theme-assets", "traverse");
export const SAC_BRAND = {
  name: "Traverse", nameStatus: "validated", alternatives: [], tagline: "", positioning: "Un sac de voyage modulable, pour partir sans rien porter à la main.", audience: "", personality: ["franche", "utile"],
  tone: { voice: "Tutoiement, phrases très courtes.", do: [], dont: [] },
  palette: { primary: "#4B5230", secondary: "#D9D1BC", accent: "#4B5230", light: "#E8E1CF", dark: "#14140F" },
  fonts: { heading: "archivo_black", body: "archivo" }, logo: { concept: "", status: "proposed" },
} as const;
export const SAC_TENUE = { titres: "gras", bouton: "etiquette", cadre: "droit", fond: "toile", petits: "machine", signe: "l'étiquette cousue et la sangle" } as const;
export const SAC_PRODUCT = "Sac de voyage Traverse kaki";
/** Photos du produit (catalogue), dans l'ordre de la galerie. */
export const SAC_PRODUCT_PHOTOS = ["produit-01.webp", "produit-02.webp", "produit-03.webp"];
/** Photos de scène et de détail, nommées par leur emplacement ; jamais deux fois la même. */
export const SAC_SCENES: Record<string, { file: string; crop?: [number, number, number, number] }> = {
  ouverture: { file: "ambiance-01.webp", crop: [0.1556, 0, 0.8621, 1] },
  sangle: { file: "detail-boucle.webp", crop: [0.0227, 0.4045, 0.9091, 0.6136] },
  "detail-poche": { file: "detail-poche.webp" }, "detail-poignee": { file: "detail-poignee.webp" }, "detail-cote": { file: "produit-04.webp" },
  "emotion-accueil": { file: "hero-gare.webp" }, emotion: { file: "paysage.webp" },
  "place-train": { file: "train.webp" }, "place-lac": { file: "lac.webp" },
  histoire: { file: "ambiance-07.webp" }, introuvable: { file: "ambiance-10.webp" },
};

const q = (a: [string, string, string, string, string, string]): [string, string][] => [["Avant de choisir.", a[0]], ["Combien de tasses dans un sachet ?", a[1]], ["[À compléter : nombre de tasses]", a[2]], ["Et s'il ne me plaît pas ?", a[3]], ["Comment le conserver ?", a[4]], ["À l'abri de la lumière, dans son sachet refermé.", a[5]]];

/** Tout le site de l'exemple : chaque section, sa construction, ses textes [exemple de la bibliothèque, texte de la marque] et ses photos [photo d'exemple, scène]. */
export const SAC_SITE: { key: string; label: string; sections: Instance[] }[] = [
  { key: "home", label: "Accueil", sections: [
    { id: "tn-ouverture", construction: "titre-geant", texts: [["Thés et infusions bio", "Sac de voyage modulable"], ["Le thé vert au jasmin", "Le sac Traverse"], ["Pose ton écran.<br>Respire.", "Tout tient.<br>Tu pars."], ["Quelques minutes, une tasse chaude, plus rien d'autre. Le reste de la journée attendra.", "Une poche pour chaque chose, des sangles qui serrent le tout, plus rien à porter à la main. Vendredi soir, tu n'as qu'à fermer la porte."], ["Choisir mon mélange", "Partir léger"]], photos: [["photos/hero.jpg", "ouverture"]] },
    { id: "tn-bande", photos: [["photos/infusion.jpg", "sangle"]] },
    { id: "tn-de-pres", construction: "avec-titre", texts: [["De près.", "Regarde de près."], ["Des feuilles entières, roulées à la main.", "L'étiquette cousue, la poche devant."], ["De vraies fleurs de jasmin.", "Une poignée, deux curseurs."], ["Une cuillère par tasse.", "Des sangles sur les côtés."]], photos: [["photos/seches.jpg", "detail-poche"], ["photos/jasmin.jpg", "detail-poignee"], ["photos/infuseur.jpg", "detail-cote"]] },
    { id: "tn-produits", texts: [["Les mélanges.", "Le sac."]] },
    { id: "tn-atouts", texts: [["Tout est bio", "Une poche devant"], ["Du thé, des fleurs, rien d'autre.", "Ce que tu sors dix fois reste sous la main."], ["Assemblé à la main", "Des sangles sur les côtés"], ["Par petites quantités, à la commande.", "Tu serres, plus rien ne bouge."], ["En vrac", "Deux bretelles"], ["Dans un sachet qui se referme.", "Tes mains restent libres."]] },
    { id: "tn-emotion", texts: [["La journée s'arrête<br>à la première gorgée.", "Le quai, le lac.<br>Rien dans les mains."]], photos: [["photos/fenetre.jpg", "emotion-accueil"]] },
    { id: "tn-questions", texts: q(["Tes questions.", "Passe-t-il en cabine ?", "[À compléter : dimensions]", "Puis-je le renvoyer ?", "Comment le nettoyer ?", "[À compléter : entretien]"]) },
    { id: "tn-final", texts: [["Cinq minutes.<br>Rien que pour toi.", "Ferme la porte.<br>Le reste suit."], ["Choisir mon mélange", "Partir léger"]] },
  ] },
  { key: "product", label: "Fiche produit", sections: [
    { id: "tn-achat", texts: [["<small>Le thé</small>", "<small>Le sac</small>"], [">Thé vert jasmin</h1>", ">Traverse kaki</h1>"], ["Des feuilles fines et de vraies fleurs de jasmin, pour une tasse douce qui s'ouvre dès que l'eau chaude la touche.", "Une grande poche, une poche devant, des sangles qui serrent le tout. Tu le fermes, tu pars."], ["Sachet de 100 g", "Toile kaki"], [">Ajouter au panier</a><ul", ">Le prendre</a><ul"]], photos: [["photos/sachet.jpg", "produit"]] },
    { id: "tn-description", texts: [["La pause de l'après-midi, quand on veut ralentir sans s'endormir.", "Porter tout ton week-end sur le dos, sans rien à la main."], ["Ce qu'il y a dedans", "Ce qu'on voit"], ["Du thé vert, des fleurs de jasmin. Rien d'autre.", "Une toile kaki, une étiquette cousue, une poche devant, des sangles noires à boucle sur les côtés, deux bretelles."], ["Comment le préparer", "Comment le remplir"], ["[À compléter : quantité, température, durée]", "[À compléter : volume et rangement des poches]"]] },
    { id: "tn-places", texts: [["Quand le boire.", "Où il te suit."], ["Trois moments où il fait la différence.", "Nos photos le montrent à chacune de ces places."], ["Au réveil", "Dans le train"], ["Après le déjeuner", "Au bord du lac"]], photos: [["photos/nl-tasse.jpg", "place-train"], ["photos/film-affiche.jpg", "place-lac"]] },
    { id: "tn-emotion", texts: [["La journée s'arrête<br>à la première gorgée.", "Tout est dedans.<br>Tu regardes dehors."]], photos: [["photos/fenetre.jpg", "emotion"]] },
    { id: "tn-mesures", construction: "sac", texts: [["<td>Poids</td>", "<td>Poids à vide</td>"]] },
    { id: "tn-questions", texts: q(["Avant de le prendre.", "Combien de jours tient-il ?", "[À compléter : volume]", "Et s'il ne me convient pas ?", "Résiste-t-il à la pluie ?", "[À compléter : matière et traitement]"]) },
    { id: "tn-final", texts: [["Cinq minutes.<br>Rien que pour toi.", "Le train part.<br>Toi aussi."], ["Choisir mon mélange", "Le prendre"]] },
  ] },
  { key: "cart", label: "Panier", sections: [{ id: "tn-panier", texts: [["Ton panier.", "Ton panier."]], photos: [["photos/sachet.jpg", "produit"]] }] },
  { key: "compte", label: "Mon compte", sections: [{ id: "tn-compte", texts: [["Ton compte.", "Ton compte."]] }] },
  { key: "about", label: "Notre histoire", sections: [{ id: "tn-histoire", texts: [["D'où ça vient.", "D'où vient Traverse."], // Le nom de la marque est déjà posé par le Studio quand le rédacteur reçoit la section.
    ["est né d'une envie simple : une vraie pause, sans écran, avec quelque chose de bon dans la tasse.", "est né d'un constat simple : on part mieux quand tout tient dans un seul sac."]], photos: [["photos/bureau.jpg", "histoire"]] }] },
  { key: "contact", label: "Contact", sections: [{ id: "tn-contact", texts: [["Une question sur un mélange, une commande en cours : nous lisons tout.", "Une question sur le sac, une commande en cours : nous lisons tout."]] }] },
  { key: "aide", label: "Aide", sections: [{ id: "tn-questions", texts: q(["Besoin d'aide ?", "Où est ma commande ?", "[À compléter : suivi de commande]", "Comment vous joindre ?", "Quels moyens de paiement ?", "[À compléter : moyens de paiement]"]) }] },
  { key: "legal", label: "Informations légales", sections: [{ id: "tn-legal", texts: [["<h1>Informations légales</h1>", "<h1>Informations légales</h1>"]] }] },
  { key: "404", label: "Page introuvable", sections: [{ id: "tn-404", texts: [["Cette page<br>a trop infusé.", "Cette page<br>a raté son train."], ["Elle n'existe plus, ou son adresse a changé. Le thé, lui, t'attend toujours.", "Elle n'existe plus, ou son adresse a changé. Le sac, lui, t'attend toujours."], ["Retour à l'accueil", "Revenir à l'accueil"], [">Boutique<", ">Voir le sac<"], [">Contact<", ">Nous écrire<"]], photos: [["photos/bol.jpg", "introuvable"]] }] },
];
export const SAC_HEADER: Instance = { id: "tn-entete", construction: "sangle", texts: [[">Accueil<", ">Accueil<"]] };
export const SAC_FOOTER: Instance = { id: "tn-pied", texts: [[">Livraison<", ">Livraison<"]] };
