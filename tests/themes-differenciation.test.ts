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
import { clientFixture } from './mission154-fixtures';
import { buildShop } from '@/lib/engine/shop';
import { currentTheme } from '@/lib/projects';
import { runWithLang } from '@/lib/i18n-server';
import shapes from '@/lib/theme/reference-shapes.json';
/**
 * Différenciation des thèmes (consigne du 22 octobre, PR #162) : HEUREN (maquette du 22 octobre) et Atelier Rive n'ont plus
 * la même ouverture.
 * La composition de chacun est protégée dans l'adaptation client : un projet client garde l'ouverture du thème choisi,
 * avec ses propres textes, et HEUREN garde son fond de page blanc même quand la couleur claire de la marque est crème.
 */
const fr = <T,>(f: () => T) => runWithLang({ ui: 'fr', content: 'fr' }, f);
beforeEach(() => vi.stubGlobal('fetch', async () => { throw Error('Aucun appel réseau'); }));
afterEach(() => vi.unstubAllGlobals());
const opening = (id: string) => { const t = (shapes.themes as any)[id].templates.index; return t.sections[t.order[0]]; };

it('formes de référence : HEUREN en plein écran (maquette), Atelier Rive en cartouche, deux ouvertures différentes', () => {
    expect(opening('heuren')).toMatchObject({ type: 'ed-opening', settings: { layout: 'fullscreen', color_scheme: 'scheme-2' } });
    expect(opening('rive')).toMatchObject({ type: 'ed-opening', settings: { layout: 'cartouche' } });
    // La section qui suit l'ouverture n'a pas la même couleur qu'elle (sinon les deux se fondent).
    for (const id of ['heuren', 'rive']) {
        const t = (shapes.themes as any)[id].templates.index;
        expect(t.sections[t.order[1]].settings.color_scheme).not.toBe(t.sections[t.order[0]].settings.color_scheme);
    }
});

it.each([['heuren', false], ['rive', true]] as const)('%s : un projet client garde l\'ouverture du thème avec ses propres textes', async (direction, services) => {
    const f = await clientFixture({ services, catalog: !services });
    await fr(() => buildShop(null, f.pid, { direction, useAi: false }));
    const s = currentTheme(f.pid)!.spec;
    const hero = s.templates.index.sections[s.templates.index.order[0]];
    expect(hero.type).toBe('ed-opening');
    expect(hero.settings.layout).toBe(direction === 'heuren' ? 'fullscreen' : 'cartouche');
    expect(hero.settings.button_label).toBe(f.copy.hero.cta);
    expect(JSON.stringify(s.templates.index)).not.toMatch(/Marquez|ce moment|Un intérieur à votre façon de vivre/);
    if (direction === 'heuren') expect((s.settings.color_schemes as any)['scheme-1'].settings.background.toUpperCase()).toBe('#FFFFFF');
});
