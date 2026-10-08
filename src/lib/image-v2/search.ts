/**
 * Recherche intelligente dans les banques d'images (Image V2).
 *
 *  1. requêtes spécifiques du brief (MÉTIER + ACTION + ENVIRONNEMENT + INTENTION), plusieurs formulations ;
 *  2. langue adaptée à la source (anglais d'abord : métadonnées les plus riches ; français en repli si la source l'accepte) ;
 *  3. tri GRATUIT sur la description de la banque : on comprend la SCÈNE, on n'interdit pas un mot. « wall » seul
 *     (mur nu, texture) est écarté ; « plasterer smoothing a wall » est retenu, car le métier et le geste s'y voient ;
 *  4. licence vérifiée, format compatible, doublons et photos déjà utilisées retirés ;
 *  5. seuls les meilleurs candidats passent au contrôle (payant) : jamais des dizaines de photos médiocres.
 *
 * Les banques actuelles n'acceptent pas de termes d'exclusion : les concepts négatifs sont appliqués ici et au
 * contrôle, jamais collés dans la requête.
 */
import { fitsFormat, orientationOf } from "./formats";
import { licenseUsable, type StockProvider } from "./sources";
import type { RankedCandidate, StockCandidate, VisualBrief } from "./types";

const norm = (s: string) => ` ${s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim()} `;
const has = (text: string, term: string) => {
  const t = norm(term).trim();
  return !!t && (text.includes(` ${t} `) || text.includes(` ${t}s `) || text.includes(` ${t}es `));
};

/** Surfaces ou décors qui, SEULS, ne montrent aucun métier ni aucun usage. */
const SURFACES = ["wall", "walls", "texture", "background", "brick", "bricks", "stone", "facade", "concrete", "surface", "pattern", "empty room", "plaster texture", "white wall"];
/** Signes qu'une scène montre une personne, un geste ou un travail en cours. */
const HUMAN_ACTION = /\b(man|woman|men|women|worker|workers|person|people|craftsman|craftswoman|artisan|professional|hands?|working|work|at work|applying|painting|plastering|installing|repairing|fixing|laying|using|holding|cooking|serving|renovation|renovating|builder|team|client|customer)\b/;

/** Mots qui comptent dans un texte du brief (concepts positifs, geste, lieu). */
function conceptWords(phrases: string[]): string[] {
  const stop = new Set(["with", "from", "into", "onto", "under", "over", "room", "home", "the", "and", "for", "that", "this", "their", "while", "after", "before", "under"]);
  return [...new Set(phrases.flatMap((p) => norm(p).trim().split(" ")).filter((w) => w.length > 3 && !stop.has(w)))];
}

/**
 * Pertinence d'un résultat pour le brief (0-10), à partir de sa seule description (gratuit) et de ses dimensions.
 * `metadataMatch` : la description cite le métier ou le produit (seule base d'un choix sans contrôle visuel).
 */
export function scoreCandidate(c: StockCandidate, brief: VisualBrief): RankedCandidate & { metadataMatch: boolean; offTopicLikely: boolean } {
  const text = norm(c.alt);
  const reasons: string[] = [];
  let s = 4;
  const mustHit = brief.must.some((m) => has(text, m));
  if (mustHit) {
    s += 3;
    reasons.push("cite le métier");
  }
  const words = conceptWords([...(brief.action ? [brief.action] : []), ...(brief.environment ? [brief.environment] : []), ...brief.positive]);
  const hits = words.filter((w) => text.includes(` ${w} `)).length;
  if (hits) {
    s += Math.min(2.5, hits * 0.5);
    reasons.push(`${hits} concept(s) du brief`);
  }
  const human = HUMAN_ACTION.test(text);
  if (human) s += 0.5;
  const negHit = brief.negative.find((n) => has(text, n));
  const surfaceOnly = SURFACES.some((w) => has(text, w)) && !human && !mustHit;
  // Comprendre la scène : un concept hors sujet n'écarte la photo que si rien du métier ni du geste ne s'y voit.
  let offTopicLikely = false;
  if (negHit && !mustHit) {
    s -= 4;
    offTopicLikely = true;
    reasons.push(`hors sujet probable (${negHit})`);
  } else if (negHit) {
    s -= 0.5;
    reasons.push(`contient « ${negHit} » mais le métier se voit`);
  }
  if (surfaceOnly) {
    s -= 3;
    offTopicLikely = true;
    reasons.push("surface ou décor seul, sans geste ni personne");
  }
  const fit = c.width && c.height ? fitsFormat(c.width, c.height, brief.format.aspect) : { ok: true, reason: null };
  if (!fit.ok) {
    s -= 2;
    reasons.push(fit.reason ?? "format");
  }
  if (!c.alt.trim()) {
    s -= 1;
    reasons.push("aucune description");
  }
  const relevance = Math.max(0, Math.min(10, Math.round(s * 10) / 10));
  return { ...c, relevance, reasons, metadataMatch: mustHit || (!brief.must.length && hits >= 2), offTopicLikely };
}

