/**
 * Projets de démonstration composés par le VRAI moteur du studio (composeShop) à partir du manifeste des quatre seules
 * démonstrations (public/demo/manifest.json) et de leurs visuels (kit privé, public/demo/<id>/, hors dépôt) :
 * FRAISE et ONDE (boutique spécialisée), ORBE (e-commerce), Atelier Rive (prestations de services). Chaque projet
 * reçoit l'identité de sa démonstration (nom, palette, accroche, offre) ; le thème de référence est composé avec ces
 * données, sans aucune donnée de démonstration inventée : ce qui manque reste « à compléter » (section masquée).
 *
 * Sert aux preuves de la mission E (aperçus statiques, captures, tests) ; jamais exposé au client comme une démo.
 */
import { curateOrbe } from "./engine-demo-copy";
import { riveProject } from "./rive-fixtures";
import { curateFraise } from "./fraise-demo-copy";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { run, now } from "../src/lib/db";
import { emptyProduct, emptyServiceProfile, type ServiceProfile } from "../src/lib/project-types";
import { localBrand } from "../src/lib/engine/local";
import { composeShop } from "../src/lib/engine/shop";
import { loadProject, saveBrand, saveProduct, saveServices, saveStrategy, saveSettings } from "../src/lib/projects";
import { saveAsset } from "../src/lib/library";
import { seedHoldout } from "./lot1-holdout-fixtures";
import { conversionProject } from "./lot2c-fixtures";
import { sillonProject, SILLON_DIR, SILLON_MEDIA } from "./sillon-fixtures";
import { kitProject, kitDir, KIT_MEDIA } from "./noctil-traverse-fixtures";
import { shopKitProject, SHOP_KIT_MEDIA } from "./heuren-alcove-fixtures";
import { ondeProject } from "./onde-fixtures";
import { multiKitProject, MULTI_KIT_MEDIA } from "./museau-souple-fixtures";
import type { DirectionId } from "../src/lib/theme/directions";

export type DemoId = "fraise" | "onde" | "orbe" | "rive" | "sillon" | "noctil" | "traverse" | "heuren" | "alcove" | "museau-club" | "souple";
export const DEMO_PROVENANCE = "Issue #137 (19 octobre 2026) — démonstration du studio, identité du manifeste, visuels IA du kit privé sans personne, aucun paiement";

type ManifestDemo = { id: DemoId; brand: string; product: string; sector: string; category: string; direction: DirectionId; palette: string[]; photo: string; logo: string; images: { src: string; label: string }[]; business?: "products" | "services"; storeType?: "mono" | "multi" | "niche" };

