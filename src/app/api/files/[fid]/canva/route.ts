import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { HttpError, ownedProject, requireUser } from "@/lib/auth";
import { enqueue } from "@/lib/jobs";
import { getAsset } from "@/lib/library";
import { canvaConnection } from "@/lib/integrations/canva";
import { L } from "@/lib/i18n-server";

export const POST = handle(async (req: Request, ctx: { params: Promise<{ fid: string }> }) => {
  const user = await requireUser();
  const { fid } = await ctx.params;
  const a = getAsset(fid);
  if (!a) throw new HttpError(404, L("Fichier introuvable.", "File not found."));
  ownedProject(user, a.project_id);
  if (!canvaConnection(user.id)) throw new HttpError(409, L("Connectez d'abord Canva dans l'onglet Connexions.", "Connect Canva first in the Connections tab."));
  const b = await body(req, z.object({ action: z.enum(["send", "import"]), format: z.enum(["png", "jpg", "pdf", "mp4"]).optional() }));
  const job = enqueue({ userId: user.id, projectId: a.project_id, type: b.action === "send" ? "canva.send" : "canva.import", label: b.action === "send" ? L("Envoi vers Canva", "Sending to Canva") : L("Récupération depuis Canva", "Importing from Canva"), payload: { assetId: a.id, format: b.format } });
  return ok({ jobId: job.id });
});
