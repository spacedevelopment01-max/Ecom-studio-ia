/**
 * LE PRIX BARRÉ AVEC SA PREUVE (22 novembre 2026, recherche 02, partie 4.2 ; directive 98/6/CE article 6 bis et lignes
 * directrices de la Commission, JO C 526 du 29 décembre 2021). Toute annonce de réduction indique le prix antérieur :
 * « le prix le plus bas appliqué […] au cours des 30 jours précédant » la réduction, et le pourcentage se calcule sur ce
 * prix-là. Le « prix de comparaison » d'un catalogue est un champ libre que rien ne vérifie : le Studio n'affiche donc un
 * prix barré que si le client a confirmé par écrit, avec la date, le prix le plus bas de ses 30 derniers jours ; c'est ce
 * prix qui est barré, et le pourcentage est calculé dessus. Sans preuve, aucun prix barré.
 *
 * La preuve est liée au prix de comparaison du moment : s'il change (nouvelle promotion), SINA redemande.
 */
import { z } from "zod";
import { json, one } from "../db";
import { remember } from "../projects";
import { L } from "../i18n-server";
import { listProducts, type StudioProduct } from "../products/catalog";
import { ditParLeClient } from "./verrous";
import { project } from "./tools/common";
import type { AgentTool } from "./types";

export type PreuvePrix = { compareAt: number; plusBas: number; at: number; mots: string };
const KEY = "prix.preuves_30_jours";

const lire = (projectId: string): Record<string, PreuvePrix> => {
  const r = one<{ value: string }>("SELECT value FROM memory WHERE project_id=? AND kind='fact' AND key=?", projectId, KEY);
  return r ? json<Record<string, PreuvePrix>>(r.value, {}) : {};
};
export const preuvesDesPrix = lire;

export function noterPreuve(projectId: string, productId: string, p: PreuvePrix): void {
  remember(projectId, { kind: "fact", key: KEY, value: JSON.stringify({ ...lire(projectId), [productId]: p }), source: "client" });
}

const comparaison = (p: Pick<StudioProduct, "data" | "variants">) => p.data.compareAt ?? p.variants.find((v) => v.compareAt != null)?.compareAt ?? null;

/**
 * Le produit tel qu'il peut s'afficher : avec une preuve du prix le plus bas des 30 jours pour SON prix de comparaison
 * actuel, le prix barré devient ce prix-là (le pourcentage se calcule dessus) ; sans preuve, aucun prix barré.
 */
export function avecPrixProuve<P extends Pick<StudioProduct, "id" | "data" | "variants">>(projectId: string, p: P, preuves = lire(projectId)): P {
  const cmp = comparaison(p);
  if (cmp == null) return p;
  const pr = preuves[p.id];
  const barre = pr && pr.compareAt === cmp ? pr.plusBas : null;
  return { ...p, data: { ...p.data, compareAt: p.data.compareAt == null ? null : barre }, variants: p.variants.map((v) => ({ ...v, compareAt: v.compareAt == null ? null : barre })) };
}

/** Les produits qui portent un prix de comparaison sans la preuve des 30 jours (à demander au client). */
export function prixBarresSansPreuve(projectId: string): { id: string; titre: string }[] {
  let list: StudioProduct[] = [];
  try { list = listProducts(projectId); } catch { return []; }
  const preuves = lire(projectId);
  return list.filter((p) => { const c = comparaison(p); return c != null && preuves[p.id]?.compareAt !== c; }).map((p) => ({ id: p.id, titre: p.data.title }));
}

export const QUESTION_30_JOURS = "Quel est le prix le plus bas que tu as pratiqué pour ce produit ces 30 derniers jours ? La loi oblige à barrer ce prix-là, et pas un autre : sans ta réponse, je n'affiche pas de prix barré.";

export const preuvePrixTool: AgentTool<{ product: string; plusBas: number; mots: string }> = {
  name: "prix.preuve", module: "catalogue", kind: "write", needsProject: true,
  description: `Note la PREUVE du prix barré d'un produit (gratuit) : le prix le plus bas que le client a pratiqué ces 30 derniers jours, en euros, que LUI t'a donné. Sans elle, le Studio n'affiche aucun prix barré (règle des 30 jours). Demande-le une fois par promotion : « ${QUESTION_30_JOURS} ». product : son titre exact ou son id ; mots : ses mots exacts, recopiés de son dernier message.`,
  args: z.object({ product: z.string().min(1).max(200), plusBas: z.number().positive().max(1_000_000), mots: z.string().min(2).max(400) }).strict(),
  run: (ctx, a) => {
    const p = project(ctx);
    if (!ditParLeClient(ctx.conversationId, a.mots)) return { ok: false, internal: true, summary: L("Ces mots ne sont pas dans son dernier message : le prix des 30 jours vient du client, jamais de toi. Demande-le-lui.", "Not the client's words.") };
    const prod = listProducts(p.id).find((x) => x.id === a.product || x.data.title.trim().toLowerCase() === a.product.trim().toLowerCase());
    if (!prod) return { ok: false, internal: true, summary: L("Produit introuvable : prends son titre exact (catalogue.list).", "Product not found.") };
    const cmp = comparaison(prod);
    if (cmp == null) return { ok: false, summary: L(`« ${prod.data.title} » n'a pas de prix de comparaison : rien à barrer.`, "No compare-at price.") };
    const plusBas = Math.round(a.plusBas * 100), price = prod.data.price ?? prod.variants.find((v) => v.price != null)?.price ?? null;
    noterPreuve(p.id, prod.id, { compareAt: cmp, plusBas, at: Date.now(), mots: a.mots.slice(0, 400) });
    const pct = price != null && plusBas > price ? Math.round((1 - price / plusBas) * 100) : null;
    return { ok: true, summary: pct != null
      ? L(`Prix barré de « ${prod.data.title} » : ${(plusBas / 100).toFixed(2).replace(".", ",")} € (le plus bas de ses 30 jours, noté le ${new Date().toLocaleDateString("fr-FR")}), soit −${pct} %.`, "Proof saved.")
      : L(`Noté. Son prix actuel n'est pas sous le prix le plus bas de ses 30 jours : aucun prix barré n'est affiché pour « ${prod.data.title} ».`, "Saved; no reduction to show."),
      changes: [{ module: "catalogue", object: prod.data.title, summary: `preuve du prix des 30 jours : ${(plusBas / 100).toFixed(2)} €`, verified: true }] };
  },
};
