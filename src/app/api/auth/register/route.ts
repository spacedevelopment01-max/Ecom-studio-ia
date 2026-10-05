import { z } from "zod";
import { createUser, startSession } from "@/lib/auth";
import { body, fail, handle, ok } from "@/lib/http";
import { L, setUserLang, uiLang } from "@/lib/i18n-server";
import { clientIp, LIMITS, rateCount, rateHit } from "@/lib/rate-limit";

export const POST = handle(async (req: Request) => {
  const b = await body(req, z.object({ email: z.string(), password: z.string(), name: z.string().optional() }));
  // Chaque compte reçoit la découverte gratuite (budget IA) : nombre de comptes limité par adresse IP,
  // par heure et par jour (il n'existe pas encore de vérification de l'adresse e-mail).
  const ip = clientIp(req);
  const key = ip ? `register:ip:${ip}` : null;
  if (key && (rateCount(key, LIMITS.registerPerIpHour.windowMs) >= LIMITS.registerPerIpHour.max || rateCount(key, LIMITS.registerPerIpDay.windowMs) >= LIMITS.registerPerIpDay.max)) {
    return fail(429, L("Trop de comptes créés depuis cette connexion. Réessayez plus tard.", "Too many accounts created from this connection. Please try again later."));
  }
  const u = await createUser(b.email, b.password, b.name ?? "");
  if (key) rateHit(key);
  // Mémorise la langue de l'interface sur le compte (tâches en arrière-plan, notifications, e-mails).
  setUserLang(u.id, uiLang());
  await startSession(u.id);
  return ok({ user: { id: u.id, email: u.email, role: u.role } });
});
