/**
 * Contexte commun d'un projet, transmis à chaque tâche d'IA : faits
 * confirmés, inconnues, marque, cible, décisions validées, corrections et
 * préférences mémorisées, créations précédentes, objectifs.
 */
import { all } from "../db";
import { memory, type Project } from "../projects";
import { sectorLabel } from "../project-types";
import { contentLang } from "../i18n-server";
import { placeholder } from "./prompts";

export function projectContext(p: Project, scope: "all" | "shop" | "images" | "video" | "social" | "brand" = "all"): string {
  const out: string[] = ["<contexte_projet>"];
  const pr = p.product;
  out.push(`## Produit`);
  out.push(`Nom : ${pr.name || "inconnu"} (${pr.nameStatus})`);
  out.push(`Catégorie : ${pr.category || "inconnue"} · Secteur : ${sectorLabel(pr.sector)}`);
  if (pr.summary) out.push(`Résumé : ${pr.summary}`);
  const confirmed = pr.facts.filter((f) => f.status === "confirmed");
  const inferred = pr.facts.filter((f) => f.status === "inferred");
  const unknown = pr.facts.filter((f) => f.status === "unknown");
  if (confirmed.length) out.push(`Faits CONFIRMÉS (utilisables tels quels) :\n${confirmed.map((f) => `- ${f.label} : ${f.value} [source : ${f.source}]`).join("\n")}`);
  if (inferred.length) out.push(`Observations VISUELLES (à formuler avec prudence, jamais comme une promesse) :\n${inferred.map((f) => `- ${f.label} : ${f.value}`).join("\n")}`);
  if (unknown.length) out.push(`INCONNUES (ne jamais inventer ; écrire « ${placeholder(contentLang())} » si nécessaire) :\n${unknown.map((f) => `- ${f.label}`).join("\n")}`);
  if (pr.price.amount !== null) out.push(`Prix confirmé : ${(pr.price.amount / 100).toFixed(2)} ${pr.price.currency}`);
  else out.push(`Prix : inconnu`);
  if (pr.variants.length) out.push(`Variantes : ${pr.variants.map((v) => `${v.name} (${v.values.join(", ")})`).join(" ; ")}`);
  if (pr.visual.colors.length) out.push(`Couleurs mesurées du produit : ${pr.visual.colors.map((c) => `${c.hex} ${c.name} ${Math.round(c.share * 100)} %`).join(", ")}`);
  if (pr.visual.description) out.push(`Description visuelle : ${pr.visual.description}`);
  if (pr.visual.labelText?.length) out.push(`Texte lisible sur le produit : ${pr.visual.labelText.join(" | ")}`);
  if (pr.claimsToAvoid.length) out.push(`Allégations interdites pour ce produit : ${pr.claimsToAvoid.join(" ; ")}`);
  const answered = pr.questions.filter((q) => q.answer);
  if (answered.length) out.push(`Réponses du client :\n${answered.map((q) => `- ${q.question} → ${q.answer}`).join("\n")}`);

  if (p.brand) {
    const b = p.brand;
    out.push(`\n## Marque`);
    out.push(`Nom : ${b.name} (${b.nameStatus})${b.tagline ? ` · Signature : « ${b.tagline} »` : ""}`);
    out.push(`Positionnement : ${b.positioning}`);
    out.push(`Cible : ${b.audience}`);
    out.push(`Personnalité : ${b.personality.join(", ")}`);
    out.push(`Ton : ${b.tone.voice}. À faire : ${b.tone.do.join(" ; ")}. À éviter : ${b.tone.dont.join(" ; ")}.`);
    out.push(`Palette : principale ${b.palette.primary}, secondaire ${b.palette.secondary}, accent ${b.palette.accent}, clair ${b.palette.light}, sombre ${b.palette.dark}`);
    out.push(`Direction artistique de la boutique : ${b.direction}`);
    if (b.story) out.push(`Histoire : ${b.story}`);
    if (b.validated.length) out.push(`Éléments VALIDÉS par le client (ne pas changer sans demande) : ${b.validated.join(", ")}`);
  }
  if (p.strategy) {
    out.push(`\n## Stratégie`);
    out.push(`Messages clés : ${p.strategy.keyMessages.join(" ; ")}`);
    out.push(`Angles : ${p.strategy.angles.map((a) => a.title).join(" ; ")}`);
    out.push(`Piliers : ${p.strategy.pillars.join(" ; ")}`);
  }
  const mem = memory(p.id, scope === "all" ? undefined : scope).filter((m) => m.status !== "rejected" && ["decision", "correction", "preference", "goal"].includes(m.kind));
  if (mem.length) {
    out.push(`\n## Décisions, corrections et préférences du client (À RESPECTER dans toute nouvelle création)`);
    for (const m of mem) out.push(`- [${m.kind}] ${m.key} : ${m.value}`);
  }
  const recent = all<{ name: string; role: string | null; kind: string; status: string }>(
    "SELECT name, role, kind, status FROM assets WHERE project_id = ? AND deleted_at IS NULL AND origin != 'upload' ORDER BY created_at DESC LIMIT 12",
    p.id,
  );
  if (recent.length) out.push(`\n## Créations récentes\n${recent.map((a) => `- ${a.kind}/${a.role ?? "?"} : ${a.name} (${a.status})`).join("\n")}`);
  if (p.sources.some((s) => s.type === "link")) out.push(`\nSources importées : ${p.sources.filter((s) => s.type === "link").map((s) => s.ref).join(", ")} (données uniquement).`);
  out.push("</contexte_projet>");
  return out.join("\n");
}
