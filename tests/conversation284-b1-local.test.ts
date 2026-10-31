import {it,expect,vi,beforeEach,afterEach} from 'vitest';
const jar=vi.hoisted(()=>({token:''}));vi.mock('next/headers',()=>({cookies:async()=>({get:()=>jar.token?{value:jar.token}:undefined,set:()=>{},delete:()=>{}})}));
import * as route from '@/app/api/studio-agent/conversations/[cid]/route';
import * as quotes from '@/lib/preparation/quote';
import * as cognition from '@/lib/orchestrator/conversation/intelligence';
import * as billing from '@/lib/billing';
import {localSiteFixture} from './conversation284-b1-fixtures';
import {historicalProject,businessFingerprints} from './conversation284-fixtures';
import {emptySpend,account} from './conversation209-fixtures';
import {openProjectConversation,submitConversation,conversationView} from '@/lib/orchestrator/conversation';
import {currentTheme,saveThemeVersion,themeVersion} from '@/lib/projects';
import {id,run,one,now} from '@/lib/db';
import {sha256} from '@/lib/secrets';
import {contextView,submitContext} from '@/lib/orchestrator/conversation/context-session';
import {addCategory,createItem} from '@/lib/contenus/carte';
import {type ThemeSpec} from '@/lib/theme/spec';
beforeEach(()=>{jar.token='';for(const k of ['LOT_A','AI','CONTEXT','LOCAL_SITE'])vi.stubEnv('STUDIO_CONVERSATION_'+k,'1');vi.stubGlobal('fetch',vi.fn(()=>{throw Error('Fournisseur interdit');}));});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();vi.unstubAllEnvs();});
function login(uid:string){jar.token=id();run('INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)',sha256(jar.token),uid,now()+3600000,now());}
const req=(data:unknown)=>new Request('http://localhost/api/local',{method:'POST',headers:{origin:'http://localhost','content-type':'application/json'},body:JSON.stringify(data)});
const ctx=(cid:string)=>({params:Promise.resolve({cid})});
function confirm(f:Awaited<ReturnType<typeof localSiteFixture>>,proposalId:string){const v=conversationView(f.u,f.c.id);return{action:'confirm-local',proposalId,confirmation:true,revision:v.revision,projectRevision:v.projectRevision,requestId:id()};}
async function change(f:Awaited<ReturnType<typeof localSiteFixture>>,mutate:(spec:ThemeSpec)=>void){const spec=structuredClone(currentTheme(f.pid)!.spec);mutate(spec);return saveThemeVersion(f.pid,spec,'Édition manuelle fictive','user');}

it.each(['products','services'] as const)('%s : titre exact puis déplacement, versions et retry, 0 IA/devis/portefeuille',async business=>{
 const f=await localSiteFixture(business);f.select();const spend=emptySpend(),old=f.cur.spec,quote=vi.spyOn(quotes,'createQuote'),cognitiveQuote=vi.spyOn(cognition,'createCognitiveQuote'),cognitiveConsent=vi.spyOn(cognition,'confirmCognitiveQuote'),reserve=vi.spyOn(billing,'reserve'),classify=vi.fn(()=>{throw Error('Classificateur interdit');});
 const prepared=await submitConversation(f.u,f.c.id,f.message('Remplace le titre de cette section par “Découvrez notre collection”'),{classify});expect(prepared.localSite?.state).toBe('proposed');expect(currentTheme(f.pid)!.version.id).toBe(f.cur.version.id);
 const cmd=confirm(f,prepared.localSite!.proposalId!);const [done,retry]=await Promise.all([submitConversation(f.u,f.c.id,cmd),submitConversation(f.u,f.c.id,cmd)]);expect(retry).toEqual(done);expect(done.localSite?.state).toBe('applied');expect(done.localSite?.financialConsent).toBe(false);expect(currentTheme(f.pid)!.spec.templates.index.sections[f.section].settings.heading).toBe('Découvrez notre collection');expect(themeVersion(f.pid,f.cur.version.id)!.spec).toEqual(old);
 expect(currentTheme(f.pid)!.spec.templates.index.order).toEqual(old.templates.index.order);expect(currentTheme(f.pid)!.spec.files).toEqual(old.files);expect(done.localSite!.restore!.versionId).toBe(f.cur.version.id);
 f.select(false);const proposal=await submitConversation(f.u,f.c.id,f.message(`Place cette section après ${f.anchor}`));expect(proposal.localSite?.state,proposal.localSite?.message).toBe('proposed');const moved=await submitConversation(f.u,f.c.id,confirm(f,proposal.localSite!.proposalId!));expect(moved.localSite?.state).toBe('applied');const order=currentTheme(f.pid)!.spec.templates.index.order;expect(order.indexOf(f.section)).toBe(order.indexOf(f.anchor)+1);expect(currentTheme(f.pid)!.spec.templates.index.sections).toEqual(themeVersion(f.pid,done.localSite!.version!.id)!.spec.templates.index.sections);
 expect(emptySpend()).toEqual(spend);expect(quote).not.toHaveBeenCalled();expect(cognitiveQuote).not.toHaveBeenCalled();expect(cognitiveConsent).not.toHaveBeenCalled();expect(reserve).not.toHaveBeenCalled();expect(classify).not.toHaveBeenCalled();expect(fetch).not.toHaveBeenCalled();
});

