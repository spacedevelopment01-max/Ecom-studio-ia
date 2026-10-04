import { z } from "zod";
import { json, readJson, route } from "@/lib/http";
import { requireSession } from "@/lib/auth";
import { verifyPasskeyStepUp } from "@/lib/stepup";
import { rateLimit } from "@/lib/rate-limit";

const Body = z.object({ response: z.any() });

export const POST = route(async (req) => {
  const { user, session } = await requireSession({ allowLocked: true });
  await rateLimit(`stepup:${session.id}`, 20, 900);
  const { response } = await readJson(req, Body);
  await verifyPasskeyStepUp(user, session, response);
  return json({ ok: true });
});
