/**
 * Natures mortes d'UNIVERS par famille de produits (images d'ambiance sans le produit, sans personne), rédigées en
 * phrases complètes selon la STRUCTURE de la consigne écrite par le propriétaire et réussie à l'essai réel ARVEN v4
 * (16/10/2026) :
 *  1. type de photo, format, point de vue, cadrage ;
 *  2. surface et fond (part de l'image, flou) ;
 *  3. un paragraphe par objet : position exacte, matière, couleur, forme, état, ce qu'il ne comporte pas (un
 *     contenant qui pourrait appeler le produit est dit VIDE : « aucune montre, aucun cadran… ») ;
 *  4. « La scène contient exactement N objets : … » ;
 *  5. zone dégagée (là où la mise en page placera le texte) ;
 *  6. lumière, ombres, reflets, textures, mise au point, ambiance ;
 *  7. phrase finale : aucun texte, aucune lettre… aucun objet supplémentaire ; + négatif technique (`exclude`).
 * Le produit n'est jamais nommé ni décrit (essai v3 : « écrin à montre » + « acier poli » ont fait inventer une
 * montre) ; aucun objet qui porte d'habitude une écriture (livre ouvert, étiquette, emballage, écran allumé).
 */

export type StillLifeObject = {
  /** Nom court, repris dans « La scène contient exactement N objets : … ». */
  name: string;
  /** Paragraphe complet : position, matière, couleur, forme, état, ce que l'objet ne comporte pas. */
  text: string;
};
export type StillLifeScene = {
  /** Variante réservée aux produits dont le nom, la catégorie ou la description correspondent. */
  match?: RegExp;
  /** Point de vue et cadrage (ex. « Vue de face légèrement plongeante, cadrage rapproché. »). */
  view: string;
  /** Surface et fond, avec la part de l'image et le flou. */
  setting: string;
  objects: StillLifeObject[];
  /** Surface visible dans la zone dégagée (« de marbre », « de bois clair »…). */
  clearSurface: string;
  /** Objet principal, devant lequel la zone reste dégagée (« l'écrin »). */
  main: string;
  /** Lumière, ombres, reflets, textures, mise au point, ambiance. */
  light: string;
  /** Négatif technique propre à la scène (anglais) : le produit lui-même, jamais dessiné. */
  exclude?: string;
};

const VIEW = "Vue de face légèrement plongeante, cadrage rapproché.";

