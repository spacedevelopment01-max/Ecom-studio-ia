import {z} from 'zod';
import {requireUser} from '@/lib/auth';
import {body,handle,ok} from '@/lib/http';
import type {Ctx} from '@/lib/route-helpers';
import {ImageToolCommandSchema} from '@/lib/orchestrator/conversation/image-tool-contract';
import {imageToolRegistry,imageToolReceipt,quoteImageCreation,confirmImageCreation} from '@/lib/orchestrator/conversation/image-tool-execution';
export const runtime='nodejs';
export const GET=handle(async(req:Request,ctx:Ctx<{cid:string}>)=>{const u=await requireUser(),{cid}=await ctx.params,receipt=new URL(req.url).searchParams.get('receipt');return ok(receipt?imageToolReceipt(u,cid,z.string().min(1).max(100).parse(receipt)):imageToolRegistry(u,cid));});
export const POST=handle(async(req:Request,ctx:Ctx<{cid:string}>)=>{const u=await requireUser(),{cid}=await ctx.params,c=await body(req,ImageToolCommandSchema);return ok(c.action==='quote'?quoteImageCreation(u,cid,c):confirmImageCreation(u,cid,c));});
