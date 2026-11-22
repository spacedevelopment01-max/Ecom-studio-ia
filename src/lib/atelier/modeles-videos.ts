/**
 * LES VIDÉOS POUR VENDRE (rapport 10, point 10 et partie 2) : huit modèles prêts et douze gestes de caméra nommés en
 * français. Une seule façon de faire : un modèle remplit la demande de la vidéo guidée du Studio (`video-v2/
 * three-scenes.ts`) — image fixe créée et validée d'abord, puis le mouvement, contrôle image par image, musique
 * composée par le Studio, logo à la fin — avec le même devis et le même accord qu'aujourd'hui.
 *
 * Garde-fous du propriétaire :
 *  - jamais de personne, jamais de mains : « Le déballage » se fait SANS MAINS, la boîte s'ouvre seule ;
 *  - « L'avant et l'après » n'invente jamais l'« après » : aucun modèle vidéo, seulement deux vraies photos du client
 *    montées par le Studio (gratuit) ;
 *  - « Le produit qui tourne » : le dos du produit n'existe pas sur une seule photo ; sans photo du dos, un demi-tour
 *    seulement (l'IA n'invente pas ce qu'elle ne voit pas) ;
 *  - « L'offre du moment » : seulement une offre saisie par le client, aucune urgence inventée.
 * Module pur.
 */
import type { CameraMove } from "../video-v2/types";
import type { T2 } from "./outils";

export type GesteCamera = { id: string; nom: T2; /** Phrase du mouvement pour le modèle vidéo (anglais). */ consigne: string; camera: CameraMove };

export const GESTES_CAMERA: GesteCamera[] = [
  { id: "tour", nom: ["Tour autour du produit", "Orbit around the product"], consigne: "slow full orbit around the product", camera: "orbit" },
  { id: "demi-tour", nom: ["Demi-tour", "Half orbit"], consigne: "slow half orbit that keeps the photographed faces of the product in view", camera: "orbit" },
  { id: "rapprochement", nom: ["Rapprochement lent", "Slow push-in"], consigne: "slow push-in towards the product", camera: "push_in" },
  { id: "eloignement", nom: ["Éloignement qui révèle le décor", "Pull-out revealing the setting"], consigne: "slow pull-out that reveals the setting around the product", camera: "pull_out" },
  { id: "travelling", nom: ["Travelling latéral", "Lateral tracking"], consigne: "slow lateral tracking shot past the product", camera: "pan_right" },
  { id: "plongee", nom: ["Plongée", "High angle"], consigne: "high-angle shot looking down on the product, slowly descending", camera: "tilt_up" },
  { id: "contre-plongee", nom: ["Contre-plongée", "Low angle"], consigne: "low-angle shot looking up at the product, slow rise", camera: "tilt_up" },
  { id: "detail", nom: ["Rapprochement très lent sur un détail", "Very slow push-in on a detail"], consigne: "macro shot, very slow push-in on a material detail of the product", camera: "push_in" },
  { id: "panoramique", nom: ["Panoramique", "Pan"], consigne: "slow pan across the scene ending on the product", camera: "pan_left" },
  { id: "fixe", nom: ["Plan fixe qui respire", "Breathing still shot"], consigne: "locked-off shot, only the light gently shifts", camera: "static" },
  { id: "arret", nom: ["Arrêt sur image", "Freeze frame"], consigne: "slow push-in that settles and holds still on the product", camera: "push_in" },
  { id: "main-legere", nom: ["Caméra à la main légère", "Light handheld"], consigne: "subtle handheld camera, gentle natural sway", camera: "handheld" },
];
export const gesteCamera = (id: string) => GESTES_CAMERA.find((g) => g.id === id) ?? null;

export type ModeleVideoId = "tourne" | "cadeau" | "deballage" | "vraie-vie" | "details" | "avant-apres" | "offre" | "pub-15";

export type ModeleVideo = {
  id: ModeleVideoId;
  nom: T2;
  /** Ce qui se passe, en une phrase. */
  quoi: T2;
  geste: string;
  /** Durée totale de la vidéo (secondes). */
  dureeS: number;
  /** Nombre de plans. */
  plans: number;
  /** Outil conseillé d'abord, puis le secours (« fournisseur:modèle »). */
  outils: string[];
  garde: T2;
  /** La scène (ce que montre l'image fixe), en français pour la demande de la vidéo guidée. */
  scene: string;
  as: "post" | "ad";
  /** Aucun modèle vidéo : montage de deux vraies photos du client. */
  sansIa?: boolean;
  /** Ne se propose qu'avec une offre saisie par le client. */
  offre?: boolean;
};

