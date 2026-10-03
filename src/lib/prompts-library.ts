/**
 * Bibliothèque de prompts : 10 secteurs × 20 tâches = 200 prompts complets.
 * Chaque prompt précise le contexte, l'objectif, la direction créative, le
 * livrable attendu et les contrôles. Les variables {{…}} sont complétées à
 * l'insertion avec le produit, la marque et les médias du projet actif.
 */

export type SectorData = {
  id: string;
  label: string;
  buyer: string;
  drivers: string[];
  objections: string[];
  vocabulary: string[];
  forbidden: string[];
  surfaces: string[];
  light: string;
  details: string[];
  scenes: string[];
  motion: string[];
  hooks: string[];
  trust: string[];
  seasons: string[];
  pinKeywords: string[];
  shopFocus: string[];
  tone: string;
};

export const SECTOR_DATA: SectorData[] = [
  {
    id: "beaute",
    label: "Beauté & cosmétique",
    buyer: "personnes attentives à la composition, qui comparent les actifs et lisent les étiquettes",
    drivers: ["composition lisible", "texture et sensorialité", "routine simple", "tolérance cutanée annoncée seulement si testée"],
    objections: ["« est-ce adapté à ma peau ? »", "« combien de temps dure le flacon ? »", "« la texture colle-t-elle ? »"],
    vocabulary: ["texture", "fini", "rituel", "application", "flacon", "actifs"],
    forbidden: ["anti-âge ou anti-rides non prouvés", "« hypoallergénique » sans test", "« naturel à 100 % » sans composition", "toute allégation médicale (soigne, guérit, traite)"],
    surfaces: ["travertin clair", "verre dépoli", "tissu éponge écru", "eau en gouttelettes sur marbre"],
    light: "lumière douce et diffuse venant de la gauche, reflets maîtrisés sur le verre, ombres courtes",
    details: ["pipette et goutte suspendue", "étiquette et liste INCI", "texture étalée sur verre"],
    scenes: ["tablette de salle de bains épurée au matin", "trousse de voyage ouverte", "main tenant le flacon près d'une serviette"],
    motion: ["goutte qui tombe au ralenti", "rotation lente du flacon", "texture qui s'étale en macro"],
    hooks: ["Votre routine en trois gestes", "Ce qu'il y a vraiment dans ce flacon", "Le geste du soir"],
    trust: ["liste INCI complète", "contenance réelle", "conseils d'utilisation", "précautions d'emploi"],
    seasons: ["routine d'hiver", "peau de rentrée", "trousse de vacances"],
    pinKeywords: ["routine soin visage", "sérum visage", "salle de bain minimaliste"],
    shopFocus: ["composition et actifs", "mode d'emploi", "précautions", "contenance"],
    tone: "précis, apaisant, sans jargon médical",
  },
  {
    id: "mode",
    label: "Mode & accessoires",
    buyer: "acheteurs sensibles à la coupe, à la matière et à la façon de porter la pièce",
    drivers: ["coupe et tombé", "matière et toucher", "polyvalence des tenues", "guide des tailles fiable"],
    objections: ["« quelle taille choisir ? »", "« la couleur est-elle fidèle ? »", "« comment l'entretenir ? »"],
    vocabulary: ["coupe", "tombé", "matière", "finitions", "silhouette", "porté"],
    forbidden: ["« éco-responsable » sans preuve", "« made in France » non vérifié", "« taille parfaitement » sans guide"],
    surfaces: ["béton ciré", "lin froissé", "bois clair", "fond papier coloré"],
    light: "lumière latérale franche qui révèle la texture du tissu, ombres nettes",
    details: ["coutures et surpiqûres", "étiquette et composition", "fermetures et boutons"],
    scenes: ["rue ensoleillée en début de matinée", "atelier lumineux avec portant", "à plat sur un lit défait"],
    motion: ["tissu qui ondule au ralenti", "transition de tenue au clap", "zoom sur une couture"],
    hooks: ["Trois façons de le porter", "La matière, de près", "Le détail que l'on remarque"],
    trust: ["guide des tailles", "composition exacte", "conseils d'entretien", "mensurations du mannequin si photo portée"],
    seasons: ["vestiaire de rentrée", "mi-saison", "fêtes de fin d'année"],
    pinKeywords: ["tenue minimaliste", "idée de tenue", "garde-robe capsule"],
    shopFocus: ["guide des tailles", "composition", "entretien", "photos portées"],
    tone: "assuré, visuel, concret sur la matière",
  },
  {
    id: "bijoux",
    label: "Bijoux & montres",
    buyer: "personnes qui achètent pour elles ou pour offrir, très attentives aux matériaux et aux finitions",
    drivers: ["matériau et titre exacts", "finitions", "écrin et présentation cadeau", "taille et dimensions"],
    objections: ["« cela noircit-il ? »", "« quelle est la vraie taille ? »", "« est-ce un bon cadeau ? »"],
    vocabulary: ["éclat", "finition", "maille", "pierre", "écrin", "porté"],
    forbidden: ["« or massif » ou « argent 925 » sans poinçon confirmé", "« pierre précieuse » non certifiée", "« hypoallergénique » non testé"],
    surfaces: ["velours profond", "pierre brute", "soie froissée", "miroir noir"],
    light: "lumière ponctuelle pour faire scintiller, réflecteurs pour des reflets propres, fond sombre maîtrisé",
    details: ["fermoir", "sertissage", "poinçon ou gravure"],
    scenes: ["poignet en lumière naturelle", "écrin ouvert sur une table", "main posée sur une étoffe"],
    motion: ["reflet qui balaie le bijou", "rotation macro", "écrin qui s'ouvre"],
    hooks: ["Le détail qui accroche la lumière", "À offrir (ou à garder)", "Le bijou de tous les jours"],
    trust: ["matériau et poinçon", "dimensions et poids", "entretien", "emballage cadeau réel"],
    seasons: ["fête des mères", "Saint-Valentin", "fin d'année"],
    pinKeywords: ["bijou minimaliste", "idée cadeau femme", "collier délicat"],
    shopFocus: ["matériaux", "dimensions", "entretien", "emballage"],
    tone: "élégant, sobre, rassurant sur les matériaux",
  },
  {
    id: "maison",
    label: "Maison & décoration",
    buyer: "personnes qui aménagent et cherchent des objets beaux et utiles, attentives aux dimensions",
    drivers: ["dimensions et intégration dans la pièce", "matière", "usage quotidien", "facilité d'entretien"],
    objections: ["« est-ce que ça rentre ? »", "« la couleur rendra-t-elle chez moi ? »", "« est-ce fragile ? »"],
    vocabulary: ["matière", "lumière", "pièce", "ambiance", "objet", "usage"],
    forbidden: ["« fait main » sans confirmation", "« durable » chiffré sans preuve", "« compatible lave-vaisselle » non confirmé"],
    surfaces: ["chêne huilé", "lin naturel", "céramique mate", "mur à la chaux"],
    light: "lumière de fenêtre rasante avec ombres de feuillage, tons chauds",
    details: ["grain de la matière", "émaillage ou finition", "dessous de l'objet et signature"],
    scenes: ["table de petit-déjeuner", "étagère composée", "coin lecture en fin de journée"],
    motion: ["lumière qui traverse la pièce", "vapeur d'une tasse", "main qui pose l'objet"],
    hooks: ["L'objet qui change la pièce", "Le rituel du matin", "Fait pour durer"],
    trust: ["dimensions précises", "matière", "entretien", "conditions de livraison des objets fragiles"],
    seasons: ["cocooning d'automne", "table de fêtes", "renouveau de printemps"],
    pinKeywords: ["déco minimaliste", "intérieur chaleureux", "table dressée"],
    shopFocus: ["dimensions", "matières", "entretien", "emballage"],
    tone: "chaleureux, sensoriel, pratique",
  },
  {
    id: "hightech",
    label: "High-tech & gadgets",
    buyer: "acheteurs comparateurs, qui veulent des caractéristiques exactes et la compatibilité",
    drivers: ["fiche technique complète", "compatibilité", "autonomie et performances mesurées", "contenu de la boîte"],
    objections: ["« est-ce compatible avec mon appareil ? »", "« quelle autonomie réelle ? »", "« quelle garantie ? »"],
    vocabulary: ["compatibilité", "autonomie", "connectique", "prise en main", "réglages", "boîte"],
    forbidden: ["chiffres d'autonomie ou de performance non fournis", "certifications (CE, IP) non confirmées", "« le meilleur du marché »"],
    surfaces: ["bureau en noyer sombre", "fond dégradé anthracite", "tapis de bureau en feutre", "aluminium brossé"],
    light: "lumière froide et nette, liserés lumineux sur les arêtes, reflets contrôlés",
    details: ["connectique", "boutons et voyants", "texture du revêtement"],
    scenes: ["poste de travail le soir", "sac de voyage", "table de salon avec écran"],
    motion: ["éclaté du produit", "allumage des voyants", "rotation sur fond sombre"],
    hooks: ["Ce qui est dans la boîte", "Branché en dix secondes", "Ce que ça change sur votre bureau"],
    trust: ["fiche technique", "compatibilités", "garantie réelle", "notice"],
    seasons: ["rentrée", "Black Friday (sans fausse promotion)", "cadeaux de fin d'année"],
    pinKeywords: ["setup bureau", "gadget utile", "organisation bureau"],
    shopFocus: ["caractéristiques", "compatibilités", "contenu de la boîte", "garantie"],
    tone: "clair, factuel, sans surenchère",
  },
  {
    id: "sport",
    label: "Sport & plein air",
    buyer: "sportifs et amateurs d'extérieur, qui veulent du matériel fiable et léger",
    drivers: ["usage réel sur le terrain", "poids et encombrement", "résistance annoncée seulement si testée", "entretien"],
    objections: ["« est-ce que ça tient dans mon sac ? »", "« est-ce étanche ? »", "« combien de temps garde-t-il au chaud/froid ? »"],
    vocabulary: ["terrain", "sortie", "léger", "prise en main", "effort", "aventure"],
    forbidden: ["durées d'isolation ou d'étanchéité non confirmées", "« incassable »", "allégations de performance sportive"],
    surfaces: ["roche granitique", "planche de bois brut", "herbe humide", "piste d'athlétisme"],
    light: "lumière naturelle dorée de début ou fin de journée, contre-jour léger",
    details: ["bouchon et filetage", "texture antidérapante", "logo gravé"],
    scenes: ["sentier de montagne au lever du soleil", "vestiaire après l'effort", "vélo appuyé contre un mur"],
    motion: ["plan en mouvement sur le sentier", "gouttes de condensation", "insertion rapide dans le sac"],
    hooks: ["Prêt pour la sortie de demain", "Ce qu'il y a dans mon sac", "Testé sur le terrain"],
    trust: ["capacité et poids", "matériaux", "entretien", "résultats de tests réels s'ils existent"],
    seasons: ["reprise de janvier", "randonnée d'été", "rentrée sportive"],
    pinKeywords: ["équipement randonnée", "gourde isotherme", "sac de sport"],
    shopFocus: ["caractéristiques", "usages", "entretien", "dimensions"],
    tone: "énergique, direct, concret",
  },
  {
    id: "alimentation",
    label: "Alimentation & boissons",
    buyer: "gourmets et curieux, attentifs aux ingrédients, à l'origine et à la conservation",
    drivers: ["goût décrit avec précision", "ingrédients et allergènes", "origine vérifiée", "idées de dégustation"],
    objections: ["« contient-il des allergènes ? »", "« combien de temps se conserve-t-il ? »", "« comment le déguster ? »"],
    vocabulary: ["saveur", "notes", "dégustation", "recette", "origine", "accord"],
    forbidden: ["« bio » sans certification", "allégations nutritionnelles ou santé non autorisées", "origine non confirmée", "« fait maison » non vérifié"],
    surfaces: ["planche de bois patinée", "lin écru", "ardoise", "nappe à carreaux"],
    light: "lumière chaude et latérale, profondeur de champ courte, textures appétissantes",
    details: ["étiquette et liste d'ingrédients", "texture en gros plan", "bouchon ou fermeture"],
    scenes: ["table de brunch partagée", "plan de travail avec ingrédients", "panier de pique-nique"],
    motion: ["versement au ralenti", "vapeur qui s'élève", "cuillère qui plonge"],
    hooks: ["La recette en 30 secondes", "D'où vient ce goût", "À servir avec…"],
    trust: ["liste d'ingrédients et allergènes", "conservation", "origine", "poids net"],
    seasons: ["apéritifs d'été", "fêtes de fin d'année", "goûter de rentrée"],
    pinKeywords: ["recette facile", "épicerie fine", "idée apéro"],
    shopFocus: ["ingrédients", "allergènes", "conservation", "idées recettes"],
    tone: "gourmand, sensoriel, honnête",
  },
  {
    id: "enfants",
    label: "Bébé & enfants",
    buyer: "parents et proches, qui recherchent sécurité, simplicité et informations d'âge claires",
    drivers: ["âge recommandé", "matériaux", "facilité d'entretien", "praticité au quotidien"],
    objections: ["« est-ce adapté à son âge ? »", "« de quoi est-ce fait ? »", "« comment le laver ? »"],
    vocabulary: ["âge", "éveil", "quotidien", "doux", "pratique", "famille"],
    forbidden: ["normes de sécurité (EN 71, etc.) non confirmées", "bénéfices de développement non prouvés", "« sans danger » absolu"],
    surfaces: ["tapis de jeu en laine", "bois clair", "drap en coton", "mur pastel"],
    light: "lumière douce et lumineuse, tons pastel, ombres légères",
    details: ["coutures et finitions", "étiquette d'âge et de matières", "fermetures"],
    scenes: ["chambre d'enfant rangée", "sac à langer ouvert", "moment de jeu au sol"],
    motion: ["objet posé délicatement", "rotation lente sur fond pastel", "mains de parent qui ajustent"],
    hooks: ["Pour les petits, pensé pour les parents", "Ce qu'il faut savoir avant d'acheter", "Dans le sac à langer"],
    trust: ["âge recommandé", "normes confirmées", "matières", "entretien"],
    seasons: ["naissance", "rentrée en crèche", "Noël"],
    pinKeywords: ["chambre bébé", "liste de naissance", "jouet en bois"],
    shopFocus: ["âge", "sécurité", "matières", "entretien"],
    tone: "rassurant, doux, précis",
  },
  {
    id: "animaux",
    label: "Animaux",
    buyer: "propriétaires d'animaux attentifs au confort, à la taille et à la sécurité de leur compagnon",
    drivers: ["taille adaptée à l'animal", "matériaux et résistance", "entretien", "usage quotidien"],
    objections: ["« quelle taille pour mon chien ? »", "« va-t-il le détruire ? »", "« comment le nettoyer ? »"],
    vocabulary: ["compagnon", "taille", "balade", "confort", "routine", "résistant"],
    forbidden: ["bénéfices vétérinaires non prouvés", "« indestructible »", "compositions alimentaires non confirmées"],
    surfaces: ["parquet chaleureux", "plaid en laine", "herbe de jardin", "carrelage de cuisine"],
    light: "lumière naturelle chaleureuse, angle à hauteur d'animal",
    details: ["fermeture ou attache", "texture", "étiquette de taille"],
    scenes: ["retour de balade", "coin repos près de la fenêtre", "voiture avant le départ"],
    motion: ["animal qui s'approche (sans le mettre en danger)", "objet qui roule", "main qui ajuste un harnais"],
    hooks: ["Le moment préféré de la journée", "Quelle taille choisir", "La balade, sans tracas"],
    trust: ["guide des tailles", "matières", "entretien", "conseils d'usage"],
    seasons: ["vacances avec l'animal", "hiver et balades", "adoption"],
    pinKeywords: ["accessoire chien", "coin chat", "balade chien"],
    shopFocus: ["tailles", "matières", "entretien", "usage"],
    tone: "complice, pratique, chaleureux",
  },
  {
    id: "artisanat",
    label: "Artisanat & papeterie",
    buyer: "amateurs de belles pièces, sensibles au geste, à la matière et aux petites séries",
    drivers: ["savoir-faire décrit", "matière et provenance", "pièce unique ou petite série", "usage et durabilité"],
    objections: ["« chaque pièce est-elle identique ? »", "« quel délai de fabrication ? »", "« comment l'entretenir ? »"],
    vocabulary: ["geste", "atelier", "matière", "série", "fait main", "pièce"],
    forbidden: ["« fait main » ou « artisanal » si non confirmé", "provenance des matières non vérifiée", "« pièce unique » si série"],
    surfaces: ["établi en bois marqué", "papier coton", "toile de lin", "pierre de l'atelier"],
    light: "lumière d'atelier latérale, poussières dans le rayon, tons naturels",
    details: ["traces d'outil", "tranche et grain du papier", "signature ou estampille"],
    scenes: ["atelier en cours de fabrication", "bureau avec carnet ouvert", "colis préparé à la main"],
    motion: ["mains au travail", "page qui se tourne", "outil qui marque la matière"],
    hooks: ["Les étapes d'une pièce", "Dans l'atelier", "Pourquoi chaque pièce diffère"],
    trust: ["étapes de fabrication", "matières", "délais réels", "entretien"],
    seasons: ["rentrée et carnets", "cadeaux de fin d'année", "fête des pères et des mères"],
    pinKeywords: ["papeterie", "fait main", "atelier créatif"],
    shopFocus: ["savoir-faire", "matières", "délais", "personnalisation"],
    tone: "authentique, posé, attentif au détail",
  },
];

