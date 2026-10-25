/**
 * Atelier Rive refait d'après le dossier du 23 octobre (`docs/design/atelier-rive-reference-20261023/`, approuvé par
 * Thomas : « Tant que c'est très proche de la maquette oui »). Projet de services composé par le vrai moteur dans le
 * thème « rive », puis rédigé avec les textes des maquettes : accueil, prestations, projets filtrables, un détail par
 * projet (même modèle), l'atelier, contact et mentions légales. Médias suivis dans `public/theme-assets/rive/`
 * (reconstitutions IA approuvées, non identiques aux maquettes au pixel près).
 *
 * Rien d'inventé : Atelier Rive est une marque de démonstration ; les projets sont des exemples illustratifs (aucun
 * client, chiffre, délai, équipe ou diplôme), annoncés comme tels sur les pages projets ; aucun message n'est envoyé.
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
import { sectionSchema, withDefaults, type SectionInstance, type TemplateJson, type ThemeSpec } from "../src/lib/theme/spec";
import { seedHoldout } from "./lot1-holdout-fixtures";
import { hidePendingBlocks } from "./engine-demo-copy";

export const RIVE_PROVENANCE = "Dossier Atelier Rive du 23 octobre 2026 (docs/design/atelier-rive-reference-20261023) — démonstration du studio, reconstitutions IA approuvées par Thomas, sans personne, aucun envoi réel";
export const RIVE_DIR = path.join(process.cwd(), "public", "theme-assets", "rive");
export type RiveMedia = { file: string; role: string; alt: string };
/** Les 14 médias du manifeste, dans l'ordre ; rôle d'import et description d'après la photo réellement livrée. */
export const RIVE_MEDIA: RiveMedia[] = [
  { file: "01-hero-salon.webp", role: "lifestyle", alt: "Salon d'un appartement ancien : canapé clair arrondi, fauteuil prune, table basse en pierre, grandes fenêtres et bibliothèque en bois." },
  { file: "02-projet-salon.webp", role: "scene", alt: "Salon haussmannien lumineux : canapé blanc arrondi, table basse en bois, moulures et parquet." },
  { file: "03-projet-cuisine.webp", role: "scene", alt: "Petite cuisine en bois clair avec îlot, tabourets et suspensions, ouverte sur une fenêtre." },
  { file: "04-projet-jardin.webp", role: "scene", alt: "Salle à manger ouverte sur le jardin par une grande baie vitrée, table et chaises en bois." },
  { file: "05-bandeau-cuisine.webp", role: "banner", alt: "Cuisine en bois avec un grand îlot en marbre veiné et des tabourets." },
  { file: "06-matieres.webp", role: "detail", alt: "Échantillons de matières posés les uns sur les autres : bois, pierre et tissu." },
  { file: "07-chaise.webp", role: "detail", alt: "Chaise en bois aux lignes arrondies sur fond clair." },
  { file: "08-plan-matieres.webp", role: "detail", alt: "Plan d'aménagement dessiné à la main, échantillons de bois, de pierre et de tissu, branche d'olivier." },
  { file: "09-chambre.webp", role: "scene", alt: "Chambre au mur terracotta : lit en lin clair, banc en bois, suspension en papier." },
  { file: "10-espace-professionnel.webp", role: "scene", alt: "Espace de travail lumineux : bureau en bois, chaise noire, bibliothèque et baie vitrée sur des plantes." },
  { file: "11-atelier-plans.webp", role: "scene", alt: "Table de travail en bois couverte de plans, d'échantillons de tissus et de matériaux." },
  { file: "12-salon-jardin.webp", role: "scene", alt: "Séjour ouvert sur un jardin d'oliviers : canapé d'angle clair, table basse ronde, étagères en bois." },
  { file: "13-cuisine-prestations.webp", role: "scene", alt: "Cuisine ouverte sur un jardin d'oliviers : îlot en pierre claire, meubles en bois, suspensions noires." },
  { file: "14-detail-table.webp", role: "detail", alt: "Table basse en pierre avec un vase noir garni de feuillage, un carnet de plans et des échantillons." },
];

const p = (s: string) => `<p>${s}</p>`;
const ul = (items: string[]) => `<ul>${items.map((x) => `<li>${x}</li>`).join("")}</ul>`;
const CONTACT = "/pages/contact";
const NOTE_PROJET = "Projet de démonstration : lieu, besoin et photos sont illustratifs.";

