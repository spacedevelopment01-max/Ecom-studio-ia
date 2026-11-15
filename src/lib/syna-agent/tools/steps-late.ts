/**
 * Étapes 10 à 13 du parcours SINA (carte des spécialistes, lots 6 et 7, 13 novembre 2026) : publicités, calendrier,
 * articles de blog, rangement des fichiers. Chaque étape est branchée sur le moteur du Studio qui existe déjà, avec ses
 * propres spécialistes :
 *  - publicités : concepts vraiment différents, rédacteur, contrôle des promesses avant le visuel, barrière de qualité,
 *    image créée puis contrôlée en image (ads-v2) ;
 *  - articles : rédaction, contrôles automatiques (SEO, faits), relecture par un directeur de création, jusqu'à trois
 *    tours (engine/blog) ;
 *  - calendrier et rangement : sans IA.
 * Ces outils n'existent pour SINA que si leur étape est ouverte (réglage « sina.etapes_ouvertes ») : chaque étape
 * s'essaie en réel et se valide avant la suivante (parcours du propriétaire).
 */
import { z } from "zod";
import { one } from "../../db";
import { L } from "../../i18n-server";
import { enqueue, pendingJob } from "../../jobs";
import { aiActiveFor } from "../../ai/access";
import { capMicro, estimateMicro } from "../../ai/estimate";
import { assertAdvertising } from "../../job-entitlements";
import { campaignEstimate } from "../../ads-v2/estimate";
import { PLATFORMS as AD_PLATFORMS } from "../../ads-v2/types";
import { publicationReadiness } from "../../social-v2/ai-post";
import { INTENTS, assertBlogWrite, localTopics } from "../../engine/blog";
import { stateOf } from "../../preparation/store";
import type { AgentTool } from "../types";
import { readCalendar } from "../calendar";
import { journeyOf, setStep, stepAvailable, updateJourney, type Journey } from "../journey";
import { chosenAngles } from "../posts-plan";
import { project } from "./common";

const closed = (what: string) => ({ ok: false as const, summary: L(`L'étape ${what} n'est pas encore ouverte dans le parcours.`, "This step is not open yet.") });
const count = (sql: string, ...args: unknown[]) => one<{ n: number }>(sql, ...args)?.n ?? 0;

// ------------------------------------------------------------------------------------------------ étape 10 : publicités

type AdsArgs = { platforms: (typeof AD_PLATFORMS)[number][]; count?: number };
/** Publicités créées depuis le lancement de l'étape (images qui ont passé le contrôle, non refusées par le client). */
export const adsMade = (projectId: string, since: number) => count("SELECT COUNT(*) n FROM assets WHERE project_id=? AND role='ad' AND deleted_at IS NULL AND status!='rejected' AND created_at>=?", projectId, since);

