/** Plan E : données uniquement ; aucun Liquid, CSS ou JavaScript proposé par le modèle. */
import {z} from 'zod';
const key=z.string().regex(/^[a-zA-Z0-9_.:-]{1,100}$/).refine(x=>!x.split(/[.:]/).some(k=>['__proto__','prototype','constructor'].includes(k)));
const binding=z.object({key,source:key,block:key.optional()}).strict();
const layout=z.object({key,value:z.union([z.string().max(120),z.boolean(),z.number().finite()]),block:key.optional()}).strict();
export const CompositionSectionSchema=z.discriminatedUnion('kind',[
 z.object({kind:z.literal('existing'),section:key,bindings:z.array(binding).max(80).default([]),layout:z.array(layout).max(30).default([])}).strict(),
 z.object({kind:z.literal('component'),id:key,type:key,bindings:z.array(binding).max(80),layout:z.array(layout).max(30).default([]),blocks:z.array(z.object({id:key,type:key}).strict()).max(30).default([])}).strict(),
]);
export const CompositionPlanSchema=z.object({
 schema:z.literal(1),versionId:key,mode:z.enum(['adapt','hybrid','original']),summary:z.string().min(1).max(800),
 pages:z.array(z.object({template:key,sections:z.array(CompositionSectionSchema).min(1).max(25)}).strict()).min(1).max(8),
}).strict().superRefine((p,c)=>{const unique=(keys:string[])=>new Set(keys).size===keys.length;if(!unique(p.pages.map(x=>x.template)))c.addIssue({code:'custom',message:'duplicate_page'});for(const page of p.pages){if(!unique(page.sections.map(s=>s.kind==='existing'?s.section:s.id)))c.addIssue({code:'custom',message:'duplicate_section'});for(const s of page.sections){if(!unique([...s.bindings,...s.layout].map(b=>`${b.block??''}:${b.key}`)))c.addIssue({code:'custom',message:'duplicate_setting'});if(s.kind==='component'&&!unique(s.blocks.map(b=>b.id)))c.addIssue({code:'custom',message:'duplicate_block'});}}});
export type CompositionPlan=z.infer<typeof CompositionPlanSchema>;
export type CompositionSection=z.infer<typeof CompositionSectionSchema>;
/** Sources résolues par le serveur, jamais une autorisation provenant du JSON du modèle. */
export type CompositionSource=
 |{kind:'copy';text:string;scope:string;provenance:{kind:'client'|'acquired';ref:string}}
 |{kind:'link';url:string;scope:string;provenance:{kind:'client'|'acquired';ref:string}}
 |{kind:'media';assetId:string;filename:string;scope:string;provenance:{kind:'client'|'acquired';ref:string}};
export type CompositionRecord={schema:1;plan:CompositionPlan;parentVersionId:string;sourceRefs:{id:string;ref:string;kind:string}[];templateSections:Record<string,string[]>;quality:'not_measured';platformInstallation:'not_tested'};
