/**
 * La conversation de SINA (carte des spécialistes, lot 3, 13 novembre 2026). Un seul appel comprend le client, décide,
 * choisit parmi une centaine d'outils et répond ; trois aides l'entourent, chacune derrière le réglage
 * « sina.conversation » (tout est éteint par défaut : rien ne change tant que le propriétaire ne l'a pas décidé) :
 *
 *  1) L'AIGUILLEUSE (sans IA, « aiguillage ») : la notice complète des seuls outils de l'étape en cours, et une ligne
 *     par autre outil. SINA demande la notice d'un autre outil avec « tools.open » avant de s'en servir ; un outil
 *     appelé sans notice est quand même exécuté si ses arguments sont justes, sinon sa notice lui est rendue.
 *     (Relevé du 13 novembre 2026 : la notice des 104 outils, environ 78 000 signes, partait à chaque message.)
 *  2) LES MOMENTS QUI COMPTENT (« momentsForts ») : présenter un résultat, expliquer un échec, répondre à un client
 *     mécontent. Là, le petit modèle laisse la place à un modèle plus fort.
 *  3) LA RELECTRICE (« relecture ») : à ces mêmes moments, une autre lit la réponse avant qu'elle parte (faits,
 *     honnêteté, prix, mots du client) ; si elle refuse, SINA réécrit UNE fois avec ses remarques. Celle qui écrit
 *     n'est jamais celle qui juge.
 */
import { z } from "zod";
import { getJsonSetting } from "../settings";
import { allTools, toolEntry, toolVisible, type ToolScope } from "./registry";

export type ConversationSettings = { aiguillage: boolean; momentsForts: boolean; relecture: boolean };

/** Réglage « sina.conversation » : chaque aide s'allume à part ; une valeur illisible vaut « éteint ». */
export function conversationSettings(): ConversationSettings {
  const raw = getJsonSetting<Partial<Record<keyof ConversationSettings, unknown>>>("sina.conversation", {});
  const on = (k: keyof ConversationSettings) => !!raw && typeof raw === "object" && raw[k] === true;
  return { aiguillage: on("aiguillage"), momentsForts: on("momentsForts"), relecture: on("relecture") };
}

// ------------------------------------------------------------------------------------------------ 1) l'aiguilleuse

/** Outil par lequel SINA demande la notice d'un outil hors de l'étape. */
export const OPEN_TOOL = "tools.open";

/** Toujours sous la main, quelle que soit l'étape : lire la fiche, noter, lire un fichier, suivre une tâche. */
const ALWAYS = new Set(["start.state", "memory.note", "attachment.read", "jobs.status", "files.list", "brand.read", OPEN_TOOL]);

/** Outils de chaque étape construite du parcours (0 à 8). Une étape absente d'ici n'est pas aiguillée. */
const STEP_TOOLS: Record<number, RegExp> = {
  0: /^(start\.|project\.profile$|services\.profile$)/,
  1: /^identity\./,
  2: /^logo\./,
  3: /^brand\.(kit|kit_validate|save)$/,
  4: /^(angles\.|strategy\.read$|research\.read$|pilot\.(state|answer|approve)$|project\.profile$|services\.profile$)/,
  5: /^(activity\.|catalogue\.|shop\.|project\.profile$|services\.profile$|bookings\.(services|configure)$)/,
  6: /^(site\.mode$|theme\.|custom\.|gallery\.|catalogue\.list$|shop\.)/,
  7: /^(custom\.|gallery\.|mockup\.|site\.(outline|edit|versions|use_version|pages|code_from_mockup|images|photo_reject)$|catalogue\.list$|shop\.)/,
  8: /^(theme\.|site\.(outline|edit|versions|use_version|pages)$|catalogue\.list$|shop\.)/,
};

/** L'étape a-t-elle une liste d'outils à elle ? (Hors parcours, ou étape pas encore construite : tout le catalogue.) */
export const routedStep = (step: number | null | undefined): step is number => step != null && !!STEP_TOOLS[step];

/** L'outil fait-il partie de ceux dont SINA reçoit la notice complète à cette étape ? */
export function toolInFocus(name: string, step: number): boolean {
  return ALWAYS.has(name) || !!STEP_TOOLS[step]?.test(name);
}

/** Première phrase d'une description, pour la liste courte. */
const firstSentence = (s: string) => { const one = s.replace(/\s+/g, " ").trim(), cut = one.search(/[.:;](\s|$)/); return (cut > 20 ? one.slice(0, cut) : one).slice(0, 150); };

