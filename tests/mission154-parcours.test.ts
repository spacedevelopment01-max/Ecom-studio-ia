const isolatedDatabase = vi.hoisted(() => { const fs = process.getBuiltinModule('fs'); const root = process.env.DATA_DIR; if (!root)
    throw Error('Isolated tests required'); const globals = globalThis as {
    __ecomDb?: {
        close(): void;
    };
}, previous = globals.__ecomDb; delete globals.__ecomDb; vi.stubEnv('DATA_DIR', fs.mkdtempSync(root + '/mission154-')); return { previous }; });
afterAll(() => { const globals = globalThis as {
    __ecomDb?: {
        close(): void;
    };
}; if (globals.__ecomDb !== isolatedDatabase.previous)
    globals.__ecomDb?.close(); if (isolatedDatabase.previous)
    globals.__ecomDb = isolatedDatabase.previous;
else
    delete globals.__ecomDb; vi.unstubAllEnvs(); });
/** Native routes, accounts, jobs, versions and media engine; all supplier transports are simulated. */
import { it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
const session = vi.hoisted(() => ({ user: null as any }));
vi.mock('@/lib/auth', async (original) => ({ ...await original<typeof import('@/lib/auth')>(), requireUser: async () => session.user, currentUser: async () => session.user }));
import { clientFixture, clientPhoto } from './mission154-fixtures';
import { chooseGeneralistForTest } from './strategy-choice-fixture';
import { buildShop } from '@/lib/engine/shop';
import { currentTheme, listThemeVersions, loadProject, saveProduct, saveThemeVersion } from '@/lib/projects';
import { runWithLang } from '@/lib/i18n-server';
import { POST as choose } from '@/app/api/projects/[id]/theme/build/route';
import { GET as prepare } from '@/app/api/projects/[id]/theme/adaptation/route';
import { POST as images } from '@/app/api/projects/[id]/images/v2/route';
import { claimNext, completeJob, enqueue, getJob, JobContext } from '@/lib/jobs';
import { handlers } from '../worker/handlers';
import { run, one, all } from '@/lib/db';
import { grantProjectPlan } from '@/lib/project-subscriptions';
import { assertJobEntitlements } from '@/lib/job-entitlements';
import { placementRequest } from '@/lib/theme/placement-request';
import { applyOps } from '@/lib/theme/ops';
import { mockDeps } from './image-v2-mock';
import { runImageEngineV2 } from '@/lib/image-v2/engine';
import { assetData, getAsset } from '@/lib/library';
import { assertCanSpend, balance } from '@/lib/billing';
const fr = <T,>(fn: () => T) => runWithLang({ ui: 'fr', content: 'fr' }, fn);
const ctx = (id: string) => ({ params: Promise.resolve({ id }) }) as never;
const post = (body: any) => new Request('http://localhost/test', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
beforeEach(() => vi.stubGlobal('fetch', async () => { throw Error('External supplier forbidden'); }));
afterEach(() => vi.unstubAllGlobals());
it('choix explicite et double clic : une tâche, une version, acquisition sans fournisseur et état partiel inférieur à 100 %', async () => {
    const f = await clientFixture({ incomplete: true });
    session.user = f.user;
    const response = await fr(() => choose(post({ direction: 'traverse' }), ctx(f.pid)));
    const first = await response.json();
    expect(response.status).toBe(200);
    const duplicate = await (await fr(() => choose(post({ direction: 'traverse' }), ctx(f.pid)))).json();
    expect(duplicate.jobId).toBe(first.jobId);
    const job = claimNext()!;
    expect(job.id).toBe(first.jobId);
    const result = await fr(() => handlers[job.type](new JobContext(job))) as Awaited<ReturnType<typeof buildShop>>;
    completeJob(job.id, result);
    expect(getJob(job.id)?.status).toBe('done');
    expect(getJob(job.id)?.progress).toBeLessThan(1);
    expect(result.delivery.state).toBe('partial');
    expect(listThemeVersions(f.pid)).toHaveLength(1);
    const again = await fr(() => buildShop(null, f.pid, { direction: 'traverse', useAi: false }));
    expect(again.versionId).toBe(result.versionId);
    expect(listThemeVersions(f.pid)).toHaveLength(1);
    expect(one<{
        n: number;
    }>('SELECT COUNT(*) n FROM ai_calls WHERE project_id=?', f.pid)?.n).toBe(0);
});
it('préparation exacte, isolation, budget réellement insuffisant et changement de contexte bloquent avant toute génération', async () => {
    const f = await clientFixture({ incomplete: true });
    session.user = f.user;
    await fr(() => buildShop(null, f.pid, { direction: 'traverse', useAi: false }));
    const current = currentTheme(f.pid)!, plan = current.spec.meta!.adaptation!;
    const request = plan.generationRequests.find(r => r.role === 'detail')!;
    expect(request).toBeTruthy();
    const url = `http://localhost/test?version=${current.version.id}&slot=${encodeURIComponent(request.key)}`;
    const prep = await fr(() => prepare(new Request(url), ctx(f.pid)));
    expect(prep.status).toBe(200);
    const data = await prep.json();
    expect(data.request.request).toContain(f.project.product.name);
    const foreign = await clientFixture();
    session.user = foreign.user;
    expect((await fr(() => prepare(new Request(url), ctx(f.pid)))).status).toBe(404);
    session.user = f.user;
    const value = balance(f.subscription);
    run('UPDATE wallets SET monthly_used=monthly_allowance,topup_balance=0 WHERE user_id=?', f.subscription);
    expect(() => assertCanSpend(f.user.id, 1000, f.pid)).toThrow();
    expect(all('SELECT id FROM ai_calls WHERE project_id=?', f.pid)).toHaveLength(0);
    saveProduct(f.pid, { ...loadProject(f.pid).product, summary: 'Contexte corrigé par le client.' });
    expect(() => placementRequest(f.pid, data.themePlacement)).toThrow(/changé/);
    expect((await fr(() => images(post({ action: 'generate', request: { themePlacement: data.themePlacement, kind: 'usage_scene', allowGenerate: true } }), ctx(f.pid)))).status).toBe(409);
    expect(all('SELECT id FROM ai_calls WHERE project_id=?', f.pid)).toHaveLength(0);
    expect(value.available).toBeGreaterThan(0);
});
it('média acquis par le moteur simulé puis réutilisé : une seule génération, emplacement exact repris sans écraser une retouche', async () => {
    const f = await clientFixture({ incomplete: true });
    await fr(() => buildShop(null, f.pid, { direction: 'traverse', useAi: false }));
    const current = currentTheme(f.pid)!, plan = current.spec.meta!.adaptation!;
    const req = plan.generationRequests.find(r => r.role === 'detail')!;
    const ref = { versionId: current.version.id, slotKey: req.key, contextHash: plan.contextHash };
    const mock = mockDeps({ reference: assetData(getAsset(f.assets[0].id)!), generate: () => clientPhoto('detail', 23) });
    const request = { kind: 'product_image' as const, aspect: '1:1' as const, allowGenerate: true, noStock: true, instructions: req.request, references: req.referenceAssetIds, peopleAllowed: false, slot: `theme:${req.role}:${plan.contextHash}:${req.key}`, themePlacement: ref };
    const r = await fr(() => runImageEngineV2(null, f.pid, request, mock.deps));
    expect(r.outcomes[0].assetId, JSON.stringify(r)).toBeTruthy();
    const repeated = await fr(() => runImageEngineV2(null, f.pid, request, mock.deps));
    expect(repeated.outcomes[0].assetId).toBe(r.outcomes[0].assetId);
    expect(mock.log.generations).toHaveLength(1);
    const section = current.spec.templates.index.order[0];
    const edited = applyOps(current.spec, [{ op: 'set_setting', template: 'index', section, key: 'heading', value: 'Mon titre à conserver intégralement' }], { storeKind: 'specialty' });
    expect(edited.rejected).toEqual([]);
    saveThemeVersion(f.pid, edited.spec, 'Retouche explicite', 'user');
    await fr(() => buildShop(null, f.pid, { direction: 'traverse', useAi: false }));
    const next = currentTheme(f.pid)!.spec;
    expect(next.templates.index.sections[section].settings.heading).toBe('Mon titre à conserver intégralement');
    expect(next.meta!.adaptation!.slots.find(s => s.key === req.key)?.assetId).toBe(r.outcomes[0].assetId);
});
it.each(['creer', 'vendre'] as const)('%s : baisse après mise en file et publicité directe restent refusées sans dépense', async (plan) => {
    const f = await clientFixture();
    const job = enqueue({ userId: f.user.id, projectId: f.pid, type: 'shop.direction', payload: { projectId: f.pid, direction: 'traverse' } }); // TRAVERSE : Dominer seulement (NOCTIL s'ouvre dès Développer depuis l'intégration #159/#161).
    grantProjectPlan(f.pid, plan);
    const claimed = claimNext()!;
    expect(claimed.id).toBe(job.id);
    await expect(fr(() => handlers[job.type](new JobContext(claimed)))).rejects.toThrow(/forfait/);
    expect(() => assertJobEntitlements('image.v2', f.pid, { request: { kind: 'ad_image' } })).toThrow(/Dominer/);
    expect(all('SELECT id FROM ai_calls WHERE project_id=?', f.pid)).toHaveLength(0);
});
it('média acquis pendant la préparation : réutilisé dans le thème sans nouvelle génération', async () => { const f = await clientFixture({ incomplete: true }); const mock = mockDeps({ reference: assetData(getAsset(f.assets[0].id)!), generate: () => clientPhoto('opening', 47) }); const result = await fr(() => runImageEngineV2(null, f.pid, { kind: 'usage_scene', aspect: '16:9', allowGenerate: true, noStock: true, references: [f.assets[0].id], peopleAllowed: false, instructions: 'Montrer la théière fournie sur une table, sans texte ni personne.', slot: 'preparation:home:hero' }, mock.deps)); const assetId = result.outcomes[0].assetId; expect(assetId, JSON.stringify(result)).toBeTruthy(); await fr(() => buildShop(null, f.pid, { direction: 'traverse', useAi: false })); const s = currentTheme(f.pid)!.spec; expect(s.meta!.adaptation!.slots.some(x => x.assetId === assetId)).toBe(true); expect(mock.log.generations).toHaveLength(1); expect(all('SELECT id FROM ai_calls WHERE project_id=?', f.pid)).toHaveLength(0); });

it('deux reprises successives : pages de référence actualisées et retouches client conservées à travers les compositions automatiques', async () => {
    const f = await clientFixture();
    await fr(() => buildShop(null, f.pid, { direction: 'fraise', useAi: false }));
    const initial = currentTheme(f.pid)!;
    const section = initial.spec.templates.index.order[0];
    const edited = applyOps(initial.spec, [{ op: 'set_setting', template: 'index', section, key: 'heading', value: 'Mon titre exact, à conserver sur chaque reprise' }], { storeKind: 'specialty' });
    const privacy = edited.spec.store.pages.find(p => p.template_suffix === 'confidentialite')!;
    privacy.title = 'Ma politique de confidentialité vérifiée';
    privacy.seo = { title: 'Ma politique complète', description: 'Ma description à préserver' };
    saveThemeVersion(f.pid, edited.spec, 'Retouche client', 'user');
    for (const summary of ['Un premier contexte actualisé.', 'Un second contexte différent.']) {
        saveProduct(f.pid, { ...loadProject(f.pid).product, summary });
        // A changed factual context must be reconciled explicitly under #160 before rebuilding.
        chooseGeneralistForTest(f.pid);
        await fr(() => buildShop(null, f.pid, { direction: 'fraise', useAi: false }));
        const current = currentTheme(f.pid)!.spec;
        expect(current.templates.index.sections[section].settings.heading).toBe('Mon titre exact, à conserver sur chaque reprise');
        const page = current.store.pages.find(p => p.handle === privacy.handle)!;
        expect(page.title).toBe(privacy.title);
        expect(page.seo).toEqual(privacy.seo);
        expect(page.template_suffix).toBe('confidentialite');
        expect(current.templates['page.confidentialite'].sections.main.disabled).toBe(false);
        expect(current.store.pages.some(p => p.template_suffix?.startsWith('kept-'))).toBe(false);
    }
    expect(listThemeVersions(f.pid)).toHaveLength(4);
    expect(all('SELECT id FROM ai_calls WHERE project_id=?', f.pid)).toHaveLength(0);
}, 90000);
