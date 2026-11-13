/**
 * Étape 9 du parcours SINA : publications. Le plan d'abord (posts.plan : stratège, contrôles, juge), les images
 * ensuite (posts.create : le moteur de publications du Studio, avec son rédacteur, son modèle d'images et son contrôle
 * en image), puis la validation du client (posts.validate). Voir ../posts-plan.ts.
 * Ces outils n'existent pour SINA que si l'étape 9 est ouverte (réglage « sina.etapes_ouvertes »).
 */
import { z } from "zod";
import { all, json, run } from "../../db";
import { L } from "../../i18n-server";
import { enqueue, pendingJob } from "../../jobs";
import { aiActiveFor } from "../../ai/access";
import { assertPerDayRequest } from "../../plan-gates";
import { PLATFORMS, type Platform } from "../../social-v2/platforms";
import { createOnePost, produceParams, quoteOne } from "../../social-v2/single";
import { probableOf, productionInputVersions } from "../../social-v2/production";
import { realSocialDeps } from "../../social-v2/deps";
import { listProducts } from "../../products/catalog";
import type { AngleId } from "../../marketing-strategy";
import type { AgentTool } from "../types";
import { journeyOf, setStep, stepAvailable, updateJourney } from "../journey";
import { POST_SUBJECT_LABEL, POSTS_PLAN_JOB, POSTS_PLAN_MAX_MICRO, POSTS_PLAN_TYPICAL_MICRO, chosenAngles, type PostGroup } from "../posts-plan";
import { project } from "./common";

const closed = () => ({ ok: false as const, summary: L("L'étape des publications n'est pas encore ouverte dans le parcours.", "The posts step is not open yet.") });

/** Structure éditoriale du moteur de publications pour chaque sujet de la charte. */
const STRUCTURE: Record<PostGroup["subject"], "editorial_photo" | "advice" | "behind_scenes" | "tutorial" | "checklist" | "community"> = { produit: "editorial_photo", conseil: "advice", coulisses: "behind_scenes", usage: "tutorial", erreurs: "checklist", question: "community" };

const planTool: AgentTool<{ redo?: string }> = {
  name: "posts.plan", module: "publications", kind: "generate", needsProject: true,
  description: "Étape 9 (PAYANT, peu : le Studio montre le devis sur la carte d'accord) : écrit le PLAN des 3 groupes de publications du client, d'après ses angles choisis : pour chacun un sujet utile, un titre, trois points au plus, un appel à l'action, le texte, les hashtags et la photo prévue. Le plan est contrôlé et relu avant d'être montré ; il s'affiche dans le fil. Aucune image n'est créée ici (posts.create, ensuite). redo = les mots du client quand il veut un autre plan.",
  args: z.object({ redo: z.string().min(8).max(1500).optional() }).strict(),
  estimate: () => ({ maxMicro: POSTS_PLAN_MAX_MICRO, probableMicro: POSTS_PLAN_TYPICAL_MICRO, label: L("le plan de tes 3 groupes de publications (sujets, titres, textes, hashtags, photos prévues), relu avant de t'être montré", "the plan of your 3 post groups") }),
  run: (ctx, a) => {
    const p = project(ctx), j = journeyOf(ctx.conversationId);
    if (!stepAvailable(j, 9)) return closed();
    if (j.steps[8]?.status !== "done" && j.steps[8]?.status !== "skipped" && j.steps[7]?.status !== "done") return { ok: false, summary: L("Le site doit être validé avant les publications.", "Validate the site first.") };
    if (!chosenAngles(j).length) return { ok: false, summary: L("Aucun angle choisi : l'étape 4 doit être validée avant les publications.", "No chosen angle yet.") };
    if (j.posts && !a.redo) return { ok: true, summary: L(`Le plan est déjà prêt et affiché dans le fil : ${j.posts.groups.map((g) => `« ${g.title} »`).join(" ; ")}.`, "The plan is ready."), hint: "Un autre plan ne se refait que si le client le demande (redo = ses mots, payant, annoncé avant)." };
    if (pendingJob(p.id, POSTS_PLAN_JOB)) return { ok: true, summary: L("Le plan est déjà en cours d'écriture ; je reprends dès qu'il est prêt.", "The plan is being written.") };
    const job = enqueue({ userId: ctx.user.id, projectId: p.id, type: POSTS_PLAN_JOB, label: L("Plan des publications (SINA)", "Posts plan (SINA)"), payload: { projectId: p.id, conversationId: ctx.conversationId, capMicro: POSTS_PLAN_MAX_MICRO, guidance: a.redo?.trim() || null }, maxAttempts: 2, idempotencyKey: `syna:${ctx.runId}:posts-plan:${j.posts?.round ?? 0}` });
    updateJourney(ctx.conversationId, (x) => setStep(x, 9, "doing"));
    return { ok: true, jobs: [job.id], summary: L("Plan des 3 groupes de publications en cours d'écriture (quelques minutes).", "Writing the posts plan.") };
  },
};

