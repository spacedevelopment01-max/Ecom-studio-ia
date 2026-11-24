/**
 * Étape « La marque » du parcours SINA : les identités de marque (proposer, refaire des images, choisir, mélanger) et la
 * fin de la marque.
 *
 * La création passe par la CHAÎNE de `brand-chain.ts` (tâche de fond : étude du marché, idées, noms par équipes,
 * planches, directeur de création) et propose 2, 3 ou 4 identités selon le forfait. C'est la seule façon de faire :
 * l'ancienne création en un seul appel a été retirée le 16 novembre 2026. Le choix est gratuit et enregistre la marque
 * du projet (nom, slogan, promesse, palette, polices, ton).
 */
import { z } from "zod";
import { json as parseJson, one, run } from "../../db";
import { enqueue, getJob, pendingJob, retryJob } from "../../jobs";
import { L } from "../../i18n-server";
import { loadProject, remember, saveBrand } from "../../projects";
import { localBrand } from "../../engine/local";
import type { Brand } from "../../project-types";
import type { AgentTool, ToolContext } from "../types";
import { journeyOf, planchesCachees, planchesIncompletes, setStep, updateJourney, type Journey } from "../journey";
import { fontFamily, type Identity } from "../identities";
import { devisDeLaRecherche, devisDesFinalisations } from "../logo-graphistes";
import { LOGO_GRAPHISTES_JOB } from "../logo-graphistes-tache";
import { SINA_BRAND_JOB, boardImagesQuote, chainQuote, finishQuote, namesPreviewQuote, routeCountOfProject, type ChainQuote } from "../brand-chain";
import { borneDuStudio, probableDuStudio } from "../../ai/borne-du-studio";
import { CREATED_SLOTS, FINISH_SLOTS, PROPOSAL_SLOTS, type ImageSlot } from "../brand-images";
import { finishSlots } from "../brand-finish";
import { chosenRoute } from "../logos";
import { ROUTE_KEYS, routeKeys } from "../brand-routes";
import { acquisMicro, RELANCE_JOURS, RefusInterne } from "../custom-theme/site-job";
import { jobSpentMicro } from "../budget";
import type { CostEstimate, ToolResult } from "../types";
import { project } from "./common";
import { dansLOrdre } from "../brand-routes";

const KEYS = ROUTE_KEYS;
type Key = (typeof KEYS)[number];

/** L'atelier de la proposition précédente (étude, idées, réserve de noms) peut-il resservir sans être repayé ? */
function workshopReady(j: Journey): boolean {
  const id = j.identities?.chainJobId;
  if (!id) return false;
  try { return !!parseJson<Record<string, unknown>>(getJob(id)?.checkpoint ?? "{}", {})["brand:strategy"]; } catch { return false; }
}

/**
 * L'atelier d'une proposition de moins d'un mois : l'étude du marché, les idées et les noms ne changent pas en quelques
 * jours ; une nouvelle proposition sans les mots du client les reprend sans les repayer (audit de la marque du
 * 22 novembre 2026, partie 3 : environ 1,60 € par nouvelle proposition).
 */
export const ATELIER_MAX_MS = 30 * 24 * 3600 * 1000;
export function atelierDuMois(j: Journey): boolean {
  const id = j.identities?.chainJobId, job = id ? getJob(id) : undefined;
  return !!job && Date.now() - job.created_at < ATELIER_MAX_MS && workshopReady(j);
}

/**
 * REPRENDRE UNE CRÉATION DE MARQUE COUPÉE, SANS REPAYER (21 novembre 2026). Reprise d'Aplomb arrêtée en route : 2,04 €
 * payés pour 13 images, rien de gardé, parce qu'une nouvelle création repartait de zéro. Comme pour le site et l'accueil
 * dessiné : la MÊME tâche repart (mêmes étapes, mêmes clés d'appel), donc tout ce qui est déjà fait et payé (l'étude, les
 * idées, les noms, les images) est repris tel quel ; seul l'appel coupé en plein milieu est renvoyé, une fois, avec
 * l'accord du client sur la carte. Une création arrêtée (en échec ou arrêtée par « Arrêter ») se relance pendant sept
 * jours, si au moins une étape est faite ; la carte montre le prix de ce qui reste.
 */
export function marqueCoupee(projectId: string): { id: string; payload: Record<string, any>; etapes: string[] } | null {
  const j = one<{ id: string; status: string; payload: string; finished_at: number | null; checkpoint: string | null }>("SELECT id, status, payload, finished_at, checkpoint FROM jobs WHERE project_id = ? AND type = ? ORDER BY created_at DESC, rowid DESC LIMIT 1", projectId, SINA_BRAND_JOB);
  if (!j || !["failed", "cancelled"].includes(j.status) || !j.finished_at || Date.now() - j.finished_at > RELANCE_JOURS * 86_400_000) return null;
  const etapes = (() => { try { return Object.keys(JSON.parse(j.checkpoint ?? "{}") ?? {}).filter((k) => k.startsWith("brand:")); } catch { return []; } })();
  if (!etapes.length) return null;
  try { return { id: j.id, payload: JSON.parse(j.payload) as Record<string, any>, etapes }; } catch { return null; }
}
/** Ce qui est déjà fait dans la création coupée, dit simplement (SINA le redit au client). */
export function marqueOuArretee(etapes: string[]): string {
  const images = etapes.filter((e) => e.startsWith("brand:image:")).length;
  const faites = [etapes.includes("brand:study") && "l'étude de ton marché", etapes.some((e) => e.startsWith("brand:strategy")) && "l'idée de ta marque", etapes.some((e) => e.startsWith("brand:team:")) && "les pistes de noms", etapes.some((e) => e.startsWith("brand:judge")) && "le tri des noms", images > 0 && `${images} image${images > 1 ? "s" : ""}`].filter(Boolean);
  return faites.length ? `déjà fait et gardé : ${faites.join(", ")}` : "rien de gardé";
}
/**
 * Le prix de la reprise : SEULEMENT ce qui reste à faire, avec son prix probable puis « au plus » (23 novembre 2026,
 * essai réel de Nadia : la carte annonçait 17,21 € au plus, sans prix probable, l'ancien plafond moins ce qui était
 * payé, alors que l'étude, la stratégie, les quatre équipes, le premier jugement et trois équipes du second tour étaient
 * acquis). Les étapes enregistrées sont relues sans être repayées : la création de la marque est comptée étape par
 * étape (chainQuote avec `done`). La fin de la marque et l'aperçu des noms : leur devis, moins ce qui est payé et repris
 * (jamais moins d'un cinquième du probable : la fin du travail reste à faire).
 */
