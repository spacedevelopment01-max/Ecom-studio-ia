/** Narrow reception harness: only fictitious accounts in this isolated input pack, local theme choice only. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root = process.env.DATA_DIR!;
if (!root || !path.basename(root).startsWith('ecs-test-154-'))
    throw Error('Isolated data required');
globalThis.fetch = async () => { throw Error('External provider forbidden in browser flow'); };
const { clientFixture } = await import('../../tests/mission154-fixtures'), { all, one, run } = await import('../../src/lib/db'), { sha256 } = await import('../../src/lib/secrets');
const file = path.join(root, 'accounts-private.json'), manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
const action = process.argv[2];
if (action === 'prepare') {
    if (process.argv.includes('--fresh') && manifest.flow) {
        manifest.flowHistory = [...(manifest.flowHistory ?? []), manifest.flow];
        delete manifest.flow;
    }
    if (!manifest.flow) {
        const f = await clientFixture({ brand: 'Atelier Safran', catalog: true });
        const token = crypto.randomBytes(32).toString('hex');
        run('INSERT INTO sessions(id,user_id,expires_at,created_at)VALUES(?,?,?,?)', sha256(token), f.user.id, Date.now() + 86400000, Date.now());
        manifest.flow = { pid: f.pid, uid: f.user.id, token, brand: f.brand };
        fs.writeFileSync(file, JSON.stringify(manifest), { mode: 0o600 });
    }
    console.log('Fresh fictitious project preserved, no theme chosen');
}
else {
    const f = manifest.flow;
    if (!f)
        throw Error('Prepare the reception project first');
    if (action === 'snapshot') {
        const data = one<any>('SELECT product_json,brand_json,settings_json,business_json,current_theme_version_id FROM projects WHERE id=? AND user_id=?', f.pid, f.uid);
        console.log(JSON.stringify({ projectHash: crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex'), versions: one<{
                n: number;
            }>('SELECT COUNT(*)n FROM theme_versions WHERE project_id=?', f.pid)!.n, jobs: one<{
                n: number;
            }>('SELECT COUNT(*)n FROM jobs WHERE project_id=?', f.pid)!.n, calls: one<{
                n: number;
            }>('SELECT COUNT(*)n FROM ai_calls WHERE project_id=?', f.pid)!.n }));
    }
    else if (action === 'worker') {
        const { claimNext, completeJob, failJob, getJob, markFinished, JobContext } = await import('../../src/lib/jobs'), { handlers } = await import('../../worker/handlers'), { runWithLang } = await import('../../src/lib/i18n-server');
        const until = Date.now() + 180000;
        console.log('FLOW_WORKER_READY');
        while (Date.now() < until) {
            if (one('SELECT id FROM jobs WHERE type=? AND project_id<>? AND status IN (\'queued\',\'running\')', 'shop.direction', f.pid))
                throw Error('Unrelated queued task preserved; refusing to claim it');
            const j = claimNext(['shop.direction']);
            if (j) {
                if (j.project_id !== f.pid || j.user_id !== f.uid)
                    throw Error('Reception scope mismatch');
                try {
                    const result = await runWithLang({ ui: 'fr', content: 'fr' }, () => handlers[j.type](new JobContext(j)));
                    completeJob(j.id, result);
                    console.log(JSON.stringify({ type: j.type, status: getJob(j.id)?.status, delivery: (result as any).delivery }));
                }
                catch (e) {
                    failJob(getJob(j.id)!, e, { permanent: true });
                    throw e;
                }
                finally {
                    markFinished(j.id);
                }
                break;
            }
            await new Promise(r => setTimeout(r, 150));
        }
    }
    else
        throw Error('Unknown isolated harness action');
}
