/**
 * Galeries produit créées par SINA (décision du propriétaire du 10 novembre 2026) : pour chaque produit, une série
 * d'images (produit seul, flèches vers ses points forts, promesse, moment de vie, contenu, explication, chez soi, liste
 * de caractéristiques) posée UNIQUEMENT dans le « Produit vedette » de la fiche produit (thème sur mesure) ou dans la
 * galerie de la fiche produit (thème du Studio). Les cartes de produits gardent la photo envoyée par le client.
 * Seules les images contrôlées sans défaut y sont posées ; une image ratée est gardée à part et signalée.
 */
import { all } from "../db";
import { remember } from "../projects";

export const GALLERIES_KEY = "syna.product_galleries";
export type GalleryImage = { assetId: string; kind: string; ok: boolean; problems: string[] };
export type ProductGallery = { productId: string; title: string; keepOwn: boolean; images: GalleryImage[]; at: number };
export type Galleries = Record<string, ProductGallery>;

export function loadGalleries(projectId: string): Galleries {
  const row = all<{ value: string }>("SELECT value FROM memory WHERE project_id=? AND kind='artifact' AND key=? AND state='active' LIMIT 1", projectId, GALLERIES_KEY)[0];
  try { return row ? (JSON.parse(row.value) as Galleries) : {}; } catch { return {}; }
}

export function saveGallery(projectId: string, g: ProductGallery): ProductGallery {
  remember(projectId, { kind: "artifact", key: GALLERIES_KEY, value: JSON.stringify({ ...loadGalleries(projectId), [g.productId]: g }), source: "local", origin: "system" });
  return g;
}

/** Images posées dans la galerie d'un produit (contrôlées sans défaut), dans l'ordre ; null sans galerie. */
export function galleryAssets(projectId: string, productId: string): { assets: string[]; keepOwn: boolean } | null {
  const g = loadGalleries(projectId)[productId];
  if (!g) return null;
  const assets = g.images.filter((i) => i.ok).map((i) => i.assetId);
  return assets.length ? { assets, keepOwn: g.keepOwn } : null;
}
