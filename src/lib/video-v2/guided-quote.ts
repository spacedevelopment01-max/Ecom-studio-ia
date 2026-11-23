/**
 * LE PRIX D'UNE VIDÉO GUIDÉE, UNE SEULE FAÇON DE LE CALCULER (23 novembre 2026, deux prix vus pour « Le moment
 * cadeau » : environ 3,2 % dans l'atelier, environ 11 % sur la page de réglage). C'est la chaîne réellement exécutée
 * (`sceneChainQuote` : scénario, images de départ, leur relecture, plans, leur relecture, voix) qui fait foi : la page de
 * réglage, l'atelier (ses modèles de vidéo) et SINA (`atelier.etat`, `atelier.video`) lisent tous ce devis.
 * `estimateMicro` : le coût probable, montré comme prix ; `capMicro` : la borne haute de l'accord, montrée « au plus ».
 */
import { L } from "../i18n-server";
import { planAllowsAds } from "../plan-entitlements";
import { projectPlan } from "../project-billing";
import { budgetPctOf } from "../ai/budget-pct";
import { sceneChainQuote } from "./chain-quote";
import type { ThreeScenesRequest } from "./three-scenes";
import type { Project } from "../projects";

export function devisVideoGuidee(p: Project, r: ThreeScenesRequest) {
  const q = sceneChainQuote(p, r);
  if (r.as === "ad" && !planAllowsAds(projectPlan(p.id)))
    return { ...q, allowed: false, reason: L("La vidéo publicitaire demande le forfait Dominer. Tes vidéos déjà faites restent là.", "Advertising video requires the Dominate plan. Your existing videos stay."), estimateMicro: 0, capMicro: 0, pct: 0 };
  return { ...q, pct: budgetPctOf(p.userId, q.estimateMicro, p.id) };
}
