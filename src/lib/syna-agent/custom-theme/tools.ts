/**
 * Outils SINA des THÈMES SUR MESURE (étape 6 ; décision du propriétaire du 9 novembre 2026 : « on ne va plus appeler
 * ça maquette mais thème sur mesure » ; « elle doit pouvoir tout faire sur ses thèmes et sections »).
 *  - custom.sections  : sections de la bibliothèque de la famille choisie, par rôle (gratuit) ;
 *  - custom.design    : conçoit le thème de A à Z par le Studio (payant, prix annoncé et accord d'abord) ;
 *  - custom.compose   : monte une composition DICTÉE par le client (sections choisies par lui), règles contrôlées ;
 *  - custom.build     : textes et photos du thème à la marque, en tâche de fond (payant, prix annoncé et accord d'abord) ;
 *  - custom.show      : montre le thème en vrai (pages, téléphone, désignation d'un élément) ;
 *  - custom.section   : lit le HTML d'une section avant de la modifier ;
 *  - custom.structure : ajoute, retire, déplace, remplace des sections ou des pages ;
 *  - custom.edit      : modifie une section sur demande (textes, mise en page, couleurs, élément désigné, photo du client) ;
 *  - custom.photo     : crée une photo pour une section (payant, prix annoncé et accord d'abord) ;
 *  - custom.undo      : annule la dernière modification ;
 *  - custom.choose    : enregistre le thème choisi PAR LE CLIENT.
 * Payants (carte d'accord avant) : custom.design, custom.build et custom.photo ; tout le reste est gratuit ; rien n'est publié.
 */
import { z } from "zod";
import { riskCount } from "./risk";
import { L } from "../../i18n-server";
import { all } from "../../db";
import { assetUrl, getAsset, saveAsset } from "../../library";
import { aiSiteImageHd, photoRequestMaxMicro, PUBLICATION_PROMPT_MAX_BYTES, withQuotedImageRoute } from "../../ai/media-providers";
import { budgetPctText } from "../../ai/budget-pct";
import { peopleAllowed } from "../../people-policy";
import { getRun } from "../store";
import type { AgentTool, ToolContext } from "../types";
import { project } from "../tools/common";
import { loadFamilyChoice, siteArtUniverse } from "../section-families";
import { codePhotoPrompt } from "../mockup-code/code-mockup";
import { hdAspect } from "../mockup-code/prompts";
import { imageReferences, mockupImageRoute } from "../mockup-code/tools";
import { cutoutPhoto, FOND_A_DETOURER } from "./cutout-photo";
import { authenticSection, isCutoutPhoto, familySections, libSection, onlyFor, sectionByRef, isCardSection } from "./library";
import { allSections, applyStructure, checkCustomTheme, findSection, loadConcepts, loadCustomTheme, replaceOnce, requiredPages, saveConcepts, saveCustomTheme, scopedCss, sectionHtml, undoCustomTheme, type CustomTheme, type SiteKind, type StructureOp } from "./theme";
import { listProducts } from "../../products/catalog";
import { activityPlan, companyOf } from "../activity";
import { brandBrief, siteCopyModel } from "./brand";
import { type Ambiance, DESIGN_CALLS_MAX, DESIGN_CAP_MICRO, DESIGN_OUTPUT_TOKENS, DESIGN_REVIEW_SYSTEM, DESIGN_SYSTEM, DESIGN_TYPICAL_MICRO, DesignSchema, designGaps, designPrompt, intentText, type Design } from "./design";
import { llmJson } from "../../ai/llm";
import { withTrace } from "../../ai/trace";
import { jobSpentMicro } from "../budget";
import { loadShopOffers } from "../product-features";
import { enqueue, pendingJob } from "../../jobs";
import { stateOf } from "../../preparation/store";
import { journeyOf, setStep as setJourneyStep, updateJourney as updateJourneyConv } from "../journey";
import { clientImages, CUSTOM_BRAND_JOB, examplePhotoCount, productImageIds, photoSlots, photosToCreate, SECTION_TEXT_CAP_MICRO, SITE_PLAN_CAP_MICRO, siteArtDirection, sitePhotoName, textPlacementLine, type ImagesMode } from "./brand";

/** Ce que le client voit dans le fil : l'aperçu vivant de son thème et sa composition. */
export function themeCard(projectId: string, t: CustomTheme) {
  const desc = (uid: string, id: string) => { const l = libSection(id); return { uid, titre: l?.title ?? id, role: l?.role ?? "?" }; };
  return {
    href: `/api/projects/${projectId}/custom-theme?studio=1&embed=1&rev=${t.rev}`,
    boutique: `/studio/${projectId}/boutique`,
    open: `/api/projects/${projectId}/custom-theme?rev=${t.rev}`,
    rev: t.rev, famille: t.family, style: t.style, choisi: !!t.chosen,
    enTete: t.header ? desc(t.header.uid, t.header.id) : null, piedDePage: t.footer ? desc(t.footer.uid, t.footer.id) : null, recherche: t.search ? desc(t.search.uid, t.search.id) : null,
    pages: t.pages.map((p) => ({ key: p.key, label: p.label, sections: p.sections.map((s) => ({ ...desc(s.uid, s.id), textesClient: !!s.clientTexts, retouchee: !!(s.html || s.css) })) })),
    aRevoir: checkCustomTheme(t).map((x) => `${x.level} : ${x.text}`),
    // Photos d'exemple encore à remplacer (essai du 9 novembre : SINA les devinait au nom des fichiers, à tort).
    photosExemple: photoSlots(t).slice(0, 60).map((x) => `${x.place} › ${x.section} › ${x.file}`),
  };
}
const ref = (r: string) => {
  const l = sectionByRef(r);
  if (!l) throw new Error(`section « ${r} » absente de la bibliothèque (custom.sections pour la liste)`);
  return l.id;
};
/** Genre de site du projet : produits ou services, et nombre de produits (une page Boutique dès qu'il y en a plusieurs). */
export function siteKind(ctx: ToolContext): SiteKind {
  const p = project(ctx);
  let list: ReturnType<typeof listProducts> = [];
  try { list = listProducts(p.id); } catch { /* catalogue absent */ }
  // Ce que vend le client : sa description de départ (ses mots), son produit, ses fiches produits.
  let said = "";
  try { said = String(journeyOf(ctx.conversationId).start.offer?.value ?? ""); } catch { said = ""; }
  try { said += " " + String((stateOf(p.id)?.stages as { brief?: { data?: { description?: string } } } | undefined)?.brief?.data?.description ?? ""); } catch { /* fiche absente */ }
  const text = [said, p.product?.name, p.product?.category, p.product?.summary, ...list.map((x) => x.data.title)].filter(Boolean).join(" ").toLowerCase();
  const word = (list: string) => new RegExp(`(?<!\\p{L})(?:${list})(?!\\p{L})`, "u");
  const genre = word("vêtements?|mode|prêt-à-porter|maroquinerie|sacs?|bijoux|ceintures?|casquettes?|bonnets?|robes?|t-shirts?|tee-shirts?|sweats?|hoodies?|pantalons?|jeans?|vestes?|chemises?|jupes?|chaussures?|baskets?|sneakers?|streetwear|lingerie|maillots?").test(text) ? "mode"
    : word("thés?|infusions?|tisanes?|rooibos|matcha|earl grey").test(text) ? "the" : null;
  return {
    business: p.business === "services" ? "services" : "products", products: list.length || 1, platform: p.platform || "shopify", genre,
    productPhotos: list.flatMap((x) => (x.data.images ?? []).map((im) => im.assetId).filter((id): id is string => !!id)),
    clientImages: (() => { try { return clientImages(p.id).length; } catch { return 0; } })(),
  };
}
/** Genre de site pour le classement des photos (produits ou services, vraies photos de produits ou non). */
const photoSite = (ctx: ToolContext) => { const k = siteKind(ctx); return { business: k.business, productPhotos: (k.productPhotos?.length ?? 0) > 0, productIds: productImageIds(project(ctx).id) }; };
const familyOrError = (projectId: string) => {
  const f = loadFamilyChoice(projectId);
  if (!f) throw new Error("famille de sections pas encore choisie par le client : theme.families puis theme.family d'abord");
  return f;
};
/**
 * Enregistre une modification. Un montage complet (`strict`) doit tout respecter ; une retouche n'est refusée que si
 * elle CRÉE un point bloquant (essai Heure Dorée du 9 novembre : un thème qui avait déjà un défaut refusait toute
 * modification, même celle qui le corrigeait). Les points bloquants restants sont dits, et le devis reste refusé
 * tant qu'il en reste (buildPlan).
 */
