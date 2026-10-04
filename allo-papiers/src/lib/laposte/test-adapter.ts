import "server-only";
import { createHash } from "node:crypto";
import type { PostalAdapter, Submission, SubmissionResult } from "./adapter";

/**
 * MODE TEST — SIMULATION EXPLICITE.
 * Aucun courrier n'est imprimé, déposé ni distribué. Le numéro de suivi est FICTIF
 * (préfixe « TEST-FICTIF- ») et les étapes sont marquées « simulé ».
 */
export class TestPostalAdapter implements PostalAdapter {
  readonly mode = "test" as const;
  readonly label = "Mode test (simulation, aucun envoi réel)";

  async submit(s: Submission): Promise<SubmissionResult> {
    // Même clé d'idempotence → même résultat (pas de double « envoi » simulé).
    const h = createHash("sha256").update(s.idempotencyKey).digest("hex").slice(0, 10).toUpperCase();
    return {
      providerReference: `SIMULATION-${h}`,
      trackingNumber: `TEST-FICTIF-${h}`,
      fictive: true,
      events: [
        { status: "depose_simule", detail: "Dépôt SIMULÉ (mode test) : aucun courrier n'a été envoyé." },
        { status: "distribue_simule", detail: "Distribution SIMULÉE (mode test) : aucun courrier n'a été distribué." },
      ],
    };
  }
}
