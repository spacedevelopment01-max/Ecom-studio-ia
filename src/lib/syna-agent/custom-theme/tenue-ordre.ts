/**
 * Ce que chaque pièce du thème unique apporte à L'ORDRE d'une page (cahier `docs/sina-savoir/theme-ordre-et-variete.md`,
 * décisions du propriétaire du 16 novembre 2026). Un trait écrit SUR la pièce, lu par les contrôles sans IA (ordre.ts) :
 *  - sa disposition (« forme ») : la règle d'or 6 refuse deux dispositions pareilles à la suite ;
 *  - ses traits : elle montre l'offre, un prix, la livraison, la zone, une vraie preuve, une réassurance, elle lève un
 *    doute, elle fait agir, elle présente la personne, ou elle est « abstraite » (formule, citation, conviction,
 *    émotion seule : jamais avant l'offre et la première preuve ou réassurance, règle d'or 5) ;
 *  - la preuve réelle qu'elle demande au dossier (jamais posée sans elle, sauf les réalisations d'artisans, que SINA
 *    crée quand le client n'en a pas assez : règle maintenue le 14 novembre 2026).
 * Toute pièce de la bibliothèque a sa ligne ici : une pièce ajoutée sans elle arrête le chargement (tenue.ts).
 * Données seules, sans IA, sans import : tenue.ts pose chaque ligne sur sa pièce (champ « ordre »).
 */
export type Forme =
  | "coque" | "page" | "ouverture" | "grande-photo" | "photos" | "texte-photo" | "cartes" | "liste" | "etapes" | "volets"
  | "tableau" | "formulaire" | "grand-texte" | "bande" | "avis" | "avant-apres" | "deux-temps" | "deux-listes" | "achat"
  | "offres" | "frise" | "schema" | "chiffres" | "sceau" | "choix" | "villes" | "liste-prix" | "portraits" | "look";

export type TraitOrdre = "offre" | "prix" | "livraison" | "zone" | "preuve" | "reassurance" | "abstrait" | "doutes" | "action" | "personne";

/** Les preuves réelles qu'un dossier peut contenir (preuves.ts les cherche ; une pièce n'en demande qu'une). */
export type PreuveId = "avis" | "realisations" | "qualifications" | "anciennete" | "chiffres" | "presse" | "documents" | "equipe" | "clients" | "avant-apres";

export type OrdrePiece = { forme: Forme; traits?: TraitOrdre[]; /** Preuve réelle que la pièce montre. */ preuve?: PreuveId };

const o = (forme: Forme, traits: TraitOrdre[] = [], preuve?: PreuveId): OrdrePiece => ({ forme, ...(traits.length ? { traits } : {}), ...(preuve ? { preuve } : {}) });
const coque = o("coque"), page = o("page"), ouverture = o("ouverture");

