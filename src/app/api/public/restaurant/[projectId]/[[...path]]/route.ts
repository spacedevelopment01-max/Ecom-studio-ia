/**
 * API publique du service réel de réservation (thème TABLE SAISON, issue #175), appelée par le site du restaurant.
 *
 *   GET  …/availability?date=AAAA-MM-JJ&party=2         créneaux disponibles
 *   POST …/reservations                                  réserver (clé d'envoi « idem » contre les doubles clics)
 *   POST …/reservations/lookup                           recherche par e-mail : réponse toujours neutre
 *   GET  …/reservations/<numéro>                         détail (en-tête X-Reservation-Token obligatoire)
 *   POST …/reservations/<numéro>/modify | /cancel        modification (disponibilité revérifiée) ou annulation
 *   POST …/requests                                      demande de groupe ou message (enregistrée)
 *
 * Aucun cookie, aucune session : l'accès à une réservation passe par son jeton secret. Ouvert seulement si le restaurant
 * a activé le service réel dans son thème ; débit limité par adresse IP.
 */
import { BookingError, availability, cancelReservation, createReservation, liveRestaurant, lookupByEmail, modifyReservation, publicView, reservationByToken, saveRequest, sendConfirmation } from "@/lib/restaurant/booking";
import { clientIp, rateCount, rateHit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, X-Reservation-Token", "Access-Control-Max-Age": "600" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...CORS } });
type Ctx = { params: Promise<{ projectId: string; path?: string[] }> };

function limited(req: Request, projectId: string, action: string, max: number, windowMs = 10 * 60_000) {
  const key = `restaurant:${action}:${projectId}:${clientIp(req) ?? "?"}`;
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
  console.error("[restaurant]", e);
  return json({ error: "server" }, 500);
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function GET(req: Request, ctx: Ctx) {
  const { projectId, path = [] } = await ctx.params;
  try {
    const url = new URL(req.url);
    if (path.length === 1 && path[0] === "availability") {
      if (limited(req, projectId, "availability", 300)) return json({ error: "rate" }, 429);
      return json(availability(projectId, url.searchParams.get("date") ?? "", Number(url.searchParams.get("party") ?? 2)));
    }
    if (path.length === 2 && path[0] === "reservations") {
      liveRestaurant(projectId);
      if (limited(req, projectId, "read", 60)) return json({ error: "rate" }, 429);
      return json({ reservation: publicView(reservationByToken(projectId, path[1], req.headers.get("x-reservation-token") ?? "")) });
    }
    return json({ error: "not_found" }, 404);
  } catch (e) { return fail(e); }
}

export async function POST(req: Request, ctx: Ctx) {
  const { projectId, path = [] } = await ctx.params;
  try {
    const b = await body(req);
    if (path.length === 1 && path[0] === "reservations") {
      const r = liveRestaurant(projectId);
      if (limited(req, projectId, "create", 20)) return json({ error: "rate" }, 429);
      const out = createReservation(projectId, { party: Number(b.party), date: String(b.date ?? ""), time: String(b.time ?? ""), firstName: String(b.firstName ?? ""), lastName: String(b.lastName ?? ""), email: String(b.email ?? ""), phone: String(b.phone ?? ""), note: String(b.note ?? ""), newsletter: b.newsletter === true, terms: b.terms === true, idem: String(b.idem ?? "") });
      // Le jeton n'est rendu qu'à la création (jamais pour un renvoi du même formulaire) ; l'e-mail est envoyé une fois.
      const email = out.duplicate || !out.token ? "unchanged" : await sendConfirmation(r, out.reservation, out.token);
      return json({ reservation: publicView(out.reservation), token: out.token, duplicate: out.duplicate, email }, out.duplicate ? 200 : 201);
    }
    if (path.length === 2 && path[0] === "reservations" && path[1] === "lookup") {
      if (limited(req, projectId, "lookup", 8)) return json({ error: "rate" }, 429);
      await lookupByEmail(projectId, String(b.email ?? ""));
      return json({ ok: true });
    }
    if (path.length === 3 && path[0] === "reservations" && (path[2] === "modify" || path[2] === "cancel")) {
      if (limited(req, projectId, "change", 30)) return json({ error: "rate" }, 429);
      const token = req.headers.get("x-reservation-token") ?? "";
      const res = path[2] === "cancel" ? cancelReservation(projectId, path[1], token) : modifyReservation(projectId, path[1], token, { party: b.party === undefined ? undefined : Number(b.party), date: b.date === undefined ? undefined : String(b.date), time: b.time === undefined ? undefined : String(b.time), note: b.note === undefined ? undefined : String(b.note) });
      return json({ reservation: publicView(res) });
    }
    if (path.length === 1 && path[0] === "requests") {
      if (limited(req, projectId, "request", 10)) return json({ error: "rate" }, 429);
      const kind = b.kind === "group" ? "group" : "contact";
      const out = await saveRequest(projectId, kind, b);
      return json({ ok: true, id: out.id, forwarded: out.forwarded }, 201);
    }
    return json({ error: "not_found" }, 404);
  } catch (e) { return fail(e); }
}
