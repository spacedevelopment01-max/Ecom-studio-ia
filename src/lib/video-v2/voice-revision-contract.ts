/** Contrat pur partagé : aucun SDK, fichier ou moteur chargé dans les schémas du dialogue. */
import {z}from 'zod';
const key=z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
export const VoiceChangesSchema=z.object({changes:z.array(z.object({clipId:key,text:z.string().min(1).max(4096)}).strict()).min(1).max(12),captions:z.enum(['keep','follow_changed_voice'])}).strict().superRefine((v,c)=>{if(new Set(v.changes.map(x=>x.clipId)).size!==v.changes.length)c.addIssue({code:'custom',message:'Une seule phrase par plan.'});});
export type VoiceChanges=z.infer<typeof VoiceChangesSchema>;
