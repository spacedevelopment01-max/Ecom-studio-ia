/**
 * Rédaction de la démonstration FRAISE (consigne de Thomas du 21 octobre, 21 h 45, PR #159, commentaire 6327242856).
 * La composition validée de la référence Lumora (lot 2C, `conversionProject`) ne change pas : mêmes sections, même ordre,
 * aucune masquée sur l'accueil et la fiche (garde-fou : tests/demos-fraise-onde-composition.test.ts). Seuls les textes
 * changent, et la scène « table de fête » est remplacée par le gros plan des gummies (elle contredit un produit vitaminé).
 *
 * Décision explicite de Thomas : FRAISE vend des VITAMINES en gummies goût fraise (ni bonbons à partager, ni produit
 * capillaire). Il autorise un produit et une composition FICTIFS pour la démonstration, signalés comme tels ; cela ne
 * permet aucune efficacité présentée comme prouvée et ces données ne sont jamais reprises pour un client.
 *
 * ─── FRAISE — fiche de stratégie (brief de Thomas, hypothèse éditoriale) ─────────────────────────────────────────────
 *  utilisateur et acheteur : un adulte qui veut une routine de vitamines simple mais n'aime pas avaler des comprimés ;
 *  situation d'achat : il a déjà acheté une boîte de comprimés, oubliée au fond du placard ;
 *  tension (ses mots) : « Les comprimés, je les oublie, ou je les avale à contrecœur. » ;
 *  désir : une routine qu'on a envie de tenir ;
 *  angle unique : faire de sa routine de vitamines un petit rendez-vous goût fraise ;
 *  promesse tenable : deux gummies par jour, goût fraise, rien à avaler d'un coup, un flacon = un mois ;
 *  faits disponibles : visuels (flacon transparent, couvercle rouge, « 60 douceurs » sur l'étiquette), offres et prix de
 *  démonstration ; composition FICTIVE (vitamines C, D3, B6, B12 et doses), annoncée comme telle partout où elle paraît ;
 *  objections : qu'y a-t-il dedans, combien par jour, est-ce un bonbon, est-ce pour les enfants, y a-t-il du sucre,
 *  « est-ce que ça marche ? », quelle offre ;
 *  exclusions : aucun effet santé, anti-fatigue, immunité, beauté ou cheveux ; aucun avis, note, remise sur prix de
 *  référence, garantie ou délai inventés ; aucune personne ajoutée aux visuels.
 */
import type { ThemeSpec, SectionInstance } from "../src/lib/theme/spec";
import { p, faq, hidePendingBlocks, PENDING, type Faq } from "./engine-demo-copy";

const PRODUCT = "/products/gummies-fraise";
const FICTIVE = "Produit et composition fictifs, inventés pour la démonstration.";
/** Composition fictive (pour 2 gummies) : doses cohérentes avec les valeurs nutritionnelles de référence (VNR) de l'UE. */
export const FRAISE_VITAMINS: [string, string, string][] = [["Vitamine C", "40 mg", "50 %"], ["Vitamine D3", "5 µg", "100 %"], ["Vitamine B6", "0,7 mg", "50 %"], ["Vitamine B12", "1,25 µg", "50 %"]];
const INGREDIENTS = "sirop de glucose, sucre, eau, gélifiant : pectine de fruits, acidifiant : acide citrique, arôme naturel de fraise, concentré de carotte noire (couleur), vitamines (C, D3, B6, B12), enrobage : sucre";
const CAUTIONS = "Ne pas dépasser la dose journalière indiquée (2 gummies). Tenir hors de portée des jeunes enfants. Un complément alimentaire ne remplace pas une alimentation variée et équilibrée ni un mode de vie sain.";
const composition = () => `${FRAISE_VITAMINS.map(([v, dose, vnr]) => `${v} : ${dose} (${vnr} des VNR)`).join(" ; ")}. Pour 2 gummies. Composition fictive de démonstration.`;

