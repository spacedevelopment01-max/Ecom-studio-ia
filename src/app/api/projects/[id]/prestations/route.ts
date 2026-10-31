/**
 * Prestations, horaires et intervenants d'un site avec réservation native (#239, phase 2) : lecture et enregistrement
 * dans la section de réglages lue par le moteur de réservation (source unique), avec une nouvelle version du site.
 * Propriétaire du projet seulement.
 */
import { handle, ok } from "@/lib/http";
import { HttpError } from "@/lib/auth";
import { L } from "@/lib/i18n-server";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { readPrestations, savePrestations } from "@/lib/contenus/prestations";

export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  const r = readPrestations(p.id);
  if (!r) throw new HttpError(404, L("Ce site n'a pas de réservation intégrée.", "This site has no built-in booking."), "no_booking");
  return ok(r);
});

export const PUT = handle(async (req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  const raw = await req.json().catch(() => { throw new HttpError(400, L("Requête invalide.", "Invalid request.")); });
  try {
    return ok(savePrestations(p.id, raw));
  } catch (e) {
    if (e && typeof e === "object" && "issues" in e) throw new HttpError(400, (e as { issues: { message: string; path: (string | number)[] }[] }).issues.map((i) => `${i.path.join(".")} : ${i.message}`).join(" ; "));
    throw e;
  }
});
