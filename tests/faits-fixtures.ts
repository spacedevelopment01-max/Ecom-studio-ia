/**
 * Les faits à montrer d'un fil d'essai (27 novembre 2026) : avant le résumé, chaque fait du cahier doit avoir été demandé.
 * Pour les tests qui ne portent pas sur eux, le client répond « je ne sais pas » à chacun (rien ne s'écrira), puis l'action
 * part. Aucun appel.
 */
export async function avecLesFaitsDemandes<T>(ctx: { conversationId: string }, fn: () => Promise<T>): Promise<T> {
  const J = await import("@/lib/syna-agent/journey");
  const F = await import("@/lib/syna-agent/faits-a-montrer");
  const reste = F.faitsAAborder(J.journeyOf(ctx.conversationId), F.faitsDuFil(ctx.conversationId));
  if (reste.length) F.enregistrerLesFaits(ctx.conversationId, reste.map((x) => ({ sujet: x.sujet, etat: "ne_sait_pas" as const })));
  return fn();
}
