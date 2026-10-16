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
 *    Ajoutés pour l'accueil seul : fond blanc packshot-1 (retrouvé dans l'historique) et une publicité créée par l'IA.
 *  - écartés de la carte « Images » : lifestyle-2 et -3 (IA, sans défaut, mais presque la même image que lifestyle-1 :
 *    même angle, décor proche). Ils restent dans les captures de la boutique, qui les utilise.
 *  - retirés : publications post-1 à post-8 (gabarits, texte posé en local, « Chronographe » au lieu de « montre ») ;
 *    planche d'identité (composée par gabarit, « Anthracite » en double) ; vidéo et son affiche (fond uni et
 *    « Voici Chronographe acier et cuir »).
 * Les mêmes fichiers servent encore ailleurs (studio Découverte) : hors de l'accueil, rien n'est changé ici.
 */
import type { Demo } from "@/components/landing-client";

/** images : liste des seules images gardées (adresse exacte) ; extra : images IA vérifiées ajoutées pour l'accueil seul. */
type Curation = {
  posts?: false;
  board?: false;
  /** false : vidéo retirée ; sinon film et affiche vérifiés à montrer à la place de ceux du manifeste. */
  video?: false | { src: string; poster: string };
  /** false : captures retirées ; sinon captures refaites (sans défaut) à la place de celles du manifeste. */
  shop?: false | { desktop: string; mobile: string; direction?: string };
  liveAd?: false;
  wall?: string[];
  images?: string[];
  extra?: { src: string; label: string }[];
  /** Publicité faite dans l'éditeur du studio (texte modifiable), dans les quatre formats. */
  editorAd?: { title: string; formats: { aspect: "1:1" | "4:5" | "9:16" | "16:9"; src: string }[] };
  /** Publications du calendrier de démonstration (visuels vérifiés). */
  social?: { src: string; network: string; caption: [string, string] }[];
};

