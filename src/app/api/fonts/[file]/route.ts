import fs from "node:fs";
import { fontFileByName } from "@/lib/media/fonts";

export const runtime = "nodejs";

/** Fichier de police (liste blanche du catalogue du studio ; polices libres incluses dans le projet). */
export async function GET(_req: Request, ctx: { params: Promise<{ file: string }> }) {
  const { file } = await ctx.params;
  const p = fontFileByName(file);
  if (!p) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(fs.readFileSync(p)), { headers: { "Content-Type": "font/ttf", "Cache-Control": "public, max-age=31536000, immutable" } });
}
