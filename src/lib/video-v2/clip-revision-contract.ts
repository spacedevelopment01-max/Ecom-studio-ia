/** Une seule scène proposée, pas une permission d’achat ni une modification des textes ou de la voix. */
import {z}from 'zod';
const key=z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
const ImageAssetPinSchema=z.object({assetId:key,version:z.number().int().positive(),sha256:z.string().regex(/^[a-f0-9]{64}$/)}).strict();
export const ClipRevisionSchema=z.object({clipId:key,generation:z.enum(['direct','reference']),scene:z.object({still:z.string().min(10).max(20000),motion:z.string().min(10).max(400)}).strict(),reference:ImageAssetPinSchema.nullable()}).strict().superRefine((v,c)=>{if((v.generation==='reference')!==!!v.reference)c.addIssue({code:'custom',message:'La référence doit correspondre au mode du plan.'});});
export type ClipRevision=z.infer<typeof ClipRevisionSchema>;
/** Les vidéos issues d’un devis borné ont une réserve de reprise nulle, une offre native figée.
 * Le bouton historique n’a ni ce devis ciblé ni son enveloppe commune : ne pas l’utiliser en secours. */
export const requiresClipRevisionQuote=(doc:import('./types').VideoDocument)=>doc.meta.retakeBudgetMicro===0&&!!doc.meta.editorial?.nativeBinding;
