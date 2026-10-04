import { HttpError, json, route } from "@/lib/http";
import { requireSession } from "@/lib/auth";
import { runAnalysis } from "@/lib/documents";
import { aiMode } from "@/lib/ai/provider";
import { rateLimit } from "@/lib/rate-limit";
import type { IdCtx } from "@/lib/params";

export const maxDuration = 300;

export const POST = route<IdCtx>(async (_req, ctx) => {
  const { user } = await requireSession();
  const { id } = await ctx.params;
  if (aiMode() === "absent") {
    throw new HttpError(503, "ia_non_configuree", "L'analyse par IA n'est pas encore activée sur ce site. Vos pages sont enregistrées ; aucun crédit n'a été utilisé.");
  }
  if (!user.ai_consent_at) {
    throw new HttpError(412, "consentement_ia", "Avant la première analyse, merci de lire et d'accepter les conditions de traitement par l'IA.");
  }
  await rateLimit(`analyze:${user.id}`, 20, 3600);
  const result = await runAnalysis(user.id, id);
  return json({ ok: true, analysis: result });
});
