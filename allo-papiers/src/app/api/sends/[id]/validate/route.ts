import { z } from "zod";
import { clientIp, json, readJson, route } from "@/lib/http";
import { requireSession } from "@/lib/auth";
import { validateSend } from "@/lib/sends";
import type { IdCtx } from "@/lib/params";

const Body = z.object({ accepted: z.boolean(), contentHash: z.string().length(64) });

export const POST = route<IdCtx>(async (req, ctx) => {
  const { user } = await requireSession();
  const { id } = await ctx.params;
  const { accepted, contentHash } = await readJson(req, Body);
  await validateSend(user, id, accepted, contentHash, clientIp(req));
  return json({ ok: true });
});
