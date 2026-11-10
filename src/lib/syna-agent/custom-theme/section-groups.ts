/**
 * Familles de sections du thème sur mesure, dans l'ordre d'une page (demande du propriétaire du 10 novembre 2026 :
 * « réunir par famille les sections, le header avec le header… », avant de monter lui-même un accueil). Chaque section
 * de la bibliothèque appartient à UNE famille ; les rôles d'origine (37, souvent flous) restent pour les anciens
 * contrôles. Gratuit, sans IA.
 */
import { sectionLibrary, type LibSection } from "./library";

export type SectionGroupId =
  | "en-tete" | "bandeau" | "ouverture" | "produits" | "rayons" | "produit-vedette" | "produit-en-scene" | "histoire"
  | "preuves" | "contenus" | "offres" | "questions" | "inscription" | "pied-de-page"
  | "fiche-produit" | "categorie" | "panier" | "pages" | "partout" | "metiers";

export type SectionGroup = { id: SectionGroupId; label: string; does: string; page: "accueil" | "fiche" | "categorie" | "panier" | "pages" | "partout" | "metiers" };

/** Les familles, dans l'ordre où elles se lisent sur une page. */
export const SECTION_GROUPS: SectionGroup[] = [
  { id: "en-tete", label: "En-tête", does: "Le logo, le menu, la recherche et le panier, en haut de toutes les pages.", page: "partout" },
  { id: "bandeau", label: "Bandeau du haut", does: "Une fine bande au-dessus de l'en-tête : livraison, offre du moment.", page: "partout" },
  { id: "ouverture", label: "Ouverture", does: "Le premier écran de l'accueil : la grande image et la promesse.", page: "accueil" },
  { id: "produits", label: "Produits", does: "Les produits en cartes, en carrousel ou en défilement.", page: "accueil" },
  { id: "rayons", label: "Familles de produits", does: "Les grandes familles de la boutique, pour choisir par où commencer.", page: "accueil" },
  { id: "produit-vedette", label: "Produit vedette", does: "Tout pour acheter un produit sans quitter la page (haut de la fiche produit, ou une fois sur l'accueil).", page: "accueil" },
  { id: "produit-en-scene", label: "Produit mis en scène", does: "Le produit dans une photo, ses points forts, sa composition.", page: "accueil" },
  { id: "histoire", label: "Histoire de la marque", does: "Qui fait la marque, sa promesse, ses chiffres, son univers.", page: "accueil" },
  { id: "preuves", label: "Preuves et confiance", does: "Avis, garanties, engagements, presse, photos de clients.", page: "accueil" },
  { id: "contenus", label: "Contenus à vivre", does: "Stories, avant / après, galerie, mode d'emploi, quiz, comparatif.", page: "accueil" },
  { id: "offres", label: "Offres", does: "Coffret à composer, code promo, offre du moment (seulement les vraies offres du client).", page: "accueil" },
  { id: "questions", label: "Questions fréquentes", does: "Les réponses aux doutes avant l'achat.", page: "accueil" },
  { id: "inscription", label: "Inscription à la lettre", does: "La lettre d'information, en bande ou en fenêtre.", page: "accueil" },
  { id: "pied-de-page", label: "Pied de page", does: "Les liens, l'inscription, les mentions, en bas de toutes les pages.", page: "partout" },
  { id: "fiche-produit", label: "Fiche produit", does: "Les sections propres à la fiche : onglets, guide, lots, abonnement, avis du produit.", page: "fiche" },
  { id: "categorie", label: "Page catégorie", does: "La liste des produits d'une collection, avec filtres et tri.", page: "categorie" },
  { id: "panier", label: "Panier", does: "La page panier, le panier qui s'ouvre sur le côté, la livraison offerte, le cadeau.", page: "panier" },
  { id: "pages", label: "Pages simples", does: "Contact, compte, aide, mentions légales, journal, recherche, page introuvable, commande.", page: "pages" },
  { id: "partout", label: "Effets de tout le site", does: "Bulle vidéo, bouton qui attire l'œil, mini-panier, menu plein écran.", page: "partout" },
  { id: "metiers", label: "Métiers et services", does: "Prestations, devis, chantiers, rendez-vous, restaurant, immobilier, soins.", page: "metiers" },
];

