/**
 * Sections à tenue de récit, de marque, de navigation et les fenêtres (thème sur mesure). Feuille : public/sections/tenue-recit.css. Règles d'écriture :
 * docs/sina-savoir/sections-a-tenue.md. Gratuit, sans IA.
 *
 * Règle de ce module : toutes les constructions d'une section montrent TOUTES ses photos. Le montage décrit et crée
 * chaque photo écrite dans le HTML d'une section ; une photo cachée par une construction serait payée sans être vue.
 * D'où deux sections pour la citation et pour l'inscription (avec et sans photo). Seule exception : la photo de la
 * personne (« tn-fondateur »), que seul le client fournit.
 */
import { ph, sec, type TenueSection } from "./tenue-base";

/** Lien d'une section (clé de page facultative). */
const lien = (texte: string, go?: string, classe = "tn-lien") => `<a class="${classe}" href="#" onclick="return false"${go ? ` data-go="${go}"` : ""}>${texte}</a>`;
/** Le bouton de la tenue. */
const bouton = (texte: string, go?: string) => lien(texte, go, "tn-bt");
/** Photo d'exemple ; encadrée, elle prend le cadre de la tenue. */
const photo = (fichier: string, cadre = true) => `<div class="tn-ph${cadre ? " tn-cadre" : ""}" ${ph(fichier)}></div>`;
/** Un champ à remplir : son nom posé sur le trait, qui s'efface dès que l'on écrit. */
const champ = (nom: string, type = "text", auto = "off") => `<label class="tn-champ"><input type="${type}" placeholder=" " autocomplete="${auto}"><span>${nom}</span></label>`;
/** L'inscription à la lettre : un champ, un bouton, la phrase qui rassure. Aucune remise promise. */
const INSCRIPTION = `<h2>Une lettre, quand il y a du nouveau.</h2><p>Un mélange de saison, une recette, une histoire de feuilles. Rien d'autre.</p><form class="tn-form" onsubmit="return false">${champ("Ton e-mail", "email", "email")}<button class="tn-bt" type="submit">Je m'inscris</button></form><small>Tu te désinscris quand tu veux.</small>`;
const LOUPE = `<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="6" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M13 13l5 5" stroke="currentColor" stroke-width="1.8"/></svg>`;

