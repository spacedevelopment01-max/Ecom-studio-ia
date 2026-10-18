/** Sources réellement lues, séparées des hypothèses de positionnement ; aucun chiffre de marché inventé. */
import { importLink, safeFetch } from "../engine/import-link";
import type { Project } from "../projects";
import type { Brief, Research, Source } from "./types";
export async function researchProject(
  p: Project,
  brief: Brief,
  read = importLink,
): Promise<Research> {
  let urls = brief.input.referenceUrls;
  if (!urls.length) {
    try {
      const query = encodeURIComponent(
        `${p.product.category || brief.profile.name} ${brief.input.target} ${p.business === "services" ? "prestations" : "produit"} concurrence`,
      );
      const r = await safeFetch(
        `https://www.bing.com/search?format=rss&q=${query}`,
        { maxBytes: 120000 },
      );
      if (r.status === 200)
        urls = [
          ...r.body
            .toString()
            .matchAll(
              /<item>[\s\S]*?<link>(https?:[^<]+)<\/link>[\s\S]*?<\/item>/g,
            ),
        ]
          .map((m) => m[1].replace(/&amp;/g, "&"))
          .filter((u) => !new URL(u).hostname.endsWith("bing.com"))
          .slice(0, 3);
    } catch {
      /* L'absence de source reste explicite ci-dessous ; aucune étude inventée. */
    }
  }
  const sources: Source[] = [];
  for (const [i, url] of urls.slice(0, 4).entries())
    try {
      const r = await read(url);
      const excerpt = r.text.replace(/\s+/g, " ").trim().slice(0, 1800);
      sources.push({
        id: `source-${i + 1}`,
        url: r.url,
        title: r.title || new URL(r.url).hostname,
        excerpt,
        consultedAt: Date.now(),
        status: excerpt ? "consulted" : "unavailable",
        provenance: "web",
        ...(!excerpt ? { error: "Page sans texte exploitable." } : {}),
      });
    } catch {
      sources.push({
        id: `source-${i + 1}`,
        url,
        title: url,
        excerpt: "",
        consultedAt: Date.now(),
        status: "unavailable",
        error:
          "Lecture impossible. Vérifiez le lien public ou choisissez une autre référence.",
        provenance: "web",
      });
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
  ];
  return {
    sources,
    observations: available.map((s) => ({
      sourceId: s.id,
      quote: s.excerpt.slice(0, 320),
    })),
    angles: bases.map((a) => ({
      ...a,
      audience,
      sourceIds: available.map((s) => s.id),
      hypothesis: true,
    })),
    recommendedId: "usage",
    recommendation: `Proposition locale : ${bases[0].reason} Les angles sont des hypothèses à valider, pas une mesure de marché.`,
    legalAvailability: "not_checked",
  };
}
