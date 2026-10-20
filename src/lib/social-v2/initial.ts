import { planAllowsAds } from "../plan-entitlements";
import { projectPlan } from "../project-billing";
/** Initial twenty: independent organic/ad slots, full-set diversity gates and progressive receipts. */
import { all, id, json, now, one, run, tx } from '../db';
import { loadProject, remember, type Project } from '../projects';
import { stableHash } from '../brain/hash';
import { stateOf } from '../preparation/store';
import { assertFresh } from '../preparation/engine';
import { HttpError } from '../auth';
import { enqueue, getJob, JobContext, UserFacingError } from '../jobs';
import { requireCreationPlan } from '../plan-gates';
import { assertAiAllowed } from '../ai/access';
import { assertCanSpend, balance } from '../billing';
import { aiAvailability, routeFor } from '../ai/config';
import { usagePrimary, usageBackup, usageMode } from '../ai/media-routing';
import { routingMode, pinnedTasks } from '../orchestrator/text-routing';
import { getJsonSetting } from '../settings';
import type { AiPostDeps } from './ai-post';
import { textProviderReady } from '../ai/llm';
import { budgetPctOf } from '../ai/budget-pct';
import { aiPostProbableMicro, estimateTaskMicro, capMicro } from '../ai/estimate';
import { aiPostEstimate, type PostBrief, type MediaResult } from './deps';
import { publicationStage } from './publication-recipe';
import { createOnePost } from './single';
import { getAsset, assetMeta, addUsage, assetData, type Asset } from '../library';
import { aiPostAccepted } from './ai-post';
import { peopleAllowedFor } from '../people-policy';
import { FORMATS } from '../image-v2/formats';
import { redact, withTrace } from '../ai/trace';
import { L } from '../i18n-server';
import { lintClaims } from '../ai/tasks';
import { isAutoUsable } from '../quality/usable';
import { InitialPlanSchema, PlanReviewSchema, VisualReviewSchema, exactConceptConflicts, planInitial, extendInitialAds, reviewInitialPlan, repairInitialPlan, reviewInitialVisual, advertisingMaterial, type InitialPlan, type PlanReview, type VisualReview } from './initial-diversity';
export { InitialItemSchema, InitialPlanSchema } from './initial-diversity';
export type { InitialPlan } from './initial-diversity';
export const INITIAL_ASPECTS = ['1:1', '1:1', '1:1', '1:1', '4:5', '4:5', '4:5', '9:16', '9:16', '9:16'] as const;
type Group = 'organic' | 'ad';
type Aspect = typeof INITIAL_ASPECTS[number];
export const INITIAL_SLOTS = Array.from({ length: 20 }, (_, index) => ({ index, group: (index < 10 ? 'organic' : 'ad') as Group, aspect: INITIAL_ASPECTS[index % 10] }));
export const initialCreativeCount=(pid:string)=>planAllowsAds(projectPlan(pid))?20:10;
const eligibleSlots=(pid:string)=>INITIAL_SLOTS.slice(0,initialCreativeCount(pid));
const scopeHash=(_pid:string,hash:string)=>hash;
const KEY = 'initial.creatives';
type Candidate = {
    assetId: string;
    costMicro: number;
    attempts: number;
    review?: VisualReview;
};
type Slot = {
    index: number;
    group: Group;
    aspect: Aspect;
    creativeId: string;
    postId?: string;
    assetId?: string;
    attempts: number;
    candidates: Candidate[];
    content?: InitialPlan['posts'][number];
    repair?: string;
};
type Quote = {
    id: string;
    hash: string;
    missing: number[];
    probableMicro: number;
    capMicro: number;
    planCap: number;
    imageCap: number;
    slotCap: number;
    createdAt: number;
    consumed?: boolean;
    routeSignature?: string;
    required?:number;
};
type Version = {
    hash: string;
    slots: Slot[];
    jobId?: string;
    runs: number;
    error?: string;
    quotes: Quote[];
};
type Ledger = {
    schema: 2;
    preparedAt: number;
    versions: Version[];
};
function read(pid: string): Ledger | null { return json(one<{
    value: string;
}>("SELECT value FROM memory WHERE project_id=? AND kind='artifact' AND key=?", pid, KEY)?.value, null); }
function save(pid: string, l: Ledger) { remember(pid, { kind: 'artifact', key: KEY, value: JSON.stringify(l), source: 'local' }); }
export function prepareInitialCreatives(pid: string) { if (!read(pid))
    save(pid, { schema: 2, preparedAt: now(), versions: [] }); }
