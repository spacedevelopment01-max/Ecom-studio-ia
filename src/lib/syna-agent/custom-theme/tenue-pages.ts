/**
 * Thème unique du Studio (lot 4, référence partie 15) — module « pages » : ses pièces nouvelles (PAGES_SECTIONS) et les
 * façons de bâtir ajoutées à des pièces d'autres modules (PAGES_FACONS : identifiant de la pièce → ses constructions,
 * la première étant le rendu d'origine). Feuille : public/sections/tenue-pages.css. Règles : docs/sina-savoir/sections-a-tenue.md.
 */
import type { Construction, TenueSection } from "./tenue-base";

export const PAGES_SECTIONS: TenueSection[] = [];

export const PAGES_FACONS: Record<string, Construction[]> = {};
