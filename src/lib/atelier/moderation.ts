/**
 * La vérification gratuite d'OpenAI, remplaçable dans les essais : l'atelier (demandes et photos avant tout devis) et
 * toute photo déposée dans le Studio (`verification-photos.ts`) passent par elle. Jamais au niveau « bas » : la
 * modération des images d'OpenAI reste au niveau par défaut (`niveauModeration`, garde-fous.ts).
 */
import { appelModeration } from "./moderation-appel";

type Appel = (body: unknown) => Promise<any | null>;
let courant: Appel = appelModeration;

/** L'appel de vérification en service (un essai le remplace ; null le remet). */
export const moderation: Appel = (body) => courant(body);
export const remplacerModeration = (f: Appel | null) => { courant = f ?? appelModeration; };
export { appelModeration };
