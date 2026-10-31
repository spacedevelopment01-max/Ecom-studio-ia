import{requireUser}from'@/lib/auth';
import{body,handle,ok}from'@/lib/http';
import type{Ctx}from'@/lib/route-helpers';
import{ToolCommandSchema}from'@/lib/orchestrator/conversation/tool-contract';
import{toolRegistry,createToolQuote,confirmToolQuote,toolReceipt}from'@/lib/orchestrator/conversation/tool-execution';
import{z}from'zod';
export const runtime='nodejs';
export const GET=handle(async(req:Request,ctx:Ctx<{cid:string}>)=>{const user=await requireUser(),{cid}=await ctx.params,raw=new URL(req.url).searchParams.get('receipt');return ok(raw?toolReceipt(user,cid,z.string().min(1).max(100).parse(raw)):toolRegistry(user,cid));});
export const POST=handle(async(req:Request,ctx:Ctx<{cid:string}>)=>{const user=await requireUser(),{cid}=await ctx.params,cmd=await body(req,ToolCommandSchema);return ok(cmd.action==='quote'?createToolQuote(user,cid,cmd):confirmToolQuote(user,cid,cmd));});
