/**
 * Thème unique du Studio (lot 4, référence partie 15) — module « vente » : le site entier d'une boutique de vente
 * directe (accueil, collection, page d'arrivée de publicité, page des avis), au-delà de la fiche produit. Ses pièces
 * nouvelles (VENTE_SECTIONS) et les façons de bâtir ajoutées à des pièces d'autres modules (VENTE_FACONS : identifiant
 * de la pièce → ses constructions, la première étant le rendu d'origine). Feuille : public/sections/tenue-vente.css.
 * Règles : docs/sina-savoir/sections-a-tenue.md.
 *
 * Pièces nouvelles : le bandeau à plusieurs messages, l'ouverture au macaron, les produits en cartes de vente, « la
 * différence », le guide de choix ; pour la page d'arrivée d'une publicité : l'en-tête et le pied minimaux, l'ouverture
 * d'article, les raisons numérotées, l'équation, les témoignages datés, la barre du produit collée en bas ; et la page
 * des avis. Leurs textes d'exemple sont neutres : aucun métier, aucun chiffre, aucun prix, aucune date, aucun prénom.
 *
 * Les vraies données de ces pièces (messages, produits et prix, prix de comparaison, avis d'une vraie source) sont
 * posées par tenue-data.ts (bloc « vente directe ») ; le tri de la page des avis par public/sections/tenue-vente.js.
 * Jamais de fausse urgence : une étiquette d'offre n'existe que pour une vraie promotion datée, un prix barré que pour
 * le vrai prix de comparaison du catalogue, un macaron que pour un chiffre donné par le client.
 */
import { VOLET, ph, sec, type Construction, type TenueSection } from "./tenue-base";
import { PRODUIT_SECTIONS } from "./tenue-produit";
import { RECIT_SECTIONS } from "./tenue-recit";

const lien = (texte: string, go?: string, classe = "tn-v-lien") => `<a class="${classe}" href="#" onclick="return false"${go ? ` data-go="${go}"` : ""}>${texte}</a>`;
const bouton = (texte: string, go?: string) => lien(texte, go, "tn-bt");

/** Une carte de vente : la photo, le genre, le nom, la ligne d'envie, le prix, « Découvrir ». Toute la carte mène à la fiche. */
const CARTE = (nom: string, photo: string) => `<a class="tn-v-carte" href="#" onclick="return false" data-go="product"><div class="tn-ph" ${ph(photo)}></div><small>Genre du produit</small><b>${nom}</b><span class="tn-v-envie">Une ligne qui donne envie de celui-ci.</span><span class="tn-v-prix">[À compléter : prix]</span><i class="tn-v-voir">Découvrir</i></a>`;
/** Un besoin du guide de choix : « Je veux… », pourquoi ce produit y répond, le produit du catalogue (photo, nom, prix, lien). */
const BESOIN = (besoin: string, nom: string, photo: string, open = false) => `<details class="tn-v-besoin"${open ? " open" : ""}><summary>${besoin}</summary><div class="tn-v-rep"><div class="tn-ph" ${ph(photo)}></div><div class="tn-v-quoi"><p>Pourquoi celui-ci répond à cette envie, en une phrase.</p><b data-tn-produit>${nom}</b><span class="tn-v-prix">[À compléter : prix]</span>${lien("Découvrir", "product")}</div></div></details>`;
/** Une ligne de la répartition des notes de la page des avis. */
const BARRE = (nom: string) => `<li><span>${nom}</span><i style="--part:0%"></i><em>[À compléter]</em></li>`;