const RECIT: TenueSection[] = [
  sec({
    id: "tn-texte-photo", title: "Texte et photo", kind: "Récit · toutes les pages", role: "contenu",
    does: "Un titre, un court texte et une photo de scène dans le cadre de la marque : la section la plus utile d'un site, pour raconter une matière, un geste ou une raison d'être. Jamais deux fois de suite dans la même construction ; un seul lien souligné, pas de bouton.",
    constructions: [
      { key: "photo-gauche", label: "la photo à gauche (en premier sur téléphone), le texte à droite" },
      { key: "photo-droite", label: "le texte à gauche (en premier sur téléphone), la photo à droite" },
      { key: "texte-remonte", label: "une grande photo pleine, et le bloc de texte qui remonte sur le bas de la photo" },
      { key: "carte-a-cheval", label: "la photo dans son cadre, et une carte sombre posée à cheval sur son bord" },
    ],
    trait: { fond: "clair", densite: "moyenne", photos: 1, hauteur: 700 },
    html: `<section class="tn tn-texte-photo">${photo("infusion.jpg")}<div class="tn-txt"><h2>Des feuilles entières.<br>Rien de broyé.</h2><p>Ouvre le sachet : tu vois des feuilles, pas de la poussière. Dans l'eau chaude, elles se déplient lentement. Regarde-les faire, la pause a déjà commencé.</p>${lien("Lire notre histoire", "about")}</div></section>`,
  }),
  sec({
    id: "tn-fabrication", title: "Comment c'est fait", kind: "Fabrication · accueil et à propos", role: "marque",
    does: "La fabrication en étapes photographiées, dans l'ordre : chaque étape a sa photo dans le cadre de la marque, son numéro, un titre et une ligne. Une vraie suite d'étapes seulement (les numéros viennent tout seuls) ; rien que le dossier ne dise pas.",
    constructions: [
      { key: "file", label: "une file d'étapes à faire glisser (côte à côte sur ordinateur)" },
      { key: "lignes", label: "une étape par ligne, la photo d'un côté puis de l'autre" },
    ],
    trait: { fond: "clair", densite: "moyenne", photos: 4, hauteur: 560 },
    anim: "Sur téléphone, la file d'étapes glisse au doigt.",
    html: `<section class="tn tn-fabrication"><h2>Comment il est fait.</h2><p>Quatre gestes, toujours dans le même ordre.</p><ol class="tn-etapes"><li>${photo("seches.jpg")}<h3>On choisit les feuilles</h3><p>Entières, jamais broyées.</p></li><li>${photo("fleurs.jpg")}<h3>On ajoute les fleurs</h3><p>De vraies fleurs de jasmin, séchées.</p></li><li>${photo("bol.jpg")}<h3>On assemble à la main</h3><p>Par petites quantités, pour que rien ne s'écrase.</p></li><li>${photo("sachet-ouvert.jpg")}<h3>On ferme le sachet</h3><p>Il se referme après chaque tasse.</p></li></ol></section>`,
  }),
  sec({
    id: "tn-engagements", title: "Les engagements de la marque", kind: "Engagements · accueil et à propos", role: "confiance",
    does: "Les engagements vrais de la marque, écrits comme des phrases que l'on signe, chacun avec une ligne qui dit ce que cela change. Seulement ce que le dossier permet d'affirmer : ni label, ni chiffre, ni garantie que le client n'a pas donnés.",
    constructions: [
      { key: "liste", label: "une grande liste de phrases, l'une sous l'autre" },
      { key: "deux-colonnes", label: "le titre d'un côté, les engagements en deux colonnes de l'autre" },
    ],
    trait: { fond: "clair", densite: "moyenne", photos: 0, hauteur: 520 },
    html: `<section class="tn tn-engagements"><h2>Ce qu'on te doit.</h2><ul class="tn-promesses"><li><b>Du thé, des fleurs, rien d'autre.</b><small>La liste tient sur une ligne.</small></li><li><b>Aucun arôme ajouté.</b><small>Ce que tu sens vient de la feuille.</small></li><li><b>Un sachet qui se referme.</b><small>Le parfum reste dedans.</small></li><li><b>Une vraie réponse à chaque message.</b><small>[À compléter : qui répond]</small></li></ul></section>`,
  }),
  sec({
    id: "tn-chiffres", title: "Les chiffres vrais", kind: "Chiffres · accueil et à propos", role: "marque",
    does: "Deux à quatre chiffres vrais de la marque, en très grand, chacun avec ce qu'il compte. Seulement des chiffres donnés par le client : sans chiffre, la ligne reste « [À compléter] » et la section ne se pose pas.",
    constructions: [
      { key: "lignes", label: "un chiffre par ligne, très grand, ce qu'il compte à côté" },
      { key: "bande", label: "une bande de couleur, les chiffres centrés (en colonnes sur ordinateur)" },
    ],
    trait: { fond: "clair", densite: "aérée", photos: 0, hauteur: 420 },
    data: "les chiffres réels donnés par le client",
    html: `<section class="tn tn-chiffres"><h2>Ce qui se compte.</h2><ul class="tn-nombres" data-tn-chiffres><li><b>[À compléter : chiffre]</b><span>mélanges assemblés à la main</span></li><li><b>[À compléter : chiffre]</b><span>producteurs que l'on connaît par leur prénom</span></li><li><b>[À compléter : chiffre]</b><span>tasses servies depuis le premier jour</span></li></ul></section>`,
  }),
  sec({
    id: "tn-presse", title: "Ce que la presse a écrit", kind: "Presse · accueil et à propos", role: "confiance",
    does: "Les phrases que la presse a vraiment écrites sur la marque, chacune avec le nom du journal. Seulement de vraies parutions, citées mot pour mot : sans parution, la section ne se pose pas.",
    constructions: [
      { key: "citations", label: "les phrases citées, le nom du journal sous chacune" },
      { key: "noms", label: "les noms des journaux seuls, en grand, sur une ligne" },
    ],
    trait: { fond: "clair", densite: "aérée", photos: 0, hauteur: 420 },
    data: "les parutions réelles données par le client",
    html: `<section class="tn tn-presse"><h2>Ils en ont parlé.</h2><ul class="tn-parutions" data-tn-presse><li><blockquote>«&nbsp;[À compléter : la phrase citée]&nbsp;»</blockquote><cite>[À compléter : nom du journal]</cite></li><li><blockquote>«&nbsp;[À compléter : la phrase citée]&nbsp;»</blockquote><cite>[À compléter : nom du journal]</cite></li><li><blockquote>«&nbsp;[À compléter : la phrase citée]&nbsp;»</blockquote><cite>[À compléter : nom du journal]</cite></li></ul></section>`,
  }),
  sec({
    id: "tn-citation", title: "Une phrase en très grand", kind: "Respiration · toutes les pages", role: "marque",
    does: "Une seule phrase de la marque ou de la personne qui la fait, en très grand, sans photo : une respiration entre deux parties chargées. Elle est signée par quelqu'un qui existe ; jamais une parole de client inventée.",
    constructions: [
      { key: "couleur", label: "sur une bande à la couleur de la marque" },
      { key: "traits", label: "centrée entre deux traits fins, sur le fond de la page" },
    ],
    trait: { fond: "couleur", densite: "aérée", photos: 0, hauteur: 330 },
    html: `<section class="tn tn-citation"><h2>«&nbsp;Un thé ne se boit pas vite. C'est pour ça qu'on l'aime.&nbsp;»</h2><small>[À compléter : qui le dit]</small></section>`,
  }),
  sec({
    id: "tn-citation-photo", title: "Une phrase sur une photo", kind: "Émotion · toutes les pages", role: "marque",
    does: "Une phrase signée, en très grand, avec une photo de scène : le moment d'émotion d'une page de marque. La phrase se pose sur la partie calme de la photo, jamais sur le sujet.",
    constructions: [
      { key: "voile", label: "la photo pleine, un voile sombre en haut, la phrase posée sur sa partie calme" },
      { key: "moitie", label: "une moitié à la couleur de la marque avec la phrase, l'autre moitié en photo" },
    ],
    trait: { fond: "photo", densite: "aérée", photos: 1, hauteur: 520 },
    html: `<section class="tn tn-citation-photo">${photo("bureau.jpg", false)}<div class="tn-in"><h2>«&nbsp;La première gorgée, et le bruit s'arrête.&nbsp;»</h2><small>[À compléter : qui le dit]</small></div></section>`,
  }),
  sec({
    id: "tn-mosaique", title: "Photos en mosaïque", kind: "Galerie · accueil et à propos", role: "contenu",
    does: "Quatre photos de scène dans le cadre de la marque, chacune avec quelques mots : l'univers de la marque en images, sans discours. Des scènes vraies et différentes (jamais deux fois le même sujet), jamais des photos de clients inventées.",
    constructions: [
      { key: "grille", label: "une grille régulière, deux photos par rang (quatre sur ordinateur)" },
      { key: "collage", label: "un collage décalé : des photos inégales qui se chevauchent, les mots dessous" },
      { key: "une-grande", label: "une grande photo, puis trois petites en rang" },
    ],
    trait: { fond: "clair", densite: "moyenne", photos: 4, hauteur: 620 },
    html: `<section class="tn tn-mosaique"><h2>Dans la tasse.</h2><div class="tn-mur"><figure>${photo("tasse-fruits.jpg")}<small>L'été, glacé</small></figure><figure>${photo("trois-bols.jpg")}<small>Le dimanche</small></figure><figure>${photo("fenetre.jpg")}<small>À la fenêtre</small></figure><figure>${photo("infuseur.jpg")}<small>Une cuillère par tasse</small></figure></div></section>`,
  }),
  sec({
    id: "tn-manifeste", title: "Manifeste de la marque", kind: "Manifeste · accueil et à propos", role: "marque",
    does: "Ce que la marque défend, en un titre fort et quelques grands paragraphes sur fond sombre : pourquoi elle existe, ce qu'elle refuse, ce qu'elle promet. Un texte d'auteur, signé ; aucun chiffre, aucune promesse que le dossier ne donne pas.",
    trait: { fond: "sombre", densite: "moyenne", photos: 0, hauteur: 640 },
    html: `<section class="tn tn-manifeste tn-sombre"><h2>On ne vend pas du thé.<br>On vend une pause.</h2><div class="tn-corps"><p>Un moment où personne ne te demande rien. L'eau chauffe, les feuilles s'ouvrent, la tasse tient chaud aux mains.</p><p>On a monté Brindi pour ça. Pas pour remplir un placard de boîtes : pour que la pause existe encore, quelque part dans la journée.</p><p>Alors on fait simple. De belles feuilles, de vraies fleurs, et le temps qu'il faut.</p></div><small>[À compléter : signature]</small></section>`,
  }),
  sec({
    id: "tn-frise", title: "L'histoire en dates", kind: "Histoire · à propos", role: "marque",
    does: "L'histoire de la marque, date par date : une année, un titre, deux lignes. Seulement les dates et les faits donnés par le client ; une année inconnue reste « [À compléter] », jamais devinée.",
    constructions: [
      { key: "ligne", label: "une ligne verticale, les dates l'une sous l'autre" },
      { key: "colonnes", label: "les dates côte à côte sous un trait (à faire glisser sur téléphone)" },
    ],
    trait: { fond: "clair", densite: "moyenne", photos: 0, hauteur: 560 },
    data: "les dates et les faits de l'histoire donnés par le client",
    anim: "Sur téléphone, les dates côte à côte glissent au doigt.",
    html: `<section class="tn tn-frise"><h2>Date par date.</h2><ol class="tn-dates" data-tn-dates><li><b>[À compléter : année]</b><h3>La première tasse</h3><p>[À compléter : comment tout a commencé]</p></li><li><b>[À compléter : année]</b><h3>Le premier mélange</h3><p>[À compléter : le premier produit vendu]</p></li><li><b>[À compléter : année]</b><h3>Aujourd'hui</h3><p>[À compléter : où en est la marque]</p></li></ol></section>`,
  }),
  sec({
    id: "tn-comment", title: "Comment ça marche", kind: "Mode d'emploi · accueil et fiche produit", role: "contenu",
    does: "Le mode d'emploi en trois étapes numérotées (les numéros viennent tout seuls), puis le bouton pour commencer. Pour une vraie suite de gestes : commander, préparer, utiliser. Une durée ou une quantité que le dossier ne donne pas reste « [À compléter] ».",
    constructions: [
      { key: "lignes", label: "une étape par ligne, le grand numéro à gauche (en colonnes sur ordinateur)" },
      { key: "escalier", label: "les étapes en escalier, chacune décalée de la précédente" },
    ],
    trait: { fond: "clair", densite: "moyenne", photos: 0, hauteur: 480 },
    html: `<section class="tn tn-comment"><h2>Trois gestes, une tasse.</h2><ol class="tn-pas"><li><h3>Choisis ton mélange</h3><p>Selon l'heure, selon l'humeur.</p></li><li><h3>Verse l'eau chaude</h3><p>[À compléter : température et durée]</p></li><li><h3>Pose ton écran</h3><p>Le reste attendra que la tasse soit vide.</p></li></ol>${bouton("Choisir mon mélange", "shop")}</section>`,
  }),
  sec({
    id: "tn-fondateur", title: "La personne derrière la marque", kind: "Portrait · accueil et à propos", role: "à propos",
    does: "Une lettre à la première personne de celle ou celui qui fait la marque, avec sa vraie photo ou celle de son atelier, et sa signature. La photo ne s'invente pas : sans elle, la construction « lettre » se passe de photo. Rien d'écrit que la personne n'ait dit.",
    constructions: [
      { key: "portrait", label: "la photo de la personne ou de l'atelier, la lettre à côté" },
      { key: "lettre", label: "sans photo : la lettre seule, sur une feuille, signée" },
    ],
    trait: { fond: "clair", densite: "moyenne", photos: 1, hauteur: 760 },
    authentic: "ta photo ou celle de ton atelier",
    html: `<section class="tn tn-fondateur">${photo("bi-carnet.jpg")}<div class="tn-lettre"><h2>Derrière Brindi, il y a quelqu'un.</h2><p>[À compléter : qui tu es et pourquoi tu as créé la marque]</p><p>[À compléter : ce que tu fais toi-même, de tes mains]</p><small>[À compléter : ton prénom]</small></div></section>`,
  }),
];

