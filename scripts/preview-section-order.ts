import type {Page} from 'playwright';

const replacementError=(error:unknown)=>error instanceof Error&&/^(?:locator\.evaluateAll: )?(?:Frame was detached|Execution context was destroyed, most likely because of a navigation\.?)(?:\n|$)/.test(error.message);

/** Read only: a native version change may replace the iframe while its exact order is inspected. */
export async function waitForPreviewSectionOrder(page:Page,section:string,anchor:string){
 const end=Date.now()+30_000;let ids:string[]=[];
 const remaining=()=>{const left=end-Date.now();if(left<=0)throw Error('Ordre natif non visible dans iframe : '+JSON.stringify(ids));return left;};
 for(;;){
  if(page.isClosed())throw Error('Preview page is closed');
  const left=remaining();let timer:ReturnType<typeof setTimeout>|undefined;
  try{
   // Resolve the current frame on every read; the deadline is shared with all prior reads.
   const read=page.frameLocator('iframe[title^="Aperçu"]').locator('main [data-es-section^="index:"]').evaluateAll(els=>els.map(el=>el.getAttribute('data-es-section')!.split(':')[1]));
   ids=await Promise.race([read,new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error('Preview section-order read deadline exceeded')),left);})]);
  }catch(error){if(!replacementError(error)||page.isClosed())throw error;}
  finally{if(timer!==undefined)clearTimeout(timer);}
  if(page.isClosed())throw Error('Preview page is closed');
  remaining();
  const targetIndex=ids.indexOf(section),anchorIndex=ids.indexOf(anchor);
  if(targetIndex>=0&&anchorIndex>=0&&targetIndex===anchorIndex+1)return ids;
  await page.waitForTimeout(Math.min(100,remaining()));
 }
}