/**
 * Catalogue aiguillé : la notice complète des outils de l'étape, puis une ligne par autre outil du Studio. Rien n'est
 * retiré à SINA : un autre outil se demande avec tools.open.
 */
export function routedCatalog(hasProject: boolean, scope: ToolScope, step: number): string {
  const tools = allTools().filter((t) => (hasProject || !t.needsProject) && toolVisible(t.name, { ...scope, routed: true }));
  const focus = tools.filter((t) => toolInFocus(t.name, step)), others = tools.filter((t) => !toolInFocus(t.name, step));
  return [
    `## Outils de l'étape en cours (notice complète)`,
    focus.map(toolEntry).join("\n\n"),
    others.length ? `## Autres outils du Studio (nom et rôle seulement)\nPour te servir de l'un d'eux, demande d'abord sa notice avec ${OPEN_TOOL} (gratuit) : tu la reçois à l'étape suivante, puis tu l'appelles avec ses arguments exacts.\n${others.map((t) => `- ${t.name} — ${t.module}${t.estimate ? ", payant" : ""} : ${firstSentence(t.description)}`).join("\n")}` : "",
  ].filter(Boolean).join("\n\n");
}

// ------------------------------------------------------------------------------- 2) les moments qui comptent

/** resultat : une création vient de finir, à présenter ; echec : quelque chose a raté, à expliquer ; mecontent : le client se plaint. */
export type KeyMoment = "resultat" | "echec" | "mecontent";

/** Mots d'un client mécontent (les siens, relevés dans les essais ; français d'abord, quelques mots anglais). */
const UNHAPPY = /(?<![\p{L}])(nuls?|nulles?|moches?|laids?|laides?|horribles?|catastroph\p{L}*|déçue?s?|decue?s?|décevant\p{L}*|pas contente?s?|mécontente?s?|n'importe quoi|[çc]a (ne )?va pas|pas du tout ça|rembours\p{L}*|arnaque|honteux|inadmissible|ras le bol|j'en ai marre|tu n'écoutes pas|tu (ne )?comprends (rien|pas)|c'est faux|encore (raté|ratée|faux|une erreur)|je n'aime pas|j'aime pas|pas terrible|ça représente rien|awful|terrible|ugly|refund|i hate|not what i asked)(?![\p{L}])/iu;

type Msg = { role: string; content?: any };

/**
 * Le moment de cette réflexion, lu dans le fil : les résultats d'outils arrivés depuis la dernière réponse de SINA, ou
 * le dernier message du client. null : un échange ordinaire (question, confirmation, suite du parcours).
 */
export function keyMoment(history: Msg[]): KeyMoment | null {
  let i = history.length - 1;
  const fresh: Msg[] = [];
  for (; i >= 0 && history[i].role !== "assistant" && history[i].role !== "user"; i--) if (history[i].role === "tool") fresh.push(history[i]);
  // Un échec vrai (pas une erreur d'argument de SINA elle-même, qu'elle corrige seule) passe avant le reste.
  if (fresh.some((m) => m.content?.ok === false && !m.content?.internal)) return "echec";
  if (fresh.some((m) => m.content?.tool === "jobs.wait")) return "resultat";
  const user = [...history].reverse().find((m) => m.role === "user");
  return user && UNHAPPY.test(String(user.content?.text ?? "")) ? "mecontent" : null;
}

// ------------------------------------------------------------------------------------------- 3) la relectrice

export const ReplyReviewSchema = z.object({
  verdict: z.enum(["ok", "reprendre"]),
  issues: z.array(z.string().min(6).max(300)).max(4).default([]),
});
export type ReplyReview = z.infer<typeof ReplyReviewSchema>;

