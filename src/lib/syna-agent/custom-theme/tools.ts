/**
 * Outils SINA des THÈMES SUR MESURE (étape 6 ; décision du propriétaire du 9 novembre 2026 : « on ne va plus appeler
 * ça maquette mais thème sur mesure » ; « elle doit pouvoir tout faire sur ses thèmes et sections »).
 *  - custom.sections  : sections de la bibliothèque de la famille choisie, par rôle (gratuit) ;
 *  - custom.compose   : monte le thème (point de départ validé ou pages choisies), règles du propriétaire contrôlées ;
 *  - custom.show      : montre le thème en vrai (pages, téléphone, désignation d'un élément) ;
 *  - custom.section   : lit le HTML d'une section avant de la modifier ;
 *  - custom.structure : ajoute, retire, déplace, remplace des sections ou des pages ;
 *  - custom.edit      : modifie une section sur demande (textes, mise en page, couleurs, élément désigné, photo du client) ;
 *  - custom.photo     : crée une photo pour une section (payant, prix annoncé et accord d'abord) ;
 *  - custom.undo      : annule la dernière modification ;
 *  - custom.choose    : enregistre le thème choisi PAR LE CLIENT.
 * Tout est gratuit sauf custom.photo ; rien n'est publié.
 */
import { z } from "zod";
import { L } from "../../i18n-server";
import { all } from "../../db";
import { assetUrl, getAsset, saveAsset } from "../../library";
import { aiSiteImageHd, photoRequestMaxMicro, PUBLICATION_PROMPT_MAX_BYTES, withQuotedImageRoute } from "../../ai/media-providers";
import { budgetPctText } from "../../ai/budget-pct";
import { peopleAllowed } from "../../people-policy";
import { getRun } from "../store";
import type { AgentTool, ToolContext } from "../types";
import { project } from "../tools/common";
import { familyArtUniverse, loadFamilyChoice } from "../section-families";
import { codePhotoPrompt } from "../mockup-code/code-mockup";
import { hdAspect } from "../mockup-code/prompts";
import { imageReferences, mockupImageRoute } from "../mockup-code/tools";
import { familySections, libSection, sectionByRef, isCardSection } from "./library";
import { applyStructure, checkCustomTheme, findSection, loadCustomTheme, replaceOnce, saveCustomTheme, scopedCss, sectionHtml, undoCustomTheme, type CustomTheme, type StructureOp } from "./theme";
import { starterTheme } from "./starters";
import { enqueue } from "../../jobs";
import { setStep as setJourneyStep, updateJourney as updateJourneyConv } from "../journey";
import { clientImages, CUSTOM_BRAND_JOB, examplePhotoCount, photoSlots, photosToCreate, SECTION_TEXT_CAP_MICRO, type ImagesMode } from "./brand";

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
  };
}
const ref = (r: string) => {
  const l = sectionByRef(r);
  if (!l) throw new Error(`section « ${r} » absente de la bibliothèque (custom.sections pour la liste)`);
  return l.id;
};
const familyOrError = (projectId: string) => {
  const f = loadFamilyChoice(projectId);
  if (!f) throw new Error("famille de sections pas encore choisie par le client : theme.families puis theme.family d'abord");
  return f;
};
function saved(ctx: ToolContext, t: CustomTheme, what: string) {
  const p = project(ctx);
  const problems = checkCustomTheme(t);
  const blocking = problems.filter((x) => x.level === "bloquant");
  if (blocking.length) return { ok: false, internal: false, summary: L(`Rien n'est enregistré : ${blocking.map((x) => x.text).join(" ; ")}.`, "Not saved: rule broken."), hint: "Corrige la composition (règles du propriétaire) puis relance ; ne dis jamais au client que c'est fait." };
  const next = saveCustomTheme(p.id, t);
  const verified = loadCustomTheme(p.id)?.rev === next.rev;
  const card = themeCard(p.id, next);
  const review = problems.filter((x) => x.level === "à revoir").map((x) => x.text);
  return {
    ok: verified,
    summary: L(`Thème sur mesure ${what} (version ${next.rev}).${review.length ? ` À revoir : ${review.join(" ; ")}.` : ""}`, "Custom theme saved."),
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
    const byRole: Record<string, { id: string; titre: string; place: string; fait: string; cartes?: true; style?: string }[]> = {};
    for (const s of list) (byRole[s.role] ??= []).push({ id: s.id, titre: s.title, place: s.kind, fait: s.does.slice(0, 260), ...(isCardSection(s) ? { cartes: true as const } : {}), ...(s.style ? { style: s.style } : {}) });
    return {
      ok: true,
      summary: L(`${list.length} section(s) de la famille ${f.family}${a.role ? ` (rôle ${a.role})` : ""}.`, `${list.length} sections.`),
      hint: "Règles : une seule section de cartes (cartes:true) par page ; « Produit vedette » seulement en haut de la fiche produit ou une fois sur l'accueil ; jamais la même section deux fois de suite ; chaque section a un rôle dans l'histoire de la page ; ouverture de l'accueil = grande photo pleine avec le titre dessus.",
      data: { famille: f.family, style: f.style, roles: byRole },
    };
  },
};

