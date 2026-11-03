/** Union des cartes natives #328/#330 sur la convergence : vrai HTTP/SQL, aucun fournisseur. */
import {beforeEach,afterEach,expect,it,vi}from'vitest';
import fs from'node:fs';
import path from'node:path';
const session=vi.hoisted(()=>({user:null as any}));
vi.mock('@/lib/auth',async orig=>({...await orig<any>(),currentUser:async()=>session.user,requireUser:async()=>session.user}));
import {account,project}from'./conversation209-fixtures';
import {GET as projectGET}from'@/app/api/projects/[id]/route';
import {POST as threadPOST}from'@/app/api/studio-agent/conversations/[cid]/route';
import {POST as contextPOST}from'@/app/api/studio-agent/conversations/[cid]/context/route';
import {openProjectConversation,conversationView}from'@/lib/orchestrator/conversation';
import {saveAsset,getAsset,assetData}from'@/lib/library';
import {createRealisation}from'@/lib/contenus/realisations';
import {adapter}from'@/lib/contenus/api';
import {all,id}from'@/lib/db';
beforeEach(()=>{for(const f of ['LOT_A','CONTEXT','AI','FILES','BUSINESS_CONTENT'])vi.stubEnv('STUDIO_CONVERSATION_'+f,'1');vi.stubGlobal('fetch',vi.fn(()=>{throw Error('Fournisseur interdit');}));});
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
const read=(p:string)=>fs.readFileSync(path.join(process.cwd(),p),'utf8');
it('projette seulement le drapeau métier authentifié, garde bouton fermé si drapeau/contexte fermés et conserve deux cartes sous verrou global',async()=>{
 const u=await account(),pid=project(u,'services');session.user=u;
 for(const enabled of ['0','1']){vi.stubEnv('STUDIO_CONVERSATION_BUSINESS_CONTENT',enabled);const r=await projectGET(new Request('http://localhost/api/projects/'+pid),{params:Promise.resolve({id:pid})});expect(r.status).toBe(200);expect((await r.json()).conversationBusinessContent).toBe(enabled==='1');}
 vi.stubEnv('STUDIO_CONVERSATION_CONTEXT','0');const closed=await projectGET(new Request('http://localhost/api/projects/'+pid),{params:Promise.resolve({id:pid})});expect((await closed.json()).conversationBusinessContent).toBe(false);
 session.user=await account();expect((await projectGET(new Request('http://localhost/api/projects/'+pid),{params:Promise.resolve({id:pid})})).status).toBe(404);
 const panel=read('src/components/studio/conversation-panel.tsx'),gate=read('src/components/studio/syna-designate-content.tsx');expect(gate).toContain('if(!agentUi||!data?.conversationBusinessContent||!updatedAt)return null;');expect(panel).toContain('interactionBusy=busy||free.state.busy||files.state.busy||content.state.busy');expect(panel).toContain('mutation.current||interactionBusy');for(const component of ['ConversationLocalFiles','ConversationLocalBusinessContent'])expect(panel).toMatch(new RegExp(component+'[^\\n]+busy=\\{interactionBusy\\}'));expect(panel).toContain('!handlesFreeFiles(v)&&!handlesFreeContent(v)');expect(panel).toContain("target.kind==='site-request'");expect(panel).toContain("target.kind==='content-item'");
});
it.each(['files','business']as const)('deux contextes et confirmations concurrentes : seul le dernier contexte %s peut écrire',async last=>{
 const u=await account(),pid=project(u,'services');session.user=u;const c=openProjectConversation(u,pid),source=Buffer.from('OCTETS ACQUIS'),asset=await saveAsset({projectId:pid,userId:u.id,name:'original.txt',mime:'text/plain',data:source,origin:'upload'}),item=createRealisation(pid,{title:'Titre original',summary:'Description conservée.'}),ctx={params:Promise.resolve({cid:c.id})};
 const request=(body:unknown)=>new Request('http://localhost/api/conversation',{method:'POST',headers:{'content-type':'application/json',origin:'http://localhost'},body:JSON.stringify(body)}),command=(extra:Record<string,unknown>)=>{const v=conversationView(u,c.id);return{revision:v.revision,projectRevision:v.projectRevision,requestId:id(),...extra};};
 const spend=()=>({jobs:all('SELECT id FROM jobs WHERE project_id=?',pid),calls:all('SELECT id FROM ai_calls WHERE project_id=?',pid),usage:all('SELECT id FROM usage_events WHERE project_id=?',pid)}),before=spend();
 const proposals:Record<string,string>={};for(const kind of last==='files'?['business','files']:['files','business']){const target=kind==='files'?{kind:'asset',assetId:asset.id,version:asset.version}:{kind:'content-item',type:'realisations',itemId:item.id,version:adapter('realisations').get(pid,item.id).version};const selected=await contextPOST(request({action:'select',revision:conversationView(u,c.id).revision,requestId:id(),context:{projectId:pid,tab:kind==='files'?'fichiers':'realisations',target}}),ctx);expect(selected.status,await selected.clone().text()).toBe(200);const response=await threadPOST(request(command({action:'message',text:kind==='files'?'Renomme ce fichier en « final.txt »':'Renomme cette réalisation en « Titre final »'})),ctx);expect(response.status,await response.clone().text()).toBe(200);const v=await response.json();proposals[kind]=kind==='files'?v.localFiles.proposalId:v.localBusinessContent.proposalId;}
 const statuses=await Promise.all(['files','business'].map(async kind=>(await threadPOST(request(command({action:kind==='files'?'confirm-files':'confirm-business-content',proposalId:proposals[kind],confirmation:true})),ctx)).status));expect(statuses).toEqual(last==='files'?[200,409]:[409,200]);expect(getAsset(asset.id)!.name).toBe(last==='files'?'final.txt':'original.txt');expect(adapter('realisations').get(pid,item.id).title).toBe(last==='business'?'Titre final':'Titre original');expect(assetData(getAsset(asset.id)!).equals(source)).toBe(true);expect(spend()).toEqual(before);expect(fetch).not.toHaveBeenCalled();
});
