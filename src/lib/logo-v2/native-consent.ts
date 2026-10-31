/** Native Logo V2 purchases: persist consent, bind exact scope and reuse native prices/budgets. */
import { z } from 'zod';
import { HttpError, ownedProject, type User } from '../auth';
import { id, json, now, one, all, tx } from '../db';
import { loadProject, remember, currentTheme } from '../projects';
import { stableHash } from '../brain/hash';
import { assertAiAllowed } from '../ai/access';
import { assertCanSpend, balance } from '../billing';
import { budgetPctOf, pctBaseFor } from '../ai/budget-pct';
import { mediaRouteFor, logoQualityRelay } from '../ai/media-providers';
import { routeLlm, type LlmCall } from '../ai/llm';
import { priceFor, activeProviderKey } from '../ai/config';
import { requirePlan } from '../plan-gates';
import { enqueue, getJob, type JobContext } from '../jobs';
import { logoScopeHash, logoSeriesPins } from './creation-quote';
import { currentSeries, seriesRights, directionSeries } from './direction-series';
import { logoSeriesQuote, logoRedrawQuote } from './quote';
import { LOGO_STYLES } from './types';
import { getAsset, assetData } from '../library';
import { createHash } from 'node:crypto';
import { realLogoV2Ai, type LogoV2Ai } from './ai';
export const NativeLogoInput = z.object({ operation: z.enum(['generate', 'redraw']), style: z.enum([...LOGO_STYLES, 'auto']).default('auto'), renew: z.boolean().default(false), feedback: z.string().max(400).default(''), assetId: z.string().max(40).optional() }).strict();
export const NativeLogoConsent = z.object({ quoteId: z.string().min(8).max(80), maximumPct: z.number().finite().nonnegative(), confirmation: z.literal(true), requestId: z.string().regex(/^[a-zA-Z0-9_-]{8,80}$/) }).strict();
type Input = z.infer<typeof NativeLogoInput>;
type Saved = {
    id: string;
    userId: string;
    projectId: string;
    input: Input;
    createdAt: number;
    expiresAt: number;
    capMicro: number;
    maximumPct: number;
    estimatePct: number;
    fingerprint: string;
    scope: string;
    series: ReturnType<typeof currentSeries>;
    assets: ReturnType<typeof assetPins>;
    plan: string | null;
    routes: ReturnType<typeof routes>;
    budgetBase: number;
    available: number;
    jobId?: string;
    startedAt?: number;
    confirmedAt?: number;
    requestId?: string;
};
const prefix = 'logo.native.consent.';
function fail(message: string, status = 409): never { throw new HttpError(status, message, 'logo_consent_required'); }
function assetPins(pid: string) { return all<{
    id: string;
    version: number;
    meta: string;
    status: string;
}>("SELECT id,version,meta,status FROM assets WHERE project_id=? AND role LIKE 'logo%' AND deleted_at IS NULL ORDER BY id", pid).map(a => { const asset = getAsset(a.id)!; let bytes: string; try {
    bytes = createHash('sha256').update(assetData(asset)).digest('hex');
}
catch {
    bytes = 'unavailable';
} return { ...a, bytes }; }); }
function routes() {
    const image = mediaRouteFor('logo', { text: true });
    if (!image || logoQualityRelay())
        fail('Route logo ou relais non qualifié : aucun achat lancé.');
    const texts = Object.fromEntries((['logo_symbol', 'quality_control'] as const).map(task => { const r = routeLlm({ task, ...(task === 'quality_control' ? { routing: { difficulty: 'complex' as const, deliverable: 'logo_v2' as const }, images: [{ data: Buffer.alloc(1) }] } : {}) }); const price = priceFor(r.provider, r.model); if (r.mode !== 'llm' || !price || price.unit !== 'tokens' || !activeProviderKey(r.provider as Parameters<typeof activeProviderKey>[0]))
        fail('Tarif ou fournisseur de contrôle non vérifié : aucun achat lancé.'); return [task, { provider: r.provider, model: r.model, effort: r.effort ?? null, price }]; }));
    return { image: { provider: image!.provider, model: image!.model }, texts };
}
function scope(pid: string) { return stableHash('native-logo-scope-1', { scope: logoScopeHash(loadProject(pid)), theme: currentTheme(pid)?.version.id ?? null }); }
function nativeOwned(u: User, pid: string) { ownedProject(u, pid); if (loadProject(pid).userId !== u.id)
    fail('Projet introuvable.', 404); }
