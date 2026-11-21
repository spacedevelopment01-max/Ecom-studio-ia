/** Projet, mémoire, pièces jointes, tâches. Les outils du Pilote et des cinq angles ont été retirés au lot 3 (16 novembre 2026). */
import { z } from "zod";
import fs from "node:fs";
import { HttpError } from "../../auth";
import { id, now, one, run } from "../../db";
import { DEFAULT_SETTINGS, loadProject, remember, saveProduct, saveServices } from "../../projects";
import { createProjectWithSubscription, NoFreeSubscription, pendingSubscriptions } from "../../project-billing";
import { ensureFolders, saveAsset } from "../../library";
import { initialize, updateOfferFacts } from "../../preparation/engine";
import { stateOf } from "../../preparation/store";
import { emptyInput } from "../../preparation/empty-input";
import { emptyServiceProfile, SECTOR_IDS, type ProductProfile } from "../../project-types";
import { getJob, publicJob } from "../../jobs";

import { L } from "../../i18n-server";
import type { AgentTool } from "../types";
import { attachmentsOf } from "../attachments";
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

// Noter ce que dit le client : une seule façon, la fiche (start.note, `fiche.ts`, 21 novembre 2026).

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

export const projectTools: AgentTool[] = [createTool, profileTool, servicesTool, attachmentReadTool, jobTool];
export const _unused = { HttpError };