export function relanceMarqueQuote(c: { id: string; payload: Record<string, any>; etapes?: string[] }): CostEstimate {
  const p = c.payload, done = c.etapes ?? [], routes = (Array.isArray(p.redo) && p.redo.length) || Number(p.count) || 2;
  const slots = Array.isArray(p.slots) && p.slots.length ? (p.slots as ImageSlot[]) : undefined;
  const label = L("la suite de ta marque, là où sa création s'était arrêtée : ce qui était déjà fait est repris sans être repayé", "the rest of your brand, from where it stopped");
  const q = p.finish || p.namesPreview ? null : p.imagesOnly ? boardImagesQuote(routes, undefined, slots, done) : chainQuote({ routes, images: typeof p.images === "boolean" ? p.images : undefined, imposed: Array.isArray(p.names) && p.names.length > 0, done });
  if (q) { const probable = Math.min(q.maxMicro, q.probableMicro ?? q.maxMicro); return { probableMicro: probable, maxMicro: Math.max(probable, q.maxMicro), label }; }
  // Au plus : le plafond de la tâche, moins ce qui est payé et repris (jamais moins d'un cinquième) ; probable : son
  // devis habituel, moins ce qui est payé, jamais au-dessus.
  const full = p.finish ? finishQuote(slots ?? FINISH_SLOTS) : namesPreviewQuote(), acquis = acquisMicro(c.id), cap = Number(p.capMicro) || full.maxMicro;
  const maxMicro = Math.max(Math.round(cap * 0.2), cap - acquis), probable0 = full.probableMicro ?? full.maxMicro;
  return { probableMicro: Math.min(maxMicro, Math.max(Math.round(probable0 * 0.2), probable0 - acquis)), maxMicro, label };
}
function relanceMarque(ctx: ToolContext): ToolResult {
  const p = project(ctx);
  if (pendingJob(p.id, SINA_BRAND_JOB)) return { ok: false, summary: L("Ta marque est déjà en cours de création : attends-la.", "Your brand is already being created.") };
  const c = marqueCoupee(p.id);
  if (!c) return { ok: false, internal: true, summary: "Aucune création de marque arrêtée en route à relancer (elle a réussi, rien n'y était fait, ou elle date de plus de sept jours) : lance-la sans relancer." };
  const q = relanceMarqueQuote(c);
  const payload = { ...c.payload, conversationId: ctx.conversationId, relance: (Number(c.payload.relance) || 0) + 1, capMicro: jobSpentMicro(c.id) + q.maxMicro };
  run("UPDATE jobs SET payload = ? WHERE id = ? AND status IN ('failed','cancelled')", JSON.stringify(payload), c.id);
  retryJob(c.id);
  updateJourney(ctx.conversationId, (x) => setStep(x, c.payload.finish ? 2 : 1, "doing"));
  return { ok: true, jobs: [c.id], data: { plafondMicro: q.maxMicro },
    summary: L(`Création de ta marque relancée, là où elle s'était arrêtée (${marqueOuArretee(c.etapes)}) : ce qui était déjà fait est repris sans être repayé. Je reprends quand c'est prêt.`, "Your brand creation was restarted from where it stopped."),
    hint: "Dis-lui que ce qui était fait est repris sans être repayé. N'annonce jamais que sa marque est prête avant la fin de la tâche." };
}
const RELANCER_LIGNE = " relancer:true quand la création de sa marque s'est arrêtée en route (le Studio te le dit) : la même création repart là où elle s'était arrêtée, ce qui est déjà fait et payé est repris sans être repayé ; la carte montre le prix de ce qui reste.";

type ProposeArgs = { guidance?: string; redo?: Key[]; only?: "noms"; relancer?: boolean };
/** Travail demandé à la chaîne : combien d'identités à faire, et si l'atelier précédent ressert. */
function chainWork(ctx: ToolContext, a: ProposeArgs | undefined) {
  const count = ctx.projectId ? routeCountOfProject(ctx.projectId) : 2;
  const j = journeyOf(ctx.conversationId);
  const previous = j.identities?.list ?? [];
  const sameShape = previous.length === count && previous.every((x) => !!x.board);
  const redo = (a?.redo ?? []).filter((k) => routeKeys(count).includes(k));
  const partial = sameShape && redo.length > 0 && redo.length < count;
  const fresh = !(((redo.length || a?.only || a?.guidance) && workshopReady(j)) || atelierDuMois(j));
  return { j, count, previous, sameShape, redo, routes: partial ? redo.length : count, fresh };
}

/**
 * Devis montré au client pour ses identités : la création des planches, PLUS la fin de la marque de celle qu'il
 * choisira (un seul accord pour toute l'étape « La marque »). Une reprise après le choix ne recompte pas la fin.
 */
/**
 * MÉTHODE DES GRAPHISTES (point 0, « Oui » du propriétaire le 24 novembre 2026 : « Le client choisit d'abord son nom, puis
 * les logos »). Un seul accord pour toute l'étape « La marque », découpé en morceaux réservés : les noms vérifiés, la
 * recherche du logo, les N logos finis, puis les planches (avec leurs logos) ; la fin de la marque à part, comme avant.
 * La somme des morceaux ne dépasse jamais le « au plus » montré.
 */
export function accordGraphistes(count: number, fresh = true) {
  const entier = chainQuote({ routes: count, fresh });
  // Les planches, une fois le nom choisi : l'étude et les idées sont reprises de la tâche des noms, jamais repayées.
  const planches = chainQuote({ routes: count, imposed: true, done: ["brand:study", "brand:strategy", "brand:strategy:2"] });
  const recherche = devisDeLaRecherche(), finalisations = devisDesFinalisations(count);
  const nomsMicro = Math.max(0, entier.maxMicro - planches.maxMicro);
  return { count, nomsMicro, rechercheMicro: recherche.maxMicro, finalisationsMicro: finalisations.maxMicro, planchesMicro: planches.maxMicro,
    maxMicro: entier.maxMicro + recherche.maxMicro + finalisations.maxMicro,
    probableMicro: (entier.probableMicro ?? entier.maxMicro) + recherche.probableMicro + finalisations.probableMicro };
}
/**
 * La méthode des graphistes, seule façon de faire un logo, s'applique à toute proposition entière (une nouvelle proposition
 * après le choix comprise). Une planche refaite seule garde son logo si elle garde son nom ; sinon son logo vient de
 * logo.pistes. Les noms seuls (only « noms ») ne touchent pas aux logos.
 *
 * Le client qui GARDE SON LOGO n'a aucun logo à chercher (24 novembre 2026, défaut accepté pour correction) : ni
 * recherche, ni finalisation, ni relecture de logo, et rien de cela dans le devis. Sa proposition passe par la chaîne
 * entière, comme avant la méthode, qui pose son logo tel quel sur chaque planche (`clientLogoOf`, brand-chain.ts) : avec
 * son nom gardé, chaque identité reprend ce nom ; sans son nom, la chaîne cherche les noms et chaque identité a le sien.
 */
