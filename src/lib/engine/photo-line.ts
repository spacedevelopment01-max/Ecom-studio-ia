/**
 * « Ligne photographique » de la marque : le moodboard écrit d'un directeur artistique, dérivé de la piste créative
 * choisie (direction de la boutique, piste de logo retenue, palette), du secteur et de la cible.
 * Lumière (source, direction, qualité, température, moment), matières, décors, accessoires cohérents avec la cible,
 * cadrage (focale, angle, profondeur de champ), palette, saison, étalonnage, clichés à éviter.
 *
 * Elle est réutilisée PARTOUT pour que toutes les images aient l'air d'une même campagne :
 *  - consignes des images générées (briefs IA, repli sans IA, ambiances des entreprises de services) ;
 *  - rendus locaux (choix des mises en scène, couleurs du mur et du plateau, côté de la lumière, étalonnage) ;
 *  - visuels avec texte (fond, encre, accent, mode de mise en page).
 * Fonctions pures et déterministes (testables, sans coût IA). Le produit réel n'est JAMAIS redessiné : la ligne
 * ne décrit que l'environnement, la lumière et la prise de vue.
 */
import type { DirectionId, BrandPalette } from "../theme/directions";
import { colorName, contrast, ensureContrast, hsl, isDark, mix, withLightness } from "../color";
import type { SceneStyle } from "../media/compose";

type T = { fr: string; en: string };
const t = (fr: string, en: string): T => ({ fr, en });

export type LightQuality = "soft" | "hard" | "lowkey";
export type CreativeMode = "tonal" | "deep" | "light";

/** Préréglage d'humeur photographique, par direction artistique. */
type Mood = {
  name: T;
  light: { source: T; quality: LightQuality; from: "left" | "right"; kelvin: number; time: T };
  materials: T[];
  sets: T[];
  framing: { focal: string; angle: T; dof: T; composition: T };
  grade: { tone: "warm" | "cool" | "neutral"; contrast: "low" | "medium" | "high"; grain: number; words: T };
  scenes: [SceneStyle, SceneStyle, SceneStyle];
  creative: CreativeMode;
};

