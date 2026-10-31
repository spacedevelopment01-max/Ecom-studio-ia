/** Acquisition/validation explicitement SIMULÉES. Jamais importé par le moteur applicatif. */
import {seedSourcedAnglesForTest} from '../tests/sourced-strategy-fixture';
import {chooseGeneralistForTest} from '../tests/strategy-choice-fixture';
import {localBrand} from '../src/lib/engine/local';
import {loadProject,saveProduct,saveBrand,saveServices,saveStrategy,saveCatalog} from '../src/lib/projects';
import {commitState,draft,stateOf} from '../src/lib/preparation/store';
import {strategyOf} from '../src/lib/preparation/engine';
import {saveAsset} from '../src/lib/library';
import sharp from 'sharp';
import {createProduct} from '../src/lib/products/catalog';
export async function seedOriginalProject(pid:string,scene:{id?:string;offer:string;description:string;name:string;business:'products'|'services';color:string}){
 const p=loadProject(pid);saveProduct(pid,{...p.product,name:scene.offer,nameStatus:'provided',summary:scene.description,summaryStatus:'provided',price:{amount:scene.business==='products'?12900:null,currency:'EUR',status:scene.business==='products'?'confirmed':'unknown'},variants:scene.business==='products'?[{name:'Format',values:['Standard','Grand']}]:[]});
 if(scene.business==='services')saveServices(pid,{...p.services,services:[{name:scene.offer,description:scene.description,price:'',duration:''}],email:'recette@example.invalid',contactMode:'quote',contactModes:['quote']});
 if(scene.id==='multi'){saveCatalog(pid,[],'multi');createProduct(pid,{title:scene.offer,description_html:`<p>${scene.description}</p>`,status:'active',price:12900,options:[{name:'Format',values:['Standard','Grand']}]});createProduct(pid,{title:'Poinçon de reliure de recette',description_html:'<p>Deuxième outil distinct du catalogue fictif.</p>',status:'active',price:2900});}
 const brand=localBrand(loadProject(pid).product,scene.name,loadProject(pid)).brand;brand.palette={primary:scene.color,secondary:'#e7e3d9',accent:'#bba76a',light:'#faf9f5',dark:'#202d29'};saveBrand(pid,brand);
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="1000"><rect width="1400" height="1000" fill="#ede9e0"/><circle cx="700" cy="430" r="270" fill="${scene.color}"/><path d="M530 430h340M700 260v340" stroke="#dccb9e" stroke-width="35"/><text x="70" y="900" font-size="32" fill="#202d29">ILLUSTRATION TECHNIQUE — PAS UNE PHOTO CLIENT</text></svg>`;
 const asset=await saveAsset({projectId:pid,userId:p.userId,name:'illustration-original.webp',mime:'image/webp',data:await sharp(Buffer.from(svg)).webp().toBuffer(),origin:'upload',role:'hero',meta:{testFixture:211,illustration:true}});
 seedSourcedAnglesForTest(pid);chooseGeneralistForTest(pid);
 const state=stateOf(pid)!;state.stages.research!.data.selectedId='generalist';saveStrategy(pid,strategyOf(state.stages.research!.data));
 commitState(pid,state.revision,s=>{s.stages.research!.data=state.stages.research!.data;s.stages.research!.status='approved';draft(s,'brand',{proposal:brand,logoCandidates:[],notes:[],provenance:'simulation'} as never);s.stages.brand!.status='approved';draft(s,'content',{documents:[],pages:[],provenance:'simulation'} as never);s.stages.content!.status='approved';});
 return{assetId:asset.id,illustration:true,description:scene.description};
}
