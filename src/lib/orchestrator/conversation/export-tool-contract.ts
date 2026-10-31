/** D3 : un téléchargement contrôlé, jamais une installation ni une publication externe. */
import {z} from 'zod';
const key=z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
export const ExportPlatformSchema=z.enum(['shopify','woocommerce','prestashop','wix','squarespace']);
export const ExportToolPlanSchema=z.object({tool:z.literal('theme.export'),versionId:key,platform:ExportPlatformSchema}).strict();
export const ExportToolCommandSchema=z.discriminatedUnion('action',[
 z.object({action:z.literal('quote'),revision:z.number().int().nonnegative(),projectRevision:z.number().int().nonnegative(),versionId:key,platform:ExportPlatformSchema,proposalReceiptId:key.optional(),requestNew:z.boolean().default(false)}).strict(),
 z.object({action:z.literal('confirm'),quoteId:key,confirmation:z.literal(true),requestId:z.string().regex(/^[a-zA-Z0-9_-]{8,80}$/)}).strict(),
]);
export type ExportToolCommand=z.infer<typeof ExportToolCommandSchema>;
