/**
 * Sections à tenue du produit, de l'achat et du catalogue (thème sur mesure). Feuille : public/sections/tenue-produit.css. Règles d'écriture :
 * docs/sina-savoir/sections-a-tenue.md. Gratuit, sans IA.
 *
 * Les textes sont des exemples (une maison de thé ; une section réservée à un genre de produit prend l'exemple de ce
 * genre et le dit). Rien d'inventé : un prix, une mesure, une note, un avis, une étude s'écrivent « [À compléter : …] ».
 * Une même section se bâtit de plusieurs façons sans changer de balisage : un groupe qui se replie est une case cochée
 * cachée dans son étiquette (aucun script), lue par la feuille.
 */
import { VOLET, ph, sec, type TenueSection } from "./tenue-base";

/** Lien d'exemple : il ne quitte pas la page ; « go » est la clé de la page visée. */
const A = (go?: string) => `href="#" onclick="return false"${go ? ` data-go="${go}"` : ""}`;
/** Ce que le dossier ne donne pas : affiché en jaune dans le Studio, jamais inventé. */
const M = (what?: string) => `[À compléter${what ? ` : ${what}` : ""}]`;
/** Ligne « nom, valeur » d'une fiche. */
const L = (label: string, value: string) => `<li><span>${label}</span><b>${value}</b></li>`;
/** Pièce ou ingrédient illustré : sa photo dans le cadre de la marque, son nom, une ligne. */
const PIECE = (file: string, name: string, line: string) => `<li><div class="tn-ph tn-cadre" ${ph(file)}></div><div><b>${name}</b><span>${line}</span></div></li>`;
/** Document à consulter : son nom, sa précision (organisme, date), « Lire ». Le Studio pose l'adresse du vrai document. */
const DOC = (name: string, detail: string) => `<li><a ${A()}><b>${name}</b><span>${detail}</span><em>Lire</em></a></li>`;
/** Source numérotée (le numéro est posé par la feuille) : l'affirmation, sa source, le lien pour la lire. */
const SOURCE = (claim: string, source: string) => `<li><p>${claim}</p><span>${source}</span><a ${A()}>Lire la source</a></li>`;
/** Étape du calendrier des effets : l'échéance, l'effet mesuré, l'étude qui le montre. */
const EFFET = (when: string) => `<li><b>${when}</b><span>${M("effet mesuré")}</span><small>${M("étude et date")}</small></li>`;

/** Ligne du barème de ration : la gamelle (dessinée par la feuille), l'animal, son poids, sa ration. */
const RATION = (who: string) => `<li><i></i><b>${who}</b><span>${M("poids")}</span><em>${M("ration")}</em></li>`;
/** Bande du calendrier : son nom, puis le mois de début et le mois de fin (1 à 12) dans les variables --debut et --fin. */
const BANDE = (label: string, from: number, to: number) => `<li><span>${label}</span><i style="--debut:${from};--fin:${to}"></i></li>`;

/** Critère du comparatif : son nom, puis une valeur par produit, dans l'ordre des produits. */
const CRITERE = (label: string, values: string[]) => `<div class="tn-critere"><small>${label}</small><p>${values.map((v) => `<span>${v}</span>`).join("")}</p></div>`;
/** Avis d'un client (jamais inventé), avec ou sans la réponse publiée par la marque. */
const AVIS = (reply = false) => `<li><blockquote>${M("avis d'un client")}</blockquote><span>${M("prénom et date")}</span>${reply ? `<div class="tn-reponse"><small>La réponse de Brindi</small><p>${M("réponse publiée")}</p></div>` : ""}</li>`;
/** Carte produit du catalogue : même balisage que les cartes du socle (le Studio les remplace par les vrais produits). */
const CARTE = (file: string, name: string, extra = "", state = "") => `<a class="tn-carte-p${state ? " tn-epuise" : ""}" ${A("product")}><div class="tn-ph" ${ph(file)}></div>${extra}<b>${name}</b><span>${M("prix")}</span>${state ? `<em>${state}</em>` : ""}</a>`;
/** Pastilles de couleur d'une carte : une par variante, sa teinte dans la variable --teinte. */
const PASTILLES = (teintes: string[]) => `<i class="tn-pastilles">${teintes.map((t) => `<u style="--teinte:${t}"></u>`).join("")}</i>`;
/** Case d'un filtre, et filtre choisi rappelé au-dessus de la liste. */
const CASE = (label: string, on = false) => `<label><input type="checkbox"${on ? " checked" : ""}><span>${label}</span></label>`;
/** Famille de produits : la photo d'un de ses produits dans le cadre de la marque, son nom, une ligne. */
const RAYON = (file: string, name: string, line: string) => `<a ${A("shop")}><div class="tn-ph tn-cadre" ${ph(file)}></div><b>${name}</b><span>${line}</span></a>`;
/** Petits dessins au trait (un seul style) : le colis, le retour, la carte de paiement. */
const TRAIT = (d: string) => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
const DESSIN = {
  colis: TRAIT(`<path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z"/><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9"/>`),
  retour: TRAIT(`<path d="M8 5 4 9l4 4"/><path d="M4 9h10.5a5 5 0 0 1 0 10H9"/>`),
  carte: TRAIT(`<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M3 10h18M6.5 15h4"/>`),
};

