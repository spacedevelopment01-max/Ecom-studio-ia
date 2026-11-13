/**
 * Étape 9 du parcours SINA : le PLAN des 3 groupes de publications (carte des spécialistes, lot 5, 13 novembre 2026).
 * Les images coûtent : le plan est écrit, contrôlé, jugé et montré au client AVANT qu'une seule image soit créée.
 *
 *  1) La STRATÈGE DES CONTENUS écrit trois groupes « sans aucune ressemblance » (charte de qualité § 7) : sujet utile,
 *     titre en deux temps, trois points au plus, appel à l'action, texte, hashtags, et la photo à créer.
 *  2) Le Studio contrôle sans IA : angle choisi par le client, produit du catalogue, 5 à 15 hashtags sans générique
 *     vide, trois sujets différents, aucune promesse non confirmée.
 *  3) Un JUGE séparé lit le plan entier (celui qui écrit n'est jamais celui qui juge) et dit « garde » ou « reprendre ».
 *  4) Les groupes refusés (par le juge ou par les contrôles) sont réécrits UNE fois, puis relus par le juge.
 *     Un groupe encore refusé est montré avec le doute de SINA : rien n'est montré sans avoir été relu.
 * La création des visuels (posts.create) passe ensuite par le moteur de publications du Studio, qui a déjà son
 * rédacteur, son modèle d'images et son contrôle en image.
 */
import { z } from "zod";
import { L } from "../i18n-server";
import { UserFacingError, type JobContext } from "../jobs";
import { loadProject, type Project } from "../projects";
import { llmJson } from "../ai/llm";
import { lintClaims } from "../ai/tasks";
import { withTrace } from "../ai/trace";
import { listProducts } from "../products/catalog";
import { peopleAllowed } from "../people-policy";
import { journeyOf, setStep, updateJourney, type Journey } from "./journey";
import { brandBrief, boardLook } from "./custom-theme/brand";

export const POSTS_PLAN_JOB = "syna.posts.plan";
/** Plafonds par appel (stratège, juge, reprise, seconde lecture) et coût habituel du plan entier. */
export const POSTS_PLAN_CAP_MICRO = 300_000;
export const POSTS_JUDGE_CAP_MICRO = 150_000;
export const POSTS_PLAN_MAX_MICRO = POSTS_PLAN_CAP_MICRO * 2 + POSTS_JUDGE_CAP_MICRO * 2;
export const POSTS_PLAN_TYPICAL_MICRO = 220_000;

/** Sujets de la charte § 7 : produit, conseil, coulisses, usage, erreurs à éviter, question à la communauté. */
export const POST_SUBJECTS = ["produit", "conseil", "coulisses", "usage", "erreurs", "question"] as const;
export const POST_SUBJECT_LABEL: Record<(typeof POST_SUBJECTS)[number], string> = { produit: "Le produit", conseil: "Un conseil", coulisses: "Les coulisses", usage: "L'usage", erreurs: "Les erreurs à éviter", question: "Une question à la communauté" };

export const PostGroupSchema = z.object({
  angleId: z.string().min(1).max(40),
  subject: z.enum(POST_SUBJECTS),
  /** Titre de l'image, en deux temps : « Sujet : promesse ». */
  title: z.string().min(6).max(70),
  /** Trois points au plus, courts et concrets (écrits dans l'image). */
  points: z.array(z.string().min(3).max(80)).max(3).default([]),
  /** Appel à l'action en pastille (« Enregistre ce mémo »). */
  cta: z.string().min(3).max(40),
  /** Texte de la publication (sous l'image). */
  caption: z.string().min(60).max(900),
  hashtags: z.array(z.string().min(2).max(40)).min(1).max(20),
  /** La photo d'ambiance à créer : UNE scène décrite, sans texte dedans. */
  visual: z.string().min(60).max(700),
  /** Ce qui rend ce groupe différent des deux autres : cadrage, palette dominante, type de visuel. */
  look: z.string().min(10).max(200),
  /** Nom exact d'un produit du catalogue quand la photo le montre, sinon null. */
  product: z.string().max(120).nullable().default(null),
});
export type PostGroup = z.infer<typeof PostGroupSchema>;
export const PostsPlanSchema = z.object({ groups: z.array(PostGroupSchema).length(3) });
export const PostsFixSchema = z.object({ groups: z.array(z.object({ index: z.number().int().min(0).max(2), group: PostGroupSchema })).min(1).max(3) });
export const PostsJudgeSchema = z.object({
  groups: z.array(z.object({ index: z.number().int().min(0).max(2), verdict: z.enum(["garde", "reprendre"]), why: z.string().min(4).max(320), fixes: z.array(z.string().min(8).max(320)).max(4).default([]) })).min(1).max(6),
  overall: z.string().max(500).default(""),
});