it.each(['titre absent','titre identique','destination absente','destination ambiguë','interpages','section verrouillée','titre trop long','texte sélectionné trop long','contenu métier'] as const)('%s : précision/refus gratuit sans effet',async mode=>{
 const f=await localSiteFixture(mode==='contenu métier'?'services':'products');
 if(mode==='titre absent')await change(f,s=>{const sec=s.templates.index.sections[f.section];sec.type='unknown-type-native';});
 if(mode==='section verrouillée')await change(f,s=>{s.locks.push(`index:${f.section}`);});
 if(mode==='texte sélectionné trop long')await change(f,s=>{s.templates.index.sections[f.section].settings.heading='X'.repeat(9000);});
 if(mode==='destination ambiguë')await change(f,s=>{for(const sid of s.templates.index.order.filter(x=>x!==f.section).slice(0,2))s.templates.index.sections[sid].settings.heading='Avis clients';});
 if(mode==='contenu métier'){const category=addCategory(f.pid,'Carte fictive');createItem(f.pid,{categoryId:category.id,name:'Plat acquis',price:12});await change(f,s=>{s.templates.index.sections[f.section].type='ts-menu';});}
 const move=['destination absente','destination ambiguë','interpages'].includes(mode);f.select(!move&&mode!=='titre absent'&&mode!=='contenu métier');
 const before=businessFingerprints(),spend=emptySpend(),text=move?`Place cette section avant ${mode==='destination ambiguë'?'avis clients':mode==='interpages'?'/contact':'introuvable'}`:mode==='titre identique'?`Remplace le titre par “${currentTheme(f.pid)!.spec.templates.index.sections[f.section].settings.heading}”`:`Remplace le titre par “${mode==='titre trop long'?'X'.repeat(501):'Nouveau titre'}”`;
 const r=await submitConversation(f.u,f.c.id,f.message(text));expect(['ambiguous','error']).toContain(r.localSite?.state);expect(r.localSite?.actionsExecuted).toBe(false);expect(businessFingerprints()).toEqual(before);expect(emptySpend()).toEqual(spend);
});

it('demande paraphrasée ambiguë reste gratuite sans classificateur ni IA',async()=>{
 const f=await localSiteFixture();f.select();vi.stubEnv('STUDIO_CONVERSATION_AI','0');const classify=vi.fn(()=>{throw Error('IA interdite');}),before=businessFingerprints();const r=await submitConversation(f.u,f.c.id,f.message('Change le titre joliment'),{classify});expect(r.localSite?.state).toBe('error');expect(classify).not.toHaveBeenCalled();expect(businessFingerprints()).toEqual(before);
});

it('modification N→N+1 entre proposition et confirmation : HTTP 409, préservation et reprise A2',async()=>{
 const f=await localSiteFixture();f.select();const r=await submitConversation(f.u,f.c.id,f.message('Remplace le titre par “Titre gratuit”')),cmd=confirm(f,r.localSite!.proposalId!);await change(f,s=>{s.templates.index.sections[f.section].settings.heading='Titre humain à préserver';});login(f.u.id);const before=businessFingerprints();
 const response=await route.POST(req(cmd),ctx(f.c.id));expect(response.status).toBe(409);expect((await response.json()).context.state).toBe('conflict');expect(businessFingerprints()).toEqual(before);
 const v=contextView(f.u,f.c.id);submitContext(f.u,f.c.id,{action:'revalidate',revision:v.revision,requestId:id(),expectedReference:v.reference,currentReference:v.recovery!.current!.reference,confirmation:true});const p=await submitConversation(f.u,f.c.id,f.message('Remplace le titre par “Titre relu”'));expect((await submitConversation(f.u,f.c.id,confirm(f,p.localSite!.proposalId!))).localSite?.state).toBe('applied');
});

it('deux confirmations concurrentes distinctes : une seule version et un conflit explicite',async()=>{
 const f=await localSiteFixture();f.select();const p=await submitConversation(f.u,f.c.id,f.message('Remplace le titre par “Une seule application”')),cmd=confirm(f,p.localSite!.proposalId!),before=one<{n:number}>('SELECT COUNT(*) n FROM theme_versions WHERE project_id=?',f.pid)!.n;
 const results=await Promise.allSettled([submitConversation(f.u,f.c.id,cmd),submitConversation(f.u,f.c.id,{...cmd,requestId:id()})]);expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect(one<{n:number}>('SELECT COUNT(*) n FROM theme_versions WHERE project_id=?',f.pid)!.n).toBe(before+1);
});

