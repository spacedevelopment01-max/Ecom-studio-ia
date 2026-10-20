import fs from 'node:fs';
import path from 'node:path';
const root = process.env.DATA_DIR!;
if (!root || !path.basename(root).startsWith('ecs-test-154-'))
    throw Error('Isolated data required');
const { currentTheme } = await import('../../src/lib/projects'), { sectionSchema } = await import('../../src/lib/theme/spec');
const m = JSON.parse(fs.readFileSync(path.join(root, 'accounts-private.json'), 'utf8'));
for (const a of m.accounts.filter((x: any) => !x.theme.includes('incomplet'))) {
    const s = currentTheme(a.pid)!.spec, p = s.meta!.adaptation!;
    const seen = new Set();
    for (const i of p.issues) {
        if (!['section_content_mapping', 'section_content_missing', 'information_required'].includes(i.code))
            continue;
        const section = s.templates[i.page]?.sections[i.section];
        if (!section)
            continue;
        const id = a.theme + section.type;
        if (seen.has(id))
            continue;
        seen.add(id);
        console.log(JSON.stringify({ theme: a.theme, type: section.type, page: i.page, issues: p.issues.filter(x => x.page === i.page && x.section === i.section).map(x => x.code), schemas: sectionSchema(s, section.type)?.blocks.map(x => ({ type: x.type, fields: (x.settings ?? []).map(d => d.id) })), blocks: Object.values(section.blocks ?? {}).map(b => ({ type: b.type, settings: b.settings })), settings: section.settings }));
    }
}