/** Les pages : journal, article, suivi de commande, résultats d'une recherche. */
const PAGES: TenueSection[] = [
  sec({
    id: "tn-journal", title: "Le journal, liste des articles", kind: "Page · journal", role: "journal",
    does: "La page du journal : un grand titre, une phrase, puis les articles, chacun avec sa rubrique, son titre, une ligne et sa photo. Les articles viennent de la rubrique Articles du Studio ; sans article, la page ne se pose pas.",
    constructions: [
      { key: "titres", label: "une liste de grands titres, une petite photo au bout de chaque ligne" },
      { key: "cartes", label: "des cartes : la photo en grand, le titre dessous (trois de front sur ordinateur)" },
    ],
    trait: { fond: "clair", densite: "moyenne", photos: 3, hauteur: 700 },
    data: "les articles du journal (rubrique, titre, première ligne, photo)",
    html: `<section class="tn tn-journal"><h1>Le journal.</h1><p>Des recettes, des gestes, des histoires de feuilles.</p><div class="tn-articles" data-tn-articles><a class="tn-art" href="#" onclick="return false" data-go="article">${photo("tasse-fruits.jpg")}<small>Recette</small><b>Le thé glacé qui ne devient pas amer</b><span>Tout se joue avant le frigo.</span></a><a class="tn-art" href="#" onclick="return false" data-go="article">${photo("infuseur.jpg")}<small>Geste</small><b>Une cuillère, pas deux</b><span>Trop de feuilles, et la tasse se ferme.</span></a><a class="tn-art" href="#" onclick="return false" data-go="article">${photo("fenetre.jpg")}<small>Carnet</small><b>Ce qu'on boit quand il pleut</b><span>Des mélanges ronds, pour les jours gris.</span></a></div></section>`,
  }),
  sec({
    id: "tn-article", title: "La page d'un article", kind: "Page · article du journal", role: "journal",
    does: "Un article du journal, fait pour être lu : le retour au journal, la rubrique, le titre, le chapô, une grande photo, puis le texte en colonne étroite avec ses intertitres et une phrase mise en avant, et la signature. Le texte vient de l'article écrit dans le Studio.",
    trait: { fond: "clair", densite: "moyenne", photos: 1, hauteur: 1500 },
    data: "l'article du journal (rubrique, titre, chapô, photo, texte, auteur)",
    html: `<section class="tn tn-article" data-tn-article>${lien("Le journal", "journal", "tn-retour")}<small>Recette</small><h1>Le thé glacé qui ne devient pas amer</h1><p class="tn-chapo">Tout se joue avant le frigo : de l'eau froide, du temps, et aucune précipitation.</p>${photo("tasse-fruits.jpg")}<div class="tn-corps"><p>Un thé glacé amer, c'est presque toujours un thé chaud que l'on a refroidi trop vite. Les feuilles ont tout donné d'un coup, le bon comme le reste.</p><h2>Laisse faire l'eau froide</h2><p>Mets les feuilles dans une carafe d'eau froide et oublie-la au frais. [À compléter : quantité de feuilles et durée]</p><blockquote>«&nbsp;Le froid ne presse rien. C'est pour ça qu'il est doux.&nbsp;»</blockquote><p>Au réveil, filtre, goûte, et ajoute seulement ce dont tu as envie : une rondelle de citron, quelques fruits, rien du tout.</p></div><small class="tn-signe">[À compléter : qui écrit]</small></section>`,
  }),
  sec({
    id: "tn-suivi", title: "Suivre sa commande et trouver de l'aide", kind: "Page · aide et suivi", role: "aide",
    does: "La page d'aide : le champ pour suivre une commande (son numéro et l'e-mail de l'achat), puis les trois chemins vers une réponse : les questions fréquentes, les retours, écrire à la marque. Un délai de réponse ne s'écrit que si le client l'a donné.",
    trait: { fond: "clair", densite: "moyenne", photos: 0, hauteur: 760 },
    html: `<section class="tn tn-suivi"><h1>Où est ma commande&nbsp;?</h1><p>Donne le numéro reçu par e-mail : on te dit où elle se trouve.</p><form class="tn-form" onsubmit="return false">${champ("Numéro de commande")}${champ("Ton e-mail", "email", "email")}<button class="tn-bt" type="submit">Suivre ma commande</button></form><div class="tn-chemins"><h2>Autre chose&nbsp;?</h2><a href="#" onclick="return false" data-go="aide"><b>Questions fréquentes</b><span>Les réponses à ce qu'on nous demande le plus.</span></a><a href="#" onclick="return false" data-go="legal"><b>Retours et remboursements</b><span>[À compléter : conditions de retour]</span></a><a href="#" onclick="return false" data-go="contact"><b>Nous écrire</b><span>Réponse sous [À compléter : délai]</span></a></div></section>`,
  }),
  sec({
    id: "tn-resultats", title: "Résultats d'une recherche", kind: "Page · recherche", role: "contenu", group: "pages",
    does: "La page des résultats d'une recherche : le mot cherché en titre, le champ pour chercher autre chose, le nombre de résultats, puis une ligne par résultat (son nom, son genre, son prix ou « Lire »). Quand rien n'est trouvé (attribut data-tn-vide), la liste laisse la place à un mot simple et au chemin vers la boutique.",
    trait: { fond: "clair", densite: "moyenne", photos: 0, hauteur: 560 },
    data: "les résultats de la recherche (produits du catalogue et articles) et leur nombre",
    html: `<section class="tn tn-resultats" data-tn-resultats><h1>Résultats pour «&nbsp;jasmin&nbsp;»</h1><form class="tn-form" onsubmit="return false"><label class="tn-cherche"><input type="search" value="jasmin" aria-label="Chercher sur le site">${LOUPE}</label></form><small class="tn-nombre">Trois résultats</small><div class="tn-liste"><a class="tn-res" href="#" onclick="return false" data-go="product"><b>Thé vert jasmin</b><small>Thé</small><span>[À compléter : prix]</span></a><a class="tn-res" href="#" onclick="return false" data-go="product"><b>Fleurs de jasmin</b><small>Infusion</small><span>[À compléter : prix]</span></a><a class="tn-res" href="#" onclick="return false" data-go="article"><b>Infuser le jasmin sans amertume</b><small>Le journal</small><span>Lire</span></a></div><div class="tn-vide"><h2>Rien trouvé.</h2><p>Aucune page ne contient ce mot. Essaie un autre mot, ou pars de la boutique.</p>${bouton("Voir la boutique", "shop")}</div></section>`,
  }),
];