type CreateArgs = { networks: Platform[]; groups?: number[] };
const groupsOf = (j: ReturnType<typeof journeyOf>, a: CreateArgs) => (j.posts?.groups ?? []).map((g, i) => ({ g, i })).filter((x) => !a.groups?.length || a.groups.includes(x.i + 1));
/** Devis de la création : une image par groupe et par réseau, au prix du moteur de publications (probable et plafond). */
function createQuote(ctx: Parameters<NonNullable<AgentTool["estimate"]>>[0], a: CreateArgs) {
  const p = project(ctx), j = journeyOf(ctx.conversationId);
  const deps = realSocialDeps(null, p, aiActiveFor(p.userId, p.id));
  const n = groupsOf(j, a).length, networks = [...new Set(a.networks)];
  return { p, j, n, networks, probable: n * quoteOne("image", "ai_post", networks.length, (k) => probableOf(deps, k)), cap: n * quoteOne("image", "ai_post", networks.length, deps.estimate) };
}

const createTool: AgentTool<CreateArgs> = {
  name: "posts.create", module: "publications", kind: "generate", needsProject: true,
  description: "Étape 9 (PAYANT : le Studio montre le devis sur la carte d'accord), seulement quand le plan convient au client : crée les publications du plan, chacune dans le format de chacun de SES réseaux (networks = les réseaux qu'il t'a donnés, jamais devinés). Chaque image est créée puis contrôlée par le Studio avant d'être montrée. groups = les numéros des groupes à créer (1 à 3) s'il n'en veut qu'une partie.",
  args: z.object({ networks: z.array(z.enum(PLATFORMS)).min(1).max(6), groups: z.array(z.number().int().min(1).max(3)).min(1).max(3).optional() }).strict(),
  estimate: (ctx, a) => { const q = createQuote(ctx, a); return { maxMicro: q.cap, probableMicro: q.probable, label: L(`${q.n} publication${q.n > 1 ? "s" : ""} créée${q.n > 1 ? "s" : ""} pour ${q.networks.join(", ")} (${q.n * q.networks.length} images), chacune contrôlée avant de t'être montrée`, "posts created for your networks") }; },
  run: (ctx, a) => {
    const q = createQuote(ctx, a), { p, j } = q;
    if (!stepAvailable(j, 9)) return closed();
    if (!j.posts) return { ok: false, summary: L("Aucun plan de publications encore : il se fait d'abord (posts.plan).", "No posts plan yet.") };
    if (j.posts.created) return { ok: false, summary: L("Les publications de ce plan ont déjà été créées : regarde le rapport de la tâche, ou demande un autre plan.", "Posts already created for this plan.") };
    if (!aiActiveFor(p.userId, p.id)) return { ok: false, summary: L("L'IA n'est pas active pour ce projet (budget IA épuisé ou fournisseur désactivé) : aucune image ne peut être créée.", "AI is not active for this project.") };
    try { assertPerDayRequest(p.id, 1); } catch (e) { return { ok: false, summary: (e as Error).message }; }
    const products = (() => { try { return listProducts(p.id); } catch { return []; } })();
    const lang = p.settings.language === "en" ? "en" as const : "fr" as const, timezone = p.settings.timezone || "Europe/Paris";
    const ids: string[] = [];
    for (const { g, i } of groupsOf(j, a)) {
      // Une date par groupe (le calendrier de l'étape 11 les replacera) : jamais deux publications le même jour.
      const date = new Date(Date.now() + (i + 1) * 86_400_000).toISOString().slice(0, 10);
      const product = g.product ? products.find((x) => x.data.title.trim().toLowerCase() === g.product!.trim().toLowerCase()) : undefined;
      const one = createOnePost(p, {
        angleId: g.angleId as AngleId, kind: "image", date, time: "11:30", timezone, lang,
        platforms: q.networks.map((platform) => ({ platform })),
        headline: g.title, caption: g.caption, request: g.visual,
        subject: product ? { kind: "product", key: product.id } : null,
        editorial: { role: POST_SUBJECT_LABEL[g.subject], structure: STRUCTURE[g.subject], blocks: [...g.points.map((text) => ({ kind: "tip" as const, text })), { kind: "paragraph" as const, text: g.cta }] },
      });
      // Convention attendue par le calendrier : un groupe = une publication déclinée par réseau, avec son sujet.
      run("UPDATE posts SET group_id=?, hashtags=?, brief=json_set(COALESCE(brief,'{}'),'$.serie',?,'$.synaPlan',?) WHERE plan_id=?", one.planId, g.hashtags.join(" "), POST_SUBJECT_LABEL[g.subject], j.posts.round, one.planId);
      ids.push(...one.ids);
    }
    if (!ids.length) return { ok: false, summary: L("Aucune publication à créer.", "Nothing to create.") };
    const params = produceParams("image", "ai_post");
    const job = enqueue({ userId: ctx.user.id, projectId: p.id, type: "social.v2.produce", label: L("Publications du plan (SINA)", "Plan posts (SINA)"), payload: { projectId: p.id, ids, expectedInputs: productionInputVersions(p.id, ids), allowPaid: true, maxCostEur: q.cap / 1e6, approvedEstimateMicro: q.probable, aiImages: params.aiImages ?? null, aiBackground: !!params.aiBackground } });
    updateJourney(ctx.conversationId, (x) => { if (x.posts) x.posts.created = { postIds: ids, jobId: job.id, networks: q.networks, at: Date.now() }; setStep(x, 9, "doing"); });
    return { ok: true, jobs: [job.id], summary: L(`Création de ${q.n} publication${q.n > 1 ? "s" : ""} pour ${q.networks.join(", ")} lancée (${ids.length} images, quelques minutes).`, "Creating the posts."), hint: "À la fin de la tâche : dis honnêtement combien d'images sont prêtes et lesquelles ont échoué (posts.list les montre) ; une image ratée n'est jamais présentée comme bonne. Puis le client valide (posts.validate)." };
  },
};

