import { z } from "zod";
import { startSession, verifyLogin } from "@/lib/auth";
import { body, fail, handle, ok } from "@/lib/http";

const attempts = new Map<string, { n: number; at: number }>();

export const POST = handle(async (req: Request) => {
  const b = await body(req, z.object({ email: z.string(), password: z.string() }));
  const key = b.email.toLowerCase();
  const a = attempts.get(key);
  if (a && a.n >= 8 && Date.now() - a.at < 10 * 60_000) return fail(429, "Trop de tentatives. Réessayez dans quelques minutes.");
  const u = await verifyLogin(b.email, b.password);
  if (!u) {
    attempts.set(key, { n: (a?.n ?? 0) + 1, at: Date.now() });
    return fail(401, "Adresse e-mail ou mot de passe incorrect.");
  }
  attempts.delete(key);
  await startSession(u.id);
  return ok({ user: { id: u.id, email: u.email, role: u.role } });
});
