/**
 * Catalogue des modèles IMAGES et VIDÉOS (données pures, sans dépendance) : fournisseur, identifiant exact,
 * adaptateur réel du studio, capacités, qualité relative, formats, résolution, durées, statut chez le fournisseur
 * et niveau de vérification. Les tarifs restent dans config.ts / l'administration (« Tarifs des fournisseurs »).
 *
 * Règles :
 *  - un modèle sans adaptateur réel n'est jamais appelé ;
 *  - `verified.id` / `verified.price` : confirmés sur une source officielle du fournisseur ; sinon le modèle reste
 *    verrouillé tant que l'administration ne l'a pas confirmé (et son tarif renseigné) ;
 *  - `defaultFor` : modèles du routage historique (principal actuel) — inchangés tant que l'administration ne choisit
 *    pas d'autres routes ;
 *  - `legacyDefault` : modèle appelé chez ce fournisseur quand aucun n'a été choisi (comportement d'avant).
 */
export type MediaKind = "image" | "video";
export type MediaAdapter = "openai_image" | "gemini_image" | "fal_image" | "veo" | "fal_video" | null;

export type MediaModel = {
  provider: "openai" | "google" | "fal";
  model: string;
  label: string;
  kind: MediaKind;
  adapter: MediaAdapter;
  /** Qualité relative attendue (3 = haut de gamme) : point de départ, corrigé par les notes observées. */
  quality: 1 | 2 | 3;
  caps: {
    maskEdit?: boolean;
    /** Nombre d'images de référence acceptées. */
    references?: number;
    transparent?: boolean;
    textInImage?: boolean;
    imageToVideo?: boolean;
    textToVideo?: boolean;
    audio?: boolean;
    people?: boolean;
    /** Réponse en flux (images partielles) : connexion jamais muette pendant une longue génération. */
    stream?: boolean;
  };
  aspects: string[];
  resolution: string;
  /** Vidéo : durées acceptées (secondes). */
  durations?: number[];
  /** Le modèle exige au moins une image de référence (endpoint « edit »). */
  needsReference?: boolean;
  /** Paramètres d'entrée confirmés par une source officielle (sinon : à valider au premier essai réel). */
  paramsVerified?: boolean;
  /** Volume d'une génération typique, pour le coût affiché. */
  typical: { seconds?: number; inputTokens?: number; outputTokens?: number };
  /** Tarif officiel relevé, affiché comme aide (le tarif appliqué reste celui de l'administration). */
  priceNote: string;
  /** stable ; preview (fournisseur : en aperçu) ; legacy (ancienne génération, encore acceptée, remplaçant conseillé). */
  status: "stable" | "preview" | "legacy" | "deprecated";
  /** Date d'arrêt annoncée (ISO). */
  shutdown?: string;
  /** Remplaçant conseillé (« fournisseur:modèle »). */
  replacement?: string;
  verified: { id: boolean; price: boolean };
  defaultFor?: "primary";
  legacyDefault?: boolean;
  source: string;
  use: { fr: string; en: string };
};

