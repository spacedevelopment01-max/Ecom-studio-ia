/**
 * CE QU'ELLE ANNONCE, ELLE LE FAIT (essai réel de Nadia, 23 novembre 2026) : SINA avait annoncé deux planches (« je te
 * présente… ») à la fin de la tâche qui les finissait, mais n'en a présenté qu'une ; Nadia a dû demander la seconde.
 *
 * La garantie est dans le code, pas dans la consigne : à la fin d'une tâche de la marque, le Studio note dans le résultat
 * de l'attente (`jobs.wait`) les planches finies ou refaites par cette tâche, et seulement celles montrées au client
 * (jamais une planche incomplète). Le message suivant de SINA doit nommer chacune : sinon le contrôle gratuit le lui fait
 * réécrire (à la charge du Studio), et si une planche manque encore, le Studio la présente lui-même, en une phrase, avec
 * ce que la relecture en a dit (sa note et ses mots). Chaque planche n'est présentée qu'une fois : une planche déjà nommée
 * après la fin de la tâche ne l'est plus.
 */
import { all, json } from "../db";
import { L } from "../i18n-server";
import { SINA_BRAND_JOB } from "./brand-chain";
import { nommee } from "./controle-message";
import { planchesMontrees, verdictDuRelecteur, type Journey } from "./journey";

/** Une planche à présenter : sa lettre, son nom, les images que la tâche a faites ou refaites. */
export type PlancheAPresenter = { key: string; name: string; images: string[] };

const IMAGES = ["logo", "hero", "site", "planche"] as const;
const DIT: Record<(typeof IMAGES)[number], { fr: string; en: string }> = { logo: { fr: "son logo", en: "its logo" }, hero: { fr: "sa grande scène", en: "its main scene" }, site: { fr: "le haut de son site", en: "its site header" }, planche: { fr: "sa planche de marque", en: "its brand board" } };
/** L'image d'une place : la planche de marque (nouveaux projets) est rangée à part, sur `board.planche.image`. */
const idDeLImage = (board: { images?: Record<string, { id?: string } | undefined>; planche?: { image?: { id?: string } } } | undefined, s: string) => (s === "planche" ? board?.planche?.image?.id : board?.images?.[s]?.id);

/**
 * Les planches finies ou refaites par les tâches attendues, montrées au client (une planche à laquelle il manque une image
 * n'y est jamais). Une proposition présente toutes ses planches ; des images refaites, seulement les planches reprises.
 */
export function planchesFiniesPar(jobs: ({ type?: string | null; status?: string | null; payload?: string | null } | undefined)[], j: Pick<Journey, "keep" | "identities">): PlancheAPresenter[] {
  const montrees = planchesMontrees(j as never) as { key: string; name: string; board?: unknown }[];
  const out: PlancheAPresenter[] = [];
  for (const job of jobs) {
    if (!job || job.type !== SINA_BRAND_JOB || job.status !== "done") continue;
    const p = json<{ finish?: boolean; namesPreview?: boolean; redo?: string[]; slots?: string[]; imagesOnly?: boolean }>(job.payload ?? "{}", {});
    if (p.finish || p.namesPreview) continue;
    const keys = p.redo?.length ? p.redo : montrees.map((x) => x.key);
    const images = p.imagesOnly && p.slots?.length ? p.slots.filter((s) => (IMAGES as readonly string[]).includes(s)) : [...IMAGES];
    // Une planche de marque (nouveaux projets) se présente par son image entière, celle d'avant par son logo, sa scène et son site.
    for (const x of montrees) if (x.board && keys.includes(x.key) && !out.some((o) => o.key === x.key)) out.push({ key: x.key, name: x.name, images: (x.board as { planche?: unknown }).planche ? images.filter((s) => s === "planche") : images.filter((s) => s !== "planche") });
  }
  return out;
}

/** Les planches que ce texte ne nomme pas. */
export function nonPresentees(texte: string, planches: readonly PlancheAPresenter[]): PlancheAPresenter[] {
  return planches.filter((x) => !nommee(texte, x.name));
}

/**
 * Les planches que SINA doit encore présenter dans cette demande : celles notées à la fin de la dernière tâche attendue,
 * moins celles déjà nommées dans un de ses messages depuis (chacune n'est présentée qu'une fois).
 */
export function planchesAPresenter(conversationId: string, runId: string): PlancheAPresenter[] {
  const msgs = all<{ role: string; content_json: string }>("SELECT role, content_json FROM syna_messages WHERE conversation_id=? AND run_id=? ORDER BY seq", conversationId, runId).map((m) => ({ role: m.role, c: json<any>(m.content_json, {}) }));
  let i = msgs.length - 1;
  while (i >= 0 && !(msgs[i].role === "tool" && msgs[i].c.tool === "jobs.wait")) i--;
  if (i < 0) return [];
  const liste = (Array.isArray(msgs[i].c.aPresenter) ? msgs[i].c.aPresenter : []) as PlancheAPresenter[];
  const dits = msgs.slice(i + 1).filter((m) => m.role === "assistant").map((m) => `${m.c.message ?? ""} ${m.c.question?.text ?? ""}`).join("\n");
  return nonPresentees(dits, liste);
}

/**
 * La présentation posée par le Studio pour une planche que SINA n'a pas présentée : son nom, puis ce que la relecture a
 * dit de chaque image faite (note et mots), en tutoyant ; jamais une planche qui n'est plus montrée.
 */
export function presentationDuStudio(planches: readonly PlancheAPresenter[], j: Pick<Journey, "keep" | "identities">): string {
  const montrees = planchesMontrees(j as never) as { key: string; name: string; board?: { images?: Record<string, { id?: string } | undefined>; planche?: { image?: { id?: string } } } }[];
  return planches.map((p) => {
    const x = montrees.find((m) => m.key === p.key);
    if (!x) return "";
    const avis = p.images.flatMap((s) => {
      const v = verdictDuRelecteur(idDeLImage(x.board, s));
      if (!v) return [];
      const d = DIT[s as keyof typeof DIT] ?? { fr: s, en: s };
      return [L(`${d.fr} : ${v.score != null ? `${v.score} sur 10` : "gardé"}${v.words ? `, « ${v.words.slice(0, 220)} »` : ""}`, `${d.en}: ${v.score != null ? `${v.score}/10` : "kept"}${v.words ? `, “${v.words.slice(0, 220)}”` : ""}`)];
    });
    return L(`Ta planche « ${x.name} » est prête elle aussi, juste au-dessus${avis.length ? `. Ce que j'en pense : ${avis.join(" ; ")}.` : "."}`, `Your “${x.name}” board is ready too, just above${avis.length ? `. What I think: ${avis.join("; ")}.` : "."}`);
  }).filter(Boolean).join("\n\n");
}