function eligible(u: User, pid: string, input: Input) {
    nativeOwned(u, pid);
    requirePlan(u, pid);
    assertAiAllowed(u.id, pid);
    const p = loadProject(pid);
    if (!p.brand || p.brand.logo.status === 'provided')
        fail('Marque absente ou logo fourni conservé.');
    if (one("SELECT id FROM ai_reservations WHERE project_id=? AND status IN ('held','uncertain') AND job_id IN (SELECT id FROM jobs WHERE project_id=? AND type LIKE 'brand.logo%')", pid, pid))
        fail('Résultat fournisseur incertain : vérifier la consommation avant un nouvel achat.');
    const rights = seriesRights(pid), s = currentSeries(pid);
    if (input.operation === 'generate') {
        if ((!rights.partial || input.renew) && rights.used && !rights.canRenew)
            fail('Droit de nouvelle série indisponible.', 403);
        if (rights.partial && !input.renew && ((s?.attempts ?? 0) >= 2 || input.feedback.trim().length < 8))
            fail('Décrivez la correction avant de reprendre les seules directions manquantes.');
        if (s?.status === 'complete' && !input.renew)
            fail('Demandez explicitement une nouvelle série.');
    }
    else {
        const a = input.assetId ? getAsset(input.assetId) : null, m = a ? json<any>(a.meta, {}) : null;
        if (!a || a.project_id !== pid || a.user_id !== u.id || a.deleted_at || !['logo-v2', 'logo-v2-trial'].includes(a.role ?? '') || !m.artwork)
            fail('Logo complet introuvable.', 404);
        if (directionSeries(pid).some(s => s.requestKeys.includes(m.run)))
            fail('Utilisez la reprise ou le renouvellement de série.');
    }
}
function price(input: Input) { const q = input.operation === 'generate' ? logoSeriesQuote() : logoRedrawQuote(); if (!q || q.mode !== 'artwork' || !Number.isSafeInteger(q.maxMicro) || q.maxMicro <= 0)
    fail('Devis vérifiable indisponible : aucun achat lancé.'); return q!; }
function save(m: Saved) { remember(m.projectId, { kind: 'artifact', key: prefix + m.id, value: JSON.stringify(m), source: 'local', origin: 'system', status: 'inferred' }); }
function read(pid: string, qid: string) { return json<Saved | null>(one<{
    value: string;
}>("SELECT value FROM memory WHERE project_id=? AND kind='artifact' AND key=?", pid, prefix + qid)?.value, null); }
export function quoteNativeLogo(u: User, pid: string, raw: unknown) { const input = NativeLogoInput.parse(raw); return tx(() => { eligible(u, pid, input); const q = price(input), r = routes(), maximumPct = budgetPctOf(u.id, q.maxMicro, pid), estimatePct = budgetPctOf(u.id, q.probableMicro ?? q.maxMicro, pid); if (maximumPct == null || estimatePct == null)
    fail('Budget IA indisponible.'); assertCanSpend(u.id, q.maxMicro, pid); const at = now(), m: Saved = { id: id(), userId: u.id, projectId: pid, input, createdAt: at, expiresAt: at + 15 * 60000, capMicro: q.maxMicro, maximumPct: maximumPct!, estimatePct: estimatePct!, routes: r, fingerprint: stableHash('native-logo-price-1', { q, r }), scope: scope(pid), series: currentSeries(pid), assets: assetPins(pid), plan: seriesRights(pid).plan, budgetBase: pctBaseFor(u.id, pid), available: balance(u.id, pid).available }; save(m); return { id: m.id, maximumPct: m.maximumPct, estimatePct: m.estimatePct, expiresAt: m.expiresAt, operation: input.operation, confirmationRequired: true, included: !m.series, creations: q.creations }; }); }
