/** Development-only extraction of the validated compositions. No demo copy or media enter the client engine. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
if (process.env.DATA_DIR || process.env.DATABASE_FILE)
    throw Error('Existing database refused');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ecs-test-154-shapes-'));
process.env.DATA_DIR = temp;
process.env.STOCK_OFFLINE = '1';
globalThis.fetch = async () => { throw Error('No network in structural extraction'); };
const { createUser } = await import('../../src/lib/auth');
const { demoProject } = await import('../../tests/demo-fixtures');
const { sectionSchema } = await import('../../src/lib/theme/spec');
const { getAsset } = await import('../../src/lib/library');
const user = await createUser('reference-shapes@example.test', 'structural-extraction-only', 'Structural test');
const result: any = { sourceCommit: '5eb672f9d3c70a3b025a4abd0f5353955ba5d62e', provenance: 'Validated compositions, design settings and block order only. No demo copy, logo, image or commercial data.', themes: {} };
// Schema types identify styling rather than content. Coordinates of hotspots are content, never design.
const media = (values: any, type: string) => Object.entries(values ?? {}).filter(([k, v]) => /^(?:image|second|day_image|night_image|poster|video)[a-z_]*_asset$|^second_asset$/.test(k) && (!!v || !!values.media_role || !!values.second_role || /video/.test(k) && /stories|video/.test(type))).map(([field, v]) => { const a = typeof v === 'string' ? getAsset(currentSpec.files[v]) : null; return { field, role: /video/.test(field) ? 'video' : a?.role === 'logo' ? 'logo' : a?.role === 'detail' || /detail/.test(String(values.media_role ?? '')) ? 'detail' : a?.role === 'cutout' || a?.role === 'packshot' ? 'packshot' : /portfolio|study|case/.test(type) ? 'realization' : /hero|opening|banner/.test(type) ? 'opening' : /hotspot|ingredient|cards|finishes/.test(type) ? 'detail' : 'use', aspect: a?.width && a?.height ? +(a.width / a.height).toFixed(3) : null }; });
let currentSpec: any;
const visual = new Set(['select', 'range', 'checkbox', 'color_scheme']);
const forbidden = /rating|price|discount|quantity|stock|shipping|guarantee|countdown|timer|days|hours|minutes|seconds|purchase_enabled|structured_data|^x$|^y$/;
try {
    for (const id of ['fraise', 'onde', 'orbe', 'rive', 'sillon', 'noctil', 'traverse'] as const) {
        const { spec } = await demoProject(user.id, id);
        currentSpec = spec;
        const templates: any = {};
        for (const [key, t] of Object.entries({ ...spec.templates, product: spec.templates[spec.store.product.template_suffix ? `product.${spec.store.product.template_suffix}` : 'product'] ?? spec.templates.product })) {
            if (!['index', 'product'].includes(key) && !key.startsWith('page.'))
                continue;
            const sections: any = {};
            for (const sid of t.order) {
                const s = t.sections[sid], schema = sectionSchema(spec, s.type);
                const pick = (values: any, defs: any[]) => Object.fromEntries(Object.entries(values ?? {}).filter(([k]) => { const d = defs.find(x => x.id === k); return d && visual.has(d.type) && !forbidden.test(k); }));
                sections[sid] = { type: s.type, settings: pick(s.settings, schema?.settings ?? []), media: media(s.settings, s.type), blocks: Object.fromEntries((s.block_order ?? Object.keys(s.blocks ?? {})).map(bid => { const b = s.blocks![bid]; return [bid, { type: b.type, settings: pick(b.settings, schema?.blocks.find(x => x.type === b.type)?.settings ?? []), media: media(b.settings, s.type), ...(b.disabled ? { initiallyHidden: true } : {}) }]; })), block_order: s.block_order ?? Object.keys(s.blocks ?? {}), ...(s.disabled ? { initiallyHidden: true } : {}) };
            }
            templates[key] = { sections, order: t.order };
        }
        result.themes[id] = { templates, pages: spec.store.pages.map(p => ({ suffix: p.template_suffix, role: /contact|aide|help/.test(p.handle) ? 'contact' : /faq|questions/.test(p.handle) ? 'faq' : /livraison|shipping/.test(p.handle) ? 'shipping' : /utilisation|caracteristiques|how|detail/.test(p.handle) ? 'details' : /usage|carnet|piece|inspiration/.test(p.handle) ? 'uses' : /legal|mention/.test(p.handle) ? 'legal' : /prestation|service/.test(p.handle) ? 'services' : /projet|realisation|portfolio/.test(p.handle) ? 'portfolio' : 'story' })) };
        console.log(id, Object.keys(templates).length, 'templates', Object.values(templates).reduce((n: number, t: any) => n + t.order.length, 0), 'sections');
    }
    fs.writeFileSync('src/lib/theme/reference-shapes.json', JSON.stringify(result, null, 2) + '\n');
}
finally {
    fs.rmSync(temp, { recursive: true, force: true });
}