export const STILL_LIFE: Record<string, StillLifeScene[]> = {
  cosmetics: [
    {
      view: VIEW,
      setting: "La scène se déroule sur une tablette en pierre calcaire beige clair, au grain fin et mat. Un mur enduit crème uni occupe le tiers supérieur de l’image, légèrement flou.",
      objects: [
        { name: "le vase", text: "Au centre, légèrement décalé vers la gauche, se trouve un petit vase cylindrique en céramique mate blanche, lisse et sans décor. Il contient trois brins d’eucalyptus aux feuilles vert sauge." },
        { name: "la serviette", text: "À l’arrière-plan à droite, une serviette en lin blanc cassé est pliée en carré, ses bords légèrement froissés. Elle ne comporte ni broderie ni étiquette." },
        { name: "le galet", text: "À droite du vase, un galet plat en pierre polie gris clair repose sur la tablette, lisse et sans aucune inscription." },
      ],
      clearSurface: "de pierre claire",
      main: "le vase",
      light: "Lumière naturelle du matin, douce, venant de la gauche. Ombres courtes et délicates vers la droite, texture du lin et grain de la pierre réalistes. Mise au point précise sur le vase, arrière-plan légèrement adouci. Ambiance fraîche, calme et soignée, rendu photographique naturel.",
      exclude: "skincare bottle, cream jar, cosmetic tube, serum dropper, perfume bottle, packaging",
    },
  ],
  beauty_tools: [
    {
      view: VIEW,
      setting: "La scène se déroule sur un plateau rectangulaire en bois de chêne clair, à la surface lisse et huilée. Un mur blanc chaud uni occupe le tiers supérieur de l’image, légèrement flou.",
      objects: [
        { name: "la serviette roulée", text: "Au centre, une serviette en coton nid d’abeille beige est roulée serrée et posée à plat sur le plateau. Elle ne comporte ni broderie ni étiquette." },
        { name: "les galets", text: "À l’arrière-plan à gauche, trois galets lisses en pierre gris clair sont empilés du plus grand au plus petit." },
        { name: "la plante", text: "À l’arrière-plan à droite, une petite plante verte aux feuilles rondes pousse dans un pot en céramique blanche mate, sans décor." },
      ],
      clearSurface: "de bois clair",
      main: "la serviette",
      light: "Lumière naturelle douce de fenêtre venant de la droite. Ombres légères vers la gauche, texture du coton et veinage du bois réalistes. Mise au point précise sur la serviette, arrière-plan légèrement adouci. Ambiance douce et apaisante, rendu photographique naturel.",
      exclude: "hair brush, comb, hair dryer, hair straightener, makeup brush, beauty device",
    },
  ],
  tech: [
    {
      view: VIEW,
      setting: "La scène se déroule sur un bureau en noyer foncé, au bois lisse et mat. Un mur gris anthracite uni occupe le tiers supérieur de l’image, très flou.",
      objects: [
        { name: "le carnet", text: "Au centre, légèrement décalé vers la gauche, un carnet fermé à couverture en toile gris ardoise est posé à plat. Sa couverture est unie, sans titre ni marquage." },
        { name: "la tasse", text: "À droite du carnet, une tasse sans anse en céramique émaillée blanche mate, vide, est posée sur le bureau." },
        { name: "la plante", text: "À l’arrière-plan à droite, une petite plante verte pousse dans un pot en terre cuite ocre, sans décor." },
      ],
      clearSurface: "de bois foncé",
      main: "le carnet",
      light: "Lumière froide et douce venant de la gauche, avec un léger liseré lumineux sur les bords des objets. Ombres nettes et douces vers la droite, grain de la toile et texture du bois réalistes. Mise au point précise sur le carnet, arrière-plan adouci. Ambiance précise, moderne et sobre, rendu photographique naturel.",
      exclude: "headphones, earbuds, smartphone, tablet, speaker, smartwatch, electronic device, gadget, screen",
    },
  ],
  home_decor: [
    {
      view: VIEW,
      setting: "La scène se déroule sur une console en bois de frêne clair, à la surface lisse. Un mur couleur sable uni occupe le tiers supérieur de l’image, légèrement flou.",
      objects: [
        { name: "la bougie", text: "Au centre, une bougie épaisse en cire ivoire, éteinte, se dresse sur la console. Elle ne comporte ni étiquette ni décor." },
        { name: "la branche d’olivier", text: "À gauche de la bougie, une branche d’olivier aux feuilles vert argenté est posée à plat sur le bois." },
        { name: "le plaid", text: "À l’arrière-plan à droite, un plaid en laine beige chiné est plié en trois, ses franges courtes bien visibles." },
      ],
      clearSurface: "de bois clair",
      main: "la bougie",
      light: "Lumière chaude de fin d’après-midi venant de la droite. Ombres longues et douces vers la gauche, texture de la laine et de la cire réalistes. Mise au point précise sur la bougie, arrière-plan légèrement adouci. Ambiance chaleureuse et paisible, rendu photographique naturel.",
    },
  ],
  kitchen: [
    {
      view: VIEW,
      setting: "La scène se déroule sur un plan de travail en bois de chêne massif, légèrement patiné. Un carrelage blanc mat uni occupe le tiers supérieur de l’image, légèrement flou.",
      objects: [
        { name: "les tomates", text: "Au centre, trois tomates rouges bien mûres, avec leur pédoncule vert, sont posées en petit groupe sur le bois." },
        { name: "le basilic", text: "À gauche des tomates, un bouquet de basilic frais aux feuilles vert vif est posé à plat." },
        { name: "le torchon", text: "À l’arrière-plan à droite, un torchon en lin écru à fines rayures grises est plié en carré. Il ne comporte ni broderie ni étiquette." },
      ],
      clearSurface: "de bois",
      main: "les tomates",
      light: "Lumière du jour venant d’une fenêtre à gauche, douce et naturelle. Ombres délicates vers la droite, peau brillante des tomates et texture du lin réalistes. Mise au point précise sur les tomates, arrière-plan légèrement adouci. Ambiance fraîche et gourmande, rendu photographique naturel.",
      exclude: "kitchen appliance, pan, pot, knife, kitchen utensil set",
    },
  ],
  food: [
    {
      view: VIEW,
      setting: "La scène se déroule sur une table rustique en bois brut au veinage marqué. Un mur en enduit chaulé beige occupe le tiers supérieur de l’image, légèrement flou.",
      objects: [
        { name: "le bol", text: "Au centre, un bol en grès émaillé bleu gris, vide, est posé sur la table. Il ne comporte aucun motif." },
        { name: "le torchon", text: "À droite du bol, un torchon en lin écru froissé est posé en vague sur la table, sans broderie ni étiquette." },
        { name: "les brins de blé", text: "À l’arrière-plan à gauche, quelques brins de blé doré sont posés en éventail sur le bois." },
      ],
      clearSurface: "de bois",
      main: "le bol",
      light: "Lumière chaude du matin venant de la gauche. Ombres douces vers la droite, grain du grès et du bois réalistes. Mise au point précise sur le bol, arrière-plan légèrement adouci. Ambiance simple, généreuse et authentique, rendu photographique naturel.",
      exclude: "packaged food, jar with label, bottle with label, packaging",
    },
  ],
  fashion: [
    {
      view: VIEW,
      setting: "La scène se déroule sur une table d’atelier en bois clair, à la surface lisse. Un mur blanc chaud uni occupe le tiers supérieur de l’image, légèrement flou.",
      objects: [
        { name: "la pile d’étoffes", text: "Au centre, une pile de trois étoffes pliées, en laine camel, en coton crème et en lin gris, est posée bien droite. Les étoffes sont unies, sans étiquette." },
        { name: "le cintre", text: "À l’arrière-plan à gauche, un cintre en bois naturel, vide, est posé à plat sur la table." },
        { name: "les bobines de fil", text: "À droite de la pile, deux bobines de fil en bois, l’une camel et l’autre crème, sont posées debout." },
      ],
      clearSurface: "de bois clair",
      main: "la pile d’étoffes",
      light: "Lumière douce de fenêtre venant de la droite. Ombres légères vers la gauche, texture des fibres et du bois réalistes. Mise au point précise sur la pile d’étoffes, arrière-plan légèrement adouci. Ambiance soignée et élégante, rendu photographique naturel.",
      exclude: "garment worn, mannequin, clothing label, shoes",
    },
  ],
  accessories: [
    {
      // Montre (ex. ARVEN) : consigne rédigée par le propriétaire, réussie à l'essai réel v4 du 16/10/2026.
      match: /montre|watch|horlog|chronograph/i,
      view: VIEW,
      setting: "La scène se déroule sur une surface en marbre blanc poli, parcourue de fines veines grises naturelles. Un fond uni brun chocolat chaud occupe le tiers supérieur de l’image, légèrement flou.",
      objects: [
        {
          name: "l’écrin ouvert avec son coussin vide",
          text: "Au premier plan, au centre et légèrement décalé vers la droite, se trouve un écrin rond en cuir cognac, avec de fines coutures ton sur ton sur son pourtour. Sa base cylindrique repose à plat sur le marbre. Son couvercle circulaire est ouvert, relevé presque verticalement vers l’arrière, laissant voir sa doublure en velours noir.\n\nL’intérieur de la base contient uniquement un coussin de velours noir mat, bien visible, entièrement nu et intact. L’écrin ne contient aucun objet : aucune montre, aucun cadran, aucun bracelet, aucun bijou, aucune pièce métallique. Le velours forme une surface continue et naturelle, sans empreinte ni silhouette de produit.",
        },
        { name: "le sablier", text: "À l’arrière-plan à droite, un grand sablier vertical en verre transparent et laiton doré patiné. Il possède deux plateaux circulaires reliés par de fines colonnes métalliques. Du sable beige clair est visible dans les deux ampoules. Son sommet arrive près du bord supérieur de l’image." },
        { name: "le rouleau de cuir", text: "À l’arrière-plan à gauche, une large bande de cuir cognac est enroulée à plat en une spirale serrée, dont les couches sont bien visibles. Elle est légèrement coupée par le bord gauche du cadrage. Elle ne comporte ni boucle ni accessoire." },
      ],
      clearSurface: "de marbre",
      main: "l’écrin",
      light: "Éclairage chaud et doux venant du haut à gauche, comme une lumière de fin d’après-midi. Ombres délicates vers la droite, reflets dorés subtils sur le laiton, grain du cuir et texture du velours réalistes. Mise au point précise sur l’écrin, arrière-plan légèrement adouci. Ambiance élégante, sobre et chaleureuse, rendu photographique naturel.",
      exclude: "watch, wristwatch, clock, clock face, dial, watch hands, chronograph, timepiece, jewelry, ring, bracelet",
    },
    {
      view: VIEW,
      setting: "La scène se déroule sur un plateau en bois de noyer, à la surface lisse et cirée. Un mur beige uni occupe le tiers supérieur de l’image, légèrement flou.",
      objects: [
        { name: "la coupelle vide", text: "Au centre, une coupelle ronde et peu profonde en laiton brossé doré est posée sur le plateau. Elle est vide : aucun bijou, aucune bague, aucun objet à l’intérieur." },
        { name: "le foulard", text: "À l’arrière-plan à gauche, un foulard en soie unie crème est plié en triangle, sans motif ni étiquette." },
        { name: "la branche séchée", text: "À l’arrière-plan à droite, une fine branche séchée aux tons beige est posée en diagonale sur le bois." },
      ],
      clearSurface: "de bois",
      main: "la coupelle",
      light: "Lumière chaude et douce venant de la gauche. Ombres légères vers la droite, reflets dorés subtils sur le laiton, texture de la soie réaliste. Mise au point précise sur la coupelle, arrière-plan légèrement adouci. Ambiance élégante et sobre, rendu photographique naturel.",
      exclude: "jewelry, ring, necklace, earring, bag, handbag, wallet, sunglasses, belt, watch",
    },
  ],
  sport: [
    {
      view: VIEW,
      setting: "La scène se déroule sur un banc en bois clair aux planches lisses, au bord d’un sentier. Une forêt verte occupe la moitié supérieure de l’image, très floue.",
      objects: [
        { name: "la serviette", text: "Au centre, une serviette en coton éponge gris clair est pliée en rectangle, sans broderie ni étiquette." },
        { name: "la pomme", text: "À droite de la serviette, une pomme rouge brillante est posée sur le bois." },
        { name: "la pomme de pin", text: "À l’arrière-plan à gauche, une pomme de pin brune est posée au bord du banc." },
      ],
      clearSurface: "de bois clair",
      main: "la serviette",
      light: "Lumière naturelle du matin venant de la droite, douce et fraîche. Ombres légères vers la gauche, texture de l’éponge et du bois réalistes. Mise au point précise sur la serviette, forêt très adoucie. Ambiance vivifiante et naturelle, rendu photographique naturel.",
      exclude: "water bottle, sneakers, sports equipment, dumbbell, yoga mat",
    },
  ],
  pets: [
    {
      view: VIEW,
      setting: "La scène se déroule sur un parquet en chêne clair aux lames lisses. Un mur blanc chaud uni occupe le tiers supérieur de l’image, légèrement flou.",
      objects: [
        { name: "le coussin", text: "Au centre, un coussin rond et moelleux en coton beige est posé sur le parquet, vide, sans motif ni étiquette." },
        { name: "la gamelle vide", text: "À droite du coussin, une gamelle en céramique mate vert sauge est posée sur le sol. Elle est vide et sans aucune inscription." },
        { name: "le jouet en corde", text: "À l’arrière-plan à gauche, un jouet en corde de coton écru, noué aux deux bouts, est posé sur le parquet." },
      ],
      clearSurface: "de parquet",
      main: "le coussin",
      light: "Lumière douce de fenêtre venant de la gauche. Ombres légères vers la droite, texture du coton et du bois réalistes. Mise au point précise sur le coussin, arrière-plan légèrement adouci. Ambiance douce et chaleureuse, rendu photographique naturel.",
      exclude: "dog, cat, animal, pet, leash, collar",
    },
  ],
  toys: [
    {
      view: VIEW,
      setting: "La scène se déroule sur un tapis de jeu en laine crème, uni. Un mur pastel crème uni occupe le tiers supérieur de l’image, légèrement flou.",
      objects: [
        { name: "la tour de cubes", text: "Au centre, une tour de quatre cubes en bois lisse, naturels, vert sauge et terracotta, est empilée bien droite. Les cubes ne portent aucune lettre, aucun chiffre et aucun motif." },
        { name: "la balle", text: "À gauche de la tour, une petite balle en laine feutrée beige est posée sur le tapis." },
        { name: "le panier", text: "À l’arrière-plan à droite, un panier rond en osier naturel est posé, vide." },
      ],
      clearSurface: "de tapis",
      main: "la tour de cubes",
      light: "Lumière douce de fenêtre venant de la droite. Ombres légères vers la gauche, texture de la laine et du bois réalistes. Mise au point précise sur la tour de cubes, arrière-plan légèrement adouci. Ambiance tendre et rassurante, rendu photographique naturel.",
      exclude: "toy, plush toy, doll, toy car, child",
    },
  ],
  tools: [
    {
      view: VIEW,
      setting: "La scène se déroule sur un établi en bois massif, usé et lisse. Un mur d’atelier gris clair uni occupe le tiers supérieur de l’image, légèrement flou.",
      objects: [
        { name: "les copeaux de bois", text: "Au centre, un petit tas de copeaux de bois blond, fins et bouclés, repose sur l’établi." },
        { name: "la planche", text: "À l’arrière-plan à gauche, une planche de bois brut rabotée est posée à plat, sans aucun marquage." },
        { name: "le pot en terre", text: "À l’arrière-plan à droite, un pot en terre cuite ocre, vide, est posé sur l’établi." },
      ],
      clearSurface: "de bois",
      main: "les copeaux",
      light: "Lumière naturelle venant d’une fenêtre à gauche. Ombres nettes et douces vers la droite, texture du bois réaliste. Mise au point précise sur les copeaux, arrière-plan légèrement adouci. Ambiance artisanale et authentique, rendu photographique naturel.",
      exclude: "tool, hammer, screwdriver, drill, saw, wrench, power tool, knife",
    },
  ],
  wellness: [
    {
      view: VIEW,
      setting: "La scène se déroule sur un rebord en pierre claire, lisse, près d’une baignoire. Un mur en enduit blanc chaud occupe le tiers supérieur de l’image, légèrement flou.",
      objects: [
        { name: "la bougie allumée", text: "Au centre, une bougie allumée brûle dans un pot en verre uni, sans étiquette ni décor, à la flamme douce et dorée." },
        { name: "la serviette roulée", text: "À gauche de la bougie, une serviette en coton blanc est roulée serrée, sans broderie." },
        { name: "les galets", text: "À l’arrière-plan à droite, trois galets lisses gris clair sont empilés." },
      ],
      clearSurface: "de pierre claire",
      main: "la bougie",
      light: "Lumière chaude et tamisée de début de soirée, venant de la droite, avec la lueur de la flamme. Ombres douces, texture du coton et de la pierre réalistes. Mise au point précise sur la bougie, arrière-plan adouci. Ambiance calme et réconfortante, rendu photographique naturel.",
      exclude: "bottle with label, cosmetic packaging, supplement jar, pills",
    },
  ],
  stationery: [
    {
      view: VIEW,
      setting: "La scène se déroule sur un bureau en bois de chêne clair, à la surface lisse. Un mur blanc cassé uni occupe le tiers supérieur de l’image, légèrement flou.",
      objects: [
        { name: "la feuille vierge", text: "Au centre, une feuille de papier épais blanc cassé, entièrement vierge, est posée à plat sur le bureau." },
        { name: "les crayons", text: "À droite de la feuille, deux crayons en bois naturel, sans marquage, sont posés côte à côte." },
        { name: "le pot", text: "À l’arrière-plan à gauche, un petit pot en céramique blanche mate est posé, vide." },
      ],
      clearSurface: "de bois clair",
      main: "la feuille",
      light: "Lumière du jour douce venant de la gauche. Ombres légères vers la droite, texture du papier et du bois réalistes. Mise au point précise sur la feuille, arrière-plan légèrement adouci. Ambiance studieuse et sereine, rendu photographique naturel.",
      exclude: "notebook, book, writing, handwriting, printed paper, pen with logo",
    },
  ],
  digital: [
    {
      view: VIEW,
      setting: "La scène se déroule sur un bureau blanc mat, à la surface lisse. Un mur bleu gris uni occupe le tiers supérieur de l’image, légèrement flou.",
      objects: [
        { name: "la tasse", text: "Au centre, une tasse en céramique blanche mate, vide, est posée sur le bureau, sans aucune inscription." },
        { name: "la plante", text: "À l’arrière-plan à gauche, une plante verte aux feuilles allongées pousse dans un pot en béton gris." },
        { name: "la lampe éteinte", text: "À l’arrière-plan à droite, une lampe de bureau en métal gris, éteinte, se dresse sur son pied." },
      ],
      clearSurface: "de bureau blanc",
      main: "la tasse",
      light: "Lumière du jour douce et égale venant de la droite. Ombres légères vers la gauche, textures de la céramique et du béton réalistes. Mise au point précise sur la tasse, arrière-plan légèrement adouci. Ambiance claire et concentrée, rendu photographique naturel.",
      exclude: "screen, laptop screen, smartphone, interface, dashboard, monitor",
    },
  ],
  generic: [
    {
      view: VIEW,
      setting: "La scène se déroule sur une table en bois clair, à la surface lisse. Un mur blanc chaud uni occupe le tiers supérieur de l’image, légèrement flou.",
      objects: [
        { name: "le vase", text: "Au centre, un vase simple en céramique blanche mate, sans décor, contient une branche verte." },
        { name: "le tissu plié", text: "À gauche du vase, un tissu en lin beige est plié en carré, sans motif ni étiquette." },
        { name: "la coupelle vide", text: "À l’arrière-plan à droite, une coupelle en grès gris clair est posée, vide." },
      ],
      clearSurface: "de bois clair",
      main: "le vase",
      light: "Lumière naturelle douce venant de la gauche. Ombres légères vers la droite, textures réalistes. Mise au point précise sur le vase, arrière-plan légèrement adouci. Ambiance simple et soignée, rendu photographique naturel.",
    },
  ],
};

