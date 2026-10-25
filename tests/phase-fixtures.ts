/**
 * Démonstration PHASE — Électricité (thème `phase`, famille Services), composée d'après les dix planches de Thomas du
 * 25 octobre 2026 (docs/theme-briefs/phase/maquettes, PR documentaire #188).
 *
 * Le projet est créé comme un projet client (marque, prestations, médias avec rôles), composé par le VRAI moteur dans le
 * thème « phase » (composeShop), puis rédigé page par page d'après les planches (sections ph-*, textes lisibles des
 * planches, coquilles corrigées). Artisan électricien FICTIF : réalisations et photos illustratives (« Projet
 * illustratif »), aucune adresse, aucun SIRET, aucun avis, tarif, délai, certification, garantie ni chiffre inventé ;
 * coordonnées, zone d'intervention et mentions légales restent « À renseigner ». Formulaires en démonstration : rien
 * n'est envoyé. Photos : kit privé de Thomas (public/demo/phase/images/, hors dépôt), reconstitutions d'après les
 * planches, réencodées en WebP à l'import (2000 px de large au plus).
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
import type { ThemeSpec } from "../src/lib/theme/spec";
import type { Row } from "../src/lib/theme/theme-catalog";
import { PH_PAGES, phTemplate, phUrl, headerSettings, footerSettings, pageRow, LOOK_06, type PhPageHandle } from "../src/lib/theme/phase";

export const PHASE_PROVENANCE = "PHASE — Électricité (25 octobre 2026) — photographies reconstituées d'après les maquettes, fournies par Thomas (kit privé) ; démonstration du studio, artisan fictif, aucune demande envoyée";
export const PHASE_DIR = path.join(process.cwd(), "public", "demo", "phase", "images");

/** Photos du kit (INVENTAIRE_IMAGES.csv) : fichier, rôle et texte alternatif descriptif (rien d'affirmé sur un chantier réel). */
export const PHASE_MEDIA: { file: string; role: string; alt: string }[] = [
  ["01_accueil_hero", "lifestyle", "Interrupteur sur un mur bleu nuit, ouvert sur un séjour éclairé : canapé, cuisine et suspensions"],
  ["02_installation_renovation", "scene", "Séjour lumineux : canapé, cuisine ouverte et suspensions noires"],
  ["03_tableau_electrique", "detail", "Tableau électrique blanc ouvert dans une entrée"],
  ["04_eclairage_interieur", "scene", "Salon chaleureux le soir : canapé, table basse et suspension"],
  ["05_depannage", "detail", "Tableau électrique dans une entrée, outils et caisse à outils au sol"],
  ["06_renovation_appartement", "scene", "Grand séjour ouvert : canapé d'angle, salle à manger et suspensions"],
  ["07_cuisine_contemporaine", "scene", "Cuisine contemporaine blanche, suspensions et table"],
  ["08_salle_de_bain", "scene", "Salle de bains : miroir rond éclairé et vasque"],
  ["09_tableau_renove", "detail", "Tableau électrique récent, disjoncteurs alignés"],
  ["10_eclairage_exterieur", "scene", "Façade et allée éclairées le soir par des appliques murales"],
  ["11_chambre_eclairage", "scene", "Chambre éclairée par une lampe de chevet et un ruban lumineux"],
  ["12_sejour_renove", "scene", "Séjour lumineux : canapé gris, télévision murale et coin repas"],
  ["13_couloir_eclaire", "scene", "Couloir éclairé par des appliques murales"],
  ["14_maison_installation", "scene", "Séjour et salle à manger d'une maison, suspensions noires"],
  ["15_projet_avant", "scene", "Séjour en cours d'aménagement : canapé et coin repas"],
  ["16_projet_ambiance", "scene", "Salon chaleureux le soir : canapé d'angle et cuisine éclairée"],
  ["17_entreprise_hero", "scene", "Plan d'électricité, mètre ruban et tournevis jaunes sur une table"],
  ["18_installation_neuve", "scene", "Séjour lumineux d'une maison neuve et coin repas"],
  ["19_extension_habitation", "scene", "Extension vitrée d'une maison, éclairée le soir"],
  ["20_spots_plafond", "scene", "Salon éclairé par des spots encastrés et un ruban lumineux"],
  ["21_prise_interrupteur", "detail", "Prise et interrupteur blancs sur un mur clair"],
  ["22_pilotage_confort", "detail", "Écran de commande mural noir près d'un séjour"],
  ["23_conseils_hero", "scene", "Cuisine avec îlot noir et suspensions"],
  ["24_article_eclairage", "scene", "Salle à manger : grande table et suspensions noires"],
  ["25_besoins_plans", "scene", "Plan d'aménagement, prises, interrupteurs et échantillons de matériaux"],
  ["26_renovation_conseil", "scene", "Pièce en rénovation : escabeau, bâche au sol et tableau ouvert"],
].map(([file, role, alt]) => ({ file: `${file}.webp`, role, alt }));

