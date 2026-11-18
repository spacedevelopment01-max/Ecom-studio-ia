/**
 * Les PARTITIONS des pages importantes, en données (cahier `docs/sina-savoir/theme-ordre-et-variete.md`, décisions du
 * propriétaire du 16 novembre 2026 : « elle doit avoir plusieurs règles d'or pour avoir plusieurs disposition possible
 * des section », « je parle de toutes les pages importantes pas que l'accueil », « Il y a minimum 10 sections par
 * page », « Il faut aussi insisté pour que sina mélange et qu'elle prenne pas toujours la même regle »).
 *
 * Une partition est un ordre de départ : une suite de MOMENTS. Chaque moment garde son libellé du cahier, la question
 * du visiteur à laquelle il répond, et les pièces de la bibliothèque qui peuvent le tenir (identifiants réels, vérifiés
 * par un test). Un moment « sans pièce » n'aurait aucune pièce dans la bibliothèque : le concepteur le sauterait, il ne
 * serait jamais inventé (depuis le 17 novembre 2026 et le module tenue-partitions.ts, chaque moment du cahier a sa pièce). Une même pièce peut tenir plusieurs moments qui se suivent (la page boutique : titre, filtres,
 * produits).
 *
 * Source unique : les contrôles sans IA (ordre.ts), la consigne du concepteur, celles des juges et les « moments » des
 * styles de page (styles-de-page.ts) lisent ces données. Le cahier reste la source des mots du propriétaire : un test
 * vérifie que chaque partition de ses parties 3 et 4 est ici, dans le même ordre. Les partitions marquées
 * « ecrite » ne sont pas dans le cahier : elles ont été écrites pour atteindre trois partitions par page, dans le même
 * esprit, et restent à faire valider par le propriétaire.
 * Données et fonctions pures : sans IA, sans base.
 */
import type { PreuveId } from "./tenue-ordre";

// ════════════════════════════════════════════════════════════════ les règles d'or (texte unique)

/** Nombre minimal de sections d'une page importante (cahier, partie 1). */
export const MIN_SECTIONS_IMPORTANTE = 10;
/** Nombre maximal de sections d'une page utilitaire (panier, page introuvable, mentions légales, recherche, remerciement). */
export const MAX_SECTIONS_UTILITAIRE = 3;

/**
 * Les dix règles d'or, avec les mots du cahier (partie 2). Le MÊME texte est donné au concepteur, au juge de l'ordre et
 * au second regard : personne ne juge sur une autre version que celle que le concepteur a reçue.
 */
export const REGLES_D_OR = `LES DIX RÈGLES D'OR (toutes les pages importantes, tous les sites, boutiques comme services). Elles garantissent la qualité ; elles sont les mêmes pour tous : ce ne sont pas elles qui rendent les sites différents.
1. Le premier écran dit tout : ce qui est vendu, pour qui ou où, et l'action. Pour un service : la ville et le téléphone cliquable en plus.
2. La question qui bloque la décision arrive au plus tard en 3e position : pour un service à domicile, « tu viens jusque chez moi ? » ; pour une boutique, le prix et la livraison.
3. L'offre (produits ou prestations) arrive au plus tard en 3e position.
4. Une vraie preuve arrive avant la 5e section : avis réels, réalisations, assurances, diplômes, chiffres vrais. Jamais la marque qui se cite elle-même.
5. Le concret passe avant l'abstrait : aucune formule, citation ou conviction de marque tant que le visiteur ne sait pas ce qu'on vend et pourquoi y croire.
6. Le rythme alterne : jamais deux dispositions pareilles à la suite ; on alterne dense et aéré, image et texte, clair et sombre. Et une même allure ne revient jamais sur une page, même plus loin : deux étapes numérotées, deux textes et photos en alternance, deux listes, deux volets, c'est la même section vue deux fois pour le visiteur. Un moment qui demanderait la même allure qu'un autre prend une autre pièce de son moment.
7. Chaque rôle n'apparaît qu'une fois : une seule section de cartes par page, un seul « Produit vedette ».
8. Les doutes sont levés juste avant la fin : questions, garantie.
9. La page finit par l'action : réserver, demander un devis ou acheter, avec les coordonnées.
10. Chaque section répond à une question du visiteur, dans un ordre qui suit son raisonnement.
LE NOMBRE DE SECTIONS : au moins ${MIN_SECTIONS_IMPORTANTE} sections sur chaque page importante (accueil, fiches produit, pages de prestation, collections, réalisations, à propos, contact, questions). Chaque section répond à une vraie question du visiteur. Aucune section de remplissage, aucune section qui demande un contenu que le client n'a pas (avis, presse, chiffres, photos de clients) : un moment dont la preuve manque au dossier est SAUTÉ, jamais rempli. Les pages utilitaires restent courtes : panier, page introuvable, mentions légales, recherche, remerciement.`;

/** Règle de variété 3 du cahier : l'angle choisi par le client déplace les sections, dans les limites des règles d'or. */
export const ANGLE_DEPLACE = "L'ANGLE DÉPLACE LES SECTIONS, dans les limites des règles d'or : l'angle sûr fait monter les garanties, l'émotion le moment de vie, l'audace « nous et les autres ».";
export type AngleRole = "sur" | "emotion" | "audacieux";
export const ANGLE_MONTE: Record<AngleRole, string> = {
  sur: "angle SÛR : fais monter les garanties et les preuves, le plus haut que les règles d'or le permettent",
  emotion: "angle d'ÉMOTION : fais monter le moment de vie, juste après ce que le visiteur doit savoir d'abord (l'offre, la question qui bloque)",
  audacieux: "angle AUDACIEUX : fais monter « nous et les autres » (ce qui change par rapport à l'habitude), avec des faits prouvés seulement",
};

// ════════════════════════════════════════════════════════════════ les moments

export type Moment = {
  /** Clé de travail du moment (stable d'une partition à l'autre). */
  key: string;
  /** Son libellé, mot pour mot celui du cahier dans cette partition. */
  label: string;
  /** La question du visiteur à laquelle il répond. */
  question: string;
  /** Les pièces de la bibliothèque qui peuvent le tenir ; vide : « sans pièce », le concepteur le saute. */
  pieces: string[];
  /** Le moment n'existe qu'avec une de ces preuves réelles au dossier ; sinon il est sauté, jamais rempli. */
  preuves?: PreuveId[];
  /** Le moment n'existe qu'avec au moins ce nombre de produits au catalogue. */
  produitsMin?: number;
};
type MomentDef = Omit<Moment, "key" | "label">;
const m = (question: string, pieces: string[], extra: Partial<MomentDef> = {}): MomentDef => ({ question, pieces, ...extra });

const OUVERTURES = ["tn-ouverture", "tn-ouverture-carte", "tn-ouverture-metier", "tn-ouverture-vente"];
const AVIS = ["tn-avis", "tn-mur-avis", "tn-temoignages"];
const VIE = ["tn-places", "tn-texte-photo", "tn-mosaique", "tn-emotion"];
const FIN_SERVICE = ["tn-final", "tn-urgence", "tn-rdv", "tn-devis"];

