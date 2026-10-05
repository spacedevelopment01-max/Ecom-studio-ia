import { z } from "zod";
import { body, fail, handle, ok } from "@/lib/http";
import { L } from "@/lib/i18n-server";
import { resetPassword } from "@/lib/password";
import { clientIp, LIMITS, rateCount, rateHit } from "@/lib/rate-limit";

/** Nouveau mot de passe à partir d'un lien (usage unique, 1 heure) ; toutes les sessions du compte sont fermées. */
export const POST = handle(async (req: Request) => {
  const b = await body(req, z.object({ token: z.string().max(100), password: z.string().max(200) }));
  const ip = clientIp(req);
  const key = ip ? `reset:ip:${ip}` : null;
  if (key && rateCount(key, LIMITS.resetPerIp.windowMs) >= LIMITS.resetPerIp.max) {
    return fail(429, L("Trop de tentatives. Réessayez dans quelques minutes.", "Too many attempts. Please try again in a few minutes."));
  }
  if (key) rateHit(key);
  await resetPassword(b.token, b.password);
  return ok({ ok: true });
});
