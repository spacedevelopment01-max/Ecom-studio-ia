import { createHash } from "node:crypto";
/** Sources réellement lues, séparées des hypothèses de positionnement ; aucun chiffre de marché inventé. */
import { importLink, safeFetch } from "../engine/import-link";
import type { Project } from "../projects";
import type { Brief, Research, Source } from "./types";
export async function researchProject(
  p: Project,
  brief: Brief,
  read = importLink,
): Promise<Research> {
  const candidates: { url: string; category: NonNullable<Source["category"]> }[] = [
    ...(brief.input.offerUrl ? [{ url: brief.input.offerUrl, category: "offer" as const }] : []),
    ...brief.input.referenceUrls.map(url => ({ url, category: "offer" as const })),
  ];
  const topic = `${brief.profile.category || brief.profile.name} ${brief.input.target} ${p.business === "services" ? brief.services.area : ""}`;
  // Quatre familles de requêtes, bornées. Les résultats RSS ne sont jamais comptés comme sources lues.
  if (read === importLink) for (const [category, suffix] of [
    ["offer", "documentation fonctionnement caractéristiques"], ["competitors", p.business === "services" ? "prestataire prestations tarifs" : "produit alternatives caractéristiques"],
    ["customers", "questions avis limites problèmes"], ["sector", "guide professionnel secteur"],
  ] as const) {
    try {
      const r = await safeFetch(`https://www.bing.com/search?format=rss&q=${encodeURIComponent(`${topic} ${suffix}`)}`, { maxBytes: 120000 });
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
  const name = brief.profile.name;
  const audience = brief.input.target;
  const facts = brief.profile.facts
    .filter((f) => f.status === "confirmed")
    .map((f) => `${f.label} : ${f.value}`);
  const bases = [
    {
      id: "usage",
      title: `Expliquer l’usage de ${name}`,
      positioning: `Aider ${audience} à comprendre ${name} avant de décider.`,
      arguments: [brief.profile.summary, ...facts].filter(Boolean),
      objections: [
        {
          objection: "Cette offre répond-elle à ma situation ?",
          answer:
            "Montrer les usages et limites confirmés, sans promettre un résultat non démontré.",
        },
      ],
      reason:
        "Angle recommandé pour clarifier une offre : il utilise les informations fournies et réserve les preuves manquantes.",
    },
    {
      id: "transparence",
      title: "Décider sur des éléments vérifiables",
      positioning: `Présenter ${name} à ${audience} par ses caractéristiques et conditions vérifiables.`,
      arguments: facts.length
        ? facts
        : ["Compléter les éléments de preuve avant toute promesse chiffrée."],
      objections: [
        {
          objection: "Que peut-on réellement vérifier ?",
          answer:
            "Distinguer les faits du projet, les observations des sources et les éléments restant à confirmer.",
        },
      ],
      reason:
        "Alternative centrée sur les preuves : utile si la comparaison et les objections dominent le choix.",
    },
    {
      id: "accompagnement",
      title:
        p.business === "services"
          ? "Comprendre la méthode avant de contacter"
          : "Guider le choix et la prise en main",
      positioning: `Accompagner ${audience} vers ${p.business === "services" ? "une demande adaptée" : "le choix de " + name}.`,
      arguments:
        p.business === "services"
          ? brief.services.services.map((s) => `${s.name} : ${s.description}`)
          : [brief.profile.summary],
      objections: [
        {
          objection: "Quelle est la prochaine étape ?",
          answer:
            p.business === "services"
              ? "Présenter les prestations, la méthode et le moyen de contact choisi."
              : "Expliquer les options connues et les informations nécessaires avant achat.",
        },
      ],
      reason:
        "Alternative centrée sur le parcours : montrer les étapes sans inventer de délais ou de garanties.",
    },
    {
      id: "adequation",
      title: "Choisir une offre adaptée à ses contraintes",
      positioning: `Examiner les options de ${name} et les situations où l’offre ne convient pas.`,
      arguments: ["Comparer uniquement les options connues et signaler les limites sans dévaloriser les alternatives."],
      objections: [{ objection: "Est-ce adapté à mes contraintes particulières ?", answer: "Vérifier les informations fournies et demander les compléments utiles avant toute recommandation individuelle." }],
      reason: "Hypothèse de personnalisation du choix, sans inventer une option absente.",
    },
    {
      id: "continuite",
      title: "Préparer la suite de l’expérience",
      positioning: `Expliquer ce qui est connu après ${p.business === "services" ? "la prestation" : "la première utilisation"}, et les informations restant à demander.`,
      arguments: ["Documenter les conditions connues pour l’entretien ou le suivi, sans garantie ni service ajouté."],
      objections: [{ objection: "Comment poursuivre une fois cette première étape terminée ?", answer: "Présenter les consignes confirmées et identifier les conditions de suivi encore inconnues." }],
      reason: "Hypothèse centrée sur la continuité, distincte du choix initial et des preuves.",
    },
  ];
  const dimensions = [
    { audience: `${audience} — personnes découvrant cette catégorie`, motivation: "Comprendre l’usage dans une situation concrète avant de décider", message: "Découvrez les usages et limites pour savoir à quoi sert cette offre." },
    { audience: `${audience} — personnes comparant des informations vérifiables`, motivation: "Réduire l’incertitude sur les caractéristiques et preuves disponibles", message: "Comparez les faits confirmés et repérez ce qui reste à vérifier." },
    { audience: `${audience} — personnes ayant besoin de repères pour démarrer`, motivation: "Savoir comment se déroule la première étape du parcours", message: "Voyez les étapes pour commencer et le moyen de contact approprié." },
    { audience: `${audience} — personnes avec des contraintes de choix particulières`, motivation: "Vérifier la compatibilité avec ses contraintes individuelles", message: "Examinez les options connues et les limites avant de faire votre choix." },
    { audience: `${audience} — personnes anticipant l’entretien ou le suivi`, motivation: "Préparer la continuité et les conditions après la première expérience", message: "Anticipez la suite avec les seules conditions d’entretien ou de suivi confirmées." },
  ];
  return {
    formatVersion: 2,
    coverage: { target: 10, consulted: available.length,
      status: available.length >= 8 && ["offer", "competitors", "customers", "sector"].every(c => available.some(s => s.category === c)) ? "covered" : "partial",
      missingCategories: ["offer", "competitors", "customers", "sector"].filter(c => !available.some(s => s.category === c)),
      limits: ["Extraits consultés, pertinence à confirmer par l’analyse et le client ; cible 10, sans garantie d’exhaustivité.", ...(available.length < 8 ? ["Moins de huit sources distinctes accessibles : recherche partielle."] : [])],
    },
    sources,
    observations: available.map((s) => ({
      sourceId: s.id,
      quote: s.excerpt.slice(0, 320),
    })),
    angles: bases.map((a) => ({
      ...a,
      ...dimensions[bases.indexOf(a)],
      sourceIds: available.map((s) => s.id),
      hypothesis: true,
    })),
    recommendedId: "usage",
    recommendation: `Proposition locale : ${bases[0].reason} Les angles sont des hypothèses à valider, pas une mesure de marché.`,
    legalAvailability: "not_checked",
  };
}
