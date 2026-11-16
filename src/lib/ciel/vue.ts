/**
 * Ce que le ciel montre d'un projet : l'état de chacune de ses neuf étoiles, les couleurs de son soleil, et l'étoile
 * où SINA travaille. Rien n'est inventé : SINA ne va sur une étoile que pour un vrai travail (une étape en cours avec
 * le client, ou une tâche de fond réellement lancée). Sinon elle reste au cœur.
 */
import type { DashboardData } from "../syna-agent/dashboard";
import type { StepStatus } from "../syna-agent/journey";
import { graine, type Forme } from "./forme";

type T2 = { fr: string; en: string };

/** fait · en cours · attend l'avis du client · à venir · sans objet. */
export type EtatEtoile = "fait" | "cours" | "avis" | "avenir" | "sans";
export type Couleurs = [clair: string, moyen: string, sombre: string];

export const etatDe = (s: StepStatus): EtatEtoile => (s === "done" ? "fait" : s === "doing" ? "cours" : s === "review" ? "avis" : s === "skipped" ? "sans" : "avenir");

export const ETAT_LIBELLE: Record<EtatEtoile, T2> = {
  fait: { fr: "Fait", en: "Done" },
  cours: { fr: "En cours", en: "In progress" },
  avis: { fr: "Attend ton avis", en: "Waiting for you" },
  avenir: { fr: "À venir", en: "To come" },
  sans: { fr: "Sans objet", en: "Not needed" },
};

/** L'espace du Studio que chaque étoile ouvre (aucun : tout est dans le volet). */
export const ESPACE_DE: Record<number, string | null> = { 1: null, 2: "marque", 3: "strategie", 4: "produit", 5: "boutique", 6: "boutique", 7: "publications", 8: "publicites", 9: null };

/** L'étoile concernée par une tâche de fond, d'après son genre. Inconnue : SINA reste au cœur. */
export function etoileDeLaTache(type: string): number | null {
  if (/^(syna\.(brand|custom\.brand|studio\.brand)|brand\.)/.test(type)) return 2;
  if (/^(syna\.angles|strategy\.)/.test(type)) return 3;
  if (/^(syna\.product\.|project\.prepare)/.test(type)) return 4;
  if (/^(syna\.mockup\.|shop\.|theme\.|copy\.build)/.test(type)) return 5;
  if (/^shopify\.push/.test(type)) return 6;
  if (/^(syna\.posts\.|calendar\.|post\.|image\.ai_post|blog\.)/.test(type)) return 7;
  return null;
}

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const rvb = (h: string): [number, number, number] => {
  const x = h.length === 4 ? [...h.slice(1)].map((c) => c + c).join("") : h.slice(1);
  return [0, 2, 4].map((i) => parseInt(x.slice(i, i + 2), 16)) as [number, number, number];
};
const hex = (c: number[]) => "#" + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
const melange = (a: number[], b: number[], k: number) => a.map((v, i) => v + (b[i] - v) * k);
const lumiere = ([r, g, b]: number[]) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
const vivacite = ([r, g, b]: number[]) => (Math.max(r, g, b) - Math.min(r, g, b)) / 255;

/**
 * Le soleil aux couleurs de la marque : un clair, la couleur de la marque, un sombre. Sans marque : null (le cœur
 * reste bleu comme SINA). Une marque très sombre garde sa teinte : on l'éclaircit pour qu'elle brille.
 */
export function soleilDe(couleurs: string[] | null | undefined): Couleurs | null {
  const c = (couleurs ?? []).filter((x) => HEX.test(x)).map(rvb);
  if (!c.length) return null;
  // La première couleur est celle de la marque ; si elle est presque grise, blanche ou noire, on prend la plus vive.
  const franche = (x: number[]) => vivacite(x) >= 0.12 && lumiere(x) > 0.08 && lumiere(x) < 0.92;
  const vive = franche(c[0]) ? c[0] : [...c].sort((a, b) => vivacite(b) * (0.35 + Math.min(lumiere(b), 0.75)) - vivacite(a) * (0.35 + Math.min(lumiere(a), 0.75)))[0];
  const moyen = lumiere(vive) < 0.32 ? melange(vive, [255, 255, 255], 0.38) : lumiere(vive) > 0.85 ? melange(vive, [0, 0, 0], 0.2) : vive;
  const plusClair = [...c].sort((a, b) => lumiere(b) - lumiere(a))[0], plusSombre = [...c].sort((a, b) => lumiere(a) - lumiere(b))[0];
  const clair = lumiere(plusClair) > 0.8 && plusClair !== vive ? plusClair : melange(moyen, [255, 255, 255], 0.78);
  const sombre = lumiere(plusSombre) < 0.3 && plusSombre !== vive ? melange(plusSombre, moyen, 0.25) : melange(moyen, [0, 0, 0], 0.55);
  return [hex(clair), hex(moyen), hex(sombre)];
}

export type TacheVue = { type: string; label: string; status: string };
export type VueEtoile = { n: number; fr: string; en: string; etat: EtatEtoile; promesse: T2; espace: string | null };
export type VueSina = { etoile: number | null; phrase: T2 | null };
export type VueProjet = { nom: string; commence: boolean; construction: boolean; couleurs: Couleurs | null; etoiles: VueEtoile[]; sina: VueSina };

