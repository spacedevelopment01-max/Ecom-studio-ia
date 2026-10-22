/**
 * Rédaction des démonstrations ORBE et Atelier Rive (consigne de Thomas du 21 octobre, 19 h 50). Ces deux démonstrations
 * sont composées par le moteur à partir de l'identité du projet (comme un client) ; cette rédaction remplace ensuite les
 * textes génériques (« Chez vous », « Au fil de la journée », « Adopter … ») par des textes écrits pour la cible, sans rien
 * inventer, et masque dans les démonstrations ce qui attend une donnée inconnue (« [À compléter : …] ») : présent et
 * modifiable dans l'éditeur, jamais affiché aux visiteurs. Les compositions ne changent pas.
 */
import type { ThemeSpec, SectionInstance } from "../src/lib/theme/spec";

export const p = (s: string) => `<p>${s}</p>`;
export const PENDING = /\[(?:À compléter|To complete)/;
export type Faq = [string, string];

export function sections(spec: ThemeSpec, key: string, type: string): SectionInstance[] {
  const t = spec.templates[key];
  return t ? t.order.map((sid) => t.sections[sid]).filter((s) => s.type === type) : [];
}
/** Réglages d'une section (la n-ième de ce type dans le modèle), sans toucher aux autres. */
export function set(spec: ThemeSpec, key: string, type: string, settings: Record<string, unknown>, n = 0) {
  const s = sections(spec, key, type)[n];
  if (s) s.settings = { ...s.settings, ...settings };
  return s;
}
/** Blocs d'une section, dans l'ordre (réglages modifiables). */
export const blocks = (s: SectionInstance | undefined) => (s?.block_order ?? []).map((b) => s!.blocks![b]);
/** Questions d'une FAQ : celles de la démonstration d'abord, puis celles en attente (masquées), sans doublon. */
export function faq(s: SectionInstance | undefined, items: Faq[], pending: Faq[]) {
  if (!s) return;
  const type = blocks(s)[0]?.type ?? "question";
  const all: Faq[] = [...items, ...pending.filter(([q]) => !items.some(([x]) => x === q))];
  s.blocks = Object.fromEntries(all.map(([question, answer], i) => [`q${i}`, { type, settings: { question, answer: p(answer) }, ...(PENDING.test(answer) ? { disabled: true } : {}) }]));
  s.block_order = all.map((_, i) => `q${i}`);
  s.disabled = false;
}
/** Tout bloc qui n'attend qu'une donnée inconnue est masqué (démonstration seulement). */
export function hidePendingBlocks(spec: ThemeSpec) {
  for (const t of Object.values(spec.templates)) for (const s of Object.values(t.sections)) for (const b of Object.values(s.blocks ?? {})) if (PENDING.test(JSON.stringify(b.settings))) b.disabled = true;
}

// ─── ORBE — fiche de stratégie (consigne de Thomas du 21 octobre, 21 h 45 ; brief, hypothèse éditoriale) ─────────────
//  utilisateur et acheteur : un locataire qui aménage son appartement sans pouvoir faire de travaux ;
//  situation d'achat : il vient d'emménager, sous le plafonnier laissé par le propriétaire ;
//  tension (ses mots) : « C'est mon appartement, mais la lumière est celle du propriétaire. » ;
//  désir : se sentir chez soi ;
//  angle unique : se sentir chez soi en créant son ambiance lumineuse personnelle ;
//  promesse tenable : une lampe à poser, sans fil au plafond ni perçage, qui passe de la table du dîner au bureau ou à
//  la table de nuit, et qui part avec vous au prochain déménagement ; trois finitions ; faits = visuels et identité du
//  kit. Dimensions, matières, alimentation et livraison jamais affirmées ;
//  objections : faut-il des travaux, où la poser, quelle finition, ce que permet la démonstration ;
//  exclusions : aucune intensité, autonomie, dimension ni matière inventées.
export const ORBE_FAQ: Faq[] = [
  ["Où la poser ?", "Sur la table du dîner, un bureau, une table de nuit ou à côté d'un fauteuil : nos photos la montrent à chacun de ces endroits."],
  ["Quelle finition choisir ?", "Dune, la plus claire, pour les bois blonds et les murs clairs ; Argile, terre cuite, pour les intérieurs chauds ; Charbon, presque noire, pour les tons sombres. La silhouette est la même."],
  ["Faut-il des travaux ou l'accord du propriétaire ?", "Non : ORBE est une lampe à poser, pas un luminaire à fixer. Rien à percer ni à brancher au plafond, et elle part avec vous au prochain déménagement."],
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
  set(spec, "index", "ed-opening", { heading: "Un appartement loué. Une lumière à vous.", text: p("Le plafonnier est celui du propriétaire ; l'ambiance, elle, peut être la vôtre. Posez ORBE sur la table du dîner, le bureau ou la table de nuit : sans travaux, la pièce commence à vous ressembler."), button_label: "Voir la lampe", button_link: product });
  set(spec, "index", "ed-statement", { label: "L'idée", heading: "On ne choisit pas toujours son plafonnier. On choisit sa lumière." });
  set(spec, "index", "ed-finishes", { label: "Finitions", heading: "Trois finitions, pour votre intérieur", text: p("Dune pour les bois clairs, Argile pour les tons chauds, Charbon pour les intérieurs sombres : choisissez celle qui va avec vos meubles, pas avec les murs du propriétaire."), button_label: "Choisir sa finition" });
  set(spec, "index", "ed-scene", { label: "Chez vous, pièce par pièce", heading: "Du dîner à la lecture, votre lumière vous suit", text: p("Sur la table du dîner, puis sur le bureau ou la table de nuit : la lampe passe d'une pièce à l'autre, et chaque pièce devient un peu plus la vôtre.") });
  set(spec, "index", "ed-diptych", { label: "Deux coins à vous", heading: "Près d'un fauteuil, sur une table de chevet" });
  faq(sections(spec, "index", "v2-faq")[0], ORBE_FAQ, ORBE_PENDING);
  for (const key of ["index", "page.about"]) set(spec, key, "cta-banner", { heading: "Ce soir, faites entrer votre lumière", text: p("Dune, Argile ou Charbon : choisissez la finition qui ira avec vos meubles, et qui déménagera avec vous."), button_label: "Choisir sa finition", button_link: product });
  // Notre histoire : pourquoi une lampe à poser.
  const about = sections(spec, "page.about", "rich-text")[0];
  for (const b of blocks(about)) {
    if (b.type === "heading") b.settings = { ...b.settings, text: "Une lumière à vous, même en location" };
    if (b.type === "text") b.settings = { ...b.settings, text: p("ORBE est née d'un constat simple : quand on loue, on ne choisit ni le plafonnier ni l'éclairage. Une lampe posée crée un îlot de lumière là où l'on vit le soir, change de place le lendemain, et part avec vous au prochain déménagement.") };
  }
  set(spec, "page.about", "image-with-text", { heading: "Pourquoi une lampe à poser", text: p("Parce qu'elle ne demande ni travaux ni fil au plafond, ni l'accord de personne : elle se pose sur une table, un bureau ou une table de nuit. Trois finitions, Dune, Argile et Charbon, pour la même silhouette arrondie.") });
  // FAQ, fiche et page de livraison.
  faq(sections(spec, "page.faq", "faq")[0], ORBE_FAQ, ORBE_PENDING);
  set(spec, "page.faq", "contact-form", { heading: "Une question avant de choisir ?", text: p("Écrivez-nous : le formulaire vérifie les champs avant l'envoi. Dans cette démonstration, aucun message n'est réellement transmis.") });
  set(spec, "page.contact", "contact-form", { text: p("Une question sur la lampe ou ses finitions ? Écrivez-nous. Dans cette démonstration, aucun message n'est réellement transmis.") });
  const shipping = sections(spec, "page.shipping", "rich-text")[0];
  for (const b of blocks(shipping)) if (b.type === "text") { b.settings = { ...b.settings, text: p("Boutique de démonstration : aucune commande n'est expédiée ni remboursée. Les délais, frais et conditions de retour de la marque ne sont pas encore renseignés.") }; b.disabled = false; }
  for (const key of Object.keys(spec.templates).filter((k) => k === "product" || k.startsWith("product."))) {
    const mp = sections(spec, key, "main-product")[0];
    for (const b of blocks(mp)) if (b.type === "text") b.settings = { ...b.settings, text: p("Pour se sentir chez soi, même en location : ORBE se pose sur la table du dîner, le bureau ou la table de nuit, sans travaux. Trois finitions : Dune, Argile et Charbon.") };
    set(spec, key, "ed-scene", { label: "Sans travaux", heading: "Du dîner à la table de nuit", text: p("Une lampe à poser, pas à fixer : elle quitte la table du dîner pour le bureau ou la table de nuit, et partira avec vous au prochain déménagement.") });
    faq(sections(spec, key, "faq")[0], ORBE_FAQ, ORBE_PENDING);
  }
  // Politiques (CGV, confidentialité, remboursement) non rédigées : liens masqués dans la démonstration, où ils
  // menaient à une page introuvable ; le réglage reste disponible dans l'éditeur.
  for (const sec of Object.values(spec.groups.footer?.sections ?? {})) if (sec.type === "footer") sec.settings = { ...sec.settings, show_policies: false };
  spec.store.seo = { title: "ORBE | Lampe à poser : une lumière à vous, même en location", description: "Le plafonnier est celui du propriétaire ? La lampe ORBE se pose sans travaux sur la table, le bureau ou la table de nuit. Trois finitions : Dune, Argile, Charbon." };
  hidePendingBlocks(spec);
}

// ─── Atelier Rive — fiche de stratégie (consigne de Thomas, 21 octobre 2026, 21 h 45) ────────────────────────────────
// Site de services complet : toute l'activité et les trois prestations, avec une identité rédactionnelle forte. Les
// campagnes ciblées (une situation, une cible) vivent dans les publications et les publicités, pas sur le site.
//  1. utilisateur et acheteur : l'ensemble des clients des prestations, la même personne qui vit les lieux et qui fait
//     appel à l'atelier (logement ou petit espace professionnel, d'après le positionnement du projet) ;
//  2. situation : un emménagement, une pièce qui ne suit plus les usages, plusieurs espaces à relier ;
//  3. tension : « Je sais ce qui ne va plus, pas ce qu'il faudrait faire, ni quelle prestation demander. » ;
//  4. désir et angle unique : un intérieur adapté à sa façon de vivre ;
//  5. promesse tenable : partir des usages, de la lumière et des matières (positionnement déclaré) ; trois prestations
//     décrites d'après le projet ; un parcours de contact en trois étapes. Tarifs, délais, zone, horaires, équipe et
//     réalisations réelles non renseignés : jamais inventés ;
//  6. objections : quelle prestation choisir, par où commencer, faut-il savoir ce que l'on veut, un espace
//     professionnel est-il possible, que mettre dans le premier message, ce que permet la démonstration.
export const RIVE_FAQ: Faq[] = [
  ["Quelle prestation choisir ?", "Conseil & direction si vous cherchez une direction avant d'acheter. Aménagement d'une pièce pour une pièce qui ne suit plus vos usages. Projet d'ensemble pour plusieurs espaces à relier. En cas de doute, décrivez votre projet : la prestation se choisit ensemble."],
  ["Par où commence-t-on ?", "Par un message : les lieux concernés, ce qui vous gêne et ce que vous aimeriez y faire. Le formulaire de contact suffit pour démarrer."],
  ["Faut-il savoir ce que l'on veut ?", "Non. Dire ce qui ne va plus suffit : la direction se construit à partir de vos usages, de la lumière et des matières."],
  ["Intervenez-vous pour un espace professionnel ?", "Oui, pour un petit espace professionnel comme pour la maison. La démarche est la même : partir de la façon dont on vit et travaille dans les lieux."],
  ["Ce site est-il actif ?", "C'est une démonstration : aucun message n'est réellement transmis. Les tarifs, les délais, la zone d'intervention et les horaires ne sont pas encore renseignés."],
];
const RIVE_PENDING: Faq[] = [
  ["Où intervenez-vous ?", "[À compléter : votre zone d'intervention ou votre adresse]"],
  ["Quels sont vos horaires ?", "[À compléter : vos horaires]"],
  ["Quels sont vos tarifs ?", "[À compléter : vos tarifs, ou la façon dont ils sont établis]"],
  ["Quels sont les délais ?", "[À compléter : le délai d'un premier rendez-vous et la durée d'une prestation]"],
  ["Comment se déroule une première prestation ?", "[À compléter : le déroulement d'une première prestation]"],
  ["Quels moyens de paiement acceptez-vous ?", "[À compléter : les moyens de paiement acceptés]"],
];
const RIVE_SERVICES: Record<string, string> = {
  "Conseil & direction": "Pour vous qui savez ce qui ne va plus sans savoir quelle direction prendre. Nous précisons ensemble l'ambiance et les choix qui donneront une direction à votre intérieur, avant tout achat.",
  "Aménagement d'une pièce": "Pour une pièce qui ne suit plus vos usages : un salon où l'on travaille aussi, une chambre partagée, une entrée qui déborde. Usages, circulation et matières sont organisés à l'échelle de cette pièce.",
  "Projet d'ensemble": "Pour plusieurs espaces à relier, après un emménagement ou un changement de vie, chez vous ou dans un petit lieu professionnel : une même intention d'une pièce à l'autre.",
};
const RIVE_STEPS = [
  ["Vous décrivez votre projet", "Par le formulaire de contact : les lieux concernés, ce qui vous gêne, ce que vous aimeriez y faire, et la prestation qui vous semble la bonne si vous le savez déjà."],
  ["Nous convenons ensemble", "La prestation qui répond à votre projet, le moment et les conditions, clairement, avant de commencer."],
  ["Nous proposons une direction", "Construite à partir de vos usages, de la lumière et des matières de vos pièces."],
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
  const cta = "Décrire mon projet";
  set(spec, "index", "ed-opening", { label: "Aménagement et décoration intérieure", heading: "Un intérieur à votre façon de vivre.", text: p("Conseil, aménagement d'une pièce ou projet d'ensemble : nous partons de la façon dont vous vivez les lieux, de leur lumière et de leurs matières, avant de proposer quoi que ce soit."), button_label: cta, button_link: contact });
  set(spec, "index", "ed-statement", { label: "Notre approche", heading: "Votre quotidien d'abord. La décoration ensuite." });
  // En-tête : le bouton dit ce que l'on fait en cliquant.
  for (const sec of Object.values(spec.groups.header?.sections ?? {})) if (sec.type === "header" && sec.settings?.cta_label) sec.settings = { ...sec.settings, cta_label: cta, cta_link: contact };
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
    const s = set(spec, key, "services-list", { eyebrow: "Prestations", heading: key === "index" ? "Trois prestations, selon l'ampleur de votre projet" : "Trois prestations, une même question : comment vivez-vous ces lieux ?", text: p("Vous hésitez entre deux ? Décrivez votre projet : la prestation se choisit ensemble."), button_label: cta, button_link: contact });
    for (const b of blocks(s)) { const text = RIVE_SERVICES[String(b.settings.title)]; if (text) b.settings = { ...b.settings, text: p(text), ...(b.settings.button_label ? { button_label: cta } : {}) }; }
  }
  for (const [key, type] of [["index", "timeline"], ["page.about", "timeline"], ["page.services", "how-to"], ["page.contact", "booking"]] as const) {
    const s = sections(spec, key, type)[0];
    blocks(s).forEach((b, i) => { if (RIVE_STEPS[i]) b.settings = { ...b.settings, title: RIVE_STEPS[i][0], text: type === "booking" ? RIVE_STEPS[i][1] : p(RIVE_STEPS[i][1]) }; });
    if (s && type !== "booking") s.settings = { ...s.settings, heading: "Du premier message à la direction proposée", ...(s.settings?.button_label ? { button_label: cta, button_link: contact } : {}) };
  }
  // Contact : ce qu'il faut écrire et ce qui se passe ensuite, sans promesse de délai de réponse.
  set(spec, "page.contact", "booking", { heading: "Décrivez votre projet", text: p("Trois informations suffisent pour commencer : les lieux concernés, ce qui vous gêne, ce que vous aimeriez y faire. Dans cette démonstration, aucun message n'est réellement transmis.") });
  const portfolio = set(spec, "index", "portfolio", { eyebrow: "Inspirations", heading: "Des pièces pensées pour ceux qui les vivent" });
  blocks(portfolio).forEach((b, i) => { const it = RIVE_INSPIRATIONS[i]; if (it) b.settings = { ...b.settings, title: it[0], caption: it[1], image_alt: it[0] }; });
  set(spec, "index", "ed-scene", { label: "Pour qui", heading: "Chez vous, ou dans un petit espace professionnel", text: p("Un logement à réorganiser, une pièce à repenser, un lieu de travail à rendre plus juste : la démarche reste la même, partir de la façon dont on y vit.") });
  // Coordonnées, horaires et équipe inconnus : sections masquées dans la démonstration (prêtes dans l'éditeur).
  for (const key of ["index", "page.contact"]) for (const s of sections(spec, key, "practical-info")) s.disabled = true;
  for (const s of sections(spec, "page.about", "team")) s.disabled = true;
  set(spec, "page.about", "about", { heading: "Un intérieur se pense à partir de ceux qui y vivent", lead: p("Atelier Rive accompagne l'aménagement et la décoration intérieure, pour la maison comme pour un petit espace professionnel. Chaque prestation part de la même question : comment vivez-vous ces lieux ?"), commit_title: "Notre point de départ", commit_text: p("Votre façon de vivre chaque pièce : ce qui vous gêne, ce que vous aimez, la lumière que vous avez."), button_label: "Voir les trois prestations" });
  for (const key of ["index", "page.faq", "page.services"]) faq(sections(spec, key, "faq")[0], key === "page.faq" ? RIVE_FAQ : RIVE_FAQ.filter(([q]) => q !== "Par où commence-t-on ?"), RIVE_PENDING);
  set(spec, "page.services", "faq", { heading: "Bon à savoir" });
  set(spec, "index", "contact-form", { heading: "Et si l'on commençait par votre projet ?", text: p("Les lieux concernés, ce qui vous gêne, ce que vous aimeriez y faire : c'est tout ce qu'il faut pour commencer. Dans cette démonstration, aucun message n'est réellement transmis.") });
  set(spec, "page.faq", "contact-form", { text: p("Une question, un projet ? Écrivez-nous. Dans cette démonstration, aucun message n'est réellement transmis.") });
  for (const key of ["page.about", "page.services"]) set(spec, key, "cta-banner", { heading: "Un projet, même encore flou ?", text: p("Décrivez les lieux, ce qui vous gêne et ce que vous aimeriez y faire : la prestation se choisit ensemble."), button_label: cta, button_link: contact });
  // Mentions légales d'une marque de démonstration : ce qui est vrai, sans champ inconnu affiché.
  set(spec, "page.legal", "legal-page", { updated: "21 octobre 2026", intro: p("Atelier Rive est une marque de démonstration du studio : aucune entreprise n'est exploitée sous ce nom et aucun message envoyé depuis ce site n'est transmis.") });
  spec.store.seo = { title: "Atelier Rive | Aménagement intérieur adapté à votre façon de vivre", description: "Conseil, aménagement d'une pièce ou projet d'ensemble : Atelier Rive part de vos usages, de la lumière et des matières. Décrivez votre projet." };
  const pageSeo: Record<string, { title: string; description: string }> = {
    prestations: { title: "Prestations d'aménagement et de décoration | Atelier Rive", description: "Conseil & direction, aménagement d'une pièce, projet d'ensemble : trois prestations qui partent de votre façon de vivre les lieux." },
    "a-propos": { title: "À propos | Atelier Rive, aménagement intérieur", description: "Atelier Rive accompagne l'aménagement et la décoration intérieure, pour la maison comme pour un petit espace professionnel." },
    contact: { title: "Décrire votre projet | Atelier Rive", description: "Les lieux concernés, ce qui vous gêne, ce que vous aimeriez y faire : trois informations pour commencer avec Atelier Rive." },
    faq: { title: "Questions fréquentes | Atelier Rive", description: "Quelle prestation choisir, par où commencer, espaces professionnels : les réponses avant votre premier message." },
  };
  for (const pg of spec.store.pages ?? []) if (pageSeo[pg.handle]) pg.seo = pageSeo[pg.handle];
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
