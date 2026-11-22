/**
 * LA SIGNATURE « FAIT PAR L'IA » POSÉE PAR LE STUDIO (rapport 10, point 4) : PRÉPARÉE, ÉTEINTE.
 *
 * Ce qui est fait : une image d'OpenAI que le Studio garde telle quelle est rangée avec ses octets d'origine, et sa
 * signature C2PA reste (`media/signature-ia.ts`) ; l'atelier le fait aussi pour une retouche rendue à la taille de la
 * photo d'origine (rien n'est composé).
 *
 * Ce qui attend : une image recadrée, composée ou retouchée par le Studio perd forcément la signature d'origine (elle est
 * liée aux pixels). Il faudrait que le Studio signe lui-même l'image finale (un manifeste qui cite l'image d'OpenAI comme
 * ingrédient), ce qui demande un certificat de signature reconnu et l'avis d'un juriste sur l'article 50 du règlement
 * européen (le Studio est-il « fournisseur » ? délai du 2 décembre 2026). Décision du propriétaire. Ici, seulement le
 * manifeste (données pures) ; aucune signature n'est posée tant que `atelier.signatureC2pa` n'est pas « 1 » ET qu'un
 * certificat n'est pas fourni, et aucune bibliothèque de signature n'est ajoutée.
 */
import { createHash } from "node:crypto";

export const REGLAGE_SIGNATURE = "atelier.signatureC2pa";

export type Ingredient = { titre: string; sha256: string; faitParIa: boolean; fabricant?: string | null };

/** Le manifeste qui serait signé (assertions C2PA « actions » et « ingredients »), sans signature. */
export function manifesteStudio(o: { titre: string; image: Buffer; ingredients: Ingredient[]; actions: ("created" | "edited" | "cropped" | "placed")[] }) {
  return {
    claim_generator: "E-COM STUDIO IA",
    title: o.titre,
    format: "image/png",
    instance_sha256: createHash("sha256").update(o.image).digest("hex"),
    assertions: [
      { label: "c2pa.actions", data: { actions: o.actions.map((a) => ({ action: `c2pa.${a}`, ...(o.ingredients.some((i) => i.faitParIa) ? { digitalSourceType: "http://cv.iptc.org/newscodes/digitalsourcetype/compositeWithTrainedAlgorithmicMedia" } : {}) })) } },
    ],
    ingredients: o.ingredients.map((i) => ({ title: i.titre, sha256: i.sha256, relationship: "parentOf", ...(i.fabricant ? { generator: i.fabricant } : {}) })),
  };
}

/** La signature du Studio est-elle allumée ? Il faut le réglage du propriétaire ET un certificat. */
export function signatureActive(lire: (k: string) => string | null, certificat: Buffer | null): boolean {
  return lire(REGLAGE_SIGNATURE) === "1" && !!certificat?.length;
}

/** Signer l'image : pas encore permis (décision du propriétaire et avis d'un juriste en attente). */
export function signerImage(): never {
  throw new Error("Signature du Studio en attente : certificat de signature et avis d'un juriste à obtenir, décision du propriétaire.");
}
