/**
 * SINA (#492), outils des étapes 6 et 7 (exportés ici, enregistrés par le registre commun) :
 *  - mockup.pages      : inventaire des pages et couverture des maquettes (gratuit) ;
 *  - mockup.prepare    : prépare 1 à 3 maquettes (découpage en images, consigne de chaque image, devis), sans générer ;
 *  - mockup.generate   : crée les images prévues d'une maquette avec l'IA d'images (payant, plafonné au devis) ;
 *  - mockup.attach     : range une image (créée ou fournie) dans une maquette, pour une version et des pages ;
 *  - mockup.choose     : enregistre la maquette choisie PAR LE CLIENT (complète seulement) ;
 *  - site.code_from_mockup : lance l'étape 7 (payante, plafonnée au devis) ;
 *  - mockup.report     : rapport de la dernière étape 7 (page par page).
 */
import sharp from "sharp";
import { z } from "zod";
import { HttpError } from "../../auth";
import { all } from "../../db";
import { enqueue } from "../../jobs";
import { L } from "../../i18n-server";
import { assetData, assetUrl, getAsset, saveAsset } from "../../library";
import { aiSiteMockup, mockupMaskEdit, mockupMaskEditMaxMicro, photoRequestMaxMicro, PUBLICATION_PROMPT_MAX_BYTES, withQuotedImageRoute } from "../../ai/media-providers";
import { getJsonSetting } from "../../settings";
import { budgetPctText } from "../../ai/budget-pct";

import { getStrategyState } from "../../marketing-strategy";
import { assertSectionGeneration } from "../../theme/custom-access";
import { journeyOf, setStep, updateJourney } from "../journey";
import { angleDetails, COPY_CAP_MICRO, COPY_MODEL, COPY_SYSTEM, copyPrompt, editPageCopy, fixAndCheckCopy, loadSiteCopy, saveSiteCopy, writePageCopy, type PageCopy } from "./copy";
import { pageByKey } from "./pages";
import { getRun } from "../store";
import { jobSpentMicro } from "../budget";
import { withTrace } from "../../ai/trace";
import { activityPlan } from "../activity";
import { listProducts } from "../../products/catalog";
import type { AgentTool, ToolContext } from "../types";
import { project } from "../tools/common";
import { step7CallMaxMicro } from "./deps";
import { MOCKUP_CODE_JOB, STEP7_REPORT_KEY } from "./job";
import { attachImage, coverageOf, loadMockupSet, plannedDirection, saveMockupSet, type MockupSet } from "./mockup-set";
import { inventoryOptionsOf, mockupPages } from "./pages";
import { mockupFacts, mockupImagePrompt, mockupImagesMaxMicro } from "./prompts";
import { step7MaxMicro } from "./pipeline";
import { checkMaxMicro, mockupCheckCall, MockupCheckSchema, mockupCheckVerdict, type MockupCheck } from "./check";
import { llmJson } from "../../ai/llm";
import { blackShare, boxesOf, exactTexts, missingTexts, locateCall, locateMaxMicro, LocateSchema, mockupEditPrompt, pasteZones, type Box, type EditChange, type Locate } from "./edit";

/** Remplaçables par les tests : coût d'une image de maquette et coût maximal des appels de l'étape 7. */
export const mockupToolDeps: { imageMaxMicro?: (references: number) => number | null; callMaxMicro?: typeof step7CallMaxMicro; generateImage?: (prompt: string, refs: { logo: Buffer | null; product: Buffer | null }) => Promise<Buffer>; checkImage?: (data: Buffer, img: { viewport: "desktop" | "phone"; pages: string[] }) => Promise<MockupCheck>; locate?: (image: Buffer, changes: EditChange[]) => Promise<Locate>; maskEdit?: (image: Buffer, mask: Buffer | null, prompt: string) => Promise<Buffer> } = {};
/**
 * Modèle des images de maquette : OpenAI GPT Image 2.5 Flare (choix du propriétaire du 8 novembre, après comparaison
 * réelle sur l'accueil Brindi : Qwen abîmait les textes, OpenAI les écrivait juste ; même modèle que les logos),
 * modifiable sans code par le réglage « syna.mockup.image_route » (« fournisseur:modèle »). Aucun relais vers un autre
 * modèle : la route du devis est la seule permise pendant la création.
 */
export function mockupImageRoute(): { provider: string; model: string } {
  const [provider, model] = getJsonSetting<string>("syna.mockup.image_route", "openai:gpt-image-2.5-flare").split(":");
  return { provider, model };
}
const routeUnit = (refs: number) => { try { return photoRequestMaxMicro(mockupImageRoute(), { prompt: "x".repeat(PUBLICATION_PROMPT_MAX_BYTES), references: refs, aspect: "2:3", quality: "high" }); } catch { return null; } };
const imageUnit = (refs: number) => (mockupToolDeps.imageMaxMicro ?? routeUnit)(refs);
const callUnits = (userId: string) => (mockupToolDeps.callMaxMicro ?? step7CallMaxMicro)(userId);

const KEY = z.enum(["A", "B", "C"]);
const pagesOf = (p: ReturnType<typeof project>) => mockupPages(p.business, p.storeType, inventoryOptionsOf(p));

function angleOf(projectId: string): string | undefined {
  try {
    const st: any = getStrategyState(projectId);
    const a = st.active ? st.angles?.find((x: any) => x.id === st.active.angleId) ?? st.active.angle : null;
    return a ? [`angle « ${a.title ?? ""} »`, a.message || a.promise ? `accroche « ${a.message ?? a.promise} »` : "", a.emotion ? `émotion ${a.emotion}` : ""].filter(Boolean).join(", ") : undefined;
  } catch { return undefined; }
}

/** Produits de l'onglet Produits (titre, prix en centimes) : la source unique du site. */
function productsOf(projectId: string): { title: string; price: number | null }[] {
  try { return listProducts(projectId).map((x) => ({ title: x.data.title, price: x.data.price ?? null })); } catch { return []; }
}
/** Textes exacts de la marque (angle choisi à l'étape 4 : accroche, appel à l'action ; messages clés de la recherche). */
function brandTextsOf(ctx: ToolContext, projectId: string): { headline?: string; cta?: string; messages?: string[] } | undefined {
  try {
    const j = journeyOf(ctx.conversationId);
    if (!j.angleChoice) return undefined;
    const plan = activityPlan(projectId, j);
    if (!plan.angle) return undefined;
    return { headline: plan.angle.message || undefined, cta: plan.angle.cta || undefined, messages: plan.keyMessages.slice(0, 3) };
  } catch { return undefined; }
}

const hasProductPhoto = (pid: string) => all<{ id: string }>("SELECT id FROM assets WHERE project_id=? AND deleted_at IS NULL AND kind='image' AND role IN ('original','product') LIMIT 1", pid).length > 0;
const coverageView = (set: MockupSet) => set.directions.map((d) => {
  const c = coverageOf(d, set.pages);
  return { maquette: d.key, nom: d.name, style: d.style, fond: d.ground ?? "clair", images: d.images.length, pretes: d.images.filter((i) => i.status === "ready").length, complete: c.complete, manquantes: c.missing.slice(0, 40).map((m) => `${m.label} (${m.viewport === "desktop" ? "ordinateur" : "téléphone"})`) };
});

