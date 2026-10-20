import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
const data = process.env.DATA_DIR!;
if (!data || !path.basename(data).startsWith('ecs-test-154-'))
    throw Error('Isolated data required');
const accounts = JSON.parse(fs.readFileSync(path.join(data, 'accounts-private.json'), 'utf8')).accounts;
const out = path.join(data, 'sticky');
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
const records: any[] = [];
try {
    for (const theme of ['noctil', 'traverse'])
        for (const width of [360, 390, 430]) {
            const a = accounts.find((x: any) => x.theme === theme);
            const ctx = await browser.newContext({ viewport: { width, height: 850 }, reducedMotion: 'reduce' });
            const p = await ctx.newPage();
            await p.route('**/*', r => new URL(r.request().url()).hostname !== '127.0.0.1' ? r.abort() : r.continue());
            await p.goto('http://127.0.0.1:18255' + a.preview + '/products/' + a.product + '?es_raw=1', { waitUntil: 'networkidle' });
            await p.evaluate(() => { document.querySelectorAll('img').forEach(i => i.loading = 'eager'); });
            const shot = async (label: string) => { await p.waitForTimeout(650); records.push({ theme, width, label, ...await p.evaluate(() => { const bar = document.querySelector<HTMLElement>('[data-sticky-buy]')!, buy = document.querySelector('#MainBuy')!, footer = document.querySelector('.es-footer')!; const b = bar.getBoundingClientRect(); const main = buy.getBoundingClientRect(); return { scroll: scrollY, barVisible: bar.classList.contains('is-visible'), bar: { top: b.top, bottom: b.bottom, height: b.height }, main: { top: main.top, bottom: main.bottom }, footerTop: footer.getBoundingClientRect().top, overflow: document.documentElement.scrollWidth - innerWidth, focused: document.activeElement?.tagName, images: [...document.images].filter(i => i.offsetWidth > 0).map(i => ({ ok: i.complete && i.naturalWidth > 0, src: i.getAttribute('src')?.replace(/\/preview\/[^/]+\/v\/[^/]+/, '/preview/[project]/v/[version]'), css: getComputedStyle(i).opacity })) }; }) }); await p.screenshot({ path: path.join(out, `${theme}-${width}-${label}.jpg`), quality: 88 }); };
            await shot('top');
            await p.evaluate(() => { window.scrollTo(0, Math.max(0, document.querySelector('#MainBuy')!.getBoundingClientRect().bottom + scrollY - 90)); });
            await shot('after-buy');
            await p.evaluate(() => scrollBy(0, 650));
            await shot('details');
            const menu = p.locator('[data-menu-open]');
            if (await menu.count()) {
                await menu.first().click();
                await shot('menu');
                await p.keyboard.press('Escape');
            }
            await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight - innerHeight));
            await shot('footer');
            const input = p.locator('.es-footer input').first();
            if (await input.count()) {
                await input.focus();
                await shot('focus');
            }
            await ctx.close();
        }
    fs.writeFileSync(path.join(out, 'measurements.json'), JSON.stringify(records, null, 2));
}
finally {
    await browser.close();
}
console.log('Sticky viewport proof captured');