type PageArg = { key: string; label: string; sections: string[] };
const composeTool: AgentTool<{ start?: boolean; header?: string; footer?: string; search?: string | null; pages?: PageArg[] }> = {
  name: "custom.compose", module: "site", kind: "write", needsProject: true,
  description: "Étape 6 (gratuit) : MONTE le thème sur mesure du client avec les sections de SA famille, à ses couleurs, polices, nom et logo. start:true part de la composition validée par le propriétaire pour sa famille et son style (Sport chic, Streetwear néon ou Classique) ; sinon pages : [{ key (home, shop, product, cart, about, contact, journal, 404… ou product-<nom>), label, sections : identifiants ou titres de custom.sections, dans l'ordre }] avec header, footer (et search pour la famille Moderne). Les règles du propriétaire sont contrôlées : un point bloquant n'enregistre rien. Remplace le thème en cours (l'ancien reste dans l'historique : custom.undo).",
  args: z.object({
    start: z.boolean().optional(), header: z.string().max(80).optional(), footer: z.string().max(80).optional(), search: z.string().max(80).nullable().optional(),
    pages: z.array(z.object({ key: z.string().regex(/^[a-z0-9-]{1,40}$/), label: z.string().min(1).max(40), sections: z.array(z.string().max(80)).min(1).max(16) }).strict()).min(1).max(12).optional(),
  }).strict(),
  run: (ctx, a) => {
    const p = project(ctx);
    try {
      const f = familyOrError(p.id);
      const base = starterTheme(f.family, f.style);
      if (!a.start && !a.pages) return { ok: false, summary: L("Indique start:true ou les pages du thème.", "start or pages required."), internal: true };
      let t: CustomTheme = base;
      if (a.pages) {
        t = { ...base, pages: [] };
        t = applyStructure(t, a.pages.flatMap((pg) => [{ op: "page", key: pg.key, label: pg.label } as StructureOp, ...pg.sections.map((s) => ({ op: "add", page: pg.key, section: ref(s) }) as StructureOp)]));
      }
      if (a.header) t = applyStructure(t, [{ op: "shell", slot: "header", section: ref(a.header) }]);
      if (a.footer) t = applyStructure(t, [{ op: "shell", slot: "footer", section: ref(a.footer) }]);
      if (a.search !== undefined) t = applyStructure(t, [{ op: "shell", slot: "search", section: a.search ? ref(a.search) : null }]);
      return saved(ctx, { ...t, chosen: false }, a.pages ? `monté : ${t.pages.map((x) => x.label).join(", ")}` : `monté d'après la composition validée (${f.family === "classique" ? "Classique" : f.style})`);
    } catch (e) { return { ok: false, summary: (e as Error).message, internal: true }; }
  },
};

