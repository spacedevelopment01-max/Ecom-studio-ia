/**
 * Visuels des démonstrations montrés sur l'accueil : seules FRAISE, ONDE, ORBE et Atelier Rive (priorité du 19 octobre
 * 2026, issue #137). Aucune curation particulière : les visuels viennent du manifeste (kit privé, hors dépôt) et une
 * case sans création réelle reste vide, jamais remplie par un gabarit ni par une photo de banque.
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
  // Quatre démonstrations seulement (priorité du 19 octobre 2026) : aucune curation particulière, les visuels viennent
  // du manifeste (kit privé) et une case sans création réelle reste vide plutôt que remplie par un gabarit.
};

/** Fichiers d'une démonstration qui ne doivent jamais apparaître sur l'accueil. */
export const HOME_EXCLUDED_FILES: string[] = [];

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

/** Vidéos de démonstration de l'accueil : aucune retenue pour les quatre démonstrations (voir ci-dessous). */
export const DEMO_FILMS: { id: string; src: string; poster: string; label: [string, string] }[] = [
  // Aucune vidéo retenue pour les quatre démonstrations (les clips de test des stories ne sont pas des films) : la
  // rubrique « Vidéos de démonstration » reste vide plutôt que de montrer un film d'une ancienne démo.
];

/** Démo choisie pour chaque section de l'accueil : les sections tournent entre les six démos (consigne du propriétaire). */
// Ordre des sections sur l'accueil : marques (boards) → boutiques (stores) → thèmes (vignettes ONDE) → avant / après →
// fils (feeds) → textes (seo) → calendrier → personnalisation (control) : jamais deux fois de suite la même démo.
export const SECTION_DEMO = {
  boards: "rive",
  stores: "fraise",
  beforeAfter: "orbe",
  feeds: "fraise",
  seo: "rive",
  calendar: "onde",
  control: "orbe",
} as const;

/** Publications du calendrier « Votre semaine de publications » : aucune préparée pour les quatre démonstrations. */
export const CALENDAR_POSTS: { src: string; network: string; caption: [string, string] }[] = [
  // Les publications des quatre démonstrations relèvent du chantier Publications (Codex) : rien n'est inventé ici.
];
