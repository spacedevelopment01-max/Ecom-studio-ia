/**
 * Natures mortes d'UNIVERS par famille de produits (images d'ambiance sans le produit, sans personne), décrites en
 * français concret pour la consigne du modèle d'images — demande du propriétaire après les essais réels ARVEN du
 * 16/10 (« univers de la famille accessoires » : personne, faux texte, faux logo ; puis objets hors sujet et lettres
 * en relief). Chaque scène fixe entièrement le décor :
 *  - la surface (matière, couleur, texture) et le fond (couleur, flou) ;
 *  - une LISTE FERMÉE de 3 objets au plus, chacun avec sa matière, sa couleur et sa place dans le cadre ;
 *  - la lumière (direction, douceur, moment) et le cadrage (hauteur de vue, distance, focale).
 * Aucun objet qui porte d'habitude une écriture (livre ouvert, étiquette, emballage imprimé, écran allumé) ; le bas de
 * l'image reste une surface unie (zone calme). `match` : variante propre à un type de produit (ex. une montre).
 */

export type StillLifeObject = { what: string; material: string; color: string; position: string };
export type StillLifeScene = {
  /** Variante réservée aux produits dont le nom, la catégorie ou la description correspondent. */
  match?: RegExp;
  surface: string;
  background: string;
  objects: StillLifeObject[];
  light: string;
  framing: string;
};

const O = (what: string, material: string, color: string, position: string): StillLifeObject => ({ what, material, color, position });
const FRAMING = "vue légèrement plongeante à environ 35°, prise à 60 cm, objectif 50 mm, faible profondeur de champ";

