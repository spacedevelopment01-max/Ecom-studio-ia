/** Contrat de relecture strict du moteur natif : aucun fournisseur ni esthétique qualifiée. */
import {it,expect,vi} from 'vitest';
vi.mock('@/lib/ai/llm',async orig=>({...await orig()as object,llmJson:vi.fn()}));
import {ArtworkReviewSchema,BoundedArtworkReviewSchema,realLogoV2Ai,logoTerritoriesRequest,logoTerritoriesSchema} from '@/lib/logo-v2/ai';
import {llmJson,strictTextQuoteInput} from '@/lib/ai/llm';
import {createUser} from '@/lib/auth';
import {loadProject} from '@/lib/projects';
import {brandDiscovery} from '@/lib/logo-v2/discovery';
import {seedLogoFixture} from './logo-v2-fixtures';
import {ART_CRITERIA} from '@/lib/logo-v2/types';
const valid=()=>({criteria:Object.fromEntries(ART_CRITERIA.map(k=>[k,9])),textRead:'Atelier test',nameExact:true,extraText:false,nameBox:null,clumsyCliche:false,resemblesKnownBrand:false,amateur:false,artifacts:false,person:false,issues:[],needsSimplifiedMark:true,genericConcept:false,fix:{target:'none',instruction:''}});
it('accepte une relecture complète sans valeurs de remplacement',()=>{expect(BoundedArtworkReviewSchema.safeParse(valid()).success).toBe(true);});
it.each(['nameExact','extraText','person','clumsyCliche','resemblesKnownBrand','amateur','artifacts','genericConcept','needsSimplifiedMark']as const)('refuse le champ critique absent %s',key=>{const sample:Record<string,unknown>=valid();delete sample[key];expect(BoundedArtworkReviewSchema.safeParse(sample).success).toBe(false);});
it('refuse une note textuelle ou absente, en conservant le contrat historique séparé',()=>{const sample=valid();sample.criteria[ART_CRITERIA[0]]='9'as unknown as number;expect(BoundedArtworkReviewSchema.safeParse(sample).success).toBe(false);const legacy=valid()as Record<string,unknown>;delete legacy.person;expect(ArtworkReviewSchema.safeParse(legacy).success).toBe(true);expect(BoundedArtworkReviewSchema.safeParse(legacy).success).toBe(false);});
it('devis et premier appel natif partagent le contexte complet et le schéma strict sans JSON de réparation',async()=>{const u=await createUser(`logo-quote-${Date.now()}@example.test`,'test-password-quote','Test'),pid=seedLogoFixture(u.id,'saas'),instruction='Garde mes deux  espaces et mes accents.\n'.repeat(35)+'Dernière consigne intacte.',brief=brandDiscovery(loadProject(pid),{instructions:instruction}),check=vi.fn(),ai=realLogoV2Ai(null,{userId:u.id,projectId:pid,singleCall:true,beforeRequest:check});vi.mocked(llmJson).mockResolvedValue({territories:[]}as never);await ai.territories(brief,3,[]);expect(vi.mocked(llmJson)).toHaveBeenCalledTimes(1);const[call,schema,options]=vi.mocked(llmJson).mock.calls[0],quoted=logoTerritoriesRequest(brief,3,[],{userId:u.id,projectId:pid,jobId:null});expect(call).toEqual(quoted);expect(call.context).toContain(instruction);expect(options).toMatchObject({strict:true});expect(check).toHaveBeenCalledWith(call,schema);expect(strictTextQuoteInput(call,schema)).toEqual(strictTextQuoteInput(quoted,logoTerritoriesSchema()));});
