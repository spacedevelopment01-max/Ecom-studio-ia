/**
 * Fixtures du Project Brain (phase 2C) : Sébastien Blanc (plâtrier peintre, entreprise de services) et Sérum Éclat
 * (produit riche). Partagées par les tests et par scripts/brain-measure.ts (mesures du rapport).
 */
import { id, now, run } from "@/lib/db";
import { localBrand } from "@/lib/engine/local";
import { remember } from "@/lib/projects";
import { recordLogoRouteRejection, recordMediaRejection } from "@/lib/brain/rejections";
import { emptyProduct } from "@/lib/project-types";

export const SB_PHONE = "06 11 22 33 44";
export const SB_EMAIL = "contact@sebastien-blanc.test";
export const SB_ADDRESS = "12 rue des Artisans, Mâcon";

function insert(userId: string, business: "services" | "products", product: any, services: any, strategyPatch?: (s: any) => any) {
  const { brand, strategy } = localBrand(product, product.name, { business, services } as any);
  const pid = id();
  run(
    "INSERT INTO projects (id, user_id, name, status, platform, product_json, brand_json, strategy_json, settings_json, sources_json, business_type, business_json, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
    pid, userId, product.name, "ready", "shopify", JSON.stringify(product), JSON.stringify(brand), JSON.stringify(strategyPatch ? strategyPatch(strategy) : strategy), JSON.stringify({ language: "fr" }), "[]", business, JSON.stringify(services ?? {}), now(), now(),
  );
  return pid;
}

/** Sébastien Blanc — plâtrier peintre à Mâcon : prestations, coordonnées, faits, refus de logo et d'image, préférence. */
export function seedSebastienBlanc(userId: string) {
  const pid = insert(
    userId,
    "services",
    {
      ...emptyProduct(),
      name: "Sébastien Blanc",
      nameStatus: "provided",
      category: "Plâtrier peintre",
      sector: "batiment",
      summary: "Plâtrerie, plaques de plâtre, enduits, lissage, peinture intérieure, rénovation intérieure.",
      facts: [
        { key: "zone", label: "Zone", value: "Mâcon et alentours", status: "confirmed", source: "user" },
        { key: "experience", label: "Années d'expérience", value: "", status: "unknown", source: "ai" },
      ],
      claimsToAvoid: ["artisan certifié RGE (non confirmé)"],
    },
    {
      services: [{ name: "Plâtrerie et plaques de plâtre" }, { name: "Enduits et lissage" }, { name: "Peinture intérieure", price: "sur devis" }],
      area: "Mâcon et 30 km autour",
      address: SB_ADDRESS,
      hours: "Lundi–vendredi 8 h–18 h",
      phone: SB_PHONE,
      email: SB_EMAIL,
      contactMode: "quote",
      bookingUrl: "",
    },
  );
  recordLogoRouteRejection(pid, { name: "Badge rond", markKind: "library", composition: "emblem" });
  recordMediaRejection(pid, { role: "lifestyle", name: "mur-vide.jpg", meta: JSON.stringify({ subject: "mur vide sans chantier" }) });
  remember(pid, { kind: "preference", key: "couleurs", value: "Préférer des tons chauds (terre, sable)", source: "user", scope: "brand" });
  remember(pid, { kind: "correction", key: "zone", value: "Ne pas écrire Lyon : la zone est Mâcon et 30 km autour", source: "user", scope: "all" });
  return pid;
}

/** Sérum Éclat — produit riche : faits confirmés et inconnus, prix, variantes, texte lisible, réponse, plateforme. */
export function seedSerumEclat(userId: string) {
  const pid = insert(
    userId,
    "products",
    {
      ...emptyProduct(),
      name: "Sérum Éclat",
      nameStatus: "provided",
      category: "Sérum visage",
      sector: "beaute",
      summary: "Sérum à la vitamine C pour un teint lumineux.",
      facts: [
        { key: "capacity", label: "Contenance", value: "30 ml", status: "confirmed", source: "photo" },
        { key: "texture", label: "Texture", value: "gel fluide", status: "inferred", source: "ai" },
        { key: "shipping", label: "Livraison", value: "", status: "unknown", source: "ai" },
      ],
      price: { amount: 3490, currency: "EUR", status: "confirmed" },
      variants: [{ name: "Contenance", values: ["15 ml", "30 ml"] }],
      claimsToAvoid: ["anti-âge prouvé"],
      visual: { ...emptyProduct().visual, shape: "flacon compte-gouttes", description: "Flacon en verre ambré, pipette blanche", labelText: ["ÉCLAT", "30 ml"], colors: [{ hex: "#C77B30", name: "ambre", share: 0.6 }] },
      questions: [{ id: "q1", question: "Quelle est l'origine des ingrédients ?", why: "fiche", required: false, factKey: "origine", answer: "Fabriqué en France" }],
    },
    null,
    (s) => ({
      ...s,
      keyMessages: ["Un teint lumineux en 2 gestes"],
      platform: { persona: "Femme active", problem: "Teint terne", alternatives: "Sérums de grande surface", difference: "Formule courte", proofs: [{ claim: "Résultats visibles en 7 jours", proof: "", status: "missing" }, { claim: "Fabriqué en France", proof: "réponse du client", status: "available" }], objections: [{ objection: "Est-ce que ça pique ?", answer: "" }] },
    }),
  );
  recordLogoRouteRejection(pid, { name: "Goutte dorée", markKind: "ai-symbol", composition: "stacked" });
  remember(pid, { kind: "preference", key: "ton", value: "Pas de jargon scientifique", source: "user", scope: "shop" });
  return pid;
}
