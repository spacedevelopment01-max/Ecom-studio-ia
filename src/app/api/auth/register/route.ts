import { z } from "zod";
import { body, fail, handle, ok, safeInternalPath } from "@/lib/http";
import { L, uiLang } from "@/lib/i18n-server";
import { clientIp, LIMITS, rateTake } from "@/lib/rate-limit";
import { mailConfigured } from "@/lib/mail";
import { requestRegistration } from "@/lib/registration";

export const POST = handle(async (req: Request) => {
  const b = await body(req, z.object({ email: z.string().trim().toLowerCase().email().max(200), password: z.string().min(8).max(200), name: z.string().max(200).optional(), next: z.string().max(500).optional() }));
  const ip = clientIp(req);
  const limits = [
    { key: `register:email:${b.email}`, max: 3, windowMs: 3600_000 },
    ...(ip ? [{ key: `register:ip:${ip}`, ...LIMITS.registerPerIpHour }, { key: `register:ip:${ip}`, ...LIMITS.registerPerIpDay }] : []),
  ];
  if (!rateTake(limits)) return fail(429, L("Trop de demandes. Réessayez plus tard.", "Too many requests. Please try again later."));
  if (!mailConfigured()) return fail(503, L("La confirmation par e-mail n’est pas disponible. Contactez l’assistance pour créer votre compte.", "Email confirmation is unavailable. Contact support to create your account."), "mail_unavailable");
  await requestRegistration({ email: b.email, password: b.password, name: b.name ?? "", lang: uiLang(), next: safeInternalPath(b.next) });
  return ok({ ok: true, confirmationRequired: true, message: L("Si cette adresse peut être inscrite, l’envoi d’un lien de confirmation valable une heure a été demandé. Vérifiez votre boîte et les indésirables ; si vous avez déjà un compte, connectez-vous.", "If this address can be registered, sending a confirmation link valid for one hour has been requested. Check your inbox and spam; if you already have an account, sign in.") });
});
