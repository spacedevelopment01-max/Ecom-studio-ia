/**
 * Rédaction de la démonstration FRAISE (consigne de Thomas du 21 octobre, 19 h 50). La composition validée de la
 * référence Lumora (lot 2C, `conversionProject`) ne change pas : mêmes sections, même ordre, aucune masquée sur l'accueil
 * et la fiche (garde-fou : tests/demos-fraise-onde-composition.test.ts). Seuls les textes changent.
 *
 * Ce qui disparaît : les avis et notes fictifs (même étiquetés), la remise « −29 % » sur un prix de référence inventé,
 * la garantie « 30 jours » et la livraison offerte « en exemple », le comparatif contre une confiserie imaginaire, la
 * « protection des expéditions », les « [À compléter] » publics. Ce qui reste vrai : le produit (gummies à la fraise),
 * ce que montrent les visuels (flacon transparent, couvercle rouge, « 60 douceurs » écrit sur l'étiquette), les trois
 * offres et leurs prix de démonstration, le paiement désactivé.
 *
 * ─── FRAISE — fiche de stratégie (hypothèse éditoriale, pas une étude) ─────────────────────────────────────────────────
 *  1. cible : une famille ou une bande d'amis qui grignote à plusieurs (goûter, pique-nique, table de fête) ;
 *  2. tension, dans leurs mots : « Les sachets se déchirent et traînent entamés au fond du placard ou du sac. » ;
 *  3. désir : une douceur qu'on pose au milieu et qu'on partage — angle unique : le flacon qui fait le tour de la table ;
 *  4. promesse tenable : un flacon transparent qu'on ouvre, qu'on fait passer et qu'on referme ; faits = visuels,
 *     étiquette, offres. Texture, ingrédients, allergènes, conservation, délais et retours jamais affirmés ; aucune
 *     allégation de santé ;
 *  5. objections : quelle offre choisir, le flacon se referme-t-il, ingrédients et allergènes (non renseignés), ce que
 *     permet la démonstration ;
 *  6. parcours : se reconnaître (le flacon qui circule) → ce que l'on voit → le geste ouvrir / servir / refermer →
 *     choisir son offre → les moments où il sort → questions → être prévenu.
 */
import type { ThemeSpec, SectionInstance } from "../src/lib/theme/spec";
import { p, faq, hidePendingBlocks, PENDING, type Faq } from "./engine-demo-copy";

const PRODUCT = "/products/gummies-fraise";
const DEMO_INFO: Faq = ["Que puis-je faire dans cette boutique de démonstration ?", "Choisir une offre, remplir le panier et parcourir les pages. Le paiement est désactivé : aucune commande n'est encaissée ni expédiée. Délais de livraison, conditions de retour et ingrédients ne sont pas encore renseignés."];
export const FRAISE_FAQ: Faq[] = [
  ["Quelle offre choisir ?", "Un flacon pour goûter ; 2 + 1 offert (trois flacons, 49,80 €) pour en garder un à la maison et un dans le sac ; 3 + 2 offerts (cinq flacons, 74,70 €) pour les goûters de la semaine et une table de fête. Prix de démonstration."],
  ["Le flacon se referme-t-il ?", "Oui : un couvercle large, qu'on retire pour servir et qu'on remet aussitôt. Le flacon reste sur la table ou repart dans le sac."],
  ["Combien de gummies dans un flacon ?", "L'étiquette indique 60 douceurs."],
  ["Quels sont les ingrédients et les allergènes ?", "Ils ne sont pas renseignés dans cette démonstration. Une vraie boutique doit les afficher sur la fiche avant toute vente."],
  ["Puis-je modifier mon panier ?", "Oui : changez les quantités ou retirez une ligne, le total se met à jour aussitôt."],
  DEMO_INFO,
];
const FRAISE_FAQ_SHORT: Faq[] = [FRAISE_FAQ[0], FRAISE_FAQ[1], FRAISE_FAQ[3], DEMO_INFO];
const FRAISE_PENDING: Faq[] = [
  ["Quels moyens de paiement acceptez-vous ?", "[À compléter : moyens de paiement réellement activés.]"],
  ["Combien de temps prend la livraison ?", "[À compléter : délais réels.]"],
  ["Quelle est votre politique de retour ?", "[À compléter : conditions de retour réelles.]"],
  ["Comment vous contacter ?", "[À compléter : adresse e-mail du service client.]"],
];
const MARQUEE = "Goût fraise\nFlacon transparent\nCouvercle qui se referme\n60 douceurs sur l'étiquette";