function recheck(u: User, m: Saved, running = false) {
    nativeOwned(u, m.projectId);
    requirePlan(u, m.projectId);
    assertAiAllowed(u.id, m.projectId);
    if (now() > m.expiresAt || scope(m.projectId) !== m.scope || seriesRights(m.projectId).plan !== m.plan || pctBaseFor(u.id, m.projectId) !== m.budgetBase || stableHash('native-logo-price-1', { q: price(m.input), r: routes() }) !== m.fingerprint)
        fail('Devis périmé : identité, budget, route, tarif ou droits modifiés.');
    const s = currentSeries(m.projectId);
    if (!running || !s?.requestKeys.includes(m.jobId!)) {
        if (stableHash('series', s) !== stableHash('series', m.series))
            fail('La série a changé : nouveau devis requis.');
        eligible(u, m.projectId, m.input);
    }
    else {
        if (m.input.renew && m.series) {
            if (stableHash('series', directionSeries(m.projectId).find(old => old.id === m.series!.id)) !== stableHash('series', m.series))
                fail('Une série acquise a changé.');
        }
        else
            for (const direction of m.series?.directions ?? []) {
                if (stableHash('direction', s.directions.find(d => d.id === direction.id)) !== stableHash('direction', direction))
                    fail('Une direction acquise a changé.');
            }
    }
    const current = new Map(assetPins(m.projectId).map(a => [a.id, a]));
    for (const pin of m.assets)
        if (stableHash('asset', pin) !== stableHash('asset', current.get(pin.id)))
            fail('Un logo acquis a changé.');
    if (running) {
        const j = m.jobId ? getJob(m.jobId) : null;
        if (!j || !['queued', 'running'].includes(j.status) || j.attempts > 1)
            fail('Tâche arrêtée ou réessai non autorisé.');
        const spent = one<{
            c: number;
        }>(`SELECT COALESCE((SELECT SUM(CASE WHEN status='held' THEN amount ELSE COALESCE(actual,amount) END) FROM ai_reservations WHERE job_id=? AND status IN ('held','settled','uncertain','reconciled') AND usage_event_id IS NULL),0)+COALESCE((SELECT SUM(billed) FROM usage_events WHERE job_id=?),0)+COALESCE((SELECT SUM(cost) FROM ai_calls WHERE job_id=? AND usage_event_id IS NULL AND billing_dedup=0 AND status='ok'),0) c`, j.id, j.id, j.id)!.c;
        assertCanSpend(u.id, Math.max(0, m.capMicro - spent), m.projectId);
    }
    if (!running) {
        if (balance(u.id, m.projectId).available !== m.available)
            fail('Le budget disponible a changé : relisez le devis.');
        assertCanSpend(u.id, m.capMicro, m.projectId);
    }
}
export function confirmNativeLogo(u: User, pid: string, raw: unknown, inputRaw: unknown) { const consent = NativeLogoConsent.parse(raw), input = NativeLogoInput.parse(inputRaw); return tx(() => { nativeOwned(u, pid); requirePlan(u, pid); const m = read(pid, consent.quoteId); if (!m || m.userId !== u.id || m.projectId !== pid)
    fail('Devis introuvable.', 404); if (stableHash('input', m.input) !== stableHash('input', input) || consent.maximumPct !== m.maximumPct)
    fail('Le montant ou la demande diffère du devis.'); if (m.jobId) {
    if (m.requestId !== consent.requestId)
        fail('Cette confirmation est déjà utilisée.');
    return { jobId: m.jobId, quoteId: m.id, replayed: true };
} recheck(u, m); if (one("SELECT id FROM jobs WHERE project_id=? AND type LIKE 'brand.logo%' AND status IN ('queued','running','paused','blocked')", pid))
    fail('Une tâche logo existe déjà : vérifiez son résultat avant un achat.'); const job = enqueue({ userId: u.id, projectId: pid, type: input.operation === 'generate' ? 'brand.logo.v2' : 'brand.logo.v2.redraw', payload: { projectId: pid, nativeLogoQuote: m.id, costCapMicro: m.capMicro }, idempotencyKey: 'native-logo-consent:' + m.id, maxAttempts: 1 }); m.jobId = job.id;
        m.confirmedAt = now(); m.requestId = consent.requestId; save(m); return { jobId: job.id, quoteId: m.id, replayed: false }; }); }
