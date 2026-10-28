/** Rôles de l'agent commun, à la demande ; aucun processus/portefeuille/mémoire autonome. */
import {z} from 'zod';
import type {Scope} from '../../brain/views';
import type {StepKind} from '../planner';
import {applyResult,loadPlan,planId,savePlan,STEP_TEMPLATES,type TaskPlan} from '../planner';
import {withTrace} from '../../ai/trace';
export const AgentRoleSchema=z.enum(['principal','strategy','identity','media','site','communication','quality']);
export type AgentRole=z.infer<typeof AgentRoleSchema>;
type Specialist={label:string;scope:Exclude<Scope,'all'>;step:StepKind;instruction:string};
export const SPECIALISTS:Record<AgentRole,Specialist>={
  principal:{label:'Agent principal',scope:'brand',step:'understand',instruction:'Comprendre et guider le projet ; ne solliciter un spécialiste que pour un besoin précis. Aucune équipe automatique.'},
  strategy:{label:'Stratégie et marketing',scope:'brand',step:'brand_strategy',instruction:'Conseiller sur le positionnement à partir des sources déjà présentes. Sans recherche consultée, signaler les hypothèses et le besoin de recherche ; ne jamais inventer concurrence, personas ou marché.'},
  identity:{label:'Identité artistique',scope:'logo',step:'brand_strategy',instruction:'Conseiller sur une identité cohérente avec les choix verrouillés et le vocabulaire du client. Ne pas prétendre dessiner un logo ou créer une planche ; proposer puis faire valider.'},
  media:{label:'Médias',scope:'image',step:'image_generate',instruction:'Conseiller une intention de photo/vidéo fidèle aux médias du projet. Ne jamais prétendre inspecter une photo non transmise au modèle, générer une image ou représenter une personne sans autorisation.'},
  site:{label:'Site et rédaction',scope:'shop_copy',step:'copy',instruction:'Conseiller une composition et une rédaction propres à cette offre. Préserver les parcours fonctionnels et les compositions acquises. Ne pas annoncer un thème créé, un contrôle visuel ou un CMS testé sans outil et reçu.'},
  communication:{label:'Communication et SEO',scope:'social',step:'social',instruction:'Conseiller des messages et objectifs cohérents avec la marque. Un service reste une offre globale sur le site ; les angles de campagne attendent une recherche sourcée. Ne publier, programmer ni envoyer par ce dialogue.'},
  quality:{label:'Contrôle qualité',scope:'qc',step:'quality_review',instruction:'Signaler les écarts observables dans les données réellement fournies, avec preuves. Ne pas attribuer de note visuelle sans image inspectée ni qualifier un modèle réel à partir de fixtures. Une proposition de critique ne déclenche aucune relance.'},
};
export const specialistsEnabled=()=>process.env.STUDIO_CONVERSATION_SPECIALISTS==='1';
/** Une seule étape cognitive dans le Planner natif ; aucune exécution créative ni boucle cachée. */
export async function withSpecialistPlan<T>(projectId:string|null,userId:string,jobId:string,role:AgentRole,work:()=>Promise<T>):Promise<T>{
  if(!projectId)return work(); // Avant création, le job natif est déjà le support durable, sans projet fictif.
  const requestKey=`agent:${jobId}`,pid=planId(projectId,requestKey),kind=SPECIALISTS[role].step;
  let plan=loadPlan(pid);
  if(!plan){const template=STEP_TEMPLATES[kind];plan={id:pid,projectId,userId,requestKey,intents:[],status:'active',warnings:['Avis cognitif uniquement ; aucun livrable métier exécuté.'],steps:[{id:`${pid}:role`,kind,task:'agent_conversation',dependencies:[],after:[],input:{role},requiredContext:template.scope,deliverable:null,qualityTarget:null,costClass:template.cost,status:'pending',explicit:true,attempts:0,providerFailures:0}]};savePlan(plan);}
  const native=plan as TaskPlan,step=native.steps[0];
  return withTrace({planId:pid,stepId:step.id},async()=>{try{const result=await work();if(step.status!=='done'){applyResult(native,step.id,{ownedRetries:true,note:'Réponse structurée acquise ; avis seulement, aucune action métier.'});savePlan(native);}return result;}catch(e){applyResult(native,step.id,{failed:'Réponse cognitive non acquise ; arrêt sans relance automatique.'});savePlan(native);throw e;}});
}
