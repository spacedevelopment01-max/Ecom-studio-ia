/**
 * Thème unique du Studio (lot 4, référence partie 15) — module « achat » : ses pièces nouvelles (ACHAT_SECTIONS) et les
 * façons de bâtir ajoutées à des pièces d'autres modules (ACHAT_FACONS : identifiant de la pièce → ses constructions,
 * la première étant le rendu d'origine). Feuille : public/sections/tenue-achat.css. Règles : docs/sina-savoir/sections-a-tenue.md.
 *
 * Les six styles de page produit (simple, vente directe, haut de gamme, technique, alimentaire et soin, mode) ont chacun
 * leur façon de bâtir le bloc d'achat : même balisage, même prix, même stock, même bouton. Ce qu'un style demande et que
 * le bloc ne porte pas (pastilles de taille et de couleur, guide des tailles, offres par quantité, pictos) est une pièce
 * à part, à poser juste sous le bloc : le bloc d'achat reste intact. Les textes d'exemple sont neutres ; ce que le
 * dossier ne donne pas s'écrit « [À compléter : …] ». Gratuit, sans IA.
 */
import { ph, sec, type Construction, type TenueSection } from "./tenue-base";

const A = (go?: string) => `href="#" onclick="return false"${go ? ` data-go="${go}"` : ""}`;
const M = (what?: string) => `[À compléter${what ? ` : ${what}` : ""}]`;
/** Pastille d'une option : un bouton radio caché dans son étiquette (aucun script) ; « teinte » : une couleur à montrer. */
const PASTILLE = (group: string, label: string, o: { on?: boolean; teinte?: string } = {}) => `<label${o.teinte ? ` style="--teinte:${o.teinte}"` : ""}><input type="radio" name="${group}"${o.on ? " checked" : ""}><span>${label}</span></label>`;
/** Offre par quantité : la quantité, le prix du lot, la remise. */
const LOT = (on = false) => `<li><label><input type="radio" name="tn-lot"${on ? " checked" : ""}><b>${M("quantité")}</b><span>${M("prix du lot")}</span><em>${M("remise")}</em></label></li>`;
/** Carte d'un produit du look : même balisage que les cartes du socle. */
const CARTE = (file: string, name: string) => `<a class="tn-carte-p" ${A("product")}><div class="tn-ph" ${ph(file)}></div><b>${name}</b><span>${M("prix")}</span></a>`;
const TRAIT = (d: string) => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
const PICTO = {
  feuille: TRAIT(`<path d="M5 19c0-8 5-13 14-14 0 9-5 14-14 14z"/><path d="M5 19 13 11"/>`),
  goutte: TRAIT(`<path d="M12 3.5c3.4 4 5.5 6.9 5.5 9.9a5.5 5.5 0 0 1-11 0c0-3 2.1-5.9 5.5-9.9z"/>`),
  flacon: TRAIT(`<path d="M9.5 3.5h5V7l2 2.5v9a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2v-9L9.5 7z"/><path d="M7.5 13h9"/>`),
  horloge: TRAIT(`<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>`),
};
const REPERE = (svg: string, name: string, what: string) => `<li>${svg}<b>${name}</b><span>${M(what)}</span></li>`;
const TAILLE = () => `<tr><th>${M("taille")}</th><td>${M()}</td><td>${M()}</td><td>${M()}</td></tr>`;

