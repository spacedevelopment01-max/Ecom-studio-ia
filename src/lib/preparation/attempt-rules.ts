/** Règle partagée entre précontrôle client et contrôles serveur, sans accès aux données. */

export const attemptProblem = (attempts: number, correction?: string, historyIncomplete = false) => attempts >= 2
  ? historyIncomplete ? "Deux demandes sont déjà enregistrées et une preuve historique manque. Faites vérifier l’historique avant un nouvel essai ; vos acquis et votre budget restent conservés." : "Deux essais ont déjà été demandés pour ces mêmes données. Corrigez le brief ou le choix en amont avant un nouvel essai."
  : attempts > 0 && (correction?.trim().length ?? 0) < 8
    ? "Décrivez le défaut à corriger avant un nouvel essai."
    : null;
