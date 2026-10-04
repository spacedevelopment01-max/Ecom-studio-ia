import "server-only";
import { PostalNotAvailableError, type PostalAdapter, type SubmissionResult } from "./adapter";

/**
 * ADAPTATEUR RÉEL — NON DÉVELOPPÉ.
 *
 * L'envoi réel d'une lettre recommandée en ligne suppose un contrat avec La Poste / Maileva
 * (offre « Lettre Recommandée En Ligne »), la documentation technique remise avec ce contrat
 * et des identifiants d'accès. Aucun de ces éléments n'était disponible lors du développement :
 * aucune adresse d'API n'est donc inventée ici.
 *
 * Pour l'activer plus tard : implémenter `submit()` à partir de la documentation officielle,
 * le tester dans le bac à sable fourni par La Poste, puis seulement définir LAPOSTE_MODE=real
 * et LAPOSTE_REAL_ADAPTER_READY=true.
 */
export class RealPostalAdapter implements PostalAdapter {
  readonly mode = "real" as const;
  readonly label = "La Poste (réel)";

  async submit(): Promise<SubmissionResult> {
    throw new PostalNotAvailableError(
      "L'envoi réel par La Poste n'est pas encore disponible : l'intégration nécessite un contrat et la documentation officielle.",
    );
  }
}
