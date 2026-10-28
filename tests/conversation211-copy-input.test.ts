/** E4: capture native task requests with an explicit LLM double. No supplier, generation or wallet debit. */
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
const fake=vi.hoisted(()=>({calls:[] as {task:string;prompt:string;maxTokens:number;context:string}[],reply:null as unknown,failure:null as Error|null}));
vi.mock('@/lib/ai/llm',async original=>({...await original() as object,llmJson:async(call:typeof fake.calls[number],schema:{parse:(v:unknown)=>unknown})=>{fake.calls.push(call);if(fake.failure)throw fake.failure;return schema.parse(fake.reply);}}));
import {longCopyCase,goodCopyReview} from './copy211-fixtures';
import {aiShopCopy,aiQcText,aiCopyReview} from '@/lib/ai/tasks';
import {runWithLang} from '@/lib/i18n-server';
import {brainMetaOf} from '@/lib/brain/facade';
beforeEach(()=>{fake.calls=[];fake.reply=null;fake.failure=null;vi.stubGlobal('fetch',vi.fn(()=>{throw new Error('No network in E4 unit tests');}));});
afterEach(()=>vi.unstubAllGlobals());
async function fixture(business:'products'|'services'){const f=await longCopyCase(business);expect(JSON.stringify(f.previous).length).toBeGreaterThan(40000);return f;}
function extracted(prompt:string,tag:string){const start=prompt.indexOf(`<${tag}>`),end=prompt.lastIndexOf(`</${tag}>`);expect(start).toBeGreaterThanOrEqual(0);expect(end).toBeGreaterThan(start);return JSON.parse(prompt.slice(start+tag.length+2,end).trim());}
const goodReview=goodCopyReview;
describe('#211 E4 — contenu complet transmis aux correcteurs et aux reprises',()=>{
 for(const business of ['products','services'] as const){
  it(`transmet la version précédente entière à la reprise (${business})`,async()=>{const f=await fixture(business),before=structuredClone(f.previous);fake.reply=f.copy;await runWithLang({ui:f.language,content:f.language},()=>aiShopCopy(f.base,f.p,'Ne corriger que le point demandé.',f.previous));expect(fake.calls).toHaveLength(1);expect(extracted(fake.calls[0].prompt,'version_precedente')).toEqual(before);expect(f.previous).toEqual(before);expect(fake.calls[0]).toMatchObject({task:'copywriting',maxTokens:24000});expect(brainMetaOf(fake.calls[0].context,f.p.id)?.scope).toBe('shop_copy');});
  it(`transmet le contenu entier au contrôle factuel (${business})`,async()=>{const f=await fixture(business);fake.reply={verdict:'ok',issues:[]};await runWithLang({ui:f.language,content:f.language},()=>aiQcText(f.base,f.p,'Document long de recette',f.previous));expect(fake.calls).toHaveLength(1);expect(extracted(fake.calls[0].prompt,'contenu')).toEqual(f.previous);expect(fake.calls[0]).toMatchObject({task:'quality_control',maxTokens:8000});expect(brainMetaOf(fake.calls[0].context,f.p.id)?.scope).toBe('qc');});
  it(`transmet le contenu entier au directeur de rédaction (${business})`,async()=>{const f=await fixture(business);fake.reply=goodReview;await runWithLang({ui:f.language,content:f.language},()=>aiCopyReview(f.base,f.p,'Document long de recette',f.previous));expect(fake.calls).toHaveLength(1);expect(extracted(fake.calls[0].prompt,'contenu')).toEqual(f.previous);expect(fake.calls[0]).toMatchObject({task:'quality_control',maxTokens:8000});expect(brainMetaOf(fake.calls[0].context,f.p.id)?.scope).toBe('qc');});
 }
 it.each(['qc','review'] as const)('refuse un contenu absent avant tout appel (%s)',async kind=>{const f=await fixture('products');fake.reply=kind==='qc'?{verdict:'ok',issues:[]}:goodReview;const perform:()=>Promise<unknown>=()=>kind==='qc'?aiQcText(f.base,f.p,'Contenu absent',undefined):aiCopyReview(f.base,f.p,'Contenu absent',undefined);await expect(perform()).rejects.toMatchObject({code:'COPY_INPUT_MISSING'});expect(fake.calls).toHaveLength(0);});
 it('propage un refus du garde natif, sans tronquer ni produire une fausse relecture réussie',async()=>{const f=await fixture('services');fake.failure=new Error('Budget refusé — DOUBLE DE TEST');await expect(aiCopyReview(f.base,f.p,'Document complet',f.previous)).rejects.toThrow('Budget refusé');expect(fake.calls).toHaveLength(1);expect(extracted(fake.calls[0].prompt,'contenu')).toEqual(f.previous);});
});
