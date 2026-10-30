import { withSiteStrategy, withCommunicationStrategy, withStrategyScope, strategyStamp, strategyReuseInput } from "../strategy-consumption";
import { reserveBlogDraft,releaseUnsavedBlogDraft } from "../quotas";
import { assertJobEntitlements,assertAdvertising } from "../job-entitlements";
/**
 * SEO, Copywriting & Blog Engine V2 (phase 8A) — moteur central.
 *
 * PROJECT BRAIN → INTENTION → STRATÉGIE SEO → BRIEF → FAITS VÉRIFIÉS → RÉDACTION (locale d'abord, puis IA contrôlée
 * si le compte y a droit) → CONTRÔLES LOCAUX → RELECTURE ÉDITORIALE → BARRIÈRE → reprise ciblée (blocs fautifs,
 * défaut identifié) → DOCUMENT ÉDITABLE versionné → ÉDITION PAR LE CLIENT → EXPORT / PUBLICATION.
 *
 * Coûts : estimation avant chaque appel, plafond réel par tâche ; une reprise n'a lieu QUE pour corriger un défaut
 * identifié ; même brief + mêmes faits = rien de refait ni de repayé (idempotence) ; un contenu modifié par le
 * client n'est jamais écrasé (nouvelle lignée). Forfait Découverte / IA coupée : rédaction et contrôles locaux,
 * 0 € d'IA.
 */
import crypto from "node:crypto";
import {tx} from "../db";
import type { JobContext } from "../jobs";
import { JobCancelled, JobPaused, UserFacingError } from "../jobs";
import { L } from "../i18n-server";
import { aiActiveFor } from "../ai/access";
import { CostCapReached, currentTrace, withCandidate, withTrace } from "../ai/trace";
import { gateSave } from "../quality/store";
import { POLICIES } from "../quality/policies";
import { EUR } from "../billing";
import { contentLang } from "../i18n-server";
import { loadProject, type Project } from "../projects";
import { verifiedFacts } from "./facts";
import {contentSubjectProject,documentSubject} from "./subject";
import {HttpError} from "../auth";
import {emptyProduct} from "../project-types";
import { researchKeywords } from "./keywords";
import { sitePages, resolvePage } from "./pages";
import { checkRequirements, requirementTargets } from "./requirements";
import { seoStrategy } from "./strategy";
import { buildBrief } from "./brief";
import { INTENT_GOAL } from "./intent";
import { fromAiDraft, localDraft, writePrompt, writeSystem } from "./write";
import { DELIVERABLE_OF, editorialScore, gateContent, localContentChecks, proseOf, reviewPrompt } from "./quality";
import { blockText } from "./doc";
import { ContentConflict, contentKey, contentRun, contentUserOwned, contentVersionDoc, latestContent, listContents, lockContentTarget, releaseContentTarget, renewContentTarget, rememberContentRun, runKey, saveContentVersion } from "./store";
import { applyContentOps } from "./ops";
import { planEdit } from "./local-edit";
import { localOnlyDeps, realSeoDeps, writeKind, type CallKind, type RewriteOut, type SeoV2Deps } from "./deps";
import { blogIdFor, blogAiAllowed, saveBlogDraftV2 } from "./blog";
import { LANGS, type ContentDoc, type ContentLang, type ContentRunResult, type ContentType, type EditorialReview, type Keyword, type PageRef, type SeoStrategy } from "./types";
import type { GateDecision } from "../quality/gate";
import { budgetPctText } from "../ai/budget-pct";

export const SEO_V2_VERSION = "lot1.1";
export const DEFAULT_SEO_CAP_EUR = 0.6;

export type ContentRequestV2 = {
  /** Server-selected contract: an explicitly requested AI result cannot become a local substitute. */
  requireAi?: boolean;
  /** Internal server-selected catalogue pin, never accepted by the public SYNA command. */
  nativeBinding?: import("../image-v2/request-binding").ImageBinding;
  /** Page prévue identifiée par l’orchestrateur amont ; aucune création de thème requise. */
  target?: {page:PageRef;serviceIndex?:number};
  type: ContentType;
  /** Page visée (clé d'une page existante ou prévue) ; à défaut, la première page qui correspond au type. */
  pageKey?: string | null;
  lang?: ContentLang;
  /** Demande en clair du client (intention). */
  request?: string | null;
  keyword?: Keyword | null;
  /** Plafond de dépense RÉEL de la tâche (euros). */
  maxCostEur?: number;
  /** Refaire même si le même brief a déjà été rédigé (sinon : idempotent). */
  force?: boolean;
  /** Brief et stratégie seuls : rien n'est rédigé ni payé. */
  planOnly?: boolean;
};

type Budget = { capMicro: number; spentMicro: number; stopped: boolean };

export const pickLang = (l?: string | null): ContentLang => ((LANGS as readonly string[]).includes(l ?? "") ? (l as ContentLang) : contentLang() === "en" ? "en" : "fr");

