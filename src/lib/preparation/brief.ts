import { localAnalysis, localServiceAnalysis } from "../engine/local";
import type { Brief, Input } from "./types";
import { briefMissing } from "./fiche";
export { SERVICES_UNKNOWN } from "./fiche";
export function analyzeLocally(input: Input): Brief {
  const numeric = input.price.replace(/[^0-9,.-]/g, "");
  const price =
    numeric && /[0-9]/.test(numeric) ? Number(numeric.replace(",", ".")) : NaN;
  const profile =
    input.business === "services"
      ? localServiceAnalysis({
          name: input.offerName,
          brand: input.brandName,
          description: input.description,
          services: input.services,
        }).product
      : localAnalysis({
          name: input.offerName,
          brand: input.brandName,
          description: input.description,
          price: Number.isFinite(price) ? Math.round(price * 100) : null,
          colors: [],
          photos: input.photoIds.length,
        });
  // La description originale reste entière et distincte des inférences du moteur.
  profile.summary = input.description;
  profile.name = input.offerName || profile.name;
  const services =
    input.business === "services"
      ? localServiceAnalysis({
          name: input.offerName,
          brand: input.brandName,
          description: input.description,
          services: input.services,
        }).services
      : input.services;
  // Services (#204) : ni le nom commercial (créé à l'étape Marque) ni la liste des prestations (identifiées par
  // « Comprendre mon activité », puis proposées à validation) ne sont exigés avant l'analyse.
  const brief: Brief = { input, profile, services, missing: [], provenance: "local" };
  brief.missing = briefMissing(brief);
  return brief;
}
