/** Polices des cartes d'identité SINA (#492) : seuls les fichiers de la liste du thème (assets/fonts, licences OFL). */
import fs from "node:fs";
import { requireUser } from "@/lib/auth";
import { handle } from "@/lib/http";
import type { Ctx } from "@/lib/route-helpers";
import { fontFilePath } from "@/lib/theme/render";
export const runtime = "nodejs";
export const GET = handle(async (_req: Request, ctx: Ctx<{ file: string }>) => {
  await requireUser();
  const { file } = await ctx.params;
  const f = fontFilePath(file);
  if (!f) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(fs.readFileSync(f)), { headers: { "Content-Type": "font/ttf", "Cache-Control": "private, max-age=86400" } });
});
