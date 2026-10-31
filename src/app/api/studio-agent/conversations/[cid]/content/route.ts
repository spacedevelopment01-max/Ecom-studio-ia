import {requireUser} from '@/lib/auth';
import {body,handle,ok} from '@/lib/http';
import type {Ctx} from '@/lib/route-helpers';
import {ContentToolCommandSchema} from '@/lib/orchestrator/conversation/content-tool-contract';
import {quoteContent,quoteBlogContent,quoteContentEdit,confirmContent,contentRegistry,contentReceipt} from '@/lib/orchestrator/conversation/content-tool-execution';
import {z} from 'zod';
export const runtime='nodejs';
export const GET=handle(async(req:Request,ctx:Ctx<{cid:string}>)=>{const u=await requireUser(),{cid}=await ctx.params,q=new URL(req.url).searchParams.get('receipt');return ok(q?contentReceipt(u,cid,z.string().min(1).max(100).parse(q)):contentRegistry(u,cid));});
export const POST=handle(async(req:Request,ctx:Ctx<{cid:string}>)=>{const u=await requireUser(),{cid}=await ctx.params,c=await body(req,ContentToolCommandSchema);return ok(c.action==='blog_quote'?await quoteBlogContent(u,cid,c):c.action==='quote'?await quoteContent(u,cid,c):c.action==='edit_quote'?await quoteContentEdit(u,cid,c):confirmContent(u,cid,c.quoteId));});
