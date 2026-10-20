/** Read-only native service pages, original reference and fictitious client. No appointment or supplier. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const root = process.env.DATA_DIR!;
if (!root || !path.basename(root).startsWith('ecs-test-154-')) throw Error('Isolated reception required');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'accounts-private.json'), 'utf8'));
const out = path.join(root, 'browser');
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
const results: any[] = [];
try {
    for (const width of [1440, 390]) for (const kind of ['client', 'reference']) {
        const a = (kind === 'client' ? manifest.accounts : manifest.references).find((a: any) => a.theme === 'rive');
        const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
        await context.addInitScript(() => { (globalThis as any).__name = (f: any) => f; });
        await context.route('**/*', r => new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : r.abort());
        const p = await context.newPage(), errors: string[] = [];
        p.on('pageerror', e => errors.push(e.message));
        for (const handle of ['prestations', 'contact']) {
            await p.goto('http://127.0.0.1:18254' + a.preview + '/pages/' + handle + '?es_raw=1', { waitUntil: 'networkidle' });
            await p.evaluate(async () => { await document.fonts.ready; for (const i of document.images) { i.loading = 'eager'; await i.decode().catch(() => {}); } });
            for (let y = 0; y < await p.evaluate(() => document.documentElement.scrollHeight); y += 650) {
                await p.evaluate(y => scrollTo(0, y), y); await p.waitForTimeout(80);
            }
            await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(350);
            const data = await p.evaluate(() => ({ h1: document.querySelectorAll('h1').length, title: document.title, width: innerWidth, content: document.documentElement.scrollWidth, imagesDecoded: [...document.images].filter(i => i.offsetWidth && i.getAttribute('src')).every(i => i.complete && i.naturalWidth > 0) }));
            assert.equal(data.h1, 1); assert(data.content <= width + 2); assert(data.imagesDecoded); assert.equal(errors.length, 0);
            const slug = `rive-${kind}-${handle}-${width}`;
            await p.screenshot({ path: path.join(out, slug + '.jpg'), fullPage: true, quality: 86 });
            results.push({ slug, ...data, errors: [...errors], noRealAppointment: true });
        }
        await context.close();
    }
} finally { await browser.close(); }
fs.writeFileSync(path.join(out, 'service-pages.json'), JSON.stringify({ sourceVersion: await (await fetch('http://127.0.0.1:18254/api/version')).json(), results }, null, 2));
console.log('Eight native service/contact page screenshots verified');