const pagesTool: AgentTool<{}> = {
  name: "mockup.pages", module: "site", kind: "read", needsProject: true,
  description: "Étapes 6 et 7 : liste EXACTE des pages du site de ce projet (boutique : sans page de paiement ; services : leurs pages, réservation si le métier s'y prête), chacune en version ordinateur (1440 px) et téléphone (390 px), et couverture des maquettes déjà préparées (pages et versions encore sans image). Gratuit.",
  args: z.object({}).strict(),
  run: (ctx) => {
    const p = project(ctx), pages = pagesOf(p), set = loadMockupSet(p.id);
    return { ok: true, summary: L(`${pages.length} pages, chacune en version ordinateur et téléphone.`, `${pages.length} pages, each on desktop and phone.`), data: { pages: pages.map((x) => ({ cle: x.key, page: x.fr, gabarit: x.template, sections: x.sections.slice(1, -1) })), maquettes: set ? coverageView(set) : [], choisie: set?.chosen ?? null } };
  },
};

/** Dépendance remplaçable par les tests (aucun appel réel) : rédaction d'une page. */
export const copyDeps: { generate?: (call: any) => Promise<unknown> } = {};

const copyTool: AgentTool<{ pages?: string[] }> = {
  name: "mockup.copy", module: "site", kind: "generate", needsProject: true,
  description: "Étape 6, AVANT la maquette (payant, un petit appel par page) : écrit les textes COMPLETS des pages (titres, paragraphes, produits, questions fréquentes, inscription, pied de page ; titre et description pour le référencement) à partir de l'angle marketing choisi, travaillés sur son émotion, avec les seuls faits du client ; accroche, slogan et appel à l'action repris mot pour mot. pages : clés de mockup.pages (par défaut [\"home\"]). La maquette (mockup.prepare) écrit ensuite ces textes lettre pour lettre.",
  args: z.object({ pages: z.array(z.string().max(60)).min(1).max(6).optional() }).strict(),
  estimate: (_ctx, a) => ({ maxMicro: COPY_CAP_MICRO * (a.pages?.length ?? 1), label: L("textes de la page", "page copy") }),
  run: async (ctx, a) => {
    const p = project(ctx);
    const j = journeyOf(ctx.conversationId);
    if (!p.brand) return { ok: false, summary: L("L'identité de marque doit être choisie avant les textes du site.", "Choose the brand first.") };
    if (!j.angleChoice) return { ok: false, summary: L("L'angle marketing (étape 4) doit être choisi avant les textes du site.", "Choose the angle first.") };
    const pages = pagesOf(p), keys = a.pages?.length ? a.pages : ["home"];
    const plan = activityPlan(p.id, j), details = angleDetails(j);
    const jobId = getRun(ctx.runId)?.job_id ?? null;
    const prev = loadSiteCopy(p.id);
    const out: Record<string, PageCopy> = { ...(prev && prev.angleId === (j.angleChoice.id ?? null) ? prev.pages : {}) };
    const failed: string[] = [];
    for (const key of keys) {
      const page = pageByKey(pages, key);
      if (!page) { failed.push(`${key} : page inconnue`); continue; }
      const call = { task: "strategy" as const, userId: ctx.user.id, projectId: p.id, jobId, system: COPY_SYSTEM, promptKey: "syna-site-copy-1", prompt: copyPrompt(page, { brand: { name: p.brand.name, tagline: p.brand.tagline }, plan, ...details }), maxTokens: 12000, maxOutputTokens: 16000, usageKey: `syna-copy:${ctx.runId}:${key}`, routing: { difficulty: "complex" as const, prefer: COPY_MODEL } };
      try {
        const cap = (jobId ? jobSpentMicro(jobId) : 0) + COPY_CAP_MICRO;
        const raw = copyDeps.generate ? await writePageCopy(call, page, copyDeps.generate) : await withTrace({ jobId, projectId: p.id, step: "site-copy", costCapMicro: cap }, () => writePageCopy(call, page));
        const checked = fixAndCheckCopy(raw, page, { headline: plan.angle?.message, tagline: p.brand.tagline, cta: plan.angle?.cta, products: productsOf(p.id) });
        // Textes incomplets : jamais posés sur une maquette (pas de relance payante sans accord du client).
        if (checked.problems.length) failed.push(`${page.fr} : textes incomplets (${checked.problems.join(" ; ")})`);
        else out[key] = checked.copy;
      } catch (e) { failed.push(`${page.fr} : ${(e as Error).message.slice(0, 160)}`); }
    }
    const done = keys.filter((k) => out[k]);
    if (!done.length) return { ok: false, summary: L(`Textes non écrits : ${failed.join(" | ")}`, "Copy not written."), hint: "Dis-le au client avec le coût réel ; ne relance JAMAIS une écriture payante sans son accord écrit." };
    saveSiteCopy(p.id, { version: 1, angleId: j.angleChoice.id ?? null, pages: out, at: 0 });
    // Les maquettes déjà préparées reprennent ces textes tout de suite (images encore à créer seulement) : pas besoin de
    // refaire la préparation (essai réel : SINA la refaisait et réécrivait le style, l'image payée était détachée).
    refreshMockupPrompts(ctx);
    const home = out.home;
    return {
      ok: !failed.length,
      summary: L(`Textes écrits pour ${done.map((k) => `« ${pageByKey(pages, k)!.fr} »`).join(", ")}${failed.length ? ` ; non écrits : ${failed.join(" | ")}` : ""}.`, "Page copy written."),
      hint: "Prépare maintenant la maquette (mockup.prepare) : elle écrira ces textes lettre pour lettre. Annonce ensuite le prix des images avant toute création.",
      data: { pages: Object.fromEntries(done.map((k) => [k, out[k]])), ...(home ? { titreSeo: home.seo.title } : {}) },
      changes: done.map((k) => ({ module: "site", object: L(`textes › ${pageByKey(pages, k)!.fr}`, `copy › ${k}`), summary: out[k].sections.map((x) => x.title).filter(Boolean).slice(0, 4).join(" · "), after: out[k], verified: true })),
    };
  },
};

/**
 * Les maquettes déjà préparées reprennent les textes actuels du site (images encore à créer seulement ; une image
 * créée n'est jamais modifiée). Appelé après l'écriture ou la correction des textes.
 */
export function refreshMockupPrompts(ctx: ToolContext): void {
  const p = project(ctx), set = loadMockupSet(p.id), copy = loadSiteCopy(p.id);
  if (!set) return;
  const facts = mockupFacts(p, angleOf(p.id), hasProductPhoto(p.id), { products: productsOf(p.id), texts: brandTextsOf(ctx, p.id), ...(copy ? { copy: copy.pages } : {}) });
  saveMockupSet(p.id, { ...set, directions: set.directions.map((d) => ({ ...d, images: d.images.map((img) => (img.status === "ready" ? img : { ...img, prompt: mockupImagePrompt(facts, d, img, set.pages) })) })) });
}