export const HOME_CURATION: Record<string, Curation> = {
  // Quatre cases toutes différentes voulues par le propriétaire : une seule mise en situation (lifestyle-2 et -3 trop
  // proches de lifestyle-1) ; « Fond blanc » et « Publicité » n'existent pas encore en IA : rien n'est montré à leur place.
  montre: {
    posts: false,
    board: false,
    // Film publicitaire ARVEN déjà payé (ARVEN_PUBLICITE_VIDEO : Qwen-Image 3.0 Pro + Wan 3.0), regardé image par image
    // toutes les 0,5 s : montre fidèle, textes exacts (« LE DÉTAIL. », « L'ALLURE. », « Le temps vous va bien. »,
    // « DÉCOUVRIR »), logo exact, aucun « chronographe ». Compressé pour le web (540 × 960) ; affiche tirée du film.
    video: { src: "/demo/montre/film-ia.mp4", poster: "/demo/montre/film-ia.jpg" },
    // Captures refaites en local par le moteur de thème (scripts/demo-arven-boutique.ts) avec les images validées : la
    // montre est entière (bracelet et boucle) sur ordinateur et sur téléphone. Les anciennes la coupaient.
    shop: { desktop: "/demo/montre/boutique-ia-bureau.jpg", mobile: "/demo/montre/boutique-ia-mobile.jpg", direction: "atelier" },
    // Publicité créée par l'IA (Qwen-Image 3.0 Pro), choisie par le propriétaire : « Un classique à votre rythme. ».
    // 9:16 d'origine ; 1:1, 4:5 et 16:9 refaits par Qwen à partir d'elle (16/10, 0,24 $), vérifiés un par un. Retouches
    // locales seulement : une bande de mur vide retirée sur le 4:5 (format exact) et le « t » en trop de « vottre »
    // retiré sur le 16:9. Aucune pub composée par le gabarit du studio sur l'accueil (demande du propriétaire).
    editorAd: {
      title: "Un classique à votre rythme.",
      formats: [
        { aspect: "9:16", src: "/demo/montre/publicite-ia-1.jpg" },
        { aspect: "1:1", src: "/demo/montre/publicite-ia-1x1.jpg" },
        { aspect: "4:5", src: "/demo/montre/publicite-ia-4x5.jpg" },
        { aspect: "16:9", src: "/demo/montre/publicite-ia-16x9.jpg" },
      ],
    },
    // Calendrier : les deux publications créées par l'IA, la même publicité au format 4:5 et le film.
    social: [
      { src: "/demo/montre/publicite-ia-1.jpg", network: "Instagram", caption: ["Un classique à votre rythme.", "A classic at your own pace."] },
      { src: "/demo/montre/publication-ia-1.jpg", network: "Facebook", caption: ["Le temps vous va bien.", "Time suits you."] },
      { src: "/demo/montre/publicite-ia-4x5.jpg", network: "Pinterest", caption: ["Un classique à votre rythme.", "A classic at your own pace."] },
      { src: "/demo/montre/film-ia.jpg", network: "TikTok", caption: ["La montre ARVEN en 15 secondes.", "The ARVEN watch in 15 seconds."] },
    ],
    // Démo interactive « éditeur de publicité » : elle compose en direct une publicité par gabarit (montre détourée +
    // texte posé en local) → pas avec la montre.
    liveAd: false,
    // Mur « Créé par le studio » : les deux publications créées par l'IA (Qwen, texte écrit par l'IA), décision du
    // propriétaire : la publicité « minérale » et la publication « velours » (format-9x16-velours.png, boucle cachée).
    wall: ["/demo/montre/publicite-ia-1.jpg", "/demo/montre/publication-ia-1.jpg"],
    images: ["/demo/montre/cutout-1.webp", "/demo/montre/lifestyle-1.jpg"],
    extra: [
      // Fond blanc validé par le propriétaire (16 octobre 2026) : montre entière de 3/4, bracelet et boucle, ombre douce.
      { src: "/demo/montre/packshot-1.jpg", label: "Packshot" },
      // Publicité créée par Qwen-Image 3.0 Pro, texte écrit par l'IA (reports/alibaba-qwen-essai/story-mineral.png),
      // choisie par le propriétaire : « Un classique à votre rythme. », logo exact, aucune fausse lettre ; boucle cachée
      // derrière la pierre (défaut accepté par le propriétaire).
      { src: "/demo/montre/publicite-ia-1.jpg", label: "Publicité IA" },
    ],
  },
};

/** Fichiers d'une démonstration qui ne doivent jamais apparaître sur l'accueil. */
export const HOME_EXCLUDED_FILES = [
  ...Array.from({ length: 8 }, (_, i) => `/demo/montre/post-${i + 1}`),
  "/demo/montre/planche",
  "/demo/montre/video-poster",
  "/demo/montre/video.mp4",
  "/demo/montre/boutique-bureau",
  "/demo/montre/boutique-mobile",
  "/demo/montre/fiche-produit",
];

export function curateForHome(d: Demo): Demo {
  const c = HOME_CURATION[d.id];
  if (!c) return d;
  // Champs du manifeste absents du type (ex. productPage : capture de la fiche produit) : retirés avec la boutique.
  const { productPage: _p, ...rest } = d as Demo & { productPage?: string };
  const shop = c.shop === undefined ? null : c.shop;
  const video = c.video === undefined ? null : c.video;
  return {
    ...(shop !== null ? rest : d),
    direction: shop && shop.direction ? shop.direction : d.direction,
    posts: c.posts === false ? [] : d.posts,
    board: c.board === false ? undefined : d.board,
    video: video === null ? d.video : video === false ? "" : video.src,
    shopDesktop: shop === null ? d.shopDesktop : shop === false ? "" : shop.desktop,
    shopMobile: shop === null ? d.shopMobile : shop === false ? "" : shop.mobile,
    videoPoster: video === null ? d.videoPoster : video === false ? "" : video.poster,
    images: [...(c.images ? d.images.filter((x) => c.images!.includes(x.src)) : d.images), ...(c.extra ?? [])],
  };
}

/** La démo interactive de l'éditeur de publicité peut-elle utiliser ce produit ? */
export const allowsLiveAd = (id: string) => HOME_CURATION[id]?.liveAd !== false;

