/** Le client choisit une action, jamais son coût, sa route ou le contenu du reçu. */
import {z} from 'zod';
const key=z.string().min(1).max(100);
export const BrandToolCommandSchema=z.discriminatedUnion('action',[
 z.object({action:z.literal('quote'),revision:z.number().int().nonnegative(),projectRevision:z.number().int().nonnegative(),proposalReceiptId:key.optional()}).strict(),
 z.object({action:z.literal('confirm'),quoteId:key,confirmation:z.literal(true),requestId:z.string().regex(/^[a-zA-Z0-9_-]{8,80}$/)}).strict(),
 z.object({action:z.literal('recover'),quoteId:key,confirmation:z.literal(true)}).strict(),
]);
export type BrandToolCommand=z.infer<typeof BrandToolCommandSchema>;
