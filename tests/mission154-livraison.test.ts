import {chooseGeneralistForTest} from './strategy-choice-fixture';
const isolatedDatabase = vi.hoisted(() => {
    const fs = process.getBuiltinModule('fs');
    const root = process.env.DATA_DIR;
    if (!root)
        throw Error('Isolated tests required');
    const globals = globalThis as {
        __ecomDb?: {
            close(): void;
        };
    }, previous = globals.__ecomDb;
    delete globals.__ecomDb;
    vi.stubEnv('DATA_DIR', fs.mkdtempSync(root + '/mission154-'));
    return { previous };
});
afterAll(() => {
    const globals = globalThis as {
        __ecomDb?: {
            close(): void;
        };
    };
    if (globals.__ecomDb !== isolatedDatabase.previous)
        globals.__ecomDb?.close();
    if (isolatedDatabase.previous)
        globals.__ecomDb = isolatedDatabase.previous;
    else
        delete globals.__ecomDb;
    vi.unstubAllEnvs();
});
/** Integrated delivery: native exports and persisted versions, isolated decodable inputs, no supplier. */
import fs from 'node:fs';
import { it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest';
import sharp from 'sharp';
const session = vi.hoisted(() => ({ user: null as any }));
vi.mock('@/lib/auth', async (o) => ({ ...await o<object>(), requireUser: async () => session.user, currentUser: async () => session.user }));
import { clientFixture } from './mission154-fixtures';
import { buildShop } from '@/lib/engine/shop';
import { runWithLang } from '@/lib/i18n-server';
import { currentTheme, saveThemeVersion, saveProduct, saveBrand, loadProject, remember } from '@/lib/projects';
import { cmsExport, CMS_PLATFORMS, checkCmsExport } from '@/lib/cms-v2/export';
import { libraryLoader } from '@/lib/theme/loader';
import { unzipSync, strFromU8 } from 'fflate';
import { assetData, getAsset, saveAsset } from '@/lib/library';
import { storagePath } from '@/lib/storage';
import { GET as themeGet } from '@/app/api/projects/[id]/theme/route';
import { POST as videoPost } from '@/app/api/projects/[id]/videos/bank/route';
import { themeAllowed } from '@/lib/theme/theme-access';
import { grantProjectPlan } from '@/lib/project-subscriptions';
import { assertRepairableConversation } from '@/lib/theme/plan-access';
import { run, all } from '@/lib/db';
import { localCopy } from '@/lib/engine/local-copy';
const fr = <T,>(fn: () => T) => runWithLang({ ui: 'fr', content: 'fr' }, fn);
const ctx = (id: string) => ({ params: Promise.resolve({ id }) }) as never;
beforeEach(() => vi.stubGlobal('fetch', async () => { throw Error('External supplier forbidden'); }));
afterEach(() => vi.unstubAllGlobals());
it.each(['creer', 'vendre', 'dominer'] as const)('%s : matrice réelle des onze références et droits de famille', plan => {
    const count = plan === 'creer' ? 1 : plan === 'vendre' ? 3 : 5;
    // Familles réconciliées à l'intégration #159 / #161 : ONDE, HEUREN, ALCÔVE, SOUPLE en E-commerce ; MUSEAU CLUB spécialisée.
    for (const family of [['fraise', 'sillon', 'noctil', 'traverse', 'museau-club'], ['orbe', 'onde', 'heuren', 'alcove', 'souple'], ['rive']])
        for (const [id, i] of family.map((id, i) => [id, i] as const))
            expect(themeAllowed(plan, id)).toBe(i < count);
    expect(themeAllowed(null, 'fraise')).toBe(false);
});
it('nouvelle session : retouches des pages, menus, identité et verrous conservées, état actualisé sans écriture', async () => {
    const f = await clientFixture();
    session.user = f.user;
    await fr(() => buildShop(null, f.pid, { direction: 'sillon', useAi: false }));
    const old = currentTheme(f.pid)!, s = structuredClone(old.spec);
    s.store.pages[0].title = 'Une page que je nomme';
    s.store.pages[0].body_html = '<p>Mon paragraphe long, conservé sans réduction.</p>';
    s.settings.logo_width = 183;
    s.store.menus['main-menu'].links.push({ title: 'Mon contact', url: '/pages/contact' });
    s.locks.push('index:' + s.templates.index.order[0]);
    saveThemeVersion(f.pid, s, 'Retouches du client', 'user');
    await saveAsset({ projectId: f.pid, userId: f.user.id, data: await sharp({ create: { width: 900, height: 600, channels: 3, background: '#bca990' } }).jpeg().toBuffer(), mime: 'image/jpeg', name: 'nouvelle-vue.jpg', role: 'lifestyle', origin: 'upload', status: 'approved', meta: { themeContent: { role: 'use', description: 'Nouvelle vue fournie par le client', reviewed: true, subject: 'product:main' } } });
    await fr(() => buildShop(null, f.pid, { direction: 'sillon', useAi: false }));
    const next = currentTheme(f.pid)!;
    expect(next.spec.store.pages.find(p => p.title === 'Une page que je nomme')?.body_html).toBe(s.store.pages[0].body_html);
    expect(next.spec.settings.logo_width).toBe(183);
    expect(next.spec.store.menus['main-menu'].links.at(-1)?.title).toBe('Mon contact');
    expect(next.spec.locks).toContain(s.locks.at(-1));
    const file = Object.values(next.spec.files).find(id => getAsset(id)?.role !== 'logo')!, a = getAsset(file)!, bytes = assetData(a);
    fs.writeFileSync(storagePath(a.storage_key), 'corrupt');
    const response = await fr(() => themeGet(new Request('http://localhost/theme'), ctx(f.pid)));
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.adaptation.excluded.some((x: any) => x.id === a.id && x.reason === 'file_missing_or_undecodable')).toBe(true);
    expect(currentTheme(f.pid)?.version.id).toBe(next.version.id);
    fs.writeFileSync(storagePath(a.storage_key), bytes);
});
it.each(['products', 'services'] as const)('%s : ZIP natifs des cinq plateformes, textes entiers, fichiers décodés et plan partiel explicite', async (business) => {
    const f = await clientFixture({ services: business === 'services' });
    await fr(() => buildShop(null, f.pid, { direction: business === 'services' ? 'rive' : 'traverse', useAi: false }));
    const s = currentTheme(f.pid)!.spec;
    for (const platform of CMS_PLATFORMS) {
        const exp = await fr(() => cmsExport(platform, s, libraryLoader, { projectId: f.pid }));
        const entries = unzipSync(exp.zip), manifest = Object.keys(entries).find(k => k.endsWith('adaptation-client.json'))!;
        expect(manifest, platform).toBeTruthy();
        expect(JSON.parse(strFromU8(entries[manifest])).status).toBe(s.meta!.adaptation!.status);
        const config = Object.keys(entries).find(k => k.endsWith('configuration-studio.json') || k.endsWith('config/es-studio.json') || k.endsWith('assets/es-studio.json'))!;
        expect(strFromU8(entries[config]), platform).toContain(f.brand);
        expect(strFromU8(entries[config])).toContain(f.copy.product.description_html);
        for (const file of Object.keys(s.files)) {
            const entry = Object.keys(entries).find(k => k.endsWith('/' + file));
            expect(entry, platform + ':' + file).toBeTruthy();
            expect((await sharp(entries[entry!]).metadata()).width).toBeGreaterThan(0);
        }
        if (['wix', 'squarespace'].includes(platform)) {
            expect(exp.kind).toBe('kit');
            expect(strFromU8(entries['GUIDE.md'])).toMatch(/pas.*import natif|not a verified native importer/);
        }
    }
}, 120000);
it('un fichier corrompu après sauvegarde bloque la livraison exportée, sans toucher à la version ni au fichier acquis', async () => { const f = await clientFixture(); await fr(() => buildShop(null, f.pid, { direction: 'traverse', useAi: false })); const v = currentTheme(f.pid)!, a = getAsset(Object.values(v.spec.files)[0])!, bytes = assetData(a); fs.writeFileSync(storagePath(a.storage_key), 'truncated'); const exp = await cmsExport('shopify', v.spec, libraryLoader, { projectId: f.pid }); expect(exp.issues.some(i => i.code === 'client_media_unavailable' && i.severity === 'blocking')).toBe(true); const checked = await checkCmsExport('shopify', exp, v.spec, { projectId: f.pid }); expect(checked.gate.decision.verdict).toBe('RETRY'); const { exportAndRecord } = await import('@/lib/cms-v2/record'); await expect(exportAndRecord({ id: f.pid, userId: f.user.id }, { spec: v.spec, id: v.version.id, number: v.version.number }, 'shopify', 'fr')).rejects.toMatchObject({ status: 422 }); expect(currentTheme(f.pid)?.version.id).toBe(v.version.id); fs.writeFileSync(storagePath(a.storage_key), bytes); });
it('une mauvaise proposition de famille ne masque pas la vérification de forfait de l’opération suivante', async () => { const f = await clientFixture({ services: true, plan: 'vendre' }); await fr(() => buildShop(null, f.pid, { direction: 'rive', useAi: false })); expect(() => assertRepairableConversation(f.pid, currentTheme(f.pid)!.spec, [{ op: 'add_section', template: 'index', type: 'gallery-mosaic' }, { op: 'custom_section', type: 'es-custom-154', name: 'Test', liquid: '<section>Test</section>' }])).toThrow(/Dominer/); });
it('vidéo préparée : contexte périmé refusé avant fournisseur, aucun coût ni nouvelle tâche', async () => { const f = await clientFixture(); session.user = f.user; await fr(() => buildShop(null, f.pid, { direction: 'noctil', useAi: false })); let v = currentTheme(f.pid)!; const videoSpec = structuredClone(v.spec), initial = videoSpec.meta!.adaptation!; const videoRequest = { ...initial.generationRequests[0], key: 'index:client-video:video_asset', kind: 'video' as const, role: 'video' as const, referenceAssetIds: [f.assets[0].id], request: 'Vue animée du produit fourni, sans personne ni texte.' }; initial.generationRequests.push(videoRequest); saveThemeVersion(f.pid, videoSpec, 'Emplacement vidéo préparé explicitement', 'user'); v = currentTheme(f.pid)!; const plan = v.spec.meta!.adaptation!, request = plan.generationRequests.find(r => r.kind === 'video')!; expect(request).toBeTruthy(); expect(request.referenceAssetIds.length).toBeGreaterThan(0); saveProduct(f.pid, { ...loadProject(f.pid).product, summary: 'Contexte modifié explicitement.' }); const response = await fr(() => videoPost(new Request('http://localhost/video', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'ai', imageId: request.referenceAssetIds[0], approvedEstimateMicro: 1000000, themePlacement: { versionId: v.version.id, slotKey: request.key, contextHash: plan.contextHash } }) }), ctx(f.pid))); expect(response.status).toBe(409); expect(all('SELECT id FROM ai_calls WHERE project_id=?', f.pid)).toHaveLength(0); expect(all('SELECT id FROM jobs WHERE project_id=?', f.pid)).toHaveLength(0); });
it.each([{ brand: 'Pli', name: 'Tablier Lin', summary: 'Un tablier en lin naturel avec deux poches et des liens à nouer.', fact: ['Matière', 'Lin'], direction: 'onde' }, { brand: 'Accord', name: 'Réglage de violon sur rendez-vous', summary: 'Un rendez-vous individuel pour contrôler l’instrument et définir son réglage.', fact: ['Accueil', 'Sur rendez-vous'], direction: 'rive' }] as const)('cas nouveau $brand : métier et faits remplacés sans règle de nom', async (c) => {
    const services = c.direction === 'rive', f = await clientFixture({ incomplete: true, brand: c.brand, services });
    for (const a of f.assets)
        run('UPDATE assets SET deleted_at=? WHERE id=?', Date.now(), a.id);
    const p = { ...loadProject(f.pid).product, name: c.name, summary: c.summary, category: services ? 'Lutherie' : 'Vêtements de travail', facts: [{ key: 'given', label: c.fact[0], value: c.fact[1], status: 'confirmed' as const, source: 'user' as const }] };
    saveProduct(f.pid, p);
    const b = { ...loadProject(f.pid).brand!, name: c.brand, story: c.summary, tagline: c.name, positioning: c.summary, values: [], validated: ['fonts'] };
    saveBrand(f.pid, b);
    if (services) {
        const { saveServices } = await import('@/lib/projects');
        saveServices(f.pid, { ...loadProject(f.pid).services, services: [{ key: 'reglage', name: c.name, description: c.summary, price: '', duration: '' }] });
    }
    const project = loadProject(f.pid), copy = localCopy(p, b, project);
    remember(f.pid, { kind: 'artifact', key: 'shop_copy', value: JSON.stringify(copy), source: 'user' });
    const drawing = services ? '<path d="M420 140Q330 220 420 290Q490 360 410 460Q330 530 450 650Q600 730 670 600Q700 510 610 450Q530 390 610 310Q700 220 590 140Z" fill="#815039"/><path d="M500 120V640" stroke="#d8bd94" stroke-width="22"/>' : '<path d="M320 220L450 120H600L730 220L820 790H230Z" fill="#bfa77f"/><rect x="350" y="500" width="330" height="190" fill="#b59a6f"/><path d="M450 125Q525 -35 600 125" fill="none" stroke="#bfa77f" stroke-width="38"/>';
    await saveAsset({ projectId: f.pid, userId: f.user.id, data: await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="900"><rect width="1000" height="900" fill="#eee8db"/>${drawing}</svg>`)).jpeg().toBuffer(), name: 'client-input.jpg', mime: 'image/jpeg', role: 'packshot', origin: 'upload', status: 'approved', meta: { simulation: true, themeContent: { role: services ? 'opening' : 'packshot', description: c.summary, reviewed: true, subject: services ? '' : 'product:main' } } });
    // New facts and identity are explicitly reconciled, keeping the already chosen Generalist identity and quota.
    if(!services)chooseGeneralistForTest(f.pid);
    await fr(() => buildShop(null, f.pid, { direction: c.direction, useAi: false }));
    const result = currentTheme(f.pid)!.spec;
    expect(result.store.shopName).toBe(c.brand);
    expect(result.store.product.title).toBe(c.name);
    expect(result.store.product.description_html).toContain(c.summary);
    expect(JSON.stringify(result.store)).not.toMatch(/Anse|Céramor|700 ml|Atelier Rive/);
    expect(result.settings.type_heading_font).toBe('cormorant_n5');
    expect(result.meta!.adaptation!.status).toBe('partial');
});
it.each([{ zone: 'Europe/Paris', days: 6 }, { zone: 'Pacific/Kiritimati', days: 7 }])('horizon réel en $zone : préparation utile, garde de $days jours inchangée', async ({ zone, days }) => {
    const f = await clientFixture({ incomplete: true, plan: 'creer' });
    const { saveSettings } = await import('@/lib/projects');
    saveSettings(f.pid, { ...loadProject(f.pid).settings, timezone: zone });
    const at = Date.parse('2026-10-20T23:30:00Z'), clock = vi.spyOn(Date, 'now').mockReturnValue(at);
    try {
        const { planFromAsk } = await import('@/lib/social-v2/engine');
        const r = fr(() => planFromAsk(loadProject(f.pid), 'Prépare 30 jours avec une publication par jour'));
        expect(r.request.days).toBe(days);
        const rows = all<{
            scheduled_at: number;
        }>('SELECT scheduled_at FROM posts WHERE project_id=?', f.pid);
        expect(rows.length).toBeGreaterThan(0);
        expect(rows.every(x => x.scheduled_at <= at + 7 * 86400000 + 3600000)).toBe(true);
        if (days < 7)
            expect(r.notes.join(' ')).toContain('jours complets préparés');
    }
    finally {
        clock.mockRestore();
    }
});
it('référence corrompue : préparation et génération refusées avant coût ; fausse vidéo décodable exclue malgré ses dimensions déclarées', async () => { const f = await clientFixture({ incomplete: true }); await fr(() => buildShop(null, f.pid, { direction: 'traverse', useAi: false })); const v = currentTheme(f.pid)!, plan = v.spec.meta!.adaptation!, request = plan.generationRequests[0], a = getAsset(request.referenceAssetIds[0])!, bytes = assetData(a); fs.writeFileSync(storagePath(a.storage_key), 'invalid image'); const { checkedPlacementRequest } = await import('@/lib/theme/placement-request'); await expect(checkedPlacementRequest(f.pid, { versionId: v.version.id, slotKey: request.key, contextHash: plan.contextHash })).rejects.toMatchObject({ status: 409 }); fs.writeFileSync(storagePath(a.storage_key), bytes); await expect(saveAsset({ projectId: f.pid, userId: f.user.id, data: Buffer.from('not a video'), mime: 'video/mp4', kind: 'video', name: 'invalid-fixture.mp4', role: 'clip', origin: 'upload', status: 'approved' })).rejects.toMatchObject({ status: 415 }); const fake = await saveAsset({ projectId: f.pid, userId: f.user.id, data: await sharp({ create: { width: 24, height: 24, channels: 3, background: '#334455' } }).png().toBuffer(), mime: 'image/png', name: 'legacy-invalid-fixture.png', role: 'clip', origin: 'upload', status: 'approved' }); /* Simuler une ancienne ligne corrompue : le nouvel upload la refuse désormais. */ run("UPDATE assets SET kind='video',mime='video/mp4',width=640,height=480,duration=1 WHERE id=?", fake.id); const { inventoryClientMedia } = await import('@/lib/theme/client-media'); expect((await inventoryClientMedia(loadProject(f.pid))).excluded.some(x => x.id === fake.id && x.reason === 'file_missing_or_undecodable')).toBe(true); expect(all('SELECT id FROM ai_calls WHERE project_id=?', f.pid)).toHaveLength(0); });
it('déclinaisons de logo et planches d’identité : jamais utilisées comme photos du produit', async () => { const f = await clientFixture({ incomplete: true }), light = await saveAsset({ projectId: f.pid, userId: f.user.id, data: await sharp({ create: { width: 900, height: 260, channels: 3, background: '#eee' } }).png().toBuffer(), name: 'logo-light.png', mime: 'image/png', role: 'logo-light', origin: 'upload', status: 'approved' }), board = await saveAsset({ projectId: f.pid, userId: f.user.id, data: await sharp({ create: { width: 1200, height: 800, channels: 3, background: '#aabbaa' } }).png().toBuffer(), name: 'identity-board.png', mime: 'image/png', role: 'brand-board', origin: 'upload', status: 'approved' }); await fr(() => buildShop(null, f.pid, { direction: 'traverse', useAi: false })); const s = currentTheme(f.pid)!.spec; expect(s.meta!.adaptation!.slots.some(x => [light.id, board.id].includes(x.assetId ?? ''))).toBe(false); expect(s.store.product.images.some(file => [light.id, board.id].includes(s.files[file]))).toBe(false); expect(s.meta!.adaptation!.excluded.some(x => x.id === board.id && x.reason === 'identity_board_not_site_media')).toBe(true); });
