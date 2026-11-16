/**
 * L'angle actif du projet et l'état de sa stratégie, en lecture seule (lu par les écrans des publications, des
 * publicités et des vidéos). Les angles se créent et se choisissent avec SINA (lot 3, 16 novembre 2026) : l'ancienne
 * recherche payante des cinq angles et leurs révisions ne sont plus proposées ici.
 */
import { handle, ok } from "@/lib/http";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { latestStrategyBundle } from "@/lib/marketing-strategy/bundle";
import { preparedModules } from "@/lib/marketing-strategy/module-preparation";
import { getStrategyState } from "@/lib/marketing-strategy";
export const GET=handle(async(_req:Request,ctx:Ctx)=>{const {project:p}=await projectFromCtx(ctx);const state=getStrategyState(p.id);return ok({...state,revisionBundle:state.pending?latestStrategyBundle(p.id,state.pending.id):null,modulePreparations:state.pending?preparedModules(p.id,state.pending.id):[]});});
