/** Binding of acquired client copy to a section's editorial purpose. No new commercial facts. */
import type { ShopCopy } from './copy';
import type { Project } from '../projects';
import type { SectionInstance, ThemeSpec } from './spec';
import { sectionSchema } from './spec';
import { contentContext } from './section-content';
import { applySectionCopy } from './section-copy';
export const genuine = (v: unknown): v is string => typeof v === 'string' && !!v.trim() && !/\[(?:À|A) (?:compléter|définir)|\[To (?:complete|define)/i.test(v);
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export const paragraph = (s: string) => genuine(s) ? `<p>${esc(s)}</p>` : '';
export const plain = (s: string) => s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
export function sectionPurpose(type: string): string {
    if (/hero|opening|banner/.test(type))
        return 'opening';
    if (/faq/.test(type))
        return 'faq';
    if (/ingredients|composition/.test(type))
        return 'composition';
    if (/specs|tabs|dimensions/.test(type))
        return 'details';
    if (/steps|timeline|how-to|narrative/.test(type))
        return 'method';
    if (/gallery|alternating|diptych|scene/.test(type))
        return 'uses';
    if (/contact|booking|practical/.test(type))
        return 'contact';
    if (/about|statement|rich-text/.test(type))
        return 'story';
    if (/purchase|offer|cta/.test(type))
        return 'purchase';
    return 'details';
}
/** Types requiring testimony, measurements or legal conditions may never be filled from a generic summary. */
export function evidenceNeeded(type: string, p: Project, copy: ShopCopy): string | null {
    if (/review|quote|testimonial/.test(type))
        return 'authentic_reviews';
    if (/press|reference/.test(type) && !/^ref-/.test(type))
        return 'verified_references';
    if (/comparison/.test(type))
        return 'verified_comparison';
    if (/stats|results/.test(type))
        return 'verified_measurements';
    if (/making/.test(type))
        return 'verified_making_process';
    if (/guarantee/.test(type) && !p.product.facts.some(f => f.status === 'confirmed' && /garant|guarantee/i.test(f.label)))
        return 'confirmed_guarantee';
    if (/commitments/.test(type) && !p.brand?.values?.some(v => genuine(v.title) && genuine(v.text)))
        return 'confirmed_commitments';
    if (/shipping/.test(type) && !genuine(plain(copy.shipping.body_html)))
        return 'confirmed_shipping_terms';
    return null;
}
export function bindClientCopy(spec: ThemeSpec, p: Project, copy: ShopCopy, type: string, design: Record<string, unknown>, pageRole: string, occurrence: number): {
    section: SectionInstance;
    missing: string[];
} {
    const ctx = contentContext(p, spec, false), schema = sectionSchema(spec, type);
    const missing: string[] = [];
    if (!schema)
        return { section: { type, settings: design }, missing: ['unknown_section'] };
    const t = (fr: string, en: string) => ctx.lang === 'en' ? en : fr;
    const services = p.business === 'services';
    const name = services ? p.brand?.name ?? p.name : p.product.name;
    const destination = services ? (p.services.contactMode === 'booking' && p.services.bookingUrl ? p.services.bookingUrl : '/pages/contact') : `/products/${spec.store.product.handle}`;
    const cta = services ? t(p.services.contactMode === 'booking' ? 'Prendre rendez-vous' : p.services.contactMode === 'quote' ? 'Demander un devis' : 'Nous contacter', p.services.contactMode === 'booking' ? 'Book an appointment' : p.services.contactMode === 'quote' ? 'Request a quote' : 'Contact us') : genuine(copy.hero.cta) && sectionPurpose(type) === 'opening' ? copy.hero.cta : genuine(copy.cta.button) && sectionPurpose(type) === 'purchase' ? copy.cta.button : t(`Découvrir ${p.product.name}`, `Explore ${p.product.name}`);
    const purpose = sectionPurpose(type), facts = p.product.facts.filter(f => f.status === 'confirmed' && genuine(f.value));
    const values = (p.brand?.values ?? []).filter(v => genuine(v.title) && genuine(v.text));
    const sections = applySectionCopy(type, schema, ctx, { settings: { ...design } });
    let out = { ...sections.settings, ...design }; // Reference layout wins over library defaults; content is bound below.
    let blocks = sections.blocks ?? [];
    // Develop an editorial sequence from acquired offer/method copy, never from image descriptions.
    // Services keep the complete activity; products develop the selected use and its confirmed details.
    const editorialEntries=(services?p.services.services.map(s=>({title:s.name,text:s.description})):copy.story.steps)
        .concat(copy.features.items.map(s=>({title:s.title,text:s.text})))
        .filter(s=>genuine(s.title)&&genuine(s.text))
        .filter((s,i,all)=>all.findIndex(v=>v.title.trim().toLocaleLowerCase()===s.title.trim().toLocaleLowerCase())===i);
    const useEntry=editorialEntries[occurrence%Math.max(1,editorialEntries.length)];
    const headline = purpose === 'opening' ? (pageRole === 'home' ? copy.hero.heading : name) : purpose === 'story' ? (pageRole === 'story' ? copy.about.heading : copy.statement.heading) : purpose === 'method' ? copy.story.heading : purpose === 'faq' ? copy.faq.heading : purpose === 'contact' ? copy.contact.heading : purpose === 'purchase' ? copy.cta.heading : purpose === 'composition' ? t('Composition et matières', 'Composition and materials') : purpose === 'uses' ? (blocks.length?copy.gallery.heading:useEntry?.title??copy.gallery.heading) : copy.detail.heading;
    const body = purpose === 'opening' ? copy.hero.text : purpose === 'story' ? (occurrence ? copy.statement.text : copy.about.intro) : purpose === 'method' ? '' : purpose === 'faq' ? '' : purpose === 'contact' ? copy.contact.text : purpose === 'purchase' ? copy.cta.text : purpose === 'uses' ? (blocks.length?'':useEntry?.text??copy.detail.text) : copy.detail.text;
    const set = (k: string, v: unknown) => {
        if (schema.settings.some(x => x.id === k))
            out[k] = v;
    };
    if (!/main-product|main-page|page-title|main-collection|main-search/.test(type)) {
        for (const k of ['heading', 'title'])
            set(k, genuine(headline) ? headline : name);
        if (purpose === 'opening')
            set('heading_tag', pageRole === 'home' ? 'h1' : 'h2');
        if (purpose === 'opening')
            set('eyebrow', p.brand?.name ?? p.name);
        for (const k of ['text', 'lead', 'intro'])
            set(k, genuine(body) ? paragraph(body) : '');
        for (const k of ['button_label', 'cta_label', 'link_label'])
            set(k, cta);
        for (const k of ['button_link', 'cta_link'])
            set(k, destination);
    }
    if(purpose==='uses')blocks=blocks.map((block,index)=>{
        const entry=editorialEntries[(occurrence+index)%Math.max(1,editorialEntries.length)];
        return entry?{...block,settings:{...block.settings,title:entry.title,heading:entry.title,caption:genuine(copy.gallery.captions[index])?copy.gallery.captions[index]:entry.title,text:paragraph(entry.text),description:paragraph(entry.text)}}:block;
    });
    if (['guide', 'editorial', 'showcase'].includes(pageRole) && type === 'rich-text') {
        const heading = pageRole === 'guide' ? copy.features.heading : pageRole === 'editorial' ? copy.story.heading : copy.gallery.heading;
        const text = pageRole === 'guide' ? copy.features.items.map(x => `${x.title} : ${x.text}`).join(' ') : pageRole === 'editorial' ? copy.story.steps.map(x => `${x.title} : ${x.text}`).join(' ') : copy.detail.text;
        blocks = [{ type: 'heading', settings: { text: heading } }, { type: 'text', settings: { text: paragraph(text) } }];
    }
    if (type === 'about') {
        set('heading', copy.about.heading);
        set('lead', paragraph(copy.about.intro));
        set('why_title', copy.statement.heading);
        set('why_text', paragraph(p.brand?.positioning ?? copy.statement.text));
        set('commit_text', values.map(v => paragraph(`${v.title} : ${v.text}`)).join(''));
        set('signature', p.brand?.name ?? p.name);
        blocks = values.map(v => ({ type: 'value', settings: { icon: 'check', title: v.title, text: paragraph(v.text) } }));
    }
    if (/newsletter/.test(type)) {
        set('heading', copy.newsletter.heading);
        set('text', paragraph(copy.newsletter.text));
        set('button_label', t('S’inscrire', 'Sign up'));
        for (const key of ['perk_1', 'perk_2', 'perk_3'])
            set(key, '');
    }
    if (/features-grid/.test(type))
        blocks = copy.features.items.filter(v => genuine(v.title) && genuine(v.text)).map(v => ({ type: 'feature', settings: { title: v.title, text: paragraph(v.text), icon: v.icon } }));
    if (/faq/.test(type))
        blocks = copy.faq.items.filter(v => genuine(v.q) && genuine(v.a)).map(v => ({ type: 'question', settings: { question: v.q, answer: paragraph(v.a) } }));
    if (/cv-steps|timeline|how-to|ref-narrative/.test(type))
        blocks = copy.story.steps.filter(v => genuine(v.title) && genuine(v.text)).map((v, i) => ({ type: type === 'ref-narrative' ? 'chapter' : 'step', settings: { title: v.title, heading: v.title, text: paragraph(v.text), number: String(i + 1) } }));
    if (/cv-ingredients/.test(type)) {
        const composition = facts.filter(f => /compos|mati[eè]r|ingr[eé]d|material|fabric|finition/i.test(f.label));
        blocks = composition.map(f => ({ type: 'ingredient', settings: { name: f.label, role: f.value, note: '' } }));
        if (!blocks.length)
            missing.push('confirmed_composition');
    }
    if (/cv-cards/.test(type))
        blocks = facts.map(f => ({ type: 'card', settings: { title: f.label, text: paragraph(f.value) } }));
    if (/cv-specs/.test(type))
        blocks = facts.length ? [{ type: 'group', settings: { title: t('Les caractéristiques confirmées', 'Confirmed specifications'), rows: facts.map(f => `${f.label} : ${f.value}`).join('\n'), open: true } }] : [];
    if (type === 'content-tabs')
        blocks = copy.product.tabs.filter(v => genuine(v.heading) && genuine(plain(v.content_html))).map(v => ({ type: 'tab', settings: { title: v.heading, heading: v.heading, text: v.content_html, content: v.content_html } }));
    if (/cv-guarantee/.test(type)) {
        const f = facts.find(f => /garant|guarantee/i.test(f.label));
        if (f) {
            set('heading', f.label);
            set('text', paragraph(f.value));
        }
    }
    if (type === 'rich-text' && !['guide', 'editorial', 'showcase'].includes(pageRole))
        blocks = [{ type: 'heading', settings: { text: genuine(headline) ? headline : name } }, { type: 'text', settings: { text: genuine(body) ? paragraph(body) : '' } }];
    if (type === 'image-with-text') {
        set('heading', values[occurrence % Math.max(1, values.length)]?.title ?? copy.about.heading);
        set('text', paragraph(values[occurrence % Math.max(1, values.length)]?.text ?? copy.about.intro));
    }
    if (type === 'marquee') {
        set('items', copy.marquee.filter(genuine).join('\n'));
        blocks = [];
    }
    if (/cv-hotspots/.test(type)) {
        blocks = [];
        missing.push('confirmed_hotspot_positions');
    }
    const evidence = evidenceNeeded(type, p, copy);
    if (evidence)
        missing.push(evidence);
    // Every textual schema default is explicitly overridden. Demo/preset phrases cannot reappear at compile time.
    for (const def of schema.settings)
        if (def.id && !['select', 'color', 'color_background', 'font_picker', 'range', 'checkbox', 'number', 'color_scheme'].includes(def.type) && out[def.id] === undefined)
            out[def.id] = '';
    out = Object.fromEntries(Object.entries(out).filter(([k]) => schema.settings.some(x => x.id === k)));
    const safe = blocks.filter(b => schema.blocks.some(d => d.type === b.type)).map(b => {
        const defs = schema.blocks.find(d => d.type === b.type)!.settings ?? [];
        const values = { ...b.settings };
        for (const d of defs)
            if (d.id && ['text', 'textarea', 'richtext', 'inline_richtext', 'url', 'html'].includes(d.type) && values[d.id] === undefined)
                values[d.id] = '';
        return { ...b, settings: Object.fromEntries(Object.entries(values).filter(([k]) => defs.some(d => d.id === k))) };
    });
    if (blocks.length && !safe.length)
        missing.push('section_content_mapping');
    if (/faq|steps|timeline|how-to|cards|ingredients|tabs|features-grid/.test(type) && !safe.length)
        missing.push('section_content_missing');
    return { section: { type, settings: out, blocks: Object.fromEntries(safe.map((b, i) => ['client_' + i, b])), block_order: safe.map((_, i) => 'client_' + i) }, missing };
}
