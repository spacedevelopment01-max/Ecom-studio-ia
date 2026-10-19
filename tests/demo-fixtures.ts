/**
 * Projets de démonstration composés par le VRAI moteur du studio (composeShop) à partir du manifeste des quatre seules
 * démonstrations (public/demo/manifest.json) et de leurs visuels (kit privé, public/demo/<id>/, hors dépôt) :
 * FRAISE et ONDE (boutique spécialisée), ORBE (e-commerce), Atelier Rive (prestations de services). Chaque projet
 * reçoit l'identité de sa démonstration (nom, palette, accroche, offre) ; le thème de référence est composé avec ces
 * données, sans aucune donnée de démonstration inventée : ce qui manque reste « à compléter » (section masquée).
 *
 * Sert aux preuves de la mission E (aperçus statiques, captures, tests) ; jamais exposé au client comme une démo.
 */
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
import type { DirectionId } from "../src/lib/theme/directions";

export type DemoId = "fraise" | "onde" | "orbe" | "rive";
export const DEMO_PROVENANCE = "Issue #137 (19 octobre 2026) — démonstration du studio, identité du manifeste, visuels IA du kit privé sans personne, aucun paiement";

type ManifestDemo = { id: DemoId; brand: string; product: string; sector: string; category: string; direction: DirectionId; palette: string[]; photo: string; logo: string; images: { src: string; label: string }[]; business?: "products" | "services"; storeType?: "mono" | "multi" | "niche" };

/** Textes d'identité validés avec les démonstrations (accroche, résumé, offre) : les mêmes que les fixtures des lots 2B / 2C. */
type MediaPlan = Record<string, { role: string; variant?: string }>;
const IDENTITY: Record<DemoId, { tagline: string; summary: string; story: string; positioning: string; price: number | null; services?: ServiceProfile; variants?: { name: string; values: string[] }[]; facts?: { label: string; value: string }[]; media?: MediaPlan }> = {
  fraise: { tagline: "Le goût fraise qui fait sourire.", summary: "Gummies tendres au goût fraise dans un flacon refermable.", story: "Une marque de démonstration autour d'un flacon de gummies à la fraise.", positioning: "Un flacon de gummies à la fraise, à poser sur la table de la cuisine ou à glisser dans un sac.", price: 2490 },
  onde: { tagline: "Écoutez. Posez. Repartez.", summary: "Casque graphite et noir mat, touches vertes pour repérer les commandes.", story: "Une marque de démonstration autour d'un casque graphite et vert.", positioning: "Un casque pour écouter chez soi, dans le train ou au studio, avec des commandes repérables d'un coup d'œil.", price: 14900 },
  orbe: {
    tagline: "La lumière change de place. L'atmosphère aussi.", summary: "Lampe nomade à silhouette arrondie. Trois finitions : Dune, Argile et Charbon.", story: "Une silhouette arrondie, trois finitions et des ambiances à composer dans la maison.", positioning: "Une lampe à poser sur la table du dîner, le bureau ou la table de nuit : elle déplace l'ambiance avec elle.", price: 7900,
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
  rive: {
    tagline: "Des espaces qui vous ressemblent.", summary: "Aménagement et décoration intérieure : intentions, usages, lumière et matières.", story: "Une étude d'intention à partir de vos usages, de la lumière et des matières.", positioning: "Des intérieurs pensés pièce par pièce à partir de vos usages, de la lumière et des matières, pour la maison comme pour un petit espace professionnel.", price: null,
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
  if ((id === "fraise" || id === "onde") && !options.direction) {
    const c = await conversionProject(userId, id, path.join(process.cwd(), "public", "demo"), { testVideo: options.testVideo });
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
  const dir = path.join(process.cwd(), "public", "demo", id);
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
  return { pid, spec: built.spec, demo: d, missing, project: loadProject(pid), services };
}
