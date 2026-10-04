import { z } from "zod";
import { clientIp, HttpError, json, readJson, route } from "@/lib/http";
import { consumeMagicLink, setSessionCookie } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { keyedHash } from "@/lib/crypto";

const Body = z.object({ token: z.string().min(20).max(200) });

export const POST = route(async (req) => {
  const { token } = await readJson(req, Body);
  const ip = clientIp(req);
  await rateLimit(`verify:ip:${keyedHash(ip).slice(0, 16)}`, 30, 3600);
  const result = await consumeMagicLink(token, req.headers.get("user-agent"), ip);
  if (!result) throw new HttpError(400, "lien_invalide", "Ce lien a expiré ou a déjà été utilisé. Demandez un nouveau lien.");
  if ("error" in result) throw new HttpError(400, "conditions", "Pour créer un compte, acceptez les conditions d'utilisation puis demandez un nouveau lien.");
  await setSessionCookie(result.sessionToken);
  return json({ ok: true, nouveauCompte: result.created });
});
