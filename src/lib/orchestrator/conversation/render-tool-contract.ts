/** Explicit native render evidence, never a creative quality certificate. */
import {z} from 'zod';
const key=z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
const paths=z.array(z.string().min(1).max(300).startsWith('/')).min(1).max(2).refine(p=>new Set(p).size===p.length,'duplicate_path');
export const RenderToolPlanSchema=z.object({tool:z.literal('theme.inspect-render'),versionId:key,paths}).strict();
export const RenderToolCommandSchema=z.discriminatedUnion('action',[
 z.object({action:z.literal('quote'),revision:z.number().int().nonnegative(),projectRevision:z.number().int().nonnegative(),versionId:key,paths,proposalReceiptId:key.optional(),requestNew:z.boolean().default(false)}).strict(),
 z.object({action:z.literal('confirm'),quoteId:key,confirmation:z.literal(true),requestId:z.string().regex(/^[a-zA-Z0-9_-]{8,80}$/)}).strict(),
]);
export type RenderToolCommand=z.infer<typeof RenderToolCommandSchema>;
