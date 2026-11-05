/** Native Blog UI: the same persisted operation survives a lost confirmation response. */
export type NativeBlogOperation={current:{intent:string;id:string;pending?:boolean}|null};
type Quote={jobId?:string;approvalToken:string;maximumMicro:number;estimatePct:number;maximumPct:number;retriesIncluded:true};
export async function startNativeBlog(
 url:string,input:Record<string,unknown>,operation:NativeBlogOperation,
 confirm:(action:'blog',options:{quote:Quote})=>Promise<boolean>,
 post:(body:Record<string,unknown>)=>Promise<any>,
):Promise<{jobId:string}|null>{
 const intent=JSON.stringify({url,input});
 if(operation.current?.pending)return null;
 if(operation.current?.intent!==intent)operation.current={intent,id:crypto.randomUUID()};
 const current=operation.current!;current.pending=true;
 try{
  const quote=await post({...input,action:'quote',operationId:current.id})as Quote;
  if(quote.jobId){operation.current=null;return{jobId:quote.jobId};}
  if(!(await confirm('blog',{quote})))return null;
  const result=await post({...input,action:'write',operationId:current.id,approvalToken:quote.approvalToken,confirmation:true});
  operation.current=null;return result;
 }finally{current.pending=false;}
}
