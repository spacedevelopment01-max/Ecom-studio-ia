import {z} from 'zod';
export const ContentToolTypeSchema=z.enum(['home_page','product_page','category_page','service_page','brand_page','local_page','faq','metadata']);
/** Éditer un article acquis n'autorise jamais sa création via la commande générique. */
export const EditableContentToolTypeSchema=z.enum([...ContentToolTypeSchema.options,'blog_article']);
export const ContentToolCommandSchema=z.discriminatedUnion('action',[
 z.object({action:z.literal('blog_quote'),revision:z.number().int().nonnegative(),projectRevision:z.number().int().nonnegative(),proposalReceiptId:z.string().min(1).max(100)}).strict(),
 z.object({action:z.literal('quote'),revision:z.number().int().nonnegative(),projectRevision:z.number().int().nonnegative(),type:ContentToolTypeSchema,pageKey:z.string().min(1).max(120)}).strict(),
 z.object({action:z.literal('edit_quote'),revision:z.number().int().nonnegative(),projectRevision:z.number().int().nonnegative(),docKey:z.string().min(1).max(100),expectedVersion:z.number().int().positive(),blockIds:z.array(z.string().min(1).max(40)).min(1).max(30).refine(v=>new Set(v).size===v.length)}).strict(),
 z.object({action:z.literal('confirm'),quoteId:z.string().min(1).max(100),confirmation:z.literal(true),requestId:z.string().regex(/^[a-zA-Z0-9_-]{8,80}$/)}).strict(),
]);
export type ContentToolType=z.infer<typeof ContentToolTypeSchema>;
