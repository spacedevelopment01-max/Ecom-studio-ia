import {z} from 'zod';
import {body,handle,ok} from '@/lib/http';
import {requireUser} from '@/lib/auth';
import {reconcilePayments} from '@/lib/payment-reconciliation';
export const POST=handle(async(req:Request)=>{const u=await requireUser();const b=await body(req,z.object({sessionId:z.string().min(1).max(200).optional()}));return ok(await reconcilePayments(u.id,b.sessionId));});
