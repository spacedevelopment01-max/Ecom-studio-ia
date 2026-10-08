/**
 * Video & UGC Engine V2 (phase 7A) — types partagés.
 *
 * PROJECT BRAIN → INTENTION VIDÉO → STRATÉGIE CRÉATIVE → SCRIPT → STORYBOARD → PLANIFICATION DES PLANS → MÉDIAS
 * (bibliothèque, Image Engine V2, vidéos libres) → GÉNÉRATION (Router V2, seulement quand elle sert) → MONTAGE
 * (document vidéo éditable) → AUDIO → BARRIÈRE VIDÉO → EXPORT → BIBLIOTHÈQUE.
 *
 * Le document vidéo réutilise le système de calques de l'éditeur publicitaire (`ad-doc/`) pour tout ce qui est
 * dessiné à l'écran (titres, packshots, cartes de fin) : un seul système de calques dans le studio.
 */
import type { Verdict } from "../quality/gate";
import type { AdDocument, Layer } from "../ad-doc/types";

/** Intentions vidéo reconnues (une demande simple ne déclenche jamais une production complexe). */
export const VIDEO_INTENTS = [
  "video_ad", // publicité vidéo
  "product_demo", // démonstration produit
  "company_presentation", // présentation d'entreprise
  "trade_video", // vidéo de métier
  "brand_film", // vidéo de marque
  "ugc", // contenu UGC (personnage synthétique, signalé)
  "explainer", // vidéo explicative
  "launch", // lancement
  "social_content", // contenu social court
  "service_presentation", // présentation d'une prestation
  "product_tutorial", // tutoriel produit
  "lifestyle", // vidéo lifestyle
] as const;
export type VideoIntentKind = (typeof VIDEO_INTENTS)[number];

export const VIDEO_FORMATS = ["9:16", "16:9", "1:1", "4:5"] as const;
export type VideoAspect = (typeof VIDEO_FORMATS)[number];

export const VIDEO_PLATFORMS = ["tiktok", "reels", "shorts", "meta_feed", "youtube", "linkedin", "shop_page", "website"] as const;
export type VideoPlatform = (typeof VIDEO_PLATFORMS)[number];

/** Ampleur de production : « simple » = montage local à partir de l'existant, sans génération. */
export type Complexity = "simple" | "standard" | "production";

export type VideoIntent = {
  kind: VideoIntentKind;
  goal: string;
  audience: string | null;
  platform: VideoPlatform;
  aspect: VideoAspect;
  /** Durée visée (secondes), bornée aux limites de la plateforme. */
  durationS: number;
  complexity: Complexity;
  /** Ce qui a conduit à ce choix (traçable, en clair). */
  reasons: string[];
};

export const NARRATIVE_STYLES = ["direct", "demonstrative", "emotional", "educational", "premium", "conversational", "storytelling"] as const;
export type NarrativeStyle = (typeof NARRATIVE_STYLES)[number];

/** Langage visuel du projet (choisi d'après la catégorie ou le métier, jamais le même pour tous). */
export const VISUAL_LANGUAGES = ["craft_documentary", "premium_soft", "tech_precise", "food_warm", "digital_explainer", "lifestyle_natural", "local_trust"] as const;
export type VisualLanguage = (typeof VISUAL_LANGUAGES)[number];

export type Transition = "cut" | "fade" | "slide" | "zoom" | "wipe";

export type CreativeStrategy = {
  objective: string;
  audience: string;
  angle: string;
  message: string;
  hook: string;
  emotion: string;
  /** Rythme : durée moyenne d'un plan et nombre de coupes par minute. */
  rhythm: { avgShotS: number; cutsPerMin: number; energy: "calm" | "steady" | "dynamic" };
  style: { language: VisualLanguage; narrative: NarrativeStyle; camera: string; light: string; music: MusicMood; transitions: Transition[] };
  durationS: number;
  cta: string;
  aspect: VideoAspect;
  /** Matière confirmée utilisable comme preuve (faits, preuves disponibles) ; vide : aucune preuve affirmée. */
  proofs: string[];
  /** Ce qui manque pour aller plus loin (signalé, jamais inventé). */
  gaps: string[];
};

