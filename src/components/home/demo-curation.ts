/**
 * Visuels des démonstrations montrés sur l'accueil : uniquement ceux créés par l'IA et vérifiés sans défaut
 * (consigne du propriétaire, 16 octobre 2026). Les visuels faits par gabarit du studio (photo + texte posé en local)
 * sont retirés de l'accueil, sans être remplacés par un autre gabarit ni par une photo de banque.
 *
 * ARVEN (montre), visuels regardés un par un :
 *  - gardés : logo (créé par l'IA, fourni comme par le client) ; photo de départ (montre complétée par l'IA, bracelet
 *    et boucle entiers) ; détourage de cette photo (le produit tel quel) ; une mise en situation, lifestyle-1 (créée
 *    par l'IA : bureau en bois, livre, fenêtre ; montre entière, bracelet complet avec boucle et passants, cadran et
 *    lunette fidèles, aucun texte ajouté) ; captures de la boutique (la boutique elle-même, pas un visuel publicitaire).
 *    Ajoutés pour l'accueil seul : fond blanc packshot-1 (retrouvé dans l'historique) et une publication créée par l'IA.
 *  - écartés de la carte « Images » : lifestyle-2 et -3 (IA, sans défaut, mais presque la même image que lifestyle-1 :
 *    même angle, décor proche). Ils restent dans les captures de la boutique, qui les utilise.
 *  - retirés : publications post-1 à post-8 (gabarits, texte posé en local, « Chronographe » au lieu de « montre ») ;
 *    planche d'identité (composée par gabarit, « Anthracite » en double) ; vidéo et son affiche (fond uni et
 *    « Voici Chronographe acier et cuir »).
 * Les mêmes fichiers servent encore ailleurs (studio Découverte) : hors de l'accueil, rien n'est changé ici.
 */
import type { Demo } from "@/components/landing-client";

/** images : liste des seules images gardées (adresse exacte) ; extra : images IA vérifiées ajoutées pour l'accueil seul. */
type Curation = { posts?: false; board?: false; video?: false; images?: string[]; extra?: { src: string; label: string }[] };

export const HOME_CURATION: Record<string, Curation> = {
  // Quatre cases toutes différentes voulues par le propriétaire : une seule mise en situation (lifestyle-2 et -3 trop
  // proches de lifestyle-1) ; « Fond blanc » et « Publicité » n'existent pas encore en IA : rien n'est montré à leur place.
  montre: {
    posts: false,
    board: false,
    video: false,
    images: ["/demo/montre/cutout-1.webp", "/demo/montre/lifestyle-1.jpg"],
    extra: [
      // Fond blanc validé par le propriétaire (16 octobre 2026) : montre entière de 3/4, bracelet et boucle, ombre douce.
      { src: "/demo/montre/packshot-1.jpg", label: "Packshot" },
      // Publication créée par Qwen-Image 3.0 Pro, texte écrit par l'IA (reports/alibaba-qwen-essai/format-9x16-velours.png) :
      // « Le temps vous va bien. », logo exact, aucune fausse lettre ; la boucle est cachée dans le velours (signalé).
      { src: "/demo/montre/publication-ia-1.jpg", label: "Publication IA" },
    ],
  },
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
    images: [...(c.images ? d.images.filter((x) => c.images!.includes(x.src)) : d.images), ...(c.extra ?? [])],
  };
}