/** L'inscription, les bandeaux et les fenêtres. */
const FENETRES: TenueSection[] = [
  sec({
    id: "tn-infolettre", title: "Inscription à la lettre", kind: "Inscription · fin de page", role: "inscription",
    does: "L'inscription à la lettre de la marque, sans photo : ce que l'on reçoit, le champ, le bouton, la désinscription. Aucune remise ni cadeau d'exemple : une offre de bienvenue ne s'écrit que si le client l'a vraiment.",
    constructions: [
      { key: "bande", label: "une bande de couleur douce sur toute la largeur" },
      { key: "carte", label: "une carte au trait, centrée sur le fond de la page" },
    ],
    trait: { fond: "couleur", densite: "aérée", photos: 0, hauteur: 400 },
    html: `<section class="tn tn-infolettre"><div class="tn-in">${INSCRIPTION}</div></section>`,
  }),
  sec({
    id: "tn-infolettre-photo", title: "Inscription à la lettre, avec une photo", kind: "Inscription · fin de page", role: "inscription",
    does: "L'inscription à la lettre en regard d'une photo de scène : pour une marque dont l'univers donne envie de recevoir des nouvelles. Aucune remise ni cadeau d'exemple. Dans la construction « dessus », la photo garde son sujet en haut à droite : la carte couvre le bas de la photo (le bas à gauche sur grand écran).",
    constructions: [
      { key: "a-cote", label: "la photo dans son cadre, l'inscription à côté (dessous sur téléphone)" },
      { key: "dessus", label: "la photo pleine, l'inscription sur une carte posée sur son bas" },
    ],
    trait: { fond: "clair", densite: "moyenne", photos: 1, hauteur: 640 },
    html: `<section class="tn tn-infolettre-photo">${photo("tasse.jpg")}<div class="tn-in">${INSCRIPTION}</div></section>`,
  }),
  sec({
    id: "tn-annonce", title: "Bandeau d'annonce", kind: "Bandeau · tout le site", role: "contenu", group: "bandeau",
    does: "Une fine bande à la couleur de la marque, au-dessus de l'en-tête, avec une seule phrase vraie : la livraison, une fermeture, une nouveauté. Sans message donné par le client, le bandeau ne se pose pas ; jamais de fausse urgence.",
    trait: { fond: "couleur", densite: "dense", photos: 0, hauteur: 40 },
    html: `<section class="tn tn-annonce"><p>[À compléter : message du moment]</p></section>`,
  }),
  sec({
    id: "tn-cookies", title: "Bandeau de cookies", kind: "Fenêtre · tout le site", role: "légal", group: "partout",
    does: "Le bandeau de cookies : ce qu'ils mesurent, puis « Tout refuser » et « Tout accepter » au même niveau, et « Choisir » qui ouvre les réglages par usage. Dessiné dans la page : le Studio le fixe en bas de l'écran. Les outils cités sont ceux que le client a vraiment installés.",
    trait: { fond: "clair", densite: "dense", photos: 0, hauteur: 250 },
    data: "les outils de mesure et de publicité installés sur le site",
    anim: "« Choisir » ouvre les réglages par usage.",
    html: `<section class="tn tn-cookies" data-tn-cookies><div class="tn-mot"><h2>Des cookies, si tu veux bien.</h2><p>Ils servent à mesurer les visites : [À compléter : outils de mesure installés]. Tu choisis, et tu peux changer d'avis depuis le bas de chaque page.</p></div><div class="tn-choix"><button type="button" class="tn-egal">Tout refuser</button><button type="button" class="tn-egal">Tout accepter</button></div><details class="tn-detail"><summary>Choisir</summary><ul><li><label><input type="checkbox" checked disabled><span><b>Indispensables</b>Le panier et la connexion. Toujours actifs.</span></label></li><li><label><input type="checkbox"><span><b>Mesure des visites</b>[À compléter : outil de mesure]</span></label></li><li><label><input type="checkbox"><span><b>Publicité</b>[À compléter : outils de publicité]</span></label></li></ul><button type="button" class="tn-garde">Enregistrer mes choix</button></details></section>`,
  }),
  sec({
    id: "tn-pays", title: "Choix du pays, de la langue et de la devise", kind: "Fenêtre · tout le site", role: "contenu", group: "partout",
    does: "Une petite fenêtre pour choisir son pays, sa langue et sa devise, écrits en entier et modifiables séparément. Pour une boutique qui vend à l'étranger ou en deux langues ; les choix proposés sont ceux que le client a réglés.",
    trait: { fond: "clair", densite: "dense", photos: 0, hauteur: 440 },
    data: "les pays livrés, les langues et les devises réglés par le client",
    anim: "Chaque ligne s'ouvre sur ses choix.",
    html: `<section class="tn tn-pays" data-tn-pays><div class="tn-fenetre"><h2>Où es-tu&nbsp;?</h2><p>Pour t'afficher les bons prix et la bonne livraison.</p><details><summary><span>Pays</span><b>France</b></summary><ul><li>[À compléter : pays livrés]</li></ul></details><details><summary><span>Langue</span><b>Français</b></summary><ul><li>[À compléter : langues du site]</li></ul></details><details><summary><span>Devise</span><b>Euro (EUR €)</b></summary><ul><li>[À compléter : devises acceptées]</li></ul></details>${bouton("Enregistrer")}</div></section>`,
  }),
  sec({
    id: "tn-age", title: "Demande d'âge et message sanitaire", kind: "Fenêtre · tout le site", role: "légal", group: "partout",
    only: "vins, bières et spiritueux",
    does: "La fenêtre qui demande l'âge à l'entrée d'un site qui vend de l'alcool, et le message sanitaire toujours visible. Dessinée dans la page : le Studio l'affiche à l'entrée du site. Le texte est à faire valider par un juriste ; l'âge légal dépend du pays.",
    trait: { fond: "clair", densite: "moyenne", photos: 0, hauteur: 520 },
    html: `<section class="tn tn-age"><div class="tn-fenetre"><small>Avant d'entrer</small><h2>As-tu l'âge légal pour acheter de l'alcool&nbsp;?</h2><p>Ce site vend des boissons alcoolisées. L'âge légal dépend de ton pays : [À compléter : âge légal du pays].</p>${bouton("J'ai l'âge légal")}${lien("Non, pas encore")}</div><p class="tn-sante">L'abus d'alcool est dangereux pour la santé, à consommer avec modération.</p></section>`,
  }),
  sec({
    id: "tn-discussion", title: "Discuter avec la marque", kind: "Fenêtre · tout le site", role: "contact", group: "partout",
    does: "Une petite bulle pour discuter avec la marque, qui dit franchement qui répond (une personne ou un robot) et quand. Elle ne s'ouvre jamais toute seule. Dessinée dans la page : le Studio la fixe en bas de l'écran. Seulement si quelqu'un répond vraiment.",
    trait: { fond: "clair", densite: "dense", photos: 0, hauteur: 300 },
    data: "qui répond (une personne ou un robot), son prénom et ses horaires de réponse",
    html: `<section class="tn tn-discussion" data-tn-discussion><div class="tn-bulle"><h2>Une question&nbsp;?</h2><p>C'est une personne qui te répond, pas un robot : [À compléter : prénom].</p><small>[À compléter : horaires de réponse]</small>${bouton("Discuter", "contact")}</div></section>`,
  }),
];

