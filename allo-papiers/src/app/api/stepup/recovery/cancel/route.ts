import { z } from "zod";
import { HttpError, json, readJson, route } from "@/lib/http";
import { cancelVaultRecovery } from "@/lib/stepup";

const Body = z.object({ token: z.string().min(10).max(100) });

export const POST = route(async (req) => {
  const { token } = await readJson(req, Body);
  if (!(await cancelVaultRecovery(token))) throw new HttpError(400, "lien_invalide", "Ce lien d'annulation n'est plus valide (demande déjà annulée ou terminée).");
  return json({ ok: true });
});
