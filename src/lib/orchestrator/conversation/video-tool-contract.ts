/** Propositions vidéo explicites ; ni consentement, ni génération de plans/voix implicite. */
import {z}from 'zod';
import {ImageTargetSchema,ImageSelectionSchema}from './image-tool-contract';
const key=z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/),docKey=z.string().regex(/^[a-zA-Z0-9:_-]{1,120}$/);
const evidence={sourceId:z.string().min(1).max(120),quote:z.string().min(1).max(8000)};
export const MotionSceneSchema=z.object({image:ImageSelectionSchema,durationS:z.number().finite().min(.8).max(60),camera:z.enum(['static','push_in','pull_out','pan_left','pan_right','tilt_up']),title:z.string().max(40),titleColor:z.string().regex(/^#[a-fA-F0-9]{6}$/),place:z.enum(['top','lower'])}).strict();
export const VideoMotionPlanSchema=z.object({tool:z.literal('videos.motion'),target:ImageTargetSchema,aspect:z.enum(['9:16','16:9','1:1','4:5']),purpose:z.enum(['ad','organic']),scenes:z.array(MotionSceneSchema).min(1).max(6),line:z.string().max(70),cta:z.string().max(80),music:z.enum(['none','calm','warm','pulse']),...evidence}).strict().superRefine((p,c)=>{const total=p.scenes.reduce((n,s)=>n+s.durationS,0);if(total<.8||total>60)c.addIssue({code:'custom',message:'Le montage doit durer entre0,8et60secondes, sans raccourcissement implicite.'});});
export const VideoEditOpSchema=z.discriminatedUnion('op',[
 z.object({op:z.literal('duration'),clipId:key,durationS:z.number().finite().min(.8).max(60)}).strict(),
 z.object({op:z.literal('text'),clipId:key,layerId:key,text:z.string().min(1).max(120)}).strict(),
 z.object({op:z.literal('transition'),clipId:key,kind:z.enum(['cut','fade','slide','zoom','wipe']),durationS:z.number().finite().min(0).max(1.2)}).strict().refine(o=>o.kind==='cut'?o.durationS===0:o.durationS>=.15,'Durée de transition exacte requise.'),
 z.object({op:z.literal('music'),mood:z.enum(['none','calm','warm','pulse'])}).strict(),
 z.object({op:z.literal('audio_gain'),track:z.enum(['voice','music']),gainDb:z.number().finite().min(-40).max(12)}).strict().refine(o=>o.track==='music'?o.gainDb<=6:o.gainDb>=-20,'Gain hors de la plage native de cette piste.'),
]);
export const VideoEditPlanSchema=z.object({tool:z.literal('videos.edit'),docKey,expectedVersion:z.number().int().positive(),expectedVersionId:key,ops:z.array(VideoEditOpSchema).min(1).max(12),...evidence}).strict();
export const VideoRestorePlanSchema=z.object({tool:z.literal('videos.restore'),docKey,expectedVersion:z.number().int().positive(),expectedVersionId:key,restoreVersion:z.number().int().positive(),...evidence}).strict();
export const VideoToolPlanSchema=z.union([VideoMotionPlanSchema,VideoEditPlanSchema,VideoRestorePlanSchema]);
export type VideoToolPlan=z.infer<typeof VideoToolPlanSchema>;
export const VideoToolCommandSchema=z.discriminatedUnion('action',[
 z.object({action:z.literal('quote'),revision:z.number().int().nonnegative(),projectRevision:z.number().int().nonnegative(),proposalReceiptId:key}).strict(),
 z.object({action:z.literal('confirm'),quoteId:key,confirmation:z.literal(true),requestId:z.string().regex(/^[a-zA-Z0-9_-]{8,80}$/)}).strict(),
]);
export type VideoToolCommand=z.infer<typeof VideoToolCommandSchema>;