/** Des ouvertures et un pied de page de plus, pour que deux sites ne commencent ni ne finissent pareil. */
const OUVERTURES: TenueSection[] = [
  sec({
    id: "tn-ouverture-nom", title: "Ouverture au nom de la marque", kind: "Ouverture · accueil", role: "ouverture",
    does: "Le premier écran de l'accueil signé par le nom de la marque, écrit sur toute la largeur et coupé par une photo en hauteur ; puis le titre, une phrase et un seul bouton. Pour un nom court (une dizaine de lettres au plus) que l'on veut installer ; la photo est une scène, son sujet au centre.",
    trait: { fond: "clair", densite: "aérée", photos: 1, hauteur: 700 },
    anim: "Le nom s'ajuste tout seul à la largeur de l'écran.",
    html: `<section class="tn tn-ouverture-nom"><p class="tn-geant" aria-hidden="true"><span>Brindi</span></p>${photo("infusion.jpg")}<h1>Le thé qui prend son temps.</h1><div class="tn-bas"><p>Des feuilles entières, de vraies fleurs, et une pause rien qu'à toi.</p>${bouton("Choisir mon mélange", "shop")}</div></section>`,
  }),
  sec({
    id: "tn-ouverture-collage", title: "Ouverture en collage", kind: "Ouverture · accueil", role: "ouverture",
    does: "Le premier écran de l'accueil en trois photos de scène qui se chevauchent, sous un grand titre, avec une phrase et un seul bouton. Pour une marque qui a plusieurs choses à montrer d'un coup (trois moments, trois matières, trois lieux) ; trois sujets différents, jamais trois fois le produit.",
    trait: { fond: "clair", densite: "moyenne", photos: 3, hauteur: 760 },
    html: `<section class="tn tn-ouverture-collage"><h1>Trois façons de ralentir.</h1><div class="tn-colle">${photo("fenetre.jpg")}${photo("seches.jpg")}${photo("bol.jpg")}</div><div class="tn-bas"><p>Un thé pour le matin, un pour l'après-midi, un pour le soir. Choisis l'heure, on s'occupe du reste.</p>${bouton("Voir les mélanges", "shop")}</div></section>`,
  }),
  sec({
    id: "tn-ouverture-carte", title: "Ouverture à la carte posée", kind: "Ouverture · accueil", role: "ouverture",
    does: "Le premier écran de l'accueil en photo pleine, le titre, la phrase et le bouton sur une carte posée en bas de la photo. La photo garde son sujet dans la moitié haute, plutôt à droite : la carte (en bas sur téléphone, en bas à gauche sur grand écran) ne le couvre jamais.",
    trait: { fond: "photo", densite: "aérée", photos: 1, hauteur: 720 },
    html: `<section class="tn tn-ouverture-carte">${photo("hero.jpg", false)}<div class="tn-carte"><h1>Pose ta tasse.<br>Le reste attendra.</h1><p>Des thés en feuilles entières, pour les pauses qui comptent.</p>${bouton("Choisir mon mélange", "shop")}</div></section>`,
  }),
  sec({
    id: "tn-ouverture-formes", title: "Ouverture aux formes rondes", kind: "Ouverture · accueil", role: "ouverture",
    does: "Le premier écran de l'accueil pour une marque joyeuse ou jeune : de grandes formes rondes et pleines aux couleurs de la marque, la photo du produit en scène découpée dans l'une d'elles, un titre très gras, une phrase et un seul bouton. Les formes bougent à peine. La photo est une scène, son sujet au centre : la forme rogne ses bords.",
    trait: { fond: "clair", densite: "aérée", photos: 1, hauteur: 740 },
    anim: "Les formes flottent très lentement (immobiles si le visiteur a demandé moins de mouvement).",
    html: `<section class="tn tn-ouverture-formes"><div class="tn-scene"><i class="tn-f1" aria-hidden="true"></i><i class="tn-f2" aria-hidden="true"></i><i class="tn-f3" aria-hidden="true"></i>${photo("tasse-fruits.jpg", false)}</div><h1>Glacé, fruité,<br>prêt en un geste.</h1><div class="tn-bas"><p>De vrais morceaux de fruits, de l'eau froide, et l'été tient dans un verre.</p>${bouton("Goûter l'été", "shop")}</div></section>`,
  }),
  sec({
    id: "tn-ouverture-flou", title: "Ouverture en lueurs qui bougent", kind: "Ouverture · accueil", role: "ouverture", pour: "services",
    does: "Le premier écran d'un studio, d'une agence ou d'un métier de création qui n'a pas de photo à montrer d'entrée : un fond sombre où de grandes lueurs aux couleurs de la marque glissent lentement, le métier en petit, une seule phrase en très grand tout en bas, une ligne et un bouton. Aucune photo. Exemple : un studio de création.",
    trait: { fond: "sombre", densite: "aérée", photos: 0, hauteur: 620 },
    anim: "Les lueurs glissent lentement (immobiles si le visiteur a demandé moins de mouvement).",
    html: `<section class="tn tn-ouverture-flou tn-sombre"><div class="tn-lueurs" aria-hidden="true"><i></i><i></i><i></i></div><div class="tn-bas"><small>Studio de création · [À compléter : ville]</small><h1>Ce qui n'existe pas encore, on le dessine.</h1><p>Une identité, un site, des images : on part d'une feuille blanche et on s'arrête quand c'est juste.</p>${bouton("Parler de ton projet", "contact")}</div></section>`,
  }),
  sec({
    id: "tn-pied-complet", title: "Pied de page complet", kind: "Pied de page · tout le site", role: "pied de page",
    does: "Le pied de page complet, sombre : le nom et la phrase de la marque, l'inscription à la lettre, les liens rangés en trois colonnes (la boutique, l'aide, les textes légaux et « Gérer mes cookies »), les moyens de paiement réellement acceptés. Seuls les liens des pages qui existent restent.",
    constructions: [
      { key: "colonnes", label: "le nom et l'inscription d'un côté, les liens en colonnes de l'autre" },
      { key: "grand-nom", label: "les liens en colonnes, puis le nom de la marque en très grand tout en bas" },
      { key: "centre", label: "tout centré : le nom, l'inscription, les liens sur une ligne" },
    ],
    trait: { fond: "sombre", densite: "dense", photos: 0, hauteur: 720 },
    data: "les moyens de paiement acceptés par la boutique",
    html: `<footer class="tn tn-pied-complet tn-sombre"><div class="tn-tete"><span class="tn-nom">Brindi</span><p>Des thés en feuilles entières, pour les pauses qui comptent.</p></div><form class="tn-form" onsubmit="return false"><b>Notre lettre</b>${champ("Ton e-mail", "email", "email")}<button type="submit" class="tn-ok">Je m'inscris</button></form><nav class="tn-cols"><div><b>La boutique</b>${lien("Tous les mélanges", "shop", "tn-l")}${lien("Notre histoire", "about", "tn-l")}${lien("Le journal", "journal", "tn-l")}</div><div><b>L'aide</b>${lien("Questions fréquentes", "aide", "tn-l")}${lien("Suivre ma commande", "aide", "tn-l")}${lien("Nous écrire", "contact", "tn-l")}</div><div><b>En clair</b>${lien("Mentions légales", "legal", "tn-l")}${lien("Conditions de vente", "legal", "tn-l")}${lien("Confidentialité", "legal", "tn-l")}${lien("Gérer mes cookies", undefined, "tn-l")}</div></nav><div class="tn-fin"><span data-tn-paiements>Paiement : [À compléter : moyens de paiement acceptés]</span><span>© Brindi</span></div><p class="tn-geant" aria-hidden="true"><span>Brindi</span></p></footer>`,
  }),
];

export const RECIT_SECTIONS: TenueSection[] = [...RECIT, ...PAGES, ...FENETRES, ...OUVERTURES];
