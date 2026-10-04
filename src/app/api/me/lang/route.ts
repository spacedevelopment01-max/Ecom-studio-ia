import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { currentUser } from "@/lib/auth";
import { setUserLang } from "@/lib/i18n-server";

/** Langue de l'interface choisie par la personne (mémorisée sur le compte pour les tâches et e-mails). */
export const POST = handle(async (req: Request) => {
  const b = await body(req, z.object({ lang: z.enum(["fr", "en"]) }));
  const u = await currentUser();
  if (u) setUserLang(u.id, b.lang);
  const res = ok({ lang: b.lang });
  res.cookies.set("ecs-lang", b.lang, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  return res;
});
