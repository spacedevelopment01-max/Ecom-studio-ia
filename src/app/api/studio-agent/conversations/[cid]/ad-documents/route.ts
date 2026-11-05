import {z} from 'zod';
import {requireUser} from '@/lib/auth';
import {body,handle,ok} from '@/lib/http';
import type {Ctx} from '@/lib/route-helpers';
import {AdDocumentToolCommandSchema} from '@/lib/orchestrator/conversation/ad-document-tool-contract';
import {proposeAdDocument,confirmAdDocument,cancelAdDocument,adDocumentReceipt,adDocumentPreview} from '@/lib/orchestrator/conversation/ad-document-tool-execution';
export const runtime='nodejs';
export const GET=handle(async(req:Request,ctx:Ctx<{cid:string}>)=>{const u=await requireUser(),{cid}=await ctx.params;const url=new URL(req.url),qid=z.string().min(1).max(120).parse(url.searchParams.get('receipt'));if(url.searchParams.has('preview')){const side=z.enum(['before','after']).parse(url.searchParams.get('preview')),out=await adDocumentPreview(u,cid,qid,side);return new Response(new Uint8Array(out.data),{headers:{'Content-Type':out.mime,'Cache-Control':'no-store'}});}return ok(adDocumentReceipt(u,cid,qid));});
export const POST=handle(async(req:Request,ctx:Ctx<{cid:string}>)=>{const u=await requireUser(),{cid}=await ctx.params,cmd=await body(req,AdDocumentToolCommandSchema);return ok(cmd.action==='propose'?await proposeAdDocument(u,cid,cmd):cmd.action==='cancel'?cancelAdDocument(u,cid,cmd):confirmAdDocument(u,cid,cmd));});