const p = (s: string) => `<p>${s}</p>`;
type B = { type: string; settings: Record<string, unknown> };

/** Prestations de l'artisan fictif (noms des planches ; aucun tarif ni délai). */
export const PHASE_SERVICES = [
  { key: "installation", name: "Installation et rénovation", description: "Des installations adaptées à vos besoins, en neuf comme en rénovation." },
  { key: "tableau", name: "Tableau et sécurité", description: "Un tableau bien pensé pour une installation fiable et évolutive." },
  { key: "eclairage", name: "Éclairage intérieur et extérieur", description: "Des solutions d'éclairage pour sublimer vos espaces et améliorer votre confort." },
  { key: "depannage", name: "Dépannage électrique", description: "Une analyse claire de votre situation pour identifier la solution la plus adaptée." },
];

export async function phaseProject(userId: string, options: { mediaDir?: string } = {}) {
  const dir = options.mediaDir ?? PHASE_DIR;
  const pid = seedHoldout(userId, 2, "Démo PHASE");
  const product = { ...emptyProduct(), name: "Électricien", nameStatus: "provided" as const, category: "Électricité", sector: "services" as never, summary: "Artisan électricien fictif de démonstration : installation, rénovation, tableau, éclairage et dépannage.", facts: [], variants: [] };
  saveProduct(pid, product);
  const local = localBrand(product, "PHASE", { business: "services", services: { ...emptyServiceProfile(), services: PHASE_SERVICES } });
  const palette = { primary: "#141B30", secondary: "#F4F6F9", accent: "#F2F55C", light: "#FFFFFF", dark: "#141B30" };
  saveBrand(pid, { ...local.brand, name: "PHASE", generatedBy: "local" as const, tagline: "Le courant passe. La confiance aussi.", story: "Des installations pensées pour votre quotidien, du premier échange aux dernières finitions.", positioning: "Artisan électricien fictif : installation, rénovation, éclairage et dépannage.", palette, direction: "phase" });
  saveStrategy(pid, local.strategy);
  saveServices(pid, { ...emptyServiceProfile(), services: PHASE_SERVICES, contactMode: "form", contactModes: ["form"] });
  run("UPDATE projects SET store_type = ?, business_type = ?, updated_at = ? WHERE id = ?", "mono", "services", now(), pid);
  saveSettings(pid, { ...loadProject(pid).settings, storeKind: "services" });

  const missing: string[] = [];
  const ids: Record<string, string> = {};
  for (const m of PHASE_MEDIA) {
    const source = path.join(dir, m.file);
    if (!fs.existsSync(source) || fs.statSync(source).size === 0) { missing.push(m.file); continue; }
    const bytes = await sharp(fs.readFileSync(source)).resize({ width: 2000, withoutEnlargement: true }).webp({ quality: 86 }).toBuffer();
    const meta = await sharp(bytes).metadata();
    const a = await saveAsset({ projectId: pid, userId, data: bytes, mime: "image/webp", name: m.file, origin: "upload", role: m.role, status: "approved", meta: { demo: { isDemo: true, provenance: PHASE_PROVENANCE }, width: meta.width, height: meta.height, alt: m.alt } });
    ids[m.file] = a.id;
  }
  const built = await composeShop(pid, "phase", null, false);
  const spec: ThemeSpec = built.spec;
  const catalogOrder = spec.templates.index.order.map((k) => spec.templates.index.sections[k].type);
  curatePhase(spec, ids);
  return { pid, spec, missing, catalogOrder, project: loadProject(pid) };
}

