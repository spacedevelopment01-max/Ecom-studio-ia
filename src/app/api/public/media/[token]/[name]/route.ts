import fs from "node:fs";
import { verifyMedia } from "@/lib/public-url";
import { getAsset } from "@/lib/library";
import { storagePath } from "@/lib/storage";

export const runtime = "nodejs";

/** Média public temporaire (signé, expirant) pour les plateformes qui téléchargent les fichiers. */
export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const v = verifyMedia(token);
  if (!v || v.kind !== "asset") return new Response("Lien expiré", { status: 403 });
  const a = getAsset(v.ref);
  if (!a || a.deleted_at) return new Response("Introuvable", { status: 404 });
  const file = storagePath(a.storage_key);
  return new Response(fs.createReadStream(file) as any, { headers: { "Content-Type": a.mime, "Content-Length": String(fs.statSync(file).size), "Cache-Control": "public, max-age=600" } });
}