/** Tous les moments des partitions. La question est celle du visiteur ; les pièces sont celles qui existent aujourd'hui. */
export const MOMENTS: Record<string, MomentDef> = {
  // ── communs
  ouverture: m("Suis-je au bon endroit : qu'est-ce qui est vendu, pour qui ou où, et que puis-je faire tout de suite ?", OUVERTURES),
  avis: m("Qu'en disent ceux qui sont passés avant moi ?", AVIS, { preuves: ["avis"] }),
  questions: m("Et mes dernières questions avant de me décider ?", ["tn-questions", "tn-questions-rubriques"]),
  final: m("Comment je fais, maintenant ?", FIN_SERVICE),
  lettre: m("Comment garder le lien sans acheter aujourd'hui ?", ["tn-infolettre", "tn-infolettre-photo"]),
  vie: m("À quoi ressemble la vie avec ce produit, ou ce moment chez toi ?", VIE),
  // ── services
  zone: m("Tu viens jusque chez moi, et sous quel délai ?", ["tn-zone"]),
  prestations: m("Que fais-tu exactement, et combien ça coûte ?", ["tn-prestations", "tn-tarifs"]),
  confiance: m("Puis-je te faire confiance ?", ["tn-labels", "tn-atouts", "tn-chiffres"]),
  realisations: m("Puis-je voir ce que tu as déjà fait ?", ["tn-realisations", "tn-avant-apres"]),
  "avant-apres": m("Qu'est-ce que ça change, avant et après ton passage ?", ["tn-avant-apres", "tn-realisations"]),
  deroule: m("Comment ça se passe, du premier contact à la fin ?", ["tn-deroule", "tn-comment"]),
  qui: m("Qui vais-je avoir en face de moi ?", ["tn-fondateur", "tn-equipe", "tn-texte-photo"]),
  garanties: m("Et si ça se passe mal ?", ["tn-labels", "tn-engagements"]),
  chiffres: m("Combien en as-tu déjà fait ?", ["tn-chiffres"], { preuves: ["chiffres"] }),
  "tarifs-detail": m("Quel est le prix exact pour mon cas ?", ["tn-tarifs", "tn-exemples-prix"]),
  creneaux: m("Quand puis-je venir ?", ["tn-rdv", "tn-rdv-complet", "tn-agenda", "tn-planning", "tn-disponibilites"]),
  lieu: m("À quoi ressemble l'endroit, et comment y aller ?", ["tn-acces", "tn-mosaique", "tn-texte-photo", "tn-places"]),
  equipe: m("Qui va s'occuper de moi ?", ["tn-equipe"], { preuves: ["equipe"] }),
  "offre-visite": m("Y a-t-il une offre pour une première fois ?", ["tn-offre-visite"], { preuves: ["offre-visite"] }),
  galerie: m("Puis-je voir d'autres images ?", ["tn-mosaique", "tn-de-pres", "tn-realisations"]),
  "preparer-venue": m("Que dois-je prévoir avant de venir ?", ["tn-comment", "tn-acces"]),
  besoins: m("Traites-tu mon besoin ?", ["tn-prestations", "tn-exemples-prix"]),
  "calcul-prix": m("Comment le prix est-il calculé ?", ["tn-exemples-prix", "tn-tarifs", "tn-aides", "tn-prix-explique"]),
  "formulaire-devis": m("Comment je demande mon devis ?", ["tn-devis"]),
  delais: m("Sous quel délai ?", ["tn-delais"], { preuves: ["delais"] }),
  // ── lieu
  "carte-moment": m("Qu'est-ce qu'on y trouve en ce moment, et à quel prix ?", ["tn-carte", "tn-vitrine", "tn-prestations", "tn-produits"]),
  ambiance: m("Est-ce que je m'y sentirai bien ?", ["tn-mosaique", "tn-texte-photo", "tn-places", "tn-emotion"]),
  "horaires-plan": m("Quand est-ce ouvert, et où est-ce ?", ["tn-acces"]),
  evenements: m("Que se passe-t-il prochainement ?", ["tn-agenda"]),
  formules: m("Quelles formules, à quel prix ?", ["tn-tarifs", "tn-prestations"]),
  producteurs: m("D'où vient ce qu'on me sert ?", ["tn-origines", "tn-texte-photo"]),
  reservation: m("Comment je réserve ?", ["tn-reserver-table", "tn-rdv", "tn-urgence"]),
  // ── boutiques
  probleme: m("Est-ce qu'on parle bien de mon problème ?", ["tn-probleme-reponse"]),
  reponse: m("Qu'est-ce que ce produit y change ?", ["tn-probleme-reponse", "tn-difference"]),
  "achat-accueil": m("Combien ça coûte, et comment je l'achète ?", ["tn-appel-produit", "tn-achat"]),
  avantages: m("Qu'est-ce que j'y gagne, concrètement ?", ["tn-avantages", "tn-atouts"]),
  "avant-apres-produit": m("Est-ce que ça marche vraiment ?", ["tn-avant-apres-produit"], { preuves: ["avant-apres"] }),
  "nous-autres": m("Pourquoi celui-ci plutôt qu'un autre ?", ["tn-nous-et-autres"]),
  garantie: m("Et s'il ne me convient pas ?", ["tn-garantie", "tn-garanties"]),
  livraison: m("Quand et comment vais-je le recevoir ?", ["tn-livraison"]),
  "final-prix": m("Bon, je le prends : où est le bouton ?", ["tn-appel-produit", "tn-final"]),
  produits: m("Qu'est-ce qui se vend ici, et à quel prix ?", ["tn-produits", "tn-produits-vente"]),
  atouts: m("Qu'est-ce qui rend ces produits dignes de confiance ?", ["tn-atouts"]),
  fabrication: m("Comment est-ce fait, et par qui ?", ["tn-fabrication", "tn-texte-photo"]),
  vedette: m("Par lequel commencer ?", ["tn-appel-produit", "tn-achat"]),
  "avis-presse": m("Qu'en disent les clients, ou la presse ?", ["tn-avis", "tn-mur-avis", "tn-presse"], { preuves: ["avis", "presse"] }),
  histoire: m("D'où vient cette marque ?", ["tn-fondateur", "tn-texte-photo", "tn-frise"]),
  matieres: m("De quoi est-ce fait, et d'où ça vient ?", ["tn-composition", "tn-de-pres"]),
  engagements: m("À quoi la marque s'engage-t-elle vraiment ?", ["tn-engagements"]),
  collections: m("Par quelle famille de produits commencer ?", ["tn-rayons"]),
  "meilleures-ventes": m("Qu'est-ce que les autres achètent le plus ?", ["tn-produits", "tn-produits-vente"]),
  nouveautes: m("Qu'y a-t-il de nouveau ?", ["tn-produits", "tn-produits-vente"]),
  reassurance: m("La livraison, les retours, le paiement : est-ce sûr ?", ["tn-garanties", "tn-atouts", "tn-engagements"]),
  inspiration: m("Comment les autres s'en servent-ils ?", ["tn-mosaique", "tn-places", "tn-texte-photo", "tn-emotion"]),
  "guide-choix": m("Lequel est fait pour moi ?", ["tn-guide-choix", "tn-comparatif"], { produitsMin: 2 }),
  // ── fiche produit
  "bloc-achat": m("Qu'est-ce que c'est, combien, et comment je l'achète ?", ["tn-achat"]),
  description: m("Qu'est-ce que c'est exactement ?", ["tn-description"]),
  "points-forts": m("Qu'a-t-il de plus ?", ["tn-atouts", "tn-pictos", "tn-avantages"]),
  utilisation: m("Comment s'en servir et l'entretenir ?", ["tn-preparation", "tn-comment"]),
  "livraison-retours": m("Comment est-il livré, et puis-je le renvoyer ?", ["tn-garanties", "tn-livraison", "tn-garantie"]),
  "autres-produits": m("Qu'y a-t-il d'autre dans la boutique ?", ["tn-produits", "tn-produits-vente"], { produitsMin: 2 }),
  "grandes-photos": m("À quoi ressemble-t-il, en vrai et en grand ?", ["tn-emotion", "tn-bande", "tn-mosaique"]),
  "savoir-faire": m("Quel savoir-faire y a-t-il derrière ?", ["tn-fabrication", "tn-texte-photo"]),
  recit: m("Quelle est son histoire ?", ["tn-description", "tn-texte-photo"]),
  details: m("Puis-je le voir de près ?", ["tn-de-pres"]),
  ecrin: m("Comment arrive-t-il chez moi ?", ["tn-colis", "tn-garanties", "tn-livraison"]),
  "points-cles": m("Quels sont ses repères, d'un coup d'œil ?", ["tn-pictos", "tn-atouts"]),
  caracteristiques: m("Quelles sont ses caractéristiques exactes ?", ["tn-fiche-technique"]),
  angles: m("Puis-je le voir sous tous les angles ?", ["tn-de-pres", "tn-mosaique"]),
  comparatif: m("Lequel choisir dans la gamme ?", ["tn-comparatif"], { produitsMin: 2 }),
  compatibilites: m("Va-t-il avec ce que j'ai déjà ?", ["tn-accords"]),
  boite: m("Qu'est-ce que je reçois exactement ?", ["tn-colis"]),
  ingredients: m("Qu'y a-t-il dedans ?", ["tn-composition"]),
  bienfaits: m("Qu'est-ce que ça m'apporte, et pour quel usage ?", ["tn-effets", "tn-pictos", "tn-avantages"]),
  "utilisation-etapes": m("Comment m'en servir, étape par étape ?", ["tn-preparation"]),
  origine: m("D'où vient-il ?", ["tn-texte-photo", "tn-fabrication", "tn-grade"]),
  allergenes: m("Y a-t-il un risque pour moi ?", ["tn-allergenes"]),
  "guide-tailles": m("Quelle taille me faut-il ?", ["tn-guide-tailles"]),
  "matieres-entretien": m("En quoi est-ce fait, et comment l'entretenir ?", ["tn-composition"]),
  looks: m("Avec quoi le porter ?", ["tn-looks"], { produitsMin: 2 }),
  // ── page d'une prestation
  "presentation-prix": m("Qu'est-ce que c'est, et combien ça coûte ?", ["tn-prestations", "tn-tarifs"]),
  compris: m("Qu'est-ce qui est compris ?", ["tn-atouts", "tn-texte-photo"]),
  "pour-qui": m("Est-ce fait pour moi ?", ["tn-pour-qui"]),
  intervenant: m("Qui s'en occupe ?", ["tn-fondateur", "tn-equipe", "tn-texte-photo"]),
  reserver: m("Comment je réserve ?", ["tn-rdv", "tn-rdv-complet", "tn-urgence", "tn-final"]),
  "prestation-duree-prix": m("Quelle prestation, combien de temps, à quel prix ?", ["tn-prestations", "tn-rdv-complet"]),
  annulation: m("Et si je dois annuler ?", ["tn-annulation"], { preuves: ["annulation"] }),
  besoin: m("Est-ce bien mon problème ?", ["tn-probleme-reponse", "tn-texte-photo"]),
  "ce-que-je-fais": m("Que fais-tu exactement ?", ["tn-prestations", "tn-texte-photo"]),
  materiaux: m("Avec quels matériaux et quelles marques ?", ["tn-composition", "tn-de-pres"]),
  "garanties-assurances": m("Es-tu assuré, et que garantis-tu ?", ["tn-labels", "tn-engagements"]),
  "bien-galerie": m("À quoi ressemble ce bien ?", ["tn-bien-galerie"]),
  "bien-prix": m("Combien, et qu'a-t-il exactement ?", ["tn-bien-galerie", "tn-bien-caracteristiques"]),
  // La fiche d'un bien : une pièce par moment, ou « caractéristiques » qui en tient quatre (jamais les deux : MEME_CONTENU).
  "bien-description": m("Qu'est-ce qui le rend agréable à vivre ?", ["tn-bien-description", "tn-bien-caracteristiques"]),
  "bien-plans": m("Quelles surfaces, quelle distribution ?", ["tn-bien-surfaces", "tn-bien-caracteristiques"]),
  "bien-energie": m("Que consomme-t-il ?", ["tn-bien-energie"]),
  "bien-equipements": m("Qu'est-ce qui est équipé ?", ["tn-bien-equipements", "tn-bien-caracteristiques"]),
  quartier: m("Comment vit-on autour ?", ["tn-bien-quartier"]),
  "bien-frais": m("Que vais-je payer en plus du prix ?", ["tn-bien-frais", "tn-bien-caracteristiques"]),
  agent: m("Qui me le fait visiter ?", ["tn-equipe", "tn-fondateur"]),
  visite: m("Comment je le visite ?", ["tn-bien-visite"]),
  "formules-prix": m("Quelles formules, à quel prix ?", ["tn-tarifs", "tn-prestations"]),
  signatures: m("Quels sont les plats à ne pas manquer ?", ["tn-de-pres", "tn-mosaique"]),
  "allergenes-carte": m("Puis-je manger ici sans risque ?", ["tn-allergenes"]),
  privatisation: m("Puis-je réserver le lieu pour un groupe ?", ["tn-privatisation"], { preuves: ["privatisation"] }),
  "reserver-table": m("Comment je réserve ma table ?", ["tn-reserver-table"]),
  dates: m("Quand a lieu la prochaine séance, et reste-t-il de la place ?", ["tn-agenda", "tn-planning"]),
  programme: m("Que va-t-on y faire ?", ["tn-deroule", "tn-comment"]),
  niveau: m("Faut-il déjà savoir faire ?", ["tn-planning"]),
  animateur: m("Qui anime ?", ["tn-fondateur", "tn-equipe", "tn-texte-photo"]),
  materiel: m("Que dois-je apporter ?", ["tn-colis", "tn-atouts"]),
  prix: m("Combien ça coûte ?", ["tn-tarifs", "tn-prestations"]),
  inscription: m("Comment je m'inscris ?", ["tn-inscription"]),
  // ── boutique et collections
  "boutique-titre": m("Qu'est-ce que je regarde ?", ["tn-catalogue"]),
  "sous-familles": m("Puis-je aller droit à ma famille de produits ?", ["tn-catalogue"]),
  filtres: m("Puis-je trier et filtrer ?", ["tn-catalogue"]),
  "boutique-produits": m("Quels sont les produits, et leurs prix ?", ["tn-catalogue"]),
  "questions-livraison": m("Et la livraison ?", ["tn-questions", "tn-livraison"]),
  // ── réalisations
  presentation: m("Qu'est-ce que je vais voir ici ?", ["tn-presentation", "tn-texte-photo"]),
  // « Les réalisations, filtrées par type » tient les filtres ET la liste (une seule liste de réalisations par page).
  "filtres-type": m("Puis-je ne voir que ce qui ressemble à mon projet ?", ["tn-realisations-types"]),
  "realisations-lieu-date": m("Qu'as-tu fait, où et quand ?", ["tn-realisations-types", "tn-realisations"]),
  "realisation-racontee": m("Comment s'est passé un chantier, du début à la fin ?", ["tn-avant-apres"]),
  methode: m("Comment travailles-tu ?", ["tn-deroule", "tn-comment"]),
  "demander-devis": m("Comment je demande le mien ?", ["tn-devis", "tn-rdv", "tn-urgence", "tn-final"]),
  // ── à propos
  "qui-je-suis": m("Qui es-tu ?", ["tn-fondateur", "tn-histoire"]),
  commencement: m("Comment tout a commencé ?", ["tn-histoire", "tn-texte-photo"]),
  "dates-cles": m("Depuis quand, et par quelles étapes ?", ["tn-frise"], { preuves: ["anciennete"] }),
  "comment-je-travaille": m("Comment travailles-tu ?", ["tn-fabrication", "tn-deroule", "tn-comment"]),
  "preuves-diplomes": m("Qu'est-ce qui prouve ton sérieux ?", ["tn-labels", "tn-chiffres", "tn-documents"], { preuves: ["qualifications", "chiffres", "documents"] }),
  valeurs: m("À quoi tiens-tu, et qu'est-ce qui le prouve ?", ["tn-engagements", "tn-manifeste"]),
  "zone-lieu": m("Où travailles-tu ?", ["tn-zone", "tn-acces"]),
  contact: m("Comment te joindre ?", ["tn-contact", "tn-final", "tn-urgence"]),
  // ── contact
  "appeler-ecrire": m("Quel est le moyen le plus simple de te joindre ?", ["tn-urgence", "tn-contact"]),
  "formulaire-court": m("Puis-je écrire sans tout raconter ?", ["tn-contact", "tn-rdv", "tn-devis"]),
  // Chaque moment de la page contact a sa pièce ; « Horaires et accès » (tn-acces) en tient trois à elle seule, et ne se
  // pose jamais avec les pièces qui les montrent une par une (tenue-ordre.ts : MEME_CONTENU).
  "delai-reponse": m("Quand vais-je avoir une réponse ?", ["tn-delai-reponse"], { preuves: ["delais"] }),
  horaires: m("Quand puis-je appeler ou passer ?", ["tn-horaires", "tn-acces"]),
  "adresse-carte": m("Où est-ce ?", ["tn-adresse", "tn-acces"]),
  acces: m("Comment y venir, où se garer ?", ["tn-venir", "tn-acces"]),
  reseaux: m("Où te suivre ?", ["tn-reseaux"], { preuves: ["reseaux"] }),
  "questions-courantes": m("Ma question a-t-elle déjà sa réponse ?", ["tn-questions"]),
  // ── questions fréquentes
  "questions-bloquent": m("La chose qui m'empêche d'acheter a-t-elle sa réponse ?", ["tn-questions"]),
  "q-livraison": m("Quand et comment suis-je livré ?", ["tn-livraison", "tn-questions-rubriques"]),
  "q-retours": m("Puis-je renvoyer ou annuler ?", ["tn-garantie", "tn-questions-rubriques"]),
  "q-paiement": m("Comment je paie, et est-ce sûr ?", ["tn-garanties", "tn-questions-rubriques"]),
  "q-produit": m("Et sur le produit ou la prestation ?", ["tn-questions-rubriques", "tn-pour-qui"]),
  "q-rdv": m("Comment se passe un rendez-vous ou un devis ?", ["tn-deroule", "tn-questions-rubriques"]),
  "q-garanties": m("Que garantis-tu ?", ["tn-labels", "tn-engagements", "tn-garanties"]),
  "q-suivi": m("Où en est ma commande ou ma demande ?", ["tn-suivi"]),
  "encore-question": m("Et si ma question n'est pas là ?", ["tn-contact", "tn-final", "tn-urgence"]),
};

