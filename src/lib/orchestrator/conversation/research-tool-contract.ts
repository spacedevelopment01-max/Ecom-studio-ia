import {z} from 'zod';
const key=z.string().min(1).max(100);
export const ResearchToolCommandSchema=z.discriminatedUnion('action',[
 z.object({action:z.literal('quote'),revision:z.number().int().nonnegative(),projectRevision:z.number().int().nonnegative(),correction:z.string().trim().max(1200).default(''),requestNew:z.boolean().default(false),proposalReceiptId:key.optional()}).strict(),
 z.object({action:z.literal('confirm'),quoteId:key,confirmation:z.literal(true),requestId:z.string().regex(/^[a-zA-Z0-9_-]{8,80}$/)}).strict(),
]);
export type ResearchToolCommand=z.infer<typeof ResearchToolCommandSchema>;
