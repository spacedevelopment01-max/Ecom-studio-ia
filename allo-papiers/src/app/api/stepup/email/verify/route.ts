import { z } from "zod";
import { json, readJson, route } from "@/lib/http";
import { requireSession } from "@/lib/auth";
import { verifyEmailStepUp } from "@/lib/stepup";
import { rateLimit } from "@/lib/rate-limit";

const Body = z.object({ code: z.string().trim().max(10), recoveryCode: z.string().trim().max(20).optional() });

export const POST = route(async (req) => {
  const { user, session } = await requireSession({ allowLocked: true });
  await rateLimit(`stepupcode:${session.id}`, 10, 900);
  const { code, recoveryCode } = await readJson(req, Body);
  await verifyEmailStepUp(user, session, code, recoveryCode || undefined);
  return json({ ok: true });
});
