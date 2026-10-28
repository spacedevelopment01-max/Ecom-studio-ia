/** D2 : propositions de retouches, jamais code généré ni permissions issues du modèle. */
import {z} from 'zod';
const key=z.string().min(1).max(100).refine(s=>!s.split(/[./:]/).some(p=>['__proto__','constructor','prototype'].includes(p)),'unsafe_key');
export const ThemeChangeSchema=z.discriminatedUnion('op',[
  z.object({op:z.literal('set_setting'),template:key,section:key,block:key.optional(),key,value:z.string().max(8000)}).strict(),
  z.object({op:z.literal('use_media'),template:key,section:key,block:key.optional(),key,assetId:key}).strict(),
]);
export const ThemeToolPlanSchema=z.object({tool:z.literal('theme.edit'),versionId:key,summary:z.string().min(1).max(500),ops:z.array(ThemeChangeSchema).min(1).max(12)}).strict().superRefine((plan,ctx)=>{const targets=plan.ops.map(o=>JSON.stringify([o.template,o.section,o.block??'',o.key]));if(new Set(targets).size!==targets.length)ctx.addIssue({code:'custom',message:'duplicate_target'});});
export type ThemeToolPlan=z.infer<typeof ThemeToolPlanSchema>;
export const ThemeToolCommandSchema=z.discriminatedUnion('action',[
  z.object({action:z.literal('quote'),revision:z.number().int().nonnegative(),projectRevision:z.number().int().nonnegative(),proposalReceiptId:key}).strict(),
  z.object({action:z.literal('quote-undo'),receiptId:key,currentVersionId:key}).strict(),
  z.object({action:z.literal('confirm'),quoteId:key,confirmation:z.literal(true),requestId:z.string().regex(/^[a-zA-Z0-9_-]{8,80}$/)}).strict(),
]);
export type ThemeToolCommand=z.infer<typeof ThemeToolCommandSchema>;
