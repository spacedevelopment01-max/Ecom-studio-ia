/**
 * API publique du service réel de rendez-vous (thème ATELIER NUANCE, issue #177), appelée par le site du salon.
 *
 *   GET  …/availability?date=&service=&staff=&length=[&except=]   créneaux d'une date
 *   GET  …/month?month=AAAA-MM&service=&staff=&length=[&except=]  statut des dates d'un mois (calendrier)
 *   POST …/appointments                                           réserver (clé d'envoi « idem » contre les doubles clics)
 *   POST …/lookup  { reference, email }                           retrouver : réponse toujours neutre, lien par e-mail
 *   POST …/login   { email }  |  …/register { email, firstName }  espace client : réponse neutre, lien par e-mail
 *   GET  …/me      (X-Client-Token)                               rendez-vous et informations accessibles
 *   POST …/me      (X-Client-Token, accès client)                 informations et préférences
 *   POST …/appointments/<référence>/move | /cancel                déplacement (transaction) ou annulation
 *   POST …/logout  (X-Client-Token)                               fin de l'accès
 *   POST …/requests                                               message du formulaire de contact (enregistré)
 *
 * Aucun cookie, aucune session : l'accès passe par un jeton secret à durée limitée. Ouvert seulement si le salon a
 * activé le service réel dans son thème ; débit limité par adresse IP.
 */
import { BookingError, availability, cancelAppointment, createAppointment, liveSalon, login, logout, lookup, me, monthAvailability, moveAppointment, publicView, register, saveRequest, sendConfirmation, tokenOf, updateMe } from "@/lib/salon/booking";
import { one } from "@/lib/db";
import { clientIp, rateTake } from "@/lib/rate-limit";

export const runtime = "nodejs";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, X-Client-Token", "Access-Control-Max-Age": "600" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...CORS } });
type Ctx = { params: Promise<{ projectId: string; path?: string[] }> };

function limited(req: Request, projectId: string, action: string, max: number, windowMs = 10 * 60_000) {
  const key = `salon:${action}:${projectId}:${clientIp(req) ?? "?"}`;
  // Lecture et enregistrement dans une seule transaction (lot 9) : des requêtes parallèles ne dépassent pas le plafond.
  return !rateTake([{ key, max, windowMs }]);
}

async function body(req: Request): Promise<Record<string, unknown>> {
  const text = await req.text();
  if (text.length > 20_000) throw new BookingError("too_large", 413);
  try { const v = JSON.parse(text || "{}"); return v && typeof v === "object" ? v : {}; } catch { throw new BookingError("invalid", 400); }
}

function fail(e: unknown) {
  if (e instanceof BookingError) return json({ error: e.code, ...e.details }, e.status);
  console.error("[salon]", e);
  return json({ error: "server" }, 500);
}

