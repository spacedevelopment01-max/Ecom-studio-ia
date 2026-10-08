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
import type { JobContext } from "../jobs";
import { JobCancelled, JobPaused } from "../jobs";
import { aiActiveFor } from "../ai/access";
import { CostCapReached, currentTrace, withCandidate, withTrace } from "../ai/trace";
import { gateSave } from "../quality/store";
import { POLICIES } from "../quality/policies";
import { EUR } from "../billing";
import { contentLang } from "../i18n-server";
import { loadProject, type Project } from "../projects";
import { verifiedFacts } from "./facts";
import { researchKeywords } from "./keywords";
import { sitePages } from "./pages";
import { seoStrategy } from "./strategy";
import { buildBrief } from "./brief";
import { INTENT_GOAL } from "./intent";
import { fromAiDraft, localDraft, writePrompt, writeSystem } from "./write";
import { DELIVERABLE_OF, gateContent, localContentChecks, proseOf, reviewPrompt } from "./quality";
import { blockText } from "./doc";
import { contentKey, contentRun, contentUserOwned, latestContent, listContents, rememberContentRun, runKey, saveContentVersion } from "./store";
import { applyContentOps } from "./ops";
import { planEdit } from "./local-edit";
import { localOnlyDeps, realSeoDeps, writeKind, type CallKind, type SeoV2Deps } from "./deps";
import { blogAiAllowed, saveBlogDraftV2 } from "./blog";
import { LANGS, type ContentDoc, type ContentLang, type ContentRunResult, type ContentType, type EditorialReview, type Keyword, type PageRef, type SeoStrategy } from "./types";
import type { GateDecision } from "../quality/gate";

export const SEO_V2_VERSION = "8a.1";
export const DEFAULT_SEO_CAP_EUR = 0.6;

export type ContentRequestV2 = {
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
  const byKey = pageKey ? pages.find((p) => p.key === pageKey) : undefined;
  if (byKey) return byKey;
  const kinds = KIND_PAGE[type];
  const found = kinds ? pages.find((p) => kinds.includes(p.kind)) : undefined;
  if (found && type !== "blog_article") return found;
  const title = keyword?.term ?? strategy.calendar[0]?.title ?? strategy.themes[0] ?? type;
  const home = pages.find((p) => p.kind === "home");
  if (type === "faq" || type === "metadata" || type === "ad_copy") return home ?? { key: `${type}:principal`, title, url: null, kind: "page", status: "planned" };
  return { key: `article:${crypto.createHash("sha256").update(title).digest("hex").slice(0, 10)}`, title: title.charAt(0).toUpperCase() + title.slice(1), url: null, kind: "article", status: "planned" };
}

export async function runContentEngineV2(ctx: JobContext | null, projectId: string, req: ContentRequestV2, injected?: SeoV2Deps): Promise<ContentRunResult & { strategy: SeoStrategy; stoppedByCostCap: boolean }> {
  const p = loadProject(projectId);
  let deps = injected ?? realSeoDeps(ctx, p, aiActiveFor(p.userId));
  // Articles écrits par l'IA : inclus selon le forfait (comme le blog existant) ; sinon brouillon local gratuit.
  const blogBlocked = req.type === "blog_article" && deps.canWrite && !blogAiAllowed(p.userId);
  if (blogBlocked) deps = localOnlyDeps();
  const capMicro = Math.round((req.maxCostEur ?? DEFAULT_SEO_CAP_EUR) * EUR);
  const cur = currentTrace();
  return withTrace({ ...(ctx?.job.id ? { jobId: ctx.job.id } : {}), projectId, ...(cur.intent ? {} : { intent: "WRITE_CONTENT" }), costCapMicro: cur.costCapMicro != null ? Math.min(cur.costCapMicro, capMicro) : capMicro }, async () => {
    const r = await engine(ctx, p, req, deps, { capMicro, spentMicro: 0, stopped: false });
    if (blogBlocked) r.notes.unshift("articles écrits par l'IA non inclus dans votre forfait : brouillon local à partir des faits (0 €)");
    return r;
  });
}

