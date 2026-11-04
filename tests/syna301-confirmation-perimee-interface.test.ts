/**
 * #301 « SYNA complète », lot 1 — garde de l'interface : défaut vu dans le Studio compilé (recette
 * scripts/syna301-confirmation-perimee-recette.ts) : un accord resté en mémoire pour une ancienne proposition laissait la
 * nouvelle carte « incertaine » (Confirmer grisé, « Réessayer la même confirmation » trompeur). Chaque carte gratuite relit
 * l'état dès qu'une proposition s'affiche avec un accord incertain ; la carte du site abandonne l'accord d'une autre
 * proposition dès cette relecture, sans aucune écriture.
 */
import fs from 'node:fs';
import {expect,it,vi} from 'vitest';
import {createLocalSiteConfirmation} from '@/lib/local-site-confirmation-client';
import type {ConversationView} from '@/lib/orchestrator/conversation/contract';

it('les neuf cartes gratuites branchent la relecture sur leur proposition affichée et leur clé de mémoire',()=>{
 const hook=fs.readFileSync('src/components/studio/use-stale-confirmation.ts','utf8');
 // Réponse perdue pour la proposition affichée : aucune relecture automatique (le contrôle obligatoire exige « Réessayer »).
 expect(hook).toContain('if(stored&&stored!==proposal)void controller.refresh();');
 const hooks={'use-local-files-confirmation.ts':'localFiles','use-local-business-content-confirmation.ts':'localBusinessContent','use-local-site-requests-confirmation.ts':'localRequests','use-service-profile-confirmation.ts':'serviceProfile','use-local-ad-document-confirmation.ts':'localAdDocument','use-local-site-confirmation.ts':'localSite','use-local-seo-confirmation.ts':'localSeo','use-local-pages-confirmation.ts':'localPages','use-local-stock-confirmation.ts':'localStock','use-local-calendar-confirmation.ts':'localCalendar','use-local-theme-choice-confirmation.ts':'localThemeChoice','use-local-site-motion-confirmation.ts':'localSiteMotion','use-local-theme-restore-confirmation.ts':'localThemeRestore','use-local-folders-confirmation.ts':'localFolders','use-local-file-restore-confirmation.ts':'localFileRestore'};
 for(const [f,field] of Object.entries(hooks))expect(fs.readFileSync('src/components/studio/'+f,'utf8')).toContain(`useStaleConfirmation(controller,state.uncertain,view?.${field},view?`);
});

it('carte du site : la relecture abandonne l’accord d’une autre proposition, sans écrire',async()=>{
 const view={id:'c',projectId:'p',revision:5,projectRevision:2,localSiteExecution:{enabled:true},localSite:{schema:'syna-local-site-1',state:'proposed',command:'faq',proposalId:'nouvelle',scope:{label:'Section',pagePaths:['/'],template:'index',section:'s',labels:{}},diff:{before:'a',after:'b'},message:'',financialConsent:false,costEur:0,providerCalls:0,confirmationRequired:true}} as unknown as ConversationView;
 const map=new Map([['syna-free-confirmation:c',JSON.stringify({action:'confirm-local',proposalId:'ancienne',confirmation:true,revision:3,projectRevision:1,requestId:'r'})]]);
 const storage={getItem:(k:string)=>map.get(k)??null,setItem:(k:string,v:string)=>{map.set(k,v);},removeItem:(k:string)=>{map.delete(k);}};
 const posts:unknown[]=[];
 const fetch=vi.fn(async(_u:unknown,init?:RequestInit)=>{if(init?.body)posts.push(init.body);return Response.json(view);});
 const c=createLocalSiteConfirmation({conversationId:'c',fetch:fetch as unknown as typeof globalThis.fetch,view:()=>view,onView:()=>{},onState:()=>{},onApplied:async()=>{},storage});
 expect(c.getState().uncertain).toBe(true);
 await c.refresh();
 expect(c.getState().uncertain).toBe(false);
 expect(map.size).toBe(0);
 expect(posts).toEqual([]);
});
