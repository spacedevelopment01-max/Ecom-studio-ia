/**
 * Contexte commun d'un projet, transmis à chaque tâche d'IA : faits
 * confirmés, inconnues, marque, cible, décisions validées, corrections et
 * préférences mémorisées, créations précédentes, objectifs.
 */
import type { Project } from "../projects";
import { legacyView, type LegacyScope } from "../brain/facade";
import { contactModesOf, sectorLabel, type BrandPlatform } from "../project-types";
import { contentLang } from "../i18n-server";
import { placeholder } from "./prompts";
import { servicesRulesText } from "../brain/texts";

/**
 * Contexte commun d'un projet transmis aux tâches d'IA. Depuis la phase 2.1, c'est une façade du Project Brain
 * (src/lib/brain) : même signature, même rôle, mais un contexte stable (sans les créations récentes, qui passent
 * dans le slot volatil après le point de cache), séparé en contraintes fermes / souples / indications, sans les
 * doublons « marque.* » de la mémoire, et tracé (portée, empreinte, version du Brain).
 */
export function projectContext(p: Project, scope: LegacyScope = "all"): string {
  return legacyView(p, scope).stable;
}

/**
 * Entreprise de services : nature de l'activité, offre telle que saisie (prestations, tarifs et durées
 * seulement s'ils ont été donnés), zone, horaires, contact, et consignes de vocabulaire et de véracité.
 */
export function servicesContext(p: Pick<Project, "services" | "product">): string {
  const s = p.services;
  const ph = placeholder(contentLang());
  const val = (v: string | undefined) => (v?.trim() ? v.trim() : `inconnu (écrire « ${ph} » si un texte en a besoin)`);
  const modeLabel = { booking: "rendez-vous en ligne (lien de réservation)", quote: "demande de devis", call: "appel téléphonique", form: "formulaire de contact" };
  const mode = modeLabel[s?.contactMode ?? "form"];
  const others = contactModesOf(s).slice(1).map((m) => modeLabel[m]);
  const list = (s?.services ?? []).filter((x) => x.name.trim());
  return [
    `## Type d'activité : ENTREPRISE DE SERVICES (site vitrine pour prendre rendez-vous, demander un devis ou contacter ; ce n'est pas une boutique de produits)`,
    `Prestations (saisies par le client) :${list.length ? `\n${list.map((x) => `- ${x.name}${x.description?.trim() ? ` : ${x.description.trim()}` : ""}${x.duration?.trim() ? ` · durée : ${x.duration.trim()}` : ""}${x.price?.trim() ? ` · tarif : ${x.price.trim()}` : " · tarif : non communiqué"}`).join("\n")}` : ` aucune liste fournie (ne pas en inventer ; écrire « ${ph} »)`}`,
    `Zone d'intervention : ${val(s?.area)}`,
    `Adresse d'accueil : ${val(s?.address)}`,
    `Horaires : ${val(s?.hours)}`,
    `Téléphone : ${val(s?.phone)} · E-mail : ${val(s?.email)}`,
    `Lien de prise de rendez-vous : ${val(s?.bookingUrl)}`,
    `Mode de contact principal : ${mode}`,
    ...(others.length ? [`Autres façons de contacter acceptées (à proposer aussi, sans les mettre au premier plan) : ${others.join(", ")}`] : []),
    servicesRulesText(ph),
  ].join("\n");
}

/** Plateforme de marque transmise aux rédacteurs : persona, problème, concurrence, différence, preuves, objections. */
export function platformContext(pf: BrandPlatform): string {
  const out = [`Plateforme de marque :`];
  if (pf.persona) out.push(`- Persona : ${pf.persona}`);
  if (pf.problem) out.push(`- Problème du persona : ${pf.problem}`);
  if (pf.alternatives) out.push(`- Alternatives et codes de la concurrence typique (à éviter) : ${pf.alternatives}`);
  if (pf.difference) out.push(`- Différence : ${pf.difference}`);
  const ok = pf.proofs.filter((x) => x.status === "available" && x.claim);
  const missing = pf.proofs.filter((x) => x.status === "missing" && x.claim);
  if (ok.length) out.push(`- Preuves DISPONIBLES (arguments utilisables) : ${ok.map((x) => `${x.claim} (preuve : ${x.proof})`).join(" ; ")}`);
  if (missing.length) out.push(`- Arguments SANS PREUVE (ne jamais les affirmer ; « ${placeholder(contentLang())} » si un texte en a besoin) : ${missing.map((x) => x.claim).join(" ; ")}`);
  if (pf.objections.length) out.push(`- Objections et réponses (à traiter dans la FAQ et la fiche) :\n${pf.objections.filter((o) => o.objection).map((o) => `  · ${o.objection} → ${o.answer || placeholder(contentLang())}`).join("\n")}`);
  return out.join("\n");
}
