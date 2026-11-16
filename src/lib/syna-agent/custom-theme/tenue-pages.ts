/**
 * Thème unique du Studio (lot 4, référence partie 15) — module « pages » : ses pièces nouvelles (PAGES_SECTIONS) et les
 * façons de bâtir ajoutées à des pièces d'autres modules (PAGES_FACONS : identifiant de la pièce → ses constructions,
 * la première étant le rendu d'origine). Feuille : public/sections/tenue-pages.css. Règles : docs/sina-savoir/sections-a-tenue.md.
 *
 * Pièces nouvelles : le tiroir de panier, la recherche, les questions par rubriques, « bien reçu » (après une demande,
 * jamais après une commande : la confirmation de commande est une page de la plateforme) et la boutique fermée.
 * Leurs textes d'exemple sont neutres : aucun métier, aucun chiffre, aucune coordonnée.
 *
 * Les vraies données de ces pièces (lignes du panier, produits suggérés, seuil de livraison offerte, sommaire des
 * textes légaux) sont posées par tenue-data.ts ; leurs gestes dans l'aperçu (ouvrir et fermer le tiroir, changer une
 * quantité, chercher) par public/sections/tenue-pages.js. Dans Shopify aucun script ne part : to-shopify.ts donne à
 * chaque geste sa forme sans script (liens et formulaires de la boutique).
 */
import { VOLET, ph, sec, type Construction, type TenueSection } from "./tenue-base";

const lien = (texte: string, go?: string, classe = "tn-lien") => `<a class="${classe}" href="#" onclick="return false"${go ? ` data-go="${go}"` : ""}>${texte}</a>`;
const bouton = (texte: string, go?: string) => lien(texte, go, "tn-bt");
const champ = (nom: string, type = "text", auto = "off") => `<label class="tn-champ"><input type="${type}" placeholder=" " autocomplete="${auto}"><span>${nom}</span></label>`;
const LOUPE = `<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="6" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M13 13l5 5" stroke="currentColor" stroke-width="1.8"/></svg>`;
const CROIX = `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 4l12 12M16 4L4 16" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>`;
const COCHE = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/** Le choix de la quantité d'une ligne de panier (aperçu : boutons ; boutique : liens de la boutique). */
export const QUANTITE = `<div class="tn-qte"><button type="button" data-tn-moins aria-label="Retirer un exemplaire">−</button><span>1</span><button type="button" data-tn-plus aria-label="Ajouter un exemplaire">+</button></div>`;
/** Une ligne de panier : la photo du produit, son nom, sa quantité, « Retirer », son prix. */
export const LIGNE = (nom: string, photo: string) => `<div class="tn-ligne"><div class="tn-ph" ${ph(photo)}></div><div class="tn-quoi"><b>${nom}</b>${QUANTITE}<button type="button" class="tn-oter" data-tn-oter>Retirer</button></div><span class="tn-prix-l">[À compléter : prix]</span></div>`;