/** Textes d'identité validés avec les démonstrations (accroche, résumé, offre) : les mêmes que les fixtures des lots 2B / 2C. */
type MediaPlan = Record<string, { role: string; variant?: string }>;
const IDENTITY: Record<DemoId, { tagline: string; summary: string; story: string; positioning: string; price: number | null; services?: ServiceProfile; variants?: { name: string; values: string[] }[]; facts?: { label: string; value: string }[]; media?: MediaPlan }> = {
  fraise: { tagline: "Le goût fraise qui fait sourire.", summary: "Gummies tendres au goût fraise dans un flacon refermable.", story: "Une marque de démonstration autour d'un flacon de gummies à la fraise.", positioning: "Un flacon de gummies à la fraise, à poser sur la table de la cuisine ou à glisser dans un sac.", price: 2490 },
  onde: { tagline: "Écoutez. Posez. Repartez.", summary: "Casque graphite et noir mat, touches vertes pour repérer les commandes.", story: "Une marque de démonstration autour d'un casque graphite et vert.", positioning: "Un casque pour écouter chez soi, dans le train ou au studio, avec des commandes repérables d'un coup d'œil.", price: 14900 },
  orbe: {
    tagline: "Une lumière à vous, même en location.", summary: "Lampe nomade à silhouette arrondie. Trois finitions : Dune, Argile et Charbon.", story: "Une lampe à poser, sans travaux, pour se sentir chez soi dans un appartement loué.", positioning: "Une lampe à poser sur la table du dîner, le bureau ou la table de nuit : elle déplace l'ambiance avec elle.", price: 7900,
    // Ce que le kit montre réellement : trois finitions (une image par finition), une silhouette. Aucune donnée technique inventée.
    variants: [{ name: "Finition", values: ["Dune", "Argile", "Charbon"] }],
    facts: [{ label: "Finitions", value: "Dune, Argile et Charbon" }, { label: "Silhouette", value: "Abat-jour arrondi sur pied fin, socle rond" }],
    // Plan de médias (retour du 19 octobre, 13 h 40) : un rôle précis par visuel, le dernier importé d'un rôle devient le
    // premier emplacement du thème. Ordinateur : ouverture = dîner (horizontale, lampe allumée au centre) ; téléphone :
    // ouverture = lampe allumée (verticale, lampe entière). Finitions : trois packshots. Scène : bureau. Usages : chambre
    // et lecture. Les trois finitions ensemble (07-trio) : galerie de la fiche seulement.
    media: {
      // Packshots par finition ; Dune en dernier : le packshot le plus récent devient la vue par défaut du thème.
      "orbe-09-charbon.webp": { role: "packshot", variant: "Charbon" }, "orbe-10-argile.webp": { role: "packshot", variant: "Argile" }, "orbe-01-dune.webp": { role: "packshot", variant: "Dune" },
      "orbe-07-trio.webp": { role: "detail" },
      // En situation : la verticale d'abord, l'horizontale ensuite (la plus récente horizontale ouvre sur ordinateur, la verticale sur téléphone).
      "orbe-08-lumiere.webp": { role: "lifestyle" }, "orbe-03-diner.webp": { role: "lifestyle" },
      "orbe-02-chambre.webp": { role: "scene" }, "orbe-04-lecture.webp": { role: "scene" }, "orbe-05-bureau.webp": { role: "scene" },
      // Non importés : 06-duo (chambre vue de loin : les lampes y sont à peine visibles — le défaut signalé), 11-boite et
      // 12-pochette (emballage : rien à affirmer sur la livraison).
    },
  },
  sillon: {
    tagline: "L'espresso qui vous suit.", summary: "Machine à espresso nomade : corps cylindrique brun mat, bague et bouton de teinte cuivrée, l'espresso coule directement dans le verre placé dessous.", story: "SILLON part d'une idée simple : emporter le geste du café comme on emporte un livre.", positioning: "Une machine à espresso nomade pour le bureau, le voyage et les tables du dehors.", price: null,
    facts: [{ label: "Finition", value: "corps brun mat, bague et bouton de teinte cuivrée" }, { label: "Service", value: "l'espresso coule directement dans le verre placé dessous" }],
    media: Object.fromEntries(SILLON_MEDIA.filter((m) => m.role !== "logo").map((m) => [m.file, { role: m.role }])),
  },
  // NOCTIL et TRAVERSE (issue #152) : identité utilisée seulement pour la preuve d'adaptation dans un autre thème.
  noctil: {
    tagline: "La nuit, à portée de plafond.", summary: "Projecteur de galaxies : sphère indigo mate tenue par un arceau, objectif rond à l'avant, socle rond avec un bouton éclairé de violet.", story: "NOCTIL est né d'une envie simple : garder un morceau de ciel nocturne à la maison.", positioning: "Un projecteur de galaxies pour le salon, la chambre et les coins où l'on aime éteindre la grande lumière.", price: null,
    media: Object.fromEntries(KIT_MEDIA.noctil.filter((m) => m.role !== "logo").map((m) => [m.file, { role: m.role }])),
  },
  traverse: {
    tagline: "Un sac, trois temps du voyage.", summary: "Sac à dos de voyage vert olive : grande poche frontale zippée, sangles latérales à boucle noire, poignée sur le dessus, bretelles noires.", story: "TRAVERSE suit la même personne du bureau du matin au quai de départ, puis jusqu'à la destination.", positioning: "Un sac de voyage pour le quotidien, le départ et la destination.", price: null,
    media: Object.fromEntries(KIT_MEDIA.traverse.filter((m) => m.role !== "logo").map((m) => [m.file, { role: m.role }])),
  },
  // HEUREN et ALCÔVE (issue #155, e-commerce mono-produit) : identité utilisée seulement pour la preuve d'adaptation.
  heuren: {
    tagline: "L'heure bleue, au poignet.", summary: "Montre à cadran bleu nuit soleillé, index et aiguilles argentés, boîtier argenté, bracelet en cuir bleu nuit cousu de bleu et doublé de beige.", story: "HEUREN est née d'un bleu : celui du ciel juste après le coucher du soleil.", positioning: "Une montre au cadran bleu nuit pour le bureau, le soir et le voyage.", price: null,
    media: Object.fromEntries(SHOP_KIT_MEDIA.heuren.filter((m) => m.role !== "logo").map((m) => [m.file, { role: m.role }])),
  },
  alcove: {
    tagline: "Une alcôve à soi.", summary: "Fauteuil enveloppant au tissu terracotta texturé : dossier et accoudoirs arrondis, coussin d'assise épais, quatre pieds courts en bois brun.", story: "ALCÔVE est né d'une envie simple : un fauteuil sans angle, dans la couleur chaude de la terre cuite.", positioning: "Un fauteuil enveloppant pour le salon, le coin lecture et la chambre.", price: null,
    media: Object.fromEntries(SHOP_KIT_MEDIA.alcove.filter((m) => m.role !== "logo").map((m) => [m.file, { role: m.role }])),
  },
  // MUSEAU CLUB (issue #158, e-commerce de quatre produits) : identité utilisée seulement pour la preuve d'adaptation.
  "museau-club": {
    tagline: "Tout le matériel de balade, en bleu cobalt.", summary: "Collection de balade pour chiens en bleu cobalt : un harnais, une laisse, un collier et une pochette à sacs assortis, avec maille crème, boucles noires, anneaux et mousquetons argentés.", story: "MUSEAU CLUB est né d'une idée simple : une seule couleur pour toute la balade, du harnais à la pochette.", positioning: "Une collection coordonnée pour promener son chien : harnais, laisse, collier et pochette à sacs.", price: null,
    media: Object.fromEntries(MULTI_KIT_MEDIA["museau-club"].filter((m) => m.role !== "logo").map((m) => [m.file, { role: m.role }])),
  },
  // SOUPLE (issue #158, e-commerce de quatre produits) : identité utilisée seulement pour la preuve d'adaptation.
  souple: {
    tagline: "Toute la journée, on compte sur vous. Ce moment est à vous.", summary: "Collection de yoga et de Pilates en rose poudré, prune et liège : un tapis rose poudré au dessous prune, une brique couleur liège, une sangle prune à deux anneaux argentés et un anneau de Pilates prune à poignées rose mauve.", story: "SOUPLE est né pour celles qui passent leurs journées à répondre aux autres : quatre pièces assorties pour installer chez soi un moment qui leur appartient.", positioning: "Un coin yoga et Pilates à soi, à la maison : tapis, brique, sangle et anneau, à réunir à son rythme.", price: null,
    media: Object.fromEntries(MULTI_KIT_MEDIA.souple.filter((m) => m.role !== "logo").map((m) => [m.file, { role: m.role }])),
  },
  rive: {
    tagline: "Un intérieur à votre façon de vivre.", summary: "Aménagement et décoration intérieure : intentions, usages, lumière et matières.", story: "Une étude d'intention à partir de vos usages, de la lumière et des matières.", positioning: "Des intérieurs pensés pièce par pièce à partir de vos usages, de la lumière et des matières, pour la maison comme pour un petit espace professionnel.", price: null,
    services: {
      ...emptyServiceProfile(),
      services: [
        { key: "conseil", name: "Conseil & direction", description: "Préciser l'ambiance et les choix qui donneront une direction à votre intérieur." },
        { key: "piece", name: "Aménagement d'une pièce", description: "Organiser les usages, la circulation et les matières à l'échelle d'une pièce." },
        { key: "ensemble", name: "Projet d'ensemble", description: "Relier plusieurs espaces autour d'une intention commune." },
      ],
      contactMode: "form", contactModes: ["form"],
    },
    // Photos du client (rôle « photo » d'un site de services) : le moteur les range dans l'ordre d'import, la dernière
    // importée ouvre le site. Un rôle par photo : ouverture (salon), réalisations (cuisine, bibliothèque, matières, repas),
    // méthode (plans), scène « chez vous » (chambre, verticale) ; les cinq autres restent jointes sans emplacement.
    media: {
      "rive-12-escalier.webp": { role: "lifestyle" }, "rive-10-menuiserie.webp": { role: "lifestyle" }, "rive-09-volume.webp": { role: "lifestyle" }, "rive-05-salle-eau.webp": { role: "lifestyle" }, "rive-04-entree.webp": { role: "lifestyle" },
      "rive-07-matieres.webp": { role: "lifestyle" }, "rive-03-chambre.webp": { role: "lifestyle" }, "rive-11-repas.webp": { role: "lifestyle" }, "rive-06-bibliotheque.webp": { role: "lifestyle" }, "rive-08-plans.webp": { role: "lifestyle" }, "rive-02-cuisine.webp": { role: "lifestyle" }, "rive-01-salon.webp": { role: "lifestyle" },
    },
  },
};