const adsCreateTool: AgentTool<AdsArgs> = {
  name: "ads.create", module: "publicités", kind: "generate", needsProject: true,
  description: "Étape 10 (PAYANT : le Studio montre le devis sur la carte d'accord) : crée les publicités images du client, d'après son angle choisi : des idées vraiment différentes, une accroche courte et un bouton par visuel, promesses contrôlées avant l'image, chaque image contrôlée avant d'être montrée. platforms = SES régies et formats (meta_feed, meta_story, tiktok, google_display, pinterest, linkedin), jamais devinés ; count = nombre d'idées (3 par défaut, selon son forfait).",
  args: z.object({ platforms: z.array(z.enum(AD_PLATFORMS)).min(1).max(6), count: z.number().int().min(1).max(6).optional() }).strict(),
  estimate: (ctx, a) => {
    const e = campaignEstimate(project(ctx), { count: a.count ?? 3, platforms: [...new Set(a.platforms)] });
    return { maxMicro: e.capMicro, probableMicro: e.estimateMicro, label: L(`${e.concepts} publicité${e.concepts > 1 ? "s" : ""} image${e.concepts > 1 ? "s" : ""} (${e.images} visuels) : idées, textes et images, chacune contrôlée avant de t'être montrée`, "image ads: ideas, copy and visuals") };
  },
  run: async (ctx, a) => {
    const p = project(ctx), j = journeyOf(ctx.conversationId);
    if (!stepAvailable(j, 10)) return closed("des publicités");
    try { assertAdvertising(p.id); } catch (e) { return { ok: false, summary: (e as Error).message, hint: "Dis-le simplement au client, sans insister. S'il ne change pas de forfait, passe l'étape avec ads.validate (skip: true)." }; }
    if (!p.brand) return { ok: false, summary: L("La marque n'est pas encore créée.", "The brand is not created yet.") };
    if (!aiActiveFor(p.userId, p.id)) return { ok: false, summary: L("L'IA n'est pas active pour ce projet (budget IA épuisé ou fournisseur désactivé) : aucune publicité ne peut être créée.", "AI is not active for this project.") };
    const readiness = await publicationReadiness(p);
    if (!readiness.ready) return { ok: false, summary: String(readiness.reason ?? L("Le moteur d'images n'est pas prêt.", "The image engine is not ready.")) };
    if (pendingJob(p.id, "ads.v2")) return { ok: true, summary: L("Des publicités sont déjà en préparation ; je reprends dès qu'elles sont prêtes.", "Ads are already being prepared.") };
    const platforms = [...new Set(a.platforms)], e = campaignEstimate(p, { count: a.count ?? 3, platforms });
    const job = enqueue({ userId: ctx.user.id, projectId: p.id, type: "ads.v2", label: L("Publicités : idées, textes et créations (SINA)", "Ads: ideas, copy and creatives (SINA)"), payload: { projectId: p.id, costCapMicro: e.capMicro, request: { count: e.concepts, platforms } }, idempotencyKey: `syna:${ctx.runId}:ads:${e.concepts}:${platforms.join(",")}` });
    updateJourney(ctx.conversationId, (x) => { x.ads = { jobId: job.id, platforms, count: e.concepts, at: Date.now() }; setStep(x, 10, "doing"); });
    return { ok: true, jobs: [job.id], summary: L(`Création de ${e.concepts} publicité${e.concepts > 1 ? "s" : ""} lancée (${e.images} visuels, plusieurs minutes).`, "Creating the ads."), hint: "À la fin de la tâche : dis honnêtement combien de publicités ont passé le contrôle et lesquelles ont été refusées (avec la raison donnée) ; elles sont dans l'onglet Publicités. Puis le client valide (ads.validate)." };
  },
};

const adsValidateTool: AgentTool<{ skip?: boolean }> = {
  name: "ads.validate", module: "publicités", kind: "write", needsProject: true,
  description: "Étape 10 : enregistre la VALIDATION DU CLIENT de ses publicités (jamais à sa place), quand au moins une publicité a passé le contrôle. skip: true = le client ne veut pas de publicités maintenant, ou son forfait ne les comprend pas : l'étape est passée, sans rien créer. Gratuit.",
  args: z.object({ skip: z.boolean().optional() }).strict(),
  run: (ctx, a) => {
    const p = project(ctx), j = journeyOf(ctx.conversationId);
    if (!stepAvailable(j, 10)) return closed("des publicités");
    if (a.skip) { updateJourney(ctx.conversationId, (x) => { setStep(x, 10, "skipped", L("sans publicités pour l'instant", "no ads for now")); }); return { ok: true, summary: L("Étape des publicités passée : rien n'a été créé. Prochaine étape : le calendrier de publication.", "Ads step skipped.") }; }
    const made = j.ads ? adsMade(p.id, j.ads.at) : 0;
    if (!made) return { ok: false, summary: L("Aucune publicité n'a encore passé le contrôle : rien à valider.", "No ad has passed the check yet.") };
    updateJourney(ctx.conversationId, (x) => setStep(x, 10, "done"));
    return { ok: true, summary: L(`Publicités validées (${made}). Prochaine étape : le calendrier de publication.`, "Ads validated."), changes: [{ module: "publicités", object: L("publicités de l'étape", "step ads"), summary: L(`${made} publicité(s) validée(s)`, `${made} ad(s) validated`), verified: true }] };
  },
};