async function engine(ctx: JobContext | null, p: Project, req: ContentRequestV2, deps: SeoV2Deps, budget: Budget) {
  const lang = pickLang(req.lang);
  const runId = crypto.randomUUID();
  const notes: string[] = [];
  const stats = { writes: 0, reviews: 0, retries: 0, rewrites: 0 };
  const jobKey = ctx?.job.id ?? "seo2";

  // 1-4. Pages, mots-clés (hypothèses), stratégie, brief : gratuits et déterministes.
  const pages = sitePages(p);
  const research = researchKeywords(p, lang, pages);
  const strategy = seoStrategy(p, lang, { pages, research });
  const page = targetPage(pages, req.type, req.pageKey, strategy, req.keyword);
  const item = req.type === "product_page" ? p.catalog.find((c) => c.name.trim() === page.title.trim()) ?? null : null;
  const facts = verifiedFacts(p, item);
  const brief = buildBrief(p, { type: req.type, page, lang, strategy, request: req.request, keyword: req.keyword ?? null, facts });
  if (facts.unknowns.length) notes.push(...facts.unknowns.map((u) => `à compléter : ${u}`));
  const base = { runId, brief, codes: [] as string[], issues: [] as string[], stats, notes, strategy, stoppedByCostCap: false, skipped: false };
  if (req.planOnly) return { ...base, docKey: null, doc: null, verdict: "PROVISIONAL" as const, reason: "brief seul (rien n'est rédigé)", by: "local" as const, costMicro: 0 };

  // 5. Lignée : un contenu modifié par le client n'est jamais écrasé.
  let docKey = contentKey(p.id, req.type, page.key, lang);
  if (contentUserOwned(p.id, docKey)) {
    docKey = `cnt:${runId.replace(/-/g, "").slice(0, 20)}`;
    notes.push("contenu précédent modifié par le client : conservé, la nouvelle rédaction est un nouveau document");
  }

  // 6. Idempotence : même brief, mêmes faits, même moteur → le document déjà produit, sans rien refaire ni payer.
  const memoKey = runKey({ v: SEO_V2_VERSION, docKey, type: req.type, lang, page: page.key, kw: brief.primaryKeyword?.term ?? null, intent: brief.intent, facts, links: brief.links.map((l) => [l.key, l.status, l.url]), ai: deps.canWrite, review: deps.canReview });
  const memo = req.force ? null : contentRun(p.id, memoKey);
  if (memo) {
    const prev = latestContent(p.id, memo.docKey);
    if (prev) return { ...base, docKey: memo.docKey, doc: prev.doc, verdict: memo.verdict as ContentRunResult["verdict"], reason: "déjà rédigé avec le même brief et les mêmes faits : rien n'a été refait", by: prev.doc.meta2.by, costMicro: 0, skipped: true };
  }

  // Autres pages du projet (doublons).
  const others = listContents(p.id)
    .filter((x) => x.docKey !== docKey)
    .map((x) => ({ key: x.title, text: proseOf(latestContent(p.id, x.docKey)?.doc ?? { blocks: [] }) }));

  // 7. Rédaction locale d'abord (toujours possible, gratuite).
  const local = localDraft(brief, facts, { runId, pages });
  let doc: ContentDoc = local;
  let by: "ai" | "local" = "local";
  const pay = (kind: CallKind) => {
    const est = deps.estimate(kind);
    if (budget.spentMicro + est > budget.capMicro) {
      budget.stopped = true;
      notes.push(`plafond de coût atteint (${(budget.capMicro / EUR).toFixed(2)} €) : ${kind} non envoyé`);
      return false;
    }
    return true;
  };

  if (deps.canWrite && pay(writeKind(req.type))) {
    try {
      const key = `${jobKey}:seo2:write:${memoKey}:0`;
      const r = await withCandidate(`seo2:${docKey}`, 0, () => deps.write(writeSystem(lang), writePrompt(brief, facts), key, writeKind(req.type)));
      budget.spentMicro += r.costMicro;
      stats.writes++;
      const ai = fromAiDraft(brief, facts, r.value, runId);
      if (ai.blocks.length >= 2) {
        doc = ai;
        by = "ai";
      } else notes.push("réponse de l'IA inexploitable : texte local conservé");
    } catch (e) {
      if (e instanceof JobCancelled || e instanceof JobPaused) throw e;
      if (e instanceof CostCapReached) {
        budget.stopped = true;
        notes.push("plafond de coût atteint : texte local conservé");
      } else notes.push(`rédaction IA en échec (${(e as Error).message.slice(0, 120)}) : texte local conservé`);
    }
  } else if (!deps.canWrite) notes.push("IA non disponible pour ce compte : rédaction locale à partir des faits (0 €)");

  // 8-9. Contrôles, relecture, barrière, reprises ciblées (défaut identifié seulement).
  const policy = POLICIES[DELIVERABLE_OF[req.type]];
  let decision: GateDecision | null = null;
  let review: EditorialReview | null = null;
  for (let attempt = 0; attempt <= policy.maxRetries; attempt++) {
    const checks = localContentChecks(doc, p, facts, { others, pages });
    review = null;
    let reviewError: string | null = null;
    if (!checks.codes.length && deps.canReview && by === "ai" && pay("review")) {
      try {
        const key = `${jobKey}:seo2:review:${memoKey}:${attempt}`;
        const r = await withCandidate(`seo2:${docKey}`, attempt, () => deps.review(reviewPrompt(doc, facts, INTENT_GOAL[brief.intent].fr), key));
        budget.spentMicro += r.costMicro;
        stats.reviews++;
        review = r.value;
      } catch (e) {
        if (e instanceof JobCancelled || e instanceof JobPaused) throw e;
        reviewError = (e as Error).message;
      }
    }
    decision = gateContent({ type: req.type, local: checks, review, reviewError, attempt });
    base.codes = [...decision.fatalCodes, ...decision.blockingCodes];
    base.issues = [...checks.issues, ...(review?.issues ?? [])];
    if (decision.verdict !== "RETRY" || decision.action !== "regenerate" || by !== "ai") break;
    // Reprise : seulement avec un défaut identifié et les blocs visés ; jamais pour « gonfler » la note.
    const blockIds = [...new Set([...checks.blocks, ...(review?.fix.blockIds ?? [])])].filter((id) => doc.blocks.some((b) => b.id === id));
    const fix = decision.feedback || review?.fix.instruction || "";
    if (!fix.trim() || !pay(writeKind(req.type))) break;
    try {
      const key = `${jobKey}:seo2:write:${memoKey}:${attempt + 1}`;
      const r = await withCandidate(`seo2:${docKey}`, attempt + 1, () => deps.write(writeSystem(lang), writePrompt(brief, facts, { fix: `${fix}${blockIds.length ? ` (blocs : ${blockIds.join(", ")})` : ""}`, current: doc }), key, writeKind(req.type)));
      budget.spentMicro += r.costMicro;
      stats.writes++;
      stats.retries++;
      const next = fromAiDraft(brief, facts, r.value, runId);
      if (next.blocks.length >= 2) doc = next;
      else break;
    } catch (e) {
      if (e instanceof JobCancelled || e instanceof JobPaused) throw e;
      notes.push(`reprise en échec : ${(e as Error).message.slice(0, 120)}`);
      break;
    }
  }

  // Un texte IA encore fautif (affirmation inventée, source, information commerciale…) n'est jamais gardé : le
  // texte local, construit sur les seuls faits, le remplace.
  if (by === "ai" && decision && (decision.verdict === "REJECTED" || decision.verdict === "RETRY") && decision.blockingCodes.some((c) => ["invented_claim", "invented_source", "wrong_fact", "unconfirmed_commercial", "forbidden_claim", "invented_link"].includes(c))) {
    notes.push(`texte IA écarté (${decision.blockingCodes.join(", ")}) : texte local construit sur les faits vérifiés`);
    doc = local;
    by = "local";
    const checks = localContentChecks(doc, p, facts, { others, pages });
    decision = gateContent({ type: req.type, local: checks, review: null, attempt: 0 });
    base.codes = [...decision.fatalCodes, ...decision.blockingCodes];
    base.issues = checks.issues;
  }

  const d = decision!;
  // Une relecture en panne ne laisse jamais « à reprendre » : provisoire, à valider par le client.
  const verdict = d.verdict === "RETRY" ? "PROVISIONAL" : d.verdict;
  gateSave({ userId: p.userId, projectId: p.id, jobId: ctx?.job.id ?? null, candidateId: `seo2:${docKey}` }, d);
  const saved = saveContentVersion(p.id, docKey, doc, { note: `moteur ${by === "ai" ? "IA" : "local"} — ${verdict}`, verdict });
  // Blog V2 : le brouillon rejoint le blog existant (relecture, couverture, publication dans l'onglet Blog).
  if (req.type === "blog_article") saveBlogDraftV2(p, docKey, doc, { notes: [...base.issues, ...notes], ai: by === "ai", jobKey: runId });
  rememberContentRun(p.id, memoKey, { docKey, version: saved.version, verdict, costMicro: budget.spentMicro });
  return { ...base, docKey, doc, verdict, reason: d.reason, by, costMicro: budget.spentMicro, stoppedByCostCap: budget.stopped };
}

