/** Une proposition d'identité n'est ni un accord de génération ni une activation de marque. */
import {z}from 'zod';
import {AcceptedDirectionsSchema}from '../../logo-v2/accepted-directions';
const key=z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
export const LogoToolPlanSchema=z.object({tool:z.literal('logos.create'),action:z.enum(['reuse_or_create','renew','repair']),expectedSeriesId:key.nullable(),territories:AcceptedDirectionsSchema.nullable(),sourceId:z.string().min(1).max(120),quote:z.string().min(1).max(8000)}).strict();
export type LogoToolPlan=z.infer<typeof LogoToolPlanSchema>;
export const LogoToolCommandSchema=z.discriminatedUnion('action',[
 z.object({action:z.literal('quote'),revision:z.number().int().nonnegative(),projectRevision:z.number().int().nonnegative(),proposalReceiptId:key}).strict(),
 z.object({action:z.literal('confirm'),quoteId:key,confirmation:z.literal(true),requestId:z.string().regex(/^[a-zA-Z0-9_-]{8,80}$/)}).strict(),
]);
export type LogoToolCommand=z.infer<typeof LogoToolCommandSchema>;