/** Trusted worker entry, including before EACH provider request. No browser payload can manufacture this receipt. */
export async function runNativeLogo(ctx: JobContext, injected?: LogoV2Ai) {
    const pid = ctx.job.project_id!, qid = ctx.payload.nativeLogoQuote, m = typeof qid === 'string' ? read(pid, qid) : null, u = one<User>('SELECT * FROM users WHERE id=?', ctx.job.user_id);
    if (!m || !m.confirmedAt || !u || m.userId !== u.id || m.jobId !== ctx.job.id || m.projectId !== pid || ctx.payload.projectId !== pid || ctx.job.type !== (m.input.operation === 'generate' ? 'brand.logo.v2' : 'brand.logo.v2.redraw'))
        fail('Autorisation économique logo absente ou incohérente.');
    const saved = m!, user = u!;
    const check = () => recheck(user, saved, true);
    if (saved.startedAt)
        fail('Cette autorisation a déjà commencé son exécution. Vérifiez le reçu ; aucun nouvel achat automatique.');
    check();
    assertCanSpend(user.id, saved.capMicro, pid);
    tx(() => { const latest = read(pid, saved.id)!; if (latest.startedAt)
        fail('Cette autorisation est déjà en exécution.'); latest.startedAt = now(); save(latest); });
    const actual = injected ?? realLogoV2Ai(ctx, { singleCall: true, userId: user.id, projectId: pid, expectedImageRoute: saved.routes.image, beforeArtworkRequest: input => { check(); if (input.relay)
            fail('Relais non autorisé.'); }, beforeRequest: (call: LlmCall) => { check(); const r = routeLlm(call), expected = saved.routes.texts[call.task]; if (!expected || r.provider !== expected.provider || r.model !== expected.model || (r.effort ?? null) !== expected.effort)
            fail('La route de contrôle diffère du devis.'); call.expectedRoute = { provider: expected.provider, model: expected.model, ...(expected.effort ? { effort: expected.effort } : {}) }; } });
    const ai = new Proxy(actual, { get(target, key) { const value = Reflect.get(target, key); if (typeof value !== 'function' || key === 'artworkRoute')
            return value; return (...args: unknown[]) => { check(); return value.apply(target, args); }; } });
    const { runLogoEngineV2, redrawArtwork } = await import('./engine');
    const { withTrace } = await import('../ai/trace');
    return withTrace({ jobId: ctx.job.id, projectId: pid, costCapMicro: saved.capMicro }, async () => { if (saved.input.operation === 'redraw') {
        const result = await redrawArtwork(ctx, pid, saved.input.assetId!, { ai, feedback: saved.input.feedback, capMicro: saved.capMicro });
        if (!result.assetId)
            fail('Résultat non acquis. Aucun nouvel achat automatique.');
        const { imageDelivery } = await import('../media/delivery-check');
        return { ...result, quoteId: saved.id, delivery: await imageDelivery(pid, [result.assetId]) };
    } const result = await runLogoEngineV2(ctx, pid, { ai, completeSeries: true, style: saved.input.style, renew: saved.input.renew, correction: saved.input.feedback, expectedSeriesId: saved.series?.id ?? null, capMicro: saved.capMicro }); const series = currentSeries(pid); if (series?.status !== 'complete')
        fail('Série partielle conservée : aucun nouvel achat automatique.'); const { imageDelivery } = await import('../media/delivery-check'); return { quoteId: saved.id, seriesId: series.id, shown: series.directions.length, generated:result.shown.length, discarded:result.discarded.length, territories:result.territories.length, stoppedByCostCap:result.stoppedByCostCap, delivery: await imageDelivery(pid, series.directions.map(d => d.logoId), { expected: 3 }) }; });
}
/** Guided first creation already has its own persisted preparation quote and pending-job authority.
 * Unqualified historical callers must not bypass native consent by calling the engine directly.
 */
export async function assertGuidedLogoAuthorization(ctx: JobContext, pid: string) {
    const { stateOf } = await import('../preparation/store');
    const state = stateOf(pid), job = getJob(ctx.job.id), payload = job ? json<any>(job.payload, {}) : null;
    if (!job || job.type !== 'project.prepare' || job.project_id !== pid || job.user_id !== loadProject(pid).userId || payload?.action !== 'logo' || payload.paid !== true || !Number.isSafeInteger(payload.capMicro) || payload.capMicro <= 0 || state?.pending?.jobId !== job.id || state.revision !== payload.revision || state.pending.inputHash !== payload.inputHash)
        fail('Autorisation économique du logo absente : utilisez le devis natif ou la Préparation. Aucun appel lancé.');
    const quoted = all<{
        value: string;
    }>("SELECT value FROM memory WHERE project_id=? AND kind='artifact' AND key LIKE 'preparation.quote.%'", pid).some(row => { const q = json<any>(row.value, {}); return q.action === 'logo' && q.step === 'brand' && q.paid === true && q.revision === payload.revision - 1 && q.inputHash === payload.inputHash && q.capMicro === payload.capMicro && now() - q.createdAt <= 15 * 60000 && (q.correction ?? '') === (payload.correction ?? ''); });
    if (!quoted)
        fail('Devis logo de Préparation absent ou périmé : aucun appel lancé.');
}