const KIND_PAGE: Partial<Record<ContentType, PageRef["kind"][]>> = {
  product_page: ["product"],
  category_page: ["collection"],
  service_page: ["service"],
  home_page: ["home"],
  brand_page: ["brand"],
  local_page: ["local"],
  blog_article: ["article"],
};

/** Page visée : la clé donnée, sinon la première du bon type ; un article sans page devient une page prévue. */
export function targetPage(pages: PageRef[], type: ContentType, pageKey: string | null | undefined, strategy: SeoStrategy, keyword?: Keyword | null): PageRef {
  const byKey = pageKey ? resolvePage(pages, pageKey) : null;
  if (byKey && (!KIND_PAGE[type] || KIND_PAGE[type]!.includes(byKey.kind))) return byKey;
  if (pageKey) throw new UserFacingError(L("La page visée est introuvable ou ne correspond pas à ce contenu. Sélectionnez sa cible à nouveau.", "The target page is missing or doesn't match this content. Select the target again."));
  const kinds = KIND_PAGE[type];
  const found = kinds ? pages.find((p) => kinds.includes(p.kind)) : undefined;
  if (found && type !== "blog_article") return found;
  const title = keyword?.term ?? strategy.calendar[0]?.title ?? strategy.themes[0] ?? type;
  const home = pages.find((p) => p.kind === "home");
  if (type === "faq" || type === "metadata" || type === "ad_copy") return home ?? { key: `${type}:principal`, title, url: null, kind: "page", status: "planned" };
  return { key: `article:${crypto.createHash("sha256").update(title).digest("hex").slice(0, 10)}`, title: title.charAt(0).toUpperCase() + title.slice(1), url: null, kind: "article", status: "planned" };
}

type RunResult = ContentRunResult & { strategy: SeoStrategy; stoppedByCostCap: boolean };
const pending = new Map<string, Promise<RunResult>>();
export async function runContentEngineV2(ctx: JobContext | null, projectId: string, req: ContentRequestV2, injected?: SeoV2Deps): Promise<RunResult> {
  return (req.type==="ad_copy"?withCommunicationStrategy:withSiteStrategy)(projectId, () => runContentEngineV2InScope(ctx, projectId, req, injected));
}

async function runContentEngineV2InScope(ctx: JobContext | null, projectId: string, req: ContentRequestV2, injected?: SeoV2Deps): Promise<RunResult> {
  if(!req.planOnly)assertJobEntitlements("content.v2",projectId,{request:req});
  if(req.type==="ad_copy")assertAdvertising(projectId);
  let p = contentSubjectProject(loadProject(projectId),req.nativeBinding);
  if(req.target?.serviceIndex!=null){const service=p.services.services[req.target.serviceIndex];if(p.business!=="services"||!service)throw new UserFacingError("Prestation cible absente.");p={...p,services:{...p.services,services:[service]}};}
  let deps = injected ?? realSeoDeps(ctx, p, aiActiveFor(p.userId, p.id));
  // Articles écrits par l'IA : inclus selon le forfait (comme le blog existant) ; sinon brouillon local gratuit.
  const blogBlocked = req.type === "blog_article" && deps.canWrite && !blogAiAllowed(p.userId, p.id);
  if (blogBlocked) deps = localOnlyDeps();
  if(req.requireAi&&!req.planOnly&&(!deps.canWrite||!deps.canReview))throw new UserFacingError(L("Rédaction et relecture IA indisponibles. Aucun texte local de remplacement ; vos acquis restent conservés.","AI writing and review are unavailable. No local replacement; acquired work is kept."),"CONTENT_AI_UNAVAILABLE");
  const capMicro = Math.round((req.maxCostEur ?? DEFAULT_SEO_CAP_EUR) * EUR);
  const cur = currentTrace();
  const flight = runKey({ marketingStrategy: strategyStamp(projectId), projectId, req, product: p.product, services: p.services, catalog: p.catalog, brand: p.brand, context: deps.context });
  const running = pending.get(flight);
  if (running && !req.planOnly) { const result = await running; ctx?.progress(1, L("Rédaction identique retrouvée", "Identical content reused")); return { ...result, costMicro: 0, skipped: true }; }
  const pageList = sitePages(p);
  const target = req.target?.page.key ?? (req.pageKey ? resolvePage(pageList, req.pageKey)?.key ?? req.pageKey : pageList.find((x) => KIND_PAGE[req.type]?.includes(x.kind))?.key ?? req.type);
  const lock = `${req.type}|${target}|${pickLang(req.lang)}`;
  const owner = crypto.randomUUID();
  if (!req.planOnly && !lockContentTarget(projectId, lock, owner, ctx?.job.id ?? null)) throw new UserFacingError(L("Une rédaction de cette cible est déjà en cours. Aucun nouvel appel n'a été lancé ; retrouvez le résultat dans les textes.", "Writing for this target is already in progress. No new call was started; check the content list for its result."));
  const heartbeat = req.planOnly ? null : setInterval(() => renewContentTarget(projectId, lock, owner), 30_000);
  heartbeat?.unref();
  const execution = withTrace({ ...(ctx?.job.id ? { jobId: ctx.job.id } : {}), projectId, ...(cur.intent ? {} : { intent: "WRITE_CONTENT" }), costCapMicro: cur.costCapMicro != null ? Math.min(cur.costCapMicro, capMicro) : capMicro }, async () => {
    const r = await engine(ctx, p, req, deps, { capMicro, spentMicro: 0, stopped: false });
    if (blogBlocked) r.notes.unshift("articles écrits par l'IA non inclus dans votre forfait : brouillon local à partir des faits (gratuit)");
    return r;
  });
  if (!req.planOnly) pending.set(flight, execution);
  try { return await execution; } finally { if (heartbeat) clearInterval(heartbeat); if (!req.planOnly) releaseContentTarget(projectId, lock, owner); if (pending.get(flight) === execution) pending.delete(flight); }
}

