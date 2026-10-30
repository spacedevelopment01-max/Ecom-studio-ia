/** Préparer seulement : aucune connexion, approbation sociale, programmation ni diffusion. */
import {z}from 'zod';
import {ImageTargetSchema,ImageSelectionSchema,ImageToolCommandSchema}from './image-tool-contract';
const network=z.enum(['instagram','facebook','tiktok','youtube','pinterest']);
const source={sourceId:z.string().min(1).max(120),quote:z.string().min(1).max(8000),target:ImageTargetSchema};
export const SocialDraftPlanSchema=z.object({...source,tool:z.literal('social.draft'),posts:z.array(z.object({network,format:z.enum(['image','carousel','text']),title:z.string().max(200),caption:z.string().max(12000),hashtags:z.string().max(500),link:z.url().max(500).regex(/^https?:\/\//).nullable(),media:z.array(ImageSelectionSchema).max(10)}).strict()).min(1).max(5)}).strict();
export const SocialCalendarPlanSchema=z.object({...source,tool:z.literal('social.plan'),startDate:z.iso.date(),days:z.number().int().min(1).max(31),perDay:z.number().int().min(1).max(5),timezone:z.string().min(1).max(60),times:z.array(z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/)).min(1).max(5),networks:z.array(network).min(1).max(5),distribution:z.enum(['rotate','all']),goal:z.enum(['awareness','sales','community','balanced']),commercial:z.union([z.literal(0),z.literal(1),z.literal(2)])}).strict().superRefine((v,c)=>{if(v.times.length!==v.perDay||new Set(v.times).size!==v.times.length||new Set(v.networks).size!==v.networks.length)c.addIssue({code:'custom',message:'Des créneaux et réseaux distincts, un créneau par publication demandée.'});});
export const SocialToolPlanSchema=z.union([SocialDraftPlanSchema,SocialCalendarPlanSchema]);
export type SocialToolPlan=z.infer<typeof SocialToolPlanSchema>;
export const SocialToolCommandSchema=ImageToolCommandSchema;
export type SocialToolCommand=z.infer<typeof SocialToolCommandSchema>;
