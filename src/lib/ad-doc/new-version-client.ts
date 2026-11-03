/** Only the native campaign_quote/generate contract; never changes the acquired document. */
export type CreativeVersionOperation={current:{id:string;pending:boolean}|null};
export type NativeCampaignQuote={estimateMicro:number;capMicro:number;estimatePct:number|null;maximumPct:number|null;concepts:number;images:number;ready:boolean;ai:boolean;reason?:string|null};
export async function requestCreativeVersion(
 post:(body:Record<string,unknown>)=>Promise<any>,
 confirm:(quote:NativeCampaignQuote)=>boolean|Promise<boolean>,
 operation:CreativeVersionOperation,
):Promise<{jobId:string}|null>{
 if(operation.current?.pending)return null;
 const current=operation.current??{id:crypto.randomUUID(),pending:false};operation.current=current;current.pending=true;
 try{
  const quote=await post({action:'campaign_quote',count:1})as NativeCampaignQuote;
  if(!quote.ready||!quote.ai||!Number.isSafeInteger(quote.estimateMicro)||quote.estimateMicro<=0||!Number.isSafeInteger(quote.capMicro)||quote.capMicro<quote.estimateMicro||quote.estimatePct==null||quote.maximumPct==null||!Number.isFinite(quote.estimatePct)||!Number.isFinite(quote.maximumPct))throw Error(quote.reason||'Le devis de cette nouvelle proposition est indisponible. Aucun achat lancé.');
  if(!(await confirm(quote)))return null;
  const result=await post({action:'generate',count:1,operationId:current.id,approvedEstimateMicro:quote.estimateMicro});
  operation.current=null;return result;
 }finally{current.pending=false;}
}