async function engine(ctx: JobContext | null, p: Project, req: ContentRequestV2, deps: SeoV2Deps, budget: Budget) {
  const lang = pickLang(req.lang);
  const runId = crypto.randomUUID();
  const notes: string[] = [];
  const stats = { writes: 0, reviews: 0, retries: 0, rewrites: 0 };
  // Sans job persistant, une réécriture explicitement demandée est une nouvelle opération.
  // La constante historique réutilisait la même clé payante pour deux demandes indépendantes.
  const jobKey = ctx?.job.id ?? runId;

  // 1-4. Pages, mots-clés (hypothèses), stratégie, brief : gratuits et déterministes.
  const pages = sitePages(p);
  const research = researchKeywords(p, lang, pages);
  const strategy = seoStrategy(p, lang, { pages, research });
  const page = req.target?.page ?? targetPage(pages, req.type, req.pageKey, strategy, req.keyword);
  const item = page.key.startsWith("product:catalog:") ? p.catalog.find((c) => `product:catalog:${c.key}` === page.key) ?? null : req.target&&req.type==="product_page"?p.catalog.find(c=>c.name.trim()===page.title.trim())??null:null;
  let facts = verifiedFacts(p, item, {confirmedCategoryOnly:!!req.nativeBinding});
  if (page.kind === "service") {
    const service = req.target?.serviceIndex!=null?p.services.services[0]:p.services.services.find((s) => `service:${s.key}` === page.key);
    if (!service) throw new UserFacingError(L("Prestation introuvable.", "Service not found."));
    facts = { ...facts, offerName: service.name, services: [{ name: service.name, description: service.description, price: service.price, duration: service.duration }] };
  }
  const brief = buildBrief(p, { type: req.type, page, lang, strategy, request: req.request, keyword: req.keyword ?? null, facts, context: deps.context });
  if (facts.unknowns.length) notes.push(...facts.unknowns.map((u) => `à compléter : ${u}`));
  const base = { runId, brief, codes: [] as string[], issues: [] as string[], stats, notes, strategy, stoppedByCostCap: false, skipped: false };
  const delivery = (verdict: string, issues: string[], stopped = false): NonNullable<ContentRunResult["delivery"]> => {
    const state = verdict === "REJECTED" || verdict === "RETRY" ? "blocked" : stopped ? "partial" : verdict === "FINAL" && !brief.requirements?.unchecked.length ? "ready" : "to_verify";
    const message = state === "blocked" ? L("Texte conservé en brouillon : des corrections sont nécessaires.", "Content saved as a draft: corrections are needed.") : state === "partial" ? L("Texte partiel conservé : limite de dépense atteinte.", "Partial content saved: spending limit reached.") : state === "ready" ? L("Texte rédigé et contrôlé.", "Content written and checked.") : L("Texte enregistré, à vérifier avant utilisation.", "Content saved, review before use.");
    return { state, message, reasons: [...issues, ...(brief.requirements?.unchecked ?? [])] };
  };
  if (req.planOnly) return { ...base, docKey: null, doc: null, verdict: "PROVISIONAL" as const, reason: "brief seul (rien n'est rédigé)", by: "local" as const, costMicro: 0 };

  // 5. Lignée : un contenu modifié par le client n'est jamais écrasé.
  let docKey = contentKey(p.id, req.type, page.key, lang);
  if (contentUserOwned(p.id, docKey)) {
    docKey = `cnt:${runId.replace(/-/g, "").slice(0, 20)}`;
    notes.push("contenu précédent modifié par le client : conservé, la nouvelle rédaction est un nouveau document");
  }

  // 6. Idempotence : même brief, mêmes faits, même moteur → le document déjà produit, sans rien refaire ni payer.
  const memoKey = runKey(strategyReuseInput({ v: SEO_V2_VERSION, brief, identity: p.brand?.artIdentity ?? null, brandTone: p.brand?.tone, docKey, type: req.type, lang, page: page.key, instructions:brief.instructions??null, kw: brief.primaryKeyword?.term ?? null, intent: brief.intent, facts, links: brief.links.map((l) => [l.key, l.status, l.url]), ai: deps.canWrite, review: deps.canReview }));
  const memo = req.force ? null : contentRun(p.id, memoKey);
  if (memo) {
    let saved = contentVersionDoc(p.id, memo.docKey, memo.version);
    const latest = latestContent(p.id, memo.docKey);
    if (saved && (!req.requireAi || saved.meta2.by === "ai")) {
      let key = memo.docKey;
      // Le mémo désigne une version précise, jamais la dernière rédaction d'un autre contexte.
      if (!latest || JSON.stringify(latest.doc) !== JSON.stringify(saved)) {
        key = `cnt:${runKey({ reuse: memo.docKey, version: memo.version, memoKey }).slice(0, 20)}`;
        const existing = latestContent(p.id, key);
        if (existing && JSON.stringify(existing.doc) !== JSON.stringify(saved)) key = `cnt:${runKey({ reuse: key, preserve: existing.version.id }).slice(0, 20)}`;
        if (!latestContent(p.id, key)) saveContentVersion(p.id, key, saved, { verdict: memo.verdict, note: `Réutilisation gratuite de ${memo.docKey}, version ${memo.version} ; autres versions conservées` });
      }
      // Identical semantic inputs can reuse paid copy after a stock-only version change.
      // Refresh metadata locally, keeping the historical version and client-owned lineages intact.
      if(req.nativeBinding&&JSON.stringify(saved.meta2.nativeBinding)!==JSON.stringify(req.nativeBinding)){
        saved={...saved,meta2:{...saved.meta2,nativeBinding:req.nativeBinding}};
        const v=tx(()=>{deps.beforeFinalSave?.();contentSubjectProject(loadProject(p.id),req.nativeBinding);return saveContentVersion(p.id,key,saved!,{verdict:memo.verdict,note:"Réemploi gratuit du texte acquis ; version de la fiche actualisée",expectedVersion:latestContent(p.id,key)?.version.version??0});});
        rememberContentRun(p.id,memoKey,{docKey:key,version:v.version,verdict:memo.verdict,costMicro:0});
      }
      return { ...base, docKey: key, doc: saved, verdict: memo.verdict as ContentRunResult["verdict"], reason: "version précise déjà rédigée avec le même brief, les mêmes faits et la même identité : rien de repayé", by: saved.meta2.by, costMicro: 0, skipped: true, delivery: delivery(memo.verdict,saved.meta2.contract?.checks.issues??[]) };
    }
  }
  const quotaArticleId=req.type==="blog_article"?blogIdFor(docKey):null;
  const quotaRef=quotaArticleId?reserveBlogDraft(p.userId,p.id,quotaArticleId):null;
  try {
  let expectedVersion = latestContent(p.id, docKey)?.version.version ?? 0;
  const retain = (candidate: ContentDoc, verdict: string, note: string) => {
    const contract = { request: brief.request ?? "", contextHash: brief.context?.hash ?? "", contextVersion: brief.context?.version ?? "", target: page.key, checks: checkRequirements(candidate, brief.requirements) };
    candidate = { ...candidate, meta2: { ...candidate.meta2, contract, ...(req.nativeBinding?{nativeBinding:req.nativeBinding}:{}) } };
    try {
      const v = saveContentVersion(p.id, docKey, candidate, { verdict, note, expectedVersion });
      expectedVersion = v.version;
      deps.onRetained?.({docKey,version:v});
      return v;
    } catch (e) {
      if (!(e instanceof ContentConflict)) throw e;
      docKey = `cnt:${runId.replace(/-/g, "").slice(0, 20)}`;
      expectedVersion = 0;
      notes.push("Le contenu a changé pendant la rédaction : votre version est conservée, la tentative est enregistrée séparément.");
      const v = saveContentVersion(p.id, docKey, candidate, { verdict, note, expectedVersion: 0 });
      expectedVersion = v.version;
      deps.onRetained?.({docKey,version:v});
      return v;
    }
  };

  // Autres pages du projet (doublons).
  const others = listContents(p.id)
    .filter((x) => x.docKey !== docKey && latestContent(p.id, x.docKey)?.doc.page.key !== page.key)
    .map((x) => ({ key: x.title, text: proseOf(latestContent(p.id, x.docKey)?.doc ?? { blocks: [] }) }));

  // 7. Rédaction locale d'abord (toujours possible, gratuite).
  const local = localDraft(brief, facts, { runId, pages });
  let doc: ContentDoc = local;
  let by: "ai" | "local" = "local";
  let providerStopped = false;
  const pay = (kind: CallKind) => {
    const est = deps.estimate(kind);
    if (budget.spentMicro + est > budget.capMicro) {
      budget.stopped = true;
      notes.push(`plafond de coût atteint (${budgetPctText(p.userId, budget.capMicro, p.id)}) : ${kind} non envoyé`);
      return false;
    }
    return true;
  };

  if (deps.canWrite && pay(writeKind(req.type))) {
    try {
      ctx?.progress(0.2, L("Rédaction du texte", "Writing content"));
      const key = `${jobKey}:seo2:write:${memoKey}:0`;
      const r = await withCandidate(`seo2:${docKey}`, 0, () => deps.write(writeSystem(lang), writePrompt(brief, facts), key, writeKind(req.type)));
      budget.spentMicro += r.costMicro;
      stats.writes++;
      const ai = fromAiDraft(brief, facts, r.value, runId);
      if (ai.blocks.length >= 2) {
        doc = ai;
        by = "ai";
        if (ctx) retain(doc, "RETRY", "premier essai — contrôle en préparation");
      } else notes.push("réponse de l'IA inexploitable : texte local conservé");
    } catch (e) {
      if (e instanceof JobCancelled || e instanceof JobPaused) throw e;
      if(req.requireAi)throw e;
      if (e instanceof CostCapReached) {
        budget.stopped = true;
        notes.push("plafond de coût atteint : texte local conservé");
      } else notes.push(`rédaction IA en échec (${(e as Error).message.slice(0, 120)}) : texte local conservé`);
      providerStopped = true;
    }
  } else if (!deps.canWrite) notes.push("IA non disponible pour ce compte : rédaction locale à partir des faits (gratuit)");

  if(req.requireAi&&by!=="ai"&&budget.stopped)throw new CostCapReached(budget.spentMicro,deps.estimate(writeKind(req.type)),budget.capMicro);
  if(req.requireAi&&by!=="ai")throw new UserFacingError(L("Aucun texte IA exploitable n’a été enregistré pour cette demande. La tâche s’arrête sans remplacement local ; les versions précédentes sont conservées.","No usable AI copy was saved for this request. Stopping without local replacement; previous versions are kept."),"CONTENT_AI_RESULT_MISSING");

  // 8-9. Contrôles, relecture, barrière, reprises ciblées (défaut identifié seulement).
  const policy = POLICIES[DELIVERABLE_OF[req.type]];
  let decision: GateDecision | null = null;
  let review: EditorialReview | null = null;
  const checked = (candidate: ContentDoc) => {
    const checks = localContentChecks(candidate, p, facts, { others, pages });
    const reqChecks = checkRequirements(candidate, brief.requirements);
    if (reqChecks.issues.length) {
      checks.codes = [...new Set([...checks.codes, "intent_mismatch"])];
      checks.issues.push(...reqChecks.issues);
      checks.blocks = [...new Set([...checks.blocks, ...requirementTargets(candidate, brief.requirements)])];
    }
    return checks;
  };
  for (let attempt = 0; attempt <= policy.maxRetries; attempt++) {
    ctx?.progress(0.4 + attempt * 0.1, attempt ? L("Contrôle de la correction ciblée", "Checking the targeted correction") : L("Contrôle du texte", "Checking content"));
    const checks = checked(doc);
    review = null;
    let reviewError: string | null = null;
    if (!checks.codes.length && deps.canReview && by === "ai" && !providerStopped && pay("review")) {
      try {
        const key = `${jobKey}:seo2:review:${memoKey}:${attempt}`;
        const r = await withCandidate(`seo2:${docKey}`, attempt, () => deps.review(reviewPrompt(doc, facts, INTENT_GOAL[brief.intent].fr, brief), key));
        budget.spentMicro += r.costMicro;
        stats.reviews++;
        review = r.value;
      } catch (e) {
        if (e instanceof JobCancelled || e instanceof JobPaused) throw e;
        reviewError = (e as Error).message;
        providerStopped = true;
      }
    }
    decision = gateContent({ type: req.type, local: checks, review, reviewError, attempt });
    base.codes = [...decision.fatalCodes, ...decision.blockingCodes];
    base.issues = [...checks.issues, ...(review?.issues ?? [])];
    gateSave({ userId: p.userId, projectId: p.id, jobId: ctx?.job.id ?? null, candidateId: `seo2:${docKey}` }, decision);
    if (attempt >= policy.maxRetries || providerStopped || by !== "ai" || decision.verdict === "FINAL" || (!checks.codes.length && decision.action !== "regenerate")) break;
    // Reprise : seulement avec un défaut identifié et les blocs visés ; jamais pour « gonfler » la note.
    const blockIds = [...new Set([...checks.blocks, ...(review?.fix.blockIds ?? [])])].filter((id) => id === "meta" || doc.blocks.some((b) => b.id === id));
    const fix = decision.feedback || review?.fix.instruction || checks.issues.join(" ; ");
    // Un défaut non localisé est laissé à vérifier plutôt que de réécrire tout le document.
    if (!fix.trim() || !blockIds.length || !pay("rewrite")) break;
    retain(doc, req.requireAi ? "RETRY" : decision.verdict, `essai ${attempt + 1} — ${decision.reason}`);
    try {
      ctx?.progress(0.5 + attempt * 0.1, L("Correction ciblée des passages insuffisants", "Correcting insufficient passages"));
      const key = `${jobKey}:seo2:rewrite:${memoKey}:${attempt + 1}`;
      const target = doc.blocks.filter((b) => blockIds.includes(b.id));
      const prompt = `${writePrompt(brief, facts)}\nCORRECTION CIBLÉE : ${fix} (blocs : ${blockIds.join(", ")}). Ne renvoie que ces blocs, mêmes identifiants et natures.\nBlocs à modifier : ${JSON.stringify(target)}\n${blockIds.includes("meta") ? `Métadonnées à corriger : ${JSON.stringify(doc.meta)}` : ""}\nRéponds { "blocks": [{ "id": "…", "text": "…" }], "note": "…" }, items pour une liste, q/a pour une FAQ ; seoTitle/metaDescription seulement si meta est visé.`;
      const r = await withCandidate(`seo2:${docKey}`, attempt + 1, () => deps.rewrite(writeSystem(lang), prompt, key));
      budget.spentMicro += r.costMicro;
      stats.rewrites++;
      stats.retries++;
      const next = mergeRewrite(doc, r.value, blockIds);
      if (JSON.stringify(next) === JSON.stringify(doc)) { notes.push("La reprise n'a produit aucun changement : texte conservé."); break; }
      doc = next;
    } catch (e) {
      if (e instanceof JobCancelled || e instanceof JobPaused) throw e;
      providerStopped = true;
      notes.push(`reprise en échec, sans nouvel essai automatique : ${(e as Error).message.slice(0, 120)}`);
      break;
    }
  }

  // Un texte IA encore fautif (affirmation inventée, source, information commerciale…) n'est jamais gardé : le
  // texte local, construit sur les seuls faits, le remplace.
  if (by === "ai" && decision && (decision.verdict === "REJECTED" || decision.verdict === "RETRY") && decision.blockingCodes.some((c) => ["invented_claim", "invented_source", "wrong_fact", "unconfirmed_commercial", "forbidden_claim", "invented_link"].includes(c))) {
    retain(doc, decision.verdict, `essai écarté — ${decision.reason}`);
    if(req.requireAi)throw new UserFacingError(L("Le texte IA reste refusé : tentative conservée pour correction, aucune version locale ne remplace vos textes utilisables.","The AI copy remains rejected: the attempt is kept for correction; no local version replaces usable copy."),"CONTENT_AI_COPY_REJECTED");
    notes.push(`texte IA écarté (${decision.blockingCodes.join(", ")}) : texte local construit sur les faits vérifiés`);
    doc = local;
    by = "local";
    const checks = checked(doc);
    decision = gateContent({ type: req.type, local: checks, review: null, attempt: 0 });
    base.codes = [...decision.fatalCodes, ...decision.blockingCodes];
    base.issues = checks.issues;
  }

  const d = decision!;
  // Une relecture en panne ne laisse jamais « à reprendre » : provisoire, à valider par le client.
  const insufficient = by === "ai" && review && editorialScore(review) < policy.retryFloor;
  const verdict = base.codes.length || insufficient ? "REJECTED" : d.verdict === "RETRY" && !d.checked ? "PROVISIONAL" : d.verdict;
  // Garder les contrôles d'essai, puis tracer aussi le verdict effectif du document livré.
  gateSave({ userId: p.userId, projectId: p.id, jobId: ctx?.job.id ?? null, candidateId: `seo2:${docKey}` }, { ...d, verdict });
  doc = { ...doc, meta2: { ...doc.meta2, ...(req.nativeBinding?{nativeBinding:req.nativeBinding}:{}), contract: { request: brief.request ?? "", contextHash: brief.context?.hash ?? "", contextVersion: brief.context?.version ?? "", target: page.key, checks: checkRequirements(doc, brief.requirements) } } };
  ctx?.progress(0.9, L("Conservation du texte et de son contrôle", "Saving content and its check"));
  const saved = tx(()=>{deps.beforeFinalSave?.();return retain(doc, verdict, `moteur ${by === "ai" ? "IA" : "local"} — ${verdict}`);});
  // Blog V2 : le brouillon rejoint le blog existant (relecture, couverture, publication dans l'onglet Blog).
  if (req.type === "blog_article") saveBlogDraftV2(p, docKey, doc, { notes: [...base.issues, ...notes], ai: by === "ai", jobKey: runId, quotaReserved:true });
  rememberContentRun(p.id, memoKey, { docKey, version: saved.version, verdict, costMicro: budget.spentMicro });
  return { ...base, docKey, doc, verdict, reason: d.reason, by, costMicro: budget.spentMicro, stoppedByCostCap: budget.stopped, delivery: delivery(verdict, [d.reason, ...base.issues, ...notes], budget.stopped) };
  } finally { if(quotaArticleId)releaseUnsavedBlogDraft(p.userId,p.id,quotaRef,[quotaArticleId,blogIdFor(docKey)]); }
}

