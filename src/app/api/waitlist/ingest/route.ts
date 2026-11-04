import { z } from "zod";
import { boundedBody, handle, ok } from "@/lib/http";
import { HttpError } from "@/lib/auth";
import { clientIp, rateTake } from "@/lib/rate-limit";
import { importSignups, ingestSecret, ingestSignup, kickWaitlistOutbox, readSignup, verifySignature } from "@/lib/waitlist";

export const runtime = "nodejs";

/**
 * Réception des inscriptions de la liste d'attente (#420), appelée par le SERVEUR du site de la liste d'attente,
 * jamais par un navigateur : la requête est signée avec le secret partagé (en-tête `X-Waitlist-Signature`,
 * HMAC-SHA256 de « t.corps », 5 minutes de validité). Sans signature valide : 401, rien n'est lu ni enregistré.
 * La réponse ne renvoie jamais les coordonnées reçues.
 */
const Body = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("signup"), signup: z.record(z.string(), z.unknown()) }),
  // Reprise des inscriptions déjà reçues par le site : enregistrées sans aucun e-mail (aucun envoi rétroactif).
  z.object({ kind: z.literal("import"), signups: z.array(z.record(z.string(), z.unknown())).min(1).max(5000) }),
]);

export const POST = handle(async (req: Request) => {
  const ip = clientIp(req);
  if (ip && !rateTake([{ key: `waitlist-ingest:${ip}`, max: 120, windowMs: 60_000 }])) throw new HttpError(429, "Trop de demandes.");
  if (!ingestSecret()) throw new HttpError(503, "Raccordement de la liste d'attente non configuré.", "waitlist_not_configured");
  const raw = Buffer.from(await boundedBody(req, 4 * 1048576)).toString("utf8");
  if (!verifySignature(raw, req.headers.get("x-waitlist-signature"))) throw new HttpError(401, "Signature invalide.", "waitlist_signature");
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new HttpError(400, "Corps JSON invalide."); }
  const b = Body.parse(parsed);
  if (b.kind === "import") return ok({ ok: true, ...importSignups(b.signups) });
  let input;
  try { input = readSignup(b.signup); } catch (e) { throw new HttpError(422, (e as Error).message, "waitlist_invalid"); }
  const r = ingestSignup(input);
  // Notification lancée sans attendre : une panne SMTP ne change ni la réponse ni l'enregistrement.
  if (r.status === "created") kickWaitlistOutbox();
  return ok({ ok: true, status: r.status, id: r.id }, { status: r.status === "created" ? 201 : 200 });
});
