/**
 * Étape 0 du parcours SINA (#492) : fiche de départ (questions une à une, jamais redemandées), lecture gratuite d'un
 * existant (site du client) et mode « refonte » (ce que le client garde tel quel). Aucun appel d'IA payant ici.
 */
import { z } from "zod";
import fs from "node:fs";
import { all, one } from "../../db";
import { L } from "../../i18n-server";
import { loadProject, remember } from "../../projects";
import { saveAsset } from "../../library";
import { editBrief } from "../../preparation/engine";
import { stateOf } from "../../preparation/store";
import { importSite, downloadSiteImage, logoToPng, type SiteFetcher } from "../../engine/site-import";
import type { AgentTool, ToolContext } from "../types";
import { attachmentsOf } from "../attachments";
import {
  FIELD_LABEL, JOURNEY_STEPS, KEEPABLE, REQUIRED_FIELDS, START_FIELDS, currentStep, journeyOf, missingFields,
  QUESTIONS, setStep, updateJourney, type FieldAnswer, type Journey, type StartField,
} from "../journey";
import { short } from "./common";

/** Lecteur de site remplaçable par les tests (aucun réseau). */
export const startDeps: { fetchImpl?: SiteFetcher } = {};

const view = (j: Journey) => ({
  etapeEnCours: currentStep(j),
  etapes: JOURNEY_STEPS.map((s) => ({ n: s.n, nom: s.fr, statut: j.steps[s.n]?.status ?? "todo" })),
  fiche: Object.fromEntries(START_FIELDS.filter((f) => j.start[f]).map((f) => [f, j.start[f]])),
  aDemander: missingFields(j).map((f) => ({ champ: f, question: QUESTIONS[f](j).fr })),
  mode: j.mode, aGarder: j.keep,
  existantLu: j.imported,
});

