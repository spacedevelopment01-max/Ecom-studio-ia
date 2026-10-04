import type { Analysis, ChatAnswer, Comparison } from "./ai/schema";
import type { ParcoursId } from "./plans";

/**
 * EXEMPLES FICTIFS. Ces analyses ont été écrites à la main pour illustrer le service.
 * Elles ne proviennent d'aucun vrai document, ne consomment aucun crédit et sont
 * toujours affichées avec la mention « Exemple fictif ».
 */
function base(over: Partial<Analysis>): Analysis {
  return {
    lisibilite: { globale: "bonne", pages_illisibles: [], remarques: null },
    organisme: { nom: null, type: "inconnu" },
    type_document: "",
    titre_court: "",
    resume_simple: "",
    demande_principale: null,
    urgence: { niveau: "vert", justification: "" },
    date_limite: { date: null, nature: "aucune", libelle: null, source: null, calcul: null, incertitude: null },
    autres_dates: [],
    etapes: [],
    consequences: { texte: "", fondement: "non_precise_dans_document", source: null },
    brouillon_reponse: null,
    destinataire: null,
    references_utiles: [],
    passages_sources: [],
    informations_manquantes: [],
    incertitudes: [],
    verifications_externes: [],
    situation_complexe: { est_complexe: false, motifs: [] },
    orientation: { vers: "aucune", raison: null },
    anomalies: [],
    pistes_verification: [],
    instructions_ignorees: false,
    pieces_demandees: [],
    classement: { type_piece: "courrier_recu", libelle: "Courrier", periode: null, date_document: null, valable_jusqu_au: null, emetteur: null, confiance: "moyenne" },
    ...over,
  };
}

export type Example = { slug: string; label: string; intro: string; letter: string[]; analysis: Analysis };

export const EXAMPLES: Example[] = [
  {
    slug: "caf-justificatifs",
    label: "Caisse d'allocations – demande de justificatifs",
    intro: "Un courrier qui demande des pièces avant une date précise.",
    letter: [
      "CAISSE D'ALLOCATIONS FAMILIALES DE L'EXEMPLE",
      "Le 2 octobre 2026",
      "Objet : mise à jour de votre dossier – N° allocataire 0000000 (fictif)",
      "Madame, Monsieur,",
      "Afin de poursuivre l'étude de vos droits, nous vous invitons à nous transmettre votre dernier avis d'imposition ainsi qu'une attestation de loyer.",
      "Merci de nous adresser ces pièces avant le 24 octobre 2026, depuis votre espace personnel ou par courrier à l'adresse ci-dessous.",
      "Sans réponse de votre part à cette date, le versement de vos prestations pourra être suspendu.",
      "CAF de l'Exemple – 1 rue Imaginaire – 00000 Exemple-Ville",
    ],
    analysis: base({
      organisme: { nom: "Caisse d'allocations familiales de l'Exemple", type: "caf" },
      type_document: "Demande de pièces justificatives",
      titre_court: "CAF – demande de justificatifs",
      resume_simple: "La CAF a besoin de deux documents pour continuer à étudier vos droits : votre dernier avis d'imposition et une attestation de loyer.",
      demande_principale: "Envoyer votre dernier avis d'imposition et une attestation de loyer avant le 24 octobre 2026.",
      urgence: { niveau: "orange", justification: "Une date limite est écrite : « avant le 24 octobre 2026 »." },
      date_limite: {
        date: "2026-10-24",
        nature: "ecrite",
        libelle: "Envoi des pièces demandées",
        source: { page: 1, citation: "Merci de nous adresser ces pièces avant le 24 octobre 2026" },
        calcul: null,
        incertitude: null,
      },
      autres_dates: [{ date: "2026-10-02", libelle: "Date du courrier", source: { page: 1, citation: "Le 2 octobre 2026" } }],
      etapes: [
        { texte: "Retrouver votre dernier avis d'imposition", detail: "Il est téléchargeable dans votre espace sur impots.gouv.fr, auquel vous vous connectez vous-même." },
        { texte: "Demander une attestation de loyer à votre propriétaire ou à votre agence", detail: null },
        { texte: "Envoyer les deux pièces avant le 24 octobre 2026", detail: "Depuis votre espace personnel CAF ou par courrier." },
        { texte: "Garder une preuve de l'envoi", detail: "Capture d'écran de l'envoi en ligne ou copie du courrier." },
      ],
      consequences: {
        texte: "Le courrier indique que, sans réponse à cette date, le versement de vos prestations pourra être suspendu.",
        fondement: "ecrit_dans_document",
        source: { page: 1, citation: "Sans réponse de votre part à cette date, le versement de vos prestations pourra être suspendu." },
      },
      brouillon_reponse: {
        objet: "Mise à jour de mon dossier – N° allocataire [Votre numéro]",
        corps:
          "Madame, Monsieur,\n\nSuite à votre courrier du 2 octobre 2026, je vous prie de trouver ci-joint mon dernier avis d'imposition ainsi que mon attestation de loyer.\n\nJe reste à votre disposition pour tout complément.\n\nVeuillez agréer, Madame, Monsieur, mes salutations distinguées.\n\n[Votre nom]",
        a_completer: ["Votre numéro d'allocataire", "Votre nom"],
      },
      destinataire: {
        nom: "CAF de l'Exemple",
        adresse: "1 rue Imaginaire\n00000 Exemple-Ville",
        source: { page: 1, citation: "CAF de l'Exemple – 1 rue Imaginaire – 00000 Exemple-Ville" },
      },
      references_utiles: [{ libelle: "Numéro d'allocataire", valeur: "0000000 (fictif)", page: 1 }],
      passages_sources: [
        { element: "Pièces demandées", page: 1, citation: "votre dernier avis d'imposition ainsi qu'une attestation de loyer" },
        { element: "Date limite", page: 1, citation: "avant le 24 octobre 2026" },
      ],
      informations_manquantes: [],
      verifications_externes: [],
      orientation: { vers: "aucune", raison: null },
      pieces_demandees: [
        { libelle: "Dernier avis d'imposition", type_piece: "avis_imposition", source: { page: 1, citation: "votre dernier avis d'imposition" } },
        { libelle: "Attestation de loyer", type_piece: "attestation_loyer", source: { page: 1, citation: "une attestation de loyer" } },
      ],
      classement: { type_piece: "courrier_recu", libelle: "CAF – demande de justificatifs (2 octobre 2026)", periode: null, date_document: "2026-10-02", valable_jusqu_au: null, emetteur: "Caisse d'allocations familiales de l'Exemple", confiance: "elevee" },
    }),
  },
  {
    slug: "amende-stationnement",
    label: "Avis de paiement – stationnement",
    intro: "Un avis avec un montant et des délais différents selon la date de paiement.",
    letter: [
      "AVIS DE PAIEMENT (exemple fictif)",
      "Date d'envoi : 1er octobre 2026",
      "Montant : 35 € si paiement dans les 30 jours suivant la date d'envoi de l'avis.",
      "Contestation : voir les modalités indiquées au verso.",
    ],
    analysis: base({
      organisme: { nom: null, type: "amende" },
      type_document: "Avis de paiement",
      titre_court: "Avis de paiement – stationnement",
      resume_simple: "Ce document vous demande de payer 35 €. Le recto indique un délai de 30 jours à partir de la date d'envoi. Les modalités de contestation sont au verso, qui n'a pas été transmis.",
      demande_principale: "Payer 35 €, ou contester selon les modalités indiquées au verso.",
      urgence: { niveau: "orange", justification: "Un délai de paiement est indiqué : « dans les 30 jours suivant la date d'envoi de l'avis »." },
      date_limite: {
        date: "2026-10-31",
        nature: "calculee",
        libelle: "Paiement au montant de 35 €",
        source: { page: 1, citation: "35 € si paiement dans les 30 jours suivant la date d'envoi de l'avis" },
        calcul: "Date d'envoi écrite (1er octobre 2026) + 30 jours, selon la phrase du document.",
        incertitude: "Date calculée : vérifiez sur l'avis et sur le site de paiement indiqué.",
      },
      etapes: [
        { texte: "Vérifier l'immatriculation, la date et le lieu indiqués", detail: null },
        { texte: "Lire le verso pour les modalités de contestation", detail: "Le verso n'a pas été transmis." },
        { texte: "Payer ou contester avant la date indiquée", detail: "Uniquement par les moyens indiqués sur l'avis lui-même." },
      ],
      consequences: { texte: "Le recto transmis ne précise pas ce qui se passe après le délai. Le verso peut contenir cette information.", fondement: "non_precise_dans_document", source: null },
      passages_sources: [{ element: "Montant et délai", page: 1, citation: "35 € si paiement dans les 30 jours suivant la date d'envoi de l'avis" }],
      informations_manquantes: ["Le verso de l'avis (modalités de contestation)."],
      incertitudes: ["Date calculée à partir du délai écrit : à confirmer."],
      anomalies: [],
      pistes_verification: ["Méfiez-vous des SMS ou emails qui imitent ce type d'avis : payez uniquement à partir des références écrites sur l'avis papier."],
    }),
  },
];

