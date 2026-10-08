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
export type Fill = string | { type: "linear"; angle: number; stops: { offset: number; color: string }[] };

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
};

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
};

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
};

export type ShapeLayer = LayerBase & {
  kind: "shape";
  shape: "rect" | "ellipse" | "line";
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
  meta: { conceptId: string | null; source: "engine" | "user" | "ai_local" | "ai"; createdFrom: string | null };
};
