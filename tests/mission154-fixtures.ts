import {acquiredChoicesForTest,chooseAngleForTest} from "./strategy-choice-fixture";
import { prepareStrategyChange, activateStrategy } from "@/lib/marketing-strategy";
/** Isolated client fixtures. All images are explicitly simulated client inputs, never real supplier output. */
import sharp from 'sharp';
import { createUser } from '@/lib/auth';
import { id, now, run } from '@/lib/db';
import { emptyProduct, emptyServiceProfile } from '@/lib/project-types';
import { saveProduct, saveBrand, saveServices, saveSettings, remember, loadProject } from '@/lib/projects';
import { localBrand } from '@/lib/engine/local';
import { localCopy } from '@/lib/engine/local-copy';
import { saveAsset } from '@/lib/library';
import { grantProjectPlan } from '@/lib/project-subscriptions';
import type { PlanId } from '@/lib/plans';
import type { MediaRole } from '@/lib/theme/client-media';
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export async function clientPhoto(role: MediaRole, index: number, service = false) {
    const w = role === 'packshot' || role === 'detail' ? 1000 : 1440, h = role === 'packshot' || role === 'detail' ? 1000 : 960;
    const hue = 180 + index * 9;
    const detail = role === 'detail';
    const offset = detail ? -95 : 0;
    const subject = service ? `<rect x="180" y="480" width="1010" height="44" rx="10" fill="#aa7953"/><rect x="250" y="524" width="28" height="300" fill="#604935"/><rect x="1080" y="524" width="28" height="300" fill="#604935"/><circle cx="730" cy="470" r="80" fill="#d7bb9b"/><ellipse cx="730" cy="449" rx="54" ry="17" fill="#86634d"/><path d="M460 490 Q450 360 500 310 L540 310 Q570 400 560 490Z" fill="#59898a"/><rect x="920" y="380" width="20" height="120" rx="10" fill="#4b3730"/><path d="M910 370 L950 370 L943 320 L918 320Z" fill="#846349"/>` : `<g transform="translate(${offset} ${detail ? -30 : 0}) ${detail ? 'scale(1.24)' : ''}"><ellipse cx="710" cy="756" rx="242" ry="34" fill="#000" opacity=".12"/><path d="M450 470 Q430 330 540 330 Q590 340 585 450" fill="none" stroke="#385f66" stroke-width="42"/><path d="M840 440 Q945 455 1010 365 L1035 390 Q1000 545 850 560" fill="url(#ceramic)"/><path d="M550 360 Q525 480 545 620 Q565 712 715 718 Q855 714 880 620 Q900 480 860 360Z" fill="url(#ceramic)"/><ellipse cx="707" cy="360" rx="160" ry="45" fill="#789a9b"/><ellipse cx="707" cy="360" rx="130" ry="26" fill="#28515b"/><ellipse cx="707" cy="350" rx="147" ry="25" fill="#75999b"/><circle cx="707" cy="318" r="25" fill="#466f76"/><path d="M590 435 Q565 510 590 610" fill="none" stroke="#fff" stroke-width="15" opacity=".18"/></g>`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 1440 960" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="room" x2="1" y2="1"><stop stop-color="hsl(${hue},18%,90%)"/><stop offset="1" stop-color="#c6b49e"/></linearGradient><linearGradient id="ceramic"><stop stop-color="#28515b"/><stop offset=".48" stop-color="#648b90"/><stop offset="1" stop-color="#254c56"/></linearGradient><radialGradient id="light"><stop stop-color="#fff9de" stop-opacity=".7"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><rect width="1440" height="960" fill="url(#room)"/><circle cx="${240 + index * 20}" cy="180" r="600" fill="url(#light)"/>${role === 'use' || role === 'opening' ? `<path d="M80 0V580 M195 0V580 M310 0V580 M0 185H410 M0 370H410" stroke="#fff" stroke-width="9" opacity=".55"/><rect y="650" width="1440" height="310" fill="#c0a78e"/><path d="M1100 660 Q1050 300 1200 120 M1090 520 Q1320 300 1360 250" stroke="#5e7463" stroke-width="15" fill="none"/><ellipse cx="1195" cy="200" rx="55" ry="100" fill="#718570"/><ellipse cx="1240" cy="370" rx="94" ry="35" fill="#8d9b7f"/>` : ''}${subject}${role === 'use' ? '<ellipse cx="1080" cy="750" rx="70" ry="20" fill="#f4eee5"/><path d="M1020 690 Q1020 760 1080 760 Q1140 760 1140 690" fill="#ebe1d5"/><ellipse cx="1080" cy="690" rx="60" ry="15" fill="#6d4228"/>' : ''}</svg>`;
    return sharp(Buffer.from(svg)).jpeg({ quality: 88 }).toBuffer();
}
export async function clientFixture(options: {
    plan?: PlanId;
    copySource?: "user" | "ai";
    strategy?: import("@/lib/marketing-strategy/types").AngleId | null;
    services?: boolean;
    incomplete?: boolean;
    catalog?: boolean;
    brand?: string;
} = {}) {
    const user = await createUser(`client154-${id()}@example.test`, 'fictitious-client-154', 'Réception fictive');
    run("UPDATE users SET role='client' WHERE id=?", user.id);
    const pid = id(), at = now(), services = !!options.services;
    run('INSERT INTO projects(id,user_id,name,business_type,store_type,created_at,updated_at) VALUES(?,?,?,?,?,?,?)', pid, user.id, 'Réception client isolée', services ? 'services' : 'products', 'mono', at, at);
    const brandName = options.brand ?? (services ? 'Terre & Geste' : 'Céramor');
    const product = { ...emptyProduct(), name: services ? 'Atelier de tournage individuel' : 'Théière Anse', nameStatus: 'provided' as const, category: services ? 'Cours de céramique' : 'Art de la table', sector: services ? 'artisanat' as const : 'maison' as const, summary: services ? 'Un atelier individuel sur rendez-vous pour découvrir le tournage et travailler une pièce avec un accompagnement pas à pas.' : 'Une théière en grès émaillé bleu ardoise, avec une anse arrondie et un couvercle amovible, pour partager le thé autour de la table.', price: { amount: services ? null : 6800, currency: 'EUR', status: services ? 'unknown' as const : 'confirmed' as const }, facts: (services ? [] : [['Matière', 'Grès émaillé'], ['Contenance', '700 ml'], ['Finition', 'Bleu ardoise satiné'], ['Anse', 'Anse arrondie'], ['Couvercle', 'Amovible'], ['Entretien', 'Laver à la main avec une éponge douce'], ['Garantie', '12 mois selon les conditions fournies pour cet exemple fictif'], ['Livraison', 'Livraison en France métropolitaine selon les conditions du projet fictif']]).map(([label, value]) => ({ key: id(), label, value, status: 'confirmed' as const, source: 'user' as const })) };
    saveProduct(pid, product);
    const profile = { ...emptyServiceProfile(), services: [{ key: 'cours-individuel', name: 'Atelier de tournage individuel', description: product.summary, price: '75 €', duration: '1 h 30' }, { key: 'email', name: 'Découverte des émaux', description: 'Choisir une palette et découvrir l’application des émaux sur une pièce préparée.', price: '45 €', duration: '1 h' }], contactMode: 'booking' as const, contactModes: ['booking' as const, 'form' as const], bookingUrl: '/pages/contact', area: 'Quartier des Ateliers, Lyon — exemple fictif', email: 'atelier@example.test', phone: '', hours: 'Sur rendez-vous' };
    if (services)
        saveServices(pid, profile);
    const local = localBrand(product, brandName, { business: services ? 'services' : 'products', services: profile });
    const brand = { ...local.brand, name: brandName, validated: ['palette', 'fonts'], direction: services ? 'rive' as const : options.catalog ? 'orbe' as const : 'fraise' as const, tagline: services ? 'De la terre au geste juste.' : 'Le thé prend son temps.', story: services ? 'L’atelier accompagne chaque étape du tournage, de la préparation de la terre à la forme qui prend place sur le tour.' : `${brandName} dessine des objets pour le temps partagé autour de la table. La théière Anse associe une silhouette arrondie à un émail bleu ardoise.`, positioning: services ? product.summary : 'Une théière à poser au centre de la table, pensée autour du service du thé et du plaisir de l’objet.', palette: { primary: '#325d67', secondary: '#c7b59b', accent: '#99552c', light: '#f4f1e8', dark: '#142f38' }, fonts: { heading: 'cormorant_n5', body: 'dm_sans_n4' }, values: [{ title: services ? 'Un accompagnement individuel' : 'Une silhouette accueillante', text: services ? 'Chaque atelier reçoit une seule personne, sur rendez-vous.' : 'L’anse arrondie et le couvercle composent un volume simple à retrouver sur la table.' }, { title: 'Le sens du détail', text: services ? 'La préparation, le centrage et le geste se travaillent dans cet ordre.' : 'L’émail bleu ardoise et la forme de l’anse sont présentés dans les vues détaillées.' }] };
    saveBrand(pid, brand);
    saveStrategyIfNeeded();
    function saveStrategyIfNeeded() { }
    saveSettings(pid, { ...loadProject(pid).settings, storeKind: services ? 'services' : options.catalog ? 'catalog' : 'specialty' });
    const copy = localCopy(product, brand, loadProject(pid));
    Object.assign(copy.hero, { eyebrow: brandName, heading: brand.tagline, line1: brand.tagline, line2: '', text: product.summary, cta: services ? 'Prendre rendez-vous' : 'Découvrir Anse' });
    copy.statement = { eyebrow: brandName, heading: services ? 'Un atelier, un geste à la fois.' : 'Une place au centre de la table.', text: brand.positioning };
    copy.detail = { eyebrow: 'Les détails', heading: services ? 'Approcher la terre et le tour' : 'L’anse, le couvercle et l’émail', text: services ? profile.services[0].description : 'Découvrez les différentes vues d’Anse : une silhouette arrondie, un émail bleu ardoise et un couvercle amovible.' };
    copy.features = { heading: services ? 'Un atelier à votre rythme' : 'Les détails d’Anse', items: brand.values.concat([{ title: services ? 'Sur rendez-vous' : '700 ml', text: services ? 'Le créneau est choisi avant l’atelier.' : 'La contenance confirmée de la théière.' }]).map(v => ({ ...v, icon: 'check' as const })) };
    copy.story = { heading: services ? 'Le déroulé de votre atelier' : 'Préparer et servir le thé', steps: services ? [{ title: 'Préparer la terre', text: 'La séance commence par la préparation de la terre.' }, { title: 'Centrer sur le tour', text: 'Le centrage se travaille avec l’accompagnement de l’atelier.' }, { title: 'Travailler la forme', text: 'La forme est travaillée progressivement sur le tour.' }] : [{ title: 'Préparer la théière', text: 'Retirer le couvercle amovible pour préparer le thé.' }, { title: 'Partager le moment', text: 'Poser Anse sur la table pour servir le thé.' }, { title: 'Nettoyer après usage', text: 'Laver à la main avec une éponge douce.' }] };
    copy.product = { ...copy.product, title: product.name, short: product.summary, description_html: `<p>${esc(product.summary)}</p><p>${esc(brand.story)}</p>`, highlights: product.facts.slice(0, 5).map(f => `${f.label} : ${f.value}`), tabs: [{ heading: 'Présentation', content_html: `<p>${esc(product.summary)}</p>` }, { heading: services ? 'Organisation' : 'Matière et contenance', content_html: services ? '<p>Atelier individuel sur rendez-vous, durée 1 h 30.</p>' : '<p>Grès émaillé bleu ardoise. Contenance 700 ml.</p>' }] };
    copy.about = { heading: brandName, intro: brand.story, blocks: [{ heading: 'Notre approche', text: brand.positioning }], values: brand.values };
    copy.faq = { heading: 'Vos questions', items: services ? [{ q: 'Comment réserver ?', a: 'Choisissez un créneau par la prise de rendez-vous.' }, { q: 'Quelle est la durée ?', a: 'L’atelier de tournage individuel dure 1 h 30.' }, { q: 'Quel est le tarif ?', a: 'L’atelier individuel est proposé à 75 € dans ce projet fictif.' }] : [{ q: 'Quelle est la contenance ?', a: 'La contenance confirmée est de 700 ml.' }, { q: 'Comment nettoyer Anse ?', a: 'Laver à la main avec une éponge douce.' }, { q: 'Le couvercle est-il amovible ?', a: 'Oui, le couvercle est amovible.' }, { q: 'Quelle finition est présentée ?', a: 'La finition présentée est bleu ardoise satiné.' }] };
    copy.gallery = { heading: services ? 'Le lieu et les gestes' : 'Anse au fil des moments', captions: [] };
    copy.cta = { heading: services ? 'Votre première rencontre avec le tour' : 'Retrouvez Anse sur votre table', text: services ? 'Choisissez votre atelier et prenez rendez-vous.' : 'Choisissez la théière Anse et consultez ses détails avant de commander.', button: services ? 'Prendre rendez-vous' : 'Découvrir Anse' };
    copy.contact = { heading: 'Parlons de votre projet', text: services ? 'Écrivez à l’atelier pour préparer votre rendez-vous.' : `Écrivez à ${brandName} pour toute question sur Anse.` };
    copy.footer = { about: brand.story, newsletter: 'Recevoir les nouvelles de la marque.' };
    copy.newsletter = { heading: 'Au fil de nos nouvelles', text: 'Recevoir les nouvelles de la marque par e-mail.' };
    copy.shipping = { heading: 'Livraison et retours', body_html: '<p>Les conditions de livraison de ce projet fictif sont à vérifier avant une utilisation réelle.</p>' };
    copy.marquee = brand.values.map(v => v.title);
    remember(pid, { kind: 'artifact', key: 'shop_copy', value: JSON.stringify(copy), source: options.copySource??'user' });
    const assets = [];
    const roles: MediaRole[] = options.incomplete ? ['packshot'] : ['packshot', 'packshot', 'detail', 'detail', 'detail', 'opening', 'use', 'use', 'use', 'use', 'use', 'use', 'use', 'use', 'method', 'method', 'method', ...(services ? ['realization' as const, 'realization' as const] : [])];
    for (const [i, role] of roles.entries()) {
        const description = role === 'packshot' ? 'Théière Anse entière, émail bleu ardoise et couvercle amovible' : role === 'detail' ? ['Le couvercle amovible et sa prise arrondie', 'L’anse arrondie en grès émaillé', 'L’émail bleu ardoise, vu de près'][i % 3] : services ? ['Le tour et la terre dans l’atelier', 'La table de préparation de l’atelier', 'Le tour avant la séance individuelle'][i % 3] : ['La théière Anse sur la table, à côté d’une tasse', 'Anse dans la lumière du matin', 'La théière Anse au centre de la table'][i % 3];
        assets.push(await saveAsset({ projectId: pid, userId: user.id, data: await clientPhoto(role, i, services), name: `input-${role}-${i}.jpg`, mime: 'image/jpeg', role: role === 'opening' ? 'banner' : role === 'use' || role === 'realization' || role === 'method' ? 'lifestyle' : role, origin: 'upload', status: 'approved', meta: { simulation: true, provenance: 'Simulated client input for isolated mission154 acceptance; not supplier output', authenticWork: services && role === 'realization', themeContent: { role, description, reviewed: true, subject: services ? '' : 'product:main' } } }));
    }
    const logo = await saveAsset({ projectId: pid, userId: user.id, data: await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="120"><path d="M20 30 Q65 0 105 30 L100 90 Q60 110 25 90Z" fill="#325d67"/><text x="135" y="82" font-size="62" font-family="serif" fill="#142f38">${esc(brandName)}</text></svg>`)).png().toBuffer(), name: 'identite-projet.png', mime: 'image/png', origin: 'upload', role: 'logo', status: 'approved', meta: { simulation: true } });
    saveBrand(pid, { ...brand, logo: { ...brand.logo, assetId: logo.id, status: 'provided' } } as never);
    const subscription = grantProjectPlan(pid, options.plan ?? 'dominer');
    acquiredChoicesForTest(pid);
    if(options.strategy!==null)chooseAngleForTest(pid,options.strategy??'generalist');
    return { user: { ...user, role: 'client' as const }, pid, brand: brandName, copy, assets, subscription, project: loadProject(pid) };
}