/** Ce que le parcours garde du plan : les trois groupes, le doute éventuel sur chacun, l'avis d'ensemble. */
export type SinaPosts = {
  round: number;
  groups: (PostGroup & { doubt?: string })[];
  judged: "juges" | "non_juges";
  overall: string;
  notes: string[];
  at: number;
  /** Publications créées à partir du plan (posts.create) : lignes du moteur de publications et tâche de production. */
  created?: { postIds: string[]; jobId: string; networks: string[]; at: number };
};

const RULES = `Règles des publications (charte de qualité du Studio) :
- TROIS groupes sans aucune ressemblance : sujet, composition, cadrage, palette dominante et type de visuel différents.
- Un sujet UTILE par publication, jamais une simple publicité : un conseil, des erreurs à éviter, comment choisir, les coulisses, un usage, une question à la communauté. Trois sujets différents parmi : ${POST_SUBJECTS.join(", ")}.
- Titre accrocheur en deux temps, « Sujet : promesse » (« Bougie : 5 erreurs à éviter »), court.
- Trois points au plus, phrases courtes et concrètes. Un chiffre affiché est vrai et vient du client, jamais inventé.
- Un appel à l'action qui fait agir la communauté (« Enregistre ce mémo », « Vote en commentaire », « Partage à un ami »).
- Le texte fait RESSENTIR l'émotion de l'angle (une scène, un moment, une sensation), au tutoiement, sans ordre donné au lecteur en dehors de l'appel à l'action.
- Hashtags : 5 à 15, pertinents pour CE sujet et CE métier, aucun générique vide (#love, #instagood, #photooftheday…).
- La photo : une vraie scène de vie avec une lumière soignée et une partie calme où le titre se pose ; jamais un produit seul sur fond uni ; aucun texte, aucun logo dans la description ; aucune personne sauf si la fiche l'autorise.
- Aucun avis, chiffre, délai, garantie ni certification absent de la fiche du client.`;

export const POSTS_PLAN_SYSTEM = `Tu es la stratège des contenus d'un studio qui crée la marque et le site de petits commerçants. Tu écris le plan des TROIS premiers groupes de publications d'un client pour ses réseaux sociaux, en français. Chaque groupe est UNE publication (une image et son texte) qui sera déclinée dans le format de chaque réseau.

${RULES}

Pour chaque groupe : angleId = l'identifiant exact d'un des angles choisis par le client (l'angle principal au moins une fois ; un angle secondaire quand il en a) ; subject ; title ; points ; cta ; caption = le texte sous l'image (un vrai texte, 2 à 5 phrases, qui prolonge l'image sans la répéter) ; hashtags ; visual = UNE photo décrite en phrases complètes (type de photo et cadrage, lieu et surface, chaque objet à sa place, la partie calme pour le titre, la lumière) ; look = ce qui rend ce groupe différent des deux autres (cadrage, palette dominante, type de visuel) ; product = le nom exact d'un produit du catalogue si la photo le montre, sinon null.

Réponse : uniquement le JSON demandé.`;