export const VENTE_SECTIONS: TenueSection[] = [
  // ---------------------------------------------------------------- accueil d'une boutique de vente directe
  sec({
    id: "tn-messages", title: "Bandeau à plusieurs messages", kind: "Bandeau · tout le site", role: "contenu", group: "bandeau",
    does: "Une fine bande au-dessus de l'en-tête qui fait passer plusieurs messages vrais : la livraison et les retours (lus dans la fiche de l'entreprise), le paiement accepté, l'offre réelle du moment avec sa date de fin. Pour une boutique de vente directe, à la place du « Bandeau d'annonce » (une seule phrase). Un message que le client n'a pas donné n'apparaît pas ; jamais de fausse urgence (« aujourd'hui seulement », stock qui fond).",
    data: "la livraison et les retours saisis par le client ; son offre réelle du moment et sa date de fin",
    anim: "Les messages défilent lentement, ou se relaient ; immobiles si le visiteur a demandé moins de mouvement.",
    constructions: [
      { key: "defilent", label: "sur une bande sombre, les messages défilent sans fin d'un bord à l'autre, séparés par un petit signe" },
      { key: "tour-a-tour", label: "sur une bande à la couleur de la marque, un seul message à la fois, centré, qui laisse la place au suivant" },
      { key: "rangee", label: "sur une bande de couleur douce, tous les messages côte à côte, une coche devant chacun (à faire glisser sur téléphone)" },
    ],
    trait: { fond: "sombre", densite: "dense", photos: 0, hauteur: 40 },
    html: `<section class="tn tn-messages" aria-label="Informations pratiques"><ul class="tn-v-fil" data-tn-messages><li data-tn-cle="livraison">Livraison : [À compléter : délai et prix]</li><li data-tn-cle="retours">Retours : [À compléter : délai et conditions]</li><li data-tn-cle="paiement">Paiement : [À compléter : moyens acceptés]</li><li data-tn-cle="offre">[À compléter : offre réelle du moment, avec sa date de fin]</li></ul></section>`,
  }),
  sec({
    id: "tn-ouverture-vente", title: "Ouverture au macaron", kind: "Ouverture · accueil", role: "ouverture",
    does: "Le premier écran d'une boutique de vente directe : une grande photo de scène avec le vrai produit, un petit mot au-dessus du titre, un titre en deux temps (le second en couleur), une phrase, un bouton vers le produit phare et un lien vers la boutique. Sur la photo, un macaron rond porte UN chiffre vrai donné par le client (un nombre de clients, d'années, de pièces vendues) : sans chiffre donné, le macaron n'existe pas. La photo garde son sujet hors de la zone du texte.",
    data: "un chiffre vrai donné par le client, pour le macaron (sinon aucun macaron)",
    constructions: [
      { key: "photo-pleine", label: "la photo sur tout l'écran, le titre et le bouton posés en bas sur un voile sombre, le macaron dans le coin en haut à droite" },
      { key: "texte-puis-photo", label: "le titre, la phrase et le bouton d'abord, puis la photo dans le cadre de la marque avec le macaron à cheval sur son coin (texte à gauche, photo à droite sur grand écran)" },
    ],
    trait: { fond: "photo", densite: "aérée", photos: 1, hauteur: 640 },
    html: `<section class="tn tn-ouverture-vente"><div class="tn-v-vue"><div class="tn-ph" ${ph("md-j2.webp")}></div><div class="tn-v-macaron" data-tn-macaron><b>[À compléter : chiffre vrai]</b><span>[À compléter : ce qu'il compte]</span></div></div><div class="tn-v-mots"><small>Ce que tu vends, en quelques mots</small><h1>Ce que ça change pour toi. <em>Simplement.</em></h1><p>Une phrase qui fait ressentir le moment où le produit change la journée.</p><div class="tn-v-actions">${bouton("Découvrir le produit", "product")}${lien("Voir toute la boutique", "shop")}</div></div></section>`,
  }),
  sec({
    id: "tn-produits-vente", title: "Les produits en cartes de vente", kind: "Produits · accueil", role: "produits",
    does: "Les vrais produits du catalogue en cartes qui vendent : la vraie photo, une petite étiquette de genre, le nom, une ligne d'envie écrite pour ce produit, le prix (« dès » quand les versions n'ont pas le même prix) et « Découvrir ». Le prix barré n'apparaît que s'il vient du vrai prix de comparaison du catalogue ; l'étiquette d'offre, que si le client a une vraie promotion avec sa date de fin ; « Épuisé » quand il n'y a plus de stock. Pour l'accueil d'une boutique de deux à huit produits ; pour une grille simple, prendre « Les produits en cartes ».",
    data: "les produits du catalogue : photo, genre, prix, prix de comparaison, stock ; l'offre réelle du moment",
    constructions: [
      { key: "cartes", label: "des cartes encadrées, deux de front sur téléphone, jusqu'à quatre sur grand écran : la photo en haut, tout le reste centré dessous" },
      { key: "file", label: "une file de grandes cartes à faire glisser, la suivante dépasse du bord (côte à côte sur grand écran)" },
      { key: "lignes", label: "un produit par ligne, sans cadre : la photo à gauche, le genre, le nom, la ligne d'envie, le prix et « Découvrir » à droite (deux colonnes de lignes sur grand écran)" },
    ],
    trait: { fond: "clair", densite: "moyenne", photos: 3, hauteur: 900 },
    html: `<section class="tn tn-produits-vente" data-tn-cartes-vente><div class="tn-v-tete"><h2>Ceux qu'on choisit <em>le plus.</em></h2><p>Une phrase qui dit ce que ces produits ont en commun.</p></div><div class="tn-v-cartes">${CARTE("Nom du premier produit", "md-o1.webp")}${CARTE("Nom du deuxième produit", "md-o2.webp")}${CARTE("Nom du troisième produit", "md-o3.webp")}</div></section>`,
  }),
  sec({
    id: "tn-difference", title: "La différence, en trois volets", kind: "Mise en avant · accueil", role: "mise en avant",
    does: "Ce qui distingue le produit phare, dit en grand : une photo de près, un petit mot, un titre en deux temps, une phrase, puis trois volets numérotés qui s'ouvrent (le premier est ouvert), et un bouton vers le produit. Chaque volet est un fait du produit, jamais un chiffre ni un résultat que le dossier ne donne pas. Sur l'accueil, après les produits ; une seule fois par page.",
    anim: "Les volets s'ouvrent au toucher.",
    constructions: [
      { key: "panneau", label: "un grand panneau à la couleur de la marque d'un bord à l'autre : la photo en haut, le titre, puis les trois volets numérotés dans des cadres au trait (photo à gauche, volets à droite sur grand écran)" },
      { key: "photo-a-cote", label: "sur le fond de la page : la photo dans le cadre de la marque, puis les trois volets séparés par des filets, leur numéro en grand et en couleur" },
    ],
    trait: { fond: "couleur", densite: "moyenne", photos: 1, hauteur: 880 },
    html: `<section class="tn tn-difference"><div class="tn-v-in"><figure class="tn-v-fig"><div class="tn-ph" ${ph("mo-s4.webp")}></div><figcaption>Le détail qui fait la différence, vu de près.</figcaption></figure><div class="tn-v-mots"><small>La différence</small><h2>Tout se joue <em>dans les détails.</em></h2><p>Une phrase qui annonce ce que les trois points vont montrer.</p><div class="tn-v-volets">${VOLET("Le premier point, en quelques mots", "Ce que c'est, et ce que ça change dans la journée de ton client.", true)}${VOLET("Le deuxième point, en quelques mots", "Un fait du produit, dit simplement.")}${VOLET("Le troisième point, en quelques mots", "[À compléter : un troisième fait du produit]")}</div>${bouton("Découvrir le produit", "product")}</div></div></section>`,
  }),
  sec({
    id: "tn-guide-choix", title: "Lequel est fait pour toi ?", kind: "Guide de choix · accueil", role: "rayons",
    does: "Le guide de choix d'une petite gamme : trois envies dites avec les mots du client (« Je veux… »), chacune menant à UN vrai produit du catalogue avec sa photo, son nom, son prix et le lien vers sa fiche. Chaque envie nomme un produit du catalogue (son nom exact) : le Studio pose sa vraie photo et son vrai prix ; une envie sans produit correspondant est retirée. Il faut au moins deux produits. Jamais un produit ni un prix inventé.",
    data: "les produits du catalogue (photo, nom, prix), deux au moins",
    anim: "Les volets s'ouvrent au toucher.",
    constructions: [
      { key: "volets", label: "un panneau à la couleur de la marque : les envies en volets qui s'ouvrent, le produit conseillé apparaît dans le volet avec sa photo et son prix" },
      { key: "cartes", label: "sur le fond de la page, une carte de couleur douce par envie, toutes ouvertes : l'envie en titre, la photo du produit, son nom, son prix (côte à côte sur grand écran)" },
    ],
    trait: { fond: "couleur", densite: "moyenne", photos: 3, hauteur: 760 },
    html: `<section class="tn tn-guide-choix" data-tn-guide><div class="tn-v-in"><small>À chaque envie, le sien</small><h2>Lequel est fait <em>pour toi&nbsp;?</em></h2><p class="tn-v-chapo">Pars de ce qui compte le plus pour toi.</p><div class="tn-v-besoins">${BESOIN("Je veux le plus simple", "Nom du premier produit", "md-o1.webp", true)}${BESOIN("Je veux le plus complet", "Nom du deuxième produit", "md-o2.webp")}${BESOIN("Je veux l'offrir", "Nom du troisième produit", "md-o3.webp")}</div></div></section>`,
  }),

  // ---------------------------------------------------------------- page d'arrivée d'une publicité
  sec({
    id: "tn-entete-arrivee", title: "En-tête minimal d'une page d'arrivée", kind: "En-tête · page d'arrivée de publicité", role: "en-tête",
    does: "L'en-tête d'une page d'arrivée de publicité : le nom de la marque et UN seul lien, « Découvrir » suivi du nom du produit de la page. Ni menu, ni recherche, ni panier : le visiteur qui arrive d'une publicité n'a qu'un chemin, la fiche du produit. Jamais l'en-tête du site entier.",
    data: "le nom du produit de la page (le premier du catalogue)",
    constructions: [
      { key: "nom-a-gauche", label: "le nom de la marque à gauche, le lien « Découvrir » à droite avec une petite flèche, un filet dessous" },
      { key: "nom-au-centre", label: "le nom de la marque centré, et sous lui une fine bande à la couleur de la marque qui porte le lien" },
    ],
    trait: { fond: "clair", densite: "aérée", photos: 0, hauteur: 58 },
    html: `<section class="tn tn-entete-arrivee" data-tn-arrivee><a class="tn-v-marque" href="#" onclick="return false" data-go="home"><span class="tn-nom lg">Brindi</span></a><a class="tn-v-vers" href="#" onclick="return false" data-go="product">Découvrir <span data-tn-produit-nom>le produit</span></a></section>`,
  }),
  sec({
    id: "tn-ouverture-arrivee", title: "Ouverture d'une page d'arrivée", kind: "Ouverture · page d'arrivée de publicité", role: "ouverture",
    does: "Le haut d'une page d'arrivée de publicité, écrit comme un article : un petit mot (le produit et ce qu'il est), un grand titre en deux temps (la question que se pose le client, puis « les raisons de… » en couleur), un chapô qui dit pour qui c'est fait, et une grande photo du vrai produit. Sur la photo, UN avis vrai (ses mots, son prénom, sa date, sa note si elle existe, d'où il vient) : sans vrai avis, la photo reste seule. Le titre reprend la promesse de la publicité, mot pour mot si possible.",
    data: "un vrai avis d'un client (source d'avis, ou avis donné par le client), sinon rien",
    constructions: [
      { key: "colonne", label: "tout en colonne étroite : le petit mot, le titre, le chapô, puis la photo, l'avis en carte blanche à cheval sur le bas de la photo" },
      { key: "cote-a-cote", label: "la photo d'abord sur toute la largeur, puis le titre ; sur grand écran, le titre à gauche et la photo à droite, l'avis en carte sur son coin" },
    ],
    trait: { fond: "clair", densite: "aérée", photos: 1, hauteur: 780 },
    html: `<section class="tn tn-ouverture-arrivee" data-tn-avis-pose><div class="tn-v-mots"><small>Le produit, et ce qu'il est</small><h1>La question que se pose ton client&nbsp;? <em>Les raisons de faire autrement.</em></h1><p class="tn-v-chapo">Pour qui c'est fait, et ce que ça change, en une phrase.</p></div><figure class="tn-v-vue"><div class="tn-ph tn-cadre" ${ph("mo-s2.webp")}></div><blockquote class="tn-v-pose"><p>[À compléter : avis d'un client]</p><cite>[À compléter : prénom et date]</cite><small>[À compléter : d'où vient cet avis]</small></blockquote></figure></section>`,
  }),
  sec({
    id: "tn-raisons", title: "Les raisons numérotées", kind: "Contenu · page d'arrivée de publicité", role: "contenu",
    does: "Le cœur d'une page d'arrivée « X raisons de… » : trois à sept raisons, chacune avec son numéro dans un rond, son titre (une phrase entière), une photo du vrai produit ou de la scène, et un texte court qui part du problème du client puis dit ce que le produit change. Selon la raison : une phrase à retenir dans un encadré, « en trois temps » (trois gestes reliés par des flèches), « l'équation » (deux choses réunies en une seule), une précision honnête en petit, et un seul bouton vers le produit, vers le milieu. Les numéros viennent tout seuls. Aucun chiffre, résultat ou durée que le dossier ne donne pas.",
    constructions: [
      { key: "colonne", label: "une colonne d'article : le numéro dans un rond à gauche du titre, la photo dessous, puis le texte ; un filet entre deux raisons" },
      { key: "alternees", label: "le numéro en très grand et en couleur au-dessus du titre ; sur grand écran, la photo d'un côté et le texte de l'autre, en alternance" },
    ],
    trait: { fond: "clair", densite: "moyenne", photos: 2, hauteur: 2200 },
    html: `<section class="tn tn-raisons"><ol class="tn-v-liste"><li><h2>La première raison, dite en une phrase entière.</h2><div class="tn-ph tn-cadre" ${ph("mo-s1.webp")}></div><div class="tn-v-texte"><p>Le problème, tel que ton client le vit aujourd'hui.</p><p>Ce que le produit change, concrètement, dès le premier jour.</p><blockquote class="tn-v-encadre">La phrase à retenir de cette raison.</blockquote></div></li><li><h2>La deuxième raison, dite en une phrase entière.</h2><div class="tn-ph tn-cadre" ${ph("sl-b2.webp")}></div><div class="tn-v-texte"><p>Un geste en moins, une gêne qui disparaît : ce que ton client ressent.</p>${bouton("Découvrir le produit", "product")}</div></li><li><h2>La troisième raison&nbsp;: tout se fait en trois temps.</h2><ol class="tn-v-temps"><li><b>Premier geste</b><span>En un mot</span></li><li><b>Deuxième geste</b><span>En un mot</span></li><li><b>Troisième geste</b><span>En un mot</span></li></ol><div class="tn-v-texte"><p>Pourquoi ces trois gestes suffisent.</p><p class="tn-v-note">Une précision honnête&nbsp;: ce qu'il faut savoir avant de choisir.</p></div></li><li><h2>La quatrième raison&nbsp;: deux choses en une seule.</h2><div class="tn-v-somme"><p><span>Une chose</span><i aria-hidden="true">+</i><span>Une autre</span></p><b>Une seule pièce.</b></div><div class="tn-v-texte"><p>Ce que cela évite d'acheter, d'assortir ou de ranger.</p></div></li></ol></section>`,
  }),
  sec({
    id: "tn-equation", title: "L'équation", kind: "Mise en avant · page d'arrivée ou fiche produit", role: "mise en avant",
    does: "L'idée du produit en une addition : deux choses que le client achetait ou faisait séparément, un signe plus, et le résultat en très grand (« une seule pièce », « un seul geste »). Pour un produit qui réunit, remplace ou simplifie. Trois ou quatre mots par terme ; aucun chiffre.",
    constructions: [
      { key: "carte", label: "une carte de couleur douce centrée : les deux termes et le signe plus sur une ligne, le résultat en grand et en couleur dessous" },
      { key: "bande", label: "une bande à la couleur de la marque d'un bord à l'autre : les deux termes en petit, le résultat en très grand" },
    ],
    trait: { fond: "clair", densite: "aérée", photos: 0, hauteur: 260 },
    html: `<section class="tn tn-equation"><div class="tn-v-in"><p class="tn-v-termes"><span>Une chose</span><i aria-hidden="true">+</i><span>Une autre</span></p><h2>Une seule pièce.</h2><p class="tn-v-suite">Ce que cela t'évite, en une phrase.</p></div></section>`,
  }),
  sec({
    id: "tn-temoignages", title: "Les témoignages datés", kind: "Preuves · page d'arrivée de publicité", role: "confiance",
    authentic: "les avis de tes clients",
    does: "Deux ou trois vrais avis sur le sujet de la page, chacun avec ses mots exacts, le prénom, la date et la note donnée ; puis, quand les avis ne disent pas tous la même chose, un avis plus réservé montré franchement, et la ligne qui dit d'où viennent ces avis. Aucun avis, aucune note, aucune date d'exemple : sans vrais avis, la pièce ne se pose pas (elle ne ferait qu'inviter à donner le premier). L'avis réservé rend les autres crédibles : il ne se retire pas.",
    data: "les vrais avis des clients (source d'avis, ou avis donnés par le client) : mots exacts, prénom, date, note",
    constructions: [
      { key: "cartes", label: "sur un fond de couleur douce, une carte blanche par avis avec un grand guillemet, l'avis réservé dessous entre deux filets (deux cartes de front sur grand écran)" },
      { key: "en-grand", label: "sur le fond de la page, le premier avis en très grand, les autres en lignes séparées par des filets, l'avis réservé dans un encadré au trait" },
    ],
    trait: { fond: "clair", densite: "moyenne", photos: 0, hauteur: 760 },
    html: `<section class="tn tn-temoignages" data-tn-temoignages><small>Ils en parlent</small><h2>Ce qu'ils en disent.</h2><p class="tn-v-chapo">Quelques retours, tels qu'ils ont été écrits.</p><ul class="tn-v-avis-l"><li><blockquote>[À compléter : avis d'un client]</blockquote><b>[À compléter : prénom]</b><span>[À compléter : date et note donnée]</span></li><li><blockquote>[À compléter : avis d'un client]</blockquote><b>[À compléter : prénom]</b><span>[À compléter : date et note donnée]</span></li></ul><div class="tn-v-nuance"><b>Les avis ne disent pas tous la même chose.</b><blockquote>[À compléter : un avis plus réservé]</blockquote><span>[À compléter : prénom, date et note donnée]</span></div><p class="tn-v-source">[À compléter : d'où viennent ces avis, et s'ils sont vérifiés]</p><div class="tn-v-premier"><p>Personne n'a encore donné son avis ici.</p>${lien("Donner le premier avis", "contact")}</div></section>`,
  }),
  sec({
    id: "tn-barre-produit", title: "Barre du produit collée en bas", kind: "Conversion · page d'arrivée de publicité", role: "conversion",
    does: "Une barre qui reste collée en bas de l'écran pendant toute la lecture d'une page d'arrivée : la vraie photo du produit en vignette, son nom, une ligne qui dit ce qu'il est, et « Découvrir » qui mène à sa fiche. Elle se pose une seule fois, sur une page d'arrivée de publicité (jamais sur l'accueil ni sur une fiche produit, qui a sa propre barre d'achat). Aucun prix ni offre dans la barre.",
    data: "le produit de la page (le premier du catalogue) : sa photo et son nom",
    anim: "La barre apparaît après le début de la lecture, puis reste en place.",
    constructions: [
      { key: "barre", label: "une barre claire sur toute la largeur, collée au bas de l'écran : la vignette et le nom à gauche, le bouton à droite" },
      { key: "carte-flottante", label: "une carte sombre aux coins arrondis, décollée des bords, qui flotte en bas de l'écran (dans le coin en bas à droite sur grand écran)" },
    ],
    trait: { fond: "clair", densite: "dense", photos: 1, hauteur: 72 },
    html: `<section class="tn tn-barre-produit" data-tn-barre-produit aria-label="Le produit de cette page"><div class="tn-v-colle"><div class="tn-ph" ${ph("mo-s2.webp")}></div><p><b data-tn-produit-nom>Nom du produit</b><span>Ce qu'il est, en une ligne</span></p>${bouton("Découvrir", "product")}</div></section>`,
  }),
  sec({
    id: "tn-pied-arrivee", title: "Pied minimal d'une page d'arrivée", kind: "Pied de page · page d'arrivée de publicité", role: "pied de page",
    does: "Le bas d'une page d'arrivée de publicité : le nom de la marque, sa phrase, et les trois liens qu'un acheteur doit toujours trouver (les mentions légales, la livraison et les retours, le contact). Rien d'autre : pas de menu, pas d'inscription. Il laisse la place à la barre du produit collée en bas de l'écran.",
    constructions: [
      { key: "centre", label: "tout centré : le nom de la marque en grand, sa phrase, puis les liens en petit sur une ligne" },
      { key: "ligne", label: "au-dessus d'un filet : le nom et la phrase à gauche, les liens à droite (l'un sous l'autre sur téléphone)" },
    ],
    trait: { fond: "clair", densite: "aérée", photos: 0, hauteur: 220 },
    html: `<footer class="tn tn-pied-arrivee"><span class="tn-nom lg">Brindi</span><p>La phrase de la marque, en quelques mots.</p><nav aria-label="Informations">${lien("Mentions légales", "legal")}${lien("Livraison et retours", "aide")}${lien("Nous écrire", "contact")}</nav></footer>`,
  }),

  // ---------------------------------------------------------------- page des avis
  sec({
    id: "tn-avis-page", title: "La page des avis", kind: "Page · tous les avis", role: "confiance", group: "pages",
    authentic: "les avis de tes clients",
    does: "La page où lire tous les avis : en tête, la note moyenne, le nombre d'avis et la répartition par étoiles en barres ; puis la liste, triable, chaque avis avec ses étoiles, sa date, le prénom, « Achat vérifié » seulement si la source le dit, les photos envoyées par le client, le produit concerné et la réponse de la marque. TOUT vient d'une vraie source d'avis : la note et les barres sont calculées, jamais écrites. Sans source d'avis, la page ne montre qu'une invitation à donner le premier avis, et elle ne se pose pas.",
    data: "les avis d'une vraie source d'avis : note, date, prénom, achat vérifié, photos, produit, réponse",
    anim: "La liste se trie sans recharger la page.",
    constructions: [
      { key: "resume-en-haut", label: "le résumé centré en haut (la note en très grand, les étoiles, les barres), puis la liste des avis en lignes séparées par des filets" },
      { key: "resume-a-cote", label: "le résumé dans une carte de couleur douce : la note à gauche, les barres à droite ; sur grand écran, la carte reste visible à gauche pendant que la liste défile à droite" },
    ],
    trait: { fond: "clair", densite: "dense", photos: 0, hauteur: 900 },
    html: `<section class="tn tn-avis-page" data-tn-avis-page><h1>Les avis des clients.</h1><div class="tn-v-resume"><div class="tn-v-moyenne"><b>[À compléter : note moyenne]</b><span>[À compléter : nombre d'avis]</span></div><ul class="tn-v-barres">${BARRE("Cinq étoiles")}${BARRE("Quatre étoiles")}${BARRE("Trois étoiles")}${BARRE("Deux étoiles")}${BARRE("Une étoile")}</ul></div><div class="tn-v-tri"><label><span>Trier par</span><select data-tn-tri-avis><option value="recents">Les plus récents</option><option value="hauts">Les mieux notés</option><option value="bas">Les moins bien notés</option></select></label></div><ul class="tn-v-avis-l" data-tn-avis-liste><li><blockquote>[À compléter : avis d'un client]</blockquote><b>[À compléter : prénom]</b><span>[À compléter : date]</span></li><li><blockquote>[À compléter : avis d'un client]</blockquote><b>[À compléter : prénom]</b><span>[À compléter : date]</span></li></ul><p class="tn-v-source">[À compléter : d'où viennent ces avis, et s'ils sont vérifiés]</p><div class="tn-v-premier"><p>Personne n'a encore donné son avis ici.</p>${lien("Donner le premier avis", "contact")}</div></section>`,
  }),
];

