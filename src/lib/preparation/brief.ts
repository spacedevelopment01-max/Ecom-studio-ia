import { localAnalysis, localServiceAnalysis } from "../engine/local";
import type { Brief, Input } from "./types";
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
  const missing = [
    !profile.name.trim() || profile.nameStatus === "unknown"
      ? "Précisez le nom du produit ou de l’activité."
      : "",
    !input.description.trim()
      ? "Décrivez ce qui est proposé ; une photo seule ne confirme pas les caractéristiques."
      : "",
    !input.target.trim() ? "À qui cette offre s’adresse-t-elle ?" : "",
    input.business === "services" && !services.services.length
      ? "Indiquez au moins une prestation."
      : "",
    input.business === "services" &&
    !services.email &&
    !services.phone &&
    !services.bookingUrl
      ? "Indiquez un moyen de contact pour les demandes."
      : "",
  ].filter(Boolean);
  return { input, profile, services, missing, provenance: "local" };
}