function saved(ctx: ToolContext, t: CustomTheme, what: string, o: { strict?: boolean } = {}) {
  const p = project(ctx);
  const site = siteKind(ctx);
  const problems = checkCustomTheme(t, site);
  const key = (x: string) => x.replace(/\d+/g, "#");
  const before = o.strict ? null : loadCustomTheme(p.id);
  const known = new Set(before ? checkCustomTheme(before, site).filter((x) => x.level === "bloquant").map((x) => key(x.text)) : []);
  const all = problems.filter((x) => x.level === "bloquant");
  const blocking = all.filter((x) => !known.has(key(x.text)));
  if (blocking.length) return { ok: false, internal: false, summary: L(`Rien n'est enregistré : ${blocking.map((x) => x.text).join(" ; ")}.`, "Not saved: rule broken."), hint: "Corrige la composition (règles du propriétaire) puis relance, en UN SEUL appel (op « replace », ou retirer et ajouter dans les mêmes ops) ; ne dis jamais au client que c'est fait." };
  const still = all.filter((x) => known.has(key(x.text))).map((x) => x.text);
  const next = saveCustomTheme(p.id, t);
  const verified = loadCustomTheme(p.id)?.rev === next.rev;
  const card = themeCard(p.id, next);
  const review = problems.filter((x) => x.level === "à revoir").map((x) => x.text);
  return {
    ok: verified,
    summary: L(`Thème sur mesure ${what} (version ${next.rev}).${still.length ? ` Encore à corriger avant le montage à la marque : ${still.join(" ; ")}.` : ""}${review.length ? ` À revoir : ${review.join(" ; ")}.` : ""}`, "Custom theme saved."),
    hint: "Le thème est en place dans l'onglet Boutique (aperçu en grand, « Désigner un élément ») ; un aperçu et le lien « Ouvrir la Boutique » s'affichent dans le fil. Dis au client ce qui a changé, en deux phrases. Textes et photos d'exemple : dis-le tant qu'ils ne sont pas remplacés (textesClient).",
    data: { customTheme: card },
    changes: [{ module: "site", object: "thème sur mesure", summary: L(what, what), after: { rev: next.rev }, verified }],
  };
}

const sectionsTool: AgentTool<{ role?: string; query?: string }> = {
  name: "custom.sections", module: "site", kind: "read", needsProject: true,
  description: "Étape 6 (gratuit) : sections de la bibliothèque de la famille CHOISIE PAR LE CLIENT, rangées par rôle (en-tête, ouverture, produits, produit vedette, mise en avant, confiance, panier, aide, inscription, pied de page, 404…), avec ce que fait chacune. role : un rôle seulement ; query : mots à chercher dans le titre ou la description. À lire avant custom.compose ou custom.structure pour choisir chaque section selon la personnalité de la marque, l'angle et son émotion, le métier et le contenu réel.",
  args: z.object({ role: z.string().max(40).optional(), query: z.string().max(80).optional() }).strict(),
  run: (ctx, a) => {
    const p = project(ctx);
    let f;
    try { f = familyOrError(p.id); } catch (e) { return { ok: false, summary: (e as Error).message, hint: "Montre d'abord les familles au client (theme.families)." }; }
    const q = a.query?.toLowerCase();
    const list = familySections(f.family).filter((s) => (!a.role || s.role === a.role.toLowerCase()) && (!q || `${s.title} ${s.does} ${s.kind}`.toLowerCase().includes(q)));
    const byRole: Record<string, { id: string; titre: string; place: string; fait: string; cartes?: true; seulementPour?: string }[]> = {};
    for (const s of list) (byRole[s.role] ??= []).push({ id: s.id, titre: s.title, place: s.kind, fait: s.does.slice(0, 260), ...(isCardSection(s) ? { cartes: true as const } : {}), ...(onlyFor(s.tags) ? { seulementPour: onlyFor(s.tags)! } : {}) });
    return {
      ok: true,
      summary: L(`${list.length} section(s) de la famille ${f.family}${a.role ? ` (rôle ${a.role})` : ""}.`, `${list.length} sections.`),
      hint: "Pour monter le site, utilise custom.design (conception complète par le Studio, payante, prix annoncé). Cette liste sert à comprendre la bibliothèque et à choisir une section précise pour une retouche (custom.structure). Monte le site de A à Z avec les MEILLEURES sections pour SON produit ou SON service (jamais une section pour prendre une section ; « seulementPour » : jamais ailleurs, ex. tailles, tenues et looks seulement pour des vêtements). Pages obligatoires (clés) : " + requiredPages(siteKind(ctx)).map((r) => `${r.keys[0]} (${r.label})`).join(", ") + ". Règles : l'accueil a AU MOINS 8 sections et la fiche produit AU MOINS 7 (hors en-tête et pied de page), chacune avec son rôle dans l'histoire de la page, jamais une section pour en ajouter une : pas d'offre en section à part (les offres sont dans « Produit vedette »), jamais la même section sur deux pages, et une section de preuves (presse, photos de clients, avis, chiffres) seulement si le client a ces preuves (sinon elle ne montrerait que du faux ou des « [À compléter] ») ; une seule section de cartes (cartes:true) par page ; « Produit vedette » seulement en haut de la fiche produit ou une fois sur l'accueil ; jamais la même section deux fois de suite ; chaque section a un rôle dans l'histoire de la page ; ouverture de l'accueil = grande photo pleine avec le titre dessus.",
      data: { famille: f.family, style: f.style, roles: byRole },
    };
  },
};

/** Reprend dans le nouveau montage le travail des sections déjà présentes (même section, de préférence sur la même page). */
export function keepWork(t: CustomTheme, cur: CustomTheme | null): number {
  if (!cur) return 0;
  const pool = allSections(cur).filter((x) => x.s.html || x.s.css || x.s.clientTexts).map((x) => ({ key: x.page?.key ?? x.place, s: x.s }));
  let n = 0;
  const take = (id: string, key: string) => {
    let i = pool.findIndex((x) => x.s.id === id && x.key === key);
    if (i < 0) i = pool.findIndex((x) => x.s.id === id);
    if (i < 0) return null;
    n++;
    return pool.splice(i, 1)[0].s;
  };
  for (const pg of t.pages) pg.sections = pg.sections.map((s) => take(s.id, pg.key) ?? s);
  for (const [k, place] of [["header", "en-tête"], ["footer", "pied de page"], ["search", "recherche"]] as const) { const s = t[k]; if (s) t[k] = take(s.id, place) ?? s; }
  return n;
}

type PageArg = { key: string; label: string; sections: string[] };
const composeTool: AgentTool<{ header: string; footer: string; search?: string | null; pages: PageArg[] }> = {
  name: "custom.compose", module: "site", kind: "write", needsProject: true,
  description: "Étape 6 (gratuit), SEULEMENT pour une composition dictée par le client section par section (sinon custom.design) : MONTE le thème sur mesure du client, avec les MEILLEURES sections de SA famille pour SON produit ou SON service (lis custom.sections d'abord ; aucun thème de départ : les thèmes construits sont pour la voie « thème du Studio »), à ses couleurs, polices, nom et logo. header, footer (search : recherche plein écran, famille Moderne) et pages : [{ key, label, sections : identifiants ou titres de custom.sections, dans l'ordre de l'histoire de la page }], TOUTES les pages obligatoires (clés données par custom.sections : home, shop si plusieurs produits, product, cart, compte, about, contact, aide, legal, 404 ; jamais de page commande ni de confirmation pour Shopify, qui les tient lui-même ; services : home, prestations, reservation ou devis, about, contact, aide, legal, 404). Les règles du propriétaire sont contrôlées : un point bloquant (page manquante comprise) n'enregistre rien. Remplace le thème en cours (l'ancien reste dans l'historique : custom.undo) ; les sections gardées gardent leurs textes et photos. Sur un thème DÉJÀ MONTÉ, pour ajouter, retirer ou déplacer des sections, utilise custom.structure (jamais un nouveau montage pour ajouter une section).",
  args: z.object({
    header: z.string().max(80), footer: z.string().max(80), search: z.string().max(80).nullable().optional(),
    pages: z.array(z.object({ key: z.string().regex(/^[a-z0-9-]{1,40}$/), label: z.string().min(1).max(40), sections: z.array(z.string().max(80)).min(1).max(16) }).strict()).min(1).max(16),
  }).strict(),
  run: (ctx, a) => {
    const p = project(ctx);
    try {
      const f = familyOrError(p.id);
      let t: CustomTheme = { version: 1, family: f.family, style: f.style, header: null, footer: null, search: null, pages: [], rev: 0, at: Date.now() };
      t = applyStructure(t, a.pages.flatMap((pg) => [{ op: "page", key: pg.key, label: pg.label } as StructureOp, ...pg.sections.map((s) => ({ op: "add", page: pg.key, section: ref(s) }) as StructureOp)]));
      t = applyStructure(t, [{ op: "shell", slot: "header", section: ref(a.header) }, { op: "shell", slot: "footer", section: ref(a.footer) }]);
      if (a.search) t = applyStructure(t, [{ op: "shell", slot: "search", section: ref(a.search) }]);
      // Thème déjà monté : chaque section gardée garde son travail (textes, photos, retouches). Essai Heure Dorée du
      // 9 novembre : pour ajouter des sections, SINA a tout remonté et jeté les textes et les photos déjà faits.
      const kept = keepWork(t, loadCustomTheme(p.id));
      return saved(ctx, { ...t, chosen: false }, `monté de A à Z : ${t.pages.map((x) => x.label).join(", ")}${kept ? ` (${kept} section(s) gardée(s) avec leurs textes et photos)` : ""}`, { strict: true });
    } catch (e) { return { ok: false, summary: (e as Error).message, internal: true }; }
  },
};

/** Remplaçable par les tests (aucun appel réel). */
export const customDesignDeps: { call?: (system: string, prompt: string, usageKey: string) => Promise<Design> } = {};

/** Ce que la marque a réellement, et ce qu'elle n'a pas (aucune section qui en dépend). */
function brandAssets(projectId: string): { has: string[]; lacks: string[] } {
  const has: string[] = [], lacks: string[] = ["avis clients et note", "parutions dans la presse", "photos publiées par des clients", "vidéo"];
  try { const n = listProducts(projectId).length; if (n) has.push(`${n} produit(s) avec leurs vraies photos`); } catch { /* catalogue absent */ }
  try { const c = companyOf(projectId) as Record<string, string | undefined>; if (c.shipping) has.push(`livraison : ${c.shipping}`); if (c.returns) has.push(`retours : ${c.returns}`); if (c.address) has.push(`adresse : ${c.address}`); } catch { /* fiche absente */ }
  const o = loadShopOffers(projectId);
  const offers = [o.quantity ? "offre sur la quantité" : "", o.subscription ? "abonnement" : "", o.bundle ? "lot à compléter" : "", (o as { gifts?: unknown[] }).gifts?.length ? "cadeaux par paliers" : ""].filter(Boolean);
  if (offers.length) has.push(`offres : ${offers.join(", ")} (fonctions du bloc d'achat)`); else lacks.push("offres (lots, quantités, abonnement, promotions)");
  return { has, lacks };
}

