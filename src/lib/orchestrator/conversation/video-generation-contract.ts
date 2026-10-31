/** Proposition de clips IA natifs, distincte du montage local et sans autorité serveur. */
import {z}from 'zod';
import {ApprovedScenePlanSchema}from '../../video-v2/scene-contract';
import {ImageSelectionSchema,ImageTargetSchema}from './image-tool-contract';
const key=z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
export const VideoGenerationPlanSchema=z.object({tool:z.literal('videos.generate'),target:z.union([ImageTargetSchema.options[1],ImageTargetSchema.options[2]]),generation:z.enum(['direct','reference']),reference:ImageSelectionSchema.nullable(),aspect:z.enum(['9:16','16:9','1:1','4:5']),purpose:z.enum(['ad','organic','site']),voice:z.enum(['project','none']),totalS:z.number().min(6).max(60),music:z.boolean(),scenario:ApprovedScenePlanSchema,sourceId:z.string().min(1).max(120),quote:z.string().min(1).max(8000)}).strict().superRefine((p,c)=>{if(p.generation==='direct'&&p.reference||p.generation==='reference'&&!p.reference)c.addIssue({code:'custom',message:'Le mode direct ne prend aucune photo ; le mode référence exige une photo exacte.'});});
export type VideoGenerationPlan=z.infer<typeof VideoGenerationPlanSchema>;
export const VideoGenerationCommandSchema=z.discriminatedUnion('action',[
 z.object({action:z.literal('quote'),revision:z.number().int().nonnegative(),projectRevision:z.number().int().nonnegative(),proposalReceiptId:key}).strict(),
 z.object({action:z.literal('confirm'),quoteId:key,confirmation:z.literal(true),requestId:z.string().regex(/^[a-zA-Z0-9_-]{8,80}$/)}).strict(),
]);
export type VideoGenerationCommand=z.infer<typeof VideoGenerationCommandSchema>;
