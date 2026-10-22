import { createHash } from "node:crypto";
/** Sources réellement lues, séparées des hypothèses de positionnement ; aucun chiffre de marché inventé. */
import { importLink, safeFetch } from "../engine/import-link";
import type { Project } from "../projects";
import type { Brief, Research, Source } from "./types";
export async function researchProject(
  p: Project,
  brief: Brief,
  read = importLink,
  discover = safeFetch,
): Promise<Research> {
  const candidates: { url: string; category: NonNullable<Source["category"]> }[] = [
    ...(brief.input.offerUrl ? [{ url: brief.input.offerUrl, category: "offer" as const }] : []),
    ...brief.input.referenceUrls.map(url => ({ url, category: "offer" as const })),
  ];
  const topic = `${brief.profile.category || brief.profile.name} ${brief.input.target} ${p.business === "services" ? brief.services.area : ""}`;
  // Quatre familles de requêtes, bornées. Les résultats RSS ne sont jamais comptés comme sources lues.
  if (read === importLink || discover !== safeFetch) for (const [category, suffix] of [
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
    try {
      const r = await read(url), resolved = canonical(r.url);
      const text = r.text.replace(/\s+/g, " ").trim();
      const contentHash = createHash("sha256").update(text.toLowerCase()).digest("hex");
      // Identité textuelle + similarité des shingles pour les reprises quasi identiques.
      const shingles = (v: string) => new Set(v.toLowerCase().split(/\s+/).map((_, i, a) => a.slice(i, i + 5).join(" ")));
      const current = shingles(text.slice(0, 12000));
      const duplicate = sources.some(s => { const other = shingles(s.excerpt); return other.size > 20 && [...other].filter(x => current.has(x)).length / other.size > .92; });
      if ((resolved !== url && seenUrls.has(resolved)) || seenContent.has(contentHash) || duplicate) continue;
      seenUrls.add(resolved); seenContent.add(contentHash);
      sources.push({ id: `source-${attempts}`, url: r.url, title: r.title || new URL(r.url).hostname,
        excerpt: text.slice(0, 3200), consultedAt: Date.now(), status: text ? "consulted" : "unavailable", provenance: "web", category: candidate.category, contentHash,
        ...(!text ? { error: "Page sans texte exploitable." } : {}) });
    } catch {
      sources.push({ id: `source-${attempts}`, url, title: url, excerpt: "", consultedAt: Date.now(), status: "unavailable", provenance: "web", category: candidate.category, error: "Page inaccessible : couverture partielle, lien à vérifier." });
    }
  }
  const available = sources.filter((s) => s.status === "consulted");
  return {
    formatVersion: 2,
    coverage: { target: 10, consulted: available.length,
      status: "partial", // Collected pages still require relevance review; never a completed study.

      missingCategories: ["offer", "competitors", "customers", "sector"].filter(c => !available.some(s => s.category === c)),
      limits: ["Extraits consultés, pertinence à confirmer par l’analyse et le client ; cible 10, sans garantie d’exhaustivité.", ...(available.length < 8 ? ["Couverture indicative : l’analyse doit vérifier les familles pertinentes sans quota de remplissage."] : [])],
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
