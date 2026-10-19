/** Real SQLite/queue/preparation/visual engine, injected providers, no paid call. */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { fixture } from './preparation-fixtures';
import { readyInitial, injectedInitial, executeInitial, makeInitialPlan } from './initial-fixtures';
import { prepareInitialCreatives, initialCreativesView, quoteInitialCreatives, queueInitialCreatives, confirmInitialContext, INITIAL_ASPECTS, realInitialDeps } from '@/lib/social-v2/initial';
import { exactConceptConflicts } from '@/lib/social-v2/initial-diversity';
import { all, one, run } from '@/lib/db';
import { loadProject, saveBrand } from '@/lib/projects';
import { getAsset, assetMeta } from '@/lib/library';
import { FORMATS } from '@/lib/image-v2/formats';
import { estimateProduction, produceBatch } from '@/lib/social-v2/production';
import { realSocialDeps } from '@/lib/social-v2/deps';
import { getJob } from '@/lib/jobs';
import { reviewInitialVisual } from '@/lib/social-v2/initial-diversity';
import { JobContext, enqueue } from '@/lib/jobs';
import { designPostWithAi } from '@/lib/social-v2/ai-post';
afterEach(() => vi.unstubAllGlobals());
describe('Vingt créations initiales distinctes — simulations', () => {
    it('prépare immédiatement sans IA, et attend les validations et le devis global', async () => { const f = await fixture(), d = injectedInitial(); prepareInitialCreatives(f.pid); prepareInitialCreatives(f.pid); expect(initialCreativesView(f.pid)).toMatchObject({ required: 20, accepted: 0, ready: false, ads: { required: 10 }, organic: { required: 10 }, themeMediaIncluded: false }); expect(() => quoteInitialCreatives(f.pid, d.deps)).toThrow(/Validez/); expect(d.plans).toBe(0); expect(all('SELECT id FROM jobs WHERE project_id=?', f.pid)).toHaveLength(0); });
    it.each([0, 1, 2, 3])('vingt concepts/fichiers, deux ensembles 4/3/3, cas %i', async (i) => {
        vi.stubGlobal('fetch', () => { throw Error('Réseau interdit'); });
        const f = await readyInitial(i), d = injectedInitial(), q = quoteInitialCreatives(f.pid, d.deps);
        expect(q).toMatchObject({ missing: 20, organicMissing: 10, adsMissing: 10, adsIncluded: true, themeMediaIncluded: false });
        const j = queueInitialCreatives(f.pid, q.id, d.deps);
        expect(queueInitialCreatives(f.pid, q.id, d.deps).jobId).toBe(j.jobId);
        await executeInitial(f.pid, d.deps, q.id);
        const v = initialCreativesView(f.pid)!;
        expect(v).toMatchObject({ accepted: 20, status: 'complete', ads: { accepted: 10 }, organic: { accepted: 10 } });
        expect(d.calls.map(x => x.aspect)).toEqual([...INITIAL_ASPECTS, ...INITIAL_ASPECTS]);
        expect(d.calls.filter(x => x.purpose === 'ad')).toHaveLength(10);
        expect(d.calls.filter(x => x.purpose === 'ad').map(x => [x.network,x.advertisingNetwork])).toEqual(Array.from({length:10},(_,i)=>i<4?['facebook','facebook']:['instagram','instagram']));
        expect(d.visuals).toHaveLength(20);
        expect(d.visuals.at(-1)!.accepted).toHaveLength(19);
        expect(new Set(v.slots.map(s => s.assetId)).size).toBe(20);
        for (const s of v.slots) {
            const a = getAsset(s.assetId!)!, m = assetMeta<any>(a);
            expect(a.role).toBe(s.group === 'ad' ? 'ad' : 'social');
            expect(m.finalImage.creative.purpose).toBe(s.group);
            expect(m.initialCreative).toMatchObject({ hash: v.hash, index: s.index, group: s.group });
            expect([a.width, a.height]).toEqual([FORMATS[s.aspect].width, FORMATS[s.aspect].height]);
            if (s.group === 'organic') {
                const row = one<any>('SELECT * FROM posts WHERE id=?', s.postId)!;
                expect(row.caption).toBe(d.plan.posts[s.index].caption);
                expect(row.scheduled_at).toBeNull();
                expect(row.connection_id).toBeNull();
                expect(row.approved_at).toBeNull();
            }
        }
        expect(all('SELECT id FROM posts WHERE project_id=?', f.pid)).toHaveLength(10);
        expect(all("SELECT id FROM assets WHERE project_id=? AND role='ad'", f.pid)).toHaveLength(10);
        expect(all('SELECT id FROM theme_versions WHERE project_id=?', f.pid)).toHaveLength(0);
        expect(quoteInitialCreatives(f.pid, d.deps).missing).toBe(0);
        expect(d.plans).toBe(1);
    });
    it('reprise des 17 manquantes, les trois acceptées et le plan conservés ; lot générique bloqué', async () => {
        const f = await readyInitial(), d = injectedInitial();
        d.failNext(4);
        await expect(executeInitial(f.pid, d.deps)).rejects.toThrow('Fournisseur indisponible');
        const before = initialCreativesView(f.pid)!;
        expect(before.accepted).toBe(3);
        const q = quoteInitialCreatives(f.pid, d.deps);
        expect(q).toMatchObject({ missing: 17, organicMissing: 7, adsMissing: 10 });
        const ids = before.slots.filter(s => s.postId && !s.accepted).map(s => s.postId!), generic = realSocialDeps(null, loadProject(f.pid), true);
        expect(estimateProduction(loadProject(f.pid), ids, generic, { allowPaid: true }).paid).toBe(0);
        const blocked = await produceBatch(loadProject(f.pid), ids, { ...generic, aiPost: async () => { throw Error('Double appel interdit'); } }, { allowPaid: true, maxCostEur: 1 });
        expect(blocked.produced).toBe(0);
        expect(blocked.notes.join(' ')).toContain('initiale');
        await executeInitial(f.pid, d.deps, q.id);
        expect(initialCreativesView(f.pid)!.accepted).toBe(20);
        expect(d.plans).toBe(1);
        expect(d.calls).toHaveLength(21);
        expect(initialCreativesView(f.pid)!.slots.slice(0, 3).map(s => s.assetId)).toEqual(before.slots.slice(0, 3).map(s => s.assetId));
    });
    it.each(['ad', 'local', 'wrongformat', 'stock', 'rejected'])('ne compte pas le résultat %s comme final', async (kind) => { const f = await readyInitial(), d = injectedInitial(), render = d.deps.render; d.deps.render = async (...args) => { const r = await render(...args); if (kind === 'ad')
        run("UPDATE assets SET role='ad' WHERE id=?", r.assetId); if (kind === 'local')
        run("UPDATE assets SET origin='upload' WHERE id=?", r.assetId); if (kind === 'wrongformat')
        run('UPDATE assets SET width=77 WHERE id=?', r.assetId); if (kind === 'stock')
        run("UPDATE assets SET meta=json_set(meta,'$.stock',json('{}')) WHERE id=?", r.assetId); if (kind === 'rejected')
        run("UPDATE assets SET status='rejected' WHERE id=?", r.assetId); return r; }; await expect(executeInitial(f.pid, d.deps)).rejects.toThrow(/non finale/); expect(initialCreativesView(f.pid)!.accepted).toBe(0); });
    it('modifications client et devis obsolète protégés', async () => { const f = await readyInitial(), d = injectedInitial(); d.failNext(2); await expect(executeInitial(f.pid, d.deps)).rejects.toThrow(); const v = initialCreativesView(f.pid)!, second = v.slots[1]; run("UPDATE posts SET user_edited=1,caption='Texte client conservé' WHERE id=?", second.postId); await expect(executeInitial(f.pid, d.deps)).rejects.toThrow(/modifiée par le client/); expect(one<any>('SELECT caption FROM posts WHERE id=?', second.postId)!.caption).toBe('Texte client conservé'); const q = quoteInitialCreatives(f.pid, d.deps), p = loadProject(f.pid); saveBrand(f.pid, { ...p.brand!, tagline: 'Identité modifiée' }); expect(() => queueInitialCreatives(f.pid, q.id, d.deps)).toThrow(); expect(getAsset(v.slots[0].assetId!)).toBeTruthy(); });
    it('budget indisponible avant appel ; appel de plan incertain non renvoyé', async () => { const f = await readyInitial(), d = injectedInitial(); d.deps.guard = () => { throw Error('Budget indisponible'); }; expect(() => quoteInitialCreatives(f.pid, d.deps)).toThrow('Budget'); expect(d.plans).toBe(0); d.deps.guard = () => { }; let n = 0; d.deps.plan = async () => { n++; throw Error('Résultat incertain'); }; await expect(executeInitial(f.pid, d.deps)).rejects.toThrow('incertain'); await expect(executeInitial(f.pid, d.deps)).rejects.toThrow('incertain'); expect(n).toBe(1); expect(d.calls).toHaveLength(0); expect(() => realInitialDeps().guard(loadProject(f.pid), 1)).toThrow(); });
    it('ancien parcours : accord explicite, pas d’invalidation par une direction technique calculée', async () => { const f = await readyInitial(), d = injectedInitial(); run("DELETE FROM memory WHERE project_id=? AND key LIKE 'preparation.%'", f.pid); expect(initialCreativesView(f.pid)!.ready).toBe(false); confirmInitialContext(f.pid); expect(initialCreativesView(f.pid)!.ready).toBe(true); await executeInitial(f.pid, d.deps); expect(initialCreativesView(f.pid)!.accepted).toBe(20); });
    it('même concept sous trois ratios refusé avant images, seuls les doublons sont remplacés', async () => { const f = await readyInitial(), d = injectedInitial(); for (const i of [4, 7])
        d.plan.posts[i].concept = structuredClone(d.plan.posts[0].concept); expect(exactConceptConflicts(d.plan).map(x => x.index)).toEqual([4, 7]); await executeInitial(f.pid, d.deps); expect(d.repairs[0]).toEqual([4, 7]); expect(d.calls).toHaveLength(20); expect(initialCreativesView(f.pid)!.accepted).toBe(20); });
    it('reformulation sémantique proche bloquée par la revue du plan malgré textes différents', async () => { const f = await readyInitial(), d = injectedInitial(); let reviews = 0; const base = d.deps.reviewPlan; d.deps.reviewPlan = async (...args) => { reviews++; if (reviews === 1) {
        expect(d.calls).toHaveLength(0);
        return { accepted: false, duplicates: [{ index: 4, duplicateOf: 0, reason: 'Même idée paraphrasée et même hiérarchie malgré un vocabulaire différent.' }], issues: [] };
    } return base(...args); }; await executeInitial(f.pid, d.deps); expect(d.repairs).toEqual([[4]]); expect(reviews).toBe(2); });
    it('doublon constaté sur les images réelles remplacé seul, organique et publicité comparés ensemble', async () => { const f = await readyInitial(), d = injectedInitial(); let duplicate = true; const base = d.deps.reviewVisual; d.deps.reviewVisual = async (...args) => { if (args[2] === 10 && duplicate) {
        duplicate = false;
        expect(args[4]).toHaveLength(10);
        return { accepted: false, duplicateOf: 0, reason: 'Image candidate visuellement identique à la première organique, seulement recadrée.' };
    } return base(...args); }; await executeInitial(f.pid, d.deps); expect(d.repairs).toEqual([[10]]); expect(d.calls).toHaveLength(21); expect(initialCreativesView(f.pid)!.accepted).toBe(20); expect(all("SELECT id FROM assets WHERE project_id=? AND status='rejected' AND json_extract(meta,'$.initialDiversity') IS NOT NULL", f.pid)).toHaveLength(1); });
    it('diversité non obtenue : arrêt borné, pas vingt faux résultats', async () => { const f = await readyInitial(), d = injectedInitial(); const base = d.deps.reviewVisual; d.deps.reviewVisual = async (...args) => args[2] === 1 ? { accepted: false, duplicateOf: 0, reason: 'Toujours la même composition que le premier visuel accepté.' } : base(...args); await expect(executeInitial(f.pid, d.deps)).rejects.toThrow(/Limite|incomplet/); expect(initialCreativesView(f.pid)!.accepted).toBe(1); expect(d.calls).toHaveLength(4); expect(d.repairs).toHaveLength(2); });
    it('le contrôleur réel reçoit les fichiers de la candidate et de chaque création acceptée', async () => {
        const f = await readyInitial(), p = loadProject(f.pid), d = injectedInitial();
        d.failNext(4);
        await expect(executeInitial(f.pid, d.deps)).rejects.toThrow();
        const slots = initialCreativesView(f.pid)!.slots;
        const llm = await import('@/lib/ai/llm');
        let request: any;
        const stub = vi.spyOn(llm, 'llmJson').mockImplementation(async (call: any) => { request = call; return { accepted: false, duplicateOf: 0, reason: 'Comparaison simulée de vrais buffers transmis au contrôleur.' } as any; });
        try {
            const ctx = new JobContext(getJob(initialCreativesView(f.pid)!.jobId!)!);
            await reviewInitialVisual(p, makeInitialPlan(), 2, slots[2].assetId!, slots.slice(0, 2).map(s => ({ index: s.index, assetId: s.assetId! })), 'comparison-test', ctx);
            expect(request.images).toHaveLength(3);
            expect(request.images[0].label).toBe('CANDIDATE index 2');
            expect(request.images[1].label).toBe('ACCEPTED index 0');
            expect(request.images.every((x: any) => Buffer.isBuffer(x.data) && x.data.length > 0)).toBe(true);
            expect(request.prompt).toContain('ACTUAL candidate');
        }
        finally {
            stub.mockRestore();
        }
    });
    it('le budget d’essais restant est transmis au moteur natif, sans réinitialiser trois essais', async () => {
        const f = await readyInitial(), d = injectedInitial();
        let generations = 0;
        const generate = d.ai.generate;
        d.ai.generate = async (...args) => { generations++; return generate(...args); };
        d.ai.review = async () => ({ person: false, anatomyOk: true, productFaithful: true, textsExact: false, legible: false, score: 0, transcribed: [], issues: ['Refus simulé'], fix: 'Corriger la lecture' });
        const post = { id: 'remaining-attempt-test', entryPoint: 'publications' as const, network: 'instagram', format: 'image', title: 'Observer le matériel', headline: 'Observer le matériel', caption: 'Regarder les éléments fournis avant de commencer.', pillar: 'conseil', objective: 'educate', scheduled_at: null, editorial: { structure: 'advice' as const, blocks: [{ kind: 'tip' as const, text: 'Observer le matériel fourni.' }] } };
        const result = await designPostWithAi(loadProject(f.pid), post, { aspect: '1:1', reference: null, maxCostEur: 1, maxAttempts: 1 }, d.ai);
        expect(result.assetId).toBeNull();
        expect(generations).toBe(1);
    });
    it('le branchement réel conserve toutes les prestations quand aucun service particulier n’est choisi', async () => {
        const f = await readyInitial(1), p = loadProject(f.pid), engine = await import('@/lib/social-v2/ai-post');
        let options: any;
        const stub = vi.spyOn(engine, 'designPostWithAi').mockImplementation(async (_p, _post, o) => { expect(_p.services.services).toEqual(p.services.services); options = o; return { assetId: null, costMicro: 0, by: 'image_v2' }; });
        try {
            const j = enqueue({ userId: p.userId, projectId: p.id, type: 'test.initial.context', payload: {} });
            await realInitialDeps().render(p, { id: 'service-global', entryPoint: 'ads-campaign', network: 'instagram', format: 'image', title: 'Services documentés', headline: 'Services documentés', caption: 'Présentation des prestations fournies.', pillar: 'présenter', objective: 'convert', scheduled_at: null }, '1:1', 100, new JobContext(j), 2);
            expect(options.subject).toBeNull();
            expect(options.maxAttempts).toBe(2);
            expect(options.as).toBe('ad');
        }
        finally {
            stub.mockRestore();
        }
    });
});