// ════════════════════════════════════════════════════════════════ les partitions

export type PageKind = "accueil" | "fiche" | "prestation" | "boutique" | "realisations" | "a-propos" | "contact" | "questions";
export const PAGE_KIND_LABEL: Record<PageKind, string> = { accueil: "l'accueil", fiche: "la fiche produit", prestation: "la page d'une prestation", boutique: "la boutique et les collections", realisations: "les réalisations", "a-propos": "à propos", contact: "contact", questions: "les questions fréquentes" };

export type Partition = {
  /** Identifiant donné par le concepteur (champ « partitions ») et gardé avec le site. */
  id: string;
  nom: string;
  page: PageKind;
  /** Type d'accueil (accueil seulement), ou style de la page qui vend (fiche, prestation). */
  type?: string;
  moments: Moment[];
  /** « cahier » : mot pour mot dans le cahier ; « ecrite » : écrite ici, à faire valider par le propriétaire. */
  source: "cahier" | "ecrite";
};

const SEP = " › ";
function partition(page: PageKind, id: string, nom: string, texte: string, keys: string, o: { type?: string; source?: "cahier" | "ecrite" } = {}): Partition {
  const labels = texte.split(SEP).map((x) => x.trim()), ks = keys.trim().split(/\s+/);
  if (labels.length !== ks.length) throw new Error(`Partition ${id} : ${labels.length} libellés pour ${ks.length} moments`);
  const moments = ks.map((key, i): Moment => { const def = MOMENTS[key]; if (!def) throw new Error(`Partition ${id} : moment inconnu « ${key} »`); return { key, label: labels[i], ...def }; });
  return { id, nom, page, ...(o.type ? { type: o.type } : {}), moments, source: o.source ?? "cahier" };
}