/** Publications du plan qui ont leur image (créées, contrôlées par le moteur). */
export function createdPosts(projectId: string, postIds: string[]): { id: string; network: string; title: string; status: string; media: string[] }[] {
  if (!postIds.length) return [];
  return all<{ id: string; network: string; title: string | null; status: string; media: string | null }>(`SELECT id,network,title,status,media FROM posts WHERE project_id=? AND id IN (${postIds.map(() => "?").join(",")}) ORDER BY created_at, id`, projectId, ...postIds)
    .map((r) => ({ id: r.id, network: r.network, title: r.title ?? "", status: r.status, media: json<string[]>(r.media, []) }));
}

const validateTool: AgentTool<Record<string, never>> = {
  name: "posts.validate", module: "publications", kind: "write", needsProject: true,
  description: "Étape 9 : enregistre la VALIDATION DU CLIENT de ses publications (jamais à sa place), quand au moins une publication a son image. L'étape suivante s'ouvre. Gratuit.",
  args: z.object({}).strict(),
  run: (ctx) => {
    const p = project(ctx), j = journeyOf(ctx.conversationId);
    if (!stepAvailable(j, 9)) return closed();
    const ready = createdPosts(p.id, j.posts?.created?.postIds ?? []).filter((x) => x.media.length);
    if (!ready.length) return { ok: false, summary: L("Aucune publication n'a encore son image : rien à valider.", "No post has its image yet.") };
    updateJourney(ctx.conversationId, (x) => { setStep(x, 9, "done"); setStep(x, 10, "todo"); });
    return { ok: true, summary: L(`Publications validées (${ready.length} avec leur image). Prochaine étape : les publicités.`, "Posts validated."), changes: [{ module: "publications", object: L("publications du plan", "plan posts"), summary: L(`${ready.length} publication(s) validée(s)`, `${ready.length} post(s) validated`), verified: true }] };
  },
};

export const postsTools: AgentTool[] = [planTool, createTool, validateTool];
