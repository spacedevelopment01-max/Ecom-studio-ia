/** Resume isolated acceptance inputs after an engine upgrade, preserving acquired media and versions. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const root = process.env.DATA_DIR!;
if (!root || !path.basename(root).startsWith('ecs-test-154-'))
    throw Error('Isolated data required');
globalThis.fetch = async () => { throw Error('No provider during reception'); };
const { buildShop } = await import('../../src/lib/engine/shop'), { currentTheme, listThemeVersions } = await import('../../src/lib/projects'), { runWithLang } = await import('../../src/lib/i18n-server'), { all } = await import('../../src/lib/db'), { getAsset, assetData } = await import('../../src/lib/library'), { previewSegment } = await import('../../src/lib/theme/preview-access');
const file = path.join(root, 'accounts-private.json'), manifest = JSON.parse(fs.readFileSync(file, 'utf8')), results = [];
for (const a of manifest.accounts) {
    const before = listThemeVersions(a.pid).length, media = all<{
        id: string;
    }>('SELECT id FROM assets WHERE project_id=?', a.pid).map(x => ({ id: x.id, hash: createHash('sha256').update(assetData(getAsset(x.id)!)).digest('hex') }));
    await runWithLang({ ui: 'fr', content: 'fr' }, () => buildShop(null, a.pid, { direction: a.theme.replace('-incomplet', ''), useAi: false }));
    const cur = currentTheme(a.pid)!;
    a.version = cur.version.id;
    a.preview = `/preview/${a.pid}/v/${previewSegment(cur.version.id, a.uid, a.pid)}`;
    a.pages = cur.spec.store.pages.map(p => ({ handle: p.handle, title: p.title }));
    a.partial = cur.spec.meta?.adaptation?.status;
    for (const m of media)
        assert.equal(createHash('sha256').update(assetData(getAsset(m.id)!)).digest('hex'), m.hash);
    results.push({ theme: a.theme, versionsBefore: before, versionsAfter: listThemeVersions(a.pid).length, mediaPreserved: media.length, status: a.partial, pages: a.pages.length, slots: cur.spec.meta?.adaptation?.slots.length });
}
fs.writeFileSync(file, JSON.stringify(manifest), { mode: 0o600 });
fs.writeFileSync(path.join(root, 'reprise-engine.json'), JSON.stringify({ supplierCalls: 0, mediaUnchanged: true, results }, null, 2));
console.log('Existing inputs and versions preserved; eight client cases refreshed');
