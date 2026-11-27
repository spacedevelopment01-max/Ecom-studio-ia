/**
 * Faire connaissance (repère 0 du parcours) : la fiche du client (sujets abordés un à un, jamais redemandés), ses
 * notes libres, la lecture gratuite d'un existant (son site) et le mode « refonte » (ce qu'il garde tel quel).
 * Aucun appel d'IA payant ici. Rien n'est enregistré que le client n'ait dit lui-même.
 */
import { z } from "zod";
import fs from "node:fs";
import { all, one, run } from "../../db";
import { L } from "../../i18n-server";
import { loadProject, remember, saveServices } from "../../projects";
import type { ContactMode } from "../../project-types";
import { saveAsset } from "../../library";
import { editBrief } from "../../preparation/engine";
import { stateOf } from "../../preparation/store";
import { importSite, downloadSiteImage, logoToPng, type SiteFetcher } from "../../engine/site-import";
import type { AgentTool, ToolContext } from "../types";
import { attachmentsOf } from "../attachments";
import {
  FIELD_LABEL, JOURNEY_STEPS, KEEPABLE, REQUIRED_FIELDS, START_FIELDS, currentStep, journeyOf, missingFields,
  TOPICS, setStep, updateJourney, type FieldAnswer, type Journey, type StartField,
} from "../journey";
import { short } from "./common";
import { companyFromText, saveCompany } from "../activity";
import { addWordingRule, loadWordingRules } from "../../client-wording";
import { GENRES, PORTEES, addNotes, ficheOf, type Genre, type Portee } from "../fiche";
import {
  CHOIX_DES_FAITS, DIT_NE_MONTRE_PAS, DIT_NE_SAIT_PAS, ETATS_DU_FAIT, SUJET_MAX, enregistrerLesFaits, faitsAAborder, faitsDuFil, libelleDuSujet, lignesDesFaits,
  nomsDonnes, plat, sujetsDuParcours, type EtatDuFait, type FaitAMontrer,
} from "../faits-a-montrer";

const words = (t: string) => new Set(t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().match(/[a-z]{4,}|\d+/g) ?? []);
/** Ce que le client a écrit depuis la dernière réponse de SINA, et le sujet que cette réponse demandait. */
function lastSaid(conversationId: string): { said: string; askField?: string } | null {
  const lastAssistant = one<{ seq: number; content_json: string }>("SELECT seq, content_json FROM syna_messages WHERE conversation_id=? AND role='assistant' AND seq < (SELECT MAX(seq) FROM syna_messages WHERE conversation_id=? AND role='user') ORDER BY seq DESC LIMIT 1", conversationId, conversationId);
  const mine = all<{ content_json: string }>("SELECT content_json FROM syna_messages WHERE conversation_id=? AND role='user' AND seq > ? ORDER BY seq", conversationId, lastAssistant?.seq ?? -1);
  if (!mine.length) return null;
  const text = (j: string) => { try { return String(JSON.parse(j)?.text ?? ""); } catch { return ""; } };
  let askField: string | undefined;
  try { askField = lastAssistant ? JSON.parse(lastAssistant.content_json)?.askField : undefined; } catch { /* message illisible */ }
  return { said: mine.map((m) => text(m.content_json)).join("\n"), askField };
}
/**
 * Une réponse que le client n'a PAS donnée n'est jamais enregistrée. Toujours permis : le sujet que SINA venait de
 * demander, et le genre d'activité (produits ou services), qu'elle déduit. Sinon, un mot au moins de la valeur doit se
 * trouver dans ce que le client vient d'écrire. Rend les valeurs refusées.
 */
/** Ce que le client a écrit depuis la dernière réponse de SINA (null : rien encore, aucun message du client). */
export const lastSaidText = (conversationId: string): string | null => lastSaid(conversationId)?.said ?? null;
export function unsaid<T extends { value: string }>(conversationId: string, items: T[], allowed: (x: T, askField?: string) => boolean = () => false): T[] {
  const last = lastSaid(conversationId);
  if (!last) return [];
  const heard = words(last.said);
  return items.filter((x) => !allowed(x, last.askField) && ![...words(x.value)].some((w) => heard.has(w)));
}

/** Lecteur de site remplaçable par les tests (aucun réseau). */
export const startDeps: { fetchImpl?: SiteFetcher } = {};