export const SCRIPT_PARTS = ["hook", "development", "demonstration", "proof", "conclusion", "cta"] as const;
export type ScriptPart = (typeof SCRIPT_PARTS)[number];

export type ScriptSection = {
  part: ScriptPart;
  /** Voix off ou réplique (vide : section muette, portée par l'image et le texte à l'écran). */
  voice: string;
  /** Texte court à l'écran. */
  onScreen: string;
  durationS: number;
};

export type VideoScript = { style: NarrativeStyle; sections: ScriptSection[]; by: "ai" | "local"; issues: string[] };

/** Procédé de fabrication d'un plan : le plus sobre qui suffit. */
export const SHOT_METHODS = ["existing_video", "animated_image", "ai_video", "local_composition", "packshot", "demonstration", "kinetic_type", "ui_animation", "avatar"] as const;
export type ShotMethod = (typeof SHOT_METHODS)[number];

export type Framing = "extreme_close" | "close" | "medium" | "wide" | "overhead" | "screen";
export type CameraMove = "static" | "push_in" | "pull_out" | "pan_left" | "pan_right" | "tilt_up" | "orbit" | "handheld";

export type Shot = {
  id: string;
  durationS: number;
  part: ScriptPart;
  subject: string;
  action: string;
  environment: string;
  framing: Framing;
  camera: CameraMove;
  lighting: string;
  /** Référence visuelle : asset de la bibliothèque ou description (jamais une image inventée du produit). */
  reference: { assetId: string | null; note: string };
  voice: string;
  onScreen: string;
  sound: string;
  transition: Transition;
  purpose: string;
  /** Le produit réel apparaît (fidélité contrôlée). */
  showsProduct: boolean;
  /** Personnage synthétique présent (continuité contrôlée, jamais présenté comme un vrai client). */
  character: boolean;
};

export type ShotPlan = Shot & {
  method: ShotMethod;
  /** Source prévue : asset réutilisé, recherche, génération (fournisseur choisi) ou composition locale. */
  source: { kind: "asset" | "image_v2" | "stock_video" | "generate" | "compose"; assetId?: string | null; provider?: string | null; model?: string | null; estimateMicro?: number };
  why: string;
};

/** Capacités d'un modèle vidéo : déclarées ET leur niveau de vérification (jamais supposées). */
export type VideoCapability = {
  provider: string;
  model: string;
  textToVideo: boolean;
  imageToVideo: boolean;
  references: boolean;
  /** Durées acceptées (secondes). */
  durations: number[];
  aspects: VideoAspect[];
  maxResolution: string;
  cameraControl: "prompt" | "none";
  people: boolean;
  /** Cohérence d'un plan à l'autre (par image de départ commune seulement : aucune mémoire de personnage). */
  crossShotConsistency: "start_frame" | "none";
  nativeAudio: boolean;
  /** « code » : capacité utilisée et vérifiée par le code existant ; « documented » : annoncée par le fournisseur, jamais utilisée ici. */
  verification: Partial<Record<"textToVideo" | "imageToVideo" | "references" | "people" | "nativeAudio", "code" | "documented">>;
};

// ------------------------------------------------------------------------------------------- document vidéo

export type ClipSource =
  | { kind: "image"; assetId: string; motion: CameraMove; crop: { x: number; y: number; w: number; h: number } | null }
  | { kind: "video"; assetId: string; inS: number; outS: number; muted: boolean }
  /** Composition en calques (packshot, typographie animée, carte de fin) : même modèle que l'éditeur publicitaire. */
  | { kind: "doc"; doc: AdDocument; animate: "rise" | "fade" | "none" }
  | { kind: "color"; color: string };

export type Clip = {
  id: string;
  shotId: string;
  label: string;
  /** Partie du récit (accroche, démonstration…) : sert aux retouches « raccourcis l'introduction ». */
  part: ScriptPart | null;
  durationS: number;
  source: ClipSource;
  /** Calques posés par-dessus (titres, pastilles, logo) — calques de l'éditeur publicitaire, en pixels vidéo. */
  overlays: Layer[];
  transitionIn: { kind: Transition; durationS: number };
  /** Plan généré par l'IA (vidéo, personnage) : la mention « générée par IA » est alors obligatoire. */
  generated?: boolean;
  /** Modifié par le client : jamais écrasé par une régénération. */
  userEdited?: boolean;
};

