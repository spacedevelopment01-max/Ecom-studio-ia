import { emptyServiceProfile } from "../project-types";
import type { Input } from "./types";

/** Fiche de départ vide : le point de départ d'une préparation avant que le client ait dit quoi que ce soit. */
export function emptyInput(): Input {
  return { description: "", offerName: "", brandName: "", target: "", constraints: "", business: "products", photoIds: [], referenceUrls: [], price: "", services: emptyServiceProfile() };
}
