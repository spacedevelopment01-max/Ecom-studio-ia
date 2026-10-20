/**
 * Fichiers d'une démo intégrale (pages, styles, visuels de démonstration) pour le visualiseur « Voir la démo complète » :
 * contenus de démonstration seulement, jamais indexés, réservés aux comptes connectés.
 */
import { requireUser } from "@/lib/auth";
import { handle } from "@/lib/http";
import { themeDemoFile } from "@/lib/theme/theme-demos";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string; path?: string[] }> };

export const GET = handle(async (_req: Request, ctx: Ctx) => {
  await requireUser();
  const { id, path = [] } = await ctx.params;
  const file = themeDemoFile(id, path.map((p) => decodeURIComponent(p)).join("/"));
  const headers = { "X-Robots-Tag": "noindex, nofollow, noarchive", "X-Content-Type-Options": "nosniff" };
  if (!file) return new Response("Démo introuvable.", { status: 404, headers: { ...headers, "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
  const html = file.type.startsWith("text/html");
  return new Response(new Uint8Array(file.body), { headers: { ...headers, "Content-Type": file.type, "Cache-Control": html ? "private, no-cache" : "private, max-age=3600", ...(html ? { "X-Frame-Options": "SAMEORIGIN" } : {}) } });
});