const MOODS: Record<DirectionId, Mood> = {
  atelier: {
    name: t("Lumière de fin de matinée, matières nobles", "Late-morning light, noble materials"),
    light: { source: t("grande fenêtre diffusée par un voilage", "large window diffused through sheer linen"), quality: "soft", from: "left", kelvin: 4800, time: t("fin de matinée", "late morning") },
    materials: [t("travertin clair", "pale travertine"), t("lin ivoire", "ivory linen"), t("chêne blond", "light oak")],
    sets: [t("mur enduit à la chaux, ivoire", "ivory limewashed plaster wall"), t("console en pierre dans un appartement haussmannien", "stone console in a Parisian apartment")],
    framing: { focal: "85mm", angle: t("à hauteur du produit, légèrement au-dessus (10°)", "at product height, slightly above (10°)"), dof: t("f/4 : produit net, fond fondu", "f/4: product sharp, background melting"), composition: t("produit sur le tiers gauche, grand espace négatif à droite", "product on the left third, generous negative space on the right") },
    grade: { tone: "warm", contrast: "low", grain: 0.03, words: t("tons crème, noirs légèrement levés, contraste doux", "creamy tones, slightly lifted blacks, soft contrast") },
    scenes: ["window", "everyday", "studio"],
    creative: "light",
  },
  galerie: {
    name: t("Silence de galerie, lumière zénithale", "Gallery silence, overhead daylight"),
    light: { source: t("verrière zénithale, lumière du jour diffuse", "overhead skylight, diffuse daylight"), quality: "soft", from: "left", kelvin: 5600, time: t("milieu de journée", "midday") },
    materials: [t("plâtre blanc mat", "matte white plaster"), t("béton ciré clair", "pale polished concrete"), t("bois de frêne", "ash wood")],
    sets: [t("socle d'exposition blanc dans une salle épurée", "white plinth in a bare exhibition room"), t("étagère murale fine dans un intérieur minimal", "thin wall shelf in a minimal interior")],
    framing: { focal: "100mm", angle: t("de face, à hauteur du produit", "straight on, at product height"), dof: t("f/8 : tout est net, lignes tenues", "f/8: everything sharp, clean lines"), composition: t("produit centré bas, beaucoup d'air au-dessus", "product low and centered, lots of air above") },
    grade: { tone: "neutral", contrast: "medium", grain: 0.02, words: t("blancs propres, gris neutres, peu de saturation", "clean whites, neutral greys, restrained saturation") },
    scenes: ["studio", "arch", "window"],
    creative: "light",
  },
  joaillerie: {
    name: t("Clair-obscur intime", "Intimate chiaroscuro"),
    light: { source: t("boîte à lumière étroite, contre-jour doux", "narrow strip softbox with a gentle backlight"), quality: "lowkey", from: "right", kelvin: 4300, time: t("soirée", "evening") },
    materials: [t("velours gris perle", "pearl-grey velvet"), t("pierre sombre polie", "dark polished stone"), t("soie mate", "matte silk")],
    sets: [t("fond gris perle profond", "deep pearl-grey backdrop"), t("coiffeuse en noyer dans une chambre feutrée", "walnut dressing table in a hushed bedroom")],
    framing: { focal: "100mm macro", angle: t("trois-quarts, légèrement au-dessus", "three-quarter, slightly above"), dof: t("f/5,6 : produit ciselé, arrière-plan noyé", "f/5.6: product crisp, background falling to black"), composition: t("produit au centre, halo de lumière autour", "product centered in a pool of light") },
    grade: { tone: "warm", contrast: "high", grain: 0.02, words: t("noirs profonds, reflets dorés, peau satinée", "deep blacks, golden highlights, satin sheen") },
    scenes: ["spotlight", "studio", "window"],
    creative: "deep",
  },
  clinique: {
    name: t("Clarté de laboratoire lumineux", "Bright, clinical clarity"),
    light: { source: t("grande source diffuse en surplomb, réflecteur blanc", "large overhead diffuse source with a white bounce"), quality: "soft", from: "left", kelvin: 5600, time: t("matin lumineux", "bright morning") },
    materials: [t("céramique blanche", "white ceramic"), t("verre dépoli", "frosted glass"), t("aluminium brossé", "brushed aluminium")],
    sets: [t("salle de bain blanche et nette", "crisp white bathroom"), t("plan de travail clair et dégagé", "clean pale countertop")],
    framing: { focal: "90mm", angle: t("de face, à hauteur du produit", "straight on, at product height"), dof: t("f/8 : netteté de bout en bout", "f/8: sharp front to back"), composition: t("produit centré, symétrie", "product centered, symmetrical") },
    grade: { tone: "cool", contrast: "medium", grain: 0.015, words: t("blancs purs, ombres grises légères", "pure whites, light grey shadows") },
    scenes: ["studio", "window", "podium"],
    creative: "light",
  },
  terroir: {
    name: t("Lumière d'atelier, matières brutes", "Workshop light, raw materials"),
    light: { source: t("fenêtre latérale, soleil bas filtré", "side window, low filtered sun"), quality: "soft", from: "left", kelvin: 4000, time: t("fin d'après-midi", "late afternoon") },
    materials: [t("bois de chêne huilé", "oiled oak wood"), t("lin écru", "unbleached linen"), t("terre cuite", "terracotta")],
    sets: [t("table de ferme dans une cuisine en pierre", "farmhouse table in a stone kitchen"), t("établi d'atelier, mur chaulé", "workshop bench against a limewashed wall")],
    framing: { focal: "50mm", angle: t("trois-quarts, légèrement au-dessus", "three-quarter, slightly above"), dof: t("f/2,8 : produit net, matières douces derrière", "f/2.8: product sharp, soft textures behind"), composition: t("produit sur le tiers gauche, matières en premier plan flou", "product on the left third, blurred textures in the foreground") },
    grade: { tone: "warm", contrast: "low", grain: 0.04, words: t("tons de terre, ambre doux, grain argentique", "earthy tones, soft amber, film grain") },
    scenes: ["everyday", "window", "studio"],
    creative: "tonal",
  },
  gourmand: {
    name: t("Plein soleil gourmand", "Sun-drenched and generous"),
    light: { source: t("soleil direct, ombres franches de feuillage", "direct sun with crisp foliage shadows"), quality: "hard", from: "left", kelvin: 5200, time: t("début d'après-midi d'été", "early summer afternoon") },
    materials: [t("carreaux de céramique émaillée", "glazed ceramic tiles"), t("bois peint", "painted wood"), t("lin rayé", "striped linen")],
    sets: [t("table de terrasse ensoleillée sous une treille", "sunny terrace table under a vine"), t("plan de travail de cuisine carrelé, fenêtre ouverte", "tiled kitchen counter by an open window")],
    framing: { focal: "50mm", angle: t("trois-quarts, légèrement au-dessus (15°)", "three-quarter, slightly above (15°)"), dof: t("f/4 : produit net, arrière-plan reconnaissable", "f/4: product sharp, background still readable"), composition: t("produit sur le tiers droit, ombres graphiques à gauche", "product on the right third, graphic shadows on the left") },
    grade: { tone: "warm", contrast: "high", grain: 0.025, words: t("couleurs franches, ombres nettes, chaleur d'été", "vivid colours, crisp shadows, summer warmth") },
    scenes: ["window", "everyday", "color"],
    creative: "deep",
  },
  pop: {
    name: t("Papier couleur et soleil franc", "Colour paper and hard sun"),
    light: { source: t("soleil direct ou flash nu, ombre portée nette", "direct sun or bare flash, crisp cast shadow"), quality: "hard", from: "left", kelvin: 5500, time: t("milieu de journée", "midday") },
    materials: [t("papier de fond coloré mat", "matte coloured seamless paper"), t("plastique laqué", "glossy lacquered plastic"), t("mousse douce", "soft foam")],
    sets: [t("fond papier ton sur ton avec la couleur du produit", "tone-on-tone seamless paper matching the product colour"), t("blocs géométriques colorés", "colour-blocked geometric shapes")],
    framing: { focal: "70mm", angle: t("de face, légèrement en plongée", "straight on, slightly from above"), dof: t("f/8 : net partout, rendu graphique", "f/8: sharp throughout, graphic look"), composition: t("produit centré, ombre portée qui dessine une forme", "product centered, its cast shadow drawing a shape") },
    grade: { tone: "neutral", contrast: "high", grain: 0.02, words: t("aplats saturés, ombres nettes, rendu graphique", "saturated flat colours, crisp shadows, graphic finish") },
    scenes: ["color", "split", "window"],
    creative: "tonal",
  },
  nocturne: {
    name: t("Heure bleue et lueurs", "Blue hour and glow"),
    light: { source: t("lumière froide du crépuscule, liseré chaud en contre-jour", "cool dusk light with a warm rim from behind"), quality: "lowkey", from: "right", kelvin: 6500, time: t("heure bleue", "blue hour") },
    materials: [t("pierre sombre", "dark stone"), t("métal anodisé", "anodised metal"), t("verre fumé", "smoked glass")],
    sets: [t("rebord de terrasse au crépuscule, horizon flou", "terrace ledge at dusk, blurred horizon"), t("intérieur sombre, une seule lampe chaude", "dark interior lit by a single warm lamp")],
    framing: { focal: "85mm", angle: t("à hauteur du produit, légère contre-plongée", "at product height, slight low angle"), dof: t("f/2 : produit net, lumières de fond en bokeh", "f/2: product sharp, background lights as bokeh"), composition: t("produit sur le tiers gauche, lueur dans le fond à droite", "product on the left third, glow in the background on the right") },
    grade: { tone: "cool", contrast: "high", grain: 0.03, words: t("bleus profonds, accents ambrés, noirs denses", "deep blues, amber accents, dense blacks") },
    scenes: ["spotlight", "color", "studio"],
    creative: "deep",
  },
  brut: {
    name: t("Béton et flash dur", "Concrete and hard flash"),
    light: { source: t("flash direct, ombre dure", "direct hard flash, hard shadow"), quality: "hard", from: "right", kelvin: 5600, time: t("nuit urbaine", "urban night") },
    materials: [t("béton brut", "raw concrete"), t("acier galvanisé", "galvanised steel"), t("asphalte", "asphalt")],
    sets: [t("muret de béton en ville", "concrete wall in the city"), t("parking souterrain épuré", "stripped-back underground car park")],
    framing: { focal: "35mm", angle: t("légère contre-plongée, cadrage serré", "slight low angle, tight crop"), dof: t("f/8 : net, dur, sans flou", "f/8: sharp, hard, no blur"), composition: t("produit décentré, diagonales franches", "product off-centre, strong diagonals") },
    grade: { tone: "neutral", contrast: "high", grain: 0.05, words: t("noirs profonds, blancs durs, peu de couleurs", "deep blacks, hard whites, minimal colour") },
    scenes: ["spotlight", "split", "color"],
    creative: "deep",
  },
  elan: {
    name: t("Matin vif en plein air", "Crisp outdoor morning"),
    light: { source: t("soleil rasant du matin, contre-jour", "low morning sun, backlit"), quality: "hard", from: "right", kelvin: 5000, time: t("tôt le matin", "early morning") },
    materials: [t("piste d'athlétisme", "running track"), t("rocher granitique", "granite rock"), t("tissu technique", "technical fabric")],
    sets: [t("sentier de montagne au lever du jour", "mountain trail at sunrise"), t("piste extérieure, ciel dégagé", "outdoor track under a clear sky")],
    framing: { focal: "35mm", angle: t("contre-plongée dynamique", "dynamic low angle"), dof: t("f/4 : produit net, paysage lisible", "f/4: product sharp, landscape readable"), composition: t("produit en diagonale, horizon bas", "product on a diagonal, low horizon") },
    grade: { tone: "cool", contrast: "high", grain: 0.02, words: t("ciel clair, couleurs vives, contraste tonique", "clear sky, vivid colours, punchy contrast") },
    scenes: ["split", "spotlight", "color"],
    creative: "deep",
  },
  flux: {
    name: t("Noir et blanc graphique", "Graphic monochrome"),
    light: { source: t("grande boîte à lumière latérale, ombre dessinée", "large side softbox, sculpted shadow"), quality: "hard", from: "left", kelvin: 5600, time: t("studio, lumière neutre", "studio, neutral light") },
    materials: [t("béton lisse gris", "smooth grey concrete"), t("acier noir mat", "matte black steel"), t("nylon technique", "technical nylon")],
    sets: [t("fond gris neutre avec un seul bloc géométrique", "neutral grey backdrop with a single geometric block"), t("escalier de béton en ville", "concrete stairs in the city")],
    framing: { focal: "50mm", angle: t("de face, cadrage serré", "straight on, tight framing"), dof: t("f/8 : net partout", "f/8: sharp throughout"), composition: t("produit centré, lignes verticales franches", "product centered, strong vertical lines") },
    grade: { tone: "neutral", contrast: "high", grain: 0.03, words: t("noirs et blancs francs, couleur seulement sur le produit", "hard blacks and whites, colour only on the product") },
    scenes: ["studio", "split", "spotlight"],
    creative: "deep",
  },
};

