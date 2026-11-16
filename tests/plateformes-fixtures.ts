/**
 * Site d'essai du chantier « plateformes » : une boutique inventée montée avec les pièces à tenue du style « vente
 * directe », un tee-shirt en 2 couleurs × 3 tailles avec stock, une paire de chaussettes (le cadeau), une offre par
 * quantité (2 articles, −10 %) et trois packs dont un pack de 3 (−20 %, chaussettes offertes, « le plus populaire »).
 * Sert aux tests et à l'essai sur de vraies installations locales de WooCommerce et de PrestaShop
 * (PLATEFORMES_OUT=<dossier> écrit les archives ; scripts/plateformes-essai.cjs les achète avec un vrai navigateur).
 *
 * Tout passe par la conversion du Studio (to-shopify.ts) : les pièces arrivent ici comme elles arrivent d'un site monté
 * par SINA. Les offres sont données comme le client les saisit (rubrique des offres), remises confirmées.
 */
import { tenueSection } from "@/lib/syna-agent/custom-theme/tenue";
import { offreDepuisOffres } from "@/lib/syna-agent/custom-theme/remises";
import type { StoreProduct, ThemeSpec } from "@/lib/theme/spec";

/** Les offres telles que le client les saisit dans le Studio. */
export const OFFRES_SAISIES = {
  quantity: { kind: "lots" as const, tiers: [{ qty: 2, pct: 10 }] },
  packs: [{ quantite: 1, nom: "Un tee" }, { quantite: 2, nom: "Le duo", remisePct: 10 }, { quantite: 3, nom: "Le trio", remisePct: 20, cadeauHandle: "chaussettes-essai", populaire: true }],
  seuilStock: 5, remisesConfirmees: true,
};

const TEE: StoreProduct = {
  title: "Tee d'essai", handle: "tee-essai", vendor: "Essai", description_html: "<p>Un tee-shirt inventé pour l'essai.</p>", price: 2900, compare_at_price: null, currency: "EUR",
  options: ["Couleur", "Taille"],
  variants: ["Noir", "Sable"].flatMap((c) => ["S", "M", "L"].map((s, i) => ({ title: `${c} / ${s}`, options: [c, s], price: 2900, available: true, inventory_quantity: c === "Sable" && s === "L" ? 3 : 20 + i, sku: `TEE-${c}-${s}`.toUpperCase() }))),
  images: [], tags: [],
};
const CHAUSSETTES: StoreProduct = { title: "Chaussettes d'essai", handle: "chaussettes-essai", vendor: "Essai", description_html: "<p>Une paire inventée pour l'essai.</p>", price: 900, compare_at_price: null, currency: "EUR", options: [], variants: [{ title: "Default Title", options: [], price: 900, available: true, inventory_quantity: 50, sku: "CHAUSSETTES-ESSAI" }], images: [], tags: [] };

/** Les règles de la boutique pour ces offres : seulement sur le tee (les chaussettes sont le cadeau, sans offre à elles). */
export const OFFRE_ESSAI = () => offreDepuisOffres(OFFRES_SAISIES, [{ handle: TEE.handle, titre: TEE.title, centimes: 2900 }, { handle: CHAUSSETTES.handle, titre: CHAUSSETTES.title, centimes: 900 }]).offre;

/** Le site d'essai, converti en version de thème du moteur (comme le fait l'installation d'un site monté par SINA). */
export async function siteEssai(): Promise<{ spec: ThemeSpec; problemes: string[]; notes: string[] }> {
  const { customThemeSpec } = await import("@/lib/syna-agent/custom-theme/to-shopify");
  const { shopOffersSchema } = await import("@/lib/syna-agent/product-features");
  const sec = (id: string, uid: string, construction?: string) => ({ uid, id, clientTexts: true, ...(construction ? { construction } : {}), html: tenueSection(id)!.html.replace(/photos\/[\w.-]+/g, "/api/files/a1") });
  const t = {
    version: 1, family: "classique", style: "classique", header: sec("tn-entete", "h"), footer: sec("tn-pied", "f"), search: null, rev: 0, at: 0,
    pages: [
      { key: "home", label: "Accueil", sections: [sec("tn-atouts", "at"), sec("tn-appel-produit", "ap")] },
      { key: "product", label: "Fiche produit", sections: [sec("tn-achat", "buy", "vente-directe"), sec("tn-versions", "v1"), sec("tn-packs", "packs"), sec("tn-sous-bouton", "sb"), sec("tn-garantie", "g1")] },
    ],
  } as never;
  const out = customThemeSpec(t, { name: "Boutique Essai", business: "products", products: [{ handle: TEE.handle, title: TEE.title, categories: [] }, { handle: CHAUSSETTES.handle, title: CHAUSSETTES.title, categories: [] }], company: { shipping: "48 h", returns: "30 jours" }, offres: shopOffersSchema.parse(OFFRES_SAISIES), assetExt: () => "jpg", linkMap: {}, dropMissing: true, base: null } as never);
  const spec = out.spec;
  spec.files = {};
  spec.store.product = TEE;
  (spec.store as { products?: StoreProduct[] }).products = [CHAUSSETTES];
  return { spec, problemes: out.problems.filter((x) => x.level === "bloquant").map((x) => x.text), notes: out.problems.filter((x) => x.level === "à savoir").map((x) => x.text) };
}
