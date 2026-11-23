/**
 * LES TRAVAUX PAYÉS, MESURÉS (22 novembre 2026, économies sans baisser la qualité).
 *
 * 1. Une carte juste : le prix PROBABLE annoncé au client vient des coûts réellement mesurés sur les derniers travaux du
 *    même genre (ce qu'ils ont coûté, rapporté à leur plafond), dès qu'il y en a assez ; le PLAFOND ne change jamais
 *    (aucun appel ne part au-delà). Exemple réel : la carte de la marque de Nadia annonçait 8 € probables pour 16,69 € au
 *    plus, d'après une estimation écrite à la main.
 * 2. Le coût par travail accepté, pour l'administration : ce qui a été payé, ce que le client a gardé (le dernier travail
 *    avant qu'il valide cette partie), ce qui a été jeté (les travaux d'avant, refaits).
 *
 * Chaque travail payant lancé après la carte d'accord est noté ici (outil, tâche, plafond). Ce qu'il a coûté se lit dans
 * les reçus du fournisseur (`ai_calls`), jamais estimé.
 */
import { all, now, one, run } from "../db";
import { L } from "../i18n-server";
import { PARTIE_LABEL, REFONT, registreOf, type Partie } from "./verrous";

/** Il faut au moins ce nombre de travaux finis du même genre pour annoncer un prix probable mesuré. */
export const MESURES_MIN = 3;
/** Les derniers travaux du même genre pris en compte. */
export const MESURES_MAX = 12;

/** Note les tâches lancées par un outil payant après l'accord du client, avec le plafond de chacune. */
export function noterTravail(tool: string, jobs: string[] | undefined, who: { userId: string; projectId: string | null; conversationId: string }): void {
  for (const jobId of jobs ?? []) {
    const j = one<{ payload: string }>("SELECT payload FROM jobs WHERE id=?", jobId);
    if (!j) continue;
    let cap = 0;
    try { const pl = JSON.parse(j.payload || "{}"), c = pl?.costCapMicro ?? pl?.capMicro; cap = typeof c === "number" && Number.isFinite(c) && c > 0 ? Math.round(c) : 0; } catch { /* plafond illisible */ }
    run("INSERT OR IGNORE INTO travaux_payes(job_id,tool,user_id,project_id,conversation_id,cap,created_at) VALUES(?,?,?,?,?,?,?)", jobId, tool, who.userId, who.projectId, who.conversationId, cap, now());
  }
}

/** Ce qu'une tâche a coûté (reçus du fournisseur, micro-euros). */
const depense = (jobId: string) => one<{ c: number | null }>("SELECT SUM(cost) c FROM ai_calls WHERE job_id=?", jobId)?.c ?? 0;

/** La part du plafond réellement dépensée par les derniers travaux finis de cet outil (médiane), ou null s'il y en a trop peu. */
export function partMesuree(tool: string): { part: number; n: number } | null {
  const rows = all<{ job_id: string; cap: number }>(
    "SELECT t.job_id, t.cap FROM travaux_payes t JOIN jobs j ON j.id=t.job_id WHERE t.tool=? AND t.cap>0 AND j.status='done' ORDER BY t.created_at DESC LIMIT ?", tool, MESURES_MAX,
  );
  const parts = rows.map((r) => depense(r.job_id) / r.cap).filter((x) => Number.isFinite(x) && x > 0).sort((a, b) => a - b);
  if (parts.length < MESURES_MIN) return null;
  const mid = parts.length >> 1, med = parts.length % 2 ? parts[mid] : (parts[mid - 1] + parts[mid]) / 2;
  return { part: Math.min(1, med), n: parts.length };
}

/**
 * Le prix probable de la carte, sur les coûts mesurés : plafond × part réellement dépensée par les derniers travaux du
 * même genre. Trop peu de mesures : le prix probable de l'outil reste celui de son estimation. Le plafond ne bouge pas.
 */
export function prixJuste<E extends { maxMicro: number; probableMicro?: number }>(tool: string, est: E): E & { mesure?: number } {
  if (!(est.maxMicro > 0)) return est;
  const m = partMesuree(tool);
  if (!m) return est;
  return { ...est, probableMicro: Math.max(1, Math.round(est.maxMicro * m.part)), mesure: m.n };
}