/** Les façons d'origine d'une pièce d'un autre module (le registre remplace la liste de la pièce : elles restent en tête). */
const origine = (liste: TenueSection[], id: string): Construction[] => liste.find((s) => s.id === id)?.constructions ?? [];

export const VENTE_FACONS: Record<string, Construction[]> = {
  // Réassurance juste sous l'ouverture : les repères dans un seul cadre partagé en cases.
  "tn-garanties": [...origine(PRODUIT_SECTIONS, "tn-garanties"),
    { key: "cases", label: "un seul cadre au trait partagé en cases par des filets, deux de front : le dessin dans un rond de couleur douce, le nom, la phrase (une rangée sur grand écran)" }],
  // Les bénéfices en cartes à picto (s'ajoute aux façons du socle et du module achat).
  "tn-atouts": [
    { key: "ronds", label: "des cartes blanches au trait fin, deux de front : une coche dans un rond de couleur douce en haut de chacune, le fait et sa ligne centrés (côte à côte sur grand écran)" }],
  // « En trois temps » : les étapes reliées par des flèches.
  "tn-comment": [...origine(RECIT_SECTIONS, "tn-comment"),
    { key: "fleches", label: "dans une carte de couleur douce, les trois temps côte à côte même sur téléphone, leur numéro en couleur, reliés par des flèches" }],
  // Collection : l'ajout rapide depuis la carte.
  "tn-catalogue": [...origine(PRODUIT_SECTIONS, "tn-catalogue"),
    { key: "ajout-rapide", label: "des cartes encadrées avec un bouton sous chaque produit : « Ajouter au panier » s'il n'a qu'une version, « Choisir des options » sinon ; la note en étoiles quand une vraie source d'avis existe" }],
};
