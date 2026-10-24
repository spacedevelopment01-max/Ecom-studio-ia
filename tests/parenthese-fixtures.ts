/**
 * Démonstration PARENTHÈSE : cabinet de sophrologie fictif de la famille Services, composé par le vrai moteur dans le
 * thème « parenthese » puis rédigé d'après les six planches de Thomas (docs/theme-briefs/parenthese/maquettes, branche
 * brief/parenthese-20261024). Les 42 photographies du kit (recréées à partir des maquettes, sans personne) sont
 * converties en WebP dans public/theme-assets/parenthese/ et importées comme les photos d'un client, étiquetées
 * démonstration.
 *
 * Rien d'inventé comme fait réel : tarifs (60 € / 60 minutes, 20 € / 75 minutes), dates d'ateliers, places et
 * disponibilités sont des exemples annoncés comme tels ; coordonnées, horaires affichés, parcours de formation et
 * mentions légales restent « [À renseigner] » ou « [À compléter : …] » ; aucune personne, aucun diplôme, aucun avis,
 * aucune promesse de résultat ; la sophrologie est présentée comme une pratique de bien-être qui ne remplace pas un suivi
 * médical. Coquilles et artefacts des planches corrigés ; arbitrages : logo, en-tête et pied de la planche 02 pour toutes
 * les pages, références de démonstration « P-0001 », confidentialité formulée sans garantie absolue, date d'article omise.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { run, now } from "../src/lib/db";
import { emptyProduct, emptyServiceProfile } from "../src/lib/project-types";
import { localBrand } from "../src/lib/engine/local";
import { composeShop } from "../src/lib/engine/shop";
import { loadProject, saveBrand, saveProduct, saveServices, saveStrategy, saveSettings } from "../src/lib/projects";
import { saveAsset } from "../src/lib/library";
import { seedHoldout } from "./lot1-holdout-fixtures";
import { sectionSchema, withDefaults, type SectionInstance, type TemplateJson, type ThemeSpec } from "../src/lib/theme/spec";
import { PA_PAGES, paUrl, cabinetBlocks, cabinetSettings, footerSettings, type PaPageHandle } from "../src/lib/theme/parenthese";

export const PA_KIT_DIR = path.join(process.cwd(), "public", "theme-assets", "parenthese");
export const PA_PROVENANCE = "Kit PARENTHÈSE de Thomas (42 photographies recréées à partir des six maquettes, sans personne), converties en WebP";
export const PA_DEMO_NOTE = "Tarifs et disponibilités de démonstration.";

/** Les 42 photos du kit (INVENTAIRE_IMAGES.csv), avec un texte alternatif descriptif. */
export const PA_MEDIA: { file: string; alt: string }[] = [
  ["01-accueil-salon", "Salon lumineux : deux fauteuils clairs, table basse ronde et baie vitrée sur le jardin"], ["02-pause-carnet", "Carnet ouvert et vase sur une table en bois"], ["03-stress-tasse", "Tasse en céramique et carnet près d'une plante"], ["04-preparer-carnet", "Carnet et stylo dans la lumière du matin"],
  ["05-vase-livres", "Vase de branches d'olivier et livres posés sur une table"], ["06-fauteuil-individuel", "Fauteuil clair près d'une fenêtre"], ["07-atelier-coussins", "Coussins de méditation posés au sol dans une salle claire"], ["08-cabinet-panorama", "Cabinet : fauteuils, bibliothèque et plantes"],
  ["09-approche-bureau", "Bureau en bois clair, vase et carnets"], ["10-soleil-feuillage", "Soleil couchant à travers le feuillage"], ["11-fleurs-sechees", "Bouquet de fleurs séchées"], ["12-seances-fauteuil-fenetre", "Fauteuil et plante près d'une fenêtre ensoleillée"],
  ["13-cabinet-entretien", "Espace d'accueil du cabinet : deux fauteuils et une table basse"], ["14-visio-ordinateur", "Ordinateur portable, tasse et carnet sur un bureau clair"], ["15-carnet-calme", "Carnet ouvert et stylo sur une table en bois"], ["16-plante-ombres", "Plante verte et ombres de feuillage sur un mur clair"],
  ["17-visio-tasse-carnet", "Tasse, carnet et stylo près d'une fenêtre"], ["18-visio-bandeau", "Carnet et tasse sur une table baignée de lumière"], ["19-atelier-salle-vide", "Salle d'atelier lumineuse, parquet et coussins au sol"], ["20-atelier-plateau-the", "Plateau à thé et coussins sur un tapis"],
  ["21-atelier-carnet-tisane", "Carnet, théière et tasses sur un tapis"], ["22-atelier-coussin-beige", "Coussin de méditation beige près d'une fenêtre"], ["23-atelier-cercle-fauteuils", "Chaises disposées en cercle dans une salle claire"], ["24-bol-sonore", "Bol chantant posé sur une serviette"],
  ["25-entreprise-salle", "Salle de réunion lumineuse avec une grande table en bois"], ["26-entreprise-table", "Tasse et carnet sur une table de réunion"], ["27-reservation-premiere", "Fauteuil clair au coussin vert près d'une plante"], ["28-reservation-suivi", "Fauteuil arrondi, coussin vert et plaid"],
  ["29-reservation-groupe", "Coussins de sol autour d'une table basse en bois"], ["30-reservation-cabinet-vertical", "Coin du cabinet : fauteuil, plante et lumière naturelle"], ["31-journal-fleurs-carnet", "Tasse, carnet et bouquet de fleurs des champs devant une fenêtre"], ["32-journal-sentier", "Sentier ensoleillé sous les arbres"],
  ["33-journal-feuilles", "Feuillage vert dans la lumière"], ["34-journal-fauteuil-plaid", "Fauteuil, coussins et plaid tricoté"], ["35-journal-fenetre-saisons", "Fenêtre ouverte sur un jardin, carnet et tasse"], ["36-console-cabinet", "Console en bois clair, vase et livres"],
  ["37-fleurs-blanches", "Branches de fleurs blanches dans la lumière"], ["38-cabinet-accueil", "Salon d'accueil du cabinet ouvert sur le jardin"], ["39-jardin-entree", "Entrée d'une maison en pierre, olivier et lavande"], ["40-faq-carnet-tasse", "Carnet, tasse et vase sur une table ronde"],
  ["41-rendezvous-olivier", "Vase de branches d'olivier près d'une fenêtre"], ["42-rendezvous-fauteuil-abricot", "Fauteuil au coussin abricot près d'une table ronde"],
].map(([file, alt]) => ({ file, alt }));
/** Partie 1 du ZIP arrivée tronquée (images 05 à 11) : photo du même kit en attendant, signalée dans la livraison. */
export const PA_STANDINS: Record<string, string> = {
  "05-vase-livres": "41-rendezvous-olivier", "06-fauteuil-individuel": "27-reservation-premiere", "07-atelier-coussins": "29-reservation-groupe", "08-cabinet-panorama": "38-cabinet-accueil",
  "09-approche-bureau": "36-console-cabinet", "10-soleil-feuillage": "32-journal-sentier", "11-fleurs-sechees": "37-fleurs-blanches",
};

/** Séances et ateliers d'exemple (source unique des réglages ; exemples annoncés, jamais des engagements). */
export const PA_SEANCES = [
  { id: "premiere", name: "Première séance", short: "Faire connaissance et définir vos besoins en toute sérénité.", duration: 60, price: 60, modes: "cabinet, visio", image: "27-reservation-premiere" },
  { id: "suivi", name: "Séance de suivi", short: "Un temps pour approfondir et avancer à votre rythme.", duration: 60, price: 60, modes: "cabinet, visio", image: "28-reservation-suivi" },
];
export const PA_ATELIERS = [
  { id: "pause-semaine", title: "Une pause dans la semaine", page: "atelier-une-pause-dans-la-semaine" as PaPageHandle, tags: "Relaxation, Respiration, Bien-être au quotidien", theme: "relaxation", themeLabel: "Relaxation", date: "2026-11-14", time: "10:00", duration: 75, price: 20, capacity: 12, booked: 4, image: "20-atelier-plateau-the",
    text: "Un atelier pour relâcher les tensions, apaiser le mental et retrouver de l'énergie. Des pratiques simples et accessibles à intégrer dans la vie quotidienne." },
  { id: "decouvrir-relaxation", title: "Découvrir la relaxation", page: "atelier-decouvrir-la-relaxation" as PaPageHandle, tags: "Initiation, Détente, Équilibre", theme: "initiation", themeLabel: "Initiation", date: "2026-11-21", time: "10:00", duration: 75, price: 20, capacity: 12, booked: 5, image: "21-atelier-carnet-tisane",
    text: "Une découverte de la sophrologie à travers des exercices simples de respiration, de visualisation et de relaxation dynamique. Idéal pour une première approche." },
  { id: "moment-ralentir", title: "Un moment pour ralentir", page: "atelier-un-moment-pour-ralentir" as PaPageHandle, tags: "Lâcher-prise, Pleine conscience, Ressources", theme: "lacher-prise", themeLabel: "Lâcher-prise", date: "2026-11-28", time: "10:00", duration: 75, price: 20, capacity: 12, booked: 9, image: "22-atelier-coussin-beige",
    text: "Un temps pour se déconnecter du rythme quotidien, se recentrer sur l'instant présent et cultiver un mieux-être durable." },
];
/** Horaires de démonstration des séances (le calendrier en a besoin) ; affichés « [À confirmer] » sur le site. */
export const PA_HOURS = { mon: "09:00-12:00, 14:00-17:00", tue: "09:00-12:00, 14:00-17:00", wed: "09:00-12:00, 14:00-17:00", thu: "09:00-12:00, 14:00-17:00", fri: "09:00-12:00, 14:00-17:00", sat: "09:00-12:00", sun: "" };
const PLACE = "Cabinet de démonstration – [À renseigner]";