/** Accessoires et situations par secteur : objets réels, plausibles, jamais de marque concurrente (3 au plus). */
const SECTOR: Record<string, { props: T[]; situations: T[]; season: T; living?: T }> = {
  beaute: {
    living: t("céramique blanche, coton", "white ceramic, cotton"),
    props: [t("serviette de coton plié", "folded cotton towel"), t("petit plateau en céramique", "small ceramic tray"), t("brosse à cheveux en bois", "wooden hairbrush")],
    situations: [t("sur le rebord d'un lavabo, routine du matin", "on the edge of a washbasin during the morning routine"), t("posé dans un sac à main ouvert sur un lit, avant de sortir", "inside an open handbag on a bed, just before going out")],
    season: t("intemporelle, sans marqueur de saison", "timeless, no seasonal markers"),
  },
  mode: {
    living: t("chêne clair, lin", "light oak, linen"),
    props: [t("cintre en bois", "wooden hanger"), t("paire de baskets blanches portées", "pair of worn white sneakers"), t("sac en toile", "canvas tote bag")],
    situations: [t("sur une chaise près de la porte d'entrée, prêt à partir", "on a chair by the front door, ready to leave"), t("plié sur un lit défait, matin", "folded on an unmade bed in the morning")],
    season: t("mi-saison", "between seasons"),
  },
  bijoux: {
    living: t("noyer, lin", "walnut wood, linen"),
    props: [t("coupelle en céramique", "small ceramic dish"), t("livre ouvert à la reliure toilée", "open cloth-bound book"), t("verre d'eau", "glass of water")],
    situations: [t("sur une table de chevet en bois, lumière du matin", "on a wooden bedside table in morning light"), t("sur le rebord d'une fenêtre, prêt à être porté", "on a windowsill, ready to be worn")],
    season: t("intemporelle", "timeless"),
  },
  maison: {
    living: t("lin froissé, laine", "rumpled linen, wool"),
    props: [t("plaid en laine", "wool throw"), t("livre ouvert", "open book"), t("vase en grès sans fleurs", "empty stoneware vase")],
    situations: [t("sur un lit en lin froissé, lumière du matin", "on a bed with rumpled linen in morning light"), t("sur un canapé au salon, après-midi", "on a living-room sofa in the afternoon")],
    season: t("automne doux", "soft autumn"),
  },
  hightech: {
    living: t("granite, bois brut", "granite rock, raw wood"),
    props: [t("sac à dos technique", "technical backpack"), t("carte topographique pliée", "folded topographic map"), t("gourde métallique", "metal water bottle")],
    situations: [t("sur un rocher en randonnée, vallée au loin", "on a rock during a hike, valley in the distance"), t("sur un bureau rangé à côté d'un ordinateur fermé", "on a tidy desk next to a closed laptop")],
    season: t("fin d'été", "late summer"),
  },
  sport: {
    living: t("bois de banc, béton", "wooden bench, concrete"),
    props: [t("serviette technique", "technical towel"), t("chaussures de course usées", "worn running shoes"), t("gourde", "water bottle")],
    situations: [t("au bord d'un sentier forestier, tôt le matin", "beside a forest trail early in the morning"), t("sur un banc de vestiaire, après l'effort", "on a locker-room bench after a workout")],
    season: t("début d'automne, matin frais", "early autumn, crisp morning"),
  },
  alimentation: {
    living: t("carreaux de céramique, bois", "glazed ceramic tiles, wood"),
    props: [t("verre avec des glaçons", "glass with ice cubes"), t("citrons entiers sur une planche", "whole lemons on a board"), t("nappe en lin rayé", "striped linen tablecloth")],
    situations: [t("sur une table de terrasse au soleil, l'après-midi", "on a sunny terrace table in the afternoon"), t("dans un panier de pique-nique sur une couverture, amis flous au loin", "in a picnic basket on a blanket, friends blurred in the distance")],
    season: t("début d'été", "early summer"),
  },
  enfants: {
    living: t("coton, bois clair", "cotton, light wood"),
    props: [t("jouets en bois", "wooden toys"), t("livre d'images", "picture book"), t("couverture en coton", "cotton blanket")],
    situations: [t("sur le tapis d'une chambre d'enfant, lumière du jour", "on a playroom rug in daylight"), t("sur une table de chevet d'enfant, lampe du soir", "on a child's bedside table under an evening lamp")],
    season: t("intemporelle", "timeless"),
  },
  animaux: {
    living: t("lin gris, parquet", "grey linen, wooden floor"),
    props: [t("panier en osier", "wicker basket"), t("plaid doux", "soft throw"), t("gamelle en céramique", "ceramic bowl")],
    situations: [t("sur un canapé gris clair, un chat détendu à côté", "on a light-grey sofa with a relaxed cat nearby"), t("sur un parquet clair, un chien qui se repose", "on a light wooden floor with a dog resting nearby")],
    season: t("intemporelle", "timeless"),
  },
  artisanat: {
    living: t("bois d'établi, papier kraft", "workbench wood, kraft paper"),
    props: [t("outils en bois", "wooden tools"), t("papier kraft", "kraft paper"), t("pot de crayons", "pencil pot")],
    situations: [t("sur une table d'atelier, lumière de fenêtre", "on a workshop table in window light"), t("sur une étagère d'atelier à la maison", "on a shelf in a home studio")],
    season: t("intemporelle", "timeless"),
  },
};

