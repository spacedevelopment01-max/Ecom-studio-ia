/**
 * Tableau de bord du projet : ce que le client voit de son projet pendant qu'il parle à SINA, et après.
 *
 * Neuf étapes (les siennes, jamais les repères internes), et sous chacune ce qui existe VRAIMENT : sa fiche, sa marque,
 * son angle. Rien n'est inventé : une étape sans résultat n'affiche que ce qu'elle apportera. Tout est lu, rien n'est
 * écrit ; la page se relit seule après chaque réponse de SINA.
 */
import { json, one } from "../db";
import { FIELD_LABEL, PHASES, START_FIELDS, currentStep, emptyJourney, phaseOf, phaseStatus, stepReady, type Journey, type StepStatus } from "./journey";
import { journeyOfProject, underConstruction } from "./construction";

type T2 = { fr: string; en: string };

/** Ce que chaque étape apporte au client, en une phrase. */
export const PHASE_PROMISE: Record<number, T2> = {
  1: { fr: "SINA apprend à connaître ton projet, avec tes mots.", en: "SINA gets to know your project, in your words." },
  2: { fr: "Ton nom, ton logo, tes couleurs : ton image de marque complète.", en: "Your name, logo and colours: your full brand." },
  3: { fr: "Trois façons de donner envie à tes clients. Tu choisis.", en: "Three ways to make your customers want it. You choose." },
  4: { fr: "Tes produits ou tes prestations, tes prix, tes coordonnées.", en: "Your products or services, prices and contact details." },
  5: { fr: "Ton site, conçu pour ta marque.", en: "Your website, designed for your brand." },
  6: { fr: "Ton site publié, à ton adresse.", en: "Your website published, at your address." },
  7: { fr: "Tes publications, prêtes et programmées.", en: "Your posts, ready and scheduled." },
  8: { fr: "Tes campagnes préparées, prêtes à lancer.", en: "Your campaigns prepared, ready to launch." },
  9: { fr: "SINA suit ton projet avec toi et propose des améliorations.", en: "SINA follows your project with you and suggests improvements." },
};

export type DashboardStep = { n: number; fr: string; en: string; status: StepStatus; ready: boolean; promise: T2 };
export type DashboardData = {
  /** Nom affiché : la marque quand elle existe, sinon le nom du projet. */
  name: string;
  /** SINA construit encore le projet avec le client. */
  building: boolean;
  /** Le client n'a pas encore commencé avec SINA (aucun parcours). */
  started: boolean;
  current: number;
  mode: "creation" | "refonte";
  keep: string[];
  steps: DashboardStep[];
  fiche: { fr: string; en: string; value: string; later: boolean }[];
  notes: { sujet: string; value: string }[];
  brand: { name: string | null; slogan: string | null; logo: string | null; colors: string[] } | null;
  angle: { title: string; promise: string | null } | null;
};

const HEX = /^#[0-9a-f]{3,8}$/i;

function ficheOf(j: Journey): DashboardData["fiche"] {
  return START_FIELDS.filter((f) => j.start[f]).map((f) => {
    const a = j.start[f]!;
    const value = a.status === "answered" ? (f === "business" ? (a.value === "services" ? "Des services" : "Des produits") : a.value) : a.status === "later" ? "Plus tard" : "Rien de particulier";
    return { fr: FIELD_LABEL[f].fr, en: FIELD_LABEL[f].en, value, later: a.status === "later" };
  });
}

/** La marque telle qu'elle est enregistrée dans le projet (nom, slogan, logo choisi, couleurs). */
function brandOf(projectId: string, brandJson: string | null): DashboardData["brand"] {
  const b = json<any>(brandJson ?? "{}", {});
  const colors = Object.values((b.palette ?? {}) as Record<string, unknown>).filter((c): c is string => typeof c === "string" && HEX.test(c)).slice(0, 6);
  const name = typeof b.name === "string" && b.name.trim() ? b.name.trim() : null;
  const logo = b.logo?.chosen ? `/api/projects/${projectId}/brand/logo` : null;
  if (!name && !logo && !colors.length) return null;
  return { name, slogan: typeof b.tagline === "string" && b.tagline.trim() ? b.tagline.trim() : null, logo, colors };
}

function angleOf(j: Journey): DashboardData["angle"] {
  const id = j.angleChoice?.id;
  const a = id ? j.angles?.list.find((x) => x.id === id) : null;
  if (!a) return null;
  return { title: a.title, promise: a.message || null };
}

export function dashboardOf(projectId: string): DashboardData | null {
  const p = one<{ name: string; brand_json: string | null }>("SELECT name, brand_json FROM projects WHERE id=?", projectId);
  if (!p) return null;
  const found = journeyOfProject(projectId);
  const j = found ?? emptyJourney();
  const brand = brandOf(projectId, p.brand_json);
  return {
    name: brand?.name ?? j.keptValues?.name ?? p.name,
    building: underConstruction(projectId),
    started: !!found,
    current: phaseOf(currentStep(j)).n,
    mode: j.mode,
    keep: j.keep,
    // Sans parcours, rien n'a commencé : aucune étape n'est dite « en cours ».
    steps: PHASES.map((ph) => ({ n: ph.n, fr: ph.fr, en: ph.en, status: found ? phaseStatus(j, ph) : "todo", ready: (ph.steps as readonly number[]).some((n) => stepReady(n)), promise: PHASE_PROMISE[ph.n] })),
    fiche: ficheOf(j),
    notes: (j.notes ?? []).map((n) => ({ sujet: n.sujet, value: n.value })),
    brand,
    angle: angleOf(j),
  };
}
