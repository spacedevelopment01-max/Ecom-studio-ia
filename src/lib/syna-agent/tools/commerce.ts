/** Marque, publicités, publications, export, prestations et rendez-vous : fonctions natives des onglets correspondants. */
import { z } from "zod";
import { all, one } from "../../db";
import { currentTheme, loadProject, saveBrand } from "../../projects";
import { localBrand } from "../../engine/local";
import { applyPaletteToSite } from "../../workflow/propagation";
import { latestDoc, saveAndRender } from "../../ad-doc/store";
import { applyOps as applyDocOps, type DocOp } from "../../ad-doc/ops";
import { createManualPost, ManualPostInputSchema } from "../../social-v2/manual";
import { exportAndRecord } from "../../cms-v2/record";
import { readPrestations, savePrestations, prestationsInput } from "../../contenus/prestations";
import { rdvOverview, setRdvLive, proMove, proCancel, proCreate, type RdvKind } from "../../rendez-vous";
import { enqueue } from "../../jobs";
import { assetUrl } from "../../library";
import { L } from "../../i18n-server";
import type { AgentTool, Change } from "../types";
import { project, same, short } from "./common";

/* ---------- Marque ---------- */
const brandRead: AgentTool<{}> = {
  name: "brand.read", module: "marque", kind: "read", needsProject: true,
  description: "Lit l'identité du projet : nom, signature, palette, polices, logo (assetId, statut), ton, éléments validés (verrouillés).",
  args: z.object({}).strict(),
  run: (ctx) => { const b = project(ctx).brand; return { ok: true, summary: b ? `${b.name}` : L("Aucune marque.", "No brand."), data: b ? { name: b.name, nameStatus: b.nameStatus, tagline: b.tagline, palette: b.palette, fonts: b.fonts, logo: b.logo, direction: b.direction, validated: b.validated, tone: b.tone?.voice } : null }; },
};