export const logoGardeParLeClient = (j: Journey) => j.keep.includes("logo");
const parLesGraphistes = (w: ReturnType<typeof chainWork>) => !logoGardeParLeClient(w.j) && !w.redo.length && w.routes === w.count;

function proposalQuote(w: ReturnType<typeof chainWork>) {
  if (parLesGraphistes(w)) {
    const g = accordGraphistes(w.count, w.fresh), f = finishQuote(FINISH_SLOTS);
    return { maxMicro: g.maxMicro + f.maxMicro, ...(f.probableMicro ? { probableMicro: g.probableMicro + f.probableMicro } : {}) };
  }
  const q = chainQuote({ routes: w.routes, fresh: w.fresh });
  if (w.j.identityChoice) return q;
  const f = finishQuote(FINISH_SLOTS);
  return { maxMicro: q.maxMicro + f.maxMicro, ...(q.probableMicro && f.probableMicro ? { probableMicro: q.probableMicro + f.probableMicro } : {}) };
}

/** Création par la chaîne : tâche de fond de plusieurs minutes ; SINA reprend quand les planches sont prêtes. */
function proposeByChain(ctx: ToolContext, a: ProposeArgs) {
  const p = project(ctx);
  const w = chainWork(ctx, a);
  if ((a.redo?.length || a.only) && !w.sameShape) return { ok: false, summary: L("Aucune proposition à refaire pour l'instant.", "Nothing to redo yet."), hint: "Lance d'abord une proposition complète (identity.propose sans redo ni only)." };
  // Une seule création à la fois (jamais deux chaînes payées en parallèle).
  if (pendingJob(p.id, SINA_BRAND_JOB)) return { ok: false, summary: L("Tes identités sont déjà en cours de création : attends-les.", "Your identities are already being created.") };
  if (parLesGraphistes(w) && !a.only) return proposeParLesGraphistes(ctx, w, a);
  const quote = chainQuote({ routes: w.routes, fresh: w.fresh });
  const round = (w.j.identities?.round ?? 0) + 1;
  // L'accord du client couvre aussi la fin de sa marque (devis affiché : `estimate`) : elle partira dès son choix.
  if (!w.j.identityChoice) updateJourney(ctx.conversationId, (x) => { x.brandFinish = { prepaidMicro: finishQuote().maxMicro }; });
  const job = enqueue({
    userId: ctx.user.id, projectId: p.id, type: SINA_BRAND_JOB, label: L(`${w.count} identités de marque (SINA)`, `${w.count} brand identities (SINA)`),
    payload: { projectId: p.id, conversationId: ctx.conversationId, capMicro: quote.maxMicro, count: w.count, ...(a.guidance ? { guidance: a.guidance } : {}), ...(w.redo.length ? { redo: w.redo } : {}), ...(a.only === "noms" ? { namesOnly: true } : {}) },
    maxAttempts: 1, idempotencyKey: `syna:${ctx.runId}:brand:${round}`,
  });
  updateJourney(ctx.conversationId, (x) => setStep(x, 1, "doing"));
  return {
    ok: true, jobs: [job.id], data: { identites: w.count, plafondMicro: quote.maxMicro },
    summary: L(`Création de ${w.routes === w.count ? `tes ${w.count} identités de marque` : `${w.routes} identité${w.routes > 1 ? "s" : ""}`} lancée (plusieurs minutes : ${w.fresh ? "j'étudie ton marché, je cherche l'idée et les noms, puis " : ""}je prépare les planches et je relis tout). Je reprends quand c'est prêt.`, "Creating your brand identities (several minutes)."),
  };
}

/**
 * La proposition par la méthode des graphistes : la chaîne s'arrête après les noms vérifiés (le client choisit son nom
 * avec identity.nom) ; s'il garde son nom, la recherche de son logo part tout de suite. Tout est couvert par l'accord
 * montré sur la carte (devis : `accordGraphistes`).
 */
function proposeParLesGraphistes(ctx: ToolContext, w: ReturnType<typeof chainWork>, a: ProposeArgs) {
  const p = project(ctx), g = accordGraphistes(w.count, w.fresh);
  updateJourney(ctx.conversationId, (x) => { x.accordGraphistes = { count: g.count, nomsMicro: g.nomsMicro, rechercheMicro: g.rechercheMicro, finalisationsMicro: g.finalisationsMicro, planchesMicro: g.planchesMicro, at: Date.now() }; x.brandFinish = { prepaidMicro: finishQuote().maxMicro }; x.graphistes = undefined; x.nomsVerifies = undefined; x.nomsDeLaMarque = undefined; setStep(x, 1, "doing"); });
  const garde = w.j.keep.includes("nom") ? (w.j.keptValues?.name || w.j.imported[0]?.name || p.brand?.name || "").trim() : "";
  if (garde) {
    const job = enqueue({ userId: ctx.user.id, projectId: p.id, type: LOGO_GRAPHISTES_JOB, label: L("Recherche de ton logo (SINA)", "Your logo research (SINA)"), payload: { projectId: p.id, conversationId: ctx.conversationId, phase: "recherche", nom: garde, capMicro: g.rechercheMicro, studioCapMicro: g.rechercheMicro, finalisationsAccordees: g.finalisationsMicro }, maxAttempts: 1, idempotencyKey: `syna:${ctx.runId}:logo:recherche:garde` });
    return { ok: true, jobs: [job.id], summary: L(`Tu gardes ton nom « ${garde} » : je cherche d'abord les pistes de ton logo, puis je te montre les esquisses numérotées pour que tu choisisses.`, "You keep your name: I am looking for your logo directions first.") };
  }
  const job = enqueue({
    userId: ctx.user.id, projectId: p.id, type: SINA_BRAND_JOB, label: L("Les noms de ta marque (SINA)", "Your brand names (SINA)"),
    payload: { projectId: p.id, conversationId: ctx.conversationId, capMicro: g.nomsMicro, count: w.count, jusquAuxNoms: true, ...(a.guidance ? { guidance: a.guidance } : {}) },
    maxAttempts: 1, idempotencyKey: `syna:${ctx.runId}:brand:noms`,
  });
  return { ok: true, jobs: [job.id], data: { identites: w.count, plafondMicro: g.maxMicro },
    summary: L("C'est parti : j'étudie ton marché, je cherche l'idée et les noms, puis je vérifie qu'ils sont libres. Tu choisis ensuite ton nom, puis les pistes de ton logo.", "Starting: market study, idea and names, then you choose your name and logo directions.") };
}