const token = (req: Request) => req.headers.get("x-client-token") ?? "";
/** « except » (déplacement) : uniquement un rendez-vous accessible avec le jeton présenté. */
function exceptId(req: Request, projectId: string, number: string | null) {
  if (!number) return undefined;
  const t = tokenOf(projectId, token(req));
  const a = one<{ id: string; client_id: string }>("SELECT id, client_id FROM salon_appointments WHERE project_id = ? AND number = ?", projectId, number.toUpperCase());
  if (!a || (t.scope === "client" ? a.client_id !== t.client_id : a.id !== t.appt_id)) throw new BookingError("not_found", 404);
  return a.id;
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function GET(req: Request, ctx: Ctx) {
  const { projectId, path = [] } = await ctx.params;
  try {
    const url = new URL(req.url), q = url.searchParams;
    const slot = { service: q.get("service") ?? "", staff: q.get("staff") ?? "any", length: q.get("length") ?? "" };
    if (path.length === 1 && path[0] === "availability") {
      liveSalon(projectId);
      if (limited(req, projectId, "availability", 400)) return json({ error: "rate" }, 429);
      return json(availability(projectId, { ...slot, date: q.get("date") ?? "", exceptId: exceptId(req, projectId, q.get("except")) }));
    }
    if (path.length === 1 && path[0] === "month") {
      liveSalon(projectId);
      if (limited(req, projectId, "month", 200)) return json({ error: "rate" }, 429);
      return json(monthAvailability(projectId, { ...slot, month: q.get("month") ?? "", exceptId: exceptId(req, projectId, q.get("except")) }));
    }
    if (path.length === 1 && path[0] === "me") {
      liveSalon(projectId);
      if (limited(req, projectId, "me", 120)) return json({ error: "rate" }, 429);
      return json(me(projectId, token(req)));
    }
    return json({ error: "not_found" }, 404);
  } catch (e) { return fail(e); }
}

export async function POST(req: Request, ctx: Ctx) {
  const { projectId, path = [] } = await ctx.params;
  try {
    const b = await body(req);
    const s = (k: string) => String(b[k] ?? "");
    if (path.length === 1 && path[0] === "appointments") {
      const r = liveSalon(projectId);
      if (limited(req, projectId, "create", 20)) return json({ error: "rate" }, 429);
      const out = createAppointment(projectId, { service: s("service"), length: s("length"), staff: s("staff"), date: s("date"), time: s("time"), firstName: s("firstName"), lastName: s("lastName"), email: s("email"), phone: s("phone"), note: s("note"), newsletter: b.newsletter === true, terms: b.terms === true, idem: s("idem") });
      // L'accès n'est rendu qu'à la création (jamais pour un renvoi du même formulaire) ; l'e-mail part une fois.
      const email = out.duplicate || !out.clientToken ? "unchanged" : await sendConfirmation(r, out.appointment, out.clientToken);
      return json({ appointment: publicView(out.appointment), clientToken: out.clientToken, duplicate: out.duplicate, email }, out.duplicate ? 200 : 201);
    }
    if (path.length === 1 && (path[0] === "lookup" || path[0] === "login" || path[0] === "register")) {
      liveSalon(projectId);
      if (limited(req, projectId, "access", 8)) return json({ error: "rate" }, 429);
      if (path[0] === "lookup") await lookup(projectId, s("reference"), s("email"));
      else if (path[0] === "login") await login(projectId, s("email"));
      else await register(projectId, s("email"), s("firstName"));
      return json({ ok: true });
    }
    if (path.length === 1 && path[0] === "me") {
      liveSalon(projectId);
      if (limited(req, projectId, "me-update", 30)) return json({ error: "rate" }, 429);
      return json({ client: updateMe(projectId, token(req), { firstName: b.firstName === undefined ? undefined : s("firstName"), lastName: b.lastName === undefined ? undefined : s("lastName"), phone: b.phone === undefined ? undefined : s("phone"), prefs: b.prefs && typeof b.prefs === "object" ? b.prefs as Record<string, unknown> : undefined }) });
    }
    if (path.length === 1 && path[0] === "logout") {
      logout(projectId, token(req));
      return json({ ok: true });
    }
    if (path.length === 3 && path[0] === "appointments" && (path[2] === "move" || path[2] === "cancel")) {
      liveSalon(projectId);
      if (limited(req, projectId, "change", 30)) return json({ error: "rate" }, 429);
      const appointment = path[2] === "cancel" ? cancelAppointment(projectId, token(req), path[1]) : moveAppointment(projectId, token(req), path[1], { date: s("date"), time: s("time") });
      return json({ appointment });
    }
    if (path.length === 1 && path[0] === "requests") {
      liveSalon(projectId);
      if (limited(req, projectId, "request", 10)) return json({ error: "rate" }, 429);
      const out = await saveRequest(projectId, b);
      return json({ ok: true, id: out.id, forwarded: out.forwarded }, 201);
    }
    return json({ error: "not_found" }, 404);
  } catch (e) { return fail(e); }
}