export type LigneTravail = { tool: string; travail: string; travaux: number; payeMicro: number; gardeMicro: number; jeteMicro: number; attenteMicro: number; capMicro: number; /** Le coût moyen des 7 derniers jours a doublé par rapport aux 30 jours d'avant. */ alerte?: boolean };

const TRAVAIL: Record<string, { fr: string; en: string }> = {
  "identity.propose": { fr: "Les identités de marque", en: "Brand identities" },
  "identity.images": { fr: "Les images d'une planche", en: "Board images" },
  "brand.finish": { fr: "La marque finie", en: "Finished brand" },
  "angles.propose": { fr: "Les trois angles", en: "The three angles" },
  "site.create": { fr: "Le site", en: "The site" },
  "gallery.create": { fr: "La galerie d'un produit", en: "Product gallery" },
  "custom.photo": { fr: "Une photo du site", en: "A site photo" },
  "posts.plan": { fr: "Le plan des publications", en: "Posts plan" },
  "posts.create": { fr: "Les publications", en: "Posts" },
};
const nomDu = (tool: string) => { const t = TRAVAIL[tool]; return t ? L(t.fr, t.en) : tool; };

/**
 * Le coût par travail accepté, depuis `since`. Pour chaque travail fini : payé (reçus) ; gardé si c'est le dernier de
 * son genre avant que le client valide la partie qu'il touche ; jeté s'il a été refait avant la validation ; en
 * attente tant que le client n'a rien validé.
 */
export function coutParTravail(since: number): { lignes: LigneTravail[] } {
  const rows = all<{ job_id: string; tool: string; conversation_id: string | null; project_id: string | null; cap: number; created_at: number; status: string }>(
    "SELECT t.job_id, t.tool, t.conversation_id, t.project_id, t.cap, t.created_at, j.status FROM travaux_payes t JOIN jobs j ON j.id=t.job_id WHERE t.created_at >= ? ORDER BY t.created_at", since,
  );
  const by = new Map<string, LigneTravail>();
  const registres = new Map<string, ReturnType<typeof registreOf>>();
  for (const r of rows) {
    const l = by.get(r.tool) ?? { tool: r.tool, travail: nomDu(r.tool), travaux: 0, payeMicro: 0, gardeMicro: 0, jeteMicro: 0, attenteMicro: 0, capMicro: 0 };
    const paye = depense(r.job_id);
    l.travaux++; l.payeMicro += paye; l.capMicro += r.cap;
    const parties: Partie[] = REFONT[r.tool] ?? [];
    const reg = r.conversation_id ? (registres.get(r.conversation_id) ?? (() => { const x = registreOf(r.conversation_id!); registres.set(r.conversation_id!, x); return x; })()) : {};
    const pose = parties.map((p) => reg[p]?.pose).filter((x): x is number => typeof x === "number").sort((a, b) => a - b)[0];
    if (pose == null || r.created_at > pose) l.attenteMicro += paye;
    else {
      // Le dernier travail du même outil, dans la même conversation, avant la validation : c'est lui que le client a gardé.
      const dernier = rows.filter((x) => x.tool === r.tool && x.conversation_id === r.conversation_id && x.created_at <= pose && x.status === "done").at(-1);
      if (dernier?.job_id === r.job_id) l.gardeMicro += paye; else l.jeteMicro += paye;
    }
    by.set(r.tool, l);
  }
  // Alerte : un travail dont le coût moyen a doublé cette semaine (recherche 11, point 7).
  const now = Date.now(), semaine = now - 7 * 86400_000, mois = semaine - 30 * 86400_000;
  for (const l of by.values()) {
    const moy = (a: number, b: number) => { const xs = rows.filter((r) => r.tool === l.tool && r.created_at >= a && r.created_at < b && r.status === "done").map((r) => depense(r.job_id)); return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null; };
    const recent = moy(semaine, now + 1), avant = moy(mois, semaine);
    if (recent != null && avant != null && avant > 0 && recent >= 2 * avant) l.alerte = true;
  }
  return { lignes: [...by.values()].sort((a, b) => b.payeMicro - a.payeMicro) };
}

export const partieDu = (tool: string) => (REFONT[tool] ?? []).map((p) => PARTIE_LABEL[p].fr);
