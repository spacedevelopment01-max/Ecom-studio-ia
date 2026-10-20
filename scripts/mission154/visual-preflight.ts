import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const data = process.env.DATA_DIR;
if (!data || !path.basename(data).startsWith('ecs-test-154-'))
    throw Error('Isolated reception only');
const manifest = JSON.parse(fs.readFileSync(path.join(data, 'accounts-private.json'), 'utf8'));
const out = path.join(data, 'preflight');
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
const base = 'http://127.0.0.1:18255';
const results: any[] = [];
try {
    for (const theme of ['noctil', 'traverse', 'orbe', 'rive']) {
        const a = manifest.accounts.find((x: any) => x.theme === theme);
        const context = await browser.newContext({ viewport: { width: theme === 'orbe' ? 1440 : 390, height: 900 }, reducedMotion: 'reduce' });
        const page = await context.newPage();
        const errors: string[] = [];
        page.on('pageerror', e => errors.push(e.message));
        await page.route('**/*', r => new URL(r.request().url()).hostname !== '127.0.0.1' ? r.abort() : r.continue());
        const routes = [['home', '/'], ...(!a.services ? [['product', `/products/${a.product}`]] : [])];
        for (const [name, route] of routes) {
            await page.goto(base + a.preview + route + '?es_raw=1', { waitUntil: 'networkidle' });
            await page.evaluate(async () => {
                for (const i of Array.from(document.images)) {
                    i.loading = 'eager';
                }
                await document.fonts.ready;
            });
            await page.waitForTimeout(450);
            await page.screenshot({ path: path.join(out, `${theme}-${name}.jpg`), type: 'jpeg', quality: 87, fullPage: true });
            results.push({ theme, name, layout: await page.evaluate(() => ({ width: innerWidth, content: document.documentElement.scrollWidth, images: Array.from(document.images).map(x => ({ ok: x.complete && x.naturalWidth > 0, alt: x.alt })), h1: document.querySelectorAll('h1').length })), errors: [...errors] });
        }
        await context.close();
    }
    fs.writeFileSync(path.join(out, 'visual-preflight.json'), JSON.stringify(results, null, 2));
    console.log('Preflight artifacts prepared:', out);
}
finally {
    await browser.close();
}
