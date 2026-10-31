/** Catalogue, fichiers et worker natifs ; dépendances de génération injectées, aucun HTTP. */
import {it,expect,vi} from 'vitest';
import {account,project} from './conversation209-fixtures';
import {validatedBrand} from './preparation-mission-fixtures';
import {seedCutout} from './image-v2-fixtures';
import {loadProject} from '@/lib/projects';
import {latestVideo}from '@/lib/video-v2/store';
import {createProduct,getProduct,updateProduct} from '@/lib/products/catalog';
import {assetData,getAsset} from '@/lib/library';
import {run} from '@/lib/db';
import {pinImageAsset,imageBindingHash,type ImageBinding} from '@/lib/image-v2/request-binding';
import {approveVideoScenario,sceneApprovalRequest,videoScope} from '@/lib/video-v2/approval';
import {runThreeScenes,runSceneScenario,type ThreeScenesRequest,type ThreeScenesDeps,type ScenePlan} from '@/lib/video-v2/three-scenes';
import {videoByteFixture} from './video-byte-fixture';
async function fixture(){
 const u=await account(),pid=project(u);validatedBrand(pid);const selected=await seedCutout(u.id,pid,'#1144ee'),main=await seedCutout(u.id,pid,'#ab1100');
 const item=createProduct(pid,{title:'Presse de linogravure',description_html:'Une presse manuelle pour plaques de linoléum.',productType:'Presse manuelle',images:[{assetId:selected,alt:''}],options:[{name:'Finition',values:['Nuit']}],variants:[{options:['Nuit'],image:selected}]}),v=item.variants[0];
 const binding:ImageBinding={schema:1,people:'none',product:{productId:item.id,version:item.version,variant:{variantId:v.id,version:v.version}},references:[pinImageAsset(u.id,pid,selected,1)]};
 const req:ThreeScenesRequest&{binding:ImageBinding}={as:'ad',generation:'reference',scenes:1,totalS:6,music:false,binding,request:'Garde deux  espaces.\nLe produit entier.'};
 const scenario:ScenePlan={scenes:[{still:'La presse entière est posée sur une table claire.',motion:'La caméra avance lentement.',title:''}],line:'',cta:''};
 const deps:ThreeScenesDeps={keyframe:vi.fn(async()=>{throw Error('non demandé');}),clip:vi.fn(async()=>{throw Error('non demandé');}),stock:vi.fn(async()=>{throw Error('non demandé');}),directClip:vi.fn(async()=>videoByteFixture()),duration:async()=>6,frames:async()=>[Buffer.from('contrôle fictif')],reviewMedia:vi.fn(async()=>({score:9,sameProduct:true,foreignBrands:[],productAltered:false,characterConsistent:null,offTopic:false,artifacts:false,personVisible:false,issues:[]})),spentMicro:()=>0,render:vi.fn(async()=> 'rendu-simule')};
 const p=loadProject(pid),launch=async()=>runThreeScenes(null,pid,{...req,approval:approveVideoScenario(p,sceneApprovalRequest(req),scenario,1000000).approval},deps);
 return{u,pid,p,main,selected,item,binding,req,scenario,deps,launch};
}
it('le worker transmet la photo exacte de la variante du deuxième produit, jamais la première photo globale',async()=>{
 const f=await fixture(),before=loadProject(f.pid);const r=await f.launch();expect(f.deps.directClip).toHaveBeenCalledTimes(1);const [reference,prompt]=vi.mocked(f.deps.directClip!).mock.calls[0];expect(reference).toEqual(assetData(getAsset(f.selected)!));expect(reference).not.toEqual(assetData(getAsset(f.main)!));expect(prompt).toContain(f.scenario.scenes[0].still);expect(prompt).toContain(f.req.request);expect(loadProject(f.pid)).toEqual(before);expect(getProduct(f.pid,f.item.id)).toEqual(f.item);expect((latestVideo(f.pid,r.docKey)!.doc.meta.editorial!.identity as any).product.name).toBe(f.item.data.title);expect(latestVideo(f.pid,r.docKey)!.doc.meta.editorial!.nativeBinding).toEqual(f.binding);
});
it('le scénariste reçoit la fiche et la variante exactes, sans les faits du produit principal',async()=>{
 const f=await fixture(),writer=vi.fn<NonNullable<ThreeScenesDeps["writePlan"]>>(async()=>f.scenario);await runSceneScenario(null,f.pid,f.req,writer);const [p,s,req,_,pc]=writer.mock.calls[0] as unknown as [ReturnType<typeof loadProject>,{name:string},ThreeScenesRequest,string,{brain:string}];expect(p.product.name).toBe(f.item.data.title);expect(s.name).toBe(f.item.data.title);expect(p.catalog).toEqual([]);expect(p.product.facts).toEqual([expect.objectContaining({value:'Nuit'})]);expect(req.request).toBe(f.req.request);expect(pc.brain).toContain(f.item.data.title);expect(pc.brain).not.toContain("Casque audio");
});
it('l’accord distingue deux produits natifs même quand les scènes sont identiques',async()=>{
 const f=await fixture(),second=createProduct(f.pid,{title:'Autre outil',images:[{assetId:f.main,alt:''}]}),other={...f.req,binding:{...f.binding,product:{productId:second.id,version:second.version},references:[pinImageAsset(f.u.id,f.pid,f.main,1)]}};expect(videoScope(f.p,sceneApprovalRequest(f.req))).not.toBe(videoScope(f.p,sceneApprovalRequest(other)));
});
for(const kind of ['stale-product','stale-photo','foreign-photo','competing-subject','extra-photo','person-photo','edit-request'] as const)it(`refuse ${kind} avant tout média`,async()=>{
 const f=await fixture();
 if(kind==='stale-product')updateProduct(f.pid,f.item.id,{version:f.item.version,title:'Titre modifié'});
 if(kind==='stale-photo')f.binding.references[0].sha256='0'.repeat(64);
 if(kind==='foreign-photo'){const u=await account(),pid=project(u),id=await seedCutout(u.id,pid);f.binding.references=[pinImageAsset(u.id,pid,id,1)];}
 if(kind==='competing-subject')f.req.subject={kind:'product',key:'main'};
 if(kind==='extra-photo')f.req.sceneImages=[{assetId:f.main,use:'reference'}];
 if(kind==='person-photo')run("UPDATE assets SET meta=json_set(meta,'$.hasPerson',json('true')) WHERE id=?",f.selected);
 if(kind==='edit-request')f.binding.edit={source:f.binding.references[0]};
 await expect(f.launch()).rejects.toThrow();expect(f.deps.directClip).not.toHaveBeenCalled();expect(f.deps.render).not.toHaveBeenCalled();
});
it('une prestation inconnue conserve sa fiche exacte sans se transformer en produit ou en métier principal',async()=>{
 const f=await fixture(),u=await account(),pid=project(u,'services');validatedBrand(pid);const s={key:'vitrail',name:'Relevé de fissures sur vitraux anciens',description:'Constat sans démontage.',price:'',duration:'',source:'client'};run('UPDATE projects SET business_json=? WHERE id=?',JSON.stringify({services:[{key:'principal',name:'Réparation de fenêtres'},s]}),pid);const req={...f.req,as:"post" as const,purpose:"site" as const,binding:{schema:1 as const,people:'none' as const,references:[],service:{key:s.key,sha256:imageBindingHash(s)}}},writer=vi.fn<NonNullable<ThreeScenesDeps["writePlan"]>>(async()=>f.scenario);await runSceneScenario(null,pid,req,writer);const p=writer.mock.calls[0][0] as unknown as ReturnType<typeof loadProject>;expect(p.product.name).toBe(s.name);expect(p.product.summary).toBe(s.description);expect(p.services.services).toEqual([s]);expect(loadProject(pid).services.services).toHaveLength(2);
});
it('le mode direct sans photo lit la fiche native sans emprunter une photo globale ni prétendre à une identité vérifiée',async()=>{
 const f=await fixture();f.req.generation='direct';f.binding.references=[];await f.launch();expect(vi.mocked(f.deps.directClip!).mock.calls[0][0]).toBeNull();expect(vi.mocked(f.deps.reviewMedia!).mock.calls[0][1]).toEqual(Buffer.alloc(0));
});
it('une photo explicitement attachée à la prestation est transmise comme référence de lieu et pas comme produit',async()=>{
 const f=await fixture(),u=await account(),pid=project(u,'services');validatedBrand(pid);const s={key:'vitrail',name:'Relevé de fissures sur vitraux anciens',description:'Constat sans démontage.'},photo=await seedCutout(u.id,pid);run('UPDATE projects SET business_json=? WHERE id=?',JSON.stringify({services:[s]}),pid);const binding:ImageBinding={schema:1,people:'none',references:[pinImageAsset(u.id,pid,photo,1)],service:{key:s.key,sha256:imageBindingHash(s)}},req:ThreeScenesRequest&{binding:ImageBinding}={...f.req,as:'post',purpose:'site',binding},p=loadProject(pid);await runThreeScenes(null,pid,{...req,approval:approveVideoScenario(p,sceneApprovalRequest(req),f.scenario,1000000).approval},f.deps);expect(vi.mocked(f.deps.directClip!).mock.calls[0][0]).toEqual(assetData(getAsset(photo)!));
});