type DesignArgs = { consigne?: string; ambiance?: Ambiance };
/**
 * Conception d'un site sur mesure, en trois façons (décision du propriétaire du 10 novembre 2026 : « tu peux lui proposer
 * page d'accueil et page produit sur 2 concepts complètement différents, le client choisit et après SINA finit de monter
 * le thème ») : « concept » (accueil et page principale seulement, l'un des deux concepts montrés au client),
 * « complete » (tout le site à partir du concept choisi, ses deux pages gardées telles quelles), « full » (tout le site
 * d'un coup, pour un client qui veut tout refaire).
 */
type DesignMode = { kind: "full" } | { kind: "concept"; label: "A" | "B"; other?: Design } | { kind: "complete"; fixed: Design };
/** Pages d'un concept : l'accueil et la page qui vend (fiche produit, ou prestations pour un service). */
const conceptKeys = (site: SiteKind) => (site.business === "services" ? ["home", "prestations"] : ["home", "product"]);
type DesignRun = { ok: true; d: Design; t: CustomTheme; left: string[]; calls: number } | { ok: false; result: { ok: false; summary: string; hint?: string; internal?: boolean } };
async function runDesign(ctx: ToolContext, a: DesignArgs, mode: DesignMode): Promise<DesignRun> {
  const p = project(ctx);
  let f;
  try { f = familyOrError(p.id); } catch (e) { return { ok: false, result: { ok: false, summary: (e as Error).message, hint: "Montre d'abord les familles au client (theme.families) et enregistre SON choix (theme.family)." } }; }
  const j = (() => { try { return journeyOf(ctx.conversationId); } catch { return null; } })();
  const site = siteKind(ctx), assets = brandAssets(p.id), keys = conceptKeys(site);
  const products = (() => { try { return listProducts(p.id).map((x) => `- ${x.data.title}${x.data.price != null ? ` · ${(x.data.price / 100).toFixed(2).replace(".", ",")} €` : ""}${x.data.options.length ? ` · options : ${x.data.options.map((o) => `${o.name} (${o.values.join(", ")})`).join(" ; ")}` : ""}${x.data.description_html ? ` · ${x.data.description_html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 500)}` : ""}`); } catch { return []; } })();
  const ambiance = a.ambiance ?? f.ambiance ?? null;
  const summary = (d: Design) => JSON.stringify({ concept: d.concept, header: d.header, footer: d.footer, pages: d.pages.map((pg) => ({ key: pg.key, label: pg.label, sections: pg.sections.map((x) => x.section) })) });
  const modeText = mode.kind === "concept"
    ? `\n\nCETTE FOIS, UN CONCEPT SEULEMENT : conçois uniquement ces deux pages : ${keys.map((k) => `« ${k} »`).join(" et ")} (mêmes exigences de richesse : accueil ${MIN_SECTIONS_TEXT}). Ignore les autres pages obligatoires : elles seront conçues après le choix du client. Ce concept sera montré au client à côté d'un second concept : il doit avoir une idée forte, lisible au premier regard.${mode.other ? `\nUN PREMIER CONCEPT EXISTE DÉJÀ (ci-dessous). Le tien doit être COMPLÈTEMENT DIFFÉRENT : une autre idée de site, une autre émotion de l'angle mise en avant, une autre ouverture, un autre parcours, d'autres sections (au plus 3 sections en commun par page avec lui), un autre en-tête si la bibliothèque en propose un autre. PREMIER CONCEPT : ${summary(mode.other)}` : ""}`
    : mode.kind === "complete"
      ? `\n\nLE CLIENT A CHOISI CE CONCEPT : ses pages ${keys.map((k) => `« ${k} »`).join(" et ")}, son en-tête, son pied de page et sa recherche sont GARDÉS EXACTEMENT (mêmes sections, même ordre). Conçois toutes les AUTRES pages obligatoires (et une page utile en plus seulement si le parcours le demande), dans le MÊME concept et la même émotion, sans reprendre une section déjà posée. Rends la conception complète : toutes les pages, les siennes inchangées. CONCEPT CHOISI (JSON) : ${JSON.stringify(mode.fixed)}`
      : "";
  const prompt = designPrompt({ brief: brandBrief(p, j), family: f.family, site, has: assets.has, lacks: assets.lacks, consigne: a.consigne, ambiance, products }) + modeText;
  const jobId = getRun(ctx.runId)?.job_id ?? null;
  const tag = mode.kind === "concept" ? `custom-concept-${mode.label}` : mode.kind === "complete" ? "custom-design-complete" : "custom-design";
  const call = async (text: string, key: string, system = DESIGN_SYSTEM): Promise<Design> => customDesignDeps.call ? customDesignDeps.call(system, text, key)
    : DesignSchema.parse(await withTrace({ jobId, projectId: p.id, step: tag, costCapMicro: (jobId ? jobSpentMicro(jobId) : 0) + DESIGN_CAP_MICRO * DESIGN_CALLS_MAX * (mode.kind === "concept" ? 2 : 1) }, () =>
        llmJson({ task: "strategy", userId: ctx.user.id, projectId: p.id, jobId, system, promptKey: system === DESIGN_SYSTEM ? "syna-custom-design-2" : "syna-custom-design-review-1", prompt: text, maxTokens: DESIGN_OUTPUT_TOKENS, maxOutputTokens: DESIGN_OUTPUT_TOKENS * 1.5, usageKey: key, routing: { difficulty: "complex", prefer: siteCopyModel() } }, DesignSchema, { strict: true })));
  // Concept choisi : ses pages et sa coque restent celles que le client a vues, quoi que rende le concepteur.
  const pin = (d: Design): Design => mode.kind !== "complete" ? d : { ...d, concept: mode.fixed.concept, header: mode.fixed.header, footer: mode.fixed.footer, search: mode.fixed.search,
    pages: [...mode.fixed.pages.filter((pg) => keys.includes(pg.key)), ...d.pages.filter((pg) => !keys.includes(pg.key))] };
  const only = (d: Design): Design => mode.kind !== "concept" ? d : { ...d, pages: d.pages.filter((pg) => keys.includes(pg.key)), objections: d.objections.filter((o) => keys.includes(o.page)) };
  const build = (d: Design): CustomTheme => {
    let t: CustomTheme = { version: 1, family: f.family, style: f.style, header: null, footer: null, search: null, pages: [], rev: 0, at: Date.now(), concept: d.concept };
    t = applyStructure(t, d.pages.flatMap((pg) => [{ op: "page", key: pg.key, label: pg.label } as StructureOp, ...pg.sections.map((s) => ({ op: "add", page: pg.key, section: ref(s.section) }) as StructureOp)]));
    t = applyStructure(t, [{ op: "shell", slot: "header", section: ref(d.header) }, { op: "shell", slot: "footer", section: ref(d.footer) }]);
    if (d.search) t = applyStructure(t, [{ op: "shell", slot: "search", section: ref(d.search) }]);
    return t;
  };
  const blocking = (t: CustomTheme) => checkCustomTheme(t, site).filter((x) => x.level === "bloquant").map((x) => x.text)
    // Un concept n'a que deux pages : les autres pages obligatoires viennent après le choix du client.
    .filter((x) => mode.kind !== "concept" || !/^page « .* » absente/.test(x));
  const research = (() => { try { return j ? activityPlan(p.id, j).objections.map((o) => o.objection) : []; } catch { return []; } })();
  const check = (d: Design) => {
    let t: CustomTheme | null = null, rules: string[];
    try { t = build(d); rules = blocking(t); } catch (e) { rules = [(e as Error).message]; }
    // Concept : seules les objections dont la réponse est sur l'une de ses deux pages sont contrôlées.
    const g = designGaps(d, research);
    const objections = mode.kind === "concept" ? g.blocking.filter((x) => keys.some((k) => x.includes(`page « ${k} »`))) : g.blocking;
    return { t, rules, objections, rhythm: g.rhythm };
  };
  const base = `syna:${ctx.runId}:${tag}`;
  let d: Design, c: ReturnType<typeof check>, calls = 0;
  try {
    // 1) conception (stratégie, parcours, sections), 2) relecture du directeur commercial qui rend la version corrigée.
    d = only(pin(await call(prompt, base))); calls++;
    d = only(pin(await call(`${prompt}\n\nCONCEPTION À RELIRE (JSON) :\n${JSON.stringify(d)}`, `${base}-review`, DESIGN_REVIEW_SYSTEM))); calls++;
    c = check(d);
    // 3) une seule correction si le contrôle du Studio refuse quelque chose (règles, objection sans réponse, rythme).
    const todo = [...c.rules, ...c.objections, ...c.rhythm];
    if (todo.length) {
      d = only(pin(await call(`${prompt}\n\nTA CONCEPTION (JSON) :\n${JSON.stringify(d)}\n\nPOINTS REFUSÉS PAR LE CONTRÔLE DU STUDIO (à corriger, en gardant ta logique ; liste dans corrections ce que tu changes) :\n- ${todo.join("\n- ")}`, `${base}-fix`, DESIGN_REVIEW_SYSTEM))); calls++;
      c = check(d);
    }
  } catch (e) {
    // Coût réel, même d'un passage raté (essai du 10 novembre 2026 : « 0 passage payé » alors que 0,34 € l'avaient été).
    const spent = all<{ c: number | null }>("SELECT SUM(cost) c FROM ai_calls WHERE project_id=? AND usage_key LIKE ?", p.id, `${base}%`)[0]?.c ?? 0;
    return { ok: false, result: { ok: false, summary: L(`Conception non faite (${calls} passage(s) réussi(s) ; coût réel : ${budgetPctText(ctx.user.id, spent, p.id).replace(/de votre budget/, "de ton budget")}) : ${(e as Error).message.slice(0, 200)}.`, "Design failed."), hint: "Dis-le au client avec le coût réel ; ne relance rien sans son accord écrit (jamais après une erreur 5xx)." } };
  }
  if (c.rules.length || !c.t) return { ok: false, result: { ok: false, summary: L(`Conception refusée par le contrôle : ${c.rules.join(" ; ")}. Rien n'est enregistré.`, "Design refused."), hint: "Dis-le honnêtement au client avec le coût réel ; propose de corriger avec custom.structure (gratuit) à partir de la conception, sans rien relancer de payant sans son accord." } };
  // Conception gardée dans le thème : parcours de chaque page et intention de chaque section.
  for (const pg of c.t.pages) {
    const src = d.pages.find((x) => x.key === pg.key);
    if (!src) continue;
    pg.journey = src.journey;
    pg.sections.forEach((s, i) => { const pick = src.sections[i]; if (pick) s.intent = intentText(pick.why, pick.says, pick.photos); });
  }
  return { ok: true, d, t: c.t, left: [...c.objections, ...c.rhythm], calls };
}
const MIN_SECTIONS_TEXT = "au moins 8 sections, fiche produit au moins 7, plus si le parcours le demande";
const designData = (d: Design, calls: number) => ({ visiteur: d.visitor, leviers: d.levers, objections: d.objections.map((o) => `« ${o.objection} » → ${o.answer} (${o.page} › ${libSection(o.section)?.title ?? o.section})`), relecture: d.corrections, concept: d.concept, parcours: d.pages.map((pg) => ({ page: pg.label, parcours: pg.journey, sections: pg.sections.map((s) => `${libSection(s.section)?.title ?? s.section} — ${s.why}`) })), passages: calls });