export function demoManifest(id: DemoId): ManifestDemo {
  const list = JSON.parse(fs.readFileSync(path.join(process.cwd(), "public", "demo", "manifest.json"), "utf8")).demos as ManifestDemo[];
  const d = list.find((x) => x.id === id);
  if (!d) throw new Error(`Démonstration inconnue : ${id}`);
  return d;
}

const roleOf = (label: string) => (/packshot|fond blanc/i.test(label) ? "packshot" : /détail|detail/i.test(label) ? "detail" : /bannière|banner/i.test(label) ? "banner" : "scene");

/**
 * Crée le projet de la démonstration, importe ses visuels comme assets du projet (rôles d'après le manifeste), compose
 * le thème de référence avec le vrai moteur et renvoie le thème composé. `direction` permet de composer la même
 * identité dans un autre thème (preuve d'adaptation).
 */
export async function demoProject(userId: string, id: DemoId, options: { direction?: DirectionId; testVideo?: string } = {}) {
  const d = demoManifest(id), ident = IDENTITY[id];
  // FRAISE et ONDE dans leur propre thème : la composition complète validée du lot 2C (références Lumora et Pawish :
  // accueil et fiche riches, offres, avis fictifs étiquetés, comparatif, garantie en exemple, stories, FAQ, pages, menus),
  // avec le kit du dossier public/demo/<id>/. Le parcours « thème du catalogue » (ci-dessous) masque toute section sans
  // contenu : composées ainsi, ces deux démonstrations se réduisaient à quelques blocs (retour de Thomas, 19 octobre, 15 h 07).
  // Il ne sert plus, pour elles, qu'à la preuve d'adaptation d'une identité dans l'autre thème (`direction`).
  // SILLON (issue #148) : projet client composé par le moteur dans le thème « sillon », puis rédigé pour la démonstration
  // (mêmes sections, même ordre) avec les médias fournis par Thomas (public/theme-assets/sillon/, suivis dans le dépôt).
  if (id === "sillon" && !options.direction) {
    const c = await sillonProject(userId);
    return { pid: c.pid, spec: c.spec, demo: d, missing: c.missing, project: loadProject(c.pid), services: false };
  }
  // NOCTIL et TRAVERSE (issue #152) : même parcours que SILLON, kits suivis dans public/theme-assets/<id>/.
  if ((id === "noctil" || id === "traverse") && !options.direction) {
    const c = await kitProject(userId, id);
    return { pid: c.pid, spec: c.spec, demo: d, missing: c.missing, project: loadProject(c.pid), services: false };
  }
  // HEUREN et ALCÔVE (issue #155) : même parcours, famille E-commerce, kits suivis dans public/theme-assets/<id>/.
  if ((id === "heuren" || id === "alcove") && !options.direction) {
    const c = await shopKitProject(userId, id);
    return { pid: c.pid, spec: c.spec, demo: d, missing: c.missing, project: loadProject(c.pid), services: false };
  }
  // MUSEAU CLUB (issue #158) : même parcours, famille E-commerce, quatre produits, kit suivi dans public/theme-assets/<id>/.
  if ((id === "museau-club" || id === "souple") && !options.direction) {
    const c = await multiKitProject(userId, id);
    return { pid: c.pid, spec: c.spec, demo: d, missing: c.missing, project: loadProject(c.pid), services: false };
  }
  // Atelier Rive (dossier du 23 octobre) : projet de services rédigé d'après les maquettes, médias suivis dans
  // public/theme-assets/rive/.
  if (id === "rive" && !options.direction) {
    const c = await riveProject(userId);
    // Palette de la démonstration refaite (prune) ; le manifeste garde l'ancienne, lue par l'accueil du studio (non modifié).
    return { pid: c.pid, spec: c.spec, demo: { ...d, palette: ["#37152C", "#F4F1F2", "#37152C", "#FFFFFF", "#1E1A1D"] }, missing: c.missing, project: loadProject(c.pid), services: true };
  }
  // ONDE (refonte E-commerce, issue #158) : même parcours que HEUREN et ALCÔVE, visuels lus dans le kit privé.
  if (id === "onde" && !options.direction) {
    const c = await ondeProject(userId);
    return { pid: c.pid, spec: c.spec, demo: d, missing: c.missing, project: loadProject(c.pid), services: false };
  }
  if (id === "fraise" && !options.direction) {
    const c = await conversionProject(userId, id, path.join(process.cwd(), "public", "demo"), { testVideo: options.testVideo });
    // Rédaction (consigne du 21 octobre, 19 h 50) : mêmes sections, textes vrais (ni avis, ni remise, ni garantie inventés).
    curateFraise(c.spec);
    // Le projet lui-même suit la même décision (vitamines fictives) : nom, catégorie et marque cohérents avec la vitrine,
    // pour que les sections ajoutées ensuite par le studio reprennent le bon produit.
    { const pr = loadProject(c.pid); if (pr.product) saveProduct(c.pid, { ...pr.product, name: "Gummies vitaminés goût fraise", category: "Vitamines en gummies (produit fictif)", summary: "Vitamines C, D3, B6 et B12 en gummies goût fraise, deux par jour. Produit et composition fictifs de démonstration." });
      if (pr.brand) saveBrand(c.pid, { ...pr.brand, tagline: "Vos vitamines ont le goût de fraise.", story: "Une marque fictive de démonstration : des vitamines en gummies goût fraise, pour une routine qu'on a envie de garder." }); }
    run("UPDATE projects SET store_type = ?, business_type = ?, updated_at = ? WHERE id = ?", d.storeType ?? "mono", "products", now(), c.pid);
    saveSettings(c.pid, { ...loadProject(c.pid).settings, storeKind: d.category as "services" | "catalog" | "specialty" });
    return { pid: c.pid, spec: c.spec, demo: d, missing: c.missing, project: loadProject(c.pid), services: false };
  }
  const services = d.business === "services";
  const pid = seedHoldout(userId, services ? 2 : 0, `Démo ${d.brand}`);
  const product = { ...emptyProduct(), name: d.product, nameStatus: "provided" as const, category: d.sector, sector: (services ? "services" : "maison") as never, summary: ident.summary, facts: (ident.facts ?? []).map((f) => ({ key: f.label.toLowerCase(), label: f.label, value: f.value, status: "confirmed" as const, source: "user" as const })), variants: ident.variants ?? [] };
  if (ident.price != null) product.price = { ...product.price, amount: ident.price, currency: "EUR", status: "confirmed" };
  saveProduct(pid, product);
  const local = localBrand(product, d.brand, { business: services ? "services" : "products", services: ident.services });
  const [primary, secondary, accent, light, dark] = d.palette;
  saveBrand(pid, { ...local.brand, name: d.brand, generatedBy: "local" as const, tagline: ident.tagline, story: ident.story, positioning: ident.positioning, palette: { primary, secondary, accent, light, dark }, direction: options.direction ?? d.direction });
  saveStrategy(pid, local.strategy);
  if (ident.services) saveServices(pid, ident.services);
  run("UPDATE projects SET store_type = ?, business_type = ?, updated_at = ? WHERE id = ?", d.storeType ?? "mono", services ? "services" : "products", now(), pid);
  saveSettings(pid, { ...loadProject(pid).settings, storeKind: d.category as "services" | "catalog" | "specialty" });
  // Visuels : ceux du manifeste d'abord (rôle d'après l'étiquette), puis les autres images du dossier (scènes).
  const dir = id === "sillon" ? SILLON_DIR : id === "noctil" || id === "traverse" || id === "heuren" || id === "alcove" || id === "museau-club" || id === "souple" ? kitDir(id) : path.join(process.cwd(), "public", "demo", id);
  const missing: string[] = [];
  const imported = new Set<string>();
  const put = async (file: string, role: string, extra: Record<string, unknown> = {}) => {
    const source = path.join(dir, file);
    if (imported.has(file)) return;
    if (!fs.existsSync(source)) { missing.push(file); return; }
    const bytes = fs.readFileSync(source), meta = await sharp(bytes).metadata();
    if (!meta.width || !meta.height || (role !== "logo" && meta.width < 400)) { missing.push(file); return; }
    await saveAsset({ projectId: pid, userId, data: bytes, mime: meta.format === "jpeg" ? "image/jpeg" : `image/${meta.format}`, name: `${id}-${file}`, origin: "upload", role, status: "approved", meta: { demo: { isDemo: true, provenance: DEMO_PROVENANCE }, width: meta.width, height: meta.height, ...extra } });
    imported.add(file);
  };
  // Plan de médias explicite (rôle et variante par fichier) quand la démonstration en a un : rien n'est déduit du nom.
  if (ident.media) for (const [file, m] of Object.entries(ident.media)) await put(file, m.role, m.variant ? { variant: m.variant } : {});
  // Logo : proposition du kit (non validée, étiquetée comme telle), pour l'en-tête, le pied de page et le favicon.
  if (d.logo) {
    await put(path.basename(d.logo), "logo");
    // Favicon dérivé du logo (carré 180 px, fond transparent), comme le fait le parcours « logo » du studio.
    const source = path.join(dir, path.basename(d.logo));
    if (fs.existsSync(source)) { const png = await sharp(source).resize(180, 180, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(); await saveAsset({ projectId: pid, userId, data: png, mime: "image/png", name: `${id}-favicon-180.png`, origin: "upload", role: "favicon", status: "approved", meta: { demo: { isDemo: true, provenance: DEMO_PROVENANCE }, width: 180, height: 180 } }); }
  }
  if (!ident.media) {
    if (d.photo) await put(path.basename(d.photo), "lifestyle");
    for (const im of d.images) await put(path.basename(im.src), roleOf(im.label));
  }
  if (fs.existsSync(dir) && !ident.media) for (const f of fs.readdirSync(dir).filter((x) => /\.(webp|jpg|png)$/i.test(x) && !imported.has(x) && !/^(boutique|site|fiche)-|logo/.test(x)).sort()) await put(f, "scene");
  const built = await composeShop(pid, options.direction ?? d.direction, null, false);
  // Rédaction propre aux démonstrations ORBE et Atelier Rive (revue du 21 octobre) : textes écrits pour leur cible,
  // champs inconnus masqués ; la composition du moteur ne change pas.
  if (!options.direction && id === "orbe") curateOrbe(built.spec);
  return { pid, spec: built.spec, demo: d, missing, project: loadProject(pid), services };
}