export function getExample(slug: string) {
  return EXAMPLES.find((e) => e.slug === slug) ?? null;
}

// ───────────── Mode démonstration (analyses SIMULÉES) ─────────────

export function demoAnalysis(parcours: ParcoursId, today: string): Analysis {
  const a = structuredClone(EXAMPLES[0].analysis);
  a.titre_court = `Démonstration – ${a.titre_court}`;
  a.resume_simple = `MODE DÉMONSTRATION : ce résultat est simulé et ne correspond pas à votre document. ${a.resume_simple}`;
  a.incertitudes = ["Résultat simulé (mode démonstration) : aucune IA n'a lu votre document."];
  a.date_limite.incertitude = `Exemple fictif. Date du jour : ${today}. Parcours : ${parcours}.`;
  return a;
}

export function demoChat(question: string): ChatAnswer {
  return {
    reponse: `MODE DÉMONSTRATION : réponse simulée à « ${question.slice(0, 80)} ». Aucune IA n'a lu votre document.`,
    ce_que_dit_le_document: [],
    suppositions: [],
    a_verifier: ["Activez l'IA réelle pour obtenir une réponse fondée sur votre document."],
    orientation: null,
  };
}

export function demoComparison(kind: string): Comparison {
  return {
    type_comparaison: kind,
    documents: [
      { repere: "A", description: "Document A (démonstration)" },
      { repere: "B", description: "Document B (démonstration)" },
    ],
    differences: [
      {
        element: "Exemple",
        valeur_a: "100,00 €",
        valeur_b: "110,00 €",
        source_a: null,
        source_b: null,
        observation: "MODE DÉMONSTRATION : différence fictive.",
        interpretation_possible: null,
        a_verifier_aupres_de: null,
      },
    ],
    elements_identiques_notables: [],
    limites: ["Résultat simulé."],
    avertissement: "Une différence ne prouve rien à elle seule.",
  };
}