export const ORDRE_PIECES: Record<string, OrdrePiece> = {
  // ── Le socle
  "tn-entete": coque, "tn-pied": coque,
  "tn-ouverture": ouverture,
  "tn-bande": o("grande-photo"),
  "tn-de-pres": o("photos"),
  "tn-achat": o("achat", ["offre", "prix", "livraison", "reassurance"]),
  "tn-description": o("volets"),
  "tn-emotion": o("grande-photo", ["abstrait"]),
  "tn-places": o("photos"),
  "tn-mesures": o("schema"),
  "tn-questions": o("volets", ["doutes"]),
  "tn-final": o("bande", ["action"]),
  "tn-404": page, "tn-panier": page, "tn-compte": page, "tn-legal": page,
  "tn-contact": o("formulaire", ["action"]),
  "tn-atouts": o("liste", ["reassurance"]),
  "tn-produits": o("cartes", ["offre", "prix"]),
  "tn-histoire": o("texte-photo", ["personne"]),
  // ── Le produit
  "tn-fiche-technique": o("tableau"),
  "tn-colis": o("liste"),
  "tn-pour-qui": o("deux-listes"),
  "tn-essayer": o("liste", ["reassurance"]),
  "tn-echelle": o("texte-photo"),
  "tn-valeurs": o("tableau"),
  "tn-documents": o("liste", ["preuve"], "documents"),
  "tn-preuves": o("liste", ["preuve"], "documents"),
  "tn-accords": o("deux-listes"),
  "tn-notes": o("etapes"),
  "tn-grade": o("sceau"),
  "tn-effets": o("frise"),
  "tn-cout": o("chiffres"),
  "tn-ration": o("tableau"),
  "tn-prix-explique": o("tableau", ["reassurance"]),
  "tn-preparation": o("etapes"),
  "tn-transition": o("schema"),
  "tn-semis": o("frise"),
  "tn-composition": o("photos"),
  "tn-comparatif": o("tableau"),
  "tn-avis": o("avis", ["preuve"], "avis"),
  "tn-catalogue": o("cartes", ["offre", "prix"]),
  "tn-rayons": o("cartes", ["offre"]),
  "tn-garanties": o("liste", ["reassurance", "doutes", "livraison"]),
  // ── Les services
  "tn-ouverture-metier": o("ouverture", ["zone"]),
  "tn-prestations": o("liste-prix", ["offre", "prix"]),
  "tn-tarifs": o("tableau", ["offre", "prix"]),
  "tn-exemples-prix": o("offres", ["prix"]),
  "tn-aides": o("tableau"),
  "tn-rdv": o("formulaire", ["action"]),
  "tn-devis": o("formulaire", ["action"]),
  "tn-disponibilites": o("formulaire", ["action"]),
  "tn-agenda": o("liste", ["offre"]),
  "tn-planning": o("tableau", ["offre"]),
  "tn-retrait": o("formulaire", ["action"]),
  "tn-vitrine": o("liste-prix", ["offre"]),
  "tn-origines": o("tableau"),
  "tn-realisations": o("photos", ["preuve"], "realisations"),
  "tn-avant-apres": o("avant-apres", ["preuve"], "realisations"),
  "tn-equipe": o("portraits", ["personne"], "equipe"),
  "tn-zone": o("villes", ["zone"]),
  "tn-acces": o("texte-photo"),
  "tn-deroule": o("etapes"),
  "tn-urgence": o("bande", ["action"]),
  "tn-labels": o("liste", ["preuve", "reassurance", "doutes"], "qualifications"),
  "tn-vendus": o("photos", ["preuve"], "realisations"),
  // ── Le récit
  "tn-texte-photo": o("texte-photo"),
  "tn-fabrication": o("etapes"),
  "tn-engagements": o("liste", ["reassurance", "doutes"]),
  "tn-chiffres": o("chiffres", ["preuve"], "chiffres"),
  "tn-presse": o("avis", ["preuve"], "presse"),
  "tn-citation": o("grand-texte", ["abstrait"]),
  "tn-citation-photo": o("grande-photo", ["abstrait"]),
  "tn-mosaique": o("photos"),
  "tn-manifeste": o("grand-texte", ["abstrait"]),
  "tn-frise": o("frise"),
  "tn-comment": o("etapes"),
  "tn-fondateur": o("texte-photo", ["personne"]),
  "tn-journal": page, "tn-article": page, "tn-resultats": page,
  "tn-suivi": o("formulaire"),
  "tn-infolettre": o("bande", ["action"]),
  "tn-infolettre-photo": o("texte-photo", ["action"]),
  "tn-annonce": coque, "tn-cookies": coque, "tn-pays": coque, "tn-age": coque, "tn-discussion": coque,
  "tn-ouverture-nom": ouverture, "tn-ouverture-collage": ouverture, "tn-ouverture-carte": ouverture, "tn-ouverture-formes": ouverture, "tn-ouverture-flou": ouverture,
  // ── La coque
  "tn-pied-complet": coque, "tn-entete-liens": coque, "tn-entete-annonce": coque, "tn-entete-services": coque, "tn-pied-lettre": coque, "tn-pied-services": coque, "tn-pied-reassurance": coque,
  // ── L'achat
  "tn-versions": o("liste"),
  "tn-guide-tailles": o("tableau"),
  "tn-lots": o("offres", ["prix"]),
  "tn-looks": o("look"),
  "tn-allergenes": o("liste"),
  "tn-avant-apres-produit": o("avant-apres", ["preuve"], "avant-apres"),
  "tn-pictos": o("liste"),
  "tn-probleme-reponse": o("deux-temps"),
  "tn-nous-et-autres": o("tableau"),
  "tn-appel-produit": o("achat", ["offre", "prix", "livraison", "action"]),
  "tn-livraison": o("etapes", ["reassurance", "livraison"]),
  "tn-garantie": o("sceau", ["reassurance", "doutes"]),
  "tn-mur-avis": o("avis", ["preuve"], "avis"),
  "tn-avantages": o("photos"),
  "tn-packs": o("offres", ["prix"]),
  "tn-sous-bouton": o("liste", ["reassurance", "livraison"]),
  "tn-offre-moment": o("offres", ["prix"]),
  "tn-fenetre-offre": coque,
  "tn-rappel-achat": o("bande", ["action"]),
  "tn-coloris": o("photos"),
  // ── Les métiers
  "tn-biens": o("cartes", ["offre", "prix"]),
  "tn-recherche-biens": o("formulaire", ["offre"]),
  "tn-bien-galerie": o("achat", ["offre", "prix"]),
  "tn-bien-caracteristiques": o("tableau"),
  "tn-bien-energie": o("schema"),
  "tn-bien-quartier": o("texte-photo"),
  "tn-bien-visite": o("formulaire", ["action"]),
  "tn-carte": o("liste-prix", ["offre", "prix"]),
  "tn-reserver-table": o("formulaire", ["action"]),
  "tn-rdv-complet": o("formulaire", ["action", "offre", "prix"]),
  "tn-inscription": o("formulaire", ["action"]),
  // ── Les pages simples
  "tn-panier-cote": coque,
  "tn-recherche": page, "tn-merci": page, "tn-fermee": page,
  "tn-questions-rubriques": o("volets", ["doutes"]),
  // ── La vente directe
  "tn-messages": o("coque", ["livraison"]),
  "tn-ouverture-vente": ouverture,
  "tn-produits-vente": o("cartes", ["offre", "prix"]),
  "tn-difference": o("texte-photo"),
  "tn-guide-choix": o("choix", ["offre"]),
  "tn-entete-arrivee": coque, "tn-pied-arrivee": coque,
  "tn-ouverture-arrivee": ouverture,
  "tn-raisons": o("liste"),
  "tn-equation": o("grand-texte", ["abstrait"]),
  "tn-temoignages": o("avis", ["preuve"], "avis"),
  "tn-barre-produit": o("coque", ["action"]),
  "tn-avis-page": o("page", ["preuve"], "avis"),
};

/** Mots simples d'une disposition, pour le dire au concepteur. */
export const FORME_LABEL: Record<Forme, string> = {
  coque: "coque du site", page: "page entière", ouverture: "ouverture", "grande-photo": "grande photo pleine largeur", photos: "file ou grille de photos", "texte-photo": "texte et photo côte à côte",
  cartes: "cartes", liste: "liste de lignes", etapes: "étapes numérotées", volets: "volets qui s'ouvrent", tableau: "tableau", formulaire: "formulaire", "grand-texte": "grande phrase seule", bande: "bande d'appel",
  avis: "paroles citées", "avant-apres": "deux photos avant et après", "deux-temps": "deux temps face à face", "deux-listes": "deux listes face à face", achat: "bloc d'achat", offres: "cartes d'offres ou de prix",
  frise: "frise dans le temps", schema: "schéma", chiffres: "chiffres en grand", sceau: "sceau de garantie", choix: "guide de choix", villes: "liste de villes sur une vue du pays", "liste-prix": "liste de prestations ou de plats avec leurs prix", portraits: "les personnes, une par une", look: "une grande photo et les produits qui la composent",
};