/** Sous-titre attaché à un plan (temps relatifs au début du plan) : couper ou déplacer le plan le garde synchronisé. */
export type SubtitleCue = { id: string; clipId: string; fromS: number; toS: number; text: string };

export type SubtitleStyle = {
  enabled: boolean;
  family: string;
  weight: number;
  /** Taille en pixels à la résolution du document. */
  size: number;
  color: string;
  /** Fond derrière le texte (pastille), null : contour seul. */
  background: string | null;
  position: "bottom" | "middle" | "top";
  /** Décalage vertical (pixels) depuis la position. */
  offsetY: number;
  maxChars: number;
  uppercase: boolean;
};

export type MusicMood = "calm" | "pulse" | "warm" | "none";

/** Piste audio attachée à un plan (décalage relatif au début du plan). `assetId` null : voix pas encore enregistrée. */
export type AudioClip = { id: string; clipId: string; assetId: string | null; text: string; offsetS: number; durationS: number; gainDb: number };

export type AudioTracks = {
  voice: AudioClip[];
  /** Voix choisie (identifiant du fournisseur) ; null : aucune voix synthétique disponible. */
  voiceId: string | null;
  /** Musique : synthèse locale (droits du studio) ou piste de la bibliothèque AVEC licence enregistrée. */
  music: { source: "synth"; mood: MusicMood; gainDb: number } | { source: "library"; assetId: string; licence: string; gainDb: number } | null;
  sfx: AudioClip[];
  /** Baisse de la musique sous la voix (dB). */
  duckingDb: number;
  /** Intensité visée (LUFS intégrés). */
  loudnessLufs: number;
};

export type VideoDocument = {
  version: number;
  width: number;
  height: number;
  fps: number;
  aspect: VideoAspect;
  platform: VideoPlatform;
  /** Zones de sécurité (pixels) : interface de la plateforme. */
  safe: { top: number; bottom: number; side: number };
  clips: Clip[];
  subtitles: { style: SubtitleStyle; cues: SubtitleCue[] };
  audio: AudioTracks;
  brand: AdDocument["brand"];
  /** Mention obligatoire quand un personnage ou des plans sont générés (ex. « Vidéo générée par IA »). */
  disclosure: string | null;
  meta: { intent: VideoIntentKind; source: "engine" | "user" | "ai_local" | "ai"; createdFrom: string | null; runId: string | null };
};

// ------------------------------------------------------------------------------------------- qualité et résultat

export const VIDEO_CRITERIA = ["relevance", "narrative", "visual", "continuity", "product_fidelity", "brand", "realism", "motion", "editing", "audio", "sync", "subtitles", "commercial"] as const;
export type VideoCriterion = (typeof VIDEO_CRITERIA)[number];

export type ShotReview = {
  score: number;
  sameProduct: boolean | null;
  productAltered: boolean;
  characterConsistent: boolean | null;
  offTopic: boolean;
  artifacts: boolean;
  issues: string[];
};

export type VideoReview = { criteria: Record<VideoCriterion, number>; issues: string[]; fix: { target: "shot" | "audio" | "subtitles" | "editing" | "script" | "none"; shotId: string | null; instruction: string } };

export type ShotOutcome = {
  shotId: string;
  method: ShotMethod;
  verdict: Verdict;
  assetId: string | null;
  attempts: number;
  reused: boolean;
  costMicro: number;
  reason: string;
  codes: string[];
};

export type VideoRunResult = {
  runId: string;
  docKey: string | null;
  intent: VideoIntent;
  strategy: CreativeStrategy;
  script: VideoScript;
  shots: ShotPlan[];
  outcomes: ShotOutcome[];
  verdict: Verdict;
  codes: string[];
  reason: string;
  /** Défauts relevés par la barrière (dernier essai). */
  issues: string[];
  videoAssetId: string | null;
  stats: { generated: number; reused: number; retries: number; localShots: number; skippedForBudget: number; reviews: number };
  costMicro: number;
  estimateMicro: number;
  stoppedByCostCap: boolean;
  notes: string[];
};