/** Coût probable d'une écriture de section (mesuré sur les textes du site : environ 0,06 € avec le modèle des textes). */
export const SECTION_TEXT_TYPICAL_MICRO = 60_000;
type BuildArgs = { pages?: PageArg[]; photos?: boolean; images?: ImagesMode; clientAssets?: string[] };
/** Thème à monter : celui en cours, sinon la composition validée du style choisi (ou les pages données). */
function buildPlan(ctx: ToolContext, a: BuildArgs): CustomTheme {
  const p = project(ctx);
  const f = familyOrError(p.id);
  const cur = loadCustomTheme(p.id);
  if (cur && !a.pages) return cur;
  const base = starterTheme(f.family, f.style);
  if (!a.pages) return base;
  return applyStructure({ ...base, pages: [] }, a.pages.flatMap((pg) => [{ op: "page", key: pg.key, label: pg.label } as StructureOp, ...pg.sections.map((s) => ({ op: "add", page: pg.key, section: ref(s) }) as StructureOp)]));
}
const buildTool: AgentTool<BuildArgs> = {
  name: "custom.build", module: "site", kind: "generate", needsProject: true,
  description: "Étape 6, THÈME SUR MESURE (PAYANT : devis du Studio annoncé en % du budget, accord écrit du client d'abord) : une fois le style CHOISI PAR LE CLIENT (theme.family) et sa réponse sur les images (custom.images : ses images, les tiennes, ou les deux), images : « client » (ses images seulement, autant que d'emplacements), « mix » (ses images d'abord, tu crées les autres) ou « sina » (tu crées tout) ; clientAssets : ses images (identifiants de custom.images), dans l'ordre des emplacements. monte son thème avec TOUTES les sections prévues pour ce style, à sa marque : tous les textes écrits pour lui (ses faits seulement, jamais ceux d'un modèle) et toutes les photos (vraies photos de ses produits, sinon photos créées dans la direction artistique de son style). Sans pages : la composition validée du style (ou le thème déjà en cours) ; pages : composition adaptée à son projet (mêmes règles que custom.compose). photos:false = textes seulement. Tâche de fond ; le thème est ensuite EN PLACE dans l'onglet Boutique, où le client demande ses changements et désigne les éléments.",
  args: z.object({
    pages: z.array(z.object({ key: z.string().regex(/^[a-z0-9-]{1,40}$/), label: z.string().min(1).max(40), sections: z.array(z.string().max(80)).min(1).max(16) }).strict()).min(1).max(12).optional(),
    photos: z.boolean().optional(),
    images: z.enum(["sina", "client", "mix"]).optional(),
    clientAssets: z.array(z.string().max(60)).max(80).optional(),
  }).strict(),
  estimate: (ctx, a) => {
    const t = buildPlan(ctx, a);
    const sections = allSectionsCount(t), photos = a.photos === false ? 0 : photosToCreate(examplePhotoCount(t), a.images ?? "sina", a.clientAssets?.length ?? 0);
    const unit = (customPhotoDeps.unit ?? photoUnit)();
    if (photos && unit == null) throw new Error(L("Aucun modèle d'images utilisable pour les photos du site.", "No usable image model."));
    return { maxMicro: sections * SECTION_TEXT_CAP_MICRO + photos * (unit ?? 0), probableMicro: sections * SECTION_TEXT_TYPICAL_MICRO + Math.round(photos * (unit ?? 0) * 0.8), label: L(`thème sur mesure monté à ta marque : ${sections} sections écrites${photos ? `, ${photos} photos créées` : ""}${a.clientAssets?.length ? `, ${a.clientAssets.length} de tes images posées` : ""}`, "custom theme built for the brand") };
  },
  run: async (ctx, a) => {
    const p = project(ctx);
    let t: CustomTheme;
    try { t = buildPlan(ctx, a); } catch (e) { return { ok: false, summary: (e as Error).message, hint: "Le client choisit d'abord son style (theme.families puis theme.family)." }; }
    const blocking = checkCustomTheme(t).filter((x) => x.level === "bloquant");
    if (blocking.length) return { ok: false, internal: true, summary: `Composition refusée : ${blocking.map((x) => x.text).join(" ; ")}.` };
    // Images du client : seulement les siennes (Fichiers du projet), et le bon nombre quand il veut n'utiliser que les siennes.
    const mode = a.images ?? "sina", own = new Set(clientImages(p.id).map((x) => x.id));
    const foreign = (a.clientAssets ?? []).filter((id) => !own.has(id));
    if (foreign.length) return { ok: false, internal: true, summary: `Images inconnues ou qui ne viennent pas du client : ${foreign.join(", ")} (custom.images donne ses images).` };
    if (mode !== "sina" && !a.clientAssets?.length) return { ok: false, summary: L("Aucune image du client à poser : demande-lui d'abord ses images (custom.images dit combien il en faut).", "No client images yet.") };
    const needed = examplePhotoCount(t);
    if (mode === "client" && (a.clientAssets?.length ?? 0) < needed) return { ok: false, summary: L(`Il faut ${needed} images et le client en a donné ${a.clientAssets!.length} : rien n'est lancé.`, "Not enough client images."), hint: `Dis-le au client simplement et propose-lui : m'envoyer les ${needed - a.clientAssets!.length} qui manquent, que tu crées les autres (images:\"mix\", prix annoncé), ou que tu crées toutes les images (images:\"sina\").` };
    if (!loadCustomTheme(p.id) || a.pages) t = saveCustomTheme(p.id, { ...t, chosen: false });
    const est = await buildTool.estimate!(ctx, a);
    const job = enqueue({ userId: ctx.user.id, projectId: p.id, type: CUSTOM_BRAND_JOB, label: L("Thème sur mesure monté à ta marque (SINA)", "Custom theme built for your brand (SINA)"), payload: { projectId: p.id, capMicro: est.maxMicro, conversationId: ctx.conversationId, photos: a.photos !== false, images: mode, clientAssets: a.clientAssets ?? [] }, maxAttempts: 2, idempotencyKey: `syna:${ctx.runId}:custom-brand:${t.rev}` });
    try { updateJourneyConv(ctx.conversationId, (x) => setJourneyStep(x, 6, "doing")); } catch { /* fil sans parcours */ }
    return {
      ok: true, jobs: [job.id],
      summary: L(`Montage du thème sur mesure à ta marque lancé (${allSectionsCount(t)} sections, ${a.photos === false ? "textes seulement" : `${needed} photos : ${a.clientAssets?.length ? `${Math.min(needed, a.clientAssets.length)} de ses images, ` : ""}${photosToCreate(needed, mode, a.clientAssets?.length ?? 0)} créées`}).`, "Custom theme build started."),
      hint: "Quand la tâche est finie, dis au client que son thème est en place dans l'onglet Boutique (lien « Ouvrir la Boutique » de la carte), qu'il peut le regarder en grand et désigner un élément pour demander un changement. Dis honnêtement ce que le rapport signale (textes non remplacés, photos non créées).",
      data: { customTheme: themeCard(p.id, t) },
    };
  },
};
const allSectionsCount = (t: CustomTheme) => (t.header ? 1 : 0) + (t.footer ? 1 : 0) + (t.search ? 1 : 0) + t.pages.reduce((n, pg) => n + pg.sections.length, 0);

