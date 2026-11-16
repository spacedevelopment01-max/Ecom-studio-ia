/**
 * Thème unique du Studio (lot 4, référence partie 15) — module « metiers » : ses pièces nouvelles (METIERS_SECTIONS) et les
 * façons de bâtir ajoutées à des pièces d'autres modules (METIERS_FACONS : identifiant de la pièce → ses constructions,
 * la première étant le rendu d'origine). Feuille : public/sections/tenue-metiers.css. Règles : docs/sina-savoir/sections-a-tenue.md.
 */
import type { Construction, TenueSection } from "./tenue-base";

export const METIERS_SECTIONS: TenueSection[] = [];

export const METIERS_FACONS: Record<string, Construction[]> = {};
