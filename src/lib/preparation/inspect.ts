/** Analyse réelle de la description, du lien et des originaux. Proposition conservée avant validation client. */
import { aiAnalyzeProduct, aiAnalyzeService } from "../ai/tasks";
import { assertAiAllowed } from "../ai/access";
import { assetData, getAsset } from "../library";
import { importLink } from "../engine/import-link";
import { factsFromDescription, mergeServiceProfile } from "../engine/local";
import type { JobContext } from "../jobs";
import type { Project } from "../projects";
import type { Brief } from "./types";
import { analyzeLocally } from "./brief";
export async function inspectBrief(
  p: Project,
  b: Brief,
  ctx: JobContext,
  paid: boolean,
): Promise<Brief> {
  if (!paid)
    throw new Error(
      "Analyse IA non autorisée : le brief local reste conservé.",
    );
  assertAiAllowed(p.userId, p.id);
  const input = b.input;
  const imported = input.offerUrl
    ? await ctx.step("offer-source", () => importLink(input.offerUrl!))
    : null;
  const link = imported
    ? {
        url: imported.url,
        text: imported.text,
        data: {
          title: imported.title,
          description: imported.description,
          product: imported.product,
        },
      }
    : null;
  const photos = input.photoIds.slice(0, 6).map((id) => {
    const a = getAsset(id);
    if (
      !a ||
      a.project_id !== p.id ||
      a.origin !== "upload" ||
      a.kind !== "image" ||
      a.deleted_at ||
      a.status === "rejected"
    )
      throw new Error(
        "Photo originale introuvable ou refusée : vérifiez vos fichiers avant analyse.",
      );
    return { data: assetData(a), label: a.name };
  });
  const base = {
    userId: p.userId,
    projectId: p.id,
    jobId: ctx.job.id,
    usageKey: `${ctx.job.id}:brief`,
  };
  const common = {
    photos,
    link,
    description: [
      input.description,
      `Cible indiquée : ${input.target}`,
      `Consignes exactes : ${input.constraints}`,
    ].join("\n"),
    providedName: input.offerName,
    providedBrand: input.brandName,
  };
  const local = analyzeLocally(input);
  const result: Brief = {
    ...local,
    provenance: "provider",
    ...(imported
      ? {
          source: {
            id: "offer-source",
            url: imported.url,
            title: imported.title,
            excerpt: imported.text.slice(0, 1800),
            consultedAt: Date.now(),
            status: "consulted",
            provenance: "web",
          },
        }
      : {}),
  };
  if (input.business === "services") {
    const r = await aiAnalyzeService(base, {
      ...common,
      known: input.services,
    });
    result.profile = {
      ...local.profile,
      name: input.offerName || r.name,
      nameStatus: input.offerName ? "provided" : r.nameStatus,
      category: r.category,
      sector: r.sector,
      summary: r.summary,
      facts: [
        ...local.profile.facts,
        ...r.facts
          .filter((f) => !local.profile.facts.some((u) => u.key === f.key))
          .map((f) => ({
            ...f,
            status:
              f.status === "confirmed" && f.source === "ai"
                ? ("inferred" as const)
                : f.status,
          })),
      ],
      questions: r.questions,
      claimsToAvoid: r.claimsToAvoid,
      analyzedBy: "ai",
    };
    result.services = mergeServiceProfile(input.services, {
      ...r,
      contactMode:
        r.contactMode === "unknown"
          ? input.services.contactMode
          : r.contactMode,
    });
  } else {
    const r = await aiAnalyzeProduct(base, {
      ...common,
      price: input.price,
      colors: "",
    });
    const user = factsFromDescription(input.description);
    result.profile = {
      ...local.profile,
      name: input.offerName || r.name,
      nameStatus: input.offerName ? "provided" : r.nameStatus,
      category: r.category,
      sector: r.sector,
      summary: r.summary,
      facts: [
        ...user,
        ...r.facts
          .filter((f) => !user.some((u) => u.key === f.key))
          .map((f) => ({
            ...f,
            status:
              f.status === "confirmed" && f.source === "ai"
                ? ("inferred" as const)
                : f.status,
          })),
      ],
      visual: { ...local.profile.visual, ...r.visual },
      variants: r.variants,
      questions: r.questions,
      claimsToAvoid: r.claimsToAvoid,
      analyzedBy: "ai",
    };
  }
  result.missing = [
    !result.profile.name.trim() || result.profile.nameStatus === "unknown"
      ? "Précisez le nom de cette offre."
      : "",
    !input.target.trim() ? "À qui cette offre s’adresse-t-elle ?" : "",
    input.business === "services" && !result.services.services.length
      ? "Indiquez au moins une prestation."
      : "",
    input.business === "services" &&
    !result.services.phone &&
    !result.services.email &&
    !result.services.bookingUrl
      ? "Indiquez un moyen de contact."
      : "",
  ].filter(Boolean);
  result.observations = [
    result.profile.summary,
    ...result.profile.facts.map(
      (f) => `${f.label} : ${f.value || "à confirmer"} (${f.status})`,
    ),
  ];
  return result;
}