// ---------------------------------------------------------------- édition (manuelle et conversationnelle)

/** Enregistrement d'une modification manuelle du client : aucune IA ; contrôles locaux pour information. */
export function saveUserEdit(projectId: string, docKey: string, doc: ContentDoc, note = "modification du client") {
  const p = loadProject(projectId);
  const facts = verifiedFacts(p);
  const checks = localContentChecks(doc, p, facts, { pages: sitePages(p) });
  const version = saveContentVersion(projectId, docKey, { ...doc, meta2: { ...doc.meta2, source: "user" } }, { note, verdict: checks.codes.length ? "PROVISIONAL" : null });
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
  const facts = verifiedFacts(p);
  const pages = sitePages(p);
  const plan = planEdit(request, doc, { selected: o.selected, facts, brief: { primaryKeyword: doc.primaryKeyword ? { term: doc.primaryKeyword, intent: "commercial", source: "semantic_hypothesis", metrics: null, basis: "" } : null, page: doc.page, type: doc.type } });
  if (plan.kind === "unclear") return { applied: false, by: "none", summary: plan.summary, version: null, doc, issues: [], costMicro: 0 };
  if (plan.kind === "local") {
    const next = { ...applyContentOps(doc, plan.ops), meta2: { ...doc.meta2, source: "ai_local" as const } };
    const checks = localContentChecks(next, p, facts, { pages });
    const v = saveContentVersion(projectId, docKey, next, { note: `retouche locale : ${plan.summary}`.slice(0, 200), verdict: checks.codes.length ? "PROVISIONAL" : null });
    if (next.type === "blog_article") saveBlogDraftV2(p, docKey, next, { notes: checks.issues, ai: false, jobKey: "" });
    return { applied: true, by: "local", summary: plan.summary, version: v.version, doc: next, issues: checks.issues, costMicro: 0 };
  }
  const deps = injected ?? realSeoDeps(ctx, p, aiActiveFor(p.userId));
  if (!deps.canWrite) return { applied: false, by: "none", summary: "cette retouche demande l'IA, non disponible pour ce compte (forfait ou IA coupée) : modifiez le texte directement dans l'éditeur", version: null, doc, issues: [], needsAi: true, costMicro: 0 };
  const capMicro = Math.round((o.maxCostEur ?? 0.2) * EUR);
  if (deps.estimate("rewrite") > capMicro) return { applied: false, by: "none", summary: "plafond de coût trop bas pour cette retouche", version: null, doc, issues: [], costMicro: 0 };
  const target = doc.blocks.filter((b) => plan.blockIds.includes(b.id));
  const before = localContentChecks(doc, p, facts, { pages });
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
  const after = localContentChecks(next, p, facts, { pages });
  const added = after.codes.filter((c) => !before.codes.includes(c));
  if (added.length) return { applied: false, by: "ai", summary: `réécriture refusée (${added.join(", ")}) : votre texte est conservé`, version: null, doc, issues: after.issues, costMicro: r.costMicro };
  const changed = next.blocks.filter((b, i) => blockText(b) !== blockText(doc.blocks[i])).length;
  const v = saveContentVersion(projectId, docKey, next, { note: `retouche IA : ${plan.instruction}`.slice(0, 200), verdict: "PROVISIONAL" });
  if (next.type === "blog_article") saveBlogDraftV2(p, docKey, next, { notes: after.issues, ai: false, jobKey: "" });
  return { applied: true, by: "ai", summary: `${changed} bloc(s) réécrit(s)`, version: v.version, doc: next, issues: after.issues, costMicro: r.costMicro };
}