/** Scène d'univers d'un produit : variante propre à son type d'abord, puis celles de sa famille (rang de la série). */
export function stillLifeFor(categoryId: string, productText: string, v = 0): StillLifeScene {
  const all = STILL_LIFE[categoryId] ?? STILL_LIFE.generic;
  const own = all.filter((s) => s.match?.test(productText));
  const rest = all.filter((s) => !s.match);
  const pool = own.length ? own : rest.length ? rest : STILL_LIFE.generic;
  return pool[v % pool.length];
}

const COUNT = ["zéro", "un", "deux", "trois", "quatre"];
const orientation = (aspect: string) => {
  const [w, h] = aspect.split(":").map(Number);
  return !w || !h || w === h ? "carré" : w > h ? "horizontal" : "vertical";
};
/** Zone dégagée selon la mise en page qui utilisera l'image (le bas pour une image verticale). */
function clearZone(zone: string, s: StillLifeScene): string {
  if (zone === "none") return "";
  if (zone === "bottom") return `Le bas de l’image laisse une zone dégagée ${s.clearSurface} devant ${s.main}.`;
  if (zone === "top") return "Le haut de l’image laisse une zone dégagée et unie au-dessus des objets.";
  if (zone === "left") return `Le côté gauche de l’image laisse une zone dégagée ${s.clearSurface}, sans aucun objet.`;
  if (zone === "right") return `Le côté droit de l’image laisse une zone dégagée ${s.clearSurface}, sans aucun objet.`;
  return `Une zone dégagée ${s.clearSurface} reste autour des objets.`;
}

