/** Extract only validated header/footer design settings. No demo copy, logo or media. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
if (process.env.DATA_DIR || process.env.DATABASE_FILE) throw Error('Existing database refused');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ecs-test-154-chrome-'));
process.env.DATA_DIR = temp;
globalThis.fetch = async () => { throw Error('No supplier'); };
const { createUser } = await import('../../src/lib/auth');
const { demoProject } = await import('../../tests/demo-fixtures');
const { sectionSchema } = await import('../../src/lib/theme/spec');
const file = 'src/lib/theme/reference-shapes.json';
const shapes = JSON.parse(fs.readFileSync(file, 'utf8'));
const user = await createUser('chrome-reference@example.test', 'isolated-structural-extraction', 'Structural test');
const visual = new Set(['select', 'range', 'checkbox', 'color_scheme']);
// Le logo éclairci sur fond sombre (NOCTIL) dépend du logo foncé de la démonstration : jamais recopié chez un client.
const forbidden = /rating|price|discount|quantity|stock|shipping|guarantee|countdown|timer|days|hours|minutes|seconds|purchase_enabled|structured_data/;
const globalDefs = JSON.parse(fs.readFileSync('theme-base/config/settings_schema.json', 'utf8')).flatMap((group: any) => group.settings ?? []);
try {
    for (const id of Object.keys(shapes.themes)) {
        const { spec } = await demoProject(user.id, id as any);
        shapes.themes[id].settings = Object.fromEntries(Object.entries(spec.settings).filter(([key]) => { const d = globalDefs.find((d: any) => d.id === key); return d && visual.has(d.type) && !forbidden.test(key) && (!key.startsWith('cart_') || key === 'cart_type') && !key.startsWith('cookie_') && key !== 'logo_light_on_dark'; }));
        shapes.themes[id].groups = Object.fromEntries(Object.entries(spec.groups).map(([key, group]) => [key, {
            order: group.order,
            sections: Object.fromEntries(group.order.map(sid => {
                const s = group.sections[sid], schema = sectionSchema(spec, s.type);
                const pick = (settings: Record<string, unknown>, defs: any[]) => Object.fromEntries(Object.entries(settings).filter(([k]) => { const d = defs.find(d => d.id === k); return d && visual.has(d.type) && !forbidden.test(k); }));
                return [sid, { type: s.type, settings: pick(s.settings, schema?.settings ?? []), blocks: Object.fromEntries((s.block_order ?? []).map(bid => { const b = s.blocks![bid]; return [bid, { type: b.type, settings: pick(b.settings, schema?.blocks.find(d => d.type === b.type)?.settings ?? []) }]; })), block_order: s.block_order ?? [] }];
            }))
        }]));
    }
    fs.writeFileSync(file, JSON.stringify(shapes, null, 2) + '\n');
} finally { fs.rmSync(temp, { recursive: true, force: true }); }
