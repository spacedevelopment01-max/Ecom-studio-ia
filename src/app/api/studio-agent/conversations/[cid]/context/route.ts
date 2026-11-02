import {requireUser} from '@/lib/auth';
import {handle,ok,body} from '@/lib/http';
import type {Ctx} from '@/lib/route-helpers';
import {ContextCommandSchema,contextView,submitContext,ContextConflict} from '@/lib/orchestrator/conversation/context-session';
export const runtime='nodejs';
export const GET=handle(async(req:Request,ctx:Ctx<{cid:string}>)=>{const u=await requireUser(),{cid}=await ctx.params;return ok(contextView(u,cid,new URL(req.url).searchParams.get('directory')==='1'));});
export const POST=handle(async(req:Request,ctx:Ctx<{cid:string}>)=>{
 const u=await requireUser(),{cid}=await ctx.params;
 try{return ok(submitContext(u,cid,await body(req,ContextCommandSchema)));}
 catch(e){if(e instanceof ContextConflict)return ok({error:e.message,code:e.code,context:e.context},{status:409});throw e;}
});
