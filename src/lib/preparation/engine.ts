/** Orchestration amont : points de reprise existants, validation client et contrat, jamais de thème. */
import { all, id, json, now, one, run, tx } from "../db";
import { HttpError } from "../auth";
import { enqueue, JobPaused, UserFacingError, type JobContext } from "../jobs";
import {
  loadProject,
  remember,
  saveProduct,
  saveServices,
  saveStrategy,
  saveBrand,
} from "../projects";
import { stableHash as brainHash } from "../brain/hash";
const stableHash = (data: unknown) => brainHash("preparation", data);
import { getAsset, type Asset } from "../library";
import { gateContent, localContentChecks } from "../seo-v2/quality";
import { verifiedFacts } from "../seo-v2/facts";
import { sitePages } from "../seo-v2/pages";
import { withAiDisabled } from "../ai/access";
import { requirePlan } from "../plan-gates";
import { paletteIssues } from "../engine/brand-check";
import { latestContent } from "../seo-v2/store";
import { isAutoUsable } from "../quality/usable";
import { assertAiAllowed } from "../ai/access";
import { assertCanSpend } from "../billing";
import { withTrace } from "../ai/trace";
import { redact } from "../redact";
import { analyzeLocally } from "./brief";
import { realDependencies, type Dependencies } from "./deps";
import {
  commitState,
  draft,
  historyOf,
  inputHash,
  invalidateAfter,
  requireUpstream,
  stageOf,
  stateOf,
} from "./store";
import {
  STEPS,
  type Input,
  type Media,
  type ReadyContract,
  type Research,
  type State,
  type Step,
  type VisualSlot,
} from "./types";
import type { Strategy } from "../project-types";
export { stateOf, historyOf };
export function initialize(projectId: string, input: Input) {
  if (stateOf(projectId)) throw new HttpError(409, "Le parcours existe déjà.");
  return commitState(projectId, 0, (s) =>
    draft(s, "brief", analyzeLocally(input)),
  );
}
const identityHash = (
  b: NonNullable<ReturnType<typeof loadProject>["brand"]>,
) =>
  stableHash({
    name: b.name,
    tagline: b.tagline,
    palette: b.palette,
    fonts: b.fonts,
  });
