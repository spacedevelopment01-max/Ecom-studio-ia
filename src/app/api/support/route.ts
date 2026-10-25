import {z} from 'zod';
import {body,handle,ok} from '@/lib/http';
import {requireUser} from '@/lib/auth';
import {createSupportRequest,replySupport,supportRequests} from '@/lib/support';
const text=z.string().trim().min(1).max(4000),requestKey=z.string().min(8).max(100);
const input=z.discriminatedUnion('action',[
 z.object({action:z.literal('create'),subject:z.string().trim().min(3).max(160),category:z.enum(['account','billing','generation','other']),text,requestKey,projectId:z.string().max(100).optional(),jobId:z.string().max(100).optional()}),
 z.object({action:z.literal('reply'),id:z.string().min(1).max(100),text:text.optional(),status:z.enum(['open','in_progress','closed']).optional(),requestKey}).refine(b=>!!b.text||!!b.status),
]);
export const GET=handle(async(req:Request)=>ok({tickets:supportRequests(await requireUser(),new URL(req.url).searchParams.get('queue')==='1')}));
export const POST=handle(async(req:Request)=>{const u=await requireUser(),b=await body(req,input);return ok({ticket:b.action==='create'?createSupportRequest(u,b):replySupport(u,b)});});
