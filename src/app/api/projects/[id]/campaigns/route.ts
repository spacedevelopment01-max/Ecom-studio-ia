import { z } from "zod";
import { all, id, now, run } from "@/lib/db";
import { body, handle, ok } from "@/lib/http";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";

/** Campagnes : préparation des angles, créations et textes. Aucune dépense n'est lancée depuis le studio. */
export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  const rows = all<any>("SELECT * FROM campaigns WHERE project_id = ? ORDER BY created_at DESC", p.id);
  // Langue de la campagne (annonces, export, publications) : celle choisie, sinon celle du projet.
  const lang = p.settings.language ?? "fr";
  return ok({ campaigns: rows.map((r) => ({ ...r, networks: JSON.parse(r.networks), brief: { language: lang, ...JSON.parse(r.brief) }, plan: JSON.parse(r.plan), posts: all("SELECT id, network, format, status, title FROM posts WHERE campaign_id = ?", r.id) })) });
});

export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  const b = await body(req, z.object({ id: z.string().optional(), name: z.string().min(1).max(120), objective: z.string().max(80), networks: z.array(z.string()).max(6), brief: z.object({ language: z.enum(["fr", "en"]).optional() }).catchall(z.any()).default({}), plan: z.record(z.string(), z.any()).default({}), status: z.enum(["draft", "ready", "archived"]).default("draft") }));
  if (b.id) {
    run("UPDATE campaigns SET name = ?, objective = ?, networks = ?, brief = ?, plan = ?, status = ?, updated_at = ? WHERE id = ? AND project_id = ?", b.name, b.objective, JSON.stringify(b.networks), JSON.stringify(b.brief), JSON.stringify(b.plan), b.status, now(), b.id, p.id);
    return ok({ id: b.id });
  }
  const cid = id();
  run("INSERT INTO campaigns (id, project_id, name, objective, networks, status, brief, plan, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)", cid, p.id, b.name, b.objective, JSON.stringify(b.networks), b.status, JSON.stringify(b.brief), JSON.stringify(b.plan), now(), now());
  return ok({ id: cid });
});
