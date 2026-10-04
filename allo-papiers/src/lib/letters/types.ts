/** Modèles de courriers guidés : types partagés. */
export type LetterDomain = "travail" | "logement" | "assurance" | "consommation" | "banque" | "administratif" | "juridique";

export type Question = {
  id: string;
  label: string;
  type: "text" | "textarea" | "date" | "select" | "radio" | "money" | "number";
  options?: { value: string; label: string }[];
  required?: boolean;
  help?: string;
  placeholder?: string;
  /** La question n'est posée que si une réponse précédente vaut l'une de ces valeurs. */
  showIf?: { id: string; equals: string | string[] };
};

export type Answers = Record<string, string>;

export type BuiltLetter = {
  subject: string;
  /** Corps du courrier, sans l'en-tête expéditeur/destinataire ni la formule de politesse finale. */
  body: string;
  /** Points à vérifier par l'utilisateur avant envoi (affichés en liste). */
  checks: string[];
};

export type LetterTemplate = {
  id: string;
  domain: LetterDomain;
  title: string;
  description: string;
  keywords: string[];
  /** Avertissement important affiché AVANT les questions (ex. nature de la démarche). */
  warning?: string;
  /** Affiche la mention « ne remplace pas un avocat ou un professionnel habilité ». */
  professionalNotice?: boolean;
  /** Réservé à l'offre Plus (parcours avancés). La rédaction guidée de base est gratuite. */
  plus?: boolean;
  sending: { mode: "lrar" | "remise_main_propre_ou_lrar" | "simple" | "espace_en_ligne" | "au_choix"; note: string };
  questions: Question[];
  build: (answers: Answers) => BuiltLetter;
};

export const DOMAIN_LABELS: Record<LetterDomain, string> = {
  travail: "Travail",
  logement: "Logement",
  assurance: "Assurance",
  consommation: "Achats et abonnements",
  banque: "Banque",
  administratif: "Administration",
  juridique: "Notaire et avocat",
};
