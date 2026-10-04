import { route } from "@/lib/http";
import { requireSession } from "@/lib/auth";
import { buildSendPdf, getSend } from "@/lib/sends";
import type { IdCtx } from "@/lib/params";

/** PDF exact de l'envoi (courrier + pièces), pour relecture avant validation. */
export const GET = route<IdCtx>(async (_req, ctx) => {
  const { user } = await requireSession();
  const { id } = await ctx.params;
  const pdf = await buildSendPdf(await getSend(user.id, id));
  return new Response(new Uint8Array(pdf), {
    headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="envoi.pdf"`, "cache-control": "private, no-store" },
  });
});
