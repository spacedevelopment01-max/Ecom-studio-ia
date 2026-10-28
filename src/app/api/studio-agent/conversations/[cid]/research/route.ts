import {requireUser} from '@/lib/auth';
import {body,handle,ok} from '@/lib/http';
import type {Ctx} from '@/lib/route-helpers';
import {ResearchToolCommandSchema} from '@/lib/orchestrator/conversation/research-tool-contract';
import {researchRegistry,researchReceipt,quoteResearch,confirmResearch} from '@/lib/orchestrator/conversation/research-tool-execution';
import {z} from 'zod';
export const runtime='nodejs';
export const GET=handle(async(req:Request,ctx:Ctx<{cid:string}>)=>{const user=await requireUser(),{cid}=await ctx.params,qid=new URL(req.url).searchParams.get('receipt');return ok(qid?researchReceipt(user,cid,z.string().min(1).max(100).parse(qid)):researchRegistry(user,cid));});
export const POST=handle(async(req:Request,ctx:Ctx<{cid:string}>)=>{const user=await requireUser(),{cid}=await ctx.params,cmd=await body(req,ResearchToolCommandSchema);return ok(cmd.action==='quote'?quoteResearch(user,cid,cmd):confirmResearch(user,cid,cmd));});
