import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { HttpError, ownedProject, requireUser } from "@/lib/auth";
import { enqueue } from "@/lib/jobs";
import { getAsset } from "@/lib/library";
import { canvaConnection } from "@/lib/integrations/canva";

export const POST = handle(async (req: Request, ctx: { params: Promise<{ fid: string }> }) => {
  const user = await requireUser();
  const { fid } = await ctx.params;
  const a = getAsset(fid);
  if (!a) throw new HttpError(404, "Fichier introuvable.");
  ownedProject(user, a.project_id);
  if (!canvaConnection(user.id)) throw new HttpError(409, "Connectez d'abord Canva dans l'onglet Connexions.");
  const b = await body(req, z.object({ action: z.enum(["send", "import"]), format: z.enum(["png", "jpg", "pdf", "mp4"]).optional() }));
  const job = enqueue({ userId: user.id, projectId: a.project_id, type: b.action === "send" ? "canva.send" : "canva.import", label: b.action === "send" ? "Envoi vers Canva" : "Récupération depuis Canva", payload: { assetId: a.id, format: b.format } });
  return ok({ jobId: job.id });
});
