/** D8 : données explicites du client, jamais publication, suppression ou synchronisation. */
import {z} from 'zod';
const key=z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/),label=(n:number)=>z.string().trim().min(1).max(n);
export const CatalogueMoneySchema=z.string().max(60).regex(/^\d+(?:[ \u00a0\u202f]\d{3})*(?:[.,]\d{1,2})?\s*(?:[A-Z]{3}|€)$/);
const media=z.object({assetId:key,version:z.number().int().positive(),alt:z.string().max(200).optional()}).strict();
const option=z.object({name:label(40),values:z.array(label(60)).min(1).max(50)}).strict();
const variant=z.object({id:key.optional(),version:z.number().int().positive().optional(),options:z.array(label(60)).max(3),sku:z.string().trim().max(64).optional(),price:CatalogueMoneySchema.nullable().optional(),stock:z.number().int().min(-100000).max(10000000).nullable().optional(),image:media.nullable().optional()}).strict();
export const CatalogueFieldsSchema=z.object({
 title:label(160).optional(),description:z.string().max(40000).optional(),vendor:z.string().trim().max(120).optional(),productType:z.string().trim().max(120).optional(),
 price:CatalogueMoneySchema.nullable().optional(),compareAt:CatalogueMoneySchema.nullable().optional(),categories:z.array(label(80)).max(20).optional(),tags:z.array(label(60)).max(40).optional(),
 seo:z.object({title:label(70).optional(),description:label(320).optional()}).strict().optional(),images:z.array(media).max(30).optional(),options:z.array(option).max(3).optional(),variants:z.array(variant).max(100).optional(),
}).strict().refine(v=>Object.keys(v).length>0,'Au moins un champ exact est requis.');
export const CataloguePlanSchema=z.object({tool:z.literal('catalogue.draft'),action:z.enum(['create','update']),target:z.object({productId:key,version:z.number().int().positive()}).strict().optional(),fields:CatalogueFieldsSchema,evidence:z.array(z.object({path:label(160),sourceId:label(120),quote:label(8000)}).strict()).max(600)}).strict().superRefine((p,c)=>{
 if(p.action==='create'&&(!p.fields.title||p.target))c.addIssue({code:'custom',message:'Une création requiert un titre et aucune cible existante.'});
 if(p.action==='update'&&!p.target)c.addIssue({code:'custom',message:'Une modification requiert la fiche et sa version natives.'});
 if(new Set(p.evidence.map(x=>x.path)).size!==p.evidence.length)c.addIssue({code:'custom',message:'Preuves de champs dupliquées.'});
});
export type CataloguePlan=z.infer<typeof CataloguePlanSchema>;
export const CatalogueCommandSchema=z.discriminatedUnion('action',[
 z.object({action:z.literal('quote'),revision:z.number().int().nonnegative(),projectRevision:z.number().int().nonnegative(),proposalReceiptId:key,requestNew:z.boolean().default(false)}).strict(),
 z.object({action:z.literal('quote-undo'),receiptId:key}).strict(),
 z.object({action:z.literal('confirm'),quoteId:key,confirmation:z.literal(true),requestId:z.string().regex(/^[a-zA-Z0-9_-]{8,80}$/)}).strict(),
]);
export type CatalogueCommand=z.infer<typeof CatalogueCommandSchema>;