/** Accessoires selon la cible (mots repérés dans la description de la cible) : la scène parle à ces gens-là. */
const AUDIENCE: { re: RegExp; prop: T; setting: T }[] = [
  { re: /étudiant|student|jeune|young|18|20 ans/i, prop: t("sac en toile de coton", "cotton tote bag"), setting: t("petit appartement lumineux en ville", "small bright city apartment") },
  { re: /randonn|hik|voyag|travel|outdoor|plein air|montagne|mountain/i, prop: t("sac à dos de randonnée", "hiking backpack"), setting: t("paysage de montagne au loin", "mountains in the distance") },
  { re: /parent|maman|papa|bébé|baby|famil/i, prop: t("couverture de coton", "cotton blanket"), setting: t("maison familiale lumineuse", "bright family home") },
  { re: /actif|active|bureau|office|professionnel|professional|cadre/i, prop: t("housse d'ordinateur en feutre", "felt laptop sleeve"), setting: t("bureau calme à la maison", "calm home office") },
  { re: /sport|athl|coureur|runner|fitness/i, prop: t("gourde métallique", "metal water bottle"), setting: t("piste extérieure", "outdoor track") },
  { re: /apéro|apéritif|aperitif|pique-nique|picnic|ami|friend/i, prop: t("planche en bois", "wooden board"), setting: t("terrasse entre amis", "terrace with friends") },
];

/** Clichés de banque d'images à proscrire (génériques et par secteur). */
const CLICHES: T[] = [
  t("pétales de rose éparpillés", "scattered rose petals"),
  t("brin d'eucalyptus", "eucalyptus sprig"),
  t("marbre blanc et doré", "white marble with gold"),
  t("tasse de café avec latte art", "latte art coffee cup"),
  t("carnet ouvert et stylo", "open notebook and pen"),
  t("guirlande lumineuse et bokeh en cœur", "fairy lights and heart bokeh"),
  t("éclaboussure de liquide figée", "frozen liquid splash"),
  t("mannequin souriant face caméra", "smiling model looking at the camera"),
  t("podium cylindrique générique", "generic cylinder podium"),
  t("étincelles et reflets d'objectif", "sparkles and lens flare"),
  t("fumée dramatique", "dramatic smoke"),
  t("macarons", "macarons"),
];
const SECTOR_CLICHES: Record<string, T[]> = {
  beaute: [t("goutte d'eau sur une feuille", "water droplet on a leaf"), t("fleurs de coton", "cotton flowers")],
  hightech: [t("lueur néon bleue", "blue neon glow"), t("circuit imprimé", "circuit board"), t("hologrammes flottants", "floating holograms")],
  alimentation: [t("tranches de fruits qui volent", "flying fruit slices"), t("explosion de glaçons", "exploding ice cubes")],
  bijoux: [t("écrin de velours avec une rose", "velvet box with a rose"), t("coupe de champagne", "champagne glass")],
  maison: [t("bougies partout", "candles everywhere")],
  sport: [t("gouttes de sueur en gros plan", "close-up sweat drops")],
  enfants: [t("ballons pastel", "pastel balloons")],
  animaux: [t("chiot avec un nœud", "puppy with a bow")],
};