export type TypeAccueil = {
  id: string;
  nom: string;
  /** Pour qui, avec les mots du cahier. */
  pour: string;
  business: ("products" | "services")[];
  /** Les styles de la page qui vend (styles-de-page.ts) qui vont d'ordinaire avec ce type d'accueil. */
  styles: string[];
  /** Les métiers reconnus par la documentaliste (references.ts, clé du secteur) qui prennent ce type. */
  secteurs: string[];
  partitions: Partition[];
};

const acc = (type: string, id: string, nom: string, texte: string, keys: string) => partition("accueil", `${type}:${id}`, nom, texte, keys, { type });

export const TYPES_ACCUEIL: TypeAccueil[] = [
  {
    id: "service-proximite", nom: "Le service de proximité", pour: "artisan, dépannage, service à domicile", business: ["services"], styles: ["prestation-simple", "devis-artisan"], secteurs: ["domicile", "batiment", "garage"],
    partitions: [
      acc("service-proximite", "zone-dabord", "Zone d'abord", "ouverture (métier, ville, « Réserver », téléphone) › « je viens jusque chez toi » (zone et délais) › prestations et prix › bandeau de confiance (assurance, ancienneté, note réelle) › réalisations en avant et après › déroulé en étapes › avis réels › qui je suis › garanties › questions › appel final",
        "ouverture zone prestations confiance avant-apres deroule avis qui garanties questions final"),
      acc("service-proximite", "preuve-dabord", "Preuve d'abord", "ouverture › bandeau de confiance › prestations et prix › zone et délais › avis réels › réalisations › qui je suis › déroulé › garanties › questions › appel final",
        "ouverture confiance prestations zone avis realisations qui deroule garanties questions final"),
      acc("service-proximite", "prestations-dabord", "Prestations d'abord", "ouverture › prestations par besoin › zone et délais › déroulé › réalisations › chiffres vrais › avis › tarifs détaillés › qui je suis › questions › appel final",
        "ouverture prestations zone deroule realisations chiffres avis tarifs-detail qui questions final"),
    ],
  },
  {
    id: "rendez-vous", nom: "Le rendez-vous", pour: "salon, soins, coach", business: ["services"], styles: ["rendez-vous-complet", "prestation-simple", "atelier-cours"], secteurs: ["beaute", "sante", "coaching", "conseil", "garage"],
    partitions: [
      acc("rendez-vous", "reservation-dabord", "Réservation d'abord", "ouverture avec « Réserver » › prestations et tarifs › prochains créneaux › le lieu › l'équipe réelle › avis › offre de première visite › déroulé d'un rendez-vous › galerie › questions › appel final",
        "ouverture prestations creneaux lieu equipe avis offre-visite deroule galerie questions final"),
      acc("rendez-vous", "lieu-dabord", "Lieu d'abord", "ouverture › le lieu en images › prestations et tarifs › l'équipe › créneaux › avis › galerie › offre de première visite › préparer sa venue › questions › appel final",
        "ouverture lieu prestations equipe creneaux avis galerie offre-visite preparer-venue questions final"),
      acc("rendez-vous", "avis-dabord", "Avis d'abord", "ouverture › avis réels › prestations et tarifs › créneaux › l'équipe › le lieu › déroulé › offre › galerie › questions › appel final",
        "ouverture avis prestations creneaux equipe lieu deroule offre-visite galerie questions final"),
    ],
  },
  {
    id: "devis", nom: "Le devis", pour: "chantier, événement", business: ["services"], styles: ["devis-artisan", "bien-immobilier"], secteurs: ["batiment", "image", "conseil", "immobilier"],
    partitions: [
      acc("devis", "besoins-dabord", "Besoins d'abord", "ouverture › besoins traités › réalisations › méthode en étapes › garanties et certifications › zone › avis › mode de calcul des prix › qui sommes-nous › formulaire de devis › questions › appel final",
        "ouverture besoins realisations deroule garanties zone avis calcul-prix qui formulaire-devis questions final"),
      acc("devis", "realisations-dabord", "Réalisations d'abord", "ouverture › réalisations › besoins traités › avis › méthode › garanties › zone › délais › qui sommes-nous › formulaire de devis › questions",
        "ouverture realisations besoins avis deroule garanties zone delais qui formulaire-devis questions"),
      acc("devis", "methode-dabord", "Méthode d'abord", "ouverture › méthode en étapes › besoins traités › garanties › réalisations › avis › zone › mode de calcul des prix › formulaire de devis › questions › appel final",
        "ouverture deroule besoins garanties realisations avis zone calcul-prix formulaire-devis questions final"),
    ],
  },
  {
    id: "produit-heros", nom: "Le produit héros", pour: "dropshipping, un seul produit", business: ["products"], styles: ["vente-directe"], secteurs: [],
    partitions: [
      acc("produit-heros", "probleme-dabord", "Problème d'abord", "ouverture › le problème › la réponse du produit › bloc d'achat et offres › avantages en images › avant et après › nous et les autres › avis réels › garantie › livraison expliquée › questions › appel final avec prix",
        "ouverture probleme reponse achat-accueil avantages avant-apres-produit nous-autres avis garantie livraison questions final-prix"),
      acc("produit-heros", "achat-dabord", "Achat d'abord", "ouverture › bloc d'achat et offres › avantages › le problème et la réponse › nous et les autres › avis réels › avant et après › garantie › livraison expliquée › questions › appel final avec prix",
        "ouverture achat-accueil avantages probleme nous-autres avis avant-apres-produit garantie livraison questions final-prix"),
      acc("produit-heros", "preuve-dabord", "Preuve d'abord", "ouverture › avis réels › le problème › la réponse › bloc d'achat et offres › avant et après › nous et les autres › garantie › livraison expliquée › questions › appel final avec prix",
        "ouverture avis probleme reponse achat-accueil avant-apres-produit nous-autres garantie livraison questions final-prix"),
    ],
  },
  {
    id: "marque-createur", nom: "La marque de créateur", pour: "petit catalogue", business: ["products"], styles: ["simple", "haut-de-gamme", "alimentaire-soin", "mode", "technique"], secteurs: [],
    partitions: [
      acc("marque-createur", "produits-dabord", "Produits d'abord", "ouverture en scène › produits › trois atouts vrais › fabrication › un moment de vie › produit vedette › avis ou presse réels › l'histoire › matières et origine › questions › lettre d'information",
        "ouverture produits atouts fabrication vie vedette avis-presse histoire matieres questions lettre"),
      acc("marque-createur", "savoir-faire-dabord", "Savoir-faire d'abord", "ouverture › fabrication › produits › un moment de vie › produit vedette › trois atouts › avis réels › l'histoire › engagements › questions › lettre d'information",
        "ouverture fabrication produits vie vedette atouts avis histoire engagements questions lettre"),
      acc("marque-createur", "moment-dabord", "Moment d'abord", "ouverture › un moment de vie › produit vedette › produits › atouts › fabrication › avis réels › l'histoire › matières › questions › lettre d'information",
        "ouverture vie vedette produits atouts fabrication avis histoire matieres questions lettre"),
    ],
  },
  {
    id: "catalogue", nom: "Le catalogue", pour: "grande boutique", business: ["products"], styles: ["simple", "technique", "mode", "alimentaire-soin", "haut-de-gamme", "vente-directe"], secteurs: [],
    partitions: [
      acc("catalogue", "collections-dabord", "Collections d'abord", "ouverture avec l'offre › collections › meilleures ventes › réassurance › nouveautés › inspiration › produit vedette › avis › guide de choix › questions › lettre d'information",
        "ouverture collections meilleures-ventes reassurance nouveautes inspiration vedette avis guide-choix questions lettre"),
      acc("catalogue", "meilleures-ventes-dabord", "Meilleures ventes d'abord", "ouverture › meilleures ventes › réassurance › collections › produit vedette › nouveautés › guide de choix › avis › inspiration › questions › lettre d'information",
        "ouverture meilleures-ventes reassurance collections vedette nouveautes guide-choix avis inspiration questions lettre"),
      acc("catalogue", "guide-dabord", "Guide d'abord", "ouverture › guide de choix › collections › meilleures ventes › réassurance › produit vedette › nouveautés › avis › inspiration › questions › lettre d'information",
        "ouverture guide-choix collections meilleures-ventes reassurance vedette nouveautes avis inspiration questions lettre"),
    ],
  },
  {
    id: "lieu", nom: "Le lieu", pour: "restaurant, boutique physique", business: ["services", "products"], styles: ["restaurant", "rendez-vous-complet"], secteurs: ["restaurant", "accueil"],
    partitions: [
      acc("lieu", "action-dabord", "Action d'abord", "ouverture (ouvert aujourd'hui, réserver, appeler) › carte ou produits du moment › l'ambiance › l'équipe › horaires et plan › avis › événements › formules › galerie › questions › réservation",
        "ouverture carte-moment ambiance equipe horaires-plan avis evenements formules galerie questions reservation"),
      acc("lieu", "ambiance-dabord", "Ambiance d'abord", "ouverture › l'ambiance › carte du moment › formules › avis › l'équipe › événements › galerie › horaires et plan › questions › réservation",
        "ouverture ambiance carte-moment formules avis equipe evenements galerie horaires-plan questions reservation"),
      acc("lieu", "carte-dabord", "Carte d'abord", "ouverture › carte du moment › formules › horaires et plan › ambiance › producteurs › avis › événements › galerie › questions › réservation",
        "ouverture carte-moment formules horaires-plan ambiance producteurs avis evenements galerie questions reservation"),
    ],
  },
];

