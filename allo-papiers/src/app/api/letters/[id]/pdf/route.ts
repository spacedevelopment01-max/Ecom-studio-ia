import { route } from "@/lib/http";
import { requireSession } from "@/lib/auth";
import { assertReviewed, buildLetterPdf, getLetter } from "@/lib/letters/service";
import type { IdCtx } from "@/lib/params";

export const GET = route<IdCtx>(async (_req, ctx) => {
  const { user } = await requireSession();
  const { id } = await ctx.params;
  const letter = await getLetter(user.id, id);
  assertReviewed(letter);
  const pdf = await buildLetterPdf(letter);
  const name = letter.title.normalize("NFD").replace(/[^\w -]/g, "").replace(/\s+/g, "-").slice(0, 60) || "courrier";
  return new Response(new Uint8Array(pdf), {
    headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="${name}.pdf"`, "cache-control": "private, no-store" },
  });
});
