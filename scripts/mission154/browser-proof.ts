/** Actual compiled studio and native previews. Isolated accounts, no provider, no CMS connection. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import type { Page } from 'playwright';
const root = process.env.DATA_DIR!;
if (!root || !path.basename(root).startsWith('ecs-test-154-'))
    throw Error('Isolated reception only');
const base = 'http://127.0.0.1:18254', out = path.join(root, 'browser');
fs.mkdirSync(out, { recursive: true });
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'accounts-private.json'), 'utf8'));
const version = await (await fetch(base + '/api/version')).json();
assert.match(version.commit, /^[a-f0-9]{40}$/);
const acquired = process.env.PROOF_REUSE_CAPTURES === '1'
    ? JSON.parse(fs.readFileSync(path.join(out, 'mesures.json'), 'utf8')) : null;
if (acquired)
    assert.equal(acquired.version.commit, version.commit, 'Captured pages must come from the same compiled version');
const results: any[] = acquired ? [...new Map<string, any>(acquired.results.filter((r: any) => !r.slug.includes('native-')).map((r: any) => [r.slug, r])).values()] : [], errors: any[] = [], external = new Set<string>(acquired?.external ?? []);
// Use the already installed system encoder, not a download or supplier.
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(root, 'pwcache');
fs.mkdirSync(path.join(process.env.PLAYWRIGHT_BROWSERS_PATH, 'ffmpeg-1011'), { recursive: true });
const bin = path.join(process.env.PLAYWRIGHT_BROWSERS_PATH, 'ffmpeg-1011', 'ffmpeg-linux');
if (!fs.existsSync(bin))
    fs.symlinkSync('/usr/bin/ffmpeg', bin);
const { chromium } = await import('playwright');
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--no-proxy-server'] });
async function ready(p: Page, walk = false) {
    await p.evaluate(async () => { document.images && [...document.images].forEach(i => i.loading = 'eager'); await document.fonts.ready; await Promise.all([...document.images].filter(i => i.getAttribute('src')).map(i => i.decode().catch(() => { }))); });
    if (walk) {
        for (let y = 0; y < await p.evaluate(() => document.documentElement.scrollHeight); y += 650) {
            await p.evaluate(y => scrollTo(0, y), y);
            await p.waitForTimeout(65);
        }
        await p.evaluate(() => scrollTo(0, 0));
    }
    await p.waitForTimeout(350);
}
async function capture(p: Page, slug: string, full = true) { await ready(p, true); await p.screenshot({ path: path.join(out, slug + '.jpg'), type: 'jpeg', quality: 86, fullPage: full }); const data = await p.evaluate(() => ({ viewport: innerWidth, width: document.documentElement.scrollWidth, h1: [...document.querySelectorAll('h1')].map(x => x.textContent?.trim()), title: document.title, robots: document.querySelector('meta[name="robots"]')?.getAttribute('content'), images: [...document.images].filter(i => i.getAttribute('src') && i.offsetWidth > 0).map(i => ({ ok: i.complete && i.naturalWidth > 0, alt: i.alt })), links: [...document.querySelectorAll<HTMLAnchorElement>('main a[href]')].map(a => ({ label: a.textContent?.trim(), path: new URL(a.href).pathname.replace(/\/preview\/[^/]+\/v\/[^/]+/, '[preview]') })) })); results.push({ slug, ...data }); assert(data.width <= data.viewport + 2, slug + ' horizontal overflow'); assert(data.images.every(i => i.ok), slug + ' undecodable visible image'); }
async function context(a: any, width: number, video = false) {
    const c = await browser.newContext({ viewport: { width, height: 900 }, locale: 'fr-FR', reducedMotion: video ? 'no-preference' : 'reduce', ...(video ? { recordVideo: { dir: path.join(out, 'raw-video'), size: { width: width === 1440 ? 960 : width, height: width === 1440 ? 600 : 900 } } } : {}) });
    await c.addCookies([{ name: 'ecs_session', value: a.token, url: base }, { name: 'ecs-lang', value: 'fr', url: base }]);
    await c.addInitScript(() => {
        (globalThis as any).__name = (f: any) => f;
        try {
            sessionStorage.setItem('ecsSeen', '1');
        }
        catch { /* Native preview sandbox intentionally denies storage. */ }
    });
    await c.route('**/*', r => {
        const u = new URL(r.request().url());
        if (['127.0.0.1', 'localhost'].includes(u.hostname) || ['data:', 'blob:'].includes(u.protocol))
            return r.continue();
        external.add(u.hostname);
        return r.abort();
    });
    c.on('page', p => p.on('pageerror', e => errors.push({ message: e.message })));
    return c;
}
try {
    for (const a of acquired ? [] : manifest.accounts) {
        for (const width of [1440, 390]) {
            const c = await context(a, width), p = await c.newPage();
            for (const [name, route] of [['accueil', '/'], ...(a.services ? [] : [['produit', '/products/' + a.product]])]) {
                await p.goto(base + a.preview + route + '?es_raw=1', { waitUntil: 'networkidle' });
                await capture(p, `${a.theme}-client-${name}-${width}`);
                if (width === 390 && name === (a.services ? 'accueil' : 'produit') && !a.theme.includes('incomplet')) {
                    for (const [i, page] of a.pages.entries()) {
                        await p.goto(base + a.preview + '/pages/' + page.handle + '?es_raw=1', { waitUntil: 'networkidle' });
                        await ready(p, true);
                        const info = await p.evaluate(() => ({ width: innerWidth, content: document.documentElement.scrollWidth, h1: document.querySelectorAll('h1').length, images: [...document.images].filter(i => i.offsetWidth && i.getAttribute('src')).every(i => i.complete && i.naturalWidth > 0) }));
                        results.push({ slug: `${a.theme}-page-${i}`, page: page.title, ...info });
                        assert(info.content <= info.width + 2);
                        assert(info.images);
                        assert.equal(info.h1, 1, `${a.theme} / ${page.handle}: one page title required, including draft legal pages`);
                        if (a.services && /contact|prestation/i.test(page.title))
                            await capture(p, `${a.theme}-client-page-${i}-${width}`);
                    }
                    break;
                }
            }
            await c.close();
        }
        const ref = manifest.references.find((r: any) => r.theme === a.theme);
        if (ref && !ref.missing.length)
            for (const width of [1440, 390]) {
                const c = await context(a, width), p = await c.newPage();
                for (const [name, route] of [['accueil', '/'], ...(ref.services ? [] : [['produit', '/products/' + ref.product]])]) {
                    await p.goto(base + ref.preview + route + '?es_raw=1', { waitUntil: 'networkidle' });
                    await capture(p, `${a.theme}-reference-${name}-${width}`);
                }
                await c.close();
            }
    }
    // UI persistence and a targeted native edit, followed by a genuinely new browser session.
    const a = manifest.accounts.find((a: any) => a.theme === 'traverse-incomplet');
    let c = await context(a, 1440, true), p = await c.newPage();
    await p.goto(`${base}/studio/${a.pid}/boutique`, { waitUntil: 'networkidle' });
    await p.locator('[data-theme-adaptation="partial"]').waitFor();
    await capture(p, 'studio-adaptation-partielle-1440', false);
    const state = await (await c.request.get(`${base}/api/projects/${a.pid}/theme`)).json();
    const first = state.current.structure.find((x: any) => x.template === 'index').sections[0];
    const editedTitle = `Mon titre client conservé après reconnexion (${state.current.number + 1})`;
    const edit = await c.request.post(`${base}/api/projects/${a.pid}/theme/ops`, { data: { ops: [{ op: 'set_setting', template: 'index', section: first.id, key: 'heading', value: editedTitle }], summary: 'Retouche fictive de réception #154' } });
    assert.equal(edit.status(), 200, await edit.text());
    await p.reload({ waitUntil: 'networkidle' });
    await p.waitForTimeout(800);
    const video = p.video();
    await c.close();
    if (video)
        await video.saveAs(path.join(out, 'studio-retouche-reprise.webm'));
    c = await context(a, 390);
    p = await c.newPage();
    await p.goto(`${base}/studio/${a.pid}/boutique`, { waitUntil: 'networkidle' });
    await p.getByRole('tab', { name: 'Structure', exact: true }).click();
    await p.locator('[data-theme-adaptation="partial"]').waitFor();
    const returned = await (await c.request.get(`${base}/api/projects/${a.pid}/theme`)).json();
    assert(returned.current.number > state.current.number);
    assert(returned.current.structure.find((x: any) => x.template === 'index').sections.some((x: any) => x.heading === editedTitle));
    await capture(p, 'studio-nouvelle-session-390', false);
    results.push({ slug: 'native-editor-new-session', editStatus: edit.status(), previousVersion: state.current.number, currentVersion: returned.current.number, partialVisible: true });
    await c.close();
    // Real scroll and interactions; native preview cart only, never checkout.
    for (const theme of ['noctil', 'traverse', 'rive']) {
        const a = manifest.accounts.find((a: any) => a.theme === theme), c = await context(a, 390, true), p = await c.newPage();
        await p.goto(base + a.preview + (a.services ? '/' : '/products/' + a.product) + '?es_raw=1', { waitUntil: 'networkidle' });
        await ready(p);
        for (let y = 0; y < await p.evaluate(() => document.documentElement.scrollHeight); y += 450) {
            await p.evaluate(y => scrollTo({ top: y, behavior: 'smooth' }), y);
            await p.waitForTimeout(350);
        }
        await p.evaluate(() => scrollTo(0, 0));
        await p.waitForTimeout(500);
        if (!a.services) {
            const zoom = p.locator('[data-zoom-open]').first();
            if (await zoom.count()) {
                await zoom.click();
                await p.locator('[data-zoom][open]').waitFor();
                await p.waitForTimeout(500);
                await p.keyboard.press('Escape');
            }
            const add = p.locator('[data-add-button]').first();
            assert(await add.count(), theme + ': actual purchase control required');
            await add.click();
            const drawer = p.locator('[data-cart-drawer].is-open');
            await drawer.waitFor();
            assert((await drawer.innerText()).includes('Théière Anse'));
            assert(Number(await p.locator('[data-cart-count]').first().innerText()) > 0);
            await p.waitForTimeout(1000);
            await p.keyboard.press('Escape');
            await p.locator('[data-cart-drawer]:not(.is-open)').waitFor({ state: 'attached' });
            await p.waitForTimeout(500);
            results.push({ slug: theme + '-native-cart', zoomAvailable: await zoom.count() > 0, cartContainsOwnProduct: true, paymentAttempted: false });
        }
        const faq = p.locator('main details summary').first();
        if (await faq.count()) {
            const wasOpen = await faq.evaluate(e => e.parentElement?.hasAttribute('open'));
            await faq.scrollIntoViewIfNeeded();
            await faq.click();
            await p.waitForTimeout(500);
            assert.notEqual(await faq.evaluate(e => e.parentElement?.hasAttribute('open')), wasOpen);
            results.push({ slug: theme + '-native-faq', toggled: true });
        }
        if (a.services) {
            const contact = p.getByRole('link', { name: 'Prendre rendez-vous', exact: true }).first();
            assert(await contact.count(), 'Service conversion link required');
            await contact.click();
            await p.waitForLoadState('networkidle');
            assert.match(new URL(p.url()).pathname, /\/pages\/(contact|prestations)/);
            await ready(p, true);
            results.push({ slug: theme + '-native-service-contact', internalContactPage: true, noRealAppointment: true });
        }
        const v = p.video();
        await c.close();
        if (v)
            await v.saveAs(path.join(out, `${theme}-interactions.webm`));
    }
}
finally {
    await browser.close();
    fs.writeFileSync(path.join(out, 'mesures.json'), JSON.stringify({ version, nature: 'Compiled local Next studio; simulated client media; native preview cart; no real CMS installation or provider', results, errors, external: [...external] }, null, 2));
}
assert.equal(errors.length, 0, 'No browser page errors');
console.log('Compiled browser proof complete:', results.length, 'checks,', errors.length, 'page errors');
