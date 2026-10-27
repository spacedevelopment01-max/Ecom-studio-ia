import {activeStrategy,currentStrategyInputDigest} from "../marketing-strategy";
import {researchDigest} from "../marketing-strategy/research";
import { placementHash, receiptFor } from "./media-context";
import { buildProjectHandoff } from "../project-handoff/contract";
import { categoryForProject } from "../project-handoff/category-store";
import { recommendationDataReady, recommendationCatalogue } from "./editorial";
import { finalMediaIssues, slotIssues } from "./media-policy";
import { currentSeries, directionOf } from "../logo-v2/direction-series";
import { analyzed } from "./evidence";
import { copyContract, incompleteDocument } from "./copy-contract";
import { validateResearch, isLegacyResearch } from "./research-ai";
/** Orchestration amont : points de reprise existants, validation client et contrat, jamais de thème. */
import { all, id, json, now, one, run, tx } from "../db";
import { HttpError } from "../auth";
import { enqueue, getJob, retryJob, JobPaused, UserFacingError, type JobContext } from "../jobs";
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
import { L } from "../i18n-server";
import { analyzeLocally, SERVICES_UNKNOWN } from "./brief";
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
import { contactModesOf, type Strategy } from "../project-types";
import { mergeServiceProfile } from "../engine/local";
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
    !["image", "video"].includes(a.kind) ||
    !isAutoUsable(a)
  )
    throw new HttpError(
      409,
      "Ce média est absent, refusé ou appartient à un autre projet.",
      "preparation_media_unusable",
    );
  const meta = json<any>(a.meta, {});
  if (role === "logo" && (a.kind !== "image" || !["logo", "logo-v2"].includes(a.role || "")))
    throw new HttpError(409, "Choisissez un logo du projet.");
  if (a.origin !== "upload" && meta.gate?.verdict !== "FINAL")
    throw new HttpError(
      409,
      "Ce média généré n’a pas de contrôle final validé.",
    );
  return a;
}
/** Les identifiants techniques et alias ajoutés par le moteur de thème ne sont pas une modification de l’offre. */
const semanticOffer=(value:unknown):unknown=>{
  if(!value||typeof value!=="object")return value;
  const {contentAliases,key,...record}=value as Record<string,unknown>;
  return {...record,...Array.isArray(record.services)?{services:record.services.map(s=>{const {key,contentAliases,...service}=s;return service;})}:{}};
};
/** Refuse une génération avec des données modifiées dans un autre onglet sans nouvelle validation. */
export function assertFresh(projectId: string, s: State, step: Step) {
  const p = loadProject(projectId);
  const i = STEPS.indexOf(step);
  if (i > 0) {
    const b = stageOf(s, "brief").data;
    if (
      stableHash(semanticOffer(p.product)) !== stableHash(semanticOffer(b.profile)) ||
      stableHash(semanticOffer(p.services)) !== stableHash(semanticOffer(b.services)) ||
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
  if (i > 3)
    for (const d of stageOf(s, "content").data.documents) {
      const latest = latestContent(projectId, d.docKey);
      if (!latest || stableHash(latest.doc) !== stableHash(d.doc))
        throw new HttpError(
          409,
          "Un texte a été modifié : reprenez et validez les textes avant de créer de nouveaux visuels.",
        );
    }
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
  if (s.pending) {
    const job = one<{status:string}>("SELECT status FROM jobs WHERE id=? AND project_id=?",s.pending.jobId,projectId);
    out.push(job?.status === "queued" || job?.status === "running"
      ? L("Une préparation est encore en cours.", "Preparation is still in progress.")
      : job?.status === "paused"
        ? L("La préparation est en pause ; les résultats acquis sont conservés.", "Preparation is paused; acquired results are kept.")
        : L("La préparation s'est arrêtée et doit être reprise ; les résultats acquis sont conservés.", "Preparation stopped and needs to be resumed; acquired results are kept."));
  }
  if (out.length) return out;
  const p = loadProject(projectId);
  const b = stageOf(s, "brief").data;
  const brand = stageOf(s, "brand").data;
  const media = stageOf(s, "media").data;
  if (!s.simulation) out.push(...finalMediaIssues(p, media.slots, stageOf(s, "content").data));
  const contents = stageOf(s, "content").data;
  if (contents.pending) out.push(contents.pending);
  if (!s.simulation && copyContract(contents).readiness.status !== "mapped") out.push("Copie de liaison à compléter avant thème.");
  if (!s.simulation && (!contents.execution || !contents.editorial?.length || !activeRecommendationReady(projectId, s, contents.recommendation) || contents.documents.some(d => d.doc.meta2.by !== "ai" || d.verdict !== "FINAL") || contents.pages.some(pg => !contents.documents.some(d => d.doc.page.key === pg.key)))) out.push("Rédaction API, plan éditorial ou catégorie du site à compléter. Le raccordement des quatre thèmes reste une étape distincte.");
  if (!s.simulation && !stageOf(s, "research").data.execution) out.push("Recherche stratégique API à reprendre avant thème.");
  if (!s.simulation && !loadProject(projectId).brand?.artIdentity) out.push("Direction complète et charte à valider avant thème.");
  if (!analyzed(b)) out.push("Compréhension IA du brief en attente ; le brouillon local ne suffit pas.");
  if (b.missing.length) out.push(...b.missing);
  if(p.business==='services'&&!p.services.email&&!p.services.phone&&!p.services.bookingUrl)out.push("Indiquez un moyen de contact avant la livraison du site ; ce champ n’est pas nécessaire à la recherche marketing.");
  if (
    stableHash(p.product) !== stableHash(b.profile) ||
    stableHash(p.services) !== stableHash(b.services) ||
    p.business !== b.input.business
  )
    out.push(
      "Les informations ont changé hors du parcours : revalidez le brief.",
    );
  for (const d of stageOf(s, "content").data.documents) {
    if (incompleteDocument(d.doc)) out.push(`Texte à compléter avant utilisation : ${d.doc.page.title}.`);
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
/** Préparer les données ne promet ni un thème installé ni un rendu déjà construit. */
function activeRecommendationReady(projectId: string, s: State, r: import("./types").ThemeRecommendation | undefined) {
  if (!recommendationDataReady(r)) return false;
  const category = categoryForProject(loadProject(projectId), s.stages.brief?.data.input).recommendation;
  const eligible = new Set(category.eligibleThemes.map(x => x.referenceId));
  const references = [r?.recommendedReferenceId, ...(r?.alternativesReferenceIds ?? [])].filter((referenceId): referenceId is NonNullable<typeof referenceId> => !!referenceId);
  return category.status === "recommended" && !!category.category && references.length > 0 && references.every(referenceId => eligible.has(referenceId));
}
export function readyContract(projectId: string): ReadyContract | null {
  const s = stateOf(projectId);
  if (!s || blockers(projectId, s).length) return null;
  const p = loadProject(projectId);
  const c = stageOf(s, "content").data;
  const contract: ReadyContract = {
    dataReadiness: "review_required",
    themeConsumerStatus: "awaiting_theme_consumer",
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
    copy: copyContract(c).copy,
    copyReadiness: copyContract(c).readiness,
    research: stageOf(s, "research").data,
    editorial: c.editorial ?? [],
    recommendation: c.recommendation,
    mediaPolicy: { images: 10, videos: p.business === "products" ? 1 : 2, source: p.business === "products" ? "10 créations IA du produit + 1 vidéo d’ambiance approuvée" : "10 images + 2 vidéos d’ambiance approuvées", heroVideoRequired: true },
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
      ...(isLegacyResearch(stageOf(s, "research").data) ? ["Ancienne recherche à trois angles conservée ; mise à niveau vers cinq angles disponible sur demande, sans génération automatique."] : []),
      "Les champs de liaison listés dans copyReadiness.provisionalFields restent à relire ; seuls les documents approuvés font référence.",
      "Mots-clés : hypothèses sémantiques sans données fournisseur de volume, difficulté ou classement. Aucune position Google promise.",
      "Disponibilité juridique du nom et domaines non vérifiée.",
      "Prêt pour la composition, pas une autorisation de publication.",
    ],
  };
  contract.handoff = buildProjectHandoff(p, contract, all<Asset>("SELECT * FROM assets WHERE project_id=?", projectId), categoryForProject(p, contract.clientBrief).recommendation);
  if (contract.recommendation) contract.recommendation = { ...contract.recommendation, projectCategory: contract.handoff.category };
  contract.dataReadiness = contract.handoff.status;
  return contract;
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
    const unchangedApproval = st.status === "approved" && (step !== "research" || !o.choiceId || s.stages.research?.data.selectedId === o.choiceId) && (step !== "brand" || !o.logoId || s.stages.brand?.data.selectedLogo === o.logoId);
    if (st.inputHash !== inputHash(s, step))
      throw new HttpError(
        409,
        "Les choix en amont ont changé. Préparez une nouvelle proposition sans effacer la version précédente.",
      );
    if (step === "brief") {
      const b = stageOf(s, "brief").data;
      if (b.missing.length) throw new HttpError(409, b.missing.join(" "));
      if (!analyzed(b)) throw new HttpError(409, "L’analyse IA de la description et des photos est nécessaire avant validation. Vos données sont conservées.");
      saveProduct(projectId, b.profile);
      saveServices(projectId, b.services);
      const canonical=loadProject(projectId);b.profile=canonical.product;b.services=canonical.services;
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
      if (!s.simulation && !r.execution) throw new HttpError(409, "Analyse stratégique API en attente : les hypothèses locales restent conservées.");
      validateResearch(r, true);
      if (!r.angles.some((a) => a.id === o.choiceId))
        throw new HttpError(400, "Choisissez une proposition disponible.");
      if(r.formatVersion===3){
        if(loadProject(projectId).business==='services'&&o.choiceId!=='generalist')throw new HttpError(409,'Le site de services présente toute l’activité. Validez « Présenter l’ensemble de votre offre » ; les autres angles servent aux communications.');
        const chosen=activeStrategy(projectId);
        if(loadProject(projectId).business!=='services'&&(!chosen||chosen.angleId!==o.choiceId||chosen.inputDigest!==currentStrategyInputDigest(projectId)||chosen.angle.researchDigest!==researchDigest(r)))throw new HttpError(409,'Préparez et confirmez cet angle dans le comparateur avant de valider la recherche ; le quota et ses conséquences doivent être acceptés.');
      }
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
      const selection = directionOf(projectId, asset.id);
      if (!s.simulation && asset.origin !== "upload" && (!selection || selection.series.status !== "complete" || loadProject(projectId).brand?.logo.proposalId !== asset.id)) throw new HttpError(409, "Choisissez une direction complète et attendez ses déclinaisons avant de valider.");
      const logoMeta = json<any>(asset.meta, {});
      if (
        !selection && logoMeta.preparation?.identityHash &&
        logoMeta.preparation.identityHash !== identityHash(b.proposal)
      )
        throw new HttpError(
          409,
          "Ce logo appartient à une autre proposition d’identité.",
        );
      b.selectedLogo = asset.id;
      b.proposal = {
        ...(selection ? loadProject(projectId).brand! : b.proposal),
        validated: ["name", "tagline", "palette", "fonts", "logo"],
        logo: {
          ...b.proposal.logo,
          assetId: selection ? loadProject(projectId).brand!.logo.assetId : asset.id,
          status: asset.origin === "upload" ? "provided" : "validated",
          provisional: false,
        },
      };
      saveBrand(projectId, b.proposal);
    }
    if (step === "content") {
      const c = stageOf(s, "content").data;
      const p = loadProject(projectId);
      if (c.pending) throw new HttpError(409, c.pending);
      if (!s.simulation && copyContract(c).readiness.status !== "mapped") throw new HttpError(409, "Copie de liaison encore provisoire : aucune livraison finale avant correction.");
      if (c.provenance !== "simulation" && (c.provenance !== "provider" || !c.execution || !c.editorial?.length || !activeRecommendationReady(projectId, s, c.recommendation))) throw new HttpError(409, "Rédaction API, plan éditorial complet et catégorie du site confirmée sont requis. Les références actives peuvent rester en attente de raccordement ; aucun thème n’est présenté comme construit.");
      for (const page of c.pages) if (!c.documents.some(d => d.doc.page.key === page.key)) throw new HttpError(409, `Document absent : ${page.title}.`);
      for (const item of c.documents) {
        if (c.provenance !== "simulation" && (item.doc.meta2.by !== "ai" || item.verdict !== "FINAL")) throw new HttpError(409, "Texte API final contrôlé requis pour chaque page.");
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
        if (checks.placeholders > 0) throw new HttpError(409, "Ce texte contient des informations à compléter. Corrigez-les avant de le valider.");
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
      c.copy = copyContract(c).copy;
      remember(projectId, {
        kind: "artifact",
        key: "shop_copy",
        value: JSON.stringify(c.copy),
        source: "user",
      });
    }
    if (step === "media") {
      const m = stageOf(s, "media").data;
      if (!s.simulation) { const issues = finalMediaIssues(loadProject(projectId), m.slots, stageOf(s, "content").data); if (issues.length) throw new HttpError(409, issues.join(" ")); }
      for (const slot of m.slots) {
        if (slot.required && (!slot.reviewed || !slot.assetId))
          throw new HttpError(409, `Vérifiez le visuel ${slot.key}.`);
        if (slot.assetId) usableAsset(projectId, slot.assetId);
      }
    }
    if (!unchangedApproval) invalidateAfter(s, step);
    st.status = "approved";
    st.approvedAt ??= now();
    // Changer un choix important rend la suite obsolète, mais conserve toutes ses données et versions.
    if (step === "content" && !unchangedApproval) {
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
  return commitState(projectId, revision, (s) => {
    const old = stageOf(s, "brief").data;
    // Prestations et contact (#204) : après la compréhension IA, les corrections du client (prestations proposées,
    // bouton principal, coordonnées) complètent le brief analysé sans l'effacer ni faire repayer sa lecture.
    const analyzedOnce = old.provenance === "provider" || old.provenance === "simulation";
    const offer = (x: Input) => {
      const { target, constraints, referenceUrls, ...data } = x;
      if (!analyzedOnce) return data;
      const { services, ...rest } = data;
      return rest;
    };
    if (stableHash(offer(old.input)) === stableHash(offer(input))) {
      const services = analyzedOnce
        ? { ...mergeServiceProfile(input.services, old.services), contactMode: input.services.contactMode, contactModes: contactModesOf(input.services) }
        : old.services;
      const next = {
        ...structuredClone(old),

        input,
        services,
        missing: old.missing.filter((x) => !x.includes("À qui cette offre") && !(services.services.length && x === SERVICES_UNKNOWN)),
      };
      if (!input.target.trim())
        next.missing.push("À qui cette offre s’adresse-t-elle ?");
      draft(s, "brief", next);
    } else draft(s, "brief", analyzeLocally(input));
  });
}
/** Une réponse client complète le brief analysé sans repayer sa lecture ni effacer les observations. */
export function answerBriefQuestion(projectId: string, revision: number, questionId: string, answer: string) {
  return commitState(projectId, revision, s => {
    const st = stageOf(s, "brief"), b = st.data;
    const q = b.profile.questions.find(x => x.id === questionId);
    if (!q || !answer.trim()) throw new HttpError(400, "Question existante et réponse explicite requises.");
    q.answer = answer.trim();
    const existing = b.profile.facts.find(f => f.key === q.factKey);
    if (existing) Object.assign(existing, { value: answer.trim(), status: "confirmed", source: "user" });
    else b.profile.facts.push({ key: q.factKey, label: q.question, value: answer.trim(), status: "confirmed", source: "user" });
    b.missing = b.missing.filter(m => m !== q.question);
    st.status = "draft"; invalidateAfter(s, "brief");
  });
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
/** Les projets historiques restent lisibles ; aucun ancien thème ne redevient une nouvelle sélection. */
export function chooseRecommendedTheme(projectId: string, revision: number, themeId: string) {
  return commitState(projectId, revision, s => {
    stageOf(s, "content");
    const item = recommendationCatalogue(loadProject(projectId)).find(x => x.id === themeId);
    if (!item) throw new HttpError(409, "Cet ancien thème ne fait plus partie des nouvelles sélections. Votre thème existant, vos contenus et vos versions restent conservés.");
    throw new HttpError(409, item.status === "incompatible" ? "Cette référence ne correspond pas à la catégorie confirmée de votre site. Aucun thème installé n’est modifié." : "Cette référence active attend son raccordement au moteur. Vos textes et médias peuvent être préparés et validés, mais aucune installation n’est annoncée.");
  });
}
export function moveMedia(projectId: string, revision: number, key: string, placement: { pageKey: string; sectionKey: string }) {
  return commitState(projectId, revision, s => {
    requireUpstream(s, "media");
    const c = stageOf(s, "content").data, m = stageOf(s, "media");
    const target = m.data.slots.find(x => x.key === key);
    if (!target || !c.pages.some(p => p.key === placement.pageKey && p.sections.some(x => x.key === placement.sectionKey))) throw new HttpError(400, "Affectation inconnue.");
    if (key === "final:video:1" && (placement.pageKey !== "home" || placement.sectionKey !== "hero")) throw new HttpError(409, "Conservez une vidéo dans le hero ; remplacez son fichier si nécessaire.");
    Object.assign(target, placement, { reviewed: false, alignment: undefined });
    for (const block of c.editorial ?? []) block.mediaSlotKeys = block.mediaSlotKeys.filter(k => k !== key);
    const adjacent = c.editorial?.find(b => b.pageKey === placement.pageKey && b.sectionKey === placement.sectionKey);
    if (!adjacent) throw new HttpError(409, "Cette section ne possède pas encore de texte éditorial associé.");
    adjacent.mediaSlotKeys.push(key);
    const original = c.slots.find(x => x.key === key);
    if (original) Object.assign(original, placement);
    m.inputHash = inputHash(s, "media");
    m.status = "draft";
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
    assertFresh(projectId, s, "brand");
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
    if (!changed && b.proposal.artIdentity && (edit.tagline !== b.proposal.tagline || (edit.palette && stableHash(edit.palette) !== stableHash(b.proposal.palette)) || (edit.fonts && stableHash(edit.fonts) !== stableHash(b.proposal.fonts)))) throw new HttpError(409, "Une direction complète est déjà choisie. Modifiez-la depuis l’onglet Marque, puis revérifiez l’identité et les contenus ; ce formulaire sert à confirmer le nom avant la série.");
    b.proposal = {
      ...b.proposal,
      name: edit.name.trim(),
      nameStatus: "validated",
      tagline: edit.tagline,
      ...(edit.palette ? { palette: edit.palette } : {}),
      ...(edit.fonts ? { fonts: edit.fonts } : {}),
      validated: ["name", ...(edit.palette && stableHash(edit.palette) !== stableHash(b.proposal.palette) ? ["palette"] : []), ...(edit.fonts && stableHash(edit.fonts) !== stableHash(b.proposal.fonts) ? ["fonts"] : [])],
    };
    if (changed) {
      delete b.proposal.artIdentity;
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
    if (!loadProject(projectId).brand?.artIdentity) saveBrand(projectId, b.proposal);
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
    const receipt = s.simulation ? meta.preparation?.reviewedSlot : receiptFor(meta, placementHash(loadProject(projectId), stageOf(s, "content").data, { ...slot, peopleConsent: consent }));
    if (slot.source === "ai" && (meta.stock || meta.imageV2?.origin === "stock" || a.origin === "import")) throw new HttpError(409, "Création IA requise, aucune photo de banque dans ce lot produit.");
    if (!s.simulation) {
      if (!receipt || receipt.key !== slot.key || receipt.pageKey !== slot.pageKey || receipt.sectionKey !== slot.sectionKey || receipt.alignment?.contextHash !== placementHash(loadProject(projectId), stageOf(s, "content").data, { ...slot, peopleConsent: consent })) throw new HttpError(409, "Vérification texte-image nécessaire pour cet emplacement avant sélection.");
      const issues = slotIssues(loadProject(projectId), { ...slot, ...receipt, assetId }, a);
      if (issues.length) throw new HttpError(409, issues.join(" "));
    }
    Object.assign(slot, { ...receipt,
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
export type RunAction = "generate" | "analyze" | "logo" | "image" | "collect";
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
    ...(step === "research" ? { researchFormat: 3 } : {}),
  });
}
export function mediaReusable(projectId: string, s = stateOf(projectId)): boolean {
  const p = loadProject(projectId), c = s?.stages.content?.data, m = s?.stages.media?.data;
  return !!c && !!m?.slots.length && m.slots.filter(slot=>!(slot.kind==="video"&&slot.source==="ai"&&!slot.assetId)).every(slot => !!slot.assetId && slot.alignment?.status === "accepted" && (s?.simulation || (!slotIssues(p, slot, getAsset(slot.assetId)).length && slot.alignment.contextHash === placementHash(p, c, slot))));
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
      !opts.correction &&
      !(step === "research" && s.stages.research && (isLegacyResearch(s.stages.research.data)||(s.stages.research.data.formatVersion!==3&&!s.simulation)))
    )
      return { state: s, job: null, reused: true };
    if (action === "collect" && mediaReusable(projectId, s)) return { state: s, job: null, reused: true };
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
      label: action === "analyze" ? (p.business === "services" ? "Compréhension de votre activité" : "Analyse de votre produit") : `Préparation : ${step}`,
      payload: {
        projectId,
        step,
        action,
        ...opts,
        ...(action === "logo" ? { expectedSeriesId: currentSeries(projectId)?.id ?? null } : {}),
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
/** Même demande, même tâche et mêmes checkpoints ; jamais un nouvel essai payant implicite. */
export function recoverablePreparation(projectId: string, s = stateOf(projectId)) {
  if (!s) return null;
  const jid = s.pending?.jobId ?? s.error?.jobId;
  const j = jid ? getJob(jid) : null;
  if (!j || j.project_id !== projectId || j.user_id !== one<{user_id:string}>("SELECT user_id FROM projects WHERE id=?",projectId)?.user_id || j.type !== "project.prepare" || j.status !== "failed") return null;
  const payload = json<{ projectId: string; step: Step; action: RunAction; slot?: string; revision: number; inputHash: string }>(j.payload, {} as any);
  if (payload.projectId !== projectId || !STEPS.includes(payload.step) || !payload.inputHash) return null;
  const revisionMatches = s.error?.jobId === j.id && s.error.revision === s.revision || s.pending?.jobId === j.id && (s.revision === payload.revision || payload.action === "collect" && s.revision >= payload.revision);
  return revisionMatches && requestHash(s, payload.step, payload.action, payload.slot) === payload.inputHash ? j : null;
}
export function recoverPreparation(projectId: string, revision: number) {
  return tx(() => {
    const s = stateOf(projectId);
    const j = s?.revision === revision ? recoverablePreparation(projectId, s) : null;
    if (!j) throw new HttpError(409, L("La demande a changé ou ne peut pas être récupérée. Vos modifications sont conservées ; préparez un nouvel essai avec son devis.", "The request changed or cannot be recovered. Your edits are kept; prepare a new attempt with its quote."));
    retryJob(j.id, { recoveryOnly: true });
    return getJob(j.id)!;
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
  let savedRevision: number | undefined;
  try {
    let s = stateOf(projectId);
    const resumingFailure = !!s && !s.pending && s.error?.jobId === ctx.job.id && s.error.revision === s.revision;
    if (
      !s ||
      (s.revision !== revision && !resumingFailure && !(action === "collect" && s.pending?.jobId === ctx.job.id && s.revision >= revision)) ||
      requestHash(s, step, action, key) !== hash
    )
      throw new UserFacingError(
        "Les données ont changé : aucun nouvel appel fournisseur n’a été lancé.",
      );
    // Reprise explicite du même travail : les checkpoints et le plafond initial restent attachés
    // au job. Une retouche ou une nouvelle demande invalide ce droit de reprise par sa révision.
    if (resumingFailure) s = commitState(projectId, s.revision, n => {
      n.pending = { step, jobId: ctx.job.id, inputHash: hash };
      delete n.error;
    });
    const p = loadProject(projectId);
    requirePlan(null, projectId);
    requireUpstream(s, step);
    assertFresh(projectId, s, step);
    let expectedRevision = s.revision;
    ctx.progress(0.05, "Préparation à partir des choix validés");
    const execute = () =>
      withTrace({ jobId: ctx.job.id, projectId, costCapMicro: capMicro, recoveryOnly: ctx.payload.recoveryOnly === true }, () =>
        ctx.step(`prepare:${action}:${hash}`, async () => {
          if (action === "collect") {
            const keys = stageOf(s, "media").data.slots.filter(slot=>!(slot.kind==="video"&&slot.source==="ai"&&!slot.assetId)).map(slot => slot.key);
            for (const [i, slotKey] of keys.entries()) {
              const current = stateOf(projectId)!;
              if (current.revision !== expectedRevision || current.pending?.jobId !== ctx.job.id) throw new UserFacingError("Le projet a changé : collecte arrêtée, médias déjà enregistrés conservés.");
              const slot = stageOf(current, "media").data.slots.find(x => x.key === slotKey)!;
              // Réutilisation d'un résultat compatible, même avant la dernière validation manuelle : aucun nouvel achat.
              if (slot.assetId && slot.alignment?.status === "accepted" && (!slotIssues(p, slot, getAsset(slot.assetId)).length || deps.simulation)) continue;
              ctx.progress(.1 + .8 * i / keys.length, `Média ${i + 1}/${keys.length} : ${slotKey}`);
              const aid = await ctx.step(`collect:${slotKey}`, () => deps.image(p, ctx, { ...slot, correction: ctx.payload.correction || slot.correction }, stageOf(current, "brief").data.input.photoIds, capMicro));
              const a = usableAsset(projectId, aid), receipt = json<any>(a.meta, {}).preparation?.reviewedSlot;
              const next = commitState(projectId, expectedRevision, n => {
                const target = stageOf(n, "media").data.slots.find(x => x.key === slotKey)!;
                Object.assign(target, receipt ?? {}, { assetId: aid, reviewed: false, inputHash: inputHash(n, "media") });
                if (deps.simulation) n.simulation = true;
              });
              expectedRevision = next.revision;
            }
            return stageOf(stateOf(projectId)!, "media").data;
          }
          if (action === "analyze")
            return deps.inspect(p, stageOf(s, "brief").data, ctx, paid);
          if (step === "research") {
            const r = await deps.research(p, stageOf(s, "brief").data, ctx, paid);
            return validateResearch(r);
          }
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
                correction: ctx.payload.correction || slot.correction,
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
          "UPDATE assets SET meta=json_set(meta,'$.preparation',json_patch(COALESCE(json_extract(meta,'$.preparation'),'{}'),json(?))) WHERE id=? AND project_id=?",
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
        "UPDATE assets SET meta=json_set(meta,'$.preparation',json_patch(COALESCE(json_extract(meta,'$.preparation'),'{}'),json(?))) WHERE id=? AND project_id=?",
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
    const next = commitState(projectId, expectedRevision, (n) => {
      if (action === "collect") { stageOf(n, "media").status = "draft"; }
      else if (action === "logo") {
        // Renouveler les propositions ne remplace ni l'identité active ni ses validations.
        if (!loadProject(projectId).brand?.artIdentity) {
          invalidateAfter(n, "brand");
          stageOf(n, "brand").status = "draft";
        }
        stageOf(n, "brand").data.logoCandidates = output as string[];
        const series = !deps.simulation && currentSeries(projectId);
        if (series) { stageOf(n, "brand").data.seriesId = series.id; stageOf(n, "brand").data.directions = series.directions; }
        if (!(output as string[]).length)
          throw new UserFacingError(
            "Aucun logo final contrôlé. Les essais sont conservés, mais ne sont pas présentés comme validés.",
          );
      } else if (action === "image") {
        const slot = stageOf(n, "media").data.slots.find((x) => x.key === key)!;
        const receipt = json<any>(getAsset(output as string)?.meta, {}).preparation?.reviewedSlot;
        Object.assign(slot, { ...receipt,
          assetId: output as string,
          reviewed: false,
          inputHash: inputHash(n, "media"),
        });
      } else draft(n, step, output as any);
      if (deps.simulation) n.simulation = true;
      delete n.pending;
      delete n.error;
    });
    savedRevision = next.revision;
    if (step === "content" && (output as any)?.pending) throw new UserFacingError((output as any).pending);
    if (action === "logo" && !deps.simulation && currentSeries(projectId)?.status !== "complete") throw new UserFacingError(`Série incomplète : ${currentSeries(projectId)?.directions.length ?? 0}/3 directions complètes conservées ; reprise ciblée nécessaire.`);
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
    if (current && (current.pending?.jobId === ctx.job.id || current.revision === savedRevision))
      commitState(projectId, current.revision, (n) => {
        if (n.pending?.jobId === ctx.job.id) delete n.pending;
        n.error = {
          step,
          jobId: ctx.job.id,
          revision: current.revision + 1,
          message: redact((e as Error).message).slice(0, 500),
          at: now(),
        };
      });
    throw e;
  }
}
