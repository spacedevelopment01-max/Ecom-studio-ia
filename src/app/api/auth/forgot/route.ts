import { z } from "zod";
import { one } from "@/lib/db";
import { body, fail, handle, ok } from "@/lib/http";
import { L, userLang } from "@/lib/i18n-server";
import { mailConfigured, sendMailInBackground } from "@/lib/mail";
import { createResetLink, resetMail } from "@/lib/password";
import { clientIp, LIMITS, rateCount, rateHit } from "@/lib/rate-limit";

/**
 * Mot de passe oublié : envoie un lien de réinitialisation (1 heure, usage unique) si l'adresse correspond à un compte.
 * La réponse est la même que l'adresse existe ou non (et l'envoi ne retarde pas la réponse). Fréquence limitée.
 * Sans envoi d'e-mails configuré : 503, l'écran renvoie vers la page contact.
 */
export const POST = handle(async (req: Request) => {
  const b = await body(req, z.object({ email: z.string().max(200) }));
  if (!mailConfigured()) return fail(503, L("L'envoi d'e-mails n'est pas encore disponible : écrivez-nous depuis la page contact.", "Sending emails isn't available yet: write to us from the contact page."), "mail_unavailable");
  const email = b.email.trim().toLowerCase();
  const ip = clientIp(req);
  const emailKey = `forgot:email:${email}`;
  const ipKey = ip ? `forgot:ip:${ip}` : null;
  const same = ok({ ok: true, message: L("Si un compte correspond à cette adresse, l’envoi d’un lien valable 1 heure a été demandé. Vérifiez votre boîte et les indésirables ; si rien n’arrive, contactez l’assistance.", "If an account matches this address, sending a link valid for one hour has been requested. Check your inbox and spam; if nothing arrives, contact support.") });
  if ((ipKey && rateCount(ipKey, LIMITS.forgotPerIp.windowMs) >= LIMITS.forgotPerIp.max)) {
    return fail(429, L("Trop de demandes. Réessayez dans une heure.", "Too many requests. Please try again in an hour."));
  }
  if (ipKey) rateHit(ipKey);
  // Limite par adresse : au-delà, rien n'est envoyé, mais la réponse reste la même (pas d'indice sur l'existence du compte).
  if (rateCount(emailKey, LIMITS.forgotPerEmail.windowMs) >= LIMITS.forgotPerEmail.max) return same;
  rateHit(emailKey);
  const u = one<{ id: string; email: string }>("SELECT id, email FROM users WHERE email = ?", email);
  if (u) {
    const { url } = createResetLink(u.id, "self");
    sendMailInBackground({ to: u.email, ...resetMail(userLang(u.id), url) }, "mail.reset");
  }
  return same;
});
