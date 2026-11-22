/**
 * L'ATELIER DE CRÉATION : les outils que le client peut choisir (rapport 10 du 22 novembre 2026, point 8).
 *
 * Seulement les fournisseurs accordés par le propriétaire (référence, partie 16) : OpenAI, Google (API Gemini), Vertex
 * (Veo 3.1 Fast et Lite seulement), Kling en direct, BytePlus (Seedance), Black Forest Labs (Flux), Alibaba (Qwen,
 * Wan), et Runware comme seul intermédiaire de secours. fal ne sert que pendant la transition : aucun outil de
 * l'atelier ne passe par lui. Bria, Ideogram, MiniMax et Imagen Product Recontext ne sont pas accordés :
 * ils ne sont jamais proposés (`OUTILS_ECARTES`).
 *
 * Toutes les images de SINA sont faites par OpenAI : les autres outils ne servent qu'au choix du client (mode « Je
 * fais moi-même »). « Mets mon produit dans une scène » reste fait par OpenAI dans tous les modes : c'est le seul
 * parcours où le juge relit l'image et lit l'étiquette mot à mot ; le choix d'outil porte sur les retouches (fond,
 * objet retiré, story, carré). Chaque outil reste éteint tant que la clé du fournisseur manque ou que l'administration n'a pas
 * confirmé le modèle (le propriétaire saisit les clés dans Administration › Fournisseurs IA). Module pur : la
 * disponibilité est passée par l'appelant.
 */

export type T2 = readonly [fr: string, en: string];
export type GesteId = "scene" | "fond" | "story" | "carre" | "retirer" | "lot" | "video";

export type Outil = {
  /** « fournisseur:modèle », la même clé que le catalogue des modèles (`media-models.ts`). */
  id: string;
  provider: "openai" | "google" | "vertex" | "kling" | "byteplus" | "bfl" | "alibaba" | "runware";
  model: string;
  nom: T2;
  kind: "image" | "video";
  /** Ce qu'il fait de mieux, en une ligne (montré au client). */
  mieux: T2;
  gestes: GesteId[];
  /** L'outil redessine le produit (l'étiquette peut changer) : SINA prévient avant. */
  redessine: boolean;
  /** Seul intermédiaire accordé : proposé seulement quand le fabricant est indisponible. */
  secours?: boolean;
  /** Ordre de conseil par geste (le plus petit est conseillé d'abord). */
  rang: Partial<Record<GesteId, number>>;
};

export const OUTILS: Outil[] = [
  {
    id: "openai:gpt-image-2.6-flare", provider: "openai", model: "gpt-image-2.6-flare", kind: "image",
    nom: ["OpenAI GPT-Image 2.6", "OpenAI GPT-Image 2.6"],
    mieux: ["Les plus belles scènes, la lumière et l'ombre justes ; l'outil de SINA.", "The most beautiful scenes, with accurate light and shadow; SINA's tool."],
    gestes: ["scene", "fond", "story", "carre", "retirer", "lot"], redessine: false,
    rang: { scene: 1, fond: 1, story: 1, carre: 1, retirer: 1, lot: 1 },
  },
  {
    id: "google:gemini-3.1-flash-image", provider: "google", model: "gemini-3.1-flash-image", kind: "image",
    nom: ["Google Nano Banana", "Google Nano Banana"],
    mieux: ["Retouche rapide et bon marché avec la photo de ton produit.", "Fast, low-cost edits from your product photo."],
    gestes: ["fond", "retirer"], redessine: true,
    rang: { fond: 2, retirer: 3 },
  },
  {
    id: "bfl:flux-kontext-pro", provider: "bfl", model: "flux-kontext-pro", kind: "image",
    nom: ["Flux Kontext (Black Forest Labs)", "Flux Kontext (Black Forest Labs)"],
    mieux: ["Change une chose précise sur ta photo, le reste ne bouge pas.", "Changes one precise thing on your photo, the rest stays put."],
    gestes: ["fond", "retirer"], redessine: true,
    rang: { fond: 3, retirer: 2 },
  },
  {
    id: "bfl:flux-pro-1.0-expand", provider: "bfl", model: "flux-pro-1.0-expand", kind: "image",
    nom: ["Flux Agrandir (Black Forest Labs)", "Flux Expand (Black Forest Labs)"],
    mieux: ["Agrandit le cadre pour faire la story ou le carré, sans toucher à ta photo.", "Extends the frame to make the story or the square, without touching your photo."],
    gestes: ["story", "carre"], redessine: false,
    rang: { story: 2, carre: 2 },
  },
  {
    id: "vertex:veo-3.1-lite-generate-001", provider: "vertex", model: "veo-3.1-lite-generate-001", kind: "video",
    nom: ["Veo 3.1 Lite (Google)", "Veo 3.1 Lite (Google)"],
    mieux: ["La vidéo la moins chère, parfaite pour un premier essai.", "The lowest-cost video, perfect for a first try."],
    gestes: ["video"], redessine: true, rang: { video: 1 },
  },
  {
    id: "kling:kling-4.0", provider: "kling", model: "kling-4.0", kind: "video",
    nom: ["Kling (en direct)", "Kling (direct)"],
    mieux: ["Les mouvements les plus beaux, image de début et de fin.", "The most beautiful motion, with start and end frames."],
    gestes: ["video"], redessine: true, rang: { video: 2 },
  },
  {
    id: "vertex:veo-3.1-fast-generate-001", provider: "vertex", model: "veo-3.1-fast-generate-001", kind: "video",
    nom: ["Veo 3.1 Fast (Google)", "Veo 3.1 Fast (Google)"],
    mieux: ["Une vidéo plus fine quand la qualité compte.", "A finer video when quality matters."],
    gestes: ["video"], redessine: true, rang: { video: 3 },
  },
  {
    id: "byteplus:dreamina-seedance-2-0-mini-260615", provider: "byteplus", model: "dreamina-seedance-2-0-mini-260615", kind: "video",
    nom: ["Seedance (BytePlus)", "Seedance (BytePlus)"],
    mieux: ["Des plans vivants à petit prix ; tu ne paies que les vidéos réussies.", "Lively shots at a low price; you only pay for successful videos."],
    gestes: ["video"], redessine: true, rang: { video: 4 },
  },
  {
    id: "alibaba:wan3.0-video", provider: "alibaba", model: "wan3.0-video", kind: "video",
    nom: ["Wan (Alibaba)", "Wan (Alibaba)"],
    mieux: ["Des vidéos jusqu'à 30 secondes en un seul plan.", "Videos up to 30 seconds in a single shot."],
    gestes: ["video"], redessine: true, rang: { video: 5 },
  },
  {
    id: "runware:google:veo@3.1-lite", provider: "runware", model: "google:veo@3.1-lite", kind: "video", secours: true,
    nom: ["Veo 3.1 Lite par Runware (secours)", "Veo 3.1 Lite via Runware (backup)"],
    mieux: ["Prend le relais quand le fabricant est en panne.", "Takes over when the maker is down."],
    gestes: ["video"], redessine: true, rang: { video: 9 },
  },
];