/** Rédaction de la démonstration d'après les planches 01 à 10 (sections ph-*, textes des planches). */
export function curatePhase(spec: ThemeSpec, ids: Record<string, string>) {
  for (const [name, aid] of Object.entries(ids)) spec.files[name] = aid;
  const f = (name: string) => (ids[`${name}.webp`] ? `${name}.webp` : "");
  const alt = (name: string) => PHASE_MEDIA.find((m) => m.file === `${name}.webp`)?.alt ?? "";
  const U = (h: PhPageHandle) => phUrl(h);
  const S = (type: string, settings: Record<string, unknown>, blocks: B[] = []): Row => [type, settings, blocks];
  const QUOTE = U("demande-de-devis");

  spec.name = "PHASE — Électricité — thème Phase (démonstration)";
  spec.meta = { ...spec.meta, reference: undefined, demo: { isDemo: true, provenance: PHASE_PROVENANCE, contactTest: false } };
  spec.store.shopName = "PHASE ÉLECTRICITÉ";
  spec.store.business = "services";
  spec.store.paymentTypes = [];
  spec.store.seo = { title: "PHASE ÉLECTRICITÉ | Le courant passe. La confiance aussi.", description: "Artisan électricien (démonstration) : installation, rénovation, tableau, éclairage et dépannage. Réalisations illustratives, coordonnées à renseigner." };

  // ------------------------------------------------------------------------------------------- Accueil (planches 01 et 06)
  spec.templates.index = phTemplate([
    S("ph-hero", { layout: "home", title_size: 86, eyebrow: "Installation • Rénovation • Dépannage", heading: "Le courant passe.\n[y]La confiance aussi.[/y]", text: p("Des installations pensées pour votre quotidien,<br>du premier échange aux dernières finitions."), button_label: "Parlons de votre projet", button_link: QUOTE, button2_label: "Voir les prestations", button2_link: U("prestations"), image_asset: f("01_accueil_hero"), image_alt: alt("01_accueil_hero"), image_w: 1544, image_x: 285, image_y: 0, image_position_mobile: "72% 50%", photo_w: 740, detail_asset: f("01_accueil_hero"), detail_w: 1706, detail_x: -187, detail_y: -408, caption: "Visuel de démonstration", circuit: "home", note: "L'énergie\nd'un quotidien\nplus simple.", height: 869, height_mobile: 230 }),
    S("ph-cards", { layout: "strip", columns: 4, background: "white", pad_top: 55, pad_bottom: 70 }, [
      { type: "card", settings: { number: "01", icon: "installation", title: "Installation", text: "Des bases solides\npour durer.", text_mobile: "Des bases solides pour durer.", link: U("installation-et-renovation") } },
      { type: "card", settings: { number: "02", icon: "cle", title: "Rénovation", text: "Modernisez et\ngagnez en confort.", text_mobile: "Modernisez et gagnez en confort.", link: U("installation-et-renovation") } },
      { type: "card", settings: { number: "03", icon: "ampoule", title: "Éclairage", text: "Sublimez vos espaces\nau quotidien.", text_mobile: "Sublimez vos espaces au quotidien.", link: U("eclairage") } },
      { type: "card", settings: { number: "04", icon: "depannage-eclair", title: "Dépannage", text: "Une solution adaptée\nà chaque situation.", text_mobile: "Une solution adaptée à chaque\nsituation.", link: U("depannage") } },
    ]),
    S("ph-cards", { layout: "services", columns: 3, background: "soft", title_size: 62, eyebrow: "Nos prestations", heading: "De bonnes bases,\njusque dans les détails.", text: p("Rénovation, équipements, éclairage :<br>des solutions sur mesure pour des espaces<br>plus sûrs, plus pratiques et plus agréables<br>à vivre."), pad_top: 46, pad_bottom: 27 }, [
      { type: "card", settings: { image_asset: f("26_renovation_conseil"), alt: alt("26_renovation_conseil"), position: "30% 60%", title: "Installation & rénovation", text: "Des installations adaptées\nà vos besoins, en neuf comme\nen rénovation.", text_mobile: "Des installations adaptées à vos besoins,\nen neuf comme en rénovation.", link_label: "Découvrir", link: U("installation-et-renovation") } },
      { type: "card", settings: { image_asset: f("03_tableau_electrique"), alt: alt("03_tableau_electrique"), title: "Tableau électrique", text: "Un tableau bien pensé pour\nune installation fiable et évolutive.", text_mobile: "Un tableau bien pensé pour une\ninstallation fiable et évolutive.", link_label: "Découvrir", link: U("tableau-et-securite") } },
      { type: "card", settings: { image_asset: f("20_spots_plafond"), alt: alt("20_spots_plafond"), position: "50% 0%", title: "Éclairage", text: "Des ambiances lumineuses\nqui valorisent vos espaces\net votre confort.", text_mobile: "Des ambiances lumineuses qui\nvalorisent vos espaces et votre confort.", link_label: "Découvrir", link: U("eclairage") } },
    ]),
    S("ph-steps", { layout: "navy", title_size: 64, layout_mobile: "timeline", background: "navy", eyebrow: "Notre approche", heading: "Un projet clair.\nÀ chaque étape.", text: p("Un accompagnement simple et structuré,<br>pour avancer sereinement de la première<br>idée jusqu'aux dernières finitions."), pad_top: 80, pad_bottom: 47 }, [
      { type: "step", settings: { number: "01", icon: "bulle", title: "Échanger", text: "Nous prenons le temps de comprendre\nvos besoins, vos envies et les spécificités\nde votre projet." } },
      { type: "step", settings: { number: "02", icon: "devis-document", title: "Préparer", text: "Nous définissons ensemble les solutions\nles plus adaptées et un plan d'intervention\nclair et réaliste." } },
      { type: "step", settings: { number: "03", icon: "reglages", title: "Réaliser", text: "Nous mettons en œuvre votre projet\ndans le respect des choix validés\net des finitions soignées." } },
    ]),
    S("ph-cards", { layout: "projects", columns: 2, title_size: 55, eyebrow: "Réalisations", heading: "Des espaces qui prennent vie.", heading_mobile: "Des espaces\nqui prennent vie.", note: "Projets illustratifs", pad_top: 66, pad_bottom: 35 }, [
      { type: "card", settings: { image_asset: f("12_sejour_renove"), alt: alt("12_sejour_renove"), title: "Rénovation d'un séjour", text: "Un espace plus lumineux et fonctionnel.", label: "Projet illustratif", link: "/pages/realisation-renovation-d-un-sejour" } },
      { type: "card", settings: { image_asset: f("03_tableau_electrique"), alt: alt("03_tableau_electrique"), title: "Mise en place d'un tableau électrique", text: "Une installation propre et évolutive.", label: "Projet illustratif", link: "/pages/realisation-mise-en-place-d-un-tableau-electrique", show: "desktop" } },
      { type: "card", settings: { image_asset: f("13_couloir_eclaire"), alt: alt("13_couloir_eclaire"), title: "Éclairage d'un couloir", text: "Une ambiance moderne et chaleureuse.", label: "Projet illustratif", link: "/pages/realisation-eclairage-d-un-couloir", show: "mobile" } },
      { type: "card", settings: { image_asset: f("14_maison_installation"), alt: alt("14_maison_installation"), title: "Installation dans une cuisine", text: "Des équipements intégrés et pratiques.", label: "Projet illustratif", link: "/pages/realisation-amenagement-d-une-cuisine-contemporaine", show: "mobile" } },
    ]),
    S("ph-cta", { layout: "band", layout_mobile: "band", title_size: 62, eyebrow: "Votre projet", heading: "On met votre projet\nsous tension ?", button_label: "Demander un devis", button_link: QUOTE, circuit: "cta", note: "Des idées\naux réalisations,\nen toute confiance." }),
    pageRow(LOOK_06),
  ]);

  // Réponses communes (reprises sur plusieurs pages ; rien d'affirmé sur un délai, un prix ou une certification).
  const A = {
    neuf: p("Oui : les prestations présentées concernent aussi bien une construction neuve qu'un logement existant à rénover, partiellement ou entièrement."),
    projet: p("Tout commence par un échange sur vos besoins, puis une visite pour observer l'existant. Une proposition claire vous est ensuite remise ; les travaux sont planifiés avec vous une fois les choix validés."),
    equipements: p("Oui : nous vous aidons à choisir les équipements (éclairage, prises, commandes) selon vos usages, votre logement et votre budget."),
  };

  // ------------------------------------------------------------------------------------------- Prestations (planches 01 et 06)
  const look = (h: PhPageHandle) => pageRow(PH_PAGES.find((x) => x.handle === h)!.look);
  const page = (h: PhPageHandle, rows: Row[]) => {
    const def = PH_PAGES.find((x) => x.handle === h)!;
    spec.templates[`page.${def.suffix}`] = phTemplate([...rows, look(h)]);
    spec.store.pages = spec.store.pages.filter((x) => x.handle !== h);
    spec.store.pages.push({ handle: h, title: def.fr, template_suffix: def.suffix, body_html: "" });
  };
  page("prestations", [
    S("ph-hero", { layout: "wide", title_size: 94, crumb_current: "Prestations", heading: "Une solution\npour [y]chaque projet.[/y]", text: p("Des prestations sur mesure pour des installations fiables,<br>fonctionnelles et durables, en neuf comme en rénovation."), image_asset: f("24_article_eclairage"), image_alt: alt("24_article_eclairage"), image_position: "50% 62%", photo_w: 490, height: 854, circuit: "p02", note: "Des espaces\nplus confortables\nau quotidien.", note_x: 1218, note_y: 84 }),
    S("ph-cards", { layout: "domains", columns: 2, title_size: 51, eyebrow: "Nos prestations", heading: "Nos domaines d'intervention.", text: p("Des solutions adaptées à chaque espace<br>de votre habitation, pour plus de confort,<br>de sécurité et de sérénité."), pad_top: 46, pad_bottom: 0 }, [
      { type: "card", settings: { image_asset: f("26_renovation_conseil"), alt: alt("26_renovation_conseil"), position: "30% 62%", number: "01", title: "Installation & rénovation", text: "Des installations adaptées à vos besoins,\nen neuf comme en rénovation. Nous vous\naccompagnons à chaque étape pour des\nespaces fonctionnels et durables.", link_label: "En savoir plus", link: U("installation-et-renovation") } },
      { type: "card", settings: { image_asset: f("03_tableau_electrique"), alt: alt("03_tableau_electrique"), position: "50% 40%", number: "02", title: "Tableau & sécurité", text: "Un tableau bien pensé pour une installation\nfiable et évolutive. Nous adaptons vos\néquipements aux besoins de votre logement.", link_label: "En savoir plus", link: U("tableau-et-securite") } },
      { type: "card", settings: { image_asset: f("20_spots_plafond"), alt: alt("20_spots_plafond"), position: "50% 20%", number: "03", title: "Éclairage intérieur & extérieur", text: "Des solutions d'éclairage pour sublimer\nvos espaces et améliorer votre confort,\nà l'intérieur comme à l'extérieur.", link_label: "En savoir plus", link: U("eclairage") } },
      { type: "card", settings: { image_asset: f("10_eclairage_exterieur"), alt: alt("10_eclairage_exterieur"), position: "70% 40%", number: "04", title: "Dépannage électrique", text: "Une solution adaptée à chaque situation\npour rétablir votre installation et limiter\nles désagréments.", link_label: "En savoir plus", link: U("depannage") } },
      { type: "card", settings: { image_asset: f("21_prise_interrupteur"), alt: alt("21_prise_interrupteur"), position: "50% 55%", number: "05", title: "Prises & équipements", text: "Des prises et équipements bien intégrés\nà votre intérieur, pour plus de praticité\nau quotidien.", link_label: "En savoir plus", link: U("installation-et-renovation") } },
      { type: "card", settings: { image_asset: f("22_pilotage_confort"), alt: alt("22_pilotage_confort"), position: "60% 40%", number: "06", title: "Pilotage & confort", text: "Des solutions pour mieux piloter votre installation\net simplifier votre quotidien : volets, éclairage,\nchauffage et plus encore.", link_label: "En savoir plus", link: U("installation-et-renovation") } },
    ]),
    S("ph-steps", { layout: "boxes", layout_mobile: "stack", background: "white", title_size: 51, eyebrow: "Notre méthode", heading: "Ce que l'on prépare ensemble.", text: p("Une démarche claire pour un projet bien cadré,<br>avec les bonnes informations au bon moment."), pad_top: 84, pad_bottom: 25 }, [
      { type: "step", settings: { number: "01", icon: "bulle", title: "Vos besoins", text: "Nous échangeons sur vos envies,\nvos contraintes et vos priorités." } },
      { type: "step", settings: { number: "02", icon: "maison", title: "L'existant", text: "Nous prenons en compte les\nspécificités de votre installation\net de votre logement." } },
      { type: "step", settings: { number: "03", icon: "cible-ronde", title: "Le périmètre", text: "Nous définissons ensemble\nles solutions les plus adaptées\nà votre projet." } },
      { type: "step", settings: { number: "04", icon: "devis-document", title: "Le devis", text: "Vous recevez une proposition\ndétaillée et claire pour avancer\nen toute sérénité." } },
    ]),
    S("ph-cta", { layout: "soft", layout_mobile: "soft", title_size: 39, eyebrow: "Un doute ?", heading: "Vous hésitez sur la prestation ?", text: p("Échangeons sur votre projet pour trouver ensemble la solution la plus adaptée<br>à vos besoins."), button_label: "Décrire mon projet", button_link: QUOTE, circuit: "none", note: "" }),
    S("ph-faq", { layout: "list", title_size: 42, eyebrow: "Questions fréquentes", heading: "Vos questions, nos réponses.", text: p("Quelques réponses aux questions les plus courantes<br>pour vous aider à y voir plus clair."), pad_top: 52, pad_bottom: 52 }, [
      { type: "question", settings: { question: "Intervenez-vous en neuf et en rénovation ?", answer: A.neuf } },
      { type: "question", settings: { question: "Comment se déroule un projet ?", answer: A.projet } },
      { type: "question", settings: { question: "Proposez-vous un accompagnement sur le choix des équipements ?", answer: A.equipements } },
    ]),
  ]);

  // ------------------------------------------------------------------------------------------- Installation et rénovation (planches 02 et 07)
  const ART_RENO = "/pages/conseil-bien-preparer-votre-renovation-electrique";
  page("installation-et-renovation", [
    S("ph-hero", { layout: "split", title_size: 89, crumb_parent: "Prestations", crumb_parent_link: U("prestations"), crumb_current: "Installation & rénovation", heading: "Une installation\npensée [y]pour durer.[/y]", text: p("Des installations fiables, fonctionnelles et adaptées<br>à vos espaces, en neuf comme en rénovation."), button_label: "Décrire mon projet", button_link: QUOTE, button2_label: "Nos réalisations", button2_link: U("realisations"), image_asset: f("02_installation_renovation"), image_alt: alt("02_installation_renovation"), image_position: "60% 60%", photo_w: 1009, height: 502, caption: "Visuel de démonstration", circuit: "p03", note: "Des espaces\nbien équipés\nau quotidien.", note_x: 1552, note_y: 43 }),
    S("ph-cards", { layout: "photos", columns: 3, eyebrow: "Nos domaines d'intervention", pad_top: 27, pad_bottom: 30 }, [
      { type: "card", settings: { image_asset: f("18_installation_neuve"), alt: alt("18_installation_neuve"), icon: "maison", title: "Neuf", text: "Des installations complètes\npour des espaces fonctionnels\ndès l'origine.", link_label: "En savoir plus", link: U("realisations") } },
      { type: "card", settings: { image_asset: f("15_projet_avant"), alt: alt("15_projet_avant"), icon: "actualiser", title: "Rénovation", text: "Une mise à niveau adaptée\nà vos besoins actuels et futurs.", link_label: "En savoir plus", link: ART_RENO } },
      { type: "card", settings: { image_asset: f("19_extension_habitation"), alt: alt("19_extension_habitation"), icon: "extension", title: "Extension", text: "Des solutions évolutives pour\naccompagner l'agrandissement\nde vos espaces.", link_label: "En savoir plus", link: QUOTE } },
    ]),
    S("ph-steps", { layout: "cards", layout_mobile: "circles", arrows: true, background: "soft", eyebrow: "Du besoin au dernier équipement", pad_top: 24, pad_bottom: 30 }, [
      { type: "step", settings: { number: "01", icon: "bulle", title: "Échanger sur votre projet", text: "Nous prenons le temps de comprendre\nvos besoins, votre logement et vos usages." } },
      { type: "step", settings: { number: "02", icon: "devis-document", title: "Définir une solution adaptée", text: "Nous vous proposons une installation\ncohérente avec vos espaces et vos\ncontraintes." } },
      { type: "step", settings: { number: "03", icon: "reglages", title: "Réaliser et finaliser", text: "Nous assurons la mise en œuvre jusqu'aux\nderniers équipements, avec un résultat\nsoigné et fonctionnel." } },
    ]),
    S("ph-steps", { layout: "features", background: "navy", title_size: 49, eyebrow: "Préparer votre projet", heading: "Des choix clairs\npour un [y]résultat durable.[/y]", text: p("Chaque projet est unique. Voici quelques points<br>à considérer pour avancer sereinement."), pad_top: 27, pad_bottom: 14, show: "desktop" }, [
      { type: "step", settings: { number: "", icon: "maison", title: "Vos usages", text: "Nombre d'occupants, télétravail,\nappareils spécifiques, évolutions\nfutures." } },
      { type: "step", settings: { number: "", icon: "plan-perimetre", title: "Vos espaces", text: "Type de logement, surface,\ncontraintes techniques,\nextensions possibles." } },
      { type: "step", settings: { number: "", icon: "ampoule", title: "Vos équipements", text: "Éclairage, prises, réseau,\nchauffage électrique, domotique…" } },
    ]),
    S("ph-faq", { layout: "aside", eyebrow: "Questions fréquentes", box_title: "Vous avez un projet ?", box_text: "Parlons de vos besoins pour trouver\nla solution la plus adaptée à votre logement.", box_button: "Décrire mon projet", box_link: QUOTE, pad_top: 25, pad_bottom: 22 }, [
      { type: "question", settings: { question: "Faut-il revoir toute l'installation lors d'une rénovation ?", question_mobile: "Faut-il refaire toute l'installation lors d'une rénovation ?", answer: p("Pas forcément. La visite permet d'évaluer l'état de l'existant : selon ce qui est observé, une remise à niveau partielle peut suffire ou une reprise plus complète vous est proposée.") } },
      { type: "question", settings: { question: "Peut-on ajouter des prises ou un circuit plus tard ?", answer: p("Oui, à condition de l'anticiper : nous en tenons compte dès la conception pour laisser de la place dans le tableau et prévoir les passages.") } },
      { type: "question", settings: { question: "Intervenez-vous en logement occupé ?", question_mobile: "Pouvez-vous intervenir en logement occupé ?", answer: p("Oui. L'organisation du chantier est définie avec vous pour limiter la gêne au quotidien (pièces traitées, coupures, horaires).") } },
      { type: "question", settings: { question: "Comment se déroule un projet d'installation électrique ?", answer: A.projet, show: "desktop" } },
    ]),
  ]);

  // ------------------------------------------------------------------------------------------- Tableau et sécurité (planches 02 et 07)
  page("tableau-et-securite", [
    S("ph-hero", { layout: "split", title_size: 89, crumb_parent: "Prestations", crumb_parent_link: U("prestations"), crumb_current: "Tableau & sécurité", heading: "Le cœur\nde [y]votre installation.[/y]", text: p("Un tableau bien pensé pour une installation fiable,<br>lisible et évolutive."), button_label: "Décrire mon projet", button_link: QUOTE, button2_label: "Nos réalisations", button2_link: U("realisations"), image_asset: f("03_tableau_electrique"), image_alt: alt("03_tableau_electrique"), image_position: "50% 45%", photo_w: 1040, height: 502, caption: "Visuel de démonstration", circuit: "p04", note: "Une installation\nsûre, claire\net évolutive.", note_x: 1530, note_y: 45 }),
    S("ph-cards", { layout: "numbered", columns: 3, eyebrow: "Nos prestations", pad_top: 28, pad_bottom: 28 }, [
      { type: "card", settings: { image_asset: f("09_tableau_renove"), alt: alt("09_tableau_renove"), position: "50% 30%", zoom: 160, number: "01", icon: "recherche", title: "Évaluer l'existant", text: "Analyse de votre installation actuelle\npour identifier les points à améliorer.", link_label: "En savoir plus", link: U("depannage") } },
      { type: "card", settings: { image_asset: f("09_tableau_renove"), alt: alt("09_tableau_renove"), position: "50% 45%", number: "02", icon: "reglages", title: "Adapter les équipements", text: "Un tableau adapté à vos besoins présents\net futurs, avec des circuits bien répartis.", link_label: "En savoir plus", link: QUOTE } },
      { type: "card", settings: { image_asset: f("03_tableau_electrique"), alt: alt("03_tableau_electrique"), position: "50% 40%", number: "03", icon: "liste", title: "Clarifier les circuits", text: "Un repérage clair pour une utilisation\nsimple et un entretien facilité.", link_label: "En savoir plus", link: "/pages/conseil-moderniser-son-tableau-electrique" } },
    ]),
    S("ph-cards", { layout: "photos", columns: 3, image_height: 218, eyebrow: "Des situations fréquentes en rénovation", pad_top: 20, pad_bottom: 30, show: "desktop" }, [
      { type: "card", settings: { image_asset: f("26_renovation_conseil"), alt: alt("26_renovation_conseil"), position: "85% 50%", title: "Logement ancien", text: "Remplacement d'un tableau vétuste\npour une installation plus lisible.", link_label: "En savoir plus", link: "/pages/conseil-moderniser-son-tableau-electrique" } },
      { type: "card", settings: { image_asset: f("13_couloir_eclaire"), alt: alt("13_couloir_eclaire"), position: "50% 55%", title: "Réorganisation des circuits", text: "Une meilleure répartition pour plus\nde confort au quotidien.", link_label: "En savoir plus", link: QUOTE } },
      { type: "card", settings: { image_asset: f("05_depannage"), alt: alt("05_depannage"), position: "60% 50%", title: "Ajout de nouveaux usages", text: "Préparation pour une borne de recharge,\nune pompe à chaleur ou d'autres équipements.", link_label: "En savoir plus", link: QUOTE } },
    ]),
    S("ph-steps", { layout: "band", layout_mobile: "circles", arrows: true, background: "navy", eyebrow: "Les étapes d'un projet", pad_top: 26, pad_bottom: 22 }, [
      { type: "step", settings: { number: "01", icon: "recherche", title: "Diagnostic", text: "Analyse de l'existant\net de vos besoins." } },
      { type: "step", settings: { number: "02", icon: "devis-document", title: "Proposition", text: "Une solution adaptée\nà votre logement." } },
      { type: "step", settings: { number: "03", icon: "reglages", title: "Réalisation", text: "Une installation soignée\net clairement organisée." } },
      { type: "step", settings: { number: "04", icon: "validation", title: "Finalisation", text: "Vérification et repérage\ndes circuits." } },
    ]),
    S("ph-faq", { layout: "aside", eyebrow: "Questions fréquentes", box_width: 596, box_title: "Un projet de mise à niveau ?", box_text: "Décrivez votre situation pour étudier\nensemble les solutions possibles.", box_button: "Décrire mon projet", box_link: QUOTE, pad_top: 26, pad_bottom: 22 }, [
      { type: "question", settings: { question: "Quand faut-il remplacer un tableau électrique ?", question_mobile: "Quand faut-il envisager de remplacer un tableau électrique ?", answer: p("Lorsqu'il est ancien, qu'il ne permet plus d'ajouter de circuits ou que des signes d'usure apparaissent. Seul un examen sur place permet de conseiller un remplacement : nous vous expliquons ce qui est observé.") } },
      { type: "question", settings: { question: "Peut-on ajouter des circuits dans un tableau existant ?", answer: p("Souvent, s'il reste de la place et si l'ensemble le permet. La visite permet de vérifier ce qui est possible avant de vous proposer une solution.") } },
      { type: "question", settings: { question: "L'installation reste-t-elle alimentée pendant les travaux ?", question_mobile: "L'intervention nécessite-t-elle une coupure de courant ?", answer: p("Une coupure est nécessaire pendant certaines étapes. Sa durée et son moment sont convenus avec vous à l'avance.") } },
      { type: "question", settings: { question: "Comment sont repérés les circuits ?", answer: p("Chaque circuit est identifié dans le tableau par une étiquette claire, pour savoir facilement à quoi il correspond."), show: "desktop" } },
    ]),
  ]);

  // ------------------------------------------------------------------------------------------- En-tête, pied, menus
  const header = spec.groups.header;
  for (const id of header.order) if (header.sections[id]?.type === "header" || header.sections[id]?.type === "announcement-bar") header.sections[id].disabled = true;
  header.sections["ph-header"] = { type: "ph-header", settings: { ...headerSettings("fr", { demo: true, ctaLink: QUOTE, quotePage: QUOTE, confirmPage: U("demande-envoyee"), cookiesLink: U("donnees-et-cookies") }), wordmark: "PHASE", tagline: "Électricité", monogram: true } };
  if (!header.order.includes("ph-header")) header.order.push("ph-header");
  const footer = spec.groups.footer;
  for (const id of footer.order) if (footer.sections[id]?.type === "footer") footer.sections[id].disabled = true;
  footer.sections["ph-footer"] = { type: "ph-footer", settings: { ...footerSettings("fr", { coords: "Coordonnées à renseigner", area: "Votre ville et sa région", left: "Thème de démonstration", brand: "PHASE ÉLECTRICITÉ" }), wordmark: "PHASE", tagline: "Électricité", monogram: true } };
  if (!footer.order.includes("ph-footer")) footer.order.push("ph-footer");
  const prestations = [
    { title: "Installation & rénovation", url: U("installation-et-renovation") }, { title: "Tableau & sécurité", url: U("tableau-et-securite") },
    { title: "Éclairage", url: U("eclairage") }, { title: "Dépannage", url: U("depannage") },
  ];
  spec.store.menus["main-menu"] = { title: "Navigation", links: [{ title: "Prestations", url: U("prestations"), links: prestations }, { title: "Réalisations", url: U("realisations") }, { title: "L'entreprise", url: U("l-entreprise") }, { title: "Conseils", url: U("conseils") }, { title: "Contact", url: U("contact") }] };
  spec.store.menus.footer = { title: "Pied de page", links: [{ title: "Prestations", url: U("prestations") }, { title: "Réalisations", url: U("realisations") }, { title: "L'entreprise", url: U("l-entreprise") }, { title: "Conseils", url: U("conseils") }, { title: "Contact", url: U("contact") }] };
  spec.store.menus.legal = { title: "Informations légales", links: [{ title: "Mentions légales", url: U("mentions-legales") }, { title: "Confidentialité", url: U("donnees-et-cookies") }, { title: "Cookies", url: `${U("donnees-et-cookies")}#ph-cookies-prefs` }] };
  void PH_PAGES;
}
