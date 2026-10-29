import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { HttpError } from "@/lib/auth";
import { L } from "@/lib/i18n-server";
import { clientIp, rateTake } from "@/lib/rate-limit";
import { confirmRecipient } from "@/lib/sites/notify";

/** Confirmation d'une adresse de notification des demandes d'un site (#232) ; aucune session requise. */
export const POST = handle(async (req: Request) => {
  const ip = clientIp(req);
  if (ip && !rateTake([{ key: `site-notify-confirm:${ip}`, max: 20, windowMs: 600_000 }])) throw new HttpError(429, "Trop de demandes / Too many requests");
  const b = await body(req, z.object({ token: z.string().max(100) }));
  const r = confirmRecipient(b.token);
  if (!r) throw new HttpError(400, L("Ce lien est expiré ou a déjà été utilisé.", "This link has expired or was already used."), "invalid_token");
  return ok(r);
});
