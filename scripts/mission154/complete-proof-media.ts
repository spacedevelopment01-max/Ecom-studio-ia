/** Isolated supplier-free input pack: enough distinct files for every reference placement, no fictitious legal/review claims. */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const root = process.env.DATA_DIR!;
if (!root || !path.basename(root).startsWith('ecs-test-154-'))
    throw Error('Isolated data required');
globalThis.fetch = async () => { throw Error('No provider'); };
const { clientPhoto } = await import('../../tests/mission154-fixtures'), { saveAsset } = await import('../../src/lib/library');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'accounts-private.json'), 'utf8'));
const result = [];
for (const a of manifest.accounts.filter((x: any) => !x.theme.includes('incomplet'))) {
    let n = 0;
    for (const [role, count] of ([['use', 9], ['detail', 2], ...(a.services ? [['realization', 2]] : [])] as [
        string,
        number
    ][])) {
        for (let i = 0; i < count; i++) {
            await saveAsset({ projectId: a.pid, userId: a.uid, data: await clientPhoto(role as any, 50 + n, a.services), name: `simulated-client-${role}-${n}.jpg`, mime: 'image/jpeg', role: 'lifestyle', origin: 'upload', status: 'approved', meta: { simulation: true, authenticWork: a.services && role === 'realization', themeContent: { role, description: a.services ? `Vue fournie de l’atelier et de son matériel, scène ${n + 1} — recette fictive` : `Théière Anse en grès bleu ardoise, vue ${n + 1} fournie pour la recette fictive`, reviewed: true, subject: a.services ? '' : 'product:main' } } });
            n++;
        }
    }
    if (['fraise', 'onde'].includes(a.theme)) {
        const dir = path.join(root, 'synthetic-video-inputs', a.theme);
        fs.mkdirSync(dir, { recursive: true });
        for (let i = 0; i < 3; i++) {
            const jpg = path.join(dir, `input-${i}.jpg`), mp4 = path.join(dir, `clip-${i}.mp4`);
            fs.writeFileSync(jpg, await clientPhoto('use', 80 + i));
            execFileSync('ffmpeg', ['-v', 'error', '-y', '-loop', '1', '-i', jpg, '-t', '1', '-vf', 'scale=640:-2', '-r', '12', '-c:v', 'libx264', '-preset', 'ultrafast', '-threads', '1', '-pix_fmt', 'yuv420p', mp4], { timeout: 30000 });
            await saveAsset({ projectId: a.pid, userId: a.uid, data: fs.readFileSync(mp4), name: `simulated-client-clip-${i}.mp4`, mime: 'video/mp4', kind: 'video', role: 'clip', origin: 'upload', status: 'approved', meta: { simulation: true, themeContent: { role: 'video', description: `Plan de recette du produit Anse, sans personne ni texte, vue ${i + 1}. Vidéo simulée localement ; aucun fournisseur.`, reviewed: true, subject: 'product:main' } } });
        }
    }
    result.push({ theme: a.theme, additionalImages: n, additionalVideos: ['fraise', 'onde'].includes(a.theme) ? 3 : 0 });
}
fs.writeFileSync(path.join(root, 'synthetic-input-pack.json'), JSON.stringify({ supplierCalls: 0, nature: 'Simulated client-owned input files only, not provider quality evidence', result }, null, 2));
console.log('Complete simulated client media pack saved');
