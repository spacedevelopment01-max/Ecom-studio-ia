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
