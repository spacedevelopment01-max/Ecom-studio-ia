import { handle } from "@/lib/http";
import { HttpError, requireAdmin } from "@/lib/auth";
import { listTracks, trackData } from "@/lib/music-library";
import { L } from "@/lib/i18n-server";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ tid: string }> };

/** Écoute d'un morceau de la bibliothèque (administration). */
export const GET = handle(async (_req: Request, ctx: Ctx) => {
  await requireAdmin();
  const { tid } = await ctx.params;
  const t = listTracks().find((x) => x.id === tid);
  if (!t) throw new HttpError(404, L("Morceau introuvable.", "Track not found."));
  return new Response(new Uint8Array(trackData(t)), { headers: { "Content-Type": t.mime, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
});