const copyEditTool: AgentTool<{ page?: string; find: string; replace: string }> = {
  name: "mockup.copy_edit", module: "site", kind: "write", needsProject: true,
  description: "Étape 6 (gratuit, sans IA) : corrige un texte de page écrit par mockup.copy, mot pour mot : remplace le passage EXACT find par les mots du client replace (replace vide = retirer le passage). page : clé de mockup.pages (accueil par défaut). Ce que le client corrige une fois vaut pour toujours.",
  args: z.object({ page: z.string().max(60).optional(), find: z.string().min(2).max(400), replace: z.string().max(400) }).strict(),
  run: (ctx, a) => {
    const p = project(ctx), key = a.page ?? "home", sc = loadSiteCopy(p.id);
    const c = sc?.pages[key];
    if (!sc || !c) return { ok: false, summary: L("Aucun texte écrit pour cette page : mockup.copy d'abord.", "No copy for this page yet.") };
    const r = editPageCopy(c, a.find, a.replace);
    if (!r.count) return { ok: false, summary: L(`Passage introuvable dans les textes : « ${a.find} ».`, "Passage not found."), hint: "Recopie le passage exactement tel qu'il est écrit (lis la carte des textes)." };
    saveSiteCopy(p.id, { ...sc, pages: { ...sc.pages, [key]: r.copy } });
    refreshMockupPrompts(ctx);
    return { ok: true, summary: a.replace ? L(`Texte corrigé : « ${a.find} » → « ${a.replace} ».`, "Copy corrected.") : L(`Passage retiré : « ${a.find} ».`, "Passage removed."), hint: "La maquette reprend déjà les textes corrigés (images encore à créer).", changes: [{ module: "site", object: L("textes de la page", "page copy"), summary: a.replace ? `« ${a.find} » → « ${a.replace} »` : `« ${a.find} » retiré`, before: a.find, after: a.replace, verified: JSON.stringify(loadSiteCopy(p.id)?.pages[key]).includes(a.replace) }] };
  },
};

type PrepareArgs = { directions: { key?: "A" | "B" | "C"; name: string; style: string; ground?: "clair" | "sombre" | "marque" }[] };
const prepareTool: AgentTool<PrepareArgs> = {
  name: "mockup.prepare", module: "site", kind: "write", needsProject: true,
  description: "Étape 6 (préparation, GRATUITE, aucune image créée) : pour 1 à 3 directions graphiques FRANCHEMENT différentes (demande du propriétaire : des variantes proches ne conviennent pas), chacune avec name, style et ground (clair, sombre = ancrage sombre de la marque, marque = grands aplats de la couleur de marque ; trois maquettes = trois fonds différents). Le style décrit, sans nom de police ni code couleur : l'ouverture (photo pleine page avec le titre dessus, ou écran partagé, ou très grand titre typographique), la grille et le rythme, et des éléments vivants à piocher, à la façon d'une boutique gourmande : séparateurs en vague, pastilles et tampons ronds, bandeau défilant avec le slogan, cartes arrondies avec ombre douce, produits détourés qui débordent des cadres, grands chiffres ou mots en contour, motif du symbole en fond. Deux directions ne partagent ni la même ouverture, ni le même fond, ni les mêmes formes. Pour chacune, découpe chaque maquette en images (pages clés seules, autres pages groupées, version ordinateur et version téléphone) et écrit la consigne de chaque image d'après l'identité choisie, les vrais produits ou prestations et l'angle marketing. Donne le coût maximal de la création des images (à annoncer au client avant toute génération). Remplace une préparation précédente : les maquettes non citées sont retirées ; pour GARDER une maquette et ses images, reprends exactement son nom, son style et son fond (mockup.pages). Inutile de la refaire après mockup.copy : les textes sont repris tout seuls.",
  args: z.object({ directions: z.array(z.object({ key: KEY.optional(), name: z.string().min(1).max(60), style: z.string().min(1).max(700), ground: z.enum(["clair", "sombre", "marque"]).optional() }).strict()).min(1).max(3) }).strict(),
  run: (ctx, a) => {
    const p = project(ctx);
    if (!p.brand) return { ok: false, summary: L("L'identité de marque (nom, couleurs, polices) doit être choisie avant les maquettes (étape 1).", "Choose the brand identity first (step 1).") };
    const pages = pagesOf(p), photo = hasProductPhoto(p.id);
    const copy = loadSiteCopy(p.id);
    const facts = mockupFacts(p, angleOf(p.id), photo, { products: productsOf(p.id), texts: brandTextsOf(ctx, p.id), ...(copy ? { copy: copy.pages } : {}) });
    const keys = ["A", "B", "C"] as const;
    // Une maquette déjà commencée (même lettre, même nom, même style) garde ses images réussies dont la consigne n'a pas
    // changé (essai réel du 8 novembre : ajouter les maquettes B et C effaçait l'accueil de A déjà créé et payé).
    const before = loadMockupSet(p.id);
    const directions = a.directions.map((d, i) => {
      const fresh = plannedDirection(d.key ?? keys[i], d.name, d.style, pages, (img) => mockupImagePrompt(facts, d, img, pages), d.ground);
      // Même maquette = même lettre, nom, style et fond (sans fond = clair). Une évolution de la consigne du Studio
      // n'efface jamais une image payée (essai réel : l'accueil de A détaché après un réglage de la consigne).
      const old = before?.directions.find((x) => x.key === fresh.key && x.name === fresh.name && x.style === fresh.style && (x.ground ?? "clair") === (fresh.ground ?? "clair"));
      if (!old) return fresh;
      return { ...fresh, images: fresh.images.map((img) => {
        const prev = old.images.find((x) => x.status === "ready" && x.assetId && x.viewport === img.viewport && x.pages.join() === img.pages.join());
        return prev ? { ...img, status: "ready" as const, assetId: prev.assetId } : img;
      }) };
    });
    const saved = saveMockupSet(p.id, { version: 1, business: p.business, pages, directions, at: 0 });
    const read = loadMockupSet(p.id);
    const images = directions.reduce((n, d) => n + d.images.filter((i) => i.status !== "ready").length, 0);
    const refs = 1 + (photo && p.business !== "services" ? 1 : 0);
    const maxMicro = mockupImagesMaxMicro(images, refs, imageUnit);
    const verified = !!read && read.directions.length === directions.length && read.directions.every((d, i) => d.images.length === directions[i].images.length);
    return {
      ok: verified,
      summary: L(`${directions.length} maquette(s) préparée(s) : ${images} image(s) à créer au total, aucune créée.${maxMicro == null ? " Aucun modèle d'images utilisable pour l'instant : rien ne peut être créé." : ""}`, `${directions.length} mockup(s) prepared: ${images} image(s) to create.`),
      // Prix d'UNE image aussi : le client peut commencer par une seule page (essai réel : le prix des 15 images annoncé
      // pour créer seulement l'accueil).
      data: { maquettes: directions.map((d) => ({ maquette: d.key, nom: d.name, images: d.images.map((i) => ({ id: i.id, version: i.viewport, pages: i.pages })) })), coutMaxMicro: maxMicro, coutParImageMicro: imageUnit(refs), pages: pages.length, at: saved.at },
      hint: "Si le client veut d'abord une seule page (ex. l'accueil en ordinateur), annonce le prix de CES images seulement (coutParImageMicro × nombre d'images), jamais celui de toute la maquette, puis mockup.generate avec pages et viewport.",
      changes: [{ module: "site", object: "maquettes (préparation)", summary: `${directions.length} maquette(s), ${images} image(s) prévues`, after: { directions: directions.map((d) => d.key), images }, verified }],
    };
  },
};

