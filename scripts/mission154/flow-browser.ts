/** Initial gallery -> original demo -> explicit choice -> native worker -> editor -> actual export downloads. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { unzipSync } from 'fflate';
const root = process.env.DATA_DIR!;
if (!root || !path.basename(root).startsWith('ecs-test-154-'))
    throw Error('Isolated data required');
const base = 'http://127.0.0.1:18254', out = path.join(root, 'flow');
fs.mkdirSync(out, { recursive: true });
const flow = JSON.parse(fs.readFileSync(path.join(root, 'accounts-private.json'), 'utf8')).flow;
if (!flow)
    throw Error('Prepare the fictitious project');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(root, 'pwcache');
fs.mkdirSync(path.join(process.env.PLAYWRIGHT_BROWSERS_PATH, 'ffmpeg-1011'), { recursive: true });
const bin = path.join(process.env.PLAYWRIGHT_BROWSERS_PATH, 'ffmpeg-1011', 'ffmpeg-linux');
if (!fs.existsSync(bin))
    fs.symlinkSync('/usr/bin/ffmpeg', bin);
const { chromium } = await import('playwright');
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--no-proxy-server'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'fr-FR', reducedMotion: 'reduce', recordVideo: { dir: out, size: { width: 1152, height: 800 } } });
await context.addCookies([{ name: 'ecs_session', value: flow.token, url: base }, { name: 'ecs-lang', value: 'fr', url: base }]);
await context.addInitScript(() => { (globalThis as any).__name = (f: any) => f; try {
    sessionStorage.setItem('ecsSeen', '1');
}
catch { } });
await context.route('**/*', r => ['127.0.0.1', 'localhost'].includes(new URL(r.request().url()).hostname) ? r.continue() : r.abort());
const page = await context.newPage(), errors: string[] = [], steps: any[] = [];
page.on('pageerror', e => errors.push(e.message));
const snapshot = () => JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'scripts/mission154/flow-harness.ts', 'snapshot'], { env: process.env, encoding: 'utf8' }));
const before = snapshot();
let worker: ReturnType<typeof spawn> | undefined;
try {
    await page.goto(`${base}/studio/${flow.pid}/boutique`, { waitUntil: 'networkidle' });
    await page.locator('[data-open-initial-gallery]').click();
    await page.locator('[data-open-demo="orbe"]:enabled').click();
    await page.locator('[data-theme-demo="orbe"]').waitFor();
    const frame = page.frameLocator('[data-theme-demo="orbe"] iframe');
    await frame.locator('body').waitFor();
    const original = await frame.locator('body').innerText();
    assert(original.includes('ORBE'));
    assert(!original.includes(flow.brand));
    await page.screenshot({ path: path.join(out, '01-demo-originale-avant-choix.jpg'), quality: 88 });
    const options = await page.locator('[data-demo-pages] option').allTextContents();
    if (options.length > 1) {
        await page.locator('[data-demo-pages]').selectOption({ index: 1 });
        await page.waitForTimeout(700);
    }
    const afterVisit = snapshot();
    assert.deepEqual(afterVisit, before);
    steps.push({ step: 'original-demo-read-only', unchanged: true, versions: afterVisit.versions, calls: afterVisit.calls, pages: options.length });
    const fd = fs.openSync(path.join(out, 'worker.txt'), 'w');
    worker = spawn(process.execPath, ['--import', 'tsx', 'scripts/mission154/flow-harness.ts', 'worker'], { env: process.env, stdio: ['ignore', fd, fd] });
    await page.locator('[data-theme-demo="orbe"] [data-choose-theme="orbe"]').click();
    const until = Date.now() + 90000;
    let state: any;
    do {
        state = await (await context.request.get(`${base}/api/projects/${flow.pid}/theme`)).json();
        if (state.current)
            break;
        await page.waitForTimeout(350);
    } while (Date.now() < until);
    assert(state.current, 'Native theme choice must produce an accessible version');
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('[data-theme-adaptation]').waitFor();
    await page.screenshot({ path: path.join(out, '02-projet-client-apres-choix.jpg'), quality: 88 });
    assert.equal(state.current.direction, 'orbe');
    assert.equal(state.adaptation.slots.filter((s: any) => !s.assetId).length, 0);
    assert.equal(snapshot().calls, 0);
    steps.push({ step: 'explicit-choice-native-worker-save', direction: state.current.direction, version: state.current.number, status: state.adaptation.status, missingMedia: 0, calls: 0 });
    for (const platform of ['shopify', 'woocommerce', 'prestashop']) {
        const response = await context.request.get(`${base}/api/projects/${flow.pid}/theme/export?platform=${platform}&version=${state.current.versionId}`, { timeout: 120000 });
        assert.equal(response.status(), 200, platform + ':' + (response.status() === 200 ? '' : await response.text()));
        const bytes = await response.body();
        const entries = unzipSync(bytes);
        assert(Object.keys(entries).some(p => p.endsWith('adaptation-client.json')));
        fs.writeFileSync(path.join(out, `client-orbe-${platform}.zip`), bytes);
        steps.push({ step: 'native-api-export-download', platform, status: response.status(), bytes: bytes.length, files: Object.keys(entries).length, verdict: response.headers()['x-es-verdict'] });
    }
    await page.screenshot({ path: path.join(out, '03-editeur-et-exports.jpg'), quality: 88 });
    assert.equal(snapshot().calls, 0);
}
finally {
    if (worker && worker.exitCode === null)
        worker.kill('SIGTERM');
    const video = page.video();
    await context.close();
    if (video)
        await video.saveAs(path.join(out, 'choix-demo-adaptation-exports.webm'));
    await browser.close();
    fs.writeFileSync(path.join(out, 'resultats.json'), JSON.stringify({ version: await (await fetch(base + '/api/version')).json(), steps, errors, noProviderCalls: true, noRealCmsOrCheckout: true }, null, 2));
}
assert.equal(errors.length, 0);
console.log('Original demo, explicit choice, native worker, saved client editor and three downloads verified');
