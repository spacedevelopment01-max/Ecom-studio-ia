import { z } from "zod";
import { HttpError, json, readJson, route } from "@/lib/http";
import { requireSession } from "@/lib/auth";
import { classifyDocument, classifyManually, ManualClassification } from "@/lib/vault";
import { aiMode } from "@/lib/ai/provider";
import { rateLimit } from "@/lib/rate-limit";
import { PIECE_TYPE_IDS, type PieceType } from "@/lib/pieces";
import type { IdCtx } from "@/lib/params";

export const maxDuration = 120;

const Body = z.object({
  hint: z.enum(PIECE_TYPE_IDS as [PieceType, ...PieceType[]]).nullable().optional(),
  manual: ManualClassification.optional(),
});

/**
 * Ranger un document dans le coffre :
 * - `manual` : classement choisi par la personne (gratuit, toujours possible, prioritaire) ;
 * - sinon : reconnaissance par l'IA (indication facultative `hint`).
 */
export const POST = route<IdCtx>(async (req, ctx) => {
  const { user } = await requireSession();
  const { id } = await ctx.params;
  const body = await readJson(req, Body);
  if (body.manual) return json({ classement: await classifyManually(user.id, id, body.manual) });
  if (aiMode() === "absent") {
    throw new HttpError(503, "ia_non_configuree", "Le rangement automatique n'est pas encore activé : choisissez le type de document vous-même.");
  }
  if (!user.ai_consent_at) throw new HttpError(412, "consentement_ia", "Acceptez d'abord les conditions de traitement par l'IA, ou choisissez le type vous-même.");
  await rateLimit(`classify:${user.id}`, 60, 3600);
  return json({ classement: await classifyDocument(user.id, id, body.hint ?? null) });
});
