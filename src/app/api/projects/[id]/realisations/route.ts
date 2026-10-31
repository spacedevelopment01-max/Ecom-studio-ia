/**
 * Réalisations d'un artisan (#239, phase 3) : projets du site, saisis dans l'onglet Réalisations. Propriétaire du projet
 * seulement ; photos des médias du projet seulement. Publier une réalisation la rend visible dans l'aperçu et l'export,
 * et sur le site hébergé à la prochaine publication du site.
 */
import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { L } from "@/lib/i18n-server";
import { HttpError } from "@/lib/auth";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { createRealisation, listRealisations, REALISATION_STATUSES, reorderRealisations, setRealisationStatus, updateRealisation } from "@/lib/contenus/realisations";

export const GET = handle(async (req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  return ok({ realisations: listRealisations(p.id, { archived: new URL(req.url).searchParams.has("archives") }) });
});

const Schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), realisation: z.record(z.string(), z.unknown()) }),
  z.object({ action: z.literal("update"), id: z.string().max(40), realisation: z.record(z.string(), z.unknown()) }),
  z.object({ action: z.literal("status"), id: z.string().max(40), status: z.enum(REALISATION_STATUSES) }),
  z.object({ action: z.literal("order"), ids: z.array(z.string().max(40)).max(500) }),
]);

export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  const b = await body(req, Schema);
  try {
    if (b.action === "create") return ok({ realisation: createRealisation(p.id, b.realisation), realisations: listRealisations(p.id) });
    if (b.action === "update") return ok({ realisation: updateRealisation(p.id, b.id, b.realisation), realisations: listRealisations(p.id) });
    if (b.action === "status") return ok({ realisation: setRealisationStatus(p.id, b.id, b.status), realisations: listRealisations(p.id) });
    if (b.action === "order") reorderRealisations(p.id, b.ids);
  } catch (e) {
    if (e && typeof e === "object" && "issues" in e) throw new HttpError(400, (e as { issues: { message: string; path: (string | number)[] }[] }).issues.map((i) => `${i.path.join(".")} : ${i.message}`).join(" ; ") || L("Saisie invalide.", "Invalid input."));
    throw e;
  }
  return ok({ realisations: listRealisations(p.id) });
});
