import {z} from 'zod';
const key=z.string().min(1).max(100);
/** Un choix explicite d’un acquis, pas des valeurs inventées par un appelant. */
export const BrandReviewCommandSchema=z.discriminatedUnion('action',[
 z.object({action:z.literal('quote'),sourceId:key,revision:z.number().int().nonnegative(),projectRevision:z.number().int().nonnegative()}).strict(),
 z.object({action:z.literal('confirm'),quoteId:key,confirmation:z.literal(true),requestId:z.string().regex(/^[a-zA-Z0-9_-]{8,80}$/)}).strict(),
]);
export type BrandReviewCommand=z.infer<typeof BrandReviewCommandSchema>;
