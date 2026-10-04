import { z } from "zod";
import { clientIp, json, readJson, route } from "@/lib/http";
import { createMagicLink, normalizeEmail } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { keyedHash } from "@/lib/crypto";

const Body = z.object({ email: z.string().trim().email().max(200), terms: z.boolean() });

export const POST = route(async (req) => {
  const { email: raw, terms } = await readJson(req, Body);
  const email = normalizeEmail(raw);
  const ip = clientIp(req);
  await rateLimit(`magic:ip:${keyedHash(ip).slice(0, 16)}`, 10, 3600);
  await rateLimit(`magic:email:${keyedHash(email).slice(0, 16)}`, 5, 3600);
  await createMagicLink(email, ip, terms);
  // Même réponse que le compte existe ou non (pas de divulgation des adresses inscrites).
  return json({ ok: true, message: "Si l'adresse est valide, un lien de connexion vient d'être envoyé. Pensez à regarder dans les courriers indésirables." });
});