/** Où est SINA, et ce qu'elle fait, avec des faits seulement. */
export function sinaDe(data: DashboardData, taches: TacheVue[] = []): VueSina {
  const tache = taches.find((j) => j.status !== "paused" && j.type !== "syna.agent" && j.label) ?? null;
  if (tache) return { etoile: etoileDeLaTache(tache.type), phrase: { fr: tache.label, en: tache.label } };
  const cur = data.steps.find((s) => s.n === data.current);
  if (!data.started) return { etoile: null, phrase: { fr: "Parle-moi de ton projet : sa constellation s'allume au fur et à mesure.", en: "Tell me about your project: its constellation lights up as we go." } };
  if (data.building && cur?.status === "review") return { etoile: cur.n, phrase: { fr: `« ${cur.fr} » attend ton avis`, en: `"${cur.en}" is waiting for you` } };
  if (data.building && cur && (cur.status === "doing" || taches.some((j) => j.type === "syna.agent" && j.status !== "paused")))
    return { etoile: cur.n, phrase: { fr: `On avance ensemble sur « ${cur.fr} »`, en: `We are working together on "${cur.en}"` } };
  return { etoile: null, phrase: null };
}

export function vueDuProjet(data: DashboardData, taches: TacheVue[] = []): VueProjet {
  return {
    nom: data.name,
    commence: data.started,
    construction: data.building,
    couleurs: soleilDe(data.brand?.colors),
    etoiles: data.steps.map((s) => ({ n: s.n, fr: s.fr, en: s.en, etat: etatDe(s.status), promesse: s.promise, espace: ESPACE_DE[s.n] ?? null })),
    sina: sinaDe(data, taches),
  };
}

/** Un autre projet du même compte, vu de loin dans le ciel. */
export type Voisin = { id: string; nom: string; couleurs: Couleurs | null; forme: Forme; etats: EtatEtoile[] };

/** La place de chaque voisin autour du projet ouvert : toujours la même pour un projet donné, jamais deux au même endroit. */
export function placesDuCiel(ids: string[]): Record<string, { x: number; y: number }> {
  const out: Record<string, { x: number; y: number }> = {};
  const tour = graine(ids.slice().sort().join("|") || "ciel")() * Math.PI * 2;
  // « Nouveau projet » a sa place à lui, tout près ; les autres projets se répartissent sur des anneaux autour.
  [...ids].sort().forEach((id, i) => {
    const r = graine(id), anneau = Math.floor(i / 5), dans = Math.min(5, ids.length - anneau * 5);
    const a = tour + ((i % 5) + r() * 0.5) * ((Math.PI * 2) / Math.max(dans, 3)) + anneau * 0.6, d = 1250 + anneau * 900 + r() * 260;
    out[id] = { x: Math.cos(a) * d, y: Math.sin(a) * d * 0.8 };
  });
  return out;
}

/**
 * L'accueil du Studio : « Nouveau projet » au milieu, les projets du compte en anneaux autour. Toujours la même place
 * pour un projet donné, tant que la liste ne change pas.
 */
export function placesAccueil(ids: string[]): Record<string, { x: number; y: number }> {
  const out: Record<string, { x: number; y: number }> = {};
  const tries = [...ids].sort(), tour = graine(tries.join("|") || "accueil")() * Math.PI * 2;
  let fait = 0;
  for (let anneau = 0; fait < tries.length; anneau++) {
    const places = 5 + anneau * 4, ici = tries.slice(fait, fait + places), d = 470 + anneau * 430;
    ici.forEach((id, i) => { const a = tour + anneau * 0.5 + (i / Math.max(ici.length, 2)) * Math.PI * 2 + (graine(id)() - 0.5) * 0.25; out[id] = { x: Math.cos(a) * d * 1.15, y: Math.sin(a) * d * 0.82 }; });
    fait += ici.length;
  }
  return out;
}

/**
 * Le ciel partagé : les projets des autres se rangent en amas par métier, loin autour du centre (où sont « Nouveau
 * projet » et mes propres projets). Chaque amas a son centre ; dedans, les constellations s'enroulent en spirale.
 */
export function placesCommun(astres: { cle: string; metier: string | null }[]): { places: Record<string, { x: number; y: number }>; amas: { metier: string; x: number; y: number; n: number }[] } {
  const OR = Math.PI * (3 - Math.sqrt(5)), groupes = new Map<string, string[]>();
  for (const a of astres) { const m = a.metier ?? ""; groupes.set(m, [...(groupes.get(m) ?? []), a.cle]); }
  const places: Record<string, { x: number; y: number }> = {}, amas: { metier: string; x: number; y: number; n: number }[] = [];
  // Les amas se posent l'un après l'autre sur une spirale, chacun à une distance qui laisse la place du précédent.
  let rayon = 2300, angle = graine("amas")() * Math.PI * 2;
  for (const metier of [...groupes.keys()].sort()) {
    const cles = groupes.get(metier)!.sort(), taille = 420 * Math.sqrt(cles.length) + 260;
    rayon += taille * 0.45; angle += OR * 0.62 + taille / rayon;
    const cx = Math.cos(angle) * rayon * 1.2, cy = Math.sin(angle) * rayon * 0.85, tour = graine(metier || "autres")() * Math.PI * 2;
    cles.forEach((cle, j) => { const r = 430 * Math.sqrt(j + 0.35), a = tour + j * OR; places[cle] = { x: cx + Math.cos(a) * r * 1.1, y: cy + Math.sin(a) * r * 0.85 }; });
    amas.push({ metier, x: cx, y: cy, n: cles.length });
    rayon += taille * 0.45;
  }
  return { places, amas };
}