/** Vue courte d'une identité (lue par SINA et montrée dans le fil). */
export const identityView = (x: Identity) => ({
  cle: x.key, nom: x.name, slogan: x.slogan, promesse: x.promise, territoire: x.territory,
  fond: x.ground, ...(x.gradient ? { degrade: x.gradient } : {}), couleurs: x.palette, polices: { titres: fontFamily(x.fonts.heading), textes: fontFamily(x.fonts.body) },
  ton: x.tone.adjectives.join(", "), pourquoi: x.why,
  ...(x.board ? { idee: x.board.idea.belief, resteAProuver: x.board.toProve } : {}),
});

const proposeTool: AgentTool<ProposeArgs> = {
  name: "identity.propose", module: "marque", kind: "generate", needsProject: true,
  description: "Étape 1 : identités de marque VRAIMENT différentes, 2, 3 ou 4 selon son forfait. Tu étudies son marché (paroles réelles de clients avec leur page), cherches l'idée et les noms, vérifies qu'ils sont libres (tâche de fond). Il choisit son nom (identity.nom), puis ses esquisses de logo (logo.choisir) ; chaque identité est une PLANCHE qui partage ce nom, avec son logo. Payant : le Studio montre le devis, un seul accord. guidance = ses mots ; redo = à refaire (les autres restent identiques) ; only « noms » = noms et phrases seuls." + RELANCER_LIGNE,
  args: z.object({ guidance: z.string().max(1500).optional(), redo: z.array(z.enum(KEYS)).min(1).max(4).optional(), only: z.enum(["noms"]).optional(), relancer: z.boolean().optional() }).strict(),
  estimate: (ctx, a) => {
    if (a?.relancer) { const c = marqueCoupee(project(ctx).id); if (!c) throw new RefusInterne("Aucune création de marque arrêtée en route à relancer : lance-la sans relancer."); return relanceMarqueQuote(c); }
    const w = chainWork(ctx, a);
    return { ...proposalQuote(w), label: w.routes === w.count ? `${w.count} identités de marque` : `${w.routes} identité${w.routes > 1 ? "s" : ""} de marque à refaire` };
  },
  run: (ctx, a) => {
    project(ctx);
    if (a.relancer) return relanceMarque(ctx);
    const j = journeyOf(ctx.conversationId);
    if (j.steps[0]?.status !== "done") return { ok: false, summary: L("L'étape 0 (questions de départ) n'est pas encore validée : termine-la d'abord.", "Step 0 is not validated yet.") };
    // Après le choix, une nouvelle proposition seulement si le client la demande avec ses mots (guidance).
    if (j.steps[1]?.status === "done" && !a.guidance) return { ok: false, summary: L("L'identité est déjà choisie.", "The identity is already chosen."), hint: "Pour en changer, le client choisit une autre identité (identity.choose), ou demande avec ses mots une nouvelle proposition (identity.propose avec guidance = ses mots)." };
    return proposeByChain(ctx, a);
  },
};

const PARTS = ["name", "slogan", "palette", "fonts", "tone", "logo"] as const;
type Part = (typeof PARTS)[number];

/** Quelles images de la planche ne sont plus vraies après un mélange ou une retouche : « toutes », « nom » (toutes sauf la grande scène) ou rien. */
export function imagesAJeter(mix: Partial<Record<Part, Key>>, key: Key, edits: { name?: string; slogan?: string } = {}): "toutes" | "nom" | null {
  const ailleurs = (part: Part) => !!mix[part] && mix[part] !== key;
  if (ailleurs("palette") || ailleurs("fonts")) return "toutes";
  if (edits.name || ailleurs("name")) return "nom";
  return null;
}

/** Identité retenue : une base, des éléments pris aux autres (mélange), des retouches du client mot pour mot. */
export function mixIdentity(list: Identity[], key: Key, mix: Partial<Record<Part, Key>> = {}, edits: { name?: string; slogan?: string } = {}): Identity {
  const pick = (k?: Key) => list.find((x) => x.key === (k ?? key))!;
  const base = pick(key);
  const out: Identity = {
    ...base,
    name: edits.name?.trim() || pick(mix.name).name,
    nameWhy: edits.name ? "" : pick(mix.name).nameWhy,
    nameAnchor: edits.name ? "" : pick(mix.name).nameAnchor,
    nameExpression: edits.name ? "" : pick(mix.name).nameExpression,
    slogan: edits.slogan?.trim() || pick(mix.slogan).slogan,
    palette: pick(mix.palette).palette, paletteFamily: pick(mix.palette).paletteFamily, ground: pick(mix.palette).ground, gradient: pick(mix.palette).gradient,
    fonts: pick(mix.fonts).fonts, fontStyle: pick(mix.fonts).fontStyle,
    tone: pick(mix.tone).tone,
    logoStyle: pick(mix.logo).logoStyle, logoIdea: pick(mix.logo).logoIdea,
    // Le « pourquoi » d'une identité parle de SES couleurs, polices et ton : il n'est plus vrai après un mélange de ces
    // éléments (essai réel : « fond en dégradé, vert basilic » affiché sur un fond blanc au bouton bleu).
    why: (["palette", "fonts", "tone"] as const).some((part) => mix[part] && mix[part] !== key) ? "" : base.why,
    // Les images d'une planche portent SON nom, SES couleurs et SES polices ; aucune ne porte la signature (22 novembre
    // 2026, audit de la marque : une retouche d'un mot jetait le logo choisi, la grande scène et le téléphone, et
    // affichait une seconde carte). Couleurs ou polices changées : toutes refaites ; nom changé : toutes sauf la grande
    // scène, qui n'a aucun texte ; signature seule : rien n'est refait.
    ...(base.board?.images && imagesAJeter(mix, key, edits) ? { board: { ...base.board, images: imagesAJeter(mix, key, edits) === "toutes" ? undefined : (({ hero }) => (hero ? { hero } : undefined))(base.board.images as Record<string, unknown>) } as typeof base.board } : {}),
  };
  // Le logo (méthode des graphistes) ne se redessine jamais : celui de l'identité dont il est pris (ou de la base) reste,
  // avec ses déclinaisons, même quand les autres images ne sont plus vraies ; ce qui le porte est refait à la fin de la marque.
  const duLogo = (pick(mix.logo).board?.images ?? {}) as Record<string, unknown>;
  if (out.board && duLogo.logo) out.board = { ...out.board, images: { ...((out.board.images ?? {}) as Record<string, unknown>), logo: duLogo.logo, ...(duLogo.mark ? { mark: duLogo.mark } : {}), ...(duLogo.markDark ? { markDark: duLogo.markDark } : {}) } } as typeof out.board;
  if (out.board && "images" in out.board && out.board.images === undefined) out.board = (({ images: _gone, ...rest }) => rest)(out.board) as typeof out.board;
  // Le nom de domaine a été contrôlé pour LE nom de la planche : nom retouché ou pris ailleurs, il n'est plus vrai.
  if (out.board?.domains && (edits.name || (mix.name && mix.name !== key))) out.board = (({ domains: _old, ...rest }) => rest)(out.board) as typeof out.board;
  return out;
}