export const MODELES_VIDEOS: ModeleVideo[] = [
  { id: "tourne", nom: ["Le produit qui tourne", "The spinning product"], quoi: ["Ton produit seul, sur un socle, fait un tour lent.", "Your product alone, on a stand, turns slowly."], geste: "tour", dureeS: 5, plans: 1, outils: ["kling:kling-4.0", "alibaba:wan3.0-video"], garde: ["Sans photo du dos de ton produit, un demi-tour seulement : je n'invente pas ce que je ne vois pas.", "Without a photo of the back of your product, only a half turn: I don't invent what I can't see."], scene: "le produit seul, posé sur un socle, fond uni aux couleurs de la marque", as: "post" },
  { id: "cadeau", nom: ["Le moment cadeau", "The gift moment"], quoi: ["Ton produit emballé, un ruban, une carte écrite par ta marque.", "Your product wrapped, a ribbon, a card written by your brand."], geste: "rapprochement", dureeS: 8, plans: 1, outils: ["vertex:veo-3.1-fast-generate-001", "kling:kling-4.0"], garde: ["Aucune main. Le texte de la carte est posé par le Studio, jamais dessiné par l'IA.", "No hands. The card's text is set by the Studio, never drawn by the AI."], scene: "le produit emballé dans un papier de qualité, un ruban, une carte blanche posée à côté", as: "post" },
  { id: "deballage", nom: ["Le déballage", "The unboxing"], quoi: ["La boîte s'ouvre seule et ton produit apparaît.", "The box opens by itself and your product appears."], geste: "plongee", dureeS: 8, plans: 1, outils: ["kling:kling-4.0", "vertex:veo-3.1-lite-generate-001"], garde: ["Sans mains : la boîte s'ouvre seule, jamais une personne.", "No hands: the box opens by itself, never a person."], scene: "une boîte fermée posée sur une table, vue de haut ; le couvercle se soulève seul et révèle le produit à l'intérieur ; aucune main, aucune personne", as: "post" },
  { id: "vraie-vie", nom: ["Le produit dans la vraie vie", "The product in real life"], quoi: ["Ton produit à sa place : cuisine, salle de bains, atelier.", "Your product where it belongs: kitchen, bathroom, workshop."], geste: "travelling", dureeS: 8, plans: 1, outils: ["vertex:veo-3.1-lite-generate-001", "alibaba:wan3.0-video"], garde: ["Le décor est créé, ton produit vient de ta vraie photo.", "The setting is created, your product comes from your real photo."], scene: "le produit à sa place dans la pièce où il sert, lumière naturelle, aucune personne", as: "post" },
  { id: "details", nom: ["Les détails", "The details"], quoi: ["La matière, la couture, l'étiquette, de tout près.", "The material, the stitching, the label, up close."], geste: "detail", dureeS: 5, plans: 1, outils: ["kling:kling-4.0", "vertex:veo-3.1-lite-generate-001"], garde: ["L'étiquette se déforme facilement en vidéo : chaque image est relue.", "Labels easily warp in video: every frame is reviewed."], scene: "gros plan sur la matière et les finitions du produit, lumière rasante", as: "post" },
  { id: "avant-apres", nom: ["L'avant et l'après", "Before and after"], quoi: ["Deux de tes vraies photos, l'avant puis l'après, qui se suivent.", "Two of your real photos, before then after, one after the other."], geste: "fixe", dureeS: 8, plans: 2, outils: [], garde: ["Jamais d'« après » inventé : seulement tes deux vraies photos. Gratuit.", "Never an invented \"after\": only your two real photos. Free."], scene: "", as: "post", sansIa: true },
  { id: "offre", nom: ["L'offre du moment", "The current offer"], quoi: ["Ton produit, ton offre écrite en grand, la date de fin.", "Your product, your offer written large, the end date."], geste: "arret", dureeS: 6, plans: 1, outils: ["kling:kling-4.0", "alibaba:wan3.0-video"], garde: ["Seulement l'offre que tu as saisie ; aucune urgence inventée. Le texte est posé par le Studio.", "Only the offer you entered; no invented urgency. The text is set by the Studio."], scene: "le produit en grand sur un fond calme aux couleurs de la marque, une place libre pour l'offre", as: "ad", offre: true },
  { id: "pub-15", nom: ["La publicité de 15 secondes", "The 15-second ad"], quoi: ["Trois plans, ton texte à l'écran, une musique, ton logo à la fin.", "Three shots, your text on screen, music, your logo at the end."], geste: "rapprochement", dureeS: 15, plans: 3, outils: ["kling:kling-4.0", "alibaba:wan3.0-video"], garde: ["Chaque plan est relu ; les sous-titres et ton logo restent hors des boutons des réseaux.", "Every shot is reviewed; subtitles and your logo stay clear of the networks' buttons."], scene: "trois moments du produit : une accroche, son usage, son résultat", as: "ad" },
];
export const modeleVideo = (id: string) => MODELES_VIDEOS.find((m) => m.id === id) ?? null;

