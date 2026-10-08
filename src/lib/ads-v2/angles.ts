/**
 * Angles publicitaires (Ads V2) : réellement différents, chacun avec sa propre MATIÈRE (un fait, un usage, une
 * objection et sa réponse, une preuve, une prestation…). Deux annonces qui disent la même chose ne testent rien.
 * Choix local et déterministe : l'angle n'existe que si sa matière existe (pas d'objection sans réponse, pas de
 * preuve manquante, pas d'offre non configurée, pas d'idée cadeau pour un service).
 */
import crypto from "node:crypto";
import type { AdInsight, AnglePlan, AngleType } from "./types";

type Candidate = Omit<AnglePlan, "id">;

const LEVERS: Record<AngleType, string> = {
  demonstration: "démonstration",
  detail: "détail qui intrigue",
  use_case: "situation d'usage",
  problem_solution: "problème → solution",
  objection: "objection levée",
  proof: "preuve",
  origin_craft: "savoir-faire / origine",
  gift: "idée cadeau",
  local_trust: "proximité",
  offer: "offre réelle",
};

/** Toutes les possibilités, dans l'ordre de force (la plus concrète d'abord). */
export function angleCandidates(i: AdInsight): Candidate[] {
  const out: Candidate[] = [];
  const add = (type: AngleType, material: string, why: string) => material.trim() && out.push({ type, material: material.trim(), why, lever: LEVERS[type] });
  const origin = i.facts.find((f) => /origine|fabriqu|made in|artisan|atelier|fait main|handmade|savoir/i.test(`${f.label} ${f.value}`));
  if (i.business === "products") {
    if (i.usage[0]) add("demonstration", i.usage[0], "voir le produit fonctionner convainc plus qu'une promesse");
    const detail = i.facts.find((f) => f !== origin);
    if (detail) add("detail", `${detail.label} : ${detail.value}`, "un détail vérifiable arrête le défilement");
    if (i.problem) add("problem_solution", i.problem, "l'audience reconnaît son problème");
    for (const o of i.objections.slice(0, 1)) add("objection", `${o.objection} → ${o.answer}`, "lever le frein le plus fréquent avant l'achat");
    if (i.proofs[0]) add("proof", i.proofs[0], "une preuve disponible rassure");
    if (origin) add("origin_craft", `${origin.label} : ${origin.value}`, "l'origine ou le savoir-faire différencie");
    if (i.usage[1]) add("use_case", i.usage[1], "projeter l'usage dans le quotidien");
    if (!i.audience.adultsOnly && i.category.id !== "digital") add("gift", i.offerName, "un cadeau a une échéance naturelle");
    else if (i.audience.adultsOnly) add("gift", i.offerName, "les parents et l'entourage offrent");
  } else {
    for (const s of i.services.slice(0, 2)) add("demonstration", s.description ? `${s.name} : ${s.description}` : s.name, "montrer le travail réel");
    if (i.problem) add("problem_solution", i.problem, "le client reconnaît son besoin");
    if (i.area) add("local_trust", i.area, "la proximité décide pour un service local");
    for (const o of i.objections.slice(0, 1)) add("objection", `${o.objection} → ${o.answer}`, "lever le frein avant le contact");
    const fact = i.facts[0];
    if (fact) add("proof", `${fact.label} : ${fact.value}`, "un fait vérifiable rassure");
    if (origin) add("origin_craft", `${origin.label} : ${origin.value}`, "le savoir-faire différencie");
  }
  if (i.offer) add("offer", i.offer, "offre configurée par le client");
  // Dernier recours : la différence déclarée par la plateforme de marque.
  if (i.difference) add("detail", i.difference, "ce qui distingue la marque");
  return out;
}

/**
 * Plan de `n` angles : jamais deux fois le même type ni la même matière ; si la matière manque, moins d'angles
 * (et l'écart est signalé) plutôt que des angles inventés.
 */
export function planAngles(i: AdInsight, n: number): { angles: AnglePlan[]; missing: number } {
  const picked: AnglePlan[] = [];
  const types = new Set<AngleType>();
  const materials = new Set<string>();
  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  for (const c of angleCandidates(i)) {
    if (picked.length >= n) break;
    if (types.has(c.type) || materials.has(norm(c.material))) continue;
    types.add(c.type);
    materials.add(norm(c.material));
    picked.push({ ...c, id: crypto.createHash("sha256").update(`${c.type}|${norm(c.material)}`).digest("hex").slice(0, 10) });
  }
  return { angles: picked, missing: Math.max(0, n - picked.length) };
}