/** Marque du projet construite à partir de l'identité retenue (les champs non couverts gardent la valeur existante). */
export function brandFromIdentity(p: ReturnType<typeof loadProject>, x: Identity, j: Journey, others: Identity[], logoAssetId?: string): Brand {
  const base: Brand = p.brand ? structuredClone(p.brand) : localBrand(p.product, x.name, p as any).brand;
  const keptName = j.keep.includes("nom");
  return {
    ...base,
    name: x.name,
    nameStatus: keptName ? "provided" : "validated",
    alternatives: keptName ? [] : others.map((o) => o.name).filter((n) => n !== x.name),
    tagline: x.slogan,
    // Jamais les slogans des AUTRES identités dans la charte (écrits pour un autre nom, un autre territoire).
    taglineAlternatives: [],
    positioning: x.promise,
    audience: j.start.audience?.status === "answered" ? j.start.audience.value : base.audience,
    personality: x.tone.adjectives,
    tone: { voice: x.tone.adjectives.join(", "), do: base.tone?.do ?? [], dont: x.tone.avoid },
    palette: x.palette,
    ground: x.ground,
    // Dégradé gardé seulement pour un fond en dégradé (les autres fonds n'en ont pas).
    ...(x.ground === "degrade" && x.gradient ? { gradient: x.gradient } : {}),
    paletteRoles: "sina-2026",
    paletteMode: j.keep.includes("couleurs") ? "client" : "direction",
    ...(j.keep.includes("couleurs") ? { clientPalette: x.palette } : {}),
    fonts: x.fonts,
    logo: logoAssetId
      ? { ...base.logo, assetId: logoAssetId, status: "provided", concept: x.logoIdea }
      : { concept: "", status: "proposed" }, // le logo vient de la planche choisie
    // Le « pourquoi » s'adresse au client (tutoiement) : ce n'est pas l'histoire de la marque (la charte affiche « [À
    // écrire à partir de faits réels…] » tant qu'elle n'est pas donnée).
    story: base.story,
    // Choix du client : nom, palette et polices verrouillés (aucun traitement automatique ne les change, ex. couleurs
    // tirées d'un logo) ; le slogan n'est pas verrouillé ici pour ne pas l'écrire dans les logos.
    validated: [...new Set([...(base.validated ?? []), "identity", "name", "palette", "fonts"])],
    generatedBy: "ai",
  };
}

