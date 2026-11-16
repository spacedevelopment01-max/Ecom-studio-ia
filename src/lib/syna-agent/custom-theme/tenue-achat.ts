/**
 * Thème unique du Studio (lot 4, référence partie 15) — module « achat » : ses pièces nouvelles (ACHAT_SECTIONS) et les
 * façons de bâtir ajoutées à des pièces d'autres modules (ACHAT_FACONS : identifiant de la pièce → ses constructions,
 * la première étant le rendu d'origine). Feuille : public/sections/tenue-achat.css. Règles : docs/sina-savoir/sections-a-tenue.md.
 */
import type { Construction, TenueSection } from "./tenue-base";

export const ACHAT_SECTIONS: TenueSection[] = [];

export const ACHAT_FACONS: Record<string, Construction[]> = {};