/** Les règles propres à chaque autre page importante (entre parenthèses dans le cahier). */
export const REGLE_DE_PAGE: Record<Exclude<PageKind, "accueil">, string> = {
  fiche: "le bloc d'achat en premier, les autres produits en dernier, une seule section de cartes",
  prestation: "le prix ou son mode de calcul et le bouton dès le premier écran, puis en bas",
  boutique: "les produits dans le premier écran, la réassurance en bas",
  realisations: "de vraies réalisations, sauf la règle des artisans déjà décidée",
  "a-propos": "la personne et la preuve avant les valeurs",
  contact: "l'action la plus simple d'abord",
  questions: "les questions qui bloquent l'achat en premier",
};

const fiche = (style: string, nom: string, texte: string, keys: string) => partition("fiche", `fiche:${style}`, nom, texte, keys, { type: style });
/** La fiche produit : une partition par style de page produit (mêmes clés que STYLES_PRODUIT). */
export const PARTITIONS_FICHE: Partition[] = [
  fiche("simple", "Simple (créateurs, artisans)", "bloc d'achat › description racontée › points forts › fabrication › moment de vie › utilisation et entretien › avis réels › livraison et retours › questions › autres produits",
    "bloc-achat description points-forts fabrication vie utilisation avis livraison-retours questions autres-produits"),
  fiche("vente-directe", "Vente directe (dropshipping)", "bloc d'achat avec offres (et barre d'achat qui suit en bas de l'écran) › le problème › la réponse du produit › avantages › avant et après › nous et les autres › avis réels › garantie › livraison expliquée › questions › appel final avec prix",
    "bloc-achat probleme reponse avantages avant-apres-produit nous-autres avis garantie livraison questions final-prix"),
  fiche("haut-de-gamme", "Haut de gamme", "bloc d'achat sobre › grandes photos › matières › savoir-faire › le récit › détails en gros plan › entretien › livraison et écrin › questions › autres produits",
    "bloc-achat grandes-photos matieres savoir-faire recit details utilisation ecrin questions autres-produits"),
  fiche("technique", "Technique", "bloc d'achat › points clés › caractéristiques › vue sous tous les angles › comparatif › compatibilités › ce qu'il y a dans la boîte › avis réels › questions › autres produits",
    "bloc-achat points-cles caracteristiques angles comparatif compatibilites boite avis questions autres-produits"),
  fiche("alimentaire-soin", "Alimentaire et soin", "bloc d'achat › description › ingrédients ou composition › bienfaits et usage › utilisation en étapes › origine › précautions et allergènes › avis réels › questions › autres produits",
    "bloc-achat description ingredients bienfaits utilisation-etapes origine allergenes avis questions autres-produits"),
  fiche("mode", "Mode", "bloc d'achat avec tailles › guide des tailles › description › matières et entretien › looks associés › détails › avis réels › livraison et retours › questions › autres produits",
    "bloc-achat guide-tailles description matieres-entretien looks details avis livraison-retours questions autres-produits"),
];

