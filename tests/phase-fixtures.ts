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
import { PH_PAGES, phTemplate, phUrl, headerSettings, footerSettings, pageRow, LOOK_06, LOOK_08, type PhPageHandle } from "../src/lib/theme/phase";

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
      { type: "card", settings: { image_asset: f("13_couloir_eclaire"), alt: alt("13_couloir_eclaire"), title: "Éclairage d'un couloir", text: "Une ambiance moderne et chaleureuse.", label: "Projet illustratif", link: `${U("realisations")}?filtre=eclairage`, show: "mobile" } },
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
  // Échelle propre à chaque panneau (les planches ne sont pas dessinées au même zoom : mesurée sur le monogramme du logo).
  const SCALE: Partial<Record<PhPageHandle, number>> = { prestations: 102, "installation-et-renovation": 80, "tableau-et-securite": 80, eclairage: 78, depannage: 78, realisations: 103, "l-entreprise": 98, faq: 97, conseils: 83, contact: 83, "demande-de-devis": 77, "demande-envoyee": 92, "mentions-legales": 92, "donnees-et-cookies": 90 };
  const look = (h: PhPageHandle) => pageRow({ ...PH_PAGES.find((x) => x.handle === h)!.look, ...(SCALE[h] ? { scale: SCALE[h] } : {}) });
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

  // ------------------------------------------------------------------------------------------- Éclairage (planches 02 et 07)
  page("eclairage", [
    S("ph-hero", { layout: "split", title_size: 80, crumb_parent: "Prestations", crumb_parent_link: U("prestations"), crumb_current: "Éclairage", heading: "La lumière\n[y]change tout.[/y]", text: p("Des solutions d'éclairage pour sublimer vos espaces<br>et créer des ambiances adaptées à chaque usage."), button_label: "Décrire mon projet", button_link: QUOTE, button2_label: "Nos réalisations", button2_link: U("realisations"), image_asset: f("04_eclairage_interieur"), image_alt: alt("04_eclairage_interieur"), image_position: "50% 50%", photo_w: 1060, height: 388, caption: "Visuel de démonstration", circuit: "p05", note: "Des ambiances\npour tous\nvos moments.", note_x: 1572, note_y: 30 }),
    S("ph-cards", { layout: "photos", columns: 3, image_height: 134, eyebrow: "Nos domaines d'éclairage", pad_top: 10, pad_bottom: 14 }, [
      { type: "card", settings: { image_asset: f("07_cuisine_contemporaine"), alt: alt("07_cuisine_contemporaine"), icon: "ampoule", title: "Intérieur", text: "Un éclairage confortable et fonctionnel\npour vos pièces de vie.", link_label: "Découvrir", link: "/pages/conseil-bien-preparer-son-projet-d-eclairage" } },
      { type: "card", settings: { image_asset: f("10_eclairage_exterieur"), alt: alt("10_eclairage_exterieur"), position: "50% 55%", icon: "eclairage-exterieur", title: "Extérieur", text: "Un éclairage adapté pour valoriser\nvos extérieurs et sécuriser vos accès.", link_label: "Découvrir", link: "/pages/conseil-eclairage-exterieur" } },
      { type: "card", settings: { image_asset: f("11_chambre_eclairage"), alt: alt("11_chambre_eclairage"), position: "50% 40%", icon: "spot-plafond", title: "Ambiances & usages", text: "Des solutions sur mesure selon vos activités :\ntravail, détente, réception…", link_label: "Découvrir", link: "/pages/conseil-creer-une-ambiance-lumineuse" } },
    ]),
    S("ph-steps", { layout: "features", background: "navy", title_size: 42, eyebrow: "De la fonction à l'atmosphère", heading: "Un éclairage\n[y]au service de votre quotidien.[/y]", text: p("Bien plus qu'une question de luminosité,<br>l'éclairage participe au confort, à l'esthétique<br>et à l'usage de vos espaces."), pad_top: 20, pad_bottom: 12, show: "desktop" }, [
      { type: "step", settings: { number: "", icon: "clarte-soleil", title: "Confort visuel", text: "Une lumière adaptée\nà chaque pièce et activité." } },
      { type: "step", settings: { number: "", icon: "goutte", title: "Mise en valeur", text: "Des espaces sublimés\npar une lumière bien pensée." } },
      { type: "step", settings: { number: "", icon: "ampoule", title: "Économies d'énergie", text: "Des solutions performantes\net durables." } },
      { type: "step", settings: { number: "", icon: "feuille", title: "Ambiances variées", text: "Du quotidien aux moments\nd'exception." } },
    ]),
    S("ph-cards", { layout: "mini", columns: 4, eyebrow: "Vos besoins de projet", box_title: "Vous avez un projet d'éclairage ?", box_text: "Décrivez vos besoins pour trouver\nles solutions adaptées à votre espace.", box_button: "Décrire mon projet", box_link: QUOTE, pad_top: 14, pad_bottom: 14, show: "desktop" }, [
      { type: "card", settings: { icon: "clarte-soleil", title: "Plus de lumière", text: "Des espaces plus lumineux\net agréables à vivre.", link_label: "En savoir plus", link: "/pages/conseil-bien-preparer-son-projet-d-eclairage" } },
      { type: "card", settings: { icon: "ampoule", title: "Une ambiance spécifique", text: "Une atmosphère adaptée\nà chaque pièce.", link_label: "En savoir plus", link: "/pages/conseil-creer-une-ambiance-lumineuse" } },
      { type: "card", settings: { icon: "maison", title: "Un éclairage extérieur", text: "Valoriser et sécuriser\nvos extérieurs.", link_label: "En savoir plus", link: "/pages/conseil-eclairage-exterieur" } },
      { type: "card", settings: { icon: "feuille", title: "Des solutions économiques", text: "Des équipements plus\nperformants.", link_label: "En savoir plus", link: QUOTE } },
    ]),
  ]);

  // ------------------------------------------------------------------------------------------- Dépannage (planches 02 et 07)
  page("depannage", [
    S("ph-hero", { layout: "split", title_size: 76, crumb_parent: "Prestations", crumb_parent_link: U("prestations"), crumb_current: "Dépannage", heading: "Un problème électrique ?\n[y]Faisons le point.[/y]", text: p("Une analyse claire de votre situation pour identifier<br>la meilleure solution."), button_label: "Décrire le problème", button_link: QUOTE, image_asset: f("05_depannage"), image_alt: alt("05_depannage"), image_position: "50% 60%", photo_w: 1000, height: 474, caption: "Visuel de démonstration", circuit: "p05", note: "Un diagnostic\nclair pour\navancer sereinement.", note_x: 1572, note_y: 28 }),
    S("ph-cards", { layout: "icons", columns: 4, eyebrow: "Situations fréquentes", pad_top: 18, pad_bottom: 18 }, [
      { type: "card", settings: { icon: "alimentation", title: "Coupures", text: "Coupures partielles ou totales,\nrécurrentes ou ponctuelles.", link_label: "En savoir plus", link: QUOTE } },
      { type: "card", settings: { icon: "prise", title: "Prises & interrupteurs", text: "Une prise qui ne fonctionne plus,\nun interrupteur défectueux.", link_label: "En savoir plus", link: QUOTE } },
      { type: "card", settings: { icon: "ampoule", title: "Éclairage", text: "Un éclairage qui ne s'allume plus\nou un fonctionnement anormal.", link_label: "En savoir plus", link: QUOTE } },
      { type: "card", settings: { icon: "tableau-electrique", title: "Tableau électrique", text: "Un disjoncteur qui saute\nou un comportement inhabituel.", link_label: "En savoir plus", link: U("tableau-et-securite") } },
    ]),
    S("ph-prepare", { eyebrow: "Préparer votre demande", box_icon: "bulle", box_title: "Nous sommes à votre écoute", box_text: "Notre équipe est disponible pour échanger\nsur votre situation.", box_note: "Disponibilités à confirmer", box_button: "Décrire le problème", box_link: QUOTE, pad_top: 10, pad_bottom: 36 }, [
      { type: "item", settings: { icon: "lieu-repere", title: "Localisation", text: "Indiquez le type de logement et la pièce concernée." } },
      { type: "item", settings: { icon: "devis-document", title: "Symptômes", text: "Décrivez ce que vous constatez (quand, comment, fréquence…)." } },
      { type: "item", settings: { icon: "maison", title: "Contexte", text: "Précisez les éventuels travaux récents ou changements d'usage." } },
      { type: "item", settings: { icon: "calendrier", title: "Disponibilités", text: "Indiquez vos disponibilités pour organiser une intervention." } },
    ]),
  ]);

  // ------------------------------------------------------------------------------------------- Réalisations (planches 03 et 08)
  // Projets ILLUSTRATIFS (photos du kit, aucun chantier réel) : chacun ouvre sa page, filtrables par catégorie.
  const PROJ = (slug: string) => `/pages/realisation-${slug}`;
  type Proj = { slug: string; title: string; text: string; cats: string; image: string; pos?: string; tag: string; show?: "desktop" | "mobile"; heading: string; intro: string; type: string; space: string; need: string; besoin: [string, string]; reponse: [string, string]; photos: [string, string, string?][] };
  const PROJETS: Proj[] = [
    { slug: "renovation-d-un-sejour", title: "Rénovation d'un séjour\nen maison", text: "Un espace plus lumineux\net confortable", cats: "renovation eclairage", image: "12_sejour_renove", tag: "Rénovation", show: "desktop", heading: "Un nouvel éclairage,\n[y]une autre atmosphère.[/y]", intro: "Ce projet illustratif de rénovation montre comment un éclairage bien pensé<br>peut transformer un espace de vie.", type: "Rénovation", space: "Séjour", need: "Éclairage",
      besoin: ["Un espace plus chaleureux\net fonctionnel.", "Dans ce séjour, l'objectif est de créer une ambiance plus chaleureuse, tout en améliorant le confort visuel au quotidien. L'éclairage doit s'adapter aux différents usages : détente, repas et moments en famille."],
      reponse: ["Une mise en lumière sur mesure.", "Nous avons proposé une solution d'éclairage complète et cohérente, avec des ambiances modulables selon les moments de la journée. L'implantation des luminaires et le choix des températures de couleur permettent de valoriser l'espace et de créer une atmosphère agréable."],
      photos: [["24_article_eclairage", "Suspensions au-dessus de la table", "50% 30%"], ["21_prise_interrupteur", "Appareillage sobre et moderne", "70% 50%"], ["20_spots_plafond", "Spots encastrés pour un éclairage homogène", "50% 10%"]] },
    { slug: "amenagement-d-une-cuisine-contemporaine", title: "Aménagement d'une\ncuisine contemporaine", text: "Éclairage et équipements\nau quotidien", cats: "eclairage", image: "07_cuisine_contemporaine", tag: "Éclairage", show: "desktop", heading: "Une cuisine\n[y]bien éclairée.[/y]", intro: "Ce projet illustratif montre comment l'éclairage et les équipements<br>accompagnent les usages d'une cuisine.", type: "Aménagement", space: "Cuisine", need: "Éclairage",
      besoin: ["Un plan de travail\nbien éclairé.", "Dans cette cuisine, l'objectif est d'éclairer chaque zone de travail sans éblouir, et de prévoir les prises nécessaires aux équipements du quotidien."],
      reponse: ["Un éclairage par zones.", "Une lumière d'ensemble, un éclairage dédié au plan de travail et des suspensions au-dessus de l'îlot, chacun commandé séparément."],
      photos: [["07_cuisine_contemporaine", "Suspensions au-dessus de l'îlot", "40% 30%"], ["21_prise_interrupteur", "Prises intégrées", "50% 50%"], ["23_conseils_hero", "Éclairage d'ambiance", "50% 50%"]] },
    { slug: "renovation-d-une-salle-de-bains", title: "Rénovation d'une salle\nde bains", text: "Un éclairage adapté\nà chaque espace", cats: "renovation", image: "08_salle_de_bain", tag: "Rénovation", show: "desktop", heading: "Une salle de bains\n[y]plus agréable.[/y]", intro: "Ce projet illustratif montre comment l'éclairage valorise<br>une petite pièce rénovée.", type: "Rénovation", space: "Salle de bains", need: "Éclairage",
      besoin: ["Une lumière douce\net pratique.", "Dans cette salle de bains, l'objectif est d'associer une lumière confortable pour la toilette et une ambiance plus douce le soir."],
      reponse: ["Un miroir éclairé et des points lumineux.", "Un miroir éclairé au-dessus de la vasque et un éclairage d'ensemble discret, choisis pour une pièce humide."],
      photos: [["08_salle_de_bain", "Miroir éclairé", "70% 30%"], ["08_salle_de_bain", "Vasque et plan", "60% 80%"], ["13_couloir_eclaire", "Éclairage d'ambiance", "50% 50%"]] },
    { slug: "mise-en-place-d-un-tableau-electrique", title: "Mise en place d'un\ntableau électrique", text: "Une installation claire\net évolutive", cats: "tableau", image: "09_tableau_renove", pos: "50% 40%", tag: "Tableau", show: "desktop", heading: "Un tableau\n[y]clair et évolutif.[/y]", intro: "Ce projet illustratif montre la mise en place d'un tableau<br>lisible, avec des circuits repérés.", type: "Tableau", space: "Entrée", need: "Sécurité et lisibilité",
      besoin: ["Un tableau lisible\net évolutif.", "L'objectif est de disposer d'un tableau clair, avec de la place pour de futurs circuits."],
      reponse: ["Des circuits répartis et repérés.", "Une répartition des circuits par usage et un repérage clair de chaque protection."],
      photos: [["09_tableau_renove", "Tableau repéré", "50% 30%"], ["03_tableau_electrique", "Rangées de protections", "50% 50%"], ["05_depannage", "Vérifications finales", "60% 50%"]] },
    { slug: "eclairage-exterieur-d-une-maison", title: "Éclairage extérieur\nd'une maison", text: "Des espaces extérieurs\nplus accueillants", cats: "eclairage", image: "10_eclairage_exterieur", tag: "Éclairage", show: "desktop", heading: "Un extérieur\n[y]mis en valeur.[/y]", intro: "Ce projet illustratif montre comment l'éclairage extérieur<br>valorise une façade et sécurise les accès.", type: "Éclairage", space: "Extérieur", need: "Mise en valeur",
      besoin: ["Des accès éclairés\net une façade valorisée.", "L'objectif est d'éclairer l'allée et l'entrée, tout en mettant en valeur la façade et la végétation."],
      reponse: ["Des appliques et des balises.", "Des appliques murales et des balises le long de l'allée, avec des commandes adaptées à l'usage extérieur."],
      photos: [["10_eclairage_exterieur", "Allée éclairée", "50% 60%"], ["19_extension_habitation", "Façade le soir", "50% 50%"], ["10_eclairage_exterieur", "Appliques murales", "90% 30%"]] },
    { slug: "une-chambre-tout-en-douceur", title: "Une chambre\ntout en douceur", text: "Une lumière apaisante\npour le soir", cats: "renovation eclairage", image: "11_chambre_eclairage", tag: "Rénovation", show: "desktop", heading: "Une chambre\n[y]tout en douceur.[/y]", intro: "Ce projet illustratif montre comment varier les lumières<br>dans une chambre.", type: "Rénovation", space: "Chambre", need: "Ambiance",
      besoin: ["Une lumière douce\npour se détendre.", "L'objectif est de disposer d'un éclairage d'ensemble et de lumières plus douces pour le soir."],
      reponse: ["Des lumières à plusieurs niveaux.", "Des liseuses de chaque côté du lit et un ruban lumineux indirect, commandés séparément."],
      photos: [["11_chambre_eclairage", "Liseuses", "20% 50%"], ["11_chambre_eclairage", "Éclairage indirect", "60% 30%"], ["16_projet_ambiance", "Ambiance du soir", "50% 50%"]] },
  ];
  const MOBILE_PROJ = [
    { title: "Rénovation d'un appartement", text: "Nouveaux éclairages et installation complète", cats: "renovation eclairage", image: "06_renovation_appartement", tag: "Rénovation", link: PROJ("renovation-d-un-sejour") },
    { title: "Remplacement de tableau électrique", text: "Une installation moderne et évolutive", cats: "tableau", image: "03_tableau_electrique", tag: "Tableau", link: PROJ("mise-en-place-d-un-tableau-electrique") },
    { title: "Éclairage extérieur", text: "Des ambiances lumineuses durables", cats: "eclairage", image: "10_eclairage_exterieur", tag: "Éclairage", link: PROJ("eclairage-exterieur-d-une-maison") },
    { title: "Rénovation d'une maison", text: "Confort et performance électrique", cats: "renovation", image: "11_chambre_eclairage", tag: "Rénovation", link: PROJ("une-chambre-tout-en-douceur") },
  ];
  page("realisations", [
    S("ph-hero", { layout: "navy", title_size: 86, copy_y: 66, eyebrow: "Réalisations", heading: "Des projets\n[y]bien connectés.[/y]", text: p("Sélection de projets illustratifs pour découvrir<br>des réalisations concrètes et variées."), text_mobile: p("Des installations soignées et durables,<br>pour des espaces plus confortables<br>au quotidien."), image_asset: f("06_renovation_appartement"), image_alt: alt("06_renovation_appartement"), image_position: "40% 50%", photo_w: 700, height: 514, caption: "Visuel de démonstration", chips_label: "Sélection de projets illustratifs", chips_aria: "Filtrer les réalisations", chips_for: "projects" }, [
      { type: "chip", settings: { label: "Tout", value: "all" } }, { type: "chip", settings: { label: "Rénovation", value: "renovation" } },
      { type: "chip", settings: { label: "Tableau", value: "tableau" } }, { type: "chip", settings: { label: "Éclairage", value: "eclairage" } },
    ]),
    S("ph-cards", { layout: "gallery", columns: 3, per_page: 6, pad_top: 27, pad_bottom: 70 }, [
      ...PROJETS.map((x) => ({ type: "card", settings: { image_asset: f(x.image), alt: alt(x.image), position: x.pos ?? "50% 50%", category: x.cats, tag: "", label: "Projet illustratif", title: x.title, text: x.text, link: PROJ(x.slug), show: "desktop" } })),
      ...MOBILE_PROJ.map((x) => ({ type: "card", settings: { image_asset: f(x.image), alt: alt(x.image), category: x.cats, tag: x.tag, label: "Projet illustratif", title: x.title, text: x.text, link: x.link, show: "mobile" } })),
    ]),
    S("ph-cta", { layout: "slim", layout_mobile: "inline", title_size: 55, eyebrow: "Un projet similaire ?", eyebrow_mobile: "Votre projet", heading: "Parlons de votre projet.", heading_mobile: "Des idées pour\nvos espaces ?", button_label: "Demander un devis", button_link: QUOTE, circuit: "cta-slim", note: "Des solutions\nadaptées\nà vos espaces.", height: 186 }),
  ]);
  for (const x of PROJETS) {
    const others = PROJETS.filter((o) => o.slug !== x.slug).slice(0, 2);
    spec.templates[`page.ph-projet-${x.slug}`] = phTemplate([
      S("ph-hero", { layout: "plain", title_size: 86, crumb_parent: "Réalisations", crumb_parent_link: U("realisations"), crumb_current: x.title.replace(/\n/g, " "), heading: x.heading, text: p(x.intro), circuit: "p02", note: "Des espaces\nplus confortables\nau quotidien.", note_x: 1218, note_y: 30, height: 361 }),
      S("ph-project", { image_asset: f(x.image), image_alt: alt(x.image), image_position: x.pos ?? "50% 50%", caption: "Visuel de démonstration", eyebrow: "Projet illustratif", pad_top: 0, pad_bottom: 26 }, [
        { type: "fact", settings: { icon: "maison", label: "Type", value: x.type } },
        { type: "fact", settings: { icon: "maison", label: "Espace", value: x.space } },
        { type: "fact", settings: { icon: "ampoule", label: "Besoin", value: x.need } },
      ]),
      S("ph-columns", { pad_top: 4, pad_bottom: 30 }, [
        { type: "column", settings: { number: "01", eyebrow: "Le besoin", title: x.besoin[0], text: p(x.besoin[1]) } },
        { type: "column", settings: { number: "02", eyebrow: "La réponse envisagée", title: x.reponse[0], text: p(x.reponse[1]) } },
      ]),
      S("ph-gallery", { image_height: 292, pad_top: 10, pad_bottom: 26 }, x.photos.map(([img, cap, pos]) => ({ type: "photo", settings: { image_asset: f(img), alt: alt(img), position: pos ?? "50% 50%", caption: cap } }))),
      S("ph-cards", { layout: "related", columns: 2, eyebrow: "Autres inspirations", pad_top: 20, pad_bottom: 30 }, others.map((o, i) => ({ type: "card", settings: { image_asset: f(o.image), alt: alt(o.image), number: `0${i + 1}`, label: "Projet illustratif", title: o.title.replace(/\n/g, " "), link: PROJ(o.slug) } }))),
      S("ph-cta", { layout: "slim", layout_mobile: "inline", title_size: 55, eyebrow: "Envie d'un projet similaire ?", heading: "Discutons de votre projet.", button_label: "Demander un devis", button_link: QUOTE, circuit: "cta-slim", note: "Des solutions\nadaptées\nà vos espaces.", height: 160, copy_width: 780 }),
      pageRow({ ...LOOK_08, scale: 102 }),
    ]);
    spec.store.pages = spec.store.pages.filter((y) => y.handle !== `realisation-${x.slug}`);
    spec.store.pages.push({ handle: `realisation-${x.slug}`, title: x.title.replace(/\n/g, " "), template_suffix: `ph-projet-${x.slug}`, body_html: "" });
  }

  // ------------------------------------------------------------------------------------------- L'entreprise (planches 03 et 08)
  page("l-entreprise", [
    S("ph-hero", { layout: "navy", title_size: 70, copy_y: 54, eyebrow: "L'entreprise", heading: "Un métier de précision.\n[y]Une relation simple.[/y]", heading_mobile: "Un métier\nde précision.\n[y]Une relation simple.[/y]", text: p("Des solutions électriques fiables et durables,<br>avec une approche claire et transparente."), image_asset: f("17_entreprise_hero"), image_alt: alt("17_entreprise_hero"), image_position: "50% 40%", photo_w: 760, height: 408 }),
    S("ph-cards", { layout: "values", columns: 3, eyebrow: "Nos valeurs", pad_top: 40, pad_bottom: 24 }, [
      { type: "card", settings: { icon: "bulle", title: "Écoute", text: "Comprendre vos besoins\net vos contraintes pour proposer\ndes solutions adaptées." } },
      { type: "card", settings: { icon: "devis-document", title: "Clarté", text: "Des informations simples\net un suivi lisible à chaque étape\ndu projet." } },
      { type: "card", settings: { icon: "reglages", title: "Soin", text: "Un travail précis et soigné,\npour des installations fiables\net durables." } },
    ]),
    S("ph-steps", { layout: "boxes", layout_mobile: "circles", arrows: true, background: "white", eyebrow: "Notre méthode", text: p("Un accompagnement structuré, de la première idée<br>jusqu'à la mise en œuvre de votre projet."), pad_top: 34, pad_bottom: 30 }, [
      { type: "step", settings: { number: "01", icon: "bulle", title: "Parler du projet", text: "Nous échangeons sur vos\nenvies, vos besoins et les\nspécificités de votre espace." } },
      { type: "step", settings: { number: "02", icon: "devis-document", title: "Observer l'existant", text: "Nous analysons l'environnement\net les installations en place\npour bien comprendre\nles contraintes." } },
      { type: "step", settings: { number: "03", icon: "cible-ronde", title: "Définir le périmètre", text: "Nous proposons des solutions\nadaptées et un plan\nd'intervention clair." } },
      { type: "step", settings: { number: "04", icon: "calendrier", title: "Planifier les travaux", text: "Nous organisons les différentes\nétapes pour un déroulement\nserein du chantier." } },
    ]),
    S("ph-zone", { eyebrow: "Notre zone d'intervention", heading: "Zone d'intervention\nà renseigner.", title_size: 50, text: p("Nous intervenons dans votre secteur pour des projets<br>de rénovation, d'aménagement ou d'installation électrique."), tag: "Votre ville\net sa région\nà renseigner", pad_top: 26, pad_bottom: 30 }),
    S("ph-cta", { layout: "slim", layout_mobile: "inline", title_size: 46, heading: "Un projet ? Échangeons ensemble.", heading_mobile: "Un projet ?\nÉchangeons\nensemble.", button_label: "Demander un devis", button_link: QUOTE, circuit: "cta-slim", note: "Des échanges\nsimples et concrets\npour avancer.", height: 196, copy_width: 780 }),
  ]);

  // ------------------------------------------------------------------------------------------- Questions fréquentes (planches 03 et 08)
  const Q = (question: string, answer: string, category: string, extra: Record<string, unknown> = {}) => ({ type: "question", settings: { question, answer: p(answer), category, ...extra } });
  page("faq", [
    S("ph-hero", { layout: "navy", title_size: 76, copy_y: 54, eyebrow: "FAQ", heading: "Les réponses qui\néclairent [y]votre projet.[/y]", text: p("Des réponses claires aux questions les plus courantes<br>pour vous aider à avancer sereinement."), image_asset: f("24_article_eclairage"), image_alt: alt("24_article_eclairage"), image_position: "55% 0%", image_zoom: 170, photo_w: 760, height: 487, chips_aria: "Catégories de questions", chips_for: "faq" }, [
      { type: "chip", settings: { label: "Avant les travaux", value: "avant-les-travaux" } }, { type: "chip", settings: { label: "Prestations", value: "prestations" } }, { type: "chip", settings: { label: "Devis", value: "devis" } },
    ]),
    S("ph-faq", { layout: "page", numbered: true, open_first: true, image_asset: f("21_prise_interrupteur"), image_alt: alt("21_prise_interrupteur"), image_position: "88% 45%", image_zoom: 150, box_eyebrow: "Une question\nplus spécifique ?", box_title: "Une autre\nquestion ?", box_text: "Nous sommes à votre écoute\npour échanger sur votre projet\net vous apporter des réponses\nadaptées à votre situation.", box_button: "Nous contacter", box_link: U("contact"), pad_top: 30, pad_bottom: 60 }, [
      Q("Comment se déroule le premier échange ?", "Nous commençons par échanger sur vos besoins, vos usages et vos contraintes. Cet échange nous permet de mieux comprendre votre projet et de vous proposer des solutions adaptées à votre espace et à votre installation existante.", "avant-les-travaux"),
      Q("Intervenez-vous en neuf et en rénovation ?", "Oui : les prestations concernent aussi bien une construction neuve qu'un logement existant à rénover.", "avant-les-travaux"),
      Q("Faut-il fournir des plans ou des photos pour un devis ?", "Ce n'est pas obligatoire. Des photos ou un plan aident à préparer l'échange ; la demande de devis permet de les joindre (JPG, PNG ou PDF).", "avant-les-travaux"),
      Q("Comment se passe l'accès au chantier ?", "Les conditions d'accès (horaires, clés, pièces concernées) sont convenues avec vous avant le début des travaux.", "avant-les-travaux"),
      Q("Pouvez-vous accompagner le choix des équipements ?", "Oui : nous vous aidons à choisir l'éclairage, les prises et les commandes selon vos usages et votre budget.", "avant-les-travaux"),
      Q("Quelles sont les étapes d'un projet ?", "Échange, visite de l'existant, proposition détaillée, planification, réalisation et vérifications finales.", "avant-les-travaux"),
      Q("L'installation est-elle adaptée à mes usages quotidiens ?", "C'est l'objet du premier échange : l'installation est pensée à partir de vos usages actuels et de ceux que vous prévoyez.", "avant-les-travaux"),
      Q("Proposez-vous des solutions pour un éclairage connecté ?", "Des solutions de pilotage (éclairage, volets, chauffage) peuvent être étudiées avec vous selon votre logement.", "avant-les-travaux"),
      Q("Comment se déroule la fin de chantier ?", "Les installations sont vérifiées et les circuits repérés ; nous vous expliquons le fonctionnement de ce qui a été installé.", "avant-les-travaux"),
      Q("Quelles prestations proposez-vous ?", "Installation et rénovation, tableau et sécurité, éclairage intérieur et extérieur, dépannage, prises et équipements, pilotage et confort.", "prestations"),
      Q("Intervenez-vous pour un simple dépannage ?", "Oui : décrivez la situation (localisation, symptômes, contexte) dans la demande ; nous revenons vers vous pour convenir d'un rendez-vous.", "prestations"),
      Q("Pouvez-vous moderniser un tableau existant ?", "Selon son état, une mise à niveau ou un remplacement peut être proposé après observation sur place.", "prestations"),
      Q("Le devis est-il payant ?", "[À compléter : conditions du devis à préciser par l'entreprise]", "devis"),
      Q("Que contient le devis ?", "Le périmètre des travaux, les équipements proposés et les étapes de réalisation, présentés de façon détaillée.", "devis"),
      Q("Comment demander un devis ?", "Par le formulaire « Demande de devis » : type de projet, lieu, délai souhaité, description et, si vous le souhaitez, des photos.", "devis"),
    ]),
    S("ph-cta", { layout: "slim", layout_mobile: "soft", title_size: 40, heading: "Besoin d'un complément d'information ?", text: p("Échangeons sur votre projet pour trouver ensemble la solution la plus adaptée."), button_label: "Demander un devis", button_link: QUOTE, circuit: "cta-slim", note: "Des réponses\nclaires pour avancer\nen toute sérénité.", height: 170, copy_width: 790 }),
  ]);

  // ------------------------------------------------------------------------------------------- Conseils et articles (planches 04 et 09)
  // Conseils généraux, sans promesse ni chiffre : chaque carte ouvre sa page. Deux catégories d'affichage : celles de
  // l'ordinateur (Préparer, Rénover, Éclairer) et celles du téléphone (Préparer, Éclairage, Rénovation, Équipements).
  const ART = (slug: string) => `/pages/conseil-${slug}`;
  type Art = { slug: string; title: string; card: string; text: string; cat: string; catM: string; cats: string; image: string; pos?: string; oM: number; heading: string; intro: string;
    parts: [string, string, string][]; checks: string; related: [string, string] };
  const ARTICLES: Art[] = [
    { slug: "bien-preparer-votre-renovation-electrique", title: "Bien préparer votre rénovation électrique", card: "Bien préparer votre\nrénovation électrique.", text: "Les étapes clés pour un projet serein\net bien accompagné.", cat: "Préparer", catM: "Préparer", cats: "preparer", image: "26_renovation_conseil", oM: 5,
      heading: "Bien préparer\nvotre [y]rénovation électrique.[/y]", intro: "Quelques repères pour aborder une rénovation sereinement, du premier échange aux finitions.",
      parts: [["Faire le point sur l'existant", "Un état des lieux partagé.", "Avant de choisir, il est utile de connaître l'installation en place : son âge apparent, les pièces concernées et les usages qui ont changé depuis."], ["Lister vos usages", "Ce qui compte au quotidien.", "Pièces de vie, télétravail, équipements à venir : vos usages guident l'emplacement des prises, des points lumineux et des commandes."]],
      checks: "Noter les pièces concernées\nRepérer les équipements à prévoir\nPréparer quelques photos de l'existant", related: ["comprendre-le-contenu-d-un-devis-electrique", "moderniser-son-tableau-electrique"] },
    { slug: "choisir-son-eclairage-selon-les-usages", title: "Choisir son éclairage selon les usages", card: "Choisir son éclairage\nselon les usages.", text: "Pièces de vie, travail, détente :\ndes ambiances adaptées à chaque\nespace.", cat: "Éclairer", catM: "Éclairage", cats: "eclairer", image: "24_article_eclairage", pos: "50% 40%", oM: 6,
      heading: "Choisir son éclairage\n[y]selon les usages.[/y]", intro: "Chaque pièce a ses besoins : une lumière fonctionnelle pour travailler, plus douce pour se détendre.",
      parts: [["Partir des activités", "Une lumière pour chaque moment.", "Cuisiner, lire, recevoir : on identifie d'abord ce qui se passe dans la pièce, puis on choisit le type d'éclairage adapté."], ["Combiner les sources", "Ensemble, appoint et ambiance.", "Un éclairage d'ensemble, des points d'appoint et quelques lumières d'ambiance offrent de la souplesse au quotidien."]],
      checks: "Identifier les activités de chaque espace\nPrévoir un éclairage d'ensemble et des appoints\nPenser aux commandes et aux variateurs", related: ["bien-preparer-son-projet-d-eclairage", "creer-une-ambiance-lumineuse"] },
    { slug: "penser-ses-prises-au-quotidien", title: "Penser ses prises au quotidien", card: "Penser ses prises\nau quotidien.", text: "Des emplacements bien choisis\npour plus de confort et de praticité.", cat: "Rénover", catM: "Rénovation", cats: "renover", image: "21_prise_interrupteur", pos: "50% 45%", oM: 7,
      heading: "Penser ses prises\n[y]au quotidien.[/y]", intro: "Des prises au bon endroit évitent les rallonges et rendent chaque pièce plus pratique.",
      parts: [["Observer vos habitudes", "Là où vous branchez vraiment.", "Bureau, plan de travail, chevets, entrée : listez les appareils utilisés dans chaque pièce et leur emplacement."], ["Anticiper", "Les besoins de demain.", "Un nouvel équipement ou un aménagement à venir se prévoit plus simplement au moment des travaux."]],
      checks: "Lister les appareils par pièce\nPrévoir les prises du plan de travail\nPenser aux besoins à venir", related: ["bien-preparer-votre-renovation-electrique", "moderniser-son-tableau-electrique"] },
    { slug: "comprendre-le-contenu-d-un-devis-electrique", title: "Comprendre le contenu d'un devis électrique", card: "Comprendre le contenu\nd'un devis électrique.", text: "Les éléments essentiels pour bien\ncomparer et faire le bon choix.", cat: "Préparer", catM: "Préparer", cats: "preparer", image: "25_besoins_plans", oM: 8,
      heading: "Comprendre le contenu\n[y]d'un devis électrique.[/y]", intro: "Quelques repères pour lire un devis et poser les bonnes questions.",
      parts: [["Le périmètre", "Ce qui est inclus.", "Un devis détaille les pièces concernées, les équipements prévus et les travaux à réaliser : vérifiez qu'il correspond bien à votre demande."], ["Les étapes", "Comment le chantier s'organise.", "Les étapes de réalisation et l'organisation des travaux vous aident à anticiper la vie dans le logement pendant le chantier."]],
      checks: "Vérifier les pièces et équipements listés\nRepérer ce qui est optionnel\nDemander des précisions si besoin", related: ["bien-preparer-votre-renovation-electrique", "definir-ses-besoins-et-son-mode-de-vie"] },
    { slug: "creer-une-ambiance-lumineuse", title: "Créer une ambiance lumineuse harmonieuse", card: "Créer une ambiance\nlumineuse harmonieuse.", text: "Températures de couleur, intensités,\nmise en valeur des espaces.", cat: "Éclairer", catM: "Éclairage", cats: "eclairer", image: "04_eclairage_interieur", oM: 9,
      heading: "Créer une ambiance\n[y]lumineuse harmonieuse.[/y]", intro: "Couleur de lumière, intensité et emplacement : trois repères pour une ambiance cohérente.",
      parts: [["La couleur de la lumière", "Chaude ou plus neutre.", "Une lumière chaude apporte une atmosphère douce ; une lumière plus neutre convient mieux aux espaces de travail."], ["L'intensité", "Varier selon les moments.", "Des variateurs ou plusieurs circuits permettent d'adapter l'ambiance du matin au soir."]],
      checks: "Choisir une couleur de lumière cohérente\nPrévoir plusieurs niveaux d'éclairage\nMettre en valeur un mur ou un objet", related: ["bien-preparer-son-projet-d-eclairage", "bien-choisir-ses-luminaires"] },
    { slug: "moderniser-son-tableau-electrique", title: "Moderniser son tableau électrique", card: "Moderniser son tableau\nélectrique.", text: "Un point clé pour la sécurité,\nle confort et l'évolutivité de votre\ninstallation.", cat: "Rénover", catM: "Rénovation", cats: "renover", image: "09_tableau_renove", pos: "50% 30%", oM: 10,
      heading: "Moderniser son\n[y]tableau électrique.[/y]", intro: "Le tableau organise toute l'installation : quelques repères pour savoir quand en parler à un professionnel.",
      parts: [["Les signes à observer", "Quand se poser la question.", "Un tableau ancien, sans place pour de nouveaux circuits ou difficile à lire mérite d'être examiné par un professionnel."], ["Un tableau lisible", "Des circuits repérés.", "Un repérage clair de chaque circuit facilite l'usage au quotidien et les interventions futures."]],
      checks: "Noter l'âge apparent du tableau\nRepérer les circuits non identifiés\nLister les équipements à ajouter", related: ["anticiper-la-mise-aux-normes-electriques", "bien-preparer-votre-renovation-electrique"] },
    { slug: "definir-ses-besoins-et-son-mode-de-vie", title: "Définir ses besoins et son mode de vie", card: "Définir ses besoins\net son mode de vie.", text: "Les bonnes questions à se poser\navant de démarrer votre projet.", cat: "Préparer", catM: "Préparer", cats: "preparer", image: "12_sejour_renove", oM: 1,
      heading: "Définir ses besoins\n[y]et son mode de vie.[/y]", intro: "Les bonnes questions à se poser avant de démarrer un projet électrique.",
      parts: [["Qui vit dans le logement ?", "Des besoins qui évoluent.", "Le nombre d'occupants, le télétravail ou l'arrivée d'un nouvel équipement changent la façon d'utiliser chaque pièce."], ["Ce qui vous gêne aujourd'hui", "Le point de départ.", "Une prise qui manque, une pièce trop sombre : ces petits irritants sont de bons points de départ."]],
      checks: "Lister les occupants et leurs usages\nNoter ce qui manque aujourd'hui\nImaginer les besoins à venir", related: ["comprendre-le-contenu-d-un-devis-electrique", "penser-ses-prises-au-quotidien"] },
    { slug: "bien-choisir-ses-luminaires", title: "Bien choisir ses luminaires", card: "Bien choisir\nses luminaires.", text: "Des repères simples pour une\nambiance adaptée à chaque pièce.", cat: "Éclairer", catM: "Éclairage", cats: "eclairer", image: "20_spots_plafond", oM: 2,
      heading: "Bien choisir\n[y]ses luminaires.[/y]", intro: "Des repères simples pour une ambiance adaptée à chaque pièce.",
      parts: [["Suspensions, spots, appliques", "À chaque type son rôle.", "Une suspension structure une table, des spots éclairent uniformément, une applique apporte une lumière d'ambiance."], ["La bonne hauteur", "Confort et équilibre.", "La hauteur et l'emplacement des luminaires se pensent avec le mobilier pour éviter l'éblouissement."]],
      checks: "Associer un type de luminaire à chaque usage\nVérifier les hauteurs avec le mobilier\nPrévoir les commandes adaptées", related: ["creer-une-ambiance-lumineuse", "bien-preparer-son-projet-d-eclairage"] },
    { slug: "anticiper-la-mise-aux-normes-electriques", title: "Anticiper la mise aux normes électriques", card: "Anticiper la mise\naux normes électriques.", text: "Les points essentiels pour un\nlogement plus sûr et plus confortable.", cat: "Rénover", catM: "Rénovation", cats: "renover", image: "03_tableau_electrique", oM: 3,
      heading: "Anticiper la mise\n[y]aux normes électriques.[/y]", intro: "Une installation ancienne se vérifie sur place : voici les questions à aborder avec un professionnel.",
      parts: [["Faire vérifier l'existant", "Un examen sur place.", "Seule une observation de l'installation par un professionnel permet de savoir ce qui doit être revu ; aucune conclusion ne se tire d'une photo."], ["Prioriser", "Avancer par étapes.", "Selon ce qui est observé, les travaux peuvent être organisés par priorité et par pièce."]],
      checks: "Rassembler les informations sur le logement\nNoter les anomalies constatées\nPrévoir un échange avec un professionnel", related: ["moderniser-son-tableau-electrique", "bien-preparer-votre-renovation-electrique"] },
    { slug: "eclairage-exterieur", title: "Éclairage extérieur : allier confort et sécurité", card: "Éclairage extérieur :\nallier confort et sécurité.", text: "Des solutions adaptées pour vos\naccès, terrasses et jardins.", cat: "Éclairer", catM: "Équipements", cats: "eclairer equipements", image: "10_eclairage_exterieur", oM: 4,
      heading: "Éclairage extérieur :\n[y]confort et sécurité.[/y]", intro: "Des solutions adaptées pour vos accès, terrasses et jardins.",
      parts: [["Éclairer les accès", "Se repérer le soir.", "Allées, marches et entrée gagnent à être éclairées pour circuler confortablement à la nuit tombée."], ["Mettre en valeur", "Façade et végétation.", "Quelques points lumineux bien placés valorisent la façade et le jardin sans éblouir."]],
      checks: "Repérer les zones de passage\nChoisir des équipements adaptés à l'extérieur\nPrévoir des commandes pratiques", related: ["bien-choisir-ses-luminaires", "creer-une-ambiance-lumineuse"] },
  ];
  const FULL: { slug: string; title: string; card: string; text: string; cat: string; catM: string; cats: string; image: string; pos?: string; oM: number } = { slug: "bien-preparer-son-projet-d-eclairage", title: "Bien préparer son projet d'éclairage", card: "Bien préparer son\nprojet d'éclairage.", text: "Usages, ambiances et points à prévoir\npour un éclairage réussi.", cat: "Éclairer", catM: "Éclairage", cats: "eclairer preparer", image: "24_article_eclairage", oM: 11 };
  const catOf = (slug: string) => [...ARTICLES, FULL].find((x) => x.slug === slug)!;
  page("conseils", [
    S("ph-hero", { layout: "navy", title_size: 80, copy_y: 72, eyebrow: "Conseils", heading: "Les bons repères,\n[y]avant de se lancer.[/y]", text: p("Des conseils concrets pour bien préparer votre projet<br>et faire les bons choix, en toute sérénité."), text_mobile: p("Des conseils concrets pour bien préparer<br>votre projet et faire les bons choix."), image_asset: f("23_conseils_hero"), image_alt: alt("23_conseils_hero"), image_position: "60% 50%", photo_w: 970, height: 527, caption: "Visuels de démonstration", circuit: "home", chips_below: true, chips_aria: "Catégories de conseils", chips_for: "posts" }, [
      { type: "chip", settings: { label: "Tous les conseils", value: "all", show: "desktop" } }, { type: "chip", settings: { label: "Tous", value: "all", show: "mobile" } },
      { type: "chip", settings: { label: "Préparer", value: "preparer" } },
      { type: "chip", settings: { label: "Rénover", value: "renover", show: "desktop" } }, { type: "chip", settings: { label: "Éclairer", value: "eclairer", show: "desktop" } },
      { type: "chip", settings: { label: "Éclairage", value: "eclairer", show: "mobile" } }, { type: "chip", settings: { label: "Rénovation", value: "renover", show: "mobile" } }, { type: "chip", settings: { label: "Équipements", value: "equipements", show: "mobile" } },
    ]),
    S("ph-cards", { layout: "posts", columns: 3, per_page: 6, per_page_mobile: 4, pad_top: 0, pad_bottom: 50 }, [...ARTICLES, FULL].map((x) => ({ type: "card", settings: { image_asset: f(x.image), alt: alt(x.image), position: x.pos ?? "50% 50%", category: x.cats, label: x.cat, label_mobile: x.catM, title: x.card.replace(/\n/g, " "), text: x.text, link: ART(x.slug), link_label: "Lire l'article", order_mobile: x.oM } }))),
  ]);
  const articlePage = (slug: string, title: string, rows: Row[]) => {
    spec.templates[`page.ph-conseil-${slug}`] = phTemplate([...rows, pageRow({ footer_mobile: "split", scale: 78 })]);
    spec.store.pages = spec.store.pages.filter((y) => y.handle !== `conseil-${slug}`);
    spec.store.pages.push({ handle: `conseil-${slug}`, title, template_suffix: `ph-conseil-${slug}`, body_html: "" });
  };
  const rel = (slug: string, mobileOnly = false) => { const r = catOf(slug); return { type: "related", settings: { image_asset: f(r.image), position: r.pos ?? "50% 50%", kicker: mobileOnly ? r.catM : "", title: r.card.replace(/\n/g, " "), link_label: mobileOnly ? "" : "Lire l'article", link: ART(r.slug), show: mobileOnly ? "mobile" : "desktop" } }; };
  for (const a of ARTICLES) {
    articlePage(a.slug, a.title, [
      S("ph-hero", { layout: "plain", title_size: 80, crumb_parent: "Conseils", crumb_parent_link: U("conseils"), crumb_current: a.title, eyebrow: `${a.cat} • Guide pratique`, heading: a.heading, text: p(a.intro), circuit: "p02", note: "Des espaces\nplus confortables\nau quotidien.", note_x: 1218, note_y: 30, height: 330 }),
      S("ph-article", { toc_title: "Dans cet article", box_image_asset: f(a.image), box_title: "Un projet ?", box_text: "Parlons de vos idées.", box_button: "Demander un devis", box_link: QUOTE }, [
        { type: "image", settings: { image_asset: f(a.image), alt: alt(a.image), position: a.pos ?? "50% 50%", caption: "Visuel de démonstration" } },
        ...a.parts.map(([t, sub, txt], i) => ({ type: "part", settings: { number: `0${i + 1}`, title: t, subtitle: sub, text: p(txt) } })),
        { type: "checklist", settings: { items: a.checks, boxed: true } },
        { type: "callout", settings: { style: "navy", title: "Une question sur votre projet ?", text: "Échangeons sur vos besoins et vos idées.", button: "Parlons de vos idées", link: QUOTE, show: "desktop" } },
        { type: "callout", settings: { style: "yellow", title: "Besoin d'un accompagnement ?", text: "Un projet bien préparé est plus simple à réaliser.", button: "Demander un devis", link: QUOTE, show: "mobile" } },
        { type: "related_title", settings: { title: "Articles liés", show: "desktop" } }, { type: "related_title", settings: { title: "Articles liés", show: "mobile" } },
        ...a.related.flatMap((r) => [rel(r), rel(r, true)]),
      ]),
    ]);
  }
  // Article complet de la planche 04 (ordinateur) et 09 (téléphone).
  articlePage(FULL.slug, FULL.title, [
    S("ph-hero", { layout: "plain", title_size: 80, crumb_parent: "Conseils", crumb_parent_link: U("conseils"), crumb_current: "Bien préparer son projet d'éclairage", eyebrow: "Éclairage • Guide pratique", badge: "Guide pratique", heading: "Bien préparer son\nprojet [y]d'éclairage.[/y]", heading_mobile: "Bien préparer\nson projet\n[y]d'éclairage.[/y]", text: p("Des repères simples pour créer un éclairage adapté à vos espaces,<br>à vos usages et à vos envies, dans le cadre d'une rénovation<br>ou d'une installation neuve."), text_mobile: p("Des repères simples pour faire les bons choix et créer une ambiance adaptée à chaque espace."), circuit: "p02", note: "Des espaces\nplus confortables\nau quotidien.", note_x: 1218, note_y: 30, height: 360 }),
    S("ph-article", { toc_title: "Dans cet article", box_image_asset: f("10_eclairage_exterieur"), box_image_position: "90% 25%", box_title: "Un projet d'éclairage ?", box_text: "Parlons de vos idées.", box_button: "Demander un devis", box_link: QUOTE }, [
      { type: "image", settings: { image_asset: f("24_article_eclairage"), alt: alt("24_article_eclairage"), position: "50% 55%", caption: "Visuel de démonstration" } },
      { type: "part", settings: { number: "01", title: "Les usages", subtitle: "Un éclairage adapté à chaque moment.", text: p("Chaque pièce a ses besoins : un éclairage fonctionnel pour cuisiner, plus doux pour se détendre, et précis pour travailler. L'objectif est d'assurer un bon confort visuel tout en valorisant vos espaces."), text_mobile: p("L'éclairage doit s'adapter à vos activités du quotidien. Chaque pièce a ses besoins : circulation, travail, détente ou réception.") } },
      { type: "checklist", settings: { items: "Identifier les activités de chaque espace\nAdapter l'intensité de l'éclairage\nPrévoir un éclairage fonctionnel et un éclairage d'ambiance", boxed: true, show: "mobile" } },
      { type: "photos", settings: { image1_asset: f("07_cuisine_contemporaine"), position1: "50% 20%", caption1: "Cuisine\nUn éclairage fonctionnel et homogène pour plus de confort.", image2_asset: f("12_sejour_renove"), position2: "50% 55%", caption2: "Salon\nUne ambiance chaleureuse et modulable selon vos envies.", image3_asset: f("20_spots_plafond"), position3: "80% 30%", caption3: "Bureau\nUn éclairage plus ciblé pour favoriser la concentration.", show: "desktop" } },
      { type: "part", settings: { number: "02", title: "Les ambiances", subtitle: "Des atmosphères qui vous ressemblent.", text: p("La température de couleur, l'intensité et le choix des luminaires influencent l'ambiance de votre intérieur. Un éclairage bien pensé met en valeur les volumes et les matériaux, tout en créant une atmosphère agréable au quotidien."), text_mobile: p("La température et l'intensité de la lumière influencent le confort. Une lumière chaude apporte une atmosphère douce, tandis qu'une lumière plus neutre est idéale pour les espaces de travail.") } },
      { type: "figure", settings: { image_asset: f("11_chambre_eclairage"), alt: alt("11_chambre_eclairage"), position: "50% 45%", caption: "Projet illustratif", show: "desktop" } },
      { type: "figure", settings: { image_asset: f("11_chambre_eclairage"), alt: alt("11_chambre_eclairage"), position: "50% 45%", caption: "Projet illustratif", show: "mobile" } },
      { type: "part", settings: { number: "03", title: "Les points à prévoir", subtitle: "Les éléments essentiels pour un projet réussi.", text_mobile: p("Pensez à l'emplacement des interrupteurs, aux types de luminaires et aux possibilités de variation. L'éclairage extérieur, les circulations et les rangements méritent aussi une attention particulière.") } },
      { type: "checklist", settings: { items: "Définir les usages de chaque pièce\nChoisir des luminaires adaptés et bien positionnés\nAnticiper les commandes (interrupteurs, variateurs, etc.)", show: "desktop" } },
      { type: "checklist", settings: { items: "Emplacements des points lumineux\nType de luminaires et ampoules\nSolutions de variation (volets, détecteurs…)\nCohérence avec la décoration\nÉclairage extérieur et circulations", boxed: true, show: "mobile" } },
      { type: "callout", settings: { style: "navy", title: "Une question sur votre projet ?", text: "Échangeons sur vos besoins et vos idées.", button: "Parlons de vos idées", link: QUOTE, show: "desktop" } },
      { type: "callout", settings: { style: "yellow", title: "Besoin d'un accompagnement ?", text: "Un projet bien préparé est plus simple à réaliser.", button: "Demander un devis", link: QUOTE, show: "mobile" } },
      { type: "related_title", settings: { title: "Articles liés", show: "desktop" } }, { type: "related_title", settings: { title: "Articles liés", show: "mobile" } },
      rel("choisir-son-eclairage-selon-les-usages"), rel("creer-une-ambiance-lumineuse"), rel("penser-ses-prises-au-quotidien"),
      rel("definir-ses-besoins-et-son-mode-de-vie", true), rel("anticiper-la-mise-aux-normes-electriques", true),
    ]),
  ]);

  // ------------------------------------------------------------------------------------------- Contact et demande de devis (planches 04 et 09)
  const CONTACT_FAQ = [
    Q("Comment se déroule un premier échange ?", "Nous échangeons sur votre besoin, par téléphone ou par message, puis convenons ensemble de la suite (visite, demande de devis).", ""),
    Q("Faut-il se déplacer pour un devis ?", "Une visite permet souvent de préciser le projet ; elle est convenue avec vous selon la nature des travaux.", ""),
    Q("Quels éléments préparer avant notre échange ?", "Le type de logement, les pièces concernées, quelques photos et vos disponibilités suffisent pour bien démarrer.", ""),
    Q("Intervenez-vous dans ma région ?", "[À compléter : zone d'intervention de l'entreprise]", ""),
  ];
  page("contact", [
    S("ph-contact", { eyebrow: "Contact", heading: "Parlons de\n[y]votre projet.[/y]", title_size: 80, text: p("Une question, un projet, une envie ?<br>Échangeons sur vos besoins, nous sommes à votre écoute."), phone: "Téléphone à renseigner", email: "E-mail à renseigner", area: "Zone d'intervention à préciser", hours: "Horaires à renseigner", image_asset: f("14_maison_installation"), image_alt: alt("14_maison_installation"), image_position: "60% 50%", caption: "Visuels de démonstration", circuit: true, note: "Des échanges\nclairs et simples.", privacy_link: U("donnees-et-cookies"), pad_top: 22, pad_bottom: 20 }),
    S("ph-faq", { layout: "split", title_size: 33, heading: "Questions fréquentes", text: p("Des réponses aux questions les plus courantes,<br>pour vous aider à y voir plus clair."), more_label: "", pad_top: 20, pad_bottom: 26 }, CONTACT_FAQ),
  ]);
  page("demande-de-devis", [
    S("ph-quote", { eyebrow: "Demande de devis", heading: "Votre projet\n[y]commence ici.[/y]", title_size: 74, text: p("Décrivez-nous votre projet et vos besoins, nous reviendrons vers vous<br>pour en échanger et vous proposer une solution adaptée."), circuit: true, note: "Un accompagnement\nsur mesure\npour votre projet.", privacy_link: U("donnees-et-cookies"), image_asset: f("25_besoins_plans"), image_alt: alt("25_besoins_plans"), caption: "Visuels de démonstration", help_title: "Une question avant de vous lancer ?", help_text: "Notre équipe est à votre écoute pour échanger sur votre projet.", help_button: "Nous contacter", help_link: U("contact"), pad_top: 22, pad_bottom: 18 }, [
      { type: "step", settings: { number: "01", icon: "bulle", title: "Étude du besoin", text: "Nous prenons connaissance de votre projet et de vos besoins." } },
      { type: "step", settings: { number: "02", icon: "projet-echange", title: "Échange", text: "Un échange pour préciser les détails et répondre à vos questions." } },
      { type: "step", settings: { number: "03", icon: "devis-document", title: "Proposition adaptée", text: "Une solution claire et adaptée à votre projet." } },
    ]),
  ]);

  // ------------------------------------------------------------------------------------------- Confirmation, mentions, données, 404 (planches 05 et 10)
  page("demande-envoyee", [
    S("ph-hero", { layout: "plain", title_size: 82, crumb_current: "Confirmation", heading: "Votre demande\nest bien [y]enregistrée.[/y]", text: p("Un échange permettra de préciser votre besoin<br>et les prochaines étapes."), done_icon: true, circuit: "p02", note: "Merci\npour votre\nconfiance.", note_x: 1225, note_y: 30, height: 340 }),
    S("ph-confirm", { eyebrow: "Votre demande", heading: "Récapitulatif de votre demande", back_label: "Retour à l'accueil", back_link: "/", next_label: "Voir les conseils", next_link: U("conseils"), image_asset: f("06_renovation_appartement"), image_alt: alt("06_renovation_appartement"), image_position: "40% 50%", help_title: "Une question ?", help_text: "Notre équipe est à votre écoute pour échanger sur votre projet et vous accompagner dans les prochaines étapes.", help_button: "Nous contacter", help_link: U("contact") }),
  ]);
  page("mentions-legales", [
    S("ph-hero", { layout: "plain", title_size: 82, crumb_current: "Mentions légales", heading: "Mentions [y]légales[/y]", text: p("Structure de démonstration — informations à compléter."), circuit: "p02", note: "Un cadre clair\npour une relation\nde confiance.", note_x: 1225, note_y: 30, height: 240 }),
    S("ph-legal", { image_asset: f("13_couloir_eclaire"), image_alt: alt("13_couloir_eclaire"), caption: "Visuel de démonstration", credits_title: "Crédits et propriété intellectuelle", credits_text: p("Visuels de démonstration à remplacer par vos réalisations.<br>Tous les contenus du site (textes, visuels, graphismes) sont la propriété de PHASE ÉLECTRICITÉ<br>ou de leurs auteurs respectifs.") }, ["Éditeur", "Statut juridique", "SIRET", "Siège social", "Responsable de publication", "Hébergement"].map((label) => ({ type: "row", settings: { label, value: "À renseigner" } }))),
  ]);
  page("donnees-et-cookies", [
    S("ph-hero", { layout: "plain", title_size: 82, crumb_current: "Confidentialité & cookies", heading: "Vos données,\nen [y]toute clarté.[/y]", text: p("Structure à compléter selon les outils utilisés."), circuit: "p02", note: "Des données\ntraitées avec\ntransparence.", note_x: 1225, note_y: 30, height: 330 }),
    S("ph-privacy", { prefs_title: "Gestion des cookies", prefs_text: p("Vous pouvez personnaliser ci-dessous vos préférences en matière de cookies.<br>Cette configuration est un exemple et pourra être adaptée selon les outils utilisés."), save_label: "Personnaliser" }, [
      { type: "info", settings: { icon: "devis-document", title: "Données du formulaire", text: "Les informations transmises via nos formulaires sont utilisées uniquement pour répondre à vos demandes." } },
      { type: "info", settings: { icon: "cible-ronde", title: "Finalité des demandes", text: "Vos données nous permettent d'analyser votre besoin et de revenir vers vous avec des informations adaptées." } },
      { type: "info", settings: { icon: "horloge", title: "Conservation des données", text: "La durée de conservation est à définir en fonction des outils et des obligations légales applicables." } },
      { type: "info", settings: { icon: "cadenas", title: "Vos droits", text: "Conformément à la réglementation applicable, vous pouvez demander l'accès, la rectification ou la suppression de vos données." } },
      { type: "pref", settings: { key: "necessary", icon: "cadenas", title: "Nécessaires", text: "Cookies indispensables au bon fonctionnement du site." } },
      { type: "pref", settings: { key: "audience", icon: "graphique", title: "Mesure d'audience", text: "Nous aide à améliorer nos contenus en analysant la fréquentation du site. Aucun outil n'est branché sur ce site de démonstration." } },
      { type: "pref", settings: { key: "external", icon: "lecture", title: "Contenus externes", text: "Permet l'affichage de contenus tiers (cartes, vidéos, réseaux sociaux…). Aucun contenu externe sur ce site de démonstration." } },
    ]),
  ]);
  spec.templates["404"] = phTemplate([
    S("ph-hero", { layout: "notfound", title_size: 74, crumb_current: "404", heading: "On a perdu le contact.", text: p("Cette page n'est pas disponible."), button_label: "Retour à l'accueil", button_link: "/", button2_label: "Voir les prestations", button2_link: U("prestations"), button2_mobile: true, circuit: "n404-note", note: "Certaines pages\nprennent parfois\nun autre chemin.", note_x: 1194, note_y: 84, height: 600 }),
    S("ph-cards", { layout: "shortcuts", columns: 4, eyebrow: "Découvrir nos services", pad_top: 0, pad_bottom: 30 }, [
      { type: "card", settings: { image_asset: f("16_projet_ambiance"), alt: alt("16_projet_ambiance"), title: "Éclairage", link_label: "En savoir plus", link: U("eclairage") } },
      { type: "card", settings: { image_asset: f("21_prise_interrupteur"), alt: alt("21_prise_interrupteur"), position: "70% 50%", title: "Prises & équipements", link_label: "En savoir plus", link: U("installation-et-renovation") } },
      { type: "card", settings: { image_asset: f("03_tableau_electrique"), alt: alt("03_tableau_electrique"), title: "Tableaux & sécurité", link_label: "En savoir plus", link: U("tableau-et-securite") } },
      { type: "card", settings: { image_asset: f("10_eclairage_exterieur"), alt: alt("10_eclairage_exterieur"), position: "85% 30%", title: "Dépannage électrique", link_label: "En savoir plus", link: U("depannage") } },
    ]),
    pageRow({ footer_mobile: "stack", scale: 90 }),
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
