import {z}from 'zod';
import {requireUser}from '@/lib/auth';
import {body,handle,ok}from '@/lib/http';
import type {Ctx}from '@/lib/route-helpers';
import {VideoVoiceCommandSchema}from '@/lib/orchestrator/conversation/video-voice-contract';
import {videoVoiceRegistry,videoVoiceReceipt,quoteVideoVoice,confirmVideoVoice}from '@/lib/orchestrator/conversation/video-voice-execution';
export const runtime='nodejs';
export const GET=handle(async(req:Request,ctx:Ctx<{cid:string}>)=>{const u=await requireUser(),{cid}=await ctx.params,qid=new URL(req.url).searchParams.get('receipt');return ok(qid?videoVoiceReceipt(u,cid,z.string().min(1).max(100).parse(qid)):videoVoiceRegistry(u,cid));});
export const POST=handle(async(req:Request,ctx:Ctx<{cid:string}>)=>{const u=await requireUser(),{cid}=await ctx.params,c=await body(req,VideoVoiceCommandSchema);return ok(c.action==='quote'?quoteVideoVoice(u,cid,c):confirmVideoVoice(u,cid,c));});
