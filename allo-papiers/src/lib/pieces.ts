/**
 * Classement du coffre-fort : catégories et types de pièces justificatives.
 * Données partagées entre serveur et navigateur (aucun secret).
 */
export const VAULT_CATEGORIES = {
  identite: { label: "Identité et famille", emoji: "🪪" },
  domicile: { label: "Justificatifs de domicile", emoji: "🏠" },
  revenus_impots: { label: "Revenus et impôts", emoji: "💶" },
  logement: { label: "Logement", emoji: "🔑" },
  travail: { label: "Travail", emoji: "💼" },
  sante: { label: "Santé", emoji: "🩺" },
  banque_assurance: { label: "Banque et assurances", emoji: "🏦" },
  vehicule: { label: "Véhicule", emoji: "🚗" },
  achats: { label: "Achats et factures", emoji: "🧾" },
  courriers: { label: "Courriers reçus", emoji: "✉️" },
  autres: { label: "Autres documents", emoji: "📁" },
} as const;
export type VaultCategory = keyof typeof VAULT_CATEGORIES;

/** Type de pièce → catégorie et libellé lisible. Le libellé reste neutre : aucune règle de validité n'est supposée. */
export const PIECE_TYPES = {
  piece_identite: { category: "identite", label: "Carte d'identité ou passeport", sensitive: true },
  titre_sejour: { category: "identite", label: "Titre de séjour", sensitive: true },
  livret_famille: { category: "identite", label: "Livret de famille", sensitive: true },
  acte_etat_civil: { category: "identite", label: "Acte d'état civil (naissance, mariage…)", sensitive: true },
  justificatif_domicile: { category: "domicile", label: "Justificatif de domicile (facture, attestation…)", sensitive: false },
  attestation_hebergement: { category: "domicile", label: "Attestation d'hébergement", sensitive: false },
  avis_imposition: { category: "revenus_impots", label: "Avis d'imposition", sensitive: true },
  declaration_revenus: { category: "revenus_impots", label: "Déclaration de revenus", sensitive: true },
  attestation_caf: { category: "revenus_impots", label: "Attestation de la CAF", sensitive: false },
  attestation_france_travail: { category: "revenus_impots", label: "Attestation France Travail", sensitive: false },
  attestation_retraite: { category: "revenus_impots", label: "Attestation de retraite ou de pension", sensitive: false },
  fiche_paie: { category: "travail", label: "Fiche de paie", sensitive: true },
  contrat_travail: { category: "travail", label: "Contrat de travail ou avenant", sensitive: true },
  certificat_travail: { category: "travail", label: "Certificat de travail", sensitive: false },
  solde_tout_compte: { category: "travail", label: "Solde de tout compte", sensitive: true },
  attestation_employeur: { category: "travail", label: "Attestation employeur", sensitive: false },
  bail: { category: "logement", label: "Bail ou contrat de location", sensitive: false },
  quittance_loyer: { category: "logement", label: "Quittance de loyer", sensitive: false },
  attestation_loyer: { category: "logement", label: "Attestation de loyer", sensitive: false },
  etat_des_lieux: { category: "logement", label: "État des lieux", sensitive: false },
  assurance_habitation: { category: "logement", label: "Attestation d'assurance habitation", sensitive: false },
  taxe_fonciere: { category: "logement", label: "Avis de taxe foncière", sensitive: false },
  attestation_droits_sante: { category: "sante", label: "Attestation de droits à l'Assurance maladie", sensitive: true },
  mutuelle: { category: "sante", label: "Carte ou attestation de mutuelle", sensitive: true },
  document_medical: { category: "sante", label: "Document médical", sensitive: true },
  rib: { category: "banque_assurance", label: "RIB (relevé d'identité bancaire)", sensitive: true },
  releve_bancaire: { category: "banque_assurance", label: "Relevé bancaire", sensitive: true },
  contrat_assurance: { category: "banque_assurance", label: "Contrat ou attestation d'assurance", sensitive: false },
  carte_grise: { category: "vehicule", label: "Certificat d'immatriculation (carte grise)", sensitive: false },
  permis_conduire: { category: "vehicule", label: "Permis de conduire", sensitive: true },
  assurance_auto: { category: "vehicule", label: "Attestation d'assurance auto", sensitive: false },
  facture: { category: "achats", label: "Facture", sensitive: false },
  devis: { category: "achats", label: "Devis", sensitive: false },
  preuve_achat: { category: "achats", label: "Bon de commande ou preuve d'achat", sensitive: false },
  courrier_recu: { category: "courriers", label: "Courrier reçu", sensitive: false },
  autre: { category: "autres", label: "Autre document", sensitive: false },
} as const satisfies Record<string, { category: VaultCategory; label: string; sensitive: boolean }>;

export type PieceType = keyof typeof PIECE_TYPES;
export const PIECE_TYPE_IDS = Object.keys(PIECE_TYPES) as PieceType[];

export function pieceLabel(t: string | null | undefined): string {
  return (t && PIECE_TYPES[t as PieceType]?.label) || "Document";
}

/**
 * Pièces généralement utiles pour certaines démarches guidées. Ce sont des SUGGESTIONS :
 * l'utilisateur choisit ce qu'il joint, et vérifie auprès du destinataire ce qui est demandé.
 */
export const TEMPLATE_PIECES: Record<string, { type: PieceType; libelle: string }[]> = {
  "restitution-depot-garantie": [
    { type: "etat_des_lieux", libelle: "États des lieux d'entrée et de sortie" },
    { type: "bail", libelle: "Bail" },
    { type: "rib", libelle: "RIB pour le remboursement" },
  ],
  "demande-reparations": [{ type: "bail", libelle: "Bail" }],
  "explication-charges": [{ type: "bail", libelle: "Bail" }, { type: "quittance_loyer", libelle: "Dernières quittances" }],
  "conge-location-locataire": [{ type: "bail", libelle: "Bail" }],
  "declaration-sinistre": [{ type: "contrat_assurance", libelle: "Contrat ou attestation d'assurance" }, { type: "facture", libelle: "Factures des biens concernés" }],
  "explication-refus-assurance": [{ type: "contrat_assurance", libelle: "Contrat d'assurance" }],
  "resiliation-assurance-abonnement": [{ type: "contrat_assurance", libelle: "Contrat concerné" }],
  "commande-non-recue": [{ type: "preuve_achat", libelle: "Bon de commande ou preuve d'achat" }],
  "produit-defectueux": [{ type: "facture", libelle: "Facture d'achat" }],
  "demande-remboursement": [{ type: "facture", libelle: "Facture ou preuve de paiement" }, { type: "rib", libelle: "RIB" }],
  "correction-facture": [{ type: "facture", libelle: "Facture concernée" }],
  "explication-frais-bancaires": [{ type: "releve_bancaire", libelle: "Relevé où figurent les frais" }],
  "signalement-prelevement": [{ type: "releve_bancaire", libelle: "Relevé où figure le prélèvement" }],
  "salaire-non-recu": [{ type: "contrat_travail", libelle: "Contrat de travail" }, { type: "fiche_paie", libelle: "Dernières fiches de paie" }],
  "explication-fiche-paie": [{ type: "fiche_paie", libelle: "Fiche de paie concernée" }],
  "demande-echeancier": [{ type: "avis_imposition", libelle: "Justificatif de revenus (avis d'imposition)" }],
  "demande-administrative": [{ type: "piece_identite", libelle: "Pièce d'identité" }, { type: "justificatif_domicile", libelle: "Justificatif de domicile" }],
};
