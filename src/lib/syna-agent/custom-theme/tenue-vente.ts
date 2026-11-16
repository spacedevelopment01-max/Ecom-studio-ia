/**
 * Thème unique du Studio (lot 4, référence partie 15) — module « vente » : le site entier d'une boutique de vente
 * directe (accueil, collection, page d'arrivée de publicité, page des avis), au-delà de la fiche produit. Ses pièces
 * nouvelles (VENTE_SECTIONS) et les façons de bâtir ajoutées à des pièces d'autres modules (VENTE_FACONS : identifiant
 * de la pièce → ses constructions, la première étant le rendu d'origine). Feuille : public/sections/tenue-vente.css.
 * Règles : docs/sina-savoir/sections-a-tenue.md.
 */
import type { Construction, TenueSection } from "./tenue-base";

export const VENTE_SECTIONS: TenueSection[] = [];

export const VENTE_FACONS: Record<string, Construction[]> = {};
