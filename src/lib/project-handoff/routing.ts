/** Diagnostic local de la route effective, expurgé : aucune clé et aucun identifiant de modèle. */
import { activeProviderKey, type ProviderId, type TaskId } from "../ai/config";
import { routeLlm } from "../ai/llm";
import { textModel, modelStatus } from "../ai/text-models";
import { mediaModel } from "../ai/media-models";
import { mediaStatus, type MediaUsage } from "../ai/media-routing";
import { mediaRouteFor, productImagePath } from "../ai/media-providers";
import type { Project } from "../projects";

export function handoffRouting(p: Pick<Project, "userId" | "business">, withPhotos: boolean, simulation = false) {
  const text = (stage: string, task: TaskId, vision = false) => {
    try {
      const route = routeLlm({ task, userId: p.userId, routing: { difficulty: "complex" }, ...(vision ? { images: [{ data: Buffer.alloc(1), label: "Contrôle local de capacité ; aucune requête" }] } : {}) });
      const model = textModel(route.provider, route.model);
      const status = model ? modelStatus(model) : null;
      const usable = !!status?.usable && (!vision || !!model?.vision);
      return { stage, processing: "api" as const, alias: `text:${task}:${route.tier}`, provider: route.provider, configuration: usable ? "usable" as const : "unavailable" as const, modelConfigured: !!model, vision, executed: false as const, reason: usable ? "Route résolue localement ; aucun appel effectué par ce diagnostic." : "Route absente, désactivée, non tarifée ou capacité requise indisponible." };
    } catch {
      return { stage, processing: "api" as const, alias: `text:${task}`, provider: null, configuration: "unavailable" as const, modelConfigured: false, vision, executed: false as const, reason: "Aucune route utilisable résolue ; aucun appel effectué." };
    }
  };
  const image = (stage: string, usage: MediaUsage, references = 0) => {
    const chosen = mediaRouteFor(usage, references ? { references } : {});
    const model = chosen ? mediaModel(chosen.provider, chosen.model) : null;
    const status = model ? mediaStatus(model) : null;
    return { stage, processing: "api" as const, alias: `image:${usage}`, provider: chosen?.provider ?? null, configuration: status?.usable && (stage !== "site_images" || withPhotos) ? "usable" as const : "unavailable" as const, modelConfigured: !!model, executed: false as const, reason: status?.usable && (stage !== "site_images" || withPhotos) ? "Fournisseur, adaptateur, tarif et capacité résolus localement ; aucun appel effectué." : "Fournisseur d’images, capacité, tarif ou référence produit indispensable indisponible." };
  };
  const stock = { stage: "site_stock", processing: "api" as const, alias: "stock:pixabay", provider: "pixabay" as ProviderId, configuration: activeProviderKey("pixabay") ? "configured_not_tested" as const : "unavailable" as const, modelConfigured: false, executed: false as const, reason: activeProviderKey("pixabay") ? "Accès actif configuré ; recherche et téléchargement non testés dans ce diagnostic. Pas de modèle génératif." : "Accès Pixabay absent ou désactivé." };
  const productPath = p.business === "products" && withPhotos ? productImagePath("product_image") : null;
  return [text("understanding", "vision_analysis", withPhotos), { stage: "web_sources", processing: "web_fetch" as const, alias: "research:web-search-and-source-fetch", provider: null, configuration: "configured_not_tested" as const, modelConfigured: false, executed: false as const, reason: "Découverte web et lecture des sources avec les connecteurs existants ; couverture et accès réels à vérifier." }, text("research_strategy", "strategy"), text("name", "strategy"), text("art_directions", "logo_symbol"), image("logo", "logo"), { stage: "identity_variants", processing: "local_preparation" as const, alias: "identity:approved-logo-variants", provider: null, configuration: "local" as const, modelConfigured: false, executed: false as const, reason: "Déclinaisons et charte dérivées du logo actif ; aucun nouveau dessin payant dans cette préparation locale." }, text("copywriting_seo", "copywriting"), ...(p.business === "products" ? [image("site_images", productPath?.usage ?? "product_image", 1)] : []), stock, text("visual_review", "quality_control", true), text("initial_twenty_concepts", "copywriting"), image("initial_twenty_images", "social_image"), { stage: "theme_handoff", processing: "local_preparation" as const, alias: "theme:structured-contract", provider: null, configuration: "local" as const, modelConfigured: false, executed: false as const, reason: "Projection des données approuvées, sans génération ni création d’un thème." }].map(r => ({ ...r, environment: simulation ? "simulation" as const : "production_configuration_only" as const, realProviderValidated: false as const }));
}