export const ACHAT_SECTIONS: TenueSection[] = [
  sec({
    id: "tn-versions", title: "Tailles et couleurs en pastilles", kind: "Choix de la version · fiche produit", role: "produit",
    does: "Les vraies versions du produit en pastilles larges, à poser juste sous le bloc d'achat : une rangée par option (la couleur en ronds de couleur, la taille en boutons), une version épuisée barrée. Jamais une liste déroulante. La couleur peut être choisie d'avance, la taille jamais. Seulement si le produit a de vraies options au catalogue ; dans la boutique, chaque pastille choisit la version du bloc d'achat.",
    constructions: [{ key: "pastilles", label: "une rangée par option : des ronds de couleur avec leur nom, des boutons larges pour les tailles" }, { key: "lignes", label: "une ligne par option : le nom de l'option à gauche, ses boutons à droite, des filets entre les lignes" }],
    trait: { fond: "clair", densite: "moyenne", photos: 0, hauteur: 220 }, data: "les options et les variantes du produit au catalogue (noms, valeurs, stock)", anim: "Une pastille touchée se marque comme choisie.",
    html: `<section class="tn tn-versions" data-tn-versions><div class="tn-groupe-v tn-couleurs"><small>Couleur</small><div class="tn-choix-v">${PASTILLE("tn-v-1", M("couleur"), { on: true, teinte: "var(--tn-accent)" })}${PASTILLE("tn-v-1", M("couleur"), { teinte: "var(--tn-encre)" })}</div></div><div class="tn-groupe-v"><small>Taille</small><div class="tn-choix-v">${PASTILLE("tn-v-2", M("taille"))}${PASTILLE("tn-v-2", M("taille"))}${PASTILLE("tn-v-2", M("taille"))}</div></div></section>`,
  }),
  sec({
    id: "tn-guide-tailles", title: "Guide des tailles", kind: "Tailles · fiche produit", role: "produit", only: "vêtements, chaussures et accessoires à taille",
    does: "Le tableau des tailles propre à ce produit, comment prendre ses mesures, et la taille portée sur la photo. À poser sous les pastilles de taille. Les tailles viennent du catalogue ; chaque mesure vient du client : tant qu'il ne l'a pas donnée, elle s'écrit « [À compléter] », jamais un tableau standard recopié.",
    constructions: [{ key: "tableau", label: "le titre, le tableau des tailles ouvert, puis comment se mesurer en trois lignes" }, { key: "tiroir", label: "une seule ligne « Guide des tailles » à toucher : le tableau et les conseils s'ouvrent dessous" }],
    trait: { fond: "clair", densite: "dense", photos: 0, hauteur: 560 }, data: "les tailles du produit au catalogue ; les mesures données par le client", anim: "Dans la construction en tiroir, le guide s'ouvre au toucher.",
    html: `<section class="tn tn-guide-tailles" data-tn-guide-tailles><label class="tn-declic"><input type="checkbox">Guide des tailles</label><div class="tn-guide"><h2>Trouver ta taille.</h2><p class="tn-chapo">Prends tes mesures sur toi, sans serrer, puis lis la ligne qui te correspond.</p><div class="tn-table-g"><table><thead><tr><th>Taille</th><th>Tour de poitrine</th><th>Tour de taille</th><th>Tour de hanches</th></tr></thead><tbody>${TAILLE()}${TAILLE()}${TAILLE()}</tbody></table></div><ol><li><b>Poitrine</b><span>Passe le mètre à l'endroit le plus fort, bien à plat dans le dos.</span></li><li><b>Taille</b><span>Au creux, là où le buste se plie.</span></li><li><b>Hanches</b><span>À l'endroit le plus large, pieds joints.</span></li></ol><p class="tn-note">Sur la photo&nbsp;: ${M("taille de la personne et taille portée")}</p></div></section>`,
  }),
  sec({
    id: "tn-lots", title: "Offres par quantité", kind: "Offre · fiche produit", role: "produit",
    does: "La vraie offre par quantité du client, bien visible juste sous le bloc d'achat : une carte par quantité, avec le prix du lot, le prix à l'unité et l'économie en pourcentage. Seulement si le client a saisi une offre par quantité ; sans elle, la pièce ne se pose pas. Jamais de prix barré inventé, jamais de « plus que quelques-uns », jamais de minuteur.",
    constructions: [{ key: "cartes", label: "une carte par quantité, côte à côte, la remise sur une étiquette en haut de la carte" }, { key: "lignes", label: "une ligne par quantité : un rond à cocher, la quantité, puis le prix à droite" }],
    trait: { fond: "clair", densite: "moyenne", photos: 0, hauteur: 300 }, data: "l'offre par quantité saisie par le client et le prix du produit", anim: "Une offre touchée se marque comme choisie.",
    html: `<section class="tn tn-lots" data-tn-lots><h2>Le prix selon la quantité.</h2><ul>${LOT(true)}${LOT()}${LOT()}</ul></section>`,
  }),
  sec({
    id: "tn-looks", title: "Le look complet", kind: "Produits associés · fiche produit", role: "produit", authentic: "la photo du look porté ou composé",
    does: "Le produit montré dans un look, avec les autres vrais produits du catalogue qui le composent : une grande photo du look, puis chaque pièce avec sa vraie photo, son nom et son vrai prix, qui mène à sa fiche. Pour la mode et la décoration. La photo du look est celle du client ; les pièces sont des produits du catalogue, jamais inventés. Demande au moins deux produits au catalogue.",
    constructions: [{ key: "photo-et-liste", label: "la grande photo du look, puis une ligne par pièce : sa photo, son nom, son prix (la liste à droite sur grand écran)" }, { key: "bande", label: "la photo du look en bandeau, puis les pièces en cartes côte à côte dessous" }],
    trait: { fond: "clair", densite: "moyenne", photos: 4, hauteur: 760 }, data: "les autres produits du catalogue (photo, nom, prix)",
    html: `<section class="tn tn-looks" data-tn-looks><h2>Le look complet.</h2><p class="tn-chapo">Les pièces qui vont avec, à retrouver dans la boutique.</p><div class="tn-look"><div class="tn-ph tn-cadre" ${ph("md-j2.webp")}></div><div class="tn-cartes">${CARTE("md-o1.webp", "La chemise")}${CARTE("md-o3.webp", "Le pantalon")}${CARTE("md-o5.webp", "Les sandales")}</div></div></section>`,
  }),
  sec({
    id: "tn-allergenes", title: "Allergènes", kind: "Sécurité · fiche produit", role: "produit", only: "aliments, boissons, compléments alimentaires et cosmétiques",
    does: "Ce que la loi et le bon sens demandent de dire avant l'achat : les allergènes présents, les traces possibles, et ce que le produit ne contient pas quand le client peut le prouver. Juste après la composition. Tout vient de l'étiquette du client : rien n'est déduit ni inventé, une ligne sans information s'écrit « [À compléter] ».",
    constructions: [{ key: "lignes", label: "le titre, puis une ligne par sujet, séparées par des filets" }, { key: "encadre", label: "un encadré au trait épais, comme la mention au dos d'un paquet, les allergènes en gras" }],
    trait: { fond: "clair", densite: "moyenne", photos: 0, hauteur: 330 }, data: "la liste des allergènes donnée par le client",
    html: `<section class="tn tn-allergenes"><h2>Allergènes.</h2><ul><li><b>Contient</b><span>${M("allergènes présents")}</span></li><li><b>Traces possibles</b><span>${M("allergènes en traces")}</span></li><li><b>Ne contient pas</b><span>${M("seulement ce que tu peux prouver")}</span></li></ul><p class="tn-note">Un doute, une allergie sévère&nbsp;? <a ${A("contact")}>Écris-nous avant de commander.</a></p></section>`,
  }),
  sec({
    id: "tn-avant-apres-produit", title: "Avant et après, avec le produit", kind: "Preuves · fiche produit", role: "produit", pour: "produits", authentic: "tes photos avant et après",
    does: "Deux vraies photos prises dans les mêmes conditions : avant d'utiliser le produit, puis après. Dessous, la durée et la fréquence d'utilisation. Les photos sont celles du client ou de ses clients, avec leur accord écrit, jamais créées ni retouchées ; la durée et la fréquence s'écrivent « [À compléter] » tant qu'il ne les a pas données. Aucune promesse de résultat.",
    constructions: [{ key: "cote-a-cote", label: "les deux photos côte à côte, de même taille, chacune avec son étiquette" }, { key: "apres-en-grand", label: "la photo « après » en grand, la photo « avant » en vignette posée sur son coin" }],
    trait: { fond: "clair", densite: "aérée", photos: 2, hauteur: 560 },
    html: `<section class="tn tn-avant-apres-produit"><h2>Avant, après.</h2><p class="tn-chapo">Le même endroit, la même lumière, à deux moments.</p><div class="tn-paire"><figure class="tn-avant"><div class="tn-ph" ${ph("md-z1.webp")}></div><figcaption>Avant</figcaption></figure><figure class="tn-apres"><div class="tn-ph" ${ph("md-b1.webp")}></div><figcaption>Après</figcaption></figure></div><ul><li><span>Durée d'utilisation</span><b>${M("durée")}</b></li><li><span>Fréquence</span><b>${M("fréquence")}</b></li></ul><p class="tn-note">Les résultats varient d'une personne à l'autre.</p></section>`,
  }),
  sec({
    id: "tn-pictos", title: "Repères en pictos", kind: "Repères · fiche produit", role: "produit",
    does: "Quatre repères du produit dits d'un coup d'œil, chacun avec son petit dessin au trait : l'origine, la composition, la contenance, la conservation. Sous le bloc d'achat d'un produit alimentaire ou de soin. Chaque repère est un fait de l'étiquette du client : celui qu'il n'a pas donné s'écrit « [À compléter] » ; jamais un label ni une mention qu'il ne peut pas prouver.",
    constructions: [{ key: "rangee", label: "les pictos dans des ronds, côte à côte, le nom et le fait centrés dessous" }, { key: "liste", label: "une ligne par repère : le picto à gauche, le nom et le fait à droite" }],
    trait: { fond: "clair", densite: "moyenne", photos: 0, hauteur: 330 }, data: "les faits de l'étiquette donnés par le client",
    html: `<section class="tn tn-pictos"><h2>En un coup d'œil.</h2><ul>${REPERE(PICTO.feuille, "Origine", "origine")}${REPERE(PICTO.goutte, "Composition", "ce qui le compose, en quelques mots")}${REPERE(PICTO.flacon, "Contenance", "contenance")}${REPERE(PICTO.horloge, "Conservation", "durée après ouverture")}</ul></section>`,
  }),
];