export type PhotoLine = {
  direction: DirectionId;
  /** Nom de la ligne (affiché au client) et concept de la piste créative d'où elle vient. */
  name: T;
  concept: string;
  light: { source: T; quality: LightQuality; from: "left" | "right"; kelvin: number; time: T };
  materials: T[];
  sets: T[];
  props: T[];
  situations: T[];
  /** Matières d'un vrai lieu de vie (photos en situation : jamais de papier de fond ni de studio). */
  living: T;
  /** Objets du lieu de vie (ceux du secteur : ils vont avec les situations). */
  livingProps: T[];
  framing: Mood["framing"];
  palette: { hex: string[]; words: { fr: string[]; en: string[] } };
  season: T;
  grade: Mood["grade"];
  avoid: T[];
  /** Rendus locaux : mises en scène, couleurs du décor, étalonnage. */
  local: { scenes: [SceneStyle, SceneStyle, SceneStyle]; wall: string; top: string; tint: string; tintAlpha: number };
  /** Visuels avec texte : fond, encre, accent, mode. */
  creative: { mode: CreativeMode; ground: string; ink: string; accent: string; soft: string };
};

export type PhotoLineInput = {
  direction?: string | null;
  sector?: string | null;
  audience?: string | null;
  palette?: BrandPalette | null;
  /** Piste créative retenue (nom, couleurs). */
  route?: { name?: string; colors?: { ink: string; accent: string; ground: string; tint: string } } | null;
  concept?: string | null;
  /** Couleurs mesurées du produit (la plus présente d'abord). */
  productColors?: { hex: string; share: number }[];
};

const DEFAULT_PAL: BrandPalette = { primary: "#6E5644", secondary: "#E6DACB", accent: "#B98B5E", light: "#F6F2EC", dark: "#1C1713" };

/** Projet (ou extrait) vers les entrées de la ligne photographique. */
export function photoLineInput(p: { product?: { sector?: string | null; visual?: { colors?: { hex: string; share: number }[] } }; brand?: { direction?: string; audience?: string; palette?: BrandPalette; logo?: { concept?: string; route?: PhotoLineInput["route"] } } | null }): PhotoLineInput {
  return {
    direction: p.brand?.direction,
    sector: p.product?.sector ?? null,
    audience: p.brand?.audience ?? null,
    palette: p.brand?.palette ?? null,
    route: p.brand?.logo?.route ?? null,
    concept: p.brand?.logo?.concept ?? null,
    productColors: p.product?.visual?.colors ?? [],
  };
}

/** Ligne photographique d'une marque (déterministe). */
export function photoLine(input: PhotoLineInput): PhotoLine {
  const direction = (input.direction && input.direction in MOODS ? input.direction : "atelier") as DirectionId;
  const m = MOODS[direction];
  const pal = input.palette ?? DEFAULT_PAL;
  const sector = SECTOR[input.sector ?? ""] ?? SECTOR.maison;
  const aud = AUDIENCE.filter((a) => a.re.test(input.audience ?? ""));
  // Accessoires : ceux de la cible d'abord (la scène parle à ces gens-là), puis ceux du secteur ; 3 au plus.
  const props: T[] = [];
  const head = (x: T) => x.en.split(" ").at(-1);
  for (const x of [...aud.map((a) => a.prop), ...sector.props]) if (props.length < 3 && !props.some((p) => p.en === x.en || head(p) === head(x))) props.push(x);
  const situations = sector.situations.map((s, i) => (aud[0] && i === 1 ? t(`${s.fr}, ${aud[0].setting.fr}`, `${s.en}, ${aud[0].setting.en}`) : s));
  const route = input.route?.colors;
  // Palette de prise de vue : couleur dominante du produit (ton sur ton), puis couleurs de la piste retenue.
  const prodHex = (input.productColors ?? []).filter((c) => { const [, s, l] = hsl(c.hex); return s > 0.15 && l > 0.12 && l < 0.92; }).sort((a, b) => b.share - a.share)[0]?.hex;
  const hex = [...new Set([route?.tint ?? pal.secondary, route?.ground ?? pal.primary, route?.accent ?? pal.accent, pal.light].map((h) => h.toUpperCase()))];
  const words = (lang: "fr" | "en") => [...new Set(hex.map((h) => paletteWord(h, lang)))];
  const season = direction === "gourmand" ? t("début d'été", "early summer") : direction === "elan" ? t("début d'automne, matin frais", "early autumn, crisp morning") : sector.season;
  const avoid = [...CLICHES, ...(SECTOR_CLICHES[input.sector ?? ""] ?? [])];
  // Décor local : mur et plateau dans la palette (plus de travertin beige identique pour toutes les marques).
  const warm = m.grade.tone === "warm";
  const wall = mix(withLightness(route?.tint ?? pal.secondary, 0.88, 0.55), warm ? "#F3E6D3" : m.grade.tone === "cool" ? "#E3E8EE" : "#ECECEA", 0.45);
  const top = mix(withLightness(route?.tint ?? pal.secondary, 0.78, 0.5), warm ? "#D9C3A5" : m.grade.tone === "cool" ? "#C3CCD6" : "#CFCDC8", 0.5);
  const tint = m.grade.tone === "warm" ? "#FFB36B" : m.grade.tone === "cool" ? "#6B9BFF" : "#FFFFFF";
  // Visuels avec texte.
  const ground = creativeGround(m.creative, pal, route, prodHex);
  const ink = m.creative === "light" ? withLightness(pal.dark, 0.12) : m.creative === "deep" ? "#FFFFFF" : ensureContrast(withLightness(ground, 0.16, 0.9), ground, 7);
  const accentRaw = route?.accent ?? pal.accent;
  const accent = contrast(accentRaw, ground) >= 3 ? accentRaw : ensureContrast(accentRaw, ground, 3);
  const soft = mix(ground, ink, 0.1);
  return {
    direction,
    name: m.name,
    concept: [input.route?.name, input.concept].filter(Boolean).join(" · "),
    light: m.light,
    materials: m.materials,
    sets: m.sets,
    props,
    situations,
    living: sector.living ?? t("bois, lin", "wood, linen"),
    livingProps: sector.props.slice(0, 2),
    framing: m.framing,
    palette: { hex, words: { fr: words("fr"), en: words("en") } },
    season,
    grade: m.grade,
    avoid,
    local: { scenes: m.scenes, wall, top, tint, tintAlpha: m.grade.tone === "neutral" ? 0 : 0.06 },
    creative: { mode: m.creative, ground, ink: ensureContrast(ink, ground, 4.5), accent, soft },
  };
}

