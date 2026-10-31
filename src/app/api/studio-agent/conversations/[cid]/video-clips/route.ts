import {z}from 'zod';
import {requireUser}from '@/lib/auth';
import {body,handle,ok}from '@/lib/http';
import type {Ctx}from '@/lib/route-helpers';
import {VideoClipCommandSchema}from '@/lib/orchestrator/conversation/video-clip-contract';
import {videoClipRegistry,videoClipReceipt,quoteVideoClip,confirmVideoClip}from '@/lib/orchestrator/conversation/video-clip-execution';
export const runtime='nodejs';
export const GET=handle(async(req:Request,ctx:Ctx<{cid:string}>)=>{const u=await requireUser(),{cid}=await ctx.params,qid=new URL(req.url).searchParams.get('receipt');return ok(qid?videoClipReceipt(u,cid,z.string().min(1).max(100).parse(qid)):videoClipRegistry(u,cid));});
export const POST=handle(async(req:Request,ctx:Ctx<{cid:string}>)=>{const u=await requireUser(),{cid}=await ctx.params,c=await body(req,VideoClipCommandSchema);return ok(c.action==='quote'?quoteVideoClip(u,cid,c):confirmVideoClip(u,cid,c));});