/** Rendu d'origine d'une pièce, sous une clé que rien ne cible. */
const o = (key: string, label: string): Construction => ({ key, label });

export const ACHAT_FACONS: Record<string, Construction[]> = {
  // Le bloc d'achat : une façon par style de page produit. « simple » est le rendu d'origine.
  "tn-achat": [
    o("simple", "la photo et ses vignettes d'abord, puis le nom, le prix, la phrase et le bouton ; sur grand écran, la photo à gauche et l'achat à droite"),
    { key: "vente-directe", label: "achat serré : photo compacte, prix en grand, puis dans une carte la livraison et les retours cochés et un gros bouton ; la phrase vient après" },
    { key: "grandes-photos", label: "très grandes photos d'un bord à l'autre, à faire glisser (en colonne sur grand écran) ; l'achat étroit, discret et centré" },
    { key: "technique", label: "le nom en tête, la photo bordée avec ses vignettes en colonne sur grand écran ; le prix, la version et les repères rangés dans des cases bordées" },
    { key: "fond-doux", label: "le produit entier posé sur un grand fond de couleur douce, les vignettes en ronds ; le nom, la phrase, le prix et le bouton centrés" },
    { key: "portrait", label: "une grande photo en hauteur d'un bord à l'autre, les autres vues en bande à faire glisser ; le nom et le prix sur une même ligne, la version en pastille large" },
  ],
  // La description (racine « tn-volets », écrite « sans-titre » dans son balisage : cette clé reste son rendu d'origine).
  "tn-description": [
    o("sans-titre", "des volets l'un sous l'autre, sans titre, le premier ouvert"),
    { key: "encadre", label: "un encadré bordé : le titre en haut, les volets dedans, séparés par des filets fins" },
    { key: "numeros", label: "chaque volet porte un grand numéro de couleur ; sur grand écran, le titre à gauche et les volets à droite" },
  ],
  "tn-echelle": [
    o("regle", "la photo bordée d'une règle dessinée, sa légende, puis les dimensions en colonnes"),
    { key: "carte-a-cheval", label: "la photo en grand d'un bord à l'autre, sans règle ; les dimensions dans une carte posée à cheval sur son bas" },
  ],
  "tn-valeurs": [
    o("etiquette", "une étiquette bordée, comme au dos d'un paquet"),
    { key: "bandes", label: "sans cadre : le titre en grand, puis un tableau à bandes de couleur douce, une ligne sur deux" },
  ],
  "tn-grade": [
    o("sceau", "la note dans un sceau penché, puis le titre, les critères en lignes et le volet"),
    { key: "bandeau", label: "une bande sombre d'un bord à l'autre avec la note en très grand, puis les critères en colonnes" },
  ],
  "tn-effets": [
    o("frise", "une frise : une pastille par étape, qui se remplit (debout sur téléphone, couchée sur grand écran)"),
    { key: "cartes", label: "une carte par étape, de plus en plus colorée, l'échéance en très grand" },
  ],
  "tn-cout": [
    o("cases", "deux ou trois grands chiffres dans des cases bordées, côte à côte"),
    { key: "panneau-sombre", label: "un panneau sombre, une ligne par chiffre : le nom à gauche, le chiffre en très grand à droite" },
  ],
  "tn-ration": [
    o("lignes", "une ligne par gabarit : la gamelle qui grandit, le poids, la ration à droite"),
    { key: "cartes", label: "une carte par gabarit, deux de front (quatre sur grand écran), la gamelle au centre, la ration en grand" },
  ],
  "tn-transition": [
    o("barres", "une barre debout par jour, la part du nouvel aliment qui monte"),
    { key: "lignes", label: "une ligne par jour : le jour à gauche, une barre couchée dont la couleur avance de jour en jour" },
  ],
  "tn-semis": [
    o("bandes", "une ligne par période, une bande de couleur sur les douze mois"),
    { key: "panneau-sombre", label: "le calendrier dans un panneau sombre : les douze mois en cases, les bandes en clair et en couleur" },
  ],
  "tn-essayer": [
    o("photo-puis-liste", "le titre, la photo dans le cadre de la marque, les façons d'essayer en lignes, le bouton (la photo à gauche sur grand écran)"),
    { key: "carte", label: "une carte de couleur douce : la photo en bandeau en haut, les façons d'essayer et le bouton dedans (la photo à droite sur grand écran)" },
  ],
  "tn-comparatif": [
    o("lignes", "le critère au-dessus, une valeur par produit, des filets entre les critères"),
    { key: "colonne-vedette", label: "des colonnes : le premier produit dans une colonne de couleur sombre, les autres à côté sur fond doux" },
  ],
};
