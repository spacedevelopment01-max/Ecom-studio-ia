import { z } from "zod";
import { HttpError, json, readJson, route } from "@/lib/http";
import { requireSession } from "@/lib/auth";
import { addFile, reorderFiles } from "@/lib/documents";
import { rateLimit } from "@/lib/rate-limit";
import type { IdCtx } from "@/lib/params";

export const maxDuration = 60;

/** Ajout d'UNE page (photo ou PDF) par requête : compatible avec la limite de taille des fonctions. */
export const POST = route<IdCtx>(async (req, ctx) => {
  const { user } = await requireSession();
  const { id } = await ctx.params;
  await rateLimit(`upload:${user.id}`, 120, 3600);
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof Blob)) throw new HttpError(400, "fichier", "Aucun fichier reçu.");
  const buf = Buffer.from(await file.arrayBuffer());
  return json(await addFile(user.id, id, buf));
});

const Order = z.object({ order: z.array(z.string().uuid()).max(20) });

export const PUT = route<IdCtx>(async (req, ctx) => {
  const { user } = await requireSession();
  const { id } = await ctx.params;
  const { order } = await readJson(req, Order);
  await reorderFiles(user.id, id, order);
  return json({ ok: true });
});
