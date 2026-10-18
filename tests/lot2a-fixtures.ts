/** Données isolées des deux références. Médias autorisés déjà présents, aucune génération. */
import fs from "node:fs";
import path from "node:path";
import { seedHoldout } from "./lot1-holdout-fixtures";
import { emptyProduct, emptyServiceProfile } from "@/lib/project-types";
import { loadProject, saveProduct, saveServices, saveBrand, saveStrategy, saveCatalog, remember } from "@/lib/projects";
import { localBrand } from "@/lib/engine/local";
import { localCopy } from "@/lib/engine/local-copy";
import { saveAsset } from "@/lib/library";
import { composeShop } from "@/lib/engine/shop";
import { runContentEngineV2, saveUserEdit } from "@/lib/seo-v2/engine";
import { localOnlyDeps } from "@/lib/seo-v2/deps";

export async function referenceProject(userId: string, kind: "products" | "services", opts: { media?: boolean; multi?: boolean; writeServices?: boolean } = {}) {
  const services = kind === "services", pid = seedHoldout(userId, services ? 2 : 0, "Référence isolée");
  const product = { ...emptyProduct(), name: services ? "Création et entretien de jardins" : "Montre acier et cuir", nameStatus: "provided" as const, category: services ? "Aménagement extérieur" : "Montres", summary: services ? "Conception et création de jardins, terrasses en bois, murets en pierre sèche, plantations et entretien à l’année." : "Montre à boîtier en acier poli, cadran noir à trois compteurs argentés et bracelet en cuir brun surpiqué, doublé de tissu bleu.", price: { amount: services ? null : 12900, currency: "EUR", status: services ? "unknown" as const : "confirmed" as const }, facts: services ? [] : [{ key: "case", label: "Boîtier", value: "Acier poli", status: "confirmed" as const, source: "user" as const }, { key: "strap", label: "Bracelet", value: "Cuir brun surpiqué", status: "confirmed" as const, source: "user" as const }, { key: "dial", label: "Cadran", value: "Noir, compteurs argentés", status: "confirmed" as const, source: "user" as const }] };
  saveProduct(pid, product);
  const profile = { ...emptyServiceProfile(), area: "Aix-en-Provence et alentours", hours: "Du lundi au vendredi, de 8 h à 18 h", contactMode: "quote" as const, contactModes: ["quote" as const, "form" as const], services: [
    { key: "creation", name: "Création de jardin", description: "Dessiner les volumes, choisir les végétaux et organiser les cheminements. Un projet pensé pour votre terrain et votre façon de vivre dehors." },
    { key: "terrasse", name: "Terrasses et aménagements", description: "Bois, pierre sèche, jardinières et éclairage : composer des espaces où l’on aime s’installer, recevoir et circuler." },
    { key: "entretien", name: "Entretien à l’année", description: "Taille, tonte, désherbage et suivi des plantations. Accompagner le jardin au fil des saisons, selon ses besoins." },
  ] };
  if (services) saveServices(pid, profile);
  const identity = localBrand(product, services ? "Racines & Pierres" : "ARVEN", { business: kind, services: profile });
  const brand = { ...identity.brand, name: services ? "Racines & Pierres" : "ARVEN", direction: services ? "jardin" as const : "vitrine" as const, generatedBy: "local" as const, tagline: services ? "Des jardins à vivre." : "Le temps, bien porté.", positioning: services ? "Création et entretien de jardins" : "Montre acier et cuir", story: services ? "Un jardin se dessine à partir d’un lieu, d’usages et d’envies. Nous relions les matières et le végétal pour faire de l’extérieur un espace à vivre." : "Un boîtier d’acier, un bracelet de cuir et des détails que l’on découvre en prenant le temps. ARVEN explore le caractère de l’objet au quotidien.", values: services ? [{ title: "Partir de vos usages", text: "Circuler, s’asseoir, recevoir : le projet commence par votre façon d’habiter le jardin." }, { title: "Faire dialoguer les matières", text: "Bois, pierre et végétaux composent les volumes du projet." }, { title: "Accompagner les saisons", text: "L’entretien prolonge le travail de conception et de plantation." }] : [{ title: "L’acier et le cuir", text: "Le contraste d’un boîtier poli et d’un bracelet brun surpiqué." }, { title: "Le sens du détail", text: "Le cadran noir dialogue avec les compteurs argentés et la doublure bleue." }], palette: services ? { primary: "#3F6B4A", secondary: "#DCE6D2", accent: "#E89BA7", light: "#F7F8F1", dark: "#1D2E22" } : { primary: "#1E2225", secondary: "#E8DACF", accent: "#A86932", light: "#FAF7F5", dark: "#1E2225" } };
  saveBrand(pid, brand); saveStrategy(pid, identity.strategy);
  const media: { file: string; id: string; role: string; source: string }[] = [];
  const add = async (demo: string, file: string, role: string, meta: Record<string, unknown> = {}) => {
    if (opts.media === false) return null;
    const source = `public/demo/${demo}/${file}`;
    const a = await saveAsset({ projectId: pid, userId, data: fs.readFileSync(path.resolve(source)), mime: file.endsWith(".png") ? "image/png" : file.endsWith(".webp") ? "image/webp" : "image/jpeg", name: file, role, origin: "upload", status: "approved", meta: { ...meta, lot2a: { demo: true, source } } });
    media.push({ file, id: a.id, role, source }); return a.id;
  };
  if (services) {
    for (const file of ["banner-1.jpg", "scene-2.jpg", "scene-1.jpg", "photo.jpg"]) await add("paysagiste", file, "lifestyle");
    for (const [i, file] of ["scene-1.jpg", "scene-2.jpg", "banner-1.jpg"].entries()) await add("paysagiste", file, "original", { service: profile.services[i].name });
    await add("paysagiste", "logo.png", "logo");
  } else {
    await add("montre", "lifestyle-3.jpg", "scene"); await add("montre", "lifestyle-2.jpg", "detail");
    await add("montre", "lifestyle-1.jpg", "lifestyle"); await add("montre", "packshot-1.jpg", "packshot");
    await add("montre", "cutout-1.webp", "cutout"); await add("montre", "logo.png", "logo");
    if (opts.multi) {
      const cime = await add("gourde", "photo.jpg", "catalog-original"), sonore = await add("casque", "photo.jpg", "catalog-original");
      saveCatalog(pid, [{ key: "bottle", name: "Gourde Cime", category: "Gourdes", description: "Gourde en inox, bouchon bambou. Produit de démonstration distinct de la montre.", features: ["Contenance : 750 ml", "Inox et bambou"], price: 3490, compareAt: null, originalAssetId: cime }, { key: "audio", name: "Casque Sonore", category: "Audio", description: "Casque circum-auriculaire de démonstration.", features: ["Coques gris clair", "Coussinets rembourrés"], price: 8900, compareAt: null, originalAssetId: sonore }], "multi");
    }
  }
  const p = loadProject(pid), copy = localCopy(p.product, p.brand!, p);
  copy.announcement = [services ? "Démonstration — entreprise fictive, demandes de test uniquement." : "Démonstration — prix fictif, aucun paiement réel."];
  copy.hero = { ...copy.hero, heading: services ? "Des jardins qui donnent envie de rester." : "Le temps, bien porté.", text: services ? "Du premier échange aux plantations, un projet d’extérieur pensé pour votre terrain et votre façon de vivre dehors." : "L’acier poli, le cuir brun, un cadran que l’on aime regarder. Une montre qui se découvre dans les détails.", eyebrow: services ? "Création et entretien de jardins" : "Acier et cuir véritable." };
  copy.statement = { eyebrow: "", heading: services ? "Faire une place au vivant." : "Un objet, plusieurs regards.", text: services ? "Des feuillages, des matières et des circulations qui donnent son rythme à l’espace extérieur." : "Une lumière sur le boîtier, une couture sur le cuir, une touche de bleu. Le caractère d’ARVEN se lit de près." };
  copy.detail = { eyebrow: "", heading: services ? "Du bois, de la pierre, du végétal." : "Le caractère est dans le détail.", text: services ? "Une terrasse prolonge la maison. Un muret dessine une limite. Les plantations relient les espaces et accompagnent les saisons." : "Le boîtier en acier poli encadre un cadran noir à trois compteurs argentés. Le bracelet en cuir brun surpiqué révèle une doublure bleue." };
  copy.features = { heading: services ? "Un projet à votre mesure" : "La matière donne le ton.", items: services ? brand.values.map((v) => ({ ...v, icon: "leaf" as const })) : [{ title: "L’éclat de l’acier", text: "Un boîtier poli et une lunette graduée qui captent la lumière.", icon: "sparkle" }, { title: "La présence du cuir", text: "Un bracelet brun surpiqué, avec une doublure de tissu bleu.", icon: "hand" }, { title: "Un contraste affirmé", text: "Un cadran noir ponctué de compteurs argentés.", icon: "check" }] };
  copy.story = { heading: services ? "Du premier échange au jardin vivant." : "Regarder autrement.", steps: services ? [{ title: "Comprendre le lieu", text: "Échanger sur vos envies, observer les usages et les contraintes du terrain." }, { title: "Composer le projet", text: "Préciser les volumes, les matières, les végétaux et le périmètre du devis." }, { title: "Créer et accompagner", text: "Mettre en place les aménagements retenus puis organiser leur entretien." }] : [{ title: "La silhouette", text: "Le boîtier en acier et le bracelet dessinent la ligne de la montre." }, { title: "Les contrastes", text: "Acier poli, cuir brun et cadran noir composent son caractère." }] };
  copy.about = { ...copy.about, heading: services ? "Le jardin commence par vous." : "Le goût des choses que l’on garde.", intro: brand.story, values: brand.values, blocks: [{ heading: services ? "Habiter aussi l’extérieur." : "Une présence au quotidien.", text: services ? "Prendre le temps de comprendre un lieu, puis relier les gestes du quotidien aux aménagements du jardin." : "ARVEN est une marque de démonstration du studio. Les matières décrites correspondent aux visuels ; les dimensions et performances restent à préciser par le marchand." }] };
  copy.faq = { heading: services ? "Avant de nous rencontrer." : "Les réponses, simplement.", items: services ? [{ q: "Comment commencer un projet ?", a: "Décrivez le lieu, vos envies et les aménagements envisagés. Cet exemple utilise une demande de devis ; aucun professionnel réel n’est contacté." }, { q: "Peut-on demander uniquement de l’entretien ?", a: "Oui, l’entretien à l’année fait partie des prestations de cette entreprise fictive." }, { q: "Dans quelle zone intervenez-vous ?", a: "La zone indiquée pour cette démonstration est Aix-en-Provence et ses alentours." }] : [{ q: "Quelles matières sont présentées ?", a: "Le boîtier est en acier poli et le bracelet en cuir brun surpiqué, doublé de tissu bleu." }, { q: "Le prix affiché permet-il de commander ?", a: "Le prix de 129 € est fictif et sert uniquement à tester le parcours. Aucun paiement ni achat réel n’est possible dans cette démonstration." }, { q: "Quelles informations restent à confirmer ?", a: "Les dimensions, le mouvement, l’étanchéité et les conditions de livraison doivent être renseignés par le marchand avant toute publication." }] };
  copy.gallery = { heading: services ? "Des idées pour vos extérieurs." : "L’objet en situation.", captions: services ? ["Jardin de démonstration", "Terrasse de démonstration", "Matières et outils"] : ["Cuir et acier", "Le cadran", "La silhouette"] };
  copy.cta = { heading: services ? "Et si l’on parlait de votre jardin ?" : "Prenez le temps de la découvrir.", text: services ? "Un lieu, quelques envies, un premier échange pour préciser votre projet." : "Retrouvez les photographies et les informations de la montre sur sa fiche.", button: services ? "Demander un devis" : "Découvrir la montre" };
  copy.contact = { heading: services ? "Parlons de votre projet." : "Une question sur la montre ?", text: "Démonstration du studio : données de test uniquement. Aucun message n’est adressé à une entreprise réelle." };
  copy.footer = { about: services ? "Entreprise fictive de création et d’entretien de jardins. Illustrations de démonstration." : "ARVEN, marque de démonstration. Acier et cuir véritable.", newsletter: "Démonstration — aucune inscription réelle." };
  copy.product.tabs = [{ heading: "Les informations à confirmer", content_html: "<p>Dimensions, mouvement, étanchéité et conditions de vente à renseigner avant publication.</p>" }];
  remember(pid, { kind: "artifact", key: "shop_copy", value: JSON.stringify(copy), source: "user", status: "confirmed" });
  if (services && opts.writeServices !== false) for (const s of profile.services) {
    const r = await runContentEngineV2(null, pid, { type: "service_page", pageKey: `service:${s.key}`, lang: "fr" }, localOnlyDeps());
    if (!r.doc || !r.docKey) throw new Error("Document local de prestation non livré");
    saveUserEdit(pid, r.docKey, { ...r.doc, meta: { ...r.doc.meta, seoTitle: `${s.name} — Racines & Pierres`, metaDescription: s.description }, blocks: [{ id: "title", kind: "h1", text: s.name }, { id: "intro", kind: "p", text: s.description }, { id: "method", kind: "h2", text: "Un projet qui part de vos usages." }, { id: "method-body", kind: "p", text: "Nous commençons par préciser les envies, les usages et les contraintes du lieu. Le périmètre des travaux et les matériaux sont discutés avant l’établissement du devis." }, { id: "scope", kind: "h2", text: "Ce que nous préparons ensemble." }, { id: "scope-body", kind: "ul", items: ["Les espaces à aménager et leur utilisation.", "Les matières et les plantations à envisager.", "Le périmètre de la prestation et les informations nécessaires au devis."] }, { id: "end", kind: "p", text: "Entreprise fictive et illustration de démonstration. Aucun engagement commercial réel." }] });
  }
  const built = await composeShop(pid, services ? "jardin" : "vitrine", null, false);
  return { pid, spec: built.spec, media, copy, kind, project: loadProject(pid) };
}
