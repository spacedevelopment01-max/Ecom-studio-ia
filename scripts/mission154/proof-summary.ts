import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const root = process.env.DATA_DIR!;
if (!root || !path.basename(root).startsWith('ecs-test-154-'))
    throw Error('Isolated data required');
const { currentTheme } = await import('../../src/lib/projects'), { all, one } = await import('../../src/lib/db');
const m = JSON.parse(fs.readFileSync(path.join(root, 'accounts-private.json'), 'utf8'));
const rows = m.accounts.map((a: any) => { const s = currentTheme(a.pid)!.spec, p = s.meta!.adaptation!, issues: Record<string, number> = {}; for (const i of p.issues)
    issues[i.code] = (issues[i.code] ?? 0) + 1; return { theme: a.theme, status: p.status, clientFiles: Object.keys(s.files).length, pages: p.pages.length, sections: p.pages.reduce((n, x) => n + x.sections.length, 0), visibleSections: p.pages.reduce((n, x) => n + x.sections.filter(s => s.visible).length, 0), slots: p.slots.length, missingSlots: p.slots.filter(x => !x.assetId).length, issues, generationsPrepared: p.generationRequests.length, projectAiCalls: one<{
        n: number;
    }>('SELECT COUNT(*) n FROM ai_calls WHERE project_id=?', a.pid)!.n }; });
const out = { sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), nature: 'Isolated inputs; no provider; client media are simulated, not creative quality evidence', rows, referenceKits: m.references.map((r: any) => ({ theme: r.theme, missingFiles: r.missing.length })), allProviderCalls: one<{
        n: number;
    }>('SELECT COUNT(*) n FROM ai_calls')!.n };
fs.writeFileSync(path.join(root, 'content-matrix.json'), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