function legacyContext(p: Project) { return { product: p.product, services: p.services, strategy: p.strategy, brand: p.brand, instructions: all("SELECT key,value FROM memory WHERE project_id=? AND kind='decision' AND source='user' AND key!='image.art_direction' ORDER BY key", p.id) }; }
export function confirmInitialContext(pid: string) {
    if (stateOf(pid))
        throw new HttpError(409, L('Validez les étapes de préparation.', 'Approve the preparation steps.'));
    const p = loadProject(pid);
    requireCreationPlan(null, pid, 'images');
    if (!p.product.name || !p.strategy?.angles?.length || !p.brand?.name || !p.brand.logo.assetId || p.brand.logo.provisional)
        throw new HttpError(409, L('Complétez le brief, la stratégie et la charte définitive.', 'Complete the brief, strategy and final identity.'));
    remember(pid, { kind: 'artifact', key: 'initial.context.approved', value: stableHash('initial-legacy-20', legacyContext(p)), source: 'user', status: 'confirmed' });
}
function validated(pid: string) {
    const s = stateOf(pid), p = loadProject(pid);
    if (!s) {
        const hash = stableHash('initial-legacy-20', legacyContext(p));
        if (one<{
            value: string;
        }>("SELECT value FROM memory WHERE project_id=? AND key='initial.context.approved'", pid)?.value !== hash)
            throw new HttpError(409, L('Validez le brief, la stratégie et la marque avant les vingt créations initiales.', 'Approve the brief, strategy and brand before the twenty initial creations.'));
        return { p, s, hash:scopeHash(pid,hash) };
    }
    if (['brief', 'research', 'brand'].some(k => s.stages[k as 'brief' | 'research' | 'brand']?.status !== 'approved'))
        throw new HttpError(409, L('Validez le brief, la stratégie et la marque avant les vingt créations initiales.', 'Approve the brief, strategy and brand before the twenty initial creations.'));
    assertFresh(pid, s, 'content');
    if (!p.brand || p.brand.logo?.provisional || !p.brand.logo?.assetId)
        throw new HttpError(409, 'Identité et logo définitifs requis.');
    return { p, s, hash: scopeHash(pid,stableHash('initial-twenty-2', { brief: s.stages.brief!.data, strategy: p.strategy, brand: p.brand, business: p.business })) };
}
function version(pid: string, hash: string) { return read(pid)?.versions.find(v => v.hash === hash) ?? null; }
function mutate(pid: string, hash: string, fn: (v: Version) => void) { return tx(() => { const l = read(pid)!; const v = l.versions.find(v => v.hash === hash)!; fn(v); save(pid, l); return v; }); }
function ensureVersion(pid: string, hash: string) { return tx(() => { const l = read(pid)!; if (l.schema !== 2)
    throw new HttpError(409, 'Ancien registre de préparation : validation explicite nécessaire, aucune donnée effacée.'); let v = l.versions.find(x => x.hash === hash); if (!v) {
    v = { hash, slots: eligibleSlots(pid).map(s => ({ ...s, creativeId: id(), attempts: 0, candidates: [] })), runs: 0, quotes: [] };
    l.versions.push(v);
    save(pid, l);
} else if(initialCreativeCount(pid)===20&&v.slots.length===10){v.slots.push(...INITIAL_SLOTS.slice(10).map(s=>({...s,creativeId:id(),attempts:0,candidates:[]})));save(pid,l);} return v; }); }
const activeSlots=(pid:string,v:Version)=>v.slots.filter(s=>s.index<initialCreativeCount(pid));
function usable(pid: string, s: Slot, hash: string) {
    if (!s.assetId)
        return false;
    const a = getAsset(s.assetId);
    if (!a || a.project_id !== pid || a.kind !== 'image' || a.deleted_at || !['ready', 'approved'].includes(a.status) || !isAutoUsable(a) || a.origin !== 'generated' || a.role !== (s.group === 'ad' ? 'ad' : 'social'))
        return false;
    if (s.group === 'organic') {
        const p = s.postId ? one<{
            media: string;
        }>("SELECT media FROM posts WHERE id=? AND project_id=?", s.postId, pid) : null;
        if (!p || !json<string[]>(p.media, []).includes(a.id))
            return false;
    }
    const m = assetMeta<any>(a), d = FORMATS[s.aspect], c = s.candidates.find(c => c.assetId === a.id);
    return !m.simulation && !m.stock && !m.bank && m.initialCreative?.hash === hash && m.initialCreative?.index === s.index && m.initialCreative?.group === s.group && m.finalImage?.purpose === (s.group === 'ad' ? 'ad' : 'post') && a.width === d.width && a.height === d.height && !!c?.review?.accepted && !!m.finalImage?.quality && aiPostAccepted(m.finalImage.quality, false, m.finalImage.brief?.exactTexts?.map((x: any) => x.text) ?? [], peopleAllowedFor(loadProject(pid)), true);
}
export function initialCreativesView(pid: string) {
    const required=initialCreativeCount(pid);
    const l = read(pid);
    if (!l)
        return null;
    let current: ReturnType<typeof validated> | null = null, reason = '';
    try {
        current = validated(pid);
    }
    catch (e) {
        reason = (e as Error).message;
    }
    const v = current ? version(pid, current.hash) : null, accepted = v?activeSlots(pid,v).filter(s => usable(pid, s, v.hash)).length:0, job = v?.jobId ? getJob(v.jobId) : null, running = !!job && ['running', 'queued'].includes(job.status);
    const group = (g: Group) => { const slots = v?activeSlots(pid,v).filter(s => s.group === g):[], n = slots.filter(s => usable(pid, s, v!.hash)).length; const active = running && (v?activeSlots(pid,v):[]).find(s => !usable(pid, s, v!.hash))?.group === g ? 1 : 0; return { required: g==='ad'&&required===10?0:10, accepted: n, inProgress: active, missing: (g==='ad'&&required===10?0:10) - n - active, slots: slots.map(s => ({ ...s, accepted: usable(pid, s, v!.hash) })) }; };
    const spent = v ? one<{
        c: number;
    }>("SELECT COALESCE(SUM(cost),0) c FROM ai_calls WHERE project_id=? AND job_id IN (SELECT id FROM jobs WHERE project_id=? AND type='social.initial' AND json_extract(payload,'$.hash')=?)", pid, pid, v.hash)?.c ?? 0 : 0;
    return { required, accepted, inProgress: running && accepted < required ? 1 : 0, missing: required - accepted - (running && accepted < required ? 1 : 0), actualCostMicro: spent, actualBudgetPct: budgetPctOf(loadProject(pid).userId, spent, pid), legacy: !stateOf(pid), hash: current?.hash ?? null, ready: !!current, reason: reason || v?.error || (!accepted ? L(`Devis des ${required} créations à accepter avant génération.`, `Accept the ${required}-creation quote before generation.`) : ''), status: accepted === required ? 'complete' : running ? 'running' : !current ? 'waiting_validation' : 'incomplete', jobId: v?.jobId ?? null, formats: { perGroup: { square: 4, portrait: 3, story: 3 }, portraitAspect: '4:5' }, organic: group('organic'), ads: group('ad'), themeMediaIncluded: false, slots: v?activeSlots(pid,v).map(s => ({ ...s, accepted: usable(pid, s, v.hash) })):[], history: l.versions.map(x => ({ hash: x.hash, accepted: x.slots.filter(s => usable(pid, s, x.hash)).length, jobId: x.jobId })) };
}
export type InitialDeps = {
    guard: (p: Project, cap: number) => void;
    costs: () => {
        planProbable: number;
        planCap: number;
        imageProbable: number;
        imageCap: number;
        visualProbable: number;
        visualCap: number;
        repairCap: number;
    };
    plan: (p: Project, key: string, ctx: JobContext) => Promise<InitialPlan>;
    reviewPlan: (p: Project, plan: InitialPlan, key: string, ctx: JobContext) => Promise<PlanReview>;
    repairPlan: (p: Project, plan: InitialPlan, indices: number[], reason: string, key: string, ctx: JobContext) => Promise<InitialPlan>;
    reviewVisual: (p: Project, plan: InitialPlan, index: number, aid: string, accepted: {
        index: number;
        assetId: string;
    }[], key: string, ctx: JobContext) => Promise<VisualReview>;
    extendAds?: (p:Project,organic:InitialPlan,key:string,ctx:JobContext)=>Promise<InitialPlan>;
    render: (p: Project, post: PostBrief, aspect: Aspect, cap: number, ctx: JobContext, attemptLimit: number) => Promise<MediaResult>;
};
/** A worst-case envelope can exceed an otherwise unused balance. Keep the native spend guard. */
export function assertInitialEnvelopeBudget(p: Project, cap: number) {
    if (cap > 0 && balance(p.userId, p.id).available < cap) throw new UserFacingError(L(
        'Le budget IA disponible ne couvre pas le plafond de ce lot de vingt créations. Aucun nouvel appel n’est lancé pour cette demande. Vérifiez le devis et le budget du projet avant de réessayer.',
        'The available AI budget does not cover the cap for this set of twenty creations. No new call is started for this request. Check the quote and project budget before trying again.'
    ));
    assertCanSpend(p.userId, cap, p.id);
}
export function realInitialDeps(): InitialDeps {
    return {
        guard(p, cap) { requireCreationPlan(null, p.id, 'images'); assertAiAllowed(p.userId, p.id); if (!textProviderReady() || !aiAvailability().image)
            throw new UserFacingError(L('Fournisseur texte ou image indisponible : lot incomplet, aucun remplacement local.', 'Text or image provider unavailable: incomplete set, no local replacement.')); assertInitialEnvelopeBudget(p, cap); },
        costs() { const plan = estimateTaskMicro('copywriting', { input: 40000, output: 20000 }), review = estimateTaskMicro('quality_control', { input: 80000, output: 3000 }), repair = estimateTaskMicro('copywriting', { input: 40000, output: 3000 }); return { planProbable: plan + review, planCap: capMicro(plan + 3 * review + 2 * plan), imageProbable: aiPostProbableMicro(), imageCap: aiPostEstimate() + 2 * capMicro(estimateTaskMicro('copywriting', { input: 18000, output: 2000 })), visualProbable: review, visualCap: capMicro(review), repairCap: capMicro(repair) }; },
        plan: planInitial, extendAds:extendInitialAds, reviewPlan: reviewInitialPlan, repairPlan: repairInitialPlan, reviewVisual: reviewInitialVisual,
        async render(p, post, aspect, cap, ctx, attemptLimit) {
            const { designPostWithAi, realAiPostDeps } = await import('./ai-post');
            const { resolveSubject } = await import('../creative-subject');
            const subject = post.subject || p.business === 'products' ? resolveSubject(p, post.subject) : null;
            const contextHash = validated(p.id).hash, routes = initialRoutingSignature();
            const check = () => { if (validated(p.id).hash !== contextHash || initialRoutingSignature() !== routes) throw new UserFacingError('Contexte ou routage modifié pendant la génération : résultat conservé, nouvel accord requis.'); };
            return designPostWithAi(p, post, { as: post.entryPoint === 'ads-campaign' ? 'ad' : 'post', aspect, reference: subject?.referenceAssetId ?? null, subject, maxCostEur: cap / 1e6, maxAttempts: attemptLimit }, guardInitialImageDeps(realAiPostDeps({ userId: p.userId, projectId: p.id, jobId: ctx.job.id }), check));
        }
    };
}
/** Check again immediately before every native paid substage, including layout and visual review. */
export function guardInitialImageDeps(native: AiPostDeps, check: () => void): AiPostDeps {
    return { ...native, copy: native.copy ? (...args) => { check(); return native.copy!(...args); } : undefined,
        generate: (...args) => { check(); return native.generate(...args); },
        review: (...args) => { check(); return native.review(...args); },
        layout: native.layout ? (...args) => { check(); return native.layout!(...args); } : undefined };
}
/** Only non-secret route/pricing policy is fingerprinted; no credentials are stored. */
export function initialRoutingSignature(deps = realInitialDeps()) {
    return stableHash('initial-route-policy-1', { costs: deps.costs(), textMode: routingMode(), pinned: pinnedTasks(), textModels: getJsonSetting('ai.textModels', {}), mediaModels: getJsonSetting('ai.media.models', {}), text: ['copywriting', 'quality_control'].map(k => routeFor(k as 'copywriting' | 'quality_control')), media: ['social_image', 'ad_visual', 'text_layout'].map(k => { const u = k as 'social_image' | 'ad_visual' | 'text_layout'; return { primary: usagePrimary(u), backup: usageBackup(u), mode: usageMode(u) }; }) });
}
/** Same server-side envelope for immediate quotes and consent captured before final identity validation. */
export function initialEnvelope(count: number, planDone: boolean, deps = realInitialDeps()) {
    const c = deps.costs(), slotCap = c.imageCap + 5 * c.visualCap + 2 * c.repairCap;
    return { probableMicro: count * (c.imageProbable + c.visualProbable) + (planDone ? 0 : c.planProbable), capMicro: count * slotCap + (planDone ? 0 : c.planCap), planCap: planDone ? 0 : c.planCap, imageCap: c.imageCap, slotCap };
}
const planKey = (hash: string,count=20) => `initial20:${hash}:accepted-plan${count===10?':organic':''}`;
function acquiredInitialPlan(pid:string,hash:string,count:number):InitialPlan|null {
 const read=(key:string)=>{const value=json<any>(one<{value:string}>("SELECT value FROM memory WHERE project_id=? AND key=? ORDER BY rowid DESC LIMIT 1",pid,`publication.stage.${key}`)?.value,null);return value?.state==='done'?value.value as InitialPlan:null;};
 const full=read(planKey(hash)),organic=read(planKey(hash,10));
 return count===20?full:organic??(full?{posts:full.posts.slice(0,10)}:null);
}
export function quoteInitialCreatives(pid: string, deps = realInitialDeps()) {
    const { p, hash } = validated(pid);
    prepareInitialCreatives(pid);
    const v = ensureVersion(pid, hash);
    if (v.jobId && ['queued', 'running'].includes(getJob(v.jobId)?.status ?? ''))
        throw new HttpError(409, 'Ce lot est déjà en cours.');
    const missing = activeSlots(pid,v).filter(s => !usable(pid, s, hash)).map(s => s.index), done = !!acquiredInitialPlan(pid,hash,initialCreativeCount(pid));
    const q: Quote = { id: id(), hash, missing, ...initialEnvelope(missing.length, done, deps), routeSignature: initialRoutingSignature(deps), required:initialCreativeCount(pid), createdAt: now() };
    if (missing.length)
        deps.guard(p, q.capMicro);
    mutate(pid, hash, x => x.quotes.push(q));
    return { id: q.id, hash, missing: missing.length, organicMissing: missing.filter(i => i < 10).length, adsMissing: missing.filter(i => i >= 10).length, probableBudgetPct: budgetPctOf(p.userId, q.probableMicro, p.id), maxBudgetPct: budgetPctOf(p.userId, q.capMicro, p.id), adsIncluded:initialCreativeCount(pid)===20, themeMediaIncluded: false, includes: [`${initialCreativeCount(pid)} independent concepts and full copy`, 'semantic/composition review of the authorized set before generation', `${initialCreativeCount(pid)} independent images`, 'quality and actual visual diversity comparisons', 'bounded targeted corrections'], note: L('Devis global des créations manquantes : publications et publicités indépendantes. Contrôles et corrections ciblées bornées inclus au plafond, débités seulement si effectués. Aucun média du thème ni envoi sur les réseaux.', 'Global quote for missing independent posts and ads. Controls and bounded targeted corrections included in cap, charged only if performed. No theme media or social sending.') };
}
export function queueInitialCreatives(pid: string, quoteId: string, deps = realInitialDeps()) {
    return tx(() => {
        const { p, hash } = validated(pid), v = version(pid, hash), q = v?.quotes.find(x => x.id === quoteId);
        if (!v || !q)
            throw new HttpError(409, 'Devis absent ou contexte modifié : demandez le nouveau devis.');
        if (q.consumed)
            return { jobId: v.jobId, duplicate: true };
        if (now() - q.createdAt > 15 * 60 * 1000)
            throw new HttpError(409, 'Devis expiré. Actualisez le devis.');
        if (v.jobId && ['queued', 'running'].includes(getJob(v.jobId)?.status ?? ''))
            return { jobId: v.jobId, duplicate: true };
        if((q.required??20)!==initialCreativeCount(pid))throw new HttpError(409,L("Forfait modifié : actualisez le devis, acquis conservés.","Plan changed: refresh the quote; acquired results are kept."));
        const remaining = activeSlots(pid,v).filter(s => !usable(pid, s, hash)).map(s => s.index);
        if (JSON.stringify(remaining) !== JSON.stringify(q.missing))
            throw new HttpError(409, 'Lot modifié : actualisez le devis.');
        if (!remaining.length)
            return { jobId: null, complete: true };
        if (q.routeSignature && q.routeSignature !== initialRoutingSignature(deps)) throw new HttpError(409, 'Routes ou tarifs modifiés : acceptez un nouveau devis.');
        deps.guard(p, q.capMicro);
        const j = enqueue({ userId: p.userId, projectId: pid, type: 'social.initial', maxAttempts: 1, idempotencyKey: `initial20:${pid}:${hash}:${v.runs}`, label: L(`${initialCreativeCount(pid)} créations initiales`, `${initialCreativeCount(pid)} initial creations`), payload: { projectId: pid, hash, quoteId } });
        mutate(pid, hash, x => { x.jobId = j.id; x.runs++; x.quotes.find(y => y.id === quoteId)!.consumed = true; delete x.error; });
        return { jobId: j.id };
    });
}
function validatePlan(p: Project, plan: InitialPlan) {
    InitialPlanSchema.parse(plan);
    if(plan.posts.length!==initialCreativeCount(p.id))throw new UserFacingError(L("Le forfait ou le nombre de créations a changé : demandez un nouveau devis. Aucun appel image lancé.","The plan or creation count changed: request a new quote. No image call was launched."));
    const s = stateOf(p.id), corpus = JSON.stringify({ brief: s?.stages.brief?.data ?? legacyContext(p), sources: s?.stages.research?.data.sources.filter(x => x.status === 'consulted') });
    for (const [i, item] of plan.posts.entries()) {
        if (item.purpose !== (i < 10 ? 'organic' : 'ad'))
            throw new UserFacingError('Ensembles organique/publicitaire mal affectés.');
        if (lintClaims({ title: item.title, caption: item.caption, blocks: item.editorial.blocks, advertising: item.advertising ? { benefit: item.advertising.benefit, proof: item.advertising.proof, offer: item.advertising.offer } : null }, p).length)
            throw new UserFacingError('Affirmation initiale non confirmée : plan à reprendre avant images.');
        if (item.editorial.testimonial || item.editorial.structure === 'quote' || item.editorial.blocks?.some(b => b.kind === 'quote'))
            throw new UserFacingError('Aucun avis autorisé fourni au lot : choisir un autre contenu.');
        if (item.editorial.sources?.some(x => x.verified && !corpus.includes(JSON.stringify(x.text).slice(1, -1))))
            throw new UserFacingError('Source initiale non documentée dans la matière validée.');
        if (item.purpose === 'ad' && !item.advertising)
            throw new UserFacingError('Direction publicitaire structurée manquante.');
    }
}
async function acceptedPlan(p: Project, hash: string, ctx: JobContext, deps: InitialDeps, check: () => void) {
    const count=initialCreativeCount(p.id),acquired=acquiredInitialPlan(p.id,hash,count);
    if(acquired)return acquired;
    return publicationStage(p.id, planKey(hash,count), async () => {
        check();
        const organic=count===20?acquiredInitialPlan(p.id,hash,10):null;
        // Keep legacy 20-item receipts; organic-only and later ad extensions have separate stages.
        const scope=organic?':extend-ads':count===10?':organic':'';
        const draftKey=`initial20:${hash}:plan${scope}`;
        let plan = await publicationStage(p.id, draftKey, async () => { check();
          if(organic){const extension=deps.extendAds?await deps.extendAds(p,organic,`initial20:${hash}:extend-ads`,ctx):await deps.plan(p,`initial20:${hash}:extend-ads`,ctx);return {posts:[...organic.posts,...extension.posts.slice(-10)]};}
          return deps.plan(p, draftKey, ctx);
        });
        check();
        for (let attempt = 0; attempt < 3; attempt++) {
            validatePlan(p, plan);
            const review = PlanReviewSchema.parse(await publicationStage(p.id, `initial20:${hash}:plan-review${scope}:${attempt}`, () => { check(); return deps.reviewPlan(p, plan, `initial20:${hash}:plan-review${scope}:${attempt}`, ctx); })), local = exactConceptConflicts(plan);
            check();
            const indices = [...new Set([...local.map(x => x.index), ...review.duplicates.map(x => x.index), ...review.issues.map(x => x.index)])];
            if(organic&&indices.some(i=>i<10))throw new UserFacingError(L("Les publications déjà acquises ne peuvent pas être réécrites pour compléter les publicités. Plan conservé, reprise ciblée requise.","Acquired posts cannot be rewritten to complete the ads. Plan kept; a targeted correction is required."));
            if (review.accepted && !indices.length)
                return plan;
            if (attempt === 2 || !indices.length)
                throw new UserFacingError('Diversité du plan non validée après contrôles bornés : aucune image lancée.');
            const previous = plan, next = await publicationStage(p.id, `initial20:${hash}:plan-repair${scope}:${attempt}`, () => { check(); return deps.repairPlan(p, previous, indices, JSON.stringify({ local, review }), `initial20:${hash}:plan-repair${scope}:${attempt}`, ctx); });
            check();
            for (let i = 0; i < plan.posts.length; i++)
                if (!indices.includes(i) && JSON.stringify(next.posts[i]) !== JSON.stringify(previous.posts[i]))
                    throw new UserFacingError('Une correction a modifié un concept accepté : arrêt, versions conservées.');
            plan = next;
        }
        throw new UserFacingError('Plan initial incomplet.');
    });
}
function postBrief(pid: string, slot: Slot, content: InitialPlan['posts'][number], hash: string): PostBrief {
    if (slot.group === 'organic' && !slot.postId)
        tx(() => {
            const latest = version(pid, hash)!.slots[slot.index];
            if (latest.postId) {
                slot.postId = latest.postId;
                return;
            }
            const made = createOnePost(loadProject(pid), { kind: 'image', date: new Date().toISOString().slice(0, 10), time: '12:00', timezone: 'UTC', platforms: [{ platform: 'instagram' }], headline: content.title, caption: content.caption, pillar: content.pillar, request: content.request, editorial: content.editorial });
            slot.postId = made.ids[0];
            run("UPDATE posts SET format=?,scheduled_at=NULL,status='draft',objective=?,brief=json_set(brief,'$.initialCreative',json(?),'$.aspect',?) WHERE id=?", slot.aspect === '9:16' ? 'story' : 'image', content.objective, JSON.stringify({ hash, index: slot.index, group: slot.group }), slot.aspect, slot.postId);
            mutate(pid, hash, v => v.slots[slot.index].postId = slot.postId);
        });
    const row = slot.group === 'organic' ? one<{
        title: string;
        caption: string;
        brief: string;
        media: string;
        user_edited: number;
    }>("SELECT title,caption,brief,media,user_edited FROM posts WHERE id=? AND project_id=?", slot.postId, pid) : null;
    if (slot.group === 'organic' && (!row || row.user_edited))
        throw new UserFacingError('Publication supprimée ou modifiée par le client : aucun écrasement.');
    // Plan repair is allowed only on an unedited unfinished slot; all accepted entries remain untouched.
    if (row && (row.title !== content.title || row.caption !== content.caption))
        run("UPDATE posts SET title=?,caption=?,brief=json_set(brief,'$.headline',?,'$.request',?,'$.editorial',json(?)) WHERE id=? AND user_edited=0", content.title, content.caption, content.title, content.request, JSON.stringify(content.editorial), slot.postId);
    const network = slot.group === 'ad' && slot.aspect === '1:1' ? 'facebook' : 'instagram';
    return { id: slot.postId ?? slot.creativeId, entryPoint: slot.group === 'ad' ? 'ads-campaign' : 'publications', network, format: slot.aspect === '9:16' ? 'story' : 'image', title: content.title, headline: content.title, caption: content.caption, pillar: content.pillar, objective: content.objective, scheduled_at: null, request: `${content.request}\nConcept indépendant : ${JSON.stringify(content.concept)}`, editorial: slot.group === 'organic' ? content.editorial : undefined, editorialData: { initialCreative: { hash, index: slot.index, group: slot.group }, concept: content.concept }, advertising: slot.group === 'ad' ? { ...advertisingMaterial(loadProject(pid)), ...content.advertising, concept: content.concept, copy: { primary: content.caption, hook: content.title, cta: content.advertising?.cta }, platform: { network, aspect: slot.aspect } } : undefined };
}
export async function runInitialCreatives(ctx: JobContext, deps = realInitialDeps()) {
    const { projectId: pid, hash, quoteId } = ctx.payload as {
        projectId: string;
        hash: string;
        quoteId: string;
    };
    const v = version(pid, hash), q = v?.quotes.find(x => x.id === quoteId);
    if (!v || !q?.consumed || v.jobId !== ctx.job.id)
        throw new UserFacingError('Accord de lot introuvable.');
    try {
        return await withTrace({ jobId: ctx.job.id, projectId: pid, costCapMicro: q.capMicro }, async () => {
            const assertContext = () => {
                if((q.required??20)!==initialCreativeCount(pid))throw new UserFacingError(L('Forfait modifié pendant le lot : nouveau devis requis, acquis conservés.','Plan changed during the set: a new quote is required; acquired results are kept.'));
                if (validated(pid).hash !== hash) throw new UserFacingError('Contexte modifié pendant le lot : acquis conservés, nouveau devis requis.');
                if (q.routeSignature && q.routeSignature !== initialRoutingSignature(deps)) throw new UserFacingError('Routes ou tarifs modifiés pendant le lot : arrêt, nouvel accord requis.');
            };
            assertContext();
            const current = validated(pid);
            deps.guard(current.p, 0);
            let plan = structuredClone(await acceptedPlan(current.p, hash, ctx, deps, assertContext));
            assertContext();
            for (const s of activeSlots(pid,version(pid, hash)!))
                if (s.content)
                    plan.posts[s.index] = s.content;
            for (const initialSlot of activeSlots(pid,version(pid, hash)!)) {
                ctx.progress(initialSlot.index / initialCreativeCount(pid), L(`Créations initiales : ${initialCreativesView(pid)!.accepted}/${initialCreativeCount(pid)} acceptées`, `Initial creations: ${initialCreativesView(pid)!.accepted}/${initialCreativeCount(pid)} accepted`));
                assertContext();
                if (usable(pid, initialSlot, hash))
                    continue;
                for (let cycle = 0; cycle < 3; cycle++) {
                    assertContext();
                    let slot = version(pid, hash)!.slots[initialSlot.index];
                    const spent = slot.candidates.reduce((n, c) => n + c.costMicro, 0), imageAttempts = slot.candidates.reduce((n, c) => n + c.attempts, 0);
                    if (slot.attempts >= 3 || imageAttempts >= 3)
                        throw new UserFacingError('Limite de trois essais atteinte pour ce visuel. Lot incomplet, acquis conservés.');
                    if (slot.repair) {
                        const before = plan, next = await publicationStage(pid, `initial20:${hash}:slot-repair:${slot.index}:${slot.attempts}`, () => { assertContext(); return deps.repairPlan(loadProject(pid), before, [slot.index], slot.repair!, `initial20:${hash}:slot-repair:${slot.index}:${slot.attempts}`, ctx); });
                        assertContext();
                        for (let i = 0; i < plan.posts.length; i++)
                            if (i !== slot.index && JSON.stringify(next.posts[i]) !== JSON.stringify(before.posts[i]))
                                throw new UserFacingError('Correction hors cible refusée.');
                        validatePlan(loadProject(pid), next);
                        const check = PlanReviewSchema.parse(await publicationStage(pid, `initial20:${hash}:slot-plan-check:${slot.index}:${slot.attempts}`, () => { assertContext(); return deps.reviewPlan(loadProject(pid), next, `initial20:${hash}:slot-plan-check:${slot.index}:${slot.attempts}`, ctx); }));
                        assertContext();
                        if (!check.accepted || check.duplicates.length || check.issues.length || exactConceptConflicts(next).length)
                            throw new UserFacingError('Nouveau concept ciblé encore trop proche : arrêt sous plafond.');
                        plan = next;
                        mutate(pid, hash, v => { v.slots[slot.index].content = next.posts[slot.index]; delete v.slots[slot.index].repair; });
                    }
                    assertContext();
                    deps.guard(loadProject(pid), Math.max(0, q.imageCap - spent));
                    const content = plan.posts[slot.index], post = postBrief(pid, slot, content, hash), old = slot.postId ? one<{
                        brief: string;
                        caption: string;
                        media: string;
                        user_edited: number;
                    }>("SELECT brief,caption,media,user_edited FROM posts WHERE id=?", slot.postId) : null;
                    // Persist before dispatch; retries reuse the exact concept/receipt instead of inventing a fresh paid operation.
                    mutate(pid, hash, x => x.slots[slot.index].attempts++);
                    const result = await deps.render(loadProject(pid), post, slot.aspect, Math.max(0, q.imageCap - spent), ctx, 3 - imageAttempts);
                    assertContext();
                    if (!result.assetId)
                        throw new UserFacingError(result.note || 'Création initiale refusée ou manquante.');
                    const a = getAsset(result.assetId);
                    if (!a || a.project_id !== pid)
                        throw new UserFacingError('Média initial étranger ou absent.');
                    const m = assetMeta<any>(a), sharp = (await import('sharp')).default, d = await sharp(assetData(a)).metadata(), expected = FORMATS[slot.aspect];
                    if (d.width !== expected.width || d.height !== expected.height || a.width !== expected.width || a.height !== expected.height || a.role !== (slot.group === 'ad' ? 'ad' : 'social') || a.origin !== 'generated' || !isAutoUsable(a) || m.stock || m.bank || m.simulation || m.finalImage?.purpose !== (slot.group === 'ad' ? 'ad' : 'post') || !m.finalImage?.quality || !aiPostAccepted(m.finalImage.quality, false, m.finalImage.brief?.exactTexts?.map((x: any) => x.text) ?? [], peopleAllowedFor(loadProject(pid)), true))
                        throw new UserFacingError('Image initiale non finale, mauvaise provenance ou mauvais format.');
                    assertContext();
                    mutate(pid, hash, x => { const s = x.slots[slot.index]; if (!s.candidates.some(c => c.assetId === a.id))
                        s.candidates.push({ assetId: a.id, costMicro: result.costMicro, attempts: result.attempts ?? m.aiPost?.attempts ?? 1 }); });
                    const accepted = activeSlots(pid,version(pid, hash)!).filter(s => usable(pid, s, hash)).map(s => ({ index: s.index, assetId: s.assetId! }));
                    const review = VisualReviewSchema.parse(await publicationStage(pid, `initial20:${hash}:visual-review:${slot.index}:${a.id}`, () => { assertContext(); return deps.reviewVisual(loadProject(pid), plan, slot.index, a.id, accepted, `initial20:${hash}:visual-review:${slot.index}:${a.id}`, ctx); }));
                    assertContext();
                    if (review.duplicateOf != null && !accepted.some(x => x.index === review.duplicateOf))
                        throw new UserFacingError('Comparaison visuelle invalide : référence absente.');
                    mutate(pid, hash, x => { const s = x.slots[slot.index]; s.candidates.find(c => c.assetId === a.id)!.review = review; if (!review.accepted || review.duplicateOf != null)
                        s.repair = review.reason; });
                    if (!review.accepted || review.duplicateOf != null) {
                        run("UPDATE assets SET status='rejected',meta=json_set(meta,'$.initialDiversity',json(?)) WHERE id=?", JSON.stringify({ ...review, status: 'rejected_for_initial_set' }), a.id);
                        continue;
                    }
                    const meta = assetMeta<any>(a);
                    meta.initialCreative = { hash, index: slot.index, group: slot.group, aspect: slot.aspect, postId: slot.postId ?? null, concept: content.concept, diversity: review };
                    run('UPDATE assets SET meta=? WHERE id=?', JSON.stringify(meta), a.id);
                    tx(() => {
                        assertContext();
                        if (slot.group === 'organic') {
                            const latest = one<typeof old>("SELECT brief,caption,media,user_edited FROM posts WHERE id=?", slot.postId);
                            if (!latest || latest.user_edited || latest.brief !== old!.brief || latest.caption !== old!.caption || latest.media !== old!.media)
                                throw new UserFacingError('Publication modifiée pendant la génération : image conservée, aucun écrasement.');
                            run("UPDATE posts SET media=?,status='review',updated_at=? WHERE id=?", JSON.stringify([a.id]), now(), slot.postId);
                            addUsage(a.id, 'post', slot.postId!, 'Publication initiale');
                        }
                        mutate(pid, hash, x => { x.slots[slot.index].assetId = a.id; delete x.slots[slot.index].repair; });
                    });
                    break;
                }
                if (!usable(pid, version(pid, hash)!.slots[initialSlot.index], hash))
                    throw new UserFacingError('Diversité visuelle non validée : lot incomplet.');
            }
            const view = initialCreativesView(pid)!;
            if (view.accepted !== view.required)
                throw new UserFacingError('Ensemble initial incomplet.');
            return { complete: true, accepted: view.required, organic: 10, ads: view.required-10 };
        });
    }
    catch (e) {
        mutate(pid, hash, x => x.error = redact((e as Error).message));
        throw e;
    }
}
