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
    S("ph-hero", { layout: "home", eyebrow: "Installation • Rénovation • Dépannage", heading: "Le courant passe.\n[y]La confiance aussi.[/y]", text: p("Des installations pensées pour votre quotidien,<br>du premier échange aux dernières finitions."), button_label: "Parlons de votre projet", button_link: QUOTE, button2_label: "Voir les prestations", button2_link: U("prestations"), image_asset: f("01_accueil_hero"), image_alt: alt("01_accueil_hero"), image_w: 1544, image_x: 285, image_y: 0, image_position_mobile: "72% 50%", photo_w: 740, detail_asset: f("01_accueil_hero"), detail_w: 1706, detail_x: -187, detail_y: -408, caption: "Visuel de démonstration", circuit: "home", note: "L'énergie\nd'un quotidien\nplus simple.", height: 869, height_mobile: 230 }),
    S("ph-cards", { layout: "strip", columns: 4, background: "white", pad_top: 55, pad_bottom: 70 }, [
      { type: "card", settings: { number: "01", icon: "installation", title: "Installation", text: "Des bases solides\npour durer.", text_mobile: "Des bases solides pour durer.", link: U("installation-et-renovation") } },
      { type: "card", settings: { number: "02", icon: "cle", title: "Rénovation", text: "Modernisez et\ngagnez en confort.", text_mobile: "Modernisez et gagnez en confort.", link: U("installation-et-renovation") } },
      { type: "card", settings: { number: "03", icon: "ampoule", title: "Éclairage", text: "Sublimez vos espaces\nau quotidien.", text_mobile: "Sublimez vos espaces au quotidien.", link: U("eclairage") } },
      { type: "card", settings: { number: "04", icon: "depannage-eclair", title: "Dépannage", text: "Une solution adaptée\nà chaque situation.", text_mobile: "Une solution adaptée à chaque\nsituation.", link: U("depannage") } },
    ]),
    S("ph-cards", { layout: "services", columns: 3, background: "soft", eyebrow: "Nos prestations", heading: "De bonnes bases,\njusque dans les détails.", text: p("Rénovation, équipements, éclairage :<br>des solutions sur mesure pour des espaces<br>plus sûrs, plus pratiques et plus agréables<br>à vivre."), pad_top: 46, pad_bottom: 27 }, [
      { type: "card", settings: { image_asset: f("26_renovation_conseil"), alt: alt("26_renovation_conseil"), position: "30% 60%", title: "Installation & rénovation", text: "Des installations adaptées\nà vos besoins, en neuf comme\nen rénovation.", text_mobile: "Des installations adaptées à vos besoins,\nen neuf comme en rénovation.", link_label: "Découvrir", link: U("installation-et-renovation") } },
      { type: "card", settings: { image_asset: f("03_tableau_electrique"), alt: alt("03_tableau_electrique"), title: "Tableau électrique", text: "Un tableau bien pensé pour\nune installation fiable et évolutive.", text_mobile: "Un tableau bien pensé pour une\ninstallation fiable et évolutive.", link_label: "Découvrir", link: U("tableau-et-securite") } },
      { type: "card", settings: { image_asset: f("20_spots_plafond"), alt: alt("20_spots_plafond"), position: "50% 0%", title: "Éclairage", text: "Des ambiances lumineuses\nqui valorisent vos espaces\net votre confort.", text_mobile: "Des ambiances lumineuses qui\nvalorisent vos espaces et votre confort.", link_label: "Découvrir", link: U("eclairage") } },
    ]),
    S("ph-steps", { layout: "navy", layout_mobile: "timeline", background: "navy", eyebrow: "Notre approche", heading: "Un projet clair.\nÀ chaque étape.", text: p("Un accompagnement simple et structuré,<br>pour avancer sereinement de la première<br>idée jusqu'aux dernières finitions."), pad_top: 80, pad_bottom: 47 }, [
      { type: "step", settings: { number: "01", icon: "projet-echange", title: "Échanger", text: "Nous prenons le temps de comprendre\nvos besoins, vos envies et les spécificités\nde votre projet." } },
      { type: "step", settings: { number: "02", icon: "devis-document", title: "Préparer", text: "Nous définissons ensemble les solutions\nles plus adaptées et un plan d'intervention\nclair et réaliste." } },
      { type: "step", settings: { number: "03", icon: "reglages", title: "Réaliser", text: "Nous mettons en œuvre votre projet\ndans le respect des choix validés\net des finitions soignées." } },
    ]),
    S("ph-cards", { layout: "projects", columns: 2, eyebrow: "Réalisations", heading: "Des espaces qui prennent vie.", heading_mobile: "Des espaces\nqui prennent vie.", note: "Projets illustratifs", pad_top: 66, pad_bottom: 35 }, [
      { type: "card", settings: { image_asset: f("12_sejour_renove"), alt: alt("12_sejour_renove"), title: "Rénovation d'un séjour", text: "Un espace plus lumineux et fonctionnel.", label: "Projet illustratif", link: "/pages/realisation-renovation-d-un-sejour" } },
      { type: "card", settings: { image_asset: f("03_tableau_electrique"), alt: alt("03_tableau_electrique"), title: "Mise en place d'un tableau électrique", text: "Une installation propre et évolutive.", label: "Projet illustratif", link: "/pages/realisation-mise-en-place-d-un-tableau-electrique", show: "desktop" } },
      { type: "card", settings: { image_asset: f("13_couloir_eclaire"), alt: alt("13_couloir_eclaire"), title: "Éclairage d'un couloir", text: "Une ambiance moderne et chaleureuse.", label: "Projet illustratif", link: "/pages/realisation-eclairage-d-un-couloir", show: "mobile" } },
      { type: "card", settings: { image_asset: f("14_maison_installation"), alt: alt("14_maison_installation"), title: "Installation dans une cuisine", text: "Des équipements intégrés et pratiques.", label: "Projet illustratif", link: "/pages/realisation-amenagement-d-une-cuisine-contemporaine", show: "mobile" } },
    ]),
    S("ph-cta", { layout: "band", layout_mobile: "band", eyebrow: "Votre projet", heading: "On met votre projet\nsous tension ?", button_label: "Demander un devis", button_link: QUOTE, circuit: "cta", note: "Des idées\naux réalisations,\nen toute confiance." }),
    pageRow(LOOK_06),
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