function creativeGround(mode: CreativeMode, pal: BrandPalette, route: { ink: string; accent: string; ground: string; tint: string } | undefined, prodHex?: string): string {
  if (mode === "light") return mix(pal.light, "#FFFFFF", 0.35);
  if (mode === "deep") {
    const base = route?.ground && isDark(route.ground) ? route.ground : pal.primary;
    return isDark(base) ? base : withLightness(base, Math.min(0.3, hsl(base)[2]));
  }
  // Ton sur ton : la couleur du produit (ou la teinte de la piste), claire et douce — le produit se fond dans sa couleur.
  const base = prodHex ?? route?.tint ?? pal.secondary;
  return withLightness(base, 0.84, 0.75);
}

/** Nom de couleur pour un photographe : les roses clairs sont des roses (pas des « rouges pâles »). */
function paletteWord(hex: string, lang: "fr" | "en"): string {
  const [h, s, l] = hsl(hex);
  if (s > 0.3 && l > 0.45 && l <= 0.92 && h >= 42 && h < 70) return l > 0.78 ? (lang === "fr" ? "jaune pâle" : "pale yellow") : lang === "fr" ? "jaune" : "yellow";
  if (s > 0.25 && l > 0.5 && l <= 0.92 && (h >= 320 || h < 12)) return l > 0.8 ? (lang === "fr" ? "rose poudré" : "powder pink") : lang === "fr" ? "rose" : "pink";
  return colorName(hex, lang);
}

const pick = (x: T, lang: "fr" | "en") => x[lang];

/** Moodboard écrit, en anglais, pour les modèles d'image (bloc réutilisé par toutes les consignes). */
export function photoLinePrompt(l: PhotoLine, opts: { lifestyle?: boolean } = {}): string {
  const e = (x: T) => x.en;
  // Photo en situation : on garde l'esprit de la campagne (côté et moment de la lumière, palette, saison, étalonnage)
  // sans imposer les matières ni l'optique de studio (un vrai lieu n'a pas de papier de fond).
  if (opts.lifestyle)
    return `Campaign photographic line "${l.name.en}": natural light from the ${l.light.from}, ${e(l.light.time)}; palette: ${l.palette.words.en.join(", ")}; season: ${e(l.season)}; grade: ${e(l.grade.words)}.`;
  return [
    `Campaign photographic line "${l.name.en}":`,
    `light: ${e(l.light.source)}, ${l.light.quality === "lowkey" ? "low-key" : l.light.quality}, key light from the ${l.light.from}, about ${l.light.kelvin}K, ${e(l.light.time)};`,
    `materials: ${l.materials.map(e).join(", ")};`,
    `camera: ${l.framing.focal} lens, ${e(l.framing.angle)}, ${e(l.framing.dof)};`,
    `palette: ${l.palette.words.en.join(", ")};`,
    `season: ${e(l.season)};`,
    `grade: ${e(l.grade.words)}.`,
  ].join(" ");
}

/** Mention « à éviter » pour les modèles d'image. */
export function avoidPrompt(l: PhotoLine): string {
  return `Avoid stock-photo clichés: ${l.avoid.map((a) => a.en).join(", ")}.`;
}

/** Moodboard lisible par le client (studio, charte), dans la langue demandée. */
export function photoLineText(l: PhotoLine, lang: "fr" | "en" = "fr"): string[] {
  const p = (x: T) => pick(x, lang);
  const fr = lang === "fr";
  return [
    `${fr ? "Ligne photographique" : "Photographic line"} : ${p(l.name)}${l.concept ? ` (${l.concept})` : ""}`,
    `${fr ? "Lumière" : "Light"} : ${p(l.light.source)}, ${fr ? "venant de la" : "from the"} ${fr ? (l.light.from === "left" ? "gauche" : "droite") : l.light.from}, ${l.light.kelvin} K, ${p(l.light.time)}`,
    `${fr ? "Matières" : "Materials"} : ${l.materials.map(p).join(", ")}`,
    `${fr ? "Décors" : "Sets"} : ${l.sets.map(p).join(" ; ")}`,
    `${fr ? "Accessoires" : "Props"} : ${l.props.map(p).join(", ")}`,
    `${fr ? "Cadrage" : "Framing"} : ${l.framing.focal}, ${p(l.framing.angle)}, ${p(l.framing.dof)} ; ${p(l.framing.composition)}`,
    `${fr ? "Palette" : "Palette"} : ${l.palette.words[lang].join(", ")}`,
    `${fr ? "Saison" : "Season"} : ${p(l.season)}`,
    `${fr ? "Étalonnage" : "Grade"} : ${p(l.grade.words)}`,
    `${fr ? "À éviter" : "Avoid"} : ${l.avoid.slice(0, 6).map(p).join(", ")}…`,
  ];
}

/**
 * Consigne de décor SANS IA de rédaction (repli), déjà au niveau d'un brief de photographe :
 * décor, plateau, accessoires, lumière, optique, palette, saison, étalonnage, clichés à éviter.
 */
