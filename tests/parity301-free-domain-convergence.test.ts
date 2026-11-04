/** Cross-domain conversations on acquired projects: reads never turn stale proposals into consent. */
import {it,expect,vi,beforeEach,afterEach} from 'vitest';
import {account,project,sender,emptySpend} from './conversation209-fixtures';
import {openProjectConversation,submitConversation,conversationView} from '@/lib/orchestrator/conversation';
import {createFolder,listFolders,saveAsset,getAsset,assetData,type Folder} from '@/lib/library';
import {all,id,run} from '@/lib/db';
import {stateOf} from '@/lib/preparation/store';
import {seedSourcedAnglesForTest} from './sourced-strategy-fixture';
import {projectAccountKey} from '@/lib/project-billing';
beforeEach(()=>{for(const flag of ['LOT_A','AI','CONTEXT','FILES','PROMPTS'])vi.stubEnv('STUDIO_CONVERSATION_'+flag,'1');vi.stubGlobal('fetch',vi.fn(()=>{throw Error('NO_PROVIDER');}));});
afterEach(()=>{expect(fetch).not.toHaveBeenCalled();vi.unstubAllGlobals();vi.unstubAllEnvs();});
async function fixture(){
 const u=await account(),pid=project(u),c=openProjectConversation(u,pid),send=sender(u,c.id);listFolders(pid);const folder=createFolder(pid,'Photos',null),parent=createFolder(pid,'Archives',null),asset=await saveAsset({projectId:pid,userId:u.id,name:'source.txt',mime:'text/plain',data:Buffer.from('FICTIF'),origin:'upload',folderId:folder.id});seedSourcedAnglesForTest(pid);run('UPDATE wallets SET monthly_used=monthly_allowance,topup_balance=0 WHERE user_id=?',projectAccountKey(pid));
 return{u,pid,c,send,folder,parent,asset,say:(text:string)=>send({action:'message',text,context:{tab:'fichiers',target:null}})};
}
type F=Awaited<ReturnType<typeof fixture>>;
const folders=(f:F)=>all<Folder>('SELECT * FROM folders WHERE project_id=? ORDER BY id',f.pid);
it('prompt and file-library reads invalidate earlier folder proposals; a fresh explicit move still works',async()=>{
 const f=await fixture(),prep=stateOf(f.pid),spend=emptySpend(),before=folders(f),rename=await f.say('Renomme le dossier Photos en Images');
 expect(rename.localFolderRename?.state).toBe('proposed');let live=await f.say('Peux-tu me montrer ma bibliothèque de prompts ?');expect(live.localPrompts?.state).toBe('listed');expect(live.localPromptsRead).toEqual({enabled:true});expect(live.readOnlyReason).toMatch(/préparation engagée/);
 await expect(submitConversation(f.u,f.c.id,{action:'confirm-folder-rename',proposalId:rename.localFolderRename!.proposalId,confirmation:true,revision:live.revision,projectRevision:live.projectRevision,requestId:id()})).rejects.toMatchObject({status:409});expect(folders(f)).toEqual(before);
 const move=await f.say('Déplace le dossier Photos dans le dossier Archives');live=await f.say('Montre les fichiers');expect(live.localFiles?.state).toBe('listed');await expect(submitConversation(f.u,f.c.id,{action:'confirm-folder-move',proposalId:move.localFolderMove!.proposalId,confirmation:true,revision:live.revision,projectRevision:live.projectRevision,requestId:id()})).rejects.toMatchObject({status:409});expect(folders(f)).toEqual(before);
 const fresh=await f.say('Range le dossier Photos dans le dossier Archives'),saved=await f.send({action:'confirm-folder-move',proposalId:fresh.localFolderMove!.proposalId,confirmation:true});expect(saved.localFolderMove?.state).toBe('applied');expect(folders(f)).toEqual(before.map(r=>r.id===f.folder.id?{...r,parent_id:f.parent.id}:r));expect(stateOf(f.pid)).toEqual(prep);expect(emptySpend()).toEqual(spend);
});
it('natural file rename, folder rename and relocation compose without changing content versions, bytes or preparation',async()=>{
 const f=await fixture(),prep=stateOf(f.pid),spend=emptySpend(),original=getAsset(f.asset.id)!,bytes=assetData(original);
 const file=await f.send({action:'message',text:'Peux-tu renommer ce fichier en « accueil.txt » ?',context:{tab:'fichiers',projectId:f.pid,target:{kind:'asset',assetId:f.asset.id,version:f.asset.version}}});expect(file.localFiles?.state).toBe('proposed');await f.send({action:'confirm-files',proposalId:file.localFiles!.proposalId,confirmation:true});
 const rename=await f.say('Change le nom du dossier Photos en Images');await f.send({action:'confirm-folder-rename',proposalId:rename.localFolderRename!.proposalId,confirmation:true});const move=await f.say('Déplace le dossier Images dans le dossier Archives');await f.send({action:'confirm-folder-move',proposalId:move.localFolderMove!.proposalId,confirmation:true});
 expect(getAsset(f.asset.id)).toEqual({...original,name:'accueil.txt'});expect(assetData(getAsset(f.asset.id)!)).toEqual(bytes);expect(folders(f).find(r=>r.id===f.folder.id)).toEqual({...f.folder,name:'Images',parent_id:f.parent.id});expect(stateOf(f.pid)).toEqual(prep);expect(emptySpend()).toEqual(spend);expect(conversationView(f.u,f.c.id).readOnlyReason).toMatch(/préparation engagée/);
});
it('closing one domain does not block another native free domain or create a paid fallback',async()=>{
 const f=await fixture(),prep=stateOf(f.pid),spend=emptySpend();vi.stubEnv('STUDIO_CONVERSATION_FILES','0');const list=await f.say('Quels sont mes prompts favoris ?');expect(list.localPrompts?.state).toBe('listed');expect(list.localFolderMoveExecution).toBeUndefined();
 vi.stubEnv('STUDIO_CONVERSATION_FILES','1');vi.stubEnv('STUDIO_CONVERSATION_PROMPTS','0');await expect(f.say('Montre ma bibliothèque de prompts')).rejects.toMatchObject({status:404});const move=await f.say('Déplace le dossier Photos dans le dossier Archives');expect((await f.send({action:'confirm-folder-move',proposalId:move.localFolderMove!.proposalId,confirmation:true})).localFolderMove?.state).toBe('applied');expect(stateOf(f.pid)).toEqual(prep);expect(emptySpend()).toEqual(spend);
});