const DEMO_INFO: Faq = ["Que puis-je faire dans cette boutique de démonstration ?", `Choisir une offre, remplir le panier et parcourir les pages. Le paiement est désactivé : rien n'est encaissé ni expédié. ${FICTIVE} Délais de livraison et conditions de retour ne sont pas renseignés.`];
export const FRAISE_FAQ: Faq[] = [
  ["Qu'y a-t-il dans deux gummies ?", `${composition()} Ingrédients : ${INGREDIENTS}.`],
  ["Combien par jour ?", "Deux gummies, au moment que vous choisissez. Le plus simple : toujours le même, par exemple au petit-déjeuner, le flacon à côté du bol."],
  ["Est-ce un bonbon ?", "Non. Ce sont des vitamines au goût de fraise : deux par jour, pas plus, même si l'envie d'en reprendre est là."],
  ["Les enfants peuvent-ils en prendre ?", "Non : la formule fictive est pensée pour les adultes. Rangez le flacon hors de portée des enfants."],
  ["Y a-t-il du sucre ?", "Oui : la composition fictive contient du sirop de glucose et du sucre. Les valeurs nutritionnelles ne sont pas inventées ici."],
  ["Est-ce que ça marche ?", "Cette boutique ne promet aucun effet sur la santé, la fatigue ou la forme. Un complément alimentaire ne remplace pas une alimentation variée et équilibrée ; en cas de doute, demandez conseil à un professionnel de santé."],
  ["Quelle offre choisir ?", "1 flacon = 1 mois à deux gummies par jour. 2 + 1 offert : trois mois pour 49,80 €. 3 + 2 offerts : cinq mois pour 74,70 €. Prix de démonstration."],
  DEMO_INFO,
];
const FRAISE_FAQ_SHORT: Faq[] = [FRAISE_FAQ[0], FRAISE_FAQ[1], FRAISE_FAQ[2], DEMO_INFO];
const FRAISE_PENDING: Faq[] = [
  ["Quels moyens de paiement acceptez-vous ?", "[À compléter : moyens de paiement réellement activés.]"],
  ["Combien de temps prend la livraison ?", "[À compléter : délais réels.]"],
  ["Quelle est votre politique de retour ?", "[À compléter : conditions de retour réelles.]"],
  ["Comment vous contacter ?", "[À compléter : adresse e-mail du service client.]"],
];
const MARQUEE = "Vitamines en gummies\nGoût fraise\n2 par jour\n1 flacon = 1 mois";

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
/** Ancienne garantie « 30 jours en exemple » : ce qui est vrai avant de commander. */
function beforeOrder(s: SectionInstance | undefined) {
  put(s, { heading: "avant de commencer", heading_accent: "Bon à savoir", text: p(`${FICTIVE} Livraison et retours seront précisés par la marque ; ils ne sont pas inventés ici.`), demo_note: "", button_label: "Choisir ma durée", button_link: PRODUCT });
  setBlocks(s, ["Aucun effet santé promis", "Paiement désactivé : rien n'est encaissé", "Aucune commande n'est expédiée"].map((text) => ({ type: "check", settings: { text } })));
}
function stories(s: SectionInstance | undefined) {
  put(s, { heading: "Un rendez-vous", heading_accent: "qui tient dans la journée", text: p("Le flacon trouve sa place là où la journée commence, et vous suit quand elle change.") });
  const t = [["Au petit-déjeuner", "Le flacon à côté du bol : deux gummies et c'est fait"], ["Le week-end aussi", "Il part dans le sac du pique-nique"], ["Deux gummies", "La dose du jour, pas plus"]];
  (s?.block_order ?? []).forEach((id, i) => { const b = s!.blocks![id]; if (t[i]) b.settings = { ...b.settings, title: String(b.settings.title).includes("clip de test") ? `${t[i][0]} (clip de test)` : t[i][0], subtitle: t[i][1], link_label: "Choisir ma durée" }; });
}
/** « Ce que l'on voit » : la composition fictive, vitamine par vitamine, à côté du flacon ouvert. */
function inside(s: SectionInstance | undefined) {
  put(s, { heading: "Dans deux gummies,", heading_accent: "quatre vitamines", text: p("Composition fictive, inventée pour la démonstration : elle ne décrit aucun produit réel et n'est associée à aucun effet promis."), button_label: "Choisir ma durée", guarantee_text: "" });
  setBlocks(s, FRAISE_VITAMINS.map(([v, dose, vnr]) => ({ type: "point", settings: { icon: "check", title: `${v} : ${dose}`, text: p(`${vnr} des valeurs nutritionnelles de référence.`) } })));
}
function icons(s: SectionInstance | undefined) {
  put(s, { heading: "Pourquoi", heading_accent: "en gummies" });
  setBlocks(s, [["leaf", "Rien à avaler d'un coup", "Un gummy se mâche : fini le comprimé qui accroche."], ["heart", "Le goût fraise", "Un goût qu'on retrouve avec plaisir chaque matin."], ["sparkle", "Un flacon qui se voit", "Transparent, posé sur le plan de travail : on y pense, et on voit ce qu'il reste."], ["drop", "Un flacon, un mois", "60 gummies à deux par jour."]].map(([icon, title, text]) => ({ type: "feature", settings: { icon, title, text: p(text) } })));
}
function dose(s: SectionInstance | undefined) {
  put(s, { heading: "Deux gummies,", heading_accent: "c'est la dose du jour", text: p("Ce sont des vitamines : deux par jour suffisent, même quand l'envie d'en reprendre est là. Le flacon se referme et se range hors de portée des enfants."), button_label: "Choisir ma durée", guarantee_text: "" });
  setBlocks(s, ["2 par jour", "Flacon refermable", "Pour les adultes"].map((text) => ({ type: "pill", settings: { text } })));
}
function compare(s: SectionInstance | undefined) {
  put(s, { eyebrow: "Les offres", heading: "Un mois,", heading_accent: "trois ou cinq ?", text: p("À deux gummies par jour, un flacon dure un mois. Choisissez le temps de prendre l'habitude."), criteria_label: "", badge: "Pour s'installer", note: "Prix de démonstration.", button_label: "Choisir ma durée", button_link: PRODUCT });
  setBlocks(s, [
    { type: "column", settings: { label: "1 flacon", highlight: false } },
    { type: "column", settings: { label: "2 + 1 offert", highlight: true } },
    { type: "column", settings: { label: "3 + 2 offerts", highlight: false } },
    ...[["Durée", "1 mois", "3 mois", "5 mois"], ["Prix total", "24,90 €", "49,80 €", "74,70 €"], ["Prix par mois", "24,90 €", "16,60 €", "14,94 €"], ["Pour", "essayer", "s'installer", "tenir la saison"]].map(([label, v1, v2, v3]) => ({ type: "row", settings: { label, v1, v2, v3 } })),
  ]);
}
function stats(s: SectionInstance | undefined) {
  put(s, { heading: "En quelques", heading_accent: "repères", text: "", source: "Dose et composition fictives ; « 60 douceurs » est écrit sur l'étiquette du flacon." });
  setBlocks(s, [["2", "gummies par jour"], ["4", "vitamines : C, D3, B6, B12"], ["30", "jours par flacon de 60"], ["0", "comprimé à avaler"]].map(([value, label]) => ({ type: "stat", settings: { value, label } })));
}
function newsletter(s: SectionInstance | undefined) {
  put(s, { heading: "Être prévenu à l'ouverture", text: p("Un e-mail quand la boutique ouvre. Rien d'autre."), button_label: "Me prévenir", legal: "Désinscription en un clic." });
}
function faqSection(s: SectionInstance | undefined, heading: string, items: Faq[]) {
  put(s, { heading, text: "" });
  faq(s, items, FRAISE_PENDING);
}

