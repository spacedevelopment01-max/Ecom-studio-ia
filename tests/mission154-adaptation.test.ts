const isolatedDatabase = vi.hoisted(() => {
    const fs = process.getBuiltinModule('fs');
    const root = process.env.DATA_DIR;
    if (!root)
        throw Error('Isolated tests required');
    const globals = globalThis as {
        __ecomDb?: {
            close(): void;
        };
    }, previous = globals.__ecomDb;
    delete globals.__ecomDb;
    vi.stubEnv('DATA_DIR', fs.mkdtempSync(root + '/mission154-'));
    return { previous };
});
afterAll(() => {
    const globals = globalThis as {
        __ecomDb?: {
            close(): void;
        };
    };
    if (globals.__ecomDb !== isolatedDatabase.previous)
        globals.__ecomDb?.close();
    if (isolatedDatabase.previous)
        globals.__ecomDb = isolatedDatabase.previous;
    else
        delete globals.__ecomDb;
    vi.unstubAllEnvs();
});
import { it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest';
import fs from 'node:fs';
import sharp from 'sharp';
import { clientFixture } from './mission154-fixtures';
import { buildShop, composeShop } from '@/lib/engine/shop';
import { currentTheme, loadProject, listThemeVersions } from '@/lib/projects';
import { all, one, run } from '@/lib/db';
import { getAsset, assetData } from '@/lib/library';
import { storagePath } from '@/lib/storage';
import { compileTheme } from '@/lib/theme/compile';
import { validateSpec } from '@/lib/theme/ops';
import { renderPage } from '@/lib/theme/render';
import { runWithLang } from '@/lib/i18n-server';
import shapes from '@/lib/theme/reference-shapes.json';
const fr = <T,>(f: () => T) => runWithLang({ ui: 'fr', content: 'fr' }, f);
beforeEach(() => vi.stubGlobal('fetch', async () => { throw Error('No external fetch in mission154'); }));
afterEach(() => vi.unstubAllGlobals());
// Intégration #159 / #161 : les onze thèmes de référence passent par la même adaptation client.
it.each(['fraise', 'onde', 'sillon', 'noctil', 'traverse', 'orbe', 'rive', 'heuren', 'alcove', 'museau-club', 'souple'] as const)('%s : composition de référence, propres médias et copie persistante, aucun contenu de démo', async (direction) => {
    const f = await clientFixture({ services: direction === 'rive', catalog: ['orbe', 'onde', 'heuren', 'alcove', 'souple'].includes(direction) });
    const before = loadProject(f.pid).brand;
    const built = await fr(() => buildShop(null, f.pid, { direction, useAi: false }));
    const current = currentTheme(f.pid)!;
    expect(current).toBeTruthy();
    const s = current.spec;
    expect(validateSpec(s)).toEqual([]);
    expect(s.meta?.adaptation).toBeTruthy();
    const hero = s.templates.index.sections[s.templates.index.order[0]];
    expect(hero.settings.button_label ?? hero.settings.cta_label).toBe(f.copy.hero.cta);
    expect(s.store.shopName).toBe(f.brand);
    const reference = (shapes.themes as any)[direction];
    expect(Object.keys(reference.settings).filter(key => key.startsWith('cart_'))).toEqual(['cart_type']);
    for (const [key, value] of Object.entries(reference.settings)) expect(s.settings[key], `${direction} global ${key}`).toEqual(value);
    for (const group of ['header', 'footer'] as const) {
        expect(s.groups[group].order).toEqual(reference.groups[group].order);
        for (const sid of reference.groups[group].order) {
            expect(s.groups[group].sections[sid].type).toBe(reference.groups[group].sections[sid].type);
            // Un encart image du menu sans image du client est retiré (jamais de cadre vide) ; le reste suit la référence.
            const refSection = reference.groups[group].sections[sid];
            expect(s.groups[group].sections[sid].block_order).toEqual(refSection.block_order.filter((b: string) => refSection.blocks[b]?.type !== 'promo' || s.groups[group].sections[sid].blocks?.[b]));
            for (const [key, value] of Object.entries(reference.groups[group].sections[sid].settings))
                if (key !== 'color_scheme') expect(s.groups[group].sections[sid].settings[key], `${direction} ${group} ${key}`).toEqual(value);
        }
    }
    for (const [key, value] of Object.entries<any>(reference.templates)) {
        if (direction === 'rive' && key.startsWith('product'))
            continue;
        const target = key === 'product' && s.store.product.template_suffix ? `product.${s.store.product.template_suffix}` : key;
        expect(s.templates[target].order.map(id => id.replace(/^p_[a-f0-9]{8}_/, '')), key).toEqual(value.order.map((id: string) => id.replace(/^p_[a-f0-9]{8}_/, '')));
        expect(s.templates[target].order.map(id => s.templates[target].sections[id].type)).toEqual(value.order.map((id: string) => value.sections[id].type));
        for (const [i, id] of value.order.entries())
            for (const [key, setting] of Object.entries(value.sections[id].settings))
                if (!['heading_tag', 'focus_x', 'focus_y'].includes(key))
                    expect(s.templates[target].sections[s.templates[target].order[i]].settings[key], `${direction} ${key} reference composition`).toEqual(setting);
    }
    expect(s.meta!.adaptation!.slots.some(x => x.assetId)).toBe(true);
    for (const tpl of Object.values(s.templates))
        for (const section of Object.values(tpl.sections)) {
            if (section.type === 'timeline' && f.copy.story.steps.length) {
                expect(section.disabled).toBe(false);
                expect(Object.values(section.blocks ?? {}).map(b => b.type)).toEqual(f.copy.story.steps.map(() => 'step'));
            }
            if (section.type === 'marquee' && f.copy.marquee.length) {
                expect(section.disabled).toBe(false);
                expect(section.settings.items).toContain(f.copy.marquee[0]);
            }
        }
    expect(Object.values(s.files).every(id => getAsset(id)?.project_id === f.pid)).toBe(true);
    for (const assetId of new Set(Object.values(s.files))) {
        const a = getAsset(assetId)!;
        if (a.kind === 'image')
            expect((await sharp(assetData(a)).metadata()).width).toBeGreaterThan(0);
    }
    expect(JSON.stringify(s.store)).not.toMatch(/NOCTIL|TRAVERSE|SILLON|ONDE Audio|Fraise Gummies|Atelier Rive|HEUREN|ALCÔVE|MUSEAU|SOUPLE/);
    expect(s.store.product.description_html).toContain(f.copy.product.description_html);
    expect(loadProject(f.pid).brand?.palette).toEqual(before?.palette);
    expect(s.settings.type_heading_font).toBe(before?.fonts.heading);
    expect(JSON.stringify(s.settings.color_schemes)).toMatch(new RegExp(`${before?.palette.primary}|${before?.palette.accent}`, 'i'));
    expect(built.delivery.state).toBe(s.meta!.adaptation!.issues.length ? 'partial' : 'to_verify');
    const html = (await fr(() => renderPage({ spec: s, base: '', files: compileTheme(s), cart: [] }, '/', new URLSearchParams()))).html;
    expect(html).toContain(f.brand);
    expect(html).not.toContain('theme-assets/noctil');
    expect(html).not.toContain('theme-assets/traverse');
    expect((html.match(/<h1(?:\s|>)/g) ?? []).length).toBe(1);
    for (const page of s.store.pages) {
        const role = reference.pages.find((p: any) => p.suffix === page.template_suffix)?.role;
        if (role === 'privacy') expect(page.title).toBe('Confidentialité');
        if (role === 'terms') expect(page.title).toBe('Conditions générales');
        const rendered = (await fr(() => renderPage({ spec: s, base: '', files: compileTheme(s), cart: [] }, '/pages/' + page.handle, new URLSearchParams()))).html;
        expect((rendered.match(/<h1(?:\s|>)/g) ?? []).length, page.handle).toBe(1);
    }
    expect(one<{
        n: number;
    }>('SELECT COUNT(*) n FROM ai_calls WHERE project_id=?', f.pid)?.n).toBe(0);
}, 90000);
it('média incomplet et fichier disparu : état partiel, acquis conservés et préparation des seuls manques', async () => {
    const f = await clientFixture({ incomplete: true });
    await fr(() => buildShop(null, f.pid, { direction: 'traverse', useAi: false }));
    let s = currentTheme(f.pid)!.spec;
    const acquired = [...Object.values(s.files)];
    expect(s.meta!.adaptation!.status).toBe('partial');
    expect(s.templates.index.sections[s.templates.index.order[0]].disabled).toBe(false);
    expect(s.meta!.adaptation!.generationRequests.length).toBeGreaterThan(0);
    for (const r of s.meta!.adaptation!.generationRequests) {
        expect(r.requiresQuote).toBe(true);
        expect(r.requiresConsent).toBe(true);
        expect(r.people).toBe(false);
    }
    const asset = getAsset(f.assets[0].id)!;
    const data = assetData(asset);
    fs.writeFileSync(storagePath(asset.storage_key), Buffer.from('truncated'));
    await fr(() => buildShop(null, f.pid, { direction: 'traverse', useAi: false }));
    s = currentTheme(f.pid)!.spec;
    expect(s.meta!.adaptation!.excluded.some(x => x.id === asset.id && x.reason === 'file_missing_or_undecodable')).toBe(true);
    expect(Object.values(s.files)).not.toContain(asset.id);
    fs.writeFileSync(storagePath(asset.storage_key), data);
    await fr(() => buildShop(null, f.pid, { direction: 'traverse', useAi: false }));
    expect(Object.values(currentTheme(f.pid)!.spec.files)).toContain(asset.id);
    expect(getAsset(asset.id)?.deleted_at).toBeNull();
    expect(listThemeVersions(f.pid).length).toBeGreaterThanOrEqual(2);
    expect(acquired).toContain(asset.id);
});
