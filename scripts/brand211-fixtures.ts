/** Préconditions acquises explicitement SIMULÉES. Ce fichier n’est jamais utilisé par le Studio. */
import {localBrand} from '../src/lib/engine/local';
import {loadProject,saveProduct,saveBrand,saveServices} from '../src/lib/projects';
import {seedSourcedAnglesForTest} from '../tests/sourced-strategy-fixture';
import {chooseGeneralistForTest} from '../tests/strategy-choice-fixture';
import {approve} from '../src/lib/preparation/engine';
import {stateOf} from '../src/lib/preparation/store';
export type BrandScene={id:string;business:'products'|'services';offer:string;description:string;name:string};
export function seedBrandScene(pid:string,scene:BrandScene){
 const p=loadProject(pid);saveProduct(pid,{...p.product,name:scene.offer,nameStatus:'provided',summary:scene.description,summaryStatus:'provided',category:scene.business==='products'?'Outillage':'Accompagnement',facts:[{key:'description',label:'Description client',value:scene.description,status:'confirmed',source:'user'}]});
 if(scene.business==='services')saveServices(pid,{...p.services,services:[{key:'principal',name:scene.offer,description:scene.description,source:'client'}],contactMode:'quote',email:'recette@example.invalid'});
 saveBrand(pid,localBrand(loadProject(pid).product,scene.name,loadProject(pid)).brand);
 seedSourcedAnglesForTest(pid);chooseGeneralistForTest(pid);approve(pid,stateOf(pid)!.revision,'research',{choiceId:'generalist'});
 return{brand:loadProject(pid).brand,researchStatus:stateOf(pid)!.stages.research!.status};
}
export function simulatedBrandResponse(scene:BrandScene){return{name:scene.name,nameStatus:'provided',alternatives:[],tagline:'Des repères pour votre projet.',positioning:scene.description,audience:'Public décrit dans la fiche du projet de recette',personality:['Précis','Sobre'],tone:{voice:'Vouvoiement, phrases concrètes.',do:['Expliquer les informations fournies.'],dont:['Inventer une certification ou une garantie.']},palette:{primary:'#24443d',secondary:'#e6dfd0',accent:'#9b663c',light:'#faf8f2',dark:'#16231f'},fonts:{heading:'inter_n7',body:'inter_n4'},direction:'souple',directionReason:'Référence de structure du double de test, aucun thème créé.',logo:{concept:'Aucune image de logo dans cette recette',family:'Inter',weight:600,italic:false,case:'asis',tracking:0.02,layout:'wordmark',emblem:'none'},story:'[SIMULATION] '+scene.description,values:[{title:'Clarté',text:'Présenter les caractéristiques et les inconnues séparément.'}],strategy:{audience:[],angles:[],pillars:[],keyMessages:[]}};}