/** Le geste de caméra réellement employé : le tour complet seulement avec une photo du dos. */
export function gesteDuModele(m: ModeleVideo, o: { photoDuDos: boolean }): GesteCamera {
  if (m.id === "tourne" && !o.photoDuDos) return gesteCamera("demi-tour")!;
  return gesteCamera(m.geste)!;
}

export type DemandeVideo = { as: "post" | "ad"; scenes: number; totalS: number; aspect: "9:16" | "4:5" | "1:1" | "16:9"; request: string; music: true; modele: ModeleVideoId; motion: string };

/**
 * La demande de la vidéo guidée remplie par le modèle (le client la voit et peut la changer). Null avec la raison quand
 * le modèle ne peut pas servir (offre non saisie ; avant-après, qui passe par le montage gratuit des deux photos).
 */
export function demandeDuModele(m: ModeleVideo, o: { aspect?: DemandeVideo["aspect"]; photoDuDos: boolean; offre?: string | null }, lang: "fr" | "en"): { ok: true; demande: DemandeVideo } | { ok: false; raison: string } {
  if (m.sansIa) return { ok: false, raison: lang === "fr" ? "Choisis tes deux vraies photos, l'avant puis l'après : je les monte, sans rien inventer." : "Choose your two real photos, before then after: I'll put them together, inventing nothing." };
  if (m.offre && !o.offre?.trim()) return { ok: false, raison: lang === "fr" ? "Écris d'abord ton offre (le prix ou la remise, et sa date de fin) : je ne l'invente pas." : "First write your offer (price or discount, and its end date): I don't invent it." };
  const g = gesteDuModele(m, o);
  const offre = m.offre ? ` Offre du client, mot pour mot : « ${o.offre!.trim().slice(0, 160)} ».` : "";
  return {
    ok: true,
    demande: {
      as: m.as, scenes: m.plans, totalS: Math.max(6, m.dureeS), aspect: o.aspect ?? "9:16", music: true, modele: m.id,
      request: `${m.scene}.${offre} Aucune personne, aucune main.`,
      motion: `${g.consigne}; no hands, no people${m.id === "deballage" ? "; the box lid lifts open by itself" : ""}`,
    },
  };
}

/**
 * L'adresse de la vidéo guidée déjà remplie par un modèle : la même pour l'écran de l'atelier et pour SINA dans sa
 * conversation (une seule façon de faire ; le devis et l'accord sont ceux de la vidéo guidée).
 */
export function lienVideoGuidee(projectId: string, m: ModeleVideo, lang: "fr" | "en"): string {
  const q = new URLSearchParams({ atelierModele: m.id, atelierAs: m.as, atelierNom: m.nom[lang === "fr" ? 0 : 1], atelierPlans: String(m.plans), atelierDuree: String(Math.max(6, m.dureeS)), atelierDemande: `${m.scene}. ${lang === "fr" ? "Aucune personne, aucune main." : "No people, no hands."}` });
  return m.as === "ad" ? `/studio/${projectId}/publicites?${q}` : `/studio/${projectId}/publications?${q}#video`;
}
