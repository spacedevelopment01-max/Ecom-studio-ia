/** Projet, Pilote (préparation native), mémoire, pièces jointes, tâches. */
import { z } from "zod";
import fs from "node:fs";
import { HttpError } from "../../auth";
import { id, now, one, run } from "../../db";
import { DEFAULT_SETTINGS, loadProject, remember, saveProduct, saveServices } from "../../projects";
import { createProjectWithSubscription, NoFreeSubscription, pendingSubscriptions } from "../../project-billing";
import { ensureFolders, saveAsset } from "../../library";
import { initialize, approve, queuePreparation, answerBriefQuestion, editBrief, references, updateOfferFacts } from "../../preparation/engine";
import { stateOf } from "../../preparation/store";
import { createQuote, quoteOf } from "../../preparation/quote";
import { emptyInput } from "../../orchestrator/conversation/store";
import { emptyServiceProfile, SECTOR_IDS, type ProductProfile } from "../../project-types";
import { getJob, publicJob } from "../../jobs";
import { getStrategyState, prepareStrategyChange, activateStrategy, stageStrategyModule, proposeStrategies } from "../../marketing-strategy";

/** Comme l'action « analyser » du comparateur (gratuite) : la recherche terminée devient des angles proposés. */
function strategyState(projectId: string) {
  // Idempotent : renvoie l'état tel quel s'il est à jour, sinon reprend la recherche acquise (aucun nouvel appel).
  try { return proposeStrategies(projectId); } catch { return getStrategyState(projectId); }
}
import { L } from "../../i18n-server";
import type { AgentTool } from "../types";
import { attachmentsOf } from "../attachments";
import { currentStep, journeyOf } from "../journey";
import { cents, project, short } from "./common";

const createTool: AgentTool<{ name: string; business: "products" | "services"; storeType?: "mono" | "multi" | "niche"; description: string }> = {
  name: "project.create", module: "projet", kind: "write",
  description: "Crée le projet du client à partir de ce fil (brouillon sans projet) : nom provisoire, activité « products » (boutique) ou « services », description exacte du client. Rattache le fil et range les photos/vidéos jointes dans la bibliothèque. Utilise un abonnement libre du compte (un abonnement = un projet).",
  args: z.object({ name: z.string().min(1).max(120), business: z.enum(["products", "services"]), storeType: z.enum(["mono", "multi", "niche"]).optional(), description: z.string().min(1).max(8000) }).strict(),
  run: async (ctx, a) => {
    if (ctx.projectId) return { ok: false, summary: L("Ce fil a déjà son projet.", "This thread already has a project.") };
    if (!pendingSubscriptions(ctx.user.id).length) return { ok: false, summary: L("Aucun abonnement libre : chaque abonnement finance un seul projet.", "No free subscription.") };
    const pid = id();
    try {
      const chosen = (JSON.parse(one<{ state_json: string | null }>("SELECT state_json FROM agent_conversations WHERE id=?", ctx.conversationId)?.state_json ?? "{}") as { subscriptionKey?: string }).subscriptionKey;
      const key = chosen && pendingSubscriptions(ctx.user.id).some((s) => s.user_id === chosen) ? chosen : null;
      createProjectWithSubscription(ctx.user.id, key, () => {
        run("INSERT INTO projects (id, user_id, name, status, platform, store_type, business_type, business_json, settings_json, sources_json, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
          pid, ctx.user.id, a.name, "draft", "shopify", a.storeType ?? "mono", a.business, a.business === "services" ? JSON.stringify(emptyServiceProfile()) : "{}",
          JSON.stringify({ ...DEFAULT_SETTINGS, mode: "guided", timezone: (ctx.user as any).timezone ?? DEFAULT_SETTINGS.timezone, language: "fr" }), "[]", now(), now());
        return { projectId: pid, result: pid };
      });
    } catch (e) { if (e instanceof NoFreeSubscription) return { ok: false, summary: L("L'abonnement vient d'être utilisé.", "Subscription already used.") }; throw e; }
    ensureFolders(pid);
    const p = loadProject(pid);
    initialize(pid, { ...emptyInput(), business: a.business, offerName: a.name, description: a.description, services: p.services } as never);
    run("UPDATE agent_conversations SET project_id=?, updated_at=? WHERE id=? AND project_id IS NULL", pid, now(), ctx.conversationId);
    ctx.projectId = pid;
    // Pièces jointes déjà reçues : rangées dans la bibliothèque du nouveau projet.
    for (const at of attachmentsOf(ctx.conversationId).filter((x) => !x.assetId && (x.kind === "image" || x.kind === "video"))) {
      const asset = await saveAsset({ projectId: pid, userId: ctx.user.id, name: at.name, mime: at.mime, data: fs.readFileSync(at.path), role: "original", origin: "upload", meta: { synaAttachment: { conversationId: ctx.conversationId, attachmentId: at.id } } });
      run("UPDATE syna_attachments SET asset_id=? WHERE id=?", asset.id, at.id);
    }
    const linked = one<{ project_id: string }>("SELECT project_id FROM agent_conversations WHERE id=?", ctx.conversationId)?.project_id === pid;
    return { ok: linked, summary: L(`Projet « ${a.name} » créé (${a.business === "services" ? "services" : "boutique"}) et rattaché au fil.`, `Project "${a.name}" created and linked.`), data: { projectId: pid }, changes: [{ module: "projet", object: a.name, summary: L("projet créé", "project created"), after: { id: pid, business: a.business }, verified: linked }] };
  },
};