const choiceKey = z.enum(KEYS);
const chooseTool: AgentTool<{ key: Key; mix?: Partial<Record<Part, Key>>; name?: string; slogan?: string }> = {
  name: "identity.choose", module: "marque", kind: "write", needsProject: true,
  description: "Étape 1 : enregistre l'identité choisie PAR LE CLIENT (jamais à sa place) comme marque du projet et valide l'étape 1. key = identité de base (A, B, C ou D, parmi celles affichées). mix = éléments pris à une autre identité s'il mélange (le nom de A avec les couleurs de C : key « A », mix {palette: « C »}) ; parties : name, slogan, palette, fonts, tone, logo. name / slogan = sa retouche, reprise mot pour mot. Gratuit.",
  args: z.object({ key: choiceKey, mix: z.object({ name: choiceKey, slogan: choiceKey, palette: choiceKey, fonts: choiceKey, tone: choiceKey, logo: choiceKey }).partial().strict().optional(), name: z.string().min(1).max(60).optional(), slogan: z.string().min(1).max(120).optional() }).strict(),
  run: (ctx, a) => {
    const p = project(ctx);
    const j = journeyOf(ctx.conversationId);
    const list = j.identities?.list;
    if (!list?.length) return { ok: false, summary: L("Aucune identité proposée pour l'instant.", "No identity proposed yet."), hint: "Lance d'abord identity.propose." };
    if (j.keep.includes("nom") && a.name) return { ok: false, summary: L("Le client garde son nom tel quel : il ne peut pas être changé ici.", "The name is kept as is.") };
    if (j.keep.includes("slogan") && a.slogan) return { ok: false, summary: L("Le client garde son slogan tel quel : il ne peut pas être changé ici.", "The tagline is kept as is.") };
    // Une planche gardée de côté (une image y manque) n'est pas montrée : elle ne se choisit pas (règle du propriétaire :
    // « Jamais une planche incomplète »).
    const cachees = planchesCachees(j);
    const keysShown = list.map((x) => x.key).filter((k) => !cachees.has(k));
    if ([a.key, ...Object.values(a.mix ?? {})].some((k) => k && cachees.has(k))) return { ok: false, summary: L("Cette planche n'est pas encore montrée au client : il lui manque une image. Propose-lui de la finir à la charge du Studio (son logo : logo.pistes avec planche = cette planche ; la grande scène ou le haut du site : identity.images), ou laisse-le choisir parmi celles qui sont montrées.", "This board is not shown yet: an image is missing."), hint: "Ce qui manque est écrit dans ton contexte : le logo par logo.pistes (planche = cette planche), le reste par identity.images." };
    if (!keysShown.includes(a.key) || Object.values(a.mix ?? {}).some((k) => k && !keysShown.includes(k))) return { ok: false, summary: L(`Cette identité n'est pas dans la proposition affichée (${keysShown.join(", ")}).`, "This identity is not in the displayed proposal.") };
    const chosen = mixIdentity(list, a.key, a.mix, { name: a.name, slogan: a.slogan });
    const others = list.filter((x) => x.key !== a.key);
    const logo = j.keep.includes("logo") ? one<{ id: string }>("SELECT id FROM assets WHERE project_id=? AND role='logo' AND origin='upload' AND deleted_at IS NULL ORDER BY created_at DESC", p.id)?.id : undefined;
    const before = p.brand ? { name: p.brand.name, tagline: p.brand.tagline } : null;
    const brand = brandFromIdentity(p, chosen, j, others, logo);
    saveBrand(p.id, brand);
    const after = loadProject(p.id).brand;
    const verified = !!after && after.name === chosen.name && after.tagline === chosen.slogan && after.palette.primary === chosen.palette.primary;
    const mixed = Object.entries(a.mix ?? {}).filter(([, k]) => k !== a.key).map(([part, k]) => `${part} de ${k}`);
    remember(p.id, { kind: "decision", key: "syna.identite", value: JSON.stringify({ base: a.key, mix: a.mix ?? {}, retouches: { name: a.name, slogan: a.slogan }, identite: chosen }), source: "user" } as any);
    const logoKept = j.keep.includes("logo");
    // Identité réellement changée après les logos ou l'image de marque (audit du 10 novembre 2026) : les logos dessinés
    // avec l'ancien nom, le logo choisi et l'image de marque ne valent plus ; tout repart de l'étape 2.
    const prev = j.identityChoice ? mixIdentity(list, j.identityChoice.key, j.identityChoice.mix as any, j.identityChoice.edits ?? {}) : null;
    const changed = !!prev && (prev.name !== chosen.name || prev.slogan !== chosen.slogan || prev.palette.primary !== chosen.palette.primary || prev.fonts.heading !== chosen.fonts.heading);
    updateJourney(ctx.conversationId, (x) => {
      x.identityChoice = { key: a.key, mix: a.mix ?? {}, ...(a.name || a.slogan ? { edits: { ...(a.name ? { name: a.name } : {}), ...(a.slogan ? { slogan: a.slogan } : {}) } } : {}), at: Date.now() };
      if (!verified) return; // étape validée seulement si la marque est bien relue
      setStep(x, 1, "done");
      if (changed) { x.logos = undefined; x.logoChoice = undefined; x.brandKit = undefined; x.brandFinish = { prepaidMicro: 0 }; }
      // Logo gardé tel quel : pas de nouveaux logos (étape 2 sans objet).
      setStep(x, 2, logoKept ? "skipped" : "todo", logoKept ? "logo gardé par le client" : undefined);
      setStep(x, 3, "todo");
    });
    if (verified && changed && !logoKept) {
      const b2 = loadProject(p.id).brand;
      if (b2) saveBrand(p.id, { ...b2, validated: (b2.validated ?? []).filter((v) => v !== "logo") });
    }
    // La fin de la marque part tout de suite quand l'accord donné pour les identités la couvre déjà ; sinon SINA
    // appelle brand.finish, qui montre son prix.
    const finish = verified && !!chosenRoute(journeyOf(ctx.conversationId)) && finishEstimate(journeyOf(ctx.conversationId)).maxMicro === 0 ? startFinish(ctx, {}) : null;
    return {
      ok: verified,
      summary: verified
        ? L(`Identité ${a.key}${mixed.length ? ` (avec ${mixed.join(", ")})` : ""} enregistrée comme marque du projet : « ${chosen.name} » — « ${chosen.slogan} ». ${finish?.jobs ? "Je finis maintenant ta marque (ton logo, l'objet qui le porte, les signes, trois publications, ta charte) : quelques minutes, déjà compris dans ton accord." : "Reste à finir ta marque : appelle brand.finish."}`, "Identity saved.")
        : L("La marque n'a pas pu être relue après l'enregistrement.", "Brand could not be verified."),
      ...(finish?.jobs ? { jobs: finish.jobs } : verified ? { hint: "Appelle maintenant brand.finish (sans argument) : le Studio montre son prix au client s'il n'est pas déjà couvert par son accord." } : {}),
      data: { identite: identityView(chosen), etapeSuivante: logoKept ? 3 : 2 },
      changes: [{ module: "marque", object: "identité de marque", summary: `${chosen.name} — ${chosen.slogan}`, before, after: after ? { name: after.name, tagline: after.tagline, palette: after.palette, fonts: after.fonts } : null, verified }],
    };
  },
};

/**
 * Les images d'une planche que SINA peut refaire : la grande scène et le haut du site. Le logo ne se redessine jamais ici
 * (méthode des graphistes, seule façon de faire) : « un autre logo » passe par logo.autre ou logo.pistes.
 */
const REDO_IMAGES = PROPOSAL_SLOTS as unknown as [string, ...string[]];
type ImagesArgs = { keys: Key[]; images: string[]; guidance?: string };
/**
 * Refaire SEULEMENT certaines images d'une ou plusieurs planches (retour du propriétaire du 14 novembre 2026, sur
 * l'essai de la toiletteuse : « c'est à SINA d'y faire, pas à toi ») : la planche, son nom, ses textes et ses autres
 * images ne bougent pas. Le camion ou l'objet qui porte le logo est refait avec le logo gardé ; sans logo gardé, il ne
 * l'est pas. Devis par image refaite, accord du client avant.
 */
/**
 * Seulement les images demandées (propriétaire, 20 novembre 2026 : « j'ai juste demandé de refaire les logos ») : un logo
 * refait seul laisse la maquette du site de sa planche avec l'ancien logo ; elle est refaite pour l'identité choisie, à
 * la fin de la marque (jamais l'ancien logo sur la marque finie : retour du 16 novembre 2026, « c'est pas les bons logos »).
 */
export const redoImages = <T extends string>(images: readonly T[]): T[] => [...new Set(images)];
/**
 * Finir des planches gardées de côté (une image y manque encore après les reprises) : chaque planche demandée l'est, et
 * seules les images qui lui manquent sont refaites. C'est une reprise du travail de SINA : à la charge du Studio, jamais
 * comptée au client (LE-STUDIO-DE-A-A-Z, partie 13). Une autre demande (un goût du client) reste à son compte.
 */