/** Projets d'exemple : chaque carte ouvre sa propre page, avec ses propres photos (réserve du dossier sur les deux salons). */
export const RIVE_PROJECTS = [
  { handle: "projet-appartement-haussmannien", name: "Appartement haussmannien", headline: "Un salon pour se retrouver", place: "Appartement haussmannien — Paris", tag: "Appartements", teaser: "L'élégance d'origine, un confort d'aujourd'hui.", image: "02-projet-salon.webp",
    intro: "Un séjour ancien rendu plus doux à vivre : un canapé enveloppant, des matières claires et la lumière des grandes fenêtres.",
    need: ["recevoir sans encombrer le salon.", "L'idée : garder les moulures et le parquet, et trouver une place pour chacun autour de la table basse."],
    answer: ["des formes douces, des matières claires.", "Un canapé arrondi, une table basse en bois et des rangements discrets laissent toute leur place aux volumes d'origine."],
    photos: [["01-hero-salon.webp", "Une autre vue du séjour."], ["08-plan-matieres.webp", "Plan et matières, à titre illustratif."], ["06-matieres.webp", "Bois, pierre et tissu choisis ensemble."]] },
  { handle: "projet-maison-pinede", name: "Maison sur la pinède", headline: "Un salon pour se retrouver.", place: "Maison familiale au vert", tag: "Maisons", teaser: "Une maison ouverte sur la nature.", image: "13-cuisine-prestations.webp", hero: "12-salon-jardin.webp",
    intro: "Un espace de vie ouvert et chaleureux, pensé pour partager des moments simples, au quotidien.",
    need: ["recevoir sans se sentir à l'étroit.", "L'idée : un salon convivial, relié à l'extérieur, avec plus de rangements et une circulation plus fluide entre la cuisine et le séjour."],
    answer: ["ouvrir les circulations, intégrer les rangements.", "Les volumes sont repensés pour un espace plus généreux et lumineux, avec des rangements sur mesure et des matériaux naturels qui apportent chaleur et caractère."],
    photos: [["13-cuisine-prestations.webp", "La cuisine, ouverte sur le jardin."], ["08-plan-matieres.webp", "Plan illustratif."], ["14-detail-table.webp", "Des matières naturelles et intemporelles."]] },
  { handle: "projet-appartement-lumiere", name: "Appartement Lumière", headline: "Une chambre pour ralentir", place: "Appartement — chambre", tag: "Appartements", teaser: "Des volumes apaisés pour un quotidien plus doux.", image: "09-chambre.webp",
    intro: "Une chambre calme : un mur couleur terre, du lin clair, du bois et une lumière douce.",
    need: ["un lieu pour se reposer vraiment.", "L'idée : une pièce simple, sans objet de trop, où la lumière du jour reste douce."],
    answer: ["une couleur chaude, des matières naturelles.", "Un mur terracotta, un lit en lin et un banc en bois suffisent à donner du caractère à la pièce."],
    photos: [["06-matieres.webp", "Des matières choisies ensemble."], ["08-plan-matieres.webp", "Plan illustratif."], ["07-chaise.webp", "Un mobilier aux lignes douces."]] },
  { handle: "projet-espace-professionnel", name: "Espace professionnel", headline: "Un lieu de travail chaleureux", place: "Espace professionnel", tag: "Espaces professionnels", teaser: "Un lieu de travail chaleureux et fonctionnel.", image: "10-espace-professionnel.webp",
    intro: "Un espace de travail lumineux, ouvert sur des plantes, avec une grande table et des rangements à portée de main.",
    need: ["travailler au calme, ranger sans encombrer.", "L'idée : un bureau accueillant, où les dossiers et les livres trouvent leur place."],
    answer: ["une bibliothèque, une table, la lumière.", "Une bibliothèque toute hauteur, une grande table en bois et la baie vitrée gardée libre."],
    photos: [["08-plan-matieres.webp", "Plan illustratif."], ["06-matieres.webp", "Bois et pierre pour les surfaces."], ["07-chaise.webp", "Une assise simple et confortable."]] },
  { handle: "projet-studio-paris", name: "Studio — Paris 11e", headline: "Un petit espace qui respire", place: "Studio — Paris 11e", tag: "Appartements", teaser: "Une cuisine compacte, des rangements partout.", image: "03-projet-cuisine.webp",
    intro: "Un petit logement où chaque centimètre compte : une cuisine en bois clair, un îlot et de la lumière.",
    need: ["cuisiner et recevoir dans un petit espace.", "L'idée : une cuisine complète, sans que la pièce paraisse encombrée."],
    answer: ["du bois clair, un îlot, des rangements jusqu'au plafond.", "Des façades en bois clair, un îlot qui sert aussi de table et des rangements sur toute la hauteur."],
    photos: [["08-plan-matieres.webp", "Plan illustratif."], ["06-matieres.webp", "Bois, pierre et tissu choisis ensemble."], ["07-chaise.webp", "Des assises aux lignes douces."]] },
  { handle: "projet-maison-jardin", name: "Maison contemporaine", headline: "Une maison ouverte sur le jardin", place: "Maison contemporaine — Île-de-France", tag: "Maisons", teaser: "La salle à manger ouverte sur le jardin.", image: "04-projet-jardin.webp",
    intro: "Une salle à manger qui s'ouvre sur le jardin par une grande baie : une longue table en bois et la lumière du dehors.",
    need: ["profiter du jardin toute l'année.", "L'idée : une pièce de vie tournée vers l'extérieur, simple à vivre au quotidien."],
    answer: ["une grande baie, une table pour tous.", "Une table en bois pour réunir la famille, des chaises légères et une circulation libre jusqu'à la terrasse."],
    photos: [["08-plan-matieres.webp", "Plan illustratif."], ["14-detail-table.webp", "Des matières naturelles et intemporelles."], ["06-matieres.webp", "Bois et pierre pour les surfaces."]] },
] as const;