export function scenePromptFromLine(l: PhotoLine, opts: { lifestyle?: string; format?: string } = {}): { prompt: string; surface: string; lightFrom: "left" | "right" } {
  const surface = l.materials[0].en;
  const set = opts.lifestyle
    ? `Authentic everyday editorial photograph, ${opts.lifestyle}; real lived-in place with ${l.living.en} textures, props: ${l.livingProps.map((p) => p.en).join(", ")}; people may appear naturally, partially framed or out of focus, never covering the product`
    : `Product photograph on ${surface}, set: ${l.sets[0].en}, a few real props kept secondary and out of focus (${l.props.slice(0, 2).map((p) => p.en).join(", ")})`;
  // La ligne complète et les clichés à éviter sont ajoutés par finalImagePrompt (une seule fois).
  return {
    prompt: `${set}. ${opts.lifestyle ? lifeLight(l) : `${l.light.source.en}, ${l.light.quality === "lowkey" ? "low-key" : l.light.quality}`} key light from the ${l.light.from}, ${l.light.time.en}, ${l.season.en}. ${opts.lifestyle ? "35mm" : l.framing.focal} lens, ${l.framing.angle.en}, ${opts.lifestyle ? "f/2.8, background softly blurred" : l.framing.dof.en}. Composition: ${opts.lifestyle ? "product on a third, the place readable around it" : l.framing.composition.en}${opts.format ? `, ${opts.format} format` : ""}. Palette: ${l.palette.words.en.join(", ")}; grade: ${l.grade.words.en}.`,
    surface,
    lightFrom: l.light.from,
  };
}

/** Lumière naturelle d'un vrai lieu (photo en situation), dans l'esprit de la ligne. */
const lifeLight = (l: PhotoLine) => (l.light.quality === "lowkey" ? "warm practical lamp light and cool window light, low-key" : l.light.quality === "hard" ? "direct sunlight through a window, crisp" : "soft daylight from a window, diffused");

/** Brief du studio (sans IA) au format de la grille : il sert de repli et de référence minimale (≥ 8/10). */
export function lineBriefDraft(l: PhotoLine, opts: { lifestyle?: string; format?: string } = {}): ImageBriefDraft {
  const st = scenePromptFromLine(l, opts);
  return {
    intent: l.name.fr,
    set: opts.lifestyle ? `${opts.lifestyle}, real lived-in place` : l.sets[0].en,
    surface: opts.lifestyle ? l.living.en : l.materials[0].en,
    props: (opts.lifestyle ? l.livingProps : l.props.slice(0, 2)).map((p) => p.en),
    light: `${opts.lifestyle ? lifeLight(l) : `${l.light.source.en}, ${l.light.quality === "lowkey" ? "low-key" : l.light.quality}`}, key light from the ${l.light.from}, ${l.light.time.en}`,
    lightFrom: l.light.from,
    camera: opts.lifestyle ? `35mm lens, ${l.framing.angle.en}, f/2.8 shallow depth of field` : `${l.framing.focal} lens, ${l.framing.angle.en}, ${l.framing.dof.en}`,
    composition: opts.lifestyle ? "product on a third, the place readable around it" : l.framing.composition.en,
    palette: l.palette.words.en.join(", "),
    season: l.season.en,
    prompt: st.prompt,
  };
}

// ---------------------------------------------------------------- brief IA : grille du directeur artistique

export type ImageBriefDraft = {
  intent?: string;
  set?: string;
  surface?: string;
  props?: string[];
  light?: string;
  lightFrom?: "left" | "right";
  camera?: string;
  composition?: string;
  palette?: string;
  season?: string;
  prompt?: string;
};

export const BRIEF_CRITERIA = ["set", "surface", "props", "light", "lightSide", "camera", "palette", "season", "noCliche", "prompt"] as const;
export type BriefCriterion = (typeof BRIEF_CRITERIA)[number];
export type BriefReview = { score: number; failed: BriefCriterion[]; feedback: string[] };
/** Seuil d'un brief : 8/10 au moins (grille ci-dessous). */
export const BRIEF_MIN_SCORE = 8;

const MATERIAL_RE = /\b(wood|oak|walnut|ash|pine|linen|cotton|wool|velvet|silk|stone|travertine|marble|granite|slate|concrete|plaster|limewash|ceramic|tile|terracotta|terrazzo|glass|steel|metal|aluminium|aluminum|leather|paper|felt|cork|rattan|wicker|sand|rock|asphalt|enamel|lacquer|foam|fabric|nylon)\b/i;
const SOURCE_RE = /\b(window|sun|sunlight|daylight|softbox|strip ?box|skylight|lamp|flash|strobe|dusk|dawn|overcast|bounce|reflector|practical)\b/i;
const DIR_RE = /\b(left|right|side|back ?light|backlit|rim|overhead|top|45|three-quarter|from behind|front)\b/i;
const QUALITY_RE = /\b(soft|hard|diffuse[d]?|crisp|low-key|lowkey|high-key|gentle|harsh|dappled|filtered|raking)\b/i;
const FOCAL_RE = /\b\d{2,3}\s?mm\b/i;
const ANGLE_RE = /\b(eye[- ]level|product height|above|overhead|top[- ]down|flat ?lay|low angle|high angle|three-quarter|3\/4|straight on|frontal|side view)\b/i;
const DOF_RE = /(f\/\d|depth of field|bokeh|shallow|deep focus|sharp throughout|background (blur|soft|melting))/i;
const SEASON_RE = /\b(spring|summer|autumn|fall|winter|timeless|season|morning|afternoon|evening|midday|noon|dusk|dawn|sunrise|sunset|golden hour|blue hour|night)\b/i;
const FORBIDDEN_RE = /\b(redesign|new (colou?r|logo|label)|change the product|logo on|brand name|lettering on|written|caption|watermark|competitor|another brand|second product|duplicate product)\b/i;
/** Formulations courantes des clichés (le modèle ne reprend pas toujours les mots exacts de la liste). */
const CLICHE_RE = /rose petals|eucalyptus|marble[^.]{0,20}gold|gold[^.]{0,20}marble|latte art|fairy lights|heart bokeh|(liquid|water|juice) splash|splash of|lens flare|sparkles|glitter|dramatic smoke|macarons?|cylinder podium|neon glow|holograms?|circuit board|flying (fruit|slices)|exploding|champagne|pastel balloons|smiling model|looking at the camera/i;
const FRENCH_RE = /\b(avec|dans|lumière|produit|fond|sur une|posé|douce)\b/i;

