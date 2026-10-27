/** Règle partagée entre précontrôle client et contrôles serveur, sans accès aux données. */

export const attemptProblem = (attempts: number, correction?: string) => attempts >= 2
  ? "Deux essais ont déjà été demandés pour ces mêmes données. Corrigez le brief ou le choix en amont avant un nouvel essai."
  : attempts > 0 && (correction?.trim().length ?? 0) < 8
    ? "Décrivez le défaut à corriger avant un nouvel essai."
    : null;
