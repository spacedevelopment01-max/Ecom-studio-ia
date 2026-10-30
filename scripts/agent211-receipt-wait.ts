/** Harnais : attendre le reçu exact de la réponse de confirmation, jamais un ancien acquis. */
export type NativeReceipt={id:string;job:{id:string;status:string}|null};
const active=new Set(['queued','running','paused','blocked']);
export function terminalReceiptFor<T extends NativeReceipt>(rows:T[],confirmed:NativeReceipt):T|null{
 const receipt=rows.find(r=>r.id===confirmed.id);if(!receipt)return null;
 if(confirmed.job&&receipt.job?.id!==confirmed.job.id)throw Error('Native receipt/job mismatch');
 return receipt.job&&active.has(receipt.job.status)?null:receipt;
}
