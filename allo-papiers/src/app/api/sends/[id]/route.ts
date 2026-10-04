import { json, route } from "@/lib/http";
import { requireSession } from "@/lib/auth";
import { getSend, VALIDATION_STATEMENT } from "@/lib/sends";
import { sendPrice } from "@/lib/laposte";
import { sql } from "@/lib/db";
import type { IdCtx } from "@/lib/params";

/** Récapitulatif complet affiché AVANT validation (texte, destinataire, pièces, prix, nature). */
export const GET = route<IdCtx>(async (_req, ctx) => {
  const { user } = await requireSession();
  const { id } = await ctx.params;
  const s = await getSend(user.id, id);
  const events = await sql()`select at, status, detail from send_events where send_id = ${id} order by at`;
  let priceLabel = "Lettre recommandée avec avis de réception";
  let priceFictive = s.provider_mode === "test";
  try {
    const p = sendPrice();
    priceLabel = p.label;
    priceFictive = p.fictive;
  } catch {
    /* prix non configuré : l'envoi sera refusé à la préparation */
  }
  return json({
    send: {
      id: s.id,
      status: s.status,
      mode: s.provider_mode,
      nature: priceLabel,
      body: s.body,
      sender: s.sender,
      recipient: s.recipient,
      recipientSource: s.recipient_source,
      attachments: s.attachments.map((a) => ({ label: a.label, fileId: a.fileId })),
      priceCents: s.price_cents,
      priceFictive,
      currency: s.currency,
      contentHash: s.content_hash,
      validatedAt: s.validated_at,
      validatedValid: Boolean(s.validated_hash && s.validated_hash === s.content_hash),
      trackingNumber: s.tracking_number,
      trackingFictive: s.tracking_is_fictive,
      paidAt: s.paid_at,
      submittedAt: s.submitted_at,
      letterId: s.letter_id,
    },
    statement: VALIDATION_STATEMENT,
    events,
  });
});