// ---------------------------------------------------------------- édition (manuelle et conversationnelle)

/** Une reprise ne peut modifier que ses blocs et métadonnées autorisés, sans déplacer ni supprimer le reste. */
export function mergeRewrite(doc: ContentDoc, out: RewriteOut, ids: string[]): ContentDoc {
  const allowed = new Set(ids);
  const map = new Map(out.blocks.filter((b) => allowed.has(b.id)).map((b) => [b.id, b]));
  return { ...doc, ...(allowed.has("meta") ? { meta: { ...doc.meta, ...(out.seoTitle ? { seoTitle: out.seoTitle } : {}), ...(out.metaDescription ? { metaDescription: out.metaDescription } : {}) } } : {}), blocks: doc.blocks.map((b) => {
    const x = map.get(b.id);
    if (!x) return b;
    if ((b.kind === "ul" || b.kind === "ol") && x.items?.length) return { ...b, items: x.items };
    if (b.kind === "faq" && x.q?.trim() && x.a?.trim()) return { ...b, q: x.q, a: x.a };
    if ("text" in b && x.text?.trim()) return { ...b, text: x.text };
    return b;
  }) };
}

/** Informative checks must use the document subject, or explicitly report why facts were not checked. */
export function documentContentChecks(p:Project,doc:ContentDoc){
 const subject=documentSubject(p,doc);
 if(!subject.project){
  const neutral={...p,product:emptyProduct(),catalog:[]},c=localContentChecks(doc,neutral,verifiedFacts(neutral),{pages:sitePages(p),factsUnavailable:true});
  return{...c,codes:[...c.codes,"CONTENT_SUBJECT_CHANGED"],issues:[...c.issues,"La fiche ou sa variante a changé ou manque. Texte conservé ; contrôles factuels non effectués. Désignez sa version actuelle avant une nouvelle rédaction IA."],measures:{...c.measures,subject:"changed"}};
 }
 const item=subject.project.catalog.find(c=>`product:catalog:${c.key}`===doc.page.key);
 return localContentChecks(doc,subject.project,verifiedFacts(subject.project,item,{confirmedCategoryOnly:!!doc.meta2.nativeBinding}),{pages:sitePages(subject.project)});
}

