/** Preflight only: loopback bridge to the actual preview handlers. Not the deployed studio. */
import http from 'node:http';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
if (!process.env.DATA_DIR || !path.basename(process.env.DATA_DIR).startsWith('ecs-test-154-'))
    throw Error('Isolated data required');
globalThis.fetch = async () => { throw Error('No external provider in preview preflight'); };
const { GET, POST } = await import('../../src/app/preview/[id]/v/[vid]/[[...path]]/route');
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
http.createServer(async (req, res) => { try {
    const url = new URL(req.url ?? '/', `http://127.0.0.1:18255`);
    if (url.pathname === '/api/version') {
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({ commit, source: 'native-preview-harness-not-compiled-studio' }));
        return;
    }
    const match = url.pathname.match(/^\/preview\/([^/]+)\/v\/([^/]+)(?:\/(.*))?$/);
    if (!match) {
        res.writeHead(404);
        res.end('Preview only');
        return;
    }
    const chunks = [];
    for await (const chunk of req)
        chunks.push(chunk);
    const r = new Request(url, { method: req.method, headers: req.headers as any, ...(req.method !== 'GET' && req.method !== 'HEAD' ? { body: Buffer.concat(chunks) } : {}) });
    const ctx = { params: Promise.resolve({ id: decodeURIComponent(match[1]), vid: decodeURIComponent(match[2]), path: (match[3] ?? '').split('/').filter(Boolean).map(decodeURIComponent) }) };
    const answer = await (req.method === 'POST' ? POST : GET)(r, ctx);
    res.writeHead(answer.status, Object.fromEntries(answer.headers));
    res.end(Buffer.from(await answer.arrayBuffer()));
}
catch (e) {
    console.error((e as Error).message);
    res.writeHead(500);
    res.end('Isolated preview error');
} }).listen(18255, '127.0.0.1', () => console.log('Native preview preflight ready on loopback 18255'));
