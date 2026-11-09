/**
 * Étape 6 du parcours SINA (#492) : outils du volet « un de nos thèmes » (gratuits, sans IA). theme.propose AFFICHE les
 * cartes (site du client composé dans chaque thème, démonstration complète) ; theme.choose applique le choix DU CLIENT
 * par la même tâche que « Choisir ce thème » de la galerie (une seule tâche même en double demande).
 */
import { z } from "zod";
import { L } from "../../i18n-server";
import type { AgentTool } from "../types";
import { journeyOf, setStep, updateJourney } from "../journey";
import { themeChoices } from "../themes";
import { project } from "./common";
import { enqueue, pendingJob } from "../../jobs";
import { currentTheme } from "../../projects";
import { assertStrategyChosen, defaultStrategy } from "../../marketing-strategy";
import { assertThemeAllowed } from "../../plan-gates";
import { blockers, stateOf } from "../../preparation/engine";
import { ACTIVE_THEMES } from "../../theme/theme-fit";
import { DIRECTIONS } from "../../theme/directions";
import { callCostBoundMicro, estimateCallMicro, routeLlm } from "../../ai/llm";
import { clientImages, type ImagesMode } from "../custom-theme/brand";
import { serviceImageRequests, STUDIO_BRAND_JOB, studioImageNeeds, studioImageRequests } from "../studio-brand";
import { boundedImageRequestsQuote } from "../../image-v2/creation-quote";

const modeTool: AgentTool<{ mode: "theme" | "mockup" }> = {
  name: "site.mode", module: "site", kind: "write", needsProject: true,
  description: "Étape 6 : enregistre le choix DU CLIENT, après avoir vu les cartes des thèmes, d'un thème sur mesure (mode mockup : monté avec les sections du Studio, seules les photos nouvelles sont payantes) plutôt qu'un thème du Studio — seulement après sa réponse, jamais à sa place (un thème choisi passe par theme.choose). Gratuit.",
  args: z.object({ mode: z.enum(["theme", "mockup"]) }).strict(),
  run: (ctx, a) => {
    const j = journeyOf(ctx.conversationId);
    if (j.steps[5]?.status !== "done") return { ok: false, summary: L("L'activité complète (étape 5) doit être validée avant le choix du site.", "Validate step 5 first.") };
    if (j.steps[6]?.status === "done") return { ok: false, summary: L("Le site est déjà choisi pour cette étape.", "Already chosen."), hint: "Pour changer, le client doit le demander clairement." };
    updateJourney(ctx.conversationId, (x) => { x.siteMode = { mode: a.mode, at: Date.now() }; setStep(x, 6, "doing"); });
    return {
      ok: true,
      summary: a.mode === "theme" ? L("Choix noté : un thème du Studio.", "Choice saved: a Studio theme.") : L("Choix noté : un thème sur mesure.", "Choice saved: a custom theme."),
      hint: a.mode === "theme" ? "Il choisit sa carte : theme.choose avec son identifiant." : "Suis maintenant la consigne du thème sur mesure : famille (theme.families), montage (custom.compose), textes et modifications (custom.edit), photos (custom.photo, devis d'abord).",
    };
  },
};

const proposeTool: AgentTool<{ all?: boolean }> = {
  name: "theme.propose", module: "site", kind: "read", needsProject: true,
  description: "Étape 6 (gratuit) : AFFICHE au client les thèmes du Studio TELS QU'ILS SONT (capture d'origine, lien vers la démonstration complète, ce que son forfait inclut), jamais recomposés avec son projet. TOUS nos thèmes (consigne du propriétaire du 9 novembre 2026), ceux qui mettent en scène ce qu'il vend d'abord ; all: false pour seulement les trois premiers.",
  args: z.object({ all: z.boolean().optional() }).strict(),
  run: (ctx, a) => {
    const p = project(ctx);
    const j = journeyOf(ctx.conversationId);
    if (j.steps[5]?.status !== "done") return { ok: false, summary: L("L'activité complète (étape 5) doit être validée avant le choix du thème.", "Validate step 5 first.") };
    const themes = themeChoices(p.id, a.all !== false);
    updateJourney(ctx.conversationId, (x) => { x.themes = themes; if (x.steps[6]?.status !== "done") setStep(x, 6, "review"); });
    return {
      ok: true,
      summary: L(`${themes.list.length} thème(s) affiché(s), tels qu'ils sont (démonstrations d'origine) : ${themes.list.map((t) => `« ${t.name} »`).join(", ")}.`, "Themes shown as they are."),
      hint: `Identifiants pour theme.choose : ${themes.list.map((t) => `${t.id} = « ${t.name} »${t.allowed ? "" : " (NON inclus dans son forfait)"}`).join(" ; ")}. Catalogue complet : ${ACTIVE_THEMES.length} thèmes (theme.propose all: true).`,
      data: { themes: themes.list.map((t) => ({ id: t.id, nom: t.name, style: t.tagline, pourquoi: t.why, inclus: t.allowed, demo: t.demo })), recommande: themes.recommendedId },
    };
  },
};

