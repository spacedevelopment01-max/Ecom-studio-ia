import {placementRequest} from "@/lib/theme/placement-request";
import {handle,ok} from '@/lib/http';
import {HttpError} from '@/lib/auth';
import {projectFromCtx,type Ctx} from '@/lib/route-helpers';
import {themeVersion,currentTheme} from '@/lib/projects';
export const runtime='nodejs';
/** A preparation link performs no write, quote, provider request or generation. */
export const GET=handle(async(req:Request,ctx:Ctx)=>{
 const {project:p}=await projectFromCtx(ctx);const q=new URL(req.url).searchParams;
 const version=q.get('version')??currentTheme(p.id)?.version.id;const theme=version?themeVersion(p.id,version):null;const plan=theme?.spec.meta?.adaptation;
 if(!theme||!plan)throw new HttpError(404,'Adaptation introuvable / Adaptation not found');
 const request=plan.generationRequests.find(r=>r.key===q.get('slot'));
 if(!request)throw new HttpError(404,'Emplacement introuvable / Placement not found');
 placementRequest(p.id,{versionId:theme.version.id,slotKey:request.key,contextHash:plan.contextHash});
 return ok({request,themePlacement:{versionId:theme.version.id,slotKey:request.key,contextHash:plan.contextHash},kind:request.role==='packshot'?'packshot':request.role==='detail'?'product_image':p.business==='services'?'trade_photo':'usage_scene',topic:request.request.length<=200?request.request:`${p.product.name} — ${request.role}. ${request.aspect}. Aucun texte ni personne.`,aspect:request.aspect});
});
