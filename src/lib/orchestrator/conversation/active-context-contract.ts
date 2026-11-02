/** Repère de navigation, jamais une permission ni une instruction à exécuter. */
import {z} from 'zod';
const id=z.string().min(1).max(120);
export const ActiveTabSchema=z.enum(['pilote','produit','strategie','marque','boutique','catalogue','biens','carte','realisations','rendez-vous','images','videos','publications','calendrier','publicites','blog','prompts','fichiers','connexions']);
export const ActiveTargetSchema=z.discriminatedUnion('kind',[
 z.object({kind:z.literal('catalogue-product'),productId:id,version:z.number().int().positive()}).strict(),
 z.object({kind:z.literal('catalogue-variant'),productId:id,productVersion:z.number().int().positive(),variantId:id,version:z.number().int().positive()}).strict(),
 z.object({kind:z.literal('theme-page'),versionId:id,path:z.string().min(1).max(300)}).strict(),
 z.object({kind:z.literal('theme-section'),versionId:id,template:id,section:id,block:id.optional(),pagePath:z.string().min(1).max(300).optional()}).strict(),
 z.object({kind:z.literal('theme-field'),versionId:id,template:id,section:id,block:id.optional(),key:id,pagePath:z.string().min(1).max(300).optional(),path:z.string().min(1).max(300).optional()}).strict(),
 z.object({kind:z.literal('asset'),assetId:id,version:z.number().int().positive()}).strict(),
]);
export const ActiveContextSchema=z.object({projectId:id.optional(),tab:ActiveTabSchema,target:ActiveTargetSchema.nullable()}).strict();
export type ActiveContext=z.infer<typeof ActiveContextSchema>;
export type ActiveTarget=z.infer<typeof ActiveTargetSchema>;

/** Adresses déjà connues du Studio/preview, pas de déduction depuis texte, CSS ou URL DOM.
 * Un champ requiert sa clé native explicite (le répertoire serveur la fournit).
 */
export const NativePreviewAddressSchema=z.object({projectId:id,versionId:id,pagePath:z.string().min(1).max(300),template:id,section:id,block:id.optional(),key:id.optional()}).strict();
export function contextFromNativePreview(raw:unknown):ActiveContext{
 const a=NativePreviewAddressSchema.parse(raw);
 return{projectId:a.projectId,tab:'boutique',target:a.key?{kind:'theme-field',versionId:a.versionId,template:a.template,section:a.section,...(a.block?{block:a.block}:{}),key:a.key,pagePath:a.pagePath}:{kind:'theme-section',versionId:a.versionId,template:a.template,section:a.section,...(a.block?{block:a.block}:{}),pagePath:a.pagePath}};
}
