import {it,expect,vi,beforeEach,afterEach} from 'vitest';
import {account,project,sender,emptySpend} from './conversation209-fixtures';
import {openProjectConversation,submitConversation} from '@/lib/orchestrator/conversation';
import {serviceProfileCandidate} from '@/lib/orchestrator/conversation/local-service-profile';
import {loadProject,saveServices,currentTheme,saveThemeVersion} from '@/lib/projects';
import {emptyServiceProfile} from '@/lib/project-types';
import {serviceSpec} from './fixtures';
import {id} from '@/lib/db';
import {hasServiceProfileReceipt} from '@/lib/service-profile-confirmation-client';
beforeEach(()=>{for(const f of ['LOT_A','AI','CONTEXT','SERVICE_PROFILE'])vi.stubEnv('STUDIO_CONVERSATION_'+f,'1');vi.stubGlobal('fetch',vi.fn(()=>{throw Error('NO_PROVIDER');}));});
afterEach(()=>{expect(fetch).not.toHaveBeenCalled();vi.unstubAllGlobals();vi.unstubAllEnvs();});
const cases=[
 ['Peux-tu modifier le prix de la prestation du profil « Diagnostic » à « 75 € » ?','service-price','75 €'],
 ['Pourrais-tu remplacer la durée de la prestation du profil « Diagnostic » par « 45 min », s’il te plaît ?','service-duration','45 min'],
 ['Peux-tu renommer la prestation « Diagnostic » en « Diagnostic précis » ?','service-name','Diagnostic précis'],
 ['Peux-tu modifier la description de la prestation du profil « Diagnostic » à « Faits fournis » ?','service-description','Faits fournis'],
 ['Peux-tu mettre le téléphone du profil à « 01 23 45 67 89 » ?','phone','01 23 45 67 89'],
 ['Pourrais-tu remplacer les horaires du profil par « Mardi 10–18 » ?','hours','Mardi 10–18'],
] as const;
async function fixture(){const u=await account(),pid=project(u,'services'),c=openProjectConversation(u,pid);saveServices(pid,{...emptyServiceProfile(),phone:'0102030405',hours:'Lundi 09–17',services:[{name:'Diagnostic',description:'Diagnostic fourni',price:'50 €',duration:'30 min'}]});saveThemeVersion(pid,serviceSpec('atelier-nuance' as never),'Réservation fictive','user');const send=sender(u,c.id);return{u,pid,c,say:(text:string)=>send({action:'message',text,context:{tab:'produit',target:null}})};}
it.each(cases)('routes a polite exact request through the existing native agreement: %s',async(text,field,after)=>{expect(serviceProfileCandidate(text)).toBe(true);const f=await fixture(),before=loadProject(f.pid),theme=currentTheme(f.pid),spend=emptySpend(),v=await f.say(text);expect(v.serviceProfile).toMatchObject({state:'proposed',field,diff:{after},confirmationRequired:true,costEur:0,providerCalls:0});expect(loadProject(f.pid)).toEqual(before);const saved=await submitConversation(f.u,f.c.id,{action:'confirm-service-profile',proposalId:v.serviceProfile!.proposalId,confirmation:true,revision:v.revision,projectRevision:v.projectRevision,requestId:id()});expect(hasServiceProfileReceipt(saved)).toBe(true);const read=loadProject(f.pid),expected=structuredClone(before.services);if(field==='hours')expected.hours=after;else if(field==='phone')expected.phone=after;else{const key=field==='service-name'?'name':field==='service-price'?'price':field==='service-duration'?'duration':'description';expected.services[0][key]=after;if(key==='name')expected.services[0].contentAliases=[...new Set([...(before.services.services[0].contentAliases??[]),before.services.services[0].name,after])];}expect(read.services).toEqual(expected);expect(read.servicesVersion).toBe(before.servicesVersion+1);expect(currentTheme(f.pid)).toEqual(theme);expect(emptySpend()).toEqual(spend);});
it.each(['Peux-tu modifier le prix de la prestation du profil « Diagnostic » à « 75 € » puis réserve pour demain ?','Peux-tu modifier le prix de la prestation du profil « Diagnostic » à « 75 € » et publie mon site ?'])('does not erase mixed-command suffixes: %s',async text=>{const f=await fixture(),before=loadProject(f.pid),v=await f.say(text);expect(v.serviceProfile).toMatchObject({state:'ambiguous',confirmationRequired:false,actionsExecuted:false});expect(loadProject(f.pid)).toEqual(before);});
it('preserves a literal question mark and polite words inside the exact supplied description',async()=>{const f=await fixture(),v=await f.say('Peux-tu modifier la description de la prestation du profil « Diagnostic » à « Besoin d’aide ? Contactez-nous, s’il te plaît » ?');expect(v.serviceProfile).toMatchObject({state:'proposed',diff:{after:'Besoin d’aide ? Contactez-nous, s’il te plaît'}});});
