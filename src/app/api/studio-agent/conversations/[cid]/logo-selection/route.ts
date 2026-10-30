import {z}from 'zod';
import {requireUser}from '@/lib/auth';
import {body,handle,ok}from '@/lib/http';
import type {Ctx}from '@/lib/route-helpers';
import {LogoSelectionCommandSchema}from '@/lib/orchestrator/conversation/logo-selection-contract';
import {quoteLogoSelection,confirmLogoSelection,logoSelectionView}from '@/lib/orchestrator/conversation/logo-selection-execution';
export const runtime='nodejs';
export const GET=handle(async(req:Request,ctx:Ctx<{cid:string}>)=>{const u=await requireUser(),{cid}=await ctx.params,source=z.string().min(1).max(100).parse(new URL(req.url).searchParams.get('source'));return ok(logoSelectionView(u,cid,source));});
export const POST=handle(async(req:Request,ctx:Ctx<{cid:string}>)=>{const u=await requireUser(),{cid}=await ctx.params,c=await body(req,LogoSelectionCommandSchema);return ok(c.action==='quote'?quoteLogoSelection(u,cid,c):confirmLogoSelection(u,cid,c.quoteId));});
