import { z } from "zod";
import { body, handle, ok, safeInternalPath } from "@/lib/http";
import { startSession, HttpError } from "@/lib/auth";
import { requestAdminClaim } from "@/lib/admin-claim";
import { confirmRegistration } from "@/lib/registration";
import { clientIp, rateTake } from "@/lib/rate-limit";

export const POST = handle(async (req: Request) => {
  const ip = clientIp(req);
  if (ip && !rateTake([{ key: `registration-confirm:${ip}`, max: 20, windowMs: 600000 }])) throw new HttpError(429, "Trop de demandes / Too many requests");
  const b = await body(req, z.object({ token: z.string().max(100), password: z.string().min(8).max(200) }));
  const { user, next } = await confirmRegistration(b.token, b.password);
  await startSession(user.id);
  requestAdminClaim(user);
  return ok({ ok: true, next: safeInternalPath(next) });
});
