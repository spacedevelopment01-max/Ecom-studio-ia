/**
 * Document publicitaire en CALQUES (éditeur visuel des publicités) — source de vérité d'une création V2.
 *
 * Une publicité n'est plus seulement une image aplatie : c'est un document (fond, image, produit, titre, sous-titre,
 * bouton, logo, formes décoratives), chaque calque indépendant, modifiable, masquable, verrouillable et réordonnable.
 * Le même moteur de rendu (render.ts) produit l'aperçu de l'éditeur ET l'export : ce que l'on voit est ce que l'on
 * exporte. Le document est sérialisable (JSON), versionné (store.ts), et ne contient ni clé ni consigne d'IA.
 */

export const DOC_VERSION = 1;

export type LayerRole = "background" | "image" | "product" | "title" | "subtitle" | "body" | "cta" | "logo" | "shape" | "decor" | "scrim";

/** Couleur pleine, ou dégradé linéaire (angle en degrés, arrêts avec transparence). */
/** Couleur unie, dégradé linéaire, ou dégradé radial (vignette, halo : du centre vers les bords ; angle ignoré). */
export type Fill = string | { type: "linear" | "radial"; angle: number; stops: { offset: number; color: string }[] };

export type Shadow = { color: string; blur: number; x: number; y: number };

export type LayerBase = {
  id: string;
  name: string;
  role: LayerRole;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Degrés, autour du centre du calque. */
  rotation: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
  /** Ancrage pour l'adaptation à un autre format (le calque garde sa distance au bord ancré). */
  anchor: { h: "left" | "center" | "right" | "stretch"; v: "top" | "middle" | "bottom" | "stretch" };
  /** Modifié à la main par le client : jamais écrasé en silence par une régénération. */
  userEdited?: boolean;
  /** Vidéo : animation d'entrée du calque (sortie automatique avant le plan suivant). Ignorée sur une image fixe. */
  anim?: LayerAnim;
};

/**
 * Animation d'un calque (vidéo, publication animée) : entrée (glisse, monte, se déroule, rebondit, ou « none » : présent
 * dès le début), retard et durée en secondes ; `loop` : effet continu après l'entrée (bouton qui bat, texte qui flotte).
 */
export type LayerAnim = { in: "rise" | "drop" | "left" | "right" | "grow" | "pop" | "fade" | "none"; delay: number; dur?: number; loop?: "pulse" | "float" | "none" };

export type ImageLayer = LayerBase & {
  kind: "image";
  /** Asset de la bibliothèque du projet (photo, détourage, logo). */
  assetId: string | null;
  fit: "cover" | "contain";
  /** Recadrage normalisé (0-1) dans l'image source. */
  crop: { x: number; y: number; w: number; h: number } | null;
  radius: number;
  shadow: Shadow | null;
  /** Ombre de contact au sol (produit posé). */
  contactShadow?: boolean;
  /** Reflet du produit sur un sol brillant (opacité 0-1, s'efface vers le bas). */
  reflection?: number;
  /**
   * Traitement de la photo (étalonnage d'affiche) : filtre limité à IMAGE_FILTERS (luminosité, contraste,
   * saturation, noir et blanc, sépia, flou, teinte), identique dans l'éditeur et à l'export.
   */
  filter?: string | null;
  /** Bichromie aux couleurs de la marque : ombres dans `dark`, lumières dans `light`. */
  duotone?: { dark: string; light: string } | null;
};

/** Fonctions de filtre autorisées sur une photo (aucune adresse, aucun script). */
export const IMAGE_FILTER_RE = /^(none|((brightness|contrast|saturate|grayscale|sepia)\(\d+(\.\d+)?\)|blur\(\d+(\.\d+)?px\)|hue-rotate\(-?\d+(\.\d+)?deg\))( (brightness|contrast|saturate|grayscale|sepia)\(\d+(\.\d+)?\)| blur\(\d+(\.\d+)?px\)| hue-rotate\(-?\d+(\.\d+)?deg\))*)$/;

export type TextLayer = LayerBase & {
  kind: "text";
  text: string;
  font: { family: string; weight: number; size: number; italic: boolean };
  color: string;
  align: "left" | "center" | "right";
  lineHeight: number;
  /** Espacement des lettres en pixels. */
  letterSpacing: number;
  uppercase: boolean;
  /** Réduit la taille pour tenir dans le cadre (jamais sous minSize). */
  autoFit: { minSize: number } | null;
  shadow: Shadow | null;
  /** Lignes équilibrées (titre) : même nombre de lignes, longueurs aussi proches que possible. */
  balance?: boolean;
};

export type ShapeLayer = LayerBase & {
  kind: "shape";
  /** « waves » : faisceau d'ondes lumineuses tracées au trait (couleur et épaisseur du contour). */
  /** « icon » : pictogramme au trait (tracé SVG `path` sur une grille 24 × 24, couleur et épaisseur du contour). */
  shape: "rect" | "ellipse" | "line" | "waves" | "icon";
  /** Tracé SVG du pictogramme (forme « icon ») : commandes de tracé seulement, grille 24 × 24. */
  path?: string;
  fill: Fill | null;
  stroke: { color: string; width: number } | null;
  radius: number;
  shadow: Shadow | null;
};

export type ButtonLayer = LayerBase & {
  kind: "button";
  text: string;
  font: { family: string; weight: number; size: number; italic: boolean };
  fill: Fill;
  color: string;
  radius: number;
  stroke: { color: string; width: number } | null;
  shadow: Shadow | null;
};

export type Layer = ImageLayer | TextLayer | ShapeLayer | ButtonLayer;

export type AdDocument = {
  version: number;
  width: number;
  height: number;
  /** Fond du document (sous tous les calques). */
  background: string;
  /** Zones de sécurité de la plateforme (pixels). */
  safe: { top: number; bottom: number; side: number };
  format: { platform: string | null; aspect: string };
  /** Calques, du fond vers le premier plan. */
  layers: Layer[];
  /** Identité de marque disponible dans l'éditeur (palette, polices). */
  brand: { palette: Record<string, string>; fonts: { heading: string; body: string }; name: string };
  meta: { marketingStrategy?: import("../strategy-consumption").StrategyStamp | null; conceptId: string | null; source: "engine" | "user" | "ai_local" | "ai"; createdFrom: string | null; recipe?: AdRecipe };
};

/** Recette de composition (moteur publicitaire) : permet de RECOMPOSER la création dans un autre format. */
export type AdRecipe = { layout: string; art: Record<string, unknown>; palette: Record<string, string>; typo: { heading: string; body: string; headingWeight?: number; uppercase?: boolean }; brand: string; eyebrow: string | null; logo: string | null; logoLight: string | null; variant?: { treatment?: string; logo?: string; scheme?: string } };
