import {requireUser} from '@/lib/auth';
import {body,handle,ok} from '@/lib/http';
import type {Ctx} from '@/lib/route-helpers';
import {RenderToolCommandSchema} from '@/lib/orchestrator/conversation/render-tool-contract';
import {renderRegistry,renderReceipt,quoteRender,confirmRender} from '@/lib/orchestrator/conversation/render-tool-execution';
import {z} from 'zod';
export const runtime='nodejs';
export const GET=handle(async(req:Request,ctx:Ctx<{cid:string}>)=>{const user=await requireUser(),{cid}=await ctx.params,qid=new URL(req.url).searchParams.get('receipt');return ok(qid?renderReceipt(user,cid,z.string().min(1).max(100).parse(qid)):renderRegistry(user,cid));});
export const POST=handle(async(req:Request,ctx:Ctx<{cid:string}>)=>{const user=await requireUser(),{cid}=await ctx.params,cmd=await body(req,RenderToolCommandSchema);return ok(cmd.action==='quote'?quoteRender(user,cid,cmd):confirmRender(user,cid,cmd));});
