/**
 * APLAT — Plâtrerie & Peinture (consigne de Thomas du 25 octobre 2026, dossier `docs/theme-briefs/aplat/`) : site de
 * démonstration d'un artisan plâtrier-peintre, composé par le vrai moteur dans le thème « aplat », puis rédigé avec les
 * textes des dix planches (18 pages, ordinateur et téléphone).
 *
 * Photos : 28 reconstitutions IA fournies par Thomas (kit privé `public/demo/aplat/`, hors dépôt) et le logo original
 * en transparence. Les reconstitutions ne sont pas les photographies des planches : les cadrages sont retrouvés par
 * les réglages de cadrage des sections. Aucune personne.
 *
 * Rien d'inventé : APLAT est une marque de démonstration ; nom, adresse, téléphone, zone, assurance, certification,
 * délais, prix, équipe, années, avis et nombre de chantiers restent « À renseigner » ; réalisations et avant/après sont
 * illustratifs ; les formulaires simulent l'envoi (« démonstration — demande non envoyée »), aucun e-mail n'est envoyé.
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

export const AP_PROVENANCE = "Dossier APLAT du 25 octobre 2026 (docs/theme-briefs/aplat) — démonstration du studio, reconstitutions IA fournies par Thomas, sans personne, réalisations illustratives, aucun envoi réel";
export const AP_DIR = path.join(process.cwd(), "public", "demo", "aplat");
export const AP_PALETTE = { primary: "#035278", secondary: "#E1EEF6", accent: "#0B3D8A", light: "#FFFFFF", dark: "#03123F" };

/** Les 28 photos du kit (texte alternatif d'après la photo réellement livrée) et le logo. */
export const AP_MEDIA: Record<string, string> = {
  "01_accueil_chantier_mixte.webp": "Pièce en rénovation : plaques de plâtre jointoyées, mur bleu pétrole, bâche au sol, seau et bac de peinture",
  "02_piece_avant.webp": "Pièce avant peinture : murs en plaques de plâtre aux joints blancs, deux fenêtres, sol protégé",
  "03_piece_apres.webp": "La même pièce après peinture (simulation) : murs bleu pétrole et blanc cassé",
  "04_ossature_cloisons.webp": "Ossature de cloisons en profilés métalliques et plaques de plâtre jointoyées",
  "05_enduit_lisseuse.webp": "Lisseuse en acier posée sur de l'enduit blanc fraîchement appliqué",
  "06_rouleau_mur_bleu.webp": "Rouleau de peinture au pied d'un mur bleu pétrole au bord blanc net",
  "07_texture_enduit.webp": "Texture d'enduit blanc cassé appliqué au couteau",
  "08_jonction_plafond.webp": "Jonction nette entre un plafond blanc et une cloison",
  "09_raccord_bleu_blanc.webp": "Raccord net entre un mur bleu pétrole, un plafond blanc et un mur blanc cassé",
  "10_preparation_murs.webp": "Mur en plaques de plâtre aux bandes à joints avant peinture, plinthe masquée, bâche au sol",
  "11_ponceuse_supports.webp": "Ponceuse de chantier posée sur un sol bâché contre un mur jointoyé",
  "12_nuancier_echantillons.webp": "Quatre échantillons de peinture mate : blanc cassé, bleu pétrole, gris minéral et bleu pâle",
  "13_piece_protegee.webp": "Pièce prête pour la peinture, sol entièrement protégé par une bâche",
  "14_combles.webp": "Aménagement sous pente en plaques de plâtre avec fenêtre de toit",
  "15_couloir.webp": "Couloir terminé aux murs blanc cassé et portes alignées",
  "16_seau_bac_rouleau.webp": "Seau, bac de peinture bleu foncé et rouleau sur une bâche",
  "17_plans_crayon.webp": "Plans de rénovation, crayon de charpentier et règle métallique",
  "18_fenetre_lumiere.webp": "Baie vitrée et mur en plâtre en préparation, lumière d'automne",
  "19_outils_preparation.webp": "Bac de préparation, couteau à enduire et petit seau sur une bâche",
  "20_mur_bleu_soleil.webp": "Mur bleu pétrole mat terminé, éclairé par le soleil",
  "21_eventail_couleurs.webp": "Éventail de cartes de couleurs, du blanc cassé au bleu pétrole",
  "22_plans_metre.webp": "Mètre ruban, crayon et plans de rénovation sur un plan de travail",
  "23_appareil_photo_chantier.webp": "Appareil photo posé sur une bâche dans une pièce en rénovation",
  "24_plafond_joints.webp": "Plafond en plaques de plâtre aux joints blancs réguliers",
  "25_doublage_isolation.webp": "Doublage en cours : laine minérale entre profilés et plaques de plâtre",
  "26_masquage_plinthe.webp": "Ruban de masquage posé au raccord d'une plinthe et d'un mur",
  "27_angle_prise_mur.webp": "Angle de cloison bleu pétrole et encadrement blanc",
  "28_enduit_spatule_verticale.webp": "Couteau à enduire contre un mur à l'enduit texturé",
};
const LOGO = "00_logo_aplat_original.png";

/** Logo recadré sur son dessin (marges transparentes retirées) et version claire pour les pieds charbon et bleus. */
async function logos(): Promise<{ dark: Buffer; light: Buffer } | null> {
  const file = path.join(AP_DIR, LOGO);
  if (!fs.existsSync(file)) return null;
  const trimmed = await sharp(fs.readFileSync(file)).trim({ threshold: 1 }).extend({ top: 8, bottom: 8, left: 8, right: 8, background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const { data, info } = await sharp(trimmed).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  // Version claire, comme les pieds des planches : lettres et pans charbon en blanc, pan bleu pétrole en bleu clair.
  // Le pictogramme occupe le tiers gauche : pan bleu pétrole en blanc, pan charbon en gris clair ; à droite, lettres
  // en blanc et mention « Plâtrerie & Peinture » (bleu pétrole) en bleu clair.
  const iconW = info.width * 0.3;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2], x = (i / 4) % info.width;
    const lum = 0.3 * r + 0.59 * g + 0.11 * b, blue = b - r;
    let out: [number, number, number];
    if (blue > 40 && lum < 150) out = x < iconW ? [246, 248, 250] : [143, 195, 224];
    else if (blue > 25) out = [214, 222, 228];
    else out = lum < 150 ? (x < iconW ? [190, 197, 204] : [255, 255, 255]) : [226, 232, 236];
    data[i] = out[0]; data[i + 1] = out[1]; data[i + 2] = out[2];
  }
  const light = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
  return { dark: trimmed, light };
}

/** Projet de services composé par le moteur dans le thème « aplat », puis rédigé d'après les planches. */
export async function aplatProject(userId: string) {
  const pid = seedHoldout(userId, 2, "Démo APLAT");
  const product = { ...emptyProduct(), name: "Plâtrerie, préparation et peinture intérieure", nameStatus: "provided" as const, category: "Plâtrerie et peinture", sector: "services" as never, summary: "Cloisons, plafonds et doublages, enduits et préparation des supports, peinture intérieure." };
  saveProduct(pid, product);
  const services = {
    ...emptyServiceProfile(),
    services: [
      { key: "platrerie", name: "Plâtrerie", description: "Cloisons, plafonds et doublages." },
      { key: "enduits", name: "Enduits et préparation", description: "Joints, enduits, lissage et préparation des supports." },
      { key: "peinture", name: "Peinture intérieure", description: "Murs et plafonds, finitions soignées." },
    ],
    contactMode: "quote" as const, contactModes: ["quote" as const, "form" as const],
  };
  const local = localBrand(product, "APLAT", { business: "services", services });
  saveBrand(pid, { ...local.brand, name: "APLAT", generatedBy: "local" as const, tagline: "Des murs justes. Des espaces qui changent.", story: "APLAT est une marque de démonstration du studio : plâtrerie, préparation des supports et peinture intérieure.", positioning: "Plâtrerie, enduits et peinture intérieure pour des espaces durables et harmonieux.", palette: AP_PALETTE, direction: "aplat" as never });
  saveStrategy(pid, local.strategy);
  saveServices(pid, services);
  run("UPDATE projects SET store_type = ?, business_type = ?, updated_at = ? WHERE id = ?", "mono", "services", now(), pid);
  saveSettings(pid, { ...loadProject(pid).settings, storeKind: "services" });

  const missing: string[] = [];
  const ids: Record<string, string> = {};
  const lg = await logos();
  if (!lg) missing.push(LOGO);
  else {
    for (const [name, data] of [["logo-aplat.png", lg.dark], ["logo-aplat-clair.png", lg.light]] as const) {
      const meta = await sharp(data).metadata();
      const a = await saveAsset({ projectId: pid, userId, data, mime: "image/png", name: `aplat-${name}`, origin: "upload", role: "logo", status: "approved", meta: { demo: { isDemo: true, provenance: AP_PROVENANCE }, width: meta.width, height: meta.height, alt: "APLAT Plâtrerie & Peinture" } });
      ids[name] = a.id;
    }
  }
  for (const [file, alt] of Object.entries(AP_MEDIA)) {
    const source = path.join(AP_DIR, file);
    if (!fs.existsSync(source) || fs.statSync(source).size === 0) { missing.push(file); continue; }
    const bytes = fs.readFileSync(source), meta = await sharp(bytes).metadata();
    const a = await saveAsset({ projectId: pid, userId, data: bytes, mime: "image/webp", name: `aplat-${file}`, origin: "upload", role: /texture|07_/.test(file) ? "detail" : "scene", status: "approved", meta: { demo: { isDemo: true, provenance: AP_PROVENANCE }, width: meta.width, height: meta.height, alt } });
    ids[file] = a.id;
  }
  const built = await composeShop(pid, "aplat" as never, null, false);
  curateAplat(built.spec, ids);
  return { pid, spec: built.spec, missing, project: loadProject(pid) };
}

const p = (s: string) => `<p>${s}</p>`;

