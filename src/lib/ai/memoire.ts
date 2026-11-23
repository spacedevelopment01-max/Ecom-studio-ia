/**
 * LA MISE EN MÉMOIRE CHEZ LE FOURNISSEUR, MESURÉE (22 novembre 2026, économies sans baisser la qualité). Ce qui ne
 * change pas d'un appel à l'autre (consigne générale, notices des outils, cahiers, fil déjà lu) est gardé en mémoire
 * par le fournisseur : il est repris à une fraction du prix au lieu d'être relu en entier. Ici, ce qui a été vraiment
 * repris, par travail, d'après les reçus du fournisseur (jamais une estimation) :
 *  - part reprise : jetons d'entrée relus de mémoire / jetons d'entrée en tout ;
 *  - part écrite : jetons mis en mémoire cet appel-là (payés un quart de plus, repris ensuite) ;
 *  - gagné : ce qu'aurait coûté l'entrée sans mémoire, moins ce qu'elle a coûté (écritures comprises).
 */
import { all } from "../db";
import { L } from "../i18n-server";
import { priceFor, usdToEur, TASKS, type TaskId } from "./config";
import { CACHE_WRITE_1H_RATIO, CACHE_WRITE_RATIO, cacheReadRatio, DEFERRED_DISCOUNT } from "./llm";
import { EUR } from "../billing";

export type LigneMemoire = {
  travail: string; appels: number; entree: number; reprise: number; ecrite: number; /** Appels qui devaient partir en différé et sont partis en direct (plein tarif). */ differesRates?: number;
  partReprise: number | null; partEcrite: number | null; gagneMicro: number;
  /** Appels servis en différé, à moitié prix (le client attendait de toute façon). */
  differes: number;
  /** Appels en sortie stricte (le fournisseur tenu de répondre dans la forme du schéma). */
  strictes?: number;
  /** Appels repayés pour réparer une réponse mal formée (ce que la sortie stricte fait disparaître). */
  reprisesForme?: number;
};

/** Le travail d'un appel, dit simplement (d'après la clé de sa consigne, à défaut sa tâche). */
export function travailDe(task: string, promptKey: string | null): string {
  const k = promptKey ?? "";
  if (/^syna-agent-/.test(k)) return L("La conversation de SINA", "SINA's conversation");
  if (/^syna-reply-review-/.test(k)) return L("La relectrice des messages", "The message reviewer");
  if (/^syna-brand-look-/.test(k)) return L("La relecture des images de la marque", "Brand image review");
  if (/^syna-brand-/.test(k)) return L("La création de la marque", "Brand creation");
  if (/^syna-angles-/.test(k)) return L("Les trois angles", "The three angles");
  if (/^syna-posts-/.test(k)) return L("Les publications", "Posts");
  return TASKS[task as TaskId]?.label ?? task;
}

type Row = { task: string; prompt_key: string | null; provider: string; requested_model: string; served_model: string | null; input_tokens: number; cache_read_tokens: number; cache_write_tokens: number; routing_reason: string | null; details?: string | null };

/** Ce que la mémoire a fait gagner sur un appel Anthropic (micro-euros ; 0 pour un autre fournisseur). */
export function gagneSurAppel(r: Row): number {
  if (r.provider !== "anthropic") return 0;
  const model = r.served_model || r.requested_model, p = priceFor("anthropic", model);
  if (!p || p.unit !== "tokens") return 0;
  const discount = /différé/.test(r.routing_reason ?? "") ? DEFERRED_DISCOUNT : 1;
  // L'écriture d'une heure coûte 2 fois l'entrée, celle de 5 minutes 1,25 (la part d'une heure est dans les détails).
  const h1 = Math.min(r.cache_write_tokens, Number((() => { try { return JSON.parse(r.details ?? "{}").ecrit1h ?? 0; } catch { return 0; } })()) || 0);
  const tokens = r.cache_read_tokens * (1 - cacheReadRatio(model, r.requested_model)) - (r.cache_write_tokens - h1) * (CACHE_WRITE_RATIO - 1) - h1 * (CACHE_WRITE_1H_RATIO - 1);
  return Math.round((tokens * p.inputPerM / 1e6) * discount * usdToEur() * EUR);
}