const presta = (style: string, nom: string, texte: string, keys: string) => partition("prestation", `prestation:${style}`, nom, texte, keys, { type: style });
/** La page d'une prestation : une partition par style de page de services (mêmes clés que STYLES_SERVICES). */
export const PARTITIONS_PRESTATION: Partition[] = [
  presta("prestation-simple", "Prestation simple", "présentation et prix › ce qui est compris › pour qui › déroulé › avant et après › l'intervenant › avis réels › garanties › questions › réserver",
    "presentation-prix compris pour-qui deroule avant-apres intervenant avis garanties questions reserver"),
  presta("rendez-vous-complet", "Rendez-vous", "prestation, durée et prix › créneaux › ce qui est compris › l'intervenant › préparer sa venue › le lieu › avis réels › annulation et conditions › questions › réserver",
    "prestation-duree-prix creneaux compris intervenant preparer-venue lieu avis annulation questions reserver"),
  presta("devis-artisan", "Devis d'artisan", "le besoin › ce que je fais › réalisations › méthode › matériaux et marques › garanties et assurances › zone › délais › avis réels › formulaire de devis détaillé › questions",
    "besoin ce-que-je-fais realisations methode materiaux garanties-assurances zone delais avis formulaire-devis questions"),
  presta("bien-immobilier", "Bien immobilier", "galerie › prix et caractéristiques › description › plans et surfaces › étiquette énergie › équipements › le quartier › frais et charges › l'agent › demande de visite",
    "bien-galerie bien-prix bien-description bien-plans bien-energie bien-equipements quartier bien-frais agent visite"),
  presta("restaurant", "Restaurant", "carte du moment › formules et prix › plats signatures › producteurs › allergènes › ambiance › avis réels › horaires et plan › privatisation › réserver une table",
    "carte-moment formules-prix signatures producteurs allergenes-carte ambiance avis horaires-plan privatisation reserver-table"),
  presta("atelier-cours", "Atelier ou cours", "dates et places restantes réelles › programme › pour qui › niveau requis › l'animateur › le lieu › matériel fourni › prix › avis réels › inscription",
    "dates programme pour-qui niveau animateur lieu materiel prix avis inscription"),
];

const autre = (page: Exclude<PageKind, "accueil" | "fiche" | "prestation">, id: string, nom: string, texte: string, keys: string, source: "cahier" | "ecrite" = "cahier") => partition(page, `${page}:${id}`, nom, texte, keys, { source });
/**
 * Les autres pages importantes. Le cahier donne UNE partition par page et demande « au moins trois partitions par type
 * de page » : les deux suivantes de chaque page sont écrites ici, avec les mêmes moments dans un autre ordre, en
 * respectant la règle de la page et les dix règles d'or. Elles sont à faire valider par le propriétaire.
 */
