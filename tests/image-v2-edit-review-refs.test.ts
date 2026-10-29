/** Vraie préparation de la relecture native ; JSON fournisseur simulé, aucun HTTP ni jugement esthétique réel. */
import {it,expect,vi} from 'vitest';
vi.mock('@/lib/ai/llm',async orig=>({...await orig()as object,llmJson:vi.fn(),llmConfigured:()=>true}));
import {llmJson} from '@/lib/ai/llm';
import {realImageDeps} from '@/lib/image-v2/deps';
import {buildBrief} from '@/lib/image-v2/brief';
import {dHash,hamming} from '@/lib/image-v2/quality';
import {createUser} from '@/lib/auth';
import {loadProject} from '@/lib/projects';
import {saveAsset} from '@/lib/library';
import {seedImageFixture} from './image-v2-fixtures';
import {mockImage,review} from './image-v2-mock';
it('envoie candidat/source/style/produit au contrôle sans appeler la source « photo produit jointe en deuxième »',async()=>{
 const u=await createUser(`edit-review-${Date.now()}@example.test`,'test-password-review','Test'),pid=seedImageFixture(u.id,'hightech'),p=loadProject(pid),source=await mockImage(251),styleBytes=await mockImage(259),productBytes=await mockImage(287),style=await saveAsset({projectId:pid,userId:u.id,name:'style.jpg',mime:'image/jpeg',data:styleBytes,origin:'upload'}),product=await saveAsset({projectId:pid,userId:u.id,name:'product.jpg',mime:'image/jpeg',data:productBytes,origin:'upload'});
 const brief=buildBrief(p,{kind:'retouch',aspect:'16:9',instructions:'Éclaircis seulement le fond.',productFidelity:true,references:['source-passee-au-controle',style.id,product.id],nativeEdit:{sourceAssetId:'source-passee-au-controle',styleAssetId:style.id,productAssetId:product.id}},{peopleAllowed:false});
 vi.mocked(llmJson).mockResolvedValue(review(9,{personVisible:false,sourceAltered:false,requestedChangeApplied:true})as never);const native=realImageDeps(p,{jobId:null,aiActive:true,singleReviewCall:true});await native.review(brief,await mockImage(319),source,'test-review','generated');
 const[call,schema,options]=vi.mocked(llmJson).mock.calls[0];expect(options).toMatchObject({strict:true});expect(call.images).toHaveLength(4);expect(call.images![1].label).toContain('source');expect(call.images![2].label).toContain('style');expect(call.images![3].label).toContain('produit');const originals=await Promise.all([source,styleBytes,productBytes].map(dHash));for(let i=0;i<3;i++){const h=await dHash(call.images![i+1].data),distances=originals.map(original=>hamming(h,original));expect(distances.indexOf(Math.min(...distances))).toBe(i);}
 expect(call.prompt).toContain('SOURCE is image 2');expect(call.prompt).not.toContain('REAL product is attached second');expect(call.prompt).toContain('"sourceAltered"');expect(call.prompt).toContain('"requestedChangeApplied"');const sample=review(9,{personVisible:false});expect(schema.safeParse(sample).success).toBe(false);
});