const priceLabel = (n: number) => `${n} €`;
const longDur = (m: number) => `${m} minutes`;
const shortDur = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${String(m % 60).padStart(2, "0")}` : ""}`);
const bothDur = (m: number) => `${Math.floor(m / 60)}h${m % 60 ? String(m % 60).padStart(2, "0") : ""} (${m} min)`;
const DAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const ABBR = ["Dim.", "Lun.", "Mar.", "Mer.", "Jeu.", "Ven.", "Sam."];
const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const whenOf = (date: string, time: string, abbr = false) => { const d = new Date(`${date}T00:00:00Z`); return `${(abbr ? ABBR : DAYS)[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}\nà ${time.replace(":", "h")}`; };

/** Projet de démonstration : composé par le moteur dans le thème Parenthèse puis rédigé d'après les planches. */
export async function parentheseProject(userId: string) {
  const pid = seedHoldout(userId, 2, "Démo PARENTHÈSE");
  const product = { ...emptyProduct(), name: "Parenthèse", nameStatus: "provided" as const, category: "Cabinet de sophrologie (exemple fictif)", sector: "services" as never, summary: "Cabinet de sophrologie fictif de démonstration : séances individuelles, ateliers collectifs, interventions en entreprise." };
  saveProduct(pid, product);
  const services = { ...emptyServiceProfile(), services: PA_SEANCES.map((s) => ({ key: s.id, name: s.name, description: s.short, price: priceLabel(s.price), duration: shortDur(s.duration) })), contactMode: "booking" as const };
  const local = localBrand(product, "Parenthèse", { business: "services", services });
  saveBrand(pid, { ...local.brand, name: "Parenthèse", generatedBy: "local" as const, tagline: "Un temps pour souffler. Une place pour vous.", story: "Un cabinet de sophrologie fictif pour faire une pause, relâcher les tensions et cultiver un mieux-être au quotidien.", positioning: "Cabinet de sophrologie calme et lumineux (exemple fictif).", palette: { primary: "#22362B", secondary: "#DCDFCD", accent: "#F2C9A9", light: "#F8F3EB", dark: "#1A241D" } } as never);
  saveStrategy(pid, local.strategy);
  saveServices(pid, services);
  run("UPDATE projects SET store_type = ?, business_type = ?, updated_at = ? WHERE id = ?", "mono", "services", now(), pid);
  saveSettings(pid, { ...loadProject(pid).settings, storeKind: "services" });

  const missing: string[] = [];
  const ids: Record<string, string> = {};
  for (const m of PA_MEDIA) {
    const source = path.join(PA_KIT_DIR, `${m.file}.webp`);
    if (!fs.existsSync(source) || fs.statSync(source).size === 0) { missing.push(`${m.file}.webp`); continue; }
    const bytes = fs.readFileSync(source), meta = await sharp(bytes).metadata();
    const a = await saveAsset({ projectId: pid, userId, data: bytes, mime: "image/webp", name: `parenthese-${m.file}.webp`, origin: "upload", role: "lifestyle", status: "approved", meta: { demo: { isDemo: true, provenance: PA_PROVENANCE }, width: meta.width, height: meta.height, alt: m.alt } });
    ids[m.file] = a.id;
  }
  const built = await composeShop(pid, "parenthese" as never, null, false);
  const spec: ThemeSpec = built.spec;
  const catalogOrder = spec.templates.index.order.map((k) => spec.templates.index.sections[k].type);
  curateParenthese(spec, ids);
  return { pid, spec, missing, catalogOrder, project: loadProject(pid) };
}