const chooseTool: AgentTool<{ id: string }> = {
  name: "theme.choose", module: "site", kind: "write", needsProject: true,
  description: "Étape 6 : applique le thème CHOISI PAR LE CLIENT (jamais à sa place ; identifiant d'une carte de theme.propose) : la boutique se compose dans ce thème avec sa marque, ses produits et ses textes (gratuit, sans IA ; l'ancienne version reste restaurable). Ouvre l'étape 8 (le thème adapté). Tâche de fond : relis son résultat.",
  args: z.object({ id: z.string().min(1).max(60) }).strict(),
  run: (ctx, a) => {
    const p = project(ctx);
    const j = journeyOf(ctx.conversationId);
    if (j.steps[5]?.status !== "done") return { ok: false, summary: L("L'activité complète (étape 5) doit être validée avant le choix du thème.", "Validate step 5 first.") };
    if (!(ACTIVE_THEMES as readonly string[]).includes(a.id)) return { ok: false, internal: true, summary: `Thème inconnu ou retiré du catalogue : ${a.id}. Thèmes proposés : ${ACTIVE_THEMES.join(", ")}.` };
    if (!p.brand) return { ok: false, summary: L("La marque doit être créée avant la boutique.", "The brand must be created first.") };
    // Le parcours SINA remplace la préparation du Pilote : la marque est faite aux étapes 1 à 3, les textes et visuels
    // du site viennent à l'étape 8. Seule une préparation encore en cours bloque (jamais deux tâches sur le projet).
    if (stateOf(p.id)?.pending && blockers(p.id).some((b) => /en cours|in progress/.test(b))) return { ok: false, summary: L("Une préparation du projet est encore en cours : le thème sera composé quand elle sera finie.", "A preparation is still running.") };
    const name = DIRECTIONS.find((d) => d.id === a.id)?.name ?? a.id;
    try { assertStrategyChosen(p.id); assertThemeAllowed(p.id, a.id, currentTheme(p.id)?.spec.direction ?? null); }
    catch (e) { return { ok: false, summary: (e as Error).message }; }
    const strategyVersion = defaultStrategy(p.id)?.id ?? null;
    // Même tâche que « Choisir ce thème » de la galerie : jamais une seconde en cas de double demande.
    const job = pendingJob(p.id, "shop.direction", { direction: a.id, strategyVersion })
      ?? enqueue({ userId: ctx.user.id, projectId: p.id, type: "shop.direction", idempotencyKey: `theme:${currentTheme(p.id)?.version.id ?? "initial"}:${strategyVersion}:${a.id}`, label: L(`Direction ${name}`, `${name} direction`), payload: { projectId: p.id, direction: a.id, strategyVersion } });
    if (["failed", "cancelled"].includes(job.status)) return { ok: false, summary: L("La composition précédente dans ce thème a échoué : elle est gardée dans le suivi des tâches pour en voir la cause.", "The previous attempt failed."), hint: "Dis-le au client simplement ; ne relance rien sans sa demande." };
    updateJourney(ctx.conversationId, (x) => {
      x.siteMode = { mode: "theme", at: Date.now() };
      x.themeChoice = { id: a.id, jobId: job.id, at: Date.now() };
      setStep(x, 6, "done");
      setStep(x, 7, "skipped", L("Un de nos thèmes a été choisi : pas de site codé d'après une maquette.", "One of our themes was chosen."));
      setStep(x, 8, "doing");
    });
    return {
      ok: true, jobs: [job.id],
      summary: L(`Thème « ${name} » choisi : ta boutique se compose avec ta marque, tes produits et tes textes. L'ancienne version reste restaurable.`, `${name} theme chosen.`),
      hint: "Quand la composition est finie, passe à l'étape 8 : theme.images (combien d'images), la question « tes images ou je les crée ? », puis le devis de theme.brand (textes dans son angle et images) et son accord écrit.",
      changes: [{ module: "site", object: L("thème de la boutique", "store theme"), summary: name, after: a.id, verified: true }],
    };
  },
};

/** Images du client envoyées mais pas encore posées dans le thème en place. */
function freshClientImages(projectId: string): number {
  const spec = currentTheme(projectId)?.spec;
  const used = new Set([...(spec?.meta?.adaptation?.slots ?? []).map((s) => s.assetId), ...Object.values(spec?.files ?? {})].filter(Boolean));
  return clientImages(projectId).filter((x) => !used.has(x.id)).length;
}