const designTool: AgentTool<DesignArgs> = {
  name: "custom.design", module: "site", kind: "generate", needsProject: true,
  description: "Étape 6, THÈME SUR MESURE (PAYANT : prix annoncé, accord écrit du client d'abord) : CONÇOIT et monte TOUT le site d'un coup. À n'utiliser QUE si le client veut refaire tout son site sur mesure sans passer par les deux concepts ; le parcours normal est custom.concepts (deux concepts au choix) puis custom.concept (tout le site sur le concept choisi). consigne : ce que le client a dit vouloir (ses mots). Les sections déjà écrites et gardées gardent leurs textes et photos ; les nouvelles se font ensuite écrire avec custom.build (devis à part).",
  args: z.object({ consigne: z.string().max(1500).optional(), ambiance: z.enum(["clair", "sombre", "alterne"]).optional() }).strict(),
  estimate: () => ({ maxMicro: DESIGN_CAP_MICRO * DESIGN_CALLS_MAX, probableMicro: DESIGN_TYPICAL_MICRO, label: L("conception de tout ton site sur mesure (stratégie, parcours de chaque page, choix de chaque section) et sa relecture", "full custom site design and review") }),
  run: async (ctx, a) => {
    const p = project(ctx);
    const r = await runDesign(ctx, a, { kind: "full" });
    if (!r.ok) return r.result;
    const kept = keepWork(r.t, loadCustomTheme(p.id));
    const out = saved(ctx, { ...r.t, chosen: false }, `conçu de A à Z : ${r.t.pages.map((x) => `${x.label} (${x.sections.length})`).join(", ")}${kept ? ` ; ${kept} section(s) gardée(s) avec leurs textes et photos` : ""}${r.left.length ? `. À revoir : ${r.left.join(" ; ")}` : ""}`, { strict: true });
    return { ...out, data: { ...(out as { data?: object }).data, ...designData(r.d, r.calls) },
      hint: "Montre au client l'idée du site et, page par page, le parcours et pourquoi chaque section est là (court). Puis custom.images, la galerie de chaque produit (gallery.plan) et le devis de custom.build pour écrire les textes et créer les photos (jamais sans son accord)." };
  },
};

/** Deux concepts complètement différents (accueil et page qui vend), montrés au client avant tout le reste. */
const conceptsTool: AgentTool<{ consigne?: string }> = {
  name: "custom.concepts", module: "site", kind: "generate", needsProject: true,
  description: "Étape 6, THÈME SUR MESURE (PAYANT : prix annoncé, accord écrit du client d'abord), APRÈS la famille (theme.family) et l'ambiance (theme.ambiance) : conçoit DEUX CONCEPTS COMPLÈTEMENT DIFFÉRENTS (autre idée, autre émotion mise en avant, autres sections), chacun avec sa page d'accueil et sa fiche produit (ou sa page de prestations pour un service), comme un directeur de création. Les deux s'affichent dans le fil (avec les photos d'exemple de la bibliothèque, annoncées comme telles) ; le client choisit, puis custom.concept monte tout le site sur SON choix. consigne : ce que le client a dit vouloir (ses mots).",
  args: z.object({ consigne: z.string().max(1500).optional() }).strict(),
  estimate: () => ({ maxMicro: DESIGN_CAP_MICRO * DESIGN_CALLS_MAX * 2, probableMicro: CONCEPTS_TYPICAL_MICRO, label: L("deux concepts complètement différents de ton site sur mesure (page d'accueil et page produit), à comparer avant de choisir", "two different custom-site concepts") }),
  run: async (ctx, a) => {
    const p = project(ctx);
    const f = loadFamilyChoice(p.id);
    if (!f?.ambiance) return { ok: false, summary: L("Ambiance pas encore choisie par le client : demande-lui « sombre ou clair ? », puis theme.ambiance.", "Ambiance not chosen yet."), hint: "Pose la question au client, en deux choix ; ne choisis jamais à sa place." };
    const A = await runDesign(ctx, a, { kind: "concept", label: "A" });
    if (!A.ok) return A.result;
    const B = await runDesign(ctx, a, { kind: "concept", label: "B", other: A.d });
    if (!B.ok) return { ...B.result, summary: `${B.result.summary} (le concept A, lui, est prêt.)` };
    const saved2 = saveConcepts(p.id, { A: { design: A.d, theme: A.t }, B: { design: B.d, theme: B.t }, at: Date.now() });
    const view = (k: "A" | "B") => ({ href: `/api/projects/${p.id}/custom-theme?concept=${k}&embed=1&at=${saved2.at}`, open: `/api/projects/${p.id}/custom-theme?concept=${k}&at=${saved2.at}`, idee: saved2[k].design.concept, pages: saved2[k].theme.pages.map((pg) => ({ key: pg.key, label: pg.label, sections: pg.sections.map((s) => libSection(s.id)?.title ?? s.id) })) });
    return {
      ok: true,
      summary: L(`Deux concepts conçus : A (${A.t.pages.map((x) => `${x.label} ${x.sections.length}`).join(", ")}) et B (${B.t.pages.map((x) => `${x.label} ${x.sections.length}`).join(", ")}).`, "Two concepts designed."),
      hint: "Présente au client les DEUX concepts côte à côte (ils s'affichent dans le fil) : pour chacun, l'idée en une phrase, l'émotion mise en avant, et en quoi ils diffèrent. Dis-lui que les photos sont encore celles de la bibliothèque (exemples) : ses vraies images viendront sur le concept choisi. Demande-lui lequel il préfère (A ou B), puis custom.concept avec SON choix (payant : la suite du site). Ne choisis jamais à sa place.",
      data: { concepts: { A: view("A"), B: view("B") }, A: designData(A.d, A.calls), B: designData(B.d, B.calls) },
    };
  },
};

/** Tout le site sur le concept choisi par le client (ses deux pages gardées telles quelles). */
const conceptTool: AgentTool<{ choice: "A" | "B"; consigne?: string }> = {
  name: "custom.concept", module: "site", kind: "generate", needsProject: true,
  description: "Étape 6, THÈME SUR MESURE (PAYANT : prix annoncé, accord écrit du client d'abord), APRÈS custom.concepts : enregistre le concept CHOISI PAR LE CLIENT (choice A ou B) et monte TOUT le site dans ce concept : ses deux pages gardées telles quelles, toutes les autres pages conçues dans la même idée. Ensuite : custom.images, la galerie de chaque produit (gallery.plan) et custom.build (textes, SEO et photos).",
  args: z.object({ choice: z.enum(["A", "B"]), consigne: z.string().max(1500).optional() }).strict(),
  estimate: () => ({ maxMicro: DESIGN_CAP_MICRO * DESIGN_CALLS_MAX, probableMicro: DESIGN_TYPICAL_MICRO, label: L("la suite de ton site sur le concept choisi (toutes les autres pages)", "the rest of the site on the chosen concept") }),
  run: async (ctx, a) => {
    const p = project(ctx);
    const all2 = loadConcepts(p.id);
    const chosen = all2?.[a.choice];
    if (!chosen) return { ok: false, summary: L("Aucun concept à choisir : conçois d'abord les deux concepts (custom.concepts).", "No concepts yet.") };
    const r = await runDesign(ctx, { consigne: a.consigne }, { kind: "complete", fixed: chosen.design });
    if (!r.ok) return r.result;
    const out = saved(ctx, { ...r.t, chosen: false }, `concept ${a.choice} choisi, tout le site monté : ${r.t.pages.map((x) => `${x.label} (${x.sections.length})`).join(", ")}${r.left.length ? `. À revoir : ${r.left.join(" ; ")}` : ""}`, { strict: true });
    if (out.ok) saveConcepts(p.id, { ...all2!, chosen: a.choice });
    return { ...out, data: { ...(out as { data?: object }).data, ...designData(r.d, r.calls) },
      hint: "Montre au client tout le site (le thème s'affiche) : les pages ajoutées et pourquoi. Puis custom.images (« tes images ou je les crée ? », le nombre exact), la galerie de chaque produit (gallery.plan : ses questions) et le devis de custom.build (textes, SEO et photos ; jamais sans son accord)." };
  },
};
const CONCEPTS_TYPICAL_MICRO = 900_000;