export type PromptCategory = { id: string; label: string; group: "Analyse" | "Marque" | "Boutique" | "Images" | "Vidéos" | "Réseaux sociaux" | "Publicités"; target: "produit" | "marque" | "boutique" | "images" | "videos" | "social" | "publicites" | "calendrier" };

/** Ambiance conseillée par secteur pour les boutiques (directions du studio). */
const MOOD: Record<string, string> = {
  beaute: "« Atelier » (ivoire lumineux, serif contrasté, italiques dorées) ou « Nocturne » pour un parfum du soir",
  mode: "« Flux » (sportswear premium : noir et blanc, grotesque très grasse, en-tête encadré, cartes empilées, texte en courbe, vidéos verticales) ou « Brut »",
  bijoux: "« Joaillerie » (portrait plein écran, capitales espacées et mot en italique, cercles de collections, vidéos portées) ou « Galerie »",
  maison: "« Terroir » (crème et tons de terre, grandes rondeurs)",
  hightech: "« Nocturne » (nuit profonde, verre, lueurs) ou « Clinique » (blanc pur, typographie serrée)",
  sport: "« Élan » (anthracite et néon vif, italiques rapides)",
  alimentation: "« Gourmand » (crème et vert profond, serif très gras, vagues, confettis, pastilles sticker) ou « Terroir »",
  enfants: "« Pop » (couleurs franches, rebonds, très grandes rondeurs)",
  animaux: "« Pop » (couleurs franches, rebonds)",
  artisanat: "« Galerie » ou « Terroir »",
};