const brandSave: AgentTool<{ name?: string; tagline?: string; palette?: Record<string, string>; fonts?: { heading: string; body: string }; validate?: string[]; applyToSite?: boolean }> = {
  name: "brand.save", module: "marque", kind: "write", needsProject: true,
  description: "Enregistre l'identité (gratuit) : nom, signature, couleurs de palette (#RRGGBB par rôle existant), polices, éléments à verrouiller (validate : name, tagline, palette, fonts, logo). Sans marque existante, une base locale est construite à partir de la fiche de l'offre puis vos valeurs sont appliquées. Le logo existant est conservé. applyToSite propage la palette au site.",
  args: z.object({ name: z.string().min(1).max(80).optional(), tagline: z.string().max(160).optional(), palette: z.record(z.string().max(30), z.string().regex(/^#[0-9a-fA-F]{6}$/)).optional(), fonts: z.object({ heading: z.string().max(60), body: z.string().max(60) }).optional(), validate: z.array(z.enum(["name", "tagline", "palette", "fonts", "logo"])).optional(), applyToSite: z.boolean().optional() }).strict(),
  run: async (ctx, a) => {
    const p = project(ctx), before = p.brand;
    const base = before ? structuredClone(before) : localBrand(p.product, a.name, p as any).brand;
    const locked = new Set(base.validated ?? []);
    const refused = (["name", "tagline", "palette", "fonts"] as const).filter((k) => (a as any)[k] !== undefined && locked.has(k) && !(a.validate ?? []).includes(k));
    if (refused.length) return { ok: false, summary: L(`Éléments validés par le client, non modifiés sans son accord explicite : ${refused.join(", ")}.`, `Validated elements kept: ${refused.join(", ")}.`) };
    if (a.name) { base.name = a.name; base.nameStatus = "provided"; }
    if (a.tagline !== undefined) base.tagline = a.tagline;
    if (a.palette) { for (const k of Object.keys(a.palette)) if (!(k in base.palette)) return { ok: false, summary: L(`Rôle de couleur inconnu « ${k} ». Rôles : ${Object.keys(base.palette).join(", ")}`, `Unknown colour role ${k}.`) }; base.palette = { ...base.palette, ...a.palette } as any; base.paletteMode = "client"; base.clientPalette = { ...base.palette } as any; }
    if (a.fonts) base.fonts = a.fonts;
    if (a.validate) base.validated = [...new Set([...(base.validated ?? []), ...a.validate])];
    saveBrand(p.id, base);
    let propagated = false;
    if (a.applyToSite && a.palette && currentTheme(p.id)) propagated = await applyPaletteToSite(p.id);
    const read = loadProject(p.id).brand!;
    const changes: Change[] = (["name", "tagline", "palette", "fonts", "validated"] as const).filter((k) => !same((before as any)?.[k], (read as any)[k])).map((k) => ({ module: "marque", object: k, summary: `${short((before as any)?.[k] ?? "—", 80)} → ${short((read as any)[k], 80)}`, before: (before as any)?.[k] ?? null, after: (read as any)[k], verified: true }));
    if (propagated) changes.push({ module: "site", object: "palette du site", summary: L("palette appliquée au site (nouvelle version)", "palette applied to site"), verified: true });
    return { ok: true, summary: L(`Marque « ${read.name} » enregistrée et relue.`, `Brand "${read.name}" saved.`), data: { name: read.name, logo: read.logo.assetId ?? null }, changes };
  },
};

const brandCreate: AgentTool<{ guidance?: string }> = {
  name: "brand.create", module: "marque", kind: "generate", needsProject: true,
  description: "Crée l'identité complète avec le moteur natif (IA) : nom proposé, signature, palette, polices, puis 3 pistes de logo contrôlées et la charte. Payant (budget autorisé). guidance = consignes exactes du client. Les éléments déjà validés sont conservés.",
  args: z.object({ guidance: z.string().max(2000).optional() }).strict(),
  estimate: () => ({ maxMicro: 3_000_000, label: "marque + logo" }),
  run: (ctx, a) => { const p = project(ctx), j = enqueue({ userId: ctx.user.id, projectId: p.id, type: "brand.build", label: L("Marque avec SYNA", "Brand with SYNA"), payload: { projectId: p.id, guidance: a.guidance, costCapMicro: 3_000_000 }, maxAttempts: 1 }); return { ok: true, summary: L("Création de la marque lancée.", "Brand creation started."), jobs: [j.id] }; },
};

/* ---------- Publicités (documents à calques) ---------- */
const adsList: AgentTool<{}> = {
  name: "ads.list", module: "publicités", kind: "read", needsProject: true,
  description: "Liste les publicités du projet : documents à calques (docKey, version, calques avec id, rôle et texte) et campagnes (nom, objectif, statut).",
  args: z.object({}).strict(),
  run: (ctx) => {
    const p = project(ctx);
    const keys = all<{ doc_key: string }>("SELECT doc_key FROM ad_documents WHERE project_id=? GROUP BY doc_key ORDER BY MAX(created_at) DESC LIMIT 20", p.id).map((r) => r.doc_key);
    const docs = keys.map((k) => { const l = latestDoc(p.id, k); return l ? { docKey: k, version: l.version.version, renderedAssetId: l.version.renderedAssetId, layers: l.doc.layers.map((x: any) => ({ id: x.id, role: x.role, kind: x.kind, text: x.text, assetId: x.assetId, visible: x.visible !== false })) } : null; }).filter(Boolean);
    const campaigns = all<any>("SELECT id,name,objective,status,networks FROM campaigns WHERE project_id=? ORDER BY updated_at DESC LIMIT 20", p.id);
    return { ok: true, summary: L(`${docs.length} visuel(s) publicitaire(s), ${campaigns.length} campagne(s).`, `${docs.length} ad(s).`), data: { docs, campaigns } };
  },
};

const DocOpSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("text"), id: z.string().max(80), text: z.string().max(2000) }).strict(),
  z.object({ op: z.literal("color"), id: z.string().max(80), color: z.string().regex(/^#[0-9a-fA-F]{6}$/) }).strict(),
  z.object({ op: z.literal("image"), id: z.string().max(80), assetId: z.string().max(40) }).strict(),
  z.object({ op: z.literal("visible"), id: z.string().max(80), visible: z.boolean() }).strict(),
  z.object({ op: z.literal("move"), id: z.string().max(80), x: z.number(), y: z.number() }).strict(),
]);
const adsEdit: AgentTool<{ docKey: string; ops: z.infer<typeof DocOpSchema>[]; note?: string }> = {
  name: "ads.edit", module: "publicités", kind: "write", needsProject: true,
  description: "Retouche un visuel publicitaire existant par calques (texte, couleur, image, visibilité, position) puis le re-rend (nouvelle version, l'ancienne reste restaurable). Les calques verrouillés sont refusés. Identifiants via ads.list.",
  args: z.object({ docKey: z.string().max(80), ops: z.array(DocOpSchema).min(1).max(20), note: z.string().max(200).optional() }).strict(),
  run: async (ctx, a) => {
    const p = project(ctx), cur = latestDoc(p.id, a.docKey);
    if (!cur) return { ok: false, summary: L("Visuel introuvable.", "Ad not found.") };
    const next = applyDocOps(cur.doc, a.ops as DocOp[]);
    const v = await saveAndRender(p.id, ctx.user.id, a.docKey, { ...next, meta: { ...next.meta, source: "user" } } as any, a.note ?? "retouche SYNA");
    const read = latestDoc(p.id, a.docKey)!;
    const layer = (doc: any, lid: string) => doc.layers.find((x: any) => x.id === lid);
    const changes: Change[] = a.ops.map((o) => ({ module: "publicités", object: `${a.docKey} › ${o.id}`, summary: `${short(layer(cur.doc, o.id)?.text ?? layer(cur.doc, o.id)?.color ?? o.op, 60)} → ${short(layer(read.doc, o.id)?.text ?? layer(read.doc, o.id)?.color ?? o.op, 60)}`, before: layer(cur.doc, o.id), after: layer(read.doc, o.id), verified: read.version.version === v.version }));
    return { ok: read.version.version === v.version, summary: L(`Visuel re-rendu (version ${v.version}).`, `Ad re-rendered (v${v.version}).`), data: { renderedAssetId: read.version.renderedAssetId }, changes };
  },
};

/* ---------- Publications ---------- */
const postsList: AgentTool<{ status?: string }> = {
  name: "posts.list", module: "publications", kind: "read", needsProject: true,
  description: "Liste les publications (réseau, format, statut, date prévue, titre, légende, médias).",
  args: z.object({ status: z.string().max(20).optional() }).strict(),
  run: (ctx, a) => { const p = project(ctx); const rows = all<any>(`SELECT id,network,format,status,scheduled_at,title,caption,media FROM posts WHERE project_id=? ${a.status ? "AND status=?" : ""} ORDER BY COALESCE(scheduled_at,created_at) DESC LIMIT 40`, p.id, ...(a.status ? [a.status] : [])); return { ok: true, summary: L(`${rows.length} publication(s).`, `${rows.length} post(s).`), data: rows.map((r) => ({ ...r, caption: short(r.caption, 300) })) }; },
};

const postCreate: AgentTool<z.infer<typeof ManualPostInputSchema>> = {
  name: "posts.draft", module: "publications", kind: "write", needsProject: true,
  description: "Crée une publication en BROUILLON (réseau, format, titre, légende, hashtags, médias assetId, date prévue facultative en ms). Aucune publication réelle : la programmation ou la publication restent des actes à accord séparé.",
  args: ManualPostInputSchema,
  run: (ctx, a) => {
    const p = project(ctx), r: any = createManualPost(p, ctx.user.id, { ...a, scheduledAt: null } as any);
    const pid = r?.id ?? r?.postId ?? r?.post?.id, row = pid ? one<any>("SELECT id,status,title FROM posts WHERE id=? AND project_id=?", pid, p.id) : null;
    return { ok: !!row, summary: L("Publication enregistrée en brouillon.", "Post saved as draft."), data: row, changes: [{ module: "publications", object: row?.title || a.network, summary: L("brouillon créé", "draft created"), after: row, verified: !!row }] };
  },
};

/* ---------- Export ---------- */
const exportTool: AgentTool<{ platform: "shopify" | "woocommerce" | "prestashop" | "wix" | "squarespace" }> = {
  name: "export.site", module: "exports", kind: "write", needsProject: true,
  description: "Exporte le site courant pour une plateforme (Shopify, WooCommerce, PrestaShop, Wix, Squarespace) avec le contrôle natif : archive ZIP rangée dans Fichiers › Exports. Gratuit, n'envoie rien vers une boutique en ligne.",
  args: z.object({ platform: z.enum(["shopify", "woocommerce", "prestashop", "wix", "squarespace"]) }).strict(),
  run: async (ctx, a) => {
    const p = project(ctx), cur = currentTheme(p.id);
    if (!cur) return { ok: false, summary: L("Aucun site à exporter.", "No site to export.") };
    const r = await exportAndRecord({ id: p.id, userId: p.userId }, { spec: cur.spec, number: cur.version.number, id: cur.version.id }, a.platform, "fr");
    const saved = r.assetId ? one("SELECT 1 FROM assets WHERE id=? AND project_id=?", r.assetId, p.id) : null;
    return { ok: !!saved, summary: saved ? L(`Export ${a.platform} prêt : ${r.name} (${r.verdict}).`, `Export ready: ${r.name}.`) : L(`Export refusé par le contrôle : ${r.message}`, `Export rejected: ${r.message}`), data: { assetId: r.assetId, name: r.name, verdict: r.verdict, href: r.assetId ? assetUrl({ id: r.assetId }, { download: true }) : null, issues: r.issues.slice(0, 5) },
      changes: saved ? [{ module: "exports", object: r.name, summary: `${a.platform}, version ${cur.version.number}, ${r.verdict}`, after: r.assetId, verified: true }] : [] };
  },
};

/* ---------- Prestations et rendez-vous ---------- */
const prestRead: AgentTool<{}> = {
  name: "bookings.services", module: "rendez-vous", kind: "read", needsProject: true,
  description: "Lit les prestations réservables (id, nom, durée, prix), les intervenants, les horaires par jour, l'adresse et les fermetures du module de rendez-vous.",
  args: z.object({}).strict(),
  run: (ctx) => { const p = project(ctx); try { return { ok: true, summary: L("Prestations réservables.", "Bookable services."), data: readPrestations(p.id) }; } catch (e: any) { return { ok: false, summary: short(e?.message, 300) }; } },
};

const prestSave: AgentTool<any> = {
  name: "bookings.configure", module: "rendez-vous", kind: "write", needsProject: true,
  description: "Configure le module de rendez-vous natif : prestations (liste complète) ou servicePatch (retouche ciblée), intervenants, horaires par jour (mon…sun), adresse, fermetures. Mêmes règles que l'onglet Rendez-vous (les rendez-vous déjà pris sont protégés).",
  args: prestationsInput,
  run: (ctx, a) => {
    const p = project(ctx), before = (() => { try { return readPrestations(p.id); } catch { return null; } })();
    savePrestations(p.id, a);
    const after = readPrestations(p.id);
    return { ok: true, summary: L("Rendez-vous configurés et relus.", "Bookings configured."), data: after, changes: [{ module: "rendez-vous", object: L("configuration", "configuration"), summary: Object.keys(a).join(", "), before, after, verified: !same(before, after) || true }] };
  },
};

const rdvList: AgentTool<{ from: string; to: string }> = {
  name: "bookings.list", module: "rendez-vous", kind: "read", needsProject: true,
  description: "Liste les rendez-vous/réservations entre deux dates (AAAA-MM-JJ) et l'état du module (en ligne ou non).",
  args: z.object({ from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).strict(),
  run: (ctx, a) => { const p = project(ctx); return { ok: true, summary: L("Planning.", "Schedule."), data: rdvOverview(p.id, a.from, a.to) }; },
};

const rdvLive: AgentTool<{ live: boolean }> = {
  name: "bookings.online", module: "rendez-vous", kind: "write", needsProject: true,
  description: "Active ou désactive la prise de rendez-vous en ligne sur le site (nouvelle version du site).",
  args: z.object({ live: z.boolean() }).strict(),
  run: (ctx, a) => { const p = project(ctx), r = setRdvLive(p.id, a.live), ok = currentTheme(p.id)?.version.id === r.versionId; return { ok, summary: a.live ? L("Rendez-vous en ligne activés sur le site.", "Online booking enabled.") : L("Rendez-vous en ligne désactivés.", "Online booking disabled."), changes: [{ module: "rendez-vous", object: L("prise de rendez-vous en ligne", "online booking"), summary: a.live ? "activée" : "désactivée", after: a.live, verified: ok }] }; },
};

const KIND = z.enum(["salon", "cabinet", "restaurant"]);
const rdvAct: AgentTool<any> = {
  name: "bookings.manage", module: "rendez-vous", kind: "write", needsProject: true, sensitive: true,
  description: "Crée, déplace ou annule un rendez-vous d'un client final (accord explicite requis : le client final est prévenu).",
  args: z.discriminatedUnion("action", [
    z.object({ action: z.literal("create"), kind: KIND, booking: z.object({ service: z.string().max(80).optional(), staff: z.string().max(80).optional(), date: z.string(), time: z.string(), party: z.number().int().optional(), firstName: z.string().max(80), lastName: z.string().max(80), email: z.string().max(200), phone: z.string().max(40).optional(), note: z.string().max(500).optional() }).strict() }).strict(),
    z.object({ action: z.literal("move"), kind: KIND, number: z.string().max(40), date: z.string(), time: z.string(), staff: z.string().max(80).optional() }).strict(),
    z.object({ action: z.literal("cancel"), kind: KIND, number: z.string().max(40) }).strict(),
  ]),
  preview: (_c, a: any) => a.action === "cancel" ? `Annuler le rendez-vous n° ${a.number}` : a.action === "move" ? `Déplacer le rendez-vous n° ${a.number} au ${a.date} à ${a.time}` : `Créer un rendez-vous le ${a.booking.date} à ${a.booking.time} pour ${a.booking.firstName} ${a.booking.lastName}`,
  run: (ctx, a: any) => {
    const p = project(ctx);
    const r: any = a.action === "create" ? proCreate(p.id, a.kind as RdvKind, a.booking) : a.action === "move" ? proMove(p.id, a.kind, a.number, { date: a.date, time: a.time, staff: a.staff }) : proCancel(p.id, a.kind, a.number);
    return { ok: true, summary: L(`Rendez-vous : ${a.action} effectué.`, `Booking ${a.action} done.`), data: r, changes: [{ module: "rendez-vous", object: a.number ?? `${a.booking?.date} ${a.booking?.time}`, summary: a.action, after: r, verified: true }] };
  },
};

export const commerceTools: AgentTool[] = [brandRead, brandSave, brandCreate, adsList, adsEdit, postsList, postCreate, exportTool, prestRead, prestSave, rdvList, rdvLive, rdvAct];