/** Références envoyées à l'IA d'images : logo de la marque (obligatoire) et photo du produit (boutique). */
function imageReferences(p: ReturnType<typeof project>): { logo: Buffer | null; product: Buffer | null; problem: string | null } {
  const logoId = p.brand?.logo?.assetId;
  const la = logoId ? getAsset(logoId) : undefined;
  if (!la || la.project_id !== p.id || la.deleted_at) return { logo: null, product: null, problem: L("Le logo de la marque doit être créé et rangé avant les maquettes (étapes 2 et 3).", "Create the brand logo before the mockups (steps 2 and 3).") };
  const photo = p.business !== "services" ? all<{ id: string }>("SELECT id FROM assets WHERE project_id=? AND deleted_at IS NULL AND kind='image' AND role IN ('original','product') ORDER BY created_at ASC LIMIT 1", p.id)[0] : undefined;
  const pa = photo ? getAsset(photo.id) : undefined;
  return { logo: assetData(la), product: pa ? assetData(pa) : null, problem: null };
}
/** Images encore à créer ; `only` limite à certaines pages et à une version (ex. l'accueil en ordinateur pour voir le rendu). */
const todo = (d: MockupSet["directions"][number], only: { pages?: string[]; viewport?: "desktop" | "phone"; redo?: boolean } = {}) =>
  d.images.filter((i) => (only.redo ? !!only.pages?.length : i.status !== "ready") && !!i.prompt && (!only.pages?.length || i.pages.some((k) => only.pages!.includes(k))) && (!only.viewport || i.viewport === only.viewport));

/** Contrôle automatique d'une image créée ; null si le contrôle n'a pas pu se faire (jamais bloquant, toujours dit). */
async function checkMockupImage(ctx: ToolContext, projectId: string, direction: string, img: { id: string; viewport: "desktop" | "phone"; pages: string[] }, data: Buffer, pages: MockupSet["pages"]): Promise<{ ok: boolean; problems: string[]; toVerify: string[] } | null> {
  try {
    const usageKey = `syna:${ctx.runId}:mockup-check:${direction}:${img.id}`;
    const jobId = getRun(ctx.runId)?.job_id ?? null;
    const call = mockupCheckCall({ userId: ctx.user.id, projectId, jobId, usageKey }, data, img, img.pages.map((k) => pageByKey(pages, k)?.fr ?? k));
    const raw = mockupToolDeps.checkImage ? await mockupToolDeps.checkImage(data, img)
      : await withTrace({ jobId, projectId, step: "mockup-check", costCapMicro: (jobId ? jobSpentMicro(jobId) : 0) + checkMaxMicro() }, () => llmJson(call, MockupCheckSchema, { strict: true }));
    return mockupCheckVerdict(MockupCheckSchema.parse(raw), img.viewport);
  } catch (e) { console.warn(`[maquettes] contrôle automatique impossible (${img.id}) : ${(e as Error).message.slice(0, 300)}`); return null; }
}

