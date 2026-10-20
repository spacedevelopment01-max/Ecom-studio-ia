/** Catégories du projet : offre et modèle de vente, jamais le nom d'une démonstration. */
import type { Project } from "../projects";
import type { Input } from "../preparation/types";

export const PROJECT_CATEGORIES = ["specialized", "ecommerce", "services"] as const;
export type ProjectCategory = (typeof PROJECT_CATEGORIES)[number];
export const CATEGORY_LABELS: Record<ProjectCategory, { fr: string; en: string }> = {
  specialized: { fr: "Boutique spécialisée", en: "Specialist store" },
  ecommerce: { fr: "E-commerce", en: "E-commerce" },
  services: { fr: "Prestations de services", en: "Services" },
};
/** Références demandées, pas des identifiants installables inventés. Le raccordement appartient à Claude. */
export const REFERENCE_THEMES = [
  { referenceId: "fraise", name: "FRAISE", categories: ["specialized"] },
  { referenceId: "onde", name: "ONDE", categories: ["specialized"] },
  { referenceId: "orbe", name: "ORBE", categories: ["ecommerce"] },
  { referenceId: "atelier-rive", name: "Atelier Rive", categories: ["services"] },
  { referenceId: "sillon", name: "SILLON", categories: ["specialized"] },
  { referenceId: "noctil", name: "NOCTIL", categories: ["specialized"] },
  { referenceId: "traverse", name: "TRAVERSE", categories: ["specialized"] },
] as const;
export type ReferenceThemeId = (typeof REFERENCE_THEMES)[number]["referenceId"];
export const REFERENCE_THEME_IDS = REFERENCE_THEMES.map(t => t.referenceId) as [ReferenceThemeId, ...ReferenceThemeId[]];
export type CategoryRecommendation = {
  status: "recommended" | "clarification_required";
  category: ProjectCategory | null;
  salesModel: "focused_offer" | "catalogue" | "service" | "unknown";
  goal: "purchase" | "quote" | "booking" | "call" | "contact";
  reasons: string[];
  evidence: { source: "business" | "storeType" | "catalogue" | "client" | "strategy" | "client_choice"; value: string }[];
  clarification: string | null;
  eligibleThemes: { referenceId: string; name: string; engineThemeId: string | null; status: "awaiting_integration" }[];
};
const normalize = (v: string) => v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
export function recommendProjectCategory(p: Pick<Project, "business" | "storeType" | "catalog" | "services" | "strategy">, input?: Pick<Input, "description" | "constraints">, explicitChoice?: ProjectCategory): CategoryRecommendation {
  const evidence: CategoryRecommendation["evidence"] = [{ source: "business", value: p.business }];
  let category: ProjectCategory | null = null;
  let salesModel: CategoryRecommendation["salesModel"] = "unknown";
  const goal: CategoryRecommendation["goal"] = p.business === "products" ? "purchase" : p.services.contactMode === "form" ? "contact" : p.services.contactMode;
  const reasons: string[] = [];
  let clarification: string | null = null;
  if (explicitChoice && ((p.business === "services") === (explicitChoice === "services"))) {
    category = explicitChoice;
    salesModel = category === "services" ? "service" : category === "ecommerce" ? "catalogue" : "focused_offer";
    evidence.push({ source: "client_choice", value: explicitChoice });
    reasons.push("Vous avez confirmé ce modèle de site pour votre offre actuelle ; ce choix prime sur les indices automatiques.");
  } else if (p.business === "services") {
    category = "services"; salesModel = "service";
    reasons.push(`Une offre de prestations avec un parcours ${goal === "quote" ? "devis" : goal === "booking" ? "rendez-vous" : goal === "call" ? "appel" : "contact"}, sans panier imposé.`);
  } else {
    // storeType=mono est aussi le défaut technique historique : seul, il ne prouve pas le choix du client.
    const client = `${input?.description ?? ""}\n${input?.constraints ?? ""}`;
    const strategy = p.strategy ? [p.strategy.angles.map(a => a.idea).join(" "), p.strategy.keyMessages.join(" "), p.strategy.platform?.difference ?? ""].join(" ") : "";
    const text = normalize(`${client}\n${strategy}`);
    const focused = /(?:produit phare|offre ciblee|gamme ciblee|boutique specialisee|mono[- ]produit|single[- ]product|hero product|focused (?:offer|range)|specialist store)/.test(text);
    const catalogue = /(?:catalogue (?:varie|multi|de plusieurs)|collections (?:de |et )|boutique multi[- ]produits?|plusieurs (?:familles|categories) de produits|multi[- ]product (?:store|catalog)|varied catalog)/.test(text);
    evidence.push({ source: "storeType", value: p.storeType }, { source: "catalogue", value: `${p.catalog.length} produit(s) complémentaire(s) déclaré(s)` });
    if (client.trim()) evidence.push({ source: "client", value: client });
    if (strategy.trim()) evidence.push({ source: "strategy", value: strategy });
    if ((focused && catalogue) || (p.storeType === "multi" && focused) || (p.storeType === "niche" && catalogue) || (p.storeType === "mono" && p.catalog.length > 0 && !catalogue)) {
      clarification = "Votre site doit-il raconter une offre phare ou une gamme ciblée, ou présenter un catalogue organisé en collections ?";
      reasons.push("Les indications sur le modèle de vente se contredisent ; aucun classement arbitraire n’est appliqué.");
    } else if (p.storeType === "multi" || catalogue) {
      category = "ecommerce"; salesModel = "catalogue";
      reasons.push("Le modèle de vente est un catalogue organisé en produits et collections, avec un parcours d’achat.");
    } else if (p.storeType === "niche" || focused) {
      category = "specialized"; salesModel = "focused_offer";
      reasons.push("Le modèle de vente met en avant une offre phare ou une gamme ciblée : explication, démonstration et choix de l’offre.");
    } else {
      clarification = "Préférez-vous une boutique centrée sur une offre phare ou une gamme ciblée, ou un catalogue organisé en collections ?";
      reasons.push("Le produit et le réglage historique « mono » ne suffisent pas à connaître le modèle de vente souhaité.");
    }
  }
  return { status: category ? "recommended" : "clarification_required", category, salesModel, goal, reasons, evidence, clarification,
    eligibleThemes: category ? REFERENCE_THEMES.filter(t => (t.categories as readonly ProjectCategory[]).includes(category)).map(t => ({ referenceId: t.referenceId, name: t.name, engineThemeId: null, status: "awaiting_integration" as const })) : [],
  };
}