// ---------------------------------------------------------------------------------------------- étape 11 : calendrier

const calendarValidateTool: AgentTool<Record<string, never>> = {
  name: "calendar.validate", module: "calendrier", kind: "write", needsProject: true,
  description: "Étape 11 : enregistre la VALIDATION DU CLIENT de son calendrier de publication (jamais à sa place), quand le calendrier existe (calendar.plan). Gratuit.",
  args: z.object({}).strict(),
  run: (ctx) => {
    const p = project(ctx), j = journeyOf(ctx.conversationId);
    if (!stepAvailable(j, 11)) return closed("du calendrier");
    if (!readCalendar(p.id)) return { ok: false, summary: L("Aucun calendrier encore : il se prépare d'abord avec le client (calendar.plan).", "No calendar yet.") };
    updateJourney(ctx.conversationId, (x) => setStep(x, 11, "done"));
    return { ok: true, summary: L("Calendrier validé. Prochaine étape : deux articles de blog.", "Calendar validated."), changes: [{ module: "calendrier", object: L("calendrier de publication", "publishing calendar"), summary: L("validé par le client", "validated by the client"), verified: true }] };
  },
};

// ------------------------------------------------------------------------------------------- étape 12 : articles de blog

/** Articles écrits depuis le début de l'étape (brouillons ou prêts). */
export const articlesMade = (projectId: string, since: number) => count("SELECT COUNT(*) n FROM blog_articles WHERE project_id=? AND created_at>=?", projectId, since);
const BLOG_ARTICLES = 2;

/** Matière des sujets, sans IA : les sujets tirés des faits du projet, les angles choisis, et ce que disent les clients. */
export function blogMaterial(projectId: string, j: Journey, p: ReturnType<typeof project>) {
  const research = (stateOf(projectId)?.stages as { research?: { data?: { observations?: { quote: string }[] } } } | undefined)?.research?.data;
  return {
    sujets: (() => { try { return localTopics(p).slice(0, 6).map((t) => ({ titre: t.title, genre: t.kind, pourquoi: t.why, ...(t.keyword ? { requete: t.keyword } : {}) })); } catch { return []; } })(),
    angles: chosenAngles(j).map((a) => ({ titre: a.title, emotion: a.emotion, pour: a.audience })),
    parolesDeClients: (research?.observations ?? []).slice(0, 6).map((o) => o.quote.slice(0, 240)),
  };
}

const blogTopicsTool: AgentTool<Record<string, never>> = {
  name: "blog.topics", module: "blog", kind: "read", needsProject: true,
  description: "Étape 12 (gratuit) : la matière pour proposer des sujets d'articles au client : sujets tirés des faits de son projet, ses angles choisis, et ce que disent vraiment les clients (paroles relevées pendant la recherche). Propose-lui 3 ou 4 sujets UTILES à son client idéal (une question qu'il se pose, un usage, un guide, une comparaison), il en choisit 2.",
  args: z.object({}).strict(),
  run: (ctx) => {
    const p = project(ctx), j = journeyOf(ctx.conversationId);
    if (!stepAvailable(j, 12)) return closed("des articles");
    const m = blogMaterial(p.id, j, p);
    return { ok: true, summary: L(`Matière prête : ${m.sujets.length} sujets possibles, ${m.angles.length} angle(s), ${m.parolesDeClients.length} parole(s) de clients.`, "Topic material ready."), hint: "Propose 3 ou 4 sujets avec tes mots, chacun utile et lié à un angle ; ne cite aucune parole comme venant de SES clients (ce sont des clients d'autres marques). Le client choisit, jamais toi.", data: m };
  },
};