/** Enregistrement d'une modification manuelle du client : aucune IA ; contrôles locaux pour information. */
export function saveUserEdit(projectId: string, docKey: string, doc: ContentDoc, note = "modification du client", expectedVersion?: number) {
  const p = loadProject(projectId);
  const previous = latestContent(projectId, docKey);
  if (previous) doc = { ...doc, type: previous.doc.type, lang: previous.doc.lang, page: { ...doc.page, key: previous.doc.page.key, kind: previous.doc.page.kind }, meta2: previous.doc.meta2 };
  const checks = documentContentChecks(p,doc);
  const version = saveContentVersion(projectId, docKey, { ...doc, meta2: { ...doc.meta2, source: "user" } }, { note, verdict: checks.codes.length ? "PROVISIONAL" : null, expectedVersion: expectedVersion ?? previous?.version.version });
  if (doc.type === "blog_article") saveBlogDraftV2(p, docKey, doc, { notes: checks.issues, ai: false, jobKey: "" });
  return { version, checks };
}

export type EditResult = { applied: boolean; by: "local" | "ai" | "none"; summary: string; version: number | null; doc: ContentDoc; issues: string[]; needsAi?: boolean; costMicro: number };

/**
 * Retouche en conversation : locale et gratuite quand c'est possible ; sinon IA limitée aux blocs visés. Une
 * réécriture IA qui ajoute une affirmation non confirmée (ou un autre défaut bloquant) est refusée : le texte du
 * client reste tel quel.
 */