export function curateFraise(spec: ThemeSpec) {
  // La table de fête (coupes, gâteau) contredit des vitamines : remplacée partout par le gros plan des gummies.
  let json = JSON.stringify(spec.templates).split("fraise-09-scene-fete").join("fraise-04-detail-gummies").split("Flacon sur une table de fête.").join("Gros plan sur les gummies à la fraise.").split("Table de fête").join("Deux gummies");
  spec.templates = JSON.parse(json);

  // ── Accueil ──
  put(sec(spec, "index", "hero"), { heading: "Vos vitamines", heading_accent: "ont le goût de fraise", text: p("Deux gummies le matin, et la routine est faite. Pas de comprimé à avaler : un petit rendez-vous goût fraise qu'on a envie de retrouver."), rating_text: "", guarantee_text: "", button_label: "Choisir ma durée" });
  setBlocks(sec(spec, "index", "hero"), ["2 gummies par jour", "Vitamines C, D3, B6, B12", "Produit fictif de démonstration"].map((text) => ({ type: "check", settings: { text } })));
  for (const id of ["trust", "trust2"]) put(sec(spec, "index", id), { items: MARQUEE });
  reviews(sec(spec, "index", "reviews"));
  inside(sec(spec, "index", "craving"));
  icons(sec(spec, "index", "icons"));
  dose(sec(spec, "index", "cause"));
  faqSection(sec(spec, "index", "formula"), "Avant de commencer", FRAISE_FAQ_SHORT);
  compare(sec(spec, "index", "compare"));
  stats(sec(spec, "index", "proof"));
  beforeOrder(sec(spec, "index", "guarantee"));
  stories(sec(spec, "index", "stories"));
  faqSection(sec(spec, "index", "faq"), "Questions fréquentes", FRAISE_FAQ);
  newsletter(sec(spec, "index", "newsletter"));

  // ── Fiche ──
  const description = p(`Des vitamines C, D3, B6 et B12 en gummies goût fraise. Deux par jour, à mâcher : pas de comprimé à avaler. Un flacon de 60 dure un mois. ${FICTIVE}`);
  spec.store.product = { ...spec.store.product, title: "Gummies vitaminés goût fraise", description_html: description, compare_at_price: null, seo: { title: "Gummies vitaminés goût fraise : C, D3, B6, B12 | Fraise Gummies", description: "Deux gummies goût fraise par jour, sans comprimé à avaler ; un flacon = un mois. Produit et composition fictifs de démonstration, aucun effet santé promis." } };
  const main = sec(spec, "product", "main");
  for (const b of Object.values(main?.blocks ?? {})) {
    if (b.type === "eyebrow") b.settings = { ...b.settings, text: "Vitamines en gummies · composition fictive" };
    if (b.type === "text") b.settings = { ...b.settings, text: p("Deux gummies goût fraise par jour, sans comprimé à avaler. Un flacon = un mois. Prix de démonstration, paiement désactivé.") };
    if (b.type === "quantity_offer" && b.settings.badge === "Meilleure offre") b.settings = { ...b.settings, badge: "5 mois · prix par mois le plus bas" };
    if (b.type === "quantity_offer" && b.settings.badge === "Notre sélection") b.settings = { ...b.settings, badge: "3 mois pour s'installer" };
    if (b.type === "purchase_benefit") {
      const map: Record<string, string> = { "Goût fraise": "Goût fraise", "Texture tendre": "2 gummies par jour", "Flacon refermable": "1 flacon = 1 mois", "Prix de démonstration": "Prix de démonstration" };
      if (map[String(b.settings.title)]) b.settings = { ...b.settings, title: map[String(b.settings.title)] };
    }
    if (b.type === "reassurance") b.settings = { ...b.settings, item1: "Paiement désactivé : aucune commande encaissée", item2: "Livraison et retours : à définir par la marque", item3: "Produit, composition et visuels fictifs" };
    if (b.type === "collapsible" && b.settings.heading === "Description") b.settings = { ...b.settings, content: description };
    if (b.type === "collapsible" && b.settings.heading === "Comment les déguster") b.settings = { ...b.settings, heading: "Conseils d'utilisation", content: p(`Deux gummies par jour, à mâcher, de préférence au même moment. ${CAUTIONS}`) };
    if (b.type === "collapsible" && b.settings.heading === "Livraison et retours") b.settings = { ...b.settings, content: p("Boutique de démonstration : rien n'est expédié. Délais, frais et conditions de retour seront ceux de la marque.") };
    if (b.type === "callout") b.disabled = true;
  }
  setBlocks(sec(spec, "product", "tabs"), [
    { type: "tab", settings: { title: "Composition", icon: "none", heading: "Composition (fictive)", content: p(`${composition()}<br>Ingrédients : ${INGREDIENTS}.`) } },
    { type: "tab", settings: { title: "Utilisation", icon: "none", heading: "Conseils d'utilisation", content: p("Deux gummies par jour, à mâcher. Associez-les à un moment fixe, comme le petit-déjeuner : le flacon posé à côté du bol, on y pense.") } },
    { type: "tab", settings: { title: "Précautions", icon: "none", heading: "Précautions", content: p(`${CAUTIONS} Aucun effet sur la santé n'est promis par cette boutique.`) } },
  ]);
  stories(sec(spec, "product", "stories"));
  inside(sec(spec, "product", "craving"));
  icons(sec(spec, "product", "icons"));
  reviews(sec(spec, "product", "reviews"));
  dose(sec(spec, "product", "cause"));
  stats(sec(spec, "product", "proof"));
  setBlocks(put(sec(spec, "product", "journey"), { heading: "Chaque matin,", heading_accent: "en trois gestes" }), [["Ouvrir", "Retirez le couvercle du flacon."], ["Deux gummies", "Prenez-en deux, à mâcher. Pas plus."], ["Ranger", "Refermez et rangez le flacon hors de portée des enfants."]].map(([title, text]) => ({ type: "step", settings: { title, text: p(text) } })));
  compare(sec(spec, "product", "compare"));
  beforeOrder(sec(spec, "product", "guarantee"));
  faqSection(sec(spec, "product", "faq"), "Questions fréquentes", FRAISE_FAQ);
  newsletter(sec(spec, "product", "newsletter"));
  put(sec(spec, "product", "trust"), { items: MARQUEE });

  // ── Pages ──
  const about = put(sec(spec, "page.a-propos", "about"), { heading: "Des vitamines", heading_accent: "qu'on a envie de prendre", lead: p(`Fraise Gummies est une marque fictive, créée pour la démonstration : un seul produit, des vitamines en gummies goût fraise. ${FICTIVE}`), why_title: "Pourquoi des gummies", why_text: p("Parce que la boîte de comprimés finit souvent au fond du placard. Un flacon goût fraise posé à côté du bol, c'est un rendez-vous qu'on retrouve chaque matin."), commit_title: "Ce que nous ne promettons pas", commit_text: p("Aucun effet sur la santé, la fatigue, la beauté ou les cheveux. Ni avis inventés, ni remise sur un prix de référence fictif."), values_title: "Nos repères", signature: "Fraise Gummies", button_label: "Choisir ma durée", button_link: PRODUCT });
  setBlocks(about, [["leaf", "Une routine simple", "Deux gummies, un moment fixe."], ["sparkle", "Un goût qu'on aime", "La fraise, chaque matin."], ["check", "Une composition affichée", "Fictive ici, mais lisible : chaque vitamine et sa dose."]].map(([icon, title, text]) => ({ type: "value", settings: { icon, title, text: p(text) } })));
  for (const key of ["page.a-propos", "page.faq", "page.advertorial", "collection"]) beforeOrder(sec(spec, key, "guarantee"));
  faqSection(sec(spec, "page.faq", "faq"), "Questions fréquentes", FRAISE_FAQ);
  for (const key of ["page.listicle", "page.advertorial"]) { const r = sec(spec, key, "reviews"); if (r) r.disabled = true; newsletter(sec(spec, key, "newsletter")); }
  put(sec(spec, "page.listicle", "trust"), { items: MARQUEE });

  // Article « 4 raisons » : signé par la marque, sans autrice inventée ni offre de livraison fictive.
  const listicle = put(sec(spec, "page.listicle", "article"), { heading: "4 raisons de prendre vos vitamines", heading_accent: "en gummies goût fraise", intro: p("Vous oubliez vos comprimés, ou vous les avalez à contrecœur ? Le format gummy change le rendez-vous."), author: "La rédaction Fraise Gummies", date_text: "Octobre 2026", demo_note: `Article de la marque fictive. ${FICTIVE}` });
  for (const b of Object.values(listicle?.blocks ?? {})) {
    const t = String(b.settings.title ?? "");
    if (b.type === "point" && t.startsWith("Le goût")) b.settings = { ...b.settings, title: "Rien à avaler d'un coup", text: p("Un gummy se mâche. <strong>Plus de comprimé qui accroche</strong> : deux gummies goût fraise, et la routine est faite.") };
    if (b.type === "point" && t.startsWith("Il se glisse")) b.settings = { ...b.settings, title: "Elle vous suit le week-end", text: p("Le flacon se referme et part dans le sac : <strong>la routine ne s'arrête pas</strong> quand on quitte la maison.") };
    if (b.type === "point" && t.startsWith("Une pause")) b.settings = { ...b.settings, title: "Un rendez-vous au petit-déjeuner", text: p("Posé à côté du bol, le flacon transparent se voit : <strong>on y pense sans alarme ni application</strong>.") };
    if (b.type === "point" && t.startsWith("Il fait")) b.settings = { ...b.settings, title: "Deux, pas plus", text: p("Elles ont le goût d'une friandise, mais ce sont des vitamines : <strong>deux gummies par jour</strong>, le flacon rangé hors de portée des enfants.") };
    if (b.type === "box" && t === "Bonus") b.settings = { ...b.settings, text: p("L'offre 2 + 1 : trois mois de routine pour 49,80 € au lieu de 74,70 € à l'unité. Prix de démonstration.") };
    if (b.type === "box" && t === "") b.disabled = true;
    if (b.type === "cta") b.settings = { ...b.settings, label: "Choisir ma durée", note: "Prix de démonstration, paiement désactivé" };
    if (b.type === "paragraph" && String(b.settings.text).includes("advertorial")) b.settings = { ...b.settings, text: p('Pourquoi des gummies plutôt que des comprimés ? <a href="/pages/advertorial">Lire notre histoire</a>.') };
  }
  // Publi-rédactionnel : récit de la marque (« vous », « nous »), plus de témoignage ni de notes inventés.
  for (const pg of spec.store.pages) if (pg.handle === "advertorial") pg.title = "La boîte de comprimés est restée au fond du placard";
  const adv = put(sec(spec, "page.advertorial", "article"), { label_bar: "Publi-rédactionnel de la marque (fictive)", crumb_label: "Notre histoire", crumb_link_label: "Gummies vitaminés goût fraise", heading: "La boîte de comprimés", heading_accent: "est restée au fond du placard", intro: p("Pourquoi nous avons mis nos vitamines en gummies goût fraise."), author: "La rédaction Fraise Gummies", date_text: "Octobre 2026", rating_text: "", demo_note: `Aucun témoignage client, aucun effet santé promis. ${FICTIVE}` });
  const advText: Record<string, string> = {
    "Je n'oublierai": "<strong>Vous connaissez cette boîte.</strong> Achetée avec de bonnes intentions, ouverte trois fois, puis poussée au fond du placard, derrière les épices.",
    "Les sachets ne se": "Les comprimés, il faut y penser, puis les avaler. <strong>Le jour où l'on oublie, on oublie souvent le lendemain aussi.</strong>",
    "Un flacon transparent": "Un flacon transparent, posé à côté du bol du petit-déjeuner. Deux gummies goût fraise : <strong>le geste est rapide, et on a envie de le refaire</strong>.",
    "Un flacon pour commencer": "Un flacon pour un mois, trois pour prendre l'habitude. Produit fictif et prix de démonstration ; le paiement est désactivé.",
  };
  for (const b of Object.values(adv?.blocks ?? {})) {
    const text = String(b.settings.text ?? "");
    if (b.type === "paragraph") for (const [start, next] of Object.entries(advText)) if (text.includes(start)) b.settings = { ...b.settings, text: p(next) };
    if (b.type === "heading" && b.settings.text === "Le placard à bonbons, avant") b.settings = { ...b.settings, text: "La boîte oubliée" };
    if (b.type === "heading" && b.settings.text === "Le flacon qui a changé la routine") b.settings = { ...b.settings, text: "Un flacon qui reste en vue" };
    if (b.type === "heading" && b.settings.text === "Ce que j'ai gardé") b.settings = { ...b.settings, text: "Ce qui change" };
    if (b.type === "checklist" && String(b.settings.title).startsWith("Pourquoi")) b.settings = { ...b.settings, title: "Dans deux gummies (composition fictive)", items: FRAISE_VITAMINS.map(([v, d]) => `${v} — ${d}`).join("\n") };
    if (b.type === "checklist" && !b.settings.title) b.settings = { ...b.settings, items: "Le flacon à côté du bol — on y pense\nDeux gummies — la dose du jour, pas plus\nL'offre 2 + 1 — trois mois pour 49,80 € (prix de démonstration)" };
    if (b.type === "quote" || b.type === "rating") b.disabled = true;
    if (b.type === "cta") b.settings = { ...b.settings, label: "Choisir ma durée", note: "Prix de démonstration — 24,90 € le flacon d'un mois" };
  }

  // Livraison et retours, pages légales : ce qui est vrai pour une marque de démonstration, rien d'inventé.
  put(sec(spec, "page.livraison-retours", "main"), { updated: "21 octobre 2026", intro: p("Boutique de démonstration : aucune commande n'est expédiée ni remboursée. Délais, frais de port et conditions de retour seront ceux de la marque ; ils ne sont pas inventés ici.") });
  for (const [key, intro] of [["page.mentions-legales", "Fraise Gummies est une marque fictive du studio : aucune entreprise n'est exploitée sous ce nom. Produit, composition et visuels sont inventés pour la démonstration."], ["page.confidentialite", "Boutique de démonstration : aucune donnée n'est collectée par les formulaires, rien n'est enregistré."], ["page.conditions-generales", "Boutique de démonstration : rien n'est vendu, le paiement est désactivé. Les conditions de vente seront celles de la marque."]]) put(sec(spec, key, "main"), { updated: "21 octobre 2026", intro: p(intro) });
  put(sec(spec, "page.contact", "form"), { text: p("Une question sur la routine, la composition (fictive) ou les offres ? Écrivez-nous. Dans cette démonstration, aucun message n'est réellement transmis.") });
  // Bibliothèque de sections : vitrine des composants ; composition fictive annoncée, données inconnues dites sans crochets.
  const library = spec.templates["page.sections"];
  if (library) {
    const fixes: [string | RegExp, string][] = [
      ["\\nUne notice de conservation [À compléter]", ""], [/\[À compléter(?: : [^\]]*)?\.?\]/g, "non renseigné"], ["Contenu : 60 douceurs", "Contenu : 60 gummies (un mois)"],
      ["La texture tendre", "Deux par jour"], ["Texture tendre", "Deux par jour"], ["Des gummies qui fondent sans coller.", "La dose du jour, à mâcher."],
      ["Un bouchon large qui se visse.", "Un couvercle qui se referme."], ["Il se visse d'un geste et referme le flacon.", "Il referme le flacon, rangé hors de portée des enfants."],
      ["Dévissez le bouchon large.", "Retirez le couvercle."], ["Fermeture : bouchon à vis", "Fermeture : couvercle"],
      ["exemple de promotion", "prix de démonstration"], ["Exemple : remboursement sous 30 jours — politique à définir", "Paiement désactivé dans la démonstration"],
      ["Trois formats, un seul goût assumé.", "Un flacon, un mois de vitamines goût fraise."],
      // Restes de l'ancien angle « douceur à partager » (consigne du 21 octobre, 21 h 45 : des vitamines).
      ["Posé sur le plan de travail, le flacon se referme après chaque douceur.", "Posé près du bol du petit-déjeuner, il rappelle le rendez-vous du jour."],
      ["Dans le sac du pique-nique, il reste propre et fermé.", "Le week-end aussi, il part dans le sac, refermé."],
      ["Pique-nique au jardin", "Le week-end, au jardin"], ["Au centre de la table, il passe de main en main.", "Deux par jour, à mâcher, goût fraise."],
      ["\"À table\"", "\"De près\""], ["\"entre amis\"", "\"les gummies\""],
      ["Une douceur à la fois, le flacon refermé juste après.", "Deux gummies, le flacon refermé juste après."], ["Nom, goût et nombre de douceurs.", "Nom, goût et contenu du flacon."],
    ];
    let lib = JSON.stringify(library);
    for (const [from, to] of fixes) lib = typeof from === "string" ? lib.split(from).join(to) : lib.replace(from, to);
    spec.templates["page.sections"] = JSON.parse(lib);
    const sections = Object.values(spec.templates["page.sections"].sections);
    const quote = sections.find((s) => s.type === "cv-quote");
    if (quote) quote.disabled = true;
    compare(sections.find((s) => s.type === "comparison-table"));
    for (const g of sections.filter((s) => s.type === "cv-gallery" && s.settings.heading === "En situation")) put(g, { heading: "Un rendez-vous", heading_accent: "dans la journée" });
  }

  // ── En-tête, panier, pied ──
  const bars = Object.values(spec.groups.header.sections).filter((s) => s.type === "announcement-bar");
  ["Vos vitamines, goût fraise", "1 flacon = 1 mois de routine"].forEach((text, i) => { const b = bars[i]; if (b) for (const blk of Object.values(b.blocks ?? {})) blk.settings = { ...blk.settings, text, link: PRODUCT }; });
  spec.settings = { ...spec.settings, cart_promo_text: "", cart_protection: false, cart_reassurance: "Boutique de démonstration : rien n'est encaissé ni expédié.", cart_checkout_label: "Paiement désactivé (démonstration)", cart_checkout_lock: false };
  const footer = Object.values(spec.groups.footer.sections).find((s) => s.type === "footer");
  if (footer?.blocks) {
    if (footer.blocks.about) footer.blocks.about.settings = { ...footer.blocks.about.settings, heading: "Fraise Gummies", text: p("Des vitamines en gummies goût fraise. Marque, produit et composition fictifs ; paiement désactivé.") };
    // Une seule inscription sur la page (celle du contenu), comme pour les autres thèmes.
    footer.block_order = (footer.block_order ?? []).filter((id) => id !== "news");
  }
  spec.store.menus["main-menu"] = { ...spec.store.menus["main-menu"], links: (spec.store.menus["main-menu"]?.links ?? []).map((l) => (l.title === "Les gummies" ? { ...l, title: "Les vitamines" } : l.title === "Pourquoi les gummies" ? { ...l, title: "Pourquoi en gummies" } : l)) };
  spec.store.menus["footer-lire"] = { title: "À lire", links: [{ title: "4 raisons de passer aux gummies", url: "/pages/listicle" }, { title: "La boîte restée au fond du placard", url: "/pages/advertorial" }, { title: "Bibliothèque de sections (démonstration)", url: "/pages/sections" }] };
  spec.store.seo = { title: "Fraise Gummies | Vitamines en gummies goût fraise, deux par jour", description: "Faites de votre routine de vitamines un petit rendez-vous goût fraise : deux gummies par jour, sans comprimé à avaler. Marque et composition fictives de démonstration." };
  hidePendingBlocks(spec);
  // Aucun texte public ne doit plus attendre une donnée inconnue.
  for (const [key, t] of Object.entries(spec.templates)) for (const s of Object.values(t.sections)) if (!s.disabled && PENDING.test(JSON.stringify(s.settings))) throw new Error(`FRAISE : « À compléter » visible dans ${key}/${s.type}`);
}
