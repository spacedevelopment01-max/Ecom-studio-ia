import {z}from 'zod';
import {requireUser}from '@/lib/auth';
import {body,handle,ok}from '@/lib/http';
import type {Ctx}from '@/lib/route-helpers';
import {VideoGenerationCommandSchema}from '@/lib/orchestrator/conversation/video-generation-contract';
import {videoGenerationRegistry,videoGenerationReceipt,quoteVideoGeneration,confirmVideoGeneration}from '@/lib/orchestrator/conversation/video-generation-execution';
export const runtime='nodejs';
export const GET=handle(async(req:Request,ctx:Ctx<{cid:string}>)=>{const u=await requireUser(),{cid}=await ctx.params,qid=new URL(req.url).searchParams.get('receipt');return ok(qid?videoGenerationReceipt(u,cid,z.string().min(1).max(100).parse(qid)):videoGenerationRegistry(u,cid));});
export const POST=handle(async(req:Request,ctx:Ctx<{cid:string}>)=>{const u=await requireUser(),{cid}=await ctx.params,c=await body(req,VideoGenerationCommandSchema);return ok(c.action==='quote'?quoteVideoGeneration(u,cid,c):confirmVideoGeneration(u,cid,c));});
