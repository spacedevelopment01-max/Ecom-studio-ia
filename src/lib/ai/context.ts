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
  const services = p.business === "services";
  if (services) out.push(servicesContext(p));
  out.push(services ? `## Activité (profil)` : `## Produit`);
  out.push(`Nom : ${pr.name || "inconnu"} (${pr.nameStatus})`);
  out.push(`${services ? "Métier" : "Catégorie"} : ${pr.category || "inconnue"} · Secteur : ${sectorLabel(pr.sector)}`);
  if (pr.summary) out.push(`Résumé : ${pr.summary}`);
  const confirmed = pr.facts.filter((f) => f.status === "confirmed");
  const inferred = pr.facts.filter((f) => f.status === "inferred");
  const unknown = pr.facts.filter((f) => f.status === "unknown");
  if (confirmed.length) out.push(`Faits CONFIRMÉS (utilisables tels quels) :\n${confirmed.map((f) => `- ${f.label} : ${f.value} [source : ${f.source}]`).join("\n")}`);
  if (inferred.length) out.push(`Observations VISUELLES (à formuler avec prudence, jamais comme une promesse) :\n${inferred.map((f) => `- ${f.label} : ${f.value}`).join("\n")}`);
  if (unknown.length) out.push(`INCONNUES (ne jamais inventer ; écrire « ${placeholder(contentLang())} » si nécessaire) :\n${unknown.map((f) => `- ${f.label}`).join("\n")}`);
  if (services) {
    // Les tarifs d'une entreprise de services sont ceux des prestations (section ci-dessus), jamais un prix de produit.
  } else if (pr.price.amount !== null) out.push(`Prix confirmé : ${(pr.price.amount / 100).toFixed(2)} ${pr.price.currency}`);
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

/**
 * Entreprise de services : nature de l'activité, offre telle que saisie (prestations, tarifs et durées
 * seulement s'ils ont été donnés), zone, horaires, contact, et consignes de vocabulaire et de véracité.
 */
export function servicesContext(p: Pick<Project, "services" | "product">): string {
  const s = p.services;
  const ph = placeholder(contentLang());
  const val = (v: string | undefined) => (v?.trim() ? v.trim() : `inconnu (écrire « ${ph} » si un texte en a besoin)`);
  const mode = { booking: "rendez-vous en ligne (lien de réservation)", quote: "demande de devis", call: "appel téléphonique", form: "formulaire de contact" }[s?.contactMode ?? "form"];
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
    `Consignes propres aux services :
- Vocabulaire du métier : prestations, rendez-vous, séance, consultation, intervention, devis, zone d'intervention, horaires, clients accompagnés, réalisations, équipe. N'emploie jamais « produit », « panier », « livraison », « commande », « stock », « expédition », « retours », « packshot » ou « détourage ».
- Appels à l'action adaptés au mode de contact : « Prendre rendez-vous », « Demander un devis », « Appeler », « Nous contacter » (ou leurs équivalents dans la langue des contenus).
- Ne jamais inventer : tarif, devis gratuit, délai ou rapidité d'intervention, disponibilité (7j/7, 24h/24), diplôme, qualification, certification, label, assurance, années d'expérience, nombre de clients, résultat garanti, avis ou note. Seuls les éléments ci-dessus et les faits confirmés sont utilisables ; sinon « ${ph} ».
- Les pages « livraison et retours » deviennent « Infos pratiques » (zone, adresse, horaires, accès, contact, prise de rendez-vous) ; les conditions générales de vente deviennent des conditions de prestation, rédigées en espaces réservés à faire valider par le professionnel.
- Santé, juridique, finances : aucune promesse de résultat, de guérison ou de gain.`,
  ].join("\n");
}