export const PAGES_SECTIONS: TenueSection[] = [
  sec({
    id: "tn-panier-cote", title: "Tiroir de panier", kind: "Panier · tout le site", role: "panier", group: "partout",
    does: "Le panier qui glisse depuis le bord droit de l'écran, sans quitter la page : il s'ouvre à l'ajout au panier ou au clic sur « Panier ». Les produits choisis (vraie photo, vrai prix, quantité, « Retirer »), le total, le bouton de commande qui ouvre le paiement de la plateforme, et le lien vers la page panier. Se pose sur tout le site, à la place de l'arrivée directe sur la page panier (qui reste). La version large ajoute la barre de livraison offerte (seulement si le client a donné son seuil) et d'autres produits de son catalogue : à prendre quand ses produits se complètent vraiment.",
    data: "les produits du catalogue (lignes et suggestions), le seuil de livraison offerte donné par le client",
    anim: "Le panneau glisse depuis la droite ; il se ferme par la croix, par un clic à côté ou par la touche Échap.",
    constructions: [
      { key: "etroit", label: "un panneau étroit et sobre : les produits, le total, le bouton de commande" },
      { key: "large", label: "un panneau large : la barre de livraison offerte en haut, les produits, puis d'autres produits du catalogue à ajouter et le total" },
    ],
    trait: { fond: "clair", densite: "dense", photos: 2, hauteur: 640 },
    html: `<section class="tn tn-panier-cote" id="tn-panier-cote" data-tn-panier-cote><a class="tn-voile" href="#" onclick="return false" data-tn-fermer aria-label="Fermer le panier" tabindex="-1"></a><div class="tn-panneau" role="dialog" aria-modal="true" aria-label="Panier"><div class="tn-haut"><h2>Ton panier</h2><a class="tn-x" href="#" onclick="return false" data-tn-fermer aria-label="Fermer le panier">${CROIX}</a></div><div class="tn-seuil" data-tn-seuil><p>[À compléter : seuil de livraison offerte]</p><i style="--part:60%"></i></div><div class="tn-lignes" data-tn-lignes>${LIGNE("Nom du premier produit", "sachet.jpg")}${LIGNE("Nom du second produit", "sachet-ouvert.jpg")}</div><div class="tn-vide"><p>Ton panier est vide.</p>${lien("Voir la boutique", "shop")}</div><div class="tn-plus" data-tn-suggestions><b>À ajouter</b><div class="tn-sugg"><a class="tn-s" href="#" onclick="return false" data-go="product"><div class="tn-ph" ${ph("sachet-bois.jpg")}></div><span>Nom d'un autre produit</span><em>[À compléter : prix]</em></a></div></div><div class="tn-bas"><div class="tn-total"><span>Total</span><span class="tn-prix-t">[À compléter : prix]</span></div>${bouton("Passer commande")}${lien("Voir le panier", "cart")}</div></div></section>`,
  }),
  sec({
    id: "tn-recherche", title: "Recherche à la tenue de la marque", kind: "Recherche · tout le site", role: "recherche",
    does: "La recherche du site : un grand champ, les rubriques les plus utiles en raccourcis, et les produits du catalogue qui se trient pendant la frappe. Valider le champ mène à la page des résultats. Se pose à l'emplacement « recherche » du site (une seule par site), jamais au milieu d'une page ; la page des résultats est la pièce « Résultats d'une recherche ».",
    data: "les produits et les familles du catalogue",
    anim: "Dans l'aperçu, les produits se trient pendant la frappe.",
    constructions: [
      { key: "barre", label: "une barre de recherche toujours visible sous l'en-tête, les raccourcis à la suite" },
      { key: "panneau", label: "un panneau qui s'ouvre par la loupe et couvre le haut de l'écran : le champ en très grand, les raccourcis, des produits en vignettes" },
    ],
    trait: { fond: "clair", densite: "moyenne", photos: 3, hauteur: 420 },
    html: `<section class="tn tn-recherche" id="tn-recherche" data-tn-recherche><form class="tn-form" onsubmit="return false" role="search"><label class="tn-cherche"><input type="search" name="q" placeholder="Chercher un produit, une page" aria-label="Chercher sur le site" autocomplete="off">${LOUPE}</label><button class="tn-bt" type="submit">Chercher</button></form><div class="tn-pistes"><small>Raccourcis</small><div class="tn-mots" data-tn-mots>${lien("Tous les produits", "shop", "tn-mot")}${lien("Questions fréquentes", "aide", "tn-mot")}${lien("Nous écrire", "contact", "tn-mot")}</div></div><div class="tn-trouves" data-tn-trouves><small>Produits</small><div class="tn-res-l"><a class="tn-r" href="#" onclick="return false" data-go="product"><div class="tn-ph" ${ph("sachet.jpg")}></div><b>Nom du premier produit</b><span>[À compléter : prix]</span></a><a class="tn-r" href="#" onclick="return false" data-go="product"><div class="tn-ph" ${ph("sachet-ouvert.jpg")}></div><b>Nom du second produit</b><span>[À compléter : prix]</span></a><a class="tn-r" href="#" onclick="return false" data-go="product"><div class="tn-ph" ${ph("sachet-bois.jpg")}></div><b>Nom d'un autre produit</b><span>[À compléter : prix]</span></a></div><p class="tn-rien">Aucun produit ne porte ce mot. Essaie un autre mot.</p></div><a class="tn-x" href="#" onclick="return false" data-tn-fermer aria-label="Fermer la recherche">${CROIX}</a></section>`,
  }),
  sec({
    id: "tn-questions-rubriques", title: "Questions par rubriques", kind: "Page · questions fréquentes", role: "aide", group: "pages",
    does: "La page des questions fréquentes quand il y en a beaucoup : les questions rangées par sujet (la commande, la livraison, les retours…), chaque sujet avec son titre et ses volets, puis « Encore une question ? » et le chemin vers le contact. Trois sujets au moins, deux questions par sujet ; une réponse que le dossier ne donne pas s'écrit « [À compléter] ». Pour quelques questions seulement, prendre « Questions en volets ».",
    anim: "Les volets s'ouvrent au toucher.",
    constructions: [
      { key: "empilees", label: "les rubriques l'une sous l'autre : un numéro, le nom du sujet, ses questions séparées par des filets (le nom du sujet à gauche sur grand écran)" },
      { key: "cartes", label: "une carte de couleur douce par rubrique, le nom du sujet en haut de la carte (deux cartes de front sur grand écran)" },
    ],
    trait: { fond: "clair", densite: "moyenne", photos: 0, hauteur: 900 },
    html: `<section class="tn tn-rubriques"><h1>Questions fréquentes.</h1><p class="tn-chapo">Les réponses, rangées par sujet.</p><div class="tn-rubs"><div class="tn-rub"><h2>La commande</h2><div class="tn-liste">${VOLET("Comment passer commande&nbsp;?", "Choisis ton produit, ajoute-le au panier, puis suis les étapes du paiement.", true)}${VOLET("Quels moyens de paiement acceptez-vous&nbsp;?", "[À compléter : moyens de paiement acceptés]")}${VOLET("Puis-je modifier ma commande&nbsp;?", "[À compléter : jusqu'à quand et comment]")}</div></div><div class="tn-rub"><h2>L'expédition</h2><div class="tn-liste">${VOLET("Quand vais-je recevoir mon colis&nbsp;?", "[À compléter : délai d'expédition]")}${VOLET("Combien coûte l'envoi&nbsp;?", "[À compléter : frais d'envoi]")}${VOLET("Où livrez-vous&nbsp;?", "[À compléter : pays livrés]")}</div></div><div class="tn-rub"><h2>Les retours</h2><div class="tn-liste">${VOLET("Et si le produit ne me convient pas&nbsp;?", "[À compléter : conditions de retour]")}${VOLET("Comment suis-je remboursé&nbsp;?", "[À compléter : mode et délai de remboursement]")}</div></div></div><div class="tn-encore"><b>Encore une question&nbsp;?</b><span>Écris-nous, une vraie personne te répond.</span>${lien("Nous écrire", "contact")}</div></section>`,
  }),
  sec({
    id: "tn-merci", title: "Bien reçu, après une demande", kind: "Page · après un formulaire", role: "contact", group: "pages",
    does: "La page qui suit une demande de contact, de devis, de rendez-vous ou une inscription : le mot qui rassure, ce qui va se passer ensuite en trois étapes, et le chemin pour continuer la visite. JAMAIS la confirmation d'une commande : celle-là est une page de la plateforme. Sa page prend une clé comme « bien-recu » (la clé « merci » est réservée à la plateforme). Un délai de réponse ne s'écrit que si le client l'a donné.",
    constructions: [
      { key: "centre", label: "tout centré : un signe rond, le mot en grand, les trois étapes l'une sous l'autre, le bouton" },
      { key: "deux-colonnes", label: "le mot en très grand à gauche, les étapes numérotées dans une carte de couleur douce (à droite sur grand écran, dessous sur téléphone)" },
    ],
    trait: { fond: "clair", densite: "aérée", photos: 0, hauteur: 640 },
    html: `<section class="tn tn-merci"><i class="tn-signe" aria-hidden="true">${COCHE}</i><small>Message envoyé</small><h1>C'est bien reçu.</h1><p class="tn-chapo">Ta demande est arrivée. Tu n'as plus rien à faire : on s'en occupe.</p><ol class="tn-suite"><li><b>Ta demande est enregistrée</b><span>Elle est entre de bonnes mains.</span></li><li><b>Une vraie personne la lit</b><span>[À compléter : qui répond]</span></li><li><b>Tu reçois une réponse</b><span>[À compléter : délai de réponse]</span></li></ol><div class="tn-actions">${bouton("Retour à l'accueil", "home")}${lien("Continuer la visite", "shop")}</div></section>`,
  }),
  sec({
    id: "tn-fermee", title: "Boutique fermée, ouverture prochaine", kind: "Page · avant l'ouverture", role: "inscription", group: "pages",
    does: "La page d'attente d'une boutique qui n'a pas encore ouvert : le nom de la marque, ce qui arrive, une photo de scène, l'inscription pour être prévenu le jour de l'ouverture, et l'entrée par mot de passe pour le propriétaire. Aucune date ni offre d'ouverture inventée : la date ne s'écrit que si le client l'a donnée. Dans Shopify, c'est la page « mot de passe » de la boutique. La photo est une scène, son sujet plutôt en haut : la carte couvre le bas.",
    constructions: [
      { key: "photo-pleine", label: "la photo sur tout l'écran, et une carte posée sur son bas avec le nom, le mot et l'inscription" },
      { key: "moitie", label: "la photo dans le cadre de la marque d'un côté, le nom, le mot et l'inscription de l'autre (photo au-dessus sur téléphone)" },
    ],
    trait: { fond: "photo", densite: "aérée", photos: 1, hauteur: 780 },
    html: `<section class="tn tn-fermee"><div class="tn-ph" ${ph("fenetre.jpg")}></div><div class="tn-in"><span class="tn-nom">Brindi</span><small>Ouverture prochaine</small><h1>On prépare l'ouverture.</h1><p>La boutique n'est pas encore ouverte. Laisse ton e-mail : on t'écrit le jour où elle ouvre.<br>Date prévue : [À compléter : date d'ouverture]</p><form class="tn-form" onsubmit="return false">${champ("Ton e-mail", "email", "email")}<button class="tn-bt" type="submit">Me prévenir</button></form><small class="tn-note">Un seul message, le jour de l'ouverture.</small><details class="tn-cle"><summary>J'ai un mot de passe</summary><form class="tn-passe" onsubmit="return false">${champ("Mot de passe", "password")}<button type="submit" class="tn-ok">Entrer</button></form></details></div></section>`,
  }),
];

