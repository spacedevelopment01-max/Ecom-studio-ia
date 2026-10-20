/** Preserve manual page content and global/chrome edits when reusing a reference composition. */
import type { ThemeSpec } from './spec';
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
export function preserveClientRecords(fresh: ThemeSpec, current: ThemeSpec, baseline: ThemeSpec | null) {
    const usedFiles = new Set<string>();
    for (const page of current.store.pages) {
        const old = baseline?.store.pages.find(p => p.contentTarget && p.contentTarget === page.contentTarget || p.handle === page.handle);
        const next = fresh.store.pages.find(p => p.contentTarget && p.contentTarget === page.contentTarget || p.template_suffix === page.template_suffix || p.handle === page.handle);
        if (!old) {
            if (!next) {
                fresh.store.pages.push(structuredClone(page));
                const key = `page.${page.template_suffix}`;
                if (current.templates[key])
                    fresh.templates[key] = structuredClone(current.templates[key]);
            }
        }
        else if (next)
            for (const key of ['title', 'handle', 'body_html', 'seo', 'status', 'links'] as const)
                if (!same(page[key], old[key]))
                    (next as any)[key] = structuredClone(page[key]);
    }
    if (baseline) {
        for (const [key, value] of Object.entries(current.settings))
            if (!same(value, baseline.settings[key]))
                fresh.settings[key] = structuredClone(value);
        for (const group of ['header', 'footer'] as const) {
            const byType = (s: ThemeSpec, type: string) => Object.values(s.groups[group].sections).filter(x => x.type === type);
            for (const type of new Set(Object.values(current.groups[group].sections).map(x => x.type))) {
                const currentSections = byType(current, type), baseSections = byType(baseline, type), freshSections = byType(fresh, type);
                for (const [i, now] of currentSections.entries()) {
                    const before = baseSections[i], next = freshSections[i];
                    if (!before || !next)
                        continue;
                    for (const [key, value] of Object.entries(now.settings))
                        if (!same(value, before.settings[key]))
                            next.settings[key] = structuredClone(value);
                    if (!same(now.blocks, before.blocks)) {
                        next.blocks = structuredClone(now.blocks);
                        next.block_order = structuredClone(now.block_order);
                    }
                }
            }
        }
        for (const [key, value] of Object.entries(current.store.menus))
            if (!same(value, baseline.store.menus[key]))
                fresh.store.menus[key] = structuredClone(value);
    }
    const source = JSON.stringify([fresh.templates, fresh.groups, fresh.settings, fresh.store]);
    for (const [file, asset] of Object.entries(current.files))
        if (source.includes(JSON.stringify(file))) {
            fresh.files[file] = asset;
            usedFiles.add(file);
        }
    fresh.locks = [...new Set([...fresh.locks, ...current.locks])];
    return [...usedFiles];
}
/** Product isolation keeps a neutral default; editorial slots must point to the actual assigned product template. */
export function bindAdaptationProductTargets(spec: ThemeSpec) {
    const plan = spec.meta?.adaptation;
    if (!plan || spec.store.business === 'services' || !spec.store.product.template_suffix)
        return;
    const actual = `product.${spec.store.product.template_suffix}`, target = spec.templates[actual];
    if (!target)
        return;
    const page = plan.pages.find(p => p.template === 'product');
    if (!page)
        return;
    const ids = new Map(page.sections.map((s, i) => [s.id, target.order[i]]));
    page.template = actual;
    for (const s of page.sections)
        s.id = ids.get(s.id) ?? s.id;
    for (const row of [...plan.slots, ...plan.issues])
        if (row.page === 'product') {
            row.page = actual;
            row.section = ids.get(row.section) ?? row.section;
        }
}
