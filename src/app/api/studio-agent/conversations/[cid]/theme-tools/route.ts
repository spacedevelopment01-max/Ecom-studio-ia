import {requireUser} from '@/lib/auth';
import {body,handle,ok} from '@/lib/http';
import type {Ctx} from '@/lib/route-helpers';
import {ThemeToolCommandSchema} from '@/lib/orchestrator/conversation/theme-tool-contract';
import {themeToolsRegistry,themeChangeReceipt,quoteThemeChange,quoteThemeUndo,confirmThemeChange} from '@/lib/orchestrator/conversation/theme-tool-execution';
import {z} from 'zod';
export const runtime='nodejs';
export const GET=handle(async(req:Request,ctx:Ctx<{cid:string}>)=>{const user=await requireUser(),{cid}=await ctx.params,qid=new URL(req.url).searchParams.get('receipt');return ok(qid?themeChangeReceipt(user,cid,z.string().min(1).max(100).parse(qid)):themeToolsRegistry(user,cid));});
export const POST=handle(async(req:Request,ctx:Ctx<{cid:string}>)=>{const user=await requireUser(),{cid}=await ctx.params,cmd=await body(req,ThemeToolCommandSchema);return ok(cmd.action==='quote'?quoteThemeChange(user,cid,cmd):cmd.action==='quote-undo'?quoteThemeUndo(user,cid,cmd):confirmThemeChange(user,cid,cmd));});
