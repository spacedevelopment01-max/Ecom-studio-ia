/** Repère de navigation, jamais une permission ni une instruction à exécuter. */
import {z} from 'zod';
const id=z.string().min(1).max(120);
export const ActiveTabSchema=z.enum(['pilote','produit','strategie','marque','boutique','catalogue','biens','rendez-vous','images','videos','publications','calendrier','publicites','blog','prompts','fichiers','connexions']);
export const ActiveTargetSchema=z.discriminatedUnion('kind',[
 z.object({kind:z.literal('theme-page'),versionId:id,path:z.string().min(1).max(300)}).strict(),
 z.object({kind:z.literal('theme-section'),versionId:id,template:id,section:id,block:id.optional()}).strict(),
 z.object({kind:z.literal('asset'),assetId:id,version:z.number().int().positive()}).strict(),
]);
export const ActiveContextSchema=z.object({tab:ActiveTabSchema,target:ActiveTargetSchema.nullable()}).strict();
export type ActiveContext=z.infer<typeof ActiveContextSchema>;
export type ActiveTarget=z.infer<typeof ActiveTargetSchema>;