/** Phrase finale de toute nature morte (consigne du propriétaire). */
export const STILL_LIFE_END = "Aucun texte, aucune lettre, aucun chiffre, aucune gravure, aucun logo, aucun filigrane, aucune personne. Aucun objet supplémentaire.";

/** Consigne française complète de la nature morte, selon la structure du propriétaire (un paragraphe par partie). */
export function stillLifePrompt(s: StillLifeScene, o: { aspect: string; zone: string; correction?: string | null }): string {
  const n = s.objects.length;
  const names = s.objects.map((x) => x.name);
  const list = n > 1 ? `${names.slice(0, -1).join(", ")} et ${names[n - 1]}` : names[0];
  return [
    `Photographie de nature morte haut de gamme, photoréaliste, au format ${orientation(o.aspect)} ${o.aspect}. ${s.view}`,
    s.setting,
    ...s.objects.map((x) => x.text),
    `La scène contient exactement ${COUNT[n] ?? n} objets : ${list}. ${clearZone(o.zone, s)}`.trim(),
    s.light,
    o.correction ? `Correction pour cet essai : ${o.correction}` : "",
    STILL_LIFE_END,
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** Phrase finale d'une photo du VRAI produit : ses inscriptions réelles restent (jamais de contradiction). */
export const PRODUCT_SCENE_END = "Rien d’autre n’apparaît sur l’image : aucun texte, aucune lettre, aucun chiffre, aucune gravure, aucun logo, aucun filigrane, aucune personne, en dehors de ce qui figure déjà sur le produit de la référence. Aucun objet supplémentaire.";

/**
 * Photo du VRAI produit (photo de référence jointe), même structure que la consigne du propriétaire : type de photo et
 * cadrage ; surface et fond de la famille ; le produit dans son paragraphe (place, fidélité, produit ENTIER) ; « La scène
 * contient exactement un objet » ; zone dégagée ; lumière ; phrase finale. Aucun accessoire : rien de vague.
 */
export function productScenePromptFr(s: Pick<StillLifeScene, "view" | "setting" | "clearSurface">, o: { aspect: string; zone: string; mood: string; correction?: string | null }): string {
  const zone = clearZone(o.zone, { ...s, main: "le produit" } as StillLifeScene);
  return [
    `Photographie publicitaire haut de gamme, photoréaliste, au format ${orientation(o.aspect)} ${o.aspect}. ${s.view}`,
    s.setting,
    "Au centre de l’image se trouve le produit de l’image de référence, reproduit exactement à l’identique : même forme, mêmes proportions, mêmes matières, mêmes couleurs, mêmes détails et mêmes inscriptions que sur la référence, vu sous le même angle. Il n’est ni redessiné, ni recoloré, ni simplifié. Le produit est entier dans le cadre : aucune partie coupée, cachée ou manquante (pour une montre : le bracelet complet, ses deux brins et la boucle). Il repose naturellement sur la surface, à sa taille réelle, avec une vraie ombre de contact.",
    `La scène contient exactement un objet : le produit de la référence. ${zone}`.trim(),
    `Éclairage doux et naturel venant de la gauche. Ombre de contact réaliste sous le produit, reflets justes sur ses matières. Mise au point précise sur le produit, arrière-plan légèrement adouci. Ambiance : ${o.mood} ; rendu photographique naturel.`,
    o.correction ? `Correction pour cet essai : ${o.correction}` : "",
    PRODUCT_SCENE_END,
  ]
    .filter(Boolean)
    .join("\n\n");
}