/** Coût probable d'une écriture de section (mesuré sur les textes du site : environ 0,06 € avec le modèle des textes). */
export const SECTION_TEXT_TYPICAL_MICRO = 60_000;
export const SITE_PLAN_TYPICAL_MICRO = 90_000;
type BuildArgs = { photos?: boolean; newPhotos?: boolean; images?: ImagesMode; clientAssets?: string[]; rewrite?: boolean; consigne?: string };
/** Thème à monter à la marque : celui que le Studio a conçu de A à Z (custom.design), toutes ses pages comprises. */
function buildPlan(ctx: ToolContext): CustomTheme {
  const p = project(ctx);
  const fam = familyOrError(p.id).family;
  const cur = loadCustomTheme(p.id);
  if (!cur) throw new Error(L("Aucun thème sur mesure monté : conçois d'abord toutes les pages avec les meilleures sections pour ce produit ou ce service.", "No custom theme composed yet."));
  // Famille changée après le montage (audit du 10 novembre 2026) : jamais un thème d'une famille avec les images de l'autre.
  if (cur.family !== fam) throw new Error(L(`Le client a choisi la famille ${fam === "moderne" ? "Moderne" : "Classique"}, mais le thème monté est de la famille ${cur.family === "moderne" ? "Moderne" : "Classique"} : il faut d'abord concevoir un nouveau thème dans sa famille.`, "Family changed: design a new theme first."));
  // Un seul montage payant à la fois (deux tâches écrivaient les mêmes sections et payaient deux fois).
  if (pendingJob(p.id, CUSTOM_BRAND_JOB)) throw new Error(L("Un montage de ton thème est déjà en cours : attends-le.", "A build is already running."));
  // Toutes les règles AVANT le devis (essai réel du 9 novembre : un devis affiché pour un thème que le lancement refusait).
  const blocking = checkCustomTheme(cur, siteKind(ctx)).filter((x) => x.level === "bloquant");
  if (blocking.length) throw new Error(L(`Thème à corriger avant le devis : ${blocking.map((x) => x.text).join(" ; ")} (custom.structure).`, "Theme to fix before the quote."));
  return cur;
}
const buildTool: AgentTool<BuildArgs> = {
  name: "custom.build", module: "site", kind: "generate", needsProject: true,
  description: "Étape 6, THÈME SUR MESURE (PAYANT : devis du Studio annoncé en % du budget, accord écrit du client d'abord) : APRÈS custom.design (le thème conçu de A à Z, toutes ses pages) et sa réponse sur les images (custom.images : ses images, les tiennes, ou les deux), images : « client » (ses images seulement, autant que d'emplacements), « mix » (ses images d'abord, tu crées les autres) ou « sina » (tu crées tout) ; clientAssets : ses images (identifiants de custom.images), dans l'ordre des emplacements. Met le thème À SA MARQUE : tous les textes écrits pour lui (ses faits seulement, jamais ceux d'un modèle) et toutes les photos (vraies photos de ses produits, sinon photos créées dans la direction artistique de sa famille). photos:false = textes seulement. newPhotos:false = montage en deux fois, sous un budget serré : textes écrits, vraies photos de ses produits (et ses images, clientAssets) posées, AUCUNE photo créée ; les autres emplacements gardent leur photo d'exemple jusqu'au second montage (custom.build sans newPhotos, qui ne réécrit pas les textes déjà écrits). rewrite:true (avec photos:false) = le client n'aime pas les textes : TOUS les textes du site sont réécrits avec un nouveau plan des textes, même ceux déjà écrits (devis d'abord). consigne : ce que le client a dit vouloir pour ses textes (émotion, scène, mots), recopié MOT POUR MOT ; toujours la passer quand il en a dit quelque chose, sinon le rédacteur ne le sait pas. Tâche de fond ; le thème est ensuite EN PLACE dans l'onglet Boutique, où le client demande ses changements et désigne les éléments.",
  args: z.object({
    photos: z.boolean().optional(),
    newPhotos: z.boolean().optional(),
    images: z.enum(["sina", "client", "mix"]).optional(),
    clientAssets: z.array(z.string().max(60)).max(80).optional(),
    rewrite: z.boolean().optional(),
    consigne: z.string().max(1500).optional(),
  }).strict(),
  estimate: (ctx, a) => {
    const t = buildPlan(ctx);
    // Sections à écrire : toutes avec rewrite, sinon seulement celles encore en texte d'exemple (le devis comptait tout le site).
    const sections = a.rewrite ? allSectionsCount(t) : allSections(t).filter((x) => !x.s.clientTexts).length, slots = photoSlots(t, photoSite(ctx)), none = a.photos === false || a.newPhotos === false, photos = none ? 0 : photosToCreate(slots.filter((x) => x.kind === "ambiance").length, a.images ?? "sina", a.clientAssets?.length ?? 0);
    // Plafond : les photos de produits aussi, au cas où une scène doive être créée avec le produit en référence.
    const photosMax = none ? 0 : photos + slots.filter((x) => x.kind === "produit").length;
    const unit = (customPhotoDeps.unit ?? photoUnit)();
    if (photos && unit == null) throw new Error(L("Aucun modèle d'images utilisable pour les photos du site.", "No usable image model."));
    // + le plan des textes de tout le site (un appel, avant les sections)
    return { maxMicro: SITE_PLAN_CAP_MICRO + sections * SECTION_TEXT_CAP_MICRO + photosMax * (unit ?? 0), probableMicro: SITE_PLAN_TYPICAL_MICRO + sections * SECTION_TEXT_TYPICAL_MICRO + Math.round(photos * (unit ?? 0) * 0.8), label: a.newPhotos === false && a.photos !== false ? L(`thème sur mesure monté à ta marque en deux fois : ${sections} sections écrites et les vraies photos de tes produits posées, aucune photo créée pour l'instant`, "custom theme built, no new photos yet") : a.rewrite && !photos ? L(`textes de tout ton site réécrits : plan des textes puis ${sections} sections`, "all site copy rewritten") : L(`thème sur mesure monté à ta marque : ${sections} sections écrites${photos ? `, ${photos} photos créées` : ""}${a.clientAssets?.length ? `, ${a.clientAssets.length} de tes images posées` : ""}`, "custom theme built for the brand") };
  },
  run: async (ctx, a) => {
    const p = project(ctx);
    let t: CustomTheme;
    try { t = buildPlan(ctx); } catch (e) { return { ok: false, summary: (e as Error).message, hint: "Le client choisit d'abord sa famille (theme.families puis theme.family) et son ambiance, puis le Studio conçoit toutes les pages (custom.design, carte d'accord)." }; }
    const blocking = checkCustomTheme(t, siteKind(ctx)).filter((x) => x.level === "bloquant");
    if (blocking.length) return { ok: false, internal: true, summary: `Composition refusée : ${blocking.map((x) => x.text).join(" ; ")}.` };
    // Images du client : seulement les siennes (Fichiers du projet), et le bon nombre quand il veut n'utiliser que les siennes.
    const mode = a.images ?? "sina", own = new Set(clientImages(p.id).map((x) => x.id));
    const foreign = (a.clientAssets ?? []).filter((id) => !own.has(id));
    if (foreign.length) return { ok: false, internal: true, summary: `Images inconnues ou qui ne viennent pas du client : ${foreign.join(", ")} (custom.images donne ses images).` };
    if (mode !== "sina" && a.newPhotos !== false && !a.clientAssets?.length) return { ok: false, summary: L("Aucune image du client à poser : demande-lui d'abord ses images (custom.images dit combien il en faut).", "No client images yet.") };
    const needed = examplePhotoCount(t, photoSite(ctx));
    if (mode === "client" && a.newPhotos !== false && (a.clientAssets?.length ?? 0) < needed) return { ok: false, summary: L(`Il faut ${needed} images et le client en a donné ${a.clientAssets!.length} : rien n'est lancé.`, "Not enough client images."), hint: `Dis-le au client simplement et propose-lui : m'envoyer les ${needed - a.clientAssets!.length} qui manquent, que tu crées les autres (images:\"mix\", prix annoncé), ou que tu crées toutes les images (images:\"sina\").` };
    const est = await buildTool.estimate!(ctx, a);
    const job = enqueue({ userId: ctx.user.id, projectId: p.id, type: CUSTOM_BRAND_JOB, label: L("Thème sur mesure monté à ta marque (SINA)", "Custom theme built for your brand (SINA)"), payload: { projectId: p.id, capMicro: est.maxMicro, conversationId: ctx.conversationId, photos: a.photos !== false, newPhotos: a.newPhotos !== false, images: mode, clientAssets: a.clientAssets ?? [], rewrite: !!a.rewrite, consigne: a.consigne?.trim() || null }, maxAttempts: 2, idempotencyKey: `syna:${ctx.runId}:custom-brand${a.rewrite ? "-rewrite" : ""}:${t.rev}` });
    try { updateJourneyConv(ctx.conversationId, (x) => setJourneyStep(x, 6, "doing")); } catch { /* fil sans parcours */ }
    return {
      ok: true, jobs: [job.id],
      summary: L(`Montage du thème sur mesure à ta marque lancé (${allSectionsCount(t)} sections, ${a.photos === false ? "textes seulement" : a.newPhotos === false ? "textes et vraies photos des produits, aucune photo créée" : `${needed} photos : ${a.clientAssets?.length ? `${Math.min(needed, a.clientAssets.length)} de ses images, ` : ""}${photosToCreate(needed, mode, a.clientAssets?.length ?? 0)} créées`}).`, "Custom theme build started."),
      hint: "Quand la tâche est finie, dis au client que son thème est en place dans l'onglet Boutique (lien « Ouvrir la Boutique » de la carte), qu'il peut le regarder en grand et désigner un élément pour demander un changement. Dis honnêtement ce que le rapport signale (textes non remplacés, photos non créées).",
      data: { customTheme: themeCard(p.id, t) },
    };
  },
};
const allSectionsCount = (t: CustomTheme) => (t.header ? 1 : 0) + (t.footer ? 1 : 0) + (t.search ? 1 : 0) + t.pages.reduce((n, pg) => n + pg.sections.length, 0);

