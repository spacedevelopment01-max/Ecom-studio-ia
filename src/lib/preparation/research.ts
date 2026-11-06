import { createHash } from "node:crypto";
/** Sources réellement lues, séparées des hypothèses de positionnement ; aucun chiffre de marché inventé. */
import { importLink, safeFetch } from "../engine/import-link";
import type { Project } from "../projects";
import type { Brief, Research, Source } from "./types";
import { isMarketplace, type WebFinding } from "../ai/web-search";
/** Recherche web (OpenAI) : renvoie des pages trouvées avec un extrait rapporté ; null = recherche classique. */
export type WebDiscover = (query: string) => Promise<WebFinding[]>;
export function webResearchQuery(p: Project, brief: Brief): string {
  return JSON.stringify({
    demande: "Trouve des pages web utiles pour définir des angles marketing de cette offre (offre, concurrents, clients, secteur).",
    offre: { nom: brief.profile.name, categorie: brief.profile.category, resume: brief.profile.summary, activite: p.business },
    publicVise: brief.input.target, zone: p.business === "services" ? brief.services.area : undefined, langue: "français",
  });
}
export async function researchProject(
  p: Project,
  brief: Brief,
  read = importLink,
  discover = safeFetch,
  web: WebDiscover | null = null,
): Promise<Research> {
  const candidates: { url: string; category: NonNullable<Source["category"]>; reported?: WebFinding }[] = [
    ...(brief.input.offerUrl ? [{ url: brief.input.offerUrl, category: "offer" as const }] : []),
    ...brief.input.referenceUrls.map(url => ({ url, category: "offer" as const })),
  ];
  const topic = `${brief.profile.category || brief.profile.name} ${brief.input.target} ${p.business === "services" ? brief.services.area : ""}`;
  // Recherche web OpenAI : liens vérifiés côté fournisseur, lus ensuite par le Studio quand c'est possible.
  if (web) for (const f of await web(webResearchQuery(p, brief))) candidates.push({ url: f.url, category: f.category, reported: f });
  // Quatre familles de requêtes, bornées. Les résultats RSS ne sont jamais comptés comme sources lues.
  else if (read === importLink || discover !== safeFetch) for (const [category, suffix] of [
    ["offer", "documentation fonctionnement caractéristiques"], ["competitors", p.business === "services" ? "prestataire prestations tarifs" : "produit alternatives caractéristiques"],
    ["customers", "questions avis limites problèmes"], ["sector", "guide professionnel secteur"],
  ] as const) {
    try {
      const r = await discover(`https://www.bing.com/search?format=rss&q=${encodeURIComponent(`${topic} ${suffix}`)}`, { maxBytes: 120000 });
      if (r.status === 200) for (const m of [...r.body.toString().matchAll(/<item>[\s\S]*?<link>(https?:[^<]+)<\/link>[\s\S]*?<\/item>/g)].slice(0, 5)) {
        const url = m[1].replace(/&amp;/g, "&");
        if (!new URL(url).hostname.endsWith("bing.com")) candidates.push({ url, category });
      }
    } catch { /* Couverture partielle signalée, aucune étude inventée. */ }
  }
  // Répartir la découverte entre catégories avant de remplir les places restantes : la dernière famille ne doit pas être évincée par la première.
  const queues = (["offer", "competitors", "customers", "sector"] as const).map(category => candidates.filter(c => c.category === category));
  const ordered: typeof candidates = [];
  while (queues.some(q => q.length)) for (const queue of queues) { const candidate = queue.shift(); if (candidate) ordered.push(candidate); }
  const sources: Source[] = [], seenUrls = new Set<string>(), seenContent = new Set<string>();
  const canonical = (raw: string) => { const u = new URL(raw); u.hash = ""; for (const k of [...u.searchParams.keys()]) if (/^(utm_|fbclid|gclid)/.test(k)) u.searchParams.delete(k); return u.toString().replace(/\/$/, ""); };
  let attempts = 0;
  for (const candidate of ordered) {
    if (sources.filter(s => s.status === "consulted").length >= 12 || attempts >= 18) break;
    const url = canonical(candidate.url);
    if (seenUrls.has(url)) continue;
    seenUrls.add(url); attempts++;
    // Les places de marché (AliExpress, Alibaba, Temu…) ne fondent jamais un angle marketing.
    if (isMarketplace(url)) { sources.push({ id: `source-${attempts}`, url, title: url, excerpt: "", consultedAt: Date.now(), status: "unavailable", provenance: "web", category: candidate.category, error: "Place de marché exclue des sources d’angles." }); continue; }
    try {
      const r = await read(url), resolved = canonical(r.url);
      const text = r.text.replace(/\s+/g, " ").trim();
      if (!text && candidate.reported) throw new Error("Page vide : extrait rapporté conservé.");
      const contentHash = createHash("sha256").update(text.toLowerCase()).digest("hex");
      // Identité textuelle + similarité des shingles pour les reprises quasi identiques.
      const shingles = (v: string) => new Set(v.toLowerCase().split(/\s+/).map((_, i, a) => a.slice(i, i + 5).join(" ")));
      const current = shingles(text.slice(0, 12000));
      const duplicate = sources.some(s => { const other = shingles(s.excerpt); return other.size > 20 && [...other].filter(x => current.has(x)).length / other.size > .92; });
      if ((resolved !== url && seenUrls.has(resolved)) || seenContent.has(contentHash) || duplicate) continue;
      seenUrls.add(resolved); seenContent.add(contentHash);
      sources.push({ id: `source-${attempts}`, url: r.url, title: r.title || new URL(r.url).hostname,
        excerpt: text.slice(0, 3200), consultedAt: Date.now(), status: text ? "consulted" : "unavailable", provenance: "web", category: candidate.category, contentHash, via: "page",
        ...(!text ? { error: "Page sans texte exploitable." } : {}) });
    } catch {
      // Page non lisible ici : l'extrait rapporté par la recherche web OpenAI est gardé, marqué comme tel.
      const f = candidate.reported;
      if (f) {
        const contentHash = createHash("sha256").update(f.excerpt.toLowerCase()).digest("hex");
        if (!seenContent.has(contentHash)) { seenContent.add(contentHash); sources.push({ id: `source-${attempts}`, url: f.url, title: f.title, excerpt: f.excerpt.slice(0, 3200), consultedAt: Date.now(), status: "consulted", provenance: "web", category: f.category, contentHash, via: "openai_web_search" }); }
        continue;
      }
      sources.push({ id: `source-${attempts}`, url, title: url, excerpt: "", consultedAt: Date.now(), status: "unavailable", provenance: "web", category: candidate.category, error: "Page inaccessible : couverture partielle, lien à vérifier." });
    }
  }
  const available = sources.filter((s) => s.status === "consulted");
  return {
    formatVersion: 2,
    coverage: { target: 10, consulted: available.length,
      status: "partial", // Collected pages still require relevance review; never a completed study.

      missingCategories: ["offer", "competitors", "customers", "sector"].filter(c => !available.some(s => s.category === c)),
      limits: ["Extraits consultés, pertinence à confirmer par l’analyse et le client ; cible 10, sans garantie d’exhaustivité.", ...(available.some(s => s.via === "openai_web_search") ? ["Certains extraits sont rapportés par la recherche web OpenAI (lien vérifié, page non relue par le Studio)."] : []), ...(available.length < 8 ? ["Couverture indicative : l’analyse doit vérifier les familles pertinentes sans quota de remplissage."] : [])],
    },
    sources,
    observations: available.map((s) => ({
      sourceId: s.id,
      quote: s.excerpt.slice(0, 320),
    })),
    angles: [],
    recommendedId: "",
    recommendation: "",
    legalAvailability: "not_checked",
  };
}
