/**
 * Rubrique « Rendez-vous » (mission #190) : planning et règles du service de réservation du projet ; liaison des
 * boutons du site au service réel ; réservation saisie par le professionnel, déplacement, annulation. Propriétaire du
 * projet seulement ; mêmes contrôles de créneau et même protection contre les doubles réservations que le site.
 */
import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { HttpError } from "@/lib/auth";
import { L } from "@/lib/i18n-server";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { proCancel, proCreate, proMove, rdvOverview, setRdvLive } from "@/lib/rendez-vous";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const day = (v: string | null, fallback: number) => (v && DATE.test(v) ? v : new Date(Date.now() + fallback * 86400000).toISOString().slice(0, 10));

export const GET = handle(async (req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  const u = new URL(req.url);
  return ok(rdvOverview(p.id, day(u.searchParams.get("du"), -7), day(u.searchParams.get("au"), 60)));
});

const Time = z.string().regex(/^\d{2}:\d{2}$/);
const Date_ = z.string().regex(DATE);
const Schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("live"), live: z.boolean() }),
  z.object({ action: z.literal("cancel"), number: z.string().max(40) }),
  z.object({ action: z.literal("move"), number: z.string().max(40), date: Date_, time: Time, staff: z.string().max(64).optional(), party: z.number().int().min(1).max(60).optional() }),
  z.object({ action: z.literal("create"), service: z.string().max(64).optional(), staff: z.string().max(64).optional(), modality: z.string().max(20).optional(), date: Date_, time: Time, party: z.number().int().min(1).max(60).optional(), firstName: z.string().min(1).max(80), lastName: z.string().min(1).max(80), email: z.string().email().max(160), phone: z.string().max(40).optional(), note: z.string().max(600).optional() }),
]);

export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  const b = await body(req, Schema);
  if (b.action === "live") return ok(setRdvLive(p.id, b.live));
  const view = rdvOverview(p.id, day(null, -1), day(null, 1));
  if (!view.kind) throw new HttpError(404, L("Ce thème ne prend pas de rendez-vous.", "This theme doesn't take bookings."));
  if (view.mode !== "live") throw new HttpError(409, L("Activez d'abord les réservations réelles.", "Enable real bookings first."), "not_live");
  try {
    if (b.action === "cancel") return ok({ booking: proCancel(p.id, view.kind, b.number) });
    if (b.action === "move") return ok({ booking: proMove(p.id, view.kind, b.number, { date: b.date, time: b.time, staff: b.staff, party: b.party }) });
    return ok({ number: proCreate(p.id, view.kind, b) });
  } catch (e) {
    const code = (e as { code?: string }).code ?? "";
    const status = (e as { status?: number }).status ?? 400;
    const msg: Record<string, [string, string]> = {
      unavailable: ["Ce créneau n'est pas disponible (déjà pris, fermé ou hors des horaires). Rien n'a été changé.", "This slot isn't available (already taken, closed or outside hours). Nothing was changed."],
      duplicate: ["Ce client a déjà une réservation à ce moment-là.", "This customer already has a booking at that time."],
      full: ["Cet atelier est complet.", "This workshop is full."],
      not_found: ["Réservation introuvable.", "Booking not found."],
      canceled: ["Cette réservation est déjà annulée.", "This booking is already canceled."],
      not_movable: ["Une place d'atelier ne se déplace pas : annulez-la puis réservez un autre atelier.", "A workshop seat can't be moved: cancel it, then book another workshop."],
      invalid: ["Informations incomplètes ou créneau invalide.", "Incomplete information or invalid slot."],
    };
    if (msg[code]) throw new HttpError(status >= 400 && status < 500 ? status : 409, L(msg[code][0], msg[code][1]), code);
    throw e;
  }
});
