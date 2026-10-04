import { z } from "zod";
import { startSession, verifyLogin } from "@/lib/auth";
import { body, fail, handle, ok } from "@/lib/http";
import { L, setUserLang, uiLang } from "@/lib/i18n-server";

const attempts = new Map<string, { n: number; at: number }>();

export const POST = handle(async (req: Request) => {
  const b = await body(req, z.object({ email: z.string(), password: z.string() }));
  const key = b.email.toLowerCase();
  const a = attempts.get(key);
  if (a && a.n >= 8 && Date.now() - a.at < 10 * 60_000) return fail(429, L("Trop de tentatives. Réessayez dans quelques minutes.", "Too many attempts. Please try again in a few minutes."));
  const u = await verifyLogin(b.email, b.password);
  if (!u) {
    attempts.set(key, { n: (a?.n ?? 0) + 1, at: Date.now() });
    return fail(401, L("Adresse e-mail ou mot de passe incorrect.", "Incorrect email address or password."));
  }
  attempts.delete(key);
  // Mémorise la langue de l'interface sur le compte (tâches en arrière-plan, notifications, e-mails).
  setUserLang(u.id, uiLang());
  await startSession(u.id);
  return ok({ user: { id: u.id, email: u.email, role: u.role } });
});
