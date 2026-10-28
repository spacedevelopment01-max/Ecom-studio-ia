/** Plan E : données uniquement ; aucun Liquid, CSS ou JavaScript proposé par le modèle. */
import {z} from 'zod';
/** Refus de données/plan attendu, distinct d’une panne interne. */
const PLAN_ERROR_EN:Record<string,string>={
 'version parent périmée':'The parent version has changed.',
 'composition de thème importé non raccordée':'Composition of imported themes is not connected.',
 'sur-mesure sans thème de départ non raccordé à cet incrément':'Creating a site without a starting theme is not connected in this increment.',
 'page absente ou groupe fonctionnel non composable':'The page is missing or the functional group cannot be composed.',
 'modèle absent':'The page template is missing.',
 'cible de contenu ambiguë':'The content target is ambiguous.',
 'section existante absente':'An existing section is missing.',
 'adaptation : toutes les sections existantes sont conservées':'Adaptation must keep all existing sections.',
 'section fonctionnelle ou verrouillée à conserver':'Functional and locked sections must be kept.',
 'ordre des sections fonctionnelles à conserver':'The order of functional sections must be kept.',
 'position verrouillée à conserver':'A locked section must keep its position.',
 'section masquée : pas de création visible annoncée':'A hidden section cannot be reported as a visible creation.',
 'retouche métier via son outil dédié':'Use the dedicated tool to edit this function.',
 'composant hors bibliothèque de composition sûre':'This component is outside the safe composition library.',
 'schéma absent':'The component schema is missing.',
 'ajout natif sans section':'The native operation did not create a section.',
 'bloc natif absent':'The native block is missing.',
 'bloc absent':'The block is missing.',
 'réglage absent':'The setting is missing.',
 'réglage de composition hors schéma sûr':'This layout setting is outside the safe schema.',
 'source absente ou destinée à une autre page':'The source is missing or belongs to another page.',
 'provenance absente':'The source provenance is missing.',
 'texte non applicable en sécurité':'This text cannot be applied safely.',
 'image native non raccordée':'This native image setting is not connected.',
 'média absent ou changé':'The media is missing or has changed.',
 'image Shopify prioritaire : remplacement via son éditeur':'A Shopify image takes priority. Replace it in the Shopify editor.',
 'lien natif attendu':'A supported native link is required.',
 'ordre natif non obtenu':'The native section order was not obtained.',
};
export class CompositionPlanError extends Error{
 readonly english:string;
 constructor(message:string){super(message);this.name='CompositionPlanError';const translated=PLAN_ERROR_EN[message.replace(/^composition: /,'')];this.english=translated?`Composition: ${translated}`:message;}
}
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
