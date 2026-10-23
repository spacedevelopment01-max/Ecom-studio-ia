/**
 * Démonstration ATELIER NUANCE (issue #177) : salon de coiffure fictif de la famille Services, composé par le vrai moteur
 * dans le thème « atelier-nuance » puis rédigé d'après les six planches de Thomas (docs/briefs/atelier-nuance sur la
 * branche brief/atelier-nuance-20261023). La planche 05 corrigée fait foi pour les prestations et la fiche. Les
 * photographies HD du kit (recréées par IA à partir des maquettes) sont converties en WebP dans
 * public/theme-assets/atelier-nuance/ et importées comme les photos d'un client, étiquetées démonstration.
 *
 * Rien d'inventé comme fait réel : prix, durées et disponibilités sont des exemples annoncés comme tels, coordonnées,
 * horaires affichés et mentions légales restent « [À renseigner] » / « [À confirmer] », les réponses qui engageraient
 * le salon (paiement, acompte, produits) sont « [À compléter : …] », la prise de rendez-vous est une simulation tant
 * que le service réel n'est pas activé. Équipe représentée par des initiales, jamais par un faux portrait.
 * Coquilles et incohérences des planches corrigées sans changer le design (prix uniques de la planche 05, © de
 * l'année courante, horaires en double sur le déplacement).
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
import { AN_PAGES, anUrl, salonBlocks, salonSettings, type AnPageHandle } from "../src/lib/theme/atelier-nuance";

export const AN_KIT_DIR = path.join(process.cwd(), "public", "theme-assets", "atelier-nuance");
export const AN_PROVENANCE = "Kit ATELIER NUANCE de Thomas (issue #177) : photographies recréées par IA à partir des six maquettes, converties en WebP";
export const AN_DEMO_NOTE = "Tarifs et disponibilités de démonstration.";

/** Les 59 photos du kit (noms de MEDIAS.json), avec leur description. */
export const AN_MEDIA: { file: string; alt: string }[] = [
  ["accueil-hero", "Salon de coiffure lumineux : longs plans en pierre, grands miroirs et fauteuils cognac"], ["accueil-coupe", "Ciseaux et brosses sur un plan de travail en travertin"], ["accueil-couleur", "Bols et pinceaux de coloration sur une pierre beige"], ["accueil-soin", "Serviettes roulées et flacons de soin sur une console en pierre"],
  ["accueil-salon", "Allée du salon : bacs, fauteuils en cuir et arbres en pots"], ["detail-fleurs", "Bouquet de fleurs blanches à l'entrée du salon"], ["detail-miroir", "Postes de coiffure et miroirs arrondis"], ["detail-etageres", "Étagères éclairées et flacons de soin"], ["detail-bac", "Vasque en travertin et robinetterie dorée"],
  ["detail-attente", "Espace d'attente : fauteuils arrondis et plantes"], ["accueil-conseil", "Fauteuil de coiffure près d'une console en pierre et d'un bouquet"], ["prestations-hero", "Postes de coiffure, miroirs arrondis et fauteuils cognac"], ["prestation-coupe", "Fauteuil de coiffure devant une console en travertin"], ["prestation-brushing", "Brosses rondes et sèche-cheveux dans un pot"],
  ["prestation-coloration", "Bols de coloration et pinceaux sur un chariot"], ["prestation-balayage", "Mèches de démonstration et feuilles de balayage"], ["prestation-soin", "Flacons de soin sur un bloc de pierre"], ["prestations-experience", "Comptoir en pierre et flacons dans une lumière chaude"], ["fiche-coupe-hero", "Fauteuil cognac face à un miroir arrondi"],
  ["fiche-moment", "Branches séchées et flacons sur une console en pierre"], ["longueur-courte", "Variante photo : cheveux courts vus de dos"], ["longueur-mi-longue", "Variante photo : cheveux mi-longs vus de dos"], ["longueur-longue", "Variante photo : cheveux longs vus de dos"], ["reservation-prestation", "Fauteuil de coiffure face à un grand miroir arrondi doré"],
  ["reservation-miniature", "Console en pierre, plante et accessoires"], ["reservation-recapitulatif", "Coin du salon : miroir arrondi, bouquet et fauteuil"], ["reservation-confirmation", "Deux fauteuils face à des miroirs arrondis"], ["reservation-adresse", "Console d'accueil éclairée et plante verte"], ["salon-hero", "Salon aux miroirs arrondis et fauteuils cognac"],
  ["salon-cadre", "Bacs à shampoing et fauteuils en cuir"], ["salon-details", "Bloc en travertin et bouquet de branches"], ["salon-approche", "Étagères de soins et blaireau sur une console"], ["salon-bandeau", "Salon aux miroirs dorés et îlot en travertin fleuri"], ["inspiration-hero", "Mèches de cheveux et brosse sur une étoffe"],
  ["inspiration-coupe-outils", "Ciseaux dorés, peigne et brosse sur une étoffe claire"], ["inspiration-coupe-fauteuil", "Fauteuil en cuir cognac"], ["inspiration-coupe-detail", "Pierre et branches fleuries sur une console"], ["inspiration-couleur-meches", "Nuancier de mèches blondes, châtain et brunes"], ["inspiration-couleur-bols", "Bols de pigments cuivrés"],
  ["inspiration-couleur-reflets", "Reflets cuivrés d'une chevelure ondulée"], ["inspiration-soin-produits", "Flacon et plante sur un bloc de pierre"], ["inspiration-soin-bacs", "Bacs à shampoing et fauteuils en cuir"], ["inspiration-soin-serviettes", "Serviettes roulées et plantes près d'une vasque"], ["texture-travertin", "Texture de travertin"],
  ["journal-hero", "Vase et branches séchées sur des plateaux de pierre"], ["journal-visite", "Poste de coiffure : miroir arrondi, console et fauteuil"], ["journal-outils", "Peignes et brosse sur une serviette"], ["journal-nuances", "Chevelure ondulée aux reflets cuivrés"], ["journal-rituel", "Flacons de soin et serviettes"],
  ["journal-coulisses", "Le salon vu depuis l'entrée"], ["article-brosses", "Brosses et peignes dans un pot en pierre"], ["contact-hero", "Accueil du salon : comptoir en travertin et branches"], ["contact-bandeau", "Fauteuil de coiffure et colonne en pierre"], ["retrouver-rendez-vous", "Miroir éclairé et fauteuil de coiffure"],
  ["mon-rendez-vous", "Fauteuil de coiffure devant une console"], ["deplacer-rendez-vous", "Postes de coiffure aux miroirs arrondis"], ["faq-hero", "Fauteuils cognac devant un mur d'étagères"], ["legal-hero", "Accueil du salon : comptoir en pierre et bouquet"], ["creneau-indisponible", "Allée du salon aux miroirs et fauteuils"],
].map(([file, alt]) => ({ file, alt }));

