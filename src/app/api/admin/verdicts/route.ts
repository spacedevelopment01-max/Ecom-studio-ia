import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { HttpError, requireAdmin } from "@/lib/auth";
import { L } from "@/lib/i18n-server";
import { accord, carnet, verdictDuProprietaire } from "@/lib/syna-agent/juges";

/** Le carnet des juges : les images relues par SINA et l'accord entre son relecteur et le propriétaire. */
export const GET = handle(async () => {
  await requireAdmin();
  return ok({ images: carnet(60), accord: accord() });
});

/** Le verdict du propriétaire sur une image : oui ou non. */
export const POST = handle(async (req: Request) => {
  await requireAdmin();
  const b = await body(req, z.object({ assetId: z.string().min(1).max(80), verdict: z.enum(["oui", "non"]) }));
  if (!verdictDuProprietaire(b.assetId, b.verdict)) throw new HttpError(404, L("Image introuvable dans le carnet.", "Image not found in the log."));
  return ok({ accord: accord() });
});
