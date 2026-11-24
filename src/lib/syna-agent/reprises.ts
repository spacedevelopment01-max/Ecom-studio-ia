/**
 * DEUX REPRISES AU PLUS, PARTOUT (22 novembre 2026, proposition acceptée par le propriétaire) : une création refusée par
 * son relecteur est refaite deux fois au plus, avec toutes les raisons de ses refus ; ensuite SINA montre honnêtement ce
 * qui reste raté (« une image ratée est dite ratée »), sans repayer encore. Chaque chaîne de création s'y tient (vérifié
 * par tests/sina-deux-reprises.test.ts) : les images de la planche (2), le logo (2), les publications (2), les angles
 * (1), les textes et les photos du site (1, puis une seconde pour une photo en double), la galerie (1), la relectrice des
 * messages (1).
 *
 * EXCEPTION (méthode des publications validée le 24 novembre 2026, plan accepté « Oui au plan des publications, tel
 * quel ») : une publication de la planche faite par cette méthode est refaite UNE seule fois, à la charge du Studio, avec
 * la MÊME demande exacte, sans raison ajoutée (la demande validée ne change jamais) ; refusée deux fois, elle n'est pas
 * montrée, et SINA le dit (`REPRISES_DES_PUBLICATIONS_METHODE`, brand-images.ts).
 */
export const REPRISES_MAX = 2;
/** Reprises d'une publication de la méthode : une seule, même demande exacte, à la charge du Studio. */
export const REPRISES_DES_PUBLICATIONS_METHODE = 1;
