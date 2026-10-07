import { handle, ok } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { aiDiagnostic } from "@/lib/ai/diagnostic";

/**
 * Diagnostic des appels IA (administration, lecture seule) : coûts par projet / tâche de fond / étape / module /
 * modèle, verdicts de qualité, reprises, doublons, suivi des candidats, statut du SEO Shopify.
 * Filtres : ?project=<id>&job=<id>&since=<ms>&limit=<n>&calls=0 (sans la liste détaillée des appels).
 * Jamais de prompt complet, de raisonnement, d'image ni de secret dans la réponse.
 */
export const GET = handle(async (req: Request) => {
  await requireAdmin();
  const q = new URL(req.url).searchParams;
  const num = (k: string) => (q.get(k) && Number.isFinite(Number(q.get(k))) ? Number(q.get(k)) : undefined);
  const d = aiDiagnostic({ projectId: q.get("project") || undefined, jobId: q.get("job") || undefined, since: num("since"), limit: num("limit") });
  return ok(q.get("calls") === "0" ? { ...d, calls: undefined } : d);
});
