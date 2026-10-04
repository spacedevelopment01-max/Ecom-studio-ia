import { randomUUID } from "node:crypto";
import { z } from "zod";
import { HttpError, json, readJson, route } from "@/lib/http";
import { requireSession } from "@/lib/auth";
import { getLetter } from "@/lib/letters/service";
import { AiError, aiMode, rewriteLetter } from "@/lib/ai/provider";
import { commitCredit, releaseCredit, reserveCredit } from "@/lib/quota";
import { env } from "@/lib/env";
import type { IdCtx } from "@/lib/params";

const Body = z.object({ instruction: z.string().trim().max(300).default("") });

/** Reformulation proposée par l'IA (offre Plus). Le texte proposé n'est PAS appliqué automatiquement. */
export const POST = route<IdCtx>(async (req, ctx) => {
  const { user } = await requireSession();
  const { id } = await ctx.params;
  const letter = await getLetter(user.id, id);
  if (aiMode() === "absent") throw new HttpError(503, "ia_non_configuree", "L'IA n'est pas encore activée sur ce site.");
  if (!user.ai_consent_at) throw new HttpError(412, "consentement_ia", "Acceptez d'abord les conditions de traitement par l'IA.");
  const { instruction } = await readJson(req, Body);
  const ref = randomUUID();
  const usesCredit = !env.demoMode;
  if (usesCredit) await reserveCredit(user.id, "chat", ref);
  try {
    const { data } = await rewriteLetter(letter.body, instruction);
    if (usesCredit) await commitCredit("chat", ref, user.id);
    return json({ proposal: data });
  } catch (e) {
    if (usesCredit) await releaseCredit("chat", ref, user.id);
    if (e instanceof AiError) throw new HttpError(502, `ia_${e.code}`, `${e.message} Aucun crédit n'a été utilisé.`);
    throw e;
  }
});
