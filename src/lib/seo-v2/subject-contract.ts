/** Pure metadata contract: safe to load with the document schema, without database/catalogue cycles. */
import {z} from 'zod';
const key=z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
export const ContentBindingSchema=z.object({
 schema:z.literal(1),people:z.literal('none'),references:z.array(z.never()).max(0),
 product:z.object({productId:key,version:z.number().int().positive(),variant:z.object({variantId:key,version:z.number().int().positive()}).strict().optional()}).strict(),
}).strict();
