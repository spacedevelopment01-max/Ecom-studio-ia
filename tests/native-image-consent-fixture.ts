/** Donne aux anciens tests de transport un vrai devis/accord serveur, sans désactiver les gardes. */
import {expect} from 'vitest';
import {setJsonSetting} from '@/lib/settings';
import {MEDIA_MODELS} from '@/lib/ai/media-models';
export async function nativeImageConfirmedFixture(post:(body:any)=>Promise<Response>,body:any){
 if(body.action!=='generate'||body.request?.allowGenerate===false)return post(body);
 setJsonSetting('billing.markup',1);
 setJsonSetting('ai.media.models',Object.fromEntries(MEDIA_MODELS.filter(m=>m.kind==='image').map(m=>[`${m.provider}:${m.model}`,{enabled:true,confirmedAt:Date.now()}])));
 const operationId=body.operationId??crypto.randomUUID(),response=await post({action:'quote',operationId,request:body.request});
 expect(response.status,await response.clone().text()).toBe(200);const quote=await response.clone().json();
 if(quote.jobId)return response;
 return post({...body,operationId,approvalToken:quote.approvalToken,confirmation:true});
}