export function finirPlanchesGardees(j: Journey, keys: readonly string[], images: readonly string[]): boolean {
  // Lu sur le contenu réel des planches (jamais sur un drapeau posé à leur création : planches d'avant la correction).
  const inc = planchesIncompletes(j);
  return keys.length > 0 && keys.every((k) => { const h = inc.find((x) => x.key === k); return !!h && images.every((s) => h.manque.includes(s)); });
}
const imagesTool: AgentTool<ImagesArgs> = {
  name: "identity.images", module: "marque", kind: "generate", needsProject: true,
  description: "Avant le choix : refait SEULEMENT la grande scène (« hero ») ou le haut du site (« site ») de planches montrées, sans toucher au nom, aux textes ni au logo (logo.autre, logo.pistes). Ses mots dans guidance. Après le choix : brand.finish.",
  args: z.object({ keys: z.array(z.enum(KEYS)).min(1).max(4), images: z.array(z.enum(REDO_IMAGES)).min(1).max(2), guidance: z.string().max(1500).optional() }).strict(),
  estimate: (ctx, a) => {
    const n = redoImages(a.images).length;
    const d = devisDesImages(journeyOf(ctx.conversationId), a.keys, redoImages(a.images));
    const names = (ks: string[]) => ks.map((k) => `« ${journeyOf(ctx.conversationId).identities?.list?.find((x) => x.key === k)?.name ?? k} »`).join(" et ");
    // Deux plafonds : le prix du client (« 0 % » quand c'est une reprise de SINA) et la borne des reprises du Studio.
    const label = d.studio ? L(`finir ${a.keys.length > 1 ? "tes planches" : "ta planche"} : ${n} image${n > 1 ? "s" : ""} qui manque${n > 1 ? "nt" : ""}`, "finish your board: missing images")
      : d.aFinir.length ? L(`${n} image${n > 1 ? "s" : ""} à refaire sur ${names(d.client)} ; ${names(d.aFinir)} finie${d.aFinir.length > 1 ? "s" : ""} à ma charge`, "images to redo; unfinished boards at my expense")
      : `${n} image${n > 1 ? "s" : ""} à refaire sur ${a.keys.length} planche${a.keys.length > 1 ? "s" : ""}`;
    return { maxMicro: d.maxMicro, ...(d.probableMicro ? { probableMicro: d.probableMicro } : {}), studioMaxMicro: d.studioMaxMicro, studioProbableMicro: d.studioProbableMicro, label, ...(d.studio ? { studio: true } : {}) };
  },
  run: (ctx, a) => {
    const p = project(ctx);
    const j = journeyOf(ctx.conversationId);
    const list = j.identities?.list ?? [];
    // Toujours dans l'ordre des identités (A, B, C), quel que soit l'ordre donné par SINA.
    const keys = dansLOrdre(a.keys).filter((k) => list.some((x) => x.key === k && !!x.board));
    if (!keys.length) return { ok: false, summary: L("Il n'y a pas encore de planche à reprendre.", "There is no board to redo yet."), hint: "Les images se refont sur des planches déjà montrées (identity.propose d'abord)." };
    if (pendingJob(p.id, SINA_BRAND_JOB)) return { ok: false, summary: L("Une création de marque est déjà en cours : attends-la.", "A brand job is already running.") };
    const images = redoImages(a.images);
    const d = devisDesImages(j, keys, images);
    const job = enqueue({
      userId: ctx.user.id, projectId: p.id, type: SINA_BRAND_JOB, label: L(`Images refaites sur ${keys.length} planche${keys.length > 1 ? "s" : ""} (SINA)`, `Board images redone (SINA)`),
      payload: { projectId: p.id, conversationId: ctx.conversationId, capMicro: d.maxMicro, studioCapMicro: d.studioMaxMicro, count: routeCountOfProject(p.id), imagesOnly: true, images: true, redo: keys, slots: images, ...(d.studio ? { studio: true } : d.aFinir.length ? { studioKeys: d.aFinir } : {}), ...(a.guidance ? { guidance: a.guidance } : {}) },
      maxAttempts: 1, idempotencyKey: `syna:${ctx.runId}:brand-images:${keys.join("")}:${images.join("+")}`,
    });
    return {
      ok: true, jobs: [job.id], data: { planches: keys, images, plafondMicro: d.maxMicro },
      summary: L(`Je refais ${images.length} image${images.length > 1 ? "s" : ""} sur ${keys.map((k) => `« ${list.find((x) => x.key === k)?.name ?? k} »`).join(" et ")} (quelques minutes) ; le reste des planches ne bouge pas.`, "Redoing the board images."),
    };
  },
};

/**
 * Le devis d'une reprise d'images de planches (23 novembre 2026, carte Halo + Pénombre de l'essai de Nadia) : une planche
 * à finir (une image y manque) reste à la charge du Studio même sur une carte commune ; seule la part que le client
 * demande lui est comptée. `aFinir` : les planches finies à la charge du Studio quand la carte en mêle d'autres.
 */
export function devisDesImages(j: Journey, keys: readonly string[], images: readonly string[]): { maxMicro: number; probableMicro?: number; studioMaxMicro: number; studioProbableMicro: number; studio: boolean; client: string[]; aFinir: string[] } {
  const quote = (n: number) => boardImagesQuote(n, undefined, images as never, []);
  if (finirPlanchesGardees(j, keys, images)) { const q = quote(keys.length); return { maxMicro: q.maxMicro, ...(q.probableMicro ? { probableMicro: q.probableMicro } : {}), ...deuxPlafonds(q, true), studio: true, client: [], aFinir: [...keys] }; }
  const aFinir = keys.filter((k) => finirPlanchesGardees(j, [k], images)), client = keys.filter((k) => !aFinir.includes(k));
  const qc = quote(client.length), pc = deuxPlafonds(qc, false);
  if (!aFinir.length) return { maxMicro: qc.maxMicro, ...(qc.probableMicro ? { probableMicro: qc.probableMicro } : {}), ...pc, studio: false, client, aFinir };
  // Carte commune : le client paie sa part ; le Studio porte les planches à finir en entier, plus les reprises de tout.
  const qs = quote(aFinir.length), ps = deuxPlafonds(qs, true);
  return { maxMicro: qc.maxMicro, ...(qc.probableMicro ? { probableMicro: qc.probableMicro } : {}), studioMaxMicro: pc.studioMaxMicro + ps.studioMaxMicro, studioProbableMicro: pc.studioProbableMicro + ps.studioProbableMicro, studio: false, client, aFinir };
}

/**
 * Les deux plafonds d'un devis de la marque (23 novembre 2026) : la borne des reprises à la charge du Studio (deux reprises
 * de chaque image avec sa relecture ; plus le premier passage entier quand toute la tâche est à sa charge), et son coût
 * probable. Jamais montrés au client : il ne voit que son prix, ou « 0 % » pour ce qui est à la charge du Studio.
 */
export function deuxPlafonds(q: ChainQuote, studio: boolean): { studioMaxMicro: number; studioProbableMicro: number } {
  return { studioMaxMicro: borneDuStudio(q.maxMicro, studio, q.repriseMicro), studioProbableMicro: probableDuStudio(q.probableMicro ?? q.maxMicro, studio, q.repriseProbableMicro) };
}

/** Images de la marque finie que le client peut faire refaire. */
const FINISH_REDO = CREATED_SLOTS as unknown as [string, ...string[]];
type FinishArgs = { relancer?: boolean; redo?: string[]; guidance?: string };

