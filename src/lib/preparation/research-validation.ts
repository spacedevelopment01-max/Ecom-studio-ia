import type {Research} from "./types";
import {assertSourcedResearch} from "./research-evidence";
export function validateResearch(r: Research, allowLegacy = false): Research {
  if(r.formatVersion===3)assertSourcedResearch(r);
  const legacy = allowLegacy && !r.formatVersion && r.angles.length === 3;
  if (!legacy) {
    if (r.angles.length !== 5) throw new Error("Cinq angles sont nécessaires pour une nouvelle recherche.");
    for (const a of r.angles) if (!a.motivation?.trim() || !a.message?.trim()) throw new Error("Chaque angle doit préciser sa motivation et son message.");
    for (let i = 0;i < r.angles.length;i++) for (const b of r.angles.slice(i + 1)) {
      const a = r.angles[i];
      const dimensions = [[a.positioning, b.positioning], [a.audience, b.audience], [a.motivation!, b.motivation!], [a.objections.map(x => x.objection).join(" "), b.objections.map(x => x.objection).join(" ")], [a.message!, b.message!]];
      if (dimensions.filter(([x, y]) => meaningOverlap(x, y) < 0.72).length < 4) throw new Error("Angles trop proches : des approches distinctes sont nécessaires ; différenciez positionnement, cible, motivation, objection et message.");
    }
  }
  const consulted = new Map(
    r.sources.filter((s) => s.status === "consulted").map((s) => [s.id, s]),
  );
  for (const o of r.observations)
    if (!consulted.get(o.sourceId)?.excerpt.includes(o.quote))
      throw new Error(
        "Observation refusée : la citation ne figure pas dans la source consultée.",
      );
  if (
    new Set(r.angles.map((a) => a.id)).size !== r.angles.length ||
    new Set(r.angles.map((a) => a.positioning.trim().toLowerCase())).size !==
    r.angles.length ||
    !r.angles.some((a) => a.id === r.recommendedId)
  )
    throw new Error(
      "Les approches doivent être distinctes et la recommandation doit correspondre à une approche.",
    );
  for (const a of r.angles)
    if (a.sourceIds.some((id) => !consulted.has(id)))
      throw new Error("Référence non consultée dans une proposition.");
  return r;
}
/** Filtre déterministe de répétition, pas une certification sémantique par un modèle. */
function meaningOverlap(a: string, b: string) {
  const words = (s: string) => new Set(s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 3 && !["pour", "dans", "avec", "cette", "avant", "offre", "personnes"].includes(w)));
  const A = words(a), B = words(b);
  if (!A.size || !B.size) return 1;
  return [...A].filter(w => B.has(w)).length / Math.min(A.size, B.size);
}
export const isLegacyResearch = (r: Research) => !r.formatVersion && r.angles.length === 3;