const imagesTool: AgentTool<Record<string, never>> = {
  name: "custom.images", module: "site", kind: "read", needsProject: true,
  description: "Étape 6 (gratuit), AVANT custom.build : combien d'images il faut pour le thème sur mesure du style choisi (un emplacement par photo, page par page) et quelles images le client a déjà envoyées (identifiants pour clientAssets). Sert à lui demander s'il veut monter son site avec SES images ou si tu les crées, et à lui dire le nombre exact d'images à envoyer.",
  args: z.object({}).strict(),
  run: (ctx) => {
    const p = project(ctx);
    let t: CustomTheme;
    try { t = buildPlan(ctx, {}); } catch (e) { return { ok: false, summary: (e as Error).message, hint: "Le client choisit d'abord son style (theme.families puis theme.family)." }; }
    const slots = photoSlots(t), mine = clientImages(p.id);
    const byPage: Record<string, number> = {};
    for (const s of slots) byPage[s.place] = (byPage[s.place] ?? 0) + 1;
    return {
      ok: true,
      summary: L(`Il faut ${slots.length} images pour ce thème (${Object.entries(byPage).map(([k, n]) => `${k} : ${n}`).join(", ")}). Images déjà envoyées par le client : ${mine.length}.`, `${slots.length} images needed.`),
      hint: `Demande au client, en une question à choix : « Tu montes ton site avec tes images, ou je les crée ? ». S'il prend les siennes : dis-lui qu'il en faut ${slots.length} (par page : ${Object.entries(byPage).map(([k, n]) => `${k} ${n}`).join(", ")}) et qu'il les envoie avec le trombone (📎) ; s'il en a moins, propose de créer celles qui manquent (images:"mix", prix annoncé) ou de toutes les créer (images:"sina"). Les vraies photos de ses produits servent toujours aux photos de ses produits. Puis custom.build avec images et clientAssets (identifiants ci-dessous), après son accord sur le prix.`,
      data: { imagesNecessaires: slots.length, parPage: byPage, emplacements: slots.map((s) => `${s.place} › ${s.section}`), imagesDuClient: mine.map((x) => ({ id: x.id, nom: x.name })) },
    };
  },
};