/** Pages, menus, en-tête et pied d'après les dix planches. */
export function curateAplat(spec: ThemeSpec, ids: Record<string, string>) {
  const fname = (file: string) => `ap-${file.replace(/^\d\d_/, "").replace(/\.(webp|png)$/, "")}.${file.endsWith(".png") ? "png" : "webp"}`;
  for (const [file, aid] of Object.entries(ids)) spec.files[fname(file)] = aid;
  const asset = (file: string) => (ids[file] ? fname(file) : "");
  const img = (file: string, key = "image", fx?: number, fy?: number) => ({ [`${key}_asset`]: asset(file), [`${key}_alt`]: AP_MEDIA[file] ?? "", ...(fx !== undefined ? { [key === "image" ? "focus_x" : `focus_${key}_x`]: fx } : {}), ...(fy !== undefined ? { [key === "image" ? "focus_y" : `focus_${key}_y`]: fy } : {}) });
  const section = (type: string, settings: Record<string, unknown>, blocks: { type: string; settings: Record<string, unknown> }[] = []): SectionInstance => {
    const schema = sectionSchema(spec, type); if (!schema) throw new Error(`Section absente ${type}`);
    return { type, settings: withDefaults(schema.settings, settings), blocks: Object.fromEntries(blocks.map((b, i) => [`b${i}`, { type: b.type, settings: withDefaults(schema.blocks.find((x) => x.type === b.type)?.settings, b.settings) }])), block_order: blocks.map((_, i) => `b${i}`) };
  };
  const template = (rows: [string, SectionInstance][]): TemplateJson => ({ order: rows.map(([k]) => k), sections: Object.fromEntries(rows) });
  const card = (settings: Record<string, unknown>) => ({ type: "card", settings });
  const q = (question: string, answer: string, extra: Record<string, unknown> = {}) => ({ type: "question", settings: { question, answer: p(answer), ...extra } });
  const PRESTATIONS = "/pages/prestations", PLATRERIE = "/pages/platrerie", PEINTURE = "/pages/peinture", ENDUITS = "/pages/enduits-et-preparation", REALISATIONS = "/pages/realisations", DETAIL = "/pages/detail-chantier", APPROCHE = "/pages/notre-approche", FAQ = "/pages/faq", CONTACT = "/pages/contact", DEVIS = "/pages/devis", CONSEILS = "/pages/conseils", ARTICLE = "/pages/quelles-photos-joindre", CONFIRMATION = "/pages/confirmation", MENTIONS = "/pages/mentions-legales", CONFIDENTIALITE = "/pages/confidentialite", COOKIES = "/pages/cookies", PLAN = "/pages/plan-du-site";
  const BADGE = "Projet Résidentiel", MBADGE = "Projet illustratif";

  // ── 01 Accueil (planches 01 et 06) ──────────────────────────────────────────────────────────────────────────────
  spec.templates.index = template([
    ["hero", section("ap-hero", { layout: "home", mobile_layout: "stack", height: 448, mobile_height: 505, ...img("01_accueil_chantier_mixte.webp"), focus_x: 50, focus_y: 50, mobile_image_asset: asset("02_piece_avant.webp"), mobile_focus_x: 30, mobile_focus_y: 50, heading: "Des murs justes.\nDes espaces qui changent.", mobile_heading: "Des murs justes.\nDes espaces\nqui changent.", text: "Plâtrerie, préparation et peinture intérieure.", mobile_text: "Plâtrerie, enduits et peinture pour\ndes intérieurs soignés, durables\net à votre image.", button_label: "Parlons de votre projet", mobile_button_label: "Décrire mon projet", button_link: DEVIS, button2_label: "Voir les réalisations", button2_link: REALISATIONS })],
    ["trades", section("ap-strip", { style: "trades", show_on: "desktop", heading: "Nos métiers" }, [
      { type: "item", settings: { number: "01", title: "Plâtrerie", text: "Cloisons, plafonds, doublages", link: PLATRERIE } },
      { type: "item", settings: { number: "02", title: "Enduits", text: "Préparation des supports", link: ENDUITS } },
      { type: "item", settings: { number: "03", title: "Peinture", text: "Murs et plafonds", link: PEINTURE } },
    ])],
    ["list", section("ap-cards", { layout: "list", show_on: "mobile", eyebrow: "Nos prestations" }, [
      card({ title: "Plâtrerie", text: "Cloisons, doublages,\nplafonds", ...img("04_ossature_cloisons.webp", "image", 20, 50), link: PLATRERIE }),
      card({ title: "Enduits & préparation", text: "Des supports sains\net prêts à peindre", ...img("05_enduit_lisseuse.webp", "image", 40, 60), link: ENDUITS }),
      card({ title: "Peinture intérieure", text: "Finitions soignées\npour des espaces durables", ...img("16_seau_bac_rouleau.webp", "image", 50, 60), link: PEINTURE }),
    ])],
    ["matter", section("ap-split", { layout: "matter", mobile_eyebrow: "Notre savoir-faire", heading: "Du support\nà la finition.", show_rule: true, text: "Des surfaces bien préparées,\ndes finitions soignées et des espaces\ndurables, pour un intérieur qui vous\nressemble.", mobile_text: "Des surfaces bien préparées,\ndes finitions précises, pour un\nrésultat beau et durable.", ...img("07_texture_enduit.webp", "image", 50, 50), ...img("05_enduit_lisseuse.webp", "image2"), focus2_x: 62, focus2_y: 50, mobile_image2_asset: asset("16_seau_bac_rouleau.webp"), mobile_focus2_x: 50, mobile_focus2_y: 55, mobile_caption: "Des outils au service\nde surfaces durables." })],
    ["services", section("ap-cards", { layout: "services", show_on: "desktop", heading: "" }, [
      card({ title: "Cloisons et plafonds", text: "Création d'espaces, cloisons en plaques\nde plâtre, doublages et plafonds.", ...img("04_ossature_cloisons.webp", "image", 30, 55), link_label: "Voir la prestation", link: PLATRERIE }),
      card({ title: "Enduits et préparation", text: "Joints, enduits, lissage et préparation\ndes supports pour une finition durable.", ...img("05_enduit_lisseuse.webp", "image", 55, 55), link_label: "Voir la prestation", link: ENDUITS }),
      card({ title: "Peinture intérieure", text: "Murs et plafonds, finitions soignées,\ncouleurs et ambiances sur mesure.", ...img("06_rouleau_mur_bleu.webp", "image", 50, 50), link_label: "Voir la prestation", link: PEINTURE }),
    ])],
    ["rows", section("ap-cards", { layout: "rows", show_on: "mobile", eyebrow: "Nos prestations en détail" }, [
      card({ title: "Cloisons\net plafonds", text: "Créer, structurer,\nagrandir vos espaces.", ...img("04_ossature_cloisons.webp", "image", 15, 50), link: PLATRERIE }),
      card({ title: "Préparation\ndes supports", text: "Ponçage, enduits,\nsurfaces prêtes à peindre.", ...img("19_outils_preparation.webp", "image", 40, 50), link: ENDUITS }),
      card({ title: "Peinture intérieure", text: "Des finitions soignées\npour des intérieurs\nqui vous ressemblent.", ...img("06_rouleau_mur_bleu.webp", "image", 40, 50), link: PEINTURE }),
    ])],
    ["details", section("ap-cards", { layout: "details", mobile_eyebrow: "Le sens du détail", heading: "Le travail se voit\naussi dans les détails.", show_rule: true, text: "Des finitions précises pour des intérieurs\ndurables et harmonieux.", mobile_text: "Angles, raccords, finitions…\nC'est dans ces détails que se joue\nla qualité d'un intérieur." }, [
      card({ title: "Finition d'angle soignée", mobile_title: "Raccords soignés", ...img("07_texture_enduit.webp", "image", 50, 50) }),
      card({ title: "Jonction plafond / cloison", mobile_title: "Finitions précises", ...img("08_jonction_plafond.webp", "image", 50, 50) }),
      card({ title: "Ligne de peinture nette", mobile_title: "Surfaces durables", ...img("09_raccord_bleu_blanc.webp", "image", 50, 50) }),
    ])],
    ["projects", section("ap-cards", { layout: "projects", mobile_eyebrow: "Réalisations illustratives", heading: "Nos réalisations\nillustratives", mobile_heading: "Des projets variés,\ndes intérieurs uniques.", text: "Des exemples de projets pour vous inspirer.", link_label: "Voir toutes les réalisations", link: REALISATIONS }, [
      card({ title: "Cloisons et plafonds", mobile_title: "Création de cloisons", mobile_text: "Nouvel agencement et cloisonnement.", badge: BADGE, mobile_badge: MBADGE, ...img("02_piece_avant.webp", "image", 50, 45), mobile_link_label: "Découvrir ce projet", link: DETAIL }),
      card({ title: "Murs et couleurs", mobile_title: "Peinture d'un espace de vie", mobile_text: "Ambiance moderne et lumineuse.", badge: BADGE, mobile_badge: MBADGE, ...img("03_piece_apres.webp", "image", 50, 50), mobile_link_label: "Découvrir ce projet", link: DETAIL }),
    ])],
    ["compare", section("ap-compare", { layout: "side", heading: "Simulation avant/après", mobile_eyebrow: "Simulation avant / après", text: "Un même espace, une nouvelle atmosphère.", ...{ before_asset: asset("02_piece_avant.webp"), before_alt: AP_MEDIA["02_piece_avant.webp"], after_asset: asset("03_piece_apres.webp"), after_alt: AP_MEDIA["03_piece_apres.webp"] }, focus_x: 50, focus_y: 45, before_note: "Cloisons et supports bruts", after_note: "Finition peinture", note: "Simulation avant/après sur la même pièce (projet illustratif)." })],
    ["steps", section("ap-cards", { layout: "steps", mobile_layout: "timeline", heading: "Un projet clair,\nétape par étape.", mobile_hide_heading: true, mobile_eyebrow: "Notre méthode" }, [
      card({ number: "01", title: "Échanger", text: "Comprendre vos besoins\net votre projet.", mobile_text: "Nous prenons le temps de comprendre votre projet et vos besoins." }),
      card({ number: "02", title: "Observer\nles supports", mobile_title: "Observer", text: "Évaluer l'existant sur site.", mobile_text: "Une visite sur site permet d'analyser les supports et les contraintes." }),
      card({ number: "03", title: "Préparer\nle chantier", mobile_title: "Préparer", text: "Protéger et organiser\nles travaux.", mobile_text: "Des supports bien préparés pour des finitions durables." }),
      card({ number: "04", title: "Réaliser\nles finitions", mobile_title: "Finaliser", text: "Des surfaces soignées\net durables.", mobile_text: "Des finitions soignées, dans le respect de votre intérieur." }),
    ])],
    ["faq", section("ap-faq", { layout: "row", heading: "Questions fréquentes", mobile_heading: "Questions fréquentes", show_rule: true, single: false }, [
      q("Quels types de supports traitez-vous ?", "Plaques de plâtre, enduits, murs et plafonds intérieurs : chaque support est observé avant les travaux pour choisir la bonne préparation. Les supports exacts que nous traitons sont à préciser par l'entreprise.", { mobile_question: "Quels types de travaux réalisez-vous ?" }),
      q("Faut-il vider complètement les pièces avant les travaux ?", "Cela dépend de la pièce et des travaux : la protection et l'organisation du chantier sont convenues ensemble avant le début des travaux.", { mobile_question: "Faut-il une visite sur place ?" }),
      q("Comment se déroule un projet de peinture ou de plâtrerie ?", "Nous échangeons sur votre projet, observons les supports, préparons et protégeons le chantier, puis réalisons les finitions.", { mobile_question: "Comment se déroule un projet ?" }),
    ])],
    ["cta", section("ap-cta", { layout: "band", heading: "Donnons forme\nà votre intérieur.", mobile_heading: "Donnons forme à votre intérieur.", text: "Un projet de plâtrerie ou de peinture ? Parlons-en et trouvons\nensemble la meilleure solution pour vos espaces.", mobile_text: "Discutons de votre projet et trouvons ensemble\nles meilleures solutions.", button_label: "Demander un devis", mobile_button_label: "Décrire mon projet", button_link: DEVIS, ...img("16_seau_bac_rouleau.webp", "image", 50, 60) })],
  ]);

  const pages: { handle: string; title: string; seo: { title: string; description: string }; rows: [string, SectionInstance][] }[] = [];
  const page = (handle: string, title: string, seo: { title: string; description: string }, rows: [string, SectionInstance][]) => pages.push({ handle, title, seo, rows });

  // ── 02 Prestations (planches 01 et 06) ──────────────────────────────────────────────────────────────────────────
  page("prestations", "Prestations", { title: "Prestations | APLAT, plâtrerie et peinture", description: "Plâtrerie (cloisons, plafonds, doublages), enduits et préparation des supports, peinture intérieure : nos prestations en détail." }, [
    ["hero", section("ap-hero", { layout: "fade", mobile_layout: "text", height: 446, mobile_height: 480, ...img("02_piece_avant.webp"), focus_x: 40, focus_y: 50, mobile_focus_x: 45, ...{ texture_asset: asset("07_texture_enduit.webp") }, mobile_eyebrow: "Nos prestations", heading: "*Les* bonnes bases.\n*Les* belles finitions.", mobile_heading: "Les bonnes bases.\nLes belles finitions.", show_rule: true, text: "Plâtrerie, enduits et peinture intérieure\npour des espaces durables et harmonieux.", mobile_text: "De la plâtrerie aux finitions peinture,\ndes surfaces soignées pour des intérieurs\ndurables et harmonieux." })],
    ["services", section("ap-cards", { layout: "servicerows", cta_style: "button" }, [
      card({ number: "01", title: "Plâtrerie", subtitle: "Cloisons, plafonds\net doublages.", mobile_subtitle: "Cloisons, doublages, plafonds", mobile_media_height: 480, text: "Création et aménagement de vos espaces\navec des cloisons en plaques de plâtre,\ndes plafonds et des doublages adaptés\nà votre intérieur.", mobile_text: "Création de cloisons, doublages et plafonds en plaques de plâtre pour structurer et aménager vos espaces.", items: "Cloisons de séparation\nPlafonds et faux-plafonds\nDoublages et habillages\nAdaptation à vos espaces", ...img("04_ossature_cloisons.webp", "image", 50, 50), mobile_focus_x: 60, mobile_caption: "Des solutions adaptées à vos besoins pour des pièces fonctionnelles et bien pensées.", link_label: "Voir la prestation", link: PLATRERIE }),
      card({ number: "02", title: "Enduits et\npréparation", mobile_title: "Enduits & préparation", subtitle: "Des supports sains\npour des finitions durables.", mobile_subtitle: "Des supports sains et prêts à peindre", mobile_media_height: 250, text: "Application d'enduits, traitement des joints\net préparation des supports pour un rendu\nlisse et homogène.", mobile_text: "Application d'enduits, traitement des joints et préparation des supports pour des finitions impeccables et durables.", items: "Joints et lissage\nRebouchage et ratissage\nPréparation des supports\nSurfaces prêtes à peindre", ...img("05_enduit_lisseuse.webp", "image", 45, 50), mobile_caption: "Un travail soigné pour des surfaces lisses, homogènes et prêtes à recevoir la peinture.", link_label: "Voir la prestation", link: ENDUITS }),
      card({ number: "03", title: "Peinture\nintérieure", mobile_title: "Peinture intérieure", subtitle: "Couleurs et finitions\npour vos espaces.", mobile_subtitle: "Des finitions soignées et durables", mobile_media_height: 466, text: "Application de peintures sur murs et plafonds,\nfinitions soignées et choix de couleurs\npour une ambiance qui vous ressemble.", mobile_text: "Peinture des murs et plafonds pour des intérieurs lumineux, harmonieux et à votre image.", items: "Murs et plafonds\nFinitions soignées\nCouleurs et ambiances\nRésultat durable", ...img("16_seau_bac_rouleau.webp", "image", 50, 60), ...img("20_mur_bleu_soleil.webp", "image2"), mobile_caption: "Des finitions précises pour un rendu soigné et durable, dans le respect de vos espaces.", link_label: "Voir la prestation", link: PEINTURE }),
    ])],
    ["approach", section("ap-cards", { layout: "approach", mobile_layout: "tiles", heading: "Notre approche à chaque projet", mobile_heading: "Un accompagnement\ncomplet pour vos intérieurs.", mobile_eyebrow: "Notre champ d'intervention" }, [
      card({ icon: "paint", title: "Préparer", text: "Protection des sols\net des surfaces", mobile_text: "Des supports propres et adaptés." }),
      card({ icon: "shield", title: "Protéger", text: "Des espaces de travail\npropres et organisés", mobile_text: "Des espaces et des finitions soignés." }),
      card({ icon: "brush", title: "Soigner les raccords", text: "Une attention aux détails\npour des finitions nettes", mobile_text: "Des surfaces uniformes et harmonieuses." }),
      card({ icon: "check", title: "Finaliser", text: "Des surfaces durables\net harmonieuses", mobile_text: "Des intérieurs durables et à votre image." }),
    ])],
    ["projects", section("ap-cards", { layout: "projects", mobile_layout: "mosaic", head_style: "stack", columns: 4, heading: "Projets illustratifs liés à nos prestations", mobile_heading: "Des intérieurs transformés.", mobile_eyebrow: "Projets illustratifs", text: "Des exemples de réalisations pour vous inspirer.", link_label: "Voir toutes les réalisations", link: REALISATIONS }, [
      card({ title: "Cloison en plaques de plâtre", badge: BADGE, ...img("04_ossature_cloisons.webp", "image", 15, 50), link: REALISATIONS }),
      card({ title: "Plafond en cours", badge: BADGE, ...img("24_plafond_joints.webp", "image", 50, 50), link: REALISATIONS }),
      card({ title: "Préparation des supports", badge: BADGE, ...img("10_preparation_murs.webp", "image", 50, 50), link: REALISATIONS }),
      card({ title: "Peinture et finitions", badge: BADGE, ...img("20_mur_bleu_soleil.webp", "image", 50, 50), link: REALISATIONS }),
    ])],
    ["faq", section("ap-faq", { layout: "row", heading: "Questions fréquentes", mobile_heading: "Questions fréquentes", show_rule: true }, [
      q("Quels travaux sont compris dans vos prestations ?", "Plâtrerie (cloisons, plafonds, doublages), enduits et préparation des supports, peinture intérieure des murs et plafonds. Le détail de chaque projet est convenu après l'étude de votre demande.", { show_on: "desktop" }),
      q("Comment se déroule la préparation des supports ?", "Les supports sont observés, les défauts repris, les joints traités et les surfaces préparées avant la mise en peinture.", { show_on: "desktop" }),
      q("Proposez-vous un accompagnement pour le choix des couleurs ?", "Oui, le choix des couleurs et des ambiances fait partie de l'échange sur votre projet de peinture.", { show_on: "desktop" }),
      q("Quels types de peinture utilisez-vous ?", "Le type de peinture est choisi selon la pièce, le support et la finition souhaitée ; les produits utilisés sont à préciser par l'entreprise.", { show_on: "mobile" }),
      q("Travaillez-vous sur tous types de supports ?", "Chaque support est observé avant les travaux ; les supports traités sont à préciser par l'entreprise.", { show_on: "mobile" }),
      q("Faut-il vider complètement la pièce ?", "Cela dépend des travaux : la protection et l'organisation du chantier sont convenues avec vous.", { show_on: "mobile" }),
    ])],
    ["cta", section("ap-cta", { layout: "band", heading: "Un projet ?\nParlons-en.", mobile_heading: "Un projet de plâtrerie ou de peinture ?\nParlons-en.", text: "Décrivez votre projet de plâtrerie ou de peinture intérieure.\nNous étudierons votre besoin et vous proposerons une solution adaptée.", mobile_text: "Chaque projet est unique.\nDécrivez-nous votre projet pour une étude personnalisée.", button_label: "Demander un devis", mobile_button_label: "Décrire mon projet", button_link: DEVIS, ...img("01_accueil_chantier_mixte.webp", "image", 60, 50) })],
  ]);

  const crumb = (label: string, link = "") => ({ type: "crumb", settings: { label, link } });
  const aside = (settings: Record<string, unknown>) => ({ type: "aside", settings });
  const pageHero = (settings: Record<string, unknown>, blocks: { type: string; settings: Record<string, unknown> }[] = []) => section("ap-hero", { layout: "fade", mobile_layout: "overlay", height: 363, mobile_height: 300, ...{ texture_asset: asset("07_texture_enduit.webp") }, ...settings }, blocks);

  // ── 03 Plâtrerie (planches 02 et 07) ────────────────────────────────────────────────────────────────────────────
  page("platrerie", "Plâtrerie", { title: "Plâtrerie | APLAT, cloisons, doublages et plafonds", description: "Cloisons, doublages, plafonds et joints : une base solide pour des espaces qui vous ressemblent. Méthode de travail et questions fréquentes." }, [
    ["hero", pageHero({ ...img("02_piece_avant.webp"), focus_x: 55, focus_y: 50, mobile_focus_x: 70, mobile_eyebrow: "Plâtrerie", title_size: 82, heading: "Dessiner\nles *volumes.*", text: "Des cloisons aux plafonds, une base solide\npour des espaces qui vous ressemblent.", mobile_text: "Cloisons, plafonds et doublages\npour des espaces qui vous\nressemblent.", button_label: "", mobile_button_label: "Demander un devis", button_link: DEVIS }, [crumb("Accueil", "/"), crumb("Prestations", PRESTATIONS), crumb("Plâtrerie")])],
    ["works", section("ap-cards", { layout: "gridside", anchor: "cloisons", heading: "Cloisons, doublages\net plafonds.", text: "La plâtrerie structure vos espaces, améliore\nleur confort et prépare des supports sains\net durables pour la peinture.", mobile_text: "La plâtrerie structure et façonne vos espaces.\nNous réalisons des cloisons, doublages, plafonds\net enduits avec soin, pour des intérieurs confortables\net durables.", button_label: "Demander un devis", button_link: DEVIS }, [
      card({ title: "Cloisons", text: "Créer et structurer vos espaces", ...img("04_ossature_cloisons.webp", "image", 30, 40), link: REALISATIONS }),
      card({ title: "Doublages", text: "Améliorer l'isolation et le confort", ...img("25_doublage_isolation.webp", "image", 50, 40), link: REALISATIONS }),
      card({ title: "Plafonds", text: "Des finitions nettes et durables", ...img("24_plafond_joints.webp", "image", 50, 50), link: REALISATIONS }),
      card({ title: "Joints et enduits", text: "Un support prêt à peindre", ...img("05_enduit_lisseuse.webp", "image", 50, 40), link: ENDUITS }),
    ])],
    ["supports", section("ap-split", { layout: "overlay", desktop_span: "6r2", show_on: "desktop", heading: "Des supports\nimpeccables.", show_rule: false, text: "Un travail soigné d'enduits et de joints\npour des surfaces planes, prêtes à recevoir\nla peinture.", ...img("19_outils_preparation.webp", "image", 45, 50) })],
    ["method", section("ap-cards", { layout: "tiles4", mobile_layout: "numbers", desktop_span: "6", heading: "Notre méthode de travail", mobile_heading: "Notre méthode" }, [
      card({ number: "01", title: "Étude\ndu projet", mobile_title: "Étude de votre projet", mobile_text: "Comprendre vos besoins et la configuration\nde l'existant." }),
      card({ number: "02", title: "Préparation\ndu support", show_on: "desktop" }),
      card({ number: "03", mobile_number: "02", title: "Réalisation\nsoignée", mobile_title: "Réalisation soignée", mobile_text: "Des mises en œuvre adaptées à chaque espace." }),
      card({ number: "04", mobile_number: "03", title: "Finitions\nprêtes à peindre", mobile_title: "Finitions durables", mobile_text: "Des supports prêts pour une peinture de qualité." }),
    ])],
    ["faq", section("ap-faq", { layout: "stack", desktop_span: "6", heading: "Questions fréquentes", show_rule: false }, [
      q("Quels types de cloisons réalisez-vous ?", "Des cloisons en plaques de plâtre sur ossature, adaptées à la configuration de la pièce. Les solutions possibles pour votre projet sont précisées après l'étude de votre demande.", { mobile_question: "Quel type de cloisons proposez-vous ?" }),
      q("Faut-il toujours réaliser un doublage ?", "Non : un doublage se justifie selon l'état des murs et vos objectifs (confort, habillage). Le besoin est évalué lors de l'observation des supports.", { mobile_question: "Réalisez-vous des plafonds ?" }),
      q("Combien de temps durent les travaux ?", "La durée dépend du projet (surface, supports, séchage) : elle est précisée après l'étude de votre demande. Délais : à renseigner.", { mobile_question: "Les supports sont-ils prêts pour la peinture ?" }),
    ])],
    ["cta", section("ap-cta", { layout: "project", heading: "Vous avez un projet de plâtrerie ?", mobile_heading: "Un projet de plâtrerie ?", text: "Parlons de vos besoins et donnons forme à vos espaces.", mobile_text: "Parlons-en et étudions ensemble vos besoins.", button_label: "Demander un devis", button_link: DEVIS, project_image_asset: asset("02_piece_avant.webp"), project_focus_x: 50, project_badge: "Chantier lié", project_title: "Cloisons et plafonds d'un séjour", project_text: "Projet illustratif", project_link_label: "Découvrir ce projet", project_link: DETAIL })],
  ]);

  // ── 04 Peinture (planches 02 et 07) ─────────────────────────────────────────────────────────────────────────────
  page("peinture", "Peinture", { title: "Peinture intérieure | APLAT", description: "Préparation des murs, protection des espaces, choix des teintes et finitions : la peinture intérieure, du support à la finition." }, [
    ["hero", pageHero({ ...img("03_piece_apres.webp"), focus_x: 50, focus_y: 50, mobile_focus_x: 75, mobile_eyebrow: "Peinture", heading: "La couleur change\n*la perception.*", mobile_heading: "La couleur\nchange la\nperception.", text: "Des murs et plafonds soignés pour des intérieurs\nlumineux, durables et à votre image.", mobile_text: "Des intérieurs qui gagnent\nen caractère et en lumière.", button_label: "", mobile_button_label: "Demander un devis", button_link: DEVIS }, [crumb("Accueil", "/"), crumb("Prestations", PRESTATIONS), crumb("Peinture")])],
    ["support", section("ap-split", { layout: "media", heading: "Une finition commence\npar le support.", show_rule: false, text: "Une peinture réussie repose sur une préparation\nrigoureuse : des supports sains, propres et bien\npréparés pour un résultat durable.", mobile_text: "Une peinture durable et élégante nécessite des supports bien préparés. Nous prenons le temps de préparer, protéger et soigner chaque détail pour un résultat impeccable.", button_label: "Demander un devis", button_link: DEVIS, ...img("11_ponceuse_supports.webp", "image", 50, 55) })],
    ["steps", section("ap-cards", { layout: "features4", mobile_layout: "list", anchor: "finitions" }, [
      card({ title: "Préparation des murs", mobile_title: "Préparation des supports", text: "Nettoyage, rebouchage, ponçage\net enduits si nécessaire.", mobile_text: "Rebouchage, enduits, ponçage pour\ndes surfaces saines et régulières.", ...img("10_preparation_murs.webp", "image", 30, 50), link: ENDUITS }),
      card({ title: "Protection des espaces", text: "Mise en place de protections\npour un chantier propre.", mobile_text: "Protection soignée des sols, plinthes,\nmenuiseries et mobiliers.", ...img("13_piece_protegee.webp", "image", 50, 60), link: APPROCHE }),
      card({ title: "Choix des teintes", mobile_title: "Application des teintes", text: "Des couleurs qui subliment\nvos volumes.", mobile_text: "Des teintes adaptées à chaque pièce\net à vos envies.", ...img("12_nuancier_echantillons.webp", "image", 50, 40), link: CONSEILS }),
      card({ title: "Finition des surfaces", mobile_title: "Finitions soignées", text: "Une application soignée\npour un rendu uniforme.", mobile_text: "Des finitions précises pour un rendu\nharmonieux et durable.", ...img("06_rouleau_mur_bleu.webp", "image", 50, 40), link: REALISATIONS }),
    ])],
    ["colors", section("ap-cards", { layout: "colors", desktop_span: "7", heading: "Des ambiances pour\nchaque intérieur.", mobile_heading: "Nos teintes", text: "Quelques harmonies de couleurs à titre illustratif.\nLe choix final se fait selon vos envies et le contexte\nde votre projet." }, [
      card({ swatch: "#EEECE6", title: "Blanc cassé", text: "Ambiance lumineuse\net intemporelle", mobile_text: "Lumineux et intemporel" }),
      card({ swatch: "#035278", title: "Bleu pétrole", text: "Caractère et espace", mobile_text: "Caractère et élégance" }),
      card({ swatch: "#9C9D9E", title: "Gris minéral", text: "Modernité et équilibre", mobile_text: "Douceur et équilibre" }),
    ])],
    ["compare", section("ap-compare", { layout: "top", desktop_span: "5", heading: "Simulation avant / après", text: "Le même espace, un nouveau regard.", ...{ before_asset: asset("02_piece_avant.webp"), before_alt: AP_MEDIA["02_piece_avant.webp"], after_asset: asset("03_piece_apres.webp"), after_alt: AP_MEDIA["03_piece_apres.webp"] }, focus_x: 50, focus_y: 50, note: "Simulation avant/après sur la même pièce (projet illustratif)." })],
    ["faq", section("ap-faq", { layout: "stack", desktop_span: "5", heading: "Questions fréquentes", show_rule: false }, [
      q("Quelle peinture utilisez-vous ?", "Le type de peinture est choisi selon la pièce, le support et la finition souhaitée. Les produits utilisés sont à préciser par l'entreprise.", { mobile_question: "Quel type de peinture utilisez-vous ?" }),
      q("Faut-il toujours appliquer une sous-couche ?", "Cela dépend de l'état et de la nature du support : la préparation nécessaire est évaluée avant les travaux.", { mobile_question: "Faut-il préparer les murs avant de peindre ?" }),
      q("Combien de temps faut-il pour peindre une pièce ?", "La durée dépend de la surface, de la préparation et des temps de séchage : elle est précisée après l'étude de votre demande.", { mobile_question: "Proposez-vous des conseils sur les teintes ?" }),
    ])],
    ["cta", section("ap-cta", { layout: "paint", desktop_span: "7", heading: "Vous avez un projet de peinture ?", mobile_heading: "Un projet de peinture ?", text: "Décrivez-nous vos envies, nous étudions votre projet\net vous proposons des solutions adaptées.", mobile_text: "Décrivez-nous votre projet pour un devis personnalisé.", button_label: "Demander un devis", mobile_button_label: "Décrire mon projet", button_link: DEVIS, ...img("06_rouleau_mur_bleu.webp", "image", 60, 40) })],
  ]);

  // ── 05 Réalisations (planches 02 et 07) ─────────────────────────────────────────────────────────────────────────
  const proj = (title: string, mobile_title: string, file: string, category: string, link: string, fx = 50, fy = 50) => card({ title, mobile_title, subtitle: "Projet illustratif", kicker: "", ...img(file, "image", fx, fy), category, link });
  page("realisations", "Réalisations", { title: "Réalisations illustratives | APLAT", description: "Des exemples de réalisations illustratives en plâtrerie, préparation et peinture, du chantier à la finition. Filtres par métier." }, [
    ["hero", pageHero({ ...img("04_ossature_cloisons.webp"), focus_x: 60, focus_y: 50, mobile_focus_x: 60, mobile_eyebrow: "Réalisations", heading: "De la matière\nau *lieu de vie.*", mobile_heading: "De la matière\nau lieu de vie.", text: "Découvrez quelques exemples de réalisations illustratives,\ndu chantier à la finition.", mobile_text: "Découvrez des projets illustratifs\nà différentes étapes de réalisation.", height: 250, title_size: 62 })],
    ["list", section("ap-cards", { layout: "gallery", mobile_layout: "rows", filters: "Tout|all,Plâtrerie|platrerie,Peinture|peinture,Préparation|preparation", filters_label: "Filtrer les réalisations", step: 6, more_label: "Charger plus de projets", filter_status: "[n] réalisations affichées" }, [
      proj("Cloisons et plafonds d'un séjour", "Cloisons et plafonds", "04_ossature_cloisons.webp", "platrerie", DETAIL, 30),
      proj("Reprise des supports d'une chambre", "Reprise des supports", "10_preparation_murs.webp", "preparation", ENDUITS),
      proj("Préparation d'un séjour", "Préparation d'un séjour", "13_piece_protegee.webp", "preparation", DETAIL),
      proj("Peinture des murs d'un salon", "Peinture des murs", "03_piece_apres.webp", "peinture", DETAIL),
      proj("Aménagement sous pente", "Aménagement sous pente", "14_combles.webp", "platrerie", PLATRERIE),
      proj("Finitions d'un couloir", "Finitions d'un couloir", "15_couloir.webp", "peinture", PEINTURE),
      proj("Plafond en plaques de plâtre", "Plafond en plaques de plâtre", "24_plafond_joints.webp", "platrerie", PLATRERIE),
      proj("Doublage d'un mur", "Doublage d'un mur", "25_doublage_isolation.webp", "platrerie", PLATRERIE),
      proj("Mur bleu pétrole", "Mur bleu pétrole", "20_mur_bleu_soleil.webp", "peinture", PEINTURE),
    ])],
    ["cta", section("ap-cta", { layout: "slim", heading: "Vous avez un projet similaire ?", text: "Parlons-en et trouvons ensemble la meilleure solution.", mobile_text: "Parlons-en et étudions ensemble vos besoins.", button_label: "Demander un devis", button_link: DEVIS })],
  ]);

  // ── 06 Détail chantier (planches 02 et 07) ──────────────────────────────────────────────────────────────────────
  page("detail-chantier", "Exemple illustratif : du mur brut à la finition", { title: "Du mur brut à la finition | Exemple illustratif | APLAT", description: "Un projet illustratif, étape par étape : état du support, préparation, finition, simulation avant/après et détails du chantier." }, [
    ["hero", pageHero({ ...img("01_accueil_chantier_mixte.webp"), focus_x: 60, focus_y: 45, mobile_focus_x: 75, heading: "Du mur brut\nà la *finition.*", mobile_crumbs: true, text: "Suivez les étapes d'un projet illustratif, de la préparation\ndu support jusqu'à la peinture finale, pour obtenir un résultat\ndurable et harmonieux.", mobile_text: "Un même espace, à différentes étapes,\npour voir la transformation.", height: 300, title_size: 63 }, [crumb("Accueil", "/"), crumb("Réalisations", REALISATIONS), crumb("Exemple illustratif"), aside({ style: "info", title: "Informations du projet", items: "Travaux : Cloisons, enduits, peinture\nContexte : Projet illustratif\nType d'espace : Séjour", show_on: "desktop" }), aside({ style: "strip", items: "Travaux : Cloisons, enduits, peinture\nProjet illustratif : Même pièce, même point de vue", show_on: "mobile" })])],
    ["steps", section("ap-cards", { layout: "timeline", desktop_span: "8", heading: "Les étapes du chantier", mobile_hide_heading: true }, [
      card({ number: "01", title: "L'état de support", mobile_title: "L'état du support", text: "Un diagnostic pour identifier\nles pièces à traiter.", mobile_text: "Cloisons en place, joints réalisés. Les supports sont contrôlés et prêts pour la préparation.", ...img("02_piece_avant.webp", "image", 40, 50) }),
      card({ number: "02", title: "La préparation", text: "Nettoyage et réfections d'enduits\npour un support sain et net.", mobile_text: "Ponçage, rebouchage et application d'enduits pour obtenir des surfaces lisses et homogènes.", ...img("13_piece_protegee.webp", "image", 50, 50) }),
      card({ number: "03", title: "La finition", text: "Application de la peinture\npour un rendu homogène.", mobile_text: "Application des peintures avec des finitions soignées sur les murs, plafonds et menuiseries.", ...img("03_piece_apres.webp", "image", 50, 50) }),
    ])],
    ["details", section("ap-cards", { layout: "mosaic", desktop_span: "4", mobile_order: 1, heading: "Détails du chantier", mobile_heading: "Détails du projet" }, [
      card({ title: "Seau, bac et rouleau", ...img("16_seau_bac_rouleau.webp", "image", 40, 60) }),
      card({ title: "Plafond aux joints réguliers", ...img("24_plafond_joints.webp", "image", 50, 50) }),
      card({ title: "Enduit lissé", ...img("07_texture_enduit.webp", "image", 50, 50) }),
      card({ title: "Raccord de plinthe masqué", ...img("26_masquage_plinthe.webp", "image", 50, 50) }),
    ])],
    ["compare", section("ap-compare", { layout: "top", desktop_span: "7", heading: "Simulation avant / après", text: "Le même espace, la même vue. Un nouvel équilibre.", ...{ before_asset: asset("02_piece_avant.webp"), before_alt: AP_MEDIA["02_piece_avant.webp"], after_asset: asset("03_piece_apres.webp"), after_alt: AP_MEDIA["03_piece_apres.webp"] }, focus_x: 50, focus_y: 50, note: "Simulation avant/après sur la même pièce (projet illustratif)." })],
    ["zoom", section("ap-split", { layout: "zoom", desktop_span: "5", show_on: "desktop", eyebrow: "Zoom sur une technique", heading: "Les joints et les enduits", show_rule: false, text: "Les joints sont soigneusement traités et recouverts d'enduits pour obtenir une surface plane et régulière, prête à peindre. Cette étape est essentielle pour un rendu final de qualité.", ...img("05_enduit_lisseuse.webp", "image", 55, 50) })],
    ["cta", section("ap-cta", { layout: "projectslim", mobile_order: 2, heading: "Vous avez un projet similaire ?", text: "Parlons de vos besoins et réalisons votre projet ensemble.", mobile_text: "Décrivez-nous vos besoins et réalisons votre projet ensemble.", button_label: "Demander un devis", button_link: DEVIS, project_image_asset: asset("03_piece_apres.webp"), project_badge: "Projet illustratif", project_title: "Peinture des murs d'un salon", project_text: "Projet illustratif", project_link_label: "Découvrir ce projet", project_link: REALISATIONS })],
  ]);

  // ── 07 Notre approche (planches 03 et 08) ───────────────────────────────────────────────────────────────────────
  page("notre-approche", "Notre approche", { title: "Notre approche | APLAT, plâtrerie et peinture", description: "Écouter, observer, préparer, finaliser : une démarche simple et rigoureuse, du premier échange aux dernières finitions." }, [
    ["hero", pageHero({ ...img("02_piece_avant.webp"), focus_x: 45, focus_y: 50, mobile_focus_x: 70, height: 330, title_size: 59, mobile_eyebrow: "Notre approche", heading: "Le soin du support.\n*Le sens de la finition.*", mobile_heading: "Le soin du support.\nLe sens de la finition.", show_rule: true, text: "Une approche exigeante, du premier échange\naux dernières finitions, pour des espaces\ndurables et soignés.", mobile_text: "Chaque projet commence par une écoute\nattentive et se construit avec rigueur,\npour des espaces durables et harmonieux." }, [aside({ style: "box", title: "Des espaces\nqui vous ressemblent", text: "Plâtrerie et peinture pour\ndes intérieurs durables,\nharmonieux et soignés.", show_on: "desktop" })])],
    ["method", section("ap-cards", { layout: "method4", mobile_layout: "timeline", background_asset: asset("07_texture_enduit.webp") }, [
      card({ number: "01", title: "Écouter le projet", mobile_title: "Écouter", text: "Comprendre vos besoins,\nvos envies et les spécificités\ndes lieux.", mobile_text: "Comprendre vos besoins,\nvos envies et les contraintes\ndu lieu.", ...img("17_plans_crayon.webp", "image", 50, 50) }),
      card({ number: "02", title: "Observer les lieux", mobile_title: "Observer", text: "Analyser les supports,\nles contraintes techniques\net les possibilités.", mobile_text: "Analyser les supports et\nidentifier les travaux adaptés.", ...img("18_fenetre_lumiere.webp", "image", 50, 50) }),
      card({ number: "03", title: "Préparer le support", mobile_title: "Préparer", text: "Protéger, réparer, enduire\net poncer pour une base saine\net durable.", mobile_text: "Soigner chaque étape pour\nun résultat durable.", ...img("19_outils_preparation.webp", "image", 50, 50) }),
      card({ number: "04", title: "Réaliser les finitions", mobile_title: "Finaliser", text: "Appliquer les peintures\net soigner chaque détail\npour un rendu harmonieux.", mobile_text: "Des finitions précises pour\ndes intérieurs harmonieux.", ...img("20_mur_bleu_soleil.webp", "image", 50, 50) }),
    ])],
    ["cta", section("ap-cta", { layout: "light", heading: "Une démarche simple et rigoureuse\npour un résultat à la hauteur de vos espaces.", button_label: "Demander un devis", mobile_button_label: "Décrire mon projet", button_link: DEVIS, ...img("13_piece_protegee.webp", "image", 50, 50) })],
  ]);

  // ── 08 FAQ (planches 03 et 08) ──────────────────────────────────────────────────────────────────────────────────
  const fq = (question: string, answer: string, category: string, extra: Record<string, unknown> = {}) => q(question, answer, { category, ...extra });
  page("faq", "Questions fréquentes", { title: "Questions fréquentes | APLAT, plâtrerie et peinture", description: "Travaux, devis, préparation, peinture : les réponses claires pour préparer votre projet de plâtrerie et de peinture." }, [
    ["hero", pageHero({ ...img("16_seau_bac_rouleau.webp"), focus_x: 45, focus_y: 60, mobile_focus_x: 70, height: 330, title_size: 57, mobile_eyebrow: "FAQ", heading: "Les réponses\n*avant les travaux.*", mobile_heading: "Les réponses\navant les travaux.", show_rule: true, text: "Des informations claires pour préparer\nvotre projet sereinement.", mobile_text: "Des réponses claires pour vous aider\nà préparer votre projet de plâtrerie\net de peinture." }, [aside({ style: "card", title: "Une question ?", text: "Nous sommes à votre écoute\npour échanger sur votre projet.", button_label: "Demander un devis", button_link: DEVIS, show_on: "desktop" })])],
    ["faq", section("ap-faq", { layout: "page", heading: "Questions fréquentes", show_rule: false, single: true, search_placeholder: "Rechercher une question…", search_label: "Rechercher une question", tabs: "Toutes|all,Prestations|prestations,Chantier|chantier,Devis|devis", tabs_label: "Catégories de questions", empty_text: "Aucune question ne correspond à votre recherche." }, [
      fq("Quels travaux pouvez-vous étudier ?", "Nous étudions vos projets de plâtrerie et de peinture intérieure : cloisons, plafonds, doublages, enduits, préparation des supports et peinture murs et plafonds. Chaque projet est spécifique, n'hésitez pas à nous décrire votre besoin via le formulaire de devis.", "prestations", { open: true, mobile_question: "Quels travaux sont possibles ?" }),
      fq("Comment se déroule une demande de devis ?", "Vous décrivez votre projet dans le formulaire de devis (travaux, pièces, commune, calendrier souhaité, photos facultatives). La demande est étudiée avant tout devis : aucun prix n'est calculé automatiquement.", "devis", { mobile_question: "Comment se déroule un devis ?" }),
      fq("Quelles photos transmettre ?", "Une vue générale de chaque pièce, quelques détails des murs et plafonds, et les zones qui demandent une attention particulière. Les photos sont facultatives.", "devis", { mobile_question: "Pouvez-vous partager des photos de chantiers ?" }),
      fq("Faut-il préparer les pièces ?", "La protection et l'organisation du chantier sont convenues avec vous avant les travaux, selon les pièces concernées.", "chantier", { mobile_question: "Comment préparer les pièces ?" }),
      fq("Comment choisir une teinte ?", "Le choix des couleurs se fait selon vos envies, la lumière de la pièce et l'ambiance recherchée ; il fait partie de l'échange sur votre projet.", "prestations"),
      fq("Peut-on regrouper plâtrerie et peinture ?", "Oui : une même demande peut porter sur la plâtrerie, la préparation des supports et la peinture.", "prestations", { mobile_question: "Peut-on associer plâtrerie et peinture ?" }),
      fq("Où indiquer la commune du chantier ?", "Dans le formulaire de devis, rubrique « Votre chantier » (commune et code postal). La zone d'intervention est à renseigner par l'entreprise.", "devis", { mobile_question: "Intervenez-vous dans toute la région ?" }),
      fq("Comment poser une autre question ?", "Par le formulaire de contact : choisissez le sujet de votre demande et décrivez votre question.", "devis", { show_on: "desktop" }),
      { type: "help", settings: { ...img("02_piece_avant.webp", "image", 30, 50), title: "Un projet en tête ?\nParlons-en.", text: "Décrivez votre projet via\nle formulaire de devis. Nous reviendrons\nvers vous après étude.", button_label: "Demander un devis", button_link: DEVIS, show_on: "desktop" } },
      { type: "help", settings: { ...img("16_seau_bac_rouleau.webp", "image", 70, 50), title: "Une autre question ?\nParlons de votre projet.", button_label: "Nous contacter", button_link: CONTACT, show_on: "mobile" } },
    ])],
  ]);

  // ── 09 Contact (planches 03 et 08) ──────────────────────────────────────────────────────────────────────────────
  const fld = (settings: Record<string, unknown>) => ({ type: "field", settings: { error: "Veuillez renseigner ce champ.", ...settings } });
  const consent = (link_label = "Voir notre politique de confidentialité.") => fld({ kind: "consent", name: "consentement", label: "J'accepte que mes données soient utilisées dans le cadre de ma demande.", link_label, link: CONFIDENTIALITE, required: true, error: "Merci d'accepter l'utilisation de vos données pour traiter la demande.", group: "4" });
  page("contact", "Contact", { title: "Contact | APLAT, plâtrerie et peinture", description: "Une question, un projet ou besoin d'un conseil ? Écrivez-nous : nous vous répondrons après étude de votre demande." }, [
    ["form", section("ap-form", { kind: "contact", form_label: "Contact", eyebrow: "Contact", heading: "Parlons\n*de votre intérieur.*", mobile_heading: "Parlons de\nvotre intérieur.", show_rule: true, text: "Une question, un projet ou besoin d'un conseil ?\nÉcrivez-nous, nous vous répondrons\naprès étude de votre demande.", mobile_text: "Une question, un projet ou besoin\nd'un devis ? Remplissez le formulaire\net nous reviendrons vers vous.", group4_title: "Envoyez-nous un message", submit_label: "Envoyer ma demande", side_image_asset: asset("01_accueil_chantier_mixte.webp"), side_image_alt: AP_MEDIA["01_accueil_chantier_mixte.webp"], side_focus_x: 40, info_title: "Coordonnées à renseigner", info_text: "Les informations de contact seront prochainement ajoutées sur cette section." }, [
      { type: "link", settings: { icon: "doc", title: "Demander un devis", text: "Décrivez votre projet en détail\npour un échange personnalisé.", mobile_text: "pour vos travaux", link: DEVIS } },
      { type: "link", settings: { icon: "chats", title: "Consulter la FAQ", text: "Trouvez rapidement des réponses\naux questions fréquentes.", mobile_text: "pour vos questions", link: FAQ } },
      { type: "link", settings: { icon: "image", title: "Voir nos réalisations", text: "Découvrez des exemples de projets\net d'ambiances.", link: REALISATIONS, show_on: "desktop" } },
      fld({ kind: "text", name: "name", label: "Nom", required: true, width: "half", group: "4", summary: "nom", mobile_label: "Nom" }),
      fld({ kind: "email", name: "email", label: "E-mail", required: true, width: "half", group: "4", summary: "email", error: "Veuillez renseigner votre adresse e-mail.", error_format: "Vérifiez le format de l'adresse e-mail." }),
      fld({ kind: "tel", name: "phone", label: "Téléphone", hint: "(facultatif)", group: "4", summary: "telephone" }),
      fld({ kind: "select", name: "sujet", label: "Sujet", required: true, placeholder: "Sélectionnez un sujet", options: "Demande de devis\nQuestion sur une prestation\nSuivi d'une demande\nAutre question", group: "4", error: "Veuillez choisir un sujet." }),
      fld({ kind: "textarea", name: "body", label: "Message", required: true, placeholder: "Votre message…", rows: 4, group: "4" }),
      consent(),
    ])],
  ]);

  // ── 10 Devis (planches 03 et 08 ; états des planches 05 et 10) ────────────────────────────────────────────────
  page("devis", "Demande de devis", { title: "Demander un devis | APLAT, plâtrerie et peinture", description: "Décrivez vos travaux de plâtrerie ou de peinture et joignez quelques photos : votre projet est étudié avant tout devis, aucun prix automatique." }, [
    ["form", section("ap-form", { kind: "quote", form_label: "Demande de devis", heading: "Votre projet\ncom*mence ici.*", mobile_heading: "Décrivez les travaux.", text: "Décrivez les travaux et joignez quelques photos\npour préparer l'échange.", ...img("04_ossature_cloisons.webp", "image", 30, 50), visual_title: "Des informations\nqui facilitent l'échange.", visual_text: "Plus votre demande est détaillée,\nplus nous pourrons étudier votre projet\nsereinement.", group1_title: "Votre projet", group2_title: "Votre chantier", group3_title: "Vos photos", group4_title: "Vos coordonnées", examples_title: "Photos utiles pour votre demande :", examples_note: "Idéalement : une vue générale, des détails des murs et des plafonds.", step1_label: "Votre projet", step2_label: "Vos coordonnées", step1_heading: "Décrivez les travaux.", step1_text: "Quelques informations pour mieux comprendre votre projet.", step2_heading: "Ajoutez les détails utiles.", step2_text: "Ces informations nous permettront d'étudier votre demande plus précisément.", submit_label: "Envoyer ma demande de devis", submit_note: "Aucun prix automatique : le projet est étudié avant devis.", confirm_link: CONFIRMATION, photo_max_mb: 10 }, [
      fld({ kind: "choice", name: "travaux", label: "Type de travaux", required: true, options: "Plâtrerie\nPeinture\nLes deux", group: "1", summary: "projet", error: "Veuillez choisir le type de travaux." }),
      fld({ kind: "choice", name: "logement", label: "Type de logement", required: true, options: "Neuf\nRénovation", group: "1", summary: "logement", error: "Veuillez choisir neuf ou rénovation." }),
      fld({ kind: "select", name: "pieces", label: "Pièces concernées", required: true, placeholder: "Sélectionnez les pièces concernées", mobile_placeholder: "Sélectionnez les pièces…", options: "Séjour\nChambre\nCuisine\nSalle de bains\nCouloir ou entrée\nCombles\nPlusieurs pièces\nAutre", width: "wide", group: "1", summary: "pieces", error: "Veuillez choisir les pièces concernées." }),
      fld({ kind: "text", name: "surface", label: "Surface estimée", hint: "(facultatif)", placeholder: "Ex. : 50 m²", mobile_placeholder: "En m² (ex. : 50)", width: "narrow", group: "1", summary: "surface" }),
      fld({ kind: "text", name: "commune", label: "Commune", required: true, placeholder: "", mobile_placeholder: "Votre commune", width: "wide", group: "2", summary: "commune" }),
      fld({ kind: "text", name: "code_postal", label: "Code postal", required: true, placeholder: "", mobile_placeholder: "Ex. : 75000", pattern: "[0-9]{5}", width: "narrow", group: "2", summary: "cp", error_format: "Vérifiez le code postal (5 chiffres)." }),
      fld({ kind: "select", name: "calendrier", label: "Calendrier souhaité", hint: "(facultatif)", placeholder: "Sélectionnez une période", options: "Dès que possible\nDans le mois\nDans les 3 mois\nPlus tard\nÀ définir ensemble", group: "2", summary: "calendrier" }),
      fld({ kind: "textarea", name: "body", label: "Description des travaux", mobile_label: "Description du projet", required: true, placeholder: "Décrivez votre projet, vos besoins, vos contraintes…", rows: 3, group: "2", summary: "description" }),
      fld({ kind: "photos", name: "photos", label: "Ajouter des photos", mobile_label: "Ajouter des photos du chantier", placeholder: "JPG, PNG — Jusqu'à 10 Mo par fichier", mobile_placeholder: "(JPG ou PNG)", hint: "", button_label: "Sélectionner des fichiers", group: "3", error: "" }),
      { type: "example", settings: { image_asset: asset("02_piece_avant.webp"), caption: "Vue générale\nde la pièce", group: "3" } },
      { type: "example", settings: { image_asset: asset("07_texture_enduit.webp"), caption: "Détails\ndes murs", group: "3" } },
      { type: "example", settings: { image_asset: asset("24_plafond_joints.webp"), caption: "Plafonds\net angles", group: "3" } },
      fld({ kind: "text", name: "name", label: "Nom", required: true, width: "half", group: "4", summary: "nom" }),
      fld({ kind: "email", name: "email", label: "E-mail", required: true, width: "half", group: "4", summary: "email", error: "Veuillez renseigner votre adresse e-mail.", error_format: "Vérifiez le format de l'adresse e-mail." }),
      fld({ kind: "tel", name: "phone", label: "Téléphone", hint: "(facultatif)", group: "4", summary: "telephone" }),
      fld({ kind: "textarea", name: "precisions", label: "Précisions complémentaires", hint: "(facultatif)", placeholder: "Informations utiles, accès, contraintes, …", rows: 2, group: "4", show_on: "mobile" }),
      consent("Voir notre politique de confidentialité."),
    ])],
  ]);

  // ── 11 Enduits et préparation (planches 04 et 09) ───────────────────────────────────────────────────────────────
  const boxHero = (settings: Record<string, unknown>) => section("ap-hero", { layout: "box", mobile_layout: "stack", height: 453, mobile_height: 440, box_width: 671, box_left: 4, box_top: 60, box_padding: 71, ...settings });
  page("enduits-et-preparation", "Enduits et préparation", { title: "Enduits et préparation des supports | APLAT", description: "Observer les supports, reprendre les irrégularités, traiter les joints, préparer la mise en peinture : des supports bien préparés pour des finitions durables." }, [
    ["hero", boxHero({ ...img("01_accueil_chantier_mixte.webp"), focus_x: 60, focus_y: 50, mobile_focus_x: 70, title_size: 72, mobile_title_size: 35, mobile_height: 406, mobile_box_right: 94, mobile_box_bottom: 55, mobile_hide_buttons: true, heading: "La finition\nse prépare.", text: "Des supports bien préparés pour\ndes résultats durables et soignés.", mobile_text: "Des supports bien préparés\npour des finitions durables\net harmonieuses.", show_rule: true, button_label: "Demander un devis", mobile_button_label: "", button_link: DEVIS })],
    ["steps", section("ap-strip", { style: "steps", show_on: "desktop", heading: "Les étapes de la préparation" }, [
      { type: "item", settings: { number: "01", title: "Observer", text: "les supports", link: "#observer" } },
      { type: "item", settings: { number: "02", title: "Reprendre", text: "les irrégularités", link: "#reprendre" } },
      { type: "item", settings: { number: "03", title: "Traiter", text: "les joints", link: "#joints" } },
      { type: "item", settings: { number: "04", title: "Préparer", text: "la mise en peinture", link: "#peinture" } },
    ])],
    ["alternate", section("ap-cards", { layout: "alternate", mobile_heading: "Nos étapes clés", mobile_hide_heading: false, heading: "" }, [
      card({ number: "01", title: "Observer les supports", mobile_title: "Observer\nles supports", text: "Nous commençons par analyser l'état\ndes murs, plafond et cloison afin\nd'identifier les potentiels de chaque\nespace et d'adapter les préparations\nnécessaires.", mobile_text: "Chaque surface est analysée\npour identifier sa nature\net ses particularités.", ...img("10_preparation_murs.webp", "image", 40, 50), ...img("07_texture_enduit.webp", "image2"), mobile_image_asset: asset("02_piece_avant.webp"), mobile_focus_x: 50, kicker: "", category: "observer" }),
      card({ number: "02", title: "Reprendre les irrégularités", mobile_title: "Reprendre\nles irrégularités", text: "Les défauts de surface sont repris pour\nobtenir des supports plans et réguliers,\npropices à une finition soignée.", mobile_text: "Les défauts sont traités pour\nobtenir des surfaces planes\net homogènes.", ...img("02_piece_avant.webp", "image", 50, 50), mobile_image_asset: asset("05_enduit_lisseuse.webp"), mobile_focus_x: 60, category: "reprendre" }),
      card({ number: "03", title: "Traiter les joints", mobile_title: "Traiter\nles joints", text: "Les joints des plaques de plâtre sont\ntraités avec des enduits adaptés pour\ndes liaisons solides et discrètes.", ...img("05_enduit_lisseuse.webp", "image", 60, 50), category: "joints", show_on: "desktop" }),
      card({ number: "04", mobile_number: "03", title: "Préparer la mise en peinture", mobile_title: "Préparer\nla mise en peinture", text: "Une fois les supports prêts, nous appliquons\nles préparations adaptées pour garantir\nune bonne tenue et un rendu homogène\ndes peintures.", mobile_text: "Les supports sont prêts à recevoir\ndes finitions soignées et durables.", ...img("06_rouleau_mur_bleu.webp", "image", 40, 50), mobile_focus_y: 35, category: "peinture" }),
    ])],
    ["more", section("ap-cards", { layout: "complements", mobile_layout: "list", band: true, heading: "Prestations complémentaires", mobile_heading: "Nos prestations associées", text: "Des solutions globales pour vos espaces intérieurs." }, [
      card({ title: "Cloisons et plafonds", mobile_title: "Plâtrerie", mobile_text: "Cloisons, plafonds,\ndoublages", ...img("04_ossature_cloisons.webp", "image", 30, 50), link: PLATRERIE }),
      card({ title: "Enduits et préparation", ...img("05_enduit_lisseuse.webp", "image", 50, 50), link: ENDUITS, show_on: "desktop" }),
      card({ title: "Peinture intérieure", mobile_title: "Peinture", mobile_text: "Murs et plafonds", ...img("06_rouleau_mur_bleu.webp", "image", 50, 50), link: PEINTURE }),
    ])],
    ["faq", section("ap-faq", { layout: "band", mobile_style: "lines", heading: "Questions\nfréquentes", mobile_heading: "", show_rule: false }, [
      q("Sur quels supports intervenez-vous ?", "Plaques de plâtre, murs et plafonds intérieurs : chaque support est observé avant les travaux. Les supports traités sont à préciser par l'entreprise.", { mobile_question: "Quels supports peuvent être préparés ?" }),
      q("Faut-il tout enduire avant de peindre ?", "Non : l'enduit dépend de l'état du support. L'observation des surfaces permet de choisir la préparation nécessaire.", { mobile_question: "Combien de temps prend la préparation ?" }),
      q("Combien de temps prend la préparation des supports ?", "Cela dépend des surfaces et des temps de séchage ; la durée est précisée après l'étude de votre demande.", { mobile_question: "Faut-il préparer tous les supports ?" }),
    ])],
    ["cta", section("ap-cta", { layout: "note", heading: "Un projet ?\nParlons-en.", text: "Chaque espace est unique. Échangeons sur vos besoins\npour trouver la solution la plus adaptée.", button_label: "Demander un devis", button_link: DEVIS, ...img("19_outils_preparation.webp", "image", 50, 50) })],
  ]);

  // ── 12 Conseils (planches 04 et 09) ─────────────────────────────────────────────────────────────────────────────
  const tip = (kicker: string, title: string, text: string, file: string, category: string, link = "", extra: Record<string, unknown> = {}) => card({ kicker, title, text, ...img(file, "image", 50, 50), category, link, link_label: link ? "Lire l'article" : "", ...extra });
  page("conseils", "Conseils", { title: "Conseils | APLAT, préparer son projet de plâtrerie et de peinture", description: "Des repères pour préparer votre projet : photos à joindre, pièces à décrire, couleurs, premier échange et étapes du chantier." }, [
    ["hero", boxHero({ ...img("02_piece_avant.webp"), focus_x: 55, focus_y: 50, mobile_image_asset: asset("01_accueil_chantier_mixte.webp"), mobile_focus_x: 60, title_size: 66, mobile_title_size: 31, mobile_height: 383, mobile_box_right: 18, mobile_box_bottom: 0, heading: "Les bons repères\navant les travaux.", box_width: 582, box_left: 33, box_top: 80, box_padding: 36, text: "Des conseils pour mieux préparer\nvotre projet de plâtrerie et de peinture.", mobile_text: "Des conseils pour mieux préparer\nvotre projet et avancer sereinement.", show_rule: true, height: 475 })],
    ["list", section("ap-cards", { layout: "articles", mobile_layout: "stack", mobile_heading: "Nos conseils", filters: "Tous les conseils|all|Tous,Préparer son projet|projet|Projet,Couleurs|couleurs,Chantier|chantier", filters_label: "Filtrer les conseils", filter_status: "[n] conseils affichés" }, [
      tip("Préparer son projet", "Quelles photos joindre\nà votre demande de devis ?", "Des photos claires nous permettent de mieux\ncomprendre votre projet et d'étudier vos besoins\navec précision.", "02_piece_avant.webp", "projet", ARTICLE, { mobile_image_asset: asset("23_appareil_photo_chantier.webp"), mobile_kicker: "Projet", mobile_text: "Des repères simples pour nous aider à comprendre votre projet." }),
      tip("Préparer son projet", "Décrire les pièces\nconcernées", "Une description simple et précise\ndes espaces facilite l'étude de votre\nprojet.", "10_preparation_murs.webp", "projet", "", { mobile_kicker: "Projet", mobile_title: "Décrire les pièces concernées", mobile_text: "Les informations utiles pour présenter vos espaces.", badge: "Article à venir" }),
      tip("Couleurs", "Rassembler ses envies\nde couleurs", "Quelques repères pour exprimer\nvos ambiances et vos préférences\nde teintes.", "21_eventail_couleurs.webp", "couleurs", "", { mobile_text: "Des idées et inspirations pour définir vos ambiances.", badge: "Article à venir" }),
      tip("Préparer son projet", "Préparer le premier\néchange", "Les informations utiles pour un\néchange efficace et un projet bien\ncadré.", "22_plans_metre.webp", "projet", "", { mobile_kicker: "Projet", mobile_title: "Préparer le premier échange", mobile_text: "Les éléments à réunir pour un échange efficace.", badge: "Article à venir" }),
      tip("Chantier", "Comprendre les étapes\ndu projet", "Les grandes phases, du support\naux finitions, pour un intérieur\ndurable et harmonieux.", "15_couloir.webp", "chantier", "", { mobile_title: "Comprendre les étapes du projet", mobile_text: "Une vue d'ensemble des grandes phases de réalisation.", badge: "Article à venir" }),
    ])],
    ["more", section("ap-split", { layout: "note", show_on: "desktop", heading: "D'autres questions ?", show_rule: false, text: "Nos conseils vous aident à y voir plus clair\navant de démarrer vos travaux.", button_label: "Voir toutes les questions", button_link: FAQ, ...img("05_enduit_lisseuse.webp", "image", 60, 50) })],
    ["cta", section("ap-cta", { layout: "band", mobile_style: "card", heading: "Un projet ?\nParlons-en.", mobile_heading: "Vous avez un projet ?", text: "Chaque espace est unique. Échangeons sur vos besoins\npour trouver la solution la plus adaptée.", mobile_text: "Échangeons sur vos besoins et trouvons\nensemble la meilleure solution.", button_label: "Demander un devis", button_link: DEVIS, ...img("03_piece_apres.webp", "image", 70, 50) })],
  ]);

  // ── 13 Article conseil (planches 04 et 09) ──────────────────────────────────────────────────────────────────────
  page("quelles-photos-joindre", "Quelles photos joindre à votre demande de devis ?", { title: "Quelles photos joindre à votre demande de devis ? | Conseils APLAT", description: "Une vue générale de la pièce, les détails des murs et plafonds, les zones à expliquer : les photos qui aident à comprendre votre projet." }, [
    ["article", section("ap-article", { heading: "Quelles photos joindre à\nvotre demande de devis ?", text: "Des photos claires et bien cadrées nous permettent de mieux\ncomprendre votre projet et d'étudier vos besoins avec précision.", mobile_text: "Des photos claires et bien cadrées nous aident à comprendre votre projet et à vous proposer une solution adaptée.", ...img("01_accueil_chantier_mixte.webp"), focus_x: 50, focus_y: 50, mobile_focus_x: 60, quote: "Quelques vues utiles\npour mieux comprendre\nvotre projet.", band_title: "Ajouter des photos à mon projet", band_text: "Vous pouvez joindre vos photos lors de votre demande de devis.", band_button_label: "Demander un devis", band_button_link: DEVIS, band_image_asset: asset("23_appareil_photo_chantier.webp"), related_title: "Articles liés", mobile_related_title: "Articles associés" }, [
      crumb("Accueil", "/"), crumb("Conseils", CONSEILS), crumb("Quelles photos joindre à votre demande de devis ?"),
      { type: "part", settings: { number: "01", title: "Une vue générale de la pièce", mobile_title: "Une vue générale", toc_label: "Une vue générale de la pièce", anchor: "vue-generale", text: "Une photo d'ensemble permet de se repérer dans l'espace :\nvolumes, ouvertures, configuration générale.", mobile_text: "Une photo d'ensemble par pièce permet de comprendre les volumes, la luminosité et l'état général des supports.", ...img("02_piece_avant.webp", "image", 50, 50) } },
      { type: "part", settings: { number: "02", title: "Les détails des murs et plafonds", toc_label: "Les détails des murs et plafonds", anchor: "details", text: "Quelques images rapprochées des murs, plafonds et angles\naident à identifier l'état des supports et les particularités\nà prendre en compte.", mobile_text: "Des photos plus rapprochées aident à visualiser la nature des supports, les jonctions et les éventuelles irrégularités.", ...img("07_texture_enduit.webp", "image", 50, 50), image2_asset: asset("08_jonction_plafond.webp"), image2_alt: AP_MEDIA["08_jonction_plafond.webp"] } },
      { type: "part", settings: { number: "03", title: "Les zones à expliquer", toc_label: "Les zones à expliquer", anchor: "zones", text: "Si certaines zones nécessitent une attention particulière\n(traces, fissures, angles, raccords…), des photos détaillées\nou un court descriptif nous permettent de mieux comprendre\nvos attentes.", mobile_text: "Si certaines zones nécessitent une attention particulière, prenez-les en photo. Cela nous permet de mieux comprendre votre besoin.", ...img("27_angle_prise_mur.webp", "image", 50, 50), image2_asset: asset("09_raccord_bleu_blanc.webp"), image2_alt: AP_MEDIA["09_raccord_bleu_blanc.webp"] } },
      { type: "related", settings: { ...img("21_eventail_couleurs.webp"), kicker: "Couleurs", title: "Rassembler ses envies de couleurs", link: CONSEILS, show_on: "desktop" } },
      { type: "related", settings: { ...img("22_plans_metre.webp"), kicker: "Préparer son projet", title: "Préparer le premier échange", link: CONSEILS, show_on: "desktop" } },
      { type: "related", settings: { ...img("10_preparation_murs.webp"), kicker: "Préparer son projet", title: "Décrire les pièces concernées", link: CONSEILS } },
      { type: "related", settings: { ...img("15_couloir.webp"), kicker: "Chantier", title: "Comprendre les étapes du projet", link: CONSEILS } },
    ])],
  ]);

  // ── 14 Confirmation (planches 04 et 09) ─────────────────────────────────────────────────────────────────────────
  page("confirmation", "Confirmation de votre demande", { title: "Confirmation de votre demande | APLAT", description: "Récapitulatif de votre demande de devis et prochaines étapes." }, [
    ["confirm", section("ap-confirm", { texture_asset: asset("07_texture_enduit.webp"), heading: "Merci pour votre demande.", mobile_heading: "Merci pour\nvotre demande.", subtitle: "Votre projet est prêt pour un premier échange.", text: "Nous avons bien reçu les informations transmises.\nElles vont nous permettre d'étudier votre projet et de revenir vers vous\npour un premier échange.", mobile_text: "Les informations du formulaire\nseront reprises ici.", recap_title: "Récapitulatif de votre demande", mobile_recap_title: "Votre demande est bien\nprise en compte.", mobile_recap_text: "Nous reviendrons vers vous\nprochainement pour échanger\nsur votre projet.", button_label: "Retour à l'accueil", button_link: "/", button2_label: "Voir des réalisations", button2_link: REALISATIONS, next_title: "Et maintenant ?", next_text: "En attendant notre échange, vous pouvez consulter\nnos réalisations ou nos conseils pour préparer sereinement\nvotre projet.", next_image_asset: asset("01_accueil_chantier_mixte.webp"), next_focus_x: 60 }, [
      { type: "row", settings: { icon: "user", label: "Type de travaux", key: "projet", empty: "Renseignements du formulaire" } },
      { type: "row", settings: { icon: "pin", label: "Commune", key: "commune", empty: "Renseignements du formulaire" } },
      { type: "row", settings: { icon: "camera", label: "Photos", key: "photos", template: "Nombre de fichiers : [n]", empty: "Renseignements du formulaire\n(Nombre de fichiers : à renseigner)" } },
    ])],
    ["faq", section("ap-faq", { layout: "row", mobile_style: "lines", heading: "Questions fréquentes", mobile_heading: "Une question en attendant ?", show_rule: false }, [
      q("Que se passe-t-il après ma demande de devis ?", "Votre demande est étudiée, puis nous revenons vers vous pour un premier échange sur votre projet. Délai de réponse : à renseigner.", { mobile_question: "Comment se déroule la suite ?" }),
      q("Puis-je compléter ma demande avec d'autres informations ?", "Oui, lors du premier échange ou en nous écrivant depuis la page Contact.", { mobile_question: "Quels éléments peuvent être complétés plus tard ?" }),
      q("Comment sont utilisées mes informations ?", "Uniquement pour traiter votre demande. Les détails figurent dans la politique de confidentialité.", { mobile_question: "Puis-je modifier ma demande ?" }),
    ])],
    ["more", section("ap-cta", { layout: "help", show_on: "mobile", heading: "Besoin d'en savoir plus ?", text: "Découvrez nos conseils pour mieux\npréparer votre projet.", button_label: "Voir tous nos conseils", button_link: CONSEILS })],
  ]);

  // ── 15 Mentions légales, 16 Confidentialité, 17 Cookies (planches 05 et 10) ──────────────────────────────────
  const nav = (label: string, anchor: string) => ({ type: "nav", settings: { label, anchor } });
  const legalHero = (settings: Record<string, unknown>) => section("ap-hero", { layout: "fade", mobile_layout: "stack", style: "legal", height: 400, mobile_height: 250, ...{ texture_asset: asset("07_texture_enduit.webp") }, ...settings });
  const R = "À renseigner";
  page("mentions-legales", "Mentions légales", { title: "Mentions légales | APLAT", description: "Éditeur, contact, hébergement et crédits du site. Structure à compléter avec les informations réelles de l'entreprise avant publication." }, [
    ["hero", legalHero({ ...img("04_ossature_cloisons.webp"), focus_x: 50, focus_y: 50, mobile_image_asset: asset("07_texture_enduit.webp"), mobile_layout: "box", mobile_height: 248, mobile_title_size: 33, mobile_box_right: 13, mobile_box_bottom: 33, title_size: 92, heading: "Mentions légales", text: "Cette page présente les informations légales\nrelatives au site internet.", mobile_text: "Structure à compléter avant publication." })],
    ["legal", section("ap-legal", { kind: "mentions", label: "Mentions légales", ...img("28_enduit_spatule_verticale.webp", "image", 40, 50), mobile_image_asset: asset("01_accueil_chantier_mixte.webp"), mobile_image_height: 170, mobile_focus_y: 60, notice_title: "Structure à compléter avant publication", notice_text: "Les informations ci-dessous sont des éléments de structure à renseigner\navec les données réelles de votre activité et de vos prestataires.", notice_anchor: "a-completer" }, [
      nav("Éditeur", "editeur"), nav("Contact", "contact-site"), nav("Hébergement", "hebergement"), nav("Crédits", "credits"),
      { type: "part", settings: { mobile_order: 1, title: "Éditeur du site", anchor: "editeur", items: `Nom ou raison sociale : ${R}\nForme juridique : ${R}\nIdentifiant d'entreprise : ${R}\nAdresse professionnelle : ${R}\nResponsable de publication : ${R}`, mobile_items: `Éditeur du site : ${R}.\nIdentifiant d'entreprise : ${R}.\nAdresse professionnelle : ${R}.\nResponsable de la publication : ${R}.` } },
      { type: "part", settings: { mobile_order: 3, title: "Contact", anchor: "contact-site", items: `Contact : ${R}\nE-mail : ${R}\nTéléphone : ${R}`, mobile_items: `Contact : ${R}.` } },
      { type: "part", settings: { mobile_order: 2, title: "Hébergement", anchor: "hebergement", items: `Hébergeur : ${R}\nAdresse : ${R}\nSite internet : ${R}`, mobile_items: `Hébergement du site : ${R}.` } },
      { type: "part", settings: { title: "Crédits", anchor: "credits", items: `Conception et réalisation : ${R}\nPhotographies : ${R} (photos de vos réalisations)\nIcônes et visuels : ${R}`, mobile_order: 4, mobile_plain: true, mobile_items: `${R}\nConception et développement : ${R}.\nPhotos : visuels de démonstration à remplacer\npar vos réalisations.` } },
    ])],
  ]);
  const todoNote = "À définir selon le fonctionnement réel du site.";
  page("confidentialite", "Confidentialité", { title: "Politique de confidentialité | APLAT", description: "Comment les informations saisies sur ce site (formulaires, photos) peuvent être utilisées. Contenus à adapter au fonctionnement réel du site." }, [
    ["hero", legalHero({ ...img("03_piece_apres.webp"), focus_x: 40, focus_y: 50, mobile_image_asset: asset("01_accueil_chantier_mixte.webp"), mobile_focus_x: 70, mobile_layout: "box", mobile_hide_text: true, mobile_height: 260, mobile_title_size: 34, mobile_box_right: 75, mobile_box_bottom: 3, title_size: 87, height: 405, heading: "Confidentialité", mobile_heading: "Politique de\nconfidentialité", subtitle: "Vos informations dans le cadre de votre demande.", text: "Cette page explique de manière transparente comment\nles informations saisies sur ce site peuvent être utilisées.", mobile_text: "" })],
    ["legal", section("ap-legal", { kind: "privacy", label: "Confidentialité", mobile_image_asset: asset("28_enduit_spatule_verticale.webp"), mobile_focus_y: 40, mobile_image_height: 220, intro: p("Cette page présente, de manière synthétique, la façon dont vos données peuvent être collectées et utilisées sur ce site.") + p("À préciser selon le fonctionnement réel du site.") }, [
      nav("Données du formulaire", "donnees"), nav("Utilisation des photos", "photos"), nav("Finalité de traitement", "finalite"), nav("Durée de conservation", "conservation"), nav("Prestataires", "prestataires"), nav("Exercer une demande", "demande"),
      { type: "part", settings: { icon: "doc", title: "Données du formulaire", anchor: "donnees", text: p("Les informations que vous renseignez dans le formulaire de demande de devis sont utilisées uniquement pour traiter votre demande."), note: todoNote, mobile_note: "À préciser selon le fonctionnement réel du site." } },
      { type: "part", settings: { icon: "image", title: "Utilisation des photos", mobile_title: "Photos du chantier", anchor: "photos", text: p("Si vous nous transmettez des photos de vos espaces, elles sont utilisées uniquement dans le cadre de nos échanges pour comprendre votre projet."), note: todoNote, mobile_note: "À préciser selon le fonctionnement réel du site." } },
      { type: "part", settings: { icon: "gear", title: "Finalité de traitement", mobile_title: "Finalités du traitement", anchor: "finalite", text: p("Les informations sont utilisées uniquement pour répondre à votre demande de devis et échanger sur votre projet."), note: todoNote, mobile_note: "À préciser selon le fonctionnement réel du site." } },
      { type: "part", settings: { icon: "clock", title: "Durée de conservation", anchor: "conservation", text: p("Les données sont conservées pendant une durée limitée, nécessaire au traitement de votre demande."), note: todoNote, mobile_note: "À préciser selon le fonctionnement réel du site." } },
      { type: "part", settings: { icon: "users", title: "Prestataires et destinataires", mobile_title: "Prestataires et outils", anchor: "prestataires", text: p("Les informations peuvent être accessibles à nos prestataires techniques dans le cadre du fonctionnement du site."), note: todoNote, mobile_note: "À préciser selon le fonctionnement réel du site." } },
      { type: "part", settings: { icon: "mail", title: "Exercer une demande", mobile_title: "Vos demandes et vos droits", anchor: "demande", text: p("Vous pouvez demander l'accès, la modification ou la suppression de vos informations."), note: todoNote, mobile_note: "À préciser selon le fonctionnement réel du site." } },
    ])],
  ]);
  page("cookies", "Cookies et préférences", { title: "Cookies et préférences | APLAT", description: "Vos choix de cookies : essentiels toujours actifs, mesure d'audience et contenus externes désactivés par défaut, modifiables à tout moment." }, [
    ["hero", legalHero({ ...img("06_rouleau_mur_bleu.webp"), focus_x: 60, focus_y: 40, mobile_image_asset: asset("05_enduit_lisseuse.webp"), mobile_focus_x: 70, mobile_layout: "box", mobile_hide_text: true, mobile_height: 312, mobile_title_size: 37, mobile_box_right: 85, mobile_box_bottom: 0, title_size: 86, heading: "Cookies et préférences", mobile_heading: "Cookies et\npréférences", subtitle: "Vous gardez le contrôle.", text: "Ce site utilise des cookies uniquement pour son bon fonctionnement.\nVous pouvez gérer vos préférences ci-dessous.", mobile_text: "" })],
    ["legal", section("ap-legal", { kind: "cookies", label: "Cookies et préférences", ...img("16_seau_bac_rouleau.webp", "image", 40, 50), notice_title: "Aucune mesure d'audience ni contenu externe activé dans cette maquette.", notice_text: "Les cookies optionnels sont désactivés par défaut. Vous pouvez modifier vos choix à tout moment.", notice_anchor: "a-propos", intro: p("Ce site utilise des cookies pour assurer son bon fonctionnement et, avec votre accord, pour mesurer l'audience et intégrer des contenus externes.") + p("Vous pouvez à tout moment modifier vos choix."), consent_essential_text: "Nécessaires au bon fonctionnement du site (navigation, sécurité, préférences). Toujours activés.", consent_essential_mobile_text: "Ces cookies sont nécessaires au bon fonctionnement du site. Ils ne peuvent pas être désactivés.", consent_audience_mobile_text: "À préciser selon le fonctionnement réel du site.", consent_external_mobile_text: "À préciser selon le fonctionnement réel du site.", consent_audience_text: "Permettent de comprendre la manière dont le site est consulté afin d'améliorer son contenu.", consent_external_text: "Permettent d'afficher des contenus provenant de services externes (vidéos, cartes, etc.).", consent_info_title: "Prestataires (à renseigner)", consent_info_text: "La liste des prestataires sera à compléter selon les outils réellement utilisés sur le site.", consent_info_list: "Nom du prestataire — Type de cookie\nNom du prestataire — Type de cookie\nNom du prestataire — Type de cookie", consent_info_anchor: "partenaires", choices_anchor: "mes-choix" }, [
      nav("Mes choix", "mes-choix"), nav("À propos des cookies", "a-propos"), nav("Les différents cookies", "types"), nav("Nos partenaires", "partenaires"),
    ])],
  ]);
  page("plan-du-site", "Plan du site", { title: "Plan du site | APLAT", description: "Toutes les pages du site APLAT : prestations, réalisations, approche, conseils, questions, contact, devis et informations légales." }, [
    ["hero", legalHero({ ...img("02_piece_avant.webp"), focus_x: 50, focus_y: 50, title_size: 64, heading: "Plan du site", text: "Toutes les pages du site, en un coup d'œil." })],
    ["links", section("ap-cards", { layout: "shortcuts", heading: "Pages du site" }, [
      card({ icon: "paint", title: "Prestations", text: "Plâtrerie, enduits et préparation, peinture intérieure.", link: PRESTATIONS }),
      card({ icon: "image", title: "Réalisations", text: "Réalisations illustratives et détail d'un chantier.", link: REALISATIONS }),
      card({ icon: "users", title: "Notre approche", text: "Écouter, observer, préparer, finaliser.", link: APPROCHE }),
      card({ icon: "doc", title: "Conseils", text: "Des articles pour préparer votre projet.", link: CONSEILS }),
      card({ icon: "chats", title: "Questions fréquentes", text: "Les réponses avant les travaux.", link: FAQ }),
      card({ icon: "mail", title: "Contact", text: "Une question ou un besoin de conseil.", link: CONTACT }),
      card({ icon: "doc", title: "Demander un devis", text: "Décrire les travaux et joindre des photos.", link: DEVIS }),
      card({ icon: "shield", title: "Informations légales", text: "Mentions légales, confidentialité, cookies.", link: MENTIONS }),
    ])],
  ]);

  // ── 18 Page introuvable (planches 05 et 10) ─────────────────────────────────────────────────────────────────────
  spec.templates["404"] = template([
    ["hero", section("ap-hero", { layout: "notfound", mobile_layout: "card", height: 855, mobile_height: 1220, ...{ texture_asset: asset("07_texture_enduit.webp") }, ...img("02_piece_avant.webp"), focus_x: 75, focus_y: 50, mobile_image_asset: asset("16_seau_bac_rouleau.webp"), mobile_focus_x: 40, mobile_focus_y: 70, notfound_text: "404", heading: "Cette page est *introuvable.*", mobile_heading: "Cette page est\nintrouvable.", text: "La page que vous recherchez n'existe plus\nou a peut-être été déplacée.", mobile_text: "La page que vous recherchez\nn'existe pas ou a été déplacée.", button_label: "Retour à l'accueil", button_link: "/", button2_label: "Voir les prestations", button2_link: PRESTATIONS })],
    ["links", section("ap-cards", { layout: "shortcuts", heading: "Besoin d'un autre point de repère ?" }, [
      card({ icon: "paint", title: "Nos prestations", text: "Plâtrerie, enduits,\npeinture intérieure.", link: PRESTATIONS }),
      card({ icon: "image", title: "Nos réalisations", text: "Des exemples\npour vous inspirer.", link: REALISATIONS }),
      card({ icon: "users", title: "Notre approche", text: "Une méthode simple\net un suivi clair.", link: APPROCHE }),
      card({ icon: "doc", title: "Nos conseils", text: "Des articles pour\nmieux préparer votre projet.", link: CONSEILS }),
    ])],
  ]);

  // Pages, menus, en-tête et pied (planches 01 à 10).
  spec.store.pages = pages.map((pg) => ({ handle: pg.handle, title: pg.title, template_suffix: pg.handle, body_html: "", seo: pg.seo }));
  for (const key of Object.keys(spec.templates)) if (key.startsWith("page.")) delete spec.templates[key];
  for (const pg of pages) spec.templates[`page.${pg.handle}`] = template([["title", section("main-page", { show_title: false, width: "wide", color_scheme: "scheme-1", padding_top: 0, padding_bottom: 0 })], ...pg.rows]);
  spec.store.menus = {
    "main-menu": { title: "Menu principal", links: [{ title: "Prestations", url: PRESTATIONS }, { title: "Réalisations", url: REALISATIONS }, { title: "Notre approche", url: APPROCHE }, { title: "Conseils", url: CONSEILS }] },
    "mobile-menu": { title: "Menu du téléphone", links: [{ title: "Prestations", url: PRESTATIONS, links: [{ title: "Plâtrerie", url: PLATRERIE }, { title: "Enduits et préparation", url: ENDUITS }, { title: "Peinture", url: PEINTURE }] }, { title: "Réalisations", url: REALISATIONS }, { title: "Notre approche", url: APPROCHE }, { title: "Conseils", url: CONSEILS }, { title: "FAQ", url: FAQ }, { title: "Contact", url: CONTACT }] },
    "footer-navigation": { title: "Navigation", links: [{ title: "Accueil", url: "/" }, { title: "Prestations", url: PRESTATIONS }, { title: "Réalisations", url: REALISATIONS }, { title: "Notre approche", url: APPROCHE }, { title: "Conseils", url: CONSEILS }] },
    "footer-navigation-2": { title: "Navigation", links: [{ title: "Prestations", url: PRESTATIONS }, { title: "Réalisations", url: REALISATIONS }, { title: "Notre approche", url: APPROCHE }, { title: "Conseils", url: CONSEILS }, { title: "Contact", url: CONTACT }] },
    "footer-prestations": { title: "Nos prestations", links: [{ title: "Plâtrerie", url: PLATRERIE }, { title: "Enduits et préparation", url: ENDUITS }, { title: "Peinture", url: PEINTURE }] },
    "footer-prestations-m": { title: "Prestations", links: [{ title: "Plâtrerie", url: PLATRERIE }, { title: "Enduits & préparation", url: ENDUITS }, { title: "Peinture intérieure", url: PEINTURE }] },
    "footer-prestations-2": { title: "Nos prestations", links: [{ title: "Plâtrerie", url: PLATRERIE }, { title: "Cloisons & plafonds", url: `${PLATRERIE}#cloisons` }, { title: "Enduits & préparation", url: ENDUITS }, { title: "Peinture", url: PEINTURE }, { title: "Finitions", url: `${PEINTURE}#finitions` }] },
    "footer-prestations-3": { title: "Nos prestations", links: [{ title: "Plâtrerie", url: PLATRERIE }, { title: "Cloisons et plafonds", url: `${PLATRERIE}#cloisons` }, { title: "Enduits et préparation", url: ENDUITS }, { title: "Peinture intérieure", url: PEINTURE }] },
    "footer-explorer": { title: "Explorer", links: [{ title: "Réalisations", url: REALISATIONS }, { title: "Notre approche", url: APPROCHE }, { title: "Conseils", url: CONSEILS }] },
    "footer-liens": { title: "Liens utiles", links: [{ title: "Demander un devis", url: DEVIS }, { title: "FAQ", url: FAQ }, { title: "Mentions légales", url: MENTIONS }, { title: "Confidentialité", url: CONFIDENTIALITE }, { title: "Cookies", url: COOKIES }] },
    "footer-informations": { title: "Informations", links: [{ title: "Mentions légales", url: MENTIONS }, { title: "Politique de confidentialité", url: CONFIDENTIALITE }, { title: "Cookies", url: COOKIES }] },
    footer: { title: "Informations", links: [{ title: "Mentions légales", url: MENTIONS }, { title: "Confidentialité", url: CONFIDENTIALITE }, { title: "Cookies", url: COOKIES }] },
    "legal-long": { title: "Informations légales", links: [{ title: "Mentions légales", url: MENTIONS }, { title: "Politique de confidentialité", url: CONFIDENTIALITE }, { title: "Gestion des cookies", url: `${COOKIES}#cookies` }] },
    "legal-bar": { title: "Informations légales", links: [{ title: "Mentions légales", url: MENTIONS }, { title: "Confidentialité", url: CONFIDENTIALITE }, { title: "Cookies", url: COOKIES }, { title: "Plan du site", url: PLAN }] },
  };
  const logo = ids["logo-aplat.png"] ? "ap-logo-aplat.png" : "", logoLight = ids["logo-aplat-clair.png"] ? "ap-logo-aplat-clair.png" : "";
  for (const g of Object.values(spec.groups)) for (const [sid, sec] of Object.entries(g.sections)) {
    if (sec.type === "announcement-bar") sec.disabled = true;
    if (sec.type === "ap-header") g.sections[sid] = section("ap-header", { logo_asset: logo, logo_width: 228, mobile_logo_width: 203, menu: "main-menu", mobile_menu: "mobile-menu", legal_menu: "footer", cta_label: "Demander un devis", cta_link: DEVIS, nav_parents: "prestations=platrerie,peinture,enduits-et-preparation;realisations=detail-chantier;conseils=quelles-photos-joindre", menu_bg_asset: asset("07_texture_enduit.webp"), menu_image_asset: asset("16_seau_bac_rouleau.webp"), menu_image_alt: "", menu_focus_x: 60, menu_focus_y: 50, menu_tagline: "Des espaces\nqui vous ressemblent.", bar_project_label: "Mon projet", bar_project_link: DEVIS, bar_contact_label: "Contact", bar_contact_link: CONTACT, bar_on_home: true, bar_pages: "prestations" });
    if (sec.type === "ap-footer") {
      const col = (title: string, menu: string, styles: string, show_on = "all", note = "") => ({ type: "column", settings: { title, menu, styles, show_on, note } });
      g.sections[sid] = section("ap-footer", { ...sec.settings, logo_asset: logo, logo_light_asset: logoLight, menu: "main-menu", legal_menu: "footer", legal_long_menu: "legal-long", legal_note: "À renseigner", bar_legal_menu: "legal-bar", cta_label: "Demander un devis", cta_link: DEVIS, style_home: "dark", style_default: "bar", style_404: "bar", dark_pages: "prestations", minimal_pages: "platrerie,peinture,realisations,detail-chantier", columns_pages: "notre-approche,faq,contact,devis", plaster_pages: "enduits-et-preparation,conseils,quelles-photos-joindre,confirmation", bar_pages: "mentions-legales,confidentialite,cookies,plan-du-site", minimal_tagline: "Des espaces qui vous ressemblent", columns_tagline: "Rénover\nEmbellir\nDurablement", columns_image_asset: asset("07_texture_enduit.webp"), plaster_tagline: "Des espaces\ndurables et\nharmonieux.", cookie_text: p("Nous utilisons des cookies pour assurer le bon fonctionnement du site et, avec votre accord, pour mesurer l'audience et intégrer des contenus externes."), cookie_privacy_link: CONFIDENTIALITE, cookie_policy_link: COOKIES }, [
        col("Navigation", "footer-navigation", "dark,plaster", "desktop"),
        col("Nos prestations", "footer-prestations", "dark", "desktop"),
        col("Informations", "footer", "dark", "desktop"),
        col("Prestations", "footer-prestations-m", "dark", "mobile"),
        col("Explorer", "footer-explorer", "dark", "mobile"),
        col("Informations", "footer", "dark", "mobile"),
        col("Navigation", "footer-navigation-2", "columns", "desktop"),
        col("Nos prestations", "footer-prestations-2", "columns", "desktop"),
        col("Liens utiles", "footer-liens", "columns", "desktop"),
        col("Nos prestations", "footer-prestations-3", "plaster", "desktop"),
        col("Informations", "footer-informations", "plaster", "desktop", "À renseigner"),
      ]);
    }
  }
  spec.name = "APLAT — thème APLAT (démonstration)";
  spec.meta = { ...spec.meta, demo: { isDemo: true, provenance: AP_PROVENANCE, contactTest: false } };
  spec.store.shopName = "APLAT";
  spec.store.seo = { title: "APLAT | Plâtrerie, préparation et peinture intérieure", description: "Cloisons, plafonds et doublages, enduits et préparation des supports, peinture intérieure. Marque et réalisations de démonstration." };
  spec.settings = { ...spec.settings, logo_asset: logo, fab_contact_link: "", fab_back_to_top: false, cookie_banner: false };
}