/** Photos déjà créées pour le site du projet (réutilisables gratuitement à un autre emplacement, avec custom.edit image). */
export function sitePhotos(projectId: string): { id: string; description: string }[] {
  return all<{ id: string; name: string; meta: string | null }>("SELECT id, name, meta FROM assets WHERE project_id=? AND deleted_at IS NULL AND kind='image' AND origin='generated' AND role='site' ORDER BY created_at DESC LIMIT 40", projectId)
    .map((x) => { let d = x.name; try { d = (JSON.parse(x.meta ?? "{}") as { synaPhoto?: { description?: string } }).synaPhoto?.description?.slice(0, 160) || x.name; } catch { /* méta illisible */ } return { id: x.id, description: d }; });
}

const imagesTool: AgentTool<Record<string, never>> = {
  name: "custom.images", module: "site", kind: "read", needsProject: true,
  description: "Étape 6 (gratuit), APRÈS custom.design et AVANT custom.build : combien d'images il faut pour le thème sur mesure monté (un emplacement par photo, page par page) et quelles images le client a déjà envoyées (identifiants pour clientAssets). Sert à lui demander s'il veut monter son site avec SES images ou si tu les crées, et à lui dire le nombre exact d'images à envoyer.",
  args: z.object({}).strict(),
  run: (ctx) => {
    const p = project(ctx);
    let t: CustomTheme;
    try { t = buildPlan(ctx); } catch (e) { return { ok: false, summary: (e as Error).message, hint: "Fais d'abord concevoir toutes les pages par le Studio (custom.design, carte d'accord), puis compte les images." }; }
    const all = photoSlots(t, photoSite(ctx)), mine = clientImages(p.id);
    // Le nombre exact (audit du 10 novembre 2026) : seules les photos d'ambiance sont à envoyer ou à créer ; les photos
    // de produits sont ses vraies photos de produits ; les photos impossibles à inventer, seulement les siennes.
    const slots = all.filter((x) => x.kind === "ambiance"), products = all.filter((x) => x.kind === "produit"), toProvide = all.filter((x) => x.kind === "a-fournir");
    const byPage: Record<string, number> = {};
    for (const s of slots) byPage[s.place] = (byPage[s.place] ?? 0) + 1;
    const provide = toProvide.length ? ` ${toProvide.length} photo(s) ne peuvent venir QUE de lui (${[...new Set(toProvide.map((x) => x.authentic))].join(", ")}) : tu ne les crées jamais ; ses images envoyées y vont en premier, sinon un cadre « Photo à fournir » reste à leur place.` : "";
    return {
      ok: true,
      summary: L(`Il faut ${slots.length} images d'ambiance pour ce thème (${Object.entries(byPage).map(([k, n]) => `${k} : ${n}`).join(", ") || "aucune"})${products.length ? `, plus ${products.length} photo(s) de produits (ses vraies photos de produits)` : ""}${toProvide.length ? `, plus ${toProvide.length} photo(s) à fournir par lui (${[...new Set(toProvide.map((x) => x.authentic))].join(", ")})` : ""}. Images déjà envoyées par le client : ${mine.length}.`, `${slots.length} images needed.`),
      hint: `Demande au client, en une question à choix : « Tu montes ton site avec tes images, ou je les crée ? ». S'il prend les siennes : dis-lui qu'il en faut ${slots.length} (par page : ${Object.entries(byPage).map(([k, n]) => `${k} ${n}`).join(", ")}) et qu'il les envoie avec le trombone (📎) ; s'il en a moins, propose de créer celles qui manquent (images:"mix", prix annoncé) ou de toutes les créer (images:"sina"). Les vraies photos de ses produits servent toujours aux cartes et au bloc d'achat ; ailleurs, une scène est créée avec elles en référence.${provide}`,
      data: { imagesNecessaires: slots.length, photosDeProduits: products.length, aFournirParLeClient: toProvide.length, parPage: byPage, emplacements: slots.map((s) => `${s.place} › ${s.section}`), imagesDuClient: mine.map((x) => ({ id: x.id, nom: x.name })), photosDejaCreees: sitePhotos(p.id) },
    };
  },
};

const showTool: AgentTool<Record<string, never>> = {
  name: "custom.show", module: "site", kind: "read", needsProject: true,
  description: "Étape 6 (gratuit) : montre au client son thème sur mesure EN VRAI dans le fil (toutes les pages, vue téléphone, bouton « Désigner un élément ») et te donne sa composition (uid de chaque section, textes du client ou d'exemple, points à revoir).",
  args: z.object({}).strict(),
  run: (ctx) => {
    const p = project(ctx), t = loadCustomTheme(p.id);
    if (!t) return { ok: false, summary: L("Aucun thème sur mesure : il faut d'abord le concevoir (custom.design).", "No custom theme yet.") };
    return { ok: true, summary: L(`Thème sur mesure affiché (version ${t.rev}, ${t.pages.length} pages).`, "Custom theme shown."), data: { customTheme: themeCard(p.id, t) } };
  },
};

const readTool: AgentTool<{ uid: string }> = {
  name: "custom.section", module: "site", kind: "read", needsProject: true,
  description: "Étape 6 (gratuit) : lit une section du thème (uid de custom.show ou de l'élément désigné par le client) : son HTML actuel, ses règles CSS propres et les coordonnées déjà enregistrées de la marque (raison sociale, adresse, e-mail, téléphone : jamais redemandées au client), à lire AVANT custom.edit pour recopier les passages exacts à changer.",
  args: z.object({ uid: z.string().regex(/^s[0-9a-f]{8}$/) }).strict(),
  run: (ctx, a) => {
    const p = project(ctx), t = loadCustomTheme(p.id), x = t ? findSection(t, a.uid) : null;
    if (!t || !x) return { ok: false, summary: L(`Section ${a.uid} introuvable dans le thème.`, "Section not found."), internal: true };
    const l = libSection(x.s.id);
    const html = sectionHtml(x.s);
    // Coordonnées déjà enregistrées : jamais redemandées au client (essai Heure Dorée : l'adresse était redemandée).
    const co = (() => { try { return companyOf(p.id); } catch { return {}; } })() as Record<string, string | undefined>;
    const coordonnees = Object.fromEntries(["legalName", "address", "email", "phone"].filter((k) => co[k]).map((k) => [k, co[k]]));
    return { ok: true, summary: L(`Section « ${l?.title} » (${x.place}) lue.`, "Section read."), data: { uid: a.uid, titre: l?.title, role: l?.role, place: x.place, fait: l?.does, textesClient: !!x.s.clientTexts, ...(Object.keys(coordonnees).length ? { coordonneesEnregistrees: coordonnees } : {}), css: x.s.css ?? "", html: html.length > 30000 ? html.slice(0, 30000) + "…[coupé]" : html } };
  },
};

const structureTool: AgentTool<{ ops: StructureOp[] }> = {
  name: "custom.structure", module: "site", kind: "write", needsProject: true,
  description: "Étape 6 (gratuit) : change la COMPOSITION du thème sur mesure. ops, dans l'ordre : { op:\"add\", page, section, at? } ajoute une section (id ou titre de custom.sections) ; { op:\"remove\", uid } ; { op:\"move\", uid, page?, at } ; { op:\"replace\", uid, section } (autre section au même rôle, ou en-tête/pied de page) ; { op:\"shell\", slot:\"header\"|\"footer\"|\"search\", section|null } ; { op:\"page\", key, label, at? } ; { op:\"drop_page\", key } ; { op:\"rename_page\", key, label }. Retirer une section ou une page visible se PROPOSE au client d'abord (jamais à sa place). Règles du propriétaire contrôlées.",
  args: z.object({ ops: z.array(z.union([
    z.object({ op: z.literal("add"), page: z.string().max(40), section: z.string().max(80), at: z.number().int().min(0).max(30).optional() }).strict(),
    z.object({ op: z.literal("remove"), uid: z.string().max(12) }).strict(),
    z.object({ op: z.literal("move"), uid: z.string().max(12), page: z.string().max(40).optional(), at: z.number().int().min(0).max(30) }).strict(),
    z.object({ op: z.literal("replace"), uid: z.string().max(12), section: z.string().max(80) }).strict(),
    z.object({ op: z.literal("shell"), slot: z.enum(["header", "footer", "search"]), section: z.string().max(80).nullable() }).strict(),
    z.object({ op: z.literal("page"), key: z.string().regex(/^[a-z0-9-]{1,40}$/), label: z.string().min(1).max(40), at: z.number().int().min(0).max(12).optional() }).strict(),
    z.object({ op: z.literal("drop_page"), key: z.string().max(40) }).strict(),
    z.object({ op: z.literal("rename_page"), key: z.string().max(40), label: z.string().min(1).max(40) }).strict(),
  ])).min(1).max(20) }).strict(),
  run: (ctx, a) => {
    const p = project(ctx), t = loadCustomTheme(p.id);
    if (!t) return { ok: false, summary: L("Aucun thème sur mesure : il faut d'abord le concevoir (custom.design).", "No custom theme yet.") };
    try {
      const ops = a.ops.map((o) => ("section" in o && o.section ? { ...o, section: ref(o.section) } : o)) as StructureOp[];
      return saved(ctx, applyStructure(t, ops), `modifié (${a.ops.map((o) => o.op).join(", ")})`);
    } catch (e) { return { ok: false, summary: (e as Error).message, internal: true }; }
  },
};

