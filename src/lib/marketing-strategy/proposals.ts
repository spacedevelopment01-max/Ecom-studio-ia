import {documentStamp} from "../preparation/documents";
/** Evidence-led local preparation; these are creative hypotheses, never fabricated market research. */
import { memory, type Project } from "../projects";
import { createHash } from "node:crypto";
import { canonicalJSON } from "../brain/hash";
import type { StrategySource } from "./types";

export { GENERALIST_EXPLANATION_EN } from "./proposals-en";
export const GENERALIST_EXPLANATION =
  "Présenter l’ensemble de votre offre reste un choix explicite. Pour un produit, il utilise une place comme les autres angles. Pour les services, le site présente déjà toute l’activité sans consommer d’angle ; ce choix concerne uniquement les publications et publicités.";
export function inputDigest(p: Project) {
  const brand = p.brand
    ? (({
        direction,
        paletteMode,
        generatedBy,
        checks,
        validated,
        alternatives,
        taglineAlternatives,
        ...identity
      }) => identity)(p.brand)
    : null;
  return createHash("sha256")
    .update(
      canonicalJSON({
        business: p.business,
        language: p.settings.language ?? "fr",
        product: p.product,
        services: p.services,
        catalog: p.catalog,
        brand,
        // Derived choice is an output, not a new offer fact.
        // Including it would stale the analysis when its own selection is approved.
        sources: p.sources,
        constraints: memory(p.id)
          .filter(
            (m) =>
              m.source === "user" &&
              m.status === "confirmed" &&
              ["correction", "preference", "goal", "fact"].includes(m.kind),
          )
          .map((m) => ({
            kind: m.kind,
            key: m.key,
            value: m.value,
            scope: m.scope,
          })),
      }),
    )
    .digest("hex");
}
export function proposalAnalysis(p: Project) {
  const facts = p.product.facts.filter(
    (f) => f.status === "confirmed" && f.value.trim(),
  );
  const sources: StrategySource[] = [
    ...(p.product.name
      ? [
          {
            kind: "client" as const,
            label: "Offre renseignée",
            value: p.product.name,
          },
        ]
      : []),
    ...(p.product.summary
      ? [
          {
            kind: "client" as const,
            label: "Description du projet (non vérifiée extérieurement)",
            value: p.product.summary,
          },
        ]
      : []),
    ...facts.map((f) => ({
      kind: "confirmed_fact" as const,
      label: f.label,
      value: f.value,
      ref: f.source,
    })),
    ...p.services.services
      .filter((s) => s.name)
      .map((s) => ({
        kind: "client" as const,
        label: "Prestation renseignée",
        value: [s.name, s.description, s.duration, s.price]
          .filter(Boolean)
          .join(" — "),
      })),
  ];
  const missingQuestions: { key: string; question: string }[] = [];
  if (!p.product.name.trim() && !p.services.services.some((s) => s.name.trim()))
    missingQuestions.push({
      key: "offer",
      question: "Quel produit ou quelle prestation proposez-vous précisément ?",
    });
  if (
    !p.product.summary.trim() &&
    !p.services.services.some((s) => s.description?.trim())
  )
    missingQuestions.push({
      key: "usage",
      question:
        "Dans quelle situation votre offre est-elle utilisée, et quel besoin concret aide-t-elle à traiter ?",
    });
  // An AI persona from the old brand phase is not evidence of a validated market. Keep it labelled as a hypothesis.
  const audienceFact = facts.find((f) =>
    /cible|audience|public|client.*(type|profil)/i.test(f.label),
  );
  const audienceCandidate =
    audienceFact?.value ||
    p.brand?.audience?.trim() ||
    p.strategy?.audience?.[0]?.label?.trim();
  const audience = audienceCandidate && !/\[(?:À|A) (?:préciser|compléter)|\[To (?:complete|define)/i.test(audienceCandidate) ? audienceCandidate : undefined;
  if (audience && !audienceFact)
    sources.push({
      kind: "creative_hypothesis",
      label: "Cible de travail héritée, à valider",
      value: audience,
    });
  for (const source of [...p.sources, ...p.product.sources])
    if (source.type === "link")
      sources.push({
        kind: "client",
        label:
          "Lien fourni, contenu et date non vérifiés par cette préparation locale",
        value:
          "Référence à consulter avant toute affirmation de marché ou de concurrence.",
        ref: source.ref,
      });
  const limits = [
    "Aucune étude de marché ou concurrence vérifiée par ce calcul local. Les cibles et motivations proposées sont des hypothèses créatives à confronter au terrain.",
    "Aucune promesse de ventes, résultat chiffré ou caractéristique nouvelle. Les informations produit et l’identité validée restent inchangées.",
  ];
  if (p.settings.language === "en") {
    const labels: Record<string, string> = {
      "Offre renseignée": "Supplied offer",
      "Description du projet (non vérifiée extérieurement)":
        "Project description (not externally verified)",
      "Prestation renseignée": "Supplied service",
      "Cible de travail héritée, à valider":
        "Inherited working audience, to validate",
      "Lien fourni, contenu et date non vérifiés par cette préparation locale":
        "Supplied link; contents and date not verified by this local preparation",
    };
    for (const source of sources) {
      source.label = labels[source.label] ?? source.label;
      if (source.ref && source.kind === "client")
        source.value =
          "Reference to review before any market or competitor claim.";
    }

    for (const q of missingQuestions)
      q.question =
        q.key === "offer"
          ? "Which product or service do you offer, precisely?"
          : "In which situation is your offer used, and which concrete need does it help address?";
    limits.splice(
      0,
      limits.length,
      "No market or competitor research has been verified by this local preparation. Audiences and motivations are creative hypotheses to validate in practice.",
      "No sales promise, numerical result or new product characteristic. Known facts and the validated identity are preserved.",
    );
  }
  return { sources, missingQuestions, limits, facts, audience };
}

/** Research selection may later update project.strategy; it must not invalidate its own inputs. */
export const researchOfferDigest=(p:Project)=>createHash("sha256").update(inputDigest({...p,strategy:null})+documentStamp(p.id)).digest("hex");
