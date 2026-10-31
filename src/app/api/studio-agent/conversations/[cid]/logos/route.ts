import {z}from 'zod';
import {requireUser}from '@/lib/auth';
import {body,handle,ok}from '@/lib/http';
import type {Ctx}from '@/lib/route-helpers';
import {LogoToolCommandSchema}from '@/lib/orchestrator/conversation/logo-tool-contract';
import {logoToolRegistry,logoToolReceipt,quoteLogoCreation,confirmLogoCreation}from '@/lib/orchestrator/conversation/logo-tool-execution';
export const runtime='nodejs';
export const GET=handle(async(req:Request,ctx:Ctx<{cid:string}>)=>{const u=await requireUser(),{cid}=await ctx.params,receipt=new URL(req.url).searchParams.get('receipt');return ok(receipt?logoToolReceipt(u,cid,z.string().min(1).max(100).parse(receipt)):logoToolRegistry(u,cid));});
export const POST=handle(async(req:Request,ctx:Ctx<{cid:string}>)=>{const u=await requireUser(),{cid}=await ctx.params,c=await body(req,LogoToolCommandSchema);return ok(c.action==='quote'?quoteLogoCreation(u,cid,c):confirmLogoCreation(u,cid,c));});
