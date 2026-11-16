/**
 * Thème unique du Studio (lot 4, référence partie 15) — module « coque » : ses pièces nouvelles (COQUE_SECTIONS) et les
 * façons de bâtir ajoutées à des pièces d'autres modules (COQUE_FACONS : identifiant de la pièce → ses constructions,
 * la première étant le rendu d'origine). Feuille : public/sections/tenue-coque.css. Règles : docs/sina-savoir/sections-a-tenue.md.
 */
import type { Construction, TenueSection } from "./tenue-base";

export const COQUE_SECTIONS: TenueSection[] = [];

export const COQUE_FACONS: Record<string, Construction[]> = {};