export const PARTITIONS_AUTRES: Partition[] = [
  // La boutique et les collections : les produits dans le premier écran, la réassurance en bas.
  autre("boutique", "guide-dabord", "Guide de choix après la grille", "titre et phrase courte › liens vers les sous-familles › filtres › produits › guide de choix › moment de vie › produit vedette › questions sur la livraison › avis › réassurance › lettre d'information",
    "boutique-titre sous-familles filtres boutique-produits guide-choix vie vedette questions-livraison avis reassurance lettre"),
  autre("boutique", "vedette-dabord", "Produit vedette après la grille", "titre et phrase courte › liens vers les sous-familles › filtres › produits › produit vedette › guide de choix › avis › moment de vie › questions sur la livraison › réassurance › lettre d'information",
    "boutique-titre sous-familles filtres boutique-produits vedette guide-choix avis vie questions-livraison reassurance lettre", "ecrite"),
  autre("boutique", "avis-dabord", "Avis après la grille", "titre et phrase courte › liens vers les sous-familles › filtres › produits › avis › guide de choix › produit vedette › moment de vie › réassurance › questions sur la livraison › lettre d'information",
    "boutique-titre sous-familles filtres boutique-produits avis guide-choix vedette vie reassurance questions-livraison lettre", "ecrite"),
  // Les réalisations : de vraies réalisations, sauf la règle des artisans déjà décidée.
  autre("realisations", "toutes-dabord", "Toutes les réalisations d'abord", "présentation › filtres par type › réalisations avec lieu et date › une réalisation racontée en avant et après › chiffres vrais › méthode › avis réels › zone › garanties › demander un devis",
    "presentation filtres-type realisations-lieu-date realisation-racontee chiffres methode avis zone garanties demander-devis"),
  autre("realisations", "racontee-dabord", "Une réalisation racontée d'abord", "présentation › une réalisation racontée en avant et après › filtres par type › réalisations avec lieu et date › avis réels › méthode › chiffres vrais › zone › garanties › demander un devis",
    "presentation realisation-racontee filtres-type realisations-lieu-date avis methode chiffres zone garanties demander-devis", "ecrite"),
  autre("realisations", "methode-ensuite", "La méthode juste après les réalisations", "présentation › filtres par type › réalisations avec lieu et date › méthode › une réalisation racontée en avant et après › avis réels › chiffres vrais › zone › garanties › demander un devis",
    "presentation filtres-type realisations-lieu-date methode realisation-racontee avis chiffres zone garanties demander-devis", "ecrite"),
  // À propos : la personne et la preuve avant les valeurs.
  autre("a-propos", "histoire-dabord", "L'histoire d'abord", "qui je suis, avec une vraie photo si le client la donne › comment tout a commencé › les dates clés › comment je travaille › l'équipe réelle › preuves (diplômes, assurances, chiffres vrais) › valeurs avec leurs preuves › la zone ou le lieu › avis réels › contact",
    "qui-je-suis commencement dates-cles comment-je-travaille equipe preuves-diplomes valeurs zone-lieu avis contact"),
  autre("a-propos", "preuves-dabord", "Les preuves d'abord", "qui je suis, avec une vraie photo si le client la donne › preuves (diplômes, assurances, chiffres vrais) › comment tout a commencé › comment je travaille › les dates clés › l'équipe réelle › avis réels › valeurs avec leurs preuves › la zone ou le lieu › contact",
    "qui-je-suis preuves-diplomes commencement comment-je-travaille dates-cles equipe avis valeurs zone-lieu contact", "ecrite"),
  autre("a-propos", "travail-dabord", "Le travail d'abord", "qui je suis, avec une vraie photo si le client la donne › comment je travaille › preuves (diplômes, assurances, chiffres vrais) › comment tout a commencé › l'équipe réelle › les dates clés › avis réels › valeurs avec leurs preuves › la zone ou le lieu › contact",
    "qui-je-suis comment-je-travaille preuves-diplomes commencement equipe dates-cles avis valeurs zone-lieu contact", "ecrite"),
  // Contact : l'action la plus simple d'abord.
  autre("contact", "formulaire-ensuite", "Le formulaire juste après", "appeler, écrire ou réserver › formulaire court › délai de réponse › horaires › adresse et carte › zone › accès et stationnement › réseaux › questions courantes › appel final",
    "appeler-ecrire formulaire-court delai-reponse horaires adresse-carte zone acces reseaux questions-courantes final"),
  autre("contact", "horaires-ensuite", "Les horaires juste après", "appeler, écrire ou réserver › horaires › formulaire court › délai de réponse › zone › adresse et carte › accès et stationnement › questions courantes › réseaux › appel final",
    "appeler-ecrire horaires formulaire-court delai-reponse zone adresse-carte acces questions-courantes reseaux final", "ecrite"),
  autre("contact", "zone-ensuite", "La zone juste après le formulaire", "appeler, écrire ou réserver › formulaire court › délai de réponse › zone › horaires › adresse et carte › accès et stationnement › questions courantes › réseaux › appel final",
    "appeler-ecrire formulaire-court delai-reponse zone horaires adresse-carte acces questions-courantes reseaux final", "ecrite"),
  // Questions fréquentes : les questions qui bloquent l'achat en premier.
  autre("questions", "livraison-ensuite", "La livraison ensuite", "présentation › les questions qui bloquent › livraison › retours › paiement › le produit ou la prestation › rendez-vous ou devis › garanties › compte et suivi › « encore une question ? » avec le contact",
    "presentation questions-bloquent q-livraison q-retours q-paiement q-produit q-rdv q-garanties q-suivi encore-question"),
  autre("questions", "produit-ensuite", "Le produit ou la prestation ensuite", "présentation › les questions qui bloquent › le produit ou la prestation › livraison › retours › paiement › garanties › rendez-vous ou devis › compte et suivi › « encore une question ? » avec le contact",
    "presentation questions-bloquent q-produit q-livraison q-retours q-paiement q-garanties q-rdv q-suivi encore-question", "ecrite"),
  autre("questions", "paiement-ensuite", "Le paiement ensuite", "présentation › les questions qui bloquent › paiement › livraison › retours › garanties › le produit ou la prestation › rendez-vous ou devis › compte et suivi › « encore une question ? » avec le contact",
    "presentation questions-bloquent q-paiement q-livraison q-retours q-garanties q-produit q-rdv q-suivi encore-question", "ecrite"),
];

export const TOUTES_LES_PARTITIONS: Partition[] = [...TYPES_ACCUEIL.flatMap((t) => t.partitions), ...PARTITIONS_FICHE, ...PARTITIONS_PRESTATION, ...PARTITIONS_AUTRES];
const PAR_ID = new Map(TOUTES_LES_PARTITIONS.map((p) => [p.id, p]));
if (PAR_ID.size !== TOUTES_LES_PARTITIONS.length) throw new Error("Deux partitions portent le même identifiant.");
export const partitionById = (id: string | null | undefined): Partition | null => (id ? PAR_ID.get(id) ?? null : null);
export const typeAccueil = (id: string | null | undefined): TypeAccueil | null => TYPES_ACCUEIL.find((t) => t.id === id) ?? null;

/** Les moments d'une partition, en une ligne (les « moments » d'un style de page viennent d'ici : une seule source). */
export const partitionLine = (p: Partition): string => p.moments.map((x) => x.label).join(" → ");
export const partitionDuStyle = (style: string, business: "products" | "services"): Partition | null => (business === "services" ? PARTITIONS_PRESTATION : PARTITIONS_FICHE).find((p) => p.type === style) ?? null;
/** Moments du cahier qu'aucune pièce de la bibliothèque ne tient aujourd'hui (le concepteur les saute). */
export const momentsSansPiece = (): { partition: string; label: string }[] => TOUTES_LES_PARTITIONS.flatMap((p) => p.moments.filter((x) => !x.pieces.length).map((x) => ({ partition: p.id, label: x.label })));

// ════════════════════════════════════════════════════════════════ quelle page, quelles partitions

/** Le genre d'une page d'après sa clé : une page importante, une page utilitaire (courte), ou ni l'un ni l'autre. */
export function pageKind(key: string, business: "products" | "services"): PageKind | "utilitaire" | null {
  if (key === "home") return "accueil";
  if (/^product(-|$)/.test(key)) return business === "products" ? "fiche" : null;
  if (business === "services" && /^(prestations?|biens?|carte|ateliers?)(-|$)/.test(key)) return "prestation";
  if (/^shop(-|$)/.test(key)) return "boutique";
  if (/^realisations?(-|$)/.test(key)) return "realisations";
  if (key === "about") return "a-propos";
  if (key === "contact") return "contact";
  if (/^(aide|faq|questions)$/.test(key)) return "questions";
  if (/^(cart|404|legal|recherche|merci)$/.test(key)) return "utilitaire";
  return null;
}

export type AccueilFacts = {
  business: "products" | "services"; products: number; families?: number;
  /** Clé du métier reconnu par la documentaliste (references.ts), s'il y en a un. */
  secteur?: string | null;
  /** Service qui se déplace chez le client (une zone desservie, pas d'adresse où venir). */
  mobile?: boolean;
  /** Un lieu où l'on vient (adresse montrée et horaires), ou une carte de restaurant publiée. */
  lieu?: boolean;
};
/**
 * Les types d'accueil permis pour un client, déduits de ce que le Studio sait déjà (métier reconnu, catalogue, zone,
 * adresse). En cas de doute entre deux types, les deux sont rendus : le concepteur choisit et dit pourquoi.
 */
export function typesAccueilPermis(f: AccueilFacts): string[] {
  const out: string[] = [];
  const add = (...ids: string[]) => { for (const id of ids) if (!out.includes(id)) out.push(id); };
  if (f.business === "services") {
    if (f.mobile) add("service-proximite");
    if (f.lieu && !f.mobile && (f.secteur === "restaurant" || f.secteur === "accueil")) add("lieu");
    for (const t of TYPES_ACCUEIL) if (t.business.includes("services") && f.secteur && t.secteurs.includes(f.secteur)) add(t.id);
    // Métier non reconnu : le doute est entier, les trois types de services sont donnés (et le lieu s'il y en a un).
    if (!out.length) add("service-proximite", "rendez-vous", "devis");
    if (f.lieu && !f.mobile) add("lieu");
    return out;
  }
  if (f.products <= 3) add("produit-heros", "marque-createur");
  else if (f.products <= 12 && (f.families ?? 0) < 4) add("marque-createur");
  else if (f.products <= 24 && (f.families ?? 0) < 4) add("marque-createur", "catalogue");
  else add("catalogue");
  if (f.lieu) add("lieu");
  return out;
}