export const POSTS_JUDGE_SYSTEM = `Tu es le juge des publications d'un studio qui crée la marque et le site de petits commerçants. Une stratège vient d'écrire le plan de trois groupes de publications. Aucune image n'est encore créée : c'est le moment de refuser ce qui ne vaut pas d'être payé. Tu ne réécris rien : pour CHAQUE groupe (index 0, 1, 2), tu dis « garde » ou « reprendre », et pour un groupe à reprendre tu dis précisément quoi changer.

${RULES}

Les épreuves :
1. LA RESSEMBLANCE. Deux groupes qui se ressemblent (même sujet, même scène, même cadrage, même palette, même tournure de titre) : le plus faible est à reprendre, dis vers quoi.
2. L'UTILITÉ. Le lecteur apprend-il ou ressent-il quelque chose, ou est-ce une publicité déguisée ?
3. L'ÉMOTION DE L'ANGLE. Le texte fait-il ressentir l'émotion de l'angle indiqué, avec des mots qu'un client dirait ?
4. LE TITRE ET LES POINTS. Titre en deux temps, court ; trois points au plus, concrets ; aucun chiffre qui ne vienne pas de la fiche.
5. LA PHOTO. Une vraie scène, à sa place avec ce texte, qu'un bon photographe saurait faire ; pas un produit seul sur fond uni ; rien d'interdit.
6. LES FAITS. Rien d'inventé : ni avis, ni chiffre, ni délai, ni garantie, ni certification absents de la fiche.

Sévère mais juste : un groupe qui passe les épreuves, tu le gardes. Aucune remarque de goût personnel.

Réponse : uniquement le JSON demandé : groups (un avis par groupe : index, verdict, why en une ou deux phrases, fixes = 1 à 4 corrections précises si « reprendre ») et overall (ton avis sur la série en deux phrases).`;

export const POSTS_FIX_SYSTEM = `Tu es la stratège des contenus d'un studio qui crée la marque et le site de petits commerçants. Des groupes de ton plan de publications ont été refusés. Tu réécris SEULEMENT ceux-là, en suivant les corrections, et tu rends chacun en entier avec son index. Tu ne touches pas aux groupes gardés : ils te sont donnés pour que tu ne leur ressembles pas.

${RULES}

Réponse : uniquement le JSON demandé : groups = [{ index, group }] pour chaque groupe réécrit.`;

