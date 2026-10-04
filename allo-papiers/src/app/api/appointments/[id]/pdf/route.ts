import { notFound, route } from "@/lib/http";
import { requireSession } from "@/lib/auth";
import { sql } from "@/lib/db";
import { sheetPdf } from "@/lib/pdf";
import type { AppointmentSheet } from "@/lib/ai/schema";
import { formatFrDate } from "@/lib/time";
import type { IdCtx } from "@/lib/params";

export const GET = route<IdCtx>(async (_req, ctx) => {
  const { user } = await requireSession();
  const { id } = await ctx.params;
  const [row] = await sql()<{ content: AppointmentSheet; updated_at: Date }[]>`select content, updated_at from appointment_sheets where id = ${id} and user_id = ${user.id}`;
  if (!row) throw notFound();
  const c = row.content;
  const pdf = await sheetPdf(
    c.titre,
    `Fiche de préparation – mise à jour le ${formatFrDate(row.updated_at.toISOString())}. Aucun rendez-vous n'est réservé par Allô Papiers.`,
    [
      { title: "Résumé", text: c.resume || "—" },
      { title: "Chronologie", items: c.chronologie.map((e) => `${e.date ? `${formatFrDate(e.date)} : ` : ""}${e.evenement}`) },
      { title: "Pièces à apporter", items: c.pieces_a_apporter },
      { title: "Questions à poser", items: c.questions_a_poser },
      { title: "Points d'attention", items: c.points_attention },
    ],
    "Allô Papiers vous aide à comprendre et à répondre, mais ne remplace pas un avocat ou un professionnel habilité.",
  );
  return new Response(new Uint8Array(pdf), {
    headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="fiche-rendez-vous.pdf"`, "cache-control": "private, no-store" },
  });
});