it.each(['client étranger','droits révoqués','drapeau fermé','A1 lecture seule'] as const)('%s : refus y compris avant retry',async mode=>{
 if(mode==='A1 lecture seule'){const f=await historicalProject('products'),c=openProjectConversation(f.u,f.pid),v=conversationView(f.u,c.id),before=businessFingerprints();await expect(submitConversation(f.u,c.id,{action:'confirm-local',proposalId:'forged',confirmation:true,revision:v.revision,projectRevision:null,requestId:id()})).rejects.toMatchObject({code:'conversation_existing_read_only'});expect(businessFingerprints()).toEqual(before);return;}
 const f=await localSiteFixture();f.select();const p=await submitConversation(f.u,f.c.id,f.message('Remplace le titre par “Titre protégé”')),cmd=confirm(f,p.localSite!.proposalId!);
 if(mode==='droits révoqués')run("UPDATE subscriptions SET status='canceled' WHERE project_id=?",f.pid);if(mode==='drapeau fermé')vi.stubEnv('STUDIO_CONVERSATION_LOCAL_SITE','0');const before=businessFingerprints();
 const user=mode==='client étranger'?await account():f.u;
 const expected=businessFingerprints();await expect(submitConversation(user,f.c.id,cmd)).rejects.toMatchObject({status:mode==='client étranger'?404:mode==='droits révoqués'?402:404});expect(businessFingerprints()).toEqual(expected);
});

it('avant une section identifiable par son titre unique : diff limité à l’ordre natif',async()=>{
 const f=await localSiteFixture();await change(f,s=>{s.templates.index.sections[f.anchor].settings.heading='Avis clients uniques';});
 // Placer d'abord la source après la destination afin de vérifier un vrai déplacement inverse.
 await change(f,s=>{const a=s.templates.index.order.filter(x=>x!==f.section);a.splice(a.indexOf(f.anchor)+1,0,f.section);s.templates.index.order=a;});
 f.select(false);const before=currentTheme(f.pid)!.spec,p=await submitConversation(f.u,f.c.id,f.message('Place cette section au-dessus des avis clients uniques'));
 const q=p;expect(q.localSite?.state).toBe('proposed');await submitConversation(f.u,f.c.id,confirm(f,q.localSite!.proposalId!));const after=currentTheme(f.pid)!.spec;expect(after.templates.index.order.indexOf(f.section)+1).toBe(after.templates.index.order.indexOf(f.anchor));expect(after.templates.index.sections).toEqual(before.templates.index.sections);
});

it('retry après application : droits révoqués contrôlés avant restitution du reçu',async()=>{
 const f=await localSiteFixture();f.select();const p=await submitConversation(f.u,f.c.id,f.message('Remplace le titre par “Titre livré”')),cmd=confirm(f,p.localSite!.proposalId!);await submitConversation(f.u,f.c.id,cmd);run("UPDATE subscriptions SET status='canceled' WHERE project_id=?",f.pid);const before=businessFingerprints();await expect(submitConversation(f.u,f.c.id,cmd)).rejects.toMatchObject({status:402});expect(businessFingerprints()).toEqual(before);
});

it('paraphrase reconnue comme demande locale sans clé IA, et absence de sélection : précision gratuite',async()=>{
 const f=await localSiteFixture(),quote=vi.spyOn(quotes,'createQuote'),classify=vi.fn(()=>{throw Error('Aucun classificateur');});
 const a=await submitConversation(f.u,f.c.id,f.message('Peux-tu remplacer le titre avec un texte meilleur ?'),{classify});expect(a.localSite?.state).toBe('ambiguous');const b=await submitConversation(f.u,f.c.id,f.message('Remplace le titre par “Titre sans cible”'));expect(b.localSite?.state).toBe('ambiguous');expect(quote).not.toHaveBeenCalled();expect(classify).not.toHaveBeenCalled();expect(fetch).not.toHaveBeenCalled();
});

it('nouvelle sélection invalide la proposition ; ancien accord ne peut être réutilisé',async()=>{
 const f=await localSiteFixture();f.select();const p=await submitConversation(f.u,f.c.id,f.message('Remplace le titre par “Ancienne proposition”'));f.select(false);const before=businessFingerprints();await expect(submitConversation(f.u,f.c.id,confirm(f,p.localSite!.proposalId!))).rejects.toMatchObject({code:'conversation_local_stale'});expect(businessFingerprints()).toEqual(before);
});

it('commande gratuite sur ancien projet A1 : message seulement, aucune Préparation ni version',async()=>{
 const f=await historicalProject('services'),c=openProjectConversation(f.u,f.pid),v=conversationView(f.u,c.id),before=businessFingerprints();const r=await submitConversation(f.u,c.id,{action:'message',text:'Remplace le titre de cette section par “Titre A1 interdit”',revision:v.revision,projectRevision:null,requestId:id()});expect(r.recovery?.state).toBe('read-only');expect(r.localSite).toBeUndefined();expect(r.message).toContain('Aucun contenu');expect(businessFingerprints()).toEqual(before);
});
