/** #301 : intention native jusqu'au devis/worker/adaptateur, aucune requête fournisseur réelle. */
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {createUser} from '@/lib/auth';
import {loadProject} from '@/lib/projects';
import {grantProjectPlan} from '@/lib/project-subscriptions';
import {setJsonSetting} from '@/lib/settings';
import {MEDIA_MODELS} from '@/lib/ai/media-models';
import {all,run} from '@/lib/db';
import {seedImageFixture} from './image-v2-fixtures';
import {mockDeps,review} from './image-v2-mock';
import * as briefModule from '@/lib/image-v2/brief';
import {buildBrief,briefHash,generationPrompt,generationRequestPrompt,BRIEF_VERSION,PRODUCT_FIDELITY_FR} from '@/lib/image-v2/brief';
import {stillLifePrompt} from '@/lib/image-v2/still-life';
import {NO_PEOPLE_FR} from '@/lib/people-policy';
import {loadWordingRules} from '@/lib/client-wording';
import * as providers from '@/lib/ai/media-providers';
import {qwenImageBody} from '@/lib/ai/alibaba';
import {NativeImageRequestSchema,quoteNativeImageGeneration,checkedNativeImageApproval,runNativeImageGeneration} from '@/lib/image-v2/native-approval';
import {enqueue,claimNext,JobContext,completeJob} from '@/lib/jobs';
import {reviewPrompt} from '@/lib/image-v2/deps';
vi.mock('@/lib/ai/config',async orig=>({...await orig<object>(),activeProviderKey:()=> 'SIMULATED ONLY'}));
beforeEach(()=>{vi.stubGlobal('fetch',vi.fn(()=>{throw Error('Aucun fournisseur réel autorisé');}));setJsonSetting('billing.markup',1);setJsonSetting('ai.media.models',Object.fromEntries(MEDIA_MODELS.filter(m=>m.kind==='image').map(m=>[`${m.provider}:${m.model}`,{enabled:true,confirmedAt:Date.now()}])));});
afterEach(()=>{run("UPDATE jobs SET status='cancelled' WHERE status IN ('queued','running')");vi.unstubAllGlobals();vi.restoreAllMocks();});
const topic='Un atelier vide de céramique, établi en bois et lumière naturelle.';
async function fixture(){const u=await createUser(`image-topic-${crypto.randomUUID()}@example.invalid`,'Fictif-seulement','Recette');run("UPDATE users SET role='client' WHERE id=?",u.id);const pid=seedImageFixture(u.id,'hightech');grantProjectPlan(pid,'dominer');return{u:{...u,role:'client' as const},pid,p:loadProject(pid)};}
it('un sujet précis remplace le décor automatique fermé au lieu d’ajouter des objets contradictoires',async()=>{
 const f=await fixture(),b=buildBrief(f.p,{kind:'ambiance',aspect:'16:9',topic},{peopleAllowed:false}),prompt=generationPrompt(b);
 expect(prompt).toContain(topic);expect(prompt).not.toMatch(/carnet fermé|bureau en noyer|exactement trois objets|Aucun objet supplémentaire/);expect(prompt).toContain(NO_PEOPLE_FR);expect(prompt).toContain('Format 16:9');expect(b.people).toBe(false);
});
it('des instructions seules remplacent aussi la scène fermée concurrente',async()=>{
 const f=await fixture(),instructions='Vue large d’un atelier de céramique vide, poteries sur des étagères.\nConserve deux  espaces.',b=buildBrief(f.p,{kind:'ambiance',aspect:'16:9',instructions},{peopleAllowed:false}),prompt=generationPrompt(b);
 expect(prompt).toContain(instructions);expect(prompt).not.toMatch(/carnet fermé|bureau en noyer|exactement trois objets/);expect(prompt).toContain('Les restrictions de fidélité et de personnes');
});
it('deux sujets natifs identiques sur160caractères gardent leur fin et des empreintes distinctes',async()=>{
 const f=await fixture(),prefix='Un atelier de céramique vide et lumineux. '.repeat(4).slice(0,160),a=prefix+'A'.repeat(40),b=prefix+'B'.repeat(40),ba=buildBrief(f.p,{kind:'ambiance',topic:a}),bb=buildBrief(f.p,{kind:'ambiance',topic:b});
 expect(a).toHaveLength(200);expect(ba.subject).toContain(a);expect(ba.fr!.subject).toContain(a);expect(generationPrompt(ba)).toContain(a);expect(generationPrompt(bb)).toContain(b);expect(briefHash(ba)).not.toBe(briefHash(bb));expect(NativeImageRequestSchema.safeParse({topic:a}).success).toBe(true);expect(NativeImageRequestSchema.safeParse({topic:a+'x'}).success).toBe(false);
});
it('sans demande explicite le prompt et la version du brief fermé restent identiques',async()=>{
 const f=await fixture(),b=buildBrief(f.p,{kind:'ambiance',aspect:'16:9'},{peopleAllowed:false});expect(b.version).toBe(BRIEF_VERSION);expect(b.fr!.scene).toBeTruthy();expect(generationPrompt(b)).toBe(stillLifePrompt(b.fr!.scene!,{aspect:b.format.aspect,zone:b.format.textZone}));
 const blank=buildBrief(f.p,{kind:'ambiance',aspect:'16:9',topic:'  ',instructions:'  '},{peopleAllowed:false});expect(generationPrompt(blank)).toBe(generationPrompt(b));expect(briefHash(blank)).toBe(briefHash(b));
});
it('le brief explicite ne réutilise pas une ancienne clé de scène fermée, même pour un sujet court',async()=>{
 const f=await fixture(),b=buildBrief(f.p,{kind:'ambiance',topic},{peopleAllowed:false}),legacy={...b,version:BRIEF_VERSION};delete (legacy as any).requestedTopic;expect(briefHash(b)).not.toBe(briefHash(legacy));
});
it('fidélité et personnes restent obligatoires sur le produit référencé avec sujet et instructions',async()=>{
 const f=await fixture(),b=buildBrief(f.p,{kind:'usage_scene',topic,references:['reference-produit'],instructions:'Vue large ; ne pas modifier les détails du casque.'},{peopleAllowed:false}),prompt=generationPrompt(b);
 expect(prompt).toContain(topic);expect(prompt).toContain('Vue large ; ne pas modifier les détails du casque.');expect(prompt).toContain(PRODUCT_FIDELITY_FR);expect(prompt).toContain(NO_PEOPLE_FR);expect(b.productFidelity).toBe(true);expect(b.references).toEqual(['reference-produit']);
});
it('un cadrage explicite garde ses quatre champs et le français des adaptateurs Qwen',async()=>{
 const f=await fixture(),shot={composition:'Établi au premier plan.',lighting:'Lumière naturelle latérale.',framing:'Vue large horizontale.',environment:'Atelier de céramique vide.'},b=buildBrief(f.p,{kind:'ambiance',aspect:'16:9',topic,shot},{peopleAllowed:false}),prompt=generationRequestPrompt(b,loadWordingRules(f.pid));
 expect(b.version).toBe(BRIEF_VERSION+'.directed2');const legacy={...b};delete legacy.requestedTopic;expect(briefHash(b)).toBe(briefHash(legacy));
 for(const value of Object.values(shot))expect(prompt).toContain(value);const wrapped=providers.ambiancePrompt({prompt,aspect:'16:9'}),body=qwenImageBody({model:'qwen-image-plus',prompt:wrapped,aspect:'16:9',references:[],people:false});expect(JSON.stringify(body)).toContain(topic);expect(wrapped).not.toMatch(/\bthe real product|objects only|world of|without the product\b/);
});
it('le prompt devisé égale celui du worker et des adaptateurs ; sujet suivant non réemployé à tort',async()=>{
 const f=await fixture(),prefix='Un atelier de céramique vide et lumineux. '.repeat(4).slice(0,160),a=prefix+'A'.repeat(40),b=prefix+'B'.repeat(40),operationId=crypto.randomUUID(),request={kind:'ambiance' as const,aspect:'16:9' as const,topic:a,count:1,allowGenerate:true};
 const original=providers.photoRequestMaxMicro,spy=vi.spyOn(providers,'photoRequestMaxMicro').mockImplementation((...args)=>original(...args)),q=await quoteNativeImageGeneration(f.u,f.pid,operationId,request),quotedPrompts=spy.mock.calls.map(c=>c[1].prompt);
 expect(quotedPrompts).toHaveLength(2);expect(new Set(quotedPrompts).size).toBe(1);expect(quotedPrompts[0]).toContain(a);expect(all('SELECT id FROM jobs WHERE project_id=?',f.pid)).toHaveLength(0);
 const j=enqueue({userId:f.u.id,projectId:f.pid,type:'image.v2',label:'Intention synthétique',payload:{projectId:f.pid,request,nativeImageQuote:{operationId,token:q.approvalToken},costCapMicro:q.maximumMicro},maxAttempts:1}),claimed=claimNext(['image.v2'])!;expect(claimed.id).toBe(j.id);
 const fake=mockDeps({reviewFor:()=>review(9)}),r=await runNativeImageGeneration(new JobContext(claimed),fake.deps);completeJob(j.id,r);expect(fake.log.prompts).toHaveLength(1);expect(fake.log.prompts[0]).toContain(a);
 const adapter=providers.imageReferencePrompt(providers.ambiancePrompt({prompt:fake.log.prompts[0],aspect:'16:9',reference:false}),[]);expect(adapter).toBe(quotedPrompts[0]);const body=qwenImageBody({model:'qwen-image-plus',prompt:adapter,aspect:'16:9',references:[],people:false});expect(JSON.stringify(body)).toContain(a);
 const next=await quoteNativeImageGeneration(f.u,f.pid,crypto.randomUUID(),{...request,topic:b});expect(next.reused).toBe(0);expect(next.maximumMicro).toBeGreaterThan(0);expect(all('SELECT id FROM ai_calls WHERE project_id=?',f.pid)).toHaveLength(0);expect(fetch).not.toHaveBeenCalled();
});
it('un devis signé de l’ancien brief fermé est refusé avant tout appel',async()=>{
 const f=await fixture(),operationId=crypto.randomUUID(),request={kind:'ambiance' as const,topic,aspect:'16:9' as const},original=briefModule.buildBrief,legacy=vi.spyOn(briefModule,'buildBrief').mockImplementation((...a)=>{const b=original(...a);delete (b as any).requestedTopic;b.version=BRIEF_VERSION;return b;});
 const q=await quoteNativeImageGeneration(f.u,f.pid,operationId,request);legacy.mockRestore();await expect(checkedNativeImageApproval(f.u,f.pid,operationId,request,q.approvalToken,true)).rejects.toMatchObject({code:'image_quote_stale'});expect(fetch).not.toHaveBeenCalled();
});
it('la relecture vérifie la scène demandée sans exiger son ancien bureau automatique',async()=>{
 const f=await fixture(),b=buildBrief(f.p,{kind:'ambiance',topic},{peopleAllowed:false}),check=reviewPrompt(b);expect(check).toContain(topic);expect(check).not.toMatch(/bureau moderne|world of|composition: bureau/);expect(check).toContain(b.artDirection);expect(check).toContain('no people');
});