type BlogArgs = { topic: string; brief?: string; keyword?: string; intent?: (typeof INTENTS)[number] };
const blogWriteTool: AgentTool<BlogArgs> = {
  name: "blog.write", module: "blog", kind: "generate", needsProject: true,
  description: "Étape 12 (PAYANT : le Studio montre le devis sur la carte d'accord) : écrit UN article de blog sur le sujet CHOISI PAR LE CLIENT (700 à 1 200 mots, référencement, liens vers ses produits ou services, aucune promesse non confirmée), relu avant d'être montré ; il arrive en brouillon dans l'onglet Blog. Deux articles pour cette étape : un appel par article. topic = le sujet, brief = ce que le client veut y lire (ses mots), keyword = la requête visée, intent = l'intention de recherche.",
  args: z.object({ topic: z.string().trim().min(6).max(200), brief: z.string().trim().max(1500).optional(), keyword: z.string().trim().max(80).optional(), intent: z.enum(INTENTS).optional() }).strict(),
  estimate: () => { const probable = estimateMicro("blog"); return { maxMicro: capMicro(probable), probableMicro: probable, label: L("un article de blog écrit pour ton client idéal, relu avant de t'être montré", "one blog article, reviewed before you see it") }; },
  run: (ctx, a) => {
    const p = project(ctx), j = journeyOf(ctx.conversationId);
    if (!stepAvailable(j, 12)) return closed("des articles");
    const asked = j.blog?.jobs.length ?? 0;
    if (asked >= BLOG_ARTICLES) return { ok: false, summary: L(`Les ${BLOG_ARTICLES} articles de cette étape ont déjà été demandés : les suivants s'écrivent dans l'onglet Blog.`, "Both articles were already requested.") };
    if (j.blog?.topics.some((t) => t.trim().toLowerCase() === a.topic.trim().toLowerCase())) return { ok: false, summary: L("Cet article a déjà été demandé.", "This article was already requested.") };
    try { assertBlogWrite(ctx.user.id, p.id); } catch (e) { return { ok: false, summary: (e as Error).message }; }
    if (pendingJob(p.id, "blog.write")) return { ok: true, summary: L("Un article est déjà en cours d'écriture ; je reprends dès qu'il est prêt.", "An article is being written.") };
    const job = enqueue({ userId: ctx.user.id, projectId: p.id, type: "blog.write", label: L("Article de blog (SINA)", "Blog article (SINA)"), payload: { topic: a.topic, brief: a.brief, keyword: a.keyword, intent: a.intent, costCapMicro: capMicro(estimateMicro("blog")) }, idempotencyKey: `syna:${ctx.runId}:blog:${asked}` });
    updateJourney(ctx.conversationId, (x) => { x.blog = { at: x.blog?.at ?? Date.now(), jobs: [...(x.blog?.jobs ?? []), job.id], topics: [...(x.blog?.topics ?? []), a.topic] }; setStep(x, 12, "doing"); });
    return { ok: true, jobs: [job.id], summary: L(`Article ${asked + 1} sur ${BLOG_ARTICLES} en cours d'écriture : « ${a.topic} » (quelques minutes).`, "Writing the article."), hint: "À la fin de la tâche : dis où le lire (onglet Blog, en brouillon) et ce que la relecture a laissé à vérifier ; ne dis jamais qu'il est publié." };
  },
};

