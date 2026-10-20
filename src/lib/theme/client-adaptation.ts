/** Client adaptation of the validated reference compositions. No demo text/image is used at runtime. */
import shapes from './reference-shapes.json';
import type { Project } from '../projects';
import type { JobContext } from '../jobs';
import type { ShopCopy } from './copy';
import type { ThemeSpec, SectionInstance, TemplateJson } from './spec';
import { sectionSchema } from './spec';
import { inventoryClientMedia, chooseClientMedium, type MediaRole, type ClientMedium } from './client-media';
import { bindClientCopy, paragraph, plain, genuine, sectionPurpose } from './client-copy';
import { clientThemeContext } from './placement-request';
import { stableHash } from '../brain/hash';
export type ContentIssue = {
    page: string;
    section: string;
    code: string;
    field?: string;
    block?: string;
};
export type ContentSlot = {
    key: string;
    page: string;
    section: string;
    block?: string;
    field: string;
    role: MediaRole;
    assetId?: string;
    file?: string;
    description?: string;
    alignment: 'declared' | 'to_review' | 'missing';
};
export type ClientContentPlan = {
    version: 1;
    sourceCommit: string;
    inputHash: string;
    contextHash: string;
    status: 'partial' | 'to_verify';
    pages: {
        template: string;
        role: string;
        sections: {
            id: string;
            type: string;
            visible: boolean;
            purpose: string;
        }[];
    }[];
    slots: ContentSlot[];
    issues: ContentIssue[];
    excluded: {
        id: string;
        reason: string;
    }[];
    generationRequests: {
        key: string;
        role: MediaRole;
        kind: 'image' | 'video';
        aspect: string;
        request: string;
        referenceAssetIds: string[];
        people: false;
        requiresQuote: true;
        requiresConsent: true;
    }[];
};
type ShapeSection = {
    type: string;
    settings: Record<string, unknown>;
    media: {
        field: string;
        role: string;
        aspect: number | null;
    }[];
    blocks: Record<string, {
        type: string;
        settings: Record<string, unknown>;
        media: {
            field: string;
            role: string;
            aspect: number | null;
        }[];
        initiallyHidden?: boolean;
    }>;
    block_order: string[];
    initiallyHidden?: boolean;
};
type Shape = {
    templates: Record<string, {
        sections: Record<string, ShapeSection>;
        order: string[];
    }>;
    pages: {
        suffix: string;
        role: string;
    }[];
};
const roleNames = { opening: ['Une première vue', 'Opening view'], packshot: ['Vue complète', 'Full view'], detail: ['Le détail, de près', 'A closer look'], use: ['En situation', 'In use'], method: ['Une étape de travail', 'A working step'], realization: ['Une réalisation documentée', 'Documented project'], video: ['En mouvement', 'In motion'], logo: ['Identité de la marque', 'Brand identity'] } as const;
const mediaKey = (s: string) => /^(?:image|second|day_image|night_image|poster|video)[a-z_]*_asset$|^second_asset$/.test(s);
const textMissing = (s: SectionInstance) => /\[(?:À|A) (?:compléter|définir)|\[To (?:complete|define)/i.test(JSON.stringify([s.settings, s.blocks]));
export async function adaptClientReference(spec: ThemeSpec, p: Project, copy: ShopCopy, ctx?: JobContext | null): Promise<ClientContentPlan | null> {
    const shape = (shapes.themes as unknown as Record<string, Shape>)[spec.direction];
    if (!shape || spec.imported || spec.meta?.demo?.isDemo)
        return null;
    const en = spec.language === 'en', t = (fr: string, enText: string) => en ? enText : fr;
    ctx?.progress(.3, t('Préparation des pages et des emplacements du thème', 'Preparing theme pages and placements'));
    const inventory = await inventoryClientMedia(p), pool = inventory.usable;
    const plan: ClientContentPlan = { version: 1, sourceCommit: shapes.sourceCommit, contextHash: clientThemeContext(p), inputHash: stableHash('client-theme-content', { engine: '154.1', shapes: shape, direction: spec.direction, brand: p.brand, product: p.product, services: p.services, copy, media: pool }), status: 'to_verify', pages: [], slots: [], issues: [], excluded: inventory.excluded, generationRequests: [] };
    const labels: Record<string, string> = { home: p.brand?.name ?? p.name, story: t('Notre histoire', 'Our story'), uses: t('En situation', 'In use'), details: t('Utilisation et détails', 'Use and details'), contact: t('Questions et contact', 'Questions and contact'), faq: t('Questions fréquentes', 'Frequently asked questions'), shipping: t('Livraison et retours', 'Shipping and returns'), legal: t('Informations légales', 'Legal information'), services: t('Nos prestations', 'Our services'), portfolio: t('Réalisations documentées', 'Documented projects') };
    const templateRole = (key: string) => key === 'index' ? 'home' : key.startsWith('product') ? 'product' : shape.pages.find(x => `page.${x.suffix}` === key)?.role ?? 'details';
    const existingPages = new Map(spec.store.pages.map(x => [x.template_suffix, x]));
    // Keep the native store's stable page identities where possible; new page roles have neutral project-independent names.
    const builtPages = shape.pages.map(({ suffix, role }) => { const old = existingPages.get(suffix); return { ...old, template_suffix: suffix, handle: old?.handle ?? suffix, title: old?.contentTarget ? old.title : labels[role] ?? labels.details, body_html: old?.body_html ?? '', seo: { title: `${labels[role] ?? labels.details} | ${p.brand?.name ?? p.name}`, description: plain(role === 'story' ? copy.about.intro : role === 'contact' ? copy.contact.text : role === 'uses' ? p.brand?.positioning ?? p.product.summary : p.product.summary).slice(0, 160) } }; });
    const oldExtra = spec.store.pages.filter(x => !builtPages.some(b => b.template_suffix === x.template_suffix) && x.contentTarget);
    spec.store.pages = [...builtPages, ...oldExtra];
    const productLink = `/products/${spec.store.product.handle}`, contact = spec.store.pages.find(x => templateRole(`page.${x.template_suffix}`) === 'contact');
    const contactUrl = p.business === 'services' && p.services.contactMode === 'booking' && p.services.bookingUrl ? p.services.bookingUrl : `/pages/${contact?.handle ?? 'contact'}`;
    spec.store.seo = { title: `${p.brand?.name ?? p.name} | ${p.business === 'services' ? p.product.name : copy.hero.heading}`, description: plain(copy.hero.text || p.product.summary).slice(0, 160) };
    spec.store.menus['main-menu'] = { title: t('Navigation', 'Navigation'), links: [{ title: t('Accueil', 'Home'), url: '/' }, ...(p.business === 'products' ? [{ title: p.product.name, url: productLink }] : []), ...builtPages.filter(x => !['legal', 'shipping'].includes(templateRole(`page.${x.template_suffix}`))).map(x => ({ title: x.title, url: `/pages/${x.handle}` }))] };
    spec.settings.fab_contact_link = contactUrl;
    spec.store.menus.footer = { title: t('Informations', 'Information'), links: builtPages.map(x => ({ title: x.title, url: `/pages/${x.handle}` })) };
    ctx?.progress(.42, t('Contrôle des fichiers et affectation des images du projet', 'Checking files and assigning project media'));
    const onlyFiles: Record<string, string> = {};
    const nativeTemplates = spec.templates;
    const occurrences = new Map<string, number>();
    for (const [template, layout] of Object.entries(shape.templates)) {
        if (p.business === 'services' && template.startsWith('product'))
            continue;
        const role = templateRole(template), used = new Set<string>(), sections: Record<string, SectionInstance> = {};
        const page = { template, role, sections: [] as ClientContentPlan['pages'][number]['sections'] };
        plan.pages.push(page);
        const pageIssues = (sid: string, code: string, field?: string, block?: string) => { if (!plan.issues.some(i => i.page === template && i.section === sid && i.code === code && i.field === field && i.block === block))
            plan.issues.push({ page: template, section: sid, code, ...(field ? { field } : {}), ...(block ? { block } : {}) }); };
        for (const sid of layout.order) {
            const sh = layout.sections[sid], n = occurrences.get(`${template}:${sh.type}`) ?? 0;
            occurrences.set(`${template}:${sh.type}`, n + 1);
            const binding = bindClientCopy(spec, p, copy, sh.type, sh.settings, role, n);
            let section = binding.section;
            binding.missing.forEach(c => pageIssues(sid, c));
            const schema = sectionSchema(spec, sh.type);
            if (sh.type === 'main-product') {
                const native = Object.values(nativeTemplates[template]?.sections ?? {}).find(s => s.type === 'main-product');
                section = { ...(native ?? section), settings: { ...native?.settings, ...sh.settings } };
                const gallery = pool.filter(m => m.kind === 'image' && m.role !== 'logo' && (!m.subject || m.subject === 'product:main') && m.role !== 'method').sort((a, b) => (a.role === 'packshot' ? 0 : a.role === 'detail' ? 1 : 2) - (b.role === 'packshot' ? 0 : b.role === 'detail' ? 1 : 2) || a.id.localeCompare(b.id));
                spec.store.product.images = gallery.map(a => { onlyFiles[a.file] = a.id; return a.file; });
                spec.store.product.imageInfo = Object.fromEntries(gallery.map(a => [a.file, { width: a.width, height: a.height, alt: a.description || p.product.name }]));
                if (!gallery.length)
                    pageIssues(sid, 'product_gallery_missing');
            }
            const bindMedia = (settings: Record<string, unknown>, field: string, wanted: MediaRole, aspect: number | null, block?: string) => {
                // Slot identity is stable across retries; another offer's media are never borrowed.
                const desiredKey = [template, sid, block ?? '', field].join(':');
                const explicit = pool.find(a => a.placement === `theme:${wanted}:${plan.contextHash}:${desiredKey}` && !used.has(a.id));
                const asset = explicit ?? chooseClientMedium(pool.filter(a => !a.placement && (!a.subject || a.subject === 'product:main' || p.business === 'services')), wanted, used, aspect);
                const slot: ContentSlot = { key: desiredKey, page: template, section: sid, ...(block ? { block } : {}), field, role: wanted, alignment: asset?.reviewed ? 'declared' : asset ? 'to_review' : 'missing' };
                plan.slots.push(slot);
                if (!asset) {
                    settings[field] = '';
                    pageIssues(sid, wanted === 'realization' ? 'authentic_realization_missing' : 'media_missing', field, block);
                    return;
                }
                used.add(asset.id);
                settings[field] = asset.file;
                onlyFiles[asset.file] = asset.id;
                Object.assign(slot, { assetId: asset.id, file: asset.file, description: asset.description });
                const defs = block ? schema?.blocks.find(x => x.type === section.blocks?.[block]?.type)?.settings : schema?.settings;
                const set = (key: string, value: unknown) => { if (defs?.some(d => d.id === key))
                    settings[key] = value; };
                const alt = asset.description || `${p.business === 'services' ? p.brand?.name : p.product.name} — ${roleNames[wanted][en ? 1 : 0]}`;
                set(field === 'second_asset' ? 'second_alt' : 'image_alt', alt);
                set('image_position', asset.focal.desktop);
                set('image_mobile_position', asset.focal.mobile);
                if (!asset.description)
                    pageIssues(sid, 'image_description_to_review', field, block);
                if (!asset.reviewed)
                    pageIssues(sid, 'image_alignment_to_review', field, block);
                if (p.business === 'services' && asset.origin === 'generated') {
                    set('caption', t('Illustration générée — ne représente pas une réalisation authentique', 'Generated illustration — not an authentic completed project'));
                }
                if (block && asset.description) {
                    for (const k of ['title', 'heading', 'caption'])
                        set(k, asset.description.split(/[.!?]/)[0]);
                    for (const k of ['text', 'description'])
                        set(k, paragraph(asset.description));
                }
                if (!block && asset.description && ['detail', 'use', 'method', 'realization'].includes(wanted) && !['main-product', 'main-page', 'page-title'].includes(sh.type)) {
                    for (const k of ['heading', 'title'])
                        set(k, roleNames[wanted][en ? 1 : 0]);
                    set('text', paragraph(asset.description));
                }
            };
            if (sh.type === 'main-product')
                for (const variant of spec.store.product.variants) {
                    if (variant.image) {
                        const previous = spec.files[variant.image], media = pool.find(a => a.id === previous);
                        if (media) {
                            variant.image = media.file;
                            onlyFiles[media.file] = media.id;
                        }
                        else {
                            delete variant.image;
                            pageIssues(sid, 'variant_media_missing');
                        }
                    }
                }
            // Strip native media picks first: none of the filename-order defaults can survive this binding.
            for (const k of Object.keys(section.settings))
                if (mediaKey(k))
                    section.settings[k] = '';
            for (const m of sh.media ?? [])
                bindMedia(section.settings, m.field, m.role as MediaRole, m.aspect);
            const images = sh.block_order.filter(bid => sh.blocks[bid].media?.length);
            if (images.length) {
                const original = Object.values(section.blocks ?? {});
                section.blocks = {};
                section.block_order = [];
                for (const [i, bid] of sh.block_order.entries()) {
                    const b = sh.blocks[bid], content = original.filter(x => x.type === b.type)[i];
                    const definitions = schema?.blocks.find(x => x.type === b.type)?.settings ?? [];
                    const settings: Record<string, unknown> = { ...content?.settings, ...b.settings };
                    for (const def of definitions)
                        if (def.id && ['text', 'textarea', 'richtext', 'inline_richtext', 'url', 'html'].includes(def.type) && settings[def.id] === undefined)
                            settings[def.id] = '';
                    section.blocks[bid] = { type: b.type, settings };
                    section.block_order.push(bid);
                    for (const m of b.media ?? [])
                        bindMedia(settings, m.field, m.role as MediaRole, m.aspect, bid);
                }
            }
            else
                for (const b of Object.values(section.blocks ?? {}))
                    for (const k of Object.keys(b.settings))
                        if (mediaKey(k))
                            b.settings[k] = '';
            if (sh.type === 'page-title') {
                section.settings = { ...section.settings, heading: spec.store.pages.find(x => `page.${x.template_suffix}` === template)?.title ?? labels[role] ?? p.name };
            }
            if (p.business === 'services' || /contact|booking/.test(sh.type))
                for (const k of ['button_link', 'cta_link'])
                    if (schema?.settings.some(d => d.id === k))
                        section.settings[k] = contactUrl;
            if (textMissing(section))
                pageIssues(sid, 'information_required');
            if (sh.type === 'main-product' && p.business === 'services')
                pageIssues(sid, 'product_page_not_for_services');
            const blocked = plan.issues.some(i => i.page === template && i.section === sid && !/to_review$/.test(i.code));
            section.disabled = blocked;
            sections[sid] = section;
            page.sections.push({ id: sid, type: sh.type, visible: !blocked, purpose: sectionPurpose(sh.type) });
        }
        spec.templates[template] = { sections, order: [...layout.order] };
    }
    // The selected logo is project-scoped. No default or demonstration logo may leak through a group setting.
    const logo = pool.find(a => a.role === 'logo' && a.id === p.brand?.logo?.assetId) ?? pool.find(a => a.role === 'logo');
    spec.settings.logo_asset = logo?.file ?? '';
    spec.settings.favicon_asset = logo?.file ?? '';
    if (logo)
        onlyFiles[logo.file] = logo.id;
    for (const [groupName, group] of Object.entries(spec.groups))
        for (const section of Object.values(group.sections)) {
            for (const k of Object.keys(section.settings))
                if (mediaKey(k) || k === 'logo_asset')
                    section.settings[k] = k === 'logo_asset' ? logo?.file ?? '' : '';
            for (const b of Object.values(section.blocks ?? {}))
                for (const k of Object.keys(b.settings))
                    if (mediaKey(k))
                        b.settings[k] = '';
            if (groupName === 'footer')
                for (const b of Object.values(section.blocks ?? {}))
                    if (b.type === 'text') {
                        b.settings.heading = p.brand?.name ?? p.name;
                        b.settings.text = paragraph(copy.footer.about);
                    }
        }
    // Include acquired client files used by existing extra pages and variant images; preserve their stable references.
    const refs = JSON.stringify([spec.templates, spec.groups, spec.settings, spec.store]);
    for (const [file, id] of Object.entries(spec.files))
        if (refs.includes(JSON.stringify(file)) && pool.some(a => a.id === id))
            onlyFiles[file] = id;
    spec.files = onlyFiles;
    for (const slot of plan.slots.filter(s => s.alignment === 'missing')) {
        const key = slot.key;
        const reference = pool.filter(a => a.kind === 'image' && (slot.role === 'video' ? ['packshot', 'opening', 'use'].includes(a.role) : a.role === 'packshot')).slice(0, 3).map(a => a.id);
        if (slot.role === 'realization')
            continue; // An authentic portfolio cannot be synthesized.
        plan.generationRequests.push({ key, role: slot.role, kind: slot.role === 'video' ? 'video' : 'image', aspect: slot.role === 'packshot' || slot.role === 'detail' ? '1:1' : '16:9', request: t(`Créer une ${roleNames[slot.role][0].toLowerCase()} de ${p.product.name}. ${p.product.summary}. Respecter le produit des références et l'identité ${p.brand?.name ?? p.name}. Aucun fait ajouté, aucune personne. Emplacement : ${slot.page} / ${slot.section}.`, `Create a ${roleNames[slot.role][1].toLowerCase()} of ${p.product.name}. ${p.product.summary}. Preserve the reference product and ${p.brand?.name ?? p.name} identity. No invented facts or people. Placement: ${slot.page} / ${slot.section}.`), referenceAssetIds: reference, people: false, requiresQuote: true, requiresConsent: true });
    }
    if (!logo)
        plan.issues.push({ page: 'group:header', section: 'logo', code: 'project_logo_missing' });
    if (plan.issues.length)
        plan.status = 'partial';
    spec.meta = { ...spec.meta, adaptation: plan };
    ctx?.progress(.67, t('Rédaction affectée et composition assemblée ; vérification du contenu', 'Copy mapped and composition assembled; checking content'));
    return plan;
}
/** Reconciliation after carry-over: an old/manual reference cannot turn a missing/corrupt file into a delivered image. */
export async function verifyAdaptationFiles(spec: ThemeSpec, p: Project) {
    const plan = spec.meta?.adaptation;
    if (!plan)
        return;
    const inventory = await inventoryClientMedia(p), allowed = new Set(inventory.usable.map(a => a.id));
    const invalid = new Set(Object.entries(spec.files).filter(([, id]) => !allowed.has(id)).map(([file]) => file));
    for (const file of invalid)
        delete spec.files[file];
    const inspect = (settings: Record<string, unknown>, page: string, section: string, block?: string) => { for (const [field, value] of Object.entries(settings))
        if (typeof value === 'string' && invalid.has(value)) {
            settings[field] = '';
            plan.issues.push({ page, section, field, ...(block ? { block } : {}), code: 'file_missing_or_undecodable' });
        } };
    for (const [page, tpl] of Object.entries(spec.templates))
        for (const [sid, s] of Object.entries(tpl.sections)) {
            inspect(s.settings, page, sid);
            for (const [bid, b] of Object.entries(s.blocks ?? {}))
                inspect(b.settings, page, sid, bid);
        }
    for (const [name, group] of Object.entries(spec.groups))
        for (const [sid, s] of Object.entries(group.sections)) {
            inspect(s.settings, `group:${name}`, sid);
            for (const [bid, b] of Object.entries(s.blocks ?? {}))
                inspect(b.settings, `group:${name}`, sid, bid);
        }
    for (const product of [spec.store.product, ...(spec.store.products ?? [])]) {
        product.images = product.images.filter(file => !invalid.has(file));
        for (const v of product.variants)
            if (v.image && invalid.has(v.image))
                delete v.image;
    }
    for (const collection of spec.store.collections ?? [])
        if (collection.image && invalid.has(collection.image))
            delete collection.image;
    for (const slot of plan.slots)
        if (slot.assetId && !allowed.has(slot.assetId)) {
            slot.alignment = 'missing';
            delete slot.assetId;
            delete slot.file;
        }
    for (const issue of inventory.excluded)
        if (!plan.excluded.some(x => x.id === issue.id && x.reason === issue.reason))
            plan.excluded.push(issue);
    // Reflect explicit editor changes instead of keeping a stale missing-media warning forever.
    for (const slot of plan.slots) {
        const s = spec.templates[slot.page]?.sections[slot.section];
        const values = slot.block ? s?.blocks?.[slot.block]?.settings : s?.settings;
        const file = values?.[slot.field];
        const assetId = typeof file === 'string' ? spec.files[file] : null;
        if (assetId && allowed.has(assetId)) {
            const media = inventory.usable.find(a => a.id === assetId)!;
            slot.assetId = assetId;
            slot.file = file as string;
            slot.alignment = media.reviewed ? 'declared' : 'to_review';
        }
    }
    const hasData = (page: string, section: string) => { const s = spec.templates[page]?.sections[section]; if (!s || s.disabled || textMissing(s))
        return false; const blocks = Object.values(s.blocks ?? {}); if (/review|testimonial|quote/.test(s.type))
        return blocks.some(b => genuine(b.settings.quote ?? b.settings.text) && genuine(b.settings.author ?? b.settings.name)) || genuine(s.settings.quote) && genuine(s.settings.author); if (s.type === 'cv-hotspots')
        return blocks.some(b => genuine(b.settings.title) && typeof b.settings.x === 'number' && typeof b.settings.y === 'number'); return false; };
    plan.issues = plan.issues.filter(issue => { if (['media_missing', 'image_description_to_review', 'image_alignment_to_review', 'file_missing_or_undecodable'].includes(issue.code)) {
        const slot = plan.slots.find(s => s.page === issue.page && s.section === issue.section && s.block === issue.block && s.field === issue.field);
        if (slot?.assetId) {
            if (issue.code === 'media_missing' || issue.code === 'file_missing_or_undecodable')
                return false;
            if (issue.code === 'image_alignment_to_review' && slot.alignment === 'declared')
                return false;
            const media = inventory.usable.find(a => a.id === slot.assetId);
            if (issue.code === 'image_description_to_review' && media?.description)
                return false;
        }
    } if (['authentic_reviews', 'confirmed_hotspot_positions', 'information_required'].includes(issue.code) && hasData(issue.page, issue.section))
        return false; return true; });
    plan.status = plan.issues.length ? 'partial' : 'to_verify';
}
