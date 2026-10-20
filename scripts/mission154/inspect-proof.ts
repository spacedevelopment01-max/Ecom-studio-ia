import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
const root = process.env.DATA_DIR!;
if (!root || !path.basename(root).startsWith('ecs-test-154-'))
    throw Error('Isolated data required');
const out = path.join(root, 'inspection');
fs.mkdirSync(out, { recursive: true });
const a = JSON.parse(fs.readFileSync(path.join(root, 'accounts-private.json'), 'utf8')).accounts;
const b = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
try {
    for (const [theme, width, product] of [['orbe', 1440, false], ['rive', 1440, false], ['noctil', 390, true], ['traverse', 390, true]] as const) {
        const x = a.find((a: any) => a.theme === theme), c = await b.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' }), p = await c.newPage();
        await p.route('**/*', r => new URL(r.request().url()).hostname !== '127.0.0.1' ? r.abort() : r.continue());
        await p.goto('http://127.0.0.1:18254' + x.preview + (product ? '/products/' + x.product : '/') + '?es_raw=1', { waitUntil: 'networkidle' });
        await p.evaluate(async () => { await document.fonts.ready; for (const i of document.images) {
            i.loading = 'eager';
            await i.decode().catch(() => { });
        } });
        for (const [label, y] of [['haut', 0], ['milieu', product ? 2500 : 1050], ['bas', 90000]] as const) {
            await p.evaluate(y => scrollTo(0, y), y);
            await p.waitForTimeout(500);
            await p.screenshot({ path: path.join(out, `${theme}-${width}-${label}.jpg`), quality: 90 });
        }
        await c.close();
    }
}
finally {
    await b.close();
}
console.log('Actual viewports ready');