export const STILL_LIFE: Record<string, StillLifeScene[]> = {
  cosmetics: [
    {
      surface: "tablette en pierre calcaire beige clair, grain fin et mat",
      background: "mur enduit crème uni, légèrement flou",
      objects: [O("flacon compte-gouttes fermé, sans étiquette", "verre ambré", "ambre doré", "au centre"), O("serviette pliée", "lin lavé", "blanc cassé", "à gauche, au second plan"), O("galet plat", "pierre polie", "gris clair", "à droite, au second plan")],
      light: "lumière du matin douce venant de la gauche, ombres courtes et douces",
      framing: FRAMING,
    },
  ],
  beauty_tools: [
    {
      surface: "plateau rectangulaire en bois de chêne clair, surface lisse huilée",
      background: "mur blanc chaud uni, flou",
      objects: [O("brosse à cheveux ovale", "bois de hêtre et poils naturels", "bois clair", "au centre"), O("peigne", "corne", "brun moyen", "à gauche du plateau"), O("serviette roulée", "coton nid d'abeille", "beige", "à droite, au second plan")],
      light: "lumière naturelle douce de fenêtre venant de la droite, ombres légères",
      framing: FRAMING,
    },
  ],
  tech: [
    {
      surface: "bureau en noyer foncé, bois lisse mat",
      background: "mur gris anthracite uni, flou profond",
      objects: [O("carnet fermé à couverture unie", "toile", "gris ardoise", "à gauche"), O("tasse sans anse", "céramique émaillée mate", "blanc", "à droite, au second plan"), O("petite plante en pot", "feuillage vert et pot en terre cuite", "vert et ocre", "en arrière-plan à droite")],
      light: "lumière froide et douce venant de la gauche, léger liseré sur les bords",
      framing: FRAMING,
    },
  ],
  home_decor: [
    {
      surface: "console en bois de frêne clair, surface lisse",
      background: "mur couleur sable uni, flou",
      objects: [O("vase aux formes simples avec une branche d'olivier", "céramique mate", "blanc cassé", "au centre"), O("bougie épaisse éteinte", "cire", "ivoire", "à gauche"), O("plaid plié", "laine", "beige chiné", "à droite")],
      light: "lumière chaude de fin d'après-midi venant de la droite, ombres longues et douces",
      framing: FRAMING,
    },
  ],
  kitchen: [
    {
      surface: "plan de travail en bois de chêne massif, légèrement patiné",
      background: "carrelage blanc mat uni, flou",
      objects: [O("planche à découper", "bois d'olivier", "brun doré", "au centre"), O("tomates et basilic frais", "légumes", "rouge et vert", "sur la planche, à droite"), O("torchon plié", "lin", "écru à fine rayure grise", "à gauche")],
      light: "lumière du jour venant d'une fenêtre à gauche, douce et naturelle",
      framing: FRAMING,
    },
  ],
  food: [
    {
      surface: "table rustique en bois brut, veinage marqué",
      background: "mur en enduit chaulé beige, flou",
      objects: [O("bol", "grès émaillé", "bleu gris", "au centre"), O("pain de campagne entier", "pain", "croûte dorée", "à gauche, au second plan"), O("torchon froissé", "lin", "écru", "à droite")],
      light: "lumière chaude du matin venant de la gauche, ombres douces",
      framing: FRAMING,
    },
  ],
  fashion: [
    {
      surface: "table d'atelier en bois clair, surface lisse",
      background: "mur blanc chaud uni, flou",
      objects: [O("pile d'étoffes pliées", "laine et coton", "camel, crème et gris", "au centre"), O("cintre", "bois naturel", "bois clair", "à gauche"), O("bobines de fil", "coton", "camel et crème", "à droite, au second plan")],
      light: "lumière douce de fenêtre venant de la droite, ombres légères",
      framing: FRAMING,
    },
  ],
  accessories: [
    {
      // Montre (ex. ARVEN) : écrin vide et matières du bracelet, jamais une seconde montre.
      match: /montre|watch|horlog|chronograph/i,
      surface: "plateau en marbre blanc veiné de gris, poli et lisse",
      background: "mur brun chocolat uni, très flou",
      objects: [O("écrin à montre ouvert et vide, intérieur en velours", "cuir lisse cousu et velours", "cuir brun cognac, velours noir", "au centre"), O("sablier", "verre et laiton", "sable clair, laiton doré", "en arrière-plan à droite"), O("bande de cuir roulée", "cuir pleine fleur lisse", "brun cognac", "à gauche, au second plan")],
      light: "lumière chaude et douce venant de la gauche, en fin d'après-midi, reflets discrets sur le métal",
      framing: FRAMING,
    },
    {
      surface: "plateau en bois de noyer, surface lisse cirée",
      background: "mur beige uni, flou",
      objects: [O("pochette rectangulaire fermée", "cuir lisse cousu", "brun cognac", "au centre"), O("coupelle ronde", "laiton brossé", "doré", "à droite, au second plan"), O("foulard plié", "soie unie", "crème", "à gauche")],
      light: "lumière chaude et douce venant de la gauche, ombres légères",
      framing: FRAMING,
    },
  ],
  sport: [
    {
      surface: "banc en bois clair au bord d'un sentier, planches lisses",
      background: "forêt verte très floue",
      objects: [O("gourde fermée", "acier inoxydable", "vert sapin mat", "au centre"), O("serviette pliée", "coton éponge", "gris clair", "à gauche"), O("pomme", "fruit", "rouge", "à droite")],
      light: "lumière naturelle du matin venant de la droite, douce",
      framing: FRAMING,
    },
  ],
  pets: [
    {
      surface: "parquet en chêne clair, lames lisses",
      background: "mur blanc chaud uni, flou",
      objects: [O("panier rond garni d'un coussin", "osier et coton", "naturel et beige", "au centre"), O("gamelle", "céramique mate", "vert sauge", "à gauche"), O("jouet en corde nouée", "coton", "écru", "à droite")],
      light: "lumière douce de fenêtre venant de la gauche, ombres légères",
      framing: FRAMING,
    },
  ],
  toys: [
    {
      surface: "tapis de jeu en laine, uni",
      background: "mur pastel crème uni, flou",
      objects: [O("tour de cubes lisses sans motif", "bois", "naturel, sauge et terracotta", "au centre"), O("peluche lapin", "coton doux", "beige", "à gauche"), O("petite voiture", "bois", "naturel", "à droite")],
      light: "lumière douce de fenêtre venant de la droite",
      framing: FRAMING,
    },
  ],
  tools: [
    {
      surface: "établi en bois massif usé, lisse",
      background: "mur d'atelier gris clair uni, flou",
      objects: [O("rabot de menuisier", "bois et acier", "bois clair, acier brossé", "au centre"), O("copeaux de bois", "bois", "blond", "à droite"), O("équerre", "acier brossé", "gris acier", "à gauche, au second plan")],
      light: "lumière naturelle venant d'une fenêtre à gauche, ombres nettes et douces",
      framing: FRAMING,
    },
  ],
  wellness: [
    {
      surface: "rebord en pierre claire près d'une baignoire, lisse",
      background: "mur en enduit blanc chaud, flou",
      objects: [O("bougie allumée dans un pot uni", "cire et verre", "ivoire", "au centre"), O("serviette roulée", "coton", "blanc", "à gauche"), O("galets lisses empilés", "pierre", "gris clair", "à droite")],
      light: "lumière chaude et tamisée de début de soirée, venant de la droite",
      framing: FRAMING,
    },
  ],
  stationery: [
    {
      surface: "bureau en bois de chêne clair, lisse",
      background: "mur blanc cassé uni, flou",
      objects: [O("carnets fermés empilés à couverture unie", "papier kraft", "brun clair", "au centre"), O("crayons", "bois", "naturel", "à droite"), O("petit pot de pinceaux", "céramique", "blanc", "en arrière-plan à gauche")],
      light: "lumière du jour douce venant de la gauche",
      framing: FRAMING,
    },
  ],
  digital: [
    {
      surface: "bureau blanc mat, surface lisse",
      background: "mur bleu gris uni, flou",
      objects: [O("ordinateur portable fermé", "aluminium", "gris argent", "au centre"), O("tasse", "céramique mate", "blanc", "à droite"), O("plante en pot", "feuillage vert et pot en béton", "vert et gris", "en arrière-plan à gauche")],
      light: "lumière du jour douce et égale venant de la droite",
      framing: FRAMING,
    },
  ],
  generic: [
    {
      surface: "table en bois clair, surface lisse",
      background: "mur blanc chaud uni, flou",
      objects: [O("vase simple avec une branche verte", "céramique mate", "blanc", "au centre"), O("tissu plié", "lin", "beige", "à gauche"), O("coupelle", "grès", "gris clair", "à droite")],
      light: "lumière naturelle douce venant de la gauche",
      framing: FRAMING,
    },
  ],
};

