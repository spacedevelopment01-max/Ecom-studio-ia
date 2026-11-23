/**
 * L'ORDRE DE LA SÉRIE DES LOGOS (essai réel de Nadia, 23 novembre 2026). Nadia demandait un autre logo pour « Halo » (B)
 * et le logo manquait encore à « Pénombre » (C) : SINA a lancé Pénombre AVANT Halo (le contexte lui disait de finir
 * d'abord les planches incomplètes, puis de répondre au client), et Pénombre a reçu l'ancien logo de Halo, celui que
 * Nadia ne voulait plus. La règle de la série (CLAUDE.md, partie Logo) : le 2e logo reçoit le 1er, le 3e les deux
 * premiers ; quand plusieurs logos d'une série sont à refaire, ils partent dans l'ordre des identités (A, B, C), et
 * chacun reçoit les logos refaits juste avant lui.
 *
 * Le code le garantit, quel que soit l'ordre donné par SINA, sans aucun appel à l'IA :
 *  - dans une même tâche, les planches sont toujours faites dans l'ordre des identités (brand-chain, `imagesOnly`) ;
 *  - les clés reçues de SINA sont remises dans l'ordre (`dansLOrdre`) ;
 *  - plusieurs reprises d'images dans une même réponse de SINA : réunies en un seul appel, clés dans l'ordre ; une
 *    planche à finir y reste à la charge du Studio (`reprisesDansLOrdre`, `devisDesImages`) ;
 *  - un logo demandé alors qu'un logo d'une planche d'AVANT est à refaire aussi et pas encore fait (il manque à sa
 *    planche, ou le client vient de le demander) : la carte n'est pas montrée, SINA est prévenue avant toute dépense et
 *    les réunit en un seul appel (`logosAvantARefaire`). C'est le choix le plus simple : une seule tâche, dans l'ordre,
 *    sans file d'attente entre deux tâches.
 */
import { all, json } from "../db";
import { nommee } from "./controle-message";
import { journeyOf, planchesIncompletes } from "./journey";

const ORDRE = ["A", "B", "C", "D"];
const rang = (k: string) => { const i = ORDRE.indexOf(k); return i < 0 ? ORDRE.length : i; };

/** Les clés d'identité dans l'ordre de la série (A, B, C, D), sans doublon. */
export const dansLOrdre = <T extends string>(keys: readonly T[]): T[] => [...new Set(keys)].sort((a, b) => rang(a) - rang(b));

/** La marque d'un refus pour l'ordre de la série (retrouvée dans le fil pour ne prévenir SINA qu'une fois par demande). */
export const MARQUE_ORDRE = "[ordre de la série des logos]";

/**
 * Les planches d'AVANT la dernière demandée dont le logo est à refaire aussi et qui ne sont pas dans la demande : leur
 * logo manque encore (planche incomplète), ou le dernier message du client parle du logo et nomme cette planche.
 */
export function logosAvantARefaire(cid: string, keys: readonly string[], images: readonly string[]): { key: string; name: string; pourquoi: "manque" | "client" }[] {
  if (!images.includes("logo") || !keys.length) return [];
  const j = journeyOf(cid), list = j.identities?.list ?? [], dernier = Math.max(...keys.map(rang));
  const inc = planchesIncompletes(j);
  const client = all<{ content_json: string }>("SELECT content_json FROM syna_messages WHERE conversation_id=? AND role='user' ORDER BY seq DESC LIMIT 1", cid)
    .map((m) => String(json<{ text?: string }>(m.content_json, {}).text ?? ""))[0] ?? "";
  const out: { key: string; name: string; pourquoi: "manque" | "client" }[] = [];
  for (const x of list) {
    if (keys.includes(x.key) || rang(x.key) >= dernier) continue;
    if (inc.some((h) => h.key === x.key && h.manque.includes("logo"))) out.push({ key: x.key, name: x.name, pourquoi: "manque" });
    else if (/\blogo/i.test(client) && x.name && nommee(client, x.name)) out.push({ key: x.key, name: x.name, pourquoi: "client" });
  }
  return out;
}

/** SINA a-t-elle déjà été prévenue de l'ordre pendant cette demande (son second appel, identique, part alors tel quel) ? */
export const dejaPrevenue = (runId: string): boolean =>
  all<{ n: number }>("SELECT COUNT(*) n FROM syna_messages WHERE run_id=? AND role='tool' AND content_json LIKE ?", runId, `%${MARQUE_ORDRE}%`)[0]?.n > 0;

/** Ce qui est dit à SINA (jamais au client) quand un logo d'avant passe avant. */
export function phraseDeLOrdre(keys: readonly string[], avant: { key: string; name: string; pourquoi: "manque" | "client" }[]): string {
  const tous = dansLOrdre([...keys, ...avant.map((a) => a.key)]);
  const raisons = avant.map((a) => `« ${a.name} » (${a.key}) : ${a.pourquoi === "manque" ? "son logo manque encore" : "le client vient de demander aussi un autre logo pour elle"}`).join(" ; ");
  return `${MARQUE_ORDRE} Un logo d'une planche d'avant est à refaire aussi : ${raisons}. Dans une série, les logos partent dans l'ordre des identités et chacun reçoit ceux refaits juste avant lui : refais-les dans un seul appel identity.images, keys = ${tous.join(", ")} et images = logo. Si le client ne demande pas de refaire celui-là, relance le même appel : il partira tel quel.`;
}

type Action = { tool: string; args?: unknown };
/** Plusieurs reprises d'images de planches dans une même réponse de SINA : réunies en un seul appel, clés dans l'ordre. Les autres actions gardent leur place. */
export function reprisesDansLOrdre<T extends Action>(actions: T[], _cid?: string): T[] {
  const idx = actions.map((a, i) => (a.tool === "identity.images" && a.args && typeof a.args === "object" ? i : -1)).filter((i) => i >= 0);
  if (idx.length < 2) return actions;
  type A = { keys?: string[]; images?: string[]; guidance?: string };
  // Toujours réunies : sur une carte commune, une planche à finir reste à la charge du Studio (devisDesImages).
  const lot = idx.map((i) => actions[i].args as A);
  const images = [...new Set(lot.flatMap((a) => a.images ?? []))], guidance = lot.map((a) => a.guidance?.trim()).filter(Boolean).join("\n").slice(0, 1500);
  const reprises: A[] = [{ keys: dansLOrdre(lot.flatMap((a) => a.keys ?? [])), images: ["logo", "hero", "site"].filter((s) => images.includes(s)).concat(images.filter((s) => !["logo", "hero", "site"].includes(s))), ...(guidance ? { guidance } : {}) }];
  const out: T[] = [];
  actions.forEach((a, i) => {
    if (i === idx[0]) out.push(...reprises.map((args) => ({ ...a, args }) as T));
    else if (!idx.includes(i)) out.push(a);
  });
  return out;
}