/** Contenu permis dans une section retouchée : aucun script ni ressource extérieure (lot 9 : aucun script dans les sections d'un projet). */
/**
 * HTML d'une section refusé s'il pourrait exécuter du code ou sortir de la section. Contrôlé sur le HTML FINAL (deux
 * remplacements pouvaient reformer « <script> » ensemble ; « <svg/onload=… » passait : audit du 10 novembre 2026).
 * Commun à custom.edit et à l'écriture du montage (applyWrite).
 */
export function assertSafeHtml(html: string): void {
  if (/<\s*(script|iframe|frame|object|embed|link|meta|base|style|form)\b/i.test(html)) throw new Error("balise refusée dans la section (script, cadre, feuille ou formulaire) : le style passe par css");
  if (/[\s/"']on[a-z]+\s*=/i.test(html.replace(/onclick="return false"/g, ""))) throw new Error("attribut d'événement refusé (onclick…) dans la section");
  if (/(?:href|src|action|formaction|xlink:href)\s*=\s*["']?\s*(?:javascript:|vbscript:|data:text)/i.test(html)) throw new Error("lien refusé (javascript:) dans la section");
}
const PATH = /^[a-z0-9]+:nth-child\(\d{1,3}\)(?: > [a-z0-9]+:nth-child\(\d{1,3}\)){0,24}$/;

type EditArgs = { uid: string; edits?: { find: string; replace: string }[]; css?: string; hide?: string[]; show?: string[]; image?: { find: string; assetId: string }; clientTexts?: boolean };
const editTool: AgentTool<EditArgs> = {
  name: "custom.edit", module: "site", kind: "write", needsProject: true,
  description: "Étape 6 (gratuit) : MODIFIE une section du thème sur mesure sur demande du client, le reste ne bouge pas. Lis-la d'abord (custom.section). edits : remplacements exacts dans son HTML [{ find : passage recopié tel quel, présent une seule fois ; replace : nouveau passage }] pour les textes (ceux du client mot pour mot, jamais ceux d'un modèle, jamais d'avis, chiffre, délai ou certification inventés : « [À compléter : …] »), l'ordre des éléments, un élément ajouté ou retiré ; css : règles propres à la section, chaque sélecteur commence par :scope (couleurs, tailles, espacements, disposition) ; hide / show : adresses d'éléments désignés (ex. « div:nth-child(2) > a:nth-child(1) ») à masquer ou réafficher ; image : { find : photo actuelle (ex. photos/sl-h1.webp ou /api/files/…), assetId : image du client dans ses Fichiers, ou photo déjà créée pour son site (custom.images › photosDejaCreees, gratuit) }. Le client veut une autre photo et n'en a pas : propose-lui, en une question à choix, de reprendre une photo déjà créée pour son site (gratuit, dis laquelle) ou d'en créer une nouvelle (custom.photo, prix annoncé). clientTexts:true quand TOUS les textes de la section sont ceux du client. Aucun script, aucun lien extérieur.",
  args: z.object({
    uid: z.string().regex(/^s[0-9a-f]{8}$/),
    edits: z.array(z.object({ find: z.string().min(1).max(8000), replace: z.string().max(16000) }).strict()).max(40).optional(),
    css: z.string().max(12000).optional(), hide: z.array(z.string().max(400)).max(10).optional(), show: z.array(z.string().max(400)).max(10).optional(),
    image: z.object({ find: z.string().min(3).max(300), assetId: z.string().max(60) }).strict().optional(), clientTexts: z.boolean().optional(),
  }).strict(),
  run: (ctx, a) => {
    const p = project(ctx), t = loadCustomTheme(p.id);
    if (!t) return { ok: false, summary: L("Aucun thème sur mesure : il faut d'abord le concevoir (custom.design).", "No custom theme yet.") };
    const next: CustomTheme = JSON.parse(JSON.stringify(t));
    const x = findSection(next, a.uid);
    if (!x) return { ok: false, summary: L(`Section ${a.uid} introuvable.`, "Section not found."), internal: true };
    try {
      let html = sectionHtml(x.s);
      const done: string[] = [];
      for (const e of a.edits ?? []) {
        assertSafeHtml(e.replace);
        let find = e.find;
        // Texte vu à l'écran (apostrophe typographique, & encodé) : retrouvé dans le HTML s'il n'y est pas tel quel.
        if (!html.includes(find)) find = [find.replace(/&/g, "&amp;"), find.replace(/’/g, "'"), find.replace(/'/g, "’")].find((v) => html.includes(v)) ?? find;
        html = replaceOnce(html, find, e.replace);
        done.push(`« ${e.find.replace(/<[^>]+>/g, "").slice(0, 40)} » → « ${e.replace.replace(/<[^>]+>/g, "").slice(0, 40)} »`);
      }
      if (a.image) {
        const asset = getAsset(a.image.assetId);
        if (!asset || asset.project_id !== p.id || asset.deleted_at || asset.kind !== "image") throw new Error("image introuvable dans les Fichiers de ce projet");
        const file = a.image.find.replace(/^.*\//, "");
        // Photo déjà posée (adresse complète /api/files/…) : remplacée telle quelle, jamais coupée au milieu de l'adresse.
        const m = a.image.find.includes("/") && html.includes(a.image.find) ? [a.image.find] : html.match(new RegExp(`(?:photos/)?${file.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
        if (!m) throw new Error(`photo « ${a.image.find} » absente du HTML de la section (photo posée par un script : modifie la donnée du script avec edits)`);
        html = html.split(m[0]).join(assetUrl({ id: asset.id }));
        done.push(`photo ${file} remplacée par ${asset.name}`);
      }
      if (html !== sectionHtml(x.s)) { if (riskCount(html) > riskCount(sectionHtml(x.s))) throw new Error("modification refusée : elle ajouterait du code à la section (script, attribut d'événement ou lien javascript:)"); x.s.html = html; }
      let css = x.s.css ?? "";
      for (const h of a.hide ?? []) { if (!PATH.test(h)) throw new Error(`adresse d'élément invalide : ${h}`); css += `\n[data-ct="${a.uid}"] > ${h}{display:none!important}`; done.push(`élément masqué (${h})`); }
      for (const h of a.show ?? []) { const rule = `[data-ct="${a.uid}"] > ${h}{display:none!important}`; if (!css.includes(rule)) throw new Error(`élément ${h} n'est pas masqué`); css = css.split(rule).join("").replace(/\n{2,}/g, "\n"); done.push(`élément réaffiché (${h})`); }
      if (a.css) { css += "\n" + scopedCss(a.uid, a.css); done.push("mise en forme de la section"); }
      if (css.trim() !== (x.s.css ?? "").trim()) x.s.css = css.trim() || undefined;
      if (a.clientTexts !== undefined) x.s.clientTexts = a.clientTexts;
      if (!done.length && a.clientTexts === undefined) return { ok: false, summary: L("Aucune modification demandée.", "Nothing to change."), internal: true };
      return saved(ctx, next, `: section « ${libSection(x.s.id)?.title} » (${x.place}) modifiée — ${done.join(" ; ") || "textes marqués comme ceux du client"}`);
    } catch (e) { return { ok: false, summary: L(`Rien n'est modifié : ${(e as Error).message}.`, "Nothing changed."), hint: "Relis la section (custom.section) et recopie le passage exact ; ne dis pas au client que c'est fait." }; }
  },
};

const RATIO = z.enum(["1:1", "4:5", "2:3", "16:9", "9:16"]);
type PhotoArgs = { uid: string; find: string; description: string; ratio: z.infer<typeof RATIO>; product?: boolean; background?: string };
const photoUnit = () => { try { return photoRequestMaxMicro(mockupImageRoute(), { prompt: "x".repeat(PUBLICATION_PROMPT_MAX_BYTES), references: 2, aspect: "2:3", quality: "high" }); } catch { return null; } };
export const customPhotoDeps: { make?: (prompt: string, refs: { product: Buffer | null }, aspect: string) => Promise<Buffer>; unit?: () => number | null } = {};
const photoTool: AgentTool<PhotoArgs> = {
  name: "custom.photo", module: "site", kind: "generate", needsProject: true,
  description: "Étape 6 (PAYANT : une photo, prix annoncé et accord écrit du client d'abord) : crée UNE photo pour une section du thème sur mesure, dans la direction artistique de la marque (famille Moderne : charte de la famille ; personnes seulement si autorisées), et la pose à la place d'une photo d'exemple. find : photo actuelle dans le HTML de la section (ex. photos/sl-b4.webp) ; description : UNE photo décrite comme le propriétaire (type et cadrage ; surface et fond ; chaque objet à sa place, forme, matière, couleur ; « La scène contient exactement N objets » ; ce qui est dégagé ; lumière ; aucun texte, logo ni personne non voulue) ; ratio ; product:true dès que le produit du client est dans la photo (sa vraie photo sert de référence : jamais de pots, flacons ou emballages génériques aux étiquettes vides) ; background : couleur unie du fond seulement pour un produit seul qui doit se fondre dans une section unie, JAMAIS pour une photo d'ouverture ou d'ambiance (une scène de vie magnifique qui remplit tout le cadre, où l'on ressent l'émotion de l'angle). Une photo d'exemple détourée (fond transparent, ex. le mannequin de l'ouverture Moderne) est remplacée par une photo créée sur fond uni puis détourée par le Studio (gratuit) : décris le sujet entier, sans décor. Vérifie toi-même la photo créée avant de la montrer.",
  args: z.object({ uid: z.string().regex(/^s[0-9a-f]{8}$/), find: z.string().min(3).max(300), description: z.string().min(40).max(3000), ratio: RATIO, product: z.boolean().optional(), background: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional() }).strict(),
  estimate: (ctx) => {
    const u = (customPhotoDeps.unit ?? photoUnit)();
    if (u == null) throw new Error(L("Aucun modèle d'images utilisable pour les photos du site.", "No usable image model."));
    return { maxMicro: u, probableMicro: Math.round(u * 0.8), label: L("une photo du thème sur mesure", "one custom theme photo") };
  },
  run: async (ctx, a) => {
    const p = project(ctx), t = loadCustomTheme(p.id), x = t ? findSection(t, a.uid) : null;
    if (!t || !x) return { ok: false, summary: L(`Section ${a.uid} introuvable.`, "Section not found."), internal: true };
    const file = a.find.replace(/^.*\//, "");
    if (!sectionHtml(x.s).includes(file)) return { ok: false, summary: L(`Photo « ${a.find} » absente de la section : rien n'est créé ni payé.`, "Photo not in section."), internal: true };
    const authentic = authenticSection(x.s.id, p.business === "services" ? "services" : "products");
    if (authentic) return { ok: false, summary: L(`Cette photo montre ${authentic} : je ne peux pas l'inventer. Seule ta vraie photo va là (envoie-la avec le trombone 📎) ; rien n'est créé ni payé.`, "This photo cannot be invented."), hint: "Dis-le au client ; quand il envoie sa photo, pose-la avec custom.edit (image : { find, assetId })." };
    const refs = a.product ? imageReferences(p) : { product: null, logo: null, problem: null };
    const fam = loadFamilyChoice(p.id), people = peopleAllowed(p.id), fu = siteArtUniverse(fam, { people });
    if (fam && fam.family !== t.family) return { ok: false, summary: L("Le thème monté n'est pas de la famille choisie par le client : rien n'est créé ni payé. Il faut d'abord concevoir un thème dans sa famille.", "Theme family differs from the client's choice.") };
    const direction = siteArtDirection(p, fu, (() => { try { return journeyOf(ctx.conversationId); } catch { return null; } })());
    const place = textPlacementLine(sectionHtml(x.s), a.find, libSection(x.s.id)?.does ?? "");
    // Photo d'exemple détourée (ouverture Moderne) : créée sur fond uni, puis détourée par le Studio (gratuit).
    const cut = isCutoutPhoto(a.find);
    const prompt = codePhotoPrompt({ id: `ct-${a.uid}`, description: [a.description, place].filter(Boolean).join("\n"), ratio: a.ratio, background: cut ? FOND_A_DETOURER : a.background ?? null, product: !!a.product }, { name: p.brand?.name ?? p.name, logo: false, product: !!(a.product && refs.product), direction, people: !!fu && people });
    const jobId = getRun(ctx.runId)?.job_id ?? null;
    const usageKey = `syna:${ctx.runId}:custom-photo:${a.uid}:${file}`;
    let data: Buffer;
    try {
      data = customPhotoDeps.make ? await customPhotoDeps.make(prompt, { product: refs.product }, a.ratio)
        : await withQuotedImageRoute(mockupImageRoute(), () => aiSiteImageHd({ userId: ctx.user.id, projectId: p.id, jobId, usageKey }, { prompt, product: a.product ? refs.product : null, aspect: hdAspect(a.ratio) }));
    } catch (e) { return { ok: false, summary: L(`Photo non créée : ${(e as Error).message.slice(0, 200)}.`, "Photo not created."), hint: "Dis-le au client avec le coût réel ; ne relance rien sans son accord écrit (jamais après une erreur 5xx)." }; }
    let cutProblem: string | undefined;
    if (cut) { const done = await cutoutPhoto(data); data = done.data; cutProblem = done.problem; }
    const asset = await saveAsset({ projectId: p.id, userId: ctx.user.id, data, name: sitePhotoName(x.page?.label ?? x.place, a.description), mime: "image/png", role: "site", origin: "generated", meta: { synaPhoto: { description: a.description, ratio: a.ratio, page: x.place, direction: "custom", background: a.background ?? null, product: !!a.product } } });
    const res = editTool.run(ctx, { uid: a.uid, image: { find: a.find, assetId: asset.id } }) as Awaited<ReturnType<typeof editTool.run>>;
    const spent = all<{ c: number | null }>("SELECT SUM(cost) c FROM ai_calls WHERE project_id=? AND usage_key LIKE ?", p.id, `${usageKey}%`)[0]?.c ?? 0;
    const spentText = budgetPctText(ctx.user.id, spent, p.id).replace(/de votre budget/, "de ton budget");
    return {
      ...res,
      summary: L(`Photo créée${cut ? (cutProblem ? " (détourage impossible : photo pleine posée)" : " et détourée") : ""} et posée dans la section (${res.ok ? "enregistré" : "NON posée : " + res.summary}). Coût réel : ${spentText}.`, "Photo created."),
      hint: "La photo t'est jointe à ta prochaine réponse : vérifie-la toi-même (sujet entier, rien de coupé, aucun texte ni logo, fidèle au produit) et dis honnêtement au client si elle est réussie ou ratée.",
      data: { ...(res.data as object), assetId: asset.id, href: assetUrl({ id: asset.id }) },
    };
  },
};

const undoTool: AgentTool<Record<string, never>> = {
  name: "custom.undo", module: "site", kind: "write", needsProject: true,
  description: "Étape 6 (gratuit) : annule la DERNIÈRE modification du thème sur mesure (le client n'aime pas le changement) ; plusieurs appels remontent plusieurs modifications.",
  args: z.object({}).strict(),
  run: (ctx) => {
    const p = project(ctx), back = undoCustomTheme(p.id);
    if (!back) return { ok: false, summary: L("Aucune modification à annuler.", "Nothing to undo.") };
    return { ok: true, summary: L(`Dernière modification annulée (le thème est revenu à la version d'avant).`, "Last change undone."), data: { customTheme: themeCard(p.id, back) }, changes: [{ module: "site", object: "thème sur mesure", summary: L("modification annulée", "undone"), after: { rev: back.rev }, verified: true }] };
  },
};

const chooseTool: AgentTool<Record<string, never>> = {
  name: "custom.choose", module: "site", kind: "write", needsProject: true,
  description: "Étape 6 (gratuit) : enregistre que le client CHOISIT ce thème sur mesure (seulement s'il le dit ; jamais à sa place). Refusé tant qu'un point bloquant reste.",
  args: z.object({}).strict(),
  preview: () => "Thème sur mesure choisi par le client.",
  run: (ctx) => {
    const p = project(ctx), t = loadCustomTheme(p.id);
    if (!t) return { ok: false, summary: L("Aucun thème sur mesure : il faut d'abord le concevoir (custom.concepts).", "No custom theme yet.") };
    // Décision du propriétaire du 10 novembre 2026 : aucune image ne reste vide ni avec la photo de démonstration.
    const left = photoSlots(t, photoSite(ctx)).filter((x) => x.kind !== "produit");
    if (left.length) return { ok: false, summary: L(`Thème pas encore prêt à être choisi : ${left.length} photo(s) d'exemple restent (${[...new Set(left.map((x) => x.place))].join(", ")}).`, "Sample photos remain."), hint: "Dis-le au client simplement et propose de les créer (custom.build, devis d'abord) ou de mettre ses images ; rien n'est validé tant qu'une photo d'exemple reste." };
    const r = saved(ctx, { ...t, chosen: true }, "choisi par le client", { strict: true });
    // Essai réel du 9 novembre : le choix ne fermait pas l'étape 6 dans le parcours.
    // Audit du 10 novembre : l'étape 7 renvoyait ensuite vers les anciennes maquettes. Elle devient la mise en boutique du
    // thème sur mesure (pas encore disponible) ; l'étape 8 (un thème du Studio) est sans objet.
    if (r.ok) { try { updateJourneyConv(ctx.conversationId, (x) => { setJourneyStep(x, 6, "done", L("thème sur mesure choisi", "custom theme chosen")); x.customChosenAt = Date.now(); setJourneyStep(x, 8, "skipped", L("Thème sur mesure choisi : pas de thème du Studio à monter.", "Custom theme chosen.")); }); } catch { /* fil sans parcours */ } }
    const sample = t.pages.flatMap((pg) => pg.sections).some((s) => !s.clientTexts);
    return { ...r, hint: `${sample ? "Des textes ou photos d'exemple restent : dis-le au client et propose de les remplacer avant la mise en boutique. " : ""}La mise en boutique Shopify du thème sur mesure (étape 7) se prépare ensuite ; ne dis pas qu'elle est faite.` };
  },
};

export const customThemeTools: AgentTool[] = [sectionsTool, imagesTool, buildTool, designTool, conceptsTool, conceptTool, composeTool, showTool, readTool, structureTool, editTool, photoTool, undoTool, chooseTool];
