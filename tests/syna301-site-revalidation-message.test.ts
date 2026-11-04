/**
 * Capture HEUREN (#301) : après sa propre retouche enregistrée, la carte Site affichait « La cible ou sa version a
 * changé » avec des identifiants internes. Elle dit désormais simplement que la retouche est enregistrée ; une
 * modification faite ailleurs garde l'alerte, en mots ; le bouton « Revalider la cible actuelle » reste le même.
 */
import {it,expect,beforeEach,afterEach,vi} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {localSiteFixture} from './conversation284-b1-fixtures';
import {submitConversation,conversationView} from '@/lib/orchestrator/conversation';
import {currentTheme,saveThemeVersion} from '@/lib/projects';
import {id} from '@/lib/db';
import {ConversationLocalSite} from '@/components/studio/conversation-local-site';
const providers=vi.fn(()=>{throw Error('NO_PROVIDER');});
beforeEach(()=>{for(const flag of ['LOT_A','AI','CONTEXT','LOCAL_SITE'])vi.stubEnv('STUDIO_CONVERSATION_'+flag,'1');vi.stubGlobal('fetch',providers);});
afterEach(()=>{expect(providers).not.toHaveBeenCalled();vi.unstubAllGlobals();vi.unstubAllEnvs();});
const confirmation={controller:null,state:{busy:false,error:'',uncertain:false}} as never;
const html=(view:any)=>renderToStaticMarkup(createElement(ConversationLocalSite,{view,confirmation,busy:false,selectionMatches:true,onResume:()=>{}}));
const visible=(markup:string)=>markup.replace(/<details[\s\S]*?<\/details>/g,'');
it('après sa propre retouche enregistrée : message simple, aucun identifiant visible, revalidation toujours possible',async()=>{
 const f=await localSiteFixture('products');f.select(false);
 const p=await submitConversation(f.u,f.c.id,f.message('Change le titre par « Offrez ce moment. »'));
 expect(p.localSite?.state).toBe('proposed');
 const before=html(p);expect(visible(before)).toContain('Cible : ');expect(visible(before)).not.toMatch(/index\/|· heading/);expect(before).toContain('Détail technique');
 await submitConversation(f.u,f.c.id,{action:'confirm-local',proposalId:p.localSite!.proposalId!,confirmation:true,revision:p.revision,projectRevision:p.projectRevision,requestId:id()});
 const v=conversationView(f.u,f.c.id),out=html(v);
 expect(out).toContain('Résultat enregistré');
 expect(v.activeContext?.presentation?.needsRevalidation).toBe(true);{
  expect(out).toContain('data-syna-site-revalidation="own-receipt"');
  expect(visible(out)).toContain('Retouche enregistrée : la section désignée a maintenant une nouvelle version.');
  expect(out).not.toContain('La cible ou sa version a changé');
  expect(visible(out)).not.toMatch(/Version désignée|version actuelle :/);
  expect(out).toContain('Revalider la cible actuelle');
 }
});
it('modification faite ailleurs : alerte en mots, sans identifiant visible, même bouton de revalidation',async()=>{
 const f=await localSiteFixture('products');f.select(false);
 const p=await submitConversation(f.u,f.c.id,f.message('Change le titre par « Offrez ce moment. »'));
 const manual=structuredClone(currentTheme(f.pid)!.spec);manual.templates.index.sections[f.section].settings.heading='Titre humain à préserver';saveThemeVersion(f.pid,manual,'Modification manuelle fictive','user');
 await expect(submitConversation(f.u,f.c.id,{action:'confirm-local',proposalId:p.localSite!.proposalId!,confirmation:true,revision:p.revision,projectRevision:p.projectRevision,requestId:id()})).rejects.toThrow();
 const v=conversationView(f.u,f.c.id),out=html(v);
 expect(v.activeContext?.presentation?.needsRevalidation).toBe(true);{
  expect(out).toContain('data-syna-site-revalidation="external"');
  expect(visible(out)).toContain('La section a changé depuis votre désignation');
  expect(visible(out)).not.toMatch(/Version désignée/);
 }
 expect(currentTheme(f.pid)!.spec.templates.index.sections[f.section].settings.heading).toBe('Titre humain à préserver');
});
it('revue Codex : retouche SYNA enregistrée PUIS modification faite ailleurs → alerte de modification externe, pas « Retouche enregistrée »',async()=>{
 const f=await localSiteFixture('products');f.select(false);
 const p=await submitConversation(f.u,f.c.id,f.message('Change le titre par « Offrez ce moment. »'));
 await submitConversation(f.u,f.c.id,{action:'confirm-local',proposalId:p.localSite!.proposalId!,confirmation:true,revision:p.revision,projectRevision:p.projectRevision,requestId:id()});
 const manual=structuredClone(currentTheme(f.pid)!.spec);manual.templates.index.sections[f.section].settings.heading='Titre humain ensuite';saveThemeVersion(f.pid,manual,'Modification manuelle fictive','user');
 const v=conversationView(f.u,f.c.id),out=html(v);
 expect(out).toContain('Résultat enregistré');
 expect(v.activeContext?.presentation?.needsRevalidation).toBe(true);
 expect(out).toContain('data-syna-site-revalidation="external"');
 expect(visible(out)).toContain('La section a changé depuis votre désignation');
 expect(visible(out)).not.toContain('Retouche enregistrée : la section désignée');
});