const generateTool: AgentTool<{ direction: "A" | "B" | "C"; pages?: string[]; viewport?: "desktop" | "phone"; redo?: boolean }> = {
  name: "mockup.generate", module: "site", kind: "generate", needsProject: true,
  description: "Étape 6 : crée avec l'IA d'images les images encore manquantes d'une maquette préparée (mockup.prepare), d'après leurs consignes, avec le logo et la photo du produit en références, puis les range dans la maquette. Payant, jamais au-delà du devis (annonce le prix au client et attends son accord avant). pages (clés de mockup.pages, ex. [\"home\"]) et viewport limitent aux images de ces pages, dans cette version : pour voir d'abord le rendu de l'accueil. Une image ratée est signalée comme ratée, jamais présentée comme bonne ; elle peut être relancée. redo: true (avec pages et viewport) REFAIT ENTIÈREMENT une image déjà créée, avec la consigne actuelle : tout change (mise en page, photos). Seulement si le client veut une image toute nouvelle ; pour corriger des détails, mockup.edit (payant, son accord d'abord).",
  args: z.object({ direction: KEY, pages: z.array(z.string().max(60)).max(12).optional(), viewport: z.enum(["desktop", "phone"]).optional(), redo: z.boolean().optional() }).strict(),
  estimate: (ctx, a) => {
    const p = project(ctx), set = loadMockupSet(p.id), d = set?.directions.find((x) => x.key === a.direction);
    if (!set || !d) throw new HttpError(409, L("Aucune maquette préparée : mockup.prepare d'abord.", "No mockup prepared yet."));
    const refs = imageReferences(p);
    if (refs.problem) throw new HttpError(409, refs.problem);
    const n = todo(d, a).length;
    if (!n) throw new HttpError(409, L("Aucune image à créer pour ces pages dans cette maquette.", "No image to create for these pages."));
    const images = mockupImagesMaxMicro(n, refs.product ? 2 : 1, imageUnit);
    if (images == null) throw new HttpError(409, L("Aucun modèle d'images utilisable pour les maquettes (administration › Médias).", "No usable image model for mockups."));
    // Contrôle automatique de chaque image créée, compris dans le prix annoncé.
    const max = images + n * checkMaxMicro();
    return { maxMicro: max, label: L(`images de la maquette ${a.direction}`, `mockup ${a.direction} images`) };
  },
  run: async (ctx, a) => {
    const p = project(ctx), refs = imageReferences(p);
    if (refs.problem) return { ok: false, summary: refs.problem };
    let set = loadMockupSet(p.id);
    const d = set?.directions.find((x) => x.key === a.direction);
    if (!set || !d) return { ok: false, summary: L("Aucune maquette préparée : mockup.prepare d'abord.", "No mockup prepared yet.") };
    // Image à refaire (jugée ratée par le client) : remise « à créer » et consigne actuelle, avant la création.
    if (a.redo && a.pages?.length) {
      set = { ...set, directions: set.directions.map((x) => (x.key === a.direction ? { ...x, images: x.images.map((i) => (todo(x, a).some((t) => t.id === i.id) ? { ...i, status: "planned" as const, assetId: null } : i)) } : x)) };
      saveMockupSet(p.id, set);
      refreshMockupPrompts(ctx);
      set = loadMockupSet(p.id)!;
    }
    const made: { id: string; assetId: string; href: string }[] = [], failed: string[] = [], unchecked: string[] = [];
    for (const img of todo(set.directions.find((x) => x.key === a.direction)!, a)) {
      try {
        const data = mockupToolDeps.generateImage ? await mockupToolDeps.generateImage(img.prompt!, refs)
          : await withQuotedImageRoute(mockupImageRoute(), () => aiSiteMockup({ userId: ctx.user.id, projectId: p.id, usageKey: `syna:${ctx.runId}:mockup-image:${a.direction}:${img.id}` }, { prompt: img.prompt!, logo: refs.logo, product: refs.product }));
        const jpeg = data[0] === 0xff && data[1] === 0xd8;
        const asset = await saveAsset({ projectId: p.id, userId: ctx.user.id, data, name: `maquette-${a.direction}-${img.id}-${img.viewport}.${jpeg ? "jpg" : "png"}`, mime: jpeg ? "image/jpeg" : "image/png", role: "mockup", origin: "generated", meta: { synaMockup: { direction: a.direction, image: img.id, pages: img.pages, viewport: img.viewport } } });
        set = attachImage(set!, a.direction, { id: img.id, viewport: img.viewport, pages: img.pages, assetId: asset.id }).set;
        saveMockupSet(p.id, set);
        made.push({ id: img.id, assetId: asset.id, href: assetUrl({ id: asset.id }) });
        // Contrôle automatique (demande du propriétaire du 8 novembre : les erreurs vues ne doivent pas se reproduire).
        const check = await checkMockupImage(ctx, p.id, a.direction, img, data, set.pages);
        if (check) {
          set = { ...set, directions: set.directions.map((x) => (x.key === a.direction ? { ...x, images: x.images.map((i) => (i.id === img.id ? { ...i, check } : i)) } : x)) };
          saveMockupSet(p.id, set);
        } else unchecked.push(img.id);
      } catch (e) { failed.push(`${img.id} : ${(e as Error).message.slice(0, 160)}`); }
    }
    const read = loadMockupSet(p.id)!, cov = coverageOf(read.directions.find((x) => x.key === a.direction)!, read.pages);
    // Coût RÉEL des images de cet appel (appels enregistrés), dit au client (essai réel : « le Studio ne me l'a pas transmis »).
    // Seulement les images de CET appel (essai réel : deux images d'une même demande additionnées, « 0,4 % » au lieu de 0,2 %).
    const ids = [...made.map((m) => m.id), ...failed.map((f) => f.split(" ")[0])];
    const keys = ids.flatMap((id) => [`syna:${ctx.runId}:mockup-image:${a.direction}:${id}`, `syna:${ctx.runId}:mockup-check:${a.direction}:${id}`]);
    const checked = made.map((m) => ({ id: m.id, check: read.directions.find((x) => x.key === a.direction)!.images.find((x) => x.id === m.id)?.check }));
    const defects = checked.filter((c) => c.check && !c.check.ok);
    const toVerify = checked.filter((c) => c.check?.toVerify.length);
    const checkText = [
      ...defects.map((c) => `${c.id} RATÉE au contrôle automatique : ${c.check!.problems.join(" ; ")}`),
      ...toVerify.map((c) => `${c.id}, textes à vérifier : ${c.check!.toVerify.join(" ; ")}`),
      ...(unchecked.length ? [`${unchecked.join(", ")} : contrôle automatique impossible, à regarder`] : []),
      ...(made.length && !defects.length && !unchecked.length ? ["contrôle automatique de la mise en page : rien à signaler"] : []),
    ].join(". ");
    const spent = keys.length ? all<{ c: number | null }>(`SELECT SUM(cost) c FROM ai_calls WHERE project_id=? AND usage_key IN (${keys.map(() => "?").join(",")})`, p.id, ...keys)[0]?.c ?? 0 : 0;
    // Tutoiement du fil SINA (le texte commun du Studio vouvoie : « de votre budget IA »).
    const spentText = budgetPctText(ctx.user.id, spent, p.id).replace(/de votre budget/, "de ton budget");
    return {
      ok: made.length > 0 && !failed.length && !defects.length,
      summary: L(`${made.length} image(s) créée(s) pour la maquette ${a.direction}${failed.length ? ` ; ${failed.length} ratée(s) : ${failed.join(" | ")}` : ""}.${checkText ? ` ${checkText}.` : ""} Coût réel : ${spentText}. ${cov.complete ? "La maquette couvre toutes les pages." : `Il manque encore ${cov.missing.length} page(s) ou version(s).`}`, `${made.length} mockup image(s) created.`),
      // Essai réel du 8 novembre : « Je ne peux pas vérifier le rendu ici » alors que l'image lui est jointe, et
      // « refait avec la mise en page de téléphone » affirmé sans l'avoir regardée.
      ...(made.length ? { hint: (defects.length ? "Le contrôle automatique a relevé des défauts : dis au client que l'image est RATÉE, cite chaque défaut, propose de la refaire avec son prix (mockup.generate redo) et ne relance RIEN sans son accord écrit. " : "") + "Les images créées te sont JOINTES à ta prochaine étape (libellé « image <id> … créée il y a quelques minutes ») : regarde-les avant de répondre et dis au client, honnêtement et en deux ou trois phrases, ce que tu vois vraiment (mise en page, textes lisibles et exacts ou abîmés, logo, et pour le téléphone : une seule colonne et menu replié, ou non ; passe CHAQUE partie en revue, de haut en bas : toute rangée de trois éléments ou plus côte à côte est un défaut à signaler, même si le point demandé par le client est corrigé). Ne dis JAMAIS que tu ne peux pas voir le rendu ; n'affirme rien que l'image ne montre pas ; une image ratée est dite ratée." } : {}),
      // Libellés du client (essai réel : « 1. A · A01 » affiché) : nom de la maquette, pages, version.
      data: { mockups: made.map((m, i) => { const img = read.directions.find((x) => x.key === a.direction)!.images.find((x) => x.id === m.id)!; return { n: i + 1, direction: `${a.direction} · ${m.id}`, name: d!.name, label: `${img.pages.map((k) => pageByKey(read.pages, k)?.fr ?? k).join(", ")} — ${img.viewport === "desktop" ? "ordinateur" : "téléphone"}`, assetId: m.assetId, href: m.href }; }), failed, complete: cov.complete },
      changes: made.map((m) => ({ module: "fichiers", object: `maquette ${a.direction} › image ${m.id}`, summary: L("créée par l'IA d'images", "created by the image AI"), after: m, verified: true })),
    };
  },
};

