/** Isolated native data for visual reception. No supplier, payment, publication or real appointment. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root = process.env.DATA_DIR;
if (!root || !path.basename(root).startsWith('ecs-test-154-'))
    throw Error('Isolated DATA_DIR required');
if (fs.existsSync(path.join(root, 'accounts-private.json')))
    throw Error('Existing proof accounts preserved; choose a fresh DATA_DIR');
globalThis.fetch = async () => { throw Error('No supplier network in mission154 reception'); };
const { clientFixture } = await import('../../tests/mission154-fixtures');
const { buildShop } = await import('../../src/lib/engine/shop');
const { currentTheme, saveThemeVersion } = await import('../../src/lib/projects');
const { run } = await import('../../src/lib/db');
const { sha256 } = await import('../../src/lib/secrets');
const { runWithLang } = await import('../../src/lib/i18n-server');
const { previewSegment } = await import('../../src/lib/theme/preview-access');
const { demoProject } = await import('../../tests/demo-fixtures');
const accounts: any[] = [], references: any[] = [];
for (const theme of ['fraise', 'onde', 'orbe', 'rive', 'sillon', 'noctil', 'traverse'] as const) {
    const f = await clientFixture({ services: theme === 'rive', catalog: theme === 'orbe' });
    await runWithLang({ ui: 'fr', content: 'fr' }, () => buildShop(null, f.pid, { direction: theme, useAi: false }));
    const cur = currentTheme(f.pid)!;
    const token = crypto.randomBytes(32).toString('hex');
    run('INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)', sha256(token), f.user.id, Date.now() + 86400000, Date.now());
    accounts.push({ theme, pid: f.pid, uid: f.user.id, token, version: cur.version.id, preview: `/preview/${f.pid}/v/${previewSegment(cur.version.id, f.user.id, f.pid)}`, services: theme === 'rive', name: f.brand, pages: cur.spec.store.pages.map(p => ({ handle: p.handle, title: p.title })), product: cur.spec.store.product.handle, partial: cur.spec.meta?.adaptation?.status, visible: cur.spec.meta?.adaptation?.pages.flatMap(p => p.sections).filter(s => s.visible).length });
    const reference = await runWithLang({ ui: 'fr', content: 'fr' }, () => demoProject(f.user.id, theme));
    const v = saveThemeVersion(reference.pid, reference.spec, 'Reference composition, unchanged', 'user');
    references.push({ theme, pid: reference.pid, version: v.id, preview: `/preview/${reference.pid}/v/${previewSegment(v.id, f.user.id, reference.pid)}`, missing: reference.missing, services: reference.services, pages: reference.spec.store.pages.map(p => ({ handle: p.handle, title: p.title })), product: reference.spec.store.product.handle });
    console.log(theme, 'client and reference ready; missing reference media', reference.missing.length);
}
const f = await clientFixture({ incomplete: true, brand: 'Matière Minute' });
await runWithLang({ ui: 'fr', content: 'fr' }, () => buildShop(null, f.pid, { direction: 'traverse', useAi: false }));
const cur = currentTheme(f.pid)!;
const token = crypto.randomBytes(32).toString('hex');
run('INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)', sha256(token), f.user.id, Date.now() + 86400000, Date.now());
accounts.push({ theme: 'traverse-incomplet', pid: f.pid, uid: f.user.id, token, version: cur.version.id, preview: `/preview/${f.pid}/v/${previewSegment(cur.version.id, f.user.id, f.pid)}`, services: false, name: f.brand, product: cur.spec.store.product.handle, pages: cur.spec.store.pages.map(p => ({ handle: p.handle, title: p.title })) });
fs.writeFileSync(path.join(root, 'accounts-private.json'), JSON.stringify({ accounts, references }), { mode: 0o600 });
console.log('Eight fictitious client cases and seven references saved. Private sessions remain outside Git.');