/** Hashtags génériques vides (charte § 7) : refusés sans IA. */
const EMPTY_TAGS = new Set(["love", "instagood", "photooftheday", "picoftheday", "follow", "followme", "like4like", "likeforlike", "instadaily", "happy", "beautiful", "cute", "fashion", "style", "amazing", "bestoftheday", "instalike", "life", "smile", "fun", "tbt", "nofilter", "viral", "fyp", "pourtoi", "foryou"]);
const tagKey = (t: string) => t.replace(/^#+/, "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Hashtags remis en forme (un « # », sans espace, sans doublon) : un nettoyage, jamais une réécriture. */
export function cleanHashtags(tags: string[]): string[] {
  const seen = new Set<string>();
  return tags.map((t) => `#${t.replace(/^#+/, "").replace(/\s+/g, "")}`).filter((t) => { const k = tagKey(t); if (!k || seen.has(k)) return false; seen.add(k); return true; });
}

/** Contrôles sans IA d'un plan : chaque défaut est rendu avec l'index du groupe (ou -1 pour la série). */
export function planIssues(p: Project, groups: PostGroup[], o: { angleIds: string[]; products: string[]; people: boolean }): { index: number; issue: string }[] {
  const out: { index: number; issue: string }[] = [];
  groups.forEach((g, i) => {
    if (!o.angleIds.includes(g.angleId)) out.push({ index: i, issue: `angle « ${g.angleId} » inconnu : prends un des angles choisis par le client (${o.angleIds.join(", ")})` });
    const tags = cleanHashtags(g.hashtags);
    if (tags.length < 5 || tags.length > 15) out.push({ index: i, issue: `${tags.length} hashtags : il en faut 5 à 15` });
    const empty = tags.filter((t) => EMPTY_TAGS.has(tagKey(t)));
    if (empty.length) out.push({ index: i, issue: `hashtags génériques vides à remplacer : ${empty.join(" ")}` });
    if (g.product && !o.products.some((x) => x.trim().toLowerCase() === g.product!.trim().toLowerCase())) out.push({ index: i, issue: `produit « ${g.product} » absent du catalogue : le nom exact d'un produit du client, ou null` });
    const claims = lintClaims({ title: g.title, points: g.points, caption: g.caption, cta: g.cta }, p);
    if (claims.length) out.push({ index: i, issue: `promesse non confirmée par la fiche du client : ${claims.slice(0, 3).map((c) => `« ${c.term} » (${c.label})`).join(" ; ")}` });
    if (!o.people && /(?<![\p{L}])(personne|femme|homme|mannequin|visage|enfant|client(?:e)?s? (?:qui|souriant))(?![\p{L}])/iu.test(g.visual) && !/(aucune|sans) personne/i.test(g.visual)) out.push({ index: i, issue: "la photo décrit une personne : le client ne l'a pas autorisé, décris la scène sans personne (la trace d'un geste suffit)" });
  });
  for (let i = 0; i < groups.length; i++) for (let k = i + 1; k < groups.length; k++) {
    if (groups[i].subject === groups[k].subject) out.push({ index: k, issue: `même sujet que le groupe ${i + 1} (« ${groups[i].subject} ») : trois sujets différents` });
    if (groups[i].title.trim().toLowerCase() === groups[k].title.trim().toLowerCase()) out.push({ index: k, issue: `même titre que le groupe ${i + 1}` });
  }
  return out;
}

/** Les angles choisis par le client (le premier est le principal), tels que la stratège les lit. */
export function chosenAngles(j: Journey): { id: string; title: string; emotion: string; message: string; audience: string; story: string; main: boolean }[] {
  const ids = j.angleChoice?.ids ?? (j.angleChoice ? [j.angleChoice.id] : []);
  return ids.map((id, i) => { const a = j.angles?.list.find((x) => x.id === id); return a ? { id, title: a.title, emotion: a.emotion, message: a.message, audience: a.audience, story: a.story, main: i === 0 } : null; }).filter((x): x is NonNullable<typeof x> => !!x);
}

export function postsPlanPrompt(brief: string, angles: ReturnType<typeof chosenAngles>, products: string[], o: { look?: string | null; people: boolean; guidance?: string | null; previous?: PostGroup[] }): string {
  return [brief, "",
    `ANGLES CHOISIS PAR LE CLIENT (angleId exact) :\n${angles.map((a) => `- ${a.id}${a.main ? " (angle principal)" : ""} · « ${a.title} » · émotion : ${a.emotion} · accroche : ${a.message} · pour : ${a.audience}${a.story ? ` · ce qu'on raconte : ${a.story}` : ""}`).join("\n")}`,
    products.length ? `PRODUITS DU CATALOGUE (nom exact pour « product ») : ${products.join(" ; ")}` : "AUCUN PRODUIT AU CATALOGUE : product = null partout.",
    o.look ? `DIRECTION ARTISTIQUE DE SA PLANCHE DE MARQUE (les photos en sont la suite) : ${o.look}` : "",
    o.people ? "PERSONNES : autorisées, inventées, jamais une personne réelle." : "PERSONNES : aucune dans les photos (le client ne l'a pas autorisé).",
    o.previous?.length ? `PLAN PRÉCÉDENT (le client n'en veut plus : ne reprends ni ses sujets ni ses titres) :\n${o.previous.map((g) => `- ${g.title}`).join("\n")}` : "",
    o.guidance ? `DEMANDE DU CLIENT (ses mots, prioritaire) : « ${o.guidance} »` : "",
  ].filter(Boolean).join("\n\n");
}

const showGroup = (g: PostGroup, i: number) => ({ index: i, angle: g.angleId, sujet: g.subject, titre: g.title, points: g.points, appel: g.cta, texte: g.caption, hashtags: cleanHashtags(g.hashtags), photo: g.visual, difference: g.look, produit: g.product });

/** Remplaçables par les tests (aucun appel réel). */
export const postsPlanDeps: {
  plan?: (prompt: string, usageKey: string) => Promise<unknown>;
  judge?: (prompt: string, usageKey: string) => Promise<unknown>;
  fix?: (prompt: string, usageKey: string) => Promise<unknown>;
} = {};

export type PostsPlanPayload = { projectId: string; conversationId: string; capMicro: number; guidance?: string | null };

export async function runPostsPlanJob(ctx: JobContext) {
  const a = ctx.payload as PostsPlanPayload;
  const p = loadProject(a.projectId);
  const j = journeyOf(a.conversationId);
  const angles = chosenAngles(j);
  if (!angles.length) throw new UserFacingError(L("Aucun angle choisi : l'étape 4 doit être validée avant les publications.", "No chosen angle yet."));
  const products = (() => { try { return listProducts(p.id).map((x) => x.data.title).filter(Boolean); } catch { return []; } })();
  const people = peopleAllowed(p.id), brief = brandBrief(p, j);
  const facts = { angleIds: angles.map((x) => x.id), products, people };
  const ask = <T,>(step: string, system: string, prompt: string, schema: z.ZodType<T>, dep: ((prompt: string, usageKey: string) => Promise<unknown>) | undefined, o: { task: "strategy" | "quality_control"; cap: number; out: number }): Promise<T> => ctx.step(step, async () => {
    const usageKey = `${ctx.job.id}:${step}`;
    return schema.parse(dep ? await dep(prompt, usageKey)
      : await withTrace({ jobId: ctx.job.id, projectId: p.id, step: `syna-posts-${step}`, costCapMicro: Math.min(o.cap, a.capMicro) }, () =>
          llmJson({ task: o.task, userId: p.userId, projectId: p.id, jobId: ctx.job.id, system, promptKey: `syna-posts-${step.replace(/:\d+$/, "")}-1`, prompt, maxTokens: o.out, maxOutputTokens: o.out * 2, usageKey, routing: { difficulty: "complex" } }, schema, { strict: true })));
  });

  // 1) La stratège écrit les trois groupes.
  ctx.progress(0.1, L("J'écris le plan de tes publications", "Writing your posts plan"));
  const base = postsPlanPrompt(brief, angles, products, { look: boardLook(j), people, guidance: a.guidance, previous: j.posts?.groups });
  let groups: PostGroup[] = (await ask("plan", POSTS_PLAN_SYSTEM, base, PostsPlanSchema, postsPlanDeps.plan, { task: "strategy", cap: POSTS_PLAN_CAP_MICRO, out: 7000 })).groups;

  // 2) et 3) Contrôles du Studio, puis le juge lit le plan entier.
  const notes: string[] = [];
  const judge = async (round: number, only?: number[]) => {
    const prompt = `${brief}\n\nANGLES CHOISIS : ${angles.map((x) => `${x.id} = « ${x.title} » (émotion : ${x.emotion})`).join(" ; ")}\n\nPLAN À JUGER${only ? ` (les groupes ${only.map((i) => i + 1).join(" et ")} viennent d'être réécrits : juge-les, les autres sont déjà gardés)` : ""} :\n${JSON.stringify(groups.map(showGroup))}`;
    return ask(`judge:${round}`, POSTS_JUDGE_SYSTEM, prompt, PostsJudgeSchema, postsPlanDeps.judge, { task: "quality_control", cap: POSTS_JUDGE_CAP_MICRO, out: 3000 });
  };
  type Refusal = { index: number; why: string; fixes: string[] };
  const refusalsOf = (v: z.infer<typeof PostsJudgeSchema> | null, only?: number[]): Refusal[] => {
    const byCode = planIssues(p, groups, facts);
    return [0, 1, 2].filter((i) => !only || only.includes(i)).map((i) => {
      const opinion = v?.groups.find((x) => x.index === i && x.verdict === "reprendre" && x.fixes.length);
      const code = byCode.filter((x) => x.index === i).map((x) => x.issue);
      return opinion || code.length ? { index: i, why: opinion?.why ?? code[0], fixes: [...(opinion?.fixes ?? []), ...code] } : null;
    }).filter((x): x is Refusal => !!x);
  };
  ctx.progress(0.45, L("Je relis le plan avant de te le montrer", "Reviewing the plan"));
  let judged: SinaPosts["judged"] = "juges", overall = "";
  let verdict: z.infer<typeof PostsJudgeSchema> | null = null;
  try { verdict = await judge(1); overall = verdict.overall; } catch (e) { judged = "non_juges"; notes.push(`plan non jugé (${(e as Error).message.slice(0, 120)})`); }
  let refused = refusalsOf(verdict);

  // 4) Une seule reprise des groupes refusés, puis le juge relit ce qui a été réécrit.
  if (refused.length) {
    ctx.progress(0.65, L("Je reprends ce qui ne va pas", "Reworking what is off"));
    try {
      const prompt = `${base}\n\nGROUPES GARDÉS (ne leur ressemble pas) :\n${JSON.stringify(groups.map(showGroup).filter((g) => !refused.some((r) => r.index === g.index)))}\n\nGROUPES À RÉÉCRIRE :\n${JSON.stringify(refused.map((r) => ({ ...showGroup(groups[r.index], r.index), corrections: r.fixes })))}`;
      const fixed = await ask("fix", POSTS_FIX_SYSTEM, prompt, PostsFixSchema, postsPlanDeps.fix, { task: "strategy", cap: POSTS_PLAN_CAP_MICRO, out: 7000 });
      const redone = refused.map((r) => r.index).filter((i) => fixed.groups.some((x) => x.index === i));
      groups = groups.map((g, i) => fixed.groups.find((x) => x.index === i && redone.includes(i))?.group ?? g);
      if (redone.length) {
        let second: z.infer<typeof PostsJudgeSchema> | null = null;
        if (judged === "juges") { try { second = await judge(2, redone); overall = second.overall || overall; } catch (e) { notes.push(`reprise non relue (${(e as Error).message.slice(0, 120)})`); } }
        // Un groupe réécrit que le juge n'a pas pu relire garde le doute d'origine : rien n'est montré sans avoir été relu.
        const still = refusalsOf(second, redone), unread = second ? [] : refused.filter((r) => redone.includes(r.index) && !still.some((s) => s.index === r.index));
        refused = [...refused.filter((r) => !redone.includes(r.index)), ...still, ...(judged === "juges" ? unread : [])];
      }
    } catch (e) { notes.push(`reprise non faite (${(e as Error).message.slice(0, 120)})`); }
  }

  const plan: SinaPosts = {
    round: (j.posts?.round ?? 0) + 1,
    groups: groups.map((g, i) => { const r = refused.find((x) => x.index === i); return { ...g, hashtags: cleanHashtags(g.hashtags), ...(r ? { doubt: r.why.slice(0, 320) } : {}) }; }),
    judged, overall, notes, at: Date.now(),
  };
  updateJourney(a.conversationId, (x) => { x.posts = plan; setStep(x, 9, "review", L("plan des publications prêt", "posts plan ready")); });
  ctx.progress(1, L("Plan des publications prêt", "Posts plan ready"));
  return { groupes: plan.groups.map((g) => ({ titre: g.title, sujet: g.subject, angle: g.angleId, ...(g.doubt ? { doute: g.doubt } : {}) })), relus: judged === "juges", avis: overall, notes };
}