/**
 * Devis de la fin de marque : gratuit quand l'accord donné pour les identités la couvre déjà (premier choix, identité
 * prise telle quelle) ; sinon le prix des images à créer, moins ce qui était déjà couvert.
 */
export function finishEstimate(j: Journey, a: FinishArgs = {}): { maxMicro: number; probableMicro?: number; slots: ImageSlot[] } {
  const slots = finishSlots(j, a.redo as ImageSlot[] | undefined);
  if (!slots.length) return { maxMicro: 0, slots };
  const q = finishQuote(slots, undefined), prepaid = a.redo?.length ? 0 : j.brandFinish?.prepaidMicro ?? 0;
  if (prepaid >= q.maxMicro) return { maxMicro: 0, slots };
  return { maxMicro: q.maxMicro - prepaid, ...(q.probableMicro ? { probableMicro: Math.max(1, q.probableMicro - prepaid) } : {}), slots };
}

/** Met en file la fin de marque (une seule à la fois). */
function startFinish(ctx: ToolContext, a: FinishArgs): { jobs?: string[]; refused?: string } {
  const p = project(ctx), j = journeyOf(ctx.conversationId);
  if (pendingJob(p.id, SINA_BRAND_JOB)) return { refused: L("Ta marque est déjà en cours de création : attends-la.", "Your brand is already being created.") };
  // Ce qui porte un logo qui manquait (posé depuis par la méthode des graphistes) : une reprise, à la charge du Studio.
  const studio = !!j.brandFinish?.studio && !a.redo?.length && !a.relancer;
  const slots = finishSlots(j, a.redo as ImageSlot[] | undefined);
  const fq = slots.length ? finishQuote(slots, undefined) : null;
  const cap = Math.max(1, fq ? fq.maxMicro : 1);
  const job = enqueue({
    userId: ctx.user.id, projectId: p.id, type: SINA_BRAND_JOB, label: L("Ta marque complète (SINA)", "Your complete brand (SINA)"),
    payload: { projectId: p.id, conversationId: ctx.conversationId, capMicro: cap, studioCapMicro: deuxPlafonds(fq ?? { maxMicro: cap }, studio).studioMaxMicro, count: routeCountOfProject(p.id), finish: true, ...(a.redo?.length || studio ? { slots } : {}), ...(studio ? { studio: true } : {}), ...(a.guidance ? { guidance: a.guidance } : {}) },
    maxAttempts: 1, idempotencyKey: `syna:${ctx.runId}:brand-finish:${(a.redo ?? []).join("+")}:${j.identityChoice?.at ?? 0}${studio ? `:studio:${j.brandFinish?.images?.logo?.id ?? ""}` : ""}`,
  });
  updateJourney(ctx.conversationId, (x) => { if (x.brandFinish) x.brandFinish.prepaidMicro = 0; if (x.steps[2]?.status !== "skipped") setStep(x, 2, "doing"); });
  return { jobs: [job.id] };
}

const finishTool: AgentTool<FinishArgs> = {
  name: "brand.finish", module: "marque", kind: "generate", needsProject: true,
  description: "Étape « La marque », après le choix de l'identité : finit la marque du client, ou en refait une partie. Sans argument : crée ce qui manque (l'objet qui porte le logo, les signes, trois publications ; ce qui porte un logo changé), adopte son logo (fond retiré, déclinaisons), prépare sa charte ; compris dans son accord s'il a pris une identité telle quelle. Un autre logo : logo.autre ou logo.pistes, jamais ici. redo = images à refaire : « hero », « object », « signs », « site », « post0 », « post1 », « post2 » ; guidance = ce qu'il veut de différent, avec ses mots. Payant quand ce n'est pas déjà couvert : le Studio montre le prix avant. La marque complète s'affiche dans le fil." + RELANCER_LIGNE,
  args: z.object({ redo: z.array(z.enum(FINISH_REDO)).min(1).max(7).optional(), guidance: z.string().max(1500).optional(), relancer: z.boolean().optional() }).strict(),
  estimate: (ctx, a) => {
    if (a?.relancer) { const c = marqueCoupee(project(ctx).id); if (!c) throw new RefusInterne("Aucune création de marque arrêtée en route à relancer : lance-la sans relancer."); return relanceMarqueQuote(c); }
    const j = journeyOf(ctx.conversationId);
    const e = finishEstimate(j, a);
    // Le logo manque à la marque finie : il se fait par la méthode des graphistes (logo.pistes), jamais ici.
    if (j.brandFinish?.manque?.includes("logo")) throw new RefusInterne("Il manque son logo : il se fait par la méthode des graphistes, à ta charge (logo.pistes avec planche = son identité, puis logo.autre avec l'esquisse qu'il choisit) ; ensuite brand.finish refait ce qui le porte.");
    if (j.brandFinish?.studio && !a.redo?.length) { const fq = finishQuote(e.slots, undefined); return { maxMicro: e.maxMicro, ...(e.probableMicro ? { probableMicro: e.probableMicro } : {}), ...deuxPlafonds(fq, true), label: L("finir ta marque : ce qui porte ton logo, refait avec lui", "finish your brand: what carries your logo"), studio: true }; }
    return { maxMicro: e.maxMicro, ...(e.probableMicro ? { probableMicro: e.probableMicro } : {}), label: a.redo?.length ? L(`${e.slots.length} image${e.slots.length > 1 ? "s" : ""} de ta marque à refaire`, "brand images to redo") : L("ta marque complète", "your complete brand") };
  },
  run: (ctx, a) => {
    if (a.relancer) return relanceMarque(ctx);
    const j = journeyOf(ctx.conversationId);
    if (j.steps[1]?.status !== "done" || !j.identityChoice) return { ok: false, summary: L("L'identité doit être choisie avant de finir la marque.", "Choose the identity first."), hint: "Le client choisit d'abord une identité (identity.choose)." };
    if (j.steps[3]?.status === "done" && !a.redo?.length) return { ok: false, summary: L("La marque est déjà validée.", "The brand is already validated.") };
    const r = startFinish(ctx, a);
    if (!r.jobs) return { ok: false, summary: r.refused! };
    return { ok: true, jobs: r.jobs, summary: a.redo?.length ? L("Je refais ce que tu m'as demandé (quelques minutes) ; le reste de ta marque ne bouge pas.", "Redoing what you asked.") : L("Je finis ta marque (quelques minutes) : ton logo, l'objet qui le porte, les signes, trois publications et ta charte.", "Finishing your brand.") };
  },
};

export const identityTools: AgentTool[] = [proposeTool, chooseTool, imagesTool, finishTool];