const showTool: AgentTool<Record<string, never>> = {
  name: "custom.show", module: "site", kind: "read", needsProject: true,
  description: "Étape 6 (gratuit) : montre au client son thème sur mesure EN VRAI dans le fil (toutes les pages, vue téléphone, bouton « Désigner un élément ») et te donne sa composition (uid de chaque section, textes du client ou d'exemple, points à revoir).",
  args: z.object({}).strict(),
  run: (ctx) => {
    const p = project(ctx), t = loadCustomTheme(p.id);
    if (!t) return { ok: false, summary: L("Aucun thème sur mesure : custom.compose d'abord.", "No custom theme yet.") };
    return { ok: true, summary: L(`Thème sur mesure affiché (version ${t.rev}, ${t.pages.length} pages).`, "Custom theme shown."), data: { customTheme: themeCard(p.id, t) } };
  },
};

const readTool: AgentTool<{ uid: string }> = {
  name: "custom.section", module: "site", kind: "read", needsProject: true,
  description: "Étape 6 (gratuit) : lit une section du thème (uid de custom.show ou de l'élément désigné par le client) : son HTML actuel et ses règles CSS propres, à lire AVANT custom.edit pour recopier les passages exacts à changer.",
  args: z.object({ uid: z.string().regex(/^s[0-9a-f]{8}$/) }).strict(),
  run: (ctx, a) => {
    const p = project(ctx), t = loadCustomTheme(p.id), x = t ? findSection(t, a.uid) : null;
    if (!t || !x) return { ok: false, summary: L(`Section ${a.uid} introuvable dans le thème.`, "Section not found."), internal: true };
    const l = libSection(x.s.id);
    const html = sectionHtml(x.s);
    return { ok: true, summary: L(`Section « ${l?.title} » (${x.place}) lue.`, "Section read."), data: { uid: a.uid, titre: l?.title, role: l?.role, place: x.place, fait: l?.does, textesClient: !!x.s.clientTexts, css: x.s.css ?? "", html: html.length > 30000 ? html.slice(0, 30000) + "…[coupé]" : html } };
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
    if (!t) return { ok: false, summary: L("Aucun thème sur mesure : custom.compose d'abord.", "No custom theme yet.") };
    try {
      const ops = a.ops.map((o) => ("section" in o && o.section ? { ...o, section: ref(o.section) } : o)) as StructureOp[];
      return saved(ctx, applyStructure(t, ops), `modifié (${a.ops.map((o) => o.op).join(", ")})`);
    } catch (e) { return { ok: false, summary: (e as Error).message, internal: true }; }
  },
};

