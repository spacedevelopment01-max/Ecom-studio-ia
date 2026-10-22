/** Explicit provider doubles for the real worker proof. Never imported by production code. */
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {all,now} from '../../src/lib/db';
import {getStrategyState} from '../../src/lib/marketing-strategy';
import {researchOfferDigest} from '../../src/lib/marketing-strategy/proposals';
import {analyzeLocally} from '../../src/lib/preparation/brief';
import {documentStamp,readClientDocuments} from '../../src/lib/preparation/documents';
import {applyWordingDeep,loadWordingRules} from '../../src/lib/client-wording';
import {getSetting} from '../../src/lib/settings';
import {recordCall} from '../../src/lib/ai/trace';
import {realDependencies} from '../../src/lib/preparation/deps';
import {validateResearch} from '../../src/lib/preparation/research-validation';
import type {Research,Angle} from '../../src/lib/preparation/types';
import type {Project} from '../../src/lib/projects';
import type {JobContext} from '../../src/lib/jobs';
export function installSimulatedProviders(){
 const root=process.env.DATA_DIR;
 if(process.env.ANGLES_STUDIO_PROOF!=="1"||!root||path.dirname(root)!==os.tmpdir()||!path.basename(root).startsWith("ecs-angles-studio-")||!fs.existsSync(path.join(root,".angles-studio-proof")))throw new Error("Simulation providers require the isolated proof launcher");
 realDependencies.simulation=true;
 realDependencies.inspect=async(p,b,ctx)=>{
  readClientDocuments(p.id);
  const result=analyzeLocally(b.input);
  return {...result,provenance:'simulation',documentStamp:documentStamp(p.id),execution:{provider:'simulated',model:'fixture',usageKey:`${ctx.job.id}:brief`,vision:!!b.input.photoIds.length,at:now()}};
 };
 realDependencies.research=async(p,brief,ctx)=>{
  const scenario=getSetting(`proof.scenario.${p.id}`);
  if(scenario==='failed')throw new Error('Simulation : la recherche a échoué. Aucun nouvel angle disponible ; les acquis sont conservés.');
  const result=simulatedResearch(p,ctx);
  if(scenario==='partial')result.sources=result.sources.slice(0,2);
  return validateResearch(result);
 };
}
function simulatedResearch(p:Project,ctx:JobContext):Research{
 const projectId=p.id,at=now(),usageKey=`${ctx.job.id}:research`;
 getStrategyState(projectId);
 const sourceKinds=['offer','offer','competitors','competitors','customers','customers','sector','sector'] as const;
 const sources=sourceKinds.map((category,i)=>{const text=`Maquette documentaire ${String.fromCharCode(65+i)} pour ${p.product.name}. Des situations, choix et limites sont décrits pour vérifier le raccord informatique uniquement. Source fictive distincte ${i}.`;return{id:`s${i}`,url:`https://source-${i}.example.test/offre`,title:`Source fictive ${i+1}`,excerpt:text,consultedAt:at,status:'consulted' as const,provenance:'simulation' as const,category,contentHash:createHash('sha256').update(text).digest('hex'),relevance:{accepted:true,reason:'Fixture, pas une validation de pertinence réelle'}};});
 const rows=[
  ['usage','Consulter un ouvrage à son bureau','Lecteurs qui suivent un passage avec le livre devant eux','Organiser la consultation d’une page sans promettre un confort mesuré','Présenter un livre posé sur le support et les réglages documentés','Une page ouverte devant vous.'],
  ['reassurance','Comparer les informations disponibles','Acheteurs méthodiques examinant caractéristiques conditions limites','Évaluer sereinement les éléments documentés avant toute décision','Mettre les caractéristiques connues en regard des questions restantes','Voir les détails qui comptent pour choisir'],
  ['expression','Choisir une place pour ses lectures','Personnes qui organisent un espace personnel de consultation','Imaginer une association visuelle cohérente avec un bureau déjà installé','Composer une présentation centrée sur l’organisation du bureau','Une place à imaginer pour vos lectures.'],
  ['discovery','Découvrir progressivement cette catégorie','Nouveaux curieux explorant objets méthodes vocabulaire découverte','Acquérir des repères simples dans un univers encore inconnu','Expliquer une notion différente par séquence pédagogique illustrée','Découvrir les repères pour commencer'],
  ['generalist','Présenter l’ensemble de votre offre','Visiteurs explorant librement catalogue prestations possibilités','Parcourir toutes les informations sans privilégier une motivation précise','Présenter une vue complète et factuelle de l’offre et de ses limites','Toutes les informations pour envisager cette offre'],
 ];
 if(p.business==='services'){
  rows[0]=['usage','Observer avant de réorganiser','Directions qui envisagent une transformation des bureaux','Comprendre les usages actuels avant de décider des changements','Expliquer le rôle du diagnostic avant les décisions d’aménagement','Comprendre les lieux avant de décider.'];
  rows[2]=['expression','Faire émerger les besoins de l’équipe','Responsables qui souhaitent recueillir la parole des collaborateurs','Préparer un échange collectif structuré sans promettre un résultat','Présenter le déroulement de l’atelier participatif et la restitution','Partir des usages de votre équipe.'];
 }
 if(p.settings.language==='en')for(const row of rows){row[1]=row[0]==='generalist'?'Present your entire offer':`A different approach: ${row[0]}`;row[5]=row[0]==='expression'?'Explore your own world':'Discover the details before choosing';}
 const old=new Map(all<{angle_id:string;angle_json:string}>('SELECT angle_id,angle_json FROM marketing_strategy_versions WHERE project_id=? ORDER BY version',projectId).map(r=>[r.angle_id,JSON.parse(r.angle_json)]));
 const facts=p.product.facts.filter(f=>f.status==='confirmed').map(f=>`${f.label} : ${f.value}`),usage=p.product.facts.find(f=>f.label==='Usage')?.value??p.product.summary;
 const angles:Angle[]=rows.map(([key,title,audience,motivation,communicationChange,message])=>({id:key,title,audience:old.get(key)?.audience??audience,motivation:old.get(key)?.motivation??motivation,communicationChange,tone:({usage:'Concret et pratique',reassurance:'Précis et documenté',expression:'Évocateur et personnel',discovery:'Pédagogique et progressif',generalist:'Factuel et ouvert'} as Record<string,string>)[key],visualDirection:communicationChange,positioning:`${communicationChange}. ${key==='usage'?usage:p.product.category}`,message:`${message} — ${p.product.name}`,arguments:facts.length?facts:[p.product.summary],objections:[{objection:audience,answer:p.product.summary}],reason:`Hypothèse de fixture fondée sur les observations s0 et s2 pour ${p.product.name}, pas une conclusion réelle.`,sourceIds:['s0','s2'],hypothesis:true}));
 const r:Research=applyWordingDeep({formatVersion:3,offerDigest:researchOfferDigest(p),sources,observations:sources.map(s=>({sourceId:s.id,quote:s.excerpt})),angles,recommendedId:'usage',recommendation:'Dans cette maquette, les observations s0 et s2 orientent la comparaison vers les usages. Aucune qualité marketing démontrée.',recommendationSourceIds:['s0','s2'],legalAvailability:'not_checked',coverage:{target:10,consulted:8,status:'covered',missingCategories:[],limits:['Maquette — non issue d’une recherche réelle']},execution:{provider:'simulated',model:'fixture',usageKey,vision:false,at}},loadWordingRules(projectId));
 recordCall({userId:p.userId,projectId:p.id,jobId:ctx.job.id,task:'strategy',provider:'simulated',requestedModel:'fixture',servedModel:'fixture',usageKey,unit:'tokens',status:'ok',costMicro:0,estimated:true,httpAttempts:0});
 return r;
}
