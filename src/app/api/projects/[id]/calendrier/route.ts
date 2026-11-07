/**
 * SINA (#492), étape 11 : calendrier de publication MANUEL du projet, en lecture seule.
 * ?format=ics : fichier d'agenda (rappel à l'heure prévue) ; ?format=txt : liste imprimable ; sinon la vue jour par jour.
 */
import { HttpError } from "@/lib/auth";
import { handle, ok } from "@/lib/http";
import { L } from "@/lib/i18n-server";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { calendarIcs, calendarText, calendarView, readCalendar } from "@/lib/syna-agent/calendar";

export const runtime = "nodejs";

export const GET = handle(async (req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  const cal = readCalendar(p.id);
  if (!cal) throw new HttpError(404, L("Aucun calendrier pour ce projet.", "No calendar for this project."));
  const view = calendarView(p, cal);
  const format = new URL(req.url).searchParams.get("format");
  const base = `calendrier-${cal.settings.startDate}`;
  if (format === "ics") return new Response(calendarIcs(p, view), { headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="${base}.ics"` } });
  if (format === "txt") return new Response(calendarText(p, view), { headers: { "Content-Type": "text/plain; charset=utf-8", "Content-Disposition": `attachment; filename="${base}.txt"` } });
  return ok(view);
});
