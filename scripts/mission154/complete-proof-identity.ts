/** Complete fictitious supplied identities only. Local alpha-preserving variant, no AI or customer data. */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
const root = process.env.DATA_DIR!;
if (!root || !path.basename(root).startsWith('ecs-test-154-')) throw Error('Isolated input pack required');
globalThis.fetch = async () => { throw Error('No supplier'); };
const { all } = await import('../../src/lib/db');
const { getAsset, assetData, assetMeta, saveAsset } = await import('../../src/lib/library');
const { loadProject } = await import('../../src/lib/projects');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'accounts-private.json'), 'utf8'));
const results: any[] = [];
for (const a of manifest.accounts.filter((a: any) => !a.theme.includes('incomplet'))) {
    if (all('SELECT id FROM assets WHERE project_id=? AND role=? AND deleted_at IS NULL', a.pid, 'logo-light').length) continue;
    const primary = getAsset(loadProject(a.pid).brand!.logo!.assetId!)!;
    if (!assetMeta(primary).simulation) throw Error('Only the fictitious supplied logo is allowed');
    const input = assetData(primary), { width, height } = await sharp(input).metadata();
    if (!width || !height) throw Error('Invalid fixture identity');
    const alpha = await sharp(input).ensureAlpha().extractChannel('alpha').raw().toBuffer();
    const image = await sharp({ create: { width, height, channels: 3, background: '#fff' } }).joinChannel(alpha, { raw: { width, height, channels: 1 } }).png().toBuffer();
    await saveAsset({ projectId: a.pid, userId: a.uid, data: image, name: 'identite-claire-fictive.png', mime: 'image/png', kind: 'image', role: 'logo-light', origin: 'upload', status: 'approved', meta: { simulation: true, providedIdentityVariant: true, nativeGeometryPreserved: true } });
    results.push({ theme: a.theme, suppliedLightVariant: true, originalUntouched: true });
}
fs.writeFileSync(path.join(root, 'identity-input-pack.json'), JSON.stringify({ supplierCalls: 0, simulatedSuppliedIdentity: true, results }, null, 2));
console.log('Fictitious complete identities saved; originals untouched');
