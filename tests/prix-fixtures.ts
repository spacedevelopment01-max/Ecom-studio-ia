/** Essais : la preuve des 30 jours donnée pour chaque produit qui a un prix de comparaison (le prix barré reste le même). */
import { listProducts } from "@/lib/products/catalog";
import { noterPreuve } from "@/lib/syna-agent/prix-anterieur";

export function prouverLesPrix(projectId: string) {
  for (const p of listProducts(projectId)) {
    const c = p.data.compareAt ?? p.variants.find((v) => v.compareAt != null)?.compareAt ?? null;
    if (c != null) noterPreuve(projectId, p.id, { compareAt: c, plusBas: c, at: Date.now(), mots: "essai" });
  }
}
