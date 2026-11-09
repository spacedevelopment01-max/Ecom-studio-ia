/**
 * Compositions d'exemple des familles (SOLSTICE pour Moderne · Sport chic, RUPTURE pour Moderne · Streetwear néon, Brindi
 * pour Classique) : contrôles et démonstrations seulement. Un client n'en reçoit jamais une (décision du propriétaire du
 * 9 novembre 2026) : SINA monte son thème sur mesure de A à Z avec les meilleures sections pour son produit ou son service.
 */
import type { FamilyId } from "../section-families";
import { sectionByRef } from "./library";
import { newUid, type CustomTheme } from "./theme";

type Starter = { header: string; footer: string; search: string | null; pages: [key: string, label: string, sections: string[]][] };

export const STARTERS: Record<string, Starter> = {
  "sport-chic": {
    header: "En-tête pilule", footer: "Pied de page mot géant", search: "Recherche plein écran",
    pages: [
      ["home", "Accueil", ["Ouverture « mot géant »", "Les pièces du moment", "Carnet de looks", "L'édition de saison", "Ouverture à volets", "Grille éditoriale", "Garanties à retourner", "Bande code de bienvenue"]],
      ["shop", "Boutique", ["Ouverture éditoriale", "Offre en deux tuiles", "Choisis ton terrain", "Compose ta tenue"]],
      ["product", "Fiche produit", ["Produit vedette · grand nom", "Avis et ajustement", "Matière à la loupe", "Bande fluo des engagements", "Tenue à points", "Questions numérotées", "Vidéos verticales"]],
      ["cart", "Panier", ["Page panier éditoriale"]],
      ["commande", "Commande", ["Commande en une page"]],
      ["merci", "Commande confirmée", ["Commande confirmée"]],
      ["compte", "Mon compte", ["Connexion au compte"]],
      ["aide", "Aide et suivi", ["Aide et suivi de commande"]],
      ["journal", "À propos & journal", ["À propos éditorial", "Journal façon magazine"]],
      ["article", "Article", ["Article du journal"]],
      ["contact", "Contact", ["Boutique et contact"]],
      ["legal", "Légal", ["Informations légales"]],
      ["404", "Page 404", ["Page 404"]],
    ],
  },
  "streetwear-neon": {
    header: "En-tête à annonces et grand menu", footer: "Pied de page streetwear", search: "Recherche plein écran",
    pages: [
      ["home", "Accueil", ["Ouverture « drop »", "Bandeaux croisés fluo", "Fraîchement sorti", "Manifeste en images", "Bande fluo des engagements", "Capsule numérotée", "Vus dans la rue", "Sois là avant les autres"]],
      ["shop", "Boutique", ["Ouverture en diaporama", "Rayons en liste géante", "Grille à filtres animés"]],
      ["product", "Fiche produit", ["Produit vedette · galerie défilante", "Garanties à retourner", "Entre deux tailles ?", "Avis et ajustement", "Matière à la loupe", "Questions numérotées", "Vestiaire en double défilement"]],
      ["cart", "Panier", ["Panier tiroir néon"]],
      ["commande", "Commande", ["Commande en une page"]],
      ["merci", "Commande confirmée", ["Commande confirmée"]],
      ["compte", "Mon compte", ["Connexion au compte"]],
      ["aide", "Aide et suivi", ["Aide et suivi de commande"]],
      ["about", "À propos", ["Ouverture mot-fenêtre", "Tournée des boutiques éphémères"]],
      ["contact", "Contact", ["Boutique et contact"]],
      ["legal", "Légal", ["Informations légales"]],
      ["404", "Page 404", ["Page 404"]],
    ],
  },
  classique: {
    header: "En-tête classique", footer: "Pied de page géant", search: null,
    pages: [
      ["home", "Accueil", ["Ouverture photo pleine", "Collection en vedette", "Grille bento", "Questions en bulles de discussion", "Grand texte défilant", "Comparatif « nous / les autres »"]],
      ["product", "Fiche produit", ["Produit vedette", "Points forts du produit", "Code promo à copier", "Comparateur de produits", "Questions sur le produit"]],
      ["cart", "Panier", ["Page panier complète"]],
      ["404", "Page 404", ["Page introuvable (404)"]],
    ],
  },
};

/** Thème de départ d'une famille et d'un style (sections retrouvées par leur titre dans la bibliothèque). */
export function starterTheme(family: FamilyId, style: string): CustomTheme {
  const st = STARTERS[family === "classique" ? "classique" : style] ?? STARTERS["sport-chic"];
  const ref = (title: string) => {
    const l = sectionByRef(title);
    if (!l) throw new Error(`section de départ introuvable : ${title}`);
    return { uid: newUid(), id: l.id };
  };
  return {
    version: 1, family, style: family === "classique" ? "classique" : style,
    header: ref(st.header), footer: ref(st.footer), search: st.search ? ref(st.search) : null,
    pages: st.pages.map(([key, label, secs]) => ({ key, label, sections: secs.map(ref) })),
    rev: 0, at: Date.now(),
  };
}
