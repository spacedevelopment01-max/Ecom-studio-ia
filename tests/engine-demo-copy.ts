/**
 * Rédaction des démonstrations ORBE et Atelier Rive (consigne de Thomas du 21 octobre, 19 h 50). Ces deux démonstrations
 * sont composées par le moteur à partir de l'identité du projet (comme un client) ; cette rédaction remplace ensuite les
 * textes génériques (« Chez vous », « Au fil de la journée », « Adopter … ») par des textes écrits pour la cible, sans rien
 * inventer, et masque dans les démonstrations ce qui attend une donnée inconnue (« [À compléter : …] ») : présent et
 * modifiable dans l'éditeur, jamais affiché aux visiteurs. Les compositions ne changent pas.
 */
import type { ThemeSpec, SectionInstance } from "../src/lib/theme/spec";

const p = (s: string) => `<p>${s}</p>`;
const PENDING = /\[(?:À compléter|To complete)/;
type Faq = [string, string];

function sections(spec: ThemeSpec, key: string, type: string): SectionInstance[] {
  const t = spec.templates[key];
  return t ? t.order.map((sid) => t.sections[sid]).filter((s) => s.type === type) : [];
}
/** Réglages d'une section (la n-ième de ce type dans le modèle), sans toucher aux autres. */
function set(spec: ThemeSpec, key: string, type: string, settings: Record<string, unknown>, n = 0) {
  const s = sections(spec, key, type)[n];
  if (s) s.settings = { ...s.settings, ...settings };
  return s;
}
/** Blocs d'une section, dans l'ordre (réglages modifiables). */
const blocks = (s: SectionInstance | undefined) => (s?.block_order ?? []).map((b) => s!.blocks![b]);
/** Questions d'une FAQ : celles de la démonstration d'abord, puis celles en attente (masquées), sans doublon. */
function faq(s: SectionInstance | undefined, items: Faq[], pending: Faq[]) {
  if (!s) return;
  const type = blocks(s)[0]?.type ?? "question";
  const all: Faq[] = [...items, ...pending.filter(([q]) => !items.some(([x]) => x === q))];
  s.blocks = Object.fromEntries(all.map(([question, answer], i) => [`q${i}`, { type, settings: { question, answer: p(answer) }, ...(PENDING.test(answer) ? { disabled: true } : {}) }]));
  s.block_order = all.map((_, i) => `q${i}`);
  s.disabled = false;
}
/** Tout bloc qui n'attend qu'une donnée inconnue est masqué (démonstration seulement). */
function hidePendingBlocks(spec: ThemeSpec) {
  for (const t of Object.values(spec.templates)) for (const s of Object.values(t.sections)) for (const b of Object.values(s.blocks ?? {})) if (PENDING.test(JSON.stringify(b.settings))) b.disabled = true;
}

// ─── ORBE — fiche de stratégie (hypothèse éditoriale, pas une étude) ──────────────────────────────────────────────────
//  1. cible : un locataire ou un petit logement qui ne peut pas refaire son éclairage et vit sous un plafonnier ;
//  2. tension : « Le plafonnier écrase la pièce, et je ne peux pas faire de travaux. » ;
//  3. désir : une atmosphère différente là où l'on vit le soir — angle unique : déplacez la lumière, l'ambiance suit ;
//  4. promesse tenable : une lampe à poser, qui passe de la table du dîner au bureau ou à la table de nuit ; trois
//     finitions ; faits = visuels et identité du kit. Dimensions, matières, alimentation et livraison jamais affirmées ;
//  5. objections : où la poser, quelle finition, faut-il des travaux, ce que permet la démonstration ;
//  6. parcours : ouverture (se reconnaître) → l'idée → les finitions → la lampe qui change de place → deux usages →
//     FAQ → appel final.
export const ORBE_FAQ: Faq[] = [
  ["Où la poser ?", "Sur la table du dîner, un bureau, une table de nuit ou à côté d'un fauteuil : nos photos la montrent à chacun de ces endroits."],
  ["Quelle finition choisir ?", "Dune, la plus claire, pour les bois blonds et les murs clairs ; Argile, terre cuite, pour les intérieurs chauds ; Charbon, presque noire, pour les tons sombres. La silhouette est la même."],
  ["Faut-il des travaux ?", "Non : ORBE est une lampe à poser, pas un luminaire à fixer. Elle change de table quand vous changez de pièce."],
  ["Que puis-je faire dans cette boutique de démonstration ?", "Choisir une finition et parcourir la fiche. Le paiement est désactivé : aucune commande n'est enregistrée. Dimensions, matières, alimentation et livraison ne sont pas encore renseignées."],
];
const ORBE_PENDING: Faq[] = [
  ["Quelles sont ses dimensions ?", "[À compléter : dimensions]"],
  ["En quelle matière ?", "[À compléter : matière]"],
  ["Comment est-elle alimentée ?", "[À compléter : alimentation, câble ou batterie, autonomie]"],
  ["Comment l'entretenir ?", "[À compléter : conseils d'entretien]"],
  ["Quels sont les délais de livraison ?", "[À compléter : délais et tarifs de livraison]"],
  ["Puis-je retourner ma commande ?", "[À compléter : conditions de retour]"],
];

export function curateOrbe(spec: ThemeSpec) {
  const product = `/products/${spec.store.product.handle}`;
  set(spec, "index", "ed-opening", { text: p("Le plafonnier écrase la pièce ? Posez ORBE sur la table du dîner, puis sur le bureau ou la table de nuit : là où vous la posez, l'ambiance change."), button_label: "Voir la lampe", button_link: product });
  set(spec, "index", "ed-statement", { label: "L'idée", heading: "Une lampe qui suit la soirée, au lieu d'un plafonnier qui la fige." });
  set(spec, "index", "ed-finishes", { label: "Finitions", heading: "Trois finitions, pour trois intérieurs", text: p("Dune pour les bois clairs, Argile pour les tons chauds, Charbon pour les intérieurs sombres : la même silhouette, trois façons de s'accorder à la pièce."), button_label: "Choisir sa finition" });
  set(spec, "index", "ed-scene", { label: "Elle change de place", heading: "Du dîner à la lecture, la lumière vous suit", text: p("Sur la table du dîner, puis sur le bureau ou la table de nuit : la lampe passe d'une pièce à l'autre, et l'atmosphère avec elle.") });
  set(spec, "index", "ed-diptych", { label: "Deux soirées", heading: "Près d'un fauteuil, sur une table de chevet" });
  faq(sections(spec, "index", "v2-faq")[0], ORBE_FAQ, ORBE_PENDING);
  for (const key of ["index", "page.about"]) set(spec, key, "cta-banner", { heading: "Ce soir, déplacez la lumière", text: p("Dune, Argile ou Charbon : choisissez la finition qui ira avec votre table."), button_label: "Choisir sa finition", button_link: product });
  // Notre histoire : pourquoi une lampe à poser.
  const about = sections(spec, "page.about", "rich-text")[0];
  for (const b of blocks(about)) {
    if (b.type === "heading") b.settings = { ...b.settings, text: "Une lumière qui se déplace avec vous" };
    if (b.type === "text") b.settings = { ...b.settings, text: p("ORBE est née d'un constat simple : un plafonnier éclaire toute la pièce de la même façon. Une lampe posée crée un îlot de lumière là où l'on vit le soir, et peut changer de place le lendemain.") };
  }
  set(spec, "page.about", "image-with-text", { heading: "Pourquoi une lampe à poser", text: p("Parce qu'elle ne demande ni travaux ni fil au plafond : elle se pose sur une table, un bureau ou une table de nuit. Trois finitions, Dune, Argile et Charbon, pour la même silhouette arrondie.") });
  // FAQ, fiche et page de livraison.
  faq(sections(spec, "page.faq", "faq")[0], ORBE_FAQ, ORBE_PENDING);
  set(spec, "page.faq", "contact-form", { heading: "Une question avant de choisir ?", text: p("Écrivez-nous : le formulaire vérifie les champs avant l'envoi. Dans cette démonstration, aucun message n'est réellement transmis.") });
  set(spec, "page.contact", "contact-form", { text: p("Une question sur la lampe ou ses finitions ? Écrivez-nous. Dans cette démonstration, aucun message n'est réellement transmis.") });
  const shipping = sections(spec, "page.shipping", "rich-text")[0];
  for (const b of blocks(shipping)) if (b.type === "text") { b.settings = { ...b.settings, text: p("Boutique de démonstration : aucune commande n'est expédiée ni remboursée. Les délais, frais et conditions de retour de la marque ne sont pas encore renseignés.") }; b.disabled = false; }
  for (const key of Object.keys(spec.templates).filter((k) => k === "product" || k.startsWith("product."))) {
    const mp = sections(spec, key, "main-product")[0];
    for (const b of blocks(mp)) if (b.type === "text") b.settings = { ...b.settings, text: p("Le plafonnier fige la pièce ; ORBE se pose là où vous vivez ce soir, la table du dîner, le bureau ou la table de nuit, et l'ambiance suit. Trois finitions : Dune, Argile et Charbon.") };
    set(spec, key, "ed-scene", { label: "Elle change de place", heading: "Du dîner à la table de nuit", text: p("Une lampe à poser, pas à fixer : elle quitte la table du dîner pour le bureau ou la table de nuit, et l'atmosphère la suit.") });
    faq(sections(spec, key, "faq")[0], ORBE_FAQ, ORBE_PENDING);
  }
  // Politiques (CGV, confidentialité, remboursement) non rédigées : liens masqués dans la démonstration, où ils
  // menaient à une page introuvable ; le réglage reste disponible dans l'éditeur.
  for (const sec of Object.values(spec.groups.footer?.sections ?? {})) if (sec.type === "footer") sec.settings = { ...sec.settings, show_policies: false };
  spec.store.seo = { title: "ORBE | Lampe à poser : déplacez la lumière, l'ambiance suit", description: "Le plafonnier écrase la pièce ? La lampe ORBE se pose sur la table du dîner, le bureau ou la table de nuit. Trois finitions : Dune, Argile et Charbon." };
  hidePendingBlocks(spec);
}

// ─── Atelier Rive — fiche de stratégie (site de services : un parcours de prise de contact, pas une fiche d'achat) ─────
//  1. cible : un couple ou une famille dont l'intérieur ne suit plus la vie (télétravail, enfant, emménagement) et qui ne
//     sait pas par où commencer ;
//  2. tension : « On a tout essayé seuls, on ne sait plus par où commencer, et on a peur de dépenser pour un résultat
//     qui ne nous ressemble pas. » ;
//  3. désir : un intérieur qui leur ressemble — angle unique : être compris avant d'être conseillé ;
//  4. promesse tenable : partir de leur façon de vivre chaque pièce, de la lumière et des matières (le positionnement
//     déclaré) ; trois prestations décrites ; tarifs, zone, horaires, équipe et réalisations réelles inconnus ;
//  5. objections : par où commencer, faut-il savoir ce que l'on veut, une seule pièce est-elle possible, ce que permet la
//     démonstration ;
//  6. parcours : ouverture (se reconnaître) → l'approche → les prestations (pour qui) → la méthode → des inspirations →
//     la lumière d'abord → FAQ → premier message.
export const RIVE_FAQ: Faq[] = [
  ["Par où commence-t-on ?", "Par un message : décrivez la pièce, ce qui vous gêne et ce que vous aimeriez y faire. Le formulaire de contact suffit pour démarrer."],
  ["Faut-il savoir ce que l'on veut ?", "Non. Dire ce qui ne va plus suffit : la direction se construit à partir de vos usages, de la lumière et des matières."],
  ["Intervenez-vous pour une seule pièce ?", "Oui : l'aménagement d'une pièce est une prestation à part entière, comme le conseil ou le projet d'ensemble."],
  ["Ce site est-il actif ?", "C'est une démonstration : aucun message n'est réellement transmis. Les tarifs, la zone d'intervention et les horaires ne sont pas encore renseignés."],
];
const RIVE_PENDING: Faq[] = [
  ["Où intervenez-vous ?", "[À compléter : votre zone d'intervention ou votre adresse]"],
  ["Quels sont vos horaires ?", "[À compléter : vos horaires]"],
  ["Quels sont vos tarifs ?", "[À compléter : vos tarifs, ou la façon dont ils sont établis]"],
  ["Comment se déroule une première prestation ?", "[À compléter : le déroulement d'une première prestation]"],
  ["Quels moyens de paiement acceptez-vous ?", "[À compléter : les moyens de paiement acceptés]"],
];
const RIVE_SERVICES: Record<string, string> = {
  "Conseil & direction": "Pour vous qui savez ce qui ne va plus sans savoir quelle direction prendre : une ambiance et des choix clairs, avant tout achat.",
  "Aménagement d'une pièce": "Pour la pièce qui ne fonctionne plus, un salon devenu bureau, une chambre partagée : usages, circulation et matières, à l'échelle d'une pièce.",
  "Projet d'ensemble": "Pour relier plusieurs espaces autour d'une même intention, après un emménagement ou un changement de vie.",
};
const RIVE_STEPS = [
  ["Vous nous racontez", "Comment vous vivez la pièce, ce qui vous gêne, ce que vous aimez : un message suffit."],
  ["Nous convenons ensemble", "La prestation, le moment et les conditions, en toute clarté."],
  ["Nous proposons une direction", "Une intention construite à partir de vos usages, de la lumière et des matières."],
];
// [titre, texte, photo du kit (préfixe es-photo-N), texte alternatif décrit d'après l'image]
const RIVE_CHAPTERS = [
  ["Vos usages", "Qui vit dans la pièce, par où l'on passe, à quelle heure, pour quoi faire : c'est la première chose que nous vous demandons.", "es-photo-12", "Escalier en chêne clair le long d'un mur enduit, rampe en bois, fenêtre sur des arbres"],
  ["La lumière", "D'où elle vient et à quel moment elle entre : elle décide de la place des choses avant les meubles.", "es-photo-10", "Couloir vide au parquet clair, soleil qui entre par une porte-fenêtre ouverte sur le jardin"],
  ["Les matières", "Pierre, bois, tissus posés ensemble : ce sont eux qui disent si la pièce vous ressemble.", "es-photo-11", "Placard en noyer contre un mur enduit, coupe en grès posée sur l'étagère, ombres de feuillage"],
];
const RIVE_INSPIRATIONS = [
  ["Une cuisine ouverte sur le jardin", "Îlot de pierre claire, bois chaud, lumière qui entre par la baie."],
  ["Une bibliothèque avec banquette", "Des étagères en bois et un coin pour lire, face à la fenêtre."],
  ["Le choix des matières", "Pierre, chêne, noyer et tissus posés ensemble avant toute décision."],
  ["Une salle à manger sous une arche", "Table ronde en bois, suspension en papier, niche éclairée."],
];

export function curateRive(spec: ThemeSpec) {
  const contact = "/pages/contact";
  set(spec, "index", "ed-opening", { label: "Aménagement et décoration intérieure", text: p("Votre intérieur ne suit plus votre vie ? Nous partons de la façon dont vous vivez chaque pièce, de sa lumière et de ses matières, avant de proposer quoi que ce soit."), button_label: "Parler de votre projet", button_link: contact });
  set(spec, "index", "ed-statement", { label: "Notre approche", heading: "Être compris avant d'être conseillé." });
  // « Notre approche » : trois chapitres (vos usages, la lumière, les matières), illustrés par des photos du kit encore
  // inutilisées sur le site ; la section était vide faute de récit dans le projet.
  const narrative = set(spec, "index", "ref-narrative", { heading: "Ce que nous regardons d'abord" });
  if (narrative && !(narrative.block_order ?? []).length) {
    const used = JSON.stringify(spec.templates);
    const photo = (prefix: string) => Object.keys(spec.files).find((f) => f.startsWith(`${prefix}-`) && !used.includes(f));
    const chapters = RIVE_CHAPTERS.map(([title, text, prefix, alt]) => { const image = photo(prefix); return { type: "chapter", settings: { title, text: p(text), image_asset: image ?? "", image_alt: image ? alt : "", caption: "", link_label: "", link: "" } }; });
    narrative.blocks = Object.fromEntries(chapters.map((c, i) => [`c${i}`, c]));
    narrative.block_order = chapters.map((_, i) => `c${i}`);
  }
  for (const key of ["index", "page.services"]) {
    const s = set(spec, key, "services-list", { eyebrow: "Prestations", heading: key === "index" ? "Trois façons de commencer" : "Nos prestations", button_label: "Parler de votre projet", button_link: contact });
    for (const b of blocks(s)) { const text = RIVE_SERVICES[String(b.settings.title)]; if (text) b.settings = { ...b.settings, text: p(text) }; }
  }
  for (const [key, type] of [["index", "timeline"], ["page.about", "timeline"], ["page.services", "how-to"], ["page.contact", "booking"]] as const) {
    const s = sections(spec, key, type)[0];
    blocks(s).forEach((b, i) => { if (RIVE_STEPS[i]) b.settings = { ...b.settings, title: RIVE_STEPS[i][0], text: type === "booking" ? RIVE_STEPS[i][1] : p(RIVE_STEPS[i][1]) }; });
  }
  const portfolio = set(spec, "index", "portfolio", { eyebrow: "Inspirations", heading: "Des pièces pensées à partir de la lumière" });
  blocks(portfolio).forEach((b, i) => { const it = RIVE_INSPIRATIONS[i]; if (it) b.settings = { ...b.settings, title: it[0], caption: it[1], image_alt: it[0] }; });
  set(spec, "index", "ed-scene", { label: "Pièce par pièce", heading: "La lumière d'abord, les meubles ensuite" });
  // Coordonnées, horaires et équipe inconnus : sections masquées dans la démonstration (prêtes dans l'éditeur).
  for (const key of ["index", "page.contact"]) for (const s of sections(spec, key, "practical-info")) s.disabled = true;
  for (const s of sections(spec, "page.about", "team")) s.disabled = true;
  set(spec, "page.about", "about", { commit_title: "Notre point de départ", commit_text: p("Votre façon de vivre chaque pièce : ce qui vous gêne, ce que vous aimez, la lumière que vous avez.") });
  for (const key of ["index", "page.faq", "page.services"]) faq(sections(spec, key, "faq")[0], key === "page.services" ? RIVE_FAQ.slice(1) : RIVE_FAQ, RIVE_PENDING);
  set(spec, "page.services", "faq", { heading: "Bon à savoir" });
  set(spec, "index", "contact-form", { text: p("Décrivez la pièce, ce qui vous gêne et ce que vous aimeriez y faire : c'est tout ce qu'il faut pour commencer. Dans cette démonstration, aucun message n'est réellement transmis.") });
  set(spec, "page.faq", "contact-form", { text: p("Une question, un projet ? Écrivez-nous. Dans cette démonstration, aucun message n'est réellement transmis.") });
  for (const key of ["page.about", "page.services"]) set(spec, key, "cta-banner", { heading: "Parlons de votre intérieur", text: p("Un premier message suffit : la pièce, ce qui vous gêne, ce que vous aimeriez y faire."), button_label: "Parler de votre projet", button_link: contact });
  // Mentions légales d'une marque de démonstration : ce qui est vrai, sans champ inconnu affiché.
  set(spec, "page.legal", "legal-page", { updated: "21 octobre 2026", intro: p("Atelier Rive est une marque de démonstration du studio : aucune entreprise n'est exploitée sous ce nom et aucun message envoyé depuis ce site n'est transmis.") });
  spec.store.seo = { title: "Atelier Rive | Aménagement intérieur : être compris avant d'être conseillé", description: "Votre intérieur ne suit plus votre vie ? Atelier Rive part de vos usages, de la lumière et des matières : conseil, aménagement d'une pièce, projet d'ensemble." };
  // Pied de page : un intitulé « Nous trouver » sans coordonnées connues ne s'affiche pas.
  for (const sec of Object.values(spec.groups.footer?.sections ?? {})) for (const b of Object.values(sec.blocks ?? {})) {
    const strings = Object.entries(b.settings ?? {}).filter(([k, v]) => k !== "heading" && typeof v === "string" && v.trim());
    if (b.type === "contact" && !strings.length) b.disabled = true;
    // Le nom est déjà affiché à gauche : le bloc texte garde la phrase, sans répéter l'intitulé.
    if (b.type === "text") b.settings = { ...b.settings, heading: "" };
    if (b.type === "links" && b.settings?.menu === "footer") b.settings = { ...b.settings, heading: "Informations" };
  }
  // Second menu du pied : les pages déjà listées dans « Le site » et deux politiques non rédigées (qui renvoyaient
  // aux mentions légales dans l'aperçu) sont retirées ; seule la page réellement écrite reste.
  if (spec.store.menus?.footer) spec.store.menus.footer = { ...spec.store.menus.footer, links: [{ title: "Mentions légales", url: "/pages/mentions-legales" }] };
  hidePendingBlocks(spec);
}