const blogValidateTool: AgentTool<Record<string, never>> = {
  name: "blog.validate", module: "blog", kind: "write", needsProject: true,
  description: "Étape 12 : enregistre la VALIDATION DU CLIENT de ses articles (jamais à sa place), quand au moins un article est écrit. Les articles restent en brouillon tant qu'il ne les publie pas lui-même. Gratuit.",
  args: z.object({}).strict(),
  run: (ctx) => {
    const p = project(ctx), j = journeyOf(ctx.conversationId);
    if (!stepAvailable(j, 12)) return closed("des articles");
    const made = j.blog ? articlesMade(p.id, j.blog.at) : 0;
    if (!made) return { ok: false, summary: L("Aucun article n'est encore écrit : rien à valider.", "No article written yet.") };
    updateJourney(ctx.conversationId, (x) => setStep(x, 12, "done"));
    return { ok: true, summary: L(`Articles validés (${made}). Dernière étape : le rangement de tes fichiers.`, "Articles validated."), changes: [{ module: "blog", object: L("articles de l'étape", "step articles"), summary: L(`${made} article(s) validé(s)`, `${made} article(s) validated`), verified: true }] };
  },
};

// ------------------------------------------------------------------------------------------------ étape 13 : rangement

const filesTidyTool: AgentTool<Record<string, never>> = {
  name: "files.tidy", module: "fichiers", kind: "write", needsProject: true,
  description: "Étape 13 (gratuit, sans IA) : range dans leurs dossiers les fichiers du projet qui n'en ont pas encore (marque, images, publications, publicités, exports…), d'après leur rôle. Ne supprime jamais rien, ne déplace pas un fichier déjà rangé par le client.",
  args: z.object({}).strict(),
  run: (ctx) => {
    const p = project(ctx), j = journeyOf(ctx.conversationId);
    if (!stepAvailable(j, 13)) return closed("du rangement");
    if (pendingJob(p.id, "files.classify")) return { ok: true, summary: L("Le rangement est déjà en cours.", "Sorting is already running.") };
    const loose = count("SELECT COUNT(*) n FROM assets WHERE project_id=? AND deleted_at IS NULL AND folder_id IS NULL", p.id);
    if (!loose) { updateJourney(ctx.conversationId, (x) => setStep(x, 13, "review")); return { ok: true, summary: L("Tous tes fichiers sont déjà rangés dans leurs dossiers.", "All your files are already sorted.") }; }
    const job = enqueue({ userId: ctx.user.id, projectId: p.id, type: "files.classify", label: L("Rangement des fichiers (SINA)", "File sorting (SINA)"), payload: { projectId: p.id, localOnly: true, aiOff: true, costCapMicro: 0 } });
    updateJourney(ctx.conversationId, (x) => setStep(x, 13, "doing"));
    return { ok: true, jobs: [job.id], summary: L(`Rangement de ${loose} fichier${loose > 1 ? "s" : ""} lancé (gratuit, sans IA).`, "Sorting started."), hint: "À la fin : dis combien de fichiers ont été rangés et combien restent à classer à la main (onglet Fichiers), puis le client valide (files.validate)." };
  },
};

const filesValidateTool: AgentTool<Record<string, never>> = {
  name: "files.validate", module: "fichiers", kind: "write", needsProject: true,
  description: "Étape 13 : enregistre la VALIDATION DU CLIENT du rangement de ses fichiers (jamais à sa place). C'est la dernière étape du parcours de création. Gratuit.",
  args: z.object({}).strict(),
  run: (ctx) => {
    const j = journeyOf(ctx.conversationId);
    if (!stepAvailable(j, 13)) return closed("du rangement");
    updateJourney(ctx.conversationId, (x) => setStep(x, 13, "done"));
    return { ok: true, summary: L("Rangement validé : le parcours de création est terminé.", "Sorting validated: the creation journey is complete."), changes: [{ module: "fichiers", object: L("rangement des fichiers", "file sorting"), summary: L("validé par le client", "validated by the client"), verified: true }] };
  },
};

export const lateStepTools: AgentTool[] = [adsCreateTool, adsValidateTool, calendarValidateTool, blogTopicsTool, blogWriteTool, blogValidateTool, filesTidyTool, filesValidateTool];
