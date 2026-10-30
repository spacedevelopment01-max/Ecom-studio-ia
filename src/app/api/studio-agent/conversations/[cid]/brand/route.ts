import {z} from 'zod';
import {requireUser} from '@/lib/auth';
import {body,handle,ok} from '@/lib/http';
import type {Ctx} from '@/lib/route-helpers';
import {BrandToolCommandSchema} from '@/lib/orchestrator/conversation/brand-tool-contract';
import {quoteBrand,confirmBrand,recoverBrand,brandRegistry,brandReceipt} from '@/lib/orchestrator/conversation/brand-tool-execution';
export const runtime='nodejs';
export const GET=handle(async(req:Request,ctx:Ctx<{cid:string}>)=>{const u=await requireUser(),{cid}=await ctx.params,id=new URL(req.url).searchParams.get('receipt');return ok(id?brandReceipt(u,cid,z.string().min(1).max(100).parse(id)):brandRegistry(u,cid));});
export const POST=handle(async(req:Request,ctx:Ctx<{cid:string}>)=>{const u=await requireUser(),{cid}=await ctx.params,cmd=await body(req,BrandToolCommandSchema);return ok(cmd.action==='quote'?quoteBrand(u,cid,cmd):cmd.action==='recover'?recoverBrand(u,cid,cmd.quoteId):confirmBrand(u,cid,cmd));});