export function curateParenthese(spec: ThemeSpec, ids: Record<string, string>) {
  const file = (name: string): string => (ids[name] ? `parenthese-${name}.webp` : PA_STANDINS[name] && ids[PA_STANDINS[name]] ? `parenthese-${PA_STANDINS[name]}.webp` : "");
  for (const [name, aid] of Object.entries(ids)) spec.files[`parenthese-${name}.webp`] = aid;
  const S = (type: string, settings: Record<string, unknown>, blocks: { type: string; settings: Record<string, unknown> }[] = []): SectionInstance => {
    const schema = sectionSchema(spec, type);
    if (!schema) throw new Error(`Section absente ${type}`);
    return { type, settings: withDefaults(schema.settings, settings), blocks: Object.fromEntries(blocks.map((b, i) => [`${b.type}-${i + 1}`, { type: b.type, settings: withDefaults(schema.blocks.find((x) => x.type === b.type)?.settings, b.settings) }])), block_order: blocks.map((b, i) => `${b.type}-${i + 1}`) };
  };
  const tpl = (rows: SectionInstance[]): TemplateJson => {
    const out: TemplateJson = { sections: {}, order: [] };
    const n: Record<string, number> = {};
    for (const r of rows) { n[r.type] = (n[r.type] ?? 0) + 1; const id = `${r.type}-${n[r.type]}`; out.sections[id] = r; out.order.push(id); }
    return out;
  };
  const p = (...lines: string[]) => lines.map((l) => `<p>${l}</p>`).join("");
  const q = (question: string, answer: string) => ({ type: "question", settings: { question, answer: p(answer) } });
  const U = (h: PaPageHandle) => paUrl(h);
  const BOOK = U("prendre-rendez-vous");
  const at = (id: string) => PA_ATELIERS.find((a) => a.id === id)!;

  // ─── En-tête, réglages du cabinet (source unique), pied de la planche 02
  spec.name = "PARENTHÈSE — thème Parenthèse (démonstration)";
  spec.meta = { ...spec.meta, demo: { isDemo: true, provenance: PA_PROVENANCE, contactTest: false } };
  spec.store.shopName = "Parenthèse";
  spec.store.business = "services";
  spec.store.policies = [];
  const header = spec.groups.header;
  header.order = header.order.filter((id) => header.sections[id]?.type !== "announcement-bar");
  for (const id of Object.keys(header.sections)) if (!header.order.includes(id)) delete header.sections[id];
  const headerId = header.order.find((id) => header.sections[id].type === "header")!;
  Object.assign(header.sections[headerId].settings, { cta_label: "Prendre rendez-vous", cta_link: BOOK, cta_icon: "arrow", phone: "", show_search: false, show_cart: false, layout: "logo-left", mobile_menu: "drawer", transparent_on_home: false, sticky: true });
  const blocks = cabinetBlocks(
    PA_SEANCES.map((s) => ({ id: s.id, name: s.name, short: s.short, duration: s.duration, price: s.price, modes: s.modes, page: s.id === "premiere" ? U("premiere-seance") : U("seances"), image: file(s.image) })),
    PA_ATELIERS.map((a) => ({ id: a.id, title: a.title, short: a.text, tags: a.tags, theme: a.theme, date: a.date, time: a.time, duration: a.duration, price: a.price, capacity: a.capacity, booked: a.booked, place: PLACE, page: U(a.page), image: file(a.image) })),
  );
  header.sections["pa-cabinet"] = S("pa-cabinet", { ...cabinetSettings("fr", { address: "", tagline: "Sophrologie & bien-être", bookingLabel: "Prendre rendez-vous", bookingLink: BOOK, cookiesLink: U("cookies"), hours: PA_HOURS, demoNote: PA_DEMO_NOTE }), closures: "2026-12-24..2026-12-26, 2026-12-31, 2027-01-01" }, blocks);
  if (!header.order.includes("pa-cabinet")) header.order.unshift("pa-cabinet");
  const footer = spec.groups.footer;
  for (const id of footer.order) if (footer.sections[id]?.type === "footer") footer.sections[id].disabled = true;
  footer.sections["pa-footer"] = S("pa-footer", footerSettings("fr", { address: "", email: "", phone: "", note: "Cabinet de démonstration. Tous droits réservés.", tagline: "Sophrologie & bien-être" }));
  if (!footer.order.includes("pa-footer")) footer.order.push("pa-footer");
  spec.settings = { ...spec.settings, logo_asset: "", favicon_asset: "", fab_contact_link: "", fab_back_to_top: false, social_instagram: "", social_facebook: "", social_pinterest: "", social_tiktok: "", social_youtube: "", type_heading_font: "playfair_display_n4", type_body_font: "dm_sans_n4" };

  const homeFaq = [
    q("À qui s'adressent les séances de sophrologie ?", "Aux adultes qui souhaitent prendre un temps pour eux, apprendre à se détendre ou se préparer à un moment important. [À compléter : autres publics accueillis par le cabinet]"),
    q("Comment se déroule une séance ?", "Un temps d'échange, des exercices guidés de respiration, de détente et de visualisation, puis un retour sur ce que vous avez ressenti. Une séance dure environ une heure."),
    q("Quelle est la différence entre une séance individuelle et un atelier ?", "La séance individuelle est construite autour de vos besoins, au cabinet ou en visioconférence. L'atelier réunit un petit groupe autour d'un thème, au cabinet, pour pratiquer ensemble des exercices simples."),
    q("La sophrologie se substitue-t-elle à un suivi médical ?", "Non. La sophrologie est une pratique de bien-être et de relaxation : elle ne remplace ni un diagnostic, ni un traitement, ni un suivi médical. En cas de question sur votre santé, consultez un professionnel de santé."),
  ];

  // ─── Accueil (planche 02)
  spec.templates.index = tpl([
    S("pa-hero", { layout: "home", heading: "Un temps\npour souffler.\nUne place pour vous.", text: p("La sophrologie vous invite à faire une pause,<br>à relâcher les tensions et à cultiver un mieux-être<br>dans votre quotidien."), image_asset: file("01-accueil-salon"), image_position: "55% 55%", image_position_mobile: "62% 50%", curve: true, side_words: "Inspirer\nSe reconnecter\nAvancer\nAu quotidien", button_label: "Découvrir les séances", button_link: U("seances"), button2_label: "Prendre rendez-vous", button2_link: BOOK, button2_style: "ghost", height: 460, height_mobile: 560 }),
    S("pa-needs", {}, [
      { type: "need", settings: { image_asset: file("02-pause-carnet"), image_position: "50% 60%", image_alt: "", title: "Faire une pause", text: "S'offrir un temps pour soi, se recentrer et retrouver de l'énergie.", link: U("ateliers") } },
      { type: "need", settings: { image_asset: file("03-stress-tasse"), image_position: "50% 55%", image_alt: "", title: "Apprivoiser le stress\ndu quotidien", text: "Mieux accueillir les émotions et retrouver plus de sérénité.", link: U("seances") } },
      { type: "need", settings: { image_asset: file("04-preparer-carnet"), image_position: "50% 55%", image_alt: "", title: "Se préparer à un\nmoment important", text: "Aborder un changement, un examen ou un projet avec plus de confiance.", link: U("premiere-seance") } },
    ]),
    S("pa-intro", { heading: "La sophrologie,\nsimplement.", text: p("Une méthode douce qui associe des exercices de respiration, de relaxation et de visualisation positive pour vous aider à mieux vivre votre quotidien."), button_label: "En savoir plus sur mon approche", button_link: U("mon-approche"), image_asset: file("05-vase-livres"), image_position: "45% 55%", image_alt: "", panel_text: "Prendre conscience de ses ressources, se recentrer et avancer avec plus de sérénité.", panel_note: "La sophrologie est une approche de bien-être et de développement personnel. Elle ne se substitue pas à un suivi médical." }),
    S("pa-offers", { demo_note: PA_DEMO_NOTE }, [
      { type: "offer", settings: { kind: "seance", ref_id: "premiere", image_asset: file("06-fauteuil-individuel"), image_position: "50% 50%", title: "Séance individuelle", text: "Un accompagnement personnalisé\ndans un cadre bienveillant.", duration: "1 h", price: "60 €", button_label: "Prendre rendez-vous", button_link: BOOK, book_kind: "seance:premiere" } },
      { type: "offer", settings: { kind: "atelier", ref_id: "pause-semaine", image_asset: file("07-atelier-coussins"), image_position: "50% 60%", title: "Atelier en groupe", text: "Un temps collectif pour se détendre,\npartager et explorer des outils simples.", duration: "1 h 15", price: "20 €", button_label: "Découvrir les ateliers", button_link: U("ateliers"), book_kind: "" } },
    ]),
    S("pa-band", { style: "forest", full_width: true, split: 65, image_asset: file("08-cabinet-panorama"), image_position: "50% 55%", heading: "Un cadre pour ralentir", text: p("Le cabinet Parenthèse vous accueille dans un espace calme et chaleureux, pensé pour votre confort et votre bien-être."), button_label: "Découvrir le lieu", button_link: U("le-cabinet"), button_style: "ghost" }),
    S("pa-steps", { layout: "curve", heading: "Votre premier rendez-vous", text: "Un temps d'échange pour faire connaissance et définir ensemble vos besoins." }, [
      { type: "step", settings: { title: "Échanger", text: "Nous faisons le point sur votre\nsituation et vos attentes." } },
      { type: "step", settings: { title: "Découvrir", text: "Je vous explique le déroulement\ndes séances et réponds à vos questions." } },
      { type: "step", settings: { title: "Prendre un temps pour soi", text: "Vous vivez une première expérience\nsimple de sophrologie." } },
    ]),
    S("pa-approach", { heading: "Mon approche", text: p("J'ai à cœur de vous proposer un accompagnement bienveillant et personnalisé, dans le respect de votre rythme et de vos besoins. Chaque séance est un espace d'écoute, de détente et d'exploration, pour vous aider à cultiver un mieux-être durable au quotidien."), button_label: "En savoir plus", button_link: U("mon-approche"), image_asset: file("09-approche-bureau"), image_position: "50% 60%", image_alt: "", panel_title: "Une approche basée sur :" }, [
      { type: "value", settings: { icon: "heart-hands", label: "L'écoute et la bienveillance" } },
      { type: "value", settings: { icon: "tools", label: "Des outils concrets et accessibles" } },
      { type: "value", settings: { icon: "rhythm", label: "Le respect de votre rythme" } },
      { type: "value", settings: { icon: "globe", label: "Une vision globale du bien-être" } },
    ]),
    S("pa-posts", { layout: "row", heading: "Conseils et inspirations", read_label: "Lire l'article" }, [
      { type: "post", settings: { image_asset: file("10-soleil-feuillage"), image_position: "50% 50%", category: "Quotidien", category_key: "quotidien", title: "Mieux respirer au quotidien", text: "Des clés simples pour retrouver du calme dans la journée.", link: U("conseils-mieux-respirer-au-quotidien") } },
      { type: "post", settings: { image_asset: file("15-carnet-calme"), image_position: "50% 50%", category: "La pratique", category_key: "pratique", title: "Apprivoiser ses émotions\navec douceur", text: "Des pistes pour mieux les comprendre et les accueillir.", link: U("conseils-apprivoiser-ses-emotions") } },
      { type: "post", settings: { image_asset: file("11-fleurs-sechees"), image_position: "50% 50%", category: "Quotidien", category_key: "quotidien", title: "Rituel bien-être : 5 minutes pour soi", text: "Une pause simple à intégrer dans votre quotidien.", link: U("conseils-rituel-cinq-minutes-pour-soi") } },
    ]),
    S("pa-faq", { layout: "home", heading: "Vos questions, nos réponses", text: "Une question ? Retrouvez ici les réponses aux interrogations les plus fréquentes.", button_label: "Voir toutes les questions", button_link: U("faq") }, homeFaq),
    S("pa-cta", { layout: "photo", image_asset: file("33-journal-feuilles"), image_position: "20% 50%", heading: "Et si vous vous offriez un temps pour vous ?", text: p("Prenez rendez-vous pour une séance individuelle ou découvrez les prochains ateliers."), button_label: "Prendre rendez-vous", button_link: BOOK, button_style: "apricot" }),
  ]);

  // ─── Pages
  const hero = (heading: string, image: string, extra: Record<string, unknown> = {}, blocks: { type: string; settings: Record<string, unknown> }[] = []) => S("pa-hero", { layout: "page", heading, image_asset: file(image), image_position: "50% 50%", fade: 60, height: 440, height_mobile: 280, ...extra }, blocks);
  const legal = (current: number, heading: string, body: string) => [
    hero("Transparence et confiance", "39-jardin-entree", { eyebrow: "Informations légales", text: p("Retrouvez ici les informations légales relatives au site Parenthèse."), image_position: "60% 50%", fade: 46, height: 380 }),
    S("pa-legal", { current, heading, notice_title: "Contenu à compléter avant publication.", body, tab1_link: U("mentions-legales"), tab2_link: U("confidentialite"), tab3_link: U("conditions-de-reservation"), tab4_link: U("cookies") }),
  ];
  const others = (id: string) => PA_ATELIERS.filter((a) => a.id !== id).map((a) => ({ type: "related", settings: { atelier_id: a.id, image_asset: file(a.image), image_position: "50% 50%", title: a.title, when: whenOf(a.date, a.time, true), duration: bothDur(a.duration).replace(/\s*\(.*\)$/, ""), price: priceLabel(a.price), link: U(a.page) } }));
  const atelierFaq = [
    q("Faut-il une expérience préalable ?", "Non, l'atelier est ouvert à tous, que vous découvriez la sophrologie ou que vous la pratiquiez déjà."),
    q("Que dois-je apporter ?", "Une tenue dans laquelle vous êtes à l'aise. Les tapis et les coussins sont fournis sur place."),
    q("L'atelier convient-il à tous ?", "Les exercices proposés sont doux et peuvent être adaptés. Si vous avez une question sur votre situation, parlez-en avant l'atelier ; en cas de doute sur votre santé, demandez l'avis d'un professionnel de santé."),
    q("Puis-je annuler ma réservation ?", "Oui, depuis la page « Mon rendez-vous », avec le lien reçu après la réservation. [À compléter : délai et conditions d'annulation du cabinet]"),
  ];
  const atelierPage = (id: string, o: { heroImage: string; heroPos: string; intro: string; words: string; program: [string, string][]; programImage: string }) => {
    const a = at(id);
    return [
      hero(a.title, o.heroImage, { crumb1_label: "Les ateliers", crumb1_link: U("ateliers"), crumb_current: a.title, image_position: o.heroPos, fade: 58, atelier_id: a.id, atelier_when: whenOf(a.date, a.time), atelier_duration: bothDur(a.duration), atelier_price: priceLabel(a.price), button_label: "Réserver ma place", button_link: BOOK, book_kind: `atelier:${a.id}`, height: 520 }, a.tags.split(",").map((label) => ({ type: "tag", settings: { label: label.trim() } }))),
      S("pa-split", { image_side: "right", style: "words", image_width: 30, heading: "Un atelier pour souffler", title_size: "md", text: p(o.intro), words: o.words, collapse_mobile: true }),
      S("pa-steps", { layout: "program", heading: "Le programme", text: "", image_asset: file(o.programImage), image_position: "50% 50%", image_alt: "" }, o.program.map(([title, text]) => ({ type: "step", settings: { title, text } }))),
      S("pa-atelier", { atelier_id: a.id, when: whenOf(a.date, a.time).replace("\n", " "), duration: bothDur(a.duration), price: priceLabel(a.price), place: PLACE, outfit_text: "(Tapis et coussins fournis sur place)", seats_title: "Disponibilités de démonstration", seats_fallback: `${a.capacity - a.booked} places restantes sur ${a.capacity}`, book_link: BOOK }, [...atelierFaq, ...others(a.id)]),
    ];
  };
  const tip = (title: string, text: string, image: string, side = "right") => ({ type: "tip", settings: { title, text: p(text), image_asset: file(image), image_position: "50% 50%", image_side: side } });
  const related = (...ids: PaPageHandle[]) => S("pa-posts", { layout: "related", heading: "Ces articles pourraient vous intéresser" }, ids.map((h) => POSTS[h]!));
  const POSTS: Partial<Record<PaPageHandle, { type: string; settings: Record<string, unknown> }>> = {};
  const post = (h: PaPageHandle, category: string, key: string, title: string, text: string, image: string, featured = false) => { POSTS[h] = { type: "post", settings: { image_asset: file(image), image_position: "50% 50%", category, category_key: key, title, text, link: U(h), featured } }; return POSTS[h]!; };
  const journalPosts = [
    post("conseils-faire-une-place-a-la-pause", "Quotidien", "quotidien", "Faire une place à la pause\ndans sa journée", "Et si quelques instants de calme pouvaient transformer votre quotidien ? Découvrez comment intégrer des pauses simples et accessibles dans une journée bien remplie.", "32-journal-sentier", true),
    post("conseils-des-rituels-douceur-pour-le-matin", "Quotidien", "quotidien", "Des rituels douceur\npour le matin", "Des idées simples pour bien commencer la journée et poser une intention positive.", "03-stress-tasse"),
    post("conseils-se-reconnecter-a-ses-sensations", "La pratique", "pratique", "Se reconnecter\nà ses sensations", "Prendre un moment pour soi, ici et maintenant, en toute simplicité.", "33-journal-feuilles"),
    post("conseils-un-lieu-pense-pour-votre-bien-etre", "Le cabinet", "cabinet", "Un lieu pensé\npour votre bien-être", "Découvrez l'esprit du cabinet et ce qui en fait un espace accueillant et apaisant.", "36-console-cabinet"),
    post("conseils-cultiver-la-gratitude-au-quotidien", "Quotidien", "quotidien", "Cultiver la gratitude\nau quotidien", "Quelques pistes pour porter un regard plus doux sur soi et sur la vie.", "11-fleurs-sechees"),
    post("conseils-creer-un-espace-calme-chez-soi", "La pratique", "pratique", "Créer un espace calme\nchez soi", "Des conseils pour aménager un coin de détente, même dans un petit espace.", "34-journal-fauteuil-plaid"),
    post("conseils-les-saisons-au-cabinet", "Le cabinet", "cabinet", "Les saisons au cabinet", "Un lieu vivant, au rythme de la nature et des saisons.", "35-journal-fenetre-saisons"),
  ];
  // Les trois articles présentés à l'accueil (planche 02) complètent le journal : chaque article y est listé.
  journalPosts.push(...[
  post("conseils-mieux-respirer-au-quotidien", "Quotidien", "quotidien", "Mieux respirer au quotidien", "Des clés simples pour retrouver du calme dans la journée.", "10-soleil-feuillage"),
  post("conseils-apprivoiser-ses-emotions", "La pratique", "pratique", "Apprivoiser ses émotions avec douceur", "Des pistes pour mieux les comprendre et les accueillir.", "15-carnet-calme"),
  post("conseils-rituel-cinq-minutes-pour-soi", "Quotidien", "quotidien", "Rituel bien-être : 5 minutes pour soi", "Une pause simple à intégrer dans votre quotidien.", "11-fleurs-sechees")].map((b) => structuredClone(b)));
  const article = (h: PaPageHandle, o: { category: string; title: string; reading: string; image: string; intro: string; tips: { type: string; settings: Record<string, unknown> }[]; quote: string; rel: PaPageHandle[] }) => [
    S("pa-article", { crumb1_label: "Accueil", crumb1_link: "/", crumb2_label: "Conseils", crumb2_link: U("conseils"), image_asset: file(o.image), image_position: "50% 55%", image_alt: "", category: o.category, title: o.title, date: "", reading: o.reading, intro: p(o.intro), quote: o.quote }, o.tips),
    related(...o.rel),
  ];

  const pages: Record<PaPageHandle, { seo: string; rows: SectionInstance[] }> = {
    // ─── Planche 01 : séances
    seances: { seo: "Séances individuelles de sophrologie, au cabinet ou en visioconférence.", rows: [
      hero("Les séances\nindividuelles", "12-seances-fauteuil-fenetre", { text: p("Un temps pour vous, pour souffler, vous recentrer<br>et cultiver un mieux-être au quotidien."), image_position: "55% 50%", fade: 62, curve: true, button_label: "Prendre rendez-vous", button_link: BOOK, book_kind: "seance:premiere", button2_label: "Découvrir mon approche", button2_link: U("mon-approche"), button2_style: "link", height: 420 }),
      S("pa-cards", { layout: "modes", heading: "Deux façons de vous accompagner", text: "Je vous accueille au cabinet ou en visioconférence, pour des séances individuelles\nadaptées à vos besoins et à votre quotidien." }, [
        { type: "card", settings: { image_asset: file("13-cabinet-entretien"), image_position: "50% 55%", image_alt: "", title: "Au cabinet", text: "Un espace chaleureux et apaisant, propice\nà la détente et à l'écoute.", button_label: "En savoir plus", button_link: U("le-cabinet") } },
        { type: "card", settings: { image_asset: file("14-visio-ordinateur"), image_position: "50% 55%", image_alt: "", title: "En visioconférence", text: "La même qualité d'accompagnement,\noù que vous soyez.", button_label: "En savoir plus", button_link: U("seance-en-visio") } },
      ]),
      S("pa-cards", { layout: "pricing", heading: "Les séances", text: "", demo_note: PA_DEMO_NOTE }, PA_SEANCES.map((s) => ({ type: "card", settings: { title: s.name, text: s.id === "premiere" ? "Un premier temps pour faire connaissance, échanger sur vos besoins et découvrir la sophrologie." : "Un temps pour continuer votre cheminement, approfondir la pratique et avancer à votre rythme.", seance_id: s.id, price: priceLabel(s.price), price_note: "(tarif indicatif)", duration: longDur(s.duration), button_label: "Prendre rendez-vous", button_link: BOOK, book_kind: `seance:${s.id}` } }))),
      S("pa-split", { image_side: "left", style: "plain", image_width: 40, image_asset: file("15-carnet-calme"), image_position: "50% 50%", image_alt: "", heading: "Qu'est-ce que la sophrologie ?", text: p("La sophrologie est une méthode de relaxation qui associe des exercices de respiration, de détente corporelle et de visualisation positive. Elle propose des outils pour mieux accueillir le stress, retrouver un équilibre et cultiver un mieux-être au quotidien."), button_label: "En savoir plus", button_link: U("mon-approche") }),
      S("pa-features", { layout: "plain" }, [
        { type: "feature", settings: { icon: "leaf", title: "Se recentrer", text: "Prendre du recul et retrouver\ndu calme." } },
        { type: "feature", settings: { icon: "sun", title: "Mieux vivre le quotidien", text: "Aborder les défis avec plus\nde sérénité." } },
        { type: "feature", settings: { icon: "lotus", title: "Cultiver ses ressources", text: "Renforcer la confiance et l'équilibre." } },
      ]),
      S("pa-cta", { layout: "sage", heading: "Prêt(e) à vous offrir une parenthèse ?", text: p("Je vous accueille au cabinet ou en visioconférence, selon ce qui vous convient le mieux."), button_label: "Prendre rendez-vous", button_link: BOOK, button_style: "white", book_kind: "seance:premiere" }),
    ] },
    "premiere-seance": { seo: "Votre première séance de sophrologie : durée, tarif indicatif, déroulement, informations pratiques.", rows: [
      hero("Votre première\nséance", "06-fauteuil-individuel", { crumb1_label: "Accueil", crumb1_link: "/", crumb2_label: "Les séances individuelles", crumb2_link: U("seances"), crumb_current: "Votre première séance", text: p("Un premier pas pour faire connaissance, échanger sur vos besoins et découvrir la sophrologie dans un cadre bienveillant."), quote: "Une rencontre\ndans un cadre\napaisant et confidentiel.", image_position: "40% 50%", fade: 46, seance_id: "premiere", button_label: "Réserver ma première séance", button_link: BOOK, book_kind: "seance:premiere", height: 460 }, [
        { type: "fact", settings: { icon: "euro", value: priceLabel(PA_SEANCES[0].price), detail: "Tarif indicatif", field: "price" } },
        { type: "fact", settings: { icon: "clock", value: longDur(PA_SEANCES[0].duration), detail: "Durée de la séance", field: "duration-long" } },
        { type: "fact", settings: { icon: "pin", value: "Au cabinet\nou en visioconférence", detail: "Selon votre préférence", field: "none" } },
      ]),
      S("pa-gallery", { layout: "strip", heading: "", viewer_label: "Photos du cabinet" }, [
        { type: "photo", settings: { image_asset: file("13-cabinet-entretien"), image_position: "50% 55%", alt: "Espace d'accueil du cabinet : deux fauteuils et une table basse" } },
        { type: "photo", settings: { image_asset: file("05-vase-livres"), image_position: "50% 50%", alt: "Vase de branches et livres posés sur une table" } },
        { type: "photo", settings: { image_asset: file("02-pause-carnet"), image_position: "60% 50%", alt: "Carnet ouvert sur une table en bois" } },
        { type: "photo", settings: { image_asset: file("35-journal-fenetre-saisons"), image_position: "30% 50%", alt: "Fenêtre ouverte sur un jardin" } },
      ]),
      S("pa-steps", { layout: "line", heading: "Le déroulement de la séance", text: "Chaque séance est un temps d'écoute et de pratique, adapté à vos besoins et à votre rythme." }, [
        { type: "step", settings: { title: "Temps d'échange", text: "Nous prenons un temps pour faire connaissance et échanger sur vos besoins, vos attentes et vos questions." } },
        { type: "step", settings: { title: "Découverte d'exercices", text: "Je vous propose des exercices de respiration, de détente corporelle et de visualisation, simples et adaptés à votre situation." } },
        { type: "step", settings: { title: "Retour sur la séance", text: "Nous prenons un temps pour partager vos ressentis et, si vous le souhaitez, voir comment intégrer ces pratiques dans votre quotidien." } },
      ]),
      S("pa-split", { image_side: "left", style: "fade", image_width: 52, image_asset: file("16-plante-ombres"), image_position: "50% 50%", image_alt: "", heading: "Chacun avance\nà son rythme", text: p("Il n'y a pas d'objectif de performance : chaque parcours est unique. La première séance est l'occasion de découvrir la sophrologie et de voir comment elle peut s'intégrer dans votre vie, en fonction de vos besoins du moment."), accent: "Un espace pour vous, sans pression,\nen toute simplicité.", collapse_mobile: true }),
      S("pa-practical", { heading: "Informations pratiques", seance_id: "premiere", notice_title: "La sophrologie ne remplace pas un suivi médical", notice_text: p("La sophrologie est une méthode de relaxation et de bien-être. Elle ne se substitue pas à un avis ou à un traitement médical. En cas de question sur votre santé, consultez un professionnel de santé.") }, [
        { type: "item", settings: { icon: "clock", label: "Durée", value: "60 minutes", field: "duration-long" } },
        { type: "item", settings: { icon: "euro", label: "Tarif", value: "60 €", note: "(tarif indicatif)", field: "price" } },
        { type: "item", settings: { icon: "pin", label: "Lieu", value: "Au cabinet ou en visioconférence" } },
        { type: "item", settings: { icon: "calendar", label: "Comment réserver ?", value: "En ligne via le bouton ci-dessus ou par [À renseigner]" } },
      ]),
      S("pa-faq", { layout: "list", heading: "Questions fréquentes", all_label: "Afficher toutes les réponses" }, [
        q("À qui s'adresse la première séance ?", "À toute personne qui souhaite découvrir la sophrologie ou commencer un accompagnement. Elle sert d'abord à faire connaissance et à préciser vos besoins."),
        q("Que dois-je prévoir ?", "Une tenue confortable et un moment sans contrainte juste après la séance si possible. Pour une séance en visioconférence, un endroit calme et un appareil avec caméra et micro."),
        q("Est-ce que la sophrologie est adaptée à mes besoins ?", "Nous en parlons ensemble lors de la première séance. Si votre demande relève d'un suivi médical ou psychologique, je vous invite à consulter le professionnel adapté."),
        q("Puis-je faire la première séance en visioconférence ?", "Oui : choisissez « En visioconférence » au moment de la réservation. Le déroulement est le même qu'au cabinet."),
      ]),
    ] },
    "seance-en-visio": { seo: "Séance de sophrologie en visioconférence : préparation, matériel, confidentialité.", rows: [
      hero("Une séance,\noù vous êtes", "14-visio-ordinateur", { crumb1_label: "Accueil", crumb1_link: "/", crumb2_label: "Les séances individuelles", crumb2_link: U("seances"), crumb_current: "En visioconférence", text: p("La sophrologie s'invite chez vous, dans la même qualité d'accompagnement qu'au cabinet. Une solution souple et confortable, pour prendre soin de vous, où que vous soyez."), image_position: "60% 55%", fade: 58, button_label: "Réserver ma séance en visioconférence", button_link: BOOK, book_kind: "seance:premiere:visio", height: 440 }),
      S("pa-features", { layout: "plain" }, [
        { type: "feature", settings: { icon: "headset", title: "", text: "Le même accompagnement\nqu'au cabinet." } },
        { type: "feature", settings: { icon: "timer", title: "", text: "Un cadre souple,\npour s'adapter à votre quotidien." } },
        { type: "feature", settings: { icon: "pin", title: "", text: "Un temps pour vous,\noù que vous soyez." } },
      ]),
      S("pa-steps", { layout: "cards", heading: "Comment se passe une séance en visioconférence ?", text: "Un déroulement simple et fluide, pour vivre une expérience sereine." }, [
        { type: "step", settings: { title: "Préparez votre espace", text: "Installez-vous dans un endroit calme, où vous ne serez pas dérangé(e) pendant la séance." } },
        { type: "step", settings: { title: "Testez votre connexion", text: "Vérifiez votre connexion internet et le bon fonctionnement de votre caméra et de votre son." } },
        { type: "step", settings: { title: "Recevez votre lien privé", text: "Après la confirmation de votre rendez-vous, le cabinet vous transmet un lien de connexion personnel par e-mail." } },
      ]),
      S("pa-band", { style: "sage", full_width: false, split: 42, image_asset: file("17-visio-tasse-carnet"), image_position: "50% 50%", heading: "Le confort de chez vous,\nla même qualité d'accompagnement", text: p("Les séances en visioconférence offrent la même attention et la même écoute qu'au cabinet. Elles vous permettent de profiter d'un temps pour vous, sans contrainte de déplacement, tout en restant dans un cadre confidentiel.") }),
      S("pa-features", { layout: "circles", heading: "Quel matériel est nécessaire ?" }, [
        { type: "feature", settings: { icon: "monitor", title: "Un ordinateur, une tablette\nou un smartphone" } },
        { type: "feature", settings: { icon: "wifi", title: "Une connexion internet stable" } },
        { type: "feature", settings: { icon: "camera", title: "Une caméra et un micro\n(en général intégrés)" } },
        { type: "feature", settings: { icon: "heart", title: "Un espace calme et confortable" } },
      ]),
      S("pa-notice", { layout: "icon", icon: "lock", heading: "La confidentialité, au cœur de l'échange", text: p("Les séances en visioconférence se déroulent sur une plateforme choisie par le cabinet [À compléter : outil utilisé]. Votre échange reste confidentiel, dans le respect de votre vie privée.") }),
      S("pa-cta", { layout: "right", image_asset: file("18-visio-bandeau"), image_position: "30% 50%", heading: "Prêt(e) pour votre séance\nen visioconférence ?", text: p("Choisissez un créneau et recevez votre lien de connexion après réservation."), button_label: "Réserver ma séance", button_link: BOOK, button_style: "white", button_arrow: true, book_kind: "seance:premiere:visio" }),
    ] },
    // ─── Planche 03 : ateliers et entreprises
    ateliers: { seo: "Ateliers collectifs de sophrologie : dates, thèmes, places disponibles.", rows: [
      hero("Les ateliers\ncollectifs", "19-atelier-salle-vide", { text: p("Des temps pour souffler, se recentrer<br>et se reconnecter à l'essentiel.<br>Des ateliers accessibles à tous, dans une atmosphère bienveillante et sans pression."), image_position: "60% 50%", fade: 100, curve: true, height: 520 }),
      S("pa-workshops", { demo_note: "Dates, tarifs et places de démonstration." }, PA_ATELIERS.map((a) => ({ type: "workshop", settings: { atelier_id: a.id, image_asset: file(a.image), image_position: "50% 50%", image_alt: "", title: a.title, tags: a.tags, theme: a.theme, theme_label: a.themeLabel, text: a.text, when: whenOf(a.date, a.time, true), duration: bothDur(a.duration), price: priceLabel(a.price), link: U(a.page) } }))),
      S("pa-notice", { layout: "centered", heading: "Une parenthèse pour vous", text: p("Ces ateliers sont des moments de partage et d'exploration autour de la relaxation et du bien-être. Ils ne se substituent pas à un suivi médical.") }),
    ] },
    "atelier-une-pause-dans-la-semaine": { seo: "Atelier « Une pause dans la semaine » : programme, informations pratiques, places.", rows: atelierPage("pause-semaine", {
      heroImage: "23-atelier-cercle-fauteuils", heroPos: "50% 50%", programImage: "24-bol-sonore",
      intro: "Une parenthèse pour relâcher les tensions, apaiser le mental et retrouver de l'énergie. À travers des exercices de respiration, de relaxation et de visualisation, cet atelier vous invite à vous reconnecter à l'instant présent et à repartir avec des outils simples à intégrer dans votre quotidien.",
      words: "Se recentrer\nRelâcher\nRespirer\nAvancer plus sereinement",
      program: [["Accueil", "Un temps de bienvenue pour faire connaissance et poser le cadre de l'atelier."], ["Découverte et pratique", "Des exercices guidés de respiration, de relaxation et de visualisation, accessibles à tous."], ["Temps d'échange", "Un moment pour partager vos ressentis et repartir avec des pistes concrètes pour votre quotidien."]],
    }) },
    "atelier-decouvrir-la-relaxation": { seo: "Atelier « Découvrir la relaxation » : programme, informations pratiques, places.", rows: atelierPage("decouvrir-relaxation", {
      heroImage: "21-atelier-carnet-tisane", heroPos: "50% 55%", programImage: "15-carnet-calme",
      intro: "Une première approche de la sophrologie en petit groupe. Vous découvrez, pas à pas, des exercices simples de respiration, de détente du corps et de visualisation, pour comprendre comment fonctionne une séance et ce qui vous convient.",
      words: "Découvrir\nRespirer\nSe détendre\nTrouver ses repères",
      program: [["Accueil", "Une présentation simple de la sophrologie et du déroulement de l'atelier."], ["Exercices d'initiation", "Respiration, relâchement musculaire et relaxation dynamique, à votre rythme."], ["Temps d'échange", "Vos questions et vos ressentis, et quelques exercices à reprendre chez vous."]],
    }) },
    "atelier-un-moment-pour-ralentir": { seo: "Atelier « Un moment pour ralentir » : programme, informations pratiques, places.", rows: atelierPage("moment-ralentir", {
      heroImage: "22-atelier-coussin-beige", heroPos: "50% 50%", programImage: "34-journal-fauteuil-plaid",
      intro: "Un temps pour se déconnecter du rythme quotidien et revenir à l'instant présent. Exercices d'attention aux sensations, de respiration et de visualisation : l'atelier propose de ralentir ensemble, sans objectif de performance.",
      words: "Ralentir\nObserver\nLâcher prise\nSe ressourcer",
      program: [["Accueil", "Un moment pour arriver, poser son attention et faire connaissance."], ["Pratique guidée", "Des exercices doux d'attention, de respiration et de visualisation."], ["Temps d'échange", "Un partage de ce que chacun a observé et des idées pour ralentir au quotidien."]],
    }) },
    entreprises: { seo: "Ateliers de sophrologie pour les structures et entreprises : formats et demande d'information.", rows: [
      hero("Ateliers pour\nles structures\net entreprises", "25-entreprise-salle", { text: p("Des formats sur mesure pour offrir à vos équipes une véritable parenthèse de bien-être.", "Des ateliers de sophrologie adaptés à vos besoins, dans une approche simple, accessible et bienveillante."), image_position: "60% 50%", fade: 66, curve: true, height: 500 }),
      S("pa-features", { layout: "cards", heading: "Un temps pour vos équipes", text: p("J'interviens auprès des entreprises, associations et structures pour proposer des ateliers collectifs autour de la relaxation et de la gestion du stress. Ces temps privilégient l'expérience pratique, dans un cadre adapté à votre environnement professionnel.") }, [
        { type: "feature", settings: { icon: "leaf", title: "Offrir une parenthèse", text: "Permettre à vos équipes de se recentrer et de relâcher les tensions." } },
        { type: "feature", settings: { icon: "people", title: "Renforcer la cohésion", text: "Partager une expérience commune dans un cadre bienveillant." } },
        { type: "feature", settings: { icon: "lotus", title: "Favoriser un quotidien\nplus serein", text: "Des outils simples et concrets à intégrer dans la vie professionnelle." } },
      ]),
      S("pa-band", { style: "forest", full_width: true, split: 46, image_asset: file("26-entreprise-table"), image_position: "50% 50%", heading: "Des formats adaptés\nà vos besoins", text: p("Ateliers ponctuels, cycles thématiques, formats courts ou plus longs : chaque intervention est construite sur mesure, en fonction de vos objectifs, de votre public et de vos contraintes."), button_label: "Échanger sur votre projet", button_link: "#demande", button_style: "white" }),
      S("pa-notice", { layout: "list", icon: "lotus", list_title: "Ils peuvent s'intégrer dans le cadre de :", list_items: "Journées bien-être\nSéminaires et temps d'équipe\nDémarches qualité de vie au travail\nÉvénements internes\nAutres formats sur demande", heading: "Une approche responsable", text: p("Ces ateliers s'inscrivent dans une démarche de prévention et de bien-être. Ils ne se substituent pas à un suivi médical et ne constituent pas un traitement.") }),
      S("pa-request", { heading: "Demande d'information", text: "N'hésitez pas à me contacter pour échanger sur votre projet et recevoir une proposition adaptée." }),
    ] },
    // ─── Planche 04 : réservation
    "prendre-rendez-vous": { seo: "Prendre rendez-vous : séance au cabinet ou en visioconférence, atelier collectif.", rows: [
      S("pa-booking", { image_step1_asset: file("30-reservation-cabinet-vertical"), image_step1_position: "50% 50%", image_step2_asset: file("35-journal-fenetre-saisons"), image_step2_position: "40% 50%", image_done_asset: file("27-reservation-premiere"), image_done_visio_asset: file("14-visio-ordinateur"), image_done_visio_position: "40% 55%", image_done_side_asset: file("42-rendezvous-fauteuil-abricot"), image_done_side_position: "60% 50%", terms_link: U("conditions-de-reservation"), manage_link: U("mon-rendez-vous") }, [
        { type: "choice", settings: { kind: "seance", seance_id: "premiere", image_asset: file("27-reservation-premiere"), image_position: "50% 50%", title: "Première séance", text: "Faire connaissance et définir vos besoins en toute sérénité.", duration: "60 minutes", price: "60 €" } },
        { type: "choice", settings: { kind: "seance", seance_id: "suivi", image_asset: file("28-reservation-suivi"), image_position: "50% 50%", title: "Séance de suivi", text: "Un temps pour approfondir et avancer à votre rythme.", duration: "60 minutes", price: "60 €" } },
        { type: "choice", settings: { kind: "atelier", seance_id: "pause-semaine", image_asset: file("29-reservation-groupe"), image_position: "50% 50%", title: "Atelier de groupe", text: "Une parenthèse collective autour de la relaxation.", duration: "75 minutes", price: "20 €" } },
      ]),
    ] },
    // ─── Planche 05 : approche, journal, articles, cabinet
    "mon-approche": { seo: "Mon approche : une sophrologie à votre écoute, parcours et formation.", rows: [
      hero("Une approche\nà votre écoute", "38-cabinet-accueil", { text: p("La sophrologie comme une parenthèse<br>dans le quotidien, pour se recentrer,<br>se ressourcer et avancer à votre rythme."), image_position: "65% 50%", fade: 100, curve: true, button_label: "Prendre rendez-vous", button_link: BOOK, button_arrow: true, height: 520 }),
      S("pa-split", { image_side: "right", style: "wave", image_width: 36, image_asset: file("36-console-cabinet"), image_position: "50% 50%", image_alt: "", heading: "Une pratique au service\nde votre bien-être", text: p("Le cabinet Parenthèse vous accueille dans un espace calme et chaleureux, dédié à la relaxation et au mieux-être. Chaque accompagnement est pensé dans le respect de vos besoins, de votre rythme et de votre histoire."), quill: true }),
      S("pa-split", { image_side: "left", style: "plain", image_width: 36, image_asset: file("37-fleurs-blanches"), image_position: "50% 50%", image_alt: "", heading: "Mon approche", text: p("Une écoute attentive, une présence bienveillante et des outils simples pour vous aider à trouver vos propres ressources et cultiver un mieux-être dans la durée."), button_label: "Découvrir ma philosophie", button_link: U("premiere-seance") }),
      S("pa-cta", { layout: "leaves", heading: "Parcours & formation", text: p("Mon parcours s'est construit au fil de différentes expériences et d'une formation en sophrologie.<br>Je continue à me former régulièrement pour enrichir ma pratique.", "[À compléter : formation suivie, organisme et année — aucun diplôme n'est inventé]"), button_label: "En savoir plus", button_link: U("contact"), button_style: "forest" }),
      S("pa-cta", { layout: "soft", image_asset: file("37-fleurs-blanches"), image_position: "70% 50%", heading: "Envie d'échanger ?", text: p("Je suis à votre écoute pour toute question<br>ou pour prendre rendez-vous."), button_label: "Prendre rendez-vous", button_link: BOOK, button_style: "white", button_arrow: true }),
    ] },
    conseils: { seo: "Le journal des petites pauses : idées, inspirations et ressources.", rows: [
      hero("Le journal\ndes petites pauses", "31-journal-fleurs-carnet", { text: p("Des idées, des inspirations et des ressources<br>pour cultiver plus de sérénité au quotidien."), image_position: "50% 50%", fade: 100, height: 420 }),
      S("pa-posts", { layout: "journal", heading: "" }, journalPosts),
      S("pa-newsletter", {}),
    ] },
    "conseils-faire-une-place-a-la-pause": { seo: "Faire une place à la pause dans sa journée : trois pistes simples.", rows: article("conseils-faire-une-place-a-la-pause", {
      category: "Quotidien", title: "Faire une place à la pause\ndans sa journée", reading: "5 min de lecture", image: "31-journal-fleurs-carnet",
      intro: "Nos journées sont souvent rythmées par de multiples sollicitations. S'accorder une pause, même courte, peut aider à retrouver un peu de calme et de clarté. Voici quelques pistes simples et accessibles pour intégrer des moments de respiration dans votre quotidien.",
      tips: [tip("Choisir un moment qui vous convient", "Il n'existe pas de moment idéal : l'essentiel est de trouver un créneau qui s'adapte à votre rythme. Cela peut être le matin avant de commencer la journée, une pause en milieu de journée ou un temps plus calme le soir.", "03-stress-tasse"), tip("Créer un espace agréable", "Un lieu calme et confortable peut faciliter ce temps pour vous. Il peut s'agir d'un coin de votre salon, d'un fauteuil près d'une fenêtre ou d'un espace en extérieur, au contact de la nature.", "34-journal-fauteuil-plaid", "left"), tip("Se déconnecter des notifications", "Mettre son téléphone en mode silencieux et s'éloigner des écrans permet de s'offrir un moment plus disponible. Quelques minutes suffisent pour faire une vraie différence dans la qualité de votre journée.", "15-carnet-calme")],
      quote: "S'accorder une pause,\nc'est aussi se donner l'espace pour mieux\nrevenir à ce qui compte vraiment.", rel: ["conseils-creer-un-espace-calme-chez-soi", "conseils-des-rituels-douceur-pour-le-matin", "conseils-cultiver-la-gratitude-au-quotidien"],
    }) },
    "conseils-des-rituels-douceur-pour-le-matin": { seo: "Des rituels douceur pour bien commencer la journée.", rows: article("conseils-des-rituels-douceur-pour-le-matin", {
      category: "Quotidien", title: "Des rituels douceur\npour le matin", reading: "4 min de lecture", image: "03-stress-tasse",
      intro: "Les premières minutes de la journée donnent souvent le ton de celles qui suivent. Sans tout changer, quelques gestes simples peuvent vous aider à démarrer plus doucement.",
      tips: [tip("Prendre le temps de s'éveiller", "Avant de vous lever, accordez-vous quelques respirations lentes. Sentez le contact du corps avec le lit, puis étirez-vous tranquillement.", "17-visio-tasse-carnet"), tip("Savourer une boisson chaude", "Préparez votre thé, votre café ou une infusion en y prêtant attention : la chaleur de la tasse, l'odeur, le goût. Un moment simple, mais pleinement vécu.", "40-faq-carnet-tasse", "left"), tip("Poser une intention", "Choisissez un mot ou une phrase pour accompagner votre journée : « calme », « patience », « curiosité ». Vous pourrez y revenir quand vous en ressentirez le besoin.", "04-preparer-carnet")],
      quote: "Commencer doucement,\nc'est déjà prendre soin de sa journée.", rel: ["conseils-faire-une-place-a-la-pause", "conseils-mieux-respirer-au-quotidien", "conseils-rituel-cinq-minutes-pour-soi"],
    }) },
    "conseils-se-reconnecter-a-ses-sensations": { seo: "Se reconnecter à ses sensations, ici et maintenant.", rows: article("conseils-se-reconnecter-a-ses-sensations", {
      category: "La pratique", title: "Se reconnecter\nà ses sensations", reading: "4 min de lecture", image: "33-journal-feuilles",
      intro: "Au fil de la journée, l'attention part souvent vers ce qui reste à faire. Revenir à ses sensations est une façon simple de se reposer dans l'instant présent.",
      tips: [tip("Observer sa respiration", "Sans chercher à la modifier, remarquez simplement l'air qui entre et qui sort. Où le sentez-vous le plus ? Au niveau du nez, de la poitrine, du ventre ?", "16-plante-ombres"), tip("Parcourir le corps", "Des pieds jusqu'à la tête, portez votre attention sur chaque partie du corps. Il ne s'agit pas de juger, seulement de constater ce qui est là.", "22-atelier-coussin-beige", "left"), tip("Accueillir ce qui se présente", "Une tension, une chaleur, une détente : chaque sensation peut être accueillie avec curiosité. Si une gêne persiste ou vous inquiète, parlez-en à un professionnel de santé.", "37-fleurs-blanches")],
      quote: "Revenir à ses sensations,\nc'est revenir à soi.", rel: ["conseils-apprivoiser-ses-emotions", "conseils-creer-un-espace-calme-chez-soi", "conseils-mieux-respirer-au-quotidien"],
    }) },
    "conseils-un-lieu-pense-pour-votre-bien-etre": { seo: "L'esprit du cabinet Parenthèse.", rows: article("conseils-un-lieu-pense-pour-votre-bien-etre", {
      category: "Le cabinet", title: "Un lieu pensé\npour votre bien-être", reading: "3 min de lecture", image: "36-console-cabinet",
      intro: "Le cabinet a été pensé comme une parenthèse : un endroit où l'on peut ralentir, se poser et prendre le temps dont on a besoin.",
      tips: [tip("La lumière naturelle", "Les grandes fenêtres laissent entrer la lumière du jour, qui change au fil des heures et des saisons.", "38-cabinet-accueil"), tip("Des matières douces", "Bois clair, lin, céramique : des matières simples et chaleureuses pour créer une atmosphère apaisante.", "13-cabinet-entretien", "left"), tip("Un espace pour échanger et pratiquer", "Des fauteuils pour le temps d'échange, de la place pour les exercices : chaque coin a son usage.", "28-reservation-suivi")],
      quote: "Un lieu calme aide à se sentir\naccueilli tel que l'on est.", rel: ["conseils-les-saisons-au-cabinet", "conseils-faire-une-place-a-la-pause", "conseils-creer-un-espace-calme-chez-soi"],
    }) },
    "conseils-cultiver-la-gratitude-au-quotidien": { seo: "Cultiver la gratitude au quotidien : quelques pistes.", rows: article("conseils-cultiver-la-gratitude-au-quotidien", {
      category: "Quotidien", title: "Cultiver la gratitude\nau quotidien", reading: "4 min de lecture", image: "11-fleurs-sechees",
      intro: "Remarquer ce qui va bien n'efface pas les difficultés, mais peut aider à poser un regard plus doux sur sa journée.",
      tips: [tip("Noter trois moments agréables", "Le soir, écrivez trois moments de la journée qui vous ont fait du bien, même tout petits : un rayon de soleil, un échange, un repas.", "15-carnet-calme"), tip("Remercier", "Dire merci, à voix haute ou par un petit mot, permet de partager ces moments avec les autres.", "02-pause-carnet", "left"), tip("Revenir à l'essentiel", "Prenez un instant pour vous demander ce qui compte vraiment pour vous aujourd'hui.", "41-rendezvous-olivier")],
      quote: "Ce que l'on remarque\nprend plus de place dans la journée.", rel: ["conseils-rituel-cinq-minutes-pour-soi", "conseils-des-rituels-douceur-pour-le-matin", "conseils-faire-une-place-a-la-pause"],
    }) },
    "conseils-creer-un-espace-calme-chez-soi": { seo: "Créer un espace calme chez soi, même dans un petit espace.", rows: article("conseils-creer-un-espace-calme-chez-soi", {
      category: "La pratique", title: "Créer un espace calme\nchez soi", reading: "4 min de lecture", image: "34-journal-fauteuil-plaid",
      intro: "Pas besoin d'une pièce entière : un coin bien choisi suffit pour installer un rendez-vous régulier avec soi-même.",
      tips: [tip("Choisir l'endroit", "Un fauteuil près d'une fenêtre, un tapis dans un coin de la chambre : privilégiez un lieu où vous ne serez pas dérangé(e).", "12-seances-fauteuil-fenetre"), tip("Garder l'essentiel", "Un coussin, un plaid, peut-être une plante : quelques objets simples suffisent. Moins il y a de choses, plus il est facile de s'y poser.", "29-reservation-groupe", "left"), tip("En faire un rendez-vous", "Revenir au même endroit, au même moment, aide à installer une habitude douce.", "35-journal-fenetre-saisons")],
      quote: "Un coin à soi,\nc'est une invitation à revenir au calme.", rel: ["conseils-faire-une-place-a-la-pause", "conseils-se-reconnecter-a-ses-sensations", "conseils-un-lieu-pense-pour-votre-bien-etre"],
    }) },
    "conseils-les-saisons-au-cabinet": { seo: "Les saisons au cabinet : un lieu vivant au rythme de la nature.", rows: article("conseils-les-saisons-au-cabinet", {
      category: "Le cabinet", title: "Les saisons au cabinet", reading: "3 min de lecture", image: "35-journal-fenetre-saisons",
      intro: "Depuis les fenêtres du cabinet, le jardin change au fil de l'année. Chaque saison invite à une manière différente de prendre soin de soi.",
      tips: [tip("Le printemps", "Le retour de la lumière invite à s'aérer, à marcher, à observer ce qui renaît autour de soi.", "37-fleurs-blanches"), tip("L'été", "Les journées plus longues laissent de la place pour des pauses à l'extérieur, au calme.", "32-journal-sentier", "left"), tip("L'automne et l'hiver", "Les jours raccourcissent : c'est un bon moment pour ralentir, se réchauffer et se recentrer.", "34-journal-fauteuil-plaid")],
      quote: "Suivre le rythme des saisons,\nc'est accepter de changer de rythme soi aussi.", rel: ["conseils-un-lieu-pense-pour-votre-bien-etre", "conseils-cultiver-la-gratitude-au-quotidien", "conseils-des-rituels-douceur-pour-le-matin"],
    }) },
    "conseils-mieux-respirer-au-quotidien": { seo: "Mieux respirer au quotidien : des clés simples.", rows: article("conseils-mieux-respirer-au-quotidien", {
      category: "Quotidien", title: "Mieux respirer au quotidien", reading: "4 min de lecture", image: "10-soleil-feuillage",
      intro: "La respiration est toujours là, et pourtant on y prête rarement attention. Quelques exercices simples permettent de s'en servir comme d'un point d'appui dans la journée.",
      tips: [tip("Remarquer sa respiration", "Plusieurs fois par jour, arrêtez-vous un instant pour observer votre souffle, sans le changer.", "33-journal-feuilles"), tip("Allonger l'expiration", "Inspirez tranquillement, puis expirez un peu plus longtemps, plusieurs fois de suite, à votre rythme. Si un exercice vous gêne, arrêtez-le.", "16-plante-ombres", "left"), tip("Associer un geste du quotidien", "Avant d'ouvrir vos e-mails ou de répondre au téléphone, prenez une respiration consciente.", "14-visio-ordinateur")],
      quote: "Une respiration consciente,\nc'est une petite pause toujours à portée de main.", rel: ["conseils-rituel-cinq-minutes-pour-soi", "conseils-se-reconnecter-a-ses-sensations", "conseils-faire-une-place-a-la-pause"],
    }) },
    "conseils-apprivoiser-ses-emotions": { seo: "Apprivoiser ses émotions avec douceur.", rows: article("conseils-apprivoiser-ses-emotions", {
      category: "La pratique", title: "Apprivoiser ses émotions\navec douceur", reading: "5 min de lecture", image: "15-carnet-calme",
      intro: "Les émotions font partie de chaque journée. Plutôt que de les combattre, on peut apprendre à les reconnaître et à leur faire une place.",
      tips: [tip("Nommer ce que l'on ressent", "Mettre un mot sur une émotion aide souvent à prendre un peu de recul : « je suis agacé(e) », « je suis inquiet(e) ».", "04-preparer-carnet"), tip("Observer le corps", "Où cette émotion se manifeste-t-elle ? Dans la gorge, les épaules, le ventre ? Respirez en direction de cette zone.", "27-reservation-premiere", "left"), tip("Se faire accompagner si besoin", "Si une émotion devient envahissante ou dure dans le temps, parlez-en à un professionnel : la sophrologie ne remplace pas un accompagnement médical ou psychologique.", "41-rendezvous-olivier")],
      quote: "Accueillir une émotion,\nce n'est pas lui laisser toute la place.", rel: ["conseils-se-reconnecter-a-ses-sensations", "conseils-mieux-respirer-au-quotidien", "conseils-cultiver-la-gratitude-au-quotidien"],
    }) },
    "conseils-rituel-cinq-minutes-pour-soi": { seo: "Rituel bien-être : cinq minutes pour soi.", rows: article("conseils-rituel-cinq-minutes-pour-soi", {
      category: "Quotidien", title: "Rituel bien-être :\n5 minutes pour soi", reading: "3 min de lecture", image: "11-fleurs-sechees",
      intro: "Cinq minutes, c'est assez pour une vraie pause. Voici un petit rituel à reprendre quand vous en avez envie.",
      tips: [tip("Une minute pour s'installer", "Asseyez-vous confortablement, posez les pieds au sol et laissez les épaules se relâcher.", "42-rendezvous-fauteuil-abricot"), tip("Trois minutes pour respirer", "Observez votre souffle, puis allongez doucement l'expiration. Laissez passer les pensées sans les retenir.", "33-journal-feuilles", "left"), tip("Une minute pour revenir", "Bougez les doigts, étirez-vous, ouvrez les yeux et reprenez votre journée à votre rythme.", "35-journal-fenetre-saisons")],
      quote: "Cinq minutes pour soi,\nc'est déjà une parenthèse.", rel: ["conseils-mieux-respirer-au-quotidien", "conseils-faire-une-place-a-la-pause", "conseils-cultiver-la-gratitude-au-quotidien"],
    }) },
    "le-cabinet": { seo: "Le cabinet Parenthèse : un lieu pour vous accueillir, accès et informations pratiques.", rows: [
      hero("Un lieu pour\nvous accueillir", "28-reservation-suivi", { eyebrow: "Le cabinet", text: p("Un espace calme et chaleureux, pensé pour votre confort et votre bien-être. Le cabinet Parenthèse vous ouvre ses portes dans un cadre apaisant, à proximité de la nature."), image_position: "60% 50%", fade: 100, height: 500 }),
      S("pa-gallery", { layout: "mosaic", heading: "Un espace propice à la détente", text: p("Le cabinet a été pensé comme un lieu de ressourcement, où chaque détail contribue à une atmosphère douce et sereine. Vous y trouverez un espace confortable pour échanger, pratiquer et prendre le temps dont vous avez besoin.") }, [
        { type: "photo", settings: { image_asset: file("08-cabinet-panorama"), image_position: "50% 50%", alt: "Cabinet : fauteuils, bibliothèque et plantes" } },
        { type: "photo", settings: { image_asset: file("36-console-cabinet"), image_position: "50% 50%", alt: "Console en bois clair, vase et livres" } },
        { type: "photo", settings: { image_asset: file("40-faq-carnet-tasse"), image_position: "50% 50%", alt: "Carnet, tasse et vase sur une table ronde" } },
        { type: "photo", settings: { image_asset: file("37-fleurs-blanches"), image_position: "50% 50%", alt: "Branches de fleurs blanches dans la lumière" } },
      ]),
      S("pa-place", { frame_text: p("Le cabinet est situé dans un environnement verdoyant, propice au calme et à la détente. La lumière naturelle et la vue sur le jardin offrent un cadre apaisant, au fil des saisons."), image_asset: file("39-jardin-entree"), image_position: "50% 50%", image_alt: "", ask_text: "Je suis à votre disposition pour toute information complémentaire ou pour prendre rendez-vous.", ask_link: BOOK }),
    ] },
    // ─── Planche 06 : contact, FAQ, rendez-vous, légal
    contact: { seo: "Contact : une question sur les séances, les ateliers ou un rendez-vous.", rows: [
      S("pa-contact", { heading: "Échangeons sur\nvotre demande", text: p("Une question sur les séances, les ateliers ou tout autre sujet ?<br>Je suis à votre écoute et vous réponds avec attention."), image_asset: file("38-cabinet-accueil"), image_position: "50% 50%", image_alt: "" }),
    ] },
    faq: { seo: "Questions fréquentes : la sophrologie, les séances, la réservation, la visioconférence.", rows: [
      hero("Vos questions,\nnos réponses", "40-faq-carnet-tasse", { eyebrow: "FAQ", text: p("Retrouvez ici les réponses aux questions les plus fréquentes.<br>Vous ne trouvez pas l'information recherchée ? Contactez-moi."), image_position: "50% 50%", fade: 46, height: 400 }),
      S("pa-faq", { layout: "page", aside_link: U("contact") }, [
        { type: "category", settings: { label: "La sophrologie" } },
        q("Qu'est-ce que la sophrologie ?", "La sophrologie est une méthode de relaxation et de mieux-être qui s'appuie sur la respiration, la détente corporelle et la mobilisation des ressources positives. Elle ne constitue pas un traitement médical et ne se substitue pas à un suivi médical. En cas de question relative à votre santé, consultez un professionnel de santé."),
        q("À qui s'adresse la sophrologie ?", "Aux adultes qui souhaitent apprendre à se détendre, prendre un temps pour eux ou se préparer à un moment important. [À compléter : autres publics accueillis par le cabinet]"),
        q("Quels sont les bienfaits ?", "Chacun la vit à sa manière : beaucoup de personnes y trouvent un temps de détente et des outils simples à reprendre seules. Les effets varient d'une personne à l'autre et aucun résultat n'est garanti."),
        q("Comment se déroule une séance ?", "Un temps d'échange, des exercices guidés de respiration, de détente et de visualisation, puis un retour sur vos ressentis. Une séance dure environ une heure."),
        { type: "category", settings: { label: "Les séances" } },
        q("Combien de séances faut-il prévoir ?", "Cela dépend de vos besoins : nous en parlons ensemble lors de la première séance, et vous restez libre de poursuivre ou non."),
        q("Faut-il une tenue particulière ?", "Une tenue confortable suffit. Les exercices se pratiquent assis ou debout, sans effort physique particulier."),
        q("Les séances sont-elles prises en charge ?", "[À compléter : informations du cabinet sur une éventuelle prise en charge]"),
        { type: "category", settings: { label: "Réservation" } },
        q("Comment prendre rendez-vous ?", "En ligne, depuis « Prendre rendez-vous » : choisissez la prestation et la modalité, puis la date et l'heure, et laissez vos coordonnées. La référence de votre rendez-vous s'affiche à la fin."),
        q("Puis-je modifier ou annuler mon rendez-vous ?", "Oui, depuis la page « Mon rendez-vous », avec le lien reçu après la réservation, ou en le retrouvant avec sa référence et votre e-mail. [À compléter : délai et conditions d'annulation du cabinet]"),
        q("Le paiement se fait-il en ligne ?", "Non, aucun paiement n'est demandé sur le site. [À compléter : moyens de règlement acceptés par le cabinet]"),
        { type: "category", settings: { label: "Visio" } },
        q("De quel matériel ai-je besoin ?", "Un ordinateur, une tablette ou un smartphone avec caméra et micro, une connexion internet stable et un endroit calme."),
        q("La séance se passe-t-elle comme au cabinet ?", "Oui, le déroulement est le même : temps d'échange, exercices guidés et retour sur la séance."),
        q("Que se passe-t-il en cas de coupure ?", "[À compléter : solution prévue par le cabinet en cas de coupure de connexion]"),
      ]),
    ] },
    "retrouver-mon-rendez-vous": { seo: "Retrouver mon rendez-vous avec sa référence et mon e-mail.", rows: [
      S("pa-lookup", { text: p("Saisissez la référence de votre rendez-vous et l'adresse e-mail utilisée lors de la réservation. Les informations vous seront envoyées par e-mail."), image_asset: file("41-rendezvous-olivier"), image_position: "60% 50%" }),
    ] },
    "mon-rendez-vous": { seo: "Détails de votre rendez-vous : modifier, annuler, ajouter à l'agenda.", rows: [
      S("pa-manage", { image_asset: file("42-rendezvous-fauteuil-abricot"), image_position: "60% 50%", lookup_link: U("retrouver-mon-rendez-vous") }),
    ] },
    "mentions-legales": { seo: "Mentions légales.", rows: legal(1, "Mentions légales", p("Les mentions légales, incluant notamment l'identité de l'éditeur du site, les coordonnées, les informations d'hébergement et les droits de propriété intellectuelle, seront renseignées avant la mise en ligne du site.", "[À renseigner]")) },
    confidentialite: { seo: "Politique de confidentialité.", rows: legal(2, "Confidentialité", p("Pour un rendez-vous, le site demande : prénom, nom, e-mail, et facultativement un téléphone et une note de préparation (sans information médicale). Responsable du traitement, finalités, durée de conservation et droits : [À renseigner].")) },
    "conditions-de-reservation": { seo: "Conditions de réservation.", rows: legal(3, "Conditions de réservation", p("Aucun paiement n'est demandé en ligne. Les modalités de rendez-vous, de modification et d'annulation, les tarifs en vigueur et la règle en cas de retard ou d'absence seront précisés par le cabinet avant la mise en ligne.", "[À renseigner]")) },
    cookies: { seo: "Cookies et traceurs.", rows: legal(4, "Cookies", p("Les cookies nécessaires mémorisent dans votre navigateur votre choix de cookies et la réservation en cours. La mesure d'audience reste désactivée tant que vous ne l'avez pas acceptée.", "[À compléter : outil de mesure d'audience éventuel]")) },
  };
  for (const key of Object.keys(spec.templates)) if (key.startsWith("page.")) delete spec.templates[key];
  spec.templates.page = tpl([S("main-page", { width: "narrow", color_scheme: "scheme-1" })]);
  spec.store.pages = PA_PAGES.map((pg) => {
    spec.templates[`page.${pg.suffix}`] = tpl(pages[pg.handle].rows);
    return { handle: pg.handle, title: pg.fr, template_suffix: pg.suffix, body_html: "", seo: { title: `${pg.fr} — Parenthèse`, description: pages[pg.handle].seo } };
  });
  spec.templates["404"] = tpl([S("pa-hero", { layout: "center", eyebrow: "404", heading: "Accordons-nous\nune petite pause", text: p("Cette page n'est pas disponible, mais votre moment de bien-être<br>vous attend toujours ailleurs sur le site."), image_asset: file("39-jardin-entree"), image_position: "50% 50%", button_label: "Retour à l'accueil", button_link: "/", button2_label: "Prendre rendez-vous", button2_link: BOOK, button2_style: "line", height: 640, height_mobile: 560 })]);
  const links = [{ title: "Les séances", url: U("seances") }, { title: "Les ateliers", url: U("ateliers") }, { title: "Mon approche", url: U("mon-approche") }, { title: "Conseils", url: U("conseils") }, { title: "Contact", url: U("contact") }];
  // Menu principal de la planche 02 (cinq liens) ; le pied de page mène aussi au cabinet, aux entreprises, à la FAQ et à la gestion d'un rendez-vous.
  const more = [{ title: "Le cabinet", url: U("le-cabinet") }, { title: "Entreprises", url: U("entreprises") }, { title: "Questions fréquentes", url: U("faq") }, { title: "Retrouver mon rendez-vous", url: U("retrouver-mon-rendez-vous") }];
  spec.store.menus = { "main-menu": { title: "Menu principal", links }, footer: { title: "Navigation", links: [...links, ...more] } };
}
