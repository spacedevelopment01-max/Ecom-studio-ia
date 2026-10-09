import { z } from "zod";
import { startSession, verifyLogin } from "@/lib/auth";
import { requestAdminClaim } from "@/lib/admin-claim";
import { body, fail, handle, ok } from "@/lib/http";
import { L, setUserLang, uiLang } from "@/lib/i18n-server";
import { clientIp, LIMITS, rateClear, rateCount, rateHit } from "@/lib/rate-limit";

export const POST = handle(async (req: Request) => {
  const b = await body(req, z.object({ email: z.string(), password: z.string() }));
  // Même normalisation que verifyLogin : des espaces ou des majuscules ne remettent pas le compteur à zéro.
  const emailKey = `login:email:${b.email.trim().toLowerCase()}`;
  const ip = clientIp(req);
  const ipKey = ip ? `login:ip:${ip}` : null;
  if (rateCount(emailKey, LIMITS.loginPerEmail.windowMs) >= LIMITS.loginPerEmail.max || (ipKey && rateCount(ipKey, LIMITS.loginPerIp.windowMs) >= LIMITS.loginPerIp.max)) {
    return fail(429, L("Trop de tentatives. Réessayez dans quelques minutes.", "Too many attempts. Please try again in a few minutes."));
  }
  const u = await verifyLogin(b.email, b.password);
  if (!u) {
    rateHit(emailKey);
    if (ipKey) rateHit(ipKey);
    return fail(401, L("Adresse e-mail ou mot de passe incorrect.", "Incorrect email address or password."));
  }
  rateClear(emailKey);
  // Mémorise la langue de l'interface sur le compte (tâches en arrière-plan, notifications, e-mails).
  setUserLang(u.id, uiLang());
  await startSession(u.id);
  requestAdminClaim(u);
  return ok({ user: { id: u.id, email: u.email, role: u.role } });
});
