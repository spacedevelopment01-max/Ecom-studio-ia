import {z} from 'zod';
import {requireUser} from '@/lib/auth';
import {body,handle,ok} from '@/lib/http';
import type {Ctx} from '@/lib/route-helpers';
import {CatalogueCommandSchema} from '@/lib/orchestrator/conversation/catalogue-tool-contract';
import {catalogueRegistry,catalogueReceipt,quoteCatalogueChange,quoteCatalogueUndo,confirmCatalogueChange} from '@/lib/orchestrator/conversation/catalogue-tool-execution';
export const runtime='nodejs';
export const GET=handle(async(req:Request,ctx:Ctx<{cid:string}>)=>{const u=await requireUser(),{cid}=await ctx.params,q=new URL(req.url).searchParams,receipt=q.get('receipt'),offset=z.coerce.number().int().min(0).max(100000).parse(q.get('offset')??0);return ok(receipt?catalogueReceipt(u,cid,z.string().min(1).max(100).parse(receipt)):catalogueRegistry(u,cid,offset));});
export const POST=handle(async(req:Request,ctx:Ctx<{cid:string}>)=>{const u=await requireUser(),{cid}=await ctx.params,c=await body(req,CatalogueCommandSchema);return ok(c.action==='quote'?quoteCatalogueChange(u,cid,c):c.action==='quote-undo'?quoteCatalogueUndo(u,cid,c):confirmCatalogueChange(u,cid,c));});
