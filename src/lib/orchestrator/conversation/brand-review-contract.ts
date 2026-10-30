import {z} from 'zod';
const key=z.string().min(1).max(100);
const name=z.string().trim().min(1).max(160);
/** Seulement des mots fournis par le client ; aucun nom ou slogan créatif inventé ici. */
export const BrandCorrectionPlanSchema=z.object({candidateId:key,sourceId:z.string().min(1).max(160),quote:z.string().min(1).max(8000),name:name.nullable(),tagline:z.string().min(1).max(1200).nullable()}).strict().refine(v=>v.name!==null||v.tagline!==null,'A correction needs at least one exact field');
export type BrandCorrectionPlan=z.infer<typeof BrandCorrectionPlanSchema>;
export function validateBrandCorrectionEvidence(plan:BrandCorrectionPlan,request:{sourceId?:string|null;text:string}|null|undefined){
 if(!request||!request.sourceId||request.sourceId!==plan.sourceId||!request.text.includes(plan.quote)||[plan.name,plan.tagline].some(v=>v!==null&&!plan.quote.includes(v)))throw Error('brand_correction_exact_client_text_required');
}
/** Un choix explicite d’un acquis, pas des valeurs inventées par un appelant. */
export const BrandReviewCommandSchema=z.discriminatedUnion('action',[
 z.object({action:z.literal('quote'),sourceId:key,revision:z.number().int().nonnegative(),projectRevision:z.number().int().nonnegative(),correctionReceiptId:key.optional()}).strict(),
 z.object({action:z.literal('confirm'),quoteId:key,confirmation:z.literal(true),requestId:z.string().regex(/^[a-zA-Z0-9_-]{8,80}$/)}).strict(),
]);
export type BrandReviewCommand=z.infer<typeof BrandReviewCommandSchema>;
