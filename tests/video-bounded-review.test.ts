/** Contrôle natif, requête et schéma réels ; réponse de dépendance injectée sans HTTP. */
import {it,expect,vi} from 'vitest';
const fake=vi.hoisted(()=>({review:{} as Record<string,unknown>,calls:[] as {call:any;options:any}[]}));
vi.mock('@/lib/ai/llm',async original=>({...await original<any>(),llmJson:async(call:any,schema:any,options:any)=>{fake.calls.push({call,options});return schema.parse(fake.review);}}));
import {account,project} from './conversation209-fixtures';
import {validatedBrand} from './preparation-mission-fixtures';
import {seedCutout} from './image-v2-fixtures';
import {createProduct} from '@/lib/products/catalog';
import {pinImageAsset,type ImageBinding} from '@/lib/image-v2/request-binding';
import {realThreeScenesDeps,type ThreeScenesRequest} from '@/lib/video-v2/three-scenes';
import {assetData,getAsset} from '@/lib/library';
const complete={score:9,sameProduct:true,foreignBrands:[],textCorrect:null,productAltered:false,characterConsistent:null,offTopic:false,artifacts:false,personVisible:false,issues:[]};
async function fixture(){const u=await account(),pid=project(u);validatedBrand(pid);const a=await seedCutout(u.id,pid),p=createProduct(pid,{title:'Presse de linogravure',images:[{assetId:a,alt:''}]}),binding:ImageBinding={schema:1,people:'none',product:{productId:p.id,version:p.version},references:[pinImageAsset(u.id,pid,a,1)]},request:ThreeScenesRequest&{binding:ImageBinding}={as:'ad',generation:'reference',binding};fake.calls=[];fake.review={...complete};return{deps:realThreeScenesDeps(null,{userId:u.id,projectId:pid},{aiText:true,request} as Parameters<typeof realThreeScenesDeps>[2]&{request:ThreeScenesRequest}),image:assetData(getAsset(a)!)};}
for(const field of ['personVisible','productAltered','offTopic','artifacts','foreignBrands','sameProduct','textCorrect'])it(`un contrôle borné sans ${field} est refusé sans valeur de secours`,async()=>{const f=await fixture();delete fake.review[field];await expect(f.deps.reviewMedia!([f.image],f.image,'Scène exacte à vérifier.','qc')).rejects.toThrow();});
it('transmet la vraie offre dans le Brain et exige un seul appel JSON strict sans réparer une réponse invalide',async()=>{const f=await fixture(),text='Plan entier.\nDeux  espaces.';expect(await f.deps.reviewMedia!([f.image],f.image,text,'qc')).toEqual(complete);expect(fake.calls).toHaveLength(1);expect(fake.calls[0].options).toEqual({strict:true});expect(fake.calls[0].call.context).toContain('Presse de linogravure');expect(fake.calls[0].call.prompt).toContain(text);});