/**
 * Grille du directeur artistique (10 critères mesurables, 1 point chacun) :
 * décor concret ; plateau en matière nommée ; 0 à 3 accessoires sans cliché ; lumière (source, direction, qualité) ;
 * côté de la lumière cohérent avec « lightFrom » ; optique (focale, angle, profondeur de champ) ; palette de la ligne ;
 * saison ou moment ; aucun cliché de banque d'images ; consigne finale en anglais, dense, sans redessiner le produit.
 */
export function critiqueImageBrief(d: ImageBriefDraft | null | undefined, l: PhotoLine, opts: { lifestyle?: boolean } = {}): BriefReview {
  const b = d ?? {};
  const all = [b.set, b.surface, ...(b.props ?? []), b.light, b.camera, b.composition, b.palette, b.season, b.prompt].filter(Boolean).join(" \n ");
  const lower = all.toLowerCase();
  const failed: BriefCriterion[] = [];
  const fb: string[] = [];
  const fail = (k: BriefCriterion, msg: string) => (failed.push(k), fb.push(msg));
  const set = (b.set ?? "").trim();
  if (set.split(/\s+/).length < 4 || (opts.lifestyle && /\b(studio|seamless|backdrop|podium|plinth)\b/i.test(set))) fail("set", opts.lifestyle ? "décor : un vrai lieu de vie précis (pièce, moment, matières), pas un studio" : "décor : un lieu ou un fond précis (architecture, matière, couleur), pas « a nice background »");
  if (!MATERIAL_RE.test(b.surface ?? "")) fail("surface", `plateau : nommer la matière où le produit est posé (ex. ${l.materials.map((m) => m.en).join(", ")})`);
  const props = (b.props ?? []).filter((p) => p.trim());
  const clicheIn = (s: string) => l.avoid.find((a) => s.toLowerCase().includes(a.en.toLowerCase()));
  if (props.length > 3 || props.some((p) => clicheIn(p) || /\b(logo|brand|branded)\b/i.test(p))) fail("props", `accessoires : 3 au plus, réels, cohérents avec la cible (ex. ${l.props.map((p) => p.en).join(", ")}), sans cliché ni marque`);
  const light = b.light ?? "";
  if (!(SOURCE_RE.test(light) && DIR_RE.test(light) && QUALITY_RE.test(light))) fail("light", "lumière : source (fenêtre, soleil, boîte à lumière…), direction (gauche, droite, contre-jour…) et qualité (douce, dure, diffuse…)");
  const saysLeft = /\bleft\b/i.test(light), saysRight = /\bright\b/i.test(light);
  if (!b.lightFrom || (saysLeft && !saysRight && b.lightFrom !== "left") || (saysRight && !saysLeft && b.lightFrom !== "right")) fail("lightSide", "« lightFrom » doit correspondre au côté de la lumière principale décrite (sinon l'ombre du produit part du mauvais côté)");
  const cam = `${b.camera ?? ""} ${b.composition ?? ""}`;
  if (!(FOCAL_RE.test(cam) && ANGLE_RE.test(cam) && DOF_RE.test(cam))) fail("camera", `optique : focale en mm, angle de prise de vue et profondeur de champ (ligne : ${l.framing.focal}, ${l.framing.angle.en}, ${l.framing.dof.en})`);
  const palHits = l.palette.words.en.filter((w) => lower.includes(w.toLowerCase().split(" ").at(-1)!)).length + l.palette.hex.filter((h) => lower.includes(h.toLowerCase())).length;
  if (palHits < 2) fail("palette", `palette : reprendre au moins deux couleurs de la ligne (${l.palette.words.en.join(", ")})`);
  if (!SEASON_RE.test(`${b.season ?? ""} ${light}`)) fail("season", `saison ou moment de la journée (ligne : ${l.season.en}, ${l.light.time.en})`);
  // Les mentions négatives (« no …», « avoid … », « without … ») ne comptent pas comme des clichés présents.
  const positive = all.replace(/\b(avoid|without|no)\b[^.;\n]*[.;]?/gi, " ").toLowerCase();
  const cl = [...l.avoid.filter((a) => positive.includes(a.en.toLowerCase())).map((a) => a.en), ...(positive.match(new RegExp(CLICHE_RE.source, "gi")) ?? [])];
  if (props.some((p) => CLICHE_RE.test(p)) && !failed.includes("props")) fail("props", "accessoires : cliché de banque d'images à remplacer par un objet que la cible possède vraiment");
  if (cl.length) fail("noCliche", `clichés de banque d'images à retirer : ${[...new Set(cl)].join(", ")}`);
  const prompt = (b.prompt ?? "").trim();
  const words = prompt.split(/\s+/).filter(Boolean).length;
  if (words < 35 || words > 170 || FRENCH_RE.test(prompt) || FORBIDDEN_RE.test(prompt.replace(/\b(avoid|without|no|never)\b[^.;\n]*[.;]?/gi, " "))) fail("prompt", "consigne finale : un paragraphe en anglais de 35 à 170 mots, qui ne décrit que l'environnement (jamais de changement du produit, ni texte, ni autre marque)");
  return { score: BRIEF_CRITERIA.length - failed.length, failed, feedback: fb };
}

/**
 * Consigne finale envoyée au modèle d'image : le paragraphe du brief, complété par la ligne de campagne et les
 * garde-fous (le produit réel n'est jamais redessiné, aucun texte, aucun cliché).
 */
export function finalImagePrompt(brief: { prompt: string }, l: PhotoLine, opts: { lifestyle?: boolean } = {}): string {
  return `${brief.prompt.trim().replace(/\s+/g, " ")} ${photoLinePrompt(l, opts)} Photorealistic, real optics and real materials, no CGI look. ${avoidPrompt(l)} No text, no lettering, no logo, no other branded product.`;
}