const sec = (spec: ThemeSpec, key: string, id: string) => spec.templates[key]?.sections[id];
function put(s: SectionInstance | undefined, settings: Record<string, unknown>) { if (s) s.settings = { ...s.settings, ...settings }; return s; }
function setBlocks(s: SectionInstance | undefined, list: { type: string; settings: Record<string, unknown> }[]) {
  if (!s) return;
  s.blocks = Object.fromEntries(list.map((b, i) => [`b${i}`, b]));
  s.block_order = list.map((_, i) => `b${i}`);
}

/** Avis : aucun avis inventé. La section garde sa place (composition) et dit honnêtement ce qu'elle affichera. */
function reviews(s: SectionInstance | undefined) {
  put(s, { heading: "Les avis de vos clients", heading_accent: "à venir", rating_text: "", rating_percent: 0, text: p("Cette boutique de démonstration n'a pas encore de clients, donc pas d'avis. Avec une application d'avis, ceux de vos acheteurs prendront cette place, sans rien inventer.") });
  setBlocks(s, []);
}
/** Ancienne garantie « 30 jours en exemple » : remplacée par ce qui est vrai avant de commander. */
function beforeOrder(s: SectionInstance | undefined) {
  put(s, { heading: "avant de commander", heading_accent: "Bon à savoir", text: p("Les prix et les offres sont ceux de la démonstration. Livraison et retours seront précisés par la marque ; ils ne sont pas inventés ici."), demo_note: "", button_label: "Choisir mon offre", button_link: PRODUCT });
  setBlocks(s, ["Paiement désactivé : rien n'est encaissé", "Aucune commande n'est expédiée", "Conditions de retour à définir par la marque"].map((text) => ({ type: "check", settings: { text } })));
}
function stories(s: SectionInstance | undefined) {
  put(s, { heading: "Trois moments", heading_accent: "où il circule", text: p("Trois moments où le flacon passe de main en main.") });
  const t = [["Le goûter dans la cuisine", "Posé sur le plan de travail, ouvert pour tout le monde"], ["Pique-nique au jardin", "Sur la nappe, entre les fraises"], ["La table de fête", "Au milieu des coupes, avant le dessert"]];
  (s?.block_order ?? []).forEach((id, i) => { const b = s!.blocks![id]; if (t[i]) b.settings = { ...b.settings, title: String(b.settings.title).includes("clip de test") ? `${t[i][0]} (clip de test)` : t[i][0], subtitle: t[i][1], link_label: "Choisir mon offre" }; });
}
function craving(s: SectionInstance | undefined) {
  put(s, { heading: "Ce que l'on voit", heading_accent: "dans le flacon", text: p("Vu de dessus, le flacon ouvert : des gummies rouges à la fraise, bien visibles à travers le verre. On sait d'un coup d'œil ce qu'il reste."), button_label: "Choisir mon offre", guarantee_text: "" });
}
function icons(s: SectionInstance | undefined) {
  put(s, { heading: "Quatre détails", heading_accent: "qui se voient" });
  setBlocks(s, [["leaf", "Goût fraise", "Des gummies rouges au goût de fraise, comme leur nom l'indique."], ["sparkle", "Flacon transparent", "On voit ce qu'il reste sans l'ouvrir."], ["drop", "Couvercle large", "Il se retire d'une main pour servir et se remet aussitôt."], ["heart", "60 douceurs", "C'est ce qu'indique l'étiquette du flacon."]].map(([icon, title, text]) => ({ type: "feature", settings: { icon, title, text: p(text) } })));
}
function cause(s: SectionInstance | undefined) {
  put(s, { heading: "Ouvert, servi,", heading_accent: "refermé", text: p("On retire le couvercle, on fait passer le flacon autour de la table, on le referme. Il ne reste pas de sachet déchiré au fond du placard ni de miettes dans le sac."), button_label: "Choisir mon offre", guarantee_text: "" });
  setBlocks(s, ["Couvercle large", "Flacon transparent", "Se partage"].map((text) => ({ type: "pill", settings: { text } })));
}
function compare(s: SectionInstance | undefined) {
  put(s, { eyebrow: "Les offres", heading: "Un flacon,", heading_accent: "trois ou cinq ?", text: p("Les trois offres côte à côte, pour choisir selon le nombre de personnes autour de la table."), criteria_label: "", badge: "Pour partager", note: "Prix de démonstration.", button_label: "Choisir mon offre", button_link: PRODUCT });
  setBlocks(s, [
    { type: "column", settings: { label: "1 flacon", highlight: false } },
    { type: "column", settings: { label: "2 + 1 offert", highlight: true } },
    { type: "column", settings: { label: "3 + 2 offerts", highlight: false } },
    ...[["Flacons reçus", "1", "3", "5"], ["Prix total", "24,90 €", "49,80 €", "74,70 €"], ["Prix par flacon", "24,90 €", "16,60 €", "14,94 €"], ["Pour", "goûter", "partager", "la semaine"]].map(([label, v1, v2, v3]) => ({ type: "row", settings: { label, v1, v2, v3 } })),
  ]);
}
function stats(s: SectionInstance | undefined) {
  put(s, { heading: "En quelques", heading_accent: "repères", text: "", source: "D'après l'étiquette du flacon et les offres de la démonstration." });
  setBlocks(s, [["60", "douceurs par flacon, selon l'étiquette"], ["1", "goût : la fraise"], ["3", "offres : 1, 3 ou 5 flacons"], ["2", "flacons offerts dans le lot de cinq"]].map(([value, label]) => ({ type: "stat", settings: { value, label } })));
}
function newsletter(s: SectionInstance | undefined) {
  put(s, { heading: "Être prévenu à l'ouverture", text: p("Un e-mail quand la boutique ouvre. Rien d'autre."), button_label: "Me prévenir", legal: "Désinscription en un clic." });
}
function faqSection(s: SectionInstance | undefined, heading: string, items: Faq[]) {
  put(s, { heading, text: "" });
  faq(s, items, FRAISE_PENDING);
}