/**
 * Remplacements provisoires : deux photos du kit (partie 1 du ZIP arrivée tronquée) manquent pour l'instant. Leur
 * emplacement montre une autre photo du MÊME kit, et la différence est signalée dans le rapport ; dès que le fichier est
 * déposé dans public/theme-assets/atelier-nuance/, il est utilisé.
 */
export const AN_STANDINS: Record<string, string> = { "reservation-confirmation": "deplacer-rendez-vous", "salon-bandeau": "accueil-salon" };

const p = (s: string) => `<p>${s}</p>`;

/** Prestations de la démonstration (planche 05, prioritaire ; prestations phares cohérentes avec la planche 04). */
export const AN_SERVICES = [
  { id: "coupe-brushing", name: "Coupe & brushing", category: "coupe", short: "Shampooing, coupe personnalisée et brushing", text: "Une coupe personnalisée et un brushing sur mesure pour un résultat élégant et naturel.", duration: 45, price: 45, from: false, image: "prestation-coupe" },
  { id: "brushing", name: "Brushing", category: "coiffage", short: "Mise en forme", text: "Un brushing professionnel pour une mise en beauté tout en légèreté.", duration: 30, price: 30, from: false, image: "prestation-brushing" },
  { id: "coloration-coiffage", name: "Coloration & coiffage", category: "couleur", short: "Coloration personnalisée, shampooing, soin et brushing", text: "Une couleur sur mesure, sublimée par un coiffage adapté à votre style.", duration: 105, price: 85, from: false, image: "prestation-coloration" },
  { id: "balayage-coiffage", name: "Balayage & coiffage", category: "couleur", short: "Effet soleil naturel, shampooing, soin et brushing", text: "Des nuances naturelles et lumineuses pour un résultat tout en relief.", duration: 150, price: 120, from: true, image: "prestation-balayage" },
  { id: "soin-coiffage", name: "Soin & coiffage", category: "soin", short: "Soin profond et coiffage", text: "Un soin profond pour des cheveux visiblement plus beaux, accompagné d'un coiffage sur mesure.", duration: 60, price: 50, from: false, image: "prestation-soin" },
] as const;
/** Équipe de démonstration : initiales et compétences réellement configurées (filtrent la prise de rendez-vous). */
export const AN_STAFF = [
  { id: "camille", name: "Camille", initial: "C", title: "Spécialiste coupe et couleur", skills: "coupe-brushing, brushing, coloration-coiffage", days: "2,3,4,5,6", home: "Spécialiste coupe\net coiffage", salon: "Une approche créative\net attentive à vos envies." },
  { id: "alex", name: "Alex", initial: "A", title: "Spécialiste balayage et blond", skills: "coloration-coiffage, balayage-coiffage, brushing", days: "2,3,4,5,6", home: "Expert couleur\net techniques de lumière", salon: "Un regard expert pour\ndes résultats sur mesure." },
  { id: "sarah", name: "Sarah", initial: "S", title: "Spécialiste soin et mise en forme", skills: "soin-coiffage, brushing", days: "2,3,4,5,6", home: "Spécialiste soins\net rituels cheveux", salon: "Une écoute bienveillante\net un sens du détail." },
] as const;
/** Horaires de démonstration utilisés par le calendrier (le pied de page affiche « [À confirmer] » comme les planches). */
export const AN_HOURS = { mon: "", tue: "09:00-19:00", wed: "09:00-19:00", thu: "09:00-19:00", fri: "09:00-19:00", sat: "09:00-18:00", sun: "" };

const priceLabel = (s: { price: number; from: boolean }) => (s.from ? `À partir de ${s.price} €` : `${s.price} €`);
const durLabel = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${String(m % 60).padStart(2, "0")}` : ""}`);

export async function atelierNuanceProject(userId: string) {
  const pid = seedHoldout(userId, 2, "Démo ATELIER NUANCE");
  const product = { ...emptyProduct(), name: "ATELIER NUANCE", nameStatus: "provided" as const, category: "Salon de coiffure (exemple fictif)", sector: "services" as never, summary: "Salon de coiffure fictif de démonstration : coupe, couleur et soin." };
  saveProduct(pid, product);
  const services = { ...emptyServiceProfile(), services: AN_SERVICES.map((s) => ({ key: s.id, name: s.name, description: s.text, price: priceLabel(s), duration: durLabel(s.duration) })), contactMode: "booking" as const };
  const local = localBrand(product, "ATELIER NUANCE", { business: "services", services });
  saveBrand(pid, { ...local.brand, name: "ATELIER NUANCE", generatedBy: "local" as const, tagline: "Une nouvelle coupe. Une nouvelle énergie.", story: "Un salon de coiffure contemporain, où l'expertise rencontre le bien-être.", positioning: "Salon de coiffure premium et chaleureux (exemple fictif).", palette: { primary: "#985A42", secondary: "#EADFD2", accent: "#F3C6AC", light: "#F8F3ED", dark: "#2E211C" } } as never);
  saveStrategy(pid, local.strategy);
  saveServices(pid, services);
  run("UPDATE projects SET store_type = ?, business_type = ?, updated_at = ? WHERE id = ?", "mono", "services", now(), pid);
  saveSettings(pid, { ...loadProject(pid).settings, storeKind: "services" });

  const missing: string[] = [];
  const ids: Record<string, string> = {};
  for (const m of AN_MEDIA) {
    const source = path.join(AN_KIT_DIR, `${m.file}.webp`);
    if (!fs.existsSync(source) || fs.statSync(source).size === 0) { missing.push(`${m.file}.webp`); continue; }
    const bytes = fs.readFileSync(source), meta = await sharp(bytes).metadata();
    const a = await saveAsset({ projectId: pid, userId, data: bytes, mime: "image/webp", name: `atelier-nuance-${m.file}.webp`, origin: "upload", role: "lifestyle", status: "approved", meta: { demo: { isDemo: true, provenance: AN_PROVENANCE }, width: meta.width, height: meta.height, alt: m.alt } });
    ids[m.file] = a.id;
  }
  const built = await composeShop(pid, "atelier-nuance" as never, null, false);
  const spec: ThemeSpec = built.spec;
  const catalogOrder = spec.templates.index.order.map((k) => spec.templates.index.sections[k].type);
  curateAtelierNuance(spec, ids);
  return { pid, spec, missing, catalogOrder, project: loadProject(pid) };
}

