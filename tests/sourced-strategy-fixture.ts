/** Explicit simulation of acquired research for regression fixtures, never imported by application code. */
import {createHash} from 'node:crypto';
import {id,now,run,one,all} from '@/lib/db';
import {loadProject,remember} from '@/lib/projects';
import {getStrategyState,proposeStrategies} from '@/lib/marketing-strategy';
import {researchOfferDigest} from '@/lib/marketing-strategy/proposals';
import {stateOf,inputHash} from '@/lib/preparation/store';
import {analyzeLocally} from '@/lib/preparation/brief';
import {documentStamp} from '@/lib/preparation/documents';
import {applyWordingDeep,loadWordingRules} from '@/lib/client-wording';
import type {Research,State,Angle} from '@/lib/preparation/types';
export function seedSourcedAnglesForTest(projectId:string){
 getStrategyState(projectId);const p=loadProject(projectId),at=now(),usageKey=`simulated-research:${id()}`;
 const previous=stateOf(projectId),s:State=structuredClone(previous??{schemaVersion:1,projectId,revision:0,createdAt:at,updatedAt:at,stages:{}});
 const b=analyzeLocally({description:p.product.summary,offerName:p.product.name,brandName:p.brand?.name??'',target:'Public fictif de recette',constraints:'Simulation explicite, aucune enquête réelle',business:p.business,photoIds:[],referenceUrls:[],price:'',services:p.services});
 Object.assign(b,{profile:p.product,services:p.services,provenance:'simulation',missing:[],documentStamp:documentStamp(p.id)});
 s.stages.brief={data:b,status:'approved',inputHash:'',candidateId:id(),approvedAt:at};s.stages.brief.inputHash=inputHash(s,'brief');s.simulation=true;
 const sourceKinds=['offer','offer','competitors','competitors','customers','customers','sector','sector'] as const;
 const sources=sourceKinds.map((category,i)=>{const text=`Maquette documentaire ${String.fromCharCode(65+i)} pour ${p.product.name}. Des situations, choix et limites sont décrits pour vérifier le raccord informatique uniquement. Source fictive distincte ${i}.`;return{id:`s${i}`,url:`https://source-${i}.example.test/offre`,title:`Source fictive ${i+1}`,excerpt:text,consultedAt:at,status:'consulted' as const,provenance:'simulation' as const,category,contentHash:createHash('sha256').update(text).digest('hex'),relevance:{accepted:true,reason:'Fixture, pas une validation de pertinence réelle'}};});
 const rows=[
  ['usage','Choisir selon son trajet','Cyclistes quotidiens avec sacoches et chemin urbain','Comprendre le rangement en déplacement avant de partir','Montrer la préparation du trajet et les objets transportés','Préparer ses affaires avec des repères concrets'],
  ['reassurance','Comparer les informations disponibles','Acheteurs méthodiques examinant caractéristiques conditions limites','Évaluer sereinement les éléments documentés avant toute décision','Mettre les caractéristiques connues en regard des questions restantes','Voir les détails qui comptent pour choisir'],
  ['expression','Trouver sa place chez soi','Amateurs de décoration cherchant harmonie matières couleurs','Imaginer une association personnelle sans engagement prématuré','Composer une présentation visuelle centrée sur les associations possibles','Une pièce à envisager dans votre univers'],
  ['discovery','Découvrir progressivement cette catégorie','Nouveaux curieux explorant objets méthodes vocabulaire découverte','Acquérir des repères simples dans un univers encore inconnu','Expliquer une notion différente par séquence pédagogique illustrée','Découvrir les repères pour commencer'],
  ['generalist','Présenter l’ensemble de votre offre','Visiteurs explorant librement catalogue prestations possibilités','Parcourir toutes les informations sans privilégier une motivation précise','Présenter une vue complète et factuelle de l’offre et de ses limites','Toutes les informations pour envisager cette offre'],
 ];
 if(p.settings.language==='en')for(const row of rows){row[1]=row[0]==='generalist'?'Present your entire offer':`A different approach: ${row[0]}`;row[5]=row[0]==='expression'?'Explore your own world':'Discover the details before choosing';}
 const old=new Map(all<{angle_id:string;angle_json:string}>('SELECT angle_id,angle_json FROM marketing_strategy_versions WHERE project_id=? ORDER BY version',projectId).map(r=>[r.angle_id,JSON.parse(r.angle_json)]));
 const facts=p.product.facts.filter(f=>f.status==='confirmed').map(f=>`${f.label} : ${f.value}`),usage=p.product.facts.find(f=>f.label==='Usage')?.value??p.product.summary;
 const angles:Angle[]=rows.map(([key,title,audience,motivation,communicationChange,message])=>({id:key,title,audience:old.get(key)?.audience??audience,motivation:old.get(key)?.motivation??motivation,communicationChange,tone:({usage:'Concret et pratique',reassurance:'Précis et documenté',expression:'Évocateur et personnel',discovery:'Pédagogique et progressif',generalist:'Factuel et ouvert'} as Record<string,string>)[key],visualDirection:communicationChange,positioning:`${communicationChange}. ${key==='usage'?usage:p.product.category}`,message:`${message} — ${p.product.name}`,arguments:facts.length?facts:[p.product.summary],objections:[{objection:audience,answer:p.product.summary}],reason:`Hypothèse de fixture fondée sur les observations s0 et s2 pour ${p.product.name}, pas une conclusion réelle.`,sourceIds:['s0','s2'],hypothesis:true}));
 const r:Research=applyWordingDeep({formatVersion:3,offerDigest:researchOfferDigest(p),sources,observations:sources.map(s=>({sourceId:s.id,quote:s.excerpt})),angles,recommendedId:'usage',recommendation:'Dans cette maquette, les observations s0 et s2 orientent la comparaison vers les usages. Aucune qualité marketing démontrée.',recommendationSourceIds:['s0','s2'],legalAvailability:'not_checked',coverage:{target:10,consulted:8,status:'covered',missingCategories:[],limits:['Maquette — non issue d’une recherche réelle']},execution:{provider:'simulated',model:'fixture',usageKey,vision:false,at}},loadWordingRules(projectId));
 run('INSERT INTO ai_calls(id,created_at,user_id,project_id,task,provider,requested_model,unit,usage_key,status) VALUES(?,?,?,?,?,?,?,?,?,?)',`fixture_research_${id()}`,at,p.userId,projectId,'strategy','simulated','fixture','tokens',usageKey,'ok');
 s.stages.research={data:r,status:'draft',inputHash:'',candidateId:id()};s.stages.research.inputHash=inputHash(s,'research');
 remember(projectId,{kind:'artifact',key:'preparation.current',value:JSON.stringify(s),source:'local'});
 return proposeStrategies(projectId);
}
