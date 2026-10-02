import { verifyMedia } from "@/lib/public-url";
import { themeVersion } from "@/lib/projects";
import { exportThemeZip } from "@/lib/theme/compile";
import { libraryLoader } from "@/lib/theme/loader";

export const runtime = "nodejs";

/** ZIP du thème téléchargé par Shopify lors de l'installation (lien signé, valable 1 h). */
export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const v = verifyMedia(token);
  if (!v || v.kind !== "theme") return new Response("Lien expiré", { status: 403 });
  const [projectId, versionId] = v.ref.split(":");
  const t = themeVersion(projectId, versionId);
  if (!t) return new Response("Introuvable", { status: 404 });
  const { zip } = await exportThemeZip(t.spec, libraryLoader);
  return new Response(new Uint8Array(zip), { headers: { "Content-Type": "application/zip" } });
}
