import { z } from "zod";
import { createUser, startSession } from "@/lib/auth";
import { body, handle, ok } from "@/lib/http";
import { setUserLang, uiLang } from "@/lib/i18n-server";

export const POST = handle(async (req: Request) => {
  const b = await body(req, z.object({ email: z.string(), password: z.string(), name: z.string().optional() }));
  const u = await createUser(b.email, b.password, b.name ?? "");
  // Mémorise la langue de l'interface sur le compte (tâches en arrière-plan, notifications, e-mails).
  setUserLang(u.id, uiLang());
  await startSession(u.id);
  return ok({ user: { id: u.id, email: u.email, role: u.role } });
});
