/**
 * Visuels des démonstrations montrés sur l'accueil : uniquement ceux créés par l'IA et vérifiés sans défaut
 * (consigne du propriétaire, 16 octobre 2026). Les visuels faits par gabarit du studio (photo + texte posé en local)
 * sont retirés de l'accueil, sans être remplacés par un autre gabarit ni par une photo de banque.
 *
 * ARVEN (montre), visuels regardés un par un :
 *  - gardés : logo (créé par l'IA, fourni comme par le client) ; photo de départ (montre complétée par l'IA, bracelet
 *    et boucle entiers) ; détourage de cette photo (le produit tel quel) ; mises en situation lifestyle-1, -2, -3
 *    (créées par l'IA : montre entière, bracelet complet avec la boucle, cadran et lunette fidèles, aucun texte ajouté) ;
 *    captures de la boutique (la boutique elle-même, pas un visuel publicitaire).
 *  - retirés : publications post-1 à post-8 (gabarits, texte posé en local, « Chronographe » au lieu de « montre ») ;
 *    planche d'identité (composée par gabarit, « Anthracite » en double) ; vidéo et son affiche (fond uni et
 *    « Voici Chronographe acier et cuir »).
 * Les mêmes fichiers servent encore ailleurs (studio Découverte) : hors de l'accueil, rien n'est changé ici.
 */
import type { Demo } from "@/components/landing-client";

type Curation = { posts?: false; board?: false; video?: false; images?: RegExp };

export const HOME_CURATION: Record<string, Curation> = {
  montre: { posts: false, board: false, video: false, images: /détourage|cutout|situation|in context|lifestyle/i },
};

/** Fichiers d'une démonstration qui ne doivent jamais apparaître sur l'accueil. */
export const HOME_EXCLUDED_FILES = [
  ...Array.from({ length: 8 }, (_, i) => `/demo/montre/post-${i + 1}`),
  "/demo/montre/planche",
  "/demo/montre/video-poster",
  "/demo/montre/video.mp4",
];

export function curateForHome(d: Demo): Demo {
  const c = HOME_CURATION[d.id];
  if (!c) return d;
  return {
    ...d,
    posts: c.posts === false ? [] : d.posts,
    board: c.board === false ? undefined : d.board,
    video: c.video === false ? "" : d.video,
    videoPoster: c.video === false ? "" : d.videoPoster,
    images: c.images ? d.images.filter((x) => c.images!.test(x.label)) : d.images,
  };
}