/** Part reprise de mémoire, par travail, depuis `since` (appels réussis, en jetons). */
export function memoireReprise(since: number): { lignes: LigneMemoire[]; total: LigneMemoire } {
  const rows = all<Row>(
    "SELECT task, prompt_key, provider, requested_model, served_model, input_tokens, cache_read_tokens, cache_write_tokens, routing_reason, details FROM ai_calls WHERE created_at >= ? AND unit='tokens' AND status='ok'",
    since,
  );
  const vide = (travail: string): LigneMemoire => ({ travail, appels: 0, entree: 0, reprise: 0, ecrite: 0, partReprise: null, partEcrite: null, gagneMicro: 0, differes: 0 });
  const by = new Map<string, LigneMemoire>(), total = vide(L("Tout le Studio", "Whole Studio"));
  for (const r of rows) {
    const w = travailDe(r.task, r.prompt_key), l = by.get(w) ?? vide(w), g = gagneSurAppel(r);
    for (const x of [l, total]) {
      x.appels++; x.entree += r.input_tokens + r.cache_read_tokens + r.cache_write_tokens;
      x.reprise += r.cache_read_tokens; x.ecrite += r.cache_write_tokens; x.gagneMicro += g;
      if (/différé/.test(r.routing_reason ?? "")) x.differes++;
      if (/"differe":"rate"/.test(r.details ?? "")) x.differesRates = (x.differesRates ?? 0) + 1;
      if (/"sortie":"stricte"/.test(r.details ?? "")) x.strictes = (x.strictes ?? 0) + 1;
      if (/"reprise":"forme"/.test(r.details ?? "")) x.reprisesForme = (x.reprisesForme ?? 0) + 1;
    }
    by.set(w, l);
  }
  const fin = (x: LigneMemoire) => ({ ...x, partReprise: x.entree ? Math.round((x.reprise / x.entree) * 1000) / 1000 : null, partEcrite: x.entree ? Math.round((x.ecrite / x.entree) * 1000) / 1000 : null });
  return { lignes: [...by.values()].map(fin).sort((a, b) => b.entree - a.entree), total: fin(total) };
}

/**
 * Le coût d'une conversation de SINA, recalculé appel par appel sur des jetons RELEVÉS (essai du 22 novembre 2026, relevé
 * de Nadia) : avant, tout ce qui suit les notices était repayé plein tarif à chaque réponse ; après, le fil déjà lu est
 * repris de mémoire, seul ce qui s'y ajoute est écrit, et la fiche et l'état (qui changent) restent payés plein tarif.
 * `contexte` : la part de l'entrée non reprise qui n'est PAS le fil (fiche, parcours, état), estimée par appel ; c'est
 * la seule hypothèse du calcul, dite dans le compte rendu.
 */
export type AppelReleve = { entree: number; lu: number; ecrit: number; sortie: number };
export type Tarif = { entree: number; lu: number; ecrit: number; sortie: number }; // euros par million de jetons
export function coutConversation(appels: AppelReleve[], tarif: Tarif, contexte: (i: number) => number, /** Réponses où la mémoire du fil est effacée (un changement d'effort dans la demande) : tout le fil y est réécrit. */ ruptures: number[] = []): { avant: number; apres: number } {
  const e = (n: number, prix: number) => (n * prix) / 1e6;
  let avant = 0, apres = 0, filPrecedent = 0;
  appels.forEach((a, i) => {
    avant += e(a.entree, tarif.entree) + e(a.lu, tarif.lu) + e(a.ecrit, tarif.ecrit) + e(a.sortie, tarif.sortie);
    if (ruptures.includes(i)) filPrecedent = 0;
    const ctx = Math.min(a.entree, contexte(i)), fil = a.entree - ctx;
    // Le fil : ce qui était déjà là est lu en mémoire ; ce qui s'y ajoute est écrit (repris à l'appel suivant).
    const repris = Math.min(fil, filPrecedent), neuf = fil - repris;
    apres += e(ctx, tarif.entree) + e(repris + a.lu, tarif.lu) + e(neuf + a.ecrit, tarif.ecrit) + e(a.sortie, tarif.sortie);
    filPrecedent = fil;
  });
  return { avant: Math.round(avant * 1000) / 1000, apres: Math.round(apres * 1000) / 1000 };
}

/**
 * Le coût de la conversation de SINA, étape par étape du parcours (recherche 11, point 1) : jetons lus en mémoire, jetons
 * payés plein tarif, et coût moyen d'une réflexion de SINA. D'après les reçus, jamais estimé.
 */
export function coutParEtape(since: number): { etape: string; reflexions: number; plein: number; lu: number; ecrit: number; sortie: number; parReflexionMicro: number }[] {
  const rows = all<{ step: string | null; n: number; plein: number; lu: number; ecrit: number; sortie: number; cost: number }>(
    "SELECT step, COUNT(*) n, SUM(input_tokens) plein, SUM(cache_read_tokens) lu, SUM(cache_write_tokens) ecrit, SUM(output_tokens) sortie, SUM(cost) cost FROM ai_calls WHERE created_at >= ? AND status='ok' AND prompt_key LIKE 'syna-agent-%' GROUP BY step ORDER BY step",
    since,
  );
  return rows.map((r) => ({ etape: /etape-(\d+)/.exec(r.step ?? "")?.[1] ?? "?", reflexions: r.n, plein: r.plein, lu: r.lu, ecrit: r.ecrit, sortie: r.sortie, parReflexionMicro: r.n ? Math.round(r.cost / r.n) : 0 }));
}
