/** Remplacer un seul plan proposé ; aucun clip, audio ou débit produit par ce contrat. */
import {z}from 'zod';
import {ClipRevisionSchema}from '../../video-v2/clip-revision-contract';
import {VideoToolCommandSchema}from './video-tool-contract';
const key=z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
export const VideoClipPlanSchema=ClipRevisionSchema.safeExtend({tool:z.literal('videos.retake'),docKey:z.string().regex(/^[a-zA-Z0-9:_-]{1,120}$/),expectedVersion:z.number().int().positive(),expectedVersionId:key,sourceId:z.string().min(1).max(120),quote:z.string().min(1).max(8000)}).strict();
export type VideoClipPlan=z.infer<typeof VideoClipPlanSchema>;
export const VideoClipCommandSchema=VideoToolCommandSchema;
export type VideoClipCommand=z.infer<typeof VideoClipCommandSchema>;