export const CATEGORIES: PromptCategory[] = [
  { id: "analyse", label: "Analyse produit", group: "Analyse", target: "produit" },
  { id: "positionnement", label: "Positionnement et promesse", group: "Marque", target: "marque" },
  { id: "nom", label: "Nom et signature", group: "Marque", target: "marque" },
  { id: "logo", label: "Logo et identité", group: "Marque", target: "marque" },
  { id: "boutique", label: "Boutique complète", group: "Boutique", target: "boutique" },
  { id: "accueil", label: "Retouche de l'accueil", group: "Boutique", target: "boutique" },
  { id: "fiche", label: "Fiche produit et achat", group: "Boutique", target: "boutique" },
  { id: "animation", label: "Section animée", group: "Boutique", target: "boutique" },
  { id: "packshot", label: "Packshot", group: "Images", target: "images" },
  { id: "detail", label: "Photo de détail", group: "Images", target: "images" },
  { id: "scene", label: "Scène d'usage", group: "Images", target: "images" },
  { id: "banniere", label: "Bannière de boutique", group: "Images", target: "images" },
  { id: "visuelpub", label: "Visuel publicitaire", group: "Publicités", target: "publicites" },
  { id: "videopub", label: "Publicité vidéo 15 s", group: "Vidéos", target: "videos" },
  { id: "motion", label: "Révélation en motion design", group: "Vidéos", target: "videos" },
  { id: "reel", label: "Reel ou TikTok pédagogique", group: "Réseaux sociaux", target: "social" },
  { id: "carrousel", label: "Carrousel Instagram", group: "Réseaux sociaux", target: "social" },
  { id: "pinterest", label: "Épingles Pinterest", group: "Réseaux sociaux", target: "social" },
  { id: "campagne", label: "Campagne publicitaire", group: "Publicités", target: "publicites" },
  { id: "lancement", label: "Calendrier de lancement", group: "Réseaux sociaux", target: "calendrier" },
];

