/** Données partagées entre le serveur et le navigateur (aucun secret). */
/** Parcours d'analyse. Les parcours avancés exigent l'offre Plus. */
export const PARCOURS = {
  courrier: { label: "Courrier du quotidien", hint: "Impôts, CAF, CPAM, mairie, énergie, banque, assurance, URSSAF, amende…", plus: false },
  paie: { label: "Fiche de paie", hint: "Comprendre une fiche de paie, repérer les points à vérifier", plus: true },
  contrat_travail: { label: "Contrat de travail ou avenant", hint: "CDI, CDD, avenant, clauses", plus: true },
  fin_contrat: { label: "Documents de fin de contrat", hint: "Certificat de travail, solde de tout compte, attestation employeur", plus: true },
  bail: { label: "Bail ou contrat de location", hint: "Bail, état des lieux, quittances, charges", plus: true },
  assurance_contrat: { label: "Assurance, devis ou contrat de service", hint: "Garanties, exclusions, engagements, résiliation", plus: true },
  notaire: { label: "Document de notaire", hint: "Compromis, acte, succession, frais", plus: true },
  juridique: { label: "Courrier d'avocat ou document judiciaire", hint: "Mise en demeure, assignation, jugement, convocation", plus: true },
  verification: { label: "Facture ou document dont l'origine pose question", hint: "Repérage d'anomalies et aide à la vérification", plus: true },
} as const;

export type ParcoursId = keyof typeof PARCOURS;
export const PARCOURS_IDS = Object.keys(PARCOURS) as ParcoursId[];

export const FREE_DOCUMENTS_PER_MONTH = 3;
export const PLUS_PRICE_LABEL = "4,99 €";

/** Limites techniques d'un « document » : un même courrier, jusqu'à 10 pages. */
export const DOCUMENT_RULES = {
  maxFiles: 10,
  maxPages: 10,
  maxFileBytes: 4 * 1024 * 1024, // limite d'une requête serverless (4,5 Mo chez Vercel)
  maxTotalBytes: 20 * 1024 * 1024,
  mimes: ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const,
};