/** Publications créées par l'IA à ajouter au mur de l'accueil, par démonstration. */
export const wallExtras = (id: string) => HOME_CURATION[id]?.wall ?? [];

/** Publicité de l'éditeur et publications du calendrier préparées pour l'accueil (démonstration donnée). */
export const homeExtras = (id: string) => ({ editorAd: HOME_CURATION[id]?.editorAd ?? null, social: HOME_CURATION[id]?.social ?? [] });

/**
 * Vidéos de démonstration de l'accueil, regardées une image toutes les 0,5 s (16 octobre 2026). Retenues :
 *  - ARVEN : film publicitaire IA (montre fidèle, textes exacts, logo exact, aucun « chronographe ») ;
 *  - Les Tribunes : montage du studio, coupé à 12,9 s avant la carte finale (texte coupé « … « FRANCE » e ») ;
 *  - Racines & Pierres : film du studio (vidéos Pixabay de chantier, mains et pieds seuls, aucun visage) ;
 *  - Atelier Pivoine : montage du studio (vraies photos Pixabay, textes exacts).
 *  - Sonore : film IA (SONORE_VIDEO_WAN, textes exacts, aucune personne) retenu par le propriétaire bien que le casque
 *    ait été créé sur texte seul ; le montage du studio (phrases coupées « et u ») est écarté.
 * Écartée faute de vidéo sans défaut, sur décision du propriétaire (aucune nouvelle génération) :
 *  - Cime : montage presque sans image (écrans de texte vides, « Voici Gourde isotherme », phrase finale coupée).
 */
export const DEMO_FILMS: { id: string; src: string; poster: string; label: [string, string] }[] = [
  { id: "montre", src: "/demo/montre/film-ia.mp4", poster: "/demo/montre/film-ia.jpg", label: ["Film publicitaire, 15 s", "Ad film, 15 s"] },
  { id: "paysagiste", src: "/demo/paysagiste/film-demo.mp4", poster: "/demo/paysagiste/film-demo.jpg", label: ["Création de jardins, 15 s", "Garden design, 15 s"] },
  { id: "casque", src: "/demo/casque/film-ia.mp4", poster: "/demo/casque/film-ia.jpg", label: ["Film publicitaire, 15 s", "Ad film, 15 s"] },
  { id: "fleuriste", src: "/demo/fleuriste/film-demo.mp4", poster: "/demo/fleuriste/film-demo.jpg", label: ["Fleuriste artisan à Lyon, 15 s", "Artisan florist in Lyon, 15 s"] },
  { id: "tribunes", src: "/demo/tribunes/film-demo.mp4", poster: "/demo/tribunes/film-demo.jpg", label: ["T-shirt supporter Lavande, 13 s", "Lavender supporter T-shirt, 13 s"] },
];

/** Démo choisie pour chaque section de l'accueil : les sections tournent entre les six démos (consigne du propriétaire). */
export const SECTION_DEMO = {
  boards: "paysagiste",
  stores: "tribunes",
  beforeAfter: "casque",
  feeds: "fleuriste",
  seo: "gourde",
  calendar: "paysagiste",
  control: "tribunes",
} as const;

/** Publications du calendrier « Votre semaine de publications » (Racines & Pierres) : visuels et textes de la démo. */
export const CALENDAR_POSTS: { src: string; network: string; caption: [string, string] }[] = [
  { src: "/demo/paysagiste/post-3.jpg", network: "Instagram", caption: ["Création de jardin : demandez votre devis.", "Garden design: ask for your quote."] },
  // post-7 écartée : bloc vert clair posé sur la photo.
  { src: "/demo/paysagiste/post-2.jpg", network: "Facebook", caption: ["Création de jardin : terrasse et jardinières.", "Garden design: terrace and planters."] },
  { src: "/demo/paysagiste/post-6.jpg", network: "Pinterest", caption: ["Entretien à l'année.", "Year-round maintenance."] },
  { src: "/demo/paysagiste/post-4.jpg", network: "TikTok", caption: ["Aix-en-Provence et alentours.", "Aix-en-Provence and surroundings."] },
];