export async function editContentV2(ctx: JobContext | null, projectId: string, docKey: string, request: string, o: { selected?: string[]; maxCostEur?: number } = {}, injected?: SeoV2Deps): Promise<EditResult> {
  const p = loadProject(projectId);
  const cur = latestContent(projectId, docKey);
  if (!cur) throw new Error("contenu introuvable");
  const doc = cur.doc;
  const subject=documentSubject(p,doc),bound=subject.project;
  const item = bound?.catalog.find((c) => `product:catalog:${c.key}` === doc.page.key);
  const facts = bound?verifiedFacts(bound,item,{confirmedCategoryOnly:!!doc.meta2.nativeBinding}):undefined;
  const pages = bound?sitePages(bound):[];
  const plan = planEdit(request, doc, { selected: o.selected, facts, brief: { primaryKeyword: doc.primaryKeyword ? { term: doc.primaryKeyword, intent: "commercial", source: "semantic_hypothesis", metrics: null, basis: "" } : null, page: doc.page, type: doc.type } });
  if (plan.kind === "unclear") return { applied: false, by: "none", summary: plan.summary, version: null, doc, issues: [], costMicro: 0 };
  if (plan.kind === "local") {
    const next = { ...applyContentOps(doc, plan.ops), meta2: { ...doc.meta2, source: "ai_local" as const } };
    if (JSON.stringify(next.blocks) === JSON.stringify(doc.blocks) && JSON.stringify(next.meta) === JSON.stringify(doc.meta)) return { applied: false, by: "none", summary: L("Aucun changement : le texte est déjà identique.", "No change: the content is already identical."), version: null, doc, issues: [], costMicro: 0 };
    const checks = documentContentChecks(p,next);
    const v = saveContentVersion(projectId, docKey, next, { note: `retouche locale : ${plan.summary}`.slice(0, 200), verdict: checks.codes.length ? "PROVISIONAL" : null, expectedVersion: cur.version.version });
    if (next.type === "blog_article") saveBlogDraftV2(p, docKey, next, { notes: checks.issues, ai: false, jobKey: "" });
    return { applied: true, by: "local", summary: plan.summary, version: v.version, doc: next, issues: checks.issues, costMicro: 0 };
  }
  if(!bound||!facts)throw new HttpError(409,"La fiche ou sa variante a changé ou manque. Texte conservé ; désignez sa version actuelle avant une retouche IA.");
  const deps = injected ?? realSeoDeps(ctx, bound, aiActiveFor(p.userId, p.id));
  if (!deps.canWrite) return { applied: false, by: "none", summary: "cette retouche demande l'IA, non disponible pour ce compte (forfait ou IA coupée) : modifiez le texte directement dans l'éditeur", version: null, doc, issues: [], needsAi: true, costMicro: 0 };
  const capMicro = Math.round((o.maxCostEur ?? 0.2) * EUR);
  if (deps.estimate("rewrite") > capMicro) return { applied: false, by: "none", summary: "plafond de coût trop bas pour cette retouche", version: null, doc, issues: [], costMicro: 0 };
  const target = doc.blocks.filter((b) => plan.blockIds.includes(b.id));
  const before = localContentChecks(doc, bound, facts, { pages });
  const system = `${writeSystem(doc.lang)}\nTu modifies UNIQUEMENT les blocs fournis (mêmes identifiants, même nature) selon la demande. N'ajoute aucune information absente des faits.`;
  const prompt = [
    `Demande du client : ${plan.instruction}`,
    `Faits vérifiés : ${JSON.stringify({ faits: facts.facts, reponses: facts.answers, prestations: facts.services, zone: facts.area, prix: facts.price, livraison: facts.shipping, retours: facts.returns })}`,
    `Blocs à modifier : ${JSON.stringify(target)}`,
    `Réponds { "blocks": [{ "id": "…", "text": "…" }], "note": "…" } (items pour une liste, q et a pour une question).`,
  ].join("\n");
  const key = `${ctx?.job.id ?? "seo2"}:seo2:rewrite:${runKey({ docKey, v: cur.version.version, request: plan.instruction, ids: plan.blockIds })}`;
  const r = await withTrace({ projectId, intent: "EDIT_CONTENT", costCapMicro: capMicro }, () => deps.rewrite(system, prompt, key));
  const map = new Map(r.value.blocks.map((b) => [b.id, b]));
  const next: ContentDoc = {
    ...doc,
    blocks: doc.blocks.map((b) => {
      const x = map.get(b.id);
      if (!x || !plan.blockIds.includes(b.id)) return b;
      if ((b.kind === "ul" || b.kind === "ol") && x.items?.length) return { ...b, items: x.items };
      if (b.kind === "faq" && x.q && x.a) return { ...b, q: x.q, a: x.a };
      if ("text" in b && x.text?.trim()) return { ...b, text: x.text.trim() };
      return b;
    }),
    meta2: { ...doc.meta2, source: "ai" },
  };
  const after = localContentChecks(next, bound, facts, { pages });
  const added = after.codes.filter((c) => !before.codes.includes(c));
  if (added.length) return { applied: false, by: "ai", summary: `réécriture refusée (${added.join(", ")}) : votre texte est conservé`, version: null, doc, issues: after.issues, costMicro: r.costMicro };
  const changed = next.blocks.filter((b, i) => blockText(b) !== blockText(doc.blocks[i])).length;
  if (!changed) return { applied: false, by: "ai", summary: L("La réécriture n'a rien changé : votre version est conservée.", "The rewrite changed nothing: your version is kept."), version: null, doc, issues: after.issues, costMicro: r.costMicro };
  contentSubjectProject(loadProject(projectId),doc.meta2.nativeBinding);
  const v = saveContentVersion(projectId, docKey, next, { note: `retouche IA : ${plan.instruction}`.slice(0, 200), verdict: "PROVISIONAL", expectedVersion: cur.version.version });
  if (next.type === "blog_article") saveBlogDraftV2(p, docKey, next, { notes: after.issues, ai: false, jobKey: "" });
  return { applied: true, by: "ai", summary: `${changed} bloc(s) réécrit(s)`, version: v.version, doc: next, issues: after.issues, costMicro: r.costMicro };
}