const studioImagesTool: AgentTool<Record<string, never>> = {
  name: "theme.images", module: "site", kind: "read", needsProject: true,
  description: "Étape 6, THÈME DU STUDIO (gratuit), après theme.choose (composition finie) et AVANT theme.brand : combien d'images demande son thème (emplacements), combien sont déjà remplies par ses photos, combien restent vides, et ses images envoyées pas encore posées. Sert à lui demander s'il monte son site avec SES images ou si tu les crées, et à lui dire le nombre exact.",
  args: z.object({}).strict(),
  run: (ctx) => {
    const p = project(ctx);
    const needs = studioImageNeeds(p.id);
    if (!needs && currentTheme(p.id)) return { ok: true, summary: L("Ce thème n'a pas encore de plan d'emplacements d'images : je ne peux pas compter ni créer ses images d'un coup. Je peux réécrire tous ses textes (theme.brand, copy) ; ses images se posent ensuite dans la Boutique, une par une.", "This theme has no image placement plan yet."), hint: "Dis-le honnêtement au client ; propose theme.brand avec images:\"client\" (textes seulement) et la pose de ses images une par une dans la Boutique.", data: { planDesImages: false } };
    if (!needs) return { ok: false, summary: L("Aucun thème du Studio en place : le client choisit d'abord son thème (theme.choose), puis la composition doit être finie.", "No Studio theme in place yet.") };
    const fresh = freshClientImages(p.id);
    const own = needs.toProvide ?? 0;
    return {
      ok: true,
      summary: L(`Son thème demande ${needs.total} images : ${needs.filled} déjà remplie(s) par ses photos, ${needs.missing} encore vide(s)${own ? `, dont ${own} que je ne peux PAS inventer (ses réalisations, son lieu, son équipe, ses villes : seules ses vraies photos vont là ; en attendant, un cadre l'explique à leur place dans l'aperçu, jamais sur le site publié)` : ""}. Images envoyées pas encore posées : ${fresh}.`, `${needs.total} images, ${needs.missing} missing.`),
      hint: needs.missing ? `Demande-lui, en une question à choix : « Tu montes ton site avec tes images, ou je les crée ? ». Il en manque ${needs.missing}. S'il prend les siennes, dis-lui d'en envoyer ${needs.missing} avec le trombone (📎) ; s'il en a moins, propose de créer celles qui manquent (images:\"mix\") ou toutes (images:\"sina\"). Puis devis de theme.brand et son accord écrit.${own ? ` Dis-lui clairement que ${own} de ces photos doivent être les siennes (ses réalisations, son lieu, son équipe, ses villes) : tu ne les crées jamais, même avec images:\"sina\" ; ses images envoyées y vont en premier.` : ""}` : "Toutes les images sont déjà là : theme.brand écrira seulement les textes (images:\"client\").",
      data: { total: needs.total, remplies: needs.filled, vides: needs.missing, aFournirParLeClient: own, imagesEnvoyeesNonPosees: fresh, emplacements: needs.requests.map((r) => r.role) },
    };
  },
};

/** Coût d'un tour d'écriture (rédaction + relecture) de toute la boutique : plafond et probable. */
function copyRoundMicro(userId: string): { max: number; typical: number } | null {
  const w = routeLlm({ task: "copywriting", userId }), r = routeLlm({ task: "quality_control", userId });
  if (w.mode !== "llm" || r.mode !== "llm") return null;
  const wMax = callCostBoundMicro(w.provider, w.model, 22000, 24000, w.effort ?? null), rMax = callCostBoundMicro(r.provider, r.model, 18000, 8000, r.effort ?? null);
  const wTyp = estimateCallMicro(w.provider, w.model, 18000, 9000), rTyp = estimateCallMicro(r.provider, r.model, 15000, 2500);
  return wMax == null || rMax == null || wTyp == null || rTyp == null ? null : { max: wMax + rMax, typical: wTyp + rTyp };
}
export const studioBrandDeps2: { images?: (p: ReturnType<typeof project>, n: number) => { capMicro: number; estimateMicro: number } } = {};
type BrandArgs = { images: ImagesMode; copy?: boolean };
const studioBrandTool: AgentTool<BrandArgs> = {
  name: "theme.brand", module: "site", kind: "generate", needsProject: true,
  description: "Étape 6, THÈME DU STUDIO (PAYANT : devis du Studio en % du budget annoncé, accord écrit du client d'abord), après theme.choose et sa réponse sur les images (theme.images) : monte son site dans le thème choisi À SA MARQUE : TOUS les textes réécrits par le rédacteur du Studio dans l'angle marketing choisi et son émotion (copywriting, relecture du directeur de création, rien d'inventé), ses images posées dans les emplacements, et les emplacements vides remplis par des images créées (moteur d'images du Studio, chaque image contrôlée). images : « client » (ses images seulement), « mix » (ses images d'abord, tu crées les autres) ou « sina » (tu crées toutes les images vides). copy:false = images seulement. Tâche de fond ; le site est ensuite EN PLACE dans l'onglet Boutique.",
  args: z.object({ images: z.enum(["sina", "client", "mix"]), copy: z.boolean().optional() }).strict(),
  estimate: (ctx, a) => {
    const p = project(ctx);
    const needs = studioImageNeeds(p.id) ?? (currentTheme(p.id) ? { total: 0, filled: 0, missing: 0, requests: [] } : null);
    if (!needs) throw new Error(L("Aucun thème du Studio en place : choisis d'abord ton thème.", "No Studio theme yet."));
    const copy = a.copy === false ? { max: 0, typical: 0 } : copyRoundMicro(ctx.user.id);
    if (!copy) throw new Error(L("Coût de la rédaction impossible à encadrer (modèle ou tarif inconnu).", "Copy cost cannot be bounded."));
    // Jamais créées : les photos que SINA ne peut pas inventer (ses images y vont en premier).
    const own = needs.toProvide ?? 0, creatable = needs.missing - own;
    const n = a.images === "client" ? 0 : a.images === "mix" ? Math.max(0, creatable - Math.max(0, freshClientImages(p.id) - own)) : creatable;
    let img = { capMicro: 0, estimateMicro: 0 };
    if (n) {
      if (studioBrandDeps2.images) img = studioBrandDeps2.images(p, n);
      else {
        const reqs = needs.service ? serviceImageRequests(p, needs.service).map(({ slotKey: _k, ...r }) => r) : studioImageRequests(p);
        const q = boundedImageRequestsQuote(p, reqs.slice(0, n), {}) as { capMicro: number; estimateMicro: number };
        img = { capMicro: q.capMicro, estimateMicro: q.estimateMicro };
      }
    }
    return { maxMicro: copy.max * 3 + img.capMicro, probableMicro: Math.round(copy.typical * 1.5) + img.estimateMicro, label: L(`site monté à ta marque : ${a.copy === false ? "" : "textes de toute la boutique"}${n ? `${a.copy === false ? "" : ", "}${n} image(s) créée(s)` : ""}`, "site built for the brand") };
  },
  run: async (ctx, a) => {
    const p = project(ctx);
    const needs = studioImageNeeds(p.id) ?? (currentTheme(p.id) ? { total: 0, filled: 0, missing: 0, requests: [] } : null);
    if (!needs) return { ok: false, summary: L("Aucun thème du Studio en place : le client choisit d'abord son thème, et la composition doit être finie.", "No Studio theme in place yet.") };
    if (a.images === "client" && needs.missing > freshClientImages(p.id)) return { ok: false, summary: L(`Il manque ${needs.missing} images et le client en a envoyé ${freshClientImages(p.id)} : rien n'est lancé.`, "Not enough client images."), hint: `Propose-lui : m'envoyer les ${needs.missing - freshClientImages(p.id)} qui manquent, que tu crées les autres (images:\"mix\", prix annoncé), ou toutes (images:\"sina\").` };
    let est;
    try { est = await studioBrandTool.estimate!(ctx, a); } catch (e) { return { ok: false, summary: (e as Error).message }; }
    const job = enqueue({ userId: ctx.user.id, projectId: p.id, type: STUDIO_BRAND_JOB, label: L("Site monté à ta marque dans ton thème (SINA)", "Site built for your brand (SINA)"), payload: { projectId: p.id, capMicro: est.maxMicro, conversationId: ctx.conversationId, images: a.images, copy: a.copy !== false }, maxAttempts: 2, idempotencyKey: `syna:${ctx.runId}:studio-brand:${currentTheme(p.id)?.version.id}:${a.images}` });
    return {
      ok: true, jobs: [job.id],
      summary: L(`Montage de ton site à ta marque lancé dans ton thème (${a.copy === false ? "images seulement" : "textes de toute la boutique dans ton angle"}${a.images === "client" ? ", tes images" : ", images vides créées"}).`, "Store build started."),
      hint: "Quand la tâche est finie, dis au client que son site est en place dans l'onglet Boutique, qu'il peut le regarder en grand et désigner un élément pour demander un changement ; dis honnêtement ce que le rapport signale (textes encore à revoir, images non créées, emplacements encore vides).",
    };
  },
};

export const themeTools: AgentTool[] = [modeTool, proposeTool, chooseTool, studioImagesTool, studioBrandTool];
