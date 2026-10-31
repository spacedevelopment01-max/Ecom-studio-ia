/** Le client choisit un dessin acquis ; aucune décision créative ou permission issue d'un modèle. */
import {z}from 'zod';
const key=z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
export const LogoSelectionCommandSchema=z.discriminatedUnion('action',[
 z.object({action:z.literal('quote'),phase:z.enum(['select','apply']),sourceId:key,assetId:key,revision:z.number().int().nonnegative(),projectRevision:z.number().int().nonnegative()}).strict(),
 z.object({action:z.literal('confirm'),quoteId:key,confirmation:z.literal(true),requestId:z.string().regex(/^[a-zA-Z0-9_-]{8,80}$/)}).strict(),
]);
export type LogoSelectionCommand=z.infer<typeof LogoSelectionCommandSchema>;