export const MEDIA_MODELS: MediaModel[] = [
  // ------------------------------------------------------------ images
  {
    provider: "openai",
    model: "gpt-image-1",
    label: "OpenAI GPT Image 1",
    kind: "image",
    adapter: "openai_image",
    quality: 3,
    caps: { maskEdit: true, references: 4, transparent: true, textInImage: true, people: true, stream: true },
    aspects: ["1:1", "2:3", "3:2"],
    resolution: "1024×1024, 1024×1536, 1536×1024",
    typical: { inputTokens: 1500, outputTokens: 4160 },
    priceNote: "5 $ / M jetons texte, 10 $ / M jetons image en entrée, 40 $ / M jetons image en sortie (≈ 0,17 $ en haute qualité 1024²)",
    status: "stable",
    verified: { id: true, price: true },
    defaultFor: "primary",
    legacyDefault: true,
    source: "https://raw.githubusercontent.com/openai/openai-openapi/master/openapi.yaml",
    use: { fr: "Scènes produit par retouche du décor autour du vrai produit (fidélité garantie), logos complets avec le nom.", en: "Product scenes by editing the background around the real product (guaranteed fidelity), full logos with the name." },
  },
  {
    provider: "google",
    model: "gemini-2.5-flash-image",
    label: "Gemini 2.5 Flash Image",
    kind: "image",
    adapter: "gemini_image",
    quality: 2,
    caps: { references: 3, textInImage: false, people: true },
    aspects: ["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"],
    resolution: "≈ 1024 px (1 290 jetons par image)",
    typical: {},
    priceNote: "≈ 0,039 $ par image",
    // Encore cité dans le guide Veo officiel, absent des modèles actuels du guide « Nano Banana » : arrêt NON VÉRIFIÉ.
    status: "legacy",
    replacement: "google:gemini-3.1-flash-image",
    verified: { id: true, price: true },
    legacyDefault: true,
    source: "https://cloud.google.com/vertex-ai/generative-ai/pricing",
    use: { fr: "Décors vides sur lesquels le vrai produit détouré est composé, images d'ambiance, symboles de logo.", en: "Empty sets on which the real cut-out product is composited, mood images, logo symbols." },
  },
  // Modèles récents : identifiants confirmés par la spécification officielle d'OpenAI (enum des modèles d'image).
  // Tarifs NON VÉRIFIÉS (page officielle inaccessible) : verrouillés jusqu'à confirmation ; le coût maximal se borne
  // par un tarif « par image » saisi dans l'administration (jetons de sortie par taille inconnus pour ces modèles).
  {
    provider: "openai",
    model: "gpt-image-1.5",
    label: "OpenAI GPT Image 1.5",
    kind: "image",
    adapter: "openai_image",
    quality: 3,
    caps: { maskEdit: true, references: 16, transparent: true, textInImage: true, people: true },
    aspects: ["1:1", "2:3", "3:2"],
    resolution: "1024×1024, 1024×1536, 1536×1024",
    typical: {},
    priceNote: "NON VÉRIFIÉ — à relever sur openai.com/api/pricing (saisir un tarif par image)",
    status: "stable",
    verified: { id: true, price: false },
    paramsVerified: true,
    source: "https://raw.githubusercontent.com/openai/openai-openapi/master/openapi.yaml",
    use: { fr: "Même usage que GPT Image 1 (retouche par masque, logos), génération suivante.", en: "Same use as GPT Image 1 (mask editing, logos), next generation." },
  },
  {
    provider: "openai",
    model: "gpt-image-2",
    label: "OpenAI GPT Image 2",
    kind: "image",
    adapter: "openai_image",
    quality: 3,
    // Fond transparent « en aperçu » selon la spécification : non retenu comme capacité.
    // Flux vérifié par un essai réel (logo complet, 1024², haute qualité, 2 aperçus, 92 s).
    caps: { maskEdit: true, references: 16, textInImage: true, people: true, stream: true },
    aspects: ["1:1", "2:3", "3:2"],
    resolution: "taille libre jusqu'à 3840×2160 (le studio demande 1024–1536 px)",
    typical: {},
    priceNote: "NON VÉRIFIÉ — à relever sur openai.com/api/pricing (saisir un tarif par image)",
    status: "stable",
    verified: { id: true, price: false },
    paramsVerified: true,
    source: "https://raw.githubusercontent.com/openai/openai-openapi/master/openapi.yaml",
    use: { fr: "Scènes produit et visuels publicitaires de haute qualité, texte lisible.", en: "High-quality product scenes and ad visuals, readable text." },
  },
  {
    provider: "openai",
    model: "gpt-image-2.5-flare",
    label: "OpenAI GPT Image 2.5 Flare",
    kind: "image",
    adapter: "openai_image",
    quality: 3,
    caps: { maskEdit: true, references: 16, transparent: true, textInImage: true, people: true },
    aspects: ["1:1", "2:3", "3:2"],
    resolution: "taille libre jusqu'à 3840×2160 (le studio demande 1024–1536 px)",
    typical: {},
    priceNote: "NON VÉRIFIÉ — à relever sur openai.com/api/pricing (saisir un tarif par image)",
    status: "stable",
    verified: { id: true, price: false },
    paramsVerified: true,
    source: "https://raw.githubusercontent.com/openai/openai-openapi/master/openapi.yaml",
    use: { fr: "Dernière génération OpenAI : logos complets, visuels publicitaires avec texte.", en: "Latest OpenAI generation: full logos, ad visuals with text." },
  },
  // Google : identifiants du guide officiel « Nano Banana » (google-gemini/cookbook). Tarifs : page Vertex AI
  // (indicative pour l'API Gemini) → à confirmer dans l'administration.
  {
    provider: "google",
    model: "gemini-3.1-flash-image",
    label: "Gemini 3.1 Flash Image (Nano Banana 2)",
    kind: "image",
    adapter: "gemini_image",
    quality: 3,
    caps: { references: 6, textInImage: true, people: true },
    aspects: ["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"],
    resolution: "1K par défaut (512, 2K, 4K possibles)",
    typical: {},
    priceNote: "Vertex AI : 0,067 $ par image en 1K (prix API Gemini à confirmer)",
    status: "stable",
    verified: { id: true, price: false },
    paramsVerified: true,
    source: "https://github.com/google-gemini/cookbook/blob/main/quickstarts/Get_Started_Nano_Banana.ipynb",
    use: { fr: "Décors, ambiances, personnes des vidéos UGC avec le vrai produit en référence.", en: "Sets, mood images, UGC people with the real product as reference." },
  },
  {
    provider: "google",
    model: "gemini-3-pro-image-preview",
    label: "Gemini 3 Pro Image (Nano Banana Pro, aperçu)",
    kind: "image",
    adapter: "gemini_image",
    quality: 3,
    caps: { references: 6, textInImage: true, people: true },
    aspects: ["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"],
    resolution: "1K / 2K (4K possible)",
    typical: {},
    priceNote: "Vertex AI : 0,134 $ par image en 1K ou 2K (prix API Gemini à confirmer)",
    status: "preview",
    verified: { id: true, price: false },
    paramsVerified: true,
    source: "https://github.com/google-gemini/cookbook/blob/main/quickstarts/Get_Started_Nano_Banana.ipynb",
    use: { fr: "Haut de gamme Google : logos avec texte, visuels publicitaires exigeants.", en: "Google's top tier: logos with text, demanding ad visuals." },
  },
  {
    provider: "google",
    model: "gemini-3.1-flash-lite-image",
    label: "Gemini 3.1 Flash-Lite Image",
    kind: "image",
    adapter: "gemini_image",
    quality: 1,
    caps: { references: 3, people: true },
    aspects: ["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9"],
    resolution: "1K",
    typical: {},
    priceNote: "Vertex AI : 0,034 $ par image en 1K (prix API Gemini à confirmer)",
    status: "stable",
    verified: { id: true, price: false },
    paramsVerified: true,
    source: "https://github.com/google-gemini/cookbook/blob/main/quickstarts/Get_Started_Nano_Banana.ipynb",
    use: { fr: "Brouillons et volumes importants, qualité inférieure.", en: "Drafts and high volumes, lower quality." },
  },
  // fal.ai : endpoints « edit » listés par le dépôt officiel fal-ai/fal-blender-extension. Ils exigent une image de
  // référence. Tarifs et paramètres d'entrée NON VÉRIFIÉS (pages fal inaccessibles) : verrouillés.
  {
    provider: "fal",
    model: "fal-ai/nano-banana-2/edit",
    label: "Nano Banana 2 Edit (fal.ai)",
    kind: "image",
    adapter: "fal_image",
    quality: 3,
    caps: { references: 4, textInImage: true, people: true },
    needsReference: true,
    aspects: ["1:1", "4:5", "9:16", "16:9"],
    resolution: "≈ 1K",
    typical: {},
    priceNote: "NON VÉRIFIÉ — à relever sur fal.ai (saisir un tarif par image)",
    status: "stable",
    verified: { id: true, price: false },
    source: "https://github.com/fal-ai/fal-blender-extension",
    use: { fr: "Secours de Gemini pour les images avec le produit en référence (personne UGC, ambiance).", en: "Backup for Gemini on images with the product as reference (UGC person, mood)." },
  },
  {
    provider: "fal",
    model: "fal-ai/flux-2/klein/9b/edit",
    label: "FLUX.2 Klein 9B Edit (fal.ai)",
    kind: "image",
    adapter: "fal_image",
    quality: 2,
    caps: { references: 4, people: true },
    needsReference: true,
    aspects: ["1:1", "4:5", "9:16", "16:9"],
    resolution: "≈ 1K",
    typical: {},
    priceNote: "NON VÉRIFIÉ — à relever sur fal.ai (saisir un tarif par image)",
    status: "stable",
    verified: { id: true, price: false },
    source: "https://github.com/fal-ai/fal-blender-extension",
    use: { fr: "Retouches rapides à partir d'une référence.", en: "Fast edits from a reference." },
  },
  // ------------------------------------------------------------ vidéos
  {
    provider: "google",
    model: "veo-3.0-generate-001",
    label: "Google Veo 3",
    kind: "video",
    adapter: "veo",
    quality: 3,
    caps: { imageToVideo: true, textToVideo: true, audio: true, people: true },
    aspects: ["16:9", "9:16"],
    resolution: "720p / 1080p",
    durations: [8],
    typical: { seconds: 8 },
    priceNote: "0,40 $ / s avec son",
    // Absent de la documentation actuelle (guide Veo officiel : Veo 3.1) ; date d'arrêt NON VÉRIFIÉE.
    status: "legacy",
    replacement: "google:veo-3.1-generate-preview",
    verified: { id: true, price: true },
    defaultFor: "primary",
    legacyDefault: true,
    source: "https://cloud.google.com/vertex-ai/generative-ai/pricing",
    use: { fr: "Plans produit et vidéos UGC avec voix et son natifs.", en: "Product shots and UGC videos with native voice and sound." },
  },
  {
    provider: "google",
    model: "veo-3.0-fast-generate-001",
    label: "Google Veo 3 Fast",
    kind: "video",
    adapter: "veo",
    quality: 2,
    caps: { imageToVideo: true, textToVideo: true, audio: true, people: true },
    aspects: ["16:9", "9:16"],
    resolution: "720p / 1080p",
    durations: [8],
    typical: { seconds: 8 },
    priceNote: "0,15 $ / s avec son",
    status: "legacy",
    replacement: "google:veo-3.1-fast-generate-preview",
    verified: { id: true, price: true },
    source: "https://cloud.google.com/vertex-ai/generative-ai/pricing",
    use: { fr: "Vidéos en qualité standard (forfait Créer), plus rapides et moins chères.", en: "Standard-quality videos (Create plan), faster and cheaper." },
  },
  {
    provider: "fal",
    model: "fal-ai/kling-video/v2.1/pro/image-to-video",
    label: "Kling 2.1 Pro (fal.ai)",
    kind: "video",
    adapter: "fal_video",
    quality: 2,
    caps: { imageToVideo: true, people: true },
    aspects: ["16:9", "9:16", "1:1"],
    resolution: "1080p",
    durations: [5, 10],
    typical: { seconds: 5 },
    priceNote: "≈ 0,09 $ / s (tarif fal NON VÉRIFIÉ)",
    // Endpoint absent des dépôts officiels actuels de fal (Kling v3 y figure) : remplaçant conseillé.
    status: "legacy",
    replacement: "fal:fal-ai/kling-video/v3/pro/image-to-video",
    // Modèle déjà en service dans le studio (tarif saisi dans l'administration) : conservé tel quel.
    verified: { id: true, price: true },
    legacyDefault: true,
    source: "https://fal.ai/models/fal-ai/kling-video/v2.1/pro/image-to-video",
    use: { fr: "Plans produit sans son, alternative à Veo.", en: "Product shots without sound, alternative to Veo." },
  },
  // Veo 3.1 : identifiants du guide officiel (google-gemini/cookbook) et du SDK officiel (googleapis/js-genai) ;
  // durées 4, 6 ou 8 s ; 720p / 1080p ; son natif. Tarifs Vertex indicatifs (unité non précisée sur la page).
  {
    provider: "google",
    model: "veo-3.1-generate-preview",
    label: "Google Veo 3.1 (aperçu)",
    kind: "video",
    adapter: "veo",
    quality: 3,
    caps: { imageToVideo: true, textToVideo: true, audio: true, people: true },
    aspects: ["16:9", "9:16"],
    resolution: "720p / 1080p",
    durations: [4, 6, 8],
    typical: { seconds: 8 },
    priceNote: "Vertex AI : 0,40 $ / s avec son en 720p/1080p (prix API Gemini à confirmer)",
    status: "preview",
    verified: { id: true, price: false },
    paramsVerified: true,
    source: "https://github.com/google-gemini/cookbook/blob/main/quickstarts/Get_started_Veo.ipynb",
    use: { fr: "Remplaçant de Veo 3 : plans produit et UGC avec son, durée réglable.", en: "Veo 3 replacement: product and UGC shots with sound, adjustable length." },
  },
  {
    provider: "google",
    model: "veo-3.1-fast-generate-preview",
    label: "Google Veo 3.1 Fast (aperçu)",
    kind: "video",
    adapter: "veo",
    quality: 2,
    caps: { imageToVideo: true, textToVideo: true, audio: true, people: true },
    aspects: ["16:9", "9:16"],
    resolution: "720p / 1080p",
    durations: [4, 6, 8],
    typical: { seconds: 8 },
    priceNote: "Vertex AI : 0,10 $ / s (720p) à 0,12 $ / s (1080p) avec son (prix API Gemini à confirmer)",
    status: "preview",
    verified: { id: true, price: false },
    paramsVerified: true,
    source: "https://github.com/google-gemini/cookbook/blob/main/quickstarts/Get_started_Veo.ipynb",
    use: { fr: "Remplaçant de Veo 3 Fast : vidéos standard moins chères.", en: "Veo 3 Fast replacement: cheaper standard videos." },
  },
  {
    provider: "google",
    model: "veo-3.1-lite-generate-preview",
    label: "Google Veo 3.1 Lite (aperçu)",
    kind: "video",
    adapter: "veo",
    quality: 1,
    caps: { imageToVideo: true, textToVideo: true, audio: true, people: true },
    aspects: ["16:9", "9:16"],
    resolution: "720p / 1080p",
    durations: [4, 6, 8],
    typical: { seconds: 8 },
    priceNote: "Vertex AI : 0,05 $ / s (720p) à 0,08 $ / s (1080p) avec son (prix API Gemini à confirmer)",
    status: "preview",
    verified: { id: true, price: false },
    paramsVerified: true,
    source: "https://github.com/google-gemini/cookbook/blob/main/quickstarts/Get_started_Veo.ipynb",
    use: { fr: "Brouillons vidéo et gros volumes, qualité inférieure.", en: "Video drafts and high volumes, lower quality." },
  },
  // Kling v3 sur fal : endpoints et paramètres (image_url, duration "3".."15") du dépôt officiel fal-ai/fal-blender-extension.
  {
    provider: "fal",
    model: "fal-ai/kling-video/v3/pro/image-to-video",
    label: "Kling 3 Pro (fal.ai)",
    kind: "video",
    adapter: "fal_video",
    quality: 3,
    caps: { imageToVideo: true, people: true },
    aspects: ["16:9", "9:16", "1:1"],
    resolution: "taille déduite de l'image de départ",
    durations: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    typical: { seconds: 5 },
    priceNote: "NON VÉRIFIÉ — à relever sur fal.ai (tarif à la seconde)",
    status: "stable",
    verified: { id: true, price: false },
    paramsVerified: true,
    source: "https://github.com/fal-ai/fal-blender-extension",
    use: { fr: "Remplaçant de Kling 2.1 : plans produit sans son, durée de 3 à 15 s.", en: "Kling 2.1 replacement: product shots without sound, 3 to 15 s." },
  },
  {
    provider: "fal",
    model: "fal-ai/kling-video/v3/standard/image-to-video",
    label: "Kling 3 Standard (fal.ai)",
    kind: "video",
    adapter: "fal_video",
    quality: 2,
    caps: { imageToVideo: true, people: true },
    aspects: ["16:9", "9:16", "1:1"],
    resolution: "taille déduite de l'image de départ",
    durations: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    typical: { seconds: 5 },
    priceNote: "NON VÉRIFIÉ — à relever sur fal.ai (tarif à la seconde)",
    status: "stable",
    verified: { id: true, price: false },
    paramsVerified: true,
    source: "https://github.com/fal-ai/fal-blender-extension",
    use: { fr: "Plans produit sans son, moins chers que Kling 3 Pro.", en: "Product shots without sound, cheaper than Kling 3 Pro." },
  },
];

export const mediaModel = (provider: string, model: string): MediaModel | null => MEDIA_MODELS.find((m) => m.provider === provider && m.model === model) ?? null;
