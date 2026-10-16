/**
 * Français des gestes, scènes et interdits du registre des métiers (`trade.ts`), pour les consignes envoyées au
 * modèle d'images (règle du propriétaire : consignes à Qwen EN FRANÇAIS). Le registre reste en anglais, car il sert
 * aussi aux recherches de photos libres et aux contrôles (vocabulaire des banques d'images) : seule la CONSIGNE est
 * traduite, au moment où elle est écrite. Même méthode que la table des familles de produits (`image-v2/prompt-fr.ts`).
 * Le test `tests/metier-fr.test.ts` vérifie que chaque expression du registre a sa traduction.
 */

export const TRADE_FR: Record<string, string> = {
  // Escape game
  "solving puzzles": "résolution d'énigmes",
  "searching for clues": "recherche d'indices",
  "opening a padlock": "ouverture d'un cadenas",
  "team challenge": "défi en équipe",
  "themed escape room interior with props": "salle d'escape game à thème, avec ses accessoires",
  "padlocks and old keys on a wooden chest": "cadenas et vieilles clés sur un coffre en bois",
  "vintage clock and mysterious decor": "horloge ancienne et décor mystérieux",
  "puzzle and riddle objects on a table": "objets d'énigmes et de casse-tête posés sur une table",
  // Plâtrier
  plastering: "pose d'enduit au plâtre",
  "skim coating": "enduit de lissage",
  "drywall installation": "pose de plaques de plâtre",
  jointing: "bandes et joints de plaques",
  sanding: "ponçage",
  "craftsman applying plaster": "artisan qui applique du plâtre",
  "drywall installation in a room under renovation": "pose de plaques de plâtre dans une pièce en rénovation",
  "smooth wall finishing": "finition d'un mur bien lisse",
  "interior renovation site": "chantier de rénovation intérieure",
  "brick wall": "mur de briques",
  "stone wall": "mur de pierres",
  "exterior facade": "façade extérieure",
  "construction crane": "grue de chantier",
  // Peintre
  painting: "peinture des murs",
  "wall preparation": "préparation des murs",
  filling: "rebouchage",
  masking: "pose de ruban de masquage",
  finishing: "finitions",
  "painter rolling paint on an interior wall": "peintre qui passe le rouleau sur un mur intérieur",
  "decorator preparing a wall before painting": "peintre qui prépare un mur avant de peindre",
  "freshly painted living room": "salon fraîchement repeint",
  "clean renovation work": "travaux de rénovation propres",
  "art painting": "tableau d'art",
  "canvas painting": "peinture sur toile",
  "isolated paint can": "pot de peinture isolé",
  graffiti: "graffiti",
  artist: "artiste peintre",
  canvas: "toile d'artiste",
  acrylic: "peinture acrylique d'art",
  abstract: "art abstrait",
  "fluid art": "art fluide",
  "palette knife": "couteau à peindre",
  easel: "chevalet",
  watercolor: "aquarelle",
  model: "maquette",
  miniature: "figurine miniature",
  airplane: "avion",
  aircraft: "aéronef",
  hobby: "loisir créatif",
  toy: "jouet",
  figure: "figurine",
  // Maçon
  bricklaying: "pose de briques",
  "concrete work": "travaux de béton",
  "foundation work": "travaux de fondations",
  "mason laying bricks on a building site": "maçon qui pose des briques sur un chantier",
  "builder pouring concrete": "ouvrier qui coule du béton",
  // Électricien
  wiring: "câblage électrique",
  "electrical panel installation": "installation d'un tableau électrique",
  "lighting installation": "installation de l'éclairage",
  "electrician working on an electrical panel": "électricien au travail sur un tableau électrique",
  "electrician installing lighting in a home": "électricien qui installe l'éclairage dans une maison",
  "lightning storm": "orage et éclairs",
  "power lines landscape": "paysage de lignes à haute tension",
  // Plombier
  "pipe fitting": "raccordement de tuyaux",
  "boiler repair": "réparation de chaudière",
  "bathroom installation": "installation d'une salle de bain",
  "plumber repairing pipes under a sink": "plombier qui répare les tuyaux sous un évier",
  "heating engineer servicing a boiler": "chauffagiste qui entretient une chaudière",
  "water drop macro": "gros plan d'une goutte d'eau",
  "swimming pool": "piscine",
  // Menuisier
  woodworking: "travail du bois",
  joinery: "menuiserie",
  "furniture making": "fabrication de meubles",
  "installing doors": "pose de portes",
  "carpenter working wood in a workshop": "menuisier qui travaille le bois dans son atelier",
  "joiner installing a wooden door": "menuisier qui pose une porte en bois",
  forest: "forêt",
  "log pile": "tas de bûches",
  // Carreleur
  tiling: "pose de carrelage",
  grouting: "jointoiement du carrelage",
  "floor laying": "pose de revêtement de sol",
  "tiler laying floor tiles": "carreleur qui pose un carrelage au sol",
  "craftsman grouting bathroom tiles": "artisan qui fait les joints du carrelage d'une salle de bain",
  "tile pattern texture": "texture de motif de carrelage",
  // Couvreur
  roofing: "travaux de toiture",
  "tile replacement": "remplacement de tuiles",
  "gutter repair": "réparation de gouttière",
  "roofer working on a tiled roof": "couvreur au travail sur un toit en tuiles",
  // Paysagiste
  "garden design": "création de jardin",
  "hedge trimming": "taille de haie",
  "lawn care": "entretien de la pelouse",
  planting: "plantation",
  "landscape gardener trimming a hedge": "paysagiste qui taille une haie",
  "gardener planting in a garden": "jardinier qui plante dans un jardin",
  // Coiffeur
  haircut: "coupe de cheveux",
  "hair colouring": "coloration des cheveux",
  styling: "coiffage",
  "hairdresser cutting a client's hair in a salon": "coiffeur qui coupe les cheveux d'un client au salon",
  "wig on mannequin": "perruque sur une tête de mannequin",
  // Esthéticienne
  "facial treatment": "soin du visage",
  massage: "massage",
  manicure: "manucure",
  "beautician giving a facial treatment": "esthéticienne qui fait un soin du visage",
  "therapist giving a massage": "praticien qui fait un massage",
  // Kinésithérapeute
  "physiotherapy session": "séance de kinésithérapie",
  "rehabilitation exercises": "exercices de rééducation",
  "manual therapy": "thérapie manuelle",
  "physiotherapist treating a patient's shoulder": "kinésithérapeute qui soigne l'épaule d'un patient",
  "hospital corridor": "couloir d'hôpital",
  pills: "pilules",
  // Coach sportif
  "personal training": "entraînement personnalisé",
  "workout coaching": "accompagnement d'une séance de sport",
  "personal trainer coaching a client": "coach sportif qui accompagne un client",
  // Photographe
  "photo shoot": "séance photo",
  "event photography": "photographie d'événement",
  "portrait session": "séance portrait",
  "photographer shooting a portrait session": "photographe pendant une séance portrait",
  // Restaurant et traiteur
  cooking: "cuisine",
  plating: "dressage des assiettes",
  "serving guests": "service en salle",
  "chef plating dishes in a restaurant kitchen": "chef qui dresse les assiettes dans la cuisine d'un restaurant",
  "guests enjoying a meal in a restaurant": "clients qui savourent un repas au restaurant",
  cartoon: "dessin animé",
  "3d": "image de synthèse 3D",
  "street food": "cuisine de rue",
  "raw meat": "viande crue",
  "fast food": "restauration rapide",
  ufo: "ovni",
  alien: "extraterrestre",
  anime: "dessin animé japonais",
  "catering service": "service traiteur",
  "chef plating dishes in a kitchen": "chef qui dresse les assiettes en cuisine",
  "caterer serving a buffet": "traiteur qui sert un buffet",
  // Conseil
  "client meeting": "rendez-vous avec un client",
  advisory: "conseil",
  "document review": "relecture de documents",
  "advisor meeting a client in an office": "conseiller qui reçoit un client dans son bureau",
  // Immobilier
  "property visit": "visite d'un bien",
  "handing over keys": "remise des clés",
  "real estate agent showing a home to buyers": "agent immobilier qui fait visiter une maison à des acheteurs",
  // Mécanicien
  "car repair": "réparation automobile",
  bodywork: "carrosserie",
  "car painting": "peinture automobile",
  "mechanic repairing a car engine in a garage": "mécanicien qui répare un moteur de voiture au garage",
  // Entretien
  "home cleaning": "ménage à domicile",
  "office cleaning": "nettoyage de bureaux",
  "cleaner cleaning a bright living room": "agent d'entretien qui nettoie un salon lumineux",
  // Replis par secteur
  "renovation work": "travaux de rénovation",
  installation: "installation",
  repair: "réparation",
  "craftsman working on an interior renovation": "artisan au travail sur une rénovation intérieure",
  treatment: "soin",
  "care session": "séance de soin",
  "professional giving a treatment to a client": "professionnel qui fait un soin à un client",
  consultation: "consultation",
  "practitioner with a patient": "praticien avec un patient",
  "coaching session": "séance d'accompagnement",
  "coach with a client": "coach avec un client",
  "advisor meeting a client": "conseiller qui reçoit un client",
  service: "service",
  "chef cooking in a kitchen": "chef qui cuisine",
  "agent showing a home": "agent qui fait visiter une maison",
  teaching: "enseignement",
  workshop: "atelier",
  "trainer teaching a small group": "formateur devant un petit groupe",
  "event service": "prestation d'événement",
  "professional working at an event": "professionnel au travail pendant un événement",
  "home service": "service à domicile",
  "professional helping at home": "professionnel qui aide à domicile",
  "client workshop": "atelier avec un client",
  "design work": "travail de création",
  "team working with a client": "équipe qui travaille avec un client",
  // Interdits communs (aussi présents dans `image-v2/prompt-fr.ts`, mêmes mots)
  "empty room": "pièce vide",
  "empty white room": "pièce blanche vide",
  "bare wall": "mur nu",
  "wall texture": "texture de mur",
  "background texture": "texture de fond",
  "isolated object": "objet isolé",
  "generic handshake": "poignée de main générique",
  "office stock photo": "photo de bureau de banque d'images",
};

/** Expressions composées à partir du libellé saisi par le client (replis secteur et générique de `resolveTrade`). */
const COMPOSED: [RegExp, (m: RegExpMatchArray) => string][] = [
  [/^(.+) professional at work$/, (m) => `${m[1]}, professionnel au travail`],
  [/^(.+) working with a client$/, (m) => `${m[1]}, au travail avec un client`],
];

/** Expression du registre en français si elle est connue, sinon telle quelle (le libellé du client est gardé). */
export function tradeFr(s: string): string;
export function tradeFr(s: string | null): string | null;
export function tradeFr(s: string | null): string | null {
  if (s == null) return null;
  if (s in TRADE_FR) return TRADE_FR[s];
  for (const [re, fr] of COMPOSED) {
    const m = s.match(re);
    if (m) return fr(m);
  }
  return s;
}

/** Expressions encore sans traduction (pour les contrôles et les tests). */
export const untranslatedTrade = (xs: (string | null | undefined)[]): string[] => xs.filter((x): x is string => !!x && !(x in TRADE_FR) && !COMPOSED.some(([re]) => re.test(x)));
