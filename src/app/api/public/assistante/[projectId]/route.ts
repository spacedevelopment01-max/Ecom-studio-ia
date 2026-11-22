/**
 * L'adresse publique de l'assistante du site (recherche 08, point 4). Éteinte (404) tant que le propriétaire n'a pas dit
 * oui (réglage `suivi.assistante`), tant que le projet n'a pas de forfait actif (aucun appel à l'IA sans abonnement) et
 * tant que son site n'est pas publié. Débit limité par adresse IP ; aucun cookie.
 */
import { one } from "@/lib/db";
import { clientIp, rateTake } from "@/lib/rate-limit";
import { projectPlan } from "@/lib/project-billing";
import { suiviAllume } from "@/lib/suivi/reglages";
import { repondreVisiteur } from "@/lib/suivi/assistante";

export const runtime = "nodejs";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "600" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...CORS } });

export function OPTIONS() { return new Response(null, { status: 204, headers: CORS }); }

export async function POST(req: Request, ctx: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await ctx.params;
  if (!suiviAllume("assistante")) return json({ error: "not_found" }, 404);
  const p = one<{ id: string; user_id: string; name: string }>("SELECT id, user_id, name FROM projects WHERE id=?", projectId);
  if (!p || !projectPlan(projectId) || !one("SELECT 1 FROM site_publications WHERE project_id=? LIMIT 1", projectId)) return json({ error: "not_found" }, 404);
  if (!rateTake([{ key: `assistante:${projectId}:${clientIp(req) ?? "?"}`, max: 20, windowMs: 10 * 60_000 }])) return json({ reponse: "", formulaire: true, transmettre: true }, 429);
  const text = await req.text();
  if (text.length > 4000) return json({ error: "too_large" }, 413);
  let message = "";
  try { message = String(JSON.parse(text || "{}").message ?? ""); } catch { return json({ error: "invalid" }, 400); }
  return json(await repondreVisiteur({ id: p.id, userId: p.user_id, name: p.name }, message));
}
