import fs from "node:fs";
import { verifyMedia } from "@/lib/public-url";
import { getAsset } from "@/lib/library";
import { storagePath } from "@/lib/storage";

export const runtime = "nodejs";

/** Média public temporaire (signé, expirant) pour les plateformes qui téléchargent les fichiers. */
export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const v = verifyMedia(token);
  if (!v || v.kind !== "asset") return new Response("Lien expiré / Link expired", { status: 403 });
  const a = getAsset(v.ref);
  if (!a || a.deleted_at) return new Response("Introuvable / Not found", { status: 404 });
  if (!a.storage_key.startsWith(`${a.user_id}/${a.project_id}/`)) return new Response("Introuvable / Not found", { status: 404 });
  const file = storagePath(a.storage_key);
  // Seuls les images matricielles, vidéos et sons sont servis tels quels ; tout autre type (SVG, document…) est
  // téléchargé comme fichier brut. Jamais de script exécuté sur le domaine du studio (nosniff + bac à sable).
  const inline = /^(image\/(png|jpeg|webp|gif|avif)|video\/[\w.+-]+|audio\/[\w.+-]+)$/.test(a.mime);
  return new Response(fs.createReadStream(file) as any, {
    headers: {
      "Content-Type": inline ? a.mime : "application/octet-stream",
      ...(inline ? {} : { "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(a.name)}` }),
      "Content-Length": String(fs.statSync(file).size),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
