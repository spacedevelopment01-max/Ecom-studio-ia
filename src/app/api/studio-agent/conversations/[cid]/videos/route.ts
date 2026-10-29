import {z}from 'zod';
import {requireUser}from '@/lib/auth';
import {body,handle,ok}from '@/lib/http';
import type {Ctx}from '@/lib/route-helpers';
import {VideoToolCommandSchema}from '@/lib/orchestrator/conversation/video-tool-contract';
import {videoToolRegistry,videoToolReceipt,quoteVideoCreation,confirmVideoCreation}from '@/lib/orchestrator/conversation/video-tool-execution';
export const runtime='nodejs';
export const GET=handle(async(req:Request,ctx:Ctx<{cid:string}>)=>{const u=await requireUser(),{cid}=await ctx.params,qid=new URL(req.url).searchParams.get('receipt');return ok(qid?videoToolReceipt(u,cid,z.string().min(1).max(100).parse(qid)):videoToolRegistry(u,cid));});
export const POST=handle(async(req:Request,ctx:Ctx<{cid:string}>)=>{const u=await requireUser(),{cid}=await ctx.params,c=await body(req,VideoToolCommandSchema);return ok(c.action==='quote'?quoteVideoCreation(u,cid,c):confirmVideoCreation(u,cid,c));});
