import { z } from "zod";
import { cookies } from "next/headers";
import { requireUser, SESSION_COOKIE } from "@/lib/auth";
import { body, fail, handle, ok } from "@/lib/http";
import { changePassword } from "@/lib/password";
import { L } from "@/lib/i18n-server";
import { LIMITS, rateCount, rateHit } from "@/lib/rate-limit";
import { HttpError } from "@/lib/auth";

/** Changer son mot de passe (Mon compte) : ancien + nouveau. Les autres appareils sont déconnectés. */
export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  const b = await body(req, z.object({ current: z.string().max(200), next: z.string().max(200) }));
  const key = `password:user:${user.id}`;
  if (rateCount(key, LIMITS.passwordChangePerUser.windowMs) >= LIMITS.passwordChangePerUser.max) {
    return fail(429, L("Trop de tentatives. Réessayez dans quelques minutes.", "Too many attempts. Please try again in a few minutes."));
  }
  try {
    await changePassword(user, b.current, b.next, (await cookies()).get(SESSION_COOKIE)?.value);
  } catch (e) {
    if (e instanceof HttpError && e.code === "bad_password") rateHit(key);
    throw e;
  }
  return ok({ ok: true });
});
