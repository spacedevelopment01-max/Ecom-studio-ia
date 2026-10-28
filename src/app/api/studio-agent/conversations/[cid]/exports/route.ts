import {requireUser} from '@/lib/auth';
import {body,handle,ok} from '@/lib/http';
import type {Ctx} from '@/lib/route-helpers';
import {ExportToolCommandSchema} from '@/lib/orchestrator/conversation/export-tool-contract';
import {nativeExportsRegistry,nativeExportReceipt,quoteNativeExport,confirmNativeExport} from '@/lib/orchestrator/conversation/export-tool-execution';
import {z} from 'zod';
export const runtime='nodejs';
export const GET=handle(async(req:Request,ctx:Ctx<{cid:string}>)=>{const user=await requireUser(),{cid}=await ctx.params,qid=new URL(req.url).searchParams.get('receipt');return ok(qid?nativeExportReceipt(user,cid,z.string().min(1).max(100).parse(qid)):nativeExportsRegistry(user,cid));});
export const POST=handle(async(req:Request,ctx:Ctx<{cid:string}>)=>{const user=await requireUser(),{cid}=await ctx.params,cmd=await body(req,ExportToolCommandSchema);return ok(cmd.action==='quote'?quoteNativeExport(user,cid,cmd):confirmNativeExport(user,cid,cmd));});