type EditArgs = { direction: "A" | "B" | "C"; imageId: string; fromVersion?: number; fromAssetId?: string; changes: EditChange[] };
/** Versions successives d'une image de maquette (fichiers rangés, de la première à la plus récente). */
export function imageVersions(projectId: string, direction: string, imageId: string): string[] {
  // Même ordre que l'état du projet relu par SINA (« B10 : 5 versions, actuelle n° 5 »).
  return all<{ id: string; meta: string }>("SELECT id, meta FROM assets WHERE project_id=? AND deleted_at IS NULL AND role='mockup' ORDER BY created_at ASC, rowid ASC", projectId)
    .filter((r) => { try { const m = JSON.parse(r.meta || "{}").synaMockup; return m?.direction === direction && m?.image === imageId; } catch { return false; } })
    .map((r) => r.id);
}
/** Coût maximal d'une retouche localisée : repérage des zones + retouche + contrôle ; null si le modèle des maquettes ne sait pas retoucher par masque. */
function editMaxMicro(): number | null {
  const r = mockupImageRoute();
  if (r.provider !== "openai") return null;
  try {
    const paint = mockupToolDeps.imageMaxMicro ? mockupToolDeps.imageMaxMicro(2) : mockupMaskEditMaxMicro(r.model);
    return paint == null ? null : paint + 2 * locateMaxMicro() + checkMaxMicro();
  } catch { return null; }
}
const editTool: AgentTool<EditArgs> = {
  name: "mockup.edit", module: "site", kind: "generate", needsProject: true,
  description: "Étape 6 : RETOUCHE LOCALISÉE d'une image de maquette déjà créée : seules les zones demandées par le client changent, tout le reste reste identique au pixel près. À utiliser dès que le client demande de corriger des détails (retirer un bouton, réorganiser une partie, changer un texte sur l'image) : JAMAIS mockup.generate redo, qui refait toute l'image et change tout. imageId : l'image (ex. B10) ; fromVersion : le numéro de la version de cette image que le client préfère (1 = la première créée ; voir « versions » dans l'état du projet), sinon la version actuelle ; changes : 1 à 4 zones, chacune { zone : où, décrite clairement (ex. « la partie Le journal de la pause, son titre, ses cartes et son bouton »), change : ce qui doit changer, précisément }. Payant (une retouche), annonce le prix et attends l'accord.",
  args: z.object({ direction: KEY, imageId: z.string().max(8), fromVersion: z.number().int().min(1).max(50).optional(), fromAssetId: z.string().max(60).optional(), changes: z.array(z.object({ zone: z.string().min(3).max(300), change: z.string().min(3).max(600) }).strict()).min(1).max(4) }).strict(),
  estimate: (ctx, a) => {
    const p = project(ctx), d = loadMockupSet(p.id)?.directions.find((x) => x.key === a.direction);
    if (!d?.images.some((i) => i.id === a.imageId && (i.assetId || a.fromAssetId))) throw new HttpError(409, L(`Aucune image ${a.imageId} créée dans la maquette ${a.direction}.`, "No such mockup image."));
    const max = editMaxMicro();
    if (max == null) throw new HttpError(409, L("Le modèle des maquettes ne sait pas retoucher une zone précise.", "The mockup model cannot edit a precise area."));
    return { maxMicro: max, label: L(`retouche de l'image ${a.imageId}`, `edit of image ${a.imageId}`) };
  },
  run: async (ctx, a) => {
    const p = project(ctx);
    let set = loadMockupSet(p.id);
    const d = set?.directions.find((x) => x.key === a.direction), img = d?.images.find((i) => i.id === a.imageId);
    if (!set || !d || !img) return { ok: false, summary: L(`Aucune image ${a.imageId} dans la maquette ${a.direction}.`, "No such mockup image.") };
    // Version de départ : celle que le client préfère (une version précédente de CETTE image), sinon l'actuelle.
    const versions = imageVersions(p.id, a.direction, a.imageId);
    if (a.fromVersion && !versions[a.fromVersion - 1]) return { ok: false, summary: L(`L'image ${a.imageId} n'a que ${versions.length} version(s).`, "No such version."), internal: true };
    const fromId = (a.fromVersion ? versions[a.fromVersion - 1] : undefined) ?? a.fromAssetId ?? img.assetId;
    const src = fromId ? getAsset(fromId) : undefined;
    const meta = src ? (() => { try { return JSON.parse(src.meta || "{}"); } catch { return {}; } })() : {};
    if (!src || src.project_id !== p.id || src.deleted_at || (fromId !== img.assetId && (meta?.synaMockup?.image !== a.imageId || meta?.synaMockup?.direction !== a.direction)))
      return { ok: false, summary: L(`Le fichier ${fromId ?? "?"} n'est pas une version de l'image ${a.imageId} de la maquette ${a.direction}.`, "Not a version of this image."), internal: true };
    const original = await sharp(assetData(src)).png().toBuffer();
    const { width: w = 1024, height: h = 1536 } = await sharp(original).metadata();
    const jobId = getRun(ctx.runId)?.job_id ?? null;
    const key = (k: string) => `syna:${ctx.runId}:mockup-edit-${k}:${a.direction}:${a.imageId}`;
    const capOf = (micro: number) => (jobId ? jobSpentMicro(jobId) : 0) + micro;
    // 1) Repérer les zones (et lire leurs textes).
    let located: Locate;
    try {
      located = mockupToolDeps.locate ? await mockupToolDeps.locate(original, a.changes)
        : LocateSchema.parse(await withTrace({ jobId, projectId: p.id, step: "mockup-locate", costCapMicro: capOf(locateMaxMicro()) }, () => llmJson(locateCall({ userId: ctx.user.id, projectId: p.id, jobId, usageKey: key("locate") }, original, a.changes), LocateSchema, { strict: true })));
    } catch (e) { return { ok: false, summary: L(`Zones non repérées, rien n'a été retouché : ${(e as Error).message.slice(0, 160)}`, "Areas not located.") }; }
    const boxes = boxesOf(located, a.changes.length, w, h);
    const missing = a.changes.filter((_, i) => !boxes[i]).map((c) => c.zone);
    if (missing.length) return { ok: false, summary: L(`Zone introuvable sur l'image, rien n'a été retouché : ${missing.join(" ; ")}.`, "Area not found."), hint: "Demande au client de préciser où se trouve cette zone ; aucune retouche n'a été payée." };
    // 2) Retouche des seules zones (textes de la zone vérifiés mot pour mot dans les textes de la page).
    const page = loadSiteCopy(p.id)?.pages[img.pages[0]];
    const pageTexts = page ? page.sections.flatMap((x) => [x.title, x.text, x.button, ...x.items.flatMap((i) => [i.title, i.text])]).filter((t): t is string => !!t) : [];
    const keep = a.changes.map((_, i) => exactTexts(located.zones.find((z) => z.n === i + 1)?.texts ?? [], pageTexts));
    const okBoxes = boxes as Box[];
    const prompt = mockupEditPrompt(a.changes, keep, img.viewport, okBoxes, { w, h });
    let edited: Buffer;
    try {
      const route = mockupImageRoute();
      const size = w > h ? "1536x1024" as const : w === h ? "1024x1024" as const : "1024x1536" as const;
      edited = mockupToolDeps.maskEdit ? await mockupToolDeps.maskEdit(original, null, prompt)
        : await withQuotedImageRoute(route, () => mockupMaskEdit({ userId: ctx.user.id, projectId: p.id, jobId, usageKey: key("paint") }, { image: original, prompt, model: route.model, size }));
      edited = await sharp(edited).resize(w, h, { fit: "fill" }).png().toBuffer();
    } catch (e) { return { ok: false, summary: L(`Retouche impossible : ${(e as Error).message.slice(0, 200)}`, "Edit failed."), hint: "Dis-le au client avec le coût réel ; ne relance rien sans son accord écrit." }; }
    // Zone rendue noire (essai réel du 8 novembre) : la retouche est ratée, l'image d'avant reste en place.
    const black: string[] = [];
    for (const [i, b] of okBoxes.entries()) if ((await blackShare(edited, b)) > 0.2) black.push(a.changes[i].zone);
    if (black.length) {
      const spentBad = all<{ c: number | null }>("SELECT SUM(cost) c FROM ai_calls WHERE project_id=? AND usage_key IN (?,?)", p.id, key("locate"), key("paint"))[0]?.c ?? 0;
      return { ok: false, summary: L(`Retouche RATÉE, rien n'a été remplacé (l'image d'avant reste en place) : zone rendue en noir — ${black.join(" ; ")}. Coût réel : ${budgetPctText(ctx.user.id, spentBad, p.id).replace(/de votre budget/, "de ton budget")}.`, "Edit failed: black area."), hint: "Dis au client que la retouche est ratée et son coût réel ; ne relance rien sans son accord écrit." };
    }
    // 3) Seules les zones sont recollées sur l'image d'origine : rien d'autre ne bouge.
    const data = await pasteZones(original, edited, okBoxes);
    const asset = await saveAsset({ projectId: p.id, userId: ctx.user.id, data, name: `maquette-${a.direction}-${a.imageId}-${img.viewport}-retouche.png`, mime: "image/png", role: "mockup", origin: "generated", meta: { synaMockup: { direction: a.direction, image: a.imageId, pages: img.pages, viewport: img.viewport, editedFrom: src.id, changes: a.changes } } });
    set = attachImage(set, a.direction, { id: img.id, viewport: img.viewport, pages: img.pages, assetId: asset.id }).set;
    saveMockupSet(p.id, set);
    let check = await checkMockupImage(ctx, p.id, a.direction, img, data, set.pages);
    // Relecture des zones retouchées : un texte qui y était et que la demande ne retire pas doit y être encore.
    try {
      const after = mockupToolDeps.locate ? await mockupToolDeps.locate(data, a.changes)
        : LocateSchema.parse(await withTrace({ jobId, projectId: p.id, step: "mockup-locate", costCapMicro: capOf(locateMaxMicro()) }, () => llmJson(locateCall({ userId: ctx.user.id, projectId: p.id, jobId, usageKey: key("verify") }, data, a.changes), LocateSchema, { strict: true })));
      const lost = missingTexts(a.changes, keep, after);
      if (lost.length) check = { ok: false, problems: [...(check?.problems ?? []), `texte disparu : ${lost.map((t) => `« ${t} »`).join(", ")}`], toVerify: check?.toVerify ?? [] };
    } catch { check = check ? { ...check, toVerify: [...check.toVerify, "textes des zones retouchées non relus"] } : null; }
    if (check) { set = { ...set, directions: set.directions.map((x) => (x.key === a.direction ? { ...x, images: x.images.map((i) => (i.id === img.id ? { ...i, check: check! } : i)) } : x)) }; saveMockupSet(p.id, set); }
    const keys = [key("locate"), key("paint"), key("verify"), `syna:${ctx.runId}:mockup-check:${a.direction}:${a.imageId}`];
    const spent = all<{ c: number | null }>(`SELECT SUM(cost) c FROM ai_calls WHERE project_id=? AND usage_key IN (${keys.map(() => "?").join(",")})`, p.id, ...keys)[0]?.c ?? 0;
    const spentText = budgetPctText(ctx.user.id, spent, p.id).replace(/de votre budget/, "de ton budget");
    const checkText = !check ? "contrôle automatique impossible, à regarder" : check.ok ? "contrôle automatique de la mise en page : rien à signaler" : `RATÉE au contrôle automatique : ${check.problems.join(" ; ")}`;
    const label = `${img.pages.map((k) => pageByKey(set!.pages, k)?.fr ?? k).join(", ")} — ${img.viewport === "desktop" ? "ordinateur" : "téléphone"}`;
    return {
      ok: !!check?.ok,
      summary: L(`Image ${a.imageId} retouchée (seulement : ${a.changes.map((c) => c.zone).join(" ; ")} ; le reste est identique). ${checkText}. Coût réel : ${spentText}.`, `Image ${a.imageId} edited.`),
      hint: "L'image retouchée t'est JOINTE à ta prochaine étape : regarde les zones retouchées et dis au client, honnêtement, si chaque demande est faite et si les textes sont justes. Ne dis jamais que tu ne peux pas la voir. Une retouche ratée est dite ratée ; rien n'est relancé sans son accord.",
      data: { mockups: [{ n: 1, direction: `${a.direction} · ${a.imageId}`, name: d.name, label, assetId: asset.id, href: assetUrl({ id: asset.id }) }], editedFrom: src.id },
      changes: [{ module: "fichiers", object: `maquette ${a.direction} › image ${a.imageId}`, summary: L(`retouchée : ${a.changes.map((c) => c.zone).join(" ; ")}`, "edited"), before: { assetId: src.id }, after: { assetId: asset.id }, verified: true }],
    };
  },
};