/** Contenu permis dans une section retouchée : aucun script ni ressource extérieure (lot 9 : aucun script dans les sections d'un projet). */
export function assertSafeHtml(html: string): void {
  if (/<\s*(script|iframe|object|embed|link|meta|base|style|form)\b/i.test(html)) throw new Error("balise refusée dans la section (script, cadre, feuille ou formulaire) : le style passe par css");
  if (/\son[a-z]+\s*=/i.test(html.replace(/onclick="return false"/g, ""))) throw new Error("attribut d'événement refusé (onclick…) dans la section");
  if (/(?:href|src|action)\s*=\s*["']?\s*(?:javascript:|data:text)/i.test(html)) throw new Error("lien refusé (javascript:) dans la section");
}
const PATH = /^[a-z0-9]+:nth-child\(\d{1,3}\)(?: > [a-z0-9]+:nth-child\(\d{1,3}\)){0,24}$/;

type EditArgs = { uid: string; edits?: { find: string; replace: string }[]; css?: string; hide?: string[]; show?: string[]; image?: { find: string; assetId: string }; clientTexts?: boolean };
const editTool: AgentTool<EditArgs> = {
  name: "custom.edit", module: "site", kind: "write", needsProject: true,
  description: "Étape 6 (gratuit) : MODIFIE une section du thème sur mesure sur demande du client, le reste ne bouge pas. Lis-la d'abord (custom.section). edits : remplacements exacts dans son HTML [{ find : passage recopié tel quel, présent une seule fois ; replace : nouveau passage }] pour les textes (ceux du client mot pour mot, jamais ceux d'un modèle, jamais d'avis, chiffre, délai ou certification inventés : « [À compléter : …] »), l'ordre des éléments, un élément ajouté ou retiré ; css : règles propres à la section, chaque sélecteur commence par :scope (couleurs, tailles, espacements, disposition) ; hide / show : adresses d'éléments désignés (ex. « div:nth-child(2) > a:nth-child(1) ») à masquer ou réafficher ; image : { find : photo actuelle (ex. photos/sl-h1.webp), assetId : image du client dans ses Fichiers }. clientTexts:true quand TOUS les textes de la section sont ceux du client. Aucun script, aucun lien extérieur.",
  args: z.object({
    uid: z.string().regex(/^s[0-9a-f]{8}$/),
    edits: z.array(z.object({ find: z.string().min(1).max(8000), replace: z.string().max(16000) }).strict()).max(40).optional(),
    css: z.string().max(12000).optional(), hide: z.array(z.string().max(400)).max(10).optional(), show: z.array(z.string().max(400)).max(10).optional(),
    image: z.object({ find: z.string().min(3).max(300), assetId: z.string().max(60) }).strict().optional(), clientTexts: z.boolean().optional(),
  }).strict(),
  run: (ctx, a) => {
    const p = project(ctx), t = loadCustomTheme(p.id);
    if (!t) return { ok: false, summary: L("Aucun thème sur mesure : custom.compose d'abord.", "No custom theme yet.") };
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
        const m = html.match(new RegExp(`(?:photos/)?${file.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
        if (!m) throw new Error(`photo « ${a.image.find} » absente du HTML de la section (photo posée par un script : modifie la donnée du script avec edits)`);
        html = html.split(m[0]).join(assetUrl({ id: asset.id }));
        done.push(`photo ${file} remplacée par ${asset.name}`);
      }
      if (html !== sectionHtml(x.s)) x.s.html = html;
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
  description: "Étape 6 (PAYANT : une photo, prix annoncé et accord écrit du client d'abord) : crée UNE photo pour une section du thème sur mesure, dans la direction artistique de la marque (famille Moderne : charte de la famille ; personnes seulement si autorisées), et la pose à la place d'une photo d'exemple. find : photo actuelle dans le HTML de la section (ex. photos/sl-b4.webp) ; description : UNE photo décrite comme le propriétaire (type et cadrage ; surface et fond ; chaque objet à sa place, forme, matière, couleur ; « La scène contient exactement N objets » ; ce qui est dégagé ; lumière ; aucun texte, logo ni personne non voulue) ; ratio ; product:true si c'est le produit du client (sa vraie photo sert de référence) ; background : couleur unie du fond si la photo doit se fondre dans la section. Les photos détourées (fond transparent) ne sont pas encore possibles : choisis une photo pleine. Vérifie toi-même la photo créée avant de la montrer.",
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
    const refs = a.product ? imageReferences(p) : { product: null, logo: null, problem: null };
    const fam = loadFamilyChoice(p.id), people = peopleAllowed(p.id), fu = familyArtUniverse(fam, { people });
    const direction = fu ? `${fu.style} ; ${fu.idea} ; lumière : ${fu.light} ; décors : ${fu.setting} ; couleurs de la marque : ${[p.brand?.palette?.dark, p.brand?.palette?.primary, p.brand?.palette?.accent].filter(Boolean).join(", ")}.` : null;
    const prompt = codePhotoPrompt({ id: `ct-${a.uid}`, description: a.description, ratio: a.ratio, background: a.background ?? null, product: !!a.product }, { name: p.brand?.name ?? p.name, logo: false, product: !!(a.product && refs.product), direction, people: !!fu && people });
    const jobId = getRun(ctx.runId)?.job_id ?? null;
    const usageKey = `syna:${ctx.runId}:custom-photo:${a.uid}:${file}`;
    let data: Buffer;
    try {
      data = customPhotoDeps.make ? await customPhotoDeps.make(prompt, { product: refs.product }, a.ratio)
        : await withQuotedImageRoute(mockupImageRoute(), () => aiSiteImageHd({ userId: ctx.user.id, projectId: p.id, jobId, usageKey }, { prompt, product: a.product ? refs.product : null, aspect: hdAspect(a.ratio) }));
    } catch (e) { return { ok: false, summary: L(`Photo non créée : ${(e as Error).message.slice(0, 200)}.`, "Photo not created."), hint: "Dis-le au client avec le coût réel ; ne relance rien sans son accord écrit (jamais après une erreur 5xx)." }; }
    const asset = await saveAsset({ projectId: p.id, userId: ctx.user.id, data, name: `theme-sur-mesure-${file.replace(/\.[a-z]+$/, "")}.png`, mime: "image/png", role: "site", origin: "generated", meta: { synaPhoto: { description: a.description, ratio: a.ratio, page: x.place, direction: "custom", background: a.background ?? null, product: !!a.product } } });
    const res = editTool.run(ctx, { uid: a.uid, image: { find: a.find, assetId: asset.id } }) as Awaited<ReturnType<typeof editTool.run>>;
    const spent = all<{ c: number | null }>("SELECT SUM(cost) c FROM ai_calls WHERE project_id=? AND usage_key LIKE ?", p.id, `${usageKey}%`)[0]?.c ?? 0;
    const spentText = budgetPctText(ctx.user.id, spent, p.id).replace(/de votre budget/, "de ton budget");
    return {
      ...res,
      summary: L(`Photo créée et posée dans la section (${res.ok ? "enregistré" : "NON posée : " + res.summary}). Coût réel : ${spentText}.`, "Photo created."),
      hint: "La photo t'est JOINTE : vérifie-la toi-même (sujet entier, rien de coupé, aucun texte ni logo, fidèle au produit) et dis honnêtement au client si elle est réussie ou ratée.",
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
    if (!t) return { ok: false, summary: L("Aucun thème sur mesure : custom.compose d'abord.", "No custom theme yet.") };
    const r = saved(ctx, { ...t, chosen: true }, "choisi par le client");
    // Essai réel du 9 novembre : le choix ne fermait pas l'étape 6 dans le parcours.
    if (r.ok) { try { updateJourneyConv(ctx.conversationId, (x) => setJourneyStep(x, 6, "done", L("thème sur mesure choisi", "custom theme chosen"))); } catch { /* fil sans parcours */ } }
    const sample = t.pages.flatMap((pg) => pg.sections).some((s) => !s.clientTexts);
    return { ...r, hint: `${sample ? "Des textes ou photos d'exemple restent : dis-le au client et propose de les remplacer avant la mise en boutique. " : ""}La mise en boutique Shopify du thème sur mesure (étape 7) se prépare ensuite ; ne dis pas qu'elle est faite.` };
  },
};

export const customThemeTools: AgentTool[] = [sectionsTool, imagesTool, buildTool, composeTool, showTool, readTool, structureTool, editTool, photoTool, undoTool, chooseTool];
