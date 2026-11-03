import {it,expect,beforeEach,afterEach,vi} from 'vitest';
import {account,project,emptySpend} from './conversation209-fixtures';
import {openProjectConversation,conversationView,submitConversation} from '@/lib/orchestrator/conversation';
import {loadProject,saveServices} from '@/lib/projects';
import {emptyServiceProfile} from '@/lib/project-types';
import {id} from '@/lib/db';
beforeEach(()=>{for(const f of ['LOT_A','CONTEXT','AI','SERVICE_PROFILE'])vi.stubEnv('STUDIO_CONVERSATION_'+f,'1');vi.stubGlobal('fetch',vi.fn(()=>{throw Error('NO_PROVIDER');}));});
afterEach(()=>{expect(fetch).not.toHaveBeenCalled();vi.unstubAllGlobals();vi.unstubAllEnvs();});
async function fixture(){const u=await account(),pid=project(u,'services'),c=openProjectConversation(u,pid);saveServices(pid,{...emptyServiceProfile(),hours:'Lundi 09–17'});return{u,pid,c};}
async function message(f:Awaited<ReturnType<typeof fixture>>,text:string,tab='produit'){const v=conversationView(f.u,f.c.id);return submitConversation(f.u,f.c.id,{action:'message',revision:v.revision,projectRevision:v.projectRevision,requestId:id(),text,context:{tab,target:null}});}
for(const text of ['Mets les horaires du profil à : Mardi 9 h – 18 h','Change les horaires du profil d’activité pour « Mardi 9 h – 18 h »','Nos horaires d’ouverture sont : Mardi 9 h – 18 h'])it(text+' → gratuit, accord, reçu et profil relu',async()=>{
 const f=await fixture(),before=loadProject(f.pid),spend=emptySpend(),v=await message(f,text);
 expect(v.serviceProfile).toMatchObject({state:'proposed',confirmationRequired:true,diff:{before:'Lundi 09–17',after:'Mardi 9 h – 18 h'},providerCalls:0,costEur:0});expect(v.action?.state).not.toBe('quote');expect(loadProject(f.pid)).toEqual(before);
 const result=await submitConversation(f.u,f.c.id,{action:'confirm-service-profile',proposalId:v.serviceProfile!.proposalId!,confirmation:true,revision:v.revision,projectRevision:v.projectRevision,requestId:id()});
 expect(result.serviceProfile).toMatchObject({state:'applied',actionsExecuted:true});expect(loadProject(f.pid).services).toEqual({...before.services,hours:'Mardi 9 h – 18 h'});expect(emptySpend()).toEqual(spend);
});
for(const text of ['Change les horaires du mardi : 9 h – 18 h','Modifie mes créneaux de réservation du mardi','Mets mes disponibilités à 9 h – 18 h'])it(text+' → clarification profil/créneaux sans devis ni écriture',async()=>{
 const f=await fixture(),before=loadProject(f.pid),v=await message(f,text);
 expect(v.serviceProfile).toMatchObject({state:'ambiguous',confirmationRequired:false,actionsExecuted:false,providerCalls:0,costEur:0});expect(v.serviceProfile!.message).toMatch(/profil.*créneaux|créneaux.*profil/i);expect(v.action?.state).not.toBe('quote');expect(loadProject(f.pid)).toEqual(before);
});
it('ambiguous phrase then explicit natural clarification stays free and requires a new agreement',async()=>{
 const f=await fixture(),before=loadProject(f.pid);await message(f,'Change les horaires du mardi : 9 h – 18 h');const v=await message(f,'Les horaires du profil sont : Mardi 9 h – 18 h');expect(v.serviceProfile).toMatchObject({state:'proposed',confirmationRequired:true,diff:{after:'Mardi 9 h – 18 h'}});expect(loadProject(f.pid)).toEqual(before);
});
it('a later scheduling ambiguity invalidates an earlier profile agreement without altering bookable settings',async()=>{
 const f=await fixture(),before=loadProject(f.pid),p=await message(f,'Les horaires du profil sont : Mardi 10–18');
 const v=await message(f,'Change les horaires du mardi : 9 h – 18 h','rendez-vous');expect(v.serviceProfile!.state).toBe('ambiguous');
 await expect(submitConversation(f.u,f.c.id,{action:'confirm-service-profile',proposalId:p.serviceProfile!.proposalId!,confirmation:true,revision:v.revision,projectRevision:v.projectRevision,requestId:id()})).rejects.toMatchObject({status:409});expect(loadProject(f.pid)).toEqual(before);
});
it('unquoted chained commands and oversized text cannot become a native write proposal',async()=>{
 const f=await fixture(),before=loadProject(f.pid);for(const value of ['Mardi 9–18 puis supprime les réservations','x'.repeat(401)]){const v=await message(f,'Mets les horaires du profil à : '+value);expect(v.serviceProfile).toMatchObject({state:'ambiguous',confirmationRequired:false,actionsExecuted:false});}expect(loadProject(f.pid)).toEqual(before);
});
