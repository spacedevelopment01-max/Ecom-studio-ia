import {z} from 'zod';
/** Sujet fourni dans la demande courante ; le modèle ne décide ni du quota ni de publier. */
export const BlogToolPlanSchema=z.object({tool:z.literal('blog.draft'),topic:z.string().trim().min(1).max(200),sourceId:z.string().min(1).max(160),quote:z.string().min(1).max(8000)}).strict();
export type BlogToolPlan=z.infer<typeof BlogToolPlanSchema>;
export function validateBlogEvidence(plan:BlogToolPlan,request:{sourceId?:string|null;text:string}|null|undefined){
 if(!request?.sourceId||request.sourceId!==plan.sourceId||!request.text.includes(plan.quote)||!plan.quote.includes(plan.topic))throw Error('blog_exact_client_topic_required');
}