type AttachArgs = { direction: "A" | "B" | "C"; imageId?: string; assetId: string; viewport: "desktop" | "phone"; pages: string[]; note?: string };
const attachTool: AgentTool<AttachArgs> = {
  name: "mockup.attach", module: "site", kind: "write", needsProject: true,
  description: "Étape 6 : range une image de maquette (créée par l'IA d'images ou fournie par le client, déjà dans les Fichiers) dans la maquette A, B ou C, pour une version (desktop ou phone) et les pages qu'elle montre (clés de mockup.pages). imageId = image prévue qu'elle remplit. Renvoie la couverture : pages et versions encore sans image. Gratuit.",
  args: z.object({ direction: KEY, imageId: z.string().max(8).optional(), assetId: z.string().max(60), viewport: z.enum(["desktop", "phone"]), pages: z.array(z.string().max(60)).min(1).max(12), note: z.string().max(200).optional() }).strict(),
  run: (ctx, a) => {
    const p = project(ctx), set = loadMockupSet(p.id);
    if (!set) return { ok: false, summary: L("Aucune maquette préparée : mockup.prepare d'abord.", "No mockup prepared yet.") };
    const asset = getAsset(a.assetId);
    if (!asset || asset.project_id !== p.id || asset.deleted_at || asset.kind !== "image") return { ok: false, summary: L("Image introuvable dans les Fichiers de ce projet.", "Image not found in this project's files.") };
    let next: ReturnType<typeof attachImage>;
    try { next = attachImage(set, a.direction, { id: a.imageId, viewport: a.viewport, pages: a.pages, assetId: a.assetId, note: a.note }); } catch (e) { return { ok: false, summary: (e as Error).message }; }
    saveMockupSet(p.id, next.set);
    const read = loadMockupSet(p.id)!;
    const img = read.directions.find((d) => d.key === a.direction)?.images.find((i) => i.id === next.image.id);
    const cov = coverageOf(read.directions.find((d) => d.key === a.direction)!, read.pages);
    return {
      ok: !!img && img.assetId === a.assetId,
      summary: L(`Image ${next.image.id} rangée dans la maquette ${a.direction}. ${cov.complete ? "La maquette couvre toutes les pages." : `Il manque encore ${cov.missing.length} page(s) ou version(s).`}`, `Image stored in mockup ${a.direction}.`),
      data: { image: next.image, complete: cov.complete, manquantes: cov.missing.slice(0, 40) },
      changes: [{ module: "site", object: `maquette ${a.direction} › image ${next.image.id}`, summary: `${a.viewport} : ${a.pages.join(", ")}`, after: img ?? null, verified: !!img && img.assetId === a.assetId }],
    };
  },
};

