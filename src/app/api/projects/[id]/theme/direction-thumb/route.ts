/**
 * Vignette d'une direction composée avec le contenu du projet (voir direction-thumb.ts).
 * Sans marque encore, ou sans navigateur, on renvoie vers la capture d'exemple de la direction.
 */
import { handle } from "@/lib/http";
import { uiLang } from "@/lib/i18n-server";
import { currentTheme } from "@/lib/projects";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { DIRECTIONS, type DirectionId } from "@/lib/theme/directions";
import { directionThumb } from "@/lib/theme/direction-thumb";

export const runtime = "nodejs";

export const GET = handle(async (req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  const d = new URL(req.url).searchParams.get("d") ?? "";
  if (!DIRECTIONS.some((x) => x.id === d)) return new Response(null, { status: 404 });
  const lang = currentTheme(p.id)?.spec.language ?? uiLang();
  // Sans marque : capture d'exemple. Sans navigateur de captures ou en cas d'échec : 503, l'écran montre alors
  // l'aperçu en direct de la direction (rendu par le serveur), jamais l'exemple d'un autre projet.
  const fallback = () => new Response(null, { status: 307, headers: { Location: `/demo/directions/${d}${lang === "en" ? ".en" : ""}.jpg`, "Cache-Control": "no-store" } });
  const unavailable = () => new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } });
  if (!p.brand) return fallback();
  try {
    const jpg = await directionThumb(p.id, d as DirectionId, lang);
    if (!jpg) return unavailable();
    return new Response(new Uint8Array(jpg), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, no-cache" } });
  } catch (e) {
    console.warn("[direction-thumb]", (e as Error).message);
    return unavailable();
  }
});