export function curateFraise(spec: ThemeSpec) {
  // ── Accueil ──
  put(sec(spec, "index", "hero"), { heading: "Le flacon de fraise", heading_accent: "qui fait le tour de la table", text: p("Des gummies à la fraise dans un flacon transparent : on l'ouvre au goûter, on le fait passer, on remet le couvercle."), rating_text: "", guarantee_text: "", button_label: "Choisir mon offre" });
  setBlocks(sec(spec, "index", "hero"), ["Goût fraise", "Flacon transparent", "Couvercle qui se referme"].map((text) => ({ type: "check", settings: { text } })));
  for (const id of ["trust", "trust2"]) put(sec(spec, "index", id), { items: MARQUEE });
  reviews(sec(spec, "index", "reviews"));
  craving(sec(spec, "index", "craving"));
  icons(sec(spec, "index", "icons"));
  cause(sec(spec, "index", "cause"));
  faqSection(sec(spec, "index", "formula"), "Avant de goûter", FRAISE_FAQ_SHORT);
  compare(sec(spec, "index", "compare"));
  stats(sec(spec, "index", "proof"));
  beforeOrder(sec(spec, "index", "guarantee"));
  stories(sec(spec, "index", "stories"));
  faqSection(sec(spec, "index", "faq"), "Questions fréquentes", FRAISE_FAQ);
  newsletter(sec(spec, "index", "newsletter"));

  // ── Fiche ──
  spec.store.product = { ...spec.store.product, description_html: p("Des gummies au goût de fraise dans un flacon transparent à couvercle large. L'étiquette indique 60 douceurs. On le pose au milieu de la table, on le fait passer, on le referme."), compare_at_price: null, seo: { title: "Gummies à la fraise : le flacon à partager | Fraise", description: "Des gummies à la fraise dans un flacon transparent qui se referme : 1, 3 ou 5 flacons. Boutique de démonstration, paiement désactivé." } };
  const main = sec(spec, "product", "main");
  for (const b of Object.values(main?.blocks ?? {})) {
    if (b.type === "eyebrow") b.settings = { ...b.settings, text: "Gummies à la fraise · flacon à partager" };
    if (b.type === "text") b.settings = { ...b.settings, text: p("Un flacon transparent qu'on ouvre au goûter, qu'on fait passer et qu'on referme. Choisissez une offre : prix de démonstration, paiement désactivé.") };
    if (b.type === "quantity_offer" && b.settings.badge === "Meilleure offre") b.settings = { ...b.settings, badge: "Prix par flacon le plus bas" };
    if (b.type === "quantity_offer" && b.settings.badge === "Notre sélection") b.settings = { ...b.settings, badge: "Pour partager" };
    if (b.type === "purchase_benefit") {
      const map: Record<string, string> = { "Texture tendre": "Couvercle qui se referme", "Flacon refermable": "60 douceurs par flacon", "Prix de démonstration": "Prix de démonstration" };
      if (map[String(b.settings.title)]) b.settings = { ...b.settings, title: map[String(b.settings.title)] };
    }
    if (b.type === "reassurance") b.settings = { ...b.settings, item1: "Paiement désactivé : aucune commande encaissée", item2: "Livraison et retours : à définir par la marque", item3: "Visuels de démonstration" };
    if (b.type === "collapsible" && b.settings.heading === "Description") b.settings = { ...b.settings, content: spec.store.product.description_html };
    if (b.type === "collapsible" && b.settings.heading === "Comment les déguster") b.settings = { ...b.settings, heading: "Comment le servir", content: p("Retirez le couvercle, servez-vous ou faites passer le flacon, remettez le couvercle. La portion conseillée n'est pas renseignée dans cette démonstration.") };
    if (b.type === "collapsible" && b.settings.heading === "Livraison et retours") b.settings = { ...b.settings, content: p("Boutique de démonstration : rien n'est expédié. Délais, frais et conditions de retour seront ceux de la marque.") };
    if (b.type === "callout") b.disabled = true;
  }
  const tabs = sec(spec, "product", "tabs");
  setBlocks(tabs, [
    { type: "tab", settings: { title: "Le flacon", icon: "none", heading: "Le flacon", content: p("Flacon transparent, couvercle rouge large, étiquette illustrée d'une fraise. L'étiquette indique 60 douceurs.") } },
    { type: "tab", settings: { title: "Les offres", icon: "none", heading: "Les offres", content: p("1 flacon à 24,90 € ; 2 + 1 offert à 49,80 € ; 3 + 2 offerts à 74,70 €. Prix de démonstration.") } },
    { type: "tab", settings: { title: "Ce qui manque", icon: "none", heading: "Pas encore renseigné", content: p("Ingrédients, allergènes, poids, conservation, délais de livraison et conditions de retour : ces informations ne sont pas inventées dans la démonstration.") } },
  ]);
  stories(sec(spec, "product", "stories"));
  craving(sec(spec, "product", "craving"));
  icons(sec(spec, "product", "icons"));
  reviews(sec(spec, "product", "reviews"));
  cause(sec(spec, "product", "cause"));
  stats(sec(spec, "product", "proof"));
  const journey = put(sec(spec, "product", "journey"), { heading: "Au goûter,", heading_accent: "en trois gestes" });
  setBlocks(journey, [["Ouvrir", "Retirez le couvercle large."], ["Faire passer", "Le flacon fait le tour de la table."], ["Refermer", "Le couvercle se remet ; le flacon reste propre jusqu'à la prochaine fois."]].map(([title, text]) => ({ type: "step", settings: { title, text: p(text) } })));
  compare(sec(spec, "product", "compare"));
  beforeOrder(sec(spec, "product", "guarantee"));
  faqSection(sec(spec, "product", "faq"), "Questions fréquentes", FRAISE_FAQ);
  newsletter(sec(spec, "product", "newsletter"));
  put(sec(spec, "product", "trust"), { items: MARQUEE });

  // ── Pages ──
  const about = put(sec(spec, "page.a-propos", "about"), { heading: "Un flacon", heading_accent: "à poser au milieu", lead: p("Fraise est une marque de démonstration : un seul produit, des gummies à la fraise, dans un flacon pensé pour circuler autour de la table."), why_title: "Pourquoi un flacon", why_text: p("Parce qu'un sachet se déchire et finit entamé au fond du placard. Un flacon se pose au milieu, se fait passer et se referme."), commit_title: "Ce que nous ne disons pas", commit_text: p("Ni avis inventés, ni promotion fictive, ni promesse de santé. Ce qui n'est pas connu, comme les ingrédients ou les délais, est dit comme tel."), values_title: "Nos repères", signature: "Fraise", button_label: "Choisir mon offre", button_link: PRODUCT });
  setBlocks(about, [["leaf", "Un seul goût", "La fraise, et rien d'autre."], ["sparkle", "Un flacon qui se voit", "Transparent : on sait ce qu'il reste."], ["check", "Des offres simples", "1, 3 ou 5 flacons, prix affichés."]].map(([icon, title, text]) => ({ type: "value", settings: { icon, title, text: p(text) } })));
  for (const key of ["page.a-propos", "page.faq", "page.advertorial", "collection"]) beforeOrder(sec(spec, key, "guarantee"));
  faqSection(sec(spec, "page.faq", "faq"), "Questions fréquentes", FRAISE_FAQ);
  for (const key of ["page.listicle", "page.advertorial"]) { const r = sec(spec, key, "reviews"); if (r) r.disabled = true; newsletter(sec(spec, key, "newsletter")); }
  put(sec(spec, "page.listicle", "trust"), { items: MARQUEE });

  // Article « 4 raisons » : signé par la marque, sans autrice inventée ni offre de livraison fictive.
  const listicle = put(sec(spec, "page.listicle", "article"), { heading: "4 raisons de garder un flacon de fraise", heading_accent: "à portée de main", intro: p("Un flacon transparent, un couvercle large, 60 douceurs selon l'étiquette. Voici pourquoi il ne reste jamais longtemps dans le placard."), author: "La rédaction Fraise", date_text: "Octobre 2026", demo_note: "Article de la marque de démonstration ; prix et offres de démonstration." });
  for (const b of Object.values(listicle?.blocks ?? {})) {
    const t = String(b.settings.title ?? "");
    if (b.type === "point" && t.startsWith("Le goût")) b.settings = { ...b.settings, title: "Le goût de fraise, sans détour", text: p("Ouvrez le flacon : des gummies rouges à la fraise. <strong>Un seul goût</strong>, celui qui donne son nom à la marque.") };
    if (b.type === "point" && t.startsWith("Il se glisse")) b.settings = { ...b.settings, title: "Il part au pique-nique", text: p("Dans le sac, puis sur la nappe au soleil : <strong>le couvercle se remet d'un geste</strong> et rien ne se renverse dans le sac.") };
    if (b.type === "point" && t.startsWith("Une pause")) b.settings = { ...b.settings, text: p("Entre deux tâches, une douceur prise sur le plan de travail, le flacon refermé juste après. <strong>Il reste à portée de main sans encombrer.</strong>") };
    if (b.type === "point" && t.startsWith("Il fait")) b.settings = { ...b.settings, text: p("Au centre de la table de fête, le flacon transparent attire l'œil et <strong>passe de main en main</strong>.") };
    if (b.type === "box" && t === "Bonus") b.settings = { ...b.settings, text: p("L'offre 2 + 1 : trois flacons pour 49,80 € au lieu de 74,70 € à l'unité. Prix de démonstration.") };
    if (b.type === "box" && t === "") b.disabled = true;
    if (b.type === "cta") b.settings = { ...b.settings, label: "Choisir mon offre", note: "Prix de démonstration, paiement désactivé" };
    if (b.type === "paragraph" && String(b.settings.text).includes("advertorial")) b.settings = { ...b.settings, text: p('Envie de lire l\'histoire du flacon ? <a href="/pages/advertorial">Du placard au milieu de la table</a>.') };
  }
  // Publi-rédactionnel : récit de la marque (« nous »), plus de témoignage ni de notes inventés.
  const adv = put(sec(spec, "page.advertorial", "article"), { label_bar: "Publi-rédactionnel de la marque", crumb_label: "Notre histoire", heading: "Du placard à bonbons", heading_accent: "au milieu de la table", intro: p("Pourquoi nous avons choisi un flacon plutôt qu'un sachet."), author: "La rédaction Fraise", date_text: "Octobre 2026", rating_text: "", demo_note: "Marque de démonstration : aucun témoignage client, aucune allégation nutritionnelle." });
  const advText: Record<string, string> = {
    "Je n'oublierai": "<strong>Vous connaissez ce placard.</strong> Trois sachets entamés, un paquet écrasé, des miettes au fond. Chacun ouvert pour une envie, puis oublié.",
    "Les sachets ne se": "Les sachets se déchirent, se plient, finissent au fond d'un tiroir ou d'un sac. <strong>C'est de là qu'est venue l'idée du flacon.</strong>",
    "Un flacon transparent": "Un flacon transparent, un couvercle large. Il reste sur le plan de travail, visible : <strong>on se sert, on fait passer, on referme</strong>, et rien ne traîne.",
    "Un flacon pour commencer": "Un flacon pour goûter, trois si vous aimez partager. Prix de démonstration ; le paiement est désactivé dans cette boutique.",
  };
  for (const b of Object.values(adv?.blocks ?? {})) {
    const text = String(b.settings.text ?? "");
    if (b.type === "paragraph") for (const [start, next] of Object.entries(advText)) if (text.includes(start)) b.settings = { ...b.settings, text: p(next) };
    if (b.type === "heading" && b.settings.text === "Le flacon qui a changé la routine") b.settings = { ...b.settings, text: "Un flacon qui reste en vue" };
    if (b.type === "heading" && b.settings.text === "Ce que j'ai gardé") b.settings = { ...b.settings, text: "Ce qui change" };
    if (b.type === "checklist" && String(b.settings.title).startsWith("Pourquoi")) b.settings = { ...b.settings, title: "Ce que l'on voit", items: "Goût fraise — des gummies rouges\nFlacon transparent — on voit ce qu'il reste\nCouvercle large — il se remet d'un geste\n60 douceurs — selon l'étiquette" };
    if (b.type === "checklist" && !b.settings.title) b.settings = { ...b.settings, items: "Un flacon à la fois — plus de sachets entamés\nLe flacon sur la table — il se partage\nL'offre 2 + 1 — trois flacons pour 49,80 € (prix de démonstration)" };
    if (b.type === "quote" || b.type === "rating") b.disabled = true;
    if (b.type === "cta") b.settings = { ...b.settings, label: "Choisir mon offre", note: "Prix de démonstration — 24,90 € le flacon" };
  }

  // Livraison et retours, pages légales : ce qui est vrai pour une marque de démonstration, rien d'inventé.
  put(sec(spec, "page.livraison-retours", "main"), { updated: "21 octobre 2026", intro: p("Boutique de démonstration : aucune commande n'est expédiée ni remboursée. Délais, frais de port et conditions de retour seront ceux de la marque ; ils ne sont pas inventés ici.") });
  for (const [key, intro] of [["page.mentions-legales", "Fraise est une marque de démonstration du studio : aucune entreprise n'est exploitée sous ce nom. Les visuels sont des images de démonstration."], ["page.confidentialite", "Boutique de démonstration : aucune donnée n'est collectée par les formulaires, rien n'est enregistré."], ["page.conditions-generales", "Boutique de démonstration : rien n'est vendu, le paiement est désactivé. Les conditions de vente seront celles de la marque."]]) put(sec(spec, key, "main"), { updated: "21 octobre 2026", intro: p(intro) });
  put(sec(spec, "page.contact", "form"), { text: p("Une question sur les gummies ou sur les offres ? Écrivez-nous. Dans cette démonstration, aucun message n'est réellement transmis.") });
  // Bibliothèque de sections : vitrine des composants ; les données inconnues y sont dites, sans crochets.
  const library = spec.templates["page.sections"];
  if (library) {
    const fixes: [string | RegExp, string][] = [
      ["\\nUne notice de conservation [À compléter]", ""], [/\[À compléter(?: : [^\]]*)?\.?\]/g, "non renseigné"], ["Contenu : 60 douceurs", "Contenu : 60 douceurs (étiquette)"],
      ["La texture tendre", "Le flacon transparent"], ["Texture tendre", "Flacon transparent"], ["Des gummies qui fondent sans coller.", "On voit ce qu'il reste sans l'ouvrir."],
      ["Un bouchon large qui se visse.", "Un couvercle large qui se remet d'un geste."], ["Il se visse d'un geste et referme le flacon.", "Il se remet d'un geste et referme le flacon."],
      ["Dévissez le bouchon large.", "Retirez le couvercle large."], ["Fermeture : bouchon à vis", "Fermeture : couvercle large"],
      ["exemple de promotion", "prix de démonstration"], ["Exemple : remboursement sous 30 jours — politique à définir", "Paiement désactivé dans la démonstration"],
    ];
    let json = JSON.stringify(library);
    for (const [from, to] of fixes) json = typeof from === "string" ? json.split(from).join(to) : json.replace(from, to);
    spec.templates["page.sections"] = JSON.parse(json);
    const lib = Object.values(spec.templates["page.sections"].sections);
    const quote = lib.find((s) => s.type === "cv-quote");
    if (quote) quote.disabled = true;
    compare(lib.find((s) => s.type === "comparison-table"));
    for (const g of lib.filter((s) => s.type === "cv-gallery" && s.settings.heading === "En situation")) put(g, { heading: "Trois moments", heading_accent: "où il circule" });
  }

  // ── En-tête, panier, pied ──
  const bars = Object.values(spec.groups.header.sections).filter((s) => s.type === "announcement-bar");
  ["Le flacon qui se partage", "1, 3 ou 5 flacons au choix"].forEach((text, i) => { const b = bars[i]; if (b) for (const blk of Object.values(b.blocks ?? {})) blk.settings = { ...blk.settings, text, link: PRODUCT }; });
  spec.settings = { ...spec.settings, cart_promo_text: "", cart_protection: false, cart_reassurance: "Boutique de démonstration : rien n'est encaissé ni expédié.", cart_checkout_label: "Paiement désactivé (démonstration)", cart_checkout_lock: false };
  const footer = Object.values(spec.groups.footer.sections).find((s) => s.type === "footer");
  if (footer?.blocks) {
    if (footer.blocks.about) footer.blocks.about.settings = { ...footer.blocks.about.settings, heading: "Fraise Gummies", text: p("Des gummies à la fraise dans un flacon qui se partage. Marque de démonstration : paiement désactivé.") };
    // Une seule inscription sur la page (celle du contenu), comme pour les autres thèmes.
    footer.block_order = (footer.block_order ?? []).filter((id) => id !== "news");
  }
  spec.store.menus["footer-lire"] = { title: "À lire", links: [{ title: "4 raisons de garder un flacon", url: "/pages/listicle" }, { title: "Du placard au milieu de la table", url: "/pages/advertorial" }, { title: "Bibliothèque de sections (démonstration)", url: "/pages/sections" }] };
  spec.store.seo = { title: "Fraise | Gummies à la fraise : le flacon qui fait le tour de la table", description: "Des gummies à la fraise dans un flacon transparent qu'on ouvre, qu'on fait passer et qu'on referme. 1, 3 ou 5 flacons. Boutique de démonstration." };
  hidePendingBlocks(spec);
  // Aucun texte public ne doit plus attendre une donnée inconnue.
  for (const [key, t] of Object.entries(spec.templates)) for (const s of Object.values(t.sections)) if (!s.disabled && PENDING.test(JSON.stringify(s.settings))) throw new Error(`FRAISE : « À compléter » visible dans ${key}/${s.type}`);
}