export type LibraryPrompt = {
  id: string;
  sector: string;
  sectorLabel: string;
  category: string;
  categoryLabel: string;
  group: string;
  target: PromptCategory["target"];
  title: string;
  context: string;
  objective: string;
  direction: string;
  deliverable: string;
  checks: string[];
  body: string;
};

const L = (a: string[]) => a.join(", ");
const pick = <T,>(a: T[], i: number) => a[i % a.length];

/** Chaque fabrique utilise les données propres au secteur : les prompts diffèrent réellement. */
const MAKERS: Record<string, (s: SectorData) => Omit<LibraryPrompt, "id" | "sector" | "sectorLabel" | "category" | "categoryLabel" | "group" | "target" | "body">> = {
  analyse: (s) => ({
    title: `Analyser un produit ${s.label.toLowerCase()} et lister ce qui manque`,
    context: `Produit : {{produit}}. Photos et sources disponibles : {{medias}}. Faits déjà connus : {{faits}}. Les acheteurs de ce secteur sont des ${s.buyer}.`,
    objective: `Établir une fiche fiable qui distingue les faits confirmés, les observations visuelles et les inconnues, puis identifier les informations indispensables à demander avant de vendre.`,
    direction: `Observe en priorité : ${L(s.details)}. Relève tout texte imprimé mot pour mot. Pour ce secteur, les points d'achat décisifs sont : ${L(s.drivers)}. Les informations attendues sur la fiche : ${L(s.trust)}.`,
    deliverable: `1) Tableau des faits (confirmé / observé / inconnu) ; 2) au plus 5 questions indispensables, avec la raison de chacune ; 3) liste des allégations à éviter ; 4) trois zones de détail à photographier.`,
    checks: [`Aucune de ces allégations sans preuve : ${L(s.forbidden)}`, "Chaque fait indique sa source", "Les questions ne portent que sur ce qui ne se déduit pas"],
  }),
  positionnement: (s) => ({
    title: `Positionnement et promesse d'une marque ${s.label.toLowerCase()}`,
    context: `Marque : {{marque}}. Produit : {{produit}}. Cible pressentie : {{cible}}. Faits confirmés : {{faits}}.`,
    objective: `Formuler un positionnement net et crédible, qui répond aux objections typiques du secteur : ${L(s.objections)}.`,
    direction: `Ton recherché : ${s.tone}. Appuie la différence sur des éléments vérifiables (${L(s.drivers)}). Évite les promesses générales et toute formulation interdite (${L(s.forbidden)}).`,
    deliverable: `Une phrase de positionnement (pour qui, quel usage, quelle différence), trois piliers de message, une promesse courte, et la réponse honnête à chaque objection.`,
    checks: ["Chaque pilier s'appuie sur un fait confirmé", "Pas de superlatif invérifiable", "Lisible en moins de 10 secondes"],
  }),
  nom: (s) => ({
    title: `Noms de marque et signatures pour ${s.label.toLowerCase()}`,
    context: `Produit : {{produit}}. Univers visuel actuel : {{palette}}. Ton : {{ton}}.`,
    objective: `Proposer des noms courts, prononçables en français, mémorisables, et une signature qui évoque ${pick(s.vocabulary, 1)} et ${pick(s.vocabulary, 3)}.`,
    direction: `Explore quatre territoires : descriptif élégant, évocation sensorielle, nom propre inventé, mot étranger simple. Évite les noms trop proches de marques connues du secteur et les jeux de mots datés.`,
    deliverable: `8 noms (2 par territoire) avec leur intention, 3 signatures de moins de 6 mots, et le couple nom + signature recommandé avec sa justification.`,
    checks: ["Vérifier ensuite la disponibilité du nom (INPI, réseaux, domaine) avant adoption", "Aucune promesse dans la signature", "Prononciation non ambiguë"],
  }),
  logo: (s) => ({
    title: `Logo typographique et charte pour ${s.label.toLowerCase()}`,
    context: `Marque : {{marque}}. Palette : {{palette}}. Ton : {{ton}}. Supports : étiquette, favicon, réseaux sociaux, vidéo.`,
    objective: `Définir un logo lisible de 16 px à l'affiche, cohérent avec un univers « ${s.tone} ».`,
    direction: `Propose un logotype et un monogramme ; précise famille, graisse, casse, interlettrage et ornement éventuel. Pense aux usages du secteur : ${pick(s.details, 2)}, emballage, filigrane vidéo.`,
    deliverable: `Spécification du logo principal, du monogramme et de la version claire ; règles d'usage (zone de protection, taille minimale, fonds autorisés) ; deux couleurs d'accompagnement.`,
    checks: ["Contraste suffisant sur fond clair et sombre", "Lisible en monochrome", "Aucune référence à une marque existante"],
  }),
  boutique: (s) => ({
    title: `Créer une boutique premium ${s.label.toLowerCase()}`,
    context: `Produit : {{produit}}. Marque : {{marque}}. Palette : {{palette}}. Médias disponibles : {{medias}}. Cible : {{cible}}.`,
    objective: `Concevoir une boutique Shopify au niveau des grandes marques (finition Apple, Aesop, Nike), qui convertit en répondant d'abord à : ${L(s.objections)}.`,
    direction: `Direction conseillée : ${MOOD[s.id]}. En-tête en verre flottant aux coins arrondis, boutons flottants (contact, retour en haut). Héros immersif plein écran : pastille de faits courts, titre très grand dont la fin passe en italique colorée, deux boutons en pilule (principal lumineux avec reflet animé et flèche, secondaire en verre). Puis : texte d'engagement qui s'allume au défilement, cartes lumineuses numérotées (tuile d'icône en dégradé, lien « Découvrir → », contour néon au survol) sur les détails réels (${L(s.details)}), image d'usage (${pick(s.scenes, 0)}) qui se recadre au défilement, présentation du produit étape par étape, chiffres clés animés si des faits chiffrés sont confirmés, FAQ en cartes arrondies (${L(s.shopFocus)}), appel à l'action final sur image. Lumière : ${s.light}.`,
    deliverable: `Structure ordonnée de l'accueil (8 à 10 sections) et de la fiche produit, avec titres courts, mots d'accent, textes de 1 à 2 phrases, images associées et réglages globaux (forme de l'en-tête, reflets, lueurs, arrondis, animations) ; pages Histoire, FAQ, Contact, Livraison et retours.`,
    checks: ["Rendu actuel et premium sur téléphone comme sur ordinateur, aucun aspect de modèle générique", "Aucun avis, note, chiffre ou promotion inventés", `Informations « à compléter » visibles si inconnues (${L(s.trust)})`, "Animations douces et désactivées si l'utilisateur réduit les mouvements", "Bouton d'achat accessible à tout moment sur mobile"],
  }),
  accueil: (s) => ({
    title: `Rendre l'accueil spectaculaire (${s.label.toLowerCase()})`,
    context: `Boutique actuelle de {{marque}}. Produit : {{produit}}. Images disponibles : {{medias}}.`,
    objective: `Une ouverture qui saisit en une seconde, comme une page de lancement de grande marque : on comprend le produit et on a envie de défiler.`,
    direction: `Héros plein écran sur l'image la plus large (${pick(s.scenes, 1)}) avec voile dégradé dans la couleur de fond ; pastille de trois faits courts ; titre de 4 à 8 mots autour de « ${pick(s.hooks, 0)} », dont les deux derniers mots en italique colorée ; texte d'une phrase ; bouton principal lumineux à reflet et bouton secondaire en verre. Titres qui apparaissent mot à mot, léger zoom lent sur l'image. Si utile, bandeau défilant avec trois expressions du secteur (${L(s.vocabulary.slice(0, 4))}). Conserver les sections déjà validées.`,
    deliverable: `Modifications ciblées du héros (pastille, titre et mot d'accent, texte, image, boutons) et de l'en-tête (verre flottant), sans toucher au reste.`,
    checks: ["Ne pas modifier les sections verrouillées", "Contraste du texte sur l'image ≥ 4,5:1", "Lisible sur un écran de 375 px, image en haut et texte dessous sur téléphone"],
  }),
  fiche: (s) => ({
    title: `Fiche produit premium et parcours d'achat (${s.label.toLowerCase()})`,
    context: `Fiche produit de {{produit}} chez {{marque}}. Faits confirmés : {{faits}}.`,
    objective: `Une fiche aussi soignée que celle d'une grande marque, qui lève les freins propres au secteur : ${L(s.objections)}.`,
    direction: `Galerie grand format qui défile au doigt sur mobile ; titre, prix, accroche, variantes en pastilles arrondies (la sélection s'illumine dans la couleur d'accent), ajout au panier lumineux, points forts vérifiés avec coches, onglets en cartes arrondies (${L(s.shopFocus)}), réassurance réelle uniquement. Barre d'achat en verre qui suit le défilement sur mobile, panier latéral fluide.`,
    deliverable: `Textes des blocs, contenu des onglets, réglages de présentation et liste des informations à fournir par le marchand pour compléter la fiche.`,
    checks: ["Points forts tirés des faits confirmés", "Aucune urgence artificielle", `Pas de : ${pick(s.forbidden, 0)}`, "Bouton d'achat visible sans défiler sur téléphone"],
  }),
  animation: (s) => ({
    title: `Séquence animée façon page de lancement (${s.label.toLowerCase()})`,
    context: `Boutique de {{marque}}. Produit : {{produit}}. Images de détail : {{medias}}.`,
    objective: `Créer une séquence qui révèle le produit pendant le défilement, comme les pages de lancement des grandes marques, sans gêner la lecture ni l'achat.`,
    direction: `Image collante qui change à chaque étape avec un léger zoom, étapes de l'autre côté : ${L(s.details)}. Phrase d'engagement dont les mots s'allument un à un au défilement, chiffres qui défilent jusqu'à leur valeur (faits confirmés uniquement). Mouvements inspirés de : ${pick(s.motion, 0)}. Lueur douce dans la couleur d'accent autour du produit.`,
    deliverable: `Une section (existante ou sur mesure) avec 3 à 4 étapes : titre court, texte de deux phrases, image associée ; réglages modifiables dans l'éditeur Shopify.`,
    checks: ["Respect de prefers-reduced-motion", "Aucun texte caché derrière l'image sur mobile", "Fluide à 60 images par seconde (transformations et opacité uniquement)", "Réglages modifiables dans l'éditeur Shopify"],
  }),
  packshot: (s) => ({
    title: `Packshot e-commerce ${s.label.toLowerCase()}`,
    context: `Produit : {{produit}} (photo de référence : {{medias}}). Couleurs mesurées : {{palette}}.`,
    objective: `Obtenir une image de fiche produit nette, fidèle, centrée, sur fond blanc puis sur fond de marque.`,
    direction: `${s.light}. Ombre de contact douce, cadrage centré avec 12 % de marge, aucun accessoire. Pour la variante fond de marque, choisir une teinte claire qui fait ressortir le produit.`,
    deliverable: `Deux images carrées 2000 × 2000 px (fond blanc, fond de marque), produit identique à la photo de référence.`,
    checks: ["Forme, proportions, couleurs, étiquette et logo identiques à la référence", "Pas de reflet parasite ni de bord détouré visible", "Fond blanc pur pour les places de marché"],
  }),
  detail: (s) => ({
    title: `Photos de détail ${s.label.toLowerCase()}`,
    context: `Produit : {{produit}}. Photo originale haute définition : {{medias}}.`,
    objective: `Montrer la qualité réelle par des gros plans tirés de la photo d'origine (aucune génération sur le produit).`,
    direction: `Recadrages prioritaires : ${L(s.details)}. Format 4:5, netteté renforcée légèrement, aucune modification de couleur.`,
    deliverable: `Deux à trois recadrages 1600 × 2000 px, chacun associé à une légende factuelle.`,
    checks: ["Pixels issus de la photo originale", "Texte de l'étiquette lisible", "Légendes sans allégation non confirmée"],
  }),
  scene: (s) => ({
    title: `Scène d'usage ${s.label.toLowerCase()}`,
    context: `Produit : {{produit}}. Marque : {{marque}}. Palette : {{palette}}.`,
    objective: `Montrer le produit dans un contexte crédible et désirable sans en modifier l'apparence.`,
    direction: `Décor : ${pick(s.scenes, 0)} ; surface : ${pick(s.surfaces, 0)} ; ${s.light}. Le décor reste sobre pour que le produit domine ; pas de texte dans l'image.`,
    deliverable: `Une scène 4:5 (1600 × 2000) et une variante 16:9 pour la boutique, produit réel composé dans le décor.`,
    checks: ["Le produit est l'objet de la photo de référence, à la même échelle crédible", "Ombre cohérente avec la direction de la lumière", "Aucun autre produit de marque visible"],
  }),
  banniere: (s) => ({
    title: `Bannière d'accueil ${s.label.toLowerCase()}`,
    context: `Boutique de {{marque}}. Produit : {{produit}}. Palette : {{palette}}.`,
    objective: `Créer une bannière large qui laisse un espace calme pour le titre du thème (texte ajouté dans Shopify, pas dans l'image).`,
    direction: `Composition : produit décalé à droite, zone vide à gauche ; surface ${pick(s.surfaces, 1)} ; ${s.light}.`,
    deliverable: `Bannière 2400 × 1200 et version 16:9, sans texte incrusté.`,
    checks: ["Zone de texte assez contrastée", "Recadrage mobile sans couper le produit", "Poids optimisé pour le web"],
  }),
  visuelpub: (s) => ({
    title: `Visuel publicitaire statique ${s.label.toLowerCase()}`,
    context: `Produit : {{produit}}. Marque : {{marque}}. Ton : {{ton}}.`,
    objective: `Arrêter le défilement et donner une raison concrète de cliquer.`,
    direction: `Accroche : « ${pick(s.hooks, 1)} » adaptée au produit ; un seul message ; produit grand et net ; bouton « Découvrir ». Variantes 1:1, 4:5 et 9:16 avec marges de sécurité.`,
    deliverable: `Trois visuels avec titre (2 à 6 mots), sous-titre factuel et appel à l'action, textes composés typographiquement.`,
    checks: ["Orthographe parfaite", "Texte lisible sur téléphone (≥ 4 % de la largeur)", `Aucune mention : ${L(s.forbidden.slice(0, 2))}`],
  }),
  videopub: (s) => ({
    title: `Publicité vidéo 15 secondes ${s.label.toLowerCase()}`,
    context: `Produit : {{produit}}. Marque : {{marque}}. Médias : {{medias}}.`,
    objective: `Une publicité verticale qui capte en 2 secondes et finit sur un appel à l'action clair.`,
    direction: `Découpage : accroche (« ${pick(s.hooks, 2)} »), révélation du produit, 2 à 3 éléments confirmés, détail en gros plan (${pick(s.details, 0)}), écran final. Mouvement : ${pick(s.motion, 1)}.`,
    deliverable: `Vidéo 9:16 de 12 à 18 s, MP4 H.264, sous-titres SRT, version 1:1.`,
    checks: ["Textes de 2 à 6 mots par plan", "Produit fidèle sur toute la durée", "Marges de sécurité respectées (haut 12 %, bas 20 %)"],
  }),
  motion: (s) => ({
    title: `Révélation du produit en motion design (${s.label.toLowerCase()})`,
    context: `Produit détouré de {{produit}}. Palette : {{palette}}. Logo : {{marque}}.`,
    objective: `Une animation élégante pour la boutique et les réseaux, sans plan filmé.`,
    direction: `Fond de marque, apparition du produit (${pick(s.motion, 2)}), balayage lumineux sur la matière, typographie animée mot par mot, transition graphique, fin sur le logo.`,
    deliverable: `Vidéo 16:9 en boucle pour la boutique (sans son) et 9:16 avec musique douce.`,
    checks: ["Animation fluide à 30 i/s", "Aucun texte trop rapide (≥ 1,6 s par plan)", "Boucle sans saut pour la version boutique"],
  }),
  reel: (s) => ({
    title: `Reel ou TikTok pédagogique (${s.label.toLowerCase()})`,
    context: `Produit : {{produit}}. Questions fréquentes des acheteurs : ${L(s.objections)}.`,
    objective: `Répondre à une vraie question en moins de 20 secondes et donner envie d'en savoir plus.`,
    direction: `Format face caméra ou mains + texte à l'écran ; première phrase = la question ; démonstration ${pick(s.scenes, 2)} ; ton ${s.tone}.`,
    deliverable: `Script plan par plan, textes à l'écran, légende native et 3 à 5 hashtags précis.`,
    checks: ["Réponse fondée sur les faits confirmés", "Pas de tendance sonore protégée sans droits", "Lisible sans le son"],
  }),
  carrousel: (s) => ({
    title: `Carrousel Instagram (${s.label.toLowerCase()})`,
    context: `Produit : {{produit}}. Marque : {{marque}}. Visuels : {{medias}}.`,
    objective: `Un carrousel enregistrable qui apprend quelque chose d'utile sur ${pick(s.drivers, 0)}.`,
    direction: `6 diapositives : couverture avec promesse claire, 4 diapositives de contenu (${L(s.shopFocus)}), dernière diapositive avec appel à l'action. Mise en page cohérente avec la charte.`,
    deliverable: `Textes de chaque diapositive (titre + 1 phrase), légende avec accroche en première ligne, hashtags.`,
    checks: ["Une idée par diapositive", "Cohérence typographique", "Aucune information non confirmée"],
  }),
  pinterest: (s) => ({
    title: `Épingles Pinterest (${s.label.toLowerCase()})`,
    context: `Produit : {{produit}}. Lien de la boutique : {{lien}}.`,
    objective: `Être trouvé en recherche sur des intentions comme : ${L(s.pinKeywords)}.`,
    direction: `Visuels verticaux 2:3 ; titres descriptifs avec mots-clés ; descriptions utiles de 2 à 3 phrases ; ambiance ${pick(s.surfaces, 2)}.`,
    deliverable: `5 épingles (titre < 100 caractères, description, mot-clé principal, visuel associé).`,
    checks: ["Titres non trompeurs", "Lien vers la bonne page produit", "Pas de surcharge de hashtags"],
  }),
  campagne: (s) => ({
    title: `Campagne publicitaire de lancement (${s.label.toLowerCase()})`,
    context: `Produit : {{produit}}. Marque : {{marque}}. Objectifs : {{objectifs}}. Budget : à définir par le marchand.`,
    objective: `Structurer une campagne test claire, mesurable, avec des angles différenciés.`,
    direction: `Trois angles : ${L(s.hooks)}. Audiences : ${s.buyer}. Saisonnalité possible : ${L(s.seasons)}. Formats : vidéo 9:16, visuel 1:1, carrousel.`,
    deliverable: `Plan de campagne : objectifs, audiences, angles × formats, textes principaux, titres, appels à l'action, indicateurs à suivre. Aucune dépense n'est engagée sans validation.`,
    checks: ["Respect des règles publicitaires du réseau", `Aucune allégation interdite (${L(s.forbidden.slice(0, 2))})`, "Budget et lancement validés par le marchand"],
  }),
  lancement: (s) => ({
    title: `Calendrier de lancement sur 14 jours (${s.label.toLowerCase()})`,
    context: `Produit : {{produit}}. Réseaux : Instagram, TikTok, Pinterest, Facebook. Médias : {{medias}}.`,
    objective: `Préparer deux semaines de publications variées qui amènent progressivement vers l'achat.`,
    direction: `Semaine 1 : découverte (coulisses, détails ${pick(s.details, 1)}, question à la communauté). Semaine 2 : preuve et usage (${pick(s.scenes, 1)}, pédagogie, rappel du produit). Varier formats et angles ; adapter le texte à chaque réseau.`,
    deliverable: `14 publications datées : réseau, format, angle, titre, légende, média, horaire conseillé.`,
    checks: ["Pas deux publications identiques sur deux réseaux", "Médias au bon format", "Chaque publication validée avant programmation"],
  }),
};

