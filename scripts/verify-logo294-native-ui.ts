/** True native Studio/HTTP/queue/LogoV2 on synthetic data; no actual provider or production activation. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
if (process.env.DATA_DIR || process.env.DATABASE_FILE || process.env.STORAGE_DIR)
    throw Error('Existing storage refused');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ecs-logo294-'));
process.env.DATA_DIR = dir;
process.env.STOCK_OFFLINE = '1';
process.env.APP_SECRET = 'synthetic-294-' + randomUUID();
for (const key of Object.keys(process.env))
    if (key.startsWith('STUDIO_CONVERSATION_'))
        process.env[key] = '0';
for (const key of ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'FAL_KEY', 'DASHSCOPE_API_KEY', 'GOOGLE_API_KEY', 'PIXABAY_API_KEY'])
    process.env[key] = '';
// Syntactically configured, entirely fake credentials. All external network is independently denied.
process.env.OPENAI_API_KEY = 'sk-test-logo294-not-a-real-credential';
process.env.ANTHROPIC_API_KEY = 'sk-ant-logo294-not-a-real-credential';
const out = path.resolve(process.argv[2] ?? 'work/preuves-logo294');
fs.mkdirSync(out, { recursive: true });
const { account, project } = await import('../tests/conversation209-fixtures');
const { validatedBrand, directionIdentity } = await import('../tests/preparation-mission-fixtures');
const { setJsonSetting } = await import('../src/lib/settings');
const { REQUIRED_LOGO_PROVIDER, REQUIRED_LOGO_MODEL } = await import('../src/lib/ai/logo-policy');
const { id, run, one, all, now } = await import('../src/lib/db');
const { sha256 } = await import('../src/lib/secrets');
const { runWithLang } = await import('../src/lib/i18n-server');
const { currentSeries } = await import('../src/lib/logo-v2/direction-series');
const { loadProject } = await import('../src/lib/projects');
const { claimNext, JobContext, completeJob, failJob } = await import('../src/lib/jobs');
const { runNativeLogo } = await import('../src/lib/logo-v2/native-consent');
const { mockAi, draftsFor } = await import('../tests/logo-v2-mock');
const { artFixture } = await import('../tests/logo-v2-fixtures');
const { ART_CRITERIA } = await import('../src/lib/logo-v2/types');
const { reserve, settle, balance } = await import('../src/lib/billing');
const { chromium } = await import('playwright');
setJsonSetting('billing.markup', 1);
setJsonSetting('ai.prices.checkedAt', Date.now());
setJsonSetting('ai.prices', { [`${REQUIRED_LOGO_PROVIDER}:${REQUIRED_LOGO_MODEL}`]: { unit: 'image', perImage: 0.1, inputPerM: 0.1 } });
setJsonSetting('ai.media.models', { [`${REQUIRED_LOGO_PROVIDER}:${REQUIRED_LOGO_MODEL}`]: { enabled: true, confirmedAt: Date.now() } });
const u = await account(), pid = project(u);
runWithLang({ ui: 'fr', content: 'fr' }, () => validatedBrand(pid));
const token = id();
run('INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)', sha256(token), u.id, now() + 3600000, now());
const initialBrand = structuredClone(loadProject(pid).brand), initialBalance = balance(u.id, pid).available;
const port = 5100 + Math.floor(Math.random() * 200), origin = `http://localhost:${port}`;
const server = spawn(process.execPath, [path.resolve('node_modules/next/dist/bin/next'), process.env.LOGO294_PRODUCTION === '1' ? 'start' : 'dev', '-p', String(port), '-H', '127.0.0.1'], { env: { ...process.env, APP_URL: origin, NEXT_TELEMETRY_DISABLED: '1', NODE_OPTIONS: `--import=${path.resolve('scripts/lot9/network-guard.mjs')}` }, stdio: ['ignore', 'pipe', 'pipe'], detached: true });
let log = '';
server.stdout.on('data', d => { log += d; });
server.stderr.on('data', d => { log += d; });
const stop = () => { try {
    process.kill(-server.pid!, 'SIGTERM');
}
catch { } };
process.on('exit', stop);
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
const proof = { runtime: null as unknown, checks: [] as string[], http: [] as {
        action: string;
        status: number;
    }[], captures: [] as string[], providerCallsReal: 0, costRealEur: 0, simulatedBilledMicro: 0, errors: [] as string[] };
try {
    const start = Date.now();
    for (;;) {
        if (Date.now() - start > 240000)
            throw Error('Next not ready ' + log.slice(-1200));
        try {
            if ((await fetch(origin + '/connexion', { signal: AbortSignal.timeout(3000) })).ok)
                break;
        }
        catch { }
        await new Promise(r => setTimeout(r, 500));
    }
    proof.runtime = await (await fetch(origin + '/api/version')).json();
    if (process.env.LOGO294_PRODUCTION === '1') {
        const r = proof.runtime as {
            commit: string;
            source: string;
            tree: string;
        };
        assert.equal(r.source, 'compiled-build');
        assert.equal(r.tree, 'clean');
        assert.equal(r.commit, execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim());
    }
    browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : chromium.executablePath()), args: ['--no-sandbox', '--disable-background-networking'] });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'fr-FR', reducedMotion: 'reduce' });
    await context.addCookies([{ name: 'ecs_session', value: token, url: origin }]);
    await context.route('**/*', r => new URL(r.request().url()).origin === origin ? r.continue() : r.abort());
    const page = await context.newPage();
    page.setDefaultTimeout(45000);
    const jsErrors: string[] = [];
    page.on('pageerror', e => jsErrors.push(e.message));
    page.on('response', r => { if (r.request().method() === 'POST' && r.url().endsWith('/brand/logo-v2'))
        proof.http.push({ action: r.request().postDataJSON()?.action, status: r.status() }); });
    await page.goto(`${origin}/studio/${pid}/marque`, { waitUntil: 'networkidle', timeout: 180000 });
    await page.locator('#ecs-splash').waitFor({ state: 'hidden' });
    const nudge = page.locator('[data-tuto-nudge]');
    if (await nudge.isVisible())
        await nudge.locator('button').last().click();
    const create = page.getByRole('button', { name: 'Créer les directions', exact: true });
    await create.waitFor();
    await create.click();
    const modal = page.getByRole('dialog', { name: 'Devis de création de logos', exact: true });
    await modal.waitFor();
    await modal.getByText(/Maximum autorisé/).waitFor();
    assert.equal(one<{
        n: number;
    }>("SELECT COUNT(*) n FROM jobs WHERE project_id=?", pid)!.n, 0);
    await modal.getByRole('button', { name: 'Annuler', exact: true }).click();
    await modal.waitFor({ state: 'detached' });
    assert.equal(balance(u.id, pid).available, initialBalance);
    proof.checks.push('native_quote_cancel_zero_job_zero_spend');
    await create.click();
    await modal.waitFor();
    await modal.scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(out, 'desktop-devis.png') });
    proof.captures.push('desktop-devis.png');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(out, 'mobile-devis.png') });
    proof.captures.push('mobile-devis.png');
    await page.setViewportSize({ width: 1440, height: 1000 });
    await modal.getByRole('button', { name: 'Confirmer la dépense des logos', exact: true }).dblclick();
    await modal.waitFor({ state: 'detached' });
    const jobs = all<{
        id: string;
    }>("SELECT id FROM jobs WHERE project_id=? AND type='brand.logo.v2'", pid);
    assert.equal(jobs.length, 1);
    assert.equal(balance(u.id, pid).available, initialBalance);
    proof.checks.push('explicit_double_click_one_job_no_spend_before_worker');
    const job = claimNext(['brand.logo.v2'])!;
    assert.equal(job.id, jobs[0].id);
    let calls = 0;
    const ai = { ...mockAi({ calls: [] }), territories: async (b: any) => draftsFor(b).slice(0, 3).map((t, i) => ({ ...t, identity: directionIdentity(i), descriptor: null, style: (['typographic', 'monogram', 'gradient'] as const)[i], colors: [directionIdentity(i).palette.primary], imageBrief: 'Une marque nette et travaillée pour le métier, des formes lisibles et une composition riche.' })), artworkRoute: () => ({ provider: REQUIRED_LOGO_PROVIDER, model: REQUIRED_LOGO_MODEL }), drawArtwork: async (t: any) => { const rid = reserve(u.id, 100, { task: 'logo', provider: 'synthetic', model: 'fixture', projectId: pid, jobId: job.id, usageKey: `294:${++calls}` }); settle(rid, 50, null, 'Synthetic browser test only'); return artFixture(Number(t.id.slice(1))); }, reviewArtwork: async (_b: any, _t: any, _brief: any, expected: any) => ({ criteria: Object.fromEntries(ART_CRITERIA.map(k => [k, 9])), textRead: expected.name, nameExact: true, extraText: false, nameBox: null, clumsyCliche: false, resemblesKnownBrand: false, amateur: false, artifacts: false, person: false, genericConcept: false, issues: [], needsSimplifiedMark: true, fix: { target: 'none', instruction: '' } }) };
    try {
        const result = await runWithLang({ ui: 'fr', content: 'fr' }, () => runNativeLogo(new JobContext(job), ai as any));
        assert.equal(result.delivery.delivered, 3);
        completeJob(job.id, result);
    }
    catch (e) {
        failJob(job, e, { permanent: true });
        throw e;
    }
    assert.equal(calls, 3);
    assert.equal(currentSeries(pid)?.status, 'complete');
    assert.equal(balance(u.id, pid).available, initialBalance - 150);
    assert.deepEqual(loadProject(pid).brand, initialBrand);
    proof.simulatedBilledMicro = 150;
    const directions = page.locator('[data-direction-series]');
    await directions.getByText(/3\/3 directions complètes/).waitFor();
    assert.equal(await directions.locator('[data-direction]').count(), 3);
    await directions.scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(out, 'desktop-resultat.png') });
    proof.captures.push('desktop-resultat.png');
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Nouvelles directions', exact: true }).waitFor();
    assert.equal(currentSeries(pid)?.directions.length, 3);
    assert.deepEqual(jsErrors, []);
    proof.checks.push('simulated_worker_native_receipt_three_saved_directions', 'validated_identity_unchanged', 'refresh_preserves_results');
    await context.close();
}
catch (error) {
    proof.errors.push(String(error));
    if (browser)
        for (const ctx of browser.contexts())
            for (const page of ctx.pages())
                try {
                    await page.screenshot({ path: path.join(out, 'echec.png') });
                    fs.writeFileSync(path.join(out, 'echec-dom.txt'), await page.locator('body').innerText());
                }
                catch { }
    throw error;
}
finally {
    await browser?.close();
    stop();
    fs.writeFileSync(path.join(out, 'RESUME.json'), JSON.stringify(proof, null, 2) + '\n');
    fs.writeFileSync(path.join(out, 'serveur.log'), log);
    fs.rmSync(dir, { recursive: true, force: true });
}
