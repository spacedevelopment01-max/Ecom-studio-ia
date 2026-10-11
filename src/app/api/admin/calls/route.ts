import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { adminCalls, deleteSlot, markDone, openSlots, setDominerCallPrice, setSlotBlocked } from "@/lib/appointments";

/** Administration de l'accompagnement : créneaux, rendez-vous, heures offertes utilisées, tarif DOMINER. */
export const GET = handle(async () => {
  await requireAdmin();
  return ok(adminCalls());
});

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("open"), from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), weekdays: z.array(z.number().int().min(0).max(6)).min(1), hours: z.array(z.string().regex(/^\d{1,2}:\d{2}$/)).min(1).max(24) }),
  z.object({ action: z.literal("block"), slotId: z.string() }),
  z.object({ action: z.literal("unblock"), slotId: z.string() }),
  z.object({ action: z.literal("delete"), slotId: z.string() }),
  z.object({ action: z.literal("done"), bookingId: z.string() }),
  z.object({ action: z.literal("price"), eur: z.number().min(0).max(1000).nullable() }),
]);

export const POST = handle(async (req: Request) => {
  await requireAdmin();
  const b = await body(req, Body);
  let opened = 0;
  if (b.action === "open") opened = openSlots(b);
  else if (b.action === "block" || b.action === "unblock") setSlotBlocked(b.slotId, b.action === "block");
  else if (b.action === "delete") deleteSlot(b.slotId);
  else if (b.action === "done") markDone(b.bookingId);
  else setDominerCallPrice(b.eur);
  return ok({ opened, ...adminCalls() });
});