const plain = (v: unknown) => (typeof v === "string" ? v.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9:]+/g, "-").replace(/^-+|-+$/g, "") : "");
/** Lecture indulgente de la partition rendue par le concepteur (identifiant, fin d'identifiant ou nom) : jamais un appel payé perdu. */
export function readPartition(v: unknown, among: Partition[]): Partition | null {
  const s = plain(v);
  if (!s) return null;
  return among.find((p) => p.id === s) ?? among.find((p) => p.id.split(":")[1] === s || plain(p.nom) === s) ?? (PAR_ID.get(s) && among.includes(PAR_ID.get(s)!) ? PAR_ID.get(s)! : null);
}

/** Les partitions permises pour une page de ce client. */
export function partitionsPermises(kind: PageKind, o: { types: string[]; pageStyle?: string | null; business: "products" | "services" }): Partition[] {
  if (kind === "accueil") { const list = TYPES_ACCUEIL.filter((t) => o.types.includes(t.id)).flatMap((t) => t.partitions); return list.length ? list : TYPES_ACCUEIL.filter((t) => t.business.includes(o.business)).flatMap((t) => t.partitions); }
  if (kind === "fiche" || kind === "prestation") { const all = kind === "fiche" ? PARTITIONS_FICHE : PARTITIONS_PRESTATION; const own = all.filter((p) => p.type === o.pageStyle); return own.length ? own : all; }
  return PARTITIONS_AUTRES.filter((p) => p.page === kind);
}

export type DossierFacts = { preuves: ReadonlySet<PreuveId> | PreuveId[]; products: number };
const hasPreuve = (f: DossierFacts, id: PreuveId) => (Array.isArray(f.preuves) ? f.preuves.includes(id) : (f.preuves as ReadonlySet<PreuveId>).has(id));
/** Un moment peut-il être tenu pour CE client ? Sans pièce, sans la preuve réelle ou sans assez de produits : il est sauté. */
export function momentTenable(x: Moment, f: DossierFacts): { ok: boolean; why?: string } {
  if (!x.pieces.length) return { ok: false, why: "aucune pièce de la bibliothèque ne le tient" };
  if (x.preuves?.length && !x.preuves.some((p) => hasPreuve(f, p))) return { ok: false, why: "le dossier n'a pas la preuve réelle qu'il demande" };
  if (x.produitsMin && f.products < x.produitsMin) return { ok: false, why: `il demande au moins ${x.produitsMin} produits au catalogue` };
  return { ok: true };
}

// ════════════════════════════════════════════════════════════════ ce qui est dit au concepteur et aux juges

const pageLine = (p: Partition, f: DossierFacts) => `  - ${p.id} (${p.nom}) : ${p.moments.map((x) => { const t = momentTenable(x, f); return t.ok ? x.label : `[à sauter : ${x.label}]`; }).join(SEP)}`;

export type PartitionsBrief = {
  business: "products" | "services"; types: string[]; pageStyle?: string | null; dossier: DossierFacts;
  /** L'angle choisi par le client, s'il est connu. */
  angle?: AngleRole | null;
  /** Les partitions prises par les derniers sites du même métier (les plus récents d'abord), par genre de page. */
  prises?: Partial<Record<PageKind, string[]>>;
  /** Les pages à traiter (un concept n'a que l'accueil et la page qui vend). */
  kinds?: PageKind[];
};
/**
 * Les partitions permises pour CE client, dites au concepteur (et relues par les juges) : par page importante, ses
 * ordres de départ ; puis, une seule fois, chaque moment avec la question du visiteur et les pièces qui peuvent le tenir.
 */
export function partitionsBrief(o: PartitionsBrief): string {
  const kinds: PageKind[] = o.kinds ?? (o.business === "services" ? ["accueil", "prestation", "realisations", "a-propos", "contact", "questions"] : ["accueil", "fiche", "boutique", "a-propos", "contact", "questions"]);
  const seen = new Map<string, Moment>();
  const blocks: string[] = [];
  for (const kind of kinds) {
    const list = partitionsPermises(kind, o);
    for (const p of list) for (const x of p.moments) if (!seen.has(`${x.key}|${x.label}`)) seen.set(`${x.key}|${x.label}`, x);
    const head = kind === "accueil"
      ? `ACCUEIL (clé « home ») — type${o.types.length > 1 ? "s possibles (il y a doute : choisis celui qui va à CE client et dis pourquoi)" : ""} : ${TYPES_ACCUEIL.filter((t) => o.types.includes(t.id)).map((t) => `${t.nom.toLowerCase()} (${t.pour})`).join(" ; ") || "à déduire de ce que vend le client"}`
      : kind === "fiche" ? `FICHE PRODUIT (clé « product ») — règle : ${REGLE_DE_PAGE.fiche}. Sa partition est celle du style choisi (champ « pageStyle ») : identifiant « fiche:<style> »`
      : kind === "prestation" ? `PAGE D'UNE PRESTATION (clé « prestations », ou la page du métier) — règle : ${REGLE_DE_PAGE.prestation}. Sa partition est celle du style choisi (champ « pageStyle ») : identifiant « prestation:<style> »`
      : `${PAGE_KIND_LABEL[kind].toUpperCase()} — règle : ${REGLE_DE_PAGE[kind]}`;
    const taken = (o.prises?.[kind] ?? []).filter((id) => list.some((p) => p.id === id));
    blocks.push([head, ...list.map((p) => pageLine(p, o.dossier)), taken.length && list.length > 1 ? `  DÉJÀ PRISE par le dernier site du même métier : ${taken[0]} — INTERDITE cette fois.${taken.length > 1 ? ` Prises avant : ${taken.slice(1, 4).join(", ")} (évite-les si une autre va aussi bien).` : ""}` : ""].filter(Boolean).join("\n"));
  }
  const moments = [...seen.values()].map((x) => { const t = momentTenable(x, o.dossier); return `  - ${x.label} · « ${x.question} » · ${x.pieces.length ? `pièces : ${x.pieces.join(", ")}` : "SANS PIÈCE dans la bibliothèque"}${t.ok ? "" : ` · À SAUTER pour ce client (${t.why})`}`; });
  return [
    "LES PARTITIONS (les ordres de départ des pages importantes). Pour CHAQUE page importante, choisis UNE partition parmi celles données ici et écris-la dans le champ « partitions » : { page : la clé de la page, partition : son identifiant, why : pourquoi cette partition va à CE client (son angle, ses preuves, ses clients) }. Une raison qui irait à n'importe quel client est refusée. Tu ADAPTES ensuite la partition au client, dans les limites des règles d'or : un moment « à sauter » se saute (jamais rempli, jamais inventé), un moment peut se déplacer d'un cran si l'angle le demande, une pièce propre au produit ou au métier peut s'ajouter. Le « › » sépare les sections.",
    ANGLE_DEPLACE + (o.angle ? ` Pour ce client : ${ANGLE_MONTE[o.angle]}.` : ""),
    "MÉLANGE : ne prends pas toujours la même partition. Jamais celle du dernier site du même métier ; l'en-tête, le pied de page et l'ouverture ne sont jamais ceux des trois derniers sites du même métier ; chaque section prend une de ses dispositions (champ « construction »), jamais la même combinaison qu'un site précédent du même métier.",
    ...blocks,
    "LES MOMENTS (libellé · la question du visiteur · les pièces de la bibliothèque qui peuvent le tenir ; compare-les et prends celle qui sert le mieux CETTE marque ; une même pièce peut tenir plusieurs moments qui se suivent) :",
    ...moments,
  ].join("\n");
}