/** Fournisseurs jamais proposés dans l'atelier, et pourquoi (vérifié par les tests). */
export const OUTILS_ECARTES: Record<string, T2> = {
  fal: ["Ne sert que pendant la transition : rien de neuf ne passe par lui.", "Only used during the transition: nothing new goes through it."],
  bria: ["Non accordé.", "Not approved."],
  ideogram: ["Écarté par le propriétaire.", "Ruled out by the owner."],
  minimax: ["Non accordé.", "Not approved."],
  "imagen-product-recontext": ["Sur le compte Vertex, mais l'accord ne vise que Veo 3.1 Fast et Lite.", "On the Vertex account, but the approval covers only Veo 3.1 Fast and Lite."],
};

/** Au plus cinq outils montrés pour un geste (« quatre ou cinq outils, pas cinquante »). */
export const OUTILS_MAX = 5;

/** L'outil que SINA prend pour toutes ses images : OpenAI (règle du propriétaire). */
export const OUTIL_DE_SINA = "openai:gpt-image-2.6-flare";

export const outil = (id: string): Outil | null => OUTILS.find((o) => o.id === id) ?? null;

export type OutilMontre = Outil & { disponible: boolean; conseille: boolean };

/**
 * Les outils proposés pour ce geste, dans l'ordre du conseil : seulement ceux qui ont leur clé et leur accord
 * d'administration ; Runware n'apparaît qu'en secours (aucun fabricant disponible pour ce geste). Le premier
 * disponible est marqué « conseillé ». En mode « SINA seule », seul l'outil de SINA (OpenAI) pour les images.
 */
export function outilsPour(geste: GesteId, disponible: (id: string) => boolean, o: { mode?: "sina" | "ensemble" | "moi" } = {}): OutilMontre[] {
  const rangOf = (x: Outil) => x.rang[geste] ?? 99;
  let liste = OUTILS.filter((x) => x.gestes.includes(geste)).sort((a, b) => rangOf(a) - rangOf(b));
  if (o.mode === "sina" && geste !== "video") liste = liste.filter((x) => x.id === OUTIL_DE_SINA);
  const fabricants = liste.filter((x) => !x.secours);
  const unFabricant = fabricants.some((x) => disponible(x.id));
  // Aucun fabricant ouvert : le secours passe devant (il est le seul à pouvoir servir).
  liste = unFabricant ? fabricants : [...liste.filter((x) => x.secours), ...fabricants];
  const montres = liste.slice(0, OUTILS_MAX).map((x) => ({ ...x, disponible: disponible(x.id), conseille: false }));
  const premier = montres.find((x) => x.disponible);
  if (premier) premier.conseille = true;
  return montres;
}

/** Un outil demandé par le client est-il permis pour ce geste (accordé, prévu pour ce geste, disponible) ? */
export function outilPermis(id: string, geste: GesteId, disponible: (id: string) => boolean, mode: "sina" | "ensemble" | "moi" = "moi"): boolean {
  return outilsPour(geste, disponible, { mode }).some((x) => x.id === id && x.disponible);
}