export const PRODUIT_SECTIONS: TenueSection[] = [
  sec({
    id: "tn-fiche-technique", title: "Fiche technique", kind: "Caractéristiques · fiche produit", role: "produit",
    does: "Les caractéristiques vraies du produit, rangées par groupes : ce que c'est, d'où il vient, ses mesures, son poids, sa matière, comment le garder. À prendre dès que le client donne des faits précis ; une valeur qu'il n'a pas donnée s'écrit « [À compléter] ».",
    constructions: [{ key: "tableau", label: "un tableau à deux colonnes, le nom du groupe en tête (à gauche sur grand écran)" }, { key: "tuiles", label: "des tuiles, le nom en petit et la valeur en grand" }, { key: "volets", label: "un volet à déplier par groupe, le premier ouvert" }],
    trait: { fond: "clair", densite: "dense", photos: 0, hauteur: 670 }, anim: "Dans la construction en volets, chaque groupe s'ouvre au toucher.",
    html: `<section class="tn tn-fiche-technique"><h2>Sa fiche.</h2><div class="tn-groupe"><label><input type="checkbox" checked>L'essentiel</label><ul>${L("Ce que c'est", "Thé vert aux fleurs de jasmin")}${L("Origine", M("région et pays"))}${L("Récolte", M("saison"))}</ul></div><div class="tn-groupe"><label><input type="checkbox">Dans le sachet</label><ul>${L("Poids net", M("poids"))}${L("Nombre de tasses", M())}${L("Fermeture", "Un sachet qui se referme")}</ul></div><div class="tn-groupe"><label><input type="checkbox">À la maison</label><ul>${L("Conservation", "À l'abri de la lumière")}${L("À boire avant", M("date"))}</ul></div></section>`,
  }),
  sec({
    id: "tn-colis", title: "Dans le colis", kind: "Contenu · fiche produit", role: "produit",
    does: "Tout ce qui est livré, pièce par pièce, avec la photo de chacune ; ce qui est en option est mis à part, en dessous. Répond à « qu'est-ce que je reçois exactement ? ». Demande le contenu exact du colis ; une option sans prix s'écrit « [À compléter] ».",
    constructions: [{ key: "liste", label: "une liste illustrée, une ligne par pièce" }, { key: "grille", label: "des vignettes en grille, le nom dessous" }],
    trait: { fond: "clair", densite: "moyenne", photos: 3, hauteur: 670 },
    html: `<section class="tn tn-colis"><h2>Dans le colis.</h2><p class="tn-chapo">Tout ce que tu reçois, pièce par pièce.</p><ul class="tn-pieces">${PIECE("sachet-bois.jpg", "Le sachet de thé", "Des feuilles entières, dans un sachet qui se referme.")}${PIECE("infuseur.jpg", "L'infuseur et sa cuillère", "Une cuillère rase, une tasse.")}${PIECE("rooibos.jpg", "Un mélange à découvrir", M("lequel"))}</ul><div class="tn-en-plus"><small>En option</small><ul>${L("La boîte en métal", M("prix"))}${L("Le paquet cadeau", M("prix"))}</ul></div></section>`,
  }),
  sec({
    id: "tn-pour-qui", title: "Pour qui, pas pour qui", kind: "Franchise · fiche produit", role: "produit",
    does: "Deux listes franches : « fait pour toi si… » et « pas fait pour toi si… ». Elle rassure parce qu'elle ose dire à qui le produit ne convient pas. Demande le public visé et les limites connues du produit.",
    constructions: [{ key: "listes", label: "deux listes cochées et barrées, côte à côte sur grand écran" }, { key: "panneaux", label: "deux panneaux pleins : un sombre pour le oui, un bordé pour le non" }],
    trait: { fond: "clair", densite: "moyenne", photos: 0, hauteur: 520 },
    html: `<section class="tn tn-pour-qui"><h2>Soyons francs.</h2><div class="tn-deux"><div class="tn-oui"><b>Fait pour toi si…</b><ul><li>Tu cherches une vraie pause dans l'après-midi.</li><li>Tu aimes les parfums de fleurs, tout en douceur.</li><li>Tu bois ton thé sans sucre.</li></ul></div><div class="tn-non"><b>Pas fait pour toi si…</b><ul><li>Tu veux un thé corsé, qui réveille.</li><li>Tu n'aimes pas les notes fleuries.</li></ul></div></div></section>`,
  }),
  sec({
    id: "tn-essayer", title: "Essayer avant d'acheter", kind: "Essai · fiche produit et accueil", role: "confiance",
    does: "Les vraies façons d'essayer avant de commander : un échantillon, un kit d'essai, un passage en boutique. Une photo dans le cadre de la marque, chaque façon sur sa ligne, un bouton. Seulement si le client propose vraiment un essai : lieux, contenu et prix s'écrivent « [À compléter] ».",
    trait: { fond: "clair", densite: "moyenne", photos: 1, hauteur: 720 },
    html: `<section class="tn tn-essayer"><h2>Goûte avant de choisir.</h2><p class="tn-chapo">Pas sûr du parfum ? Commence petit, tranquillement, chez toi.</p><div class="tn-ph tn-cadre" ${ph("trois-bols.jpg")}></div><ul><li><b>Le sachet découverte</b><span>${M("contenu et prix de l'échantillon")}</span></li><li><b>À la boutique</b><span>${M("adresse et horaires")}</span></li></ul><a class="tn-bt" ${A("contact")}>Demander un échantillon</a></section>`,
  }),
  sec({
    id: "tn-echelle", title: "À l'échelle", kind: "Taille réelle · fiche produit", role: "produit",
    does: "Le produit montré à côté d'un objet que tout le monde connaît (une main, une tasse, un livre), bordé d'une règle dessinée, avec ses vraies dimensions dessous. Répond à « c'est grand comment ? ». Les dimensions que le client n'a pas données s'écrivent « [À compléter] ».",
    trait: { fond: "clair", densite: "moyenne", photos: 1, hauteur: 500 },
    html: `<section class="tn tn-echelle"><h2>À sa vraie taille.</h2><figure><div class="tn-regle"><div class="tn-ph tn-cadre" ${ph("bureau.jpg")}></div></div><figcaption>Posé à côté d'une tasse et d'un livre.</figcaption></figure><ul>${L("Hauteur", M())}${L("Largeur", M())}${L("Poids", M())}</ul></section>`,
  }),
  sec({
    id: "tn-valeurs", title: "Tableau des valeurs", kind: "Valeurs · fiche produit", role: "produit",
    does: "Le tableau des valeurs du produit (nutrition, apports, constituants analysés), présenté comme l'étiquette au dos d'un paquet : par portion et en part des apports de référence. Chaque valeur vient de la fiche ou de l'analyse du client : tout s'écrit « [À compléter] » tant qu'il ne l'a pas donnée.",
    trait: { fond: "clair", densite: "dense", photos: 0, hauteur: 470 },
    html: `<section class="tn tn-valeurs"><div class="tn-etiquette"><div class="tn-tete"><h2>Ses valeurs.</h2><p>Pour une tasse&nbsp;: ${M("portion")}</p></div><table><thead><tr><th></th><th>Par tasse</th><th>Apports de référence</th></tr></thead><tbody><tr><th>Énergie</th><td>${M()}</td><td>${M()}</td></tr><tr><th>Théine</th><td>${M()}</td><td>${M()}</td></tr><tr><th>Glucides</th><td>${M()}</td><td>${M()}</td></tr><tr class="tn-dont"><th>dont sucres</th><td>${M()}</td><td>${M()}</td></tr><tr><th>Sel</th><td>${M()}</td><td>${M()}</td></tr></tbody></table><p class="tn-source">Valeurs tirées de ${M("analyse du produit et sa date")}</p></div></section>`,
  }),
  sec({
    id: "tn-documents", title: "Analyses et documents à consulter", kind: "Preuves · fiche produit", role: "confiance",
    does: "Les documents que le client peut montrer : analyse du lot, certificat, fiche du producteur, fiche de sécurité. Chaque ligne ouvre le vrai document. Jamais posée sans au moins un document fourni : un nom d'organisme, un numéro ou une date qui manquent s'écrivent « [À compléter] ».",
    constructions: [{ key: "liste", label: "une ligne par document, « Lire » à droite" }, { key: "feuilles", label: "des feuilles au coin plié, posées côte à côte" }],
    trait: { fond: "clair", densite: "moyenne", photos: 0, hauteur: 400 }, data: "les documents fournis par le client (analyses, certificats, fiches)",
    html: `<section class="tn tn-documents"><h2>Noir sur blanc.</h2><p class="tn-chapo">Les analyses et les certificats de ce thé, à lire en entier.</p><ul data-tn-documents>${DOC("Analyse du lot", M("laboratoire et date"))}${DOC("Certificat biologique", M("organisme et numéro"))}${DOC("Fiche du producteur", M("nom et région"))}</ul></section>`,
  }),
  sec({
    id: "tn-preuves", title: "D'où viennent nos preuves", kind: "Sources · fiche produit et pages", role: "confiance",
    does: "Les sources de ce que le site affirme, numérotées : chaque affirmation, puis son étude, son certificat ou sa précision, et le lien pour la lire. À prendre quand la marque promet quelque chose qui se prouve. Une source que le client n'a pas donnée s'écrit « [À compléter] » ; sans source, l'affirmation se retire.",
    constructions: [{ key: "liste", label: "la liste des sources, ouverte, numérotée" }, { key: "tiroir", label: "un tiroir fermé « Voir nos sources », qui s'ouvre au toucher" }],
    trait: { fond: "clair", densite: "moyenne", photos: 0, hauteur: 590 }, anim: "Dans la construction en tiroir, les sources s'ouvrent au toucher.",
    html: `<section class="tn tn-preuves"><h2>D'où viennent nos preuves.</h2><p class="tn-chapo">Chaque chose que nous affirmons a sa source. Les voici, une par une.</p><label class="tn-tiroir"><input type="checkbox">Voir nos sources</label><ol>${SOURCE("Tout est bio.", M("certificat, organisme et numéro"))}${SOURCE("Des feuilles entières, roulées à la main.", M("fiche du producteur"))}${SOURCE("Assemblé par petites quantités, à la commande.", M("ce qui le montre"))}</ol></section>`,
  }),
  sec({
    id: "tn-accords", title: "Accords : avec, et à éviter", kind: "Conseils · fiche produit", role: "produit",
    does: "Avec quoi servir ou associer le produit, et ce qu'il vaut mieux éviter : deux listes courtes, chacune avec sa raison. Pour ce qui se goûte, se boit, se porte ou s'applique. Ce sont les conseils du client (dégustation, formule) : jamais inventés.",
    constructions: [{ key: "carte", label: "une carte de restaurant : les accords en grand, centrés, leur raison dessous" }, { key: "etiquettes", label: "des étiquettes en nuage, celles à éviter barrées" }],
    trait: { fond: "clair", densite: "aérée", photos: 0, hauteur: 700 },
    html: `<section class="tn tn-accords"><h2>Avec quoi le boire.</h2><div class="tn-avec"><small>Il aime</small><ul><li><b>Un sablé au beurre</b><span>Le jasmin adoucit le sucre.</span></li><li><b>Des fruits frais</b><span>Une pêche, quelques fraises.</span></li><li><b>Un carré de chocolat blanc</b><span>Fleur contre douceur.</span></li></ul></div><div class="tn-sans"><small>Il vaut mieux éviter</small><ul><li><b>Le lait</b><span>Il couvre les fleurs.</span></li><li><b>Le citron</b><span>Trop vif pour lui.</span></li></ul></div></section>`,
  }),
  sec({
    id: "tn-notes", title: "Notes en trois temps", kind: "Parfum et goût · fiche produit", role: "produit", only: "parfums, bougies, vins, bières et spiritueux",
    does: "Le produit décrit en trois temps : notes de tête, de cœur et de fond pour un parfum ou une bougie ; l'œil, le nez, la bouche pour un vin ou une bière. L'exemple est celui d'une bougie parfumée. Demande la formule olfactive ou les notes de dégustation du client.",
    constructions: [{ key: "pyramide", label: "une pyramide en trois étages, du plus léger au plus profond" }, { key: "colonnes", label: "trois colonnes séparées d'un trait (trois lignes sur téléphone)" }],
    trait: { fond: "clair", densite: "moyenne", photos: 0, hauteur: 550 },
    html: `<section class="tn tn-notes"><h2>Trois temps, une bougie.</h2><p class="tn-chapo">Ce que tu sens à l'allumage, ce qui s'installe ensuite, et ce qui reste dans la pièce.</p><ol><li><small>Notes de tête</small><b>Bergamote, zeste de citron</b><span>Ce qui arrive en premier, vif et léger.</span></li><li><small>Notes de cœur</small><b>Jasmin, thé vert</b><span>Le parfum qui s'installe.</span></li><li><small>Notes de fond</small><b>Cèdre, musc blanc</b><span>Ce qui reste, la flamme éteinte.</span></li></ol></section>`,
  }),
  sec({
    id: "tn-grade", title: "La note expliquée", kind: "Note ou grade · fiche produit", role: "produit", only: "cafés, thés, miels et produits notés",
    does: "La note ou le grade officiel du produit dans un sceau, puis ce qu'il regarde, critère par critère, et un volet « qui donne cette note ? ». L'exemple est celui d'un thé. La note, celui qui la donne et sa méthode viennent du client : tout s'écrit « [À compléter] » sinon.",
    trait: { fond: "clair", densite: "moyenne", photos: 0, hauteur: 680 }, anim: "Le volet « qui donne cette note ? » s'ouvre au toucher.",
    html: `<section class="tn tn-grade"><div class="tn-sceau"><b>${M("note")}</b><span>${M("qui la donne")}</span></div><h2>Sa note, expliquée.</h2><p class="tn-chapo">Une note ne dit rien si on ne sait pas qui la donne, ni ce qu'elle regarde. Voici ce que compte celle-ci.</p><ul><li><b>La feuille</b><span>Entière, régulière, sans brisures.</span></li><li><b>La tasse</b><span>Sa couleur, son parfum, ce qui reste en bouche.</span></li><li><b>La cueillette</b><span>${M("saison et méthode")}</span></li></ul>${VOLET("Qui donne cette note ?", M("organisme, méthode, date"))}</section>`,
  }),
  sec({
    id: "tn-effets", title: "Calendrier des effets", kind: "Frise · fiche produit", role: "produit", only: "compléments alimentaires et cosmétiques",
    does: "Une frise honnête : ce qui est attendu après une semaine, un mois, trois mois, chaque étape avec l'étude qui le montre. L'exemple est celui d'un soin. Les échéances, les effets et les études viennent du client ; sans étude, l'étape ne s'affiche pas.",
    trait: { fond: "clair", densite: "moyenne", photos: 0, hauteur: 500 },
    html: `<section class="tn tn-effets"><h2>Ce qui change, et quand.</h2><p class="tn-chapo">Pas de miracle en une nuit. Voici ce que montrent les études, étape par étape.</p><ol>${EFFET("Sept jours")}${EFFET("Un mois")}${EFFET("Trois mois")}</ol></section>`,
  }),
  sec({
    id: "tn-cout", title: "Coût et durée dans le temps", kind: "Coût à l'usage · fiche produit", role: "produit",
    does: "Ce que le produit coûte à l'usage (par tasse, par lavage, par année) et combien de temps il dure, en deux ou trois grands chiffres, avec un volet « comment nous avons compté ». Pour un produit qui paraît cher à l'achat et ne l'est pas à l'usage. Chiffres et hypothèses viennent du client : « [À compléter] » sinon.",
    trait: { fond: "clair", densite: "aérée", photos: 0, hauteur: 350 }, anim: "Le volet « comment nous avons compté » s'ouvre au toucher.",
    html: `<section class="tn tn-cout"><h2>Ce qu'il coûte vraiment.</h2><p class="tn-chapo">Un sachet dure. Ramené à la tasse, le compte est vite fait.</p><ul><li><small>La tasse</small><b>${M("prix par tasse")}</b></li><li><small>Un sachet dure</small><b>${M("durée")}</b></li></ul>${VOLET("Comment nous avons compté", M("prix du sachet, nombre de tasses, rythme"))}</section>`,
  }),
  sec({
    id: "tn-ration", title: "Ration selon le poids", kind: "Barème · fiche produit", role: "produit", only: "aliments pour animaux",
    does: "La ration d'une journée selon le poids de l'animal, en lignes : une gamelle dessinée qui grandit, le poids, la quantité. L'exemple est celui de croquettes pour chien. Le barème est celui du fabricant : chaque poids et chaque quantité s'écrivent « [À compléter] » tant que le client ne les a pas donnés.",
    trait: { fond: "clair", densite: "moyenne", photos: 0, hauteur: 540 },
    html: `<section class="tn tn-ration"><h2>Combien lui en donner.</h2><p class="tn-chapo">La ration d'une journée, selon son poids.</p><ul>${RATION("Petit chien")}${RATION("Chien moyen")}${RATION("Grand chien")}${RATION("Très grand chien")}</ul><p class="tn-note">Barème du fabricant&nbsp;: ${M("source")}. Un chien très actif, âgé ou en surpoids n'a pas les mêmes besoins&nbsp;: demande à ton vétérinaire.</p></section>`,
  }),
  sec({
    id: "tn-prix-explique", title: "Pourquoi ce prix", kind: "Transparence · fiche produit et à propos", role: "confiance",
    does: "Le prix décomposé poste par poste (matière, fabrication, transport, ce qui fait vivre la marque), jusqu'au prix payé. Pour une marque qui fait de sa transparence un argument. Les montants sont les vrais coûts du client, « [À compléter] » sinon ; la part de chaque poste (variable --part, 0 à 100) ne se pose qu'avec eux.",
    constructions: [{ key: "ticket", label: "un ticket de caisse, une ligne par poste, le total en bas" }, { key: "couches", label: "le prix en couches empilées, chaque poste à sa hauteur" }],
    trait: { fond: "clair", densite: "moyenne", photos: 0, hauteur: 470 },
    html: `<section class="tn tn-prix-explique"><h2>Pourquoi ce prix.</h2><p class="tn-chapo">Voici où va ton argent quand tu achètes un sachet.</p><div class="tn-ticket"><ul>${L("Le thé, payé au producteur", M())}${L("L'assemblage et le sachet", M())}${L("Le transport", M())}${L("Ce qui fait vivre Brindi", M())}</ul><p class="tn-total"><span>Le prix du sachet</span><b>${M("prix")}</b></p></div></section>`,
  }),
  sec({
    id: "tn-preparation", title: "La préparation en étapes", kind: "Mode d'emploi · fiche produit", role: "contenu",
    does: "La préparation ou le mode d'emploi, étape par étape, numérotée, avec une photo du geste. Chaque étape tient en un verbe et une phrase. Quantités, températures et durées viennent du client : « [À compléter] » sinon. Une étape qui a une vraie durée peut recevoir un minuteur (attribut data-tn-minuteur, en secondes).",
    constructions: [{ key: "liste", label: "les étapes l'une sous l'autre, le numéro en grand à gauche" }, { key: "file", label: "une file de cartes à faire glisser, une étape par carte" }],
    trait: { fond: "clair", densite: "moyenne", photos: 1, hauteur: 820 }, anim: "Dans la construction en file, les étapes glissent du doigt. Un minuteur se lance au toucher quand l'étape a une durée.",
    html: `<section class="tn tn-preparation"><h2>Comment le préparer.</h2><div class="tn-ph tn-cadre" ${ph("infusion.jpg")}></div><ol><li><b>Dose</b><span>Une cuillère par tasse, dans l'infuseur.</span></li><li><b>Verse</b><span>De l'eau frémissante, jamais bouillante&nbsp;: ${M("température")}</span></li><li><b>Attends</b><span>Regarde les feuilles s'ouvrir&nbsp;: ${M("durée d'infusion")}</span></li><li><b>Bois</b><span>Sans sucre, pour sentir le jasmin.</span></li></ol></section>`,
  }),
  sec({
    id: "tn-transition", title: "Transition sur sept jours", kind: "Schéma · fiche produit", role: "produit", only: "aliments pour animaux",
    does: "Le schéma du passage à un nouvel aliment : une barre par jour, la part du nouvel aliment qui monte. L'exemple est celui de croquettes ; les parts dessinées ne sont qu'un exemple de forme. Le protocole (jours, part de chaque jour) est celui du fabricant : le Studio le pose dans la variable --part de chaque barre.",
    trait: { fond: "clair", densite: "moyenne", photos: 0, hauteur: 520 },
    html: `<section class="tn tn-transition"><h2>Change en douceur.</h2><p class="tn-chapo">Un peu du nouvel aliment dans l'ancien, puis un peu plus chaque jour. Son ventre a le temps de s'habituer.</p><ol>${[25, 25, 50, 50, 75, 75, 100].map((part) => `<li style="--part:${part}%"></li>`).join("")}</ol><ul><li>L'ancien aliment</li><li>Le nouveau</li></ul><p class="tn-note">La part de chaque jour&nbsp;: ${M("protocole du fabricant")}</p></section>`,
  }),
  sec({
    id: "tn-semis", title: "Calendrier de semis et de récolte", kind: "Schéma · fiche produit", role: "produit", only: "graines et plantes",
    does: "Les mois de semis, de plantation, de floraison et de récolte, en bandes sur les douze mois de l'année. L'exemple est celui d'un sachet de graines ; les mois dessinés ne sont qu'un exemple de forme. Les vraies périodes de la variété viennent du client : variables --debut et --fin (mois, de 1 à 12) de chaque bande.",
    trait: { fond: "clair", densite: "moyenne", photos: 0, hauteur: 520 },
    html: `<section class="tn tn-semis"><h2>Quand semer, quand récolter.</h2><div class="tn-annee"><ol>${"JFMAMJJASOND".split("").map((m) => `<li>${m}</li>`).join("")}</ol><ul>${BANDE("Semis sous abri", 2, 4)}${BANDE("Plantation", 5, 6)}${BANDE("Floraison", 6, 8)}${BANDE("Récolte", 7, 10)}</ul></div><p class="tn-note">Les périodes de cette variété&nbsp;: ${M("mois de semis, de plantation et de récolte")}</p></section>`,
  }),
  sec({
    id: "tn-composition", title: "Ce qu'il y a dedans", kind: "Composition · fiche produit", role: "produit",
    does: "Les ingrédients ou les matières du produit, un par un, chacun avec sa photo dans le cadre de la marque et une ligne. En dessous, ce que le produit ne contient pas, seulement si le client le dit. Demande la vraie liste, dans l'ordre ; rien n'est ajouté ni embelli.",
    constructions: [{ key: "alternee", label: "un ingrédient par ligne, la photo tantôt à gauche, tantôt à droite" }, { key: "bande", label: "les ingrédients côte à côte, en petites photos, le nom dessous" }],
    trait: { fond: "clair", densite: "moyenne", photos: 2, hauteur: 660 },
    html: `<section class="tn tn-composition"><h2>Ce qu'il y a dedans.</h2><ul>${PIECE("seches.jpg", "Du thé vert", "Des feuilles entières, roulées à la main.")}${PIECE("fleurs.jpg", "Des fleurs de jasmin", "De vraies fleurs, posées sur les feuilles.")}</ul><p class="tn-sans"><b>Ce qu'il n'y a pas</b><span>${M("ce que le produit ne contient pas, si tu le sais")}</span></p></section>`,
  }),
  sec({
    id: "tn-comparatif", title: "Comparer les produits de la gamme", kind: "Comparatif · fiche produit et boutique", role: "comparatif",
    does: "Deux ou trois produits de la gamme côte à côte, comparés sur des critères vrais : le moment, le goût, la matière, le prix. Chaque nom mène à sa fiche. Pour choisir entre des produits proches, jamais contre un concurrent. Un prix qui manque s'écrit « [À compléter] ».",
    trait: { fond: "clair", densite: "dense", photos: 0, hauteur: 510 }, data: "les produits du catalogue (noms et prix)",
    html: `<section class="tn tn-comparatif" data-tn-comparatif><h2>Lequel est pour toi ?</h2><div class="tn-table"><div class="tn-noms"><a ${A("product")}>Thé vert jasmin</a><a ${A("product")}>Rooibos vanille</a><a ${A("product")}>Verveine menthe</a></div>${CRITERE("Son moment", ["L'après-midi", "Le soir", "Après le repas"])}${CRITERE("Son goût", ["Fleuri, tout en douceur", "Rond, vanillé", "Frais, mentholé"])}${CRITERE("De la théine", ["Oui", "Non", "Non"])}${CRITERE("Son prix", [M("prix"), M("prix"), M("prix")])}</div></section>`,
  }),
  sec({
    id: "tn-avis", title: "Les avis des clients", kind: "Avis · fiche produit et accueil", role: "confiance",
    does: "Les vrais avis des clients, chacun avec son prénom et sa date, et sous un avis la réponse publiée par la marque, bien distincte. Aucun avis ni aucune note d'exemple : sans vrais avis, la section invite seulement à donner le premier. Une note en étoiles ne s'affiche que si elle vient avec l'avis.",
    constructions: [{ key: "liste", label: "les avis l'un sous l'autre, la réponse de la marque en retrait" }, { key: "en-grand", label: "le premier avis en très grand, les autres en petit dessous" }],
    trait: { fond: "clair", densite: "moyenne", photos: 0, hauteur: 470 }, data: "les vrais avis saisis par le client",
    html: `<section class="tn tn-avis"><h2>Ils l'ont goûté.</h2><ul data-tn-avis>${AVIS(true)}${AVIS()}${AVIS()}</ul><div class="tn-premier"><p>Personne n'a encore donné son avis ici.</p><a ${A("contact")}>Donner le premier avis</a></div></section>`,
  }),
  sec({
    id: "tn-catalogue", title: "La boutique : produits, filtres et tri", kind: "Catalogue · page boutique", role: "produits", group: "categorie",
    does: "La page boutique : le titre, « Filtrer » qui ouvre les filtres, le tri, les filtres choisis rappelés en étiquettes avec « Tout effacer », puis les vrais produits en cartes (vraie photo dans le cadre de la marque, nom, prix, couleurs en pastilles, mention « Épuisé »). Sans produit, elle le dit et propose de repartir.",
    constructions: [{ key: "grille", label: "les produits en grille de cartes, deux de front sur téléphone" }, { key: "liste", label: "un produit par ligne, la photo à gauche ; les filtres en colonne sur grand écran" }],
    trait: { fond: "clair", densite: "dense", photos: 4, hauteur: 870 }, data: "les produits du catalogue", anim: "Le volet des filtres s'ouvre au toucher ; un filtre choisi se retire d'un toucher.",
    html: `<section class="tn tn-catalogue" data-tn-produits><h1>Tous les mélanges.</h1><p class="tn-chapo">Thés, rooibos, infusions : choisis selon le moment.</p><div class="tn-outils"><label class="tn-filtrer"><input type="checkbox"><span>Filtrer</span></label><label class="tn-tri"><span>Trier par</span><select><option>Nouveautés</option><option>Prix croissant</option><option>Prix décroissant</option></select></label><div class="tn-filtres"><fieldset><legend>Famille</legend>${CASE("Thés verts", true)}${CASE("Rooibos")}${CASE("Infusions")}</fieldset><fieldset><legend>Moment</legend>${CASE("Le matin")}${CASE("L'après-midi")}${CASE("Le soir")}</fieldset><fieldset><legend>Disponibilité</legend>${CASE("En stock seulement", true)}</fieldset></div></div><div class="tn-choisis">${CASE("Thés verts")}${CASE("En stock seulement")}<label class="tn-effacer"><input type="checkbox"><span>Tout effacer</span></label></div><div class="tn-vide"><b>Rien ne correspond.</b><p>Aucun mélange ne réunit tous ces choix. Enlève un filtre, ou repars de l'ensemble.</p><a class="tn-bt" ${A("shop")}>Voir tous les mélanges</a></div><div class="tn-cartes">${CARTE("sachet.jpg", "Thé vert jasmin")}${CARTE("sachet-ouvert.jpg", "Rooibos vanille")}${CARTE("infuseur.jpg", "L'infuseur", PASTILLES(["var(--tn-accent)", "var(--tn-encre)", "var(--tn-doux)"]))}${CARTE("sachet-bois.jpg", "Verveine menthe", "", "Épuisé")}</div></section>`,
  }),
  sec({
    id: "tn-rayons", title: "Les familles de produits", kind: "Rayons · accueil et boutique", role: "rayons", cards: true,
    does: "Les grandes familles de la boutique, pour choisir par où commencer : la photo d'un produit de la famille dans le cadre de la marque, son nom, une ligne. Chaque famille mène à ses produits. À prendre dès qu'il y a au moins deux vraies familles ; jamais une famille inventée pour remplir.",
    constructions: [{ key: "grille", label: "une grille de photos encadrées, le nom dessous" }, { key: "bandes", label: "des bandes larges : le nom en grand à gauche, la photo à droite" }, { key: "mots", label: "une liste de mots en très grand, une petite photo devant chacun" }],
    trait: { fond: "clair", densite: "moyenne", photos: 4, hauteur: 680 }, data: "les familles de produits du catalogue",
    html: `<section class="tn tn-rayons"><h2>Par où commencer.</h2><div class="tn-familles" data-tn-rayons>${RAYON("jasmin.jpg", "Thés verts", "Frais, végétaux, pour l'après-midi.")}${RAYON("rooibos.jpg", "Rooibos", "Ronds, sans théine, pour le soir.")}${RAYON("hibiscus.jpg", "Infusions de fruits", "Acidulées, chaudes ou glacées.")}${RAYON("camomille.jpg", "Tisanes", "Douces, pour finir la journée.")}</div></section>`,
  }),
  sec({
    id: "tn-garanties", title: "Livraison, retours, paiement", kind: "Réassurance · fiche produit, panier et accueil", role: "confiance",
    does: "Ce qui rassure au moment d'acheter, dit simplement : la livraison, les retours, le paiement, chacun avec son petit dessin au trait et une phrase, puis un lien vers l'aide. Seulement ce que le client a donné : un délai, un prix ou une condition qui manque s'écrit « [À compléter] », jamais une promesse inventée.",
    constructions: [{ key: "lignes", label: "une ligne par sujet, le dessin à gauche (trois colonnes sur grand écran)" }, { key: "bande", label: "une bande de couleur douce, les trois sujets centrés" }],
    trait: { fond: "clair", densite: "moyenne", photos: 0, hauteur: 420 }, data: "la livraison et les retours saisis par le client",
    html: `<section class="tn tn-garanties"><h2>Sans mauvaise surprise.</h2><ul data-tn-garanties><li data-tn-cle="livraison">${DESSIN.colis}<b>Livraison</b><span>${M("délai et prix")}</span></li><li data-tn-cle="retours">${DESSIN.retour}<b>Retours</b><span>${M("délai et conditions")}</span></li><li data-tn-cle="paiement">${DESSIN.carte}<b>Paiement</b><span>${M("moyens acceptés")}</span></li></ul><a ${A("aide")}>Toutes les réponses dans l'aide</a></section>`,
  }),
];