export const REPLY_REVIEW_SYSTEM = `Tu relis UNE réponse de SINA, l'assistante d'un studio qui crée la marque et le site de petits commerçants, juste avant qu'elle parte chez le client. Tu ne la réécris pas : tu dis si elle peut partir, et sinon quoi corriger. Tu as sous les yeux le dernier message du client, les résultats que le Studio vient de rendre (la seule source de vérité) et le brouillon de SINA.

Ce que tu vérifies, dans cet ordre :
1. LES FAITS. Chaque chiffre, prix, pourcentage, délai, nom, nombre d'éléments créés et chaque « c'est fait » du brouillon se retrouve dans les résultats ou dans les mots du client. Rien d'inventé, rien d'arrondi à son avantage. Une action annoncée comme faite a un résultat « OK ».
2. L'HONNÊTETÉ. Ce qui a échoué, ce qui a été refusé au contrôle, ce qui reste à faire et ce que cela a coûté (coutReel) est dit simplement. Jamais « rien n'a été débité » sans chiffre du Studio. Un doute signalé par le Studio est dit au client.
3. LE PRIX. Un coût d'IA se dit en % du budget IA du client, jamais en euros ni en dollars, et seulement s'il vient du Studio. Une action payante n'est jamais dite gratuite. (Le prix de vente d'un produit du client, lui, reste dans sa monnaie.)
4. LE CLIENT N'ENTEND QUE SINA. Pas de « mon équipe », « ma stratège », « le jury », « le relecteur » ; aucun nom d'outil (identity.propose), aucun mot technique (JSON, tâche de fond, modèle, consigne, jeton), aucun mot d'anglais quand le client écrit en français.
5. LA FORME. Tutoiement, phrases courtes et simples. Une seule question au plus, jamais une question à laquelle le client a déjà répondu. La question n'est pas répétée dans le message.
6. LE CLIENT MÉCONTENT. SINA reconnaît le reproche en une phrase, avec les mots du client, sans se justifier, sans flatter, sans promettre ce que le Studio ne sait pas tenir, puis propose une suite concrète.
7. LE CHOIX RESTE AU CLIENT. SINA peut recommander ; elle ne choisit jamais à sa place un nom, un logo, un angle, un thème ni une publication.

Sévère mais juste : une réponse vraie, claire et utile part telle quelle (verdict « ok », aucune remarque). Aucune remarque de goût. Ne demande rien que les résultats ne permettent pas de dire.

Réponse : uniquement le JSON demandé : verdict (« ok » ou « reprendre ») et issues (au plus 4 remarques précises, chacune dit ce qui ne va pas et quoi écrire à la place ; vide si « ok »).`;

export type ReplyDraft = { message: string; question?: { text: string; choices?: string[] } | null; actions: { tool: string }[] };

/** La relecture vaut-elle son coût ? Seulement à un moment qui compte, et quand SINA dit vraiment quelque chose. */
export function shouldReview(moment: KeyMoment | null, draft: ReplyDraft): moment is KeyMoment {
  return !!moment && draft.message.trim().length >= 40;
}

const MOMENT_LABEL: Record<KeyMoment, string> = {
  resultat: "SINA présente au client le résultat d'une création qui vient de finir",
  echec: "quelque chose a échoué : SINA doit l'expliquer simplement et proposer la suite",
  mecontent: "le client est mécontent : SINA doit l'entendre et proposer une suite concrète",
};

/** Demande de relecture : le moment, les mots du client, les résultats du Studio, le brouillon. */
export function replyReviewPrompt(o: { moment: KeyMoment; stepLabel?: string; client: string; facts: string; draft: ReplyDraft; wording?: string; quote?: string }): string {
  return [
    `MOMENT : ${MOMENT_LABEL[o.moment]}.${o.stepLabel ? ` Étape du parcours : ${o.stepLabel}.` : ""}`,
    `DERNIER MESSAGE DU CLIENT :\n${o.client.trim().slice(0, 2000) || "(aucun)"}`,
    `RÉSULTATS RENDUS PAR LE STUDIO DEPUIS CE MESSAGE (seule source de vérité) :\n${o.facts.trim().slice(0, 14000) || "(aucun résultat)"}`,
    o.quote?.trim() ? `PRIX DONNÉ PAR LE STUDIO :\n${o.quote.trim().slice(0, 800)}` : "",
    o.wording?.trim() ? `VOCABULAIRE DU CLIENT (à respecter) : ${o.wording.trim().slice(0, 600)}` : "",
    `BROUILLON DE SINA :\nmessage : ${o.draft.message.trim()}${o.draft.question ? `\nquestion : ${o.draft.question.text}${o.draft.question.choices?.length ? `\nboutons : ${o.draft.question.choices.join(" | ")}` : ""}` : ""}${o.draft.actions.length ? `\nactions lancées avec ce message : ${o.draft.actions.map((a) => a.tool).join(", ")}` : ""}`,
  ].filter(Boolean).join("\n\n");
}

/** Remarques de la relectrice, rendues à SINA pour sa seule réécriture (jamais montrées au client). */
export function reviewNote(draft: ReplyDraft, issues: string[]): string {
  return `\n\n# Relecture de ta réponse (elle n'est PAS partie : réécris-la)\nTon brouillon : « ${draft.message.trim().slice(0, 1500)} »\nÀ corriger avant de l'envoyer :\n${issues.map((x) => `- ${x}`).join("\n")}\nGarde les mêmes actions si elles étaient justes ; ne parle jamais de cette relecture au client.`;
}