/** Scène d'univers d'un produit : variante propre à son type d'abord, puis celles de sa famille (rang de la série). */
export function stillLifeFor(categoryId: string, productText: string, v = 0): StillLifeScene {
  const all = STILL_LIFE[categoryId] ?? STILL_LIFE.generic;
  const own = all.filter((s) => s.match?.test(productText));
  const pool = own.length ? own : all.filter((s) => !s.match).length ? all.filter((s) => !s.match) : STILL_LIFE.generic;
  return pool[v % pool.length];
}

/** Description française complète de la scène, pour la consigne (liste fermée, surfaces lisses, bas dégagé). */
export function stillLifeText(s: StillLifeScene): string {
  const objects = s.objects.map((o, i) => `${i + 1}) ${o.what}, en ${o.material}, ${o.color}, ${o.position}`).join(" ; ");
  return [
    `Surface : ${s.surface}. Arrière-plan : ${s.background}.`,
    `Objets, liste fermée (aucun autre objet dans l'image) : ${objects}.`,
    `Toutes les surfaces sont lisses et unies, sans gravure, sans marquage, sans motif en relief${s.objects.some((o) => /cuir/.test(o.material)) ? " ; sur le cuir, seules les coutures sont visibles" : ""}.`,
    `Lumière : ${s.light}. Cadrage : ${s.framing}.`,
  ].join(" ");
}