const profileTool: AgentTool<any> = {
  name: "project.profile", module: "projet", kind: "write", needsProject: true,
  description: "Enregistre la fiche de l'offre utilisée par tous les moteurs (marque, site, contenus) ; les FAITS (prix, matières, présentation, couleurs, variantes) n'ont besoin d'aucune analyse et gardent l'angle choisi ; nom, catégorie, secteur, résumé, couleurs vues sur les photos, matières, prix confirmé par le client, variantes. Les champs absents restent inchangés. Ce qui vient d'une photo reste « proposé », jamais un fait confirmé.",
  args: z.object({
    name: z.string().max(160).optional(), nameStatus: z.enum(["provided", "proposed"]).optional(), category: z.string().max(120).optional(), sector: z.enum(SECTOR_IDS).optional(),
    summary: z.string().max(4000).optional(), colors: z.array(z.object({ hex: z.string().regex(/^#[0-9a-fA-F]{6}$/), name: z.string().max(40), share: z.number().min(0).max(1) })).max(8).optional(),
    materials: z.array(z.string().max(60)).max(10).optional(), visualDescription: z.string().max(1200).optional(),
    price: z.object({ amount: z.number().min(0).max(1_000_000).describe("Prix TTC en euros (ex. 89)"), currency: z.string().regex(/^[A-Z]{3}$/).default("EUR") }).optional(),
    variants: z.array(z.object({ name: z.string().max(40), values: z.array(z.string().max(60)).max(30) })).max(3).optional(),
    sourceAttachmentIds: z.array(z.string().max(40)).max(12).optional(),
  }).strict(),
  run: (ctx, a: any) => {
    const p = project(ctx), before = p.product;
    // Fiche du Pilote validée : les FAITS passent par la porte native (fiche + produit ensemble, angle conservé) ;
    // un changement de nom, catégorie ou secteur est une nouvelle offre (fiche du Pilote, nouvelle analyse).
    const briefApproved = stateOf(p.id)?.stages.brief?.status === "approved";
    const coreChange = (a.name && a.name !== before.name) || (a.category && a.category !== before.category) || (a.sector && a.sector !== before.sector);
    if (briefApproved && coreChange) return { ok: false, summary: L("Le nom, la catégorie ou le secteur définissent l'offre : les changer demande une nouvelle analyse de la fiche. Les faits (prix, matières, présentation) se modifient sans analyse.", "Name, category or sector define the offer: change them in the Pilot brief."), hint: "Modifie-les dans la fiche du Pilote (pilot.answer champs offerName/description)." };
    const applyFacts = (next: ProductProfile) => {
      if (a.summary) { next.summary = a.summary; next.summaryStatus = "provided"; }
      if (a.colors || a.materials || a.visualDescription) next.visual = { ...next.visual, ...(a.colors ? { colors: a.colors } : {}), ...(a.materials ? { materials: a.materials } : {}), ...(a.visualDescription ? { description: a.visualDescription } : {}) };
      // Le profil stocke le prix en centimes (comme le catalogue) ; l'outil le reçoit en euros.
      if (a.price) {
        next.price = { amount: cents(a.price.amount), currency: a.price.currency, status: "confirmed" };
        const shown = `${String(a.price.amount).replace(".", ",")} € TTC`;
        for (const f of next.facts ?? []) if (/prix/i.test(f.label) && f.status !== "unknown") { f.value = shown; f.status = "confirmed"; f.source = "user"; }
      }
      if (a.variants) next.variants = a.variants;
      for (const aid of a.sourceAttachmentIds ?? []) { const at = ctx.attachment(aid); if (at && !next.sources.some((s) => s.ref === (at.assetId ?? at.id))) next.sources.push({ type: "photo", ref: at.assetId ?? at.id, summary: short(a.visualDescription ?? at.name, 200) }); }
    };
    if (briefApproved) {
      try { updateOfferFacts(p.id, applyFacts); }
      catch (e: any) { return { ok: false, summary: short(e?.message, 300) }; }
      const read = loadProject(p.id).product;
      return { ok: true, summary: L("Faits de l'offre enregistrés dans la fiche et le Pilote ; angle et étapes validées conservés.", "Offer facts saved; angle kept."), data: { name: read.name, price: read.price }, changes: [{ module: "projet", object: "faits de l'offre", summary: Object.keys(a).join(", "), before: { price: before.price, summary: short(before.summary, 120) }, after: { price: read.price, summary: short(read.summary, 120) }, verified: read.price?.amount === (a.price ? cents(a.price.amount) : read.price?.amount) }] };
    }
    const next: ProductProfile = structuredClone(before);
    if (a.name) { next.name = a.name; next.nameStatus = a.nameStatus ?? "proposed"; }
    if (a.category) next.category = a.category;
    if (a.sector) next.sector = a.sector;
    if (a.summary) { next.summary = a.summary; next.summaryStatus = "proposed"; }
    if (a.colors || a.materials || a.visualDescription) next.visual = { ...next.visual, ...(a.colors ? { colors: a.colors } : {}), ...(a.materials ? { materials: a.materials } : {}), ...(a.visualDescription ? { description: a.visualDescription } : {}) };
    // Le profil stocke le prix en centimes (comme le catalogue) ; l'outil le reçoit en euros.
    if (a.price) next.price = { amount: cents(a.price.amount), currency: a.price.currency, status: "confirmed" };
    if (a.variants) next.variants = a.variants;
    for (const aid of a.sourceAttachmentIds ?? []) { const at = ctx.attachment(aid); if (at && !next.sources.some((s) => s.ref === (at.assetId ?? at.id))) next.sources.push({ type: "photo", ref: at.assetId ?? at.id, summary: short(a.visualDescription ?? at.name, 200) }); }
    saveProduct(p.id, next);
    const read = loadProject(p.id).product;
    return { ok: true, summary: L("Fiche de l'offre enregistrée et relue.", "Offer profile saved."), data: { name: read.name, category: read.category, sector: read.sector }, changes: [{ module: "projet", object: "fiche de l'offre", summary: Object.keys(a).join(", "), before: { name: before.name, category: before.category, price: before.price }, after: { name: read.name, category: read.category, price: read.price }, verified: true }] };
  },
};

const servicesTool: AgentTool<any> = {
  name: "services.profile", module: "services", kind: "write", needsProject: true,
  description: "Enregistre le profil d'une activité de services : prestations (nom, description, prix et durée seulement si le client les donne), zone, adresse, téléphone, e-mail, horaires, lien de réservation externe, façons d'être contacté (booking = rendez-vous en ligne, quote = demande de devis, call, form) — la première est le bouton principal du site.",
  args: z.object({
    services: z.array(z.object({ name: z.string().min(1).max(120), description: z.string().max(1000).default(""), price: z.string().max(60).optional(), duration: z.string().max(60).optional() })).max(30).optional(),
    area: z.string().max(200).optional(), address: z.string().max(300).optional(), phone: z.string().max(40).optional(), email: z.string().max(200).optional(), hours: z.string().max(300).optional(), bookingUrl: z.string().max(400).optional(),
    contactModes: z.array(z.enum(["booking", "quote", "call", "form"])).min(1).max(4).optional(),
  }).strict(),
  run: (ctx, a: any) => {
    const p = project(ctx);
    if (p.business !== "services") return { ok: false, summary: L("Ce projet est une boutique de produits, pas une activité de services.", "This project is a product store.") };
    const before = p.services;
    const next = { ...before, ...Object.fromEntries(Object.entries(a).filter(([k, v]) => v !== undefined && !["services", "contactModes"].includes(k))) } as any;
    if (a.services) next.services = a.services.map((s: any) => ({ ...s, source: "client" }));
    if (a.contactModes) { next.contactMode = a.contactModes[0]; next.contactModes = a.contactModes; }
    saveServices(p.id, next, p.servicesVersion);
    const read = loadProject(p.id).services;
    return { ok: true, summary: L("Profil de services enregistré et relu.", "Services profile saved."), data: read, changes: [{ module: "services", object: "profil de l'activité", summary: Object.keys(a).join(", "), before, after: read, verified: true }] };
  },
};

const pilotStateTool: AgentTool<{}> = {
  name: "pilot.state", module: "pilote", kind: "read", needsProject: true,
  description: "Lit l'état du parcours Pilote natif (fiche, analyse, recherche et angles, marque, contenus, médias) : étapes, statuts, options proposées à choisir (angles, logos), révision.",
  args: z.object({}).strict(),
  run: (ctx) => {
    const p = project(ctx), s = stateOf(p.id);
    if (!s) return { ok: true, summary: L("Parcours non démarré.", "Not started."), data: null };
    const stages = Object.fromEntries(Object.entries(s.stages).map(([k, v]: any) => [k, { status: v?.status, provenance: v?.data?.provenance, keys: v?.data ? Object.keys(v.data).slice(0, 12) : [], choices: v?.data?.angles?.map?.((x: any) => ({ id: x.id, title: x.title ?? x.name })) ?? v?.data?.options?.map?.((x: any) => ({ id: x.id, title: x.title ?? x.name })) }]));
    const brief: any = (s.stages as any).brief?.data;
    const openQuestions = (brief?.profile?.questions ?? []).filter((q: any) => !q.answer && !q.later).map((q: any) => ({ id: q.id, question: q.question, required: q.required }));
    return { ok: true, summary: L(`Parcours, révision ${s.revision} ; ${openQuestions.length} question(s) ouverte(s) dans la fiche.`, `Pipeline revision ${s.revision}.`), data: { revision: s.revision, pending: s.pending ?? null, stages, openQuestions, missing: brief?.missing ?? [] } };
  },
};

const STEPS = ["brief", "research", "brand", "content", "media"] as const;
const ACTIONS = ["analyze", "generate", "logo", "image", "collect"] as const;
const pilotRunTool: AgentTool<{ step: (typeof STEPS)[number]; action: (typeof ACTIONS)[number]; slot?: string; correction?: string }> = {
  name: "pilot.run", module: "pilote", kind: "generate", needsProject: true,
  description: "Lance une étape IA du parcours natif avec son devis natif (débité sur le budget autorisé) : brief/analyze (comprendre l'offre et ses photos), research/generate (recherche et 5 angles marketing), brand/generate (identité), brand/logo (3 pistes de logo), content/generate (textes des pages ; slot = une page), media/image ou media/collect (visuels d'un emplacement). Tâche de fond ; SINA reprend quand elle est finie.",
  args: z.object({ step: z.enum(STEPS), action: z.enum(ACTIONS), slot: z.string().max(80).optional(), correction: z.string().max(2000).optional() }).strict(),
  estimate: (ctx, a) => { const p = project(ctx); const q = createQuote(p.id, a.step, a.action, a.slot, a.correction) as any; return { maxMicro: q.capMicro ?? 0, label: `${a.step}/${a.action}` }; },
  run: (ctx, a) => {
    const p = project(ctx), created = createQuote(p.id, a.step, a.action, a.slot, a.correction) as any, q = quoteOf(p.id, created.id, a.correction) as any, s = stateOf(p.id);
    if (!s) return { ok: false, summary: L("Parcours non démarré.", "Pipeline not started.") };
    const r: any = queuePreparation(p.id, s.revision, a.step, a.action, { capMicro: q.capMicro, paid: q.paid, slot: q.slot, correction: q.correction, analysisFingerprint: q.analysisFingerprint });
    const jid = r?.jobId ?? r?.job?.id ?? stateOf(p.id)?.pending?.jobId;
    return { ok: !!jid, summary: L(`Étape ${a.step}/${a.action} lancée (plafond ${created.maxBudgetPct ?? 0} % du budget).`, `Step ${a.step}/${a.action} started.`), jobs: jid ? [jid] : [], data: { quoteMaxPct: created.maxBudgetPct } };
  },
};

const pilotAnswerTool: AgentTool<{ answers?: { questionId: string; answer?: string; later?: boolean }[]; fields?: { target?: string; constraints?: string; offerName?: string; brandName?: string; description?: string; referenceUrls?: string[] } }> = {
  name: "pilot.answer", module: "pilote", kind: "write", needsProject: true,
  description: "Complète gratuitement la fiche du parcours avec les MOTS DU CLIENT : `fields` pour les champs du brief (target = public visé « À qui cette offre s'adresse-t-elle ? », constraints, offerName, brandName, description, referenceUrls = liens donnés par le client, lus par la recherche) ; `answers` pour les questions ouvertes par identifiant (pilot.state → openQuestions ; later=true reporte une question facultative, seulement si le client l'accepte). Ne relancez JAMAIS une analyse payante pour corriger ou ajouter une information : utilisez cet outil. Pour un simple FAIT de l'offre (prix, dimensions, matières, présentation) une fois la fiche validée, utilisez project.profile : il met à jour la fiche et le Pilote sans rouvrir la fiche ni périmer l'angle.",
  args: z.object({ answers: z.array(z.object({ questionId: z.string().max(120), answer: z.string().max(3000).optional(), later: z.boolean().optional() }).strict()).max(20).optional(), fields: z.object({ target: z.string().max(1200).optional(), constraints: z.string().max(5000).optional(), offerName: z.string().max(160).optional(), brandName: z.string().max(80).optional(), description: z.string().max(8000).optional(), referenceUrls: z.array(z.string().url().max(500)).max(12).optional() }).strict().optional() }).strict(),
  run: (ctx, a) => {
    const p = project(ctx), changes: any[] = [], failed: string[] = [];
    if (a.fields && Object.keys(a.fields).length) {
      const s = stateOf(p.id);
      if (!s) return { ok: false, summary: L("Parcours non démarré.", "Not started.") };
      const before = (s.stages as any).brief.data.input;
      const { referenceUrls, ...brief } = a.fields;
      try {
        if (Object.keys(brief).length) editBrief(p.id, s.revision, { ...before, ...brief });
        if (referenceUrls?.length) references(p.id, stateOf(p.id)!.revision, [...new Set([...(before.referenceUrls ?? []), ...referenceUrls])]);
      }
      catch (e: any) { failed.push(`champs : ${short(e?.message, 200)}`); }
      const after = (stateOf(p.id)!.stages as any).brief.data.input;
      for (const k of Object.keys(a.fields)) changes.push({ module: "pilote", object: `fiche › ${k}`, summary: `${short(before[k] || "—", 60)} → ${short(after[k], 60)}`, before: before[k], after: after[k], verified: k === "referenceUrls" ? (a.fields!.referenceUrls ?? []).every((u) => (after.referenceUrls ?? []).includes(u)) : after[k] === (a.fields as any)[k] });
    }
    for (const x of a.answers ?? []) {
      const s = stateOf(p.id);
      if (!s) return { ok: false, summary: L("Parcours non démarré.", "Not started.") };
      try { answerBriefQuestion(p.id, s.revision, x.questionId, x.later ? { later: true } : { answer: x.answer ?? "" }); }
      catch (e: any) { failed.push(`${x.questionId} : ${short(e?.message, 160)}`); continue; }
      const q = ((stateOf(p.id)!.stages as any).brief?.data?.profile?.questions ?? []).find((y: any) => y.id === x.questionId);
      changes.push({ module: "pilote", object: q?.question ?? x.questionId, summary: x.later ? L("reportée", "postponed") : short(String(q?.answer ?? x.answer), 140), after: q?.answer ?? null, verified: !!q && (x.later ? !!q.later : (q.answer ?? "") !== "") });
    }
    const missing = ((stateOf(p.id)!.stages as any).brief?.data?.missing ?? []) as unknown[];
    return { ok: !failed.length, summary: L(`${changes.length} réponse(s) enregistrée(s) dans la fiche${failed.length ? ` ; refusées : ${failed.join(" ; ")}` : ""}. Encore manquant : ${missing.length}.`, `${changes.length} answer(s) saved.`), changes, data: { missing } };
  },
};

const pilotApproveTool: AgentTool<{ step: (typeof STEPS)[number]; choiceId?: string; logoId?: string }> = {
  name: "pilot.approve", module: "pilote", kind: "write", needsProject: true,
  description: "Valide une étape du parcours natif avec le CHOIX DU CLIENT (angle de recherche choiceId, logo logoId). N'utilisez que si le client a choisi ou accepté explicitement.",
  args: z.object({ step: z.enum(STEPS), choiceId: z.string().max(80).optional(), logoId: z.string().max(80).optional() }).strict(),
  run: (ctx, a) => {
    const p = project(ctx), s = stateOf(p.id);
    if (!s) return { ok: false, summary: L("Parcours non démarré.", "Not started.") };
    approve(p.id, s.revision, a.step, { choiceId: a.choiceId, logoId: a.logoId } as any);
    const st = (stateOf(p.id)!.stages as any)[a.step]?.status;
    return { ok: st === "approved", summary: L(`Étape ${a.step} : ${st}.`, `Step ${a.step}: ${st}.`), changes: [{ module: "pilote", object: `étape ${a.step}`, summary: `→ ${st}${a.choiceId ? ` (choix ${a.choiceId})` : ""}`, verified: st === "approved" }] };
  },
};

const noteTool: AgentTool<{ kind: "decision" | "preference" | "fact"; key: string; value: string }> = {
  name: "memory.note", module: "mémoire", kind: "write", needsProject: true,
  description: "Mémorise dans le projet une décision, une préférence ou un fait CONFIRMÉ par le client (ex. « garder le logo actuel », « ton chaleureux »), pour les reprises ultérieures et les autres moteurs.",
  args: z.object({ kind: z.enum(["decision", "preference", "fact"]), key: z.string().min(1).max(80), value: z.string().min(1).max(1000) }).strict(),
  run: (ctx, a) => { const p = project(ctx); remember(p.id, { kind: a.kind === "fact" ? "fact" : "decision", key: `syna.${a.key}`, value: a.value, status: "confirmed", source: "user", origin: "user" as any }); return { ok: true, summary: L("Noté dans la mémoire du projet.", "Saved to project memory."), changes: [{ module: "mémoire", object: a.key, summary: a.value, verified: true }] }; },
};

const attachmentReadTool: AgentTool<{ attachmentId: string; from?: number; length?: number }> = {
  name: "attachment.read", module: "fichiers", kind: "read",
  description: "Lit le texte intégral d'un document joint (PDF, Word, texte) par tranches, ou l'analyse complète d'une vidéo jointe (plans, durées, rythme).",
  args: z.object({ attachmentId: z.string().max(40), from: z.number().int().min(0).default(0), length: z.number().int().min(100).max(30000).default(12000) }).strict(),
  run: (ctx, a) => {
    const at = ctx.attachment(a.attachmentId) as any;
    if (!at) return { ok: false, summary: L("Pièce jointe introuvable dans ce fil.", "Attachment not found.") };
    if (at.kind === "document") { const t = String(at.analysis?.text ?? ""), from = a.from ?? 0, len = a.length ?? 12000; return { ok: true, summary: L(`${at.name} : caractères ${from}–${Math.min(t.length, from + len)} sur ${t.length}.`, `${at.name}`), data: { text: t.slice(from, from + len), total: t.length } }; }
    const { frames, ...rest } = at.analysis ?? {};
    return { ok: true, summary: at.name, data: { kind: at.kind, assetId: at.assetId, ...rest, frames: frames?.length } };
  },
};

const jobTool: AgentTool<{ jobId: string }> = {
  name: "jobs.status", module: "tâches", kind: "read", needsProject: true,
  description: "Relit l'état et le résultat d'une tâche de fond du projet.",
  args: z.object({ jobId: z.string().max(40) }).strict(),
  run: (ctx, a) => { const j = getJob(a.jobId); if (!j || j.project_id !== ctx.projectId) return { ok: false, summary: L("Tâche introuvable.", "Job not found.") }; return { ok: true, summary: `${j.type} : ${j.status}`, data: publicJob(j) }; },
};

const strategyRead: AgentTool<{}> = {
  name: "strategy.read", module: "stratégie", kind: "read", needsProject: true,
  description: "Lit la stratégie marketing : état de la recherche, les 5 angles proposés (id, titre, promesse), l'angle recommandé, l'angle actif. Un site de boutique ne se construit qu'avec un angle choisi par le client.",
  args: z.object({}).strict(),
  run: (ctx) => {
    // Pendant l'étape 4 du parcours, les angles passent par angles.propose (cartes et sources) ; essais réels : une
    // lecture ici était tronquée et n'affichait aucune carte.
    if (currentStep(journeyOf(ctx.conversationId)) === 4) return { ok: false, summary: L("Les angles s'affichent en cartes à cette étape.", "Angles are shown as cards at this step."), hint: "Pendant l'étape 4 du parcours, utilise angles.propose : il range et affiche les 5 angles en cartes, avec leurs sources." };
    const st = strategyState(project(ctx).id); return { ok: true, summary: st.active ? L(`Angle actif : ${st.active.angleId}.`, `Active angle: ${st.active.angleId}.`) : L(`Aucun angle actif ; ${st.angles.length} proposé(s).`, `No active angle.`), data: { research: st.research ? { status: st.research.status, message: st.research.message } : null, angles: st.angles.map((x: any) => ({ id: x.id, title: x.title ?? x.name, promise: short(x.promise ?? x.summary ?? x.hook ?? "", 200) })), recommendation: st.recommendation, active: st.active ? { angleId: st.active.angleId, version: st.active.version } : null, missingQuestions: st.missingQuestions } }; },
};


const researchRead: AgentTool<{}> = {
  name: "research.read", module: "stratégie", kind: "read", needsProject: true,
  description: "Hors parcours (pendant l'étape 4 du parcours, utilise angles.propose, qui affiche les angles en cartes). Lit la recherche marketing du Pilote (brouillon ou validée) : couverture, les 5 angles avec cible, motivation, accroche, arguments et LEURS SOURCES (titre, lien, famille, lue par le Studio ou extrait de la recherche web), recommandation, et les sources écartées avec la raison. À utiliser pour présenter les angles au client avec leurs sources. Hors parcours, après son choix : pilot.approve {step:\"research\"} puis l'outil de choix de l'angle.",
  args: z.object({}).strict(),
  run: (ctx) => {
    // Pendant l'étape 4 du parcours, les angles passent par angles.propose (cartes et sources) ; essais réels : une
    // lecture ici était tronquée et n'affichait aucune carte.
    if (currentStep(journeyOf(ctx.conversationId)) === 4) return { ok: false, summary: L("Les angles s'affichent en cartes à cette étape.", "Angles are shown as cards at this step."), hint: "Pendant l'étape 4 du parcours, utilise angles.propose : il range et affiche les 5 angles en cartes, avec leurs sources." };
    const p = project(ctx), r: any = (stateOf(p.id)?.stages as any)?.research;
    if (!r?.data) return { ok: true, summary: L("Aucune recherche marketing enregistrée.", "No marketing research yet."), data: null };
    const d = r.data, byId = new Map<string, any>((d.sources ?? []).map((s: any) => [s.id, s]));
    const src = (id: string) => { const s = byId.get(id); return s ? { id, title: s.title, url: s.url, family: s.category, read: s.via === "openai_web_search" ? "extrait rapporté par la recherche web OpenAI" : "page lue par le Studio" } : { id, title: "source inconnue" }; };
    const angles = (d.angles ?? []).map((a: any) => ({ id: a.id, title: a.title, audience: a.audience, motivation: a.motivation, message: a.message, emotion: a.emotion, proofsToConfirm: a.proofsToConfirm ?? [], arguments: (a.arguments ?? []).slice(0, 4).map((x: string) => short(x, 200)), sources: (a.sourceIds ?? []).map(src) }));
    const used = (d.sources ?? []).filter((s: any) => s.status === "consulted" && s.relevance?.accepted !== false).map((s: any) => src(s.id));
    const excluded = (d.sources ?? []).filter((s: any) => s.status !== "consulted" || s.relevance?.accepted === false).map((s: any) => ({ url: s.url, reason: s.error ?? s.relevance?.reason ?? "non retenue" }));
    return { ok: true, summary: L(`Recherche ${r.status} : ${angles.length} angle(s), ${used.length} source(s) retenue(s), ${excluded.length} écartée(s).`, `Research ${r.status}: ${angles.length} angles.`), data: { status: r.status, coverage: d.coverage, angles, recommendedId: d.recommendedId, recommendation: d.recommendation, sources: used, excluded } };
  },
};

const strategyChoose: AgentTool<{ angleId: string }> = {
  name: "strategy.choose", module: "stratégie", kind: "write", needsProject: true,
  description: "Active l'angle marketing CHOISI PAR LE CLIENT parmi ceux de strategy.read (fil conducteur du site, des contenus et des publicités). Ne choisissez jamais à sa place : demandez-lui s'il n'a pas choisi. Ensuite, validez la recherche avec pilot.approve {step:\"research\", choiceId: le même angle}. Sert aussi à RE-PRÉPARER l'angle déjà choisi quand les informations du projet ont changé (erreur « Préparez à nouveau cet angle ») : relancez-le avec le même angleId, gratuitement.",
  args: z.object({ angleId: z.string().max(40) }).strict(),
  run: (ctx, a) => {
    const p = project(ctx), before = strategyState(p.id).active;
    const prep = prepareStrategyChange(p.id, a.angleId);
    for (const c of prep.contents.filter((c: any) => !c.aligned && !c.published)) stageStrategyModule(p.id, prep.id, c.module, { contentIds: [], retainedContentIds: [c.contentId] });
    const act = activateStrategy(p.id, { angleId: a.angleId, preparationId: prep.id, idempotencyKey: `syna-${ctx.runId}-${prep.id}`, confirmed: true, retainUnaligned: true });
    const after = getStrategyState(p.id).active;
    return { ok: after?.angleId === a.angleId, summary: L(`Angle « ${a.angleId} » activé.`, `Angle ${a.angleId} activated.`), changes: [{ module: "stratégie", object: L("angle marketing", "marketing angle"), summary: `${before?.angleId ?? "aucun"} → ${after?.angleId}`, before: before?.angleId ?? null, after: after?.angleId ?? null, verified: after?.angleId === a.angleId && act.angleId === a.angleId }] };
  },
};

export const projectTools: AgentTool[] = [strategyRead, researchRead, strategyChoose, createTool, profileTool, servicesTool, pilotStateTool, pilotRunTool, pilotAnswerTool, pilotApproveTool, noteTool, attachmentReadTool, jobTool];
export const _unused = { HttpError };
