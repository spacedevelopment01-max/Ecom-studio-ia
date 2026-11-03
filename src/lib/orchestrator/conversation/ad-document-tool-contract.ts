/** One explicit saved native title; no arbitrary instruction or document supplied by the client. */
import {z} from 'zod';
const id=z.string().min(1).max(120),requestId=z.string().regex(/^[a-zA-Z0-9_-]{8,80}$/);
export const AdDocumentToolCommandSchema=z.discriminatedUnion('action',[
 z.object({action:z.literal('propose'),revision:z.number().int().nonnegative(),projectRevision:z.number().int().nonnegative(),docKey:id,layerId:id,expectedVersion:z.number().int().positive(),operation:z.literal('title-larger')}).strict(),
 z.object({action:z.literal('cancel'),proposalId:id,requestId}).strict(),
 z.object({action:z.literal('confirm'),proposalId:id,confirmation:z.literal(true),requestId}).strict(),
]);
export type AdDocumentToolCommand=z.infer<typeof AdDocumentToolCommandSchema>;
