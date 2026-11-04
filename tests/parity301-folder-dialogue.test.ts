import {it,expect,vi,beforeEach,afterEach} from 'vitest';
import {account,project,sender,emptySpend} from './conversation209-fixtures';
import {openProjectConversation,submitConversation,conversationView} from '@/lib/orchestrator/conversation';
import {createFolder} from '@/lib/library';
import {all,id,run} from '@/lib/db';
beforeEach(()=>{for(const f of ['LOT_A','AI','CONTEXT','FILES'])vi.stubEnv('STUDIO_CONVERSATION_'+f,'1');vi.stubGlobal('fetch',vi.fn(()=>{throw Error('NO_PROVIDER');}));});
afterEach(()=>{expect(fetch).not.toHaveBeenCalled();vi.unstubAllGlobals();vi.unstubAllEnvs();});
async function fixture(){const u=await account(),pid=project(u),c=openProjectConversation(u,pid),send=sender(u,c.id);return{u,pid,c,send,say:(text:string)=>send({action:'message',text,context:{tab:'fichiers',target:null}})};}
for(const text of ['Crée un dossier Photos à la racine','Crée-moi un dossier nommé Photos à la racine','Ajoute le dossier appelé Photos à la racine','Créer un dossier Photos à la racine'])it('natural formulation: '+text,async()=>{const f=await fixture(),before=all('SELECT * FROM folders WHERE project_id=?',f.pid),v=await f.say(text);expect(v.localFolders).toMatchObject({state:'proposed',diff:{after:{name:'Photos',parentId:null}},confirmationRequired:true});expect(all('SELECT * FROM folders WHERE project_id=?',f.pid)).toEqual(before);});
it('an incomplete natural request survives reload; destination reply prepares a new free agreement, never creates',async()=>{
 const f=await fixture(),before=all('SELECT * FROM folders WHERE project_id=?',f.pid),spend=emptySpend(),question=await f.say('Crée un dossier nommé Photos atelier');expect(question.localFolders).toMatchObject({state:'ambiguous',actionsExecuted:false,confirmationRequired:false});expect(question.localFolders!.message).toContain('Où créer');expect(conversationView(f.u,f.c.id).localFolders).toEqual(question.localFolders);
 const v=await f.say('à la racine');expect(v.localFolders).toMatchObject({state:'proposed',confirmationRequired:true,diff:{before:null,after:{name:'Photos atelier',parentId:null}}});expect(all('SELECT * FROM folders WHERE project_id=?',f.pid)).toEqual(before);
 const saved=await submitConversation(f.u,f.c.id,{action:'confirm-folder',proposalId:v.localFolders!.proposalId,confirmation:true,revision:v.revision,projectRevision:v.projectRevision,requestId:id()});expect(saved.localFolders!.state).toBe('applied');expect(emptySpend()).toEqual(spend);
});
it('a reply selects one exact native parent; yes or here never guesses a location',async()=>{
 const f=await fixture(),parent=createFolder(f.pid,'Photos',null);await f.say('Ajoute un dossier Retouches');for(const reply of ['oui','ici']){const q=await f.say(reply);expect(q.localFolders).toMatchObject({state:'ambiguous',confirmationRequired:false});}
 const v=await f.say('dans le dossier Photos');expect(v.localFolders).toMatchObject({state:'proposed',parent:{id:parent.id},diff:{after:{name:'Retouches',parentId:parent.id}}});
});
it('an expired clarification cannot become an implicit action or a paid fallback',async()=>{
 const f=await fixture();await f.say('Crée un dossier Photos');run("UPDATE agent_conversations SET state_json=json_set(state_json,'$.localFolderClarification.expiresAt',0) WHERE id=?",f.c.id);const v=await f.say('à la racine');expect(v.localFolders).toMatchObject({state:'ambiguous',actionsExecuted:false,confirmationRequired:false});expect(v.localFolders!.message).toContain('expiré');expect(all('SELECT * FROM folders WHERE project_id=? AND name=?',f.pid,'Photos')).toHaveLength(0);
});
it('a new request replaces the pending name and chained instructions never become file moves',async()=>{
 const f=await fixture();await f.say('Crée un dossier Ancien');await f.say('Crée un dossier Nouveau');const v=await f.say('à la racine');expect(v.localFolders!.diff!.after.name).toBe('Nouveau');expect((await f.say('Crée un dossier Photos puis déplace les fichiers à la racine')).localFolders).toMatchObject({state:'ambiguous',confirmationRequired:false});
});