function assemble(p: Omit<LibraryPrompt, "body">): string {
  return `## Contexte
${p.context}

## Objectif
${p.objective}

## Direction créative
${p.direction}

## Résultat attendu
${p.deliverable}

## Contrôles avant de valider
${p.checks.map((c) => `- ${c}`).join("\n")}
- Respecter les décisions et préférences déjà enregistrées pour le projet
- Toute information inconnue reste « [À compléter : …] »`;
}

let cache: LibraryPrompt[] | null = null;
export function libraryPrompts(): LibraryPrompt[] {
  if (cache) return cache;
  const out: LibraryPrompt[] = [];
  for (const s of SECTOR_DATA) {
    for (const c of CATEGORIES) {
      const made = MAKERS[c.id](s);
      const base = { id: `${s.id}-${c.id}`, sector: s.id, sectorLabel: s.label, category: c.id, categoryLabel: c.label, group: c.group, target: c.target, ...made };
      out.push({ ...base, body: assemble(base) });
    }
  }
  cache = out;
  return out;
}

export const PROMPT_STATS = { total: SECTOR_DATA.length * CATEGORIES.length, sectors: SECTOR_DATA.length, perSector: CATEGORIES.length };

/** Complète les variables avec le contexte du projet actif. */
export function fillPrompt(body: string, vars: Record<string, string>): string {
  return body.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `[${k} : à préciser]`);
}
