import { quoteStrategyBundle, confirmStrategyBundle, latestStrategyBundle, retryStrategyBundle } from "@/lib/marketing-strategy/bundle";
import { prepareLocalStrategyModules, preparedModules, commitPreparedStrategyModules } from "@/lib/marketing-strategy/module-preparation";
import { HttpError } from "@/lib/auth";
import { prepareStrategyTheme, commitPreparedStrategyTheme } from "@/lib/theme/strategy-transition";
import { z } from 'zod';
import { body, handle, ok } from '@/lib/http';
import { projectFromCtx, type Ctx } from '@/lib/route-helpers';
import { proposeStrategies, getStrategyState, prepareStrategyChange, activateStrategy, stageStrategyModule, failStrategyPreparation } from '@/lib/marketing-strategy';
const schema = z.discriminatedUnion('action', [
 z.object({ action: z.literal('analyze') }),
 z.object({action:z.literal('quote_revisions'),preparationId:z.string().min(1),contents:z.array(z.object({module:z.string().max(30),contentId:z.string().max(100)})).min(1).max(30)}),
 z.object({action:z.literal('confirm_revisions'),bundleId:z.string().min(1),confirmed:z.literal(true)}),
 z.object({action:z.literal('retry_revisions'),bundleId:z.string().min(1),confirmed:z.literal(true)}),
 z.object({ action:z.literal('prepare_modules'),preparationId:z.string().min(1) }),
 z.object({ action: z.literal('prepare'), angleId: z.enum(['usage','reassurance','expression','discovery','generalist']) }),
 z.object({ action:z.literal('review'), preparationId:z.string().min(1), module:z.string().min(1).max(30), contentId:z.string().min(1).max(100), decision:z.enum(['compatible','retain_unaligned']), confirmed:z.literal(true) }),
 z.object({ action: z.literal('activate'), angleId: z.enum(['usage','reassurance','expression','discovery','generalist']), preparationId: z.string().min(1), idempotencyKey: z.string().min(8).max(150), confirmed: z.literal(true), retainUnaligned: z.boolean().default(false) }),
]);
export const GET=handle(async(_req:Request,ctx:Ctx)=>{const {project:p}=await projectFromCtx(ctx);const state=getStrategyState(p.id);return ok({...state,revisionBundle:state.pending?latestStrategyBundle(p.id,state.pending.id):null,modulePreparations:state.pending?preparedModules(p.id,state.pending.id):[]});});
export const POST=handle(async(req:Request,ctx:Ctx)=>{
 const {project:p}=await projectFromCtx(ctx),input=await body(req,schema);
 if(input.action==='quote_revisions')return ok({bundle:quoteStrategyBundle(p.id,input.preparationId,input.contents)});
 if(input.action==='confirm_revisions')return ok({bundle:confirmStrategyBundle(p.id,input.bundleId,input.confirmed)});
 if(input.action==='retry_revisions')return ok({bundle:retryStrategyBundle(p.id,input.bundleId,input.confirmed)});
 if(input.action==='analyze')return ok(proposeStrategies(p.id));
 if(input.action==='prepare'){const preparation=prepareStrategyChange(p.id,input.angleId);try{const theme=await prepareStrategyTheme(p.id,preparation.id);return ok({preparation,theme,modules:preparedModules(p.id,preparation.id),bundle:latestStrategyBundle(p.id,preparation.id)});}catch(error){failStrategyPreparation(p.id,preparation.id,'La préparation du thème a échoué. Les versions précédentes et les contenus acquis sont conservés.');throw error;}}
 if(input.action==='prepare_modules')return ok({modules:await prepareLocalStrategyModules(p.id,input.preparationId)});
 if(input.action==='review'){const state=getStrategyState(p.id);if(state.pending?.id!==input.preparationId||!state.pending.contents.some(c=>c.module===input.module&&c.contentId===input.contentId&&!c.published))throw new HttpError(404,'Contenu absent de cette préparation.','strategy_review_missing');stageStrategyModule(p.id,input.preparationId,input.module,{contentIds:input.decision==='compatible'?[input.contentId]:[],retainedContentIds:input.decision==='retain_unaligned'?[input.contentId]:[]});return ok({reviewed:true});}
 const active=activateStrategy(p.id,{...input,commitPrepared:s=>{commitPreparedStrategyTheme(p.id,input.preparationId,s);commitPreparedStrategyModules(p.id,input.preparationId);}});
 return ok({active,state:getStrategyState(p.id)});
});