export function curateAtelierNuance(spec: ThemeSpec, ids: Record<string, string>) {
  const file = (name: string): string => (ids[name] ? `atelier-nuance-${name}.webp` : AN_STANDINS[name] && ids[AN_STANDINS[name]] ? `atelier-nuance-${AN_STANDINS[name]}.webp` : "");
  for (const [name, aid] of Object.entries(ids)) spec.files[`atelier-nuance-${name}.webp`] = aid;
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
  const q = (question: string, answer: string, category = "") => ({ type: "question", settings: { category, question, answer: p(answer) } });
  const BOOK = anUrl("prendre-rendez-vous"), SERVICES = anUrl("prestations"), CONTACT = anUrl("contact"), SALON = anUrl("le-salon"), ACCOUNT = anUrl("mon-espace");
  const svc = (id: string) => AN_SERVICES.find((s) => s.id === id)!;

  // ─── En-tête, réglages du salon (source unique), pied de page
  spec.name = "ATELIER NUANCE — thème Atelier Nuance (démonstration)";
  spec.meta = { ...spec.meta, demo: { isDemo: true, provenance: AN_PROVENANCE, contactTest: false } };
  spec.store.shopName = "ATELIER NUANCE";
  spec.store.business = "services";
  spec.store.policies = [];
  const header = spec.groups.header;
  header.order = header.order.filter((id) => header.sections[id]?.type !== "announcement-bar");
  for (const id of Object.keys(header.sections)) if (!header.order.includes(id)) delete header.sections[id];
  const headerId = header.order.find((id) => header.sections[id].type === "header")!;
  Object.assign(header.sections[headerId].settings, { cta_label: "Prendre rendez-vous", cta_link: BOOK, phone: "", show_search: false, show_cart: false, layout: "logo-left", mobile_menu: "drawer", transparent_on_home: true, sticky: true });
  const blocks = salonBlocks(AN_SERVICES.map((s) => ({ id: s.id, name: s.name, category: s.category, short: s.short, duration: s.duration, price: s.price, from: s.from, page: anUrl(s.id as AnPageHandle) })), AN_STAFF.map((m) => ({ id: m.id, name: m.name, initial: m.initial, title: m.title, skills: m.skills, days: m.days })));
  header.sections["an-salon"] = S("an-salon", { ...salonSettings("fr", { address: "", bookingLabel: "Prendre rendez-vous", bookingLink: BOOK, bookbar: true, cookiesLink: anUrl("cookies"), hours: AN_HOURS }), closures: "2026-12-24..2026-12-26, 2026-12-31, 2027-01-01" }, blocks);
  if (!header.order.includes("an-salon")) header.order.unshift("an-salon");
  const footer = spec.groups.footer;
  const footerId = footer.order.find((id) => footer.sections[id].type === "footer")!;
  const todoDays = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"].map((d) => `<li>${d} <em>[À confirmer]</em></li>`).join("");
  footer.sections[footerId] = S("footer", { style: "brand-left", tagline: "Plus qu'un salon, une nouvelle énergie.", logo_asset: "", show_wordmark: false, show_policies: false, show_payment: false, color_scheme: "scheme-3" }, [
    { type: "links", settings: { heading: "Navigation", menu: "footer" } },
    { type: "text", settings: { heading: "Nous trouver", text: "<p>[Adresse à renseigner]<br>[Ville]<br>Tél. : [À renseigner]</p>" } },
    { type: "text", settings: { heading: "Horaires", text: `<ul>${todoDays}</ul>` } },
  ]);
  footer.sections["an-footnote"] = S("an-footnote", { note: "", link1_label: "Mentions légales", link1: anUrl("informations-legales"), link2_label: "Politique de confidentialité", link2: anUrl("confidentialite"), link3_label: "Questions fréquentes", link3: anUrl("faq") });
  if (!footer.order.includes("an-footnote")) footer.order.push("an-footnote");
  spec.settings = { ...spec.settings, logo_asset: "", favicon_asset: "", fab_contact_link: "", fab_back_to_top: false, social_instagram: "", social_facebook: "", social_pinterest: "", social_tiktok: "", social_youtube: "", type_heading_font: "cormorant_n5", type_body_font: "lora_n4" };

  const featured = ["coupe-brushing", "coloration-coiffage", "brushing"].map((id) => ({ type: "service", settings: { service_id: id, name: svc(id).name, price: priceLabel(svc(id)), duration: durLabel(svc(id).duration), link: anUrl(id as AnPageHandle) } }));
  const homeFaq = [
    q("Comment prendre rendez-vous ?", "En ligne, depuis « Prendre rendez-vous » : choisissez la prestation, la personne qui vous accueille et le créneau, puis laissez vos coordonnées. Vous recevez la référence de votre rendez-vous à l'écran."),
    q("Puis-je modifier ou annuler mon rendez-vous ?", "Oui, depuis « Mon espace » ou la page « Retrouver mon rendez-vous ». Les conditions d'annulation et de modification sont à préciser par le salon."),
    q("Quels moyens de paiement acceptez-vous ?", "[À compléter : moyens de paiement acceptés par le salon]"),
    q("Utilisez-vous des produits adaptés à tous les types de cheveux ?", "[À compléter : produits et marques utilisés par le salon]"),
  ];

  // ─── Accueil (planche 04)
  spec.templates.index = tpl([
    S("an-hero", { layout: "home", eyebrow: "", heading: "Une nouvelle coupe.\nUne nouvelle énergie.", text: p("Un salon de coiffure contemporain, où l'expertise rencontre le bien-être.<br>Des cheveux sublimés, une version de vous plus lumineuse."), image_asset: file("accueil-hero"), image_position: "60% 50%", image_position_mobile: "62% 50%", overlay: 40, button_label: "Réserver mon rendez-vous", button_link: BOOK, button2_label: "Voir les prestations", button2_link: SERVICES, height: 470, height_mobile: 420 }),
    S("an-categories", {}, [
      { type: "category", settings: { image_asset: file("accueil-coupe"), image_position: "50% 60%", heading: "Coupe & coiffage", text: "Des coupes sur-mesure et des coiffages qui révèlent votre style.", link_label: "Découvrir", link: `${SERVICES}#coupe` } },
      { type: "category", settings: { image_asset: file("accueil-couleur"), image_position: "50% 50%", heading: "Couleur & lumière", text: "Des nuances lumineuses et naturelles pour sublimer votre couleur.", link_label: "Découvrir", link: `${SERVICES}#couleur` } },
      { type: "category", settings: { image_asset: file("accueil-soin"), image_position: "50% 55%", heading: "Soin & rituel", text: "Des soins experts pour des cheveux plus forts et plus beaux.", link_label: "Découvrir", link: `${SERVICES}#soin` } },
    ]),
    S("an-split", { eyebrow: "Le salon", heading: "Un temps pour vous.", text: p("Un lieu pensé comme une parenthèse, où chaque détail compte. Des matières naturelles, une atmosphère apaisante et une équipe attentive pour faire de votre rendez-vous un moment unique."), button_label: "Découvrir le salon", button_link: SALON, image_asset: file("accueil-salon"), image_position: "50% 55%", background: "blush", min_height: 356 }),
    S("an-featured", { eyebrow: "Nos prestations phares", note: AN_DEMO_NOTE }, featured),
    S("an-steps", { style: "band", heading: "Votre rendez-vous, simplement.", button_label: "Réserver mon rendez-vous", button_link: BOOK }, [
      { type: "step", settings: { title: "Choisissez\nvotre prestation", text: "Coupe, couleur, soin…\nTrouvez ce qui vous fait envie." } },
      { type: "step", settings: { title: "Sélectionnez\nun créneau", text: "Les disponibilités du salon\npour vous simplifier la vie." } },
      { type: "step", settings: { title: "Recevez la confirmation", text: "Une référence de rendez-vous\net c'est réservé !" } },
    ]),
    S("an-details", { eyebrow: "Un lieu d'exception", heading: "Des détails qui font la différence." }, [
      ["detail-fleurs", "50% 60%"], ["detail-miroir", "50% 50%"], ["detail-etageres", "50% 50%"], ["detail-bac", "50% 50%"], ["detail-attente", "50% 55%"],
    ].map(([f, pos]) => ({ type: "photo", settings: { image_asset: file(f), image_position: pos, alt: AN_MEDIA.find((m) => m.file === f)!.alt } }))),
    S("an-team", { style: "light", eyebrow: "Notre équipe", heading: "Des expertises complémentaires." }, AN_STAFF.map((m) => ({ type: "member", settings: { initial: m.initial, name: m.name, title: m.home } }))),
    S("an-faq", { layout: "home", eyebrow: "Vos questions", heading: "Foire aux questions", aside_image_asset: file("accueil-conseil"), aside_image_position: "35% 55%", aside_heading: "Besoin d'un conseil ?", aside_text: "Notre équipe est là pour vous guider vers la prestation la plus adaptée à vos envies.", aside_button_label: "Nous contacter", aside_link: CONTACT }, homeFaq),
    S("an-cta", { heading: "Prête pour un moment rien qu'à vous ?", text: "Coupe, couleur ou soin, réservez dès maintenant votre prochain rendez-vous.", button_label: "Réserver mon rendez-vous", button_link: BOOK }),
  ]);
  spec.store.seo = { title: "ATELIER NUANCE — salon de coiffure (démonstration)", description: "Salon de coiffure fictif de démonstration : prestations, inspirations, journal et prise de rendez-vous simulée." };

  // ─── Fiches de prestation : même modèle, contenus propres à chaque prestation
  type Fiche = { eyebrow: string; text: string; hero: string; heroPos: string; steps: [string, string][]; included: string[]; tips: [string, string, string][]; faq: [string, string][]; moment: string };
  const fiches: Record<string, Fiche> = {
    "coupe-brushing": {
      eyebrow: "Prestation", text: "Une coupe personnalisée et un brushing sur mesure pour un résultat élégant et naturel.", hero: "fiche-coupe-hero", heroPos: "55% 50%",
      steps: [["Consultation", "Un échange pour comprendre vos envies et vous conseiller sur la coupe idéale."], ["Coupe", "Une coupe précise et adaptée à la forme de votre visage et à la nature de vos cheveux."], ["Coiffage", "Un brushing sur mesure pour sublimer votre coupe et révéler tout son mouvement."]],
      included: ["Consultation personnalisée", "Shampooing et soin adapté", "Coupe sur mesure", "Brushing professionnel", "Conseils d'entretien"],
      tips: [["image", "Venez avec vos envies", "Des photos peuvent nous aider à mieux comprendre le résultat souhaité."], ["clock", "Prévoyez un peu de temps", "Profitez pleinement de ce moment pour vous."], ["chat", "Signalez vos attentes", "N'hésitez pas à nous parler de vos habitudes capillaires, de vos contraintes ou de vos questions."]],
      faq: [["Ce service convient-il à tous les types de cheveux ?", "La coupe est adaptée à la nature de vos cheveux lors de la consultation. [À compléter : précisions du salon]"], ["Quelle est la différence entre une coupe seule et une coupe & brushing ?", "Cette prestation comprend la coupe et le brushing qui la met en forme. Une coupe seule n'est pas proposée en ligne sur ce site d'exemple."], ["Puis-je apporter une photo d'inspiration ?", "Oui, une photo aide à comprendre le résultat souhaité."], ["Combien de temps dure la prestation ?", "Environ 45 minutes (durée de démonstration)."]],
      moment: "fiche-moment",
    },
    brushing: {
      eyebrow: "Prestation", text: "Un brushing professionnel pour une mise en beauté tout en légèreté.", hero: "prestation-brushing", heroPos: "50% 50%",
      steps: [["Échange", "Quelques minutes pour définir le volume et le mouvement que vous souhaitez."], ["Shampooing", "Un lavage adapté à vos cheveux pour préparer la mise en forme."], ["Mise en forme", "Un brushing à la brosse pour un résultat souple, lisse ou ondulé selon vos envies."]],
      included: ["Échange sur le résultat souhaité", "Shampooing adapté", "Brushing professionnel", "Conseils de tenue"],
      tips: [["image", "Montrez le style voulu", "Une photo de coiffage aide à viser le bon volume."], ["clock", "Arrivez quelques minutes avant", "Le brushing commence à l'heure prévue."], ["chat", "Parlez de vos habitudes", "Dites-nous comment vous coiffez vos cheveux au quotidien."]],
      faq: [["Le brushing comprend-il un shampooing ?", "Oui, un shampooing adapté précède la mise en forme."], ["Puis-je choisir un effet lisse ou ondulé ?", "Oui, le résultat est défini avec vous au début du rendez-vous."], ["Combien de temps dure la prestation ?", "Environ 30 minutes (durée de démonstration)."]],
      moment: "inspiration-soin-produits",
    },
    "coloration-coiffage": {
      eyebrow: "Prestation", text: "Une couleur sur mesure, sublimée par un coiffage adapté à votre style.", hero: "prestation-coloration", heroPos: "50% 50%",
      steps: [["Diagnostic couleur", "Un échange pour choisir la nuance qui vous ressemble et vérifier l'état de vos cheveux."], ["Coloration", "Une application soignée, de la racine aux longueurs, selon la nuance choisie."], ["Soin et coiffage", "Un shampooing, un soin et un brushing pour révéler l'éclat de la couleur."]],
      included: ["Diagnostic couleur", "Coloration personnalisée", "Shampooing et soin", "Brushing", "Conseils pour entretenir la couleur"],
      tips: [["image", "Apportez des exemples de nuances", "Des photos aident à choisir la couleur."], ["clock", "Comptez environ 1 h 45", "La coloration demande un temps de pose."], ["chat", "Parlez de vos colorations passées", "Signalez les couleurs ou produits déjà utilisés sur vos cheveux."]],
      faq: [["Faut-il un test préalable ?", "[À compléter : politique du salon sur les tests de tolérance]"], ["Puis-je choisir ma nuance sur place ?", "Oui, la nuance est choisie avec vous lors du diagnostic."], ["Combien de temps dure la prestation ?", "Environ 1 h 45 (durée de démonstration)."]],
      moment: "inspiration-couleur-bols",
    },
    "balayage-coiffage": {
      eyebrow: "Prestation", text: "Des nuances naturelles et lumineuses pour un résultat tout en relief.", hero: "prestation-balayage", heroPos: "50% 50%",
      steps: [["Consultation", "Un échange pour définir l'intensité et l'emplacement des reflets."], ["Balayage", "Des mèches posées à la main pour un effet soleil naturel."], ["Soin et coiffage", "Un shampooing, un soin et un brushing pour révéler les nuances."]],
      included: ["Consultation personnalisée", "Balayage à la main", "Shampooing et soin", "Brushing", "Conseils d'entretien des reflets"],
      tips: [["image", "Montrez l'effet recherché", "Des photos aident à doser l'intensité des reflets."], ["clock", "Comptez environ 2 h 30", "Le balayage demande un temps de pose et de rinçage."], ["chat", "Parlez de votre couleur actuelle", "Indiquez les colorations ou mèches déjà réalisées."]],
      faq: [["Pourquoi le prix est-il « à partir de » ?", "Le prix affiché est le prix de départ. Le tarif final dépend des options définies par le salon et vous est confirmé avant la prestation. [À compléter : options et suppléments du salon]"], ["Le balayage convient-il aux cheveux foncés ?", "La faisabilité est vérifiée avec vous lors de la consultation."], ["Combien de temps dure la prestation ?", "Environ 2 h 30 (durée de démonstration)."]],
      moment: "inspiration-couleur-reflets",
    },
    "soin-coiffage": {
      eyebrow: "Prestation", text: "Un soin profond pour des cheveux visiblement plus beaux, accompagné d'un coiffage sur mesure.", hero: "prestation-soin", heroPos: "50% 50%",
      steps: [["Diagnostic", "Un échange pour comprendre les besoins de vos cheveux et de votre cuir chevelu."], ["Soin profond", "Un soin appliqué et massé, choisi selon le diagnostic."], ["Coiffage", "Un brushing sur mesure pour finir le rituel."]],
      included: ["Diagnostic du cheveu", "Shampooing adapté", "Soin profond", "Brushing", "Conseils de routine à la maison"],
      tips: [["chat", "Décrivez vos besoins", "Cheveux secs, fins, abîmés : dites-nous ce que vous ressentez."], ["clock", "Prévoyez une heure", "Le soin demande un temps de pose."], ["heart", "Profitez du moment", "Le rituel est pensé comme une pause pour vous."]],
      faq: [["Quel soin sera utilisé ?", "[À compléter : soins et produits utilisés par le salon]"], ["Le soin convient-il aux cheveux colorés ?", "Le soin est choisi selon le diagnostic de vos cheveux."], ["Combien de temps dure la prestation ?", "Environ 1 heure (durée de démonstration)."]],
      moment: "inspiration-soin-serviettes",
    },
  };
  const fichePage = (id: string): SectionInstance[] => {
    const f = fiches[id], s = svc(id);
    return [
      S("an-hero", { layout: "service", eyebrow: f.eyebrow, heading: s.name, text: p(f.text), image_asset: file(f.hero), image_position: f.heroPos, service_id: id, duration: durLabel(s.duration), price: priceLabel(s), note: "Tarifs de\ndémonstration", button_label: "Prendre rendez-vous", button_link: BOOK, height: 600, height_mobile: 340 }),
      S("an-steps", { style: "line", heading: "Les étapes de votre prestation" }, f.steps.map(([title, text]) => ({ type: "step", settings: { title, text } }))),
      S("an-lengths", { service_id: id, duration: durLabel(s.duration), price: priceLabel(s), note: "Tarifs de démonstration", book_link: BOOK, short_image_asset: file("longueur-courte"), mid_image_asset: file("longueur-mi-longue"), long_image_asset: file("longueur-longue") }),
      S("an-included", {}, [...f.included.map((text) => ({ type: "item", settings: { text } })), ...f.tips.map(([icon, title, text]) => ({ type: "tip", settings: { icon, title, text } }))]),
      S("an-faq", { layout: "service", eyebrow: "", heading: "Questions fréquentes", aside_image_asset: file(f.moment), aside_image_position: "50% 50%", aside_heading: "Un moment\npour vous", aside_text: "", aside_button_label: "Prendre rendez-vous", aside_link: BOOK }, f.faq.map(([a, b]) => q(a, b))),
    ];
  };

  // ─── Journal : articles (une adresse par article)
  type Article = { eyebrow: string; title: string; card: string; image: string; pos: string; intro: string; tips: string[] };
  const articles: Record<string, Article> = {
    "journal-preparer-votre-visite": { eyebrow: "Conseils", title: "Préparer votre prochaine visite : nos recommandations", card: "Quelques idées simples pour profiter pleinement de votre rendez-vous et obtenir un résultat qui vous ressemble.", image: "article-brosses", pos: "50% 50%", intro: "Pour profiter pleinement de votre rendez-vous, quelques gestes simples peuvent faire la différence. Voici nos conseils pour arriver sereinement et échanger au mieux avec votre coiffeur.", tips: ["Prenez le temps de noter vos envies et d'identifier ce que vous aimez.", "N'hésitez pas à apporter des inspirations (photos, idées, références).", "Pensez à nous informer de vos habitudes capillaires et de votre routine.", "Prévoyez un peu de temps pour profiter pleinement de votre soin.", "Notre équipe est là pour vous conseiller et vous accompagner à chaque étape."] },
    "journal-outils-du-quotidien": { eyebrow: "Les essentiels", title: "Les outils du quotidien", card: "Une sélection d'accessoires indispensables pour prendre soin de vos cheveux à la maison.", image: "journal-outils", pos: "50% 50%", intro: "Quelques accessoires bien choisis suffisent pour entretenir votre coiffure entre deux rendez-vous.", tips: ["Une brosse adaptée à la longueur et à la nature de vos cheveux.", "Un peigne à dents larges pour démêler sans casser.", "Une serviette douce pour sécher en tamponnant plutôt qu'en frottant.", "Demandez conseil au salon pour choisir les outils qui vous conviennent."] },
    "journal-nuances-de-la-saison": { eyebrow: "Inspirations", title: "Les nuances de la saison", card: "Des teintes et des reflets qui inspirent, entre naturel et modernité.", image: "journal-nuances", pos: "50% 50%", intro: "Cuivrés, châtains lumineux, blonds doux : quelques pistes pour imaginer votre prochaine couleur.", tips: ["Les reflets cuivrés réchauffent les châtains.", "Un balayage léger apporte de la lumière sans changer de couleur de base.", "La bonne nuance se choisit avec votre coloriste, selon votre carnation et vos envies."] },
    "journal-rituel-soin-en-salon": { eyebrow: "Savoir-faire", title: "Le rituel soin en salon", card: "Un moment dédié pour nourrir, protéger et sublimer vos cheveux.", image: "journal-rituel", pos: "50% 50%", intro: "Le soin en salon est une pause : un diagnostic, un soin choisi pour vos cheveux et un coiffage pour finir.", tips: ["Le diagnostic oriente le choix du soin.", "Le temps de pose permet au soin d'agir.", "Un coiffage termine le rituel."] },
    "journal-art-des-details": { eyebrow: "Dans les coulisses", title: "L'art des détails", card: "Une immersion dans l'univers du salon et de nos gestes au quotidien.", image: "journal-coulisses", pos: "50% 50%", intro: "Matières naturelles, lumière douce, gestes précis : ce qui compose l'atmosphère du salon.", tips: ["Des matières naturelles : pierre, bois, cuir.", "Une lumière chaude pensée pour votre confort.", "Des gestes précis, du shampooing au coiffage."] },
  };
  const articlePage = (h: string, compact = false): SectionInstance => {
    const a = articles[h];
    return S("an-article", { compact, image_asset: file(a.image), image_position: a.pos, image_alt: AN_MEDIA.find((m) => m.file === a.image)!.alt, eyebrow: a.eyebrow, heading: a.title, intro: p(a.intro), button_label: compact ? "" : "Prendre rendez-vous", button_link: BOOK, back_label: compact ? "Lire l'article" : "Retour au journal", back_link: compact ? anUrl(h as AnPageHandle) : anUrl("journal") }, a.tips.map((text) => ({ type: "tip", settings: { title: "", text } })));
  };
  const legal = (current: number, heading: string, body: string): SectionInstance => S("an-legal", { image_asset: file("legal-hero"), image_position: "50% 50%", height: 450, sign: "ATELIER\nNUANCE", hero_heading: "Informations légales", hero_text: "Retrouvez ici l'ensemble des informations relatives\nà l'utilisation de notre site. Ces contenus sont à compléter\navant publication.", current, heading, body, tab1_link: anUrl("informations-legales"), tab2_link: anUrl("confidentialite"), tab3_link: anUrl("conditions-de-reservation"), tab4_link: anUrl("cookies"), notice_title: "Contenu à compléter avant publication", notice_text: p("Les mentions légales, la politique de confidentialité, les conditions de réservation et la politique relative aux cookies sont à renseigner avant la mise en ligne du site.") + p("Ces informations sont fournies à titre de démonstration.") });

  // ─── Pages (planches 02, 03, 05, 06)
  const pages: Record<AnPageHandle, { seo: string; rows: SectionInstance[] }> = {
    "le-salon": { seo: "Le salon : un lieu apaisant, des détails qui comptent et une équipe à l'écoute.", rows: [
      S("an-hero", { layout: "page", eyebrow: "Atelier Nuance", heading: "Bienvenue\nà l'Atelier Nuance", text: p("Un salon de coiffure contemporain où l'écoute, le savoir-faire et la beauté naturelle se rencontrent."), image_asset: file("salon-hero"), image_position: "50% 50%", overlay: 40, button_label: "Prendre rendez-vous", button_link: BOOK, height: 600, height_mobile: 420 }),
      S("an-intro", { heading: "Plus qu'un salon,\nune expérience sur mesure", text: p("À l'Atelier Nuance, nous croyons en une beauté authentique et personnalisée. Chaque visite est un moment privilégié, une parenthèse dédiée à vous. Notre équipe vous écoute, vous conseille et vous accompagne pour révéler la meilleure version de vous-même."), rule: true }, [
        { type: "card", settings: { image_asset: file("salon-cadre"), heading: "Un cadre apaisant", text: "Un espace pensé pour votre bien-être, entre matières naturelles et lumière douce." } },
        { type: "card", settings: { image_asset: file("salon-details"), heading: "Des détails qui comptent", text: "Des matériaux nobles et une ambiance élégante pour une expérience unique." } },
        { type: "card", settings: { image_asset: file("salon-approche"), heading: "Une approche personnalisée", text: "Des conseils sur mesure pour des résultats en harmonie avec votre style de vie et vos envies." } },
      ]),
      S("an-team", { style: "dark", eyebrow: "", heading: "Notre équipe", text: "Trois sensibilités, une même passion : sublimer votre style." }, AN_STAFF.map((m) => ({ type: "member", settings: { initial: m.initial, name: m.name, title: m.salon } }))),
      S("an-banner", { image_asset: file("salon-bandeau"), image_position: "50% 60%", heading: "Prenez du temps pour vous", text: "Offrez-vous une parenthèse de bien-être dans un lieu\npensé pour sublimer votre beauté naturelle.", button_label: "Prendre rendez-vous", button_link: BOOK, arrow: true, align: "center", vertical: "bottom", tone: "light", overlay: 30, height: 640, height_mobile: 420 }),
    ] },
    prestations: { seo: "Prestations et tarifs : coupe, couleur, coiffage et soins (tarifs de démonstration).", rows: [
      S("an-hero", { layout: "page", heading: "Prestations\n& tarifs", text: p("Des services sur mesure pour révéler votre style, dans un cadre d'exception."), image_asset: file("prestations-hero"), image_position: "55% 50%", overlay: 40, height: 540, height_mobile: 320 }),
      S("an-services", { show_filters: true, button_label: "Réserver", book_link: BOOK, note: "Tarifs de démonstration" }, AN_SERVICES.map((s) => ({ type: "service", settings: { service_id: s.id, category: s.category, name: s.name, text: s.text, image_asset: file(s.image), image_position: "50% 50%", duration: durLabel(s.duration), price: `${s.price} €`, from: s.from, link: anUrl(s.id as AnPageHandle) } }))),
      S("an-banner", { image_asset: file("prestations-experience"), image_position: "50% 50%", heading: "Une expérience\nau-delà du soin", text: "Prenez le temps. Nous nous occupons du reste.", button_label: "Prendre rendez-vous", button_link: BOOK, align: "left", tone: "light", overlay: 45, height: 360, height_mobile: 300 }),
    ] },
    "coupe-brushing": { seo: "Coupe & brushing : consultation, coupe et coiffage (tarif de démonstration).", rows: fichePage("coupe-brushing") },
    brushing: { seo: "Brushing : mise en forme professionnelle (tarif de démonstration).", rows: fichePage("brushing") },
    "coloration-coiffage": { seo: "Coloration & coiffage : couleur sur mesure (tarif de démonstration).", rows: fichePage("coloration-coiffage") },
    "balayage-coiffage": { seo: "Balayage & coiffage : reflets naturels (tarif de démonstration, à partir de).", rows: fichePage("balayage-coiffage") },
    "soin-coiffage": { seo: "Soin & coiffage : soin profond et coiffage (tarif de démonstration).", rows: fichePage("soin-coiffage") },
    "prendre-rendez-vous": { seo: "Prendre rendez-vous en ligne (démonstration : aucun rendez-vous réel).", rows: [
      S("an-booking", { image_step1_asset: file("reservation-prestation"), image_step1_position: "50% 50%", image_summary_asset: file("reservation-miniature"), image_recap_asset: file("reservation-recapitulatif"), image_confirm_asset: file("reservation-confirmation"), image_address_asset: file("reservation-adresse"), image_conflict_asset: file("creneau-indisponible"), note: "Tarifs et disponibilités de démonstration", confirm_text: "Merci de votre confiance. Nous avons hâte de vous accueillir chez Atelier Nuance.", account_link: ACCOUNT, terms_link: anUrl("conditions-de-reservation"), back_link: SERVICES }),
    ] },
    inspirations: { seo: "Inspirations : coupe, couleur et soin (scènes de démonstration).", rows: [
      S("an-hero", { layout: "page", eyebrow: "Inspirations", heading: "L'inspiration\ncommence ici", text: p("Des idées, des textures et des nuances pour imaginer votre prochain look. Laissez-vous inspirer par l'univers de l'Atelier Nuance."), image_asset: file("inspiration-hero"), image_position: "50% 50%", overlay: 40, height: 560, height_mobile: 360 }),
      S("an-inspirations", { show_filters: true }, [
        { type: "group", settings: { key: "coupe", tab_label: "Coupe", heading: "Coupe", text: "Des lignes, des mouvements et des textures\npour un style qui vous ressemble.", link_label: "Voir plus", link: `${SERVICES}#coupe` } },
        ...[["inspiration-coupe-outils", "Les outils de la coupe", "Ciseaux, peigne et brosse : la précision du geste."], ["inspiration-coupe-fauteuil", "Le fauteuil", "Le cuir cognac du salon, prêt pour votre rendez-vous."], ["inspiration-coupe-detail", "Matières", "Pierre et branches fleuries, l'atmosphère du salon."]].map(([f, t, x]) => ({ type: "photo", settings: { image_asset: file(f), title: t, text: x } })),
        { type: "group", settings: { key: "couleur", tab_label: "Couleur", heading: "Couleur", text: "Des nuances subtiles et lumineuses\npour révéler toute la richesse de votre style.", link_label: "Voir plus", link: `${SERVICES}#couleur` } },
        ...[["inspiration-couleur-meches", "Nuancier", "Du blond doux au brun profond : choisir sa nuance."], ["inspiration-couleur-bols", "Pigments cuivrés", "Les teintes chaudes de la saison."], ["inspiration-couleur-reflets", "Reflets", "Des reflets cuivrés sur une chevelure ondulée."]].map(([f, t, x]) => ({ type: "photo", settings: { image_asset: file(f), title: t, text: x } })),
        { type: "group", settings: { key: "soin", tab_label: "Soin", heading: "Soin", text: "Des rituels sur mesure pour des cheveux beaux\net en pleine santé.", link_label: "Voir plus", link: `${SERVICES}#soin` } },
        ...[["inspiration-soin-produits", "Rituel", "Un soin choisi pour vos cheveux."], ["inspiration-soin-bacs", "Les bacs", "Le temps du shampooing et du soin."], ["inspiration-soin-serviettes", "Douceur", "Serviettes et matières naturelles."]].map(([f, t, x]) => ({ type: "photo", settings: { image_asset: file(f), title: t, text: x } })),
      ]),
      S("an-banner", { image_asset: file("texture-travertin"), image_position: "50% 50%", heading: "Une idée en tête ?", text: "Parlons-en lors de votre prochain rendez-vous.", button_label: "Prendre rendez-vous", button_link: BOOK, arrow: true, align: "center", tone: "light", overlay: 35, height: 400, height_mobile: 300 }),
    ] },
    journal: { seo: "Le journal : idées, conseils et inspirations.", rows: [
      S("an-hero", { layout: "page", eyebrow: "Le journal", heading: "Des idées, des conseils\net des inspirations", text: p("Découvrez nos articles pour prendre soin de vos cheveux, préparer votre prochaine visite et explorer l'univers de l'Atelier Nuance."), image_asset: file("journal-hero"), image_position: "50% 50%", overlay: 45, height: 560, height_mobile: 360 }),
      S("an-journal", { read_label: "Lire l'article" }, [
        { type: "article", settings: { image_asset: file("journal-visite"), eyebrow: "Conseils", title: "Préparer votre\nprochaine visite", text: articles["journal-preparer-votre-visite"].card, link: anUrl("journal-preparer-votre-visite") } },
        ...(["journal-outils-du-quotidien", "journal-nuances-de-la-saison", "journal-rituel-soin-en-salon", "journal-art-des-details"] as const).map((h) => ({ type: "article", settings: { image_asset: file(articles[h].image), eyebrow: articles[h].eyebrow, title: articles[h].title, text: articles[h].card, link: anUrl(h) } })),
      ]),
      articlePage("journal-preparer-votre-visite", true),
      S("an-banner", { image_asset: file("texture-travertin"), image_position: "50% 40%", heading: "Une question ou une envie particulière ?", text: "Notre équipe est à votre écoute.", button_label: "Prendre rendez-vous", button_link: BOOK, arrow: true, align: "center", tone: "dark", overlay: 20, height: 330, height_mobile: 280 }),
    ] },
    "journal-preparer-votre-visite": { seo: "Préparer votre prochaine visite : nos recommandations.", rows: [articlePage("journal-preparer-votre-visite")] },
    "journal-outils-du-quotidien": { seo: "Les outils du quotidien pour prendre soin de vos cheveux.", rows: [articlePage("journal-outils-du-quotidien")] },
    "journal-nuances-de-la-saison": { seo: "Les nuances de la saison : teintes et reflets.", rows: [articlePage("journal-nuances-de-la-saison")] },
    "journal-rituel-soin-en-salon": { seo: "Le rituel soin en salon.", rows: [articlePage("journal-rituel-soin-en-salon")] },
    "journal-art-des-details": { seo: "L'art des détails : dans les coulisses du salon.", rows: [articlePage("journal-art-des-details")] },
    contact: { seo: "Contact : coordonnées, horaires, formulaire et accès.", rows: [
      S("an-hero", { layout: "page", eyebrow: "Contact", heading: "Venez nous\nrencontrer", text: p("Nous serons ravis de vous accueillir à l'Atelier Nuance et d'échanger avec vous sur vos envies."), image_asset: file("contact-hero"), image_position: "50% 50%", overlay: 40, button_label: "Prendre rendez-vous", button_link: BOOK, height: 580, height_mobile: 400 }),
      S("an-contact", {}),
      S("an-map", {}),
      S("an-banner", { image_asset: file("contact-bandeau"), image_position: "50% 55%", heading: "Envie de prendre rendez-vous ?", text: "Choisissez le créneau qui vous convient.", button_label: "Prendre rendez-vous", button_link: BOOK, arrow: true, align: "center", tone: "light", overlay: 40, height: 360, height_mobile: 320 }),
    ] },
    faq: { seo: "Questions fréquentes : réservation, prestations et votre visite.", rows: [
      S("an-hero", { layout: "page", heading: "Questions\nfréquentes", text: p("Retrouvez ici les réponses aux questions les plus courantes. Une autre question ? Notre équipe est à votre écoute."), image_asset: file("faq-hero"), image_position: "50% 55%", overlay: 40, height: 440, height_mobile: 320 }),
      S("an-faq", { layout: "page", eyebrow: "", heading: "Questions fréquentes", aside_heading: "Une autre question ?", aside_text: "Notre équipe est là pour vous aider.", aside_button_label: "Nous contacter", aside_link: CONTACT }, [
        q("Comment prendre rendez-vous ?", "Vous pouvez prendre rendez-vous directement en ligne via notre site : choisissez la prestation, la personne qui vous accueille et le créneau qui vous convient. Vous recevez ensuite la référence de votre rendez-vous, et un e-mail de confirmation lorsque l'envoi est activé par le salon.", "Réservation"),
        q("Puis-je modifier ou annuler mon rendez-vous ?", "Oui, depuis « Mon espace » : « Déplacer » propose les créneaux encore libres, « Annuler » demande une confirmation. Les conditions d'annulation et de modification sont à préciser par le salon.", "Réservation"),
        q("Comment retrouver mon rendez-vous ?", "Depuis la page « Retrouver mon rendez-vous », avec votre référence et l'adresse e-mail utilisée : un lien d'accès sécurisé vous est envoyé par e-mail.", "Réservation"),
        q("Dois-je verser un acompte ?", "La prise de rendez-vous en ligne ne demande aucun paiement. [À compléter : politique d'acompte du salon, s'il en a une]", "Réservation"),
        q("Combien de temps dure un rendez-vous ?", "La durée dépend de la prestation et figure sur chacune : de 30 minutes pour un brushing à 2 h 30 pour un balayage (durées de démonstration).", "Réservation"),
        q("Quelles prestations proposez-vous ?", "Coupe, couleur, coiffage et soins : voyez la page « Prestations & tarifs ».", "Prestations"),
        q("Pourquoi certains prix sont-ils « à partir de » ?", "Le prix affiché est un prix de départ ; le tarif final dépend des options définies par le salon et vous est confirmé avant la prestation.", "Prestations"),
        q("Puis-je choisir la personne qui me coiffe ?", "Oui, à la deuxième étape de la prise de rendez-vous, parmi les membres de l'équipe qui réalisent la prestation choisie, ou « Sans préférence ».", "Prestations"),
        q("Que faut-il prévoir pour ma visite ?", "Venez avec vos envies, éventuellement des photos d'inspiration, et prévoyez la durée indiquée pour la prestation.", "Votre visite"),
        q("Où se trouve le salon ?", "[À compléter : adresse et accès du salon]", "Votre visite"),
        q("Que se passe-t-il si j'arrive en retard ?", "[À compléter : règle du salon en cas de retard]", "Votre visite"),
      ]),
    ] },
    "retrouver-mon-rendez-vous": { seo: "Retrouver mon rendez-vous avec sa référence.", rows: [
      S("an-lookup", { image_asset: file("retrouver-rendez-vous"), image_position: "50% 50%", login_link: ACCOUNT, register_link: ACCOUNT }),
    ] },
    "mon-espace": { seo: "Mon espace : rendez-vous, informations et préférences.", rows: [
      S("an-account", { image_asset: file("mon-rendez-vous"), image_position: "50% 50%", book_link: BOOK, lookup_link: anUrl("retrouver-mon-rendez-vous") }),
    ] },
    "deplacer-mon-rendez-vous": { seo: "Déplacer ou annuler mon rendez-vous.", rows: [
      S("an-move", { image_asset: file("deplacer-rendez-vous"), image_position: "50% 50%", account_link: ACCOUNT, lookup_link: anUrl("retrouver-mon-rendez-vous") }),
    ] },
    "informations-legales": { seo: "Informations légales : mentions légales.", rows: [legal(1, "Mentions légales", p("[À renseigner]"))] },
    confidentialite: { seo: "Politique de confidentialité.", rows: [legal(2, "Confidentialité", p("[À renseigner]") + p("Pour un rendez-vous, le site demande : prénom, nom, e-mail, téléphone et, facultativement, une note. Responsable du traitement, durée de conservation et droits : [À renseigner]."))] },
    "conditions-de-reservation": { seo: "Conditions de réservation.", rows: [legal(3, "Conditions de réservation", p("[À renseigner]") + p("Conditions d'annulation et de modification, retard, absence et éventuel acompte : à préciser par le salon avant publication."))] },
    cookies: { seo: "Cookies et traceurs.", rows: [legal(4, "Cookies", p("Les cookies nécessaires mémorisent dans votre navigateur votre choix de cookies et le rendez-vous en cours. La mesure d'audience reste désactivée tant que vous ne l'avez pas acceptée.") + p('<a href="#" data-an-cookies-reset>Modifier mes choix de cookies</a>'))] },
  };
  for (const key of Object.keys(spec.templates)) if (key.startsWith("page.")) delete spec.templates[key];
  spec.templates.page = tpl([S("main-page", { width: "narrow", color_scheme: "scheme-1" })]);
  spec.store.pages = AN_PAGES.map((pg) => {
    spec.templates[`page.${pg.suffix}`] = tpl(pages[pg.handle].rows);
    return { handle: pg.handle, title: pg.fr, template_suffix: pg.suffix, body_html: "", seo: { title: `${pg.fr} — ATELIER NUANCE`, description: pages[pg.handle].seo } };
  });
  spec.templates["404"] = tpl([S("an-state", { state: "not_found", image_asset: file("creneau-indisponible"), image_position: "50% 50%", heading: "Page introuvable", text: p("La page que vous recherchez n'existe pas ou a été déplacée."), button_label: "Retour à l'accueil", button_link: "/", button2_label: "Voir les prestations", button2_link: SERVICES })]);
  const links = [{ title: "Le salon", url: SALON }, { title: "Prestations & tarifs", url: SERVICES }, { title: "Inspirations", url: anUrl("inspirations") }, { title: "Contact", url: CONTACT }];
  // Ordinateur : les quatre liens des planches ; le menu du téléphone donne aussi le journal, la FAQ et l'espace client.
  const more = [{ title: "Journal", url: anUrl("journal") }, { title: "Questions fréquentes", url: anUrl("faq") }, { title: "Mon espace", url: ACCOUNT }];
  spec.store.menus = { "main-menu": { title: "Menu principal", links: [...links, ...more] }, footer: { title: "Navigation", links: [...links.slice(0, 3), more[0], links[3], more[2]] } };
}