export type SearchStats = { requests: number; results: number; kept: number; byProvider: Record<string, number>; queries: string[]; errors: string[] };

/** Clé stable d'un résultat (doublons entre requêtes et réutilisation). */
export const candidateKey = (c: Pick<StockCandidate, "source" | "id">) => `${c.source}:${c.id}`;

/**
 * Recherche dans les sources disponibles. Arrêt dès qu'assez de bons candidats sont trouvés (moins de requêtes).
 * `exclude` : photos déjà utilisées dans le projet ou déjà refusées pour ce brief.
 */
export async function searchCandidates(brief: VisualBrief, providers: StockProvider[], opts: { exclude?: Set<string>; enough?: number; fallbackFr?: string | null } = {}): Promise<{ ranked: (RankedCandidate & { metadataMatch: boolean; offTopicLikely: boolean })[]; stats: SearchStats }> {
  const stats: SearchStats = { requests: 0, results: 0, kept: 0, byProvider: {}, queries: [], errors: [] };
  const seen = new Set<string>();
  const seenUrl = new Set<string>();
  const out: (RankedCandidate & { metadataMatch: boolean; offTopicLikely: boolean })[] = [];
  const enough = opts.enough ?? 8;
  const orientation = orientationOf(brief.format.aspect);
  const good = () => out.filter((c) => c.relevance >= 6 && !c.offTopicLikely).length;
  const run = async (prov: StockProvider, q: string, lang: "en" | "fr") => {
    stats.requests++;
    if (!stats.queries.includes(q)) stats.queries.push(q);
    let found: StockCandidate[] = [];
    try {
      found = await prov.search(q, orientation, lang);
    } catch (e) {
      stats.errors.push(`${prov.id}: ${(e as Error).message}`.slice(0, 160));
      return;
    }
    stats.results += found.length;
    for (const c of found) {
      const k = candidateKey(c);
      if (!c.url || seen.has(k) || seenUrl.has(c.url) || opts.exclude?.has(k)) continue;
      seen.add(k);
      seenUrl.add(c.url);
      // Licence non établie : jamais retenue automatiquement.
      if (!licenseUsable(c.license)) continue;
      out.push(scoreCandidate(c, brief));
      stats.byProvider[prov.id] = (stats.byProvider[prov.id] ?? 0) + 1;
    }
  };
  for (const prov of providers.filter((p) => p.available())) {
    for (const q of brief.queries) {
      if (good() >= enough) break;
      await run(prov, q, prov.capabilities.languages[0] ?? "en");
    }
    if (good() >= enough) break;
  }
  // Repli en français (libellé du métier saisi par le client) quand l'anglais n'a rien donné d'utilisable.
  if (!good() && opts.fallbackFr) for (const prov of providers.filter((p) => p.available() && p.capabilities.languages.includes("fr"))) await run(prov, opts.fallbackFr, "fr");
  // Doublons de contenu entre banques (même auteur, même description) : un seul gardé.
  const dedup = new Map<string, (typeof out)[number]>();
  for (const c of out.sort((a, b) => b.relevance - a.relevance)) {
    const k = `${c.author.toLowerCase()}|${norm(c.alt).trim()}`;
    if (c.alt.trim() && dedup.has(k)) continue;
    dedup.set(c.alt.trim() ? k : candidateKey(c), c);
  }
  const ranked = [...dedup.values()].sort((a, b) => b.relevance - a.relevance);
  stats.kept = ranked.length;
  return { ranked, stats };
}

/**
 * Candidats envoyés au contrôle : les meilleurs seulement. Avec contrôle visuel : pertinence ≥ 5 et hors sujet probable
 * écarté, `max` au plus. Sans contrôle visuel : seule une description qui cite le métier (ou le produit) compte.
 */
export function shortlist<T extends RankedCandidate & { metadataMatch: boolean; offTopicLikely: boolean }>(ranked: T[], visualCheck: boolean, max = 4): T[] {
  const ok = ranked.filter((c) => !c.offTopicLikely && (visualCheck ? c.relevance >= 5 : c.metadataMatch && c.relevance >= 6.5));
  return ok.slice(0, max);
}
