/**
 * API publique du service réel de rendez-vous (thème PARENTHÈSE), appelée par le site du cabinet.
 *
 *   GET  …/availability?date=&service=&modality=[&mine=1]      créneaux d'une date (mine : sans compter le rendez-vous du jeton)
 *   GET  …/month?month=AAAA-MM&service=&modality=[&mine=1]     statut des dates d'un mois (calendrier)
 *   GET  …/workshops                                           ateliers et places restantes
 *   POST …/appointments                                        réserver (clé d'envoi « idem » contre les doubles clics)
 *   POST …/lookup  { reference, email }                        retrouver : réponse toujours neutre, lien par e-mail
 *   GET  …/appointment              (X-Access-Token)           rendez-vous ouvert par le jeton
 *   POST …/appointment/move | /cancel | /note (X-Access-Token) modifier l'horaire, annuler, note personnelle
 *   POST …/requests { kind: contact | entreprise | newsletter } message enregistré
 *
 * Aucun cookie, aucune session : l'accès passe par un jeton secret à durée limitée. Ouvert seulement si le cabinet a
 * activé le service réel dans son thème ; débit limité par adresse IP.
 */
import { BookingError, appointmentFor, availability, cancelAppointment, createAppointment, liveCabinet, lookup, monthAvailability, moveAppointment, publicView, saveNote, saveRequest, sendConfirmation, tokenOf, workshops } from "@/lib/cabinet/booking";
import { clientIp, rateCount, rateHit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, X-Access-Token", "Access-Control-Max-Age": "600" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...CORS } });
type Ctx = { params: Promise<{ projectId: string; path?: string[] }> };

function limited(req: Request, projectId: string, action: string, max: number, windowMs = 10 * 60_000) {
  const key = `cabinet:${action}:${projectId}:${clientIp(req) ?? "?"}`;
  if (rateCount(key, windowMs) >= max) return true;
  rateHit(key);
  return false;
}

async function body(req: Request): Promise<Record<string, unknown>> {
  const text = await req.text();
  if (text.length > 20_000) throw new BookingError("too_large", 413);
  try { const v = JSON.parse(text || "{}"); return v && typeof v === "object" ? v : {}; } catch { throw new BookingError("invalid", 400); }
}

function fail(e: unknown) {
  if (e instanceof BookingError) return json({ error: e.code, ...e.details }, e.status);
  console.error("[cabinet]", e);
  return json({ error: "server" }, 500);
}

const token = (req: Request) => req.headers.get("x-access-token") ?? "";

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function GET(req: Request, ctx: Ctx) {
  const { projectId, path = [] } = await ctx.params;
  try {
    const q = new URL(req.url).searchParams;
    const route = path.join("/");
    // « mine » : le rendez-vous du jeton présenté n'occupe pas son propre créneau (modification d'horaire).
    const exceptId = q.get("mine") ? tokenOf(projectId, token(req)).appt_id : undefined;
    const slot = { service: q.get("service") ?? "", modality: q.get("modality") ?? "", exceptId };
    if (route === "availability") {
      liveCabinet(projectId);
      if (limited(req, projectId, "availability", 400)) return json({ error: "rate" }, 429);
      return json(availability(projectId, { ...slot, date: q.get("date") ?? "" }));
    }
    if (route === "month") {
      liveCabinet(projectId);
      if (limited(req, projectId, "month", 200)) return json({ error: "rate" }, 429);
      return json(monthAvailability(projectId, { ...slot, month: q.get("month") ?? "" }));
    }
    if (route === "workshops") {
      if (limited(req, projectId, "workshops", 200)) return json({ error: "rate" }, 429);
      return json(workshops(projectId));
    }
    if (route === "appointment") {
      liveCabinet(projectId);
      if (limited(req, projectId, "appointment", 120)) return json({ error: "rate" }, 429);
      return json(appointmentFor(projectId, token(req)));
    }
    return json({ error: "not_found" }, 404);
  } catch (e) { return fail(e); }
}

export async function POST(req: Request, ctx: Ctx) {
  const { projectId, path = [] } = await ctx.params;
  try {
    const b = await body(req);
    const s = (k: string) => String(b[k] ?? "");
    const route = path.join("/");
    if (route === "appointments") {
      const r = liveCabinet(projectId);
      if (limited(req, projectId, "create", 20)) return json({ error: "rate" }, 429);
      const out = createAppointment(projectId, { kind: s("kind"), service: s("service"), modality: s("modality"), date: s("date"), time: s("time"), firstName: s("firstName"), lastName: s("lastName"), email: s("email"), phone: s("phone"), note: s("note"), newsletter: b.newsletter === true, terms: b.terms === true, idem: s("idem") });
      // L'accès n'est rendu qu'à la création (jamais pour un renvoi du même formulaire) ; l'e-mail part une fois.
      const email = out.duplicate || !out.token ? "unchanged" : await sendConfirmation(r, out.appointment, out.token);
      return json({ appointment: publicView(out.appointment, r), token: out.token, duplicate: out.duplicate, email }, out.duplicate ? 200 : 201);
    }
    if (route === "lookup") {
      liveCabinet(projectId);
      if (limited(req, projectId, "lookup", 8)) return json({ error: "rate" }, 429);
      await lookup(projectId, s("reference"), s("email"));
      return json({ ok: true });
    }
    if (route === "appointment/move" || route === "appointment/cancel" || route === "appointment/note") {
      liveCabinet(projectId);
      if (limited(req, projectId, "change", 30)) return json({ error: "rate" }, 429);
      if (route === "appointment/note") return json(saveNote(projectId, token(req), s("note")));
      const appointment = route === "appointment/cancel" ? cancelAppointment(projectId, token(req)) : moveAppointment(projectId, token(req), { date: s("date"), time: s("time") });
      return json({ appointment });
    }
    if (route === "requests") {
      liveCabinet(projectId);
      if (limited(req, projectId, "request", 10)) return json({ error: "rate" }, 429);
      const { kind, ...rest } = b;
      const out = await saveRequest(projectId, String(kind ?? ""), rest);
      return json({ ok: true, id: out.id, forwarded: out.forwarded }, 201);
    }
    return json({ error: "not_found" }, 404);
  } catch (e) { return fail(e); }
}
