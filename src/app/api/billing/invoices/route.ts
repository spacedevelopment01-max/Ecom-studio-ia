import {handle,ok} from '@/lib/http';
import {requireUser} from '@/lib/auth';
import {invoicesOf} from '@/lib/payment-reconciliation';
export const GET=handle(async()=>ok(await invoicesOf((await requireUser()).id)));