export const PAGES_FACONS: Record<string, Construction[]> = {
  "tn-404": [
    { key: "photo-au-centre", label: "tout centré : la photo de la marque en petit dans son cadre, le mot, le champ de recherche, le bouton" },
    { key: "grande-image", label: "une grande image de la marque sur toute la largeur, puis le mot et le champ de recherche alignés à gauche (image à gauche, texte à droite sur grand écran)" },
    { key: "produits", label: "la photo en petite vignette près du mot, le champ de recherche, puis des produits du catalogue pour repartir" },
  ],
  "tn-legal": [
    { key: "volets", label: "les textes en volets qui s'ouvrent, l'un sous l'autre" },
    { key: "sommaire", label: "un sommaire en tête de page, puis les textes ouverts à la suite ; sur grand écran, le sommaire reste visible à gauche pendant la lecture" },
  ],
  "tn-article": [
    { key: "colonne", label: "tout dans une colonne étroite centrée : le titre, la photo dans son cadre, puis le texte" },
    { key: "grande-image", label: "une grande image sur toute la largeur d'abord, le titre en grand dessous, puis le texte ; sur grand écran, la phrase mise en avant sort dans la marge" },
  ],
  "tn-compte": [
    { key: "simple", label: "le titre, une phrase et les deux champs l'un sous l'autre" },
    { key: "carte", label: "les champs dans une carte de couleur douce ; sur grand écran, le titre à gauche et la carte à droite" },
  ],
  "tn-panier": [
    { key: "empile", label: "les produits en lignes, puis le total et le bouton de commande dessous" },
    { key: "deux-colonnes", label: "le récapitulatif dans une carte de couleur douce, avec la barre de livraison offerte si le client a donné son seuil ; sur grand écran, les lignes à gauche et la carte à droite, qui reste visible" },
  ],
  "tn-places": [
    { key: "file", label: "une file de photos à faire glisser, le nom de la scène sous chacune" },
    { key: "alternees", label: "une scène par ligne : la photo d'un côté, son nom en grand de l'autre, en alternance" },
  ],
  "tn-resultats": [
    { key: "lignes", label: "une ligne par résultat : son nom, son genre dessous, son prix à droite" },
    { key: "cartes", label: "une carte de couleur douce par résultat, deux de front (trois sur grand écran) : le genre en haut, le nom, le prix en bas" },
  ],
  "tn-annonce": [
    { key: "centre", label: "une phrase centrée sur une bande à la couleur de la marque" },
    { key: "defile", label: "sur une bande sombre, la phrase défile lentement d'un bord à l'autre (immobile si le visiteur a demandé moins de mouvement)" },
    { key: "filets", label: "sur le fond de la page, entre deux filets : un point de couleur, puis la phrase alignée à gauche" },
  ],
  "tn-pays": [
    { key: "fenetre", label: "une petite fenêtre au trait, centrée, une ligne par choix" },
    { key: "bande", label: "une bande de couleur douce sur toute la largeur : les trois choix côte à côte sur grand écran, le bouton au bout" },
  ],
  "tn-suivi": [
    { key: "deux-parties", label: "le champ de suivi, puis les trois chemins en lignes (le champ à gauche, les chemins à droite sur grand écran)" },
    { key: "cartes", label: "le champ de suivi dans une carte de couleur douce centrée, puis les trois chemins en cartes au trait (trois de front sur grand écran)" },
  ],
  "tn-discussion": [
    { key: "bulle", label: "une bulle au trait en bas à droite, avec sa pointe" },
    { key: "bandeau", label: "une bande sombre sur toute la largeur : la question et qui répond à gauche, le bouton à droite" },
  ],
  "tn-manifeste": [
    { key: "sombre", label: "sur fond sombre : le titre, puis le texte (le titre à gauche, le texte à droite sur grand écran)" },
    { key: "clair-centre", label: "sur le fond de la page, tout centré en colonne étroite entre deux filets, le premier paragraphe en très grand" },
  ],
  "tn-cookies": [
    { key: "bandeau", label: "un bandeau sur toute la largeur, en bas de l'écran" },
    { key: "carte", label: "une petite carte au trait posée dans le coin en bas à gauche, les deux boutons l'un sous l'autre" },
  ],
  "tn-age": [
    { key: "fenetre", label: "une fenêtre de couleur douce centrée, le message sanitaire encadré dessous" },
    { key: "plein-ecran", label: "tout l'écran en sombre : la question en très grand au centre, les deux réponses côte à côte, le message sanitaire en bas" },
  ],
};