/** Projet de services composé par le moteur dans le thème « rive », puis rédigé d'après les maquettes. */
export async function riveProject(userId: string) {
  const pid = seedHoldout(userId, 2, "Démo Atelier Rive");
  const product = { ...emptyProduct(), name: "Aménagement et décoration intérieure", nameStatus: "provided" as const, category: "Architecture d'intérieur", sector: "services" as never, summary: "Conseil, aménagement et accompagnement pour des intérieurs pensés autour de votre façon de vivre." };
  saveProduct(pid, product);
  const services = {
    ...emptyServiceProfile(),
    services: [
      { key: "conseil", name: "Conseil", description: "Un regard expert pour débloquer vos idées et faire les bons choix." },
      { key: "amenagement", name: "Aménagement", description: "Une conception sur mesure, du plan aux détails." },
      { key: "accompagnement", name: "Accompagnement", description: "Un suivi à vos côtés jusqu'à la réalisation." },
    ],
    contactMode: "form" as const, contactModes: ["form" as const],
  };
  const local = localBrand(product, "Atelier Rive", { business: "services", services });
  saveBrand(pid, { ...local.brand, name: "Atelier Rive", generatedBy: "local" as const, tagline: "Un intérieur pensé pour votre façon de vivre.", story: "Atelier Rive est une marque de démonstration du studio : des intérieurs pensés à partir de la vie de ceux qui les habitent.", positioning: "Des intérieurs beaux, fonctionnels et durables, pensés autour de votre quotidien.", palette: { primary: "#37152C", secondary: "#F4F1F2", accent: "#37152C", light: "#FFFFFF", dark: "#1E1A1D" }, direction: "rive" });
  saveStrategy(pid, local.strategy);
  saveServices(pid, services);
  run("UPDATE projects SET store_type = ?, business_type = ?, updated_at = ? WHERE id = ?", "mono", "services", now(), pid);
  saveSettings(pid, { ...loadProject(pid).settings, storeKind: "services" });
  const missing: string[] = [];
  const ids: Record<string, string> = {};
  for (const m of RIVE_MEDIA) {
    const source = path.join(RIVE_DIR, m.file);
    if (!fs.existsSync(source) || fs.statSync(source).size === 0) { missing.push(m.file); continue; }
    const bytes = fs.readFileSync(source), meta = await sharp(bytes).metadata();
    const a = await saveAsset({ projectId: pid, userId, data: bytes, mime: "image/webp", name: `rive-${m.file}`, origin: "upload", role: m.role, status: "approved", meta: { demo: { isDemo: true, provenance: RIVE_PROVENANCE }, width: meta.width, height: meta.height, alt: m.alt } });
    ids[m.file] = a.id;
  }
  const built = await composeShop(pid, "rive", null, false);
  const homeOrder = built.spec.templates.index.order.map((k) => built.spec.templates.index.sections[k].type);
  curateRive(built.spec, ids);
  return { pid, spec: built.spec, missing, homeOrder, project: loadProject(pid) };
}

