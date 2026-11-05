/**
 * Recette « bouton » (convergence #422) : sur téléphone, « Remplace le texte du bouton de cette section par
 * « Recevoir mon devis encre telephone » » partait vers le profil d'activité (mot « téléphone » lu DANS la valeur citée)
 * et répondait « Modification du profil indisponible ». Les mots-clés du profil se lisent désormais hors des valeurs
 * citées : le texte voulu d'un bouton reste une retouche gratuite du site ; les vraies demandes du profil ne changent pas.
 */
import {it,expect,beforeEach,afterEach,vi} from 'vitest';
import {localSiteFixture} from './conversation284-b1-fixtures';
import {submitConversation} from '@/lib/orchestrator/conversation';
import {serviceProfileCandidate} from '@/lib/orchestrator/conversation/local-service-profile';
import {contextView,submitContext} from '@/lib/orchestrator/conversation/context-session';
import {currentTheme} from '@/lib/projects';
import {id} from '@/lib/db';
const providers=vi.fn(()=>{throw Error('NO_PROVIDER');});
beforeEach(()=>{for(const flag of ['LOT_A','AI','CONTEXT','LOCAL_SITE'])vi.stubEnv('STUDIO_CONVERSATION_'+flag,'1');vi.stubGlobal('fetch',providers);});
afterEach(()=>{expect(providers).not.toHaveBeenCalled();vi.unstubAllGlobals();vi.unstubAllEnvs();});
const VALUES=['Recevoir mon devis encre telephone','Appelez-nous par téléphone','Voir nos horaires','Écrivez-nous par e-mail','Voir le prix des prestations'];

it('une valeur citée ne fait jamais d’une retouche de bouton une demande du profil',()=>{
 for(const v of VALUES)expect(serviceProfileCandidate(`Remplace le texte du bouton de cette section par « ${v} »`),v).toBe(false);
 // Les demandes réelles du profil restent reconnues : le mot-clé est hors des guillemets.
 expect(serviceProfileCandidate('Remplace le téléphone du profil par « 06 12 34 56 78 »')).toBe(true);
 expect(serviceProfileCandidate('Mets le prix de la prestation du profil « Diagnostic » à « 75 € »')).toBe(true);
 expect(serviceProfileCandidate('Remplace les horaires d’ouverture par : lundi 9 h-18 h')).toBe(true);
 expect(serviceProfileCandidate('Renomme cette prestation en « Bilan »')).toBe(true);
});

for(const profile of [false,true])it(`bouton désigné sur un projet de services, profil ${profile?'ouvert':'fermé'} : carte gratuite du site, aucun appel`,async()=>{
 if(profile)vi.stubEnv('STUDIO_CONVERSATION_SERVICE_PROFILE','1');
 const f=await localSiteFixture('services'),section='cta_banner_2';
 expect(currentTheme(f.pid)!.spec.templates.index.sections[section]?.settings.button_label).toBeTruthy();
 for(const value of ['Recevoir mon devis encre telephone','Appelez-nous par téléphone']){
  const v=contextView(f.u,f.c.id);
  submitContext(f.u,f.c.id,{action:'select',revision:v.revision,requestId:id(),context:{projectId:f.pid,tab:'boutique',target:{kind:'theme-field',versionId:currentTheme(f.pid)!.version.id,template:'index',section,key:'button_label',pagePath:'/'}}} as never);
  const p=await submitConversation(f.u,f.c.id,f.message(`Remplace le texte du bouton de cette section par « ${value} »`));
  expect(p.serviceProfile).toBeUndefined();
  expect(p.localSite?.state,value).toBe('proposed');
  expect(JSON.stringify(p.localSite)).toContain(value);
 }
});
