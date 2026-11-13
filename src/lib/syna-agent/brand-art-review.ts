/**
 * Relecture EN IMAGE des dessins d'une planche (carte des spécialistes, principe 3 : rien n'est montré sans avoir été
 * relu). L'illustratrice écrit ses dessins en code ; le filtre du Studio garantit qu'ils sont sûrs, pas qu'ils sont
 * réussis. Chaque dessin est donc rendu en image et regardé par un modèle qui voit : un dessin raté est retiré, la
 * planche garde alors sa forme (scène de secours, signe en mots, publication en texte).
 */
import sharp from "sharp";
import { z } from "zod";
import type { JobContext } from "../jobs";
import { CostCapReached } from "../ai/trace";
import { artSvg, type Art } from "./brand-art";
import type { ChainAi } from "./brand-chain";
import * as P from "./brand-prompts";
import { RouteSchema, type Route } from "./brand-routes";

export const ArtReviewSchema = z.object({ drawings: z.array(z.object({ slot: z.string().max(12), ok: z.boolean(), why: z.string().max(240).default("") })).max(14).default([]) });

type Drawing = { slot: string; art: Art; shows: string; background: string };
/** Les dessins d'une planche, avec ce que chacun doit montrer et le fond sur lequel il est posé. */
export function boardDrawings(x: Route): Drawing[] {
  const b = x.board, role = (r: string | undefined, fallback: string) => (r && r in x.palette ? x.palette[r as keyof Route["palette"]] : fallback);
  return [
    ...(b.hero ? [{ slot: "hero", art: b.hero, shows: `la scène de la marque « ${x.name} » : ${b.idea.belief}`, background: "#FFFFFF" }] : []),
    ...(b.object.art ? [{ slot: "object", art: b.object.art, shows: `ce qu'on voit sur le devant de l'objet (${b.object.kind})`, background: "#FFFFFF" }] : []),
    ...(b.site.art ? [{ slot: "site", art: b.site.art, shows: `l'image du haut du site : ${b.site.headline}`, background: "#FFFFFF" }] : []),
    ...b.signs.flatMap((g, i) => (g.art ? [{ slot: `sign${i}`, art: g.art, shows: `le signe « ${g.title} » : ${g.text}`, background: role(g.ground, x.palette.light) }] : [])),
    ...b.posts.flatMap((q, i) => (q.art ? [{ slot: `post${i}`, art: q.art, shows: `le dessin d'une publication dont le texte est « ${q.text} »`, background: role(q.ground, x.palette.dark) }] : [])),
  ];
}

const render = (d: Drawing) => sharp(Buffer.from(artSvg(d.art, { width: 512 }))).flatten({ background: d.background }).png().toBuffer();

/** Retire d'une route les dessins refusés (la planche garde sa forme sans eux). */
export function withoutDrawings(x: Route, refused: string[]): Route {
  if (!refused.length) return x;
  const gone = new Set(refused), b = x.board;
  const next = {
    ...x, board: {
      ...b, ...(gone.has("hero") ? { hero: undefined } : {}),
      object: gone.has("object") ? { ...b.object, art: undefined } : b.object,
      site: gone.has("site") ? { ...b.site, art: undefined } : b.site,
      signs: b.signs.map((g, i) => (gone.has(`sign${i}`) ? { ...g, art: undefined } : g)),
      posts: b.posts.map((q, i) => (gone.has(`post${i}`) ? { ...q, art: undefined } : q)),
    },
  };
  const safe = RouteSchema.safeParse(JSON.parse(JSON.stringify(next)));
  return safe.success ? safe.data : x;
}

/**
 * Regarde les dessins d'une planche et retire ceux qui sont ratés. Un appel par planche. Si la relecture ne peut pas
 * se faire (appel en échec), les dessins restent (ils sont sûrs) et c'est noté ; le plafond de dépense, lui, remonte.
 */
export async function reviewBoardArt(o: { ctx: JobContext; ai: ChainAi; route: Route; round: number }): Promise<{ route: Route; refused: number; notes: string[] }> {
  const { route: x, round } = o, drawings = boardDrawings(x);
  if (!drawings.length) return { route: x, refused: 0, notes: [] };
  try {
    const review = await o.ctx.step(`brand:artcheck:${round}:${x.key}`, async () => o.ai.look(`artcheck-${round}-${x.key}`, {
      system: P.artReviewSystem(), schema: ArtReviewSchema,
      prompt: [`Marque : « ${x.name} ». Voici ${drawings.length} dessin(s), dans l'ordre.`, ...drawings.map((d, i) => `Dessin ${i + 1} — slot "${d.slot}" : il doit montrer ${d.shows}`)].join("\n"),
      images: await Promise.all(drawings.map(async (d) => ({ data: await render(d), label: d.slot }))),
    }));
    const refused = drawings.filter((d) => review.drawings.find((v) => v.slot === d.slot)?.ok === false).map((d) => d.slot);
    return { route: withoutDrawings(x, refused), refused: refused.length, notes: refused.length ? [`${refused.length} dessin(s) de ${x.key} retiré(s) après relecture en image (${refused.join(", ")})`] : [] };
  } catch (e) {
    if (e instanceof CostCapReached) throw e;
    return { route: x, refused: 0, notes: [`relecture en image des dessins de ${x.key} impossible : ${String((e as Error)?.message ?? e).slice(0, 120)}`] };
  }
}