/** Rédaction d'après les maquettes : mêmes sections que le thème pour l'accueil, puis les pages intérieures. */
export function curateRive(spec: ThemeSpec, ids: Record<string, string>) {
  const name = (file: string) => `rive-${file}`;
  for (const [file, aid] of Object.entries(ids)) spec.files[name(file)] = aid;
  const alt = (file: string) => RIVE_MEDIA.find((m) => m.file === file)?.alt ?? "";
  const img = (file: string, key = "image") => ({ [`${key}_asset`]: ids[file] ? name(file) : "", [`${key}_alt`]: alt(file) });
  const section = (type: string, settings: Record<string, unknown>, blocks: { type: string; settings: Record<string, unknown> }[] = []): SectionInstance => {
    const schema = sectionSchema(spec, type); if (!schema) throw new Error(`Section absente ${type}`);
    return { type, settings: withDefaults(schema.settings, settings), blocks: Object.fromEntries(blocks.map((b, i) => [`b${i}`, { type: b.type, settings: withDefaults(schema.blocks.find((x) => x.type === b.type)?.settings, b.settings) }])), block_order: blocks.map((_, i) => `b${i}`) };
  };
  const template = (rows: [string, SectionInstance][]): TemplateJson => ({ order: rows.map(([k]) => k), sections: Object.fromEntries(rows) });
  const pad = (top: number, bottom = top) => ({ padding_top: top, padding_bottom: bottom });
  const cardCta = (heading: string, text: string, file: string, button = "Nous contacter") => section("cta-banner", { style: "card", heading, text: p(text), button_label: button, button_link: CONTACT, image_asset: ids[file] ? name(file) : "", parallax: false, overlay: 0, color_scheme: "scheme-1", ...pad(24, 56) });
  const opening = (heading: string, text: string, file: string, label = "") => section("ed-scene", { layout: "split", heading_tag: "h1", label, heading, text: p(text), ...img(file), text_side: "left", motion: "none", color_scheme: "scheme-1", ...pad(24, 56) });

  // ── Accueil (maquette 01) ────────────────────────────────────────────────────────────────────────────────────────
  const homeProjects = [RIVE_PROJECTS[0], RIVE_PROJECTS[4], RIVE_PROJECTS[5]];
  const index: [string, SectionInstance][] = [
    ["rive_opening", section("ed-opening", { layout: "banner", heading_tag: "h1", label: "", heading: "Enfin\nchez vous.", text: p("Un intérieur pensé pour votre façon de vivre."), button_label: "Parlons de votre projet", button_link: CONTACT, button2_label: "Découvrir les projets", button2_link: "#projets", ...img("01-hero-salon.webp"), focus_x: 50, focus_y: 50, mobile_focus_x: 38, mobile_focus_y: 50, copy_surface: false, motion: "none", color_scheme: "scheme-1", ...pad(0) })],
    ["rive_needs", section("fs-needs", { layout: "row", align: "left", eyebrow: "", heading: "Plus de place\npour ce qui compte.", text: p("Des intérieurs beaux, fonctionnels et durables, pensés autour de votre quotidien."), effect: "none", color_scheme: "scheme-1", ...pad(64, 24) }, [
      { type: "need", settings: { icon: "plan", title: "Mieux circuler", text: p("Des espaces fluides et bien pensés.") } },
      { type: "need", settings: { icon: "shelves", title: "Ranger sans encombrer", text: p("Des solutions sur mesure et élégantes.") } },
      { type: "need", settings: { icon: "plant", title: "Se sentir bien", text: p("Des intérieurs qui vous ressemblent vraiment.") } },
    ])],
    ["rive_projects", section("portfolio", { anchor: "projets", layout: "asym", eyebrow: "", heading: "", text: "", show_filters: false, show_tags: false, caption_style: "kicker", link_style: "arrow", button_label: "Voir tous les projets", button_link: "/pages/projets", color_scheme: "scheme-1", ...pad(16, 32) },
      homeProjects.map((x) => ({ type: "project", settings: { image_asset: name(x.image), title: x.headline.replace(/\.$/, ""), caption: x.place, tag: x.tag, link: `/pages/${x.handle}` } })))],
    ["rive_services", section("services-list", { layout: "thumbs", action_style: "arrow", columns: 3, eyebrow: "", heading: "Un coup de pouce\nou un projet complet.", text: p("Trois façons de travailler ensemble, selon vos besoins."), button_label: "Découvrir la prestation", button_link: "/pages/prestations", highlight_label: "", note: "", footer_label: "", color_scheme: "scheme-1", ...pad(32) }, [
      { type: "service", settings: { title: "Conseil", text: p("Un regard expert pour débloquer vos idées et faire les bons choix."), icon: "none", image_asset: name("06-matieres.webp"), button_label: "Découvrir le conseil", button_link: "/pages/prestations" } },
      { type: "service", settings: { title: "Aménagement", text: p("Une conception sur mesure, du plan aux détails."), icon: "none", image_asset: name("07-chaise.webp"), button_label: "Découvrir l'aménagement", button_link: "/pages/prestations" } },
      { type: "service", settings: { title: "Accompagnement", text: p("Un suivi à vos côtés jusqu'à la réalisation."), icon: "none", image_asset: name("14-detail-table.webp"), button_label: "Découvrir l'accompagnement", button_link: "/pages/prestations" } },
    ])],
    ["rive_method", section("timeline", { layout: "columns", eyebrow: "", heading: "Comment ça se passe ?", heading_accent: "", ...img("08-plan-matieres.webp"), color_scheme: "scheme-1", ...pad(32, 24) }, [
      { type: "step", settings: { title: "On vous écoute.", text: p("Nous échangeons sur vos envies, votre mode de vie et vos contraintes.") } },
      { type: "step", settings: { title: "On dessine.", text: p("Nous imaginons un projet sur mesure, concret et réaliste.") } },
      { type: "step", settings: { title: "Vous vous projetez.", text: p("Plans, visuels et choix de matériaux pour vous permettre de vous projeter sereinement.") } },
    ])],
    ["rive_band", section("ed-scene", { layout: "band", text_side: "left", band_height: "medium", text_offset: 44, label: "", heading: "Des lieux de vie\nqui vous ressemblent,\naujourd'hui et demain.", text: "", button_label: "", ...img("05-bandeau-cuisine.webp"), focus_x: 50, focus_y: 55, mobile_focus_x: 60, veil: true, motion: "none", color_scheme: "scheme-2", ...pad(0) })],
    ["rive_faq", section("faq", { layout: "side", style: "lines", heading: "Vos questions, nos réponses", text: "", structured_data: false, open_first: false, color_scheme: "scheme-1", ...pad(32, 48) }, [
      { type: "question", settings: { question: "Comment se déroule un premier échange ?", answer: p("Vous nous décrivez votre lieu, vos envies et ce qui vous gêne aujourd'hui ; nous vous disons comment nous pouvons vous accompagner.") } },
      { type: "question", settings: { question: "Proposez-vous un accompagnement jusqu'aux travaux ?", answer: p("Oui : la prestation « Accompagnement » comprend la consultation des artisans, le suivi du chantier, la mise en place et les finitions.") } },
      { type: "question", settings: { question: "Travaillez-vous sur tout type de bien ?", answer: p("Appartements, maisons et espaces professionnels : chaque lieu est pensé pour ceux qui y vivent ou y travaillent.") } },
    ])],
    ["rive_cta", section("cta-banner", { style: "split", heading: "Votre intérieur peut\nchanger votre quotidien.", text: p("Échangeons sur votre projet et imaginons ensemble un lieu qui vous ressemble."), button_label: "Racontez-nous votre projet", button_link: CONTACT, image_asset: "", parallax: false, overlay: 0, color_scheme: "scheme-2", ...pad(56) })],
  ];
  spec.templates.index = template(index);

  // ── Pages intérieures (maquettes 02 et 03) ───────────────────────────────────────────────────────────────────────
  const pages: { handle: string; title: string; seo: { title: string; description: string }; rows: [string, SectionInstance][] }[] = [];
  const page = (handle: string, title: string, seo: { title: string; description: string }, rows: [string, SectionInstance][]) => pages.push({ handle, title, seo, rows });

  page("prestations", "Prestations", { title: "Prestations | Atelier Rive, aménagement intérieur", description: "Y voir plus clair, repenser votre espace, être accompagné jusqu'au bout : trois prestations, de la première idée au lieu où vous aimez vivre." }, [
    ["opening", opening("De la première idée\nau lieu où vous\naimez vivre.", "Des prestations sur mesure pour faire les bons choix à chaque étape, et donner forme à un intérieur qui vous ressemble.", "13-cuisine-prestations.webp")],
    ["offers", section("services-list", { layout: "cards", action_style: "button", columns: 3, eyebrow: "", heading: "", text: "", button_label: "Parlons de vos besoins", button_link: CONTACT, highlight_label: "", note: "", footer_label: "", color_scheme: "scheme-1", ...pad(24, 48) }, [
      { type: "service", settings: { title: "Y voir plus clair", text: p("Un premier regard expert pour vous aider à structurer vos idées et définir la bonne direction.") + ul(["Échange sur vos besoins", "Conseils d'aménagement et d'ambiance", "Pistes concrètes et priorisées"]), icon: "none", image_asset: name("08-plan-matieres.webp"), button_label: "Parlons de vos besoins", button_link: CONTACT } },
      { type: "service", settings: { title: "Repenser votre espace", text: p("Une conception sur mesure pour révéler tout le potentiel de votre lieu.") + ul(["Plans et scénarios d'aménagement", "Sélection de matériaux et de mobilier", "Visualisations réalistes"]), icon: "none", image_asset: name("05-bandeau-cuisine.webp"), button_label: "Parlons de vos besoins", button_link: CONTACT } },
      { type: "service", settings: { title: "Être accompagné jusqu'au bout", text: p("Un suivi attentif pour un projet serein, du concept à la réalisation.") + ul(["Consultation des artisans", "Suivi du chantier", "Mise en place et finitions"]), icon: "none", image_asset: name("10-espace-professionnel.webp"), button_label: "Parlons de vos besoins", button_link: CONTACT } },
    ])],
    ["method", section("timeline", { layout: "columns", eyebrow: "", heading: "Notre façon de travailler", heading_accent: "", image_asset: "", aside_heading: "Parlons de votre projet", aside_text: "Un premier échange pour voir comment nous pouvons vous accompagner.", aside_button_label: "Nous contacter", aside_button_link: CONTACT, color_scheme: "scheme-1", ...pad(32, 64) }, [
      { type: "step", settings: { title: "Écoute", text: p("Comprendre votre mode de vie et vos envies.") } },
      { type: "step", settings: { title: "Conception", text: p("Imaginer des solutions justes et durables.") } },
      { type: "step", settings: { title: "Réalisation", text: p("Vous accompagner à chaque étape jusqu'au lieu final.") } },
    ])],
  ]);

  const projectsOrder = [RIVE_PROJECTS[0], RIVE_PROJECTS[1], RIVE_PROJECTS[2], RIVE_PROJECTS[3], RIVE_PROJECTS[4], RIVE_PROJECTS[5]];
  page("projets", "Projets", { title: "Projets | Atelier Rive, des lieux faits pour être vécus", description: "Appartements, maisons, espaces professionnels : des exemples de projets d'aménagement, filtrables par type de lieu." }, [
    ["gallery", section("portfolio", { layout: "asym", heading_tag: "h1", eyebrow: "", heading: "Des lieux faits pour être vécus.", text: p("Appartements, maisons, espaces professionnels : chaque projet est une histoire singulière, pensée pour son lieu et pour ceux qui y vivent.") + p("<small>Projets de démonstration : lieux, besoins et photos sont illustratifs.</small>"), show_filters: true, all_label: "Tous", show_tags: false, caption_style: "text", link_style: "label", link_label: "Voir le projet", button_label: "", color_scheme: "scheme-1", ...pad(24, 40) },
      projectsOrder.map((x) => ({ type: "project", settings: { image_asset: name(x.image), title: x.name, caption: x.teaser, tag: x.tag, link: `/pages/${x.handle}` } })))],
    ["cta", cardCta("Vous avez un projet ?", "Parlez-nous de votre lieu, de vos envies et des possibilités.", "14-detail-table.webp")],
  ]);

  RIVE_PROJECTS.forEach((x, i) => {
    const prev = RIVE_PROJECTS[(i + RIVE_PROJECTS.length - 1) % RIVE_PROJECTS.length], next = RIVE_PROJECTS[(i + 1) % RIVE_PROJECTS.length];
    const hero = "hero" in x ? x.hero : x.image;
    page(x.handle, x.name, { title: `${x.name} | Projet de démonstration Atelier Rive`, description: `${x.teaser} Exemple de projet d'aménagement : besoin, réponse et détails en images.`.slice(0, 160) }, [
      ["opening", opening((x.headline.endsWith(".") ? x.headline : `${x.headline}.`).replace(/^(\S+ \S+) /, "$1\n"), x.intro, hero, x.place)],
      ["case", section("fs-case", { layout: "detail", eyebrow: "", heading: "", text: p(NOTE_PROJET), align: "left", label_request: "Le besoin :", label_answer: "Notre réponse :", client_type: "", location: "", year: "", effect: "none", nav_label: "Autres projets", prev_label: "Projet précédent", prev_title: prev.name, prev_link: `/pages/${prev.handle}`, next_label: "Projet suivant", next_title: next.name, next_link: `/pages/${next.handle}`, color_scheme: "scheme-1", ...pad(24, 32) }, [
        { type: "part", settings: { kind: "request", title: x.need[0], text: p(x.need[1]) } },
        { type: "part", settings: { kind: "answer", title: x.answer[0], text: p(x.answer[1]) } },
        ...x.photos.map(([file, caption]) => ({ type: "photo", settings: { ...img(file), caption } })),
      ])],
      ["cta", cardCta("Un projet similaire ?", "Parlez-nous de vos envies, même à un stade très simple.", x.image)],
    ]);
  });

  page("atelier", "L'atelier", { title: "L'atelier | Atelier Rive, des intérieurs pensés pour votre vie", description: "Nous partons de votre vie, pas d'un catalogue : une écoute sincère, des espaces fonctionnels et une personnalité unique." }, [
    ["about", section("about", { layout: "stacked", heading_tag: "h1", eyebrow: "", heading: "Nous partons de votre vie,\npas d'un catalogue.", heading_accent: "", ...img("11-atelier-plans.webp"), image_caption: "", lead: p("Des intérieurs sur mesure, pensés pour votre quotidien. Nous imaginons des lieux fonctionnels, durables et sensibles, en prenant le temps de comprendre ce qui compte pour vous.") + p("<small>Atelier Rive est une marque de démonstration du studio.</small>"), why_title: "", why_text: "", commit_title: "", commit_text: "", signature: "", values_title: "", button_label: "", color_scheme: "scheme-1", ...pad(24, 40) }, [
      { type: "value", settings: { icon: "none", title: "Une écoute sincère", text: p("Comprendre votre mode de vie pour des lieux qui vous ressemblent."), ...img("10-espace-professionnel.webp") } },
      { type: "value", settings: { icon: "none", title: "Des espaces fonctionnels", text: p("Des volumes intelligents, élégants et durables, pensés pour le réel."), ...img("01-hero-salon.webp") } },
      { type: "value", settings: { icon: "none", title: "Une personnalité unique", text: p("Des matériaux, des couleurs et des détails qui font la différence."), ...img("13-cuisine-prestations.webp") } },
    ])],
    ["cta", cardCta("Envie d'en parler ?", "Un premier échange pour découvrir votre projet.", "05-bandeau-cuisine.webp")],
  ]);

  page("contact", "Contact", { title: "Contact | Atelier Rive, parlons de chez vous", description: "Un premier échange pour comprendre votre projet : votre lieu, votre besoin et vos envies. Formulaire de démonstration, aucun envoi réel." }, [
    ["contact", section("ed-contact", { heading_tag: "h1", label: "", heading: "Et si on parlait\nde chez vous ?", text: p("Un premier échange, sans engagement, pour comprendre votre projet et voir comment nous pouvons vous accompagner."), button_label: "", button_link: "", name_label: "Nom *", name_placeholder: "Votre nom", email_label: "E-mail *", email_placeholder: "votre@email.com", place_label: "Votre lieu", place_placeholder: "Ville, code postal", room_label: "Votre besoin", room_placeholder: "Sélectionnez une option", rooms: "Conseil\nAménagement\nAccompagnement\nAutre", message_label: "Votre projet *", message_placeholder: "Décrivez en quelques mots votre projet, vos envies ou vos questions…", show_files: true, files_label: "Ajouter des photos ou un plan (facultatif)", files_cta: "Choisir des fichiers", files_hint: "JPG, PNG ou PDF", consent_label: "J'accepte que mes données soient utilisées pour me recontacter dans le cadre de ma demande.", consent_link_label: "En savoir plus", consent_link: "/pages/mentions-legales", submit_label: "Envoyer mon projet", success_message: "Merci : votre demande est bien complète.", ...img("10-espace-professionnel.webp"), mobile_image_asset: name("11-atelier-plans.webp"), media_role: "", motion: "none", color_scheme: "scheme-1", ...pad(0) })],
  ]);

  // Mentions légales : la page du moteur, avec ce qui est vrai pour une marque de démonstration.
  const legal = spec.store.pages.find((pg) => pg.template_suffix === "legal");
  spec.store.pages = pages.map((pg) => ({ handle: pg.handle, title: pg.title, template_suffix: pg.handle, body_html: "", seo: pg.seo }));
  for (const key of Object.keys(spec.templates)) if (key.startsWith("page.") && key !== "page.legal") delete spec.templates[key];
  for (const pg of pages) spec.templates[`page.${pg.handle}`] = template([["title", section("main-page", { show_title: false, width: "wide", color_scheme: "scheme-1", padding_top: 0, padding_bottom: 0 })], ...pg.rows]);
  if (legal && spec.templates["page.legal"]) {
    spec.store.pages.push({ ...legal, title: "Mentions légales", seo: { title: "Mentions légales | Atelier Rive", description: "Atelier Rive est une marque de démonstration du studio : aucune entreprise n'est exploitée sous ce nom." } });
    for (const s of Object.values(spec.templates["page.legal"].sections)) if (s.type === "legal-page") s.settings = { ...s.settings, updated: "23 octobre 2026", intro: p("Atelier Rive est une marque de démonstration du studio : aucune entreprise n'est exploitée sous ce nom et aucun message envoyé depuis ce site n'est transmis.") };
  }

  // En-tête, menus et pied de page (maquettes : en-tête blanc, bouton prune ; pied blanc, liens des pages existantes).
  spec.store.menus = {
    "main-menu": { title: "Menu principal", links: [{ title: "Projets", url: "/pages/projets" }, { title: "Prestations", url: "/pages/prestations" }, { title: "L'atelier", url: "/pages/atelier" }] },
    footer: { title: "Pied de page", links: [{ title: "Projets", url: "/pages/projets" }, { title: "Prestations", url: "/pages/prestations" }, { title: "L'atelier", url: "/pages/atelier" }] },
    legal: { title: "Informations", links: [{ title: "Mentions légales", url: "/pages/mentions-legales" }, { title: "Contact", url: CONTACT }] },
  };
  for (const sec of Object.values(spec.groups.header?.sections ?? {})) if (sec.type === "header") sec.settings = { ...sec.settings, menu: "main-menu", layout: "logo-left", shape: "bar", icons: "plain", mega_menu: "none", mobile_menu: "drawer-right", mobile_submenu: "accordion", sticky: true, transparent_on_home: false, show_search: false, show_cart: false, cta_label: "Parlons de votre projet", cta_link: CONTACT, cta_icon: "arrow", phone: "", color_scheme: "scheme-1" };
  for (const g of Object.values(spec.groups)) for (const [sid, sec] of Object.entries(g.sections)) {
    if (sec.type === "announcement-bar") sec.disabled = true;
    if (sec.type !== "footer") continue;
    const schema = sectionSchema(spec, "footer")!;
    g.sections[sid] = { type: "footer", settings: withDefaults(schema.settings, { ...sec.settings, style: "minimal", show_wordmark: true, show_policies: false, show_payment: false, logo_asset: "", tagline: "", color_scheme: "scheme-3" }), blocks: { links: { type: "links", settings: withDefaults(schema.blocks.find((b) => b.type === "links")?.settings, { heading: "", menu: "footer" }) }, legal: { type: "links", settings: withDefaults(schema.blocks.find((b) => b.type === "links")?.settings, { heading: "", menu: "legal" }) } }, block_order: ["links", "legal"] };
  }
  spec.name = "Atelier Rive — thème Atelier Rive (démonstration)";
  spec.meta = { ...spec.meta, demo: { isDemo: true, provenance: RIVE_PROVENANCE, contactTest: false } };
  spec.store.shopName = "Atelier Rive";
  spec.store.seo = { title: "Atelier Rive | Un intérieur pensé pour votre façon de vivre", description: "Conseil, aménagement et accompagnement : des intérieurs beaux, fonctionnels et durables, pensés autour de votre quotidien. Marque de démonstration." };
  spec.settings = { ...spec.settings, logo_asset: "", fab_contact_link: "", fab_back_to_top: false };
  hidePendingBlocks(spec);
}
