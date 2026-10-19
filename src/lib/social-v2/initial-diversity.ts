/** The twenty initial concepts are reviewed together, then the actual candidate images are compared. */
import { z } from "zod";
import type { Project } from "../projects";
import type { JobContext } from "../jobs";
import { llmJson } from "../ai/llm";
import { brainView } from "../brain/facade";
import { assetData, getAsset } from "../library";
import { EditorialSchema } from "./creative-contract";
import { adInsight } from "../ads-v2/insight";
import { planAngles } from "../ads-v2/angles";
import { planDirections } from "../ads-v2/direction";
import { publicationIdentity } from "../image-v2/publication-identity";
import { stateOf } from "../preparation/store";
import sharp from "sharp";
export const InitialItemSchema = z.object({
    purpose: z.enum(["organic", "ad"]), title: z.string().min(3).max(100), caption: z.string().min(20).max(2200),
    pillar: z.string().min(1).max(120), objective: z.string().min(1).max(160), request: z.string().min(10).max(2000),
    concept: z.object({ idea: z.string().min(15).max(1000), message: z.string().min(10).max(1000), composition: z.string().min(20).max(1600), scene: z.string().min(10).max(1000), framing: z.string().min(8).max(500) }),
    editorial: EditorialSchema.required({ structure: true, blocks: true }),
    advertising: z.object({ audience: z.string(), angle: z.string(), benefit: z.string(), proof: z.string(), offer: z.string(), cta: z.string() }).optional(),
});
export const InitialPlanSchema = z.object({ posts: z.array(InitialItemSchema).length(20) });
export type InitialItem = z.infer<typeof InitialItemSchema>;
export type InitialPlan = z.infer<typeof InitialPlanSchema>;
export const PlanReviewSchema = z.object({ accepted: z.boolean(), duplicates: z.array(z.object({ index: z.number().int().min(0).max(19), duplicateOf: z.number().int().min(0).max(19), reason: z.string().min(10) })), issues: z.array(z.object({ index: z.number().int().min(0).max(19), reason: z.string().min(10) })) });
export type PlanReview = z.infer<typeof PlanReviewSchema>;
export const VisualReviewSchema = z.object({ accepted: z.boolean(), duplicateOf: z.number().int().min(0).max(19).nullable(), reason: z.string().min(10) });
export type VisualReview = z.infer<typeof VisualReviewSchema>;
export function advertisingMaterial(p: Project) { const insight = adInsight(p), angles = planAngles(insight, 10); return { insight, angles: angles.angles, directions: planDirections(angles.angles, p.business, !!insight.facts.length), missingAngles: angles.missing }; }
const normalized = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\b(?:1:1|4:5|9:16|square|portrait|story|stories|carre|instagram|format|ratio)\b/g, " ").replace(/\d+/g, "").replace(/[^a-z]+/g, " ").trim();
/** Cheap guard, complementary to the mandatory semantic/composition review. Identity/CTA may legitimately repeat. */
export function exactConceptConflicts(plan: InitialPlan): PlanReview["duplicates"] {
    const out: PlanReview["duplicates"] = [];
    for (let i = 0; i < 20; i++)
        for (let j = 0; j < i; j++) {
            const a = plan.posts[i], b = plan.posts[j];
            if (normalized(a.concept.idea) === normalized(b.concept.idea) && normalized(a.concept.composition) === normalized(b.concept.composition)) {
                out.push({ index: i, duplicateOf: j, reason: "Même idée et même composition ; les changements de ratio, titre ou numéro ne constituent pas un concept distinct." });
                break;
            }
        }
    return out;
}
const rules = `Twenty DISTINCT concepts, not one concept repeated in different ratios. Same brand, product, logo, palette, some CTA and even a confirmed benefit may repeat. The IDEA and COMPOSITION must differ meaningfully: message/educational content, situation, demonstration, objection or perspective and visual hierarchy. A crop, recolour, background-only change or minor rephrasing is NOT a new creation. Never invent benefits/proof to fill a quota. Compare all twenty entries across both sets. Mark ONLY the later duplicate index, preserve the original and every accepted distinct entry. Judge semantic and compositional equivalence, not just titles or file hashes. Ads and organic posts have separate purposes.`;
const base = (p: Project, ctx: JobContext, key: string, task: "copywriting" | "quality_control") => ({ task, userId: p.userId, projectId: p.id, jobId: ctx.job.id, usageKey: key, context: brainView(p, "image").stable });
export async function planInitial(p: Project, key: string, ctx: JobContext): Promise<InitialPlan> {
    const s = stateOf(p.id), input = s?.stages.brief?.data ?? { product: p.product, services: p.services };
    return llmJson({ ...base(p, ctx, key, "copywriting"), promptKey: "initial-twenty-plan", system: "Senior editorial and advertising directors. Preserve two independent purposes. Return JSON only.", prompt: `${rules}\nCreate exactly 20 posts in ${p.settings.language === "en" ? "English" : "French"}. Indices 0..9 ORGANIC, indices 10..19 ADVERTISING. Each set has four square concepts then three feed 4:5 then three story 9:16 concepts. The four square ADS are for Facebook; the three portrait ads are Instagram feed, plus three vertical stories. Do not produce multi-format versions. Validated client brief:${JSON.stringify(input)}. Full identity:${JSON.stringify(publicationIdentity(p))}. Strategy:${JSON.stringify(p.strategy)}. Existing advertising insight/angles/directions to preserve and develop:${JSON.stringify(advertisingMaterial(p))}. No fabricated claims, reviews, prices, sourced facts or people without applicable authorization. Missing reviews: choose another content. Each entry: purpose, title, complete useful caption, pillar, objective, request, concept:{idea,message,composition,scene,framing},editorial:{structure,blocks:[{kind,text}],sources:[]}. Organic content genuinely helps/informs/inspires/discusses, product optional, no forced purchase CTA. Ads showcase the documented product/service and real benefit/objection with advertising:{audience,angle,benefit,proof,offer,cta}; unavailable proof/offer are empty. Several distinct visual ideas may use the same real benefit. Complete copy and explanation blocks, no placeholder or local poster. Return {posts:[20 entries]}.`, maxTokens: 20000 }, InitialPlanSchema, { strict: true });
}
export async function reviewInitialPlan(p: Project, plan: InitialPlan, key: string, ctx: JobContext): Promise<PlanReview> {
    return llmJson({ ...base(p, ctx, key, "quality_control"), promptKey: "initial-semantic-composition-review", system: "Independent creative editor. Block semantic/composition duplicates. JSON only.", prompt: `${rules}\nCheck the entire planned set before ANY image generation. Also check factual support and two proper purposes. Index zero-based. Return {accepted,duplicates:[{index,duplicateOf,reason}],issues:[{index,reason}]}. Do not mark identity/CTA repetition alone. Plan:${JSON.stringify(plan)}. Verified project/strategy:${JSON.stringify({ product: p.product, services: p.services, strategy: p.strategy })}`, maxTokens: 3000 }, PlanReviewSchema, { strict: true });
}
export async function repairInitialPlan(p: Project, plan: InitialPlan, indices: number[], reason: string, key: string, ctx: JobContext): Promise<InitialPlan> {
    const schema = z.object({ replacements: z.array(z.object({ index: z.number().int().min(0).max(19), post: InitialItemSchema })).max(20) });
    const r = await llmJson({ ...base(p, ctx, key, "copywriting"), promptKey: "initial-targeted-concept-repair", system: "Creative director. Repair only the identified concepts. Preserve all other entries. JSON only.", prompt: `${rules}\nChange ONLY indices ${JSON.stringify(indices)}. Reasons:${reason}. Keep purpose for each slot and the full chosen identity. Produce truly different idea/content/composition, not a crop or paraphrase. No invented facts. Current plan:${JSON.stringify(plan)}. Return {replacements:[{index,post}]} for exactly the requested indices.`, maxTokens: Math.min(20000, 1500 + indices.length * 1000) }, schema, { strict: true });
    if (JSON.stringify(r.replacements.map(x => x.index).sort((a, b) => a - b)) !== JSON.stringify([...indices].sort((a, b) => a - b)))
        throw Error("Correction ciblée incomplète ou indices étrangers : versions conservées.");
    const next = structuredClone(plan);
    for (const x of r.replacements) {
        if (x.post.purpose !== next.posts[x.index].purpose)
            throw Error("La correction ne peut pas changer d’ensemble.");
        next.posts[x.index] = x.post;
    }
    return next;
}
export async function reviewInitialVisual(p: Project, plan: InitialPlan, index: number, assetId: string, accepted: {
    index: number;
    assetId: string;
}[], key: string, ctx: JobContext): Promise<VisualReview> {
    const refs = [{ index, assetId }, ...accepted];
    const images = [];
    for (const x of refs) {
        const a = getAsset(x.assetId);
        if (!a || a.project_id !== p.id || a.deleted_at)
            throw Error("Image de comparaison indisponible : contrôle bloqué.");
        images.push({ label: `${x.index === index ? "CANDIDATE" : "ACCEPTED"} index ${x.index}`, data: await sharp(assetData(a)).resize({ width: 512, height: 512, fit: "inside" }).png().toBuffer() });
    }
    return llmJson({ ...base(p, ctx, key, "quality_control"), promptKey: "initial-real-visual-diversity", system: "Independent visual creative reviewer. Inspect actual candidate and all accepted images. JSON only.", images, prompt: `${rules}\nInspect the ACTUAL candidate image ${index}, not just its concept label. Compare its real layout, scene, subject scale, visual idea and useful message with ALL accepted images attached. A resized/cropped image, colour/background swap or near-identical composition must fail. Also require the actual image to express its planned concept, not merely different metadata. Return {accepted,duplicateOf:index-or-null,reason:concrete visible evidence}. Reject if images cannot be assessed. Planned twenty entries:${JSON.stringify(plan)}. Candidate purpose:${plan.posts[index].purpose}. Accepted index mapping:${JSON.stringify(accepted)}.`, maxTokens: 2000 }, VisualReviewSchema, { strict: true });
}
