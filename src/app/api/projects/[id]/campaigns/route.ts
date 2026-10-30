import {z}from 'zod';
import {withCommunicationRequest} from "@/lib/marketing-strategy/communication-route";
import { recordedContentStrategy } from "@/lib/strategy-consumption";
import {ManualCampaignSchema,saveManualCampaign}from "@/lib/campaigns/manual";
import { all, run } from "@/lib/db";
import { body, handle, ok } from "@/lib/http";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";

/** Campagnes : préparation des angles, créations et textes. Aucune dépense n'est lancée depuis le studio. */
export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  const rows = all<any>("SELECT * FROM campaigns WHERE project_id = ? ORDER BY created_at DESC", p.id);
  // Langue de la campagne (annonces, export, publications) : celle choisie, sinon celle du projet.
  const lang = p.settings.language ?? "fr";
  return ok({ campaigns: rows.map((r) => ({ ...r, marketingStrategy:recordedContentStrategy(p.id,"campaign",r.id), networks: JSON.parse(r.networks), brief: { language: lang, ...JSON.parse(r.brief) }, plan: JSON.parse(r.plan), posts: all("SELECT id, network, format, status, title FROM posts WHERE campaign_id = ?", r.id) })) });
});

export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  return withCommunicationRequest(p.id,req,async()=>{
  const b=await body(req,ManualCampaignSchema);
  const result=saveManualCampaign(p,user,b);
  return ok({id:result.id});
  },['']);
});

/** Supprime une campagne. Ses publications déjà créées sont gardées (elles peuvent être programmées), détachées de la campagne. */
export const DELETE = handle(async (req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  const b = await body(req, z.object({ id: z.string().min(1) }));
  run("UPDATE posts SET campaign_id = NULL WHERE campaign_id = ? AND project_id = ?", b.id, p.id);
  run("DELETE FROM campaigns WHERE id = ? AND project_id = ?", b.id, p.id);
  return ok({ deleted: true });
});
