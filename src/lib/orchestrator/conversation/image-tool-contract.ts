/** D9 : proposition créative bornée, jamais un accord ni une route fournisseur choisie par le modèle. */
import {z} from 'zod';
const key=z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/),text=(n:number)=>z.string().trim().min(1).max(n);
export const ImageTargetSchema=z.discriminatedUnion('kind',[
  z.object({kind:z.literal('project')}).strict(),
  z.object({kind:z.literal('product'),productId:key,version:z.number().int().positive(),variant:z.object({variantId:key,version:z.number().int().positive()}).strict().optional()}).strict(),
  z.object({kind:z.literal('service'),key}).strict(),
 ]);
export const ImageSelectionSchema=z.discriminatedUnion('kind',[
 z.object({kind:z.literal('asset'),assetId:key,version:z.number().int().positive()}).strict(),
 z.object({kind:z.literal('receipt'),receiptId:key,index:z.number().int().min(1).max(5)}).strict(),
]);
export const ImageCreatePlanSchema=z.object({
 tool:z.literal('images.create'),
 kind:z.enum(['product_image','packshot','lifestyle','ambiance','trade_photo','banner']),
 aspect:z.enum(['1:1','4:5','9:16','16:9']),
 target:ImageTargetSchema,
 reference:z.object({assetId:key,version:z.number().int().positive()}).strict().nullable(),
 frames:z.array(z.object({composition:text(1200),lighting:text(600),framing:text(600),environment:text(1200)}).strict()).min(1).max(5),
 sourceId:text(120),quote:text(8000),
}).strict().superRefine((p,c)=>{if(new Set(p.frames.map(f=>JSON.stringify(f))).size!==p.frames.length)c.addIssue({code:'custom',message:'Les compositions doivent être distinctes.'});});
export const ImageEditPlanSchema=z.object({tool:z.literal('images.edit'),target:ImageTargetSchema,source:ImageSelectionSchema,style:ImageSelectionSchema.nullable(),sourceId:text(120),quote:text(8000)}).strict();
export const ImageToolPlanSchema=z.union([ImageCreatePlanSchema,ImageEditPlanSchema]);
export type ImageToolPlan=z.infer<typeof ImageToolPlanSchema>;
export const ImageToolCommandSchema=z.discriminatedUnion('action',[
 z.object({action:z.literal('quote'),revision:z.number().int().nonnegative(),projectRevision:z.number().int().nonnegative(),proposalReceiptId:key}).strict(),
 z.object({action:z.literal('confirm'),quoteId:key,confirmation:z.literal(true),requestId:z.string().regex(/^[a-zA-Z0-9_-]{8,80}$/)}).strict(),
]);
export type ImageToolCommand=z.infer<typeof ImageToolCommandSchema>;
