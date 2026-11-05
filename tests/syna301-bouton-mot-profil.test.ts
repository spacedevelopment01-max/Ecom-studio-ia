/**
 * Recette « bouton » (convergence #422) : sur téléphone, « Remplace le texte du bouton de cette section par
 * « Recevoir mon devis encre telephone » » partait vers le profil d'activité (mot « téléphone » lu DANS la valeur citée)
 * et répondait « Modification du profil indisponible ». La revue de Codex a relevé le même défaut pour le stock ; un
 * relevé de tous les aiguilleurs placés avant celui du site l'a aussi trouvé pour le calendrier, le choix du thème et
 * les animations. Les mots-clés de ces domaines se lisent désormais hors des valeurs citées : le texte voulu d'une section
 * reste une retouche gratuite du site ; les vraies demandes de ces domaines ne changent pas.
 */
import {it,expect,beforeEach,afterEach,vi} from 'vitest';
import {localSiteFixture} from './conversation284-b1-fixtures';
import {submitConversation} from '@/lib/orchestrator/conversation';
import {serviceProfileCandidate} from '@/lib/orchestrator/conversation/local-service-profile';
import {localStockCandidate} from '@/lib/orchestrator/conversation/local-stock';
import {localCalendarCandidate} from '@/lib/orchestrator/conversation/local-calendar';
import {localThemeChoiceCandidate} from '@/lib/orchestrator/conversation/local-theme-choice';
import {localSiteMotionCandidate} from '@/lib/orchestrator/conversation/local-site-motion';
import {localSiteCandidate} from '@/lib/orchestrator/conversation/local-site';
import {contextView,submitContext} from '@/lib/orchestrator/conversation/context-session';
import {currentTheme} from '@/lib/projects';
import {id} from '@/lib/db';
const providers=vi.fn(()=>{throw Error('NO_PROVIDER');});
beforeEach(()=>{for(const flag of ['LOT_A','AI','CONTEXT','LOCAL_SITE'])vi.stubEnv('STUDIO_CONVERSATION_'+flag,'1');vi.stubGlobal('fetch',providers);});
afterEach(()=>{expect(providers).not.toHaveBeenCalled();vi.unstubAllGlobals();vi.unstubAllEnvs();});
const DOMAINS={serviceProfileCandidate,localStockCandidate,localCalendarCandidate,localThemeChoiceCandidate,localSiteMotionCandidate};
const VALUES=['Recevoir mon devis encre telephone','Appelez-nous par téléphone','Voir nos horaires','Écrivez-nous par e-mail','Voir le prix des prestations','Stock disponible','Voir le stock','Voir le calendrier','Changer de thème','Animation garantie'];
const FRAMES=['Remplace le texte du bouton de cette section par « %s »','Change le titre de cette section par « %s »','Change le titre de cette section par “%s”','Change le titre de cette section par "%s"'];

it('une valeur citée ne fait jamais d’une retouche de section une demande d’un autre domaine',()=>{
 for(const frame of FRAMES)for(const v of VALUES){
  const text=frame.replace('%s',v);
  for(const [name,candidate] of Object.entries(DOMAINS))expect(candidate(text),`${name} : ${text}`).toBe(false);
 }
 expect(localSiteCandidate('Remplace le texte du bouton de cette section par « Voir le stock »')).toBe(true);
 expect(localSiteCandidate('Change le titre de cette section par « Animation garantie »')).toBe(true);
});

it('les vraies demandes de chaque domaine restent reconnues (mot-clé hors des guillemets)',()=>{
 for(const t of ['Remplace le téléphone du profil par « 06 12 34 56 78 »','Mets le prix de la prestation du profil « Diagnostic » à « 75 € »','Remplace les horaires d’ouverture par : lundi 9 h-18 h','Renomme cette prestation en « Bilan »'])expect(serviceProfileCandidate(t),t).toBe(true);
 for(const t of ['Mets le stock de ce produit à 12','Mets le stock de cette variante à 12','Désactive le suivi du stock de ce produit'])expect(localStockCandidate(t),t).toBe(true);
 for(const t of ['Déplace ma prochaine publication au dimanche à 2h30','Change la date de la publication « Lancement » au 12 novembre'])expect(localCalendarCandidate(t),t).toBe(true);
 for(const t of ['Choisis le thème Rive pour mon site','Choisis le thème « Onde » pour mon site'])expect(localThemeChoiceCandidate(t),t).toBe(true);
 for(const t of ['Désactive les animations du site','Désactive la parallaxe','Coupe les animations'])expect(localSiteMotionCandidate(t),t).toBe(true);
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

for(const catalogue of [false,true])it(`titre désigné « Stock disponible » / « Animation garantie », catalogue ${catalogue?'ouvert':'fermé'} : carte gratuite du site`,async()=>{
 if(catalogue)vi.stubEnv('STUDIO_CONVERSATION_CATALOGUE','1');
 const f=await localSiteFixture('products');
 for(const value of ['Stock disponible','Animation garantie']){
  f.select(true);
  const p=await submitConversation(f.u,f.c.id,f.message(`Change le titre de cette section par « ${value} »`));
  expect(p.localStock).toBeUndefined();expect(p.localSiteMotion).toBeUndefined();
  expect(p.localSite?.state,value).toBe('proposed');
  expect(JSON.stringify(p.localSite)).toContain(value);
 }
});
