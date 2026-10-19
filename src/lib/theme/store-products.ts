/** Lecture pure du catalogue, utilisable aussi par les finitions exposées au navigateur. */
import type { StoreProduct } from "./spec";

/** Tous les produits de la boutique : le produit principal puis ceux du catalogue. */
export function storeProducts(spec: { store: { product: StoreProduct; products?: StoreProduct[] } }): StoreProduct[] {
  return [spec.store.product, ...(spec.store.products ?? []).filter((p) => p.handle !== spec.store.product.handle)];
}
