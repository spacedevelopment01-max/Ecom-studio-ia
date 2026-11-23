import { clientIp, rateTake } from "@/lib/rate-limit";
import { confirmerRetractation } from "@/lib/sites/retractation";

export const runtime = "nodejs";

/** « Confirmer la rétractation » : enregistre la déclaration, envoie l'accusé daté, puis montre la confirmation. */
export async function POST(req: Request, ctx: { params: Promise<{ pid: string }> }) {
  const { pid } = await ctx.params;
  const back = (q: string) => new Response(null, { status: 303, headers: { location: `/renoncer/${encodeURIComponent(pid)}?${q}` } });
  const form = await req.formData().catch(() => null);
  if (!form) return back(`erreur=${encodeURIComponent("Formulaire illisible.")}`);
  if (String(form.get("site_web") ?? "")) return back("recu=0");
  if (!rateTake([{ key: `renoncer:${clientIp(req)}`, max: 10, windowMs: 3600_000 }, { key: `renoncer:p:${pid}`, max: 200, windowMs: 3600_000 }])) return back(`erreur=${encodeURIComponent("Trop d'envois : réessayez dans une heure.")}`);
  const r = await confirmerRetractation(pid, { nom: String(form.get("nom") ?? ""), commande: String(form.get("commande") ?? ""), email: String(form.get("email") ?? "") });
  return r.ok ? back(`recu=${r.at}&accuse=${r.accuse ? 1 : 0}`) : back(`erreur=${encodeURIComponent(r.erreur)}`);
}