/** Sections rangées à la main (le rôle d'origine ne suffit pas). */
const BY_ID: Record<string, SectionGroupId> = {
  // Haut du site
  "bandeau-d-annonce": "bandeau", "barre-compte-a-rebours": "bandeau",
  "menu-plein-ecran": "partout", "bulle-video-d-accueil": "partout", "bouton-qui-attire-l-il": "partout",
  "mini-panier-deroulant": "partout", "mini-panier-qui-surgit": "partout", "recherche-plein-ecran": "partout",
  "bouton-d-achat-toujours-visible": "fiche-produit",
  // Ouverture
  "photo-devoilee-par-une-forme": "ouverture", "ouverture-avec-reservation-integree": "metiers",
  // Produits et familles
  "catalogue-avec-filtres-et-tri": "categorie", "grille-a-filtres-animes": "categorie",
  "familles-en-cartes-defilantes": "rayons", "familles-en-eventail": "rayons", "choisir-selon-le-moment": "rayons",
  // Produit mis en scène
  "scene-achetable": "produit-en-scene", "photo-a-points-cliquables": "produit-en-scene", "tenue-a-points": "produit-en-scene",
  "compose-ta-tenue": "produit-en-scene", "carnet-de-looks": "produit-en-scene", "matiere-a-la-loupe": "produit-en-scene",
  "histoire-du-produit-au-defilement": "produit-en-scene", "points-forts-du-produit": "produit-en-scene",
  "profil-du-melange": "produit-en-scene", "composition-interactive": "produit-en-scene", "grille-bento": "produit-en-scene",
  "lancement-facon-drop": "produit-en-scene", "produit-qui-tourne-a-360": "produit-en-scene",
  // Histoire de la marque
  "citation-en-grand": "histoire", "texte-qui-s-allume-en-lisant": "histoire", "grand-texte-defilant": "histoire",
  "manifeste-en-images": "histoire", "chiffres-cles": "histoire", "grille-editoriale": "histoire",
  "l-edition-de-saison": "histoire", "capsule-numerotee": "histoire", "journal-facon-magazine": "histoire",
  "histoire-en-frise": "histoire", "l-atelier-et-la-personne-derriere": "histoire", "a-propos-editorial": "pages",
  "bandeaux-croises-fluo": "histoire", "tournee-des-boutiques-ephemeres": "histoire",
  // Preuves
  "ils-parlent-de-nous": "preuves", "vos-photos-photos-de-clients": "preuves", "videos-verticales": "preuves",
  "resume-des-avis": "fiche-produit", "avis-et-ajustement": "fiche-produit",
  // Modèle des avis choisi par le propriétaire (revue du 10 novembre 2026) : sert aussi aux boutiques de produits.
  "garanties-et-assurances": "metiers", "note-et-avis-en-bandeau": "preuves",
  // Contenus à vivre
  "histoires-facon-stories": "contenus", "avant-apres": "contenus", "galerie-avec-visionneuse": "contenus",
  "mode-d-emploi-en-etapes": "contenus", "cartes-qui-s-empilent": "contenus", "quiz-quel-produit-pour-toi": "contenus",
  "comparatif-nous-les-autres": "contenus", "comparateur-de-produits": "contenus", "defilement-horizontal": "produits",
  // Offres
  "compose-ton-coffret": "offres", "offre-en-deux-tuiles": "offres", "code-promo-a-copier": "offres",
  "carte-a-gratter": "offres", "compte-a-rebours-en-bloc": "offres", "bon-cadeau": "offres",
  // Fiche produit
  "complete-ta-commande": "fiche-produit", "offre-par-quantite": "fiche-produit", "questions-sur-le-produit": "fiche-produit",
  // Emballage cadeau : seulement dans le panier (revue du 10 novembre 2026).
  "entre-deux-tailles": "fiche-produit", "emballage-cadeau-en-option": "panier", "souvent-achetes-ensemble": "fiche-produit",
  // Questions
  "questions-en-bulles-de-discussion": "questions", "questions-numerotees": "questions",
  "questions-avec-recherche": "pages", "recherche-guidee": "questions",
  // Inscription
  "fenetre-d-inscription": "inscription",
  // Pages simples
  "suivi-de-commande-et-aide": "pages", "aide-et-suivi-de-commande": "pages", "recherche-instantanee": "pages",
  "article-avec-barre-de-lecture": "pages", "le-journal-liste-des-articles": "pages", "article-du-journal": "pages",
  "horaires-et-infos-pratiques": "metiers",
};

/** Famille par rôle d'origine, pour les sections non rangées à la main. */
const BY_ROLE: Record<string, SectionGroupId> = {
  "en-tête": "en-tete", "ouverture": "ouverture", "produits": "produits", "rayons": "rayons", "navigation": "rayons",
  "produit vedette": "produit-vedette", "produit": "fiche-produit", "lot": "fiche-produit", "mise en avant": "produit-en-scene",
  "marque": "histoire", "à propos": "histoire", "effet": "histoire", "confiance": "preuves", "contenu": "contenus",
  "conversion": "offres", "comparatif": "contenus", "guide d'achat": "rayons", "aide": "questions", "inscription": "inscription",
  "pied de page": "pied-de-page", "panier": "panier", "commande": "pages", "compte": "pages", "contact": "pages",
  "légal": "pages", "404": "pages", "journal": "pages", "recherche": "pages", "accueil": "partout", "looks": "produit-en-scene",
  "services": "metiers", "restaurant": "metiers", "immobilier": "metiers", "beauté": "metiers", "bien-être": "metiers",
  "restaurant, boutique ou cabinet": "metiers", "boutique, restaurant ou soins": "metiers",
};

export function sectionGroup(s: Pick<LibSection, "id" | "role">): SectionGroupId | null {
  return BY_ID[s.id] ?? BY_ROLE[s.role] ?? null;
}

/** Sections d'une famille, pour une famille de style (Classique ou Moderne). */
export function sectionsOfGroup(group: SectionGroupId, family?: string): LibSection[] {
  return sectionLibrary().sections.filter((s) => !s.demoFrame && sectionGroup(s) === group && (!family || s.family === family));
}
