import type { TutorialDef } from "./types";
import pilote from "./pilote";
import produit from "./produit";
import activite from "./activite";
import marque from "./marque";
import boutique from "./boutique";
import site from "./site";
import images from "./images";
import videos from "./videos";
import prompts from "./prompts";
import publications from "./publications";
import calendrier from "./calendrier";
import publicites from "./publicites";
import fichiers from "./fichiers";
import connexions from "./connexions";

export type { Bi, TutorialDef } from "./types";

/** Un tutoriel par onglet ; « Activité » et « Site » remplacent « Produit » et « Boutique » pour une entreprise de services. */
export const TUTORIALS = { pilote, produit, activite, marque, boutique, site, images, videos, prompts, publications, calendrier, publicites, fichiers, connexions } satisfies Record<string, TutorialDef>;
export type TutorialId = keyof typeof TUTORIALS;
export const TUTORIAL_IDS = Object.keys(TUTORIALS) as TutorialId[];

/** Tutoriel de l'onglet affiché, selon le type d'activité du projet. */
export function tutorialFor(tab: string, business?: "products" | "services"): TutorialId | null {
  if (business === "services" && tab === "produit") return "activite";
  if (business === "services" && tab === "boutique") return "site";
  return tab in TUTORIALS ? (tab as TutorialId) : null;
}

/** Projet de démonstration filmé pour chaque tutoriel. */
export const tutorialBusiness = (id: TutorialId): "products" | "services" => (id === "activite" || id === "site" ? "services" : "products");

/** Onglet du studio montré par un tutoriel. */
export const tutorialTab = (id: TutorialId) => (id === "activite" ? "produit" : id === "site" ? "boutique" : id);

/** Fichiers publiés : public/tutorials/<id>[.en].mp4 / .jpg / .json (minutage des étapes). */
/**
 * Nom des fichiers publiés. Les bloqueurs de publicité suppriment les adresses contenant « publicite », « ads »… :
 * le tutoriel de l'onglet Publicités est donc publié sous un nom neutre.
 */
export const tutorialSlug = (id: TutorialId) => (id === "publicites" ? "campagnes" : id);
export const tutorialFile = (id: TutorialId, lang: "fr" | "en", ext: "mp4" | "jpg" | "json") => `/tutorials/${tutorialSlug(id)}${lang === "en" ? ".en" : ""}.${ext}`;
export type TutorialTiming = { duration: number; steps: number[] };