const view = (j: Journey, cid: string) => ({
  etapeEnCours: currentStep(j),
  etapes: JOURNEY_STEPS.map((s) => ({ n: s.n, nom: s.fr, statut: j.steps[s.n]?.status ?? "todo" })),
  fiche: Object.fromEntries(START_FIELDS.filter((f) => j.start[f]).map((f) => [f, j.start[f]])),
  sujetsPasEncoreAbordes: missingFields(j).map((f) => ({ champ: f, aApprendre: TOPICS[f](j).fr })),
  notes: ficheOf(cid).notes,
  faitsAMontrer: faitsDuFil(cid),
  faitsPasEncoreDemandes: faitsAAborder(j, faitsDuFil(cid)).map((x) => ({ sujet: x.sujet, aDemander: x.question, ...(x.produits ? { pour: x.produits } : {}) })),
  mode: j.mode, aGarder: j.keep,
  existantLu: j.imported,
});

/** Petits mots qui ne finissent jamais un titre (« … que je coule à la ») : retirés de la fin, ainsi que la suite d'une phrase. */
const MOTS_DE_LIAISON = /\s+(?:à|a|au|aux|de|du|des|d'|d’|la|le|les|l'|l’|un|une|et|ou|en|pour|par|avec|sans|sur|sous|dans|chez|que|qui|dont|où|je|j'|j’|nous|on|mon|ma|mes|son|sa|ses|très|plus)$/i;
/** La longueur au-delà de laquelle le titre du projet est raccourci. */
export const TITRE_MAX = 40;
/**
 * Nom provisoire tiré des mots du client (« Coach sportif. Séances… » → « Coach sportif »). Montré au client comme titre
 * de son projet : jamais « (provisoire) » (essai réel de Nadia, 23 novembre 2026 : « Bougies parfumées que je coule à la
 * (provisoire) »). Une phrase longue s'arrête avant sa suite (« que », « qui », « dont », « où ») ; sinon le titre se coupe
 * à un mot entier, sans petit mot de liaison au bout.
 */
export function provisionalName(offer: string): string {
  const head = offer.trim().split(/[.,;:!?\n(]/)[0].trim().replace(/^(je suis|je fais|je vends|je propose|c'est|nous sommes|nous faisons|on est|on fait)\s+/i, "").replace(/^(de la|de l'|du|des|un|une|le|la|les|l')\s*/i, "").replace(/\s+/g, " ");
  let short = head;
  if (short.length > TITRE_MAX) {
    // La suite d'une phrase (« bougies parfumées que je coule à la main ») n'est pas le nom : on garde ce qui la précède.
    const avant = short.split(/\s+(?:que|qu'|qu’|qui|dont|où)\s+/i)[0].trim();
    if (avant.length >= 3 && avant.length < short.length) short = avant;
  }
  // Coupe à un mot entier : jamais au milieu d'un mot (un titre de 40 signes pile reste entier).
  if (short.length > TITRE_MAX) short = (short.slice(0, TITRE_MAX + 1).match(/^(.*\S)\s/)?.[1] ?? short.slice(0, TITRE_MAX)).trim();
  for (let i = 0; i < 4 && MOTS_DE_LIAISON.test(short); i++) short = short.replace(MOTS_DE_LIAISON, "").trim();
  // Une phrase qui commence encore par « je … » n'est pas un nom (essai réel du 14 novembre 2026 : « Je répare les
  // crevaisons ») : nom neutre, en attendant la marque.
  if (/^(je|j'|j’|nous|on)\b/i.test(short)) return L("Mon projet", "My project");
  return (short || L("Mon projet", "My project")).replace(/^./, (c) => c.toUpperCase());
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

/** Retire les identifiants techniques (pièce jointe, projet…) d'un texte montré au client. */
export const withoutIds = (s: string) => s.replace(/\b(?:pi[eè]ce(?: jointe)?|fichier|id)\s*:?\s*[a-z0-9]{12,}\b\s*:?\s*/gi, "").replace(/\b(?=[a-z0-9]*\d)[a-z0-9]{16}\b/g, "").replace(/\(\s*\)/g, "").replace(/\(\s+/g, "(").replace(/ {2,}/g, " ").replace(/\s+\./g, ".").trim();

const stateTool: AgentTool<{}> = {
  name: "start.state", module: "parcours", kind: "read",
  description: "Lit le parcours et la fiche du client : ce qu'il a déjà dit (avec la source : client, site lu, formulaire, photo), ses notes (faits, goûts, refus, avec leur portée), les sujets pas encore abordés, le mode (création ou refonte) et ce qu'il faut garder tel quel. Gratuit, utilisable avant la création du projet.",
  args: z.object({}).strict(),
  run: (ctx) => ({ ok: true, summary: L("Parcours relu.", "Journey read."), data: view(journeyOf(ctx.conversationId), ctx.conversationId) }),
};

const answerTool: AgentTool<any> = {
  name: "start.answer", module: "parcours", kind: "write",
  description: "Enregistre dans la fiche ce que le client vient de dire, sur un ou plusieurs sujets : business (« products » ou « services »), offer, existing, audience, image (image voulue, couleurs ou styles refusés), setup (boutique : nombre de produits au lancement ; services : façon d'être contacté), market, price, difference, taste, photos (en a-t-il, les a-t-il envoyées), language (français seul, ou français et anglais), contact, platform (shopify, woocommerce, prestashop ou « à décider »). Ses mots, sans rien ajouter. Un sujet qu'il n'a pas abordé est refusé : pose-lui la question. status « later » seulement s'il dit répondre plus tard (refusé pour business, offer, audience) ; « none » seulement s'il dit n'avoir rien à dire. Une réponse connue se corrige s'il la change. Gratuit, utilisable avant la création du projet.",
  args: z.object({
    answers: z.array(z.object({
      field: z.enum(START_FIELDS.filter((f) => f !== "keep") as [StartField, ...StartField[]]),
      value: z.string().max(4000).default(""),
      status: z.enum(["answered", "later", "none"]).default("answered"),
    })).min(1).max(START_FIELDS.length),
  }).strict(),
  run: async (ctx, a: { answers: { field: StartField; value: string; status: FieldAnswer["status"] }[] }) => {
    for (const x of a.answers) {
      if (x.status !== "answered" && REQUIRED_FIELDS.includes(x.field)) return { ok: false, summary: L(`« ${FIELD_LABEL[x.field].fr} » est indispensable : il faut une réponse maintenant.`, `"${FIELD_LABEL[x.field].en}" is required now.`) };
      if (x.status === "answered" && !x.value.trim()) return { ok: false, summary: L(`Réponse vide pour « ${FIELD_LABEL[x.field].fr} ».`, "Empty answer.") };
      if (x.field === "business" && x.status === "answered" && !["products", "services"].includes(x.value.trim())) return { ok: false, internal: true, summary: L("business vaut « products » ou « services ».", "business is \"products\" or \"services\".") };
    }
    // « Plus tard » et « rien » se jugent sur ce qu'il a écrit : la valeur est alors souvent vide.
    const refused = unsaid(ctx.conversationId, a.answers.map((x) => ({ ...x, value: x.status === "answered" ? x.value : `${x.value} plus tard rien aucun aucune pas encore sais non` })), (x, asked) => x.field === "business" || x.field === asked);
    if (refused.length) return { ok: false, internal: true, summary: L(`${refused.map((x) => `« ${FIELD_LABEL[x.field].fr} »`).join(", ")} : le client ne l'a pas dit dans son dernier message. Pose-lui la question au lieu de répondre à sa place, et n'enregistre que ce qu'il a dit.`, "The client did not say this: ask instead of answering for them.") };
    const before = journeyOf(ctx.conversationId).start;
    const j = updateJourney(ctx.conversationId, (j) => {
      for (const x of a.answers) j.start[x.field] = { value: withoutIds(x.value), status: x.status, source: "client", at: Date.now() };
      if (j.steps[0]?.status === "todo") setStep(j, 0, "doing");
    });
    const next = missingFields(j);
    const created = !ctx.projectId ? await ensureProject(ctx, j) : null;
    return {
      ok: true,
      summary: L(`${a.answers.map((x) => FIELD_LABEL[x.field].fr).join(", ")} : c'est noté.${created ? " Ton projet est créé." : ""}${next.length ? "" : " Tout est renseigné."}`, "Saved."),
      data: { sujetsPasEncoreAbordes: next },
      changes: a.answers.map((x) => ({ module: "parcours", object: `fiche de départ · ${FIELD_LABEL[x.field].fr}`, summary: x.status === "answered" ? short(x.value, 160) : x.status === "later" ? "plus tard" : "rien", before: before[x.field] ?? null, after: j.start[x.field], verified: true })),
    };
  },
};

const noteTool: AgentTool<any> = {
  name: "start.note", module: "parcours", kind: "write",
  description: "Note dans la fiche, à toute étape, ce que le client vient de dire hors des sujets de départ : un fait (histoire, concurrents, réseaux, fabrication, déroulé d'une prestation, diplômes ou garanties, horaires, preuves, attentes des prochains mois…), ce qu'il aime ou ce qu'il refuse. sujet : quelques mots (le même sujet remplace la note précédente : il a changé d'avis) ; value : ses mots exacts, rien d'ajouté ni reformulé ; genre : « fait », « aime » ou « refuse » ; portee : « tout », « marque », « logo », « images », « site », « publications » ou « publicites » (en cas de doute : « tout »). Refusé s'il ne l'a pas dit dans son dernier message. Sa fiche est relue en entier avant chaque création. Gratuit, utilisable avant la création du projet.",
  args: z.object({ notes: z.array(z.object({ sujet: z.string().min(2).max(80), value: z.string().min(2).max(2000), genre: z.enum(GENRES).default("fait"), portee: z.enum(PORTEES).default("tout") })).min(1).max(8) }).strict(),
  run: (ctx, a: { notes: { sujet: string; value: string; genre: Genre; portee: Portee }[] }) => {
    const refused = unsaid(ctx.conversationId, a.notes);
    if (refused.length) return { ok: false, internal: true, summary: L(`${refused.map((x) => `« ${x.sujet} »`).join(", ")} : le client ne l'a pas dit dans son dernier message. Note seulement ce qu'il a dit, avec ses mots.`, "The client did not say this.") };
    const f = addNotes(ctx.conversationId, a.notes.map((n) => ({ ...n, value: withoutIds(n.value) })));
    return { ok: true, summary: L(`Noté dans sa fiche : ${a.notes.map((n) => n.sujet).join(", ")}.`, "Noted."), data: { notes: f.notes.length }, changes: a.notes.map((n) => ({ module: "parcours", object: `fiche · ${n.sujet}`, summary: short(n.value, 160), after: { value: n.value, genre: n.genre, portee: n.portee }, verified: true })) };
  },
};

/**
 * LES FAITS À MONTRER (27 novembre 2026, `faits-a-montrer.ts`) : ce que le client vient de dire d'un fait que ses images et
 * son site peuvent écrire. Le même garde-fou que ses autres réponses : rien qui ne soit dans son dernier message ;
 * « je ne sais pas » et « je préfère ne pas le montrer » ne s'enregistrent que s'il les a dits (ou cliqués).
 */
const faitTool: AgentTool<any> = {
  name: "start.fait", module: "parcours", kind: "write",
  description: `Enregistre un fait à montrer (sujets : « Faits à montrer pas encore demandés » du parcours). sujet : sa clé ; noms (sujet « noms ») : ses noms exacts, un par élément ; produit : le nom exact concerné (absent : vaut pour tous) ; valeur : ses mots exacts ; etat : « donne » (pour la ville : il accepte de la montrer), « ne_sait_pas » (« ${CHOIX_DES_FAITS.ne_sait_pas} ») ou « ne_montre_pas » (« ${CHOIX_DES_FAITS.ne_montre_pas} »). Refusé s'il ne l'a pas dit dans son dernier message. Gratuit.`,
  args: z.object({ faits: z.array(z.object({
    sujet: z.string().min(2).max(SUJET_MAX),
    produit: z.string().min(1).max(120).optional(),
    valeur: z.string().max(600).optional(),
    noms: z.array(z.string().min(1).max(120)).max(30).optional(),
    etat: z.enum(ETATS_DU_FAIT).default("donne"),
  })).min(1).max(12) }).strict(),
  run: (ctx, a: { faits: { sujet: string; produit?: string; valeur?: string; noms?: string[]; etat: EtatDuFait }[] }) => {
    const j = journeyOf(ctx.conversationId), sujets = sujetsDuParcours(j);
    if (!sujets.length) return { ok: false, internal: true, summary: L("Les faits à montrer se demandent une fois son activité et son offre connues.", "Ask these once the business and offer are known.") };
    const avant = faitsDuFil(ctx.conversationId);
    const nomsApres = a.faits.find((x) => x.sujet === "noms" && x.etat === "donne")?.noms ?? nomsDonnes(avant);
    for (const x of a.faits) {
      const s = sujets.find((y) => y.sujet === x.sujet);
      if (!s) return { ok: false, internal: true, summary: L(`« ${x.sujet} » n'est pas un sujet de son métier : ${sujets.map((y) => y.sujet).join(", ")}.`, "Unknown subject.") };
      if (x.sujet === "noms" && x.etat === "donne" && !(x.noms ?? []).some((n) => n.trim())) return { ok: false, internal: true, summary: L("noms : donne la liste de ses noms exacts, un par élément.", "Give the exact names.") };
      if (x.etat === "donne" && x.sujet !== "noms" && !x.valeur?.trim()) return { ok: false, internal: true, summary: L(`« ${libelleDuSujet(x.sujet)} » : sa réponse est vide.`, "Empty answer.") };
      if (s.portee === "marque" && x.produit) return { ok: false, internal: true, summary: L(`« ${libelleDuSujet(x.sujet)} » vaut pour la marque : sans produit.`, "Brand-level subject: no product.") };
      if (x.produit && !nomsApres.some((n) => plat(n.trim()) === plat(x.produit!.trim()))) return { ok: false, internal: true, summary: L(`« ${x.produit} » n'est pas l'un de ses noms donnés (${nomsApres.map((n) => `« ${n} »`).join(", ") || "aucun encore"}) : demande d'abord les noms exacts.`, "Unknown product.") };
    }
    // Le garde-fou : ses mots, dans son dernier message.
    const dit = lastSaidText(ctx.conversationId);
    if (dit != null) {
      const refuses = a.faits.filter((x) => x.etat === "ne_sait_pas" ? !DIT_NE_SAIT_PAS.test(dit) : x.etat === "ne_montre_pas" ? !DIT_NE_MONTRE_PAS.test(dit) : false);
      const valeurs = a.faits.filter((x) => x.etat === "donne").flatMap((x) => (x.sujet === "noms" ? (x.noms ?? []) : [x.valeur ?? ""]).map((value) => ({ value, sujet: x.sujet })));
      const pasDits = unsaid(ctx.conversationId, valeurs);
      if (refuses.length || pasDits.length) return { ok: false, internal: true, summary: L(`${[...new Set([...refuses.map((x) => x.sujet), ...pasDits.map((x) => x.sujet)])].map((x) => `« ${libelleDuSujet(x)} »`).join(", ")} : le client ne l'a pas dit dans son dernier message. Pose-lui la question, et n'enregistre que ce qu'il a dit, avec ses mots.`, "The client did not say this.") };
    }
    const apres = enregistrerLesFaits(ctx.conversationId, a.faits.map((x) => ({
      sujet: x.sujet, ...(x.produit ? { produit: x.produit.trim() } : {}), etat: x.etat,
      ...(x.sujet === "noms" && x.etat === "donne" ? { noms: (x.noms ?? []).map((n) => withoutIds(n).trim()).filter(Boolean) } : {}),
      ...(x.valeur?.trim() ? { valeur: withoutIds(x.valeur).trim() } : {}),
    } as Omit<FaitAMontrer, "at">)));
    const reste = lignesDesFaits(j, apres).restent;
    return {
      ok: true,
      summary: L(`Noté dans sa fiche : ${a.faits.map((x) => `${libelleDuSujet(x.sujet)}${x.produit ? ` de « ${x.produit} »` : ""}`).join(", ")}.${reste.length ? "" : " Tous les faits à montrer sont demandés."}`, "Noted."),
      data: { faitsPasEncoreDemandes: reste.map((x) => ({ sujet: x.sujet, ...(x.produits ? { pour: x.produits } : {}) })) },
      changes: a.faits.map((x) => ({ module: "parcours", object: `fiche · fait à montrer · ${libelleDuSujet(x.sujet)}${x.produit ? ` · ${x.produit}` : ""}`, summary: x.etat === "donne" ? short(x.sujet === "noms" ? (x.noms ?? []).join(" ; ") : x.valeur ?? "", 160) : x.etat === "ne_sait_pas" ? "il ne sait pas" : "à ne pas montrer", after: x, verified: true })),
    };
  },
};

const wordingTool: AgentTool<any> = {
  name: "client.wording", module: "parcours", kind: "write", needsProject: true,
  description: "Retient pour toujours un mot que le client corrige : le mot à ne plus employer (avoid) et celui qu'il veut à la place (use). À appeler dès qu'il dit « ne dis pas X, dis Y », ou qu'il reprend un mot que tu as employé. Tous les textes créés ensuite (site, publications, publicités) le respectent. Gratuit.",
  args: z.object({ avoid: z.string().min(2).max(60), use: z.string().min(1).max(60), note: z.string().max(200).optional() }).strict(),
  run: (ctx, a: { avoid: string; use: string; note?: string }) => {
    const before = loadWordingRules(ctx.projectId!);
    const after = addWordingRule(ctx.projectId!, { avoid: a.avoid, use: a.use, ...(a.note ? { note: a.note } : {}) });
    return { ok: true, summary: L(`Retenu : « ${a.use} », jamais « ${a.avoid} ».`, "Wording saved."), data: { regles: after.length }, changes: [{ module: "parcours", object: "vocabulaire du client", summary: `« ${a.avoid} » → « ${a.use} »`, before: before.length, after: after.length, verified: true }] };
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
    if (BLOCKING_HOSTS.test(host)) return { ok: false, summary: L(`${host} ne se laisse pas lire automatiquement.`, `${host} can't be read automatically.`), hint: "Demande au client des captures d'écran de sa page, ou ses photos et son logo en pièces jointes." };
    let site;
    try { site = await importSite(a.url, { maxPages: 12, fetchImpl: startDeps.fetchImpl }); }
    catch (e) { return { ok: false, summary: L(`Lecture du site impossible : ${short((e as Error).message, 200)}.`, "Site could not be read."), hint: "Demande des captures ou les fichiers au client." }; }
    const contact = Object.fromEntries(Object.entries({ phone: site.contact.phone, email: site.contact.email, address: site.contact.address, hours: site.contact.hours }).filter(([, v]) => !!v)) as Record<string, string>;
    const imported = {
      url: site.finalUrl || site.url, name: site.name || undefined, tagline: site.tagline || undefined, logoSrc: site.logo?.src,
      colors: (site.colorsFound ?? []).slice(0, 6), fonts: site.fonts.all.slice(0, 4), business: site.business,
      products: site.products.length, pages: site.pages.length, contact, socials: site.contact.socials, warnings: site.warnings.slice(0, 5),
    };
    const existing = [
      site.name && `nom « ${site.name} »`, site.tagline && site.tagline.length <= 90 && `slogan « ${site.tagline} »`, site.logo?.src && "un logo",
      imported.colors.length && `${imported.colors.length} couleurs`, imported.fonts.length && `polices ${imported.fonts.join(", ")}`,
      `site ${imported.url}`, Object.keys(site.contact.socials).length && `réseaux ${Object.keys(site.contact.socials).join(", ")}`,
    ].filter(Boolean).join(", ");
    const j = updateJourney(ctx.conversationId, (j) => {
      j.imported = [...j.imported.filter((s) => s.url !== imported.url), imported];
      const at = Date.now();
      if (!j.start.existing) j.start.existing = { value: existing, status: "answered", source: "site", at };
      if (!j.start.contact && Object.keys(contact).length) j.start.contact = { value: Object.entries(contact).map(([k, v]) => `${k} : ${v}`).join(" ; "), status: "answered", source: "site", at };
      // Le type d'activité deviné à partir d'un site n'est pas fiable (essai réel : un plâtrier classé « boutique ») :
      // il n'est jamais prérempli, SINA le demande toujours au client.
    });
    if (ctx.projectId) remember(ctx.projectId, { kind: "artifact", key: "site_import", value: JSON.stringify(site), source: "link", status: "confirmed" });
    return {
      ok: true,
      summary: L(`Site lu : ${existing}. ${site.pages.length} page${site.pages.length > 1 ? "s" : ""}${site.products.length ? `, ${site.products.length} produit${site.products.length > 1 ? "s" : ""}` : ""}.`, "Site read."),
      data: { ...imported, sujetsPasEncoreAbordes: missingFields(j) },
      changes: [{ module: "parcours", object: "existant lu", summary: short(existing, 200), after: imported, verified: true }],
    };
  },
};

const keepTool: AgentTool<any> = {
  name: "start.keep", module: "parcours", kind: "write",
  description: `Mode refonte : enregistre ce que le client garde TEL QUEL (jamais redessiné ni réécrit) parmi ${KEEPABLE.join(", ")} ; le reste sera recréé. keep: [] s'il veut tout recréer. logoAttachmentId : la pièce jointe qui est son logo (s'il le garde et l'a joint). name / slogan : textes EXACTS du nom et du slogan existants (tels qu'il les écrit ou sur son logo). Un logo gardé qui contient le nom garde aussi ce nom : donne alors name. Gratuit.`,
  args: z.object({ keep: z.array(z.enum(KEEPABLE)).max(KEEPABLE.length), note: z.string().max(1000).optional(), logoAttachmentId: z.string().max(40).optional(), name: z.string().max(120).optional(), slogan: z.string().max(200).optional() }).strict(),
  run: (ctx, a: { keep: (typeof KEEPABLE)[number][]; note?: string; logoAttachmentId?: string; name?: string; slogan?: string }) => {
    if (a.logoAttachmentId && !ctx.attachment(a.logoAttachmentId)) return { ok: false, summary: L("Pièce jointe du logo introuvable dans ce fil.", "Logo attachment not found.") };
    const before = journeyOf(ctx.conversationId).keep;
    const j = updateJourney(ctx.conversationId, (j) => {
      // Logo gardé avec le nom dedans : le nom est gardé aussi (sinon le logo et la marque se contrediraient).
      j.keep = [...new Set([...a.keep, ...(a.keep.includes("logo") && a.name ? ["nom" as const] : [])])];
      j.keptValues = { ...(j.keptValues ?? {}), ...(a.name ? { name: a.name.trim() } : {}), ...(a.slogan ? { slogan: a.slogan.trim() } : {}) };
      j.mode = j.keep.length ? "refonte" : "creation";
      j.start.keep = { value: j.keep.length ? `${j.keep.join(", ")}${a.note ? ` — ${a.note}` : ""}` : "rien, tout recréer", status: "answered", source: "client", at: Date.now() };
      (j as any).logoAttachmentId = a.logoAttachmentId ?? (j as any).logoAttachmentId;
    });
    // Nom confirmé après la validation de l'étape 0 : le projet prend tout de suite le vrai nom de la marque.
    if (a.name && j.keep.includes("nom") && j.steps[0]?.status === "done" && ctx.projectId) {
      run("UPDATE projects SET name=? WHERE id=?", a.name.trim(), ctx.projectId);
      remember(ctx.projectId, { kind: "decision", key: "syna.nom", value: a.name.trim(), source: "user" } as any);
    }
    const named = [j.keptValues?.name && `nom « ${j.keptValues.name} »`, j.keptValues?.slogan && `slogan « ${j.keptValues.slogan} »`].filter(Boolean).join(", ");
    return { ok: true, summary: L(j.keep.length ? `À garder tel quel : ${j.keep.join(", ")}${named ? ` (${named})` : ""} ; le reste sera recréé.${a.keep.includes("logo") && a.name && !a.keep.includes("nom") ? " Ton logo contient le nom de ta marque : je garde donc aussi le nom." : ""}` : "Tout sera recréé.", "Keep list saved."), data: { mode: j.mode, keep: j.keep }, changes: [{ module: "parcours", object: "à garder", summary: j.keep.join(", ") || "rien", before, after: j.keep, verified: true }] };
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

/** Langue des contenus du projet (réglage « language » du projet), choisie à l'étape 0. */
function setProjectLanguage(pid: string, lang: "fr" | "en") {
  const row = one<{ settings_json: string | null }>("SELECT settings_json FROM projects WHERE id=?", pid);
  const st = JSON.parse(row?.settings_json ?? "{}");
  run("UPDATE projects SET settings_json=?, updated_at=? WHERE id=?", JSON.stringify({ ...st, language: lang }), Date.now(), pid);
}

/** Modes de contact reconnus dans les mots du client (services). */
export function contactModesFrom(text: string): ContactMode[] {
  // Dans l'ordre où le client les cite : le premier est le bouton principal (audit du 10 novembre 2026 : « devis en
  // ligne » donnait la réservation en premier ; « en ligne » seul n'est pas une réservation).
  const found: { mode: ContactMode; at: number }[] = [];
  const add = (mode: ContactMode, re: RegExp) => { const m = re.exec(text); if (m) found.push({ mode, at: m.index }); };
  add("booking", /r[ée]serv|rendez-vous|cr[ée]neau/i);
  add("quote", /devis/i);
  add("call", /appel|t[ée]l[ée]phone/i);
  add("form", /formulaire|e-?mail|message/i);
  return found.sort((a, b) => a.at - b.at).map((x) => x.mode);
}
/** Nombre de produits au lancement (boutique) : le premier nombre cité, en chiffres ou en lettres (« une dizaine »). */
export function productCountFrom(text: string): number | null {
  const words: Record<string, number> = { un: 1, une: 1, seul: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10, douzaine: 12, quinzaine: 15, vingtaine: 20, trentaine: 30, cinquantaine: 50, centaine: 100 };
  const m = /\d+|\b(dizaine|douzaine|quinzaine|vingtaine|trentaine|cinquantaine|centaine|un|une|seul|deux|trois|quatre|cinq|six|sept|huit|neuf|dix)\b/i.exec(text);
  if (!m) return null;
  if (/^\d+$/.test(m[0])) return Number(m[0]);
  // « une dizaine » : le nom de quantité qui suit l'article l'emporte.
  const after = /^\s*(dizaine|douzaine|quinzaine|vingtaine|trentaine|cinquantaine|centaine)\b/i.exec(text.slice(m.index + m[0].length));
  if (after) return after[1].toLowerCase() === "dizaine" ? 10 : words[after[1].toLowerCase()];
  return m[1].toLowerCase() === "dizaine" ? 10 : words[m[1].toLowerCase()];
}
/** Organisation choisie : type de boutique (un produit ou plusieurs) ou bouton principal du site de services. */
function applySetup(pid: string, business: string, setup: string) {
  if (!setup) return;
  if (business === "services") {
    const modes = contactModesFrom(setup);
    if (!modes.length) return;
    const p = loadProject(pid);
    saveServices(pid, { ...p.services, contactMode: modes[0], contactModes: modes }, p.servicesVersion);
  } else {
    const n = productCountFrom(setup);
    if (n) run("UPDATE projects SET store_type=? WHERE id=?", n <= 1 ? "mono" : "multi", pid);
  }
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
    if (open.length) return { ok: false, summary: L(`Sujets pas encore abordés avec lui : ${open.map((f) => FIELD_LABEL[f].fr).join(", ")}. Aborde-les (il peut répondre « plus tard »).`, "Some topics were not covered yet.") };
    // Les faits à montrer, avant le résumé et avant la planche de marque (27 novembre 2026) : chacun demandé une fois.
    const faits = faitsAAborder(j0, faitsDuFil(ctx.conversationId));
    if (faits.length) return { ok: false, internal: true, summary: L(`Faits à montrer pas encore demandés : ${faits.map((x) => `${x.libelle}${x.produits ? ` (pour ${x.produits.map((p) => `« ${p} »`).join(", ")})` : ""}`).join(", ")}. Demande-les un par un (il peut répondre « ${CHOIX_DES_FAITS.ne_sait_pas} » ou « ${CHOIX_DES_FAITS.ne_montre_pas} ») et enregistre-les avec start.fait.`, "Some facts were not asked yet.") };
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
      v("image") && `Image voulue : ${v("image")}`, v("setup") && `Organisation : ${v("setup")}`, v("photos") && `Photos du client : ${v("photos")}`, v("language") && `Langue du site : ${v("language")}`,
      j0.keep.length && `Refonte : garder tel quel ${j0.keep.join(", ")} ; tout le reste est recréé.`,
      ...ficheOf(ctx.conversationId).notes.map((n) => `${n.sujet} : ${n.value}`),
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
        brandName: j0.keep.includes("nom") && (j0.keptValues?.name || kept?.name) ? (j0.keptValues?.name || kept!.name!) : (old.brandName ?? ""),
        target: v("audience"),
        constraints,
        photoIds: [...new Set([...(old.photoIds ?? []), ...photoIds])],
        referenceUrls: urls,
        price: v("price") || old.price || "",
        services: old.services ?? p.services,
      });
    }
    applySetup(pid, v("business") || p.business, v("setup"));
    // Ce que le client a dit à l'étape 0 sert tout le projet, jamais redemandé (audit du 10 novembre 2026) :
    // coordonnées reconnues, plateforme de vente et langue du site.
    const fromContact = companyFromText([v("contact"), ...j0.imported.map((x) => Object.values(x.contact ?? {}).join(" "))].join("\n"));
    if (Object.keys(fromContact).length) saveCompany(pid, fromContact);
    const plat = /presta/i.test(v("platform")) ? "prestashop" : /woo|wordpress/i.test(v("platform")) ? "woocommerce" : /shopify/i.test(v("platform")) ? "shopify" : null;
    if (plat && (v("business") || p.business) !== "services") run("UPDATE projects SET platform=? WHERE id=?", plat, pid);
    const lang = v("language");
    if (/anglais|english/i.test(lang) && !/fran[çc]ais|french/i.test(lang)) setProjectLanguage(pid, "en");
    if (/anglais|english/i.test(lang) && /fran[çc]ais|french/i.test(lang)) remember(pid, { kind: "decision", key: "syna.langues", value: "Site voulu en français ET en anglais (étape 0).", source: "user" } as any);
    // Nom gardé : le projet prend le vrai nom de la marque (au lieu du nom provisoire) ; slogan gardé mot pour mot.
    const keptName = j0.keep.includes("nom") ? (j0.keptValues?.name || j0.imported[0]?.name) : undefined;
    if (keptName) run("UPDATE projects SET name=? WHERE id=?", keptName, pid);
    if (j0.keep.includes("slogan") && j0.keptValues?.slogan) remember(pid, { kind: "decision", key: "syna.slogan", value: j0.keptValues.slogan, source: "user" } as any);
    if (keptName) remember(pid, { kind: "decision", key: "syna.nom", value: keptName, source: "user" } as any);
    const logoId = j0.keep.includes("logo") ? await keepLogo(ctx, j0) : null;
    remember(pid, { kind: "decision", key: "syna.depart", value: `Étape 0 validée par le client. ${j0.mode === "refonte" ? `Refonte : garder tel quel ${j0.keep.join(", ")}.` : "Création complète."}`, source: "user" } as any);
    if (j0.keep.length) remember(pid, { kind: "decision", key: "syna.garder", value: j0.keep.join(", "), source: "user" } as any);
    const j = updateJourney(ctx.conversationId, (j) => { setStep(j, 0, "done"); setStep(j, 1, "todo"); });
    return {
      ok: true,
      summary: L(`Ta fiche est validée : tout ce que tu as dit est reporté dans ton projet${j0.keep.length ? ` ; gardé tel quel : ${j0.keep.join(", ")}${j0.keep.includes("logo") ? (logoId ? " (logo rangé)" : " (logo introuvable : envoie-moi le fichier)") : ""}` : ""}. Prochaine étape : tes identités de marque.`, "Step 0 validated."),
      data: { etapeEnCours: currentStep(j), photos: photoIds.length, liens: urls, logo: logoId },
      changes: [{ module: "parcours", object: "étape 0", summary: "validée par le client", before: "doing", after: "done", verified: true }],
    };
  },
};

export const startTools: AgentTool[] = [stateTool, answerTool, noteTool, faitTool, wordingTool, importTool, keepTool, confirmTool];