function needed(s: State) {
  return STEPS.filter((k) => s.stages[k]?.status !== "approved");
}
export function strategyOf(r: Research): Strategy {
  const a = r.angles.find((x) => x.id === r.selectedId);
  if (!a) throw new HttpError(409, "Choisissez un angle.");
  return {
    audience: [
      {
        label: a.audience,
        needs: a.arguments,
        objections: a.objections.map((x) => x.objection),
      },
    ],
    angles: [{ title: a.title, idea: a.positioning }],
    pillars: a.arguments,
    keyMessages: a.arguments,
    platform: {
      persona: a.audience,
      problem: a.positioning,
      alternatives: r.observations.map((x) => x.quote).join("\n"),
      difference: a.reason,
      proofs: a.arguments.map((claim) => ({
        claim,
        proof:
          "Hypothèse validée par le client ; aucune preuve chiffrée ajoutée.",
        status: "missing",
      })),
      objections: a.objections,
    },
    generatedBy: "local",
  };
}
export function usableAsset(
  projectId: string,
  assetId: string,
  role?: "logo",
): Asset {
  const a = getAsset(assetId);
  if (
    !a ||
    a.project_id !== projectId ||
    a.kind !== "image" ||
    !isAutoUsable(a)
  )
    throw new HttpError(
      409,
      "Ce média est absent, refusé ou appartient à un autre projet.",
      "preparation_media_unusable",
    );
  const meta = json<any>(a.meta, {});
  if (role === "logo" && !["logo", "logo-v2"].includes(a.role || ""))
    throw new HttpError(409, "Choisissez un logo du projet.");
  if (a.origin !== "upload" && meta.gate?.verdict !== "FINAL")
    throw new HttpError(
      409,
      "Ce média généré n’a pas de contrôle final validé.",
    );
  return a;
}
/** Refuse une génération avec des données modifiées dans un autre onglet sans nouvelle validation. */
export function assertFresh(projectId: string, s: State, step: Step) {
  const p = loadProject(projectId);
  const i = STEPS.indexOf(step);
  if (i > 0) {
    const b = stageOf(s, "brief").data;
    if (
      stableHash(p.product) !== stableHash(b.profile) ||
      stableHash(p.services) !== stableHash(b.services) ||
      p.business !== b.input.business
    )
      throw new HttpError(
        409,
        "L’offre a changé hors du parcours. Revalidez votre brief avant de continuer.",
      );
  }
  if (
    i > 1 &&
    stableHash(p.strategy) !==
      stableHash(strategyOf(stageOf(s, "research").data))
  )
    throw new HttpError(
      409,
      "La stratégie a changé hors du parcours. Revalidez votre choix.",
    );
  if (
    i > 2 &&
    stableHash(p.brand) !== stableHash(stageOf(s, "brand").data.proposal)
  )
    throw new HttpError(
      409,
      "L’identité a changé hors du parcours. Revalidez votre marque.",
    );
}
export function blockers(projectId: string, s = stateOf(projectId)): string[] {
  if (!s) return ["Démarrez la préparation du projet."];
  const names: Record<Step, string> = {
    brief: "votre offre",
    research: "recherche et stratégie",
    brand: "votre marque",
    content: "contenus et plan",
    media: "visuels",
  };
  const out = needed(s).map(
    (k) => `Étape à valider ou à reprendre : ${names[k]}.`,
  );
  if (s.pending) out.push("Une préparation est encore en cours.");
  if (out.length) return out;
  const p = loadProject(projectId);
  const b = stageOf(s, "brief").data;
  const brand = stageOf(s, "brand").data;
  const media = stageOf(s, "media").data;
  if (b.missing.length) out.push(...b.missing);
  if (
    stableHash(p.product) !== stableHash(b.profile) ||
    stableHash(p.services) !== stableHash(b.services) ||
    p.business !== b.input.business
  )
    out.push(
      "Les informations ont changé hors du parcours : revalidez le brief.",
    );
  for (const d of stageOf(s, "content").data.documents) {
    const cur = latestContent(projectId, d.docKey);
    if (!cur || stableHash(cur.doc) !== stableHash(d.doc))
      out.push(
        "Un texte a été modifié : reprenez et validez les textes corrigés.",
      );
  }
  if (stableHash(p.brand) !== stableHash(brand.proposal))
    out.push("La marque a changé : revalidez l’identité.");
  if (
    stableHash(p.strategy) !==
    stableHash(strategyOf(stageOf(s, "research").data))
  )
    out.push("La stratégie a changé : revalidez le choix.");
  try {
    if (!brand.selectedLogo) out.push("Choisissez un logo validé.");
    else usableAsset(projectId, brand.selectedLogo, "logo");
    for (const slot of media.slots) {
      if (slot.required && (!slot.assetId || !slot.reviewed))
        out.push(`Visuel à valider : ${slot.key}.`);
      if (slot.assetId) usableAsset(projectId, slot.assetId);
    }
  } catch (e) {
    out.push((e as Error).message);
  }
  return out;
}
export function readyContract(projectId: string): ReadyContract | null {
  const s = stateOf(projectId);
  if (!s || blockers(projectId, s).length) return null;
  const p = loadProject(projectId);
  const c = stageOf(s, "content").data;
  return {
    schemaVersion: 1,
    kind: "project_ready_for_theme",
    projectId,
    revision: s.revision,
    provenance: s.simulation ? "simulation" : "production",
    builtAt: s.updatedAt,
    clientBrief: stageOf(s, "brief").data.input,
    profile: p.product,
    services: p.business === "services" ? p.services : null,
    strategy: p.strategy!,
    brand: p.brand!,
    copy: c.copy,
    pages: c.pages,
    documents: c.documents,
    media: stageOf(s, "media").data.slots,
    sources: stageOf(s, "research").data.sources,
    approvals: Object.fromEntries(
      STEPS.map((k) => [
        k,
        {
          candidateId: s.stages[k]!.candidateId,
          approvedAt: s.stages[k]!.approvedAt!,
        },
      ]),
    ) as ReadyContract["approvals"],
    warnings: [
      ...c.notes,
      "Disponibilité juridique du nom et domaines non vérifiée.",
      "Prêt pour la composition, pas une autorisation de publication.",
    ],
  };
}
export function approve(
  projectId: string,
  revision: number,
  step: Step,
  o: { choiceId?: string; logoId?: string } = {},
) {
  const result = commitState(projectId, revision, (s) => {
    requireUpstream(s, step);
    assertFresh(projectId, s, step);
    const st = stageOf(s, step);
    if (st.inputHash !== inputHash(s, step))
      throw new HttpError(
        409,
        "Les choix en amont ont changé. Préparez une nouvelle proposition sans effacer la version précédente.",
      );
    if (step === "brief") {
      const b = stageOf(s, "brief").data;
      if (b.missing.length) throw new HttpError(409, b.missing.join(" "));
      saveProduct(projectId, b.profile);
      saveServices(projectId, b.services);
      run(
        "UPDATE projects SET business_type=? WHERE id=?",
        b.input.business,
        projectId,
      );
      remember(projectId, {
        kind: "decision",
        key: "preparation.consigne_client",
        value: [b.input.description, b.input.target, b.input.constraints].join(
          "\n",
        ),
        source: "user",
      });
    }
    if (step === "research") {
      const r = stageOf(s, "research").data;
      if (!r.sources.some((x) => x.status === "consulted"))
        throw new HttpError(
          409,
          "Aucune source n’a pu être consultée. Ajoutez un lien public accessible.",
        );
      if (!r.angles.some((a) => a.id === o.choiceId))
        throw new HttpError(400, "Choisissez une proposition disponible.");
      r.selectedId = o.choiceId;
      saveStrategy(projectId, strategyOf(r));
      remember(projectId, {
        kind: "decision",
        key: "preparation.strategie",
        value: r.angles.find((a) => a.id === o.choiceId)!.positioning,
        source: "user",
      });
    }
    if (step === "brand") {
      const b = stageOf(s, "brand").data;
      if (!b.identityConfirmed)
        throw new HttpError(
          409,
          "Validez d’abord le nom et l’identité avant de choisir un logo.",
        );
      const asset = usableAsset(
        projectId,
        o.logoId || b.selectedLogo || "",
        "logo",
      );
      const logoMeta = json<any>(asset.meta, {});
      if (
        logoMeta.preparation?.identityHash &&
        logoMeta.preparation.identityHash !== identityHash(b.proposal)
      )
        throw new HttpError(
          409,
          "Ce logo appartient à une autre proposition d’identité.",
        );
      b.selectedLogo = asset.id;
      b.proposal = {
        ...b.proposal,
        validated: ["name", "tagline", "palette", "fonts", "logo"],
        logo: {
          ...b.proposal.logo,
          assetId: asset.id,
          status: asset.origin === "upload" ? "provided" : "validated",
          provisional: false,
        },
      };
      saveBrand(projectId, b.proposal);
    }
    if (step === "content") {
      const c = stageOf(s, "content").data;
      const p = loadProject(projectId);
      for (const item of c.documents) {
        const current = latestContent(projectId, item.docKey);
        if (!current || stableHash(current.doc) !== stableHash(item.doc))
          throw new HttpError(
            409,
            "Un texte a changé : reprenez sa dernière version dans l’éditeur avant validation.",
          );
        const scoped =
          item.doc.type === "service_page"
            ? {
                ...p,
                services: {
                  ...p.services,
                  services: [
                    p.services.services[
                      Number(item.doc.page.key.split(":")[1])
                    ],
                  ].filter(Boolean),
                },
              }
            : p;
        const checks = localContentChecks(
          item.doc,
          scoped,
          verifiedFacts(scoped),
          { pages: sitePages(p) },
        );
        const decision = gateContent({
          type: item.doc.type,
          local: checks,
          review: null,
          attempt: 2,
        });
        if (decision.fatalCodes.length || decision.blockingCodes.length)
          throw new HttpError(
            409,
            "Texte à corriger : " + checks.issues.join(" "),
          );
      }
      if (
        !c.documents.length ||
        c.documents.some((d) => ["REJECTED", "RETRY"].includes(d.verdict))
      )
        throw new HttpError(
          409,
          "Les textes doivent être corrigés avant validation.",
        );
      remember(projectId, {
        kind: "artifact",
        key: "shop_copy",
        value: JSON.stringify(c.copy),
        source: "user",
      });
    }
    if (step === "media") {
      const m = stageOf(s, "media").data;
      for (const slot of m.slots) {
        if (slot.required && (!slot.reviewed || !slot.assetId))
          throw new HttpError(409, `Vérifiez le visuel ${slot.key}.`);
        if (slot.assetId) usableAsset(projectId, slot.assetId);
      }
    }
    invalidateAfter(s, step);
    st.status = "approved";
    st.approvedAt = now();
    // Changer un choix important rend la suite obsolète, mais conserve toutes ses données et versions.
    if (step === "content") {
      const previous = s.stages.media?.data.slots ?? [];
      draft(s, "media", {
        slots: stageOf(s, "content").data.slots.map((slot) => {
          const old = previous.find(
            (x) => x.key === slot.key && x.purpose === slot.purpose,
          );
          return {
            ...structuredClone(slot),
            ...(old?.assetId ? { assetId: old.assetId } : {}),
            reviewed: false,
          };
        }),
        notes: previous.length
          ? [
              "Les images existantes sont conservées ; vérifiez leur adéquation au nouveau contenu avant utilisation.",
            ]
          : [],
        provenance: "client",
      });
    }
  });
  const contract = readyContract(projectId);
  remember(projectId, {
    kind: "artifact",
    key: "project.ready_for_theme",
    value: JSON.stringify(
      contract ?? { ready: false, revision: result.revision },
    ),
    status: contract ? "confirmed" : "inferred",
    source: "local",
  });
  return result;
}
export function editBrief(projectId: string, revision: number, input: Input) {
  return commitState(projectId, revision, (s) =>
    draft(s, "brief", analyzeLocally(input)),
  );
}
export function references(
  projectId: string,
  revision: number,
  urls: string[],
) {
  return commitState(projectId, revision, (s) => {
    const b = stageOf(s, "brief");
    b.data.input.referenceUrls = urls;
    invalidateAfter(s, "brief");
    b.inputHash = inputHash(s, "brief");
  });
}
export function confirmIdentity(
  projectId: string,
  revision: number,
  edit: {
    name: string;
    tagline: string;
    palette?: any;
    fonts?: { heading: string; body: string };
  },
) {
  return commitState(projectId, revision, (s) => {
    requireUpstream(s, "brand");
    const st = stageOf(s, "brand");
    if (st.inputHash !== inputHash(s, "brand"))
      throw new HttpError(
        409,
        "Repréparez l’identité après le changement de stratégie.",
      );
    const b = st.data;
    if (!edit.name.trim())
      throw new HttpError(400, "Le nom de marque est indispensable.");
    if (edit.palette) {
      const issues = paletteIssues(edit.palette).filter((x) => x.blocking);
      if (issues.length)
        throw new HttpError(400, issues.map((x) => x.message).join(" "));
    }
    const changed = b.proposal.name !== edit.name.trim();
    b.proposal = {
      ...b.proposal,
      name: edit.name.trim(),
      nameStatus: "validated",
      tagline: edit.tagline,
      ...(edit.palette ? { palette: edit.palette } : {}),
      ...(edit.fonts ? { fonts: edit.fonts } : {}),
      validated: ["name", "tagline", "palette", "fonts"],
    };
    if (changed) {
      b.logoCandidates = [];
      delete b.selectedLogo;
      b.proposal.logo = {
        concept: "Logo à créer pour le nom validé",
        status: "proposed",
      };
    }
    b.identityConfirmed = true;
    invalidateAfter(s, "brand");
    st.status = "draft";
    saveBrand(projectId, b.proposal);
  });
}
export function assignMedia(
  projectId: string,
  revision: number,
  key: string,
  assetId: string,
  consent: VisualSlot["peopleConsent"],
) {
  const a = usableAsset(projectId, assetId);
  const meta = json<any>(a.meta, {});
  if (a.origin === "stock" || meta.stock || meta.imageV2?.origin === "stock")
    throw new HttpError(
      409,
      "Les photos de banque ne servent pas de création finale dans ce parcours.",
    );
  if (
    meta.preparation?.brandHash &&
    meta.preparation.brandHash !== stableHash(loadProject(projectId).brand)
  )
    throw new HttpError(
      409,
      "Ce visuel correspond à une ancienne identité : préparez ou choisissez une version cohérente.",
    );
  if (!consent)
    throw new HttpError(
      400,
      "Confirmez l’absence de personnes ou autorisez cette utilisation précise.",
    );
  if (
    (meta.hasPerson ||
      meta.review?.personVisible ||
      meta.preparation?.peopleAllowed) &&
    consent !== "this_slot"
  )
    throw new HttpError(
      409,
      "Cette photo contient une personne : une autorisation pour cet emplacement est nécessaire.",
    );
  return commitState(projectId, revision, (s) => {
    requireUpstream(s, "media");
    assertFresh(projectId, s, "media");
    const st = stageOf(s, "media");
    const slot = st.data.slots.find((x) => x.key === key);
    if (!slot) throw new HttpError(404, "Emplacement inconnu.");
    Object.assign(slot, {
      assetId,
      peopleConsent: consent,
      reviewed: true,
      inputHash: inputHash(s, "media"),
    });
    st.status = "draft";
  });
}
export function setPeopleConsent(
  projectId: string,
  revision: number,
  key: string,
  consent: VisualSlot["peopleConsent"],
) {
  return commitState(projectId, revision, (s) => {
    requireUpstream(s, "media");
    assertFresh(projectId, s, "media");
    const st = stageOf(s, "media"),
      slot = st.data.slots.find((x) => x.key === key);
    if (!slot || !consent)
      throw new HttpError(400, "Emplacement et autorisation précise requis.");
    slot.peopleConsent = consent;
    slot.reviewed = false;
    st.status = "draft";
  });
}
/** Restauration volontaire : données conservées, validation demandée, aucun appel fournisseur. */
export function restoreForReview(
  projectId: string,
  revision: number,
  version: number,
) {
  const old = historyOf(projectId).find((x) => x.revision === version);
  if (!old) throw new HttpError(404, "Version non trouvée.");
  return commitState(projectId, revision, (n) => {
    if (n.pending)
      throw new HttpError(
        409,
        "Attendez la fin de la préparation avant une restauration.",
      );
    n.stages = structuredClone(old.stages);
    for (const step of STEPS)
      if (n.stages[step]) n.stages[step]!.status = "draft";
    delete n.error;
  });
}
export type RunAction = "generate" | "analyze" | "logo" | "image";
export function requestHash(
  s: State,
  step: Step,
  action: RunAction,
  slot?: string,
) {
  return stableHash({
    input: inputHash(s, step),
    action,
    ...(action === "logo"
      ? {
          brand: s.stages.brand
            ? identityHash(s.stages.brand.data.proposal)
            : null,
        }
      : {}),
    ...(action === "image"
      ? {
          slot: (() => {
            const x = s.stages.media?.data.slots.find((x) => x.key === slot);
            return x
              ? {
                  key: x.key,
                  purpose: x.purpose,
                  peopleConsent: x.peopleConsent === "this_slot",
                }
              : null;
          })(),
        }
      : {}),
    ...(step === "content" ? { page: slot ?? null } : {}),
  });
}
export function queuePreparation(
  projectId: string,
  revision: number,
  step: Step,
  action: RunAction,
  opts: { capMicro: number; paid: boolean; slot?: string; correction?: string },
) {
  return tx(() => {
    requirePlan(null, projectId);
    const s = stateOf(projectId);
    if (!s) throw new HttpError(409, "Démarrez le parcours.");
    if (s.revision !== revision)
      throw new HttpError(409, "Rechargez : le projet a changé.");
    requireUpstream(s, step);
    if (
      one(
        "SELECT 1 FROM jobs WHERE project_id=? AND type='project.prepare' AND status IN ('queued','running','paused')",
        projectId,
      )
    )
      throw new HttpError(409, "Une préparation est déjà en cours.");
    if (action === "logo" && !s.stages.brand?.data.identityConfirmed)
      throw new HttpError(
        409,
        "Validez le nom et l’identité avant la création du logo.",
      );
    if (
      action === "image" &&
      !s.stages.media?.data.slots.some((x) => x.key === opts.slot)
    )
      throw new HttpError(404, "Emplacement inconnu.");
    assertFresh(projectId, s, step);
    const hash = requestHash(s, step, action, opts.slot);
    const prev = s.stages[step];
    if (
      action === "generate" &&
      prev &&
      prev.inputHash === inputHash(s, step) &&
      !opts.correction
    )
      return { state: s, job: null, reused: true };
    const attempts =
      one<{ n: number }>(
        "SELECT COUNT(*) n FROM jobs WHERE project_id=? AND type='project.prepare' AND json_extract(payload,'$.inputHash')=?",
        projectId,
        hash,
      )?.n ?? 0;
    if (attempts >= 2)
      throw new HttpError(
        409,
        "Deux essais ont déjà été demandés pour ces mêmes données. Corrigez le brief ou le choix en amont avant un nouvel essai.",
      );
    if (attempts && (!opts.correction || opts.correction.trim().length < 8))
      throw new HttpError(
        409,
        "Décrivez le défaut à corriger avant un nouvel essai.",
      );
    const p = loadProject(projectId);
    if (opts.paid) {
      assertAiAllowed(p.userId, p.id);
      assertCanSpend(p.userId, opts.capMicro, p.id);
    }
    const job = enqueue({
      userId: p.userId,
      projectId,
      type: "project.prepare",
      label: `Préparation : ${step}`,
      payload: {
        projectId,
        step,
        action,
        ...opts,
        inputHash: hash,
        revision: s.revision + 1,
      },
      idempotencyKey: `prepare:${projectId}:${hash}:${attempts}`,
      maxAttempts: 1,
    });
    const next = commitState(projectId, revision, (n) => {
      n.pending = { step, jobId: job.id, inputHash: hash };
      delete n.error;
    });
    return { state: next, job, reused: false };
  });
}
export async function runPreparation(
  ctx: JobContext,
  deps: Dependencies = realDependencies,
) {
  const {
    projectId,
    step,
    action,
    inputHash: hash,
    revision,
    paid,
    capMicro,
    slot: key,
  } = ctx.payload as {
    projectId: string;
    step: Step;
    action: RunAction;
    inputHash: string;
    revision: number;
    paid: boolean;
    capMicro: number;
    slot?: string;
  };
  try {
    const s = stateOf(projectId);
    if (
      !s ||
      s.revision !== revision ||
      requestHash(s, step, action, key) !== hash
    )
      throw new UserFacingError(
        "Les données ont changé : aucun nouvel appel fournisseur n’a été lancé.",
      );
    const p = loadProject(projectId);
    requirePlan(null, projectId);
    requireUpstream(s, step);
    assertFresh(projectId, s, step);
    ctx.progress(0.05, "Préparation à partir des choix validés");
    const execute = () =>
      withTrace({ jobId: ctx.job.id, projectId, costCapMicro: capMicro }, () =>
        ctx.step(`prepare:${action}:${hash}`, async () => {
          if (action === "analyze")
            return deps.inspect(p, stageOf(s, "brief").data, ctx, paid);
          if (step === "research")
            return deps.research(p, stageOf(s, "brief").data, ctx, paid);
          if (action === "logo") return deps.logos(p, ctx, capMicro);
          if (action === "image") {
            const slot = stageOf(s, "media").data.slots.find(
              (x) => x.key === key,
            )!;
            return deps.image(
              p,
              ctx,
              {
                ...slot,
                purpose:
                  slot.purpose +
                  (ctx.payload.correction
                    ? " Correction ciblée : " + ctx.payload.correction
                    : ""),
              },
              stageOf(s, "brief").data.input.photoIds,
              capMicro,
            );
          }
          if (step === "brand") return deps.identity(p, ctx, paid);
          if (step === "content")
            return deps.contents(p, ctx, paid, {
              previous: s.stages.content?.data,
              pageKey: key,
              correction: ctx.payload.correction,
            });
          throw new UserFacingError(
            "Cette étape ne demande pas de génération.",
          );
        }),
      );
    const output = await (paid
      ? execute()
      : withAiDisabled("préparation locale sans devis payant", execute));
    if (action === "logo")
      for (const aid of output as string[]) {
        const a = usableAsset(projectId, aid, "logo");
        run(
          "UPDATE assets SET meta=json_set(meta,'$.preparation',json(?)) WHERE id=? AND project_id=?",
          JSON.stringify({
            identityHash: identityHash(stageOf(s, "brand").data.proposal),
            provenance: deps.simulation ? "simulation" : "provider",
          }),
          a.id,
          projectId,
        );
      }
    if (action === "image") {
      const a = usableAsset(projectId, output as string);
      run(
        "UPDATE assets SET meta=json_set(meta,'$.preparation',json(?)) WHERE id=? AND project_id=?",
        JSON.stringify({
          brandHash: stableHash(p.brand),
          inputHash: hash,
          slot: key,
          peopleAllowed:
            stageOf(s, "media").data.slots.find((x) => x.key === key)
              ?.peopleConsent === "this_slot",
          provenance: deps.simulation ? "simulation" : "provider",
        }),
        a.id,
        projectId,
      );
    }
    const next = commitState(projectId, revision, (n) => {
      if (action === "logo") {
        invalidateAfter(n, "brand");
        stageOf(n, "brand").status = "draft";
        stageOf(n, "brand").data.logoCandidates = output as string[];
        if (!(output as string[]).length)
          throw new UserFacingError(
            "Aucun logo final contrôlé. Les essais sont conservés, mais ne sont pas présentés comme validés.",
          );
      } else if (action === "image") {
        const slot = stageOf(n, "media").data.slots.find((x) => x.key === key)!;
        Object.assign(slot, {
          assetId: output as string,
          reviewed: false,
          inputHash: inputHash(n, "media"),
        });
      } else draft(n, step, output as any);
      if (deps.simulation) n.simulation = true;
      delete n.pending;
      delete n.error;
    });
    ctx.progress(1, "Proposition disponible pour votre vérification");
    return {
      revision: next.revision,
      step,
      action,
      ready: false,
      simulation: !!deps.simulation,
    };
  } catch (e) {
    if (e instanceof JobPaused) throw e;
    const current = stateOf(projectId);
    if (current)
      commitState(projectId, current.revision, (n) => {
        if (n.pending?.jobId === ctx.job.id) delete n.pending;
        n.error = {
          step,
          message: redact((e as Error).message).slice(0, 500),
          at: now(),
        };
      });
    throw e;
  }
}
