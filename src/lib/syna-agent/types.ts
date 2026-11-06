/**
 * SINA agent (#492) : contrat commun des outils. Chaque outil enveloppe une fonction NATIVE du Studio (même moteur,
 * mêmes droits, mêmes versions) ; aucune règle par formulation. Le modèle choisit l'outil et ses arguments, le
 * serveur valide les arguments, applique les droits, le budget autorisé et les confirmations, puis vérifie l'effet.
 */
import type { z } from "zod";
import type { User } from "../auth";

export type ToolKind = "read" | "write" | "generate";

/** Un changement relu après l'action (avant/après) : seule preuve acceptée d'une action réussie. */
export type Change = {
  module: string;
  object: string;
  summary: string;
  before?: unknown;
  after?: unknown;
  /** true seulement si l'état APRÈS a été relu dans la base / les fichiers du projet. */
  verified: boolean;
};

export type ToolResult = {
  ok: boolean;
  /** Résumé court lisible par le modèle et le client. */
  summary: string;
  /** Données utiles à l'étape suivante (identifiants, listes…), tronquées avant l'envoi au modèle. */
  data?: unknown;
  changes?: Change[];
  /** Tâches natives lancées (images, vidéos, thème…) : SINA reprend quand elles sont terminées. */
  jobs?: string[];
  /** Ambiguïté : SINA doit demander au client (plusieurs produits correspondent…). */
  ambiguous?: { question: string; choices: string[] };
};

export type ToolContext = {
  user: User;
  projectId: string | null;
  conversationId: string;
  runId: string;
  /** Pièces jointes du fil (analyses comprises), par identifiant. */
  attachment: (id: string) => { id: string; kind: string; name: string; path: string; assetId: string | null; analysis: unknown } | null;
};

export type CostEstimate = { maxMicro: number; label: string };

export type AgentTool<A = any> = {
  name: string;
  module: string;
  description: string;
  kind: ToolKind;
  args: z.ZodType<A>;
  /** Action sensible (publication, suppression, réservation client, domaine, paiement, modification en masse) : accord explicite. */
  sensitive?: boolean | ((args: A, ctx: ToolContext) => boolean);
  /** Projet requis (la plupart des outils). */
  needsProject?: boolean;
  /** Coût maximal d'un outil payant, AVANT exécution (devis natif). */
  estimate?: (ctx: ToolContext, args: A) => Promise<CostEstimate> | CostEstimate;
  /** Aperçu lisible d'une action à confirmer (ce qui va changer). */
  preview?: (ctx: ToolContext, args: A) => Promise<string> | string;
  run: (ctx: ToolContext, args: A) => Promise<ToolResult> | ToolResult;
};
