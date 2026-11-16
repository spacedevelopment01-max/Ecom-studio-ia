import { z } from "zod";
import { HttpError, requireUser } from "@/lib/auth";
import { body, handle, ok } from "@/lib/http";
import { L } from "@/lib/i18n-server";
import { ouvrirAuxVisites } from "@/lib/ciel/ciel-commun";

export const runtime = "nodejs";

/** Le propriétaire ouvre ou referme son projet aux visites du ciel partagé. C'est son choix, et il le reprend quand il veut. */
export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  const b = await body(req, z.object({ projectId: z.string().min(1), ouvert: z.boolean() }));
  if (!ouvrirAuxVisites(user.id, b.projectId, b.ouvert)) throw new HttpError(404, L("Projet introuvable.", "Project not found."));
  return ok({ ouvert: b.ouvert });
});