/** Nom provisoire tiré des mots du client (« Coach sportif. Séances… » → « Coach sportif (provisoire) »). */
export function provisionalName(offer: string): string {
  const head = offer.trim().split(/[.,;:!?\n(]/)[0].trim().replace(/^(je suis|je fais|je vends|c'est|nous sommes|on est)\s+/i, "");
  const short = head.length > 40 ? head.slice(0, 40).replace(/\s+\S*$/, "") : head;
  return `${(short || "Mon projet").replace(/^./, (c) => c.toUpperCase())} (provisoire)`;
}

/**
 * Le projet est créé par le Studio lui-même dès que l'activité et l'offre sont connues (gratuit, déterministe) :
 * on ne dépend pas du modèle pour une action aussi essentielle (essai réel : Haiku ne l'avait pas fait).
 */
async function ensureProject(ctx: ToolContext, j: Journey): Promise<string | null> {
  if (ctx.projectId) return ctx.projectId;
  const business = j.start.business?.value, offer = j.start.offer?.value;
  if (!offer || (business !== "products" && business !== "services")) return null;
  const create = (await import("../registry")).getTool("project.create")!;
  const res = await create.run(ctx, { name: provisionalName(offer), business, description: offer });
  return res.ok ? (ctx.projectId ?? null) : null;
}

const stateTool: AgentTool<{}> = {
  name: "start.state", module: "parcours", kind: "read",
  description: "Lit le parcours de création (étapes 0 à 13) et la fiche de départ : ce que le client a déjà dit (avec la source : client, site lu, formulaire, photo), les champs encore à demander dans l'ordre, le mode (création ou refonte) et ce qu'il faut garder tel quel. Gratuit, utilisable avant la création du projet.",
  args: z.object({}).strict(),
  run: (ctx) => ({ ok: true, summary: L("Parcours relu.", "Journey read."), data: view(journeyOf(ctx.conversationId)) }),
};

const answerTool: AgentTool<any> = {
  name: "start.answer", module: "parcours", kind: "write",
  description: "Enregistre une ou plusieurs réponses du client dans la fiche de départ (étape 0). Champs : business (« products » ou « services »), offer, existing, audience, market, price, difference, taste, contact, platform (shopify, woocommerce, prestashop ou « à décider »). Reprends les mots du client sans rien inventer. status « later » si le client veut répondre plus tard (refusé pour business, offer, audience), « none » s'il n'a rien à dire. Une réponse déjà connue peut être corrigée si le client la change. Gratuit, utilisable avant la création du projet.",
  args: z.object({
    answers: z.array(z.object({
      field: z.enum(START_FIELDS.filter((f) => f !== "keep") as [StartField, ...StartField[]]),
      value: z.string().max(4000).default(""),
      status: z.enum(["answered", "later", "none"]).default("answered"),
    })).min(1).max(11),
  }).strict(),
  run: async (ctx, a: { answers: { field: StartField; value: string; status: FieldAnswer["status"] }[] }) => {
    for (const x of a.answers) {
      if (x.status !== "answered" && REQUIRED_FIELDS.includes(x.field)) return { ok: false, summary: L(`« ${FIELD_LABEL[x.field].fr} » est indispensable : il faut une réponse maintenant.`, `"${FIELD_LABEL[x.field].en}" is required now.`) };
      if (x.status === "answered" && !x.value.trim()) return { ok: false, summary: L(`Réponse vide pour « ${FIELD_LABEL[x.field].fr} ».`, "Empty answer.") };
      if (x.field === "business" && x.status === "answered" && !["products", "services"].includes(x.value.trim())) return { ok: false, summary: L("business vaut « products » ou « services ».", "business is \"products\" or \"services\".") };
    }
    const before = journeyOf(ctx.conversationId).start;
    const j = updateJourney(ctx.conversationId, (j) => {
      for (const x of a.answers) j.start[x.field] = { value: x.value.trim(), status: x.status, source: "client", at: Date.now() };
      if (j.steps[0]?.status === "todo") setStep(j, 0, "doing");
    });
    const next = missingFields(j);
    const created = !ctx.projectId ? await ensureProject(ctx, j) : null;
    return {
      ok: true,
      summary: L(`${a.answers.map((x) => FIELD_LABEL[x.field].fr).join(", ")} : c'est noté.${created ? " Ton projet est créé." : ""}${next.length ? "" : " Tout est renseigné."}`, "Saved."),
      data: { prochaine: next[0] ?? null, question: next[0] ? QUESTIONS[next[0]](j).fr : null, restent: next.slice(1) },
      changes: a.answers.map((x) => ({ module: "parcours", object: `fiche de départ · ${FIELD_LABEL[x.field].fr}`, summary: x.status === "answered" ? short(x.value, 160) : x.status === "later" ? "plus tard" : "rien", before: before[x.field] ?? null, after: j.start[x.field], verified: true })),
    };
  },
};

/** Instagram, Facebook, TikTok, Etsy… bloquent la lecture automatique : on le dit au lieu de deviner. */
const BLOCKING_HOSTS = /(^|\.)(instagram\.com|facebook\.com|tiktok\.com|etsy\.com|linkedin\.com|x\.com|twitter\.com|pinterest\.[a-z.]+)$/i;

const importTool: AgentTool<{ url: string }> = {
  name: "start.import", module: "parcours", kind: "write",
  description: "Lit gratuitement (sans IA) le site existant du client à partir de son lien : nom, slogan, logo, couleurs, polices, pages, produits, coordonnées, réseaux. Préremplit la fiche de départ (source « site ») sans écraser ce que le client a dit. Instagram, Facebook, TikTok, Etsy et autres réseaux bloquent la lecture automatique : dans ce cas, demande des captures d'écran ou des photos. Utilisable avant la création du projet.",
  args: z.object({ url: z.string().min(4).max(500) }).strict(),
  run: async (ctx, a) => {
    let host = "";
    try { host = new URL(/^https?:\/\//i.test(a.url) ? a.url : `https://${a.url}`).hostname; } catch { return { ok: false, summary: L("Ce lien n'est pas une adresse web valide.", "Invalid link.") }; }
    if (BLOCKING_HOSTS.test(host)) return { ok: false, summary: L(`${host} ne se laisse pas lire automatiquement. Demandez au client des captures d'écran de sa page, ou ses photos et son logo en pièces jointes.`, `${host} can't be read automatically: ask for screenshots or files.`) };
    let site;
    try { site = await importSite(a.url, { maxPages: 6, fetchImpl: startDeps.fetchImpl }); }
    catch (e) { return { ok: false, summary: L(`Lecture du site impossible : ${short((e as Error).message, 200)}. Demandez des captures ou les fichiers au client.`, "Site could not be read.") }; }
    const contact = Object.fromEntries(Object.entries({ phone: site.contact.phone, email: site.contact.email, address: site.contact.address, hours: site.contact.hours }).filter(([, v]) => !!v)) as Record<string, string>;
    const imported = {
      url: site.finalUrl || site.url, name: site.name || undefined, tagline: site.tagline || undefined, logoSrc: site.logo?.src,
      colors: (site.colorsFound ?? []).slice(0, 6), fonts: site.fonts.all.slice(0, 4), business: site.business,
      products: site.products.length, pages: site.pages.length, contact, socials: site.contact.socials, warnings: site.warnings.slice(0, 5),
    };
    const existing = [
      site.name && `nom « ${site.name} »`, site.tagline && `slogan « ${site.tagline} »`, site.logo?.src && "un logo",
      imported.colors.length && `couleurs ${imported.colors.join(" ")}`, imported.fonts.length && `polices ${imported.fonts.join(", ")}`,
      `site ${imported.url}`, Object.keys(site.contact.socials).length && `réseaux ${Object.keys(site.contact.socials).join(", ")}`,
    ].filter(Boolean).join(", ");
    const j = updateJourney(ctx.conversationId, (j) => {
      j.imported = [...j.imported.filter((s) => s.url !== imported.url), imported];
      const at = Date.now();
      if (!j.start.existing) j.start.existing = { value: existing, status: "answered", source: "site", at };
      if (!j.start.contact && Object.keys(contact).length) j.start.contact = { value: Object.entries(contact).map(([k, v]) => `${k} : ${v}`).join(" ; "), status: "answered", source: "site", at };
      if (!j.start.business) j.start.business = { value: site.business, status: "answered", source: "site", at };
    });
    if (ctx.projectId) remember(ctx.projectId, { kind: "artifact", key: "site_import", value: JSON.stringify(site), source: "link", status: "confirmed" });
    return {
      ok: true,
      summary: L(`Site lu : ${existing}. ${site.products.length} produit(s), ${site.pages.length} page(s).${site.warnings.length ? ` Limites : ${site.warnings.slice(0, 2).join(" ; ")}` : ""}`, "Site read."),
      data: { ...imported, aDemander: missingFields(j) },
      changes: [{ module: "parcours", object: "existant lu", summary: short(existing, 200), after: imported, verified: true }],
    };
  },
};

const keepTool: AgentTool<any> = {
  name: "start.keep", module: "parcours", kind: "write",
  description: `Mode refonte : enregistre ce que le client garde TEL QUEL (jamais redessiné ni réécrit ensuite) parmi ${KEEPABLE.join(", ")} ; tout le reste sera recréé. keep: [] si le client veut tout recréer. logoAttachmentId : pièce jointe qui est le logo du client (s'il garde son logo et l'a joint). Gratuit.`,
  args: z.object({ keep: z.array(z.enum(KEEPABLE)).max(KEEPABLE.length), note: z.string().max(1000).optional(), logoAttachmentId: z.string().max(40).optional() }).strict(),
  run: (ctx, a: { keep: (typeof KEEPABLE)[number][]; note?: string; logoAttachmentId?: string }) => {
    if (a.logoAttachmentId && !ctx.attachment(a.logoAttachmentId)) return { ok: false, summary: L("Pièce jointe du logo introuvable dans ce fil.", "Logo attachment not found.") };
    const before = journeyOf(ctx.conversationId).keep;
    const j = updateJourney(ctx.conversationId, (j) => {
      j.keep = [...new Set(a.keep)];
      j.mode = j.keep.length ? "refonte" : "creation";
      j.start.keep = { value: j.keep.length ? `${j.keep.join(", ")}${a.note ? ` — ${a.note}` : ""}` : "rien, tout recréer", status: "answered", source: "client", at: Date.now() };
      (j as any).logoAttachmentId = a.logoAttachmentId ?? (j as any).logoAttachmentId;
    });
    return { ok: true, summary: L(j.keep.length ? `À garder tel quel : ${j.keep.join(", ")} ; le reste sera recréé.` : "Tout sera recréé.", "Keep list saved."), data: { mode: j.mode, keep: j.keep }, changes: [{ module: "parcours", object: "à garder", summary: j.keep.join(", ") || "rien", before, after: j.keep, verified: true }] };
  },
};

const LINK = /https?:\/\/[^\s)>"']+/gi;
/** Liens cités dans une réponse, sans la ponctuation qui les suit (« …fr, pas… »). */
const linksIn = (s: string) => (s.match(LINK) ?? []).map((u) => u.replace(/[.,;:!?»]+$/, ""));

/** Logo gardé : pièce jointe désignée, sinon logo du site lu ; rangé comme logo fourni par le client. */
async function keepLogo(ctx: ToolContext, j: Journey): Promise<string | null> {
  const pid = ctx.projectId!;
  const existing = one<{ id: string }>("SELECT id FROM assets WHERE project_id=? AND role='logo' AND origin='upload' AND deleted_at IS NULL ORDER BY created_at DESC", pid);
  if (existing) return existing.id;
  const aid = (j as any).logoAttachmentId as string | undefined;
  const at = aid ? attachmentsOf(ctx.conversationId).find((x) => x.id === aid && x.kind === "image") : null;
  if (at) {
    const data = fs.readFileSync(at.path);
    const a = await saveAsset({ projectId: pid, userId: ctx.user.id, name: at.name, mime: at.mime, data, role: "logo", origin: "upload", meta: { kept: "refonte", synaAttachment: aid } });
    return a.id;
  }
  const src = j.imported.find((s) => s.logoSrc)?.logoSrc;
  if (!src) return null;
  const img = await downloadSiteImage(src, startDeps.fetchImpl);
  if (!img) return null;
  const png = await logoToPng(img.data, img.mime);
  const a = await saveAsset({ projectId: pid, userId: ctx.user.id, name: "logo-client.png", mime: "image/png", data: png, role: "logo", origin: "upload", meta: { kept: "refonte", source: src } });
  return a.id;
}

const confirmTool: AgentTool<{}> = {
  name: "start.confirm", module: "parcours", kind: "write",
  description: "À appeler UNIQUEMENT après que le client a confirmé le résumé « Voici ce que j'ai compris ». Valide l'étape 0 : reporte la fiche dans le projet (cible, consignes, description, liens, photos jointes), garde tel quel ce que le client a choisi de garder (logo rangé comme logo du client), mémorise la décision et passe à l'étape 1. Refusé s'il manque une réponse indispensable. Gratuit.",
  args: z.object({}).strict(),
  run: async (ctx) => {
    const j0 = journeyOf(ctx.conversationId);
    const missing = REQUIRED_FIELDS.filter((f) => j0.start[f]?.status !== "answered");
    if (missing.length) return { ok: false, summary: L(`Il manque encore : ${missing.map((f) => FIELD_LABEL[f].fr).join(", ")}.`, `Still missing: ${missing.join(", ")}.`) };
    const open = missingFields(j0);
    if (open.length) return { ok: false, summary: L(`Questions pas encore posées : ${open.map((f) => FIELD_LABEL[f].fr).join(", ")}. Posez-les (le client peut répondre « plus tard »).`, "Some questions were not asked yet.") };
    const pid = await ensureProject(ctx, j0);
    if (!pid) return { ok: false, summary: L("Le projet n'a pas pu être créé (aucun abonnement libre ?).", "Project could not be created.") };
    const p = loadProject(pid);
    const v = (f: StartField) => (j0.start[f]?.status === "answered" ? j0.start[f]!.value : "");
    // Photos jointes au fil, rangées dans la bibliothèque : enfin transmises à l'analyse (défaut corrigé).
    const photoIds = all<{ asset_id: string }>("SELECT asset_id FROM syna_attachments WHERE conversation_id=? AND asset_id IS NOT NULL AND kind='image'", ctx.conversationId).map((r) => r.asset_id);
    const urls = [...new Set([...j0.imported.map((s) => s.url), ...linksIn(v("taste")), ...linksIn(v("existing"))])].slice(0, 10);
    const constraints = [
      v("market") && `Où : ${v("market")}`, v("price") && `Prix : ${v("price")}`, v("difference") && `Ce qui le rend différent : ${v("difference")}`,
      v("taste") && `Goûts : ${v("taste")}`, v("platform") && `Plateforme : ${v("platform")}`, v("contact") && `Coordonnées : ${v("contact")}`,
      j0.keep.length && `Refonte : garder tel quel ${j0.keep.join(", ")} ; tout le reste est recréé.`,
    ].filter(Boolean).join("\n");
    const st = stateOf(pid);
    if (st) {
      const old = (st.stages as any).brief?.data?.input ?? {};
      const kept = j0.imported[0];
      editBrief(pid, st.revision, {
        ...old,
        business: (v("business") as "products" | "services") || p.business,
        description: v("offer") || old.description || "",
        offerName: old.offerName || p.product.name || p.name,
        brandName: j0.keep.includes("nom") && kept?.name ? kept.name : (old.brandName ?? ""),
        target: v("audience"),
        constraints,
        photoIds: [...new Set([...(old.photoIds ?? []), ...photoIds])],
        referenceUrls: urls,
        price: v("price") || old.price || "",
        services: old.services ?? p.services,
      });
    }
    const logoId = j0.keep.includes("logo") ? await keepLogo(ctx, j0) : null;
    remember(pid, { kind: "decision", key: "syna.depart", value: `Étape 0 validée par le client. ${j0.mode === "refonte" ? `Refonte : garder tel quel ${j0.keep.join(", ")}.` : "Création complète."}`, source: "user" } as any);
    if (j0.keep.length) remember(pid, { kind: "decision", key: "syna.garder", value: j0.keep.join(", "), source: "user" } as any);
    const j = updateJourney(ctx.conversationId, (j) => { setStep(j, 0, "done"); setStep(j, 1, "todo"); });
    return {
      ok: true,
      summary: L(`Étape 0 validée : tout ce que tu as dit est reporté dans ton projet${j0.keep.length ? ` ; gardé tel quel : ${j0.keep.join(", ")}${j0.keep.includes("logo") ? (logoId ? " (logo rangé)" : " (logo introuvable : envoie-moi le fichier)") : ""}` : ""}. Prochaine étape : les 3 identités de marque.`, "Step 0 validated."),
      data: { etapeEnCours: currentStep(j), photos: photoIds.length, liens: urls, logo: logoId },
      changes: [{ module: "parcours", object: "étape 0", summary: "validée par le client", before: "doing", after: "done", verified: true }],
    };
  },
};

export const startTools: AgentTool[] = [stateTool, answerTool, importTool, keepTool, confirmTool];
