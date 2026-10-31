/** Une révision vocale proposée n’est jamais un consentement ni une génération. */
import {z}from 'zod';
import {VoiceChangesSchema}from '../../video-v2/voice-revision-contract';
import {VideoToolCommandSchema}from './video-tool-contract';
const key=z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
export const VideoVoicePlanSchema=VoiceChangesSchema.safeExtend({tool:z.literal('videos.voice'),docKey:z.string().regex(/^[a-zA-Z0-9:_-]{1,120}$/),expectedVersion:z.number().int().positive(),expectedVersionId:key,sourceId:z.string().min(1).max(120),quote:z.string().min(1).max(8000)}).strict();
export type VideoVoicePlan=z.infer<typeof VideoVoicePlanSchema>;
export const VideoVoiceCommandSchema=VideoToolCommandSchema;
export type VideoVoiceCommand=z.infer<typeof VideoVoiceCommandSchema>;
