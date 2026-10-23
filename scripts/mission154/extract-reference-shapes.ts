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
const MUSEAU_DEMO_ONLY = /^page\.(journal|les-petits-rituels-des-grandes-balades|preparer-son-sac-pour-la-balade|choisir-la-taille-de-son-harnais|des-idees-pour-changer-de-chemin|le-quotidien-en-bonne-compagnie|finaliser-ma-commande|confirmation-de-commande|connexion|creer-un-compte|mot-de-passe-oublie|mon-compte|commande-1001|mes-adresses|informations-personnelles)$/;
const result: any = { sourceCommit: '5dd5f63011c1e0a4ee2369fe1b2565c4e899f71e', provenance: 'Validated compositions, design settings and block order only. No demo copy, logo, image or commercial data.', themes: {} };
// Schema types identify styling rather than content. Coordinates of hotspots are content, never design.
// TRAVERSE : ses cartes sur photo et celles du carnet sont des paysages (rôle « situation ») ; les photos de détail du client
// restent aux gros plans des « Essentiels ».
const media = (values: any, type: string) => Object.entries(values ?? {}).filter(([k, v]) => /^(?:image|second|day_image|night_image|poster|video)[a-z_]*_asset$|^second_asset$/.test(k) && (!!v || !!values.media_role || !!values.second_role || /video/.test(k) && /stories|video/.test(type))).map(([field, v]) => { const a = typeof v === 'string' ? getAsset(currentSpec.files[v]) : null; return { field, role: /video/.test(field) ? 'video' : a?.role === 'logo' ? 'logo' : a?.role === 'detail' || /detail/.test(String(values.media_role ?? '')) ? 'detail' : a?.role === 'cutout' || a?.role === 'packshot' ? 'packshot' : currentSpec.direction === 'traverse' && /^(scene|lifestyle|banner)$/.test(a?.role ?? '') ? 'use' : /portfolio|study|case/.test(type) ? 'realization' : /hero|opening|banner/.test(type) ? 'opening' : /hotspot|ingredient|cards|finishes/.test(type) ? 'detail' : 'use', aspect: a?.width && a?.height ? +(a.width / a.height).toFixed(3) : null }; });
let currentSpec: any;
const visual = new Set(['select', 'range', 'checkbox', 'color_scheme']);
const forbidden = /rating|price|discount|quantity|stock|shipping|guarantee|countdown|timer|days|hours|minutes|seconds|purchase_enabled|structured_data|^x$|^y$/;
try {
    for (const id of ['fraise', 'onde', 'orbe', 'rive', 'sillon', 'noctil', 'traverse', 'heuren', 'alcove', 'museau-club', 'souple'] as const) {
        const { spec } = await demoProject(user.id, id);
        currentSpec = spec;
        const templates: any = {};
        for (const [key, t] of Object.entries({ ...spec.templates, product: spec.templates[spec.store.product.template_suffix ? `product.${spec.store.product.template_suffix}` : 'product'] ?? spec.templates.product })) {
            if (!['index', 'product'].includes(key) && !key.startsWith('page.'))
                continue;
            // Atelier Rive (maquettes du 23 octobre) : les pages de projets d'exemple restent dans la démonstration ; un client
            // garde la galerie de projets et ajoute ses propres projets (modèle « Étude de cas › détail » de la galerie).
            if (/^page\.projet-/.test(key))
                continue;
            // TRAVERSE (dossier du 23 octobre) : l'article d'exemple du carnet reste dans la démonstration ; un client garde
            // la page du carnet et y publie ses propres articles.
            if (key === 'page.deux-jours-un-autre-decor')
                continue;
            // MUSEAU CLUB (maquettes du 23 octobre) : journal, articles d'exemple, exemple de commande et écrans de compte
            // restent dans la démonstration (un client publie ses articles ; commande et compte sont ceux de Shopify).
            if (MUSEAU_DEMO_ONLY.test(key))
                continue;
            const sections: any = {};
            // MUSEAU CLUB : le dessin du guide des tailles est celui d'un chien (tour de cou, tour de poitrail) ; il ne
            // passe jamais chez un client dont les produits ne sont pas des accessoires pour chiens.
            const order = t.order.filter(sid => !(t.sections[sid].type === 'cv-banner' && t.sections[sid].settings.layout === 'illustration'));
            for (const sid of order) {
                const s = t.sections[sid], schema = sectionSchema(spec, s.type);
                const pick = (values: any, defs: any[]) => Object.fromEntries(Object.entries(values ?? {}).filter(([k]) => { const d = defs.find(x => x.id === k); return d && visual.has(d.type) && !forbidden.test(k); }));
                sections[sid] = { type: s.type, settings: pick(s.settings, schema?.settings ?? []), media: media(s.settings, s.type), blocks: Object.fromEntries((s.block_order ?? Object.keys(s.blocks ?? {})).map(bid => { const b = s.blocks![bid]; return [bid, { type: b.type, settings: pick(b.settings, schema?.blocks.find(x => x.type === b.type)?.settings ?? []), media: media(b.settings, s.type), ...(b.disabled ? { initiallyHidden: true } : {}) }]; })), block_order: s.block_order ?? Object.keys(s.blocks ?? {}), ...(s.disabled ? { initiallyHidden: true } : {}) };
            }
            templates[key] = { sections, order };
        }
        result.themes[id] = { templates, pages: spec.store.pages.filter(p => !/^projet-/.test(p.handle) && p.handle !== 'deux-jours-un-autre-decor' && !MUSEAU_DEMO_ONLY.test(`page.${p.handle}`)).map(p => ({ suffix: p.template_suffix, role: /confidential|privacy/.test(p.handle) ? 'privacy' : /condition|terms|^cgv$/.test(p.handle) ? 'terms' : p.handle === 'listicle' ? 'guide' : p.handle === 'advertorial' ? 'editorial' : p.handle === 'sections' ? 'showcase' : /contact|aide|help/.test(p.handle) ? 'contact' : /faq|questions/.test(p.handle) ? 'faq' : /livraison|shipping/.test(p.handle) ? 'shipping' : /utilisation|caracteristiques|how|detail|tailles/.test(p.handle) ? 'details' : /usage|carnet|piece|inspiration/.test(p.handle) ? 'uses' : /legal|mention/.test(p.handle) ? 'legal' : /prestation|service/.test(p.handle) ? 'services' : /projet|realisation|portfolio/.test(p.handle) ? 'portfolio' : 'story' })) };
        console.log(id, Object.keys(templates).length, 'templates', Object.values(templates).reduce((n: number, t: any) => n + t.order.length, 0), 'sections');
    }
    fs.writeFileSync('src/lib/theme/reference-shapes.json', JSON.stringify(result, null, 2) + '\n');
}
finally {
    fs.rmSync(temp, { recursive: true, force: true });
}