const chooseTool: AgentTool<{ direction: "A" | "B" | "C" }> = {
  name: "mockup.choose", module: "site", kind: "write", needsProject: true,
  description: "Étape 6 : enregistre la maquette choisie PAR LE CLIENT (jamais à sa place). Refusé tant que la maquette ne couvre pas toutes les pages en version ordinateur et téléphone (la liste des manques est renvoyée). Gratuit.",
  args: z.object({ direction: KEY }).strict(),
  run: (ctx, a) => {
    const p = project(ctx), set = loadMockupSet(p.id);
    const d = set?.directions.find((x) => x.key === a.direction);
    if (!set || !d) return { ok: false, summary: L("Maquette introuvable.", "Mockup not found.") };
    const cov = coverageOf(d, set.pages);
    if (!cov.complete) return { ok: false, summary: L(`La maquette ${a.direction} n'est pas complète : ${cov.missing.length} page(s) ou version(s) sans image.`, `Mockup ${a.direction} is incomplete.`), data: { manquantes: cov.missing.slice(0, 40), inconnues: cov.unknown } };
    saveMockupSet(p.id, { ...set, chosen: a.direction });
    const ok = loadMockupSet(p.id)?.chosen === a.direction;
    try { updateJourney(ctx.conversationId, (j) => setStep(j, 6, "done", `maquette ${a.direction} « ${d.name} »`)); } catch { /* fil sans parcours */ }
    return { ok, summary: L(`Maquette ${a.direction} « ${d.name} » choisie par le client.`, `Mockup ${a.direction} chosen.`), changes: [{ module: "site", object: "maquette choisie", summary: `${set.chosen ?? "aucune"} → ${a.direction}`, before: set.chosen ?? null, after: a.direction, verified: ok }] };
  },
};

type CodeArgs = { maxRounds?: number };
function codePlan(ctx: ToolContext) {
  const p = project(ctx), set = loadMockupSet(p.id);
  const d = set?.chosen ? set.directions.find((x) => x.key === set.chosen) : null;
  if (!set || !d) throw new HttpError(409, L("Aucune maquette choisie par le client : étape 6 d'abord (mockup.choose).", "No mockup chosen yet (step 6)."));
  const cov = coverageOf(d, set.pages);
  if (!cov.complete) throw new HttpError(409, L(`La maquette choisie ne couvre pas toutes les pages (${cov.missing.length} manque(s)).`, "The chosen mockup doesn't cover every page."));
  return { p, set, d, cov };
}
const codeTool: AgentTool<CodeArgs> = {
  name: "site.code_from_mockup", module: "site", kind: "generate", needsProject: true,
  description: "Étape 7 : code le site À L'IDENTIQUE de la maquette choisie (en-tête, pied, toutes les pages, sections modifiables dans le Studio, par SINA et dans Shopify, produits reliés à l'onglet Produits), puis boucle de contrôle : captures comparées à la maquette, corrections (maxRounds tours au plus, 3 par défaut), débordements à 5 largeurs, liens, Theme Check, SEO. Payant, jamais au-delà du devis. Le résultat est une nouvelle version INACTIVE du site avec un rapport page par page (les pages ratées sont dites ratées) ; le client décide ensuite (site.use_version). Tâche de fond.",
  args: z.object({ maxRounds: z.number().int().min(1).max(4).optional() }).strict(),
  estimate: (ctx, a) => {
    const { p, set, d } = codePlan(ctx);
    const units = callUnits(p.userId);
    if (!units) throw new HttpError(409, L("Coût impossible à encadrer (modèle ou tarif inconnu) : aucun appel ne sera fait.", "Cost cannot be bounded: no call will be made."));
    const ready = d.images.filter((i) => i.status === "ready");
    const written = set.pages.filter((x) => !x.variantOf && !x.template.startsWith("customers/")).length;
    const views = set.pages.reduce((n, x) => n + x.viewports.length, 0);
    return { maxMicro: step7MaxMicro({ images: ready.length, pages: written, views, maxRounds: a.maxRounds }, units), label: L("site codé d'après la maquette", "site coded from the mockup") };
  },
  run: async (ctx, a) => {
    const { p, d } = codePlan(ctx);
    assertSectionGeneration(ctx.user, p.id);
    const est = await codeTool.estimate!(ctx, a);
    const job = enqueue({ userId: ctx.user.id, projectId: p.id, type: MOCKUP_CODE_JOB, label: L("Site codé d'après la maquette (SINA)", "Site coded from the mockup (SINA)"), payload: { projectId: p.id, direction: d.key, capMicro: est.maxMicro, maxRounds: a.maxRounds, conversationId: ctx.conversationId }, maxAttempts: 2, idempotencyKey: `syna:${ctx.runId}:mockup-code:${d.key}` });
    try { updateJourney(ctx.conversationId, (j) => setStep(j, 7, "doing")); } catch { /* fil sans parcours */ }
    return { ok: true, summary: L(`Codage du site d'après la maquette ${d.key} lancé ; SINA relira le rapport page par page.`, `Coding the site from mockup ${d.key} started.`), jobs: [job.id], data: { maquette: d.key, plafondMicro: est.maxMicro } };
  },
};

const reportTool: AgentTool<{}> = {
  name: "mockup.report", module: "site", kind: "read", needsProject: true,
  description: "Étape 7 : rapport du dernier site codé d'après la maquette (version, page par page : statut, notes de ressemblance, écarts restants, débordements, SEO, liens cassés ; Theme Check ; emplacements d'images à créer). Dire au client honnêtement ce qui est conforme et ce qui ne l'est pas.",
  args: z.object({}).strict(),
  run: (ctx) => {
    const p = project(ctx);
    const row = all<{ value: string }>("SELECT value FROM memory WHERE project_id=? AND kind='artifact' AND key=? AND state='active' ORDER BY updated_at DESC LIMIT 1", p.id, STEP7_REPORT_KEY)[0];
    if (!row) return { ok: true, summary: L("Aucun site codé d'après une maquette pour l'instant.", "No site coded from a mockup yet."), data: null };
    const r = JSON.parse(row.value);
    return { ok: true, summary: r.report?.summary ?? "", data: r };
  },
};

/** Outils à ajouter au registre (src/lib/syna-agent/tools/index.ts). */
export const mockupCodeTools: AgentTool[] = [pagesTool, copyTool, copyEditTool, prepareTool, generateTool, editTool, attachTool, chooseTool, codeTool, reportTool];
