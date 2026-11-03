/** Real native V2 docs, HTTP, renderer and SQLite; synthetic provider dependencies only. */
import {it,expect,vi,beforeEach,afterEach} from 'vitest';
import fs from 'node:fs';
import {freshV2Ads} from './parity301-ad-v2-fixtures';
const auth=vi.hoisted(()=>({user:null as any}));vi.mock('@/lib/auth',async o=>({...await o<any>(),requireUser:async()=>auth.user,currentUser:async()=>auth.user}));
import {conversationView} from '@/lib/orchestrator/conversation';
import {submitContext} from '@/lib/orchestrator/conversation/context-session';
import {POST} from '@/app/api/studio-agent/conversations/[cid]/ad-documents/route';
import {latestDoc} from '@/lib/ad-doc/store';
import {all,id} from '@/lib/db';
import {claimNext,JobContext,completeJob} from '@/lib/jobs';
import {runAdDocument,adDocumentReceipt} from '@/lib/orchestrator/conversation/ad-document-tool-execution';
import {localAdEdit} from '@/lib/ad-doc/local-edit';
beforeEach(()=>{for(const f of ['LOT_A','AI','CONTEXT','SPECIALISTS','TOOLS','AD_DOCUMENT_LOCAL'])vi.stubEnv('STUDIO_CONVERSATION_'+f,'1');vi.stubGlobal('fetch',vi.fn(()=>{throw Error('NO_PROVIDER');}));});afterEach(()=>{expect(fetch).not.toHaveBeenCalled();vi.unstubAllGlobals();vi.unstubAllEnvs();});
it('all 18 fresh V2 creatives propose every native moved layer, then save exactly that local result after explicit agreement',async()=>{
 const report:any[]=[];
 for(const platforms of [['meta_feed'],['meta_story'],['meta_feed','meta_story']]){
  const f=await freshV2Ads(platforms);auth.user=f.u;const ctx={params:Promise.resolve({cid:f.c.id})},post=(body:unknown)=>POST(new Request('http://localhost/api',{method:'POST',headers:{origin:'http://localhost','content-type':'application/json'},body:JSON.stringify(body)}),ctx);
  for(const key of f.docs){
   const before=latestDoc(f.pid,key)!,title=before.doc.layers.find(l=>l.role==='title')!,v=()=>conversationView(f.u,f.c.id);
   submitContext(f.u,f.c.id,{action:'select',revision:v().revision,requestId:id(),context:{projectId:f.pid,tab:'publicites',target:{kind:'ad-document-text',docKey:key,layerId:title.id,version:before.version.version}}});
   const versions=()=>all('SELECT id FROM ad_documents WHERE project_id=? AND doc_key=?',f.pid,key).length,n=versions(),r=await post({action:'propose',revision:v().revision,projectRevision:v().projectRevision,docKey:key,layerId:title.id,expectedVersion:before.version.version,operation:'title-larger'}),p=await r.json(),native=localAdEdit(before.doc,'agrandis le titre');
   expect(versions(),'no mutation before agreement').toBe(n);const item:any={platforms,docKey:key,status:r.status,error:p.error,effects:p.nativeEffects,nativeOps:native.local?native.ops.map(o=>'id'in o?o.id:o.op):[]};report.push(item);
   if(r.status!==200)continue;
   expect(p.state).toBe('proposed');expect(p.previews.before).toMatch(/^data:image\/jpeg;base64,/);expect(p.previews.after).not.toBe(p.previews.before);
   expect(p.nativeEffects.some((e:any)=>e.secondary===true)).toBe(true);
   const requestId=id(),confirmed=await post({action:'confirm',proposalId:p.proposalId,confirmation:true,requestId});expect(confirmed.status).toBe(200);
   const j=claimNext(['agent.ad-document.local'])!;expect(j.project_id).toBe(f.pid);const result=await runAdDocument(new JobContext(j));completeJob(j.id,result);
   const receipt=adDocumentReceipt(f.u,f.c.id,p.proposalId);expect(receipt.delivered).toBe(true);expect(receipt.nativeEffects).toEqual(p.nativeEffects);expect(versions()).toBe(n+1);expect((await post({action:'confirm',proposalId:p.proposalId,confirmation:true,requestId})).status).toBe(200);expect(versions()).toBe(n+1);
   const saved=latestDoc(f.pid,key)!;if(!native.local)throw Error('Expected native local operation');expect(saved.doc.layers).toEqual(native.doc.layers);
   for(const layer of before.doc.layers.filter(l=>l.kind==='image'))expect(saved.doc.layers.find(l=>l.id===layer.id)).toEqual(layer);
   item.resultVersion=saved.version.version;item.receipt=receipt.id;item.delivered=true;
  }
  expect(all('SELECT id FROM ai_calls WHERE project_id=?',f.pid)).toHaveLength(0);expect(all('SELECT id FROM usage_events WHERE project_id=?',f.pid)).toHaveLength(0);
 }
 if(process.env.PROBE_OUT)fs.writeFileSync(process.env.PROBE_OUT,JSON.stringify(report,null,2));expect(report).toHaveLength(18);expect(report.map(x=>x.status)).toEqual(Array(18).fill(200));
},300000);
