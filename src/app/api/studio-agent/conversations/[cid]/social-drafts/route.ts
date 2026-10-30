import {z}from 'zod';
import {requireUser}from '@/lib/auth';
import {body,handle,ok}from '@/lib/http';
import type {Ctx}from '@/lib/route-helpers';
import {SocialToolCommandSchema}from '@/lib/orchestrator/conversation/social-tool-contract';
import {quoteSocialPreparation,confirmSocialPreparation,socialPreparationReceipt,socialPreparationRegistry}from '@/lib/orchestrator/conversation/social-tool-execution';
export const runtime='nodejs';
export const GET=handle(async(req:Request,ctx:Ctx<{cid:string}>)=>{const u=await requireUser(),{cid}=await ctx.params,q=new URL(req.url).searchParams.get('receipt');return ok(q?socialPreparationReceipt(u,cid,z.string().min(1).max(100).parse(q)):socialPreparationRegistry(u,cid));});
export const POST=handle(async(req:Request,ctx:Ctx<{cid:string}>)=>{const u=await requireUser(),{cid}=await ctx.params,c=await body(req,SocialToolCommandSchema);return ok(c.action==='quote'?quoteSocialPreparation(u,cid,c):confirmSocialPreparation(u,cid,c));});
